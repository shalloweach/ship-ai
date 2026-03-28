// src/components/TimeSliderPanel/useTimeSlider.js

import { ref, computed, watch } from 'vue'
import { TIME_STEPS, INDEX_STEPS, DEFAULT_TIME_STEP, DEFAULT_INDEX_STEP } from './config'
import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp
} from './timeUtils'

export function useTimeSlider(props, emit) {
  // 响应式状态
  const timeStep = ref(DEFAULT_TIME_STEP)
  const indexStep = ref(DEFAULT_INDEX_STEP)
  const startTimestamp = ref(props.currentStartTs)
  const endTimestamp = ref(props.currentEndTs)
  const startIndex = ref(props.currentStartIdx)
  const endIndex = ref(props.currentEndIdx)
  const syncEnabled = ref(true)
  const collapsed = ref(false)
  const isInitialized = ref(false)

  // 计算属性
  const previewText = computed(() => {
    const t = startTimestamp.value && endTimestamp.value 
      ? `time:[${startTimestamp.value},${endTimestamp.value}]` 
      : 'time:[-,-]'
    const i = `idx:[${startIndex.value},${endIndex.value}]`
    return `${t} | ${i}`
  })

  // 校验与边界处理
  const validateTimeRange = (which) => {
    if (props.globalMinTs !== null) {
      startTimestamp.value = Math.max(props.globalMinTs, startTimestamp.value)
    }
    if (props.globalMaxTs !== null) {
      endTimestamp.value = Math.min(props.globalMaxTs, endTimestamp.value)
    }
    
    if (startTimestamp.value >= endTimestamp.value) {
      if (which === 'start') {
        endTimestamp.value = Math.min(
          props.globalMaxTs !== null ? props.globalMaxTs : Infinity,
          startTimestamp.value + 1
        )
      } else {
        startTimestamp.value = Math.max(
          props.globalMinTs !== null ? props.globalMinTs : -Infinity,
          endTimestamp.value - 1
        )
      }
    }
    
    if (syncEnabled.value) syncIndexFromTime()
  }

  const validateIndexRange = (which) => {
    startIndex.value = clamp(startIndex.value, props.globalMinIdx, props.globalMaxIdx)
    endIndex.value = clamp(endIndex.value, props.globalMinIdx, props.globalMaxIdx)
    
    if (startIndex.value >= endIndex.value) {
      if (which === 'start') {
        endIndex.value = Math.min(props.globalMaxIdx, startIndex.value + 1)
      } else {
        startIndex.value = Math.max(props.globalMinIdx, endIndex.value - 1)
      }
    }
    
    if (syncEnabled.value) syncTimeFromIndex()
  }

  // 调整函数
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60
    if (which === 'start') {
      const newStart = startTimestamp.value + delta
      const limit = endTimestamp.value - 1
      startTimestamp.value = props.globalMinTs !== null 
        ? Math.max(props.globalMinTs, Math.min(newStart, limit))
        : Math.min(newStart, limit)
    } else {
      const newEnd = endTimestamp.value + delta
      const limit = startTimestamp.value + 1
      endTimestamp.value = props.globalMaxTs !== null
        ? Math.min(props.globalMaxTs, Math.max(newEnd, limit))
        : Math.max(newEnd, limit)
    }
    validateTimeRange(which)
  }

  const adjustIndex = (which, step) => {
    if (which === 'start') {
      startIndex.value = clamp(
        startIndex.value + step,
        props.globalMinIdx,
        endIndex.value - 1
      )
    } else {
      endIndex.value = clamp(
        endIndex.value + step,
        startIndex.value + 1,
        props.globalMaxIdx
      )
    }
    validateIndexRange(which)
  }

  // 时间↔索引联动
  const syncIndexFromTime = () => {
    if (props.globalMinTs === null || props.globalMaxTs === null) return
    if (props.globalMaxTs <= props.globalMinTs) return
    
    const timeSpan = props.globalMaxTs - props.globalMinTs
    const idxSpan = props.globalMaxIdx - props.globalMinIdx
    const ratioStart = (startTimestamp.value - props.globalMinTs) / timeSpan
    const ratioEnd = (endTimestamp.value - props.globalMinTs) / timeSpan
    
    startIndex.value = Math.floor(props.globalMinIdx + ratioStart * idxSpan)
    endIndex.value = Math.floor(props.globalMinIdx + ratioEnd * idxSpan)
    validateIndexRange('start')
  }

  const syncTimeFromIndex = () => {
    if (props.globalMinIdx === props.globalMaxIdx) return
    if (props.globalMinTs === null || props.globalMaxTs === null) return
    
    const timeSpan = props.globalMaxTs - props.globalMinTs
    const idxSpan = props.globalMaxIdx - props.globalMinIdx
    const ratioStart = (startIndex.value - props.globalMinIdx) / idxSpan
    const ratioEnd = (endIndex.value - props.globalMinIdx) / idxSpan
    
    startTimestamp.value = Math.floor(props.globalMinTs + ratioStart * timeSpan)
    endTimestamp.value = Math.floor(props.globalMinTs + ratioEnd * timeSpan)
    validateTimeRange('start')
  }

  // 操作函数
  const emitQuery = () => {
    const params = {
      mmsi: props.mmsi,
      time: { start: startTimestamp.value, end: endTimestamp.value },
      index: { start: startIndex.value, end: endIndex.value }
    }
    emit('query', params)
    emit('params-change', params)
  }

  const resetToDefault = () => {
    startTimestamp.value = props.currentStartTs
    endTimestamp.value = props.currentEndTs
    startIndex.value = props.currentStartIdx
    endIndex.value = props.currentEndIdx
    emitQuery()
  }

  const expandFull = () => {
    if (props.globalMinTs !== null && props.globalMaxTs !== null) {
      startTimestamp.value = props.globalMinTs
      endTimestamp.value = props.globalMaxTs
    }
    startIndex.value = props.globalMinIdx
    endIndex.value = props.globalMaxIdx
    emitQuery()
  }

  const toggleCollapse = () => {
    collapsed.value = !collapsed.value
  }

  // 监听 Props 变化
  watch(
    () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
    ([newStartTs, newEndTs, newStartIdx, newEndIdx]) => {
      if (newStartTs !== startTimestamp.value) startTimestamp.value = newStartTs
      if (newEndTs !== endTimestamp.value) endTimestamp.value = newEndTs
      if (newStartIdx !== startIndex.value) startIndex.value = newStartIdx
      if (newEndIdx !== endIndex.value) endIndex.value = newEndIdx
    }
  )

  watch(
    () => [props.globalMinTs, props.globalMaxTs, props.globalMinIdx, props.globalMaxIdx],
    () => {
      validateTimeRange('start')
      validateIndexRange('start')
    }
  )

  // 初始化标记
  isInitialized.value = true

  // 暴露给父组件的方法
  const exposeMethods = {
    refresh: emitQuery,
    collapse: () => { collapsed.value = true },
    expand: () => { collapsed.value = false },
    setParams: (params) => {
      if (params.time?.start) startTimestamp.value = params.time.start
      if (params.time?.end) endTimestamp.value = params.time.end
      if (params.index?.start) startIndex.value = params.index.start
      if (params.index?.end) endIndex.value = params.index.end
    }
  }

  return {
    // 状态
    timeStep, indexStep, startTimestamp, endTimestamp,
    startIndex, endIndex, syncEnabled, collapsed, isInitialized,
    // 配置
    TIME_STEPS, INDEX_STEPS,
    // 计算属性
    previewText,
    // 工具函数（供模板使用）
    formatTimestamp, formatLocalDate, formatTimeOnly,
    formatDuration, formatRange,
    // 操作方法
    adjustTime, adjustIndex, toggleCollapse,
    emitQuery, resetToDefault, expandFull,
    // 暴露方法
    exposeMethods
  }
}