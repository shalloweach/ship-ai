// src/components/StayMarkPanel/markTableManager.js
import { ref } from 'vue'
// ✅ 使用 @ 别名避免路径错误
import { markTable } from '@/components/MarkEditDialog/markFlow'

// ========== 📊 排序配置 ==========
export const sortConfig = ref({
  key: 'startTime',   // 'startTime' | 'startIndex' | 'endTime'
  order: 'asc'        // 'asc' | 'desc'
})

// ========== ✨ 高亮状态 ==========
export const highlightedMarkId = ref(null)

// ========== 🎯 核心操作函数 ==========

// 提交数据
export const handleSubmit = async () => {
  try {
    const result = await submitMarks(null, { mmsi: props.mmsi })
    if (result.success) {
      emit('submit-success', result)
      clearMarks(false)  // ✅ 提交后静默清空
    } else {
      emit('submit-error', result)
    }
  } catch (e) {
    emit('submit-error', e)
  }
}

/**
 * 提交数据到数据库（接口定义）
 */
export const submitMarks = async (marks = null, options = {}) => {
  const dataToSubmit = marks || markTable.value
  
  if (dataToSubmit.length === 0) {
    return { success: false, code: 'EMPTY', message: '无数据可提交' }
  }

  try {
    // 🔹 真实项目替换为实际API
    // const response = await api.vesselMarks.batchCreate({ ... })
    
    // 🧪 模拟接口
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
    return { success: false, code: 'ERROR', error: error.message }
  }
}

/**
 * 保存标记（自动填充mmsi）
 */
export const saveMark = (mark, fallbackMmsi = '') => {
  if (!mark.stayType || !mark.port || !mark.status) {
    console.warn('⚠️ 缺少必填字段: stayType | port | status')
    return null
  }

  const record = {
    id: mark.id || `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: mark.mmsi || fallbackMmsi || '',
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

  markTable.value.unshift(record)
  return record
}

/**
 * 获取排序后的标记列表
 */
export const getSortedMarks = (sortKey, sortOrder) => {
  const key = sortKey || sortConfig.value.key
  const order = sortOrder || sortConfig.value.order
  const source = markTable.value
  
  return [...source].sort((a, b) => {
    let valA = a[key]
    let valB = b[key]
    
    if (valA == null || valA === '') valA = order === 'asc' ? -Infinity : Infinity
    if (valB == null || valB === '') valB = order === 'asc' ? -Infinity : Infinity
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return order === 'asc' ? valA - valB : valB - valA
    }
    
    const comparison = String(valA).localeCompare(String(valB), 'zh-CN')
    return order === 'asc' ? comparison : -comparison
  })
}

/**
 * 切换排序配置
 */
export const toggleSort = (key) => {
  if (sortConfig.value.key === key) {
    sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc'
  } else {
    sortConfig.value.key = key
    sortConfig.value.order = 'asc'
  }
}



/**
 * 清空面板数据
 */
export const clearMarks = (confirm = true) => {
  if (confirm && markTable.value.length > 0) {
    if (!window.confirm('确定清空所有停留标记？')) {
      return false
    }
  }
  markTable.value = []
  highlightedMarkId.value = null
  return true
}

/**
 * 高亮显示某条记录（接口）
 */
export const highlightMark = (id, options = {}) => {
  const wasHighlighted = highlightedMarkId.value === id
  highlightedMarkId.value = wasHighlighted ? null : id
  
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
 * 修改字段内容（接口，乐观更新）✅ 语法已修正
 */
export const updateMarkField = async ({ id, field, value }, options = {}) => {
  const target = markTable.value.find(m => m.id === id)
  if (!target) {
    return { success: false, message: '记录未找到' }
  }
  if (!(field in target) || ['id', 'mmsi', 'createdAt'].includes(field)) {
    return { success: false, message: '该字段不可编辑' }
  }
  
  const oldValue = target[field]
  
  if (options.onBeforeUpdate) {
    const shouldContinue = await options.onBeforeUpdate({ id, field, value, oldValue })
    if (!shouldContinue) return { success: false, reason: 'cancelled' }
  }
  
  // 乐观更新
  target[field] = value
  
  try {
    if (options.apiFn) {
      await options.apiFn({ id, field, value })
    }
    
    if (options.onAfterUpdate) {
      options.onAfterUpdate({ id, field, value, oldValue })
    }
    
    // ✅ 修正：添加 data: 键
    return { 
      success: true, 
      data: { id, field, value, oldValue } 
    }
    
  } catch (error) {
    // 失败回滚
    target[field] = oldValue
    console.error(`❌ 更新字段 "${field}" 失败:`, error)
    // ✅ 修正：添加 data: 键
    return { 
      success: false, 
      error: error.message, 
      data: { id, field, value: oldValue } 
    }
  }
}

/**
 * 删除单条标记
 */
export const deleteMark = (id, confirm = true) => {
  const index = markTable.value.findIndex(m => m.id === id)
  if (index === -1) return false
  
  if (confirm && !window.confirm('确定删除此条标记？')) {
    return false
  }
  
  markTable.value.splice(index, 1)
  
  if (highlightedMarkId.value === id) {
    highlightedMarkId.value = null
  }
  
  return true
}

/**
 * 批量删除
 */
export const batchDeleteMarks = (ids) => {
  const result = { deleted: 0, failed: [] }
  ids.forEach(id => {
    if (deleteMark(id, false)) {
      result.deleted++
    } else {
      result.failed.push(id)
    }
  })
  return result
}

// ========== 🔍 辅助函数 ==========

export const getMarksByMmsi = (mmsi) => {
  if (!mmsi) return markTable.value
  const target = mmsi.toString()
  return markTable.value.filter(m => m.mmsi?.toString() === target)
}

export const getMarksInTimeRange = (startTs, endTs) => {
  return markTable.value.filter(m => m.startTime <= endTs && m.endTime >= startTs)
}

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

export { markTable } from '@/components/MarkEditDialog/markFlow'