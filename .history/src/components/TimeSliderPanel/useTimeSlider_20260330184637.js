/**
 * 🔍 useTimeSlider - 时间/索引查询纯逻辑组合式函数（秒级时间戳版）
 * 
 * 核心特性：
 * - 时间戳单位：秒（非毫秒）
 * - 联动时机：查询成功后同步，非输入时联动
 * - 时间可编辑：支持时间戳/日期字符串输入
 * - 双接口路由：根据最后修改源调用 byTime 或 byIndex
 * 
 * @param {Object} mapOp - 地图操作对象 { renderTrajectory, fitBounds, ... }
 * @param {string} mmsi - 船舶 MMSI 标识
 * @param {number} totalCount - 轨迹点总数
 * @returns {Object} 响应式状态 + 方法 + 工具函数
 */

import { ref, computed, watch, onMounted } from 'vue'
import { getTrajectoryByIndex, getTrajectoryByTime } from '@/api/shipApi'

// 工具：数值钳制
export const clamp = (value, min, max) => {
  if (min != null) value = Math.max(min, value)
  if (max != null) value = Math.min(max, value)
  return value
}

// 工具：秒级时间戳 → Date 对象
const toDate = (tsSeconds) => new Date(tsSeconds * 1000)

// 工具：解析时间输入（支持秒级时间戳 或 日期字符串）
const parseTimeInput = (input) => {
  if (typeof input === 'number' && input > 1e9 && input < 2e10) {
    return Math.floor(input) // 已是秒级时间戳
  }
  if (typeof input === 'string') {
    const num = Number(input)
    if (!isNaN(num) && num > 1e9 && num < 2e10) {
      return Math.floor(num)
    }
    // 尝试解析为日期字符串: "2023-01-01 12:00:00"
    const date = new Date(input)
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000)
    }
  }
  return null
}

