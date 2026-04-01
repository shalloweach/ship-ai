// src/assets/mapKick/useTrajectoryPopup.js
import { buildPopupContent } from './trajectoryPopup'
import { markEventBus, MARK_EVENTS } from './markEventBus'

export function useTrajectoryPopup(mapGetter) {
  let popup = null
  let mapInstance = null
  
  // 🔧 初始化弹窗
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
  
  // 🔧 显示弹窗
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
        co
        // 防重复绑定
        const newBtn = markBtn.cloneNode(true)
        markBtn.parentNode?.replaceChild(newBtn, markBtn)
        
        newBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          
          // ① 执行传入的回调（如果有）
          callbacks.onMarkClick?.(point)
          
          // ② 🔥 触发事件总线
          markEventBus.emit(MARK_EVENTS.START, { point, type: 'start' })
          
          // ③ 可选：自动关闭弹窗
          if (callbacks.autoClose !== false) {
            closePopup()
          }
        })
      }
    }, 80)
  }
  
  // 关闭弹窗
  const closePopup = () => popup?.close()
  
  // 清理
  const destroy = () => {
    closePopup()
    popup = null
  }
  
  return {
    showPopup,
    closePopup,
    destroy,
    getInstance: () => popup
  }
}

export default useTrajectoryPopup