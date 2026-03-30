/**
 * ▶️ useTrackPlayer - 轨迹播放控制（折线生命周期管理版）
 * 
 * ✅ 新增特性：
 * - 每批数据加载后立即绘制独立折线
 * - 地图最多显示2批折线（滑动窗口）
 * - 自动移除过期批次折线，保留allPoints用于播放
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

// 本地状态（与 player 同步）
const localStartIndex = ref(0)
const localSpeed = ref(1)

// 起始索引变更：更新播放器状态（仅在未播放时生效）
const onStartIndexChange = () => {
  if (!player.isPlaying.value && localStartIndex.value >= 0) {
    // 仅记录，点击开始时使用
  }
}

// 速度变更：实时生效
const onSpeedChange = () => {
  player.setSpeed(localSpeed.value)
}

// 处理开始/暂停切换（C）
const handleStartPause = async () => {
  if (player.isPlaying.value) {
    // 暂停
    player.pausePlay()
  } else {
    // 开始：使用用户设置的起始索引
    const startIndex = Math.max(0, Math.min(localStartIndex.value || 0, props.totalCount - 1))
    await player.startPlay(startIndex)
  }
}

// 处理结束（D）：停止 + 清空
const handleStop = () => {
  player.stopPlay()
  // 重置本地输入
  localStartIndex.value = 0
}
const CONFIG = {
  BATCH_SIZE: 1000,              // 每批加载点数
  PRELOAD_RATIO: 0.1,           // 预加载阈值：剩余 ≤10% 时触发
  SPEEDS: [0.5, 1, 2, 4, 8],    // 倍速选项
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,
  BASE_INTERVAL_MS: 50,
  MAX_VISIBLE_BATCHES: 2        // 🎯 地图最多显示的折线批次数量
}

export function useTrackPlayer(mmsi, totalCount, mapOp) {
  // ========== 🔧 响应式状态 ==========
  const isPlaying = ref(false)
  const currentIndex = ref(0)
  const playbackSpeed = ref(CONFIG.DEFAULT_SPEED)
  
  const allPoints = ref([])              // ✅ 所有已加载点（用于播放逻辑）
  const loadedStartIdx = ref(0)          // allPoints[0] 对应的全局索引
  const loadedEndIdx = ref(-1)
  const isPreloading = ref(false)
  
  // 🎯 折线生命周期管理
  const visiblePolylineBatches = ref([])  // 当前地图上显示的批次 [{batchId, startIdx, endIdx}]
  
  let animationFrame = null
  let lastTimestamp = 0

  // ========== 🔧 计算属性 ==========
  const hasData = computed(() => allPoints.value.length > 0)
  const canPlay = computed(() => totalCount.value > 0 && !isPreloading.value)
  const globalIndex = computed(() => loadedStartIdx.value + currentIndex.value)
  
  const progress = computed(() => 
    totalCount.value > 0 ? Math.min(100, Math.round((globalIndex.value + 1) / totalCount.value * 100)) : 0
  )
  
  const remainingTotal = computed(() => Math.max(0, totalCount.value - globalIndex.value - 1))
  const currentPoint = computed(() => allPoints.value[currentIndex.value] || null)
  
  const needPreload = computed(() => {
    const loadedCount = allPoints.value.length
    const remainingBuffer = loadedCount - currentIndex.value
    const hasMore = loadedEndIdx.value < totalCount.value - 1
    return hasMore && remainingBuffer <= Math.max(10, Math.floor(loadedCount * CONFIG.PRELOAD_RATIO))
  })

  // ========== 🔧 数据解析 ==========
  const parsePoint = (raw, globalIdx) => ({
    idx: globalIdx,
    timestamp: raw.utc_time,
    lng: raw.lon ?? raw.longitude,
    lat: raw.lat ?? raw.latitude,
    speed: raw.speed,
    heading: raw.course ?? raw.heading,
    raw
  })

  // ========== 🎯 折线生命周期管理 ==========
  
  /**
   * 生成批次唯一ID
   */
  const getBatchId = (startIdx) => `polyline-batch-${startIdx}`
  
  /**
   * 渲染单个批次的折线（独立图层）
   */
  const renderBatchPolyline = (points, startIdx, endIdx) => {
    if (!mapOp?.renderTrajectory || !Array.isArray(points) || points.length < 2) return null
    
    const coords = points.map(p => [p.lat, p.lng])
    const batchId = getBatchId(startIdx)
    
    // 渲染时传入batchId，mapOp会管理图层生命周期
    return mapOp.renderTrajectory(coords, {
      batchId,  // 🎯 关键：批次标识
      showPoints: false,
      lineStyle: { 
        color: '#3b82f6', 
        width: 2,
        opacity: 0.85
      },
      // 不自动fitBounds，避免播放时视野跳动
      fitBounds: false
    })
  }
  
  /**
   * 移除指定批次的折线
   */
  const removeBatchPolyline = (startIdx) => {
    const batchId = getBatchId(startIdx)
    mapOp?.removePolyline?.(batchId)
  }
  
  /**
   * 管理可见折线批次（滑动窗口）
   * 规则：最多显示 CONFIG.MAX_VISIBLE_BATCHES 批，新批次加入时移除最旧的
   */
  const manageVisibleBatches = (newBatchStartIdx) => {
    // 1️⃣ 添加新批次到可见列表
    const newBatch = {
      batchId: getBatchId(newBatchStartIdx),
      startIdx: newBatchStartIdx,
      endIdx: Math.min(newBatchStartIdx + CONFIG.BATCH_SIZE - 1, totalCount.value - 1)
    }
    
    // 避免重复添加
    const exists = visiblePolylineBatches.value.some(b => b.startIdx === newBatchStartIdx)
    if (!exists) {
      visiblePolylineBatches.value.push(newBatch)
    }
    
    // 2️⃣ 如果超过最大显示数量，移除最旧的批次
    while (visiblePolylineBatches.value.length > CONFIG.MAX_VISIBLE_BATCHES) {
      const oldest = visiblePolylineBatches.value.shift()
      console.log(`🗑️ 移除过期折线批次: ${oldest.batchId}`)
      removeBatchPolyline(oldest.startIdx)
    }
  }
  
  /**
   * 清空所有可见折线批次
   */
  const clearVisibleBatches = () => {
    visiblePolylineBatches.value.forEach(batch => {
      removeBatchPolyline(batch.startIdx)
    })
    visiblePolylineBatches.value = []
  }

  // ========== 🔧 加载批次 ==========
  const loadBatch = async (startIdx, endIdx, isPreload = false) => {
    if (!mmsi.value || startIdx > endIdx) return { success: false }
    
    try {
      const result = await getTrajectoryByIndex(mmsi.value, startIdx, endIdx)
      if (!result?.points?.length) return { success: false, message: '无数据' }
      
      const points = result.points.map((p, i) => parsePoint(p, startIdx + i))
      
      if (allPoints.value.length === 0 && !isPreload) {
        // 🚀 首批数据：初始化 + 渲染折线
        allPoints.value = points
        loadedStartIdx.value = startIdx
        loadedEndIdx.value = startIdx + points.length - 1
        
        // 🎯 渲染首批折线并加入生命周期管理
        renderBatchPolyline(points, startIdx, loadedEndIdx.value)
        manageVisibleBatches(startIdx)
        
      } else if (isPreload) {
        // 🔄 预加载批次：追加数据 + 渲染独立折线
        const batchStartIdx = allPoints.value.length > 0 ? loadedEndIdx.value + 1 : startIdx
        allPoints.value = [...allPoints.value, ...points]
        loadedEndIdx.value = startIdx + points.length - 1
        
        // 🎯 渲染新批次折线 + 生命周期管理
        renderBatchPolyline(points, startIdx, loadedEndIdx.value)
        manageVisibleBatches(startIdx)
      }
      
      return { success: true, count: points.length }
    } catch (err) {
      console.error('❌ 加载轨迹批次失败:', err)
      return { success: false, error: err }
    }
  }

  // 更新船舶图标（复用allPoints，不受折线显示限制）
  const updateShipMarker = () => {
    const point = currentPoint.value
    if (!point || !mapOp?.updateShipMarker) return
    
    mapOp.updateShipMarker({
      lng: point.lng,
      lat: point.lat,
      heading: point.heading,
      timestamp: point.timestamp,
      idx: point.idx
    })
  }

  // ========== ▶️ 播放核心 ==========
  
  const getFrameInterval = () => {
    return Math.max(CONFIG.MIN_FRAME_MS, CONFIG.BASE_INTERVAL_MS / playbackSpeed.value)
  }

  const startPlay = async (fromGlobalIndex = 0) => {
    if (!canPlay.value || isPlaying.value) return false
    
    const safeStart = Math.max(0, Math.min(fromGlobalIndex, totalCount.value - 1))
    const batchStart = safeStart
    const batchEnd = Math.min(totalCount.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)
    
    const res = await loadBatch(batchStart, batchEnd, false)
    if (!res.success) return false
    
    currentIndex.value = safeStart - loadedStartIdx.value
    beginPlayback()
    return true
  }

  const beginPlayback = () => {
    isPlaying.value = true
    lastTimestamp = performance.now()
    updateShipMarker()
    animate()
  }

  const animate = () => {
    if (!isPlaying.value) return
    
    const now = performance.now()
    const elapsed = now - lastTimestamp
    const interval = getFrameInterval()
    
    if (elapsed >= interval) {
      lastTimestamp = now
      
      if (currentIndex.value < allPoints.value.length - 1) {
        currentIndex.value++
        updateShipMarker()
        
        if (needPreload.value && !isPreloading.value) {
          preloadNextBatch()
        }
      } else {
        if (loadedEndIdx.value < totalCount.value - 1) {
          preloadNextBatch().then(() => {
            if (allPoints.value.length > 0 && isPlaying.value) {
              // 计算新批次中的相对位置
              const newBatchStart = loadedEndIdx.value - CONFIG.BATCH_SIZE + 1
              currentIndex.value = Math.max(0, globalIndex.value - newBatchStart)
              animate()
            } else {
              stopPlay()
            }
          })
        } else {
          stopPlay()
        }
      }
    }
    
    if (isPlaying.value) {
      animationFrame = requestAnimationFrame(animate)
    }
  }

  const pausePlay = () => {
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  const stopPlay = () => {
    pausePlay()
    clear()
  }

  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pausePlay()
    } else {
      const startIdx = fromIndex ?? globalIndex.value
      startPlay(startIdx)
    }
  }

  const setSpeed = (speed) => {
    if (CONFIG.SPEEDS.includes(speed)) {
      playbackSpeed.value = speed
    }
  }

  const preloadNextBatch = async () => {
    if (isPreloading.value || loadedEndIdx.value >= totalCount.value - 1) {
      return { success: false }
    }
    
    isPreloading.value = true
    const nextStart = loadedEndIdx.value + 1
    const nextEnd = Math.min(totalCount.value - 1, nextStart + CONFIG.BATCH_SIZE - 1)
    
    try {
      return await loadBatch(nextStart, nextEnd, true)
    } finally {
      isPreloading.value = false
    }
  }

  // 🎯 增强版清空：清理折线批次 + 数据
  const clear = () => {
    pausePlay()
    
    // 1️⃣ 清空地图上的所有批次折线
    clearVisibleBatches()
    
    // 2️⃣ 重置数据状态
    allPoints.value = []
    loadedStartIdx.value = 0
    loadedEndIdx.value = -1
    currentIndex.value = 0
    
    // 3️⃣ 清理船舶marker
    if (mapOp?.removeShipMarker) mapOp.removeShipMarker()
  }

  watch(totalCount, (newVal) => {
    if (newVal <= 0) clear()
  })

  onUnmounted(() => {
    pausePlay()
    clearVisibleBatches()  // 确保组件卸载时清理折线
  })

  // ========== ✅ 暴露接口 ==========
  return {
    // 状态
    isPlaying,
    currentIndex: globalIndex,
    playbackSpeed,
    progress,
    hasData,
    canPlay,
    isPreloading,
    remainingTotal,
    currentPoint,
    
    // 🎯 新增：可见批次信息（调试用）
    visiblePolylineBatches,
    
    // 控制方法
    startPlay,
    pausePlay,
    stopPlay,
    togglePlay,
    setSpeed,
    clear,
    
    // 配置
    speeds: CONFIG.SPEEDS,
    
    // 内部方法
    _loadBatch: loadBatch,
    _preloadNextBatch: preloadNextBatch,
    _renderBatchPolyline: renderBatchPolyline,
    _manageVisibleBatches: manageVisibleBatches
  }
}