export function useTimeSlider(mapOp, mmsi, totalCount) {
  
  // ========== 🔧 配置常量 ==========
  const CONFIG = {
    TIME_STEPS: [1, 5, 10, 30, 60, 120],      // 分钟
    DEFAULT_TIME_STEP: 10,
    INDEX_STEPS: [1, 10, 50, 100, 500],       // 点数
    DEFAULT_INDEX_STEP: 10,
    MIN_TIME_INTERVAL_SEC: 1,                 // 最小时间间隔 1 秒
    GLOBAL_MIN_TS: 1672502400,                // 2023-01-01 00:00:00 UTC (秒)
    GLOBAL_MAX_TS: 1704038399,                // 2023-12-31 23:59:59 UTC (秒)
    DEFAULT_SHOW_POINTS: 1000
  }

  // ========== 🔧 响应式状态 ==========
  
  // 时间范围（秒级时间戳）
  const startTimestamp = ref(null)  // 秒
  const endTimestamp = ref(null)    // 秒
  
  // 索引范围
  const startIndex = ref(0)
  const endIndex = ref(Math.min(1000,totalCount))
  
  // 调整步长
  const timeStep = ref(CONFIG.DEFAULT_TIME_STEP)      // 分钟
  const indexStep = ref(CONFIG.DEFAULT_INDEX_STEP)    // 点数
  
  // UI 编辑状态
  const isEditingTime = ref({ start: false, end: false })   // ✅ 新增：时间编辑状态
  const isEditingIndex = ref({ start: false, end: false })
  
  // 查询状态
  const loading = ref(false)
  const error = ref(null)
  
  // 查询结果
  const currentPoints = ref([])
  const currentPointsCount = ref(0)
  
  // ✅ 核心：记录最后一次修改的来源
  const lastModifiedSource = ref(null)  // 'time' | 'index' | null

  // ========== 🔧 计算属性 ==========
  
  const globalMinTs = computed(() => CONFIG.GLOBAL_MIN_TS)
  const globalMaxTs = computed(() => CONFIG.GLOBAL_MAX_TS)
  const globalMinIdx = computed(() => 0)
  const globalMaxIdx = computed(() => Math.max(0, (totalCount ?? 0) - 1))

  // ========== 🔧 边界校验 ==========
  
  const clampTimeRange = () => {
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    
    if (startTimestamp.value == null) {
      startTimestamp.value = minTs
    }
    if (endTimestamp.value == null) {
      endTimestamp.value = Math.min(maxTs, startTimestamp.value + 3600) // 默认1小时(秒)
    }
    
    startTimestamp.value = clamp(startTimestamp.value, minTs, maxTs)
    endTimestamp.value = clamp(endTimestamp.value, minTs, maxTs)
    
    if (endTimestamp.value - startTimestamp.value < CONFIG.MIN_TIME_INTERVAL_SEC) {
      endTimestamp.value = startTimestamp.value + CONFIG.MIN_TIME_INTERVAL_SEC
    }
  }

  const clampIndexRange = () => {
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    if (startIndex.value == null || startIndex.value < minIdx) {
      startIndex.value = minIdx
    }
    if (endIndex.value == null || endIndex.value > maxIdx) {
      endIndex.value = Math.min(maxIdx, startIndex.value + CONFIG.DEFAULT_SHOW_POINTS)
    }
    
    startIndex.value = clamp(startIndex.value, minIdx, maxIdx)
    endIndex.value = clamp(endIndex.value, minIdx, maxIdx)
    
    if (endIndex.value <= startIndex.value) {
      endIndex.value = Math.min(maxIdx, startIndex.value + 1)
    }
  }

  // ========== 🎛️ 调整函数（标记修改源，❌ 不实时联动） ==========
  
  const adjustTime = (which, minutes) => {
    const delta = minutes * 60  // 分钟 → 秒
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    
    if (which === 'start' && startTimestamp.value != null) {
      const newStart = startTimestamp.value + delta
      const limit = (endTimestamp.value || maxTs) - CONFIG.MIN_TIME_INTERVAL_SEC
      startTimestamp.value = clamp(newStart, minTs, limit)
    } else if (which === 'end' && endTimestamp.value != null) {
      const newEnd = endTimestamp.value + delta
      const limit = (startTimestamp.value || minTs) + CONFIG.MIN_TIME_INTERVAL_SEC
      endTimestamp.value = clamp(newEnd, limit, maxTs)
    }
    
    // ✅ 标记修改源，但❌ 不同步索引（等待查询后同步）
    lastModifiedSource.value = 'time'
  }

  const adjustIndex = (which, step) => {
    const minIdx = globalMinIdx.value
    const maxIdx = globalMaxIdx.value
    
    if (which === 'start') {
      startIndex.value = clamp(startIndex.value + step, minIdx, endIndex.value - 1)
    } else {
      endIndex.value = clamp(endIndex.value + step, startIndex.value + 1, maxIdx)
    }
    
    // ✅ 标记修改源，但❌ 不同步时间（等待查询后同步）
    lastModifiedSource.value = 'index'
  }

  // ========== ✏️ 更新函数（支持输入编辑） ==========
  
  const updateTime = (which, value) => {
    const newTs = parseTimeInput(value)
    if (newTs == null) {
      console.warn('⚠️ 无效时间输入:', value)
      return
    }
    
    const minTs = globalMinTs.value
    const maxTs = globalMaxTs.value
    
    if (which === 'start') {
      const limit = (endTimestamp.value || maxTs) - CONFIG.MIN_TIME_INTERVAL_SEC
      startTimestamp.value = clamp(newTs, minTs, limit)
    } else {
      const limit = (startTimestamp.value || minTs) + CONFIG.MIN_TIME_INTERVAL_SEC
      endTimestamp.value = clamp(newTs, limit, maxTs)
    }
    
    lastModifiedSource.value = 'time'
    isEditingTime.value[which] = false
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
    
    lastModifiedSource.value = 'index'
    isEditingIndex.value[which] = false
  }

  // ========== 📤 核心查询函数（双接口 + 返回同步） ==========
  
  const emitQuery = async () => {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      // ✅ 边界校验
      clampTimeRange()
      clampIndexRange()
      
      let result
      // ✅ 根据最后修改源选择接口
      
      if (lastModifiedSource.value === 'time') {
        console.log('🔍 调用 byTime 接口:', { mmsi, start: startTimestamp.value, end: endTimestamp.value })
        result = await getTrajectoryByTime(mmsi, startTimestamp.value, endTimestamp.value)
      } else {
        console.log('🔍 调用 byIndex 接口:', { mmsi, startIdx: startIndex.value, endIdx: endIndex.value })
        result = await getTrajectoryByIndex(mmsi, startIndex.value, endIndex.value)
      }

      
      if (result) {
        console.log('有数据')
        // 兼容不同返回格式
        const points = Array.isArray(result) 
          ? result 
          : (result.points || result.data || result.trajectory || [])
        
        // ✅ 关键：用返回数据同步更新面板四参数
        if (result.startTime != null) startTimestamp.value = result.startTime
        if (result.endTime != null) endTimestamp.value = result.endTime
        if (result.startIdx != null) startIndex.value = result.startIdx
        if (result.endIdx != null) endIndex.value = result.endIdx
        
        currentPoints.value = points
        currentPointsCount.value = points.length

        // 渲染地图
        if (mapOp?.renderTrajectory) {
          console.log('渲染地图')
          console.log('🗺️ 内部 map 实例:', mapOp.map) 
          mapOp.renderTrajectory(points, {
            showPoints: true,
            fitBounds: true,
            lineStyle: { color: '#8b5cf6', width: 2 }
          })
        }
        
        return { success: true, points, count: points.length, raw: result }
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

  // 重置/全量函数（同样使用 emitQuery 逻辑）
  const resetToDefault = async () => {
    startIndex.value = 0
    endIndex.value = Math.min(CONFIG.DEFAULT_SHOW_POINTS, globalMaxIdx.value)
    lastModifiedSource.value = 'index'  // 重置视为索引操作
    return await emitQuery()
  }

  const firstReset = async () => {
    startIndex.value = 0
    endIndex.value = Math.min(CONFIG.DEFAULT_SHOW_POINTS, globalMaxIdx.value)
    lastModifiedSource.value = 'index'  // 重置视为索引操作

    mmsi
    return await emitQuery()
  }

  const expandFull = async () => {
    startIndex.value = 0
    endIndex.value = globalMaxIdx.value
    lastModifiedSource.value = 'index'
    return await emitQuery()
  }

  // ========== 🎨 格式化函数（秒级时间戳） ==========
  
  const formatTimestamp = (ts) => {
    if (!ts || ts < CONFIG.GLOBAL_MIN_TS) return '--'
    const date = toDate(ts)  // ✅ 秒→毫秒
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false 
    })
  }

  const formatLocalDate = (ts) => {
    if (!ts) return ''
    return toDate(ts).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    })
  }

  const formatTimeOnly = (ts) => {
    if (!ts) return '--:--:--'
    return toDate(ts).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0 秒'
    const s = Math.floor(seconds)
    const minutes = Math.floor(s / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}天${hours % 24}小时`
    if (hours > 0) return `${hours}小时${minutes % 60}分`
    if (minutes > 0) return `${minutes}分${s % 60}秒`
    return `${s}秒`
  }

  const formatRange = (val) => {
    if (typeof val === 'number' && val > 1e9 && val < 2e10) {
      return formatTimestamp(val)
    }
    return val
  }

  // ========== 👂 初始化 ==========
  
  onMounted(() => {
    clampTimeRange()
    clampIndexRange()
  })

  watch(() => totalCount, () => {
    clampIndexRange()
  })

  // ========== ✅ 暴露内容 ==========
  
  return {
    // 🔹 响应式状态
    startTimestamp,
    endTimestamp,
    startIndex,
    endIndex,
    timeStep,
    indexStep,
    isEditingTime,      // ✅ 新增
    isEditingIndex,
    loading,
    error,
    currentPoints,
    currentPointsCount,
    lastModifiedSource, // ✅ 新增
    
    // 🔹 配置常量
    TIME_STEPS: CONFIG.TIME_STEPS,
    INDEX_STEPS: CONFIG.INDEX_STEPS,
    
    // 🔹 操作方法
    adjustTime,
    adjustIndex,
    updateTime,         // ✅ 新增
    updateIndex,
    emitQuery,
    resetToDefault,
    expandFull,
    
    // 🔹 格式化函数
    formatTimestamp,
    formatLocalDate,
    formatTimeOnly,
    formatDuration,
    formatRange,
    
    // 🔹 计算属性
    globalMinIdx,
    globalMaxIdx,
    globalMinTs,
    globalMaxTs
  }
}