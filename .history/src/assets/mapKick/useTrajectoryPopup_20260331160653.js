// src/assets/mapKick/useTrajectoryPopup.js
import { buildPopupContent } from './trajectoryPopup'

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
  
  // 🔧 显示弹窗 - ✅ 支持 callbacks
  const showPopup = (marker, point, callbacks = {}) => {
    const popupInstance = initPopup()
    if (!popupInstance || !point) return
    
    // 构建内容（传入 callbacks）
    const content = buildPopupContent(point, {
      onMarkClick: callbacks.onMarkClick,
      onNavigate: callbacks.onNavigate
    })
    
    popupInstance.setContent(content)
    popupInstance.open(mapInstance, marker.getPosition())
    
    // 🔥 关键：延时绑定按钮事件（等待 DOM 渲染）
    setTimeout(() => {
      const markBtn = document.getElementById('popup-mark-btn')
      if (markBtn && callbacks.onMarkClick) {
        // 防重复绑定：先移除旧事件
        const newBtn = markBtn.cloneNode(true)
        markBtn.parentNode.replaceChild(newBtn, markBtn)
        
        // 绑定新事件
        newBtn.addEventListener('click', (e) => {
          e.stopPropagation()  // ① 阻止冒泡
          e.preventDefault()   // ② 阻止默认
          callbacks.onMarkClick?.(point)  // ③ 执行回调
          // ④ 可选：自动关闭弹窗
          if (callbacks.autoClose !== false) {
            closePopup()
          }
        })
      }
    }, 80)  // 高德弹窗渲染稍慢，给 80ms
  }
  
  // 关闭弹窗
  const closePopup = () => {
    popup?.close()
  }
  
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