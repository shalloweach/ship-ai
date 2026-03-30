/**
 * 🔍 useTimeSlider - 时间/索引查询纯逻辑
 * 职责：参数管理、联动同步、边界校验、默认/重置/全量逻辑
 * 注意：❌ 不包含任何地图操作，地图由 TSuseMap 处理
 */

import { ref, computed, watch } from 'vue'

import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp, toSeconds, toMilliseconds
} from '../timeUtils'

/**
 * @typedef {Object} UseTimeSliderProps
 * @property {string} mmsi - 船舶MMSI
 * @property {number|null} globalMinTs - 全局最小时间戳(秒)
 * @property {number|null} globalMaxTs - 全局最大时间戳(秒)
 * @property {number|null} currentStartTs - 当前开始时间(秒)
 * @property {number|null} currentEndTs - 当前结束时间(秒)
 * @property {number} globalMinIdx - 全局最小索引
 * @property {number} currentStartIdx - 当前开始索引
 * @property {number} currentEndIdx - 当前结束索引
 * @property {number|null} totalCount - ✅ 船舶轨迹总点数（核心参数）
 * @property {number} batchSize - 单次查询批次大小
 * @property {boolean} loading - 加载状态
 */

/**
 * @param {UseTimeSliderProps} props
 * @param {Function} emit - Vue emit 函数
 */
export function useTimeSlider(props, emit) {
  // ========== 响应式状态 ==========
  const timeStep = ref(TIME_CONFIG.DEFAULT_TIME_STEP)
  const indexStep = ref(TIME_CONFIG.DEFAULT_INDEX_STEP)
  
  // 查询参数（内部用毫秒，发射用秒）
  const startTimestamp = ref(props.currentStartTs ? toMilliseconds(props.currentStartTs) : null)
  const endTimestamp = ref(props.currentEndTs ? toMilliseconds(props.currentEndTs) : null)
  const startIndex = ref(props.currentStartIdx)
  const endIndex = ref(props.currentEndIdx)
  
  // UI 状态
  const collapsed = ref(false)
  const isEditingIndex = ref({ start: false, end: false })

  const TIME_CONFIG = {
    TIME_STEPS: [1, 5, 10, 30, 60, 120],
    DEFAULT_TIME_STEP: 10,
    INDEX_STEPS: [1, 10, 50, 100, 500],
    DEFAULT_INDEX_STEP: 10,
    MIN_TIME_INTERVAL: 1  // 最小时间间隔(秒)
  }
  

  // ========== 🎯 核心计算属性 ==========
  
  /**
   * ✅ 动态全局最大索引（优先使用 totalCount）
   * 规则：totalCount > 0 ? totalCount - 1 : fallback
   */
  const globalMaxIdx = computed(() => {
    if (props.totalCount != null && props.totalCount > 0) {
      return props.totalCount - 1
    }
    // 降级方案
    return props.globalMaxIdx ?? 10000
  })
  
  /**
   * ✅ 默认索引范围：0 ~ min(1000, totalCount-1)
   * 用于初始化、重置时恢复
   */
  const defaultIndexRange = computed(() => {
    const max = globalMaxIdx.value
    return {
      start: props.globalMinIdx ?? 0,
      end: Math.min(1000, max)  // 默认展示前1000个点
    }
  })
  
  /**
   * ✅ 全量索引范围：0 ~ totalCount-1
   */
  const fullIndexRange = computed(() => ({
    start: props.globalMinIdx ?? 0,
    end: globalMaxIdx.value
  }))
  
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

  /**
   * ✅ 初始化：首次加载时应用默认索引范围（仅当 totalCount 有效时）
   */
  const initDefaultRange = () => {
    if (props.totalCount != null && props.totalCount > 0) {
      // 仅当当前索引为初始默认值时才覆盖，避免打断用户操作
      if (startIndex.value === props.currentStartIdx && 
          endIndex.value === props.currentEndIdx) {
        startIndex.value = defaultIndexRange.value.start
        endIndex.value = defaultIndexRange.value.end
      }
    }
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
    previewText, queryParams,
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