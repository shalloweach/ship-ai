// src/assets/mapKick/onMapClick.js
import { ref } from 'vue'

// ========== 🏷️ 标记流程状态（响应式） ==========
export const markFlow = ref({ 
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,
  endPoint: null,
  tempMark: null
})

// ========== 🏷️ 核心函数：开始标记流程 ==========
export const startMarkFlow = (point = null) => {
  markFlow.value = {
    mode: point ? 'selecting-end' : 'selecting-start',
    startPoint: point,
    endPoint: null,
    tempMark: null
  }
  return markFlow.value
}

// ========== 🔧 自动初始化：挂载到全局 ==========
// 这个函数会在模块导入时自动执行，无需手动调用
;(function autoInjectGlobalAPI() {
  if (typeof window !== 'undefined') {
    // 🔥 关键：将函数挂载到 window，供 trajectoryLayer.js 隐式访问
    if (!window.__shipMarkAPI) {
      window.__shipMarkAPI = {
        startMarkFlow,
        markFlow
      }
    }
    
    // 🔥 额外兼容：直接挂载函数名（应对非严格模式/非 module 环境）
    if (!window.startMarkFlow) {
      window.startMarkFlow = startMarkFlow
    }
  }
})()

// ========== 🎯 其他标记相关函数 ==========

// 取消标记流程
export const cancelMarkFlow = () => {
  markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
}

// 创建标记数据对象
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

// 处理两点配对
export const handlePointsSelected = async (start, end, options = {}) => {
  const { onHighlight } = options
  
  const tempMark = createMarkData(start, end)
  markFlow.value.tempMark = tempMark
  markFlow.value.mode = 'editing'
  
  // 可选：高亮轨迹
  if (onHighlight && start.idx != null && end.idx != null) {
    await onHighlight(start.idx, end.idx)
  }
  
  return tempMark
}

// ========== 📦 待提交表格管理 ==========
export const pendingMarks = ref([])

export const saveMarkToTable = (markData, { mmsi = '' } = {}) => {
  const mark = { ...markData, mmsi, status: 'draft' }
  
  // 去重
  const exists = pendingMarks.value.some(m => 
    m.startTime === mark.startTime && m.endTime === mark.endTime
  )
  if (exists) return { success: false, error: 'duplicate' }
  
  pendingMarks.value.push(mark)
  // 🔥 按开始时间升序排序
  pendingMarks.value.sort((a, b) => a.startTime - b.startTime)
  
  return { success: true, mark }
}

export const submitPendingMarks = async (onSubmit) => {
  if (!onSubmit || pendingMarks.value.length === 0) {
    return { success: false, error: 'empty' }
  }
  
  try {
    const marksForApi = pendingMarks.value.map(m => ({
      mmsi: m.mmsi,
      startTime: m.startTime,
      endTime: m.endTime,
      stayType: m.stayType,
      port: m.port,
      note: m.note || '',
      startPoint: m.startPoint,
      endPoint: m.endPoint
    }))
    
    const result = await onSubmit(marksForApi)
    pendingMarks.value.forEach(m => { m.status = 'synced' })
    
    return { success: true, result }
  } catch (err) {
    return { success: false, error: err }
  }
}

// ========== 🧹 清理函数 ==========
export const cleanupMarkGlobals = () => {
  if (typeof window !== 'undefined') {
    delete window.__shipMarkAPI
    delete window.startMarkFlow
  }
}

// ========== 🎯 默认导出 ==========
export default {
  markFlow,
  startMarkFlow,
  cancelMarkFlow,
  createMarkData,
  handlePointsSelected,
  pendingMarks,
  saveMarkToTable,
  submitPendingMarks,
  cleanupMarkGlobals
}