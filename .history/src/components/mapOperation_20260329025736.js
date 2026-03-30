src\components\mapOperation.js

// /**
//  * 构建轨迹点弹窗内容
//  */
export const buildPopupContent = (point) => {
  return `
    <div style="min-width: 200px; font-size: 12px; line-height: 1.6;">
      <div style="font-weight: 600; color: #0066cc; margin-bottom: 6px;">
        🚢 轨迹点 #${point.idx}
      </div>
      <hr style="margin: 4px 0; border: 0; border-top: 1px solid #eee;">
      <div><b>🕐 时间:</b> ${formatTime(point.timestamp)}</div>
      <div><b>📍 坐标:</b> [${formatCoordinate(point.lat)}, ${formatCoordinate(point.lon)}]</div>
      <div><b>⚡ 速度:</b> ${formatValue(point.speed, ' 节')}</div>
      <div><b>🧭 航向:</b> ${formatValue(point.course, '°')}</div>
      <div><b>🎯 目的地:</b> ${point.destination}</div>
      <div><b>🌊 吃水:</b> ${formatValue(point.draught, 'm')}</div>
      <div><b>📊 状态:</b> ${point.navigationStatus}</div>
    </div>
  `
}


import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_STYLES } from '@/components/config'
import { formatTimeOnly, formatDuration } from '@/components/timeUtils'

