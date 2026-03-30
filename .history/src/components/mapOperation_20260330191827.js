// src\components\mapOperation.js
/**
 * 高德地图操作组合式函数 (Vue 3 Composition API)
 * 用于船舶轨迹查询系统的地图管理
 * 
 * @param {import('vue').Ref<HTMLDivElement>} containerRef - 地图容器 DOM 引用
 * @returns {Object} 地图操作方法集合
 */
// ========== 📦 弹窗内容构建 ==========
import { buildPopupContent } from '@/utils/trajectoryPopup'
import { useTrajectoryPopup } from '@/assets/map/useTrajectoryPopup'

// 初始化弹窗管理器
const { showPopup, closePopup, updatePopupContent } = useTrajectoryPopup(mapOp)
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

export default function useMapOperation(containerRef) {
  // 内部状态
  let mapInstance = null          // AMap.Map 实例
  let trajectoryOverlay = null    // 轨迹 Polyline
  let pointMarkers = []           // 轨迹点 Marker 数组
  let infoWindows = []            // 信息窗体数组（预留）

  /**
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

  /**
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
          marker.on('click', (e) => {
            const data = e.target.buildPopupContent()
            console.log('📍 点击轨迹点:', data)
            // 可扩展：显示 InfoWindow
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

  /**
   * 🧹 清空轨迹相关覆盖物（保留底图）
   */
  const clearTrajectory = () => {
    // 移除轨迹线
    if (trajectoryOverlay) {
      trajectoryOverlay.setMap(null)
      trajectoryOverlay = null
    }
    
    // 移除所有轨迹点标记
    if (pointMarkers.length > 0) {
      pointMarkers.forEach(marker => marker.setMap(null))
      pointMarkers = []
    }
    
    // 关闭所有信息窗体
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
      mapInstance.clearMap() // 高德内置方法 [[11]]
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
      mapInstance.setZoomAndCenter(zoom, lnglat) // 同时设置缩放和中心 [[11]]
    } else {
      mapInstance.panTo(lnglat) // 平滑平移
    }
  }

  /**
   * 🔍 获取当前地图视图信息
   */
  const getMapView = () => {
    if (!mapInstance) return null
    const center = mapInstance.getCenter()
    return {
      center: [center.getLat(), center.getLng()], // 转回 [纬度, 经度]
      zoom: mapInstance.getZoom(),
      bounds: mapInstance.getBounds() // AMap.Bounds 对象
    }
  }

  /**
   * 💥 销毁地图实例，释放资源
   */
  const destroy = () => {
    clearTrajectory()
    if (mapInstance) {
      mapInstance.destroy() // 高德官方销毁方法 [[11]]
      mapInstance = null
    }
  }

  /**
   * 🔌 动态加载高德地图脚本（按需）
   */
  const ensureAMapLoaded = () => {
    return new Promise((resolve, reject) => {
      // 已加载
      if (window.AMap && window.AMap.Map) {
        resolve()
        return
      }
      
      // 避免重复加载
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
      
      // 创建 script 标签 [[3]][[9]]
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = `https://webapi.amap.com/maps?v=2.0&key=60eb1e3f81883411db470e05d9314712&plugin=AMap.Scale,AMap.ToolBar`
      script.async = true
      script.onload = () => {
        // 等待 AMap 初始化
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
    
    // 格式 1: 对象 { lat, lon } 或 { lat, lng } 或 { latitude, longitude }
    if (typeof point === 'object' && !Array.isArray(point)) {
      // ✅ 支持 lon / lng / longitude
      const lng = point.lon ?? point.lng ?? point.longitude
      const lat = point.lat ?? point.latitude
      
      if (typeof lng === 'number' && typeof lat === 'number') {
        // 高德坐标校验：经度 -180~180, 纬度 -90~90
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          return new AMap.LngLat(lng, lat)
        } else {
          console.warn('⚠️ 坐标超出有效范围:', { lng, lat })
          return null
        }
      }
    }
    
    // 格式 2: 数组 [lng, lat] 或 [lat, lng] - 通过数值范围智能判断
    if (Array.isArray(point) && point.length >= 2) {
      const [a, b] = point
      // 经度范围: -180~180, 纬度范围: -90~90
      if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
        // 可能是 [lng, lat]（高德标准）
        return new AMap.LngLat(a, b)
      } else if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        // 可能是 [lat, lng]（业务层常用）
        return new AMap.LngLat(b, a)
      }
    }
    
    console.warn('⚠️ 无法解析轨迹点格式:', point)
    return null
  }

  // ========= 暴露的公共接口 =========
  return {
    // 🗺️ 地图实例（markRaw 避免 Vue 响应式代理）
    get map() {
      return mapInstance
    },
    
    // 🔧 核心方法
    init,
    renderTrajectory,
    clearMap,
    clearTrajectory,
    centerMap,
    getMapView,
    destroy,
    
    // 🛠️ 扩展方法（按需使用）
    parsePointToLngLat,  // 外部解析坐标工具
    ensureAMapLoaded     // 外部预加载脚本
  }
}