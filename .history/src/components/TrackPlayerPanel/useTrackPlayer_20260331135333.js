// composables/useTrackPlayer.js
import { ref, computed, watch, onUnmounted } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

// 常量配置
const CONFIG = {
  BATCH_SIZE: 1000,
  PRELOAD_RATIO: 0.1,
  SPEEDS: [0.5, 1, 2, 4, 8],
  DEFAULT_SPEED: 1,
  MIN_FRAME_MS: 16,
  BASE_INTERVAL_MS: 50,
  MAX_VISIBLE_BATCHES: 2,
  // ✅ 新增：折线图可视窗口大小（显示当前点前后各多少点）
  CHART_WINDOW_SIZE: 100
}

/**
 * 轨迹播放器 Hook
 * @param {Ref<number>|number} totalCount - 总点数
 * @param {Ref<string>|string} mmsi - 船舶标识
 * @param {Object} mapOp - 地图操作对象
 * @returns {Object} 播放器控制接口
 */
export function useTrackPlayer(totalCount, mmsi, mapOp) {

  // 参数获取***********************************************************************************************************
  const setIndex = () => {
    const max = Math.max(0, props.totalCount - 1)
    if (localStartIndex.value < 0) localStartIndex.value = 0
    if (localStartIndex.value > max) localStartIndex.value = max
  }
  const setSpeed = (newSpeed) => {
    if (CONFIG.SPEEDS.includes(newSpeed)) speed.value = newSpeed
  }
  
  
  
  
  const totalCountRef = computed(() => typeof totalCount === 'function' ? totalCount() : totalCount)
  const mmsiRef = computed(() => typeof mmsi === 'function' ? mmsi() : mmsi)

  // 响应式状态
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

  // 计算属性
  const hasData = computed(() => allPoints.value.length > 0)
  const canPlay = computed(() => totalCountRef.value > 0 && !isPreloading.value)
  const progress = computed(() => {
    if (totalCountRef.value === 0) return 0
    return ((currentGlobalIdx.value + 1) / totalCountRef.value) * 100
  })
  const remaining = computed(() => Math.max(0, totalCountRef.value - currentGlobalIdx.value - 1))
  
  // ✅ 当前点完整信息（含 navigationstatus, destination 等）
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
      // 原始数据备用
      raw: point.raw
    }
  })
  
  // ✅ 折线图数据：当前可视窗口内的点（用于绘制 speed/course/draught）
  const chartData = computed(() => {
    if (allPoints.value.length === 0) return { speed: [], course: [], draught: [], currentIdx: null }
    
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
      xRange: { min: slice[0]?.idx ?? 0, max: slice[slice.length - 1]?.idx ?? 0 }
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

  // 工具函数
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
    raw // 保留原始数据
  })

  const getBatchId = (start) => `polyline-batch-${start}`

  // renderBatch 支持动态控制 showPoints
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

  // 重新渲染当前可见批次，控制点显示状态
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

  // 数据加载
  const loadBatch = async (start, end, isPreload = false) => {
    const currentMmsi = mmsiRef.value
    if (!currentMmsi || start > end) return false
    try {
      const res = await getTrajectoryByIndex(currentMmsi, start, end)
      if (!res?.points?.length) return false

      const points = res.points.map((p, i) => parsePoint(p, start + i))

      if (allPoints.value.length === 0 && !isPreload) {
        allPoints.value = points
        loadedStart.value = start
        loadedEnd.value = start + points.length - 1
        renderBatch(points, start, loadedEnd.value, false)
        manageBatches(start)
      } else if (isPreload) {
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

  // 标记更新
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

  // 播放循环
  const getFrameInterval = () => Math.max(CONFIG.MIN_FRAME_MS, CONFIG.BASE_INTERVAL_MS / speed.value)

  const animate = () => {
    if (!isPlaying.value) return
    const now = performance.now()
    const elapsed = now - lastTimestamp
    if (elapsed >= getFrameInterval()) {
      lastTimestamp = now

      const relativeIdx = currentGlobalIdx.value - loadedStart.value
      if (relativeIdx < allPoints.value.length - 1) {
        currentGlobalIdx.value++
        updateMarker()
        if (needPreload.value && !isPreloading.value) preloadNext()
      } else if (loadedEnd.value < totalCountRef.value - 1) {
        preloadNext().then(() => {
          if (allPoints.value.length && isPlaying.value) {
            animate()
          } else {
            stop()
          }
        })
      } else {
        stop()
      }
    }
    if (isPlaying.value) animFrame = requestAnimationFrame(animate)
  }

  // 控制方法
  const start = async (fromGlobalIdx = 0) => {
    if (!canPlay.value || isPlaying.value) return false
    const safeStart = Math.min(Math.max(0, fromGlobalIdx), totalCountRef.value - 1)
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

  // 暂停时显示当前批次的所有点
  const pause = () => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    refreshVisibleBatches(true)
  }

  // 恢复播放时隐藏点标记
  const resume = () => {
    if (isPlaying.value) return
    refreshVisibleBatches(false)
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

  // 跳转到指定轨迹点索引
  const jumpTo = async (globalIdx, options = {}) => {
    const { keepPlaying = false } = options
    const targetIdx = Math.min(Math.max(0, globalIdx), totalCountRef.value - 1)
    
    refreshVisibleBatches(false)
    
    const relativeIdx = targetIdx - loadedStart.value
    const isInLoadedRange = relativeIdx >= 0 && relativeIdx < allPoints.value.length
    
    if (!isInLoadedRange) {
      const batchStart = Math.max(0, targetIdx - Math.floor(CONFIG.BATCH_SIZE / 2))
      const batchEnd = Math.min(totalCountRef.value - 1, batchStart + CONFIG.BATCH_SIZE - 1)
      
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

  // 监听 totalCount 变化
  watch(totalCountRef, (newVal) => {
    if (newVal <= 0) stop()
  })

  // 组件卸载清理
  onUnmounted(() => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    clearBatches()
  })

  // 暴露接口
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
    // ✅ 新增：当前点详情 + 图表数据
    currentPoint,
    chartData,
    // 方法
    start,
    pause,
    stop,
    togglePlay,
    setSpeed,
    jumpTo,
    resume,
    // 调试
    _visibleBatches: visibleBatches,
  }
}