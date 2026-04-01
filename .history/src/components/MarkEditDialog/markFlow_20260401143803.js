// src\components\MarkEditDialog\markFlow.js
import { ref, createApp } from 'vue'

// 响应式状态
export const markFlow = ref({
    mode: 'idle',                    // 流程状态: idle | selecting-end
    startPoint: null,                // 存储起点索引 (idx)
    endPoint: null,                  // 存储终点索引 (idx)
    tempMark: null,                  // 临时标记数据
  })
  
// 前端表格数据（全局数组）
export const markTable = ref([])

/**
 * 绘制从起点到鼠标位置的牵引线
 */
export const drawRubberBand = (mapState, startPoint, mouseLngLat) => {
    const map = mapState.instance
    if (!map || !startPoint) return null
  
    const startLngLat = new AMap.LngLat(
      startPoint.lon || startPoint.lng,
      startPoint.lat
    )
  
    if (!mapState.rubberBandOverlay) {
      mapState.rubberBandOverlay = new AMap.Polyline({
        path: [startLngLat, mouseLngLat],
        strokeColor: '#f59e0b',
        strokeWeight: 2,
        strokeStyle: 'dashed',
        strokeDasharray: [8, 4],
        strokeOpacity: 0.7,
        zIndex: 99,
        lineJoin: 'round',
        lineCap: 'round'
      })
      mapState.rubberBandOverlay.setMap(map)
    } else {
      mapState.rubberBandOverlay.setPath([startLngLat, mouseLngLat])
    }
  
    return mapState.rubberBandOverlay
  }

/**
 * 清除牵引线
 */
