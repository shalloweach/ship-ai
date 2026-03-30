/**
 * 🗺️ mapOperation.js - 地图核心操作封装
 * 
 * 核心功能：
 * 1️⃣ 地图初始化（使用高德地图）
 * 2️⃣ 轨迹渲染（点连线 + 弹窗）
 * 3️⃣ 轨迹点弹窗内容
 * 4️⃣ 清空地图
 * 5️⃣ 居中/适配视野
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ========== 🗺️ 高德地图配置 ==========
const AMAP_CONFIG = {
  // 高德地图 Key
  key: '9a74bdb399a18e1dbe15f217c72ca022',
  
  // 瓦片地址
  tileUrl: 'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  
  // 矢量图（清新样式）
  vectorUrl: 'https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
  
  // 卫星图
  satelliteUrl: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
  
  // 底图属性
  attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>',
  
  // 子域名
  subdomains: ['01', '02', '03', '04']
}

// ========== 🎨 样式配置 ==========
const MAP_CONFIG = {
  defaultCenter: [31.2304, 121.4737],  // 上海
  defaultZoom: 10,
  minZoom: 3,
  maxZoom: 18,
  
  // 默认使用的图层类型: 'tile' | 'vector' | 'satellite'
  defaultLayerType: 'vector',
  
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

// ========== 🕐 工具函数 ==========
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
      <div style="font-weight: 600; color: #0066cc; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
        🚢 轨迹点 #${point.idx ?? '-'}
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 2px 0; color: #666;">🕐 时间</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">${formatTime(point.timestamp)}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0; color: #666;">📍 坐标</td>
          <td style="padding: 2px 0; text-align: right; font-weight: 500;">
            ${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng || point.lon)}
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
    this.currentTileLayer = null  // 当前瓦片图层
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
   * 初始化 Leaflet 地图（使用高德瓦片）
   * @param {Object} options - 配置选项
   * @param {Array} options.center - 初始中心 [lat, lng]
   * @param {number} options.zoom - 初始缩放
   * @param {string} options.layerType - 图层类型: 'tile' | 'vector' | 'satellite'
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
    
    // 添加高德瓦片底图
    const layerType = options.layerType || MAP_CONFIG.defaultLayerType
    this.setTileLayer(layerType)
    
    // 添加比例尺
    if (options.scale !== false) {
      L.control.scale().addTo(this.map)
    }
    
    // 修复初始化尺寸问题
    setTimeout(() => this.map?.invalidateSize(), 100)
    
    this.isReady = true
    console.log('🗺️ 高德地图初始化完成')
    return this.map
  }
  
  /**
   * 切换瓦片图层
   * @param {string} type - 图层类型: 'tile' | 'vector' | 'satellite'
   */
  setTileLayer(type = 'vector') {
    if (!this.map) return
    
    // 移除旧图层
    if (this.currentTileLayer && this.map.hasLayer(this.currentTileLayer)) {
      this.map.removeLayer(this.currentTileLayer)
    }
    
    // 选择 URL
    let url
    switch (type) {
      case 'vector':
        url = AMAP_CONFIG.vectorUrl
        break
      case 'satellite':
        url = AMAP_CONFIG.satelliteUrl
        break
      default:
        url = AMAP_CONFIG.tileUrl
    }
    
    // 添加新图层
    this.currentTileLayer = L.tileLayer(url, {
      attribution: AMAP_CONFIG.attribution,
      maxZoom: MAP_CONFIG.maxZoom,
      subdomains: AMAP_CONFIG.subdomains
    }).addTo(this.map)
    
    console.log(`🗺️ 切换至高德地图图层: ${type}`)
  }

  // ========== 2️⃣ 轨迹渲染 ==========
  
  /**
   * 渲染轨迹：线 + 点 + 弹窗
   * @param {Array} points - 轨迹点数组
   * @param {Object} options - 配置选项
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
    
    // 2.2 绘制轨迹点 + 绑定弹窗
    if (options.showPoints !== false) {
      const pointStyle = { ...MAP_CONFIG.point, ...(options.pointStyle || {}) }
      const pointGroup = L.layerGroup()
      
      validPoints.forEach((point, idx) => {
        const circle = L.circleMarker([point.lat, point.lng || point.lon], {
          ...pointStyle,
          radius: pointStyle.radius + (idx === validPoints.length - 1 ? 2 : 0)
        })
        
        circle.bindPopup(buildPopupContent({ ...point, idx }))
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
   * 更新船舶位置图标
   * @param {Object} ship - 船舶数据
   */
  updateShipMarker(ship, options = {}) {
    if (!this.map || !ship?.lat || !ship?.lng) return null
    
    // 移除旧图标
    if (this.layers.ship && this.map.hasLayer(this.layers.ship)) {
      this.map.removeLayer(this.layers.ship)
    }
    
    // 创建旋转图标
    const heading = ship.course || ship.heading || 0
    const icon = L.divIcon({
      className: 'ship-marker',
      html: `<div style="transform:rotate(${heading}deg);transition:transform 0.3s ease;font-size:24px;">🚢</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    
    this.layers.ship = L.marker([ship.lat, ship.lng], { icon })
      .addTo(this.map)
      .bindPopup(buildShipPopup(ship))
    
    return this.layers.ship
  }

  // ========== 3️⃣ 停留标记 ==========
  
  /**
   * 绘制停留标记（矩形区域 + 图标）
   * @param {Object} mark - 停留标记数据
   */
  drawStayMarker(mark) {
    if (!this.map) return null
    
    const { id, lat, lng, startTime, endTime, stayType, port, status } = mark
    
    // 创建自定义图标
    const icon = L.divIcon({
      className: 'stay-marker',
      html: `<div style="background:#ff6b6b;color:white;padding:4px 8px;border-radius:12px;font-size:12px;white-space:nowrap;">
              📍 ${port || stayType}
             </div>`,
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    })
    
    const marker = L.marker([lat, lng], { icon })
      .addTo(this.map)
      .bindPopup(`
        <div style="min-width:200px;">
          <b>🚢 停留标记</b><br>
          🏠 港口: ${port || '-'}<br>
          📋 类型: ${stayType}<br>
          🕐 ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}<br>
          📊 状态: ${status || 'draft'}
        </div>
      `)
    
    this.layers.stayMarkers.set(id, marker)
    return marker
  }
  
  /**
   * 移除停留标记
   * @param {string} id - 标记ID
   */
  removeStayMarker(id) {
    const marker = this.layers.stayMarkers.get(id)
    if (marker && this.map.hasLayer(marker)) {
      this.map.removeLayer(marker)
      this.layers.stayMarkers.delete(id)
    }
  }
  
  /**
   * 清空所有停留标记
   */
  clearStayMarkers() {
    this.layers.stayMarkers.forEach((marker, id) => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker)
      }
    })
    this.layers.stayMarkers.clear()
  }

  // ========== 4️⃣ 清空地图 ==========
  
  /**
   * 清空轨迹相关图层
   */
  clearTrajectory() {
    if (!this.map) return
    
    if (this.layers.trajectory && this.map.hasLayer(this.layers.trajectory)) {
      this.map.removeLayer(this.layers.trajectory)
      this.layers.trajectory = null
    }
    
    if (this.layers.points && this.map.hasLayer(this.layers.points)) {
      this.map.removeLayer(this.layers.points)
      this.layers.points = null
    }
    
    if (this.layers.ship && this.map.hasLayer(this.layers.ship)) {
      this.map.removeLayer(this.layers.ship)
      this.layers.ship = null
    }
  }
  
  /**
   * 清空所有图层
   */
  clearAll() {
    this.clearTrajectory()
    this.clearStayMarkers()
  }

  // ========== 5️⃣ 居中/适配视野 ==========
  
  /**
   * 适配视野到坐标范围
   */
  fitBounds(coords, padding = [50, 50]) {
    if (!this.map || !Array.isArray(coords) || coords.length === 0) return
    
    const bounds = L.latLngBounds(coords)
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { 
        padding, 
        maxZoom: 15,
        animate: true 
      })
    }
  }
  
  /**
   * 居中到指定点
   */
  centerOn(lat, lng, zoom = null) {
    if (!this.map || lat == null || lng == null) return
    this.map.setView([lat, lng], zoom ?? this.map.getZoom(), { animate: true })
  }
  
  /**
   * 设置缩放级别
   */
  setZoom(zoom) {
    if (!this.map) return
    this.map.setZoom(zoom, { animate: true })
  }

  // ========== 🧹 资源清理 ==========
  
  /**
   * 销毁地图实例
   */
  destroy() {
    this.clearAll()
    if (this.currentTileLayer && this.map.hasLayer(this.currentTileLayer)) {
      this.map.removeLayer(this.currentTileLayer)
    }
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.isReady = false
    console.log('🗑️ 高德地图资源已清理')
  }

  // ========== 🔓 暴露方法 ==========
  
  /**
   * 获取暴露的公共方法
   */
  expose() {
    return {
      map: this.map,
      isReady: this.isReady,
      init: this.init.bind(this),
      setTileLayer: this.setTileLayer.bind(this),
      renderTrajectory: this.renderTrajectory.bind(this),
      updateShipMarker: this.updateShipMarker.bind(this),
      drawStayMarker: this.drawStayMarker.bind(this),
      removeStayMarker: this.removeStayMarker.bind(this),
      clearStayMarkers: this.clearStayMarkers.bind(this),
      clearTrajectory: this.clearTrajectory.bind(this),
      clearAll: this.clearAll.bind(this),
      centerOn: this.centerOn.bind(this),
      fitBounds: this.fitBounds.bind(this),
      setZoom: this.setZoom.bind(this),
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