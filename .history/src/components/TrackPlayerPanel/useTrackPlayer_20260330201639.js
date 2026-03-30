import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

/**
 * 创建组件控制器实例
 * @param {Object} props - 组件 props
 * @param {Object} player - useTrackPlayer 返回的播放器实例
 */
export function createPlayerController(props, player) {

  // 🔹本地状态（与 UI 绑定）
  const localStartIndex = ref(0)
  const localSpeed = ref(1)

  // 🔹 事件处理函数
  /**
   * 起始索引变更处理（仅在未播放时记录）
   */
  const onStartIndexChange = () => {
    if (!player.isPlaying.value && localStartIndex.value >= 0) {
      // 仅记录，实际生效在 startPlay 时
      console.log(`📍 起始索引设置为: ${localStartIndex.value}`)
    }
  }

  /**
   * 播放速度变更处理（实时生效）
   */
  const onSpeedChange = () => {
    player.setSpeed(localSpeed.value)
    console.log(`⚡ 播放速度调整为: ${localSpeed.value}x`)
  }

  /**
   * 开始/暂停 切换处理
   */
  const handleStartPause = async () => {
    if (player.isPlaying.value) {
      // 👉 暂停
      player.pausePlay()
    } else {
      // 👉 开始：校验并应用起始索引
      const startIndex = Math.max(
        0, 
        Math.min(localStartIndex.value || 0, props.totalCount - 1)
      )
      const success = await player.startPlay(startIndex)
      if (success) {
        console.log(`🚀 开始播放，起始索引: ${startIndex}`)
      }
    }
  }

  /**
   * 结束播放 + 清空处理
   */
  const handleStop = () => {
    player.stopPlay()
    localStartIndex.value = 0
    console.log('🛑 播放已停止，状态已重置')
  }

  /**
   * 重启播放器（供父组件调用）
   */
  const restart = () => {
    localStartIndex.value = 0
    player.stopPlay()
    console.log('🔄 播放器已重启')
  }

  // ─────────────────────────────────────
  // 🔹 区域 3: 状态同步监听（可选扩展）
  // ─────────────────────────────────────
  watch(() => props.totalCount, (newVal) => {
    if (newVal <= 0) {
      localStartIndex.value = 0
    }
  })

  // ─────────────────────────────────────
  // 🔹 区域 4: 暴露接口
  // ─────────────────────────────────────
  return {
    // 本地状态（v-model 绑定）
    localStartIndex,
    localSpeed,
    
    // 事件处理器（@click / @change 绑定）
    onStartIndexChange,
    onSpeedChange,
    handleStartPause,
    handleStop,
    
    // 调试/外部调用方法
    restart
  }
}






/**
 * ▶️ useTrackPlayer.js
 * 轨迹播放核心引擎 - 折线生命周期管理版
 * 
 * ✅ 特性：
 * - 分批加载 + 滑动窗口预加载
 * - 每批独立折线图层，自动管理显示/移除
 * - 响应式状态 + 计算属性驱动
 */

// ─────────────────────────────────────
// 🔹 区域 1: 配置常量
// ─────────────────────────────────────
const CONFIG = {
  BATCH_SIZE: 1000,              // 每批加载点数
  PRELOAD_RATIO: 0.1,            // 预加载阈值：剩余 ≤10% 时触发
  SPEEDS: [0.5, 1, 2, 4, 8],     // 倍速选项
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,              // 最小帧间隔 (≈60fps)
  BASE_INTERVAL_MS: 50,          // 基准播放间隔
  MAX_VISIBLE_BATCHES: 2         // 地图最多显示的折线批次数量
}

// ─────────────────────────────────────
// 🔹 区域 2: 导入依赖
// ─────────────────────────────────────
import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

