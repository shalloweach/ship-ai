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
