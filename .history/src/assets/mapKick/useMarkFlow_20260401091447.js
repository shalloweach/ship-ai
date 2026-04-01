// src/assets/mapKick/useMarkFlow.js
import { ref } from 'vue'

// ========== 响应式状态（全局单例） ==========
export const markFlow = ref({
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,
  endPoint: null,
  tempMark: null
})

export const pendingMarks = ref([])

// ========== 核心函数 ==========

export const startMarkFlow = (point = null) => {
    1.
 
}

export const cancelMarkFlow = () => {
  markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
}

export const createMarkData = (startPoint, endPoint) => {
  const startTs = startPoint.timestamp || startPoint.utc_time
  const endTs = endPoint.timestamp || endPoint.utc_time
  const [s, e] = startTs < endTs ? [startPoint, endPoint] : [endPoint, startPoint]
  
  return {
    id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: '',
    startTime: Math.min(startTs, endTs),
    endTime: Math.max(startTs, endTs),
    startPoint: { lat: s.lat, lon: s.lon, idx: s.idx },
    endPoint: { lat: e.lat, lon: e.lon, idx: e.idx },
    stayType: '靠泊',
    port: '',
    note: '',
    status: 'draft'
  }
}

export const saveMarkToTable = (markData, { mmsi = '' } = {}) => {
  const mark = { ...markData, mmsi, status: 'draft' }
  const exists = pendingMarks.value.some(m => 
    m.startTime === mark.startTime && m.endTime === mark.endTime
  )
  if (exists) return { success: false, error: 'duplicate' }
  
  pendingMarks.value.push(mark)
  pendingMarks.value.sort((a, b) => a.startTime - b.startTime)  // 🔥 升序
  return { success: true, mark }
}

export const updatePendingMark = (id, field, value) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) { mark[field] = value; return true }
  return false
}

export const removePendingMark = (id) => {
  const idx = pendingMarks.value.findIndex(m => m.id === id)
  return idx >= 0 ? pendingMarks.value.splice(idx, 1)[0] : null
}

export const submitPendingMarks = async (onSubmit) => {
  if (!onSubmit || pendingMarks.value.length === 0) return { success: false, error: 'empty' }
  try {
    const result = await onSubmit(pendingMarks.value.map(m => ({
      mmsi: m.mmsi, startTime: m.startTime, endTime: m.endTime,
      stayType: m.stayType, port: m.port, note: m.note || '',
      startPoint: m.startPoint, endPoint: m.endPoint
    })))
    pendingMarks.value.forEach(m => m.status = 'synced')
    return { success: true, result }
  } catch (err) {
    return { success: false, error: err }
  }
}

export default {
  markFlow, pendingMarks, startMarkFlow, cancelMarkFlow, createMarkData,
  saveMarkToTable, updatePendingMark, removePendingMark, submitPendingMarks
}