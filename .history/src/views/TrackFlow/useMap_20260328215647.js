// src/views/TrackFlow/useMap.js

import L from 'leaflet'
import { MAP_CONFIG } from './utils/config'
import { formatTime, formatValue, formatCoordinate } from './utils/formatters'

/**
 * 构建轨迹点弹窗内容
 */
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

/**
 * 创建轨迹点标记
 */
export const createMarker = (point) => {
  const { markerStyle } = MAP_CONFIG
  
  const marker = L.circleMarker([point.lat, point.lon], {
    ...markerStyle
  })
  
  marker.bindPopup(buildPopupContent(point))
  return marker
}

/**
 * 采样点用于标记显示（避免过多标记影响性能）
 */
export const samplePointsForMarkers = (points, maxMarkers = MAP_CONFIG.maxMarkers) => {
  if (points.length <= maxMarkers) return points
  
  const step = Math.max(1, Math.floor(points.length / maxMarkers))
  return points.filter((_, i) => i % step === 0)
}

/**
 * 初始化地图实例
 */
export const initLeafletMap = (container, options = {}) => {
  const { defaultCenter, defaultZoom, maxZoom } = MAP_CONFIG
  
  const map = L.map(container, {
    center: options.center || defaultCenter,
    zoom: options.zoom || defaultZoom,
    zoomControl: options.zoomControl ?? true,
    attributionControl: options.attributionControl ?? true,
    ...options
  })
  
  // 添加 OSM 底图
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map)
  
  return map
}

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

/**
 * 清理地图资源
 */
export const cleanupMap = (map, layers = {}) => {
  if (layers.markers) {
    map?.removeLayer(layers.markers)
  }
  if (layers.trajectory) {
    map?.removeLayer(layers.trajectory)
  }
  if (map) {
    map.remove()
  }
}

/**
 * 地图居中到轨迹范围
 */
export const centerMapToTrajectory = (map, trajectoryLayer) => {
  if (!map || !trajectoryLayer) return
  
  const bounds = trajectoryLayer.getBounds()
  if (bounds?.isValid()) {
    const { fitBoundsPadding } = MAP_CONFIG
    map.fitBounds(bounds, { padding: fitBoundsPadding })
  }
}


/**
 * 标记停留
 */
// 样式配置
const STYLES = {
  trajectory: {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.8
  },
  trajectoryPlaying: {
    color: '#10b981',
    weight: 4,
    opacity: 1
  },
  shipIcon: {
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  },
  stayMarker: {
    berth: { color: '#10b981', fillOpacity: 0.2, icon: '🏭' },
    anchor: { color: '#3b82f6', fillOpacity: 0.2, icon: '⚓' },
    abnormal: { color: '#ef4444', fillOpacity: 0.3, icon: '⚠️' },
    other: { color: '#6b7280', fillOpacity: 0.15, icon: '📦' }
  }
}


// 更新播放中的轨迹（高亮已播放部分）
const updatePlayingTrajectory = (visibleRange, points) => {
  if (!map.value || !layers.value.trajectory) return
  
  const { start = 0, end = points.length - 1 } = visibleRange
  const visibleCoords = points.slice(start, end + 1).map(p => [p.lat, p.lng])
  
  // 更新样式为播放状态
  layers.value.trajectory.setStyle(STYLES.trajectoryPlaying)
  
  // 如果需要动态更新线段（性能考虑：建议重绘）
  // 简单方案：重绘可见部分
  const tempLine = L.polyline(visibleCoords, STYLES.trajectoryPlaying)
  tempLine.addTo(map.value)
  
  return tempLine
}

// 显示/更新船舶图标
const updateShipMarker = (point, options = {}) => {
  if (!map.value || !point) return
  
  const { lat, lng, heading = 0 } = point
  
  // 移除旧图标
  if (layers.value.ship) {
    map.value.removeLayer(layers.value.ship)
  }
  
  // 创建旋转图标（根据航向）
  const icon = L.divIcon({
    className: 'ship-marker',
    html: `
      <div style="
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease;
      ">🚢</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
  
  layers.value.ship = L.marker([lat, lng], { icon })
    .addTo(map.value)
    .bindPopup(`
      <b>🚢 船舶实时位置</b><br/>
      时间: ${new Date(point.timestamp * 1000).toLocaleString()}<br/>
      速度: ${point.speed?.toFixed(1) || '-'} kn<br/>
      航向: ${heading}°
    `)
  
  // 平滑移动动画（可选）
  if (options.animate) {
    animateMarker(layers.value.ship, [lat, lng], options.duration || 1000)
  }
  
  return layers.value.ship
}

// 绘制停留标记区域
const drawStayMarker = (marker) => {
  if (!map.value || !marker.startPoint || !marker.endPoint) return
  
  const { id, startPoint, endPoint, stayType, port } = marker
  const style = STYLES.stayMarker[stayType] || STYLES.stayMarker.other
  
  // 创建矩形区域（简化：用两点包围盒）
  const bounds = L.latLngBounds(
    [startPoint.lat, startPoint.lng],
    [endPoint.lat, endPoint.lng]
  )
  
  // 绘制区域
  const rect = L.rectangle(bounds, {
    color: style.color,
    weight: 2,
    fillOpacity: style.fillOpacity,
    dashArray: '5,5'
  }).addTo(map.value)
  
  // 添加标记图标（起点）
  const iconMarker = L.marker([startPoint.lat, startPoint.lng], {
    icon: L.divIcon({
      className: 'stay-icon',
      html: `<span style="font-size:20px">${style.icon}</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }).addTo(map.value)
  
  // 绑定弹窗
  const popupContent = `
    <b>${style.icon} ${stayType}</b><br/>
    📍 ${port}<br/>
    🕐 ${formatTime(marker.startTime)} ~ ${formatTime(marker.endTime)}<br/>
    ⏱️ ${formatDuration(marker.endTime - marker.startTime)}
  `
  rect.bindPopup(popupContent)
  iconMarker.bindPopup(popupContent)
  
  // 保存到 layers
  layers.value.stayMarkers.set(id, { rect, iconMarker })
  
  return { rect, iconMarker }
}

// 移除停留标记
const removeStayMarker = (id) => {
  const layers = layers.value.stayMarkers.get(id)
  if (layers && map.value) {
    map.value.removeLayer(layers.rect)
    map.value.removeLayer(layers.iconMarker)
    layers.value.stayMarkers.delete(id)
    return true
  }
  return false
}

// 清空所有标记
const clearStayMarkers = () => {
  layers.value.stayMarkers.forEach(({ rect, iconMarker }) => {
    if (map.value) {
      map.value.removeLayer(rect)
      map.value.removeLayer(iconMarker)
    }
  })
  layers.value.stayMarkers.clear()
}

// 工具：适配视野
const fitBounds = (coords, padding = [50, 50]) => {
  if (!map.value || !coords?.length) return
  const bounds = L.latLngBounds(coords)
  map.value.fitBounds(bounds, { padding })
  currentBounds.value = bounds
}

// 工具：居中到点
const centerOn = (lat, lng, zoom = null) => {
  if (!map.value) return
  map.value.setView([lat, lng], zoom || map.value.getZoom(), { animate: true })
}

// 工具：标记点动画
const animateMarker = (marker, targetLatLng, duration = 1000) => {
  const start = marker.getLatLng()
  const startTime = Date.now()
  
  const step = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 缓动函数
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    
    const lat = start.lat + (targetLatLng[0] - start.lat) * ease(progress)
    const lng = start.lng + (targetLatLng[1] - start.lng) * ease(progress)
    
    marker.setLatLng([lat, lng])
    
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}
