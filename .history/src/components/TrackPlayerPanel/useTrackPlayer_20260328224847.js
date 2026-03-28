// src/components/TrackPlayerPanel/useTrackPlayer.js
import { ref, computed, watch, onUnmounted } from 'vue'
import { PLAYER_CONFIG } from '../config'

export function useTrackPlayer(props, emit, deps) {
  const { fetchTrajectoryByTime } = deps.api
  const { renderTrajectory, updateShipMarker, clearTrajectory } = deps.map

  // ========== 播放状态 ==========
  const isPlaying = ref(false)
  const currentIndex = ref(0)
  const playbackSpeed = ref(PLAYER_CONFIG.DEFAULT_SPEED)
  const playMode = ref(PLAYER_CONFIG.DEFAULT_MODE)
  
  // 轨迹数据
  const allPoints = ref([])
  const displayedPoints = ref([])
  
  // 预加载控制
  const nextBatchStart = ref(null)
  const isPreloading = ref(false)
  
  let playTimer = null

  // ========== 计算属性 ==========
  const hasData = computed(() => allPoints.value.length > 0)
  const canPlay = computed(() => hasData.value && !props.loading)
  const remainingPoints = computed(() => allPoints.value.length - currentIndex.value)
  const progress = computed(() => {
    if (allPoints.value.length === 0) return 0
    return Math.round((currentIndex.value / allPoints.value.length) * 100)
  })
  const currentPoint = computed(() => allPoints.value[currentIndex.value] || null)
  const needPreload = computed(() => 
    remainingPoints.value <= PLAYER_CONFIG.PRELOAD_THRESHOLD && 
    nextBatchStart.value && !isPreloading.value
  )

  // ========== 数据加载 ==========
  const loadTrajectory = async (params) => {
    const { mmsi, start, end, batchSize = PLAYER_CONFIG.BATCH_SIZE } = params
    if (!mmsi || !start || !end) return { success: false, error: '缺少参数' }
    
    try {
      const result = await fetchTrajectoryByTime(mmsi, start, end, batchSize)
      const points = parsePoints(result.data || result, params.startIndex || 0)
      
      allPoints.value = points
      displayedPoints.value = points
      currentIndex.value = 0
      
      // 设置预加载锚点
      if (points.length >= batchSize) {
        nextBatchStart.value = points[points.length - 1].timestamp + 1
      } else {
        nextBatchStart.value = null
      }
      
      // 渲染地图
      if (deps.map.isMapReady.value) {
        renderTrajectory(points, { fitBounds: true })
        if (points[0]) deps.map.centerOn(points[0].lat, points[0].lng, 12)
      }
      
      emit('data-loaded', { count: points.length, range: { start, end } })
      return { success: true, count: points.length }
      
    } catch (err) {
      console.error('❌ 加载轨迹失败:', err)
      emit('load-error', { error: err })
      return { success: false, error: err }
    }
  }

  const parsePoints = (raw, offset = 0) => {
    return (raw || []).map((p, idx) => ({
      index: offset + idx,
      timestamp: p.timestamp || p.time || p.ts,
      lng: p.longitude || p.lng || p.lon,
      lat: p.latitude || p.lat,
      speed: p.speed || p.sog,
      heading: p.heading || p.cog || 0,
      raw: p
    })).filter(p => p.lat != null && p.lng != null && p.timestamp != null)
  }

  // ========== 播放控制 ==========
  const play = () => {
    if (!canPlay.value || isPlaying.value) return
    isPlaying.value = true
    
    if (playMode.value === 'point-by-point') {
      startPointByPoint()
    } else {
      startLineFirst()
    }
  }

  const pause = () => {
    isPlaying.value = false
    if (playTimer) { clearInterval(playTimer); playTimer = null }
    emit('play-state', { playing: false, index: currentIndex.value })
  }

  const toggle = () => { isPlaying.value ? pause() : play() }
  const stop = () => { pause(); currentIndex.value = 0; emit('play-seek', { index: 0 }) }

  const setSpeed = (speed) => {
    if (PLAYER_CONFIG.SPEEDS.includes(speed)) {
      playbackSpeed.value = speed
      if (isPlaying.value) { pause(); play() }
      emit('speed-change', { speed })
    }
  }

  const setMode = (mode) => {
    if (Object.values(PLAYER_CONFIG.MODES).includes(mode)) {
      playMode.value = mode
      emit('mode-change', { mode })
    }
  }

  // 模式1: 逐点显示
  const startPointByPoint = () => {
    const interval = PLAYER_CONFIG.BASE_INTERVAL / playbackSpeed.value
    emit('play-mode-change', { mode: 'point-by-point' })
    
    playTimer = setInterval(() => {
      if (currentIndex.value >= allPoints.value.length - 1) { pause(); emit('play-complete'); return }
      
      currentIndex.value++
      const point = allPoints.value[currentIndex.value]
      
      if (deps.map.isMapReady.value && point) {
        updateShipMarker(point, { animate: true, duration: interval })
      }
      
      emit('play-point', {
        index: currentIndex.value, point,
        progress: progress.value,
        visibleRange: { start: 0, end: currentIndex.value }
      })
      
      if (needPreload.value) preloadNextBatch()
    }, interval)
  }

  // 模式2: 先画线，船移动
  const startLineFirst = () => {
    if (allPoints.value.length < 2) return
    emit('play-mode-change', { mode: 'line-first', fullLine: true })
    
    const first = allPoints.value[0], last = allPoints.value[allPoints.value.length - 1]
    const totalDuration = last.timestamp - first.timestamp
    const baseDuration = 10000
    const animationDuration = Math.max(2000, baseDuration / playbackSpeed.value)
    
    let startTime = null, animationFrame = null
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const p = Math.min(elapsed / animationDuration, 1)
      
      const floatIdx = p * (allPoints.value.length - 1)
      const lower = Math.floor(floatIdx), upper = Math.min(lower + 1, allPoints.value.length - 1)
      const ratio = floatIdx - lower
      
      const lowerPt = allPoints.value[lower], upperPt = allPoints.value[upper]
      const interpolated = {
        lng: lowerPt.lng + (upperPt.lng - lowerPt.lng) * ratio,
        lat: lowerPt.lat + (upperPt.lat - lowerPt.lat) * ratio,
        timestamp: lowerPt.timestamp + (upperPt.timestamp - lowerPt.timestamp) * ratio,
        heading: lowerPt.heading + (upperPt.heading - lowerPt.heading) * ratio,
        ...lowerPt
      }
      
      if (deps.map.isMapReady.value) {
        updateShipMarker(interpolated, { animate: false })
      }
      
      emit('play-point', {
        index: floatIdx, point: interpolated, isInterpolated: true,
        progress: p * 100, visibleRange: { start: 0, end: allPoints.value.length - 1 }
      })
      
      if (p < 1 && isPlaying.value) {
        animationFrame = requestAnimationFrame(animate)
      } else { pause() }
    }
    
    animationFrame = requestAnimationFrame(animate)
  }

  // 预加载下一批
  const preloadNextBatch = async () => {
    if (!nextBatchStart.value || isPreloading.value || !props.queryRange?.end) return
    isPreloading.value = true
    
    try {
      const result = await fetchTrajectoryByTime(
        props.mmsi, nextBatchStart.value, props.queryRange.end, PLAYER_CONFIG.BATCH_SIZE
      )
      const newPoints = parsePoints(result.data || result, allPoints.value.length)
      
      if (newPoints.length > 0) {
        allPoints.value = [...allPoints.value, ...newPoints]
        nextBatchStart.value = newPoints.length >= PLAYER_CONFIG.BATCH_SIZE 
          ? newPoints[newPoints.length - 1].timestamp + 1 : null
        emit('data-appended', { count: newPoints.length, total: allPoints.value.length })
      }
    } catch (err) {
      console.warn('⚠️ 预加载失败:', err)
    } finally {
      isPreloading.value = false
    }
  }

  // 跳转指定点
  const seekTo = (index) => {
    const target = Math.max(0, Math.min(index, allPoints.value.length - 1))
    currentIndex.value = target
    const point = allPoints.value[target]
    if (deps.map.isMapReady.value && point) {
      updateShipMarker(point)
      deps.map.centerOn(point.lat, point.lng)
    }
    emit('play-seek', { index: target, point })
  }

  // 清空
  const clear = () => {
    pause()
    allPoints.value = []
    displayedPoints.value = []
    currentIndex.value = 0
    nextBatchStart.value = null
    if (deps.map.isMapReady.value) clearTrajectory()
  }

  // 清理
  onUnmounted(() => {
    pause()
    if (playTimer) clearInterval(playTimer)
  })

  return {
    // 状态
    isPlaying, currentIndex, playbackSpeed, playMode,
    allPoints, currentPoint, progress, hasData, canPlay, remainingPoints,
    // 方法
    loadTrajectory, play, pause, toggle, stop, setSpeed, setMode, seekTo, clear,
    // 暴露
    expose: {
      play, pause, toggle, stop, setSpeed, setMode, seekTo, clear,
      loadTrajectory, getPoints: () => allPoints.value,
      getCurrentIndex: () => currentIndex.value
    }
  }
}