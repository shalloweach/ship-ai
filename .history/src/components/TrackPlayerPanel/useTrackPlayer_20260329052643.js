/**
 * ▶️ useTrackPlayer - 轨迹播放控制（精简版）
 * 核心功能：
 * - 按索引分批加载轨迹点 → 渲染折线
 * - 船舶图标沿折线平滑移动
 * - 剩余 10% 时自动预加载下一批
 * - 支持倍速 + 从头/指定索引播放
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

const CONFIG = {
  BATCH_SIZE: 1000,           // 每批加载点数
  PRELOAD_RATIO: 0.1,         // 预加载阈值：剩余 ≤10% 时触发
  SPEEDS: [0.5, 1, 2, 4, 8],  // 倍速选项
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,           // 最小帧间隔(~60fps)
  BASE_ANIMATE_MS: 200        // 基础动画过渡时间(毫秒)
}

export function useTrackPlayer(mmsi, totalCount, mapOp) {
  // ========== 🔧 响应式状态 ==========
  const isPlaying = ref(false)
  const currentIndex = ref(0)        // 当前播放点在 allPoints 中的相对索引
  const playbackSpeed = ref(CONFIG.DEFAULT_SPEED)
  
  const allPoints = ref([])          // 已加载的点数组（相对索引）
  const loadedStartIdx = ref(0)      // allPoints[0] 对应的全局索引
  const loadedEndIdx = ref(-1)       // allPoints[last] 对应的全局索引
  const isPreloading = ref(false)
  
  let animationFrame = null

  // ========== 🔧 计算属性 ==========
  const hasData = computed(() => allPoints.value.length > 0)
  const canPlay = computed(() => totalCount.value > 0 && !isPreloading.value)
  
  // 全局索引 = 相对索引 + 批次起始索引
  const globalIndex = computed(() => loadedStartIdx.value + currentIndex.value)
  
  // 进度 = 已播放点数 / 总点数
  const progress = computed(() => 
    totalCount.value > 0 ? Math.round(globalIndex.value / totalCount.value * 100) : 0
  )
  
  // 剩余总点数（用于显示）
  const remainingTotal = computed(() => Math.max(0, totalCount.value - globalIndex.value))
  
  // 当前点数据
  const currentPoint = computed(() => allPoints.value[currentIndex.value] || null)
  
  // 是否需要预加载：剩余点数 ≤ 已加载点数 × 10% 且还有未加载数据
  const needPreload = computed(() => {
    const loadedCount = allPoints.value.length
    const remainingBuffer = loadedCount - currentIndex.value
    const hasMore = loadedEndIdx.value < totalCount.value - 1
    return hasMore && remainingBuffer <= Math.max(10, Math.floor(loadedCount * CONFIG.PRELOAD_RATIO))
  })

  // ========== 🔧 数据解析 ==========
  const parsePoint = (raw, globalIdx) => ({
    idx: globalIdx,
    timestamp: raw.utc_time,  // ✅ 秒级时间戳（用户原始数据）
    lng: raw.lon,
    lat: raw.lat,
    speed: raw.speed,
    heading: raw.course,
    raw
  })

  // ========== 🔧 加载批次 ==========
  const loadBatch = async (startIdx, endIdx) => {
    if (!mmsi.value || startIdx > endIdx) return { success: false }
    
    try {
      const result = await getTrajectoryByIndex(mmsi.value, startIdx, endIdx)
      if (!result?.points?.length) return { success: false, message: '无数据' }
      
      // 解析点数据
      const points = result.points.map((p, i) => parsePoint(p, startIdx + i))
      
      // 首次加载 or 追加
      if (allPoints.value.length === 0) {
        allPoints.value = points
        loadedStartIdx.value = startIdx
        loadedEndIdx.value = startIdx + points.length - 1
        renderPolyline()  // 首次加载时渲染折线
      } else {
        allPoints.value = [...allPoints.value, ...points]
        loadedEndIdx.value = startIdx + points.length - 1
      }
      
      return { success: true, count: points.length }
    } catch (err) {
      console.error('❌ 加载轨迹批次失败:', err)
      return { success: false, error: err }
    }
  }

  // 渲染折线（仅调用一次，后续只移动船舶图标）
  const renderPolyline = () => {
    if (!mapOp?.renderTrajectory || allPoints.value.length < 2) return
    const coords = allPoints.value.map(p => [p.lng, p.lat])
    mapOp.renderTrajectory(coords, {
      showPoints: false,
      lineStyle: { color: '#8b5cf6', width: 2 },
      fitBounds: true
    })
  }

  // 更新船舶图标位置
  const updateShipMarker = () => {
    const point = currentPoint.value
    if (!point || !mapOp?.updateShipMarker) return
    
    mapOp.updateShipMarker({
      lng: point.lng,
      lat: point.lat,
      heading: point.heading,
      timestamp: point.timestamp,
      idx: point.idx
    }, {
      animate: true,
      duration: CONFIG.BASE_ANIMATE_MS / playbackSpeed.value
    })
  }

  // ========== ▶️ 播放核心逻辑 ==========
  
  // 计算当前点到下一点的播放间隔（毫秒）
  const getFrameInterval = () => {
    const curr = currentPoint.value
    const next = allPoints.value[currentIndex.value + 1]
    if (!curr || !next) return CONFIG.BASE_ANIMATE_MS
    
    // 基于时间差动态计算 + 速度倍率
    const timeDiffSec = next.timestamp - curr.timestamp  // ✅ 秒级
    return Math.max(
      CONFIG.MIN_FRAME_MS,
      (timeDiffSec * 1000) / playbackSpeed.value  // 秒→毫秒，除以倍速
    )
  }

  // 开始播放（支持指定起始索引）
  const startPlay = async (fromIndex = 0) => {
    if (!canPlay.value || isPlaying.value) return
    
    const safeStart = Math.max(0, Math.min(fromIndex, totalCount.value - 1))
    
    // 如果起始点不在已加载范围，先加载对应批次
    if (safeStart < loadedStartIdx.value || safeStart > loadedEndIdx.value) {
      const batchStart = Math.max(0, safeStart - (safeStart % CONFIG.BATCH_SIZE))
      const batchEnd = Math.min(totalCount.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)
      const res = await loadBatch(batchStart, batchEnd)
      if (!res.success) return
    }
    
    // 设置相对索引并开始播放
    currentIndex.value = safeStart - loadedStartIdx.value
    beginPlayback()
  }

  // 启动播放循环
  const beginPlayback = () => {
    isPlaying.value = true
    updateShipMarker()  // 初始化位置
    
    let lastTime = 0
    
    const step = (timestamp) => {
      if (!isPlaying.value) return
      
      if (!lastTime) lastTime = timestamp
      const delta = timestamp - lastTime
      lastTime = timestamp
      
      const interval = getFrameInterval()
      
      if (delta >= interval) {
        // 移动到下一个点
        if (currentIndex.value < allPoints.value.length - 1) {
          currentIndex.value++
          updateShipMarker()
          
          // ✅ 预加载检查
          if (needPreload.value && !isPreloading.value) {
            preloadNextBatch()
          }
        } else {
          // 当前批次播完，检查是否还有数据
          if (loadedEndIdx.value < totalCount.value - 1) {
            preloadNextBatch().then(() => {
              if (allPoints.value.length > 0) {
                currentIndex.value = 0  // 新批次的相对起点
                updateShipMarker()
              } else {
                stopPlay()
              }
            })
          } else {
            stopPlay()  // 全部播完
          }
        }
      }
      
      if (isPlaying.value) {
        animationFrame = requestAnimationFrame(step)
      }
    }
    
    animationFrame = requestAnimationFrame(step)
  }

  // 暂停/停止
  const pausePlay = () => {
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  const stopPlay = () => {
    pausePlay()
    currentIndex.value = 0
    if (allPoints.value[0]) updateShipMarker()  // 重置到起点
  }

  // 切换播放状态
  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pausePlay()
    } else {
      // 如果从未播放过，从头开始；否则从当前位置继续
      const startIdx = fromIndex ?? (currentIndex.value >= 0 ? globalIndex.value : 0)
      startPlay(startIdx)
    }
  }

  // 设置倍速
  const setSpeed = (speed) => {
    if (CONFIG.SPEEDS.includes(speed)) {
      playbackSpeed.value = speed
      // 播放中时重启以应用新速度
      if (isPlaying.value) {
        pausePlay()
        beginPlayback()
      }
    }
  }

  // 预加载下一批
  const preloadNextBatch = async () => {
    if (isPreloading.value || loadedEndIdx.value >= totalCount.value - 1) {
      return { success: false, reason: '无需预加载' }
    }
    
    isPreloading.value = true
    const nextStart = loadedEndIdx.value + 1
    const nextEnd = Math.min(totalCount.value - 1, nextStart + CONFIG.BATCH_SIZE - 1)
    
    try {
      return await loadBatch(nextStart, nextEnd)
    } finally {
      isPreloading.value = false
    }
  }

  // 跳转到指定索引
  const seekTo = async (targetIdx) => {
    const safeIdx = Math.max(0, Math.min(targetIdx, totalCount.value - 1))
    pausePlay()
    
    // 目标点在已加载范围内 → 直接跳转
    if (safeIdx >= loadedStartIdx.value && safeIdx <= loadedEndIdx.value) {
      currentIndex.value = safeIdx - loadedStartIdx.value
      updateShipMarker()
      return
    }
    
    // 否则重新加载包含目标点的批次
    const batchStart = Math.max(0, safeIdx - (safeIdx % CONFIG.BATCH_SIZE))
    const batchEnd = Math.min(totalCount.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)
    await loadBatch(batchStart, batchEnd)
    currentIndex.value = safeIdx - loadedStartIdx.value
    updateShipMarker()
  }

  // 清空
  const clear = () => {
    pausePlay()
    allPoints.value = []
    loadedStartIdx.value = 0
    loadedEndIdx.value = -1
    currentIndex.value = 0
    if (mapOp?.clearTrajectory) mapOp.clearTrajectory()
  }

  // 监听 totalCount 变化时重置
  watch(totalCount, (newVal) => {
    if (newVal <= 0) clear()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    pausePlay()
  })

  // ========== ✅ 暴露接口 ==========
  return {
    // 状态
    isPlaying,
    currentIndex: globalIndex,  // 直接暴露全局索引，方便父组件显示
    playbackSpeed,
    progress,
    hasData,
    canPlay,
    isPreloading,
    remainingTotal,
    currentPoint,
    
    // 控制方法
    startPlay,      // 从头 or 指定索引开始
    pausePlay,
    stopPlay,
    togglePlay,     // 播放/暂停切换
    setSpeed,       // 设置倍速
    seekTo,         // 跳转索引
    clear,          // 清空重置
    preloadNextBatch, // 手动预加载（调试用）
    
    // 配置
    speeds: CONFIG.SPEEDS
  }
}