// ─────────────────────────────────────
// 🔹 区域 3: 主函数定义
// ─────────────────────────────────────
export function useTrackPlayer(mmsi, totalCount, mapOp) {
  
  // ════════════════════════════════════
  // 🔸 模块 1: 响应式状态
  // ════════════════════════════════════
  
  // ▶️ 播放控制状态
  const isPlaying = ref(false)
  const currentIndex = ref(0)           // allPoints 中的相对索引
  const playbackSpeed = ref(CONFIG.DEFAULT_SPEED)
  
  // 📦 数据缓存状态
  const allPoints = ref([])             // ✅ 所有已加载点（播放逻辑使用）
  const loadedStartIdx = ref(0)         // allPoints[0] 对应的全局索引
  const loadedEndIdx = ref(-1)          // allPoints[last] 对应的全局索引
  const isPreloading = ref(false)
  
  // 🎯 折线生命周期管理
  const visiblePolylineBatches = ref([])  // 当前地图显示的批次元信息
  
  // 🎞️ 动画控制
  let animationFrame = null
  let lastTimestamp = 0


  // ════════════════════════════════════
  // 🔸 模块 2: 计算属性
  // ════════════════════════════════════
  
  const hasData = computed(() => allPoints.value.length > 0)
  
  const canPlay = computed(() => 
    totalCount?.value > 0 && !isPreloading.value
  )
  
  const globalIndex = computed(() => 
    loadedStartIdx.value + currentIndex.value
  )
  
  const progress = computed(() => 
    totalCount?.value > 0 
      ? Math.min(100, Math.round((globalIndex.value + 1) / totalCount.value * 100)) 
      : 0
  )
  
  const remainingTotal = computed(() => 
    Math.max(0, (totalCount?.value || 0) - globalIndex.value - 1)
  )
  
  const currentPoint = computed(() => 
    allPoints.value[currentIndex.value] || null
  )
  
  const needPreload = computed(() => {
    const loadedCount = allPoints.value.length
    const remainingBuffer = loadedCount - currentIndex.value
    const hasMore = loadedEndIdx.value < (totalCount?.value || 0) - 1
    const threshold = Math.max(10, Math.floor(loadedCount * CONFIG.PRELOAD_RATIO))
    return hasMore && remainingBuffer <= threshold
  })


  // ════════════════════════════════════
  // 🔸 模块 3: 数据解析工具
  // ════════════════════════════════════
  
  /**
   * 标准化轨迹点数据
   */
  const parsePoint = (raw, globalIdx) => ({
    idx: globalIdx,
    timestamp: raw.utc_time,
    lng: raw.lon ?? raw.longitude,
    lat: raw.lat ?? raw.latitude,
    speed: raw.speed,
    heading: raw.course ?? raw.heading,
    raw  // 保留原始数据供扩展
  })


  // ════════════════════════════════════
  // 🔸 模块 4: 折线生命周期管理 🎯
  // ════════════════════════════════════
  
  /**
   * 生成批次唯一 ID
   */
  const getBatchId = (startIdx) => `polyline-batch-${startIdx}`
  
  /**
   * 渲染单个批次的折线（独立图层）
   * @param {Array} points - 轨迹点数组
   * @param {number} startIdx - 批次起始全局索引
   * @param {number} endIdx - 批次结束全局索引
   */
  const renderBatchPolyline = (points, startIdx, endIdx) => {
    if (!mapOp?.renderTrajectory || !Array.isArray(points) || points.length < 2) {
      return null
    }
    
    const coords = points.map(p => [p.lat, p.lng])
    const batchId = getBatchId(startIdx)
    
    return mapOp.renderTrajectory(coords, {
      batchId,  // 🎯 关键：用于后续移除
      showPoints: false,
      lineStyle: { 
        color: '#3b82f6', 
        width: 2,
        opacity: 0.85
      },
      fitBounds: false  // 避免播放时视野跳动
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
   * 管理可见折线批次（滑动窗口策略）
   * 规则：新批次加入 → 检查数量 → 超出则移除最旧批次
   */
  const manageVisibleBatches = (newBatchStartIdx) => {
    // 1️⃣ 构建新批次元信息
    const newBatch = {
      batchId: getBatchId(newBatchStartIdx),
      startIdx: newBatchStartIdx,
      endIdx: Math.min(newBatchStartIdx + CONFIG.BATCH_SIZE - 1, (totalCount?.value || 0) - 1)
    }
    
    // 2️⃣ 避免重复添加
    const exists = visiblePolylineBatches.value.some(b => b.startIdx === newBatchStartIdx)
    if (!exists) {
      visiblePolylineBatches.value.push(newBatch)
    }
    
    // 3️⃣ 滑动窗口：超出则移除最旧
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


  // ════════════════════════════════════
  // 🔸 模块 5: 数据加载逻辑
  // ════════════════════════════════════
  
  /**
   * 加载单个批次数据 + 渲染折线
   * @param {number} startIdx - 起始全局索引
   * @param {number} endIdx - 结束全局索引
   * @param {boolean} isPreload - 是否为预加载
   */
  const loadBatch = async (startIdx, endIdx, isPreload = false) => {
    if (!mmsi?.value || startIdx > endIdx) {
      return { success: false, message: '参数无效' }
    }
    
    try {
      const result = await getTrajectoryByIndex(mmsi.value, startIdx, endIdx)
      if (!result?.points?.length) {
        return { success: false, message: '无数据' }
      }
      
      // 解析数据
      const points = result.points.map((p, i) => parsePoint(p, startIdx + i))
      
      if (allPoints.value.length === 0 && !isPreload) {
        // 🚀 首批加载：初始化 + 渲染
        allPoints.value = points
        loadedStartIdx.value = startIdx
        loadedEndIdx.value = startIdx + points.length - 1
        
        renderBatchPolyline(points, startIdx, loadedEndIdx.value)
        manageVisibleBatches(startIdx)
        
      } else if (isPreload) {
        // 🔄 预加载：追加数据 + 渲染新批次
        allPoints.value = [...allPoints.value, ...points]
        loadedEndIdx.value = startIdx + points.length - 1
        
        renderBatchPolyline(points, startIdx, loadedEndIdx.value)
        manageVisibleBatches(startIdx)
      }
      
      return { success: true, count: points.length }
    } catch (err) {
      console.error('❌ 加载轨迹批次失败:', err)
      return { success: false, error: err }
    }
  }


  // ════════════════════════════════════
  // 🔸 模块 6: 地图标记更新
  // ════════════════════════════════════
  
  /**
   * 更新船舶图标位置
   */
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


  // ════════════════════════════════════
  // 🔸 模块 7: 播放核心引擎 ▶️
  // ════════════════════════════════════
  
  /**
   * 计算当前帧间隔（基于倍速）
   */
  const getFrameInterval = () => {
    return Math.max(CONFIG.MIN_FRAME_MS, CONFIG.BASE_INTERVAL_MS / playbackSpeed.value)
  }

  /**
   * 开始播放（入口）
   */
  const startPlay = async (fromGlobalIndex = 0) => {
    if (!canPlay.value || isPlaying.value) return false
    
    const safeStart = Math.max(0, Math.min(fromGlobalIndex, (totalCount?.value || 0) - 1))
    const batchStart = safeStart
    const batchEnd = Math.min((totalCount?.value || 0) - 1, batchStart + CONFIG.BATCH_SIZE - 1)
    
    const res = await loadBatch(batchStart, batchEnd, false)
    if (!res.success) return false
    
    // 计算在 allPoints 中的相对索引
    currentIndex.value = safeStart - loadedStartIdx.value
    beginPlayback()
    return true
  }

  /**
   * 启动播放循环
   */
  const beginPlayback = () => {
    isPlaying.value = true
    lastTimestamp = performance.now()
    updateShipMarker()
    animate()
  }

  /**
   * 动画帧循环（核心）
   */
  const animate = () => {
    if (!isPlaying.value) return
    
    const now = performance.now()
    const elapsed = now - lastTimestamp
    const interval = getFrameInterval()
    
    if (elapsed >= interval) {
      lastTimestamp = now
      
      // 👉 还有未播放的点
      if (currentIndex.value < allPoints.value.length - 1) {
        currentIndex.value++
        updateShipMarker()
        
        // 触发预加载检查
        if (needPreload.value && !isPreloading.value) {
          preloadNextBatch()
        }
      } 
      // 👉 当前批次播完，但还有更多数据
      else if (loadedEndIdx.value < (totalCount?.value || 0) - 1) {
        preloadNextBatch().then(() => {
          if (allPoints.value.length > 0 && isPlaying.value) {
            // 重新计算在新批次中的相对位置
            const newBatchStart = loadedEndIdx.value - CONFIG.BATCH_SIZE + 1
            currentIndex.value = Math.max(0, globalIndex.value - newBatchStart)
            animate()
          } else {
            stopPlay()
          }
        })
      } 
      // 👉 全部播完
      else {
        stopPlay()
      }
    }
    
    // 继续下一帧
    if (isPlaying.value) {
      animationFrame = requestAnimationFrame(animate)
    }
  }

  /**
   * 暂停播放
   */
  const pausePlay = () => {
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  /**
   * 停止播放 + 清空
   */
  const stopPlay = () => {
    pausePlay()
    clear()
  }

  /**
   * 切换播放状态（快捷方法）
   */
  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pausePlay()
    } else {
      const startIdx = fromIndex ?? globalIndex.value
      startPlay(startIdx)
    }
  }

  /**
   * 设置播放速度
   */
  const setSpeed = (speed) => {
    if (CONFIG.SPEEDS.includes(speed)) {
      playbackSpeed.value = speed
    }
  }


  // ════════════════════════════════════
  // 🔸 模块 8: 预加载机制
  // ════════════════════════════════════
  
  /**
   * 预加载下一批次
   */
  const preloadNextBatch = async () => {
    if (isPreloading.value || loadedEndIdx.value >= (totalCount?.value || 0) - 1) {
      return { success: false }
    }
    
    isPreloading.value = true
    const nextStart = loadedEndIdx.value + 1
    const nextEnd = Math.min((totalCount?.value || 0) - 1, nextStart + CONFIG.BATCH_SIZE - 1)
    
    try {
      return await loadBatch(nextStart, nextEnd, true)
    } finally {
      isPreloading.value = false
    }
  }


  // ════════════════════════════════════
  // 🔸 模块 9: 清理/重置逻辑
  // ════════════════════════════════════
  
  /**
   * 完全清空：折线 + 数据 + 标记
   */
  const clear = () => {
    pausePlay()
    
    // 1️⃣ 清空地图折线
    clearVisibleBatches()
    
    // 2️⃣ 重置数据状态
    allPoints.value = []
    loadedStartIdx.value = 0
    loadedEndIdx.value = -1
    currentIndex.value = 0
    
    // 3️⃣ 清理船舶标记
    if (mapOp?.removeShipMarker) {
      mapOp.removeShipMarker()
    }
  }


  // ════════════════════════════════════
  // 🔸 模块 10: 监听 + 生命周期
  // ════════════════════════════════════
  
  // 监听 totalCount 变化
  watch(totalCount, (newVal) => {
    if (newVal <= 0) clear()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    pausePlay()
    clearVisibleBatches()
  })


  // ════════════════════════════════════
  // 🔸 模块 11: 暴露接口
  // ════════════════════════════════════
  
  return {
    // 🔹 状态（响应式）
    isPlaying,
    currentIndex: globalIndex,    // 返回全局索引，便于外部使用
    playbackSpeed,
    progress,
    hasData,
    canPlay,
    isPreloading,
    remainingTotal,
    currentPoint,
    
    // 🔹 调试信息（可选）
    visiblePolylineBatches,
    _internal: {  // 内部状态，调试用
      allPoints,
      loadedStartIdx,
      loadedEndIdx
    },
    
    // 🔹 控制方法
    startPlay,
    pausePlay,
    stopPlay,
    togglePlay,
    setSpeed,
    clear,
    
    // 🔹 配置常量
    speeds: CONFIG.SPEEDS,
    
    // 🔹 内部方法（测试/扩展用，生产环境慎用）
    _loadBatch: loadBatch,
    _preloadNextBatch: preloadNextBatch,
    _renderBatchPolyline: renderBatchPolyline,
    _manageVisibleBatches: manageVisibleBatches
  }
}