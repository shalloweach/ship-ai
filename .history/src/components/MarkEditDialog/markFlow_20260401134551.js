// src\components\MarkEditDialog\markFlow.js
import { ref } from 'vue'

// 响应式状态
export const markFlow = ref({
    mode: 'idle',
    startPoint: null, 存储第一个点idx
    endPoint: null,存储第二个点idx
    tempMark: null,
  })

// 前端表格数据（全局数组）
export const markTable = ref([])

/**
 * 启动标记流程：选终点 → 高亮 → 编辑弹窗 → 保存
 */
export const startMarkFlow = async (mapState, points, startIdx) => {
    try {
      console.log('🏷️ 开始 startMarkFlow')
      markFlow.value.mode = 'selecting-end'
      
      const startPoint = points[startIdx]  // 🔧 获取起点数据
      if (!startPoint) {
        console.error('❌ 起点数据为空')
        markFlow.value.mode = 'idle'
        return null
      }
      
      // 1️⃣ 选择终点（✅ 传入 startPoint 用于牵引线）
      const endIndex = await pickPointFromMap(mapState, { 
        
        trajectoryPoints: points,
        startPoint  // 🔧 关键：传入起点
      })
      
      if (endIndex === null || endIndex === undefined) {
        markFlow.value.mode = 'idle'
        return null
      }
  
      // 2️⃣ 修正索引顺序
      let [sIdx, eIdx] = [startIdx, endIndex]
      if (sIdx > eIdx) [sIdx, eIdx] = [eIdx, sIdx]
  
      // 3️⃣ 高亮轨迹段
      const segment = points.slice(sIdx, eIdx + 1)
      onHighlight(mapState, segment)
  
      // 4️⃣ 创建标记数据
      const tempMark = createMarkData(segment[0], segment[segment.length - 1])
  
      // 5️⃣ 打开编辑弹窗
      const result = await onEditOpen(tempMark)
      
      // 6️⃣ 清理高亮 + 牵引线
      clearHighlight(mapState)
      clearRubberBand(mapState)  // 🔧 确保清理
      
      if (!result) return null
  
      // 7️⃣ 保存到前端表格
      
      return saveMarkToTable(result)
  
    } catch (err) {
      console.error('markFlow error:', err)
      clearRubberBand(mapState)  // 🔧 异常时也清理
      return null
    } finally {
        markFlow.value.mode = 'idle'
        // ✅ 确保回调和临时状态被清除
        markFlow.value.onPointSelected = null
        markFlow.value.endPoint = null
        markFlow.value.startPoint = null
      }
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
      
      const { createApp } = require('vue')
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

/**
 * 从地图点击获取轨迹点索引（✅ 带牵引线 + 高德坐标修复）
 */
export const pickPointFromMap = async (mapState, { trajectoryPoints, startPoint } = {}) => {
    return new Promise((resolve) => {
      // 清理之前的回调（防止冲突）
      if (markFlow.value.onPointSelected) {
        console.warn('⚠️ 上一个点选择回调未清理，将被覆盖')
      }
  
      // 定义终点选择回调
      const onPointSelected = (point, lnglat) => {
        if (!point) {
          cleanup()
          resolve(null)
          return
        }
  
        const clickedLat = point.lat
        const clickedLng = point.lon || point.lng
  
        // 在轨迹点中匹配索引
        const idx = trajectoryPoints.findIndex(p => {
          const pLon = p.lon ?? p.lng
          const pLat = p.lat
          if (pLat == null || pLon == null) return false
          return Math.abs(pLat - clickedLat) < 0.001 &&
                 Math.abs(pLon - clickedLng) < 0.001
        })
  
        cleanup()
        resolve(idx >= 0 ? idx : null)
      }
  
      // 保存回调到全局状态
      markFlow.value.onPointSelected = onPointSelected
  
      // 同时监听地图空白区域的点击（作为备选）
      const onMapClick = (e) => {
        const lnglat = e.lnglat || e.latlng
        if (!lnglat) return
  
        const clickedLat = lnglat.getLat?.() ?? lnglat.lat
        const clickedLng = lnglat.getLng?.() ?? lnglat.lng
  
        // 构建一个临时点对象用于匹配
        const tempPoint = { lat: clickedLat, lon: clickedLng }
        onPointSelected(tempPoint, { lng: clickedLng, lat: clickedLat })
      }
  
      // 绑定地图点击
      mapState.instance?.on('click', onMapClick)
  
      // 鼠标移动时绘制牵引线
      const onMouseMove = (e) => {
        const lnglat = e.lnglat || e.latlng
        if (!lnglat || !startPoint) return
        const mouseLngLat = new AMap.LngLat(
          lnglat.getLng?.() ?? lnglat.lng,
          lnglat.getLat?.() ?? lnglat.lat
        )
        drawRubberBand(mapState, startPoint, mouseLngLat)
      }
      mapState.instance?.on('mousemove', onMouseMove)
  
      // 清理函数
      const cleanup = () => {
        mapState.instance?.off('click', onMapClick)
        mapState.instance?.off('mousemove', onMouseMove)
        clearRubberBand(mapState)
        markFlow.value.onPointSelected = null   // 清除回调
      }
  
      // 超时保护
      setTimeout(() => {
        cleanup()
        resolve(null)
      }, 30000)
    })
  }