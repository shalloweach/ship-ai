/**
 * ▶️ useTrackPlayer - 轨迹播放控制（生产版）
 * 功能：分批加载 + 平滑动画 + 预加载 + 倍速控制
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

const CONFIG = {
  BATCH_SIZE: 100,            // 每批加载点数（与需求对齐）
  PRELOAD_RATIO: 0.1,         // 预加载阈值：剩余 ≤10% 时触发
  SPEEDS: [0.5, 1, 2, 4, 8],  // 倍速选项
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,           // 最小帧间隔(~60fps)
  BASE_INTERVAL_MS: 50        // 1倍速时每点间隔毫秒数
}

export function useTrackPlayer(mmsi, totalCount, mapOp) {
  // ========== 🔧 响应式状态 ==========
  const isPlaying = ref(false)
  const currentIndex = ref(0)        // 当前播放点在 allPoints 中的相对索引
  const playbackSpeed = ref(CONFIG.DEFAULT_SPEED)
  
  const allPoints = ref([])          // 已加载的点数组
  const loadedStartIdx = ref(0)      // allPoints[0] 对应的全局索引
  const loadedEndIdx = ref(-1)       // allPoints[last] 对应的全局索引
  const isPreloading = ref(false)
  
  let animationFrame = null
  let lastTimestamp = 0

  // ========== 🔧 计算属性 ==========
  const hasData = computed(() => allPoints.value.length > 0)
  const canPlay = computed(() => totalCount.value > 0 && !isPreloading.value)
  
  // 全局索引 = 相对索引 + 批次起始索引
  const globalIndex = computed(() => loadedStartIdx.value + currentIndex.value)
  
  // 进度百分比
  const progress = computed(() => 
    totalCount.value > 0 ? Math.min(100, Math.round((globalIndex.value + 1) / totalCount.value * 100)) : 0
  )
  
  // 剩余点数
  const remainingTotal = computed(() => Math.max(0, totalCount.value - globalIndex.value - 1))
  
  // 当前点数据
  const currentPoint = computed(() => allPoints.value[currentIndex.value] || null)
  
  // 是否需要预加载
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

  // ========== 🔧 加载批次 ==========
  const loadBatch = async (startIdx, endIdx, isPreload = false) => {
    if (!mmsi.value || startIdx > endIdx) return { success: false }
    
    try {
      const result = await getTrajectoryByIndex(mmsi.value, startIdx, endIdx)
      if (!result?.points?.length) return { success: false, message: '无数据' }
      
      const points = result.points.map((p, i) => parsePoint(p, startIdx + i))
      
      if (allPoints.value.length === 0 && !isPreload) {
        // 首批数据：替换 + 绘制折线
        allPoints.value = points
        loadedStartIdx.value = startIdx
        loadedEndIdx.value = startIdx + points.length - 1
        renderPolyline()
      } else if (isPreload) {
        // 预加载：追加到末尾
        allPoints.value = [...allPoints.value, ...points]
        loadedEndIdx.value = startIdx + points.length - 1
      }
      
      return { success: true, count: points.length }
    } catch (err) {
      console.error('❌ 加载轨迹批次失败:', err)
      return { success: false, error: err }
    }
  }

  // 渲染折线
  const renderPolyline = () => {
    if (!mapOp?.renderTrajectory || allPoints.value.length < 2) return
    const coords = allPoints.value.map(p => [p.lng, p.lat])
    mapOp.renderTrajectory(coords, {
      showPoints: false,
      lineStyle: { color: '#3b82f6', width: 2 },
      fitBounds: true
    })
  }

  // 更新船舶图标
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

  // 启动播放（支持指定起始全局索引）
  const startPlay = async (fromGlobalIndex = 0) => {
    if (!canPlay.value || isPlaying.value) return false
    
    const safeStart = Math.max(0, Math.min(fromGlobalIndex, totalCount.value - 1))
    
    // 加载包含起始点的批次
    const batchStart = safeStart
    const batchEnd = Math.min(totalCount.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)
    
    const res = await loadBatch(batchStart, batchEnd, false)
    if (!res.success) return false
    
    // 设置相对索引并启动动画
    currentIndex.value = safeStart - loadedStartIdx.value
    beginPlayback()
    return true
  }

  // 动画循环
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
      
      // 移动到下一个点
      if (currentIndex.value < allPoints.value.length - 1) {
        currentIndex.value++
        updateShipMarker()
        
        // 🔔 预加载检查
        if (needPreload.value && !isPreloading.value) {
          preloadNextBatch()
        }
      } else {
        // 当前批次播完
        if (loadedEndIdx.value < totalCount.value - 1) {
          // 还有数据，预加载下一批
          preloadNextBatch().then(() => {
            if (allPoints.value.length > 0 && isPlaying.value) {
              // 继续播放新批次
              currentIndex.value = allPoints.value.length - (loadedEndIdx.value - loadedStartIdx.value + 1)
              animate()
            } else {
              stopPlay()
            }
          })
        } else {
          // 全部播完
          stopPlay()
        }
      }
    }
    
    if (isPlaying.value) {
      animationFrame = requestAnimationFrame(animate)
    }
  }

  // 暂停
  const pausePlay = () => {
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  // 停止 + 清空
  const stopPlay = () => {
    pausePlay()
    clear()
  }

  // 切换播放/暂停
  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pausePlay()
    } else {
      const startIdx = fromIndex ?? globalIndex.value
      startPlay(startIdx)
    }
  }

  // 设置倍速
  const setSpeed = (speed) => {
    if (CONFIG.SPEEDS.includes(speed)) {
      playbackSpeed.value = speed
    }
  }

  // 预加载下一批
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

  // 清空所有状态 + 地图
  const clear = () => {
    pausePlay()
    allPoints.value = []
    loadedStartIdx.value = 0
    loadedEndIdx.value = -1
    currentIndex.value = 0
    if (mapOp?.clearTrajectory) mapOp.clearTrajectory()
    if (mapOp?.removeShipMarker) mapOp.removeShipMarker()
  }

  // 监听 totalCount 变化
  watch(totalCount, (newVal) => {
    if (newVal <= 0) clear()
  })

  onUnmounted(() => {
    pausePlay()
  })

  // ========== ✅ 暴露接口 ==========
  return {
    // 状态（供模板绑定）
    isPlaying,
    currentIndex: globalIndex,  // 暴露全局索引
    playbackSpeed,
    progress,
    hasData,
    canPlay,
    isPreloading,
    remainingTotal,
    currentPoint,
    
    // 控制方法
    startPlay,
    pausePlay,
    stopPlay,
    togglePlay,
    setSpeed,
    clear,
    
    // 配置
    speeds: CONFIG.SPEEDS,
    
    // 内部方法（调试用）
    _loadBatch: loadBatch,
    _preloadNextBatch: preloadNextBatch
  }
}