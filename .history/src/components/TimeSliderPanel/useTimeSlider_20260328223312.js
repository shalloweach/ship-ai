// src/components/TimeSliderPanel/useTimeSlider.js

// 实现功能：1.时间查询和索引查询，双轴联动管理时间变化自动计算对应索引，索引变化自动计算对应时间


2. 范围控制

时间调整（adjustTime）：按分钟为单位调整起止时间，自动同步索引

索引调整（adjustIndex）：按步长调整起止索引，自动同步时间


import { ref, computed, watch } from 'vue'
import { TIME_STEPS, INDEX_STEPS, DEFAULT_TIME_STEP, DEFAULT_INDEX_STEP } from '../config'
import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp
} from '../timeUtils'

export function useTimeSlider(props, emit) {
  // ========== 响应式状态 ==========
  const timeStep = ref(DEFAULT_TIME_STEP)
  const indexStep = ref(DEFAULT_INDEX_STEP)
  const startTimestamp = ref(props.currentStartTs)
  const endTimestamp = ref(props.currentEndTs)
  const startIndex = ref(props.currentStartIdx)
  const endIndex = ref(props.currentEndIdx)
  const collapsed = ref(false)
  
  // 🔥 移除 syncEnabled，改为始终联动
  // const syncEnabled = ref(true)  ← 删除

  // ========== 计算属性 ==========
  const previewText = computed(() => {
    const t = startTimestamp.value && endTimestamp.value 
      ? `time:[${startTimestamp.value},${endTimestamp.value}]` 
      : 'time:[-,-]'
    const i = `idx:[${startIndex.value},${endIndex.value}]`
    return `${t} | ${i}`
  })

  // ========== 边界校验（内部使用，不触发同步） ==========
  const clampTimeRange = () => {
    if (props.globalMinTs !== null) {
      startTimestamp.value = Math.max(props.globalMinTs, startTimestamp.value)
    }
    if (props.globalMaxTs !== null) {
      endTimestamp.value = Math.min(props.globalMaxTs, endTimestamp.value)
    }
    // 确保 start < end
    if (startTimestamp.value >= endTimestamp.value) {
      endTimestamp.value = startTimestamp.value + 1000 // 至少差1秒
    }
  }

  const clampIndexRange = () => {
    startIndex.value = clamp(startIndex.value, props.globalMinIdx, props.globalMaxIdx)
    endIndex.value = clamp(endIndex.value, props.globalMinIdx, props.globalMaxIdx)
    // 确保 start < end
    if (startIndex.value >= endIndex.value) {
      endIndex.value = startIndex.value + 1
    }
  }

  // ========== 🔗 联动同步函数（核心修复） ==========
  
  /** 时间 → 索引：根据时间比例计算对应索引 */
  const syncIndexFromTime = () => {
    // 缺少全局范围时无法同步
    if (props.globalMinTs == null || props.globalMaxTs == null) return
    if (props.globalMinIdx == null || props.globalMaxIdx == null) return
    if (props.globalMaxTs <= props.globalMinTs) return
    
    const timeSpan = props.globalMaxTs - props.globalMinTs
    const idxSpan = props.globalMaxIdx - props.globalMinIdx
    
    // 计算比例 [0, 1]
    const ratioStart = (startTimestamp.value - props.globalMinTs) / timeSpan
    const ratioEnd = (endTimestamp.value - props.globalMinTs) / timeSpan
    
    // 映射到索引范围
    const newStartIdx = Math.round(props.globalMinIdx + ratioStart * idxSpan)
    const newEndIdx = Math.round(props.globalMinIdx + ratioEnd * idxSpan)
    
    // 应用并校验
    startIndex.value = clamp(newStartIdx, props.globalMinIdx, props.globalMaxIdx)
    endIndex.value = clamp(newEndIdx, startIndex.value + 1, props.globalMaxIdx)
  }

  /** 索引 → 时间：根据索引比例计算对应时间 */
  const syncTimeFromIndex = () => {
    if (props.globalMinTs == null || props.globalMaxTs == null) return
    if (props.globalMinIdx == null || props.globalMaxIdx == null) return
    if (props.globalMaxIdx <= props.globalMinIdx) return
    
    const timeSpan = props.globalMaxTs - props.globalMinTs
    const idxSpan = props.globalMaxIdx - props.globalMinIdx
    
    // 计算比例 [0, 1]
    const ratioStart = (startIndex.value - props.globalMinIdx) / idxSpan
    const ratioEnd = (endIndex.value - props.globalMinIdx) / idxSpan
    
    // 映射到时间范围（毫秒）
    const newStartTs = Math.round(props.globalMinTs + ratioStart * timeSpan)
    const newEndTs = Math.round(props.globalMinTs + ratioEnd * timeSpan)
    
    // 应用并校验
    startTimestamp.value = clamp(newStartTs, props.globalMinTs, props.globalMaxTs)
    endTimestamp.value = clamp(newEndTs, startTimestamp.value + 1000, props.globalMaxTs)
  }

  // ========== 🎛️ 调整函数（用户操作入口） ==========
  
  /** 调整时间（分钟为单位）→ 自动同步索引 */
  const adjustTime = (which, minutes) => {
    // 🔥 关键修复：分钟 → 毫秒
    const delta = minutes * 60 * 1000
    
    if (which === 'start') {
      const newStart = startTimestamp.value + delta
      const upperLimit = endTimestamp.value - 1000 // 至少差1秒
      startTimestamp.value = clamp(newStart, props.globalMinTs, upperLimit)
    } else {
      const newEnd = endTimestamp.value + delta
      const lowerLimit = startTimestamp.value + 1000 // 至少差1秒
      endTimestamp.value = clamp(newEnd, lowerLimit, props.globalMaxTs)
    }
    
    // 🔗 始终联动：时间变 → 索引同步
    syncIndexFromTime()
  }

  /** 调整索引 → 自动同步时间 */
  const adjustIndex = (which, step) => {
    if (which === 'start') {
      startIndex.value = clamp(
        startIndex.value + step,
        props.globalMinIdx,
        endIndex.value - 1  // 保持 start < end
      )
    } else {
      endIndex.value = clamp(
        endIndex.value + step,
        startIndex.value + 1,  // 保持 start < end
        props.globalMaxIdx
      )
    }
    
    // 🔗 始终联动：索引变 → 时间同步
    syncTimeFromIndex()
  }

  // ========== 📤 操作函数 ==========
  
  const emitQuery = () => {
    // 发射前确保范围合法
    clampTimeRange()
    clampIndexRange()
    
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
    if (props.globalMinTs != null && props.globalMaxTs != null) {
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

  // ========== 👂 监听 Props 变化 ==========
  
  watch(
    () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
    ([newStartTs, newEndTs, newStartIdx, newEndIdx]) => {
      // 仅当外部主动更新时才同步（避免内部调整时反向覆盖）
      if (newStartTs != null && newStartTs !== startTimestamp.value) {
        startTimestamp.value = newStartTs
      }
      if (newEndTs != null && newEndTs !== endTimestamp.value) {
        endTimestamp.value = newEndTs
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
    () => [props.globalMinTs, props.globalMaxTs, props.globalMinIdx, props.globalMaxIdx],
    () => {
      // 全局范围变化时，重新校验当前值
      clampTimeRange()
      clampIndexRange()
    }
  )
/**
 * 渲染轨迹到地图
 */
export const renderTrajectoryToMap = (map, points, layers = {}) => {
  const { polylineStyle } = MAP_CONFIG
  
  // 清理旧图层
  layers.markers?.clearLayers()
  if (layers.trajectory && map.hasLayer(layers.trajectory)) {
    map.removeLayer(layers.trajectory)
  }
  
  if (!points?.length) return { markers: null, trajectory: null }
  
  const latlngs = points.map(p => [p.lat, p.lon])
  
  // 绘制轨迹线
  const trajectory = L.polyline(latlngs, { ...polylineStyle }).addTo(map)
  
  // 添加采样标记点
  const markers = L.layerGroup()
  const sampledPoints = samplePointsForMarkers(points)
  
  sampledPoints.forEach(point => {
    createMarker(point).addTo(markers)
  })
  markers.addTo(map)
  
  // 自适应缩放
  if (latlngs.length >= 2) {
    const { fitBoundsPadding } = MAP_CONFIG
    map.fitBounds(L.latLngBounds(latlngs), { 
      padding: fitBoundsPadding, 
      maxZoom: 15 
    })
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 12)
  }
  
  return { markers, trajectory }
}
  // ========== 🔓 暴露方法 ==========
  
  const exposeMethods = {
    refresh: emitQuery,
    collapse: () => { collapsed.value = true },
    expand: () => { collapsed.value = false },
    setParams: (params) => {
      if (params.time?.start != null) startTimestamp.value = params.time.start
      if (params.time?.end != null) endTimestamp.value = params.time.end
      if (params.index?.start != null) startIndex.value = params.index.start
      if (params.index?.end != null) endIndex.value = params.index.end
    }
  }

  return {
    // 状态（移除 syncEnabled）
    timeStep, indexStep, startTimestamp, endTimestamp,
    startIndex, endIndex, collapsed,
    // 配置
    TIME_STEPS, INDEX_STEPS,
    // 计算属性
    previewText,
    // 工具函数
    formatTimestamp, formatLocalDate, formatTimeOnly,
    formatDuration, formatRange,
    // 操作方法
    adjustTime, adjustIndex, toggleCollapse,
    emitQuery, resetToDefault, expandFull,
    exposeMethods
  }
}