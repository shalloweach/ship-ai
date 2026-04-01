// src/assets/mapKick/useMarkFlow.js
import { ref } from 'vue'
import { markEventBus, MARK_EVENTS } from './markEventBus'

// ========== 响应式状态（全局单例） ==========
export const markFlow = ref({
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,
  endPoint: null,
  tempMark: null
})

export const pendingMarks = ref([])

// ========== 核心函数 ==========

export const startMarkFlow = (mapState, points, startIdx) => {
    1.从地图上选择另一点
    endIndex = pickPointFromMap(mapState, points)
    if startIdx>endIndex
        a= endIndex
        endIndex = startIdx
        startIdx=endIndex
    2.高亮这段轨迹
    onHighlight(mapState, points[startIdx, endIndex]

 
}


export const pickPointFromMap = async (mapEvent, { trajectoryPoints, mapOp } = {}) => {
  if (mapOp?.pickPointAt) return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
  const clicked = mapEvent.lnglat || mapEvent.latlng
  if (!clicked || !trajectoryPoints?.length) return null
  const threshold = 0.001
  return trajectoryPoints.find(p => 
    Math.abs(p.lat - clicked.lat) < threshold && 
    Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
  )
}

/**
 * 高亮船舶轨迹
 */
export const onHighlight = (mapState, points, options = {}) => {
    const { instance: mapInstance } = mapState
    
    const {
      fitBounds = true,
      // 主轨迹线样式
      lineStyle = { color: '#8b5cf6', width: 2, opacity: 0.9 },
      // 首尾虚线样式（选中状态）
      selectionStyle = { 
        color: '#f59e0b', 
        width: 2, 
        opacity: 0.8,
        strokeDasharray: [8, 4] // 虚线样式：[实线长度, 间隙长度]
      },
      // 端点标记样式
      markerStyle = {
        radius: 5,
        fillColor: '#ffffff',
        strokeColor: '#f59e0b',
        strokeWidth: 2
      }
    } = options
  
    // 转换轨迹点
    const path = points.map(p => parsePointToLngLat(p)).filter(Boolean)
    
    if (path.length < 2) {
      console.warn('🗺️ 有效轨迹点不足 2 个，无法绘制折线')
      return
    }
  
    // 1️⃣ 绘制主轨迹线（实线）
    mapState.trajectoryOverlay = new AMap.Polyline({
      path,
      strokeColor: lineStyle.color || '#8b5cf6',
      strokeWeight: lineStyle.width || 2,
      strokeStyle: 'solid',
      strokeOpacity: lineStyle.opacity ?? 0.9,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 10
    })
    mapState.trajectoryOverlay.setMap(mapInstance)
  
    // 2️⃣ 绘制首尾虚线（选中状态指示）
    if (path.length >= 2) {
      const [startPoint, endPoint] = [path[0], path[path.length - 1]]
      
      mapState.selectionLineOverlay = new AMap.Polyline({
        path: [startPoint, endPoint],
        strokeColor: selectionStyle.color,
        strokeWeight: selectionStyle.width,
        strokeStyle: 'dashed',
        strokeDasharray: selectionStyle.strokeDasharray,
        strokeOpacity: selectionStyle.opacity,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 11 // 略高于主轨迹
      })
      mapState.selectionLineOverlay.setMap(mapInstance)
  
      // 3️⃣ 添加首尾端点标记（增强选中视觉效果）
      mapState.endpointMarkers = []
      const createEndpointMarker = (position, isStart = true) => {
        const marker = new AMap.CircleMarker({
          center: position,
          radius: markerStyle.radius,
          fillColor: markerStyle.fillColor,
          strokeColor: markerStyle.strokeColor,
          strokeWidth: markerStyle.strokeWidth,
          zIndex: 12
        })
        // 可选：添加悬停提示
        marker.setExtData({ type: isStart ? 'start' : 'end' })
        marker.setMap(mapInstance)
        return marker
      }
      
      mapState.endpointMarkers.push(createEndpointMarker(path[0], true))
      mapState.endpointMarkers.push(createEndpointMarker(path[path.length - 1], false))
    }
  
    // 4️⃣ 自动适配视图
    if (fitBounds && path.length >= 2) {
      const overlays = [mapState.trajectoryOverlay]
      if (mapState.selectionLineOverlay) overlays.push(mapState.selectionLineOverlay)
      if (mapState.endpointMarkers) overlays.push(...mapState.endpointMarkers)
      if (mapState.pointMarkers) overlays.push(...mapState.pointMarkers)
      mapInstance.setFitView(overlays)
    }
  }
  

export const handlePointsSelected = async (start, end, options = {}) => {
  const { onHighlight, onEditOpen, mmsi = '' } = options
  const tempMark = createMarkData(start, end)
  
  markFlow.value.tempMark = tempMark
  markFlow.value.mode = 'editing'
  markEventBus.emit(MARK_EVENTS.END, { startPoint: start, endPoint: end, mark: tempMark })
  
  if (onHighlight && start.idx != null && end.idx != null) {
    await onHighlight(start.idx, end.idx, tempMark)
  }
  if (onEditOpen) onEditOpen(tempMark, { isNew: true })
  return tempMark
}

export function createMapClickHandler(options = {}) {
  const { mapOp, trajectoryPoints, mmsi, onHighlight, onEditOpen } = options
  
  return async (e) => {
    const { mode, startPoint } = markFlow.value
    
    // 🔥 等待选终点
    if (mode === 'selecting-end' && startPoint) {
      const point = await pickPointFromMap(e, { trajectoryPoints: trajectoryPoints?.value, mapOp })
      if (point) {
        await handlePointsSelected(startPoint, point, {
          mmsi: mmsi?.value || mmsi, onHighlight, onEditOpen
        })
      }
      return
    }
    // 普通点击由 trajectoryLayer.js 处理弹窗，这里不重复
  }
}


export const cancelMarkFlow = () => {
  markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
}

export const createMarkData = (startPoint, endPoint) => {
  const startTs = startPoint.timestamp || startPoint.utc_time
  const endTs = endPoint.timestamp || endPoint.utc_time
  const [s, e] = startTs < endTs ? [startPoint, endPoint] : [endPoint, startPoint]
  
  return {
    id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: '',
    startTime: Math.min(startTs, endTs),
    endTime: Math.max(startTs, endTs),
    startPoint: { lat: s.lat, lon: s.lon, idx: s.idx },
    endPoint: { lat: e.lat, lon: e.lon, idx: e.idx },
    stayType: '靠泊',
    port: '',
    note: '',
    status: 'draft'
  }
}

export const saveMarkToTable = (markData, { mmsi = '' } = {}) => {
  const mark = { ...markData, mmsi, status: 'draft' }
  const exists = pendingMarks.value.some(m => 
    m.startTime === mark.startTime && m.endTime === mark.endTime
  )
  if (exists) return { success: false, error: 'duplicate' }
  
  pendingMarks.value.push(mark)
  pendingMarks.value.sort((a, b) => a.startTime - b.startTime)  // 🔥 升序
  return { success: true, mark }
}

export const updatePendingMark = (id, field, value) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) { mark[field] = value; return true }
  return false
}

export const removePendingMark = (id) => {
  const idx = pendingMarks.value.findIndex(m => m.id === id)
  return idx >= 0 ? pendingMarks.value.splice(idx, 1)[0] : null
}

export const submitPendingMarks = async (onSubmit) => {
  if (!onSubmit || pendingMarks.value.length === 0) return { success: false, error: 'empty' }
  try {
    const result = await onSubmit(pendingMarks.value.map(m => ({
      mmsi: m.mmsi, startTime: m.startTime, endTime: m.endTime,
      stayType: m.stayType, port: m.port, note: m.note || '',
      startPoint: m.startPoint, endPoint: m.endPoint
    })))
    pendingMarks.value.forEach(m => m.status = 'synced')
    return { success: true, result }
  } catch (err) {
    return { success: false, error: err }
  }
}

export default {
  markFlow, pendingMarks, startMarkFlow, cancelMarkFlow, createMarkData,
  saveMarkToTable, updatePendingMark, removePendingMark, submitPendingMarks
}