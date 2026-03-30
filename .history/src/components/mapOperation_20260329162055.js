/**
 * 🗺️ mapOperation.js - 地图核心操作封装（Leaflet + 高德瓦片）
 * 
 * ✅ 核心功能：
 * 1️⃣ 地图初始化（高德瓦片底图）
 * 2️⃣ 轨迹渲染（折线 + 轨迹点弹窗）
 * 3️⃣ 船舶图标更新（支持航向旋转 + 平滑移动）
 * 4️⃣ 停留标记管理（矩形区域 + 信息弹窗）
 * 5️⃣ 视图控制（居中/适配视野/缩放）
 * 6️⃣ 资源清理（防内存泄漏）
 * 
 * 📦 暴露方法（mapOp 接口）：
 * - init(options)
 * - setTileLayer(type)
 * - renderTrajectory(coords, options)
 * - updateShipMarker(ship, options)
 * - removeShipMarker()
 * - drawStayMarker(mark)
 * - removeStayMarker(id)
 * - clearStayMarkers()
 * - clearTrajectory()
 * - clearAll()
 * - centerOn(lat, lng, zoom)
 * - fitBounds(coords, padding)
 * - setZoom(zoom)
 * - destroy()
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
export function useMapOperation(containerRef) {
  const instance = new MapOperation(containerRef)
  return instance.expose()
}
import { ref } from 'vue'
// ========== 🗺️ 高德地图配置 ==========
const AMAP_CONFIG = {
  key: '9a74bdb399a18e1dbe15f217c72ca022',
  
  // 瓦片地址（注意：生产环境建议申请企业密钥）
  tileUrl: 'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  vectorUrl: 'https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
  satelliteUrl: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
  
  attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>',
  subdomains: ['01', '02', '03', '04']
}

// ========== 🎨 样式配置 ==========
const MAP_CONFIG = {
  defaultCenter: [31.2304, 121.4737],
  defaultZoom: 10,
  minZoom: 3,
  maxZoom: 18,
  defaultLayerType: 'vector',
  
  // 轨迹线样式
  trajectory: {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.85,
    lineCap: 'round',
    lineJoin: 'round'
  },
  
  // 轨迹点样式
  point: {
    radius: 4,
    color: '#1e40af',
    fillColor: '#60a5fa',
    fillOpacity: 0.9,
    weight: 1
  },
  
  // 船舶图标
  ship: {
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    rotationDuration: 300  // 航向旋转动画时长(ms)
  }
}

// ========== 🕐 工具函数 ==========
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  // 支持秒级或毫秒级时间戳
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
  const date = new Date(ts)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-')
}

const formatCoordinate = (value, precision = 4) => {
  return value != null ? Number(value).toFixed(precision) : '-'
}

const formatValue = (value, unit = '', decimal = 1) => {
  if (value == null || isNaN(value)) return '-'
  return `${Number(value).toFixed(decimal)}${unit}`
}

// ========== 📦 弹窗内容构建 ==========

export const buildPopupContent = (point) => {
  if (!point) return '<div class="popup-empty">📭 无数据</div>'
  
  const lng = point.lng ?? point.lon ?? '-'
  const lat = point.lat ?? '-'
  
  return `
    <div class="ts-popup ts-popup-point">
      <div class="popup-header">
        <span class="popup-icon">📍</span>
        <span class="popup-title">轨迹点 #${point.idx ?? '-'}</span>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="popup-label">🕐 时间</span>
          <span class="popup-value">${formatTime(point.timestamp)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">📍 坐标</span>
          <span class="popup-value">${formatCoordinate(lat)}, ${formatCoordinate(lng)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">⚡ 速度</span>
          <span class="popup-value">${formatValue(point.speed, ' kn')}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">🧭 航向</span>
          <span class="popup-value">${formatValue(point.course ?? point.heading, '°', 0)}</span>
        </div>
        ${point.destination ? `
        <div class="popup-row">
          <span class="popup-label">🎯 目的地</span>
          <span class="popup-value">${point.destination}</span>
        </div>` : ''}
        ${point.draught != null ? `
        <div class="popup-row">
          <span class="popup-label">🌊 吃水</span>
          <span class="popup-value">${formatValue(point.draught, ' m')}</span>
        </div>` : ''}
        ${point.navigationStatus ? `
        <div class="popup-row">
          <span class="popup-label">📊 状态</span>
          <span class="popup-value">${point.navigationStatus}</span>
        </div>` : ''}
      </div>
    </div>
  `
}

export const buildShipPopup = (ship) => {
  if (!ship) return '<div class="popup-empty">🚢 船舶信息</div>'
  
  return `
    <div class="ts-popup ts-popup-ship">
      <div class="popup-header">
        <span class="popup-icon">🚢</span>
        <span class="popup-title">实时位置</span>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="popup-label">🕐 时间</span>
          <span class="popup-value">${formatTime(ship.timestamp)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">⚡ 速度</span>
          <span class="popup-value">${formatValue(ship.speed, ' kn')}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">🧭 航向</span>
          <span class="popup-value">${formatValue(ship.course ?? ship.heading, '°', 0)}</span>
        </div>
        ${ship.destination ? `
        <div class="popup-row">
          <span class="popup-label">🎯 目的地</span>
          <span class="popup-value">${ship.destination}</span>
        </div>` : ''}
        ${ship.mmsi ? `
        <div class="popup-row">
          <span class="popup-label">🆔 MMSI</span>
          <span class="popup-value">${ship.mmsi}</span>
        </div>` : ''}
      </div>
    </div>
  `
}

// ========== 🗺️ 地图操作类 ==========

// ========== 在 MapOperation 类中添加/修改以下方法 ==========

export class MapOperation {
  constructor(containerRef) {
    this.containerRef = containerRef
    this.map = null
    this.currentTileLayer = null
    
    // 🎯 折线图层管理：Map<batchId, L.Polyline>
    this.layers = {
      trajectory: null,    // 兼容旧版：默认折线
      polylines: new Map(), // 🆕 批次折线管理 { batchId: L.Polyline }
      points: null,
      ship: null,
      shipMarkerEl: null,
      stayMarkers: new Map()
    }
    this.isReady = false
    this._animationFrame = null
  }
  // ========== 1️⃣ 地图初始化 ==========
  
  async init(options = {}) {
    if (!this.containerRef?.value) {
      throw new Error('❌ 地图容器未找到')
    }
    
    // 等待容器渲染完成
    await new Promise(resolve => {
      if (this.containerRef.value.offsetWidth > 0) {
        resolve()
      } else {
        const observer = new ResizeObserver(() => {
          if (this.containerRef.value.offsetWidth > 0) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(this.containerRef.value)
        setTimeout(resolve, 200) // 保底超时
      }
    })
    
    // 创建地图实例
    this.map = L.map(this.containerRef.value, {
      center: options.center || MAP_CONFIG.defaultCenter,
      zoom: options.zoom ?? MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true  // 使用Canvas渲染提升性能
    })
    
    // 添加高德瓦片
    const layerType = options.layerType || MAP_CONFIG.defaultLayerType
    this.setTileLayer(layerType)
    
    // 添加比例尺
    if (options.scale !== false) {
      L.control.scale({ metric: true, imperial: false }).addTo(this.map)
    }
    
    // 修复初始尺寸
    setTimeout(() => this.map?.invalidateSize(), 100)
    
    this.isReady = true
    console.log('🗺️ 高德地图初始化完成')
    return this.map
  }
  
  setTileLayer(type = 'vector') {
    if (!this.map) return
    
    // 移除旧图层
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer)
    }
    
    // 选择URL
    let url
    switch (type) {
      case 'vector': url = AMAP_CONFIG.vectorUrl; break
      case 'satellite': url = AMAP_CONFIG.satelliteUrl; break
      default: url = AMAP_CONFIG.tileUrl
    }
    
    // 添加新图层
    this.currentTileLayer = L.tileLayer(url, {
      attribution: AMAP_CONFIG.attribution,
      maxZoom: MAP_CONFIG.maxZoom,
      subdomains: AMAP_CONFIG.subdomains,
      detectRetina: true
    }).addTo(this.map)
    
    console.log(`🗺️ 图层切换: ${type}`)
  }

  // ========== 2️⃣ 轨迹渲染 ==========
  
  /**
   * 渲染轨迹折线（支持批次管理）
   * @param {Array} coords - 坐标数组 [[lat, lng], ...]
   * @param {Object} options - 配置项
   * @param {string} options.batchId - 🎯 批次ID（用于生命周期管理）
   * @param {boolean} options.showPoints - 是否显示轨迹点
   * @param {Object} options.lineStyle - 折线样式
   * @param {boolean} options.fitBounds - 是否适配视野
   */
  renderTrajectory(coords, options = {}) {
    if (!this.map || !this.isReady) return null
    if (!Array.isArray(coords) || coords.length < 2) return null
    
    const { batchId = null, showPoints = true, lineStyle = {}, fitBounds = false } = options
    
    // 坐标标准化
    const normalized = coords.map(c => {
      if (!Array.isArray(c) || c.length < 2) return null
      return Math.abs(c[0]) > 90 ? [c[1], c[0]] : [c[0], c[1]]
    }).filter(c => c && c[0] != null && c[1] != null)
    
    if (normalized.length < 2) return null
    
    // 🎯 如果有batchId，使用独立图层管理
    if (batchId) {
      // 先移除同batchId的旧折线（避免重复）
      this.removePolyline(batchId)
      
      // 创建新折线
      const style = { ...MAP_CONFIG.trajectory, ...lineStyle }
      const polyline = L.polyline(normalized, style).addTo(this.map)
      
      // 存入批次管理Map
      this.layers.polylines.set(batchId, polyline)
      
      // 可选：适配视野（仅首批或显式请求时）
      if (fitBounds) {
        this.fitBounds(normalized, options.padding || [40, 40])
      }
      
      return polyline
    }
    
    // 🔄 兼容模式：无batchId时使用默认trajectory图层（覆盖旧版行为）
    if (this.layers.trajectory && this.map.hasLayer(this.layers.trajectory)) {
      this.map.removeLayer(this.layers.trajectory)
    }
    
    const style = { ...MAP_CONFIG.trajectory, ...lineStyle }
    this.layers.trajectory = L.polyline(normalized, style).addTo(this.map)
    
    if (showPoints) {
      this._renderPoints(normalized, options.pointStyle)
    }
    
    if (fitBounds) {
      this.fitBounds(normalized, options.padding || [40, 40])
    }
    
    return this.layers.trajectory
  }
  /**
   * 🎯 新增：移除指定批次的折线
   * @param {string} batchId - 批次ID
   */
  removePolyline(batchId) {
    if (!batchId || !this.map) return false
    
    const polyline = this.layers.polylines.get(batchId)
    if (polyline && this.map.hasLayer(polyline)) {
      this.map.removeLayer(polyline)
      this.layers.polylines.delete(batchId)
      console.log(`🗑️ 已移除折线批次: ${batchId}`)
      return true
    }
    return false
  }
  
  /**
   * 🎯 新增：清空所有批次折线
   */
  clearBatchPolylines() {
    this.layers.polylines.forEach((polyline, batchId) => {
      if (this.map.hasLayer(polyline)) {
        this.map.removeLayer(polyline)
      }
    })
    this.layers.polylines.clear()
    console.log('🧹 已清空所有批次折线')
  }
  
  // 内部辅助：渲染轨迹点（保持原逻辑）
  _renderPoints(coords, pointStyle = {}) {
    const style = { ...MAP_CONFIG.point, ...pointStyle }
    const pointGroup = L.layerGroup()
    
    coords.forEach((coord, idx) => {
      const circle = L.circleMarker(coord, {
        ...style,
        radius: style.radius + (idx === coords.length - 1 ? 2 : 0)
      })
      circle.bindPopup(`<div class="popup-simple">点 #${idx + 1}</div>`)
      pointGroup.addLayer(circle)
    })
    
    if (this.layers.points && this.map.hasLayer(this.layers.points)) {
      this.map.removeLayer(this.layers.points)
    }
    this.layers.points = pointGroup.addTo(this.map)
  }

  // ========== 🎯 增强版：清空轨迹 ==========
  
  /**
   * 清空轨迹相关图层（兼容批次管理）
   */
  clearTrajectory() {
    if (!this.map) return
    
    // 清空默认折线（兼容旧版）
    if (this.layers.trajectory && this.map.hasLayer(this.layers.trajectory)) {
      this.map.removeLayer(this.layers.trajectory)
      this.layers.trajectory = null
    }
    
    // 🎯 清空所有批次折线
    this.clearBatchPolylines()
    
    // 清空轨迹点
    if (this.layers.points && this.map.hasLayer(this.layers.points)) {
      this.map.removeLayer(this.layers.points)
      this.layers.points = null
    }
  }
  

  // ========== 3️⃣ 船舶图标 ==========
  
  /**
   * 更新船舶位置（支持平滑移动 + 航向旋转）
   * @param {Object} ship - 船舶数据 {lng, lat, heading/course, timestamp, idx}
   * @param {Object} options - 配置项
   * @param {boolean} options.animate - 是否启用平滑动画（默认true）
   * @param {number} options.duration - 动画时长(ms)
   */
  updateShipMarker(ship, options = {}) {
    if (!this.map || !ship?.lat || !ship?.lng) {
      console.warn('⚠️ 船舶数据不完整，跳过marker更新')
      return null
    }
    
    const { animate = true, duration = 300 } = options
    const [lat, lng] = [ship.lat, ship.lng]
    const heading = ship.course ?? ship.heading ?? 0
    
    // 首次创建
    if (!this.layers.ship) {
      // 创建自定义旋转图标容器
      const iconEl = document.createElement('div')
      iconEl.className = 'ship-icon-wrapper'
      iconEl.innerHTML = `
        <div class="ship-icon" style="transform:rotate(${heading}deg);transition:transform ${MAP_CONFIG.ship.rotationDuration}ms ease;">
          🚢
        </div>
      `
      
      const icon = L.divIcon({
        className: 'ship-marker-container',
        html: iconEl.outerHTML,
        iconSize: MAP_CONFIG.ship.iconSize,
        iconAnchor: MAP_CONFIG.ship.iconAnchor
      })
      
      this.layers.ship = L.marker([lat, lng], { 
        icon,
        zIndexOffset: 1000  // 确保在最上层
      }).addTo(this.map)
      
      // 绑定弹窗
      this.layers.ship.bindPopup(buildShipPopup(ship))
      
      // 保存DOM引用用于动画
      this.layers.shipMarkerEl = iconEl.querySelector('.ship-icon')
      
      return this.layers.ship
    }
    
    // 更新位置 + 旋转
    if (animate && this.layers.shipMarkerEl) {
      // 平滑移动：使用Leaflet内置动画
      this.layers.ship.setLatLng([lat, lng])
      
      // 平滑旋转：更新CSS transform
      this.layers.shipMarkerEl.style.transition = `transform ${duration}ms ease`
      this.layers.shipMarkerEl.style.transform = `rotate(${heading}deg)`
    } else {
      // 瞬时更新
      this.layers.ship.setLatLng([lat, lng])
      if (this.layers.shipMarkerEl) {
        this.layers.shipMarkerEl.style.transition = 'none'
        this.layers.shipMarkerEl.style.transform = `rotate(${heading}deg)`
      }
    }
    
    // 更新弹窗内容
    this.layers.ship.setPopupContent(buildShipPopup(ship))
    
    return this.layers.ship
  }
  
  /**
   * 移除船舶图标
   */
  removeShipMarker() {
    if (this.layers.ship && this.map.hasLayer(this.layers.ship)) {
      this.map.removeLayer(this.layers.ship)
      this.layers.ship = null
      this.layers.shipMarkerEl = null
    }
    // 取消可能的动画帧
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame)
      this._animationFrame = null
    }
  }

  // ========== 4️⃣ 停留标记 ==========
  
  drawStayMarker(mark) {
    if (!this.map || !mark?.lat || !mark?.lng) return null
    
    const { id, startTime, endTime, stayType, port, status } = mark
    
    // 创建标注图标
    const icon = L.divIcon({
      className: 'stay-marker-icon',
      html: `
        <div class="stay-badge">
          <span class="stay-type">${stayType || '停留'}</span>
          ${port ? `<span class="stay-port">${port}</span>` : ''}
        </div>
      `,
      iconSize: [100, 32],
      iconAnchor: [50, 16]
    })
    
    const marker = L.marker([mark.lat, mark.lng], { icon })
      .addTo(this.map)
      .bindPopup(`
        <div class="popup-stay">
          <div class="popup-header">📍 停留标记</div>
          <div class="popup-row"><span>🏠 港口</span><span>${port || '-'}</span></div>
          <div class="popup-row"><span>📋 类型</span><span>${stayType || '-'}</span></div>
          <div class="popup-row"><span>🕐 时间</span><span>${formatTime(startTime)} ~ ${formatTime(endTime)}</span></div>
          <div class="popup-row"><span>📊 状态</span><span>${status || 'draft'}</span></div>
        </div>
      `)
    
    this.layers.stayMarkers.set(id, marker)
    return marker
  }
  
  removeStayMarker(id) {
    const marker = this.layers.stayMarkers.get(id)
    if (marker && this.map.hasLayer(marker)) {
      this.map.removeLayer(marker)
      this.layers.stayMarkers.delete(id)
    }
  }
  
  clearStayMarkers() {
    this.layers.stayMarkers.forEach(marker => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker)
      }
    })
    this.layers.stayMarkers.clear()
  }

  // ========== 5️⃣ 清空操作 ==========
  
  clearTrajectory() {
    if (!this.map) return
    
    // 清空折线
    if (this.layers.trajectory) {
      this.map.removeLayer(this.layers.trajectory)
      this.layers.trajectory = null
    }
    
    // 清空轨迹点
    if (this.layers.points) {
      this.map.removeLayer(this.layers.points)
      this.layers.points = null
    }
    
    // 注意：不清空ship marker，由 removeShipMarker 单独控制
  }
  
  clearAll() {
    this.clearTrajectory()
    this.removeShipMarker()
    this.clearStayMarkers()
  }

  // ========== 6️⃣ 视图控制 ==========
  
  fitBounds(coords, padding = [40, 40]) {
    if (!this.map || !Array.isArray(coords) || coords.length === 0) return
    
    try {
      const bounds = L.latLngBounds(coords)
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding,
          maxZoom: 15,
          animate: true,
          duration: 0.5
        })
      }
    } catch (e) {
      console.warn('⚠️ fitBounds 执行失败:', e)
    }
  }
  
  centerOn(lat, lng, zoom = null) {
    if (!this.map || lat == null || lng == null) return
    const targetZoom = zoom ?? this.map.getZoom()
    this.map.setView([lat, lng], targetZoom, { animate: true, duration: 0.4 })
  }
  
  setZoom(zoom) {
    if (!this.map) return
    this.map.setZoom(zoom, { animate: true })
  }
  
  getBounds() {
    return this.map?.getBounds?.() || null
  }
  
  getCenter() {
    return this.map?.getCenter?.() || null
  }
  
  getZoom() {
    return this.map?.getZoom?.() || MAP_CONFIG.defaultZoom
  }

  // ========== 🧹 资源清理 ==========
  
  destroy() {
    // 停止所有动画
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame)
      this._animationFrame = null
    }
    
    // 清空所有图层
    this.clearAll()
    
    // 移除底图
    if (this.currentTileLayer && this.map?.hasLayer(this.currentTileLayer)) {
      this.map.removeLayer(this.currentTileLayer)
      this.currentTileLayer = null
    }
    
    // 销毁地图实例
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    
    this.isReady = false
    console.log('🗑️ 地图资源已释放')
  }

  // ========== 🔓 暴露公共接口 ==========
  
  expose() {
    return {
      map: this.map,
      isReady: this.isReady,
      
      init: this.init.bind(this),
      setTileLayer: this.setTileLayer.bind(this),
      
      // 轨迹
      renderTrajectory: this.renderTrajectory.bind(this),  // ✅ 支持batchId
      removePolyline: this.removePolyline.bind(this),      // 🆕 新增
      clearTrajectory: this.clearTrajectory.bind(this),
      
      // 船舶
      updateShipMarker: this.updateShipMarker.bind(this),
      removeShipMarker: this.removeShipMarker.bind(this),
      
      // 停留标记
      drawStayMarker: this.drawStayMarker.bind(this),
      removeStayMarker: this.removeStayMarker.bind(this),
      clearStayMarkers: this.clearStayMarkers.bind(this),
      
      // 视图
      centerOn: this.centerOn.bind(this),
      fitBounds: this.fitBounds.bind(this),
      setZoom: this.setZoom.bind(this),
      getBounds: this.getBounds.bind(this),
      getCenter: this.getCenter.bind(this),
      getZoom: this.getZoom.bind(this),
      
      // 清理
      clearAll: this.clearAll.bind(this),
      destroy: this.destroy.bind(this)
    }
  }
}

// ========== 🚀 工厂函数 ==========



export default function useMapOperation(containerRef) {
  const map = ref(null)

  const init = async (options) => {
    map.value = new Map(options)
  }

  return {
    map,
    init
  }
}
