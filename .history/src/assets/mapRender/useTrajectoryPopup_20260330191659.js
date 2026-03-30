// composables/useTrajectoryPopup.js
import { ref, markRaw } from 'vue'

export const useTrajectoryPopup = (mapInstanceRef) => {
  const infoWindow = ref(null)
  const currentPoint = ref(null)
  
  // 创建/更新弹窗
  const showPopup = (marker, point, options = {}) => {
    if (!mapInstanceRef.value || !point) return
    
    const map = mapInstanceRef.value
    
    // 关闭已有弹窗
    if (infoWindow.value) {
      infoWindow.value.close()
      infoWindow.value = null
    }
    
    // 构建内容
    const content = buildPopupContent(point, {
      mmsi: options.mmsi,
      showCopyBtn: true,
      showActions: true,
      ...options
    })
    
    // 创建 InfoWindow（高德 API）
    infoWindow.value = markRaw(new AMap.InfoWindow({
      content,
      offset: new AMap.Pixel(0, -30),    // 向上偏移，避免遮挡标记
      autoMove: true,                     // 自动调整不超出视野
      closeWhenClickMap: true,            // 点击地图关闭
      isCustom: true                      // 使用自定义样式
    }))
    
    infoWindow.value.open(map, marker.getPosition())
    currentPoint.value = point
    
    // 🎯 关键：绑定弹窗内按钮事件（事件委托）
    bindPopupEvents(marker, point, options)
    
    return infoWindow.value
  }
  
  // 关闭弹窗
  const closePopup = () => {
    if (infoWindow.value) {
      infoWindow.value.close()
      infoWindow.value = null
      currentPoint.value = null
    }
  }
  
  // 🔗 绑定弹窗内交互事件
  const bindPopupEvents = (marker, point, options = {}) => {
    // 延迟绑定，确保 DOM 已渲染
    setTimeout(() => {
      const popupEl = document.querySelector('.ts-popup-point')
      if (!popupEl) return
      
      // 1️⃣ 复制坐标
      popupEl.querySelectorAll('.btn-copy, .coord-value[data-copy]').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation()
          const coord = el.dataset.copy
          try {
            await navigator.clipboard.writeText(coord)
            // 显示复制成功反馈
            const btn = el.closest('button') || el
            const original = btn.innerHTML
            btn.innerHTML = '✅'
            setTimeout(() => btn.innerHTML = original, 1200)
            options.onCopy?.(coord, point)
          } catch (err) {
            console.error('📋 复制失败:', err)
          }
        })
      })
      
      // 2️⃣ 操作按钮
      popupEl.querySelectorAll('.popup-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const action = btn.dataset.action
          
          switch(action) {
            case 'center':
              // 地图居中到该点
              mapInstanceRef.value?.setCenter(marker.getPosition())
              mapInstanceRef.value?.setZoom(16)
              options.onCenter?.(point, marker)
              break
              
            case 'timeline':
              // 通知父组件跳转到时间轴对应位置
              options.onTimelineJump?.(point.idx ?? point.index)
              closePopup()
              break
              
            case 'detail':
              // 弹出详情模态框（可扩展）
              options.onShowDetail?.(point)
              break
          }
        })
      })
      
      // 3️⃣ 状态标签点击（筛选同类状态点）
      popupEl.querySelectorAll('.status-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
          e.stopPropagation()
          const status = badge.dataset.status || point.navigationStatus
          options.onFilterByStatus?.(status)
        })
      })
      
    }, 100) // 等待 InfoWindow 内容渲染
  }
  
  // 🎨 动态更新弹窗内容（用于播放时实时更新）
  const updatePopupContent = (newPoint) => {
    if (!infoWindow.value || !newPoint) return
    const newContent = buildPopupContent(newPoint, { mmsi: currentPoint.value?.mmsi })
    infoWindow.value.setContent(newContent)
    currentPoint.value = newPoint
    // 重新绑定事件
    bindPopupEvents(null, newPoint, { /* 传递必要 options */ })
  }
  
  return {
    showPopup,
    closePopup,
    updatePopupContent,
    infoWindow,
    currentPoint
  }
}