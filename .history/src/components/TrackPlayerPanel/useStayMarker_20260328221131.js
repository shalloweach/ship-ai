
  // 开始标记：选中起点
  const startMarking = (point, index) => {
    if (markMode.value !== 'idle') return
    
    markMode.value = 'selecting-start'
    currentMark.value = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi: mmsi.value,
      startPoint: point,
      startIndex: index,
      startTime: point?.timestamp,
      endPoint: null,
      endIndex: null,
      endTime: null,
      stayType: '靠泊',  // 默认
      port: '',
      note: '',
      status: 'draft'
    }
    
    emit('mark-state', { mode: 'selecting-start', mark: currentMark.value })
  }
  
  // 结束标记：选中终点
  const endMarking = (point, index) => {
    if (markMode.value !== 'selecting-start' || !currentMark.value) return
    
    currentMark.value = {
      ...currentMark.value,
      endPoint: point,
      endIndex: index,
      endTime: point?.timestamp
    }
    
    markMode.value = 'editing'
    emit('mark-state', { mode: 'selecting-end', mark: currentMark.value })
  }
  
  // 更新标记字段
  const updateMarkField = (field, value) => {
    if (!currentMark.value) return
    currentMark.value[field] = value
    emit('mark-update', { field, value })
  }
  
  // 添加到待提交列表
  const addPendingMark = () => {
    if (!currentMark.value?.startTime || !currentMark.value?.endTime) {
      error.value = '请选择起始和结束点'
      return
    }
    
    // 去重：相同时间范围的标记
    const exists = pendingMarks.value.some(m => 
      m.startTime === currentMark.value.startTime && 
      m.endTime === currentMark.value.endTime
    )
    
    if (!exists) {
      pendingMarks.value.push({ ...currentMark.value })
      emit('mark-added', { mark: currentMark.value })
    }
    
    resetMarkForm()
  }
  
  // 从待提交列表移除
  const removePendingMark = (id) => {
    const idx = pendingMarks.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      const removed = pendingMarks.value.splice(idx, 1)[0]
      emit('mark-removed', { id, mark: removed })
      return true
    }
    return false
  }
  
  // 批量提交到后端
  const submitPendingMarks = async () => {
    if (pendingMarks.value.length === 0) {
      error.value = '没有可提交的标记'
      return
    }
    
    loading.value = true
    
    try {
      // 转换格式：前端 -> 后端
      const marksForApi = pendingMarks.value.map(m => ({
        mmsi: m.mmsi,
        startTime: m.startTime,
        endTime: m.endTime,
        stayType: m.stayType,
        port: m.port,
        note: m.note  // 可选
      }))
      
      const result = await submitStayMarks(marksForApi)
      
      // 更新状态：标记为已提交
      pendingMarks.value.forEach(m => {
        m.status = 'synced'
        m.serverId = result?.ids?.[m.id] // 如果后端返回新 ID
      })
      
      // 在地图上绘制
      if (isMapReady.value) {
        pendingMarks.value.forEach(m => {
          if (m.startPoint && m.endPoint) {
            drawStayMarker(m)
          }
        })
      }
      
      emit('marks-submitted', { count: pendingMarks.value.length, result })
      
      // 清空待提交列表
      pendingMarks.value = []
      
      return { success: true, result }
      
    } catch (err) {
      console.error('❌ 提交标记失败:', err)
      error.value = err.message || '提交失败'
      emit('submit-error', { error: err })
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }
  
  // 重置标记表单
  const resetMarkForm = () => {
    currentMark.value = null
    markMode.value = 'idle'
  }
  
  // 取消当前标记
  const cancelMarking = () => {
    resetMarkForm()
    emit('mark-state', { mode: 'idle', mark: null })
  }

  // ========== 🔄 工具 & 清理 ==========
  
  // 清空轨迹
  const clearTrajectory = () => {
    allPoints.value = []
    displayedPoints.value = []
    currentIndex.value = 0
    nextBatchStart.value = null
    pause()
    if (isMapReady.value && layers.value.trajectory) {
      map.value.removeLayer(layers.value.trajectory)
    }
  }
  
  // 清空标记
  const clearMarks = () => {
    pendingMarks.value = []
    if (isMapReady.value) {
      clearStayMarkers()
    }
  }
  
  // 导出标记为表格数据
  const exportMarksTable = () => {
    return pendingMarks.value.map(m => ({
      ID: m.id,
      MMSI: m.mmsi,
      开始时间: formatTime(m.startTime),
      结束时间: formatTime(m.endTime),
      时长: formatDuration(m.endTime - m.startTime),
      类型: m.stayType,
      港口: m.port,
      备注: m.note,
      状态: m.status
    }))
  }

  // 生命周期清理
  onUnmounted(() => {
    pause()
    clearTrajectory()
    clearMarks()
  })