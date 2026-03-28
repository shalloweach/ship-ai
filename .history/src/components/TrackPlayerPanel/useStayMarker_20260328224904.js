// src/components/TrackPlayerPanel/useStayMarker.js
import { ref, computed } from 'vue'
import { MARKER_CONFIG } from '../config'

export function useStayMarker(props, emit, deps) {
  const { submitStayMarks } = deps.api
  const { drawStayMarker, removeStayMarker, clearStayMarkers } = deps.map

  // ========== 标记状态 ==========
  const pendingMarks = ref([])
  const currentMark = ref(null)
  const markMode = ref('idle')  // idle | selecting-start | selecting-end | editing

  // ========== 计算属性 ==========
  const isMarking = computed(() => markMode.value !== 'idle')
  const canSaveMark = computed(() => 
    currentMark.value?.startTime && currentMark.value?.endTime && currentMark.value?.stayType
  )

  // ========== 标记流程 ==========
  const startMarking = (point, index) => {
    if (markMode.value !== 'idle') return
    markMode.value = 'selecting-start'
    currentMark.value = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi: props.mmsi,
      startPoint: point, startIndex: index, startTime: point?.timestamp,
      endPoint: null, endIndex: null, endTime: null,
      stayType: '靠泊', port: '', note: '',
      status: MARKER_CONFIG.STATUS.DRAFT
    }
    emit('mark-state', { mode: 'selecting-start', mark: currentMark.value })
  }

  const endMarking = (point, index) => {
    if (markMode.value !== 'selecting-start' || !currentMark.value) return
    currentMark.value = {
      ...currentMark.value,
      endPoint: point, endIndex: index, endTime: point?.timestamp
    }
    markMode.value = 'editing'
    emit('mark-state', { mode: 'selecting-end', mark: currentMark.value })
  }

  const updateMarkField = (field, value) => {
    if (!currentMark.value) return
    currentMark.value[field] = value
    emit('mark-update', { field, value, markId: currentMark.value.id })
  }

  const addPendingMark = () => {
    if (!canSaveMark.value) {
      emit('mark-error', { message: '请填写完整标记信息' })
      return false
    }
    // 去重
    if (pendingMarks.value.some(m => 
      m.startTime === currentMark.value.startTime && m.endTime === currentMark.value.endTime
    )) {
      emit('mark-error', { message: '该时间段已存在标记' })
      return false
    }
    pendingMarks.value.push({ ...currentMark.value })
    emit('mark-added', { mark: currentMark.value })
    resetMarkForm()
    return true
  }

  const removePendingMark = (id) => {
    const idx = pendingMarks.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      const removed = pendingMarks.value.splice(idx, 1)[0]
      emit('mark-removed', { id, mark: removed })
      return true
    }
    return false
  }

  const updatePendingMark = (id, field, value) => {
    const mark = pendingMarks.value.find(m => m.id === id)
    if (mark) {
      mark[field] = value
      emit('mark-updated', { id, field, value })
      return true
    }
    return false
  }

  const submitPendingMarks = async () => {
    if (pendingMarks.value.length === 0) {
      emit('submit-error', { message: '没有可提交的标记' })
      return { success: false, error: 'empty' }
    }
    
    emit('submit-start', { count: pendingMarks.value.length })
    
    try {
      const marksForApi = pendingMarks.value.map(m => ({
        mmsi: m.mmsi,
        startTime: m.startTime,
        endTime: m.endTime,
        stayType: m.stayType,
        port: m.port,
        note: m.note || ''
      }))
      
      const result = await submitStayMarks(marksForApi)
      
      // 更新状态
      pendingMarks.value.forEach(m => {
        m.status = MARKER_CONFIG.STATUS.SYNCED
        if (result?.ids) m.serverId = result.ids[m.id]
      })
      
      // 绘制到地图
      if (deps.map.isMapReady.value) {
        pendingMarks.value.forEach(m => {
          if (m.startPoint && m.endPoint) drawStayMarker(m)
        })
      }
      
      emit('marks-submitted', { count: pendingMarks.value.length, result })
      pendingMarks.value = []
      return { success: true, result }
      
    } catch (err) {
      console.error('❌ 提交标记失败:', err)
      emit('submit-error', { error: err })
      return { success: false, error: err }
    }
  }

  const cancelMarking = () => {
    resetMarkForm()
    emit('mark-state', { mode: 'idle', mark: null })
  }

  const resetMarkForm = () => {
    currentMark.value = null
    markMode.value = 'idle'
  }

  const clearMarks = () => {
    pendingMarks.value = []
    if (deps.map.isMapReady.value) clearStayMarkers()
    emit('marks-cleared')
  }

  const loadExistingMarks = async (mmsi) => {
    try {
      const result = await deps.api.fetchStayMarks?.(mmsi)
      if (result?.marks) {
        pendingMarks.value = result.marks.map(m => ({
          ...m,
          status: MARKER_CONFIG.STATUS.SYNCED,
          serverId: m.id
        }))
        // 绘制到地图
        if (deps.map.isMapReady.value) {
          pendingMarks.value.forEach(m => {
            if (m.startPoint && m.endPoint) drawStayMarker(m)
          })
        }
        emit('marks-loaded', { count: pendingMarks.value.length })
      }
    } catch (err) {
      console.warn('⚠️ 加载历史标记失败:', err)
    }
  }

  // ========== 工具函数 ==========
  const exportToCSV = () => {
    const headers = ['MMSI', '开始时间', '结束时间', '时长(秒)', '类型', '港口', '备注', '状态']
    const rows = pendingMarks.value.map(m => [
      m.mmsi,
      new Date(m.startTime * 1000).toLocaleString(),
      new Date(m.endTime * 1000).toLocaleString(),
      m.endTime - m.startTime,
      m.stayType,
      m.port,
      m.note || '',
      m.status
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stay_marks_${props.mmsi}_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    emit('marks-exported', { count: pendingMarks.value.length })
  }

  return {
    // 状态
    pendingMarks, currentMark, markMode, isMarking, canSaveMark,
    // 配置
    STAY_TYPES: MARKER_CONFIG.STAY_TYPES,
    DEFAULT_PORTS: MARKER_CONFIG.DEFAULT_PORTS,
    // 方法
    startMarking, endMarking, updateMarkField,
    addPendingMark, removePendingMark, updatePendingMark,
    submitPendingMarks, cancelMarking, resetMarkForm, clearMarks,
    loadExistingMarks, exportToCSV,
    // 工具
    getStayType: (type) => MARKER_CONFIG.STAY_TYPES.find(t => t.value === type),
    // 暴露
    expose: {
      startMarking, endMarking, addPendingMark, removePendingMark,
      submitPendingMarks, cancelMarking, clearMarks, exportToCSV,
      getPendingMarks: () => pendingMarks.value,
      getCurrentMark: () => currentMark.value
    }
  }
}