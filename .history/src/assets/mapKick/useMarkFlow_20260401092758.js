// src/assets/mapKick/onMapClick.js

处理点击标记后的
import { ref } from 'vue'
const listeners = {}

export const markEventBus = {
  on(event, callback) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(callback)
    return () => { listeners[event] = listeners[event]?.filter(cb => cb !== callback) }
  },
  emit(event, data) {
    listeners[event]?.forEach(cb => { try { cb(data) } catch(e) { console.error(e) } })
  },
  clear(event) { if (event) delete listeners[event]; else Object.keys(listeners).forEach(k => delete listeners[k]) }
}

export const MARK_EVENTS = {
  START: 'mark:start',      // 点击🏷️按钮
  END: 'mark:end',          // 选择终点完成
  SAVED: 'mark:saved',      // 标记已保存
  SUBMITTED: 'mark:submitted',
  CANCEL: 'mark:cancel'
}

export default markEventBus
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
    onHighlight(mapState, points[startIdx, endIndex])
    3.打开编辑面板
    tempMark = createMarkData = (points(startIdx), points(endPoint))
    onEditOpen(tempMark, { isNew: true })

 
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