export const clearRubberBand = (mapState) => {
    if (mapState.rubberBandOverlay) {
      mapState.rubberBandOverlay.setMap(null)
      mapState.rubberBandOverlay = null
    }
  }
  
  /**
   * 高亮轨迹段（AMap）
   */
  export const onHighlight = (mapState, points) => {
    const map = mapState.instance
    if (!map || points.length < 2) return
  
    const path = points.map(p => [p.lon || p.lng, p.lat]).filter(([lon, lat]) => lon && lat)
  
    if (mapState.highlightOverlay) mapState.highlightOverlay.setMap(null)
    mapState.highlightOverlay = new AMap.Polyline({
      path,
      strokeColor: '#f59e0b',
      strokeWeight: 3,
      strokeStyle: 'dashed',
      strokeDasharray: [10, 5],
      zIndex: 100
    })
    mapState.highlightOverlay.setMap(map)
  
    map.setFitView([mapState.highlightOverlay])
  }
  
  /**
   * 清除高亮
   */
  export const clearHighlight = (mapState) => {
    if (mapState.highlightOverlay) {
      mapState.highlightOverlay.setMap(null)
      mapState.highlightOverlay = null
    }
  }
  
  /**
   * 创建标记数据（6个字段）
   * @param {Object} startPoint 起点数据
   * @param {Object} endPoint 终点数据
   * @param {string} mmsi 船舶 MMSI（从路由获取）
   */
  export const createMarkData = (startPoint, endPoint, mmsi) => {
    const startTs = startPoint.timestamp || startPoint.utc_time || Date.now()
    const endTs = endPoint.timestamp || endPoint.utc_time || Date.now()
  
    return {
      id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi: mmsi || '',
      startTime: Math.min(startTs, endTs),
      endTime: Math.max(startTs, endTs),
      stayType: '',
      port: '',
      status: ''
    }
  }
  
  /**
   * 保存标记到前端表格
   */
  export const saveMarkToTable = (mark) => {
    if (!mark.stayType || !mark.port || !mark.status) {
      console.warn('⚠️ 缺少必填字段')
      return null
    }
  
    const record = {
      id: mark.id,
      mmsi: mark.mmsi || '',
      startTime: mark.startTime,
      endTime: mark.endTime,
      stayType: mark.stayType,
      port: mark.port,
      status: mark.status
    }
  
    markTable.value.unshift(record)
    return record
  }
  
  /**
   * 打开编辑弹窗（Promise封装 + close方法）
   */
  export const onEditOpen = (markData) => {
    let resolvePromise = null
    let app = null
    let container = null
  
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
  
      import('@/components/MarkEditDialog/MarkEditDialog.vue').then(({ default: Dialog }) => {
        container = document.createElement('div')
        document.body.appendChild(container)
  
        app = createApp(Dialog, {
          markData,
          onConfirm: (result) => {
            if (resolvePromise) resolvePromise(result)
            cleanup()
          },
          onCancel: () => {
            if (resolvePromise) resolvePromise(null)
            cleanup()
          }
        })
  
        const cleanup = () => {
          if (app) app.unmount()
          if (container) container.remove()
          app = null
          container = null
          resolvePromise = null
        }
  
        app.mount(container)
      })
    })
  
    const close = () => {
      if (resolvePromise) {
        resolvePromise(null)
        resolvePromise = null
      }
      if (app) {
        app.unmount()
        container?.remove()
        app = null
        container = null
      }
    }
  
    return { promise, close }
  }
  
  /**
   * 启动标记流程
   * @param {Object} mapState 地图状态对象
   * @param {Array} points 轨迹点数组
   * @param {number} startIdx 起点索引
   * @param {string} mmsi 船舶MMSI（从路由获取）
   */
  export const startMarkFlow = async (mapState, points, startIdx, mmsi) => {
    try {
      console.log('🏷️ 开始 startMarkFlow')
      const startPoint = points[startIdx]
      if (!startPoint) {
        console.error('❌ 起点数据为空')
        return null
      }
  
      markFlow.value.startPoint = startIdx
      markFlow.value.mode = 'selecting-end'
  
      let timeoutId = null
      let processing = false
      let editDialogClose = null
  
      // 鼠标移动绘制牵引线
      const onMouseMove = (e) => {
        if (processing) return
        if (!startPoint) return
        const lnglat = e.lnglat || e.latlng
        if (!lnglat) return
        const mouseLngLat = new AMap.LngLat(
          lnglat.getLng?.() ?? lnglat.lng,
          lnglat.getLat?.() ?? lnglat.lat
        )
        drawRubberBand(mapState, startPoint, mouseLngLat)
      }
      mapState.instance?.on('mousemove', onMouseMove)
  
      // 清除高亮和牵引线（保留流程状态）
      const clearTemporary = () => {
        clearHighlight(mapState)
        clearRubberBand(mapState)
      }
  
      // 键盘ESC监听
      const onKeyDown = (e) => {
        if (e.key === 'Escape' && markFlow.value.mode === 'selecting-end') {
          console.log('⌨️ ESC 取消标记流程')
          fullCleanup()
          markFlow.value.mode = 'idle'
        }
      }
      window.addEventListener('keydown', onKeyDown)
  
      // 完全清理所有资源（退出流程）
      const fullCleanup = () => {
        if (timeoutId) clearTimeout(timeoutId)
        mapState.instance?.off('mousemove', onMouseMove)
        window.removeEventListener('keydown', onKeyDown)
        markFlow.value.onPointSelected = null
        clearTemporary()
        if (editDialogClose) {
          editDialogClose()
          editDialogClose = null
        }
      }
  
      // 重置超时
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          console.log('⏰ 标记流程超时，已取消')
          fullCleanup()
          markFlow.value.mode = 'idle'
        }, 30000)
      }
  
      // 终点选择回调
      const endPointSelected = (endIdx) => {
        if (processing) return
        if (endIdx === undefined || endIdx === null) return
  
        processing = true
        clearTemporary()
  
        let [sIdx, eIdx] = [startIdx, endIdx]
        if (sIdx > eIdx) [sIdx, eIdx] = [eIdx, sIdx]
  
        const segment = points.slice(sIdx, eIdx + 1)
        onHighlight(mapState, segment)
  
        // 创建标记数据，传入 mmsi
        const tempMark = createMarkData(segment[0], segment[segment.length - 1], mmsi)
  
        const { promise, close } = onEditOpen(tempMark)
        editDialogClose = close
  
        promise.then((result) => {
          processing = false
          editDialogClose = null
          if (result) {
            saveMarkToTable(result)
            fullCleanup()
            markFlow.value.mode = 'idle'
          } else {
            clearTemporary()
            resetTimeout()
          }
        }).catch((err) => {
          console.error('弹窗错误:', err)
          processing = false
          editDialogClose = null
          clearTemporary()
          resetTimeout()
        })
      }
  
      markFlow.value.onPointSelected = endPointSelected
  
      // 启动超时保护
      resetTimeout()
  
    } catch (err) {
      console.error('markFlow error:', err)
      clearRubberBand(mapState)
      markFlow.value.mode = 'idle'
      return null
    }
  }



