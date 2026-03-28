// src/components/TimeSliderPanel/useTimeSlider.js
/**
 * 🔍 TimeSlider - 时间/索引查询逻辑
 * 职责：参数管理、联动同步、边界校验、事件发射
 */

import { ref, computed, watch } from 'vue'
import { TIME_CONFIG } from '../config'
import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp, toSeconds, toMilliseconds
} from '../timeUtils'

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

  // ========== 计算属性 ==========
  
  // 动态全局最大索引
  const globalMaxIdx = computed(() => {
    return props.totalPoints != null && props.totalPoints > 0 
      ? props.totalPoints - 1 
      : (props.globalMaxIdx ?? 10000)
  })
  
  // 参数预览
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

  // ========== 边界校验 ==========
  
  const clampTimeRange = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    
    if (minTs != null) startTimestamp.value = Math.max(minTs, startTimestamp.value)
    if (maxTs != null) endTimestamp.value = Math.min(maxTs, endTimestamp.value)
    
    // 确保 start < end (至少差 1 秒)
    if (startTimestamp.value >= endTimestamp.value - 1000) {
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
    
    if (minTs == null || maxTs == null || minIdx == null || maxIdx == null) return
    if (maxTs <= minTs || maxIdx <= minIdx) return
    
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
    
    if (minTs == null || maxTs == null || minIdx == null || maxIdx == null) return
    if (maxTs <= minTs || maxIdx <= minIdx) return
    
    const timeSpan = maxTs - minTs
    const idxSpan = maxIdx - minIdx
    const ratioStart = (startIndex.value - minIdx) / idxSpan
    const ratioEnd = (endIndex.value - minIdx) / idxSpan
    
    startTimestamp.value = clamp(Math.round(minTs + ratioStart * timeSpan), minTs, maxTs)
    endTimestamp.value = clamp(Math.round(minTs + ratioEnd * timeSpan), startTimestamp.value + 1000, maxTs)
  }

  // ========== 🎛️ 调整函数 ==========
  
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60 * 1000  // 分钟→毫秒
    
    if (which === 'start') {
      const newStart = startTimestamp.value + delta
      const limit = endTimestamp.value - 1000
      startTimestamp.value = clamp(newStart, 
        props.globalMinTs ? toMilliseconds(props.globalMinTs) : null, 
        limit)
    } else {
      const newEnd = endTimestamp.value + delta
      const limit = startTimestamp.value + 1000
      endTimestamp.value = clamp(newEnd, 
        limit, 
        props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null)
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

  // ========== 📤 操作函数 ==========
  
  const emitQuery = () => {
    clampTimeRange()
    clampIndexRange()
    
    const params = {
      mmsi: props.mmsi,
      time: { 
        start: toSeconds(startTimestamp.value), 
        end: toSeconds(endTimestamp.value) 
      },
      index: { start: startIndex.value, end: endIndex.value }
    }
    
    emit('query', params)
    emit('params-change', params)
  }

  const resetToDefault = () => {
    startTimestamp.value = props.currentStartTs ? toMilliseconds(props.currentStartTs) : null
    endTimestamp.value = props.currentEndTs ? toMilliseconds(props.currentEndTs) : null
    startIndex.value = props.currentStartIdx
    endIndex.value = props.currentEndIdx
    emitQuery()
  }

  const expandFull = () => {
    if (props.globalMinTs != null && props.globalMaxTs != null) {
      startTimestamp.value = toMilliseconds(props.globalMinTs)
      endTimestamp.value = toMilliseconds(props.globalMaxTs)
    }
    startIndex.value = props.globalMinIdx ?? 0
    endIndex.value = globalMaxIdx.value
    emitQuery()
  }

  const toggleCollapse = () => {
    collapsed.value = !collapsed.value
  }

  // ========== 👂 监听 Props 变化 ==========
  
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

  watch(
    () => [props.globalMinTs, props.globalMaxTs, props.totalPoints],
    () => {
      clampTimeRange()
      clampIndexRange()
    }
  )

  // ========== 🔓 暴露方法 ==========
  
  const exposeMethods = {
    refresh: emitQuery,
    reset: resetToDefault,
    expand: expandFull,
    setParams: (params) => {
      if (params.time?.start != null) startTimestamp.value = toMilliseconds(params.time.start)
      if (params.time?.end != null) endTimestamp.value = toMilliseconds(params.time.end)
      if (params.index?.start != null) startIndex.value = params.index.start
      if (params.index?.end != null) endIndex.value = params.index.end
    },
    getQueryParams: () => queryParams.value,
    getCurrentRange: () => ({
      time: { start: toSeconds(startTimestamp.value), end: toSeconds(endTimestamp.value) },
      index: { start: startIndex.value, end: endIndex.value }
    })
  }

  return {
    // 状态
    timeStep, indexStep, startTimestamp, endTimestamp,
    startIndex, endIndex, collapsed, isEditingIndex,
    // 计算属性
    globalMaxIdx, previewText, queryParams,
    // 常量
    TIME_STEPS: TIME_CONFIG.TIME_STEPS,
    INDEX_STEPS: TIME_CONFIG.INDEX_STEPS,
    // 工具函数
    formatTimestamp, formatLocalDate, formatTimeOnly,
    formatDuration, formatRange, toSeconds, toMilliseconds,
    // 操作方法
    adjustTime, adjustIndex, updateIndex, toggleCollapse,
    emitQuery, resetToDefault, expandFull,
    // 暴露
    exposeMethods
  }
}

export default useTimeSlider