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
  MAX_VISIBLE_BATCHES: 2
}

/**
 * 轨迹播放器 Hook
 * @param {Ref<number>|number} totalCount - 总点数（响应式或普通值）
 * @param {Ref<string>|string} mmsi - 船舶标识
 * @param {Object} mapOp - 地图操作对象
 * @returns {Object} 播放器控制接口
 */
export function useTrackPlayer(totalCount, mmsi, mapOp) {
  // 将传入的 totalCount 和 mmsi 转为响应式 ref（如果还不是的话）
  const totalCountRef = computed(() => typeof totalCount === 'function' ? totalCount() : totalCount)
  const mmsiRef = computed(() => typeof mmsi === 'function' ? mmsi() : mmsi)

  // 响应式状态
  const isPlaying = ref(false)
  const isPreloading = ref(false)
  const currentGlobalIdx = ref(0)        // 当前播放的全局索引
  const speed = ref(CONFIG.DEFAULT_SPEED) // 播放速度
  
  // 数据缓存
  const allPoints = ref([])               // 已加载的所有点（连续）
  const loadedStart = ref(0)              // allPoints[0] 对应的全局索引
  const loadedEnd = ref(-1)               // allPoints[last] 对应的全局索引
  const visibleBatches = ref([])          // 地图上显示的批次元信息
  
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
  const currentPoint = computed(() => {
    const relativeIdx = currentGlobalIdx.value - loadedStart.value
    return allPoints.value[relativeIdx] || null
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
    heading: raw.course ?? raw.heading,
  })

  const getBatchId = (start) => `polyline-batch-${start}`

  // ✅ 修改：renderBatch 支持动态控制 showPoints
  const renderBatch = (points, startIdx, endIdx, showPoints = false) => {
    if (!mapOp?.renderTrajectory || points.length < 2) return null
    const coords = points.map(p => [p.lat, p.lng])
    return mapOp.renderTrajectory(coords, {
      batchId: getBatchId(startIdx),
      showPoints,  // ✅ 支持传入控制
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

  // ✅ 新增：重新渲染当前可见批次，控制点显示状态
  const refreshVisibleBatches = (showPoints) => {
    visibleBatches.value.forEach(batch => {
      // 从 allPoints 中提取该批次对应的点
      const batchStartRel = batch.startIdx - loadedStart.value
      const batchEndRel = batch.endIdx - loadedStart.value
      const batchPoints = allPoints.value.slice(batchStartRel, batchEndRel + 1)
      
      if (batchPoints.length >= 2) {
        // 先移除旧的，再用新配置渲染
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
        // 首次加载
        allPoints.value = points
        loadedStart.value = start
        loadedEnd.value = start + points.length - 1
        renderBatch(points, start, loadedEnd.value, false)  // 默认不显示点
        manageBatches(start)
      } else if (isPreload) {
        // 预加载追加
        allPoints.value.push(...points)
        loadedEnd.value = start + points.length - 1
        renderBatch(points, start, loadedEnd.value, false)  // 默认不显示点
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
        // 下一个点
        currentGlobalIdx.value++
        updateMarker()
        if (needPreload.value && !isPreloading.value) preloadNext()
      } else if (loadedEnd.value < totalCountRef.value - 1) {
        // 当前批次播完，加载下一批
        preloadNext().then(() => {
          if (allPoints.value.length && isPlaying.value) {
            // 继续播放（相对索引不变，但 allPoints 已增长）
            animate()
          } else {
            stop()
          }
        })
      } else {
        // 全部播完
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

  // ✅ 修改：暂停时显示当前批次的所有点
  const pause = () => {
    isPlaying.value = false
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = null
    }
    // 🎯 暂停时：重新渲染可见批次，显示点标记
    refreshVisibleBatches(true)
  }

  // ✅ 新增：恢复播放时隐藏点标记
  const resume = () => {
    if (isPlaying.value) return
    // 恢复播放前：隐藏点标记，保持界面清爽
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

  const setSpeed = (newSpeed) => {
    if (CONFIG.SPEEDS.includes(newSpeed)) speed.value = newSpeed
  }

  const togglePlay = (fromIndex) => {
    if (isPlaying.value) {
      pause()
    } else {
      const idx = fromIndex !== undefined ? fromIndex : currentGlobalIdx.value
      start(idx)
    }
  }

  // ✅ 新增：跳转到指定轨迹点索引（支持地图点击）
  const jumpTo = async (globalIdx, options = {}) => {
    const { keepPlaying = false } = options
    const targetIdx = Math.min(
      Math.max(0, globalIdx), 
      totalCountRef.value - 1
    )
    
    // 清除暂停时显示的点标记（避免重复）
    refreshVisibleBatches(false)
    
    // 检查目标索引是否在已加载范围内
    const relativeIdx = targetIdx - loadedStart.value
    const isInLoadedRange = relativeIdx >= 0 && relativeIdx < allPoints.value.length
    
    if (!isInLoadedRange) {
      // 🔄 需要加载包含目标索引的新批次
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
    
    // 🎯 更新当前播放位置
    currentGlobalIdx.value = targetIdx
    
    // 🗺️ 更新地图船舶标记
    updateMarker()
    
    // 🎬 处理播放状态
    if (keepPlaying && !isPlaying.value) {
      resume()
    } else if (!keepPlaying) {
      // 跳转后默认暂停，并显示当前批次的点
      isPlaying.value = false
      refreshVisibleBatches(true)
    }
    
    return true
  }

  // 监听 totalCount 变化自动重置
  watch(totalCountRef, (newVal) => {
    if (newVal <= 0) stop()
  })

  // 组件卸载时清理
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
    // 方法
    start,
    pause,
    stop,
    togglePlay,
    setSpeed,
    // ✅ 新增方法
    jumpTo,    // 跳转到指定索引（支持地图点击）
    resume,    // 恢复播放（隐藏点标记）
    // 内部调试（可选）
    _visibleBatches: visibleBatches,
  }
}