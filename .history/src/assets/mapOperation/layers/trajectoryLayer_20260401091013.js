/**
 * 船舶轨迹渲染与管理
 */
import { parsePointToLngLat } from '../utils/mapUtils'
import { startMarkFlow } from '@/assets/mapKick/useMarkFlow'
/**
 * 渲染船舶轨迹
 */
export const renderTrajectory = (mapState, points, options = {}, popupApi) => {
  const { instance: mapInstance } = mapState
  
  if (!mapInstance || !Array.isArray(points) || points.length === 0) {
    console.warn('🗺️ renderTrajectory: 地图未初始化或无轨迹数据')
    return
  }

  const {
    showPoints = true,
    fitBounds = true,
    lineStyle = { color: '#8b5cf6', width: 2, opacity: 0.9 }
  } = options

  // 先清理旧轨迹
  clearTrajectory(mapState)

  // 转换轨迹点
  const path = points.map(p => parsePointToLngLat(p)).filter(Boolean)
  
  if (path.length < 2) {
    console.warn('🗺️ 有效轨迹点不足 2 个，无法绘制折线')
    return
  }

  // 绘制轨迹线
  mapState.trajectoryOverlay = new AMap.Polyline({
    path,
    strokeColor: lineStyle.color || '#8b5cf6',
    strokeWeight: lineStyle.width || 2,
    strokeStyle: 'solid',
    strokeOpacity: lineStyle.opacity ?? 0.9,
    lineJoin: 'round',
    zIndex: 10
  })
  mapState.trajectoryOverlay.setMap(mapInstance)

  // 绘制轨迹点标记（性能优化）
  if (showPoints && path.length <= 5000) {
    mapState.pointMarkers = path.map((lnglat, idx) => {
      const marker = new AMap.Marker({
        position: lnglat,
        map: mapInstance,
        title: `轨迹点 #${idx + 1}`,
        content: `<div style="
          width: 8px; height: 8px;
          background: ${lineStyle.color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        "></div>`,
        offset: new AMap.Pixel(-4, -4),
        zIndex: 11,
        extData: { index: idx, point: points[idx] }
      })
      
      marker.on('click', () => {
        // 🔧 传入 callbacks 对象
        popupApi?.showPopup?.(marker, points[idx], {
          // 🏷️ 标记按钮点击回调
          onMarkClick: (point) => {
            console.log('🏷️ 创建标记，起点:', point)
            startMarkFlow(point)
            popupApi?.closePopup?.()
          }
        })
      })
      
      
      return marker
    })
  } else if (path.length > 5000) {
    console.log(`🗺️ 轨迹点 ${path.length} > 5000，跳过绘制标记以优化性能`)
  }

  // 自动适配视图
  if (fitBounds && path.length >= 2) {
    mapInstance.setFitView([mapState.trajectoryOverlay, ...mapState.pointMarkers])
  }
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

  // 清理旧overlay（避免重复绘制）
  if (mapState.trajectoryOverlay) {
    mapState.trajectoryOverlay.setMap(null)
  }
  if (mapState.selectionLineOverlay) {
    mapState.selectionLineOverlay.setMap(null)
  }
  // 清理旧端点标记
  if (mapState.endpointMarkers?.length) {
    mapState.endpointMarkers.forEach(m => m.setMap(null))
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

  // 返回绘制结果，便于外部调用管理
  return {
    trajectory: mapState.trajectoryOverlay,
    selectionLine: mapState.selectionLineOverlay,
    endpoints: mapState.endpointMarkers
  }
}


/**
 * 清空轨迹相关覆盖物
 */
export const clearTrajectory = (mapState) => {
  if (mapState.trajectoryOverlay) {
    mapState.trajectoryOverlay.setMap(null)
    mapState.trajectoryOverlay = null
  }
  
  if (mapState.pointMarkers.length > 0) {
    mapState.pointMarkers.forEach(marker => marker.setMap(null))
    mapState.pointMarkers = []
  }
  
  if (mapState.infoWindows.length > 0) {
    mapState.infoWindows.forEach(win => win.close())
    mapState.infoWindows = []
  }
}