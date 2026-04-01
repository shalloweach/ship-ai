/**
 * 船舶轨迹渲染与管理
 */
import { parsePointToLngLat } from '../utils/mapUtils'

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
          
          onMarkClick: (point) => {
            console.log('🏷️ 创建标记，起点:', point)
            startMarkFlow(point)
            closePopup()
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