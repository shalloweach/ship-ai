// src/components/TimeSliderPanel/useTimeSlider.js
import { ref, computed, watch } from 'vue'
import { TIME_CONFIG } from '../config'
import {
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, clamp, toSeconds, toMilliseconds
} from '../timeUtils'

// 地图相关依赖（按需引入，避免循环依赖）
let L = null
const initLeaflet = async () => {
  if (!L) {
    L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
  }
  return L
}

export function useTimeSlider(props, emit) {
  // ========== 响应式状态 ==========
  const timeStep = ref(TIME_CONFIG.DEFAULT_TIME_STEP)
  const indexStep = ref(TIME_CONFIG.DEFAULT_INDEX_STEP)
  
  // 查询参数（秒级时间戳，与后端一致）
  const startTimestamp = ref(props.currentStartTs)
  const endTimestamp = ref(props.currentEndTs)
  const startIndex = ref(props.currentStartIdx)
  const endIndex = ref(props.currentEndIdx)
  
  // UI 状态
  const collapsed = ref(false)
  const isEditingIndex = ref({ start: false, end: false }) // 索引输入框编辑状态
  
  // 地图相关（懒加载）
  const mapInstance = ref(null)
  const trajectoryLayer = ref(null)
  const markerLayer = ref(null)

  // ========== 计算属性 ==========
  
  // 动态全局最大索引（使用传入的总点数）
  const globalMaxIdx = computed(() => {
    return props.totalPoints != null && props.totalPoints > 0 
      ? props.totalPoints - 1  // 索引从0开始
      : props.globalMaxIdx     // 降级使用props
  })
  
  // 参数预览（调试用）
  const previewText = computed(() => {
    const t = startTimestamp.value && endTimestamp.value 
      ? `time:[${toSeconds(startTimestamp.value)},${toSeconds(endTimestamp.value)}]` 
      : 'time:[-,-]'
    const i = `idx:[${startIndex.value},${endIndex.value}]`
    return `${t} | ${i}`
  })
  
  // 查询参数构建（秒级，供API使用）
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
    
    // 确保 start < end (至少差1秒)
    if (startTimestamp.value >= endTimestamp.value - 1000) {
      endTimestamp.value = startTimestamp.value + 1000
    }
  }

  const clampIndexRange = () => {
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    startIndex.value = clamp(startIndex.value, minIdx, maxIdx)
    endIndex.value = clamp(endIndex.value, minIdx, maxIdx)
    
    // 确保 start < end
    if (startIndex.value >= endIndex.value) {
      endIndex.value = Math.min(maxIdx, startIndex.value + 1)
    }
  }

  // ========== 🔗 联动同步（始终启用） ==========
  
  /** 时间 → 索引：按时间比例映射到索引 */
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

  /** 索引 → 时间：按索引比例映射到时间 */
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
  
  /** 调整时间（分钟为单位）→ 自动同步索引 */
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60 * 1000  // 🔥 分钟→毫秒
    
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
    
    syncIndexFromTime()  // 🔗 始终联动
  }

  /** 调整索引 → 自动同步时间 */
  const adjustIndex = (which, step) => {
    const minIdx = props.globalMinIdx ?? 0
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(startIndex.value + step, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(endIndex.value + step, startIndex.value + 1, maxIdx)
    }
    
    syncTimeFromIndex()  // 🔗 始终联动
  }

  /** 直接修改索引值（输入框变更时调用） */
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
    
    syncTimeFromIndex()  // 🔗 始终联动
    isEditingIndex.value[which] = false  // 退出编辑状态
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
    startTimestamp.value = props.currentStartTs
    endTimestamp.value = props.currentEndTs
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

  // ========== 🗺️ 地图操作函数（集成到本文件） ==========
  
  /** 初始化地图实例 */
  const initMap = async (container, options = {}) => {
    const Leaflet = await initLeaflet()
    
    if (mapInstance.value) {
      mapInstance.value.remove()
    }
    
    mapInstance.value = Leaflet.map(container, {
      center: options.center || [31.2304, 121.4737],  // 默认上海
      zoom: options.zoom || 10,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: true
    })
    
    Leaflet.tileLayer(options.tileLayer || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: options.attribution || '&copy; OpenStreetMap'
    }).addTo(mapInstance.value)
    
    return mapInstance.value
  }

  /** 渲染轨迹线到地图 */
  const renderTrajectory = (points, options = {}) => {
    if (!mapInstance.value || !points?.length) return null
    
    // 清理旧图层
    if (trajectoryLayer.value) {
      mapInstance.value.removeLayer(trajectoryLayer.value)
    }
    if (markerLayer.value) {
      mapInstance.value.removeLayer(markerLayer.value)
    }
    
    // 提取坐标 [lat, lng]
    const latlngs = points.map(p => [
      p.latitude || p.lat,
      p.longitude || p.lng || p.lon
    ]).filter(([lat, lng]) => lat != null && lng != null)
    
    if (latlngs.length < 2) return null
    
    // 创建轨迹线
    const style = {
      color: options.color || '#3b82f6',
      weight: options.weight || 3,
      opacity: options.opacity || 0.8,
      ...options.style
    }
    
    trajectoryLayer.value = Leaflet.polyline(latlngs, style).addTo(mapInstance.value)
    
    // 可选：添加采样标记点（避免过多标记影响性能）
    if (options.showMarkers !== false && points.length <= 1000) {
      const sampled = samplePoints(points, Math.min(50, points.length))
      markerLayer.value = Leaflet.layerGroup(
        sampled.map(p => {
          const marker = Leaflet.circleMarker(
            [p.latitude || p.lat, p.longitude || p.lng],
            { radius: 3, color: style.color, fillColor: style.color, fillOpacity: 0.6 }
          )
          if (options.onMarkerClick) {
            marker.on('click', () => options.onMarkerClick(p))
          }
          return marker
        })
      ).addTo(mapInstance.value)
    }
    
    // 自动适配视野
    if (options.fitBounds !== false) {
      fitBounds(latlngs, options.padding || [50, 50])
    }
    
    return trajectoryLayer.value
  }

  /** 清除轨迹 */
  const clearTrajectory = () => {
    if (!mapInstance.value) return
    if (trajectoryLayer.value) {
      mapInstance.value.removeLayer(trajectoryLayer.value)
      trajectoryLayer.value = null
    }
    if (markerLayer.value) {
      mapInstance.value.removeLayer(markerLayer.value)
      markerLayer.value = null
    }
  }

  /** 适配视野到坐标范围 */
  const fitBounds = (latlngs, padding = [50, 50]) => {
    if (!mapInstance.value || !latlngs?.length) return
    const bounds = Leaflet.latLngBounds(latlngs)
    mapInstance.value.fitBounds(bounds, { padding, maxZoom: 15 })
  }

  /** 居中到指定点 */
  const centerOn = (lat, lng, zoom = null) => {
    if (!mapInstance.value || lat == null || lng == null) return
    mapInstance.value.setView([lat, lng], zoom || mapInstance.value.getZoom(), { animate: true })
  }

  /** 采样点（用于标记显示，避免过多点影响性能） */
  const samplePoints = (points, count) => {
    if (!points || points.length <= count) return points
    const step = Math.floor(points.length / count)
    return points.filter((_, i) => i % step === 0)
  }

  /** 获取地图实例（供外部调用） */
  const getMap = () => mapInstance.value

  // ========== 👂 监听 Props 变化 ==========
  
  watch(
    () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
    ([newStartTs, newEndTs, newStartIdx, newEndIdx]) => {
      // 外部主动更新时同步（避免内部调整时反向覆盖）
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
    // 查询操作
    refresh: emitQuery,
    reset: resetToDefault,
    expand: expandFull,
    setParams: (params) => {
      if (params.time?.start != null) startTimestamp.value = toMilliseconds(params.time.start)
      if (params.time?.end != null) endTimestamp.value = toMilliseconds(params.time.end)
      if (params.index?.start != null) startIndex.value = params.index.start
      if (params.index?.end != null) endIndex.value = params.index.end
    },
    // 地图操作
    initMap, renderTrajectory, clearTrajectory, fitBounds, centerOn, getMap,
    // 状态访问
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
    // 配置常量
    TIME_STEPS: TIME_CONFIG.TIME_STEPS,
    INDEX_STEPS: TIME_CONFIG.INDEX_STEPS,
    // 工具函数（供模板使用）
    formatTimestamp, formatLocalDate, formatTimeOnly,
    formatDuration, formatRange, toSeconds, toMilliseconds,
    // 操作方法
    adjustTime, adjustIndex, updateIndex, toggleCollapse,
    emitQuery, resetToDefault, expandFull,
    // 地图操作
    initMap, renderTrajectory, clearTrajectory, fitBounds, centerOn, getMap,
    // 暴露方法
    exposeMethods
  }
}