export function useMap(containerRef) {
  let map = null
  const layers = {
    trajectory: null,
    ship: null,
    stayMarkers: new Map()  // id -> { rect, icon }
  }
  
  const isMapReady = { value: false }

  

  /**
   * 渲染轨迹线
   */
  const renderTrajectory = (points, options = {}) => {
    if (!map || !isMapReady.value || !points?.length) return null
    
    // 清理旧轨迹
    if (layers.trajectory && map.hasLayer(layers.trajectory)) {
      map.removeLayer(layers.trajectory)
    }
    
    // 提取有效坐标
    const coords = points
      .map(p => [p.lat, p.lng])
      .filter(([lat, lng]) => lat != null && lng != null)
    
    if (coords.length < 2) return null
    
    // 创建 polyline
    const style = { ...MAP_STYLES.trajectory, ...(options.style || {}) }
    layers.trajectory = L.polyline(coords, style).addTo(map)
    
    // 自动适配视野
    if (options.fitBounds !== false) {
      fitBounds(coords, options.padding || [50, 50])
    }
    
    return layers.trajectory
  }

  /**
   * 更新播放中的轨迹样式
   */
  const updatePlayingTrajectory = (visibleRange, points) => {
    if (!map || !layers.trajectory) return
    
    const { start = 0, end = points.length - 1 } = visibleRange
    const visibleCoords = points.slice(start, end + 1)
      .map(p => [p.lat, p.lng])
      .filter(([lat, lng]) => lat != null && lng != null)
    
    if (visibleCoords.length < 2) return
    
    // 高亮已播放部分（简单方案：重绘）
    const tempLine = L.polyline(visibleCoords, MAP_STYLES.trajectoryPlaying)
    tempLine.addTo(map)
    
    return tempLine
  }

  /**
   * 显示/更新船舶图标
   */
  const updateShipMarker = (point, options = {}) => {
    if (!map || !point?.lat || !point?.lng) return null
    
    const { heading = 0 } = point
    
    // 移除旧图标
    if (layers.ship && map.hasLayer(layers.ship)) {
      map.removeLayer(layers.ship)
    }
    
    // 创建旋转图标
    const icon = L.divIcon({
      className: 'ship-marker',
      html: `<div style="transform:rotate(${heading}deg);transition:transform 0.3s ease;font-size:24px">🚢</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    
    layers.ship = L.marker([point.lat, point.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <b>🚢 船舶位置</b><br/>
        🕐 ${formatTimeOnly(point.timestamp)}<br/>
        ⚡ ${point.speed?.toFixed(1) || '-'} kn<br/>
        🧭 ${heading}°
      `)
    
    // 平滑移动动画
    if (options.animate && options.duration) {
      animateMarker(layers.ship, [point.lat, point.lng], options.duration)
    }
    
    return layers.ship
  }

  /**
   * 绘制停留标记区域
   */
  const drawStayMarker = (marker) => {
    if (!map || !marker?.startPoint || !marker?.endPoint) return null
    
    const { id, startPoint, endPoint, stayType, port } = marker
    const style = MAP_STYLES.stayMarker[stayType] || MAP_STYLES.stayMarker.其他
    
    // 创建包围盒
    const bounds = L.latLngBounds(
      [startPoint.lat, startPoint.lng],
      [endPoint.lat, endPoint.lng]
    )
    
    // 绘制区域矩形
    const rect = L.rectangle(bounds, {
      color: style.color,
      weight: 2,
      fillOpacity: style.fillOpacity,
      dashArray: '5,5'
    }).addTo(map)
    
    // 添加起点图标
    const iconMarker = L.marker([startPoint.lat, startPoint.lng], {
      icon: L.divIcon({
        className: 'stay-icon',
        html: `<span style="font-size:20px">${style.icon}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map)
    
    // 绑定弹窗
    const popup = `
      <b>${style.icon} ${stayType}</b><br/>
      📍 ${port || '未知'}<br/>
      🕐 ${formatTimeOnly(marker.startTime)} ~ ${formatTimeOnly(marker.endTime)}<br/>
      ⏱️ ${formatDuration((marker.endTime - marker.startTime) * 1000)}
    `
    rect.bindPopup(popup)
    iconMarker.bindPopup(popup)
    
    // 保存到 layers
    layers.stayMarkers.set(id, { rect, iconMarker })
    
    return { rect, iconMarker }
  }

  /**
   * 移除停留标记
   */
  const removeStayMarker = (id) => {
    const markerLayers = layers.stayMarkers.get(id)
    if (!markerLayers || !map) return false
    
    if (markerLayers.rect && map.hasLayer(markerLayers.rect)) {
      map.removeLayer(markerLayers.rect)
    }
    if (markerLayers.iconMarker && map.hasLayer(markerLayers.iconMarker)) {
      map.removeLayer(markerLayers.iconMarker)
    }
    
    layers.stayMarkers.delete(id)
    return true
  }

  /**
   * 清空所有停留标记
   */
  const clearStayMarkers = () => {
    layers.stayMarkers.forEach(({ rect, iconMarker }) => {
      if (map) {
        if (rect && map.hasLayer(rect)) map.removeLayer(rect)
        if (iconMarker && map.hasLayer(iconMarker)) map.removeLayer(iconMarker)
      }
    })
    layers.stayMarkers.clear()
  }

  /**
   * 清空轨迹
   */
  const clearTrajectory = () => {
    if (!map) return
    if (layers.trajectory && map.hasLayer(layers.trajectory)) {
      map.removeLayer(layers.trajectory)
      layers.trajectory = null
    }
    if (layers.ship && map.hasLayer(layers.ship)) {
      map.removeLayer(layers.ship)
      layers.ship = null
    }
  }

  /**
   * 适配视野到坐标范围
   */
  const fitBounds = (coords, padding = [50, 50]) => {
    if (!map || !coords?.length) return
    const bounds = L.latLngBounds(coords)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding, maxZoom: 15 })
    }
  }

  /**
   * 居中到指定点
   */
  const centerOn = (lat, lng, zoom = null) => {
    if (!map || lat == null || lng == null) return
    map.setView([lat, lng], zoom || map.getZoom(), { animate: true })
  }

  /**
   * 标记点平滑移动动画
   */
  const animateMarker = (marker, targetLatLng, duration = 1000) => {
    const start = marker.getLatLng()
    const startTime = Date.now()
    
    const step = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 缓动函数
      const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const eased = ease(progress)
      
      const lat = start.lat + (targetLatLng[0] - start.lat) * eased
      const lng = start.lng + (targetLatLng[1] - start.lng) * eased
      
      marker.setLatLng([lat, lng])
      
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }

  /**
   * 清理资源
   */
  const destroy = () => {
    if (map) {
      map.remove()
      map = null
    }
    layers.trajectory = null
    layers.ship = null
    layers.stayMarkers.clear()
    isMapReady.value = false
  }

  // 暴露方法
  const expose = () => ({
    map,
    isMapReady,
    init,
    renderTrajectory,
    updatePlayingTrajectory,
    updateShipMarker,
    drawStayMarker,
    removeStayMarker,
    clearStayMarkers,
    clearTrajectory,
    fitBounds,
    centerOn,
    destroy
  })

  return {
    map,
    isMapReady,
    init,
    renderTrajectory,
    updatePlayingTrajectory,
    updateShipMarker,
    drawStayMarker,
    removeStayMarker,
    clearStayMarkers,
    clearTrajectory,
    fitBounds,
    centerOn,
    destroy,
    expose
  }
}

export default useMap