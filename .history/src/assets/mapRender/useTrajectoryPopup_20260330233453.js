// src/assets/mapRender/useTrajectoryPopup.js
import { buildPopupContent } from './trajectoryPopup'

export const useTrajectoryPopup = (getMapInstance) => {
  let currentInfoWindow = null
  
  // 显示弹窗
  const showPopup = (marker, point) => {
    const map = typeof getMapInstance === 'function' ? getMapInstance() : getMapInstance
    if (!map || !point) return
    
    // 先关闭已存在的弹窗
    if (currentInfoWindow) {
      currentInfoWindow.close()
      currentInfoWindow = null
    }
    
    // 创建新弹窗
    currentInfoWindow = new AMap.InfoWindow({
      content: buildPopupContent(point),
      offset: new AMap.Pixel(0, -25),  // 向上偏移，避免遮挡标记
      autoMove: true,                   // 自动调整不超出视野
      closeWhenClickMap: true,          // 点击地图其他位置关闭
      isCustom: true                    // 使用自定义样式
    })
    
    currentInfoWindow.open(map, marker.getPosition())
  }
  
  // 关闭弹窗
  const closePopup = () => {
    if (currentInfoWindow) {
      currentInfoWindow.close()
      currentInfoWindow = null
    }
  }
  
  return { showPopup, closePopup }
}