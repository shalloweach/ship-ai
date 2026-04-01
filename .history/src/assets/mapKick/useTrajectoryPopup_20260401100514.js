// src/assets/mapKick/useTrajectoryPopup.js
import { buildPopupContent } from './trajectoryPopup'
import { markEventBus, MARK_EVENTS } from './markEventBus'

export function useTrajectoryPopup(mapGetter) {
  let popup = null
  let mapInstance = null
  
  const initPopup = () => {
    if (!mapInstance) mapInstance = mapGetter?.()
    if (mapInstance && !popup) {
      popup = new AMap.InfoWindow({
        isCustom: true, autoMove: true, closeWhenClickMap: true,
        offset: new AMap.Pixel(0, -30)
      })
    }
    return popup
  }
  
  const showPopup = (marker, point, callbacks = {}) => {
    const popupInstance = initPopup()
    if (!popupInstance || !point) return
    
    const content = buildPopupContent(point, {
      onMarkClick: callbacks.onMarkClick,
      onNavigate: callbacks.onNavigate
    })
    
    popupInstance.setContent(content)
    popupInstance.open(mapInstance, marker.getPosition())
    
    // 🔥 绑定🏷️按钮事件
    setTimeout(() => {
      const markBtn = document.getElementById('popup-mark-btn')
      if (markBtn) {
        const newBtn = markBtn.cloneNode(true)
        markBtn.parentNode?.replaceChild(newBtn, markBtn)
        newBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          callbacks.onMarkClick?.(point)  // 执行传入的回调
          if (callbacks.autoClose !== false) closePopup()  // 自动关闭
        })
      }
    }, 80)
  }
  
  const closePopup = () => popup?.close()
  const destroy = () => { closePopup(); popup = null }
  
  return { showPopup, closePopup, destroy, getInstance: () => popup }
}

export default useTrajectoryPopup