/**
 * 地图视图控制相关功能
 */

/**
 * 居中显示到指定位置
 * @param {Object} mapState - 地图状态对象
 * @param {[number, number]} center - [纬度, 经度]
 * @param {number} zoom - 可选的缩放级别
 */
export const centerMap = (mapState, center, zoom) => {
    if (!mapState.instance) return
    
    const [lat, lng] = center
    const lnglat = new AMap.LngLat(lng, lat)
    
    if (zoom) {
      mapState.instance.setZoomAndCenter(zoom, lnglat)
    } else {
      mapState.instance.panTo(lnglat)
    }
  }
  
  /**
   * 获取当前地图视图信息
   */
  export const getMapView = (mapState) => {
    if (!mapState.instance) return null
    const center = mapState.instance.getCenter()
    return {
      center: [center.getLat(), center.getLng()],
      zoom: mapState.instance.getZoom(),
      bounds: mapState.instance.getBounds()
    }
  }

/**
 * 底图图层切换管理
 */

/**
 * 切换标准地图/卫星地图
 */
export const switchBaseLayer = (mapState, type) => {
    const { instance: mapInstance, layers } = mapState
    
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