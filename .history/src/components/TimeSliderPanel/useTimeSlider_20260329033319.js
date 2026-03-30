/**
 * 🔍 useTimeSlider - 时间/索引查询纯逻辑
 * 四参数输入网格参数联动
 * 操作按钮组 功能实现
 */

import { ref, computed, watch } from 'vue'

import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp, toSeconds, toMilliseconds
} from '../timeUtils'
import { getTrajectoryByIndex, getTrajectoryByTime} from '@/api/shipApi'


export function useTimeSlider(mapOp, mmsi, totalCount) {

  const TIME_CONFIG = {
    TIME_STEPS: [1, 5, 10, 30, 60, 120],
    DEFAULT_TIME_STEP: 10,
    INDEX_STEPS: [1, 10, 50, 100, 500],
    DEFAULT_INDEX_STEP: 10,
    MIN_TIME_INTERVAL: 1  
  }

  
  const globalMaxIdx = totalCount - 1
   
  
  // 参数预览（调试用）
  const previewText = computed(() => {
    const t = startTimestamp.value && endTimestamp.value 
      ? `time:[${toSeconds(startTimestamp.value)},${toSeconds(endTimestamp.value)}]` 
      : 'time:[-,-]'
    const i = `idx:[${startIndex.value},${endIndex.value}]`
    return `${t} | ${i}`
  })
  
  // 查询参数（秒级，供 API 使用）
  const queryParams = computed(() => ({
    mmsi: props.mmsi,
    start: toSeconds(startTimestamp.value),
    end: toSeconds(endTimestamp.value),
    limit: props.batchSize || 5000
  }))

  // ========== 🔧 边界校验 ==========
  
  const clampTimeRange = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    
    if (minTs != null && startTimestamp.value != null) {
      startTimestamp.value = Math.max(minTs, startTimestamp.value)
    }
    if (maxTs != null && endTimestamp.value != null) {
      endTimestamp.value = Math.min(maxTs, endTimestamp.value)
    }
    
    // 确保 start < end (至少差 1 秒)
    if (startTimestamp.value != null && endTimestamp.value != null && 
        startTimestamp.value >= endTimestamp.value - 1000) {
      endTimestamp.value = startTimestamp.value + 1000
    }
  }

  const clampIndexRange = () => {
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    startIndex.value = clamp(startIndex.value, minIdx, maxIdx)
    endIndex.value = clamp(endIndex.value, minIdx, maxIdx)
    
    if (startIndex.value >= endIndex.value) {
      endIndex.value = Math.min(maxIdx, startIndex.value + 1)
    }
  }

  // ========== 🔗 联动同步（始终启用） ==========
  
  const syncIndexFromTime = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    if (minTs == null || maxTs == null || maxTs <= minTs || maxIdx <= minIdx) return
    
    const timeSpan = maxTs - minTs
    const idxSpan = maxIdx - minIdx
    const ratioStart = (startTimestamp.value - minTs) / timeSpan
    const ratioEnd = (endTimestamp.value - minTs) / timeSpan
    
    startIndex.value = clamp(Math.round(minIdx + ratioStart * idxSpan), minIdx, maxIdx)
    endIndex.value = clamp(Math.round(minIdx + ratioEnd * idxSpan), startIndex.value + 1, maxIdx)
  }

  const syncTimeFromIndex = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    if (minTs == null || maxTs == null || maxTs <= minTs || maxIdx <= minIdx) return
    
    const timeSpan = maxTs - minTs
    const idxSpan = maxIdx - minIdx
    const ratioStart = (startIndex.value - minIdx) / idxSpan
    const ratioEnd = (endIndex.value - minIdx) / idxSpan
    
    startTimestamp.value = clamp(Math.round(minTs + ratioStart * timeSpan), minTs, maxTs)
    endTimestamp.value = clamp(Math.round(minTs + ratioEnd * timeSpan), 
      (startTimestamp.value || minTs) + 1000, maxTs)
  }

  // ========== 🎛️ 调整函数 ==========
  
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60 * 1000
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    
    if (which === 'start' && startTimestamp.value != null) {
      const newStart = startTimestamp.value + delta
      const limit = (endTimestamp.value || maxTs) - 1000
      startTimestamp.value = clamp(newStart, minTs, limit)
    } else if (which === 'end' && endTimestamp.value != null) {
      const newEnd = endTimestamp.value + delta
      const limit = (startTimestamp.value || minTs) + 1000
      endTimestamp.value = clamp(newEnd, limit, maxTs)
    }
    
    syncIndexFromTime()
  }

  const adjustIndex = (which, step) => {
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(startIndex.value + step, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(endIndex.value + step, startIndex.value + 1, maxIdx)
    }
    
    syncTimeFromIndex()
  }

  const updateIndex = (which, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(num, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(num, startIndex.value + 1, maxIdx)
    }
    
    syncTimeFromIndex()
    isEditingIndex.value[which] = false
  }

  // ========== 📤 核心操作函数 ==========
  
  /**
   * ✅ 发射查询事件（由父组件处理地图更新）
   */
  const emitQuery = () => {
    clampTimeRange()
    clampIndexRange()
    
    const params = {
      mmsi: props.mmsi,
      time: { 
        start: toSeconds(startTimestamp.value), 
        end: toSeconds(endTimestamp.value) 
      },
      index: { 
        start: startIndex.value, 
        end: endIndex.value,
        total: props.totalCount  // ✅ 传递 totalCount 供后端校验
      }
    }
    
    emit('query', params)
    emit('params-change', params)
  }

  /**
   * ✅ 重置：恢复到默认索引范围 0~min(1000, totalCount-1)
   */
  const resetToDefault = () => {
    // 时间恢复为当前传入值
    startTimestamp.value = props.currentStartTs ? toMilliseconds(props.currentStartTs) : null
    endTimestamp.value = props.currentEndTs ? toMilliseconds(props.currentEndTs) : null
    
    // ✅ 索引恢复为默认范围
    startIndex.value = defaultIndexRange.value.start
    endIndex.value = defaultIndexRange.value.end
    
    emitQuery()
  }

  /**
   * ✅ 全量：展示 0 ~ totalCount-1 全部数据
   */
  const expandFull = () => {
    // 时间扩展为全局范围
    if (props.globalMinTs != null && props.globalMaxTs != null) {
      startTimestamp.value = toMilliseconds(props.globalMinTs)
      endTimestamp.value = toMilliseconds(props.globalMaxTs)
    }
    
    // ✅ 索引扩展为全量范围
    startIndex.value = fullIndexRange.value.start
    endIndex.value = fullIndexRange.value.end
    
    emitQuery()
  }

  

  const toggleCollapse = () => {
    collapsed.value = !collapsed.value
  }

  // ========== 👂 监听 Props 变化 ==========
  
  // 监听外部传入的查询参数变化
  watch(
    () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
    ([newStartTs, newEndTs, newStartIdx, newEndIdx]) => {
      if (newStartTs != null && newStartTs !== toSeconds(startTimestamp.value)) {
        startTimestamp.value = toMilliseconds(newStartTs)
      }
      if (newEndTs != null && newEndTs !== toSeconds(endTimestamp.value)) {
        endTimestamp.value = toMilliseconds(newEndTs)
      }
      if (newStartIdx != null && newStartIdx !== startIndex.value) {
        startIndex.value = newStartIdx
      }
      if (newEndIdx != null && newEndIdx !== endIndex.value) {
        endIndex.value = newEndIdx
      }
    }
  )

  // ✅ 监听 totalCount 变化 → 自动调整索引边界
  watch(
    () => props.totalCount,
    (newTotal, oldTotal) => {
      if (newTotal != null && newTotal > 0) {
        clampIndexRange()  // 确保当前索引不越界
        
        // 如果是首次设置 totalCount，应用默认范围
        if (oldTotal == null || oldTotal <= 0) {
          initDefaultRange()
        }
      }
    }
  )

  // 监听全局时间范围变化
  watch(
    () => [props.globalMinTs, props.globalMaxTs],
    () => {
      clampTimeRange()
    }
  )

  // ========== 🔓 暴露方法 ==========
  
  const exposeMethods = {
    refresh: emitQuery,
    reset: resetToDefault,
    expand: expandFull,
    init: initDefaultRange,  // ✅ 新增：初始化默认范围
    setParams: (params) => {
      if (params.time?.start != null) startTimestamp.value = toMilliseconds(params.time.start)
      if (params.time?.end != null) endTimestamp.value = toMilliseconds(params.time.end)
      if (params.index?.start != null) startIndex.value = params.index.start
      if (params.index?.end != null) endIndex.value = params.index.end
    },
    getQueryParams: () => queryParams.value,
    getCurrentRange: () => ({
      time: { 
        start: toSeconds(startTimestamp.value), 
        end: toSeconds(endTimestamp.value) 
      },
      index: { 
        start: startIndex.value, 
        end: endIndex.value,
        total: props.totalCount 
      }
    }),
    getDefaultRange: () => defaultIndexRange.value,  // ✅ 暴露默认范围
    getFullRange: () => fullIndexRange.value          // ✅ 暴露全量范围
  }

  return {
    // 状态
    timeStep, indexStep, startTimestamp, endTimestamp,
    startIndex, endIndex, collapsed, isEditingIndex,
    // 计算属性
    globalMaxIdx, defaultIndexRange, fullIndexRange,  // ✅ 新增两个范围计算
    , queryParams,
    // 常量
    TIME_STEPS: TIME_CONFIG.TIME_STEPS,
    INDEX_STEPS: TIME_CONFIG.INDEX_STEPS,
    // 工具函数
    formatTimestamp, formatLocalDate, formatTimeOnly,
    formatDuration, formatRange, toSeconds, toMilliseconds,
    // 操作方法
    adjustTime, adjustIndex, updateIndex, toggleCollapse,
    emitQuery, resetToDefault, expandFull, initDefaultRange,  // ✅ 新增 init
    // 暴露
    exposeMethods
  }
}

export default useTimeSlider