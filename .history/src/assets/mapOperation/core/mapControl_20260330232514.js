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


  