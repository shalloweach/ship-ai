// src/assets/mapKick/useStayMarker.js
/**
 * 🏷️ StayMarker - 停留标记状态管理
 * 职责：标记流程状态 + 起止点配对 + 数据构建 + 表格管理
 */

import { ref, computed } from 'vue'

export function useStayMarker({ mapOp, onSubmit }) {
  // ========== 状态 ==========
  const markFlow = ref({
    mode: 'idle',              // idle | selecting-start | selecting-end | editing
    startPoint: null,
    endPoint: null,
    tempMark: null
  })
  
  const pendingMarks = ref([])  // 待提交表格（按开始时间升序）
  const editDialog = ref({
    visible: false,
    currentMark: null,
    isNew: false
  })
  
  // ========== 计算属性 ==========
  const isMarking = computed(() => markFlow.value.mode !== 'idle')
  const sortedMarks = computed(() => 
    [...pendingMarks.value].sort((a, b) => a.startTime - b.startTime)
  )
  
  // ========== 核心函数 ==========
  
  // 🔹 开始标记流程
  const startMarkFlow = (point = null) => {
    markFlow.value = {
      mode: point ? 'selecting-end' : 'selecting-start',
      startPoint: point,
      endPoint: null,
      tempMark: null
    }
    return markFlow.value
  }
  
  // 🔹 取消标记流程
  const cancelMarkFlow = () => {
    markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
    closeEditDialog()
  }
  
  // 🔹 重置流程（保留数据）
  const resetMarkFlow = () => {
    markFlow.value.mode = 'idle'
    markFlow.value.startPoint = null
    markFlow.value.endPoint = null
    markFlow.value.tempMark = null
  }
  
  // 🔹 创建标记数据对象
  const createMarkData = (startPoint, endPoint) => {
    const startTs = startPoint.timestamp || startPoint.utc_time
    const endTs = endPoint.timestamp || endPoint.utc_time
    const [s, e] = startTs < endTs ? [startPoint, endPoint] : [endPoint, startPoint]
    
    return {
      id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi: '',  // 由调用方填充
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
  
  // 🔹 处理两点选中
  const handlePointsSelected = async (start, end, options = {}) => {
    const { onHighlight, onEditOpen } = options
    
    // 构建标记数据
    const tempMark = createMarkData(start, end)
    markFlow.value.tempMark = tempMark
    markFlow.value.mode = 'editing'
    
    // 可选：高亮轨迹
    if (onHighlight && start.idx != null && end.idx != null) {
      await onHighlight(start.idx, end.idx)
    }
    
    // 打开编辑弹窗
    if (onEditOpen) {
      onEditOpen(tempMark, { isNew: true })
    }
    
    return tempMark
  }
  
  // 🔹 打开编辑弹窗
  const openEditDialog = (markData, { isNew = false } = {}) => {
    editDialog.value = {
      visible: true,
      currentMark: { ...markData },
      isNew
    }
    markFlow.value.mode = 'editing'
  }
  
  // 🔹 关闭编辑弹窗
  const closeEditDialog = () => {
    editDialog.value.visible = false
    editDialog.value.currentMark = null
    if (markFlow.value.mode === 'editing') {
      markFlow.value.mode = 'idle'
    }
  }
  
  // 🔹 保存标记到表格
  const saveMarkToTable = (markData, { mmsi = '' } = {}) => {
    const mark = { ...markData, mmsi, status: 'draft' }
    
    // 去重检查
    const exists = pendingMarks.value.some(m => 
      m.startTime === mark.startTime && m.endTime === mark.endTime
    )
    if (exists) return { success: false, error: 'duplicate' }
    
    pendingMarks.value.push(mark)
    // 自动按开始时间升序排序
    pendingMarks.value.sort((a, b) => a.startTime - b.startTime)
    
    return { success: true, mark }
  }
  
  // 🔹 更新表格中的标记
  const updatePendingMark = (id, field, value) => {
    const mark = pendingMarks.value.find(m => m.id === id)
    if (mark) {
      mark[field] = value
      return true
    }
    return false
  }
  
  // 🔹 删除表格中的标记
  const removePendingMark = (id) => {
    const idx = pendingMarks.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      return pendingMarks.value.splice(idx, 1)[0]
    }
    return null
  }
  
  // 🔹 提交所有标记到后端
  const submitPendingMarks = async () => {
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
      
      // 更新本地状态
      pendingMarks.value.forEach(m => { m.status = 'synced' })
      
      return { success: true, result }
    } catch (err) {
      console.error('❌ 提交失败:', err)
      return { success: false, error: err }
    }
  }
  
  // 🔹 获取表格数据（供组件使用）
  const getPendingMarks = () => [...pendingMarks.value]
  
  // ========== 暴露 ==========
  return {
    // 状态
    markFlow,
    pendingMarks,
    editDialog,
    isMarking,
    sortedMarks,
    
    // 流程控制
    startMarkFlow,
    cancelMarkFlow,
    resetMarkFlow,
    
    // 数据处理
    createMarkData,
    handlePointsSelected,
    
    // 弹窗管理
    openEditDialog,
    closeEditDialog,
    
    // 表格操作
    saveMarkToTable,
    updatePendingMark,
    removePendingMark,
    submitPendingMarks,
    getPendingMarks
  }
}

export default useStayMarker