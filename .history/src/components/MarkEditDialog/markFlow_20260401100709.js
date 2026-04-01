// src\components\MarkEditDialog\markFlow.js
import { ref } from 'vue'

// 响应式状态
export const markFlow = ref({
  mode: 'idle',
  startPoint: null,
  endPoint: null,
  tempMark: null
})

// 前端表格数据（全局数组）
export const markTable = ref([])

/**
 * 启动标记流程：选终点 → 高亮 → 编辑弹窗 → 保存
 */
export const startMarkFlow = async (mapState, points, startIdx) => {
  try {

    console
    markFlow.value.mode = 'selecting-end'
    
    // 1️⃣ 选择终点
    const endIndex = await pickPointFromMap(mapState, { trajectoryPoints: points })
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

    // 4️⃣ 创建标记数据（仅6个核心字段）
    const tempMark = createMarkData(segment[0], segment[segment.length - 1])

    // 5️⃣ 打开编辑弹窗（Promise等待用户输入）
    const result = await onEditOpen(tempMark)
    
    // 6️⃣ 清理高亮
    clearHighlight(mapState)
    
    if (!result) return null // 用户取消

    // 7️⃣ 保存到前端表格
    return saveMarkToTable(result)

  } catch (err) {
    console.error('markFlow error:', err)
    return null
  } finally {
    markFlow.value.mode = 'idle'
  }
}

/**
 * 从地图点击获取轨迹点索引
 */
export const pickPointFromMap = async (mapState, { trajectoryPoints } = {}) => {
  return new Promise((resolve) => {
    const onClick = (e) => {
      const clicked = e.lnglat || e.latlng
      if (!clicked || !trajectoryPoints?.length) {
        cleanup(); resolve(null); return
      }
      // 坐标匹配（阈值0.001≈100米）
      const idx = trajectoryPoints.findIndex(p => {
        const lon = p.lon || p.lng
        const clickedLon = clicked.lng || clicked.lon
        return Math.abs(p.lat - clicked.lat) < 0.001 && 
               Math.abs(lon - clickedLon) < 0.001
      })
      cleanup()
      resolve(idx >= 0 ? idx : null)
    }
    
    const cleanup = () => {
      mapState.instance?.off('click', onClick)
    }
    
    mapState.instance?.on('click', onClick)
    // 超时保护
    setTimeout(() => { cleanup(); resolve(null) }, 30000)
  })
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