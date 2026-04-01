// src/components/StayMarkPanel/useStayMarker.js
import { ref } from 'vue'

export function useStayMarker({ mmsi, points, mapOp }) {
  // 高亮图层引用
  const highlightLayer = ref(null)
  
  // 🔧 创建标记数据对象
  const createMark = (startPoint, endPoint) => {
    const startTs = startPoint.timestamp || startPoint.utc_time
    const endTs = endPoint.timestamp || endPoint.utc_time
    const [s, e] = startTs < endTs ? [startPoint, endPoint] : [endPoint, startPoint]
    
    return {
      id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi,
      startTime: Math.min(startTs, endTs),
      endTime: Math.max(startTs, endTs),
      startPoint: { lat: s.lat, lon: s.lon, idx: s.idx },
      endPoint: { lat: e.lat, lon: e.lon, idx: e.idx },
      stayType: '靠泊',
      port: '',
      note: '',
      status: 'draft',
      createdAt: Date.now()
    }
  }
  
  // 🔧 更新标记字段
  const updateMark = (mark, updates) => {
    return { ...mark, ...updates, updatedAt: Date.now() }
  }
  
  // 🔧 删除标记
  const deleteMark = (marks, id) => {
    return marks.filter(m => m.id !== id)
  }
  
  // 🔧 高亮两点间轨迹段
  const highlightSegment = async (startIndex, endIndex, options = {}) => {
    if (!points.value?.length || startIndex == null || endIndex == null) return []
    
    // 确保 start < end
    const [s, e] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
    
    // 截取轨迹段
    const segment = points.value.slice(s, e + 1)
    if (segment.length < 2) return []
    
    // 🎨 绘制高亮（适配不同地图库）
    if (mapOp?.highlightTrajectory) {
      highlightLayer.value = await mapOp.highlightTrajectory(segment, {
        color: options.color || '#667eea',
        weight: options.weight || 4,
        opacity: options.opacity || 0.8,
        layerId: `highlight_${mmsi}_${s}_${e}`
      })
    }
    
    return segment
  }
  
  // 🔧 清除高亮
  const clearHighlight = () => {
    if (highlightLayer.value && mapOp?.removeLayer) {
      mapOp.removeLayer(highlightLayer.value)
      highlightLayer.value = null
    }
  }
  
  // 🔧 按开始时间升序排序
  const sortMarksByStartTime = (marks) => {
    return marks.sort((a, b) => a.startTime - b.startTime)
  }
  
  // 🔧 验证标记数据
  const validateMark = (mark) => {
    const errors = []
    if (!mark.startTime || !mark.endTime) errors.push('时间范围不完整')
    if (mark.endTime <= mark.startTime) errors.push('结束时间必须晚于开始时间')
    if (!mark.stayType) errors.push('请选择停留类型')
    return { valid: errors.length === 0, errors }
  }
  
  return {
    createMark,
    updateMark,
    deleteMark,
    highlightSegment,
    clearHighlight,
    sortMarksByStartTime,
    validateMark
  }
}