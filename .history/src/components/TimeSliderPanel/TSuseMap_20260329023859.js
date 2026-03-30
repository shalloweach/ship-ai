/**
 * 🔍 useTimeSlider - 核心四功能精简版
 * 1️⃣ 四参数输入 + 联动  2️⃣ 查询按钮  3️⃣ 重置按钮  4️⃣ 全量按钮
 */

import { ref, computed, watch } from 'vue'
import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp, toSeconds, toMilliseconds
} from '../timeUtils'

/**
 * @param {Object} props - 组件 props
 * @param {Function} emit - Vue emit
 */
export function useTimeSlider(props, emit) {
  // ========== 配置 ==========
  const TIME_STEPS = [1, 5, 10, 30, 60]
  const INDEX_STEPS = [1, 10, 50, 100, 500]
  
  // ========== 响应式状态 ==========
  const timeStep = ref(10)
  const indexStep = ref(100)
  
  // 四参数：时间(毫秒内部)/索引
  const startTimestamp = ref(props.currentStartTs ? toMilliseconds(props.currentStartTs) : null)
  const endTimestamp = ref(props.currentEndTs ? toMilliseconds(props.currentEndTs) : null)
  const startIndex = ref(props.currentStartIdx ?? 0)
  const endIndex = ref(props.currentEndIdx ?? 1000)
  
  const isEditingIndex = ref({ start: false, end: false })

  // ========== 核心计算：基于 totalCount ==========
  
  // ✅ 全局最大索引 = totalCount - 1
  const globalMaxIdx = computed(() => 
    props.totalCount != null && props.totalCount > 0 
      ? props.totalCount - 1 
      : (props.globalMaxIdx ?? 10000)
  )
  
  // ✅ 默认范围：0 ~ min(1000, totalCount-1)
  const defaultEndIdx = computed(() => Math.min(1000, globalMaxIdx.value))
  
  // ✅ 全量范围：0 ~ totalCount-1
  const fullEndIdx = computed(() => globalMaxIdx.value)

  // ========== 边界校验 ==========
  const clampTime = () => {
    const min = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const max = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    if (min != null && startTimestamp.value != null) startTimestamp.value = Math.max(min, startTimestamp.value)
    if (max != null && endTimestamp.value != null) endTimestamp.value = Math.min(max, endTimestamp.value)
    if (startTimestamp.value != null && endTimestamp.value != null && startTimestamp.value >= endTimestamp.value - 1000) {
      endTimestamp.value = startTimestamp.value + 1000
    }
  }

  const clampIndex = () => {
    const min = 0, max = globalMaxIdx.value
    startIndex.value = clamp(startIndex.value, min, max)
    endIndex.value = clamp(endIndex.value, min, max)
    if (startIndex.value >= endIndex.value) endIndex.value = Math.min(max, startIndex.value + 1)
  }

  // ========== 🔗 双向联动 ==========
  
  // 时间 → 索引
  const syncIndexFromTime = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    if (minTs == null || maxTs == null || maxTs <= minTs) return
    
    const minIdx = 0, maxIdx = globalMaxIdx.value
    const ratioStart = (startTimestamp.value - minTs) / (maxTs - minTs)
    const ratioEnd = (endTimestamp.value - minTs) / (maxTs - minTs)
    
    startIndex.value = clamp(Math.round(minIdx + ratioStart * (maxIdx - minIdx)), minIdx, maxIdx)
    endIndex.value = clamp(Math.round(minIdx + ratioEnd * (maxIdx - minIdx)), startIndex.value + 1, maxIdx)
  }

  // 索引 → 时间
  const syncTimeFromIndex = () => {
    const minTs = props.globalMinTs ? toMilliseconds(props.globalMinTs) : null
    const maxTs = props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null
    if (minTs == null || maxTs == null || maxTs <= minTs) return
    
    const minIdx = 0, maxIdx = globalMaxIdx.value
    const ratioStart = (startIndex.value - minIdx) / (maxIdx - minIdx)
    const ratioEnd = (endIndex.value - minIdx) / (maxIdx - minIdx)
    
    startTimestamp.value = clamp(Math.round(minTs + ratioStart * (maxTs - minTs)), minTs, maxTs)
    endTimestamp.value = clamp(Math.round(minTs + ratioEnd * (maxTs - minTs)), startTimestamp.value + 1000, maxTs)
  }

  // ========== 🎛️ 调整函数 ==========
  
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60 * 1000
    if (which === 'start' && startTimestamp.value != null) {
      startTimestamp.value = clamp(startTimestamp.value + delta, 
        props.globalMinTs ? toMilliseconds(props.globalMinTs) : null, 
        (endTimestamp.value || Infinity) - 1000)
    } else if (which === 'end' && endTimestamp.value != null) {
      endTimestamp.value = clamp(endTimestamp.value + delta, 
        (startTimestamp.value || 0) + 1000, 
        props.globalMaxTs ? toMilliseconds(props.globalMaxTs) : null)
    }
    syncIndexFromTime()
  }

  const adjustIndex = (which, step) => {
    if (which === 'start') {
      startIndex.value = clamp(startIndex.value + step, 0, endIndex.value - 1)
    } else {
      endIndex.value = clamp(endIndex.value + step, startIndex.value + 1, globalMaxIdx.value)
    }
    syncTimeFromIndex()
  }

  const updateIndex = (which, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    if (which === 'start') {
      startIndex.value = clamp(num, 0, endIndex.value - 1)
    } else {
      endIndex.value = clamp(num, startIndex.value + 1, globalMaxIdx.value)
    }
    syncTimeFromIndex()
    isEditingIndex.value[which] = false
  }

  // ========== 🎯 三个核心按钮 ==========
  
  // 1️⃣ 查询：发射参数给父组件
  const emitQuery = () => {
    clampTime()
    clampIndex()
    emit('query', {
      mmsi: props.mmsi,
      time: { start: toSeconds(startTimestamp.value), end: toSeconds(endTimestamp.value) },
      index: { start: startIndex.value, end: endIndex.value }
    })
    emit('params-change', {
      time: { start: toSeconds(startTimestamp.value), end: toSeconds(endTimestamp.value) },
      index: { start: startIndex.value, end: endIndex.value }
    })
  }

  // 2️⃣ 重置：恢复默认 0 ~ min(1000, totalCount-1)
  const resetToDefault = () => {
    startIndex.value = 0
    endIndex.value = defaultEndIdx.value
    emitQuery()
  }

  // 3️⃣ 全量：展示 0 ~ totalCount-1
  const expandFull = () => {
    startIndex.value = 0
    endIndex.value = fullEndIdx.value
    // 时间也扩展到全局范围（如果有）
    if (props.globalMinTs != null && props.globalMaxTs != null) {
      startTimestamp.value = toMilliseconds(props.globalMinTs)
      endTimestamp.value = toMilliseconds(props.globalMaxTs)
    }
    emitQuery()
  }

  // ========== 👂 监听 totalCount 变化 → 自动应用默认范围 ==========
  watch(
    () => props.totalCount,
    (newTotal, oldTotal) => {
      if (newTotal != null && newTotal > 0) {
        clampIndex()
        // 首次设置 totalCount 时，应用默认索引范围
        if (oldTotal == null || oldTotal <= 0) {
          startIndex.value = 0
          endIndex.value = defaultEndIdx.value
        }
      }
    }
  )

  // 监听外部参数变化
  watch(
    () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
    ([ts, te, is, ie]) => {
      if (ts != null && ts !== toSeconds(startTimestamp.value)) startTimestamp.value = toMilliseconds(ts)
      if (te != null && te !== toSeconds(endTimestamp.value)) endTimestamp.value = toMilliseconds(te)
      if (is != null && is !== startIndex.value) startIndex.value = is
      if (ie != null && ie !== endIndex.value) endIndex.value = ie
    }
  )

  // ========== 🔓 暴露 ==========
  return {
    // 状态
    timeStep, indexStep, startTimestamp, endTimestamp,
    startIndex, endIndex, isEditingIndex,
    // 计算
    globalMaxIdx, defaultEndIdx, fullEndIdx,
    // 工具
    formatTimestamp, formatLocalDate, formatTimeOnly, formatDuration, formatRange,
    // 操作
    adjustTime, adjustIndex, updateIndex,
    emitQuery, resetToDefault, expandFull
  }
}

export default useTimeSlider