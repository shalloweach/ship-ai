/**
 * 高德地图操作组合式函数 (Vue 3 Composition API)
 * 船舶轨迹查询系统 - 地图管理入口
 * 
 * @param {import('vue').Ref<HTMLDivElement>} containerRef - 地图容器 DOM 引用
 * @returns {Object} 地图操作方法集合
 */
import { ref } from 'vue'
import { initMap, ensureAMapLoaded } from './core/mapInit'
import { centerMap, getMapView, switchBaseLayer } from './core/mapControl'
import { renderTrajectory, clearTrajectory } from './layers/trajectoryLayer'
import { updateShipMarker, removeShipMarker, removePolyline } from './layers/shipMarker'
import { parsePointToLngLat } from './utils/mapUtils'
import { useTrajectoryPopup } from '@/assets/mapKick/useTrajectoryPopup'

export default function useMapOperation(containerRef) {
  // ========== 📦 内部状态 (唯一数据源) ==========
  const mapState = ref({
    instance: null,           // AMap.Map 实例
    trajectoryOverlay: null,  // 轨迹 Polyline
    pointMarkers: [],         // 轨迹点 Marker 数组
    infoWindows: [],          // 信息窗体数组
    layers: {
      polylines: new Map(),   // 批量折线: key=batchId
      ship: null,             // 船舶 Marker
      shipMarkerEl: null,     // 船舶图标 DOM
      satelliteLayer: null,   // 卫星图层缓存
      currentCustomLayer: null // 当前自定义图层
    }
  })

  // 初始化弹窗工具
  const { showPopup, closePopup } = useTrajectoryPopup(() => mapState.value.instance)

  // ========== 🔧 接口代理函数 ==========
  
  const init = async (options = {}) => {
    const result = await initMap(containerRef, mapState, options)
    mapState.value.instance = result.mapInstance
    return result.mapInstance
  }

  const switchLayer = (type) => {
    switchBaseLayer(mapState.value, type)
  }

  const renderShipTrajectory = (points, options = {}) => {
    renderTrajectory(mapState.value, points, options, { showPopup })
  }

  const removeBatchPolyline = (batchId) => {
    return removePolyline(mapState.value, batchId)
  }

  const updateShip = (ship, options = {}) => {
    return updateShipMarker(mapState.value, ship, options)
  }

  const removeShip = () => {
    removeShipMarker(mapState.value)
  }

  const clearShipTrajectory = () => {
    clearTrajectory(mapState.value)
  }

  const clearAllMap = () => {
    clearShipTrajectory()
    if (mapState.value.instance) {
      mapState.value.instance.clearMap()
    }
  }

  const panTo = (center, zoom) => {
    centerMap(mapState.value, center, zoom)
  }

  const getViewInfo = () => {
    return getMapView(mapState.value)
  }

  const destroyMap = () => {
    clearShipTrajectory()
    if (mapState.value.instance) {
      mapState.value.instance.destroy()
      mapState.value.instance = null
    }
  }

  // ========== 🎯 暴露公共接口 ==========
  return {
    // 只读访问地图实例
    get map() {
      return mapState.value.instance
    },
    
    // 生命周期
    init,
    destroy: destroyMap,
    
    // 图层管理
    switchBaseLayer: switchLayer,
    renderTrajectory: renderShipTrajectory,
    removePolyline: removeBatchPolyline,
    
    // 船舶标记
    updateShipMarker: updateShip,
    removeShipMarker: removeShip,
    
    // 视图控制
    clearTrajectory: clearShipTrajectory,
    clearMap: clearAllMap,
    centerMap: panTo,
    getMapView: getViewInfo,
    
    // 工具函数 (纯函数，无需状态)
    parsePointToLngLat,
    ensureAMapLoaded
  }
}