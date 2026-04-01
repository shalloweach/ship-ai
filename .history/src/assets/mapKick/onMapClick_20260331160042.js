// ========== 🎯 事件处理 ==========

// 🔧 地图点击事件 - 核心入口
const onMapClick = async (e) => {
  // 1️⃣ 标记流程中：选择起止点
  if (markFlow.value.mode === 'selecting-start') {
    const point = await pickPointFromMap(e)
    if (point) {
      markFlow.value.startPoint = point
      markFlow.value.mode = 'selecting-end'
    }
    return
  }
  
  if (markFlow.value.mode === 'selecting-end') {
    const point = await pickPointFromMap(e)
    if (point && markFlow.value.startPoint) {
      markFlow.value.endPoint = point
      await handlePointsSelected(markFlow.value.startPoint, markFlow.value.endPoint)
    }
    return
  }
  
  // 2️⃣ 非标记流程：显示数据弹窗
  const point = await pickPointFromMap(e)
  if (point) {
    showDataPopup(point)
  }
}

// 🔧 从地图事件拾取轨迹点
const pickPointFromMap = async (mapEvent) => {
  // 尝试使用地图库的拾取方法
  if (mapOp?.pickPointAt) {
    return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
  }
  
  // 降级：附近点搜索（阈值 ~100米）
  const clicked = mapEvent.lnglat || mapEvent.latlng
  if (!clicked || !trajectoryPoints.value.length) return null
  
  const threshold = 0.001
  return trajectoryPoints.value.find(p => 
    Math.abs(p.lat - clicked.lat) < threshold && 
    Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
  )
}

// 🔧 两点选中后处理
const handlePointsSelected = async (start, end) => {
  // 确保时间顺序
  const startTs = start.timestamp || start.utc_time
  const endTs = end.timestamp || end.utc_time
  const [s, e] = startTs < endTs ? [start, end] : [end, start]
  
  // 🎨 高亮轨迹段
  await highlightSegment(s.idx, e.idx)
  
  // 📦 构建临时标记
  const tempMark = createMarkData(s, e)
  markFlow.value.tempMark = tempMark
  
  // 💬 打开编辑弹窗
  openEditDialog(tempMark, { isNew: true })
}

// 🔧 显示数据弹窗（含标记按钮）
const showDataPopup = (point) => {
  const content = buildPopupContent(point, {
    onMarkClick: (p) => {
      // 点击"创建停留标记"按钮
      markFlow.value.startPoint = p
      markFlow.value.mode = 'selecting-end'
      mapOp?.closePopup?.()
    },
    onNavigate: (pos) => {
      mapOp?.flyTo?.(pos.lon, pos.lat, 14)
    }
  })
  
  mapOp?.showPopup?.(point.lon, point.lat, content)
  
  // 绑定全局回调（供弹窗内脚本使用）
  window.__onMarkClick = (p) => { /* 已在 buildPopupContent 内处理 */ }
  window.__onNavigate = (pos) => { mapOp?.flyTo?.(pos.lon, pos.lat, 14) }
}

// 🔧 打开编辑弹窗
const openEditDialog = (markData, { isNew = false } = {}) => {
  editDialog.value = {
    visible: true,
    currentMark: { ...markData },
    isNew
  }
  markFlow.value.mode = 'editing'
}

// 🔧 关闭编辑弹窗
const closeEditDialog = () => {
  editDialog.value.visible = false
  editDialog.value.currentMark = null
  markFlow.value.mode = 'idle'
}

// 🔧 弹窗保存处理
const handleDialogSave = (updatedMark) => {
  if (editDialog.value.isNew) {
    // ➕ 新增
    pendingMarks.value.push({ ...updatedMark, status: 'draft' })
    // 按开始时间升序排序
    pendingMarks.value.sort((a, b) => a.startTime - b.startTime)
    
    // 🎨 地图绘制（如果支持）
    if (mapOp?.drawStayMarker) {
      mapOp.drawStayMarker(updatedMark)
    }
  } else {
    // ✏️ 更新
    const idx = pendingMarks.value.findIndex(m => m.id === updatedMark.id)
    if (idx >= 0) {
      pendingMarks.value[idx] = { ...updatedMark }
      pendingMarks.value.sort((a, b) => a.startTime - b.startTime)
    }
  }
  
  closeEditDialog()
  resetMarkFlow()
}

// 🔧 弹窗删除处理
const handleDialogDelete = (markId) => {
  const idx = pendingMarks.value.findIndex(m => m.id === markId)
  if (idx >= 0) {
    const removed = pendingMarks.value.splice(idx, 1)[0]
    if (mapOp?.removeStayMarker) {
      mapOp.removeStayMarker(removed)
    }
  }
  closeEditDialog()
  resetMarkFlow()
}

// 🔧 开始标记流程（从 MarkCard 触发）
const startMarkFlow = () => {
  markFlow.value.mode = 'selecting-start'
  markFlow.value.startPoint = null
  markFlow.value.endPoint = null
}

// 🔧 取消标记流程
const cancelMarkFlow = () => {
  clearHighlight()
  tempHighlight.value = []
  markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
  closeEditDialog()
}

// 🔧 重置标记流程
const resetMarkFlow = () => {
  markFlow.value.mode = 'idle'
  markFlow.value.startPoint = null
  markFlow.value.endPoint = null
  markFlow.value.tempMark = null
}
