/**
 * 🗺️ mapOperation.js - 地图核心操作封装
 * 
 * 核心功能：
 * 1️⃣ 地图初始化
 * 2️⃣ 轨迹渲染（点连线 + 弹窗）
 * 3️⃣ 轨迹点弹窗内容
 * 4️⃣ 清空地图
 * 5️⃣ 居中/适配视野
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ========== 🎨 样式配置 ==========
const MAP_CONFIG = {
  defaultCenter: [31.2304, 121.4737],  // 上海
  defaultZoom: 10,
  minZoom: 3,
  maxZoom: 18,
  
  // 轨迹线样式
  trajectory: {
    color: '#3b82f6',      // 蓝色
    weight: 3,             // 线宽
    opacity: 0.8,          // 透明度
    lineCap: 'round',      // 圆角端点
    lineJoin: 'round'      // 圆角连接
  },
  
  // 轨迹点样式
  point: {
    radius: 4,             // 点半径
    color: '#3b82f6',      // 边框色
    fillColor: '#60a5fa',  // 填充色
    fillOpacity: 0.9,
    weight: 1
  },
  
  // 船舶图标
  ship: {
    icon: '🚢',
    size: 32,
    heading: 0             // 默认航向
  }
}

// ========== 🕐 工具函数（可替换为统一 timeUtils） ==========
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)  // 秒→毫秒
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-')
}

const formatCoordinate = (value, precision = 4) => {
  return value != null ? Number(value).toFixed(precision) : '-'
}

const formatValue = (value, unit = '') => {
  return value != null ? `${Number(value).toFixed(1)}${unit}` : '-'
}

// ========== 📦 弹窗内容构建 ==========

/**
 * 构建轨迹点弹窗内容
 * @param {Object} point - 轨迹点数据
 * @returns {string} HTML 字符串
 */
export const buildPopupContent = (point) => {
  if (!point) return '<div>无数据</div>'
  
  return `
    <div style="min-width: 220px; font-size: 12px; line-height: 1.6; color: #333;">
      <!-- 标题 -->
      <div style="font-weight: 600; color: #0066cc; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
        🚢 轨迹点 #${point.idx ?? '-'}
      </div>
      
      <!-- 基本信息 -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 2px 0; color: #666;">🕐 时间</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${formatTime(point.timestamp)}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">📍 坐标</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">
            ${formatCoordinate(point.lat)}, ${formatCoordinate(point.lon || point.lng)}
          </td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">⚡ 速度</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${formatValue(point.speed, ' kn')}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">🧭 航向</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${formatValue(point.course, '°')}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">🎯 目的地</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${point.destination || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">🌊 吃水</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${formatValue(point.draught, ' m')}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">📊 状态</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${point.navigationStatus || '-'}</td>
        </tr>
      </table>
    </div>
  `
}

/**
 * 构建船舶当前位置弹窗
 * @param {Object} ship - 船舶数据
 * @returns {string} HTML 字符串
 */
export const buildShipPopup = (ship) => {
  if (!ship) return '<div>🚢 船舶信息</div>'
  
  return `
    <div style="min-width: 180px; font-size: 12px; line-height: 1.6;">
      <div style="font-weight: 600; color: #0066cc; margin-bottom: 6px;">🚢 实时位置</div>
      <hr style="margin: 4px 0; border: 0; border-top: 1px solid #eee;">
      <div>🕐 ${formatTime(ship.timestamp)}</div>
      <div>⚡ ${formatValue(ship.speed, ' kn')}</div>
      <div>🧭 ${formatValue(ship.course, '°')}</div>
      <div>🎯 ${ship.destination || '-'}</div>
    </div>
  `
}

// ========== 🗺️ 地图操作类 ==========

export class MapOperation {
  constructor(containerRef) {
    this.containerRef = containerRef
    this.map = null
    this.layers = {
      trajectory: null,    // 轨迹线
      points: null,        // 轨迹点（带弹窗）
      ship: null,          // 船舶图标
      stayMarkers: new Map()  // 停留标记 { id: { rect, icon } }
    }
    this.isReady = false
  }

  // ========== 1️⃣ 地图初始化 ==========
  
