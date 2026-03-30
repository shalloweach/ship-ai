/**
 * 🔍 useTimeSlider - 时间/索引查询纯逻辑组合式函数
 * 功能：四参数输入网格联动 + 操作按钮组功能实现
 * 
 * @param {Object} mapOp - 地图操作对象 { renderTrajectory, fitBounds, ... }
 * @param {string} mmsi - 船舶 MMSI 标识
 * @param {number} totalCount - 轨迹点总数
 * @returns {Object} 响应式状态 + 方法 + 工具函数
 */

import { ref, computed, watch, onMounted } from 'vue'

export const clamp = (value, min, max) => {
  if (min != null) value = Math.max(min, value)
  if (max != null) value = Math.min(max, value)
  return value
}

import { getTrajectoryByIndex, getTrajectoryByTime } from '@/api/shipApi'

export function useTimeSlider(mapOp, mmsi, totalCount) {
  
  // ========== 🔧 配置常量（避免与 Vue props 命名冲突） ==========
  const CONFIG = {
    TIME_STEPS: [1, 5, 10, 30, 60, 120],
    DEFAULT_TIME_STEP: 10,
    INDEX_STEPS: [1, 10, 50, 100, 500],
    DEFAULT_INDEX_STEP: 10,
    MIN_TIME_INTERVAL_MS: 1000,  // 最小时间间隔 1 秒（毫秒）
    GLOBAL_MIN_TS: 1672502400,   // 2023-01-01 00:00:00 UTC（秒）
    GLOBAL_MAX_TS: 1704038399,   // 2023-12-31 23:59:59 UTC（秒）
    DEFAULT_SHOW_POINTS: 1000    // 重置时默认展示的点数
  }

  // ========== 🔧 响应式状态定义 ==========
  
  // 时间范围（内部统一使用毫秒）
  const startTimestamp = ref(null)  // 毫秒
  const endTimestamp = ref(null)    // 毫秒
  
  // 索引范围
  const startIndex = ref(0)
  const endIndex = ref(1)
  
  // 调整步长
  const timeStep = ref(CONFIG.DEFAULT_TIME_STEP)      // 分钟
  const indexStep = ref(CONFIG.DEFAULT_INDEX_STEP)    // 点数
  
  // UI 状态
  const isEditingIndex = ref({ start: false, end: false })
  const loading = ref(false)
  const error = ref(null)
  
  // 查询结果
  const currentPoints = ref([])
  const currentPointsCount = ref(0)

  // ========== 🔧 计算属性 ==========
  
  const globalMinTs = computed(() => toMilliseconds(CONFIG.GLOBAL_MIN_TS))
  const globalMaxTs = computed(() => toMilliseconds(CONFIG.GLOBAL_MAX_TS))
  const globalMinIdx = computed(() => 0)
  const globalMaxIdx = computed(() => Math.max(0, (totalCount ?? 0) - 1))

  // ========== 🔧 边界校验函数 ==========
  
  const clampTimeRange = () => {
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    
    // 初始化默认值
    if (startTimestamp.value == null) {
      startTimestamp.value = minTs
    }
    if (endTimestamp.value == null) {
      endTimestamp.value = Math.min(maxTs, startTimestamp.value + 3600 * 1000) // 默认 1 小时
    }
    
    // 限制在合法范围内
    startTimestamp.value = clamp(startTimestamp.value, minTs, maxTs)
    endTimestamp.value = clamp(endTimestamp.value, minTs, maxTs)
    
    // 确保 start < end（至少差 1 秒）
    if (endTimestamp.value - startTimestamp.value < CONFIG.MIN_TIME_INTERVAL_MS) {
      endTimestamp.value = startTimestamp.value + CONFIG.MIN_TIME_INTERVAL_MS
    }
  }

  const clampIndexRange = () => {
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    // 初始化默认值
    if (startIndex.value == null || startIndex.value < minIdx) {
      startIndex.value = minIdx
    }
    if (endIndex.value == null || endIndex.value > maxIdx) {
      endIndex.value = Math.min(maxIdx, startIndex.value + CONFIG.DEFAULT_SHOW_POINTS)
    }
    
    // 限制在合法范围内
    startIndex.value = clamp(startIndex.value, minIdx, maxIdx)
    endIndex.value = clamp(endIndex.value, minIdx, maxIdx)
    
    // 确保 start < end
    if (endIndex.value <= startIndex.value) {
      endIndex.value = Math.min(maxIdx, startIndex.value + 1)
    }
  }

  // ========== 🔗 联动同步函数 ==========
  
  /**
   * 根据时间范围同步计算索引范围
   * 算法：线性映射 timeSpan → idxSpan
   */
  const syncIndexFromTime = () => {
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    // 边界检查
    if (maxTs <= minTs || maxIdx <= minIdx) return
    if (startTimestamp.value == null || endTimestamp.value == null) return
    
    const timeSpan = maxTs - minTs
    const idxSpan = maxIdx - minIdx
    
    // 线性映射计算比例
    const ratioStart = (startTimestamp.value - minTs) / timeSpan
    const ratioEnd = (endTimestamp.value - minTs) / timeSpan
    
    // 更新索引（保持至少间隔 1）
    startIndex.value = clamp(Math.round(minIdx + ratioStart * idxSpan), minIdx, maxIdx - 1)
    endIndex.value = clamp(
      Math.round(minIdx + ratioEnd * idxSpan), 
      startIndex.value + 1, 
      maxIdx
    )
  }

  /**
   * 根据索引范围同步计算时间范围
   * 算法：线性映射 idxSpan → timeSpan
   */
  const syncTimeFromIndex = () => {
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    // 边界检查
    if (maxTs <= minTs || maxIdx <= minIdx) return
    if (startIndex.value == null || endIndex.value == null) return
    
    const timeSpan = maxTs - minTs
    const idxSpan = maxIdx - minIdx
    
    // 线性映射计算比例
    const ratioStart = (startIndex.value - minIdx) / idxSpan
    const ratioEnd = (endIndex.value - minIdx) / idxSpan
    
    // 更新时间（保持至少间隔 1 秒）
    const newStart = clamp(Math.round(minTs + ratioStart * timeSpan), minTs, maxTs)
    const newEnd = clamp(
      Math.round(minTs + ratioEnd * timeSpan),
      newStart + CONFIG.MIN_TIME_INTERVAL_MS,
      maxTs
    )
    
    startTimestamp.value = newStart
    endTimestamp.value = newEnd
  }

  // ========== 🎛️ 调整函数 ==========
  
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60 * 1000  // 分钟 → 毫秒
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    
    if (which === 'start' && startTimestamp.value != null) {
      const newStart = startTimestamp.value + delta
      const limit = (endTimestamp.value || maxTs) - CONFIG.MIN_TIME_INTERVAL_MS
      startTimestamp.value = clamp(newStart, minTs, limit)
    } else if (which === 'end' && endTimestamp.value != null) {
      const newEnd = endTimestamp.value + delta
      const limit = (startTimestamp.value || minTs) + CONFIG.MIN_TIME_INTERVAL_MS
      endTimestamp.value = clamp(newEnd, limit, maxTs)
    }
    
    // 时间变更 → 同步更新索引
    syncIndexFromTime()
  }

  const adjustIndex = (which, step) => {
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(startIndex.value + step, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(endIndex.value + step, startIndex.value + 1, maxIdx)
    }
    
    // 索引变更 → 同步更新时间
    syncTimeFromIndex()
  }

  const updateIndex = (which, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(num, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(num, startIndex.value + 1, maxIdx)
    }
    
    // 索引变更 → 同步更新时间
    syncTimeFromIndex()
    
    // 退出编辑模式
    isEditingIndex.value[which] = false
  }

  // ========== 📤 核心查询函数 ==========
  
  /**
   * ✅ 执行轨迹查询（统一使用时间范围，因时间↔索引已联动）
   */
  const emitQuery = async () => {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      // 确保时间范围有效
      clampTimeRange()
      
      // 调用时间范围查询接口（内部已做时间↔索引转换）
      const result = await getTrajectoryByTime(
        mmsi, 
        toSeconds(startTimestamp.value), 
        toSeconds(endTimestamp.value)
      )
      
      if (result) {
        // 兼容不同返回格式
        const points = Array.isArray(result) 
          ? result 
          : (result.points || result.data || result.trajectory || [])
        
        currentPoints.value = points
        currentPointsCount.value = points.length

        // 调用地图渲染（安全调用）
        if (mapOp?.renderTrajectory) {
          mapOp.renderTrajectory(points, {
            showPoints: true,
            fitBounds: true,
            lineStyle: { color: '#8b5cf6', width: 2 }
          })
        }
        
        return { success: true, points, count: points.length }
      }
      
      return { success: false, message: '无返回数据' }
      
    } catch (err) {
      console.error('🚨 轨迹查询失败:', err)
      error.value = err.message || '轨迹加载失败，请检查网络或参数'
      return { success: false, error: err }
      
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ 重置：恢复到默认索引范围 0 ~ min(1000, totalCount-1)
   */
  const resetToDefault = async () => {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      const maxIdx = globalMaxIdx.value
      const defaultEnd = Math.min(CONFIG.DEFAULT_SHOW_POINTS, maxIdx)
      
      // 更新状态
      startIndex.value = 0
      endIndex.value = defaultEnd
      syncTimeFromIndex()  // 同步更新时间范围
      
      // 执行查询
      const result = await getTrajectoryByIndex(mmsi, 0, defaultEnd)
      
      if (result) {
        const points = Array.isArray(result) 
          ? result 
          : (result.points || result.data || result.trajectory || [])
        
        currentPoints.value = points
        currentPointsCount.value = points.length

        if (mapOp?.renderTrajectory) {
          mapOp.renderTrajectory(points, {
            showPoints: true,
            fitBounds: true,
            lineStyle: { color: '#8b5cf6', width: 2 }
          })
        }
        
        return { success: true, points, count: points.length }
      }
      
      return { success: false, message: '无返回数据' }
      
    } catch (err) {
      console.error('🚨 重置查询失败:', err)
      error.value = err.message || '重置失败'
      return { success: false, error: err }
      
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ 全量：展示 0 ~ totalCount-1 全部数据
   */
  const expandFull = async () => {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      const maxIdx = globalMaxIdx.value
      
      // 更新状态
      startIndex.value = 0
      endIndex.value = maxIdx
      syncTimeFromIndex()  // 同步更新时间范围
      
      // 执行查询
      const result = await getTrajectoryByIndex(mmsi, 0, maxIdx)
      
      if (result) {
        const points = Array.isArray(result) 
          ? result 
          : (result.points || result.data || result.trajectory || [])
        
        currentPoints.value = points
        currentPointsCount.value = points.length

        if (mapOp?.renderTrajectory) {
          mapOp.renderTrajectory(points, {
            showPoints: true,
            fitBounds: true,
            lineStyle: { color: '#8b5cf6', width: 2 }
          })
        }
        
        return { success: true, points, count: points.length }
      }
      
      return { success: false, message: '无返回数据' }
      
    } catch (err) {
      console.error('🚨 全量查询失败:', err)
      error.value = err.message || '全量加载失败'
      return { success: false, error: err }
      
    } finally {
      loading.value = false
    }
  }

  // ========== 🎨 格式化辅助函数 ==========
  
  const formatTimestamp = (ts) => {
    if (!ts || ts < CONFIG.GLOBAL_MIN_TS * 1000) return '--'
    const date = new Date(ts)
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    })
  }

  const formatLocalDate = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    })
  }

  const formatTimeOnly = (ts) => {
    if (!ts) return '--:--:--'
    return new Date(ts).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    })
  }

  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '0 秒'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}天${hours % 24}小时`
    if (hours > 0) return `${hours}小时${minutes % 60}分`
    if (minutes > 0) return `${minutes}分${seconds % 60}秒`
    return `${seconds}秒`
  }

  const formatRange = (val) => {
    // 如果是时间戳（> 10^12），格式化为时间；否则直接返回数字
    if (typeof val === 'number' && val > 1e12) {
      return formatTimestamp(val)
    }
    return val
  }

  // ========== 👂 初始化 & 监听 ==========
  
  // 初始化：设置默认时间/索引范围
  onMounted(() => {
    clampTimeRange()
    clampIndexRange()
    // 可选：初始化时自动查询
    // emitQuery()
  })

  // 监听 totalCount 变化，更新索引边界
  watch(() => totalCount, (newVal) => {
    clampIndexRange()
    // 如果当前 endIndex 超出新边界，同步更新时间
    if (endIndex.value > globalMaxIdx.value) {
      syncTimeFromIndex()
    }
  })

  // ========== ✅ 暴露给模板的内容 ==========
  
  return {
    // 🔹 响应式状态（供模板绑定）
    startTimestamp,
    endTimestamp,
    startIndex,
    endIndex,
    timeStep,
    indexStep,
    isEditingIndex,
    loading,
    error,
    currentPoints,
    currentPointsCount,
    
    // 🔹 配置常量（供模板 v-for 使用）
    TIME_STEPS: CONFIG.TIME_STEPS,
    INDEX_STEPS: CONFIG.INDEX_STEPS,
    
    // 🔹 计算方法（供模板调用）
    adjustTime,
    adjustIndex,
    updateIndex,
    emitQuery,
    resetToDefault,
    expandFull,
    syncIndexFromTime,
    syncTimeFromIndex,
    
    // 🔹 格式化函数（供模板显示）
    formatTimestamp,
    formatLocalDate,
    formatTimeOnly,
    formatDuration,
    formatRange,
    
    // 🔹 计算属性（供模板使用）
    globalMinIdx,
    globalMaxIdx,
    globalMinTs,
    globalMaxTs
  }
}