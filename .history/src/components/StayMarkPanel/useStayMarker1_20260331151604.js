// src/components/StayMarkPanel/useStayMarker.js
import { ref } from 'vue'

// ========== MarkCard 事件处理 ==========

// 🔧 点击表格记录：地图跳转
const onMarkSelect = (mark) => {
  if (!mark.startPoint?.lat || !mark.endPoint?.lat) return
  
  // 🎯 定位到中心
  const centerLat = (mark.startPoint.lat + mark.endPoint.lat) / 2
  const centerLon = (mark.startPoint.lon + mark.endPoint.lon) / 2
  mapOp?.flyTo?.(centerLon, centerLat, 13)
  
  // 🎨 高亮该段
  highlightSegment(mark.startPoint.idx, mark.endPoint.idx, {
    color: '#667eea',
    weight: 4,
    opacity: 0.9
  })
}

// 🔧 重新选择起止点
const onMarkReselect = (mark) => {
  clearHighlight()
  markFlow.value.tempMark = { ...mark }
  markFlow.value.startPoint = mark.startPoint
  markFlow.value.mode = 'selecting-end'
}

// 🔧 更新标记字段
const onMarkUpdate = ({ id, field, value }) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) {
    mark[field] = value
    if (mapOp?.updateStayMarker) {
      mapOp.updateStayMarker(mark)
    }
  }
}

// 🔧 删除标记
const onMarkDelete = (id) => {
  const idx = pendingMarks.value.findIndex(m => m.id === id)
  if (idx >= 0) {
    const removed = pendingMarks.value.splice(idx, 1)[0]
    if (mapOp?.removeStayMarker) {
      mapOp.removeStayMarker(removed)
    }
  }
}

// 🔧 提交所有标记
const onSubmitMarks = async () => {
  if (pendingMarks.value.length === 0) return
  
  try {
    const marksForApi = pendingMarks.value.map(m => ({
      mmsi: m.mmsi,
      startTime: m.startTime,
      endTime: m.endTime,
      stayType: m.stayType,
      port: m.port,
      note: m.note || '',
      startPoint: { lat: m.startPoint.lat, lon: m.startPoint.lon, idx: m.startPoint.idx },
      endPoint: { lat: m.endPoint.lat, lon: m.endPoint.lon, idx: m.endPoint.idx }
    }))
    
    // 📤 调用后端接口
    const response = await fetch('/api/stay-marks/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks: marksForApi })
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || '提交失败')
    }
    
    const result = await response.json()
    
    // ✅ 更新状态
    pendingMarks.value.forEach((m, i) => {
      m.status = 'synced'
      m.serverId = result.ids?.[i] || result.id
    })
    
    return { success: true, result }
    
  } catch (err) {
    console.error('❌ 提交失败:', err)
    throw err
  }
}

// ========== 🔧 辅助函数 ==========

// 🔧 创建标记数据对象
const createMarkData = (startPoint, endPoint) => {
  const startTs = startPoint.timestamp || startPoint.utc_time
  const endTs = endPoint.timestamp || endPoint.utc_time
  
  return {
    id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: mmsi.value,
    startTime: Math.min(startTs, endTs),
    endTime: Math.max(startTs, endTs),
    startPoint: { lat: startPoint.lat, lon: startPoint.lon, idx: startPoint.idx },
    endPoint: { lat: endPoint.lat, lon: endPoint.lon, idx: endPoint.idx },
    stayType: '靠泊',
    port: '',
    note: '',
    status: 'draft',
    createdAt: Date.now()
  }
}

// 🔧 高亮轨迹段
const highlightSegment = async (startIndex, endIndex, options = {}) => {
  if (!trajectoryPoints.value.length || startIndex == null || endIndex == null) return
  
  const [s, e] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
  const segment = trajectoryPoints.value.slice(s, e + 1)
  
  if (segment.length < 2 || !mapOp?.highlightTrajectory) return
  
  tempHighlight.value = segment.map(p => p.idx)
  
  await mapOp.highlightTrajectory(segment, {
    color: options.color || '#667eea',
    weight: options.weight || 4,
    opacity: options.opacity || 0.8,
    layerId: `highlight_${mmsi.value}_${s}_${e}`
  })
}

// 🔧 清除高亮
const clearHighlight = () => {
  if (mapOp?.clearHighlight) {
    mapOp.clearHighlight()
  }
  tempHighlight.value = []
}

// 🔧 加载轨迹点（供标记使用）
const loadTrajectoryPoints = async (mmsiVal, count) => {
  if (!mmsiVal || !count) return
  
  try {
    // 🔧 根据实际接口调整
    const response = await fetch(`/api/trajectory/points?mmsi=${mmsiVal}&count=${count}`)
    const data = await response.json()
    
    if (data.points) {
      trajectoryPoints.value = data.points.map((p, idx) => ({
        ...p,
        idx: p.idx ?? idx,
        timestamp: p.utc_time || p.timestamp
      }))
    }
  } catch (err) {
    console.warn('⚠️ 加载轨迹点失败:', err)
  }
}

// 🔧 时间格式化
const formatTime = (ts) => {
  if (!ts) return '-'
  const t = ts > 1e12 ? ts : ts * 1000
  return new Date(t).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// 🔧 时长格式化
const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分`
}