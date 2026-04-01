// src/assets/mapKick/useMarkFlow.js
/**
 * 🏷️ 标记流程状态管理
 * 提供 startMarkFlow 函数和 markFlow 响应式状态
 * 供 trajectoryLayer.js 等模块导入使用
 */

import { ref } from 'vue'

// ========== 响应式状态 ==========
export const markFlow = ref({
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,          // { idx, lat, lon, utc_time, ... }
  endPoint: null,
  tempMark: null
})

// ========== 待提交表格 ==========
export const pendingMarks = ref([])

// ========== 核心函数 ==========

/**
 * 开始标记流程
 * @param {Object|null} point - 起点数据，null 表示从地图选择起点
 * @returns {Object} 更新后的 markFlow 状态
 */
export const startMarkFlow = (point = null) => {
  markFlow.value = {
    mode: point ? 'selecting-end' : 'selecting-start',
    startPoint: point,
    endPoint: null,
    tempMark: null
  }
  return markFlow.value
}

/**
 * 取消标记流程
 */
export const cancelMarkFlow = () => {
  markFlow.value = {
    mode: 'idle',
    startPoint: null,
    endPoint: null,
    tempMark: null
  }
}

/**
 * 重置标记流程（保留数据）
 */
export const resetMarkFlow = () => {
  markFlow.value.mode = 'idle'
  markFlow.value.startPoint = null
  markFlow.value.endPoint = null
  markFlow.value.tempMark = null
}

/**
 * 创建标记数据对象
 * @param {Object} startPoint - 起点
 * @param {Object} endPoint - 终点
 * @returns {Object} 标记数据
 */
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
    status: 'draft',
    createdAt: Date.now()
  }
}

/**
 * 保存标记到表格（按开始时间升序排序）
 * @param {Object} markData - 标记数据
 * @param {Object} options - 选项
 * @returns {Object} { success, mark, error }
 */
export const saveMarkToTable = (markData, { mmsi = '' } = {}) => {
  const mark = { ...markData, mmsi, status: 'draft' }
  
  // 去重检查
  const exists = pendingMarks.value.some(m => 
    m.startTime === mark.startTime && m.endTime === mark.endTime
  )
  if (exists) {
    return { success: false, error: 'duplicate', message: '该时间段已存在标记' }
  }
  
  pendingMarks.value.push(mark)
  // 🔥 按开始时间升序排序
  pendingMarks.value.sort((a, b) => a.startTime - b.startTime)
  
  return { success: true, mark }
}

/**
 * 更新表格中的标记
 */
export const updatePendingMark = (id, field, value) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) {
    mark[field] = value
    return true
  }
  return false
}

/**
 * 删除表格中的标记
 */
export const removePendingMark = (id) => {
  const idx = pendingMarks.value.findIndex(m => m.id === id)
  if (idx >= 0) {
    return pendingMarks.value.splice(idx, 1)[0]
  }
  return null
}

/**
 * 提交所有标记到后端
 * @param {Function} onSubmit - 后端提交函数
 * @returns {Object} { success, result, error }
 */
export const submitPendingMarks = async (onSubmit) => {
  if (!onSubmit || pendingMarks.value.length === 0) {
    return { success: false, error: 'empty', message: '没有可提交的标记' }
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
    return { success: false, error: err, message: err.message }
  }
}

/**
 * 获取排序后的标记列表
 */
export const getSortedMarks = () => {
  return [...pendingMarks.value].sort((a, b) => a.startTime - b.startTime)
}

/**
 * 清空所有标记
 */
export const clearAllMarks = () => {
  pendingMarks.value = []
}

// ========== 默认导出 ==========
export default {
  markFlow,
  pendingMarks,
  startMarkFlow,
  cancelMarkFlow,
  resetMarkFlow,
  createMarkData,
  saveMarkToTable,
  updatePendingMark,
  removePendingMark,
  submitPendingMarks,
  getSortedMarks,
  clearAllMarks
}


// 📦 构建编辑弹窗内容 - ✅ 独立组件更安全
export const buildMarkEditContent = (mark) => {
    return `
      <div class="mark-edit-wrapper">
        <div class="mark-edit-header">
          <span>🏷️ 编辑停留标记</span>
          <button id="mark-edit-close" class="mark-edit-close">✕</button>
        </div>
        <div class="mark-edit-body">
          <div class="mark-edit-field">
            <label>时间范围</label>
            <div class="mark-edit-time">${formatTime(mark.startTime)} → ${formatTime(mark.endTime)}</div>
          </div>
          <div class="mark-edit-field">
            <label>停留类型</label>
            <select id="mark-edit-type" class="mark-edit-select">
              <option value="靠泊" ${mark.stayType === '靠泊' ? 'selected' : ''}>靠泊</option>
              <option value="锚泊" ${mark.stayType === '锚泊' ? 'selected' : ''}>锚泊</option>
              <option value="作业" ${mark.stayType === '作业' ? 'selected' : ''}>作业</option>
              <option value="待泊" ${mark.stayType === '待泊' ? 'selected' : ''}>待泊</option>
              <option value="其他" ${mark.stayType === '其他' ? 'selected' : ''}>其他</option>
            </select>
          </div>
          <div class="mark-edit-field">
            <label>港口</label>
            <input id="mark-edit-port" type="text" value="${mark.port || ''}" maxlength="20" placeholder="请输入港口"/>
          </div>
          <div class="mark-edit-field">
            <label>备注</label>
            <textarea id="mark-edit-note" maxlength="100" placeholder="可选说明">${mark.note || ''}</textarea>
          </div>
        </div>
        <div class="mark-edit-footer">
          <button id="mark-edit-delete" class="mark-edit-btn delete">🗑️ 删除</button>
          <button id="mark-edit-cancel" class="mark-edit-btn">取消</button>
          <button id="mark-edit-save" class="mark-edit-btn primary">✅ 保存</button>
        </div>
      </div>
    `
  }
  