// src/views/TrackFlow/useMap.js
功能：初始化地图
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

