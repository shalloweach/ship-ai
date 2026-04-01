// src/components/MarkEditDialog/markTableManager.js
import { ref, computed } from 'vue'
// 🔹 引入原有的 markTable，实现数据共享
import { markTable } from '..MarkEditDialog/markFlow'

// ========== 📊 排序配置（本地管理） ==========
export const sortConfig = ref({
  key: 'startTime',   // 排序字段: 'startTime' | 'startIndex' | 'endTime'
  order: 'asc'        // 排序方向: 'asc' | 'desc'
})

// ========== ✨ 高亮状态（本地管理） ==========
export const highlightedMarkId = ref(null)

// ========== 🎯 核心操作函数 ==========

/**
 * 【需求A】自动填充MMSI并保存标记
 * @param {Object} mark - 标记数据（可不含mmsi）
 * @param {string} fallbackMmsi - 备选MMSI（来自父组件）
 * @returns {Object|null} 保存的记录或null
 */
export const saveMark = (mark, fallbackMmsi = '') => {
  // 校验必填字段
  if (!mark.stayType || !mark.port || !mark.status) {
    console.warn('⚠️ 缺少必填字段: stayType | port | status')
    return null
  }

  // 🎯 自动填充mmsi：优先使用mark自带，其次fallback，最后空字符串
  const mmsi = mark.mmsi || fallbackMmsi || ''

  const record = {
    id: mark.id || `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi,
    startTime: mark.startTime,
    endTime: mark.endTime,
    startIndex: mark.startIndex,
    endIndex: mark.endIndex,
    stayType: mark.stayType,
    port: mark.port,
    status: mark.status,
    note: mark.note || '',
    createdAt: Date.now()
  }

  // 🔹 新数据置顶（unshift），如需按时间排序可改用 push + sort
  markTable.value.unshift(record)
  return record
}

/**
 * 【需求B】获取排序后的标记列表（响应式计算）
 * @param {string} sortKey - 临时排序字段（可选，不修改全局配置）
 * @param {string} sortOrder - 临时排序方向（可选）
 * @returns {Array} 排序后的数组副本
 */
export const getSortedMarks = (sortKey, sortOrder) => {
  const key = sortKey || sortConfig.value.key
  const order = sortOrder || sortConfig.value.order
  const source = markTable.value
  
  // 创建副本避免直接修改原数组
  const sorted = [...source]
  
  sorted.sort((a, b) => {
    let valA = a[key]
    let valB = b[key]
    
    // 处理 null/undefined/空值
    if (valA == null || valA === '') valA = order === 'asc' ? -Infinity : Infinity
    if (valB == null || valB === '') valB = order === 'asc' ? -Infinity : Infinity
    
    // 数值/时间比较
    if (typeof valA === 'number' && typeof valB === 'number') {
      return order === 'asc' ? valA - valB : valB - valA
    }
    
    // 字符串比较
    const comparison = String(valA).localeCompare(String(valB), 'zh-CN')
    return order === 'asc' ? comparison : -comparison
  })
  
  return sorted
}

/**
 * 切换排序配置（供表头点击调用）
 * @param {string} key - 排序字段
 */
export const toggleSort = (key) => {
  if (sortConfig.value.key === key) {
    // 相同字段：切换方向
    sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc'
  } else {
    // 新字段：默认升序
    sortConfig.value.key = key
    sortConfig.value.order = 'asc'
  }
}

/**
 * 【需求C】提交数据到数据库（接口定义）
 * @param {Array} marks - 要提交的数组，默认提交全部
 * @param {Object} options - 扩展参数
 * @returns {Promise<Object>} API响应
 */
export const submitMarks = async (marks = null, options = {}) => {
  const dataToSubmit = marks || markTable.value
  
  if (dataToSubmit.length === 0) {
    return { success: false, code: 'EMPTY', message: '无数据可提交' }
  }

  try {
    // 🔹 真实项目替换为实际API调用
    // const response = await api.vesselMarks.batchCreate({
    //   mmsi: options.mmsi,
    //   marks: dataToSubmit.map(({ id, startTime, endTime, stayType, port, status, note, startIndex, endIndex }) => ({
    //     id, startTime, endTime, stayType, port, status, note, startIndex, endIndex
    //   }))
    // })
    
    // 🧪 模拟接口（开发用）
    const response = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          code: 'OK',
          message: `成功提交 ${dataToSubmit.length} 条记录`,
          data: { 
            submittedCount: dataToSubmit.length,
            timestamp: Date.now(),
            ids: dataToSubmit.map(m => m.id)
          }
        })
      }, options.mockDelay || 300)
    })
    
    return response
  } catch (error) {
    console.error('❌ 提交失败:', error)
    return { success: false, code: 'ERROR', error }
  }
}

/**
 * 【需求C】清空当前面板数据
 * @param {boolean} confirm - 是否需要用户确认
 * @returns {boolean} 是否执行了清空
 */
export const clearMarks = (confirm = true) => {
  if (confirm && markTable.value.length > 0) {
    if (!window.confirm('确定清空所有停留标记？此操作不可恢复。')) {
      return false
    }
  }
  
  markTable.value = []
  highlightedMarkId.value = null
  return true
}

/**
 * 【需求D】高亮显示某条记录（接口）
 * @param {string|number} id - 标记ID
 * @param {Object} options - 扩展选项
 * @returns {Object} 高亮状态信息
 */
export const highlightMark = (id, options = {}) => {
  const wasHighlighted = highlightedMarkId.value === id
  
  // 切换高亮：如果已高亮则取消，否则设置新的高亮
  highlightedMarkId.value = wasHighlighted ? null : id
  
  // 🔹 接口回调：通知外部同步地图/轨迹高亮
  if (options.onToggle) {
    options.onToggle(highlightedMarkId.value, id)
  }
  
  return {
    id,
    highlighted: highlightedMarkId.value === id,
    previous: wasHighlighted ? id : null
  }
}

/**
 * 【需求D】修改字段内容（接口，乐观更新）
 * @param {Object} payload - { id, field, value, oldValue? }
 * @param {Object} options - { onBeforeUpdate?, onAfterUpdate?, apiFn? }
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const updateMarkField = async ({ id, field, value }, options = {}) => {
  // 1️⃣ 查找目标记录
  const target = markTable.value.find(m => m.id === id)
  if (!target) {
    return { success: false, message: '记录未找到' }
  }
  if (!(field in target) || ['id', 'mmsi', 'createdAt'].includes(field)) {
    return { success: false, message: '该字段不可编辑' }
  }
  
  // 2️⃣ 保存旧值（用于回滚）
  const oldValue = target[field]
  
  // 3️⃣ 前置钩子（可取消更新）
  if (options.onBeforeUpdate) {
    const shouldContinue = await options.onBeforeUpdate({ id, field, value, oldValue })
    if (!shouldContinue) return { success: false, reason: 'cancelled' }
  }
  
  // 4️⃣ 乐观更新本地数据
  target[field] = value
  
  try {
    // 5️⃣ 🔹 调用后端同步（占位接口）
    if (options.apiFn) {
      await options.apiFn({ id, field, value })
    }
    // 或默认模拟：
    // await new Promise(r => setTimeout(r, 100))
    
    // 6️⃣ 后置钩子
    if (options.onAfterUpdate) {
      options.onAfterUpdate({ id, field, value, oldValue })
    }
    
    return { success: true,  { id, field, value, oldValue } }
    
  } catch (error) {
    // 7️⃣ 失败回滚
    target[field] = oldValue
    console.error(`❌ 更新字段 "${field}" 失败:`, error)
    return { success: false, error,  { id, field, value: oldValue } }
  }
}

/**
 * 删除单条标记
 * @param {string|number} id - 标记ID
 * @param {boolean} confirm - 是否确认
 * @returns {boolean} 是否删除成功
 */
export const deleteMark = (id, confirm = true) => {
  const index = markTable.value.findIndex(m => m.id === id)
  if (index === -1) return false
  
  if (confirm && !window.confirm('确定删除此条标记？')) {
    return false
  }
  
  markTable.value.splice(index, 1)
  
  // 同步清理高亮
  if (highlightedMarkId.value === id) {
    highlightedMarkId.value = null
  }
  
  // 🔹 可在此调用删除接口: api.vesselMarks.delete(id)
  return true
}

/**
 * 批量删除标记
 * @param {Array<string|number>} ids - ID数组
 * @returns {Object} { deleted: number, failed: Array }
 */
export const batchDeleteMarks = (ids) => {
  const result = { deleted: 0, failed: [] }
  
  ids.forEach(id => {
    if (deleteMark(id, false)) {  // 批量时不二次确认
      result.deleted++
    } else {
      result.failed.push(id)
    }
  })
  
  return result
}

// ========== 🔍 查询/统计辅助函数 ==========

/**
 * 按MMSI筛选标记
 */
export const getMarksByMmsi = (mmsi) => {
  if (!mmsi) return markTable.value
  const target = mmsi.toString()
  return markTable.value.filter(m => m.mmsi?.toString() === target)
}

/**
 * 按时间范围筛选
 */
export const getMarksInTimeRange = (startTs, endTs) => {
  return markTable.value.filter(m => {
    const mStart = m.startTime, mEnd = m.endTime
    return mStart <= endTs && mEnd >= startTs
  })
}

/**
 * 统计信息
 */
export const getMarkStats = () => {
  const total = markTable.value.length
  const byType = {}
  const byPort = {}
  
  markTable.value.forEach(m => {
    byType[m.stayType] = (byType[m.stayType] || 0) + 1
    if (m.port) byPort[m.port] = (byPort[m.port] || 0) + 1
  })
  
  return { total, byType, byPort }
}