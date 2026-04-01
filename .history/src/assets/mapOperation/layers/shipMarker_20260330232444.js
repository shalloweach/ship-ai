/**
 * 船舶图标 & 批量折线管理
 */
import { parsePointToLngLat } from '../utils/mapUtils'

/**
 * 构建船舶弹窗内容 (可抽离到单独文件)
 */
const buildShipPopup = (ship) => {
  return `
    <div class="ship-popup" style="min-width: 200px; padding: 8px;">
      <h4 style="margin: 0 0 8px;">${ship.name || '未知船舶'}</h4>
      <p style="margin: 4px 0; font-size: 12px;">MMSI: ${ship.mmsi || '-'}</p>
      <p style="margin: 4px 0; font-size: 12px;">航向: ${ship.course ?? '-'}°</p>
      <p style="margin: 4px 0; font-size: 12px;">速度: ${ship.speed ?? '-'} kn</p>
      <p style="margin: 4px 0; font-size: 12px;">时间: ${ship.timestamp ? new Date(ship.timestamp).toLocaleString() : '-'}</p>
    </div>
  `
}

/**
 * 更新船舶图标位置和方向
 */
export const updateShipMarker = (mapState, ship, options = {}) => {
  const { instance: mapInstance, layers } = mapState
  
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
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
    `
    iconEl.innerHTML = `
      <div class="ship-icon" style="
        transform: rotate(${heading}deg);
        transition: transform ${duration}ms ease;
        font-size: 28px; line-height: 1;
      ">🚢</div>
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
    
    // 绑定弹窗
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
  
  // 重新绑定弹窗事件
  if (layers.ship) {
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
 * 移除船舶图标
 */
export const removeShipMarker = (mapState) => {
  const { instance: mapInstance, layers } = mapState
  if (layers.ship && mapInstance) {
    mapInstance.remove(layers.ship)
    layers.ship = null
    layers.shipMarkerEl = null
  }
}

/**
 * 移除指定批次的折线
 */
export const removePolyline = (mapState, batchId) => {
  const { instance: mapInstance, layers } = mapState
  
  if (!mapInstance || !batchId) return false

  const polyline = layers.polylines.get(batchId)
  if (polyline) {
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