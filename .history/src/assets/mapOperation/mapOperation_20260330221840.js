// src\components\mapOperation.js
/**
 * 高德地图操作组合式函数 (Vue 3 Composition API)
 * 用于船舶轨迹查询系统的地图管理
 * 
 * @param {import('vue').Ref<HTMLDivElement>} containerRef - 地图容器 DOM 引用
 * @returns {Object} 地图操作方法集合
 */
// ========== 📦 弹窗内容构建 ==========

import { useTrajectoryPopup } from '@/assets/mapRender/useTrajectoryPopup'

export default function useMapOperation(containerRef) {
  // 内部状态
  let mapInstance = null          // AMap.Map 实例
  let trajectoryOverlay = null    // 轨迹 Polyline
  let pointMarkers = []           // 轨迹点 Marker 数组
  let infoWindows = []            // 信息窗体数组（预留）

  // 初始化弹窗工具（传入获取地图实例的函数）
  const { showPopup, closePopup } = useTrajectoryPopup(() => mapInstance)
  /********************************************************************************************************************
   * 🔧 初始化高德地图
   */
  const init = async (options = {}) => {
    const { center = [31.2, 122], zoom = 8 } = options
    
    await ensureAMapLoaded()
    const [lng, lat] = center
    const mapCenter = new AMap.LngLat(lng, lat)
    
    // 3. 创建地图实例 [[11]]
    mapInstance = new AMap.Map(containerRef.value, {
      zoom,
      center: mapCenter,
      viewMode: '2D',           
      resizeEnable: true,       
      features: ['bg', 'point', 'road', 'building'], 
      zooms: [3, 20],           
      pitch: 0,                 
      rotation: 0              
    })
    
    // 4. 添加基础控件（可选）
    if (AMap.ToolBar) {
      mapInstance.addControl(new AMap.ToolBar({
        position: 'RB',        
        offset: new AMap.Pixel(10, 10)
      }))
    }
    
    // 5. 等待地图渲染完成
    await new Promise((resolve) => {
      mapInstance.on('complete', resolve)
    })
    
    return mapInstance
  }

  const switchBaseLayer = (type) => {
    if (!mapInstance) {
      console.warn('地图未初始化，无法切换图层')
      return
    }
    
    // 隐藏当前自定义图层
    if (layers.currentCustomLayer) {
      layers.currentCustomLayer.setMap(null)
      layers.currentCustomLayer = null
    }
    
    if (type === 'satellite') {
      // 卫星图：创建或复用卫星图层
      if (!layers.satelliteLayer) {
        // 卫星图层（高德内置）
        layers.satelliteLayer = new AMap.TileLayer.Satellite()
      }
      layers.satelliteLayer.setMap(mapInstance)
      layers.currentCustomLayer = layers.satelliteLayer
      console.log('🛰️ 已切换为卫星地图')
    } else {
      // 标准地图：不需要额外图层，默认底图自动显示
      console.log('🗺️ 已切换为标准地图')
    }
  }


  /********************************************************************************************************************
   * 🎨 渲染船舶轨迹
   * @param {Array} points - 轨迹点数组，支持多种格式：
   *   - { lng: number, lat: number, timestamp?: number }
   *   - [lng, lat] 或 [lat, lng]（自动识别）
   * @param {Object} options - 渲染配置
   * @param {boolean} options.showPoints - 是否显示轨迹点标记
   * @param {boolean} options.fitBounds - 是否自动适配视图
   * @param {Object} options.lineStyle - 轨迹线样式 { color, width, opacity }
   */
  const renderTrajectory = (points, options = {}) => {

    if (!mapInstance || !Array.isArray(points) || points.length === 0) {
      console.warn('🗺️ renderTrajectory: 地图未初始化或无轨迹数据')
      return
    }

    const {
      showPoints = true,
      fitBounds = true,
      lineStyle = { color: '#8b5cf6', width: 2, opacity: 0.9 }
    } = options

   
    clearTrajectory()

    // 2. 转换轨迹点为 AMap.LngLat 数组
    const path = points.map(p => parsePointToLngLat(p)).filter(Boolean)
    
    if (path.length < 2) {
      console.warn('🗺️ 有效轨迹点不足 2 个，无法绘制折线')
      return
    }

    // 3. 绘制轨迹线 (Polyline) [[21]]
    trajectoryOverlay = new AMap.Polyline({
      path,
      strokeColor: lineStyle.color || '#8b5cf6',   // 线颜色
      strokeWeight: lineStyle.width || 2,          // 线宽
      strokeStyle: 'solid',                        // 线样式: solid/dashed
      strokeOpacity: lineStyle.opacity ?? 0.9,     // 透明度
      lineJoin: 'round',                           // 拐角样式
      zIndex: 10                                   // 层级
    })
    trajectoryOverlay.setMap(mapInstance)

    // 4. 绘制轨迹点标记（可选）[[20]]
    if (showPoints) {
      // 性能优化：超过 500 个点时不绘制标记，避免卡顿
      if (path.length <= 5000) {
        pointMarkers = path.map((lnglat, idx) => {
          const marker = new AMap.Marker({
            position: lnglat,
            map: mapInstance,
            title: `轨迹点 #${idx + 1}`,
            // 使用简洁的圆点标记
            content: `<div style="
              width: 8px; height: 8px;
              background: ${lineStyle.color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 4px rgba(0,0,0,0.3);
            "></div>`,
            offset: new AMap.Pixel(-4, -4),
            zIndex: 11,
            extData: { index: idx, point: points[idx] } // 绑定原始数据
          })
          
          // 点击标记显示简单信息（可扩展）
          marker.on('click', () => {
            showPopup(marker, points[idx])
          })
          
          return marker
        })
      } else {
        console.log(`🗺️ 轨迹点 ${path.length} > 500，跳过绘制标记以优化性能`)
      }
    }

    // 5. 自动调整视图以显示完整轨迹 [[13]]
    if (fitBounds && path.length >= 2) {
      // 使用 setFitView 自动计算边界 [[11]]
      mapInstance.setFitView([trajectoryOverlay, ...pointMarkers])
    }
  }

/********************************************************************************************************************
   * 🗑️ 移除指定批次的折线
   * @param {string} batchId - 批次ID
   * @returns {boolean} 是否移除成功
   */

const layers = {
  polylines: new Map(),   // 存储折线，key: batchId, value: AMap.Polyline
  ship: null,             // 船舶标记 Marker
  shipMarkerEl: null      // 船舶图标的 DOM 元素（用于旋转动画）
}

const removePolyline = (batchId) => {
  if (!mapInstance || !batchId) return false

  const polyline = layers.polylines.get(batchId)
  if (polyline) {
    // 检查是否已添加到地图
    if (polyline.getMap()) {
      mapInstance.remove(polyline)
    }
    layers.polylines.delete(batchId)
    console.log(`🗑️ 已移除折线批次: ${batchId}`)
    return true
  }
  console.warn(`⚠️ 未找到折线批次: ${batchId}`)
  return false
}

/********************************************************************************************************************
 * 🚢 更新船舶图标
 */
const updateShipMarker = (ship, options = {}) => {
  if (!mapInstance || !ship?.lat || !ship?.lng) {
    console.warn('⚠️ 船舶数据不完整，跳过marker更新')
    return null
  }

  const { animate = true, duration = 300 } = options
  const position = new AMap.LngLat(ship.lng, ship.lat)
  const heading = ship.course ?? ship.heading ?? 0

  // 首次创建
  if (!layers.ship) {
    const iconEl = document.createElement('div')
    iconEl.className = 'ship-icon-wrapper'
    iconEl.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    iconEl.innerHTML = `
      <div class="ship-icon" style="
        transform: rotate(${heading}deg);
        transition: transform ${duration}ms ease;
        font-size: 28px;
        line-height: 1;
      ">
        🚢
      </div>
    `
    
    const shipIconInner = iconEl.querySelector('.ship-icon')
    
    layers.ship = new AMap.Marker({
      position,
      content: iconEl,
      offset: new AMap.Pixel(-16, -16),
      zIndex: 1000,
      title: ship.name || '船舶'
    })
    layers.ship.setMap(mapInstance)
    layers.shipMarkerEl = shipIconInner
    
    // 绑定弹窗（使用闭包保存当前 ship 数据）
    const handleClick = () => {
      const popupContent = buildShipPopup(ship)
      const infoWindow = new AMap.InfoWindow({
        content: popupContent,
        offset: new AMap.Pixel(0, -30)
      })
      infoWindow.open(mapInstance, position)
    }
    layers.ship.on('click', handleClick)
    
    return layers.ship
  }
  
  // 更新位置和旋转
  if (animate && layers.shipMarkerEl) {
    layers.ship.setPosition(position)
    layers.shipMarkerEl.style.transition = `transform ${duration}ms ease`
    layers.shipMarkerEl.style.transform = `rotate(${heading}deg)`
  } else {
    layers.ship.setPosition(position)
    if (layers.shipMarkerEl) {
      layers.shipMarkerEl.style.transition = 'none'
      layers.shipMarkerEl.style.transform = `rotate(${heading}deg)`
    }
  }
  
  // 更新弹窗内容（重新绑定 click 事件）
  if (layers.ship) {
    // 移除原有 click 监听（高德 off 方法可移除所有监听，参数为空）
    layers.ship.off('click')
    const handleClick = () => {
      const popupContent = buildShipPopup(ship)
      const infoWindow = new AMap.InfoWindow({
        content: popupContent,
        offset: new AMap.Pixel(0, -30)
      })
      infoWindow.open(mapInstance, position)
    }
    layers.ship.on('click', handleClick)
  }
  
  return layers.ship
}

/**
 * 🗑️ 移除船舶图标
 */
const removeShipMarker = () => {
  if (layers.ship && mapInstance) {
    mapInstance.remove(layers.ship)
    layers.ship = null
    layers.shipMarkerEl = null
  }
  // 若有动画帧，可取消
  // if (this._animationFrame) {
  //   cancelAnimationFrame(this._animationFrame)
  //   this._animationFrame = null
  // }
}

/********************************************************************************************************************
 * 🧹 清空轨迹相关覆盖物（保留底图）
 */
const clearTrajectory = () => {
  if (trajectoryOverlay) {
    trajectoryOverlay.setMap(null)
    trajectoryOverlay = null
  }
  
  if (pointMarkers.length > 0) {
    pointMarkers.forEach(marker => marker.setMap(null))
    pointMarkers = []
  }
  
  if (infoWindows.length > 0) {
    infoWindows.forEach(win => win.close())
    infoWindows = []
  }
}

/**
 * 🗑️ 清空地图所有覆盖物（扩展用）
 */
const clearMap = () => {
  clearTrajectory()
  // 可扩展：清空其他自定义覆盖物
  if (mapInstance) {
    mapInstance.clearMap()
  }
}

/**
 * 🎯 居中显示到指定位置
 * @param {[number, number]} center - [纬度, 经度]
 * @param {number} zoom - 可选的缩放级别
 */
const centerMap = (center, zoom) => {
  if (!mapInstance) return
  
  const [lat, lng] = center
  const lnglat = new AMap.LngLat(lng, lat)
  
  if (zoom) {
    mapInstance.setZoomAndCenter(zoom, lnglat)
  } else {
    mapInstance.panTo(lnglat)
  }
}

/**
 * 🔍 获取当前地图视图信息
 */
const getMapView = () => {
  if (!mapInstance) return null
  const center = mapInstance.getCenter()
  return {
    center: [center.getLat(), center.getLng()],
    zoom: mapInstance.getZoom(),
    bounds: mapInstance.getBounds()
  }
}

/**
 * 💥 销毁地图实例，释放资源
 */
const destroy = () => {
  clearTrajectory()
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
}

/**
 * 🔌 动态加载高德地图脚本（按需）
 */
const ensureAMapLoaded = () => {
  return new Promise((resolve, reject) => {
    if (window.AMap && window.AMap.Map) {
      resolve()
      return
    }
    
    if (document.querySelector('script[src*="webapi.amap.com/maps"]')) {
      const check = setInterval(() => {
        if (window.AMap?.Map) {
          clearInterval(check)
          resolve()
        }
      }, 50)
      setTimeout(() => {
        clearInterval(check)
        reject(new Error('高德地图加载超时'))
      }, 10000)
      return
    }
    
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=60eb1e3f81883411db470e05d9314712&plugin=AMap.Scale,AMap.ToolBar`
    script.async = true
    script.onload = () => {
      const check = setInterval(() => {
        if (window.AMap?.Map) {
          clearInterval(check)
          resolve()
        }
      }, 20)
    }
    script.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(script)
  })
}

/**
 * 🔀 解析轨迹点为 AMap.LngLat（兼容多种格式）
 */
const parsePointToLngLat = (point) => {
  if (!point) return null
  
  if (typeof point === 'object' && !Array.isArray(point)) {
    const lng = point.lon ?? point.lng ?? point.longitude
    const lat = point.lat ?? point.latitude
    
    if (typeof lng === 'number' && typeof lat === 'number') {
      if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        return new AMap.LngLat(lng, lat)
      } else {
        console.warn('⚠️ 坐标超出有效范围:', { lng, lat })
        return null
      }
    }
  }
  
  if (Array.isArray(point) && point.length >= 2) {
    const [a, b] = point
    if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
      return new AMap.LngLat(a, b)
    } else if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
      return new AMap.LngLat(b, a)
    }
  }
  
  console.warn('⚠️ 无法解析轨迹点格式:', point)
  return null
}

// ========= 暴露的公共接口 =========
return {
  get map() {
    return mapInstance
  },
  
  init,
  switchBaseLayer,
  renderTrajectory,
  removePolyline,      // 新增：按批次移除折线
  updateShipMarker,    // 新增：更新船舶图标
  removeShipMarker,    // 新增：移除船舶图标
  clearMap,
  clearTrajectory,
  centerMap,
  getMapView,
  destroy,
  
  parsePointToLngLat,
  ensureAMapLoaded
}
}