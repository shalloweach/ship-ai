// src/assets/mapKick/useTrajectoryPopup.js
import { buildPopupContent } from './trajectoryPopup'

export function useTrajectoryPopup(mapGetter) {
  let popup = null
  let mapInstance = null
  
  const initPopup = () => {
    if (!mapInstance) {
      mapInstance = mapGetter?.()
    }
    if (mapInstance && !popup) {
      popup = new AMap.InfoWindow({
        isCustom: true,
        autoMove: true,
        closeWhenClickMap: true,
        offset: new AMap.Pixel(0, -30)
      })
    }
    return popup
  }
  
  const showPopup = (marker, point, callbacks = {}) => {
    const popupInstance = initPopup()
    if (!popupInstance || !point) return
    
    // 构建内容
    const content = buildPopupContent(point, {
      onMarkClick: callbacks.onMarkClick,
      onNavigate: callbacks.onNavigate
    })
    
    popupInstance.setContent(content)
    popupInstance.open(mapInstance, marker.getPosition())
    
    // 🔥 关键：延时绑定按钮事件
    setTimeout(() => {
      const markBtn = document.getElementById('popup-mark-btn')
      if (markBtn) {
        // 防重复绑定
        const newBtn = markBtn.cloneNode(true)
        markBtn.parentNode?.replaceChild(newBtn, markBtn)
        
        newBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          
          // ① 执行传入的回调（如果有）
          callbacks.onMarkClick?.(point)
          
          // ② 🔥 触发全局事件（供其他模块监听）
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ship:mark:click', {
              detail: { point, type: 'start' }
            }))
          }
          
          // ③ 可选：自动关闭弹窗
          if (callbacks.autoClose !== false) {
            closePopup()
          }
        })
      }
    }, 80)
  }
  
  const closePopup = () => popup?.close()
  
  const destroy = () => {
    closePopup()
    popup = null
  }
  
  return { showPopup, closePopup, destroy, getInstance: () => popup }
}

export default useTrajectoryPopup