/**
 * 高亮轨迹段（AMap）
 */
export const onHighlight = (mapState, points) => {
  const map = mapState.instance
  if (!map || points.length < 2) return

  const path = points.map(p => [p.lon || p.lng, p.lat]).filter(([lon, lat]) => lon && lat)
  
  // 绘制高亮线
  mapState.highlightOverlay = new AMap.Polyline({
    path,
    strokeColor: '#f59e0b',
    strokeWeight: 3,
    strokeStyle: 'dashed',
    strokeDasharray: [10, 5],
    zIndex: 100
  })
  mapState.highlightOverlay.setMap(map)
  
  // 自适应视图
  map.setFitView([mapState.highlightOverlay])
}

/**
 * 清除高亮
 */
export const clearHighlight = (mapState) => {
  if (mapState.highlightOverlay) {
    mapState.highlightOverlay.setMap(null)
    mapState.highlightOverlay = null
  }
}

/**
 * 创建标记数据（仅6个字段）
 */
export const createMarkData = (startPoint, endPoint) => {
  const startTs = startPoint.timestamp || startPoint.utc_time || Date.now()
  const endTs = endPoint.timestamp || endPoint.utc_time || Date.now()
  
  return {
    id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: startPoint.mmsi || '',
    startTime: Math.min(startTs, endTs),
    endTime: Math.max(startTs, endTs),
    stayType: '',
    port: '',
    status: ''
  }
}

/**
 * 保存标记到前端表格
 */
export const saveMarkToTable = (mark) => {
  // 校验必填
  if (!mark.stayType || !mark.port || !mark.status) {
    console.warn('⚠️ 缺少必填字段')
    return null
  }
  
  // 标准化（仅保留6个字段）
  const record = {
    id: mark.id,
    mmsi: mark.mmsi || '',
    startTime: mark.startTime,
    endTime: mark.endTime,
    stayType: mark.stayType,
    port: mark.port,
    status: mark.status
  }
  
  // 存入表格（新数据置顶）
  markTable.value.unshift(record)
  return record
}

/**
 * 打开编辑弹窗（Promise封装）
 */
export const onEditOpen = (markData) => {
  return new Promise((resolve) => {
    // 动态导入组件，避免循环依赖
    import('@/components/MarkEditDialog/MarkEditDialog.vue').then(({ default: Dialog }) => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      
      const app = createApp(Dialog, {
        markData,
        onConfirm: (result) => {
          resolve(result)
          cleanup()
        },
        onCancel: () => {
          resolve(null)
          cleanup()
        }
      })
      
      const cleanup = () => {
        app.unmount()
        container.remove()
      }
      
      app.mount(container)
    })
  })
}

// ============ 新增：牵引线（橡皮筋）相关函数 ============

/**
 * 绘制从起点到鼠标位置的牵引线
 */
export const drawRubberBand = (mapState, startPoint, mouseLngLat) => {
    const map = mapState.instance
    if (!map || !startPoint) return null
    
    // 转换起点坐标
    const startLngLat = new AMap.LngLat(
      startPoint.lon || startPoint.lng, 
      startPoint.lat
    )
    
    // 创建/更新牵引线
    if (!mapState.rubberBandOverlay) {
      mapState.rubberBandOverlay = new AMap.Polyline({
        path: [startLngLat, mouseLngLat],
        strokeColor: '#f59e0b',      // 橙色醒目
        strokeWeight: 2,
        strokeStyle: 'dashed',        // 虚线区分
        strokeDasharray: [8, 4],
        strokeOpacity: 0.7,
        zIndex: 99,
        lineJoin: 'round',
        lineCap: 'round'
      })
      mapState.rubberBandOverlay.setMap(map)
    } else {
      // 更新终点位置
      mapState.rubberBandOverlay.setPath([startLngLat, mouseLngLat])
    }
    
    return mapState.rubberBandOverlay
  }
  
  /**
   * 清除牵引线
   */
  export const clearRubberBand = (mapState) => {
    if (mapState.rubberBandOverlay) {
      mapState.rubberBandOverlay.setMap(null)
      mapState.rubberBandOverlay = null
    }
  }