  /**
   * 初始化 Leaflet 地图
   * @param {Object} options - 配置选项
   * @param {Array} options.center - 初始中心 [lat, lng]
   * @param {number} options.zoom - 初始缩放
   * @param {boolean} options.tileLayer - 是否添加 OSM 底图
   * @returns {Promise<L.Map>}
   */
  async init(options = {}) {
    if (!this.containerRef?.value) {
      throw new Error('❌ 地图容器未找到')
    }
    
    // 等待容器尺寸就绪
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 创建地图实例
    this.map = L.map(this.containerRef.value, {
      center: options.center || MAP_CONFIG.defaultCenter,
      zoom: options.zoom ?? MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: true,
      attributionControl: true
    })
    
    // 添加底图（可配置）
    if (options.tileLayer !== false) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      }).addTo(this.map)
    }
    
    // 添加比例尺
    if (options.scale !== false) {
      L.control.scale().addTo(this.map)
    }
    
    // 修复初始化尺寸问题
    setTimeout(() => this.map?.invalidateSize(), 100)
    
    this.isReady = true
    console.log('🗺️ 地图初始化完成')
    return this.map
  }

  // ========== 2️⃣ 轨迹渲染（点连线 + 弹窗） ==========
  
  /**
   * 渲染轨迹：线 + 点 + 弹窗
   * @param {Array} points - 轨迹点数组 [{lat, lng, timestamp, ...}]
   * @param {Object} options - 配置选项
   * @param {boolean} options.showPoints - 是否显示轨迹点（默认 true）
   * @param {boolean} options.fitBounds - 是否自动适配视野（默认 true）
   * @param {Object} options.lineStyle - 轨迹线样式覆盖
   * @param {Object} options.pointStyle - 轨迹点样式覆盖
   */
  renderTrajectory(points, options = {}) {
    if (!this.map || !this.isReady || !Array.isArray(points) || points.length === 0) {
      console.warn('⚠️ 无法渲染轨迹：地图未就绪或数据为空')
      return null
    }
    
    // 清理旧轨迹
    this.clearTrajectory()
    
    // 提取有效坐标
    const validPoints = points.filter(p => p?.lat != null && (p?.lng != null || p?.lon != null))
    const coords = validPoints.map(p => [p.lat, p.lng || p.lon])
    
    if (coords.length < 2) {
      console.warn('⚠️ 有效轨迹点不足 2 个，无法绘制线')
      return null
    }
    
    // 2.1 绘制轨迹线
    const lineStyle = { ...MAP_CONFIG.trajectory, ...(options.lineStyle || {}) }
    this.layers.trajectory = L.polyline(coords, lineStyle).addTo(this.map)
    
    // 2.2 绘制轨迹点 + 绑定弹窗（可选）
    if (options.showPoints !== false) {
      const pointStyle = { ...MAP_CONFIG.point, ...(options.pointStyle || {}) }
      const pointGroup = L.layerGroup()
      
      validPoints.forEach((point, idx) => {
        const circle = L.circleMarker([point.lat, point.lng || point.lon], {
          ...pointStyle,
          radius: pointStyle.radius + (idx === validPoints.length - 1 ? 2 : 0)  // 终点稍大
        })
        
        // 绑定弹窗
        circle.bindPopup(buildPopupContent({ ...point, idx }))
        
        // 点击高亮（可选交互）
        circle.on('click', () => {
          console.log('📍 点击轨迹点:', idx, point)
        })
        
        pointGroup.addLayer(circle)
      })
      
      this.layers.points = pointGroup.addTo(this.map)
    }
    
    // 2.3 自动适配视野
    if (options.fitBounds !== false) {
      this.fitBounds(coords, options.padding || [50, 50])
    }
    
    return { line: this.layers.trajectory, points: this.layers.points }
  }

  /**
   * 更新播放中的轨迹高亮（已播放部分）
   * @param {Object} visibleRange - 可见范围 { start: number, end: number }
   * @param {Array} allPoints - 全部轨迹点
   */
  updatePlayingHighlight(visibleRange, allPoints) {
    if (!this.map || !this.layers.trajectory) return
    
    const { start = 0, end = allPoints.length - 1 } = visibleRange
    const visibleCoords = allPoints
      .slice(start, end + 1)
      .map(p => [p.lat, p.lng || p.lon])
      .filter(([lat, lng]) => lat != null && lng != null)
    
    if (visibleCoords.length < 2) return
    
    // 高亮已播放段（红色粗线）
    const highlight = L.polyline(visibleCoords, {
      color: '#ef4444',
      weight: 5,
      opacity: 1
    }).addTo(this.map)
    
    // 3 秒后自动移除（避免堆积）
    setTimeout(() => {
      if (this.map?.hasLayer(highlight)) {
        this.map.removeLayer(highlight)
      }
    }, 3000)
    
    return highlight
  }

  /**
   * 更新船舶位置图标
   * @param {Object} ship - 船舶数据 { lat, lng, course, ... }
   * @param {Object} options - 配置 { animate: boolean, duration: number }
   */
  updateShipMarker(ship, options = {}) {
    if (!this.map || !ship?.lat || !ship?.lng) return null
    
    // 移除旧图标
    if (this.layers.ship && this.map.hasLayer(this.layers.ship)) {
      this.map.removeLayer(this.layers.ship)
    }
    
    // 创建旋转图标（根据航向）
    const heading = ship.course || ship.heading || 0
    const icon = L.divIcon({
      className: 'ship-marker',
      html: `<div style="transform:rotate(${heading}deg);transition:transform 0.3s ease;font-size:24px;">🚢</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    
    // 创建标记 + 弹窗
    this.layers.ship = L.marker([ship.lat, ship.lng], { icon })
      .addTo(this.map)
      .bindPopup(buildShipPopup(ship))
    
    // 平滑移动动画（可选）
    if (options.animate && options.duration) {
      this._animateMarker(this.layers.ship, [ship.lat, ship.lng], options.duration)
    }
    
    return this.layers.ship
  }

  // ========== 3️⃣ 轨迹点弹窗内容（已导出 buildPopupContent） ==========
  // 使用方式：circle.bindPopup(buildPopupContent(point))

  // ========== 4️⃣ 清空地图 ==========
  
  /**
   * 清空轨迹相关图层（线 + 点 + 船舶）
   */
  clearTrajectory() {
    if (!this.map) return
    
    // 移除轨迹线
    if (this.layers.trajectory && this.map.hasLayer(this.layers.trajectory)) {
      this.map.removeLayer(this.layers.trajectory)
      this.layers.trajectory = null
    }
    
    // 移除轨迹点
    if (this.layers.points && this.map.hasLayer(this.layers.points)) {
      this.map.removeLayer(this.layers.points)
      this.layers.points = null
    }
    
    // 移除船舶图标
    if (this.layers.ship && this.map.hasLayer(this.layers.ship)) {
      this.map.removeLayer(this.layers.ship)
      this.layers.ship = null
    }
  }
  
  /**
   * 清空所有图层（包括停留标记等）
   */
  clearAll() {
    this.clearTrajectory()
    this.clearStayMarkers()
    // 如需清空底图外的所有图层：
    // this.map?.eachLayer(layer => {
    //   if (!(layer instanceof L.TileLayer)) this.map.removeLayer(layer)
    // })
  }

  // ========== 5️⃣ 居中/适配视野 ==========
  
  /**
   * 适配视野到坐标范围
   * @param {Array} coords - 坐标数组 [[lat, lng], ...]
   * @param {Array} padding - 内边距 [px, px]
   */
  fitBounds(coords, padding = [50, 50]) {
    if (!this.map || !Array.isArray(coords) || coords.length === 0) return
    
    const bounds = L.latLngBounds(coords)
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { 
        padding, 
        maxZoom: 15,  // 避免缩放过大
        animate: true 
      })
    }
  }
  
  /**
   * 居中到指定点
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @param {number} zoom - 缩放级别（可选）
   */
  centerOn(lat, lng, zoom = null) {
    if (!this.map || lat == null || lng == null) return
    this.map.setView([lat, lng], zoom ?? this.map.getZoom(), { animate: true })
  }
  
  /**
   * 缩放到指定级别
   * @param {number} zoom - 目标缩放
   */
  setZoom(zoom) {
    if (!this.map) return
    this.map.setZoom(zoom, { animate: true })
  }

 

  // ========== 🔧 内部工具方法 ==========
  
  /**
   * 标记点平滑移动动画
   * @private
   */
  _animateMarker(marker, targetLatLng, duration = 1000) {
    const start = marker.getLatLng()
    const startTime = Date.now()
    
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t  // 缓动函数
    
    const step = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const eased = ease(progress)
      
      const lat = start.lat + (targetLatLng[0] - start.lat) * eased
      const lng = start.lng + (targetLatLng[1] - start.lng) * eased
      
      marker.setLatLng([lat, lng])
      
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  
  /**
   * 格式化时长（秒→可读字符串）
   * @private
   */
  _formatDuration(ms) {
    if (!ms || ms < 0) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // ========== 🧹 资源清理 ==========
  
  /**
   * 销毁地图实例
   */
  destroy() {
    this.clearAll()
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.isReady = false
    console.log('🗑️ 地图资源已清理')
  }

  // ========== 🔓 暴露方法 ==========
  
  /**
   * 获取暴露的公共方法
   */
  expose() {
    return {
      map: this.map,
      isReady: this.isReady,
      // 核心功能
      init: this.init.bind(this),
      renderTrajectory: this.renderTrajectory.bind(this),
      updateShipMarker: this.updateShipMarker.bind(this),
      clearTrajectory: this.clearTrajectory.bind(this),
      clearAll: this.clearAll.bind(this),
      centerOn: this.centerOn.bind(this),
      fitBounds: this.fitBounds.bind(this),
      setZoom: this.setZoom.bind(this),
      // 停留标记
      drawStayMarker: this.drawStayMarker.bind(this),
      removeStayMarker: this.removeStayMarker.bind(this),
      clearStayMarkers: this.clearStayMarkers.bind(this),
      // 清理
      destroy: this.destroy.bind(this)
    }
  }
}

// ========== 🚀 快捷工厂函数 ==========

/**
 * 创建地图操作实例（推荐用法）
 * @param {Ref<HTMLElement>} containerRef - Vue ref 容器
 * @returns {MapOperation}
 */
export function useMapOperation(containerRef) {
  return new MapOperation(containerRef)
}

export default useMapOperation