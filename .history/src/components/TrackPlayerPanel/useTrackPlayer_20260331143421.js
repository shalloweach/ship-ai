// composables/useTrackPlayer.js
import { ref, computed, watch, onUnmounted } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

// ============================================================================
// 1. 常量配置
// ============================================================================
const CONFIG = {
  BATCH_SIZE: 1000,
  PRELOAD_RATIO: 0.1,
  SPEEDS: [0.5, 1, 2, 4, 8],
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,
  BASE_INTERVAL_MS: 50,
  MAX_VISIBLE_BATCHES: 2,
  CHART_WINDOW_SIZE: 100, // 折线图可视窗口大小
}


const parsePoint = (raw, idx) => ({
  idx,
  timestamp: raw.utc_time,
  lng: raw.lon ?? raw.longitude,
  lat: raw.lat ?? raw.latitude,
  speed: raw.speed,
  course: raw.course ?? raw.heading,
  draught: raw.draught,
  heading: raw.course ?? raw.heading,
  navigationstatus: raw.navigationstatus,
  destination: raw.destination,
  raw, // 保留原始数据
})

const getBatchId = (start) => `polyline-batch-${start}`

// ============================================================================
// 3. Composable 主函数
// ============================================================================
/**
 * 轨迹播放器 Hook
 * @param {Ref<number>|number|Function} totalCount - 总点数
 * @param {Ref<string>|string|Function} mmsi - 船舶标识
 * @param {Object} mapOp - 地图操作对象
 * @returns {Object} 播放器控制接口
 */
export function useTrackPlayer(totalCount, mmsi, mapOp) {
  
  // --------------------------------------------------------------------------
  // 3.1 参数响应式包装
  // --------------------------------------------------------------------------
  const totalCountRef = computed(() => {
    if (typeof totalCount === 'function') return totalCount()
    return totalCount?.value ?? totalCount
  })
  
  const mmsiRef = computed(() => {
    if (typeof mmsi === 'function') return mmsi()
    return mmsi?.value ?? mmsi
  })

  // --------------------------------------------------------------------------
  // 3.2 响应式状态
  // --------------------------------------------------------------------------
  const isPlaying = ref(false)
  const isPreloading = ref(false)
  const currentGlobalIdx = ref(0)
  const speed = ref(CONFIG.DEFAULT_SPEED)
  
  // 数据缓存
  const allPoints = ref([])
  const loadedStart = ref(0)
  const loadedEnd = ref(-1)
  const visibleBatches = ref([])
  
  // 动画控制
  let animFrame = null
  let lastTimestamp = 0

  // --------------------------------------------------------------------------
  // 3.3 计算属性
  // --------------------------------------------------------------------------
  const hasData = computed(() => allPoints.value.length > 0)
  
  const canPlay = computed(() => totalCountRef.value > 0 && !isPreloading.value)
  
  const progress = computed(() => {
    if (totalCountRef.value === 0) return 0
    return ((currentGlobalIdx.value + 1) / totalCountRef.value) * 100
  })
  
  const remaining = computed(() => 
    Math.max(0, totalCountRef.value - currentGlobalIdx.value - 1)
  )
  
  // 当前点完整信息
  const currentPoint = computed(() => {
    const relativeIdx = currentGlobalIdx.value - loadedStart.value
    const point = allPoints.value[relativeIdx]
    if (!point) return null
    
    return {
      idx: point.idx,
      timestamp: point.timestamp,
      lng: point.lng,
      lat: point.lat,
      speed: point.speed,
      course: point.course,
      draught: point.draught,
      heading: point.heading,
      navigationstatus: point.navigationstatus,
      destination: point.destination,
      raw: point.raw
    }
  })
  
  // 折线图数据：当前可视窗口内的点
  const chartData = computed(() => {
    if (allPoints.value.length === 0) {
      return { speed: [], course: [], draught: [], currentIdx: null }
    }
    
    const centerRelIdx = currentGlobalIdx.value - loadedStart.value
    const halfWindow = Math.floor(CONFIG.CHART_WINDOW_SIZE / 2)
    const startRelIdx = Math.max(0, centerRelIdx - halfWindow)
    const endRelIdx = Math.min(allPoints.value.length - 1, centerRelIdx + halfWindow)
    
    const slice = allPoints.value.slice(startRelIdx, endRelIdx + 1)
    
    return {
      speed: slice.map(p => ({ x: p.idx, y: p.speed ?? 0 })),
      course: slice.map(p => ({ x: p.idx, y: p.course ?? 0 })),
      draught: slice.map(p => ({ x: p.idx, y: p.draught ?? 0 })),
      currentIdx: currentGlobalIdx.value,
      xRange: { 
        min: slice[0]?.idx ?? 0, 
        max: slice[slice.length - 1]?.idx ?? 0 
      }
    }
  })
  
  // 预加载判断
  const needPreload = computed(() => {
    const loadedCount = allPoints.value.length
    const relativeIdx = currentGlobalIdx.value - loadedStart.value
    const remainingBuffer = loadedCount - relativeIdx
    const hasMore = loadedEnd.value < totalCountRef.value - 1
    const threshold = Math.max(10, Math.floor(loadedCount * CONFIG.PRELOAD_RATIO))
    return hasMore && remainingBuffer <= threshold
  })

  // --------------------------------------------------------------------------
  // 3.4 地图渲染相关方法
  // --------------------------------------------------------------------------
  const renderBatch = (points, startIdx, endIdx, showPoints = false) => {
    if (!mapOp?.renderTrajectory || points.length < 2) return null
    const coords = points.map(p => [p.lat, p.lng])
    return mapOp.renderTrajectory(coords, {
      batchId: getBatchId(startIdx),
      showPoints,
      lineStyle: { color: '#3b82f6', width: 2, opacity: 0.85 },
      fitBounds: false,
    })
  }

  const removeBatch = (startIdx) => {
    mapOp?.removePolyline?.(getBatchId(startIdx))
  }

  const manageBatches = (newStartIdx) => {
    const newBatch = {
      startIdx: newStartIdx,
      endIdx: Math.min(newStartIdx + CONFIG.BATCH_SIZE - 1, totalCountRef.value - 1),
    }
    if (!visibleBatches.value.some(b => b.startIdx === newStartIdx)) {
      visibleBatches.value.push(newBatch)
    }
    while (visibleBatches.value.length > CONFIG.MAX_VISIBLE_BATCHES) {
      const oldest = visibleBatches.value.shift()
      removeBatch(oldest.startIdx)
    }
  }

  const clearBatches = () => {
    visibleBatches.value.forEach(b => removeBatch(b.startIdx))
    visibleBatches.value = []
  }

  const refreshVisibleBatches = (showPoints) => {
    visibleBatches.value.forEach(batch => {
      const batchStartRel = batch.startIdx - loadedStart.value
      const batchEndRel = batch.endIdx - loadedStart.value
      const batchPoints = allPoints.value.slice(batchStartRel, batchEndRel + 1)
      
      if (batchPoints.length >= 2) {
        removeBatch(batch.startIdx)
        renderBatch(batchPoints, batch.startIdx, batch.endIdx, showPoints)
      }
    })
  }

  // --------------------------------------------------------------------------
  // 3.5 数据加载方法
  // --------------------------------------------------------------------------
  const loadBatch = async (start, end, isPreload = false) => {
    const currentMmsi = mmsiRef.value
    if (!currentMmsi || start > end) return false
    
    try {
      const res = await getTrajectoryByIndex(currentMmsi, start, end)
      if (!res?.points?.length) return false

      const points = res.points.map((p, i) => parsePoint(p, start + i))

      if (allPoints.value.length === 0 && !isPreload) {
        // 首次加载
        allPoints.value = points
        loadedStart.value = start
        loadedEnd.value = start + points.length - 1
        renderBatch(points, start, loadedEnd.value, false)
        manageBatches(start)
      } else if (isPreload) {
        // 预加载追加
        allPoints.value.push(...points)
        loadedEnd.value = start + points.length - 1
        renderBatch(points, start, loadedEnd.value, false)
        manageBatches(start)
      }
      return true
    } catch (err) {
      console.error('加载轨迹批次失败:', err)
      return false
    }
  }

  const preloadNext = async () => {
    if (isPreloading.value || loadedEnd.value >= totalCountRef.value - 1) return
    isPreloading.value = true
    const nextStart = loadedEnd.value + 1
    const nextEnd = Math.min(totalCountRef.value - 1, nextStart + CONFIG.BATCH_SIZE - 1)
    await loadBatch(nextStart, nextEnd, true)
    isPreloading.value = false
  }

  // --------------------------------------------------------------------------
  // 3.6 标记与动画控制
  // --------------------------------------------------------------------------
  const updateMarker = () => {
    const p = currentPoint.value
    if (p && mapOp?.updateShipMarker) {
      mapOp.updateShipMarker({
        lng: p.lng,
        lat: p.lat,
        heading: p.heading,
        timestamp: p.timestamp,
        idx: p.idx,
        navigationstatus: p.navigationstatus,
        destination: p.destination
      })
    }
  }

  const getFrameInterval = () => 
    Math.max(CONFIG.MIN_FRAME_MS, CONFIG.BASE_INTERVAL_MS / speed.value)

  const animate = () => {
    if (!isPlaying.value) return
    
    const now = performance.now()
    const elapsed = now - lastTimestamp
    
    if (elapsed >= getFrameInterval()) {
      lastTimestamp = now
      const relativeIdx = currentGlobalIdx.value - loadedStart.value
      
      if (relativeIdx < allPoints.value.length - 1) {
        // 当前批次内前进
        currentGlobalIdx.value++
        updateMarker()
        if (needPreload.value && !isPreloading.value) preloadNext()
      } else if (loadedEnd.value < totalCountRef.value - 1) {
        // 需要加载下一批次
        preloadNext().then(() => {
          if (allPoints.value.length && isPlaying.value) {
            animate()
          } else {
            stop()
          }
        })
      } else {
        // 播放结束
        stop()
      }
    }
    
    if (isPlaying.value) {
      animFrame = requestAnimationFrame(animate)
    }
  }

  // --------------------------------------------------------------------------
  // 3.7 播放控制方法（对外暴露）
  // --------------------------------------------------------------------------
  const start = async (fromGlobalIdx = 0) => {
    if (!canPlay.value || isPlaying.value) return false
    
    const safeStart = Math.min(
      Math.max(0, fromGlobalIdx), 
      totalCountRef.value - 1
    )
    const batchStart = safeStart
    const batchEnd = Math.min(totalCountRef.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)

    const ok = await loadBatch(batchStart, batchEnd, false)
    if (!ok) return false

    currentGlobalIdx.value = safeStart
    lastTimestamp = performance.now()
    isPlaying.value = true
    updateMarker()
    animate()
    return true
  }
  
  const pause = () => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    refreshVisibleBatches(true) // 暂停时显示轨迹点
  }

  const resume = () => {
    if (isPlaying.value) return
    refreshVisibleBatches(false) // 播放时隐藏轨迹点
    isPlaying.value = true
    lastTimestamp = performance.now()
    animate()
  }

  const stop = () => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    clearBatches()
    allPoints.value = []
    loadedStart.value = 0
    loadedEnd.value = -1
    currentGlobalIdx.value = 0
    if (mapOp?.removeShipMarker) mapOp.removeShipMarker()
  }

  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pause()
    } else {
      const idx = fromIndex !== undefined ? fromIndex : currentGlobalIdx.value
      start(idx)
    }
  }

  // 设置播放速度
  const setSpeed = (newSpeed) => {
    if (CONFIG.SPEEDS.includes(newSpeed)) {
      speed.value = newSpeed
    }
  }

  // 设置起始索引（供组件调用）
  const setIndex = (index) => {
    const max = Math.max(0, totalCountRef.value - 1)
    const safeIndex = Math.min(Math.max(0, index), max)
    if (safeIndex !== currentGlobalIdx.value) {
      jumpTo(safeIndex, { keepPlaying: false })
    }
  }

  // 跳转到指定轨迹点
  const jumpTo = async (globalIdx, options = {}) => {
    const { keepPlaying = false } = options
    const targetIdx = Math.min(
      Math.max(0, globalIdx), 
      totalCountRef.value - 1
    )
    
    refreshVisibleBatches(false)
    
    const relativeIdx = targetIdx - loadedStart.value
    const isInLoadedRange = relativeIdx >= 0 && relativeIdx < allPoints.value.length
    
    if (!isInLoadedRange) {
      // 目标点不在已加载范围内，重新加载批次
      const batchStart = Math.max(0, targetIdx - Math.floor(CONFIG.BATCH_SIZE / 2))
      const batchEnd = Math.min(
        totalCountRef.value - 1, 
        batchStart + CONFIG.BATCH_SIZE - 1
      )
      
      isPreloading.value = true
      const loaded = await loadBatch(batchStart, batchEnd, false)
      isPreloading.value = false
      
      if (!loaded) {
        console.warn('跳转时加载数据失败')
        return false
      }
    }
    
    currentGlobalIdx.value = targetIdx
    updateMarker()
    
    if (keepPlaying && !isPlaying.value) {
      resume()
    } else if (!keepPlaying) {
      isPlaying.value = false
      refreshVisibleBatches(true)
    }
    
    return true
  }

  // 组件级事件处理（方便模板直接绑定）
  const handlePlayPause = () => {
    if (isPlaying.value) {
      pause()
    } else {
      start(currentGlobalIdx.value)
    }
  }

  const handleStop = () => {
    stop()
  }

  // --------------------------------------------------------------------------
  // 3.8 监听与清理
  // --------------------------------------------------------------------------
  watch(totalCountRef, (newVal) => {
    if (newVal <= 0) stop()
  })

  onUnmounted(() => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    clearBatches()
  })

  // --------------------------------------------------------------------------
  // 3.9 返回接口
  // --------------------------------------------------------------------------
  return {
    // 状态
    isPlaying,
    isPreloading,
    currentIndex: currentGlobalIdx,
    progress,
    hasData,
    canPlay,
    remaining,
    speed,
    speeds: CONFIG.SPEEDS,
    
    // 数据
    currentPoint,
    chartData,
    
    // 控制方法
    start,
    pause,
    resume,
    stop,
    togglePlay,
    setSpeed,
    setIndex,
    jumpTo,
    
    // 模板绑定辅助
    handlePlayPause,
    handleStop,
    
    // 调试用（开发环境）
    _visibleBatches: process.env.NODE_ENV === 'development' ? visibleBatches : undefined,
  }
}