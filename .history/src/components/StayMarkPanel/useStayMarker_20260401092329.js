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