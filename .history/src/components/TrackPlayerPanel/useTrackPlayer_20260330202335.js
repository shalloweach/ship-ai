import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

// 常量配置
const BATCH_SIZE = 1000
const PRELOAD_RATIO = 0.1
const SPEEDS = [0.5, 1, 2, 4, 8]
const DEFAULT_SPEED = 1
const MIN_FRAME_MS = 16
const BASE_INTERVAL_MS = 50
const MAX_VISIBLE_BATCHES = 2

// UI 状态
const startIndex = ref(0)
const speed = ref(DEFAULT_SPEED)

// 播放核心状态
const isPlaying = ref(false)
const isPreloading = ref(false)
const currentGlobalIdx = ref(0) // 当前全局索引
const allPoints = ref([])       // 已加载的点数组
const loadedStart = ref(0)      // allPoints[0] 对应的全局索引
const loadedEnd = ref(-1)       // allPoints[last] 对应的全局索引
const visibleBatches = ref([])  // 地图上的批次元信息

let animFrame = null
let lastTimestamp = 0

// 计算属性
const hasData = computed(() => allPoints.value.length > 0)
const canPlay = computed(() => props.totalCount > 0 && !isPreloading.value)
const progress = computed(() =>
  props.totalCount > 0 ? ((currentGlobalIdx.value + 1) / props.totalCount) * 100 : 0
)
const remaining = computed(() => Math.max(0, props.totalCount - currentGlobalIdx.value - 1))
const currentPoint = computed(() => allPoints.value[currentGlobalIdx.value - loadedStart.value])

// 预加载判断
const needPreload = computed(() => {
  const loadedCount = allPoints.value.length
  const remainingBuffer = loadedCount - (currentGlobalIdx.value - loadedStart.value)
  const hasMore = loadedEnd.value < props.totalCount - 1
  const threshold = Math.max(10, Math.floor(loadedCount * PRELOAD_RATIO))
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

const renderBatch = (points, startIdx, endIdx) => {
  if (!props.mapOp?.renderTrajectory || points.length < 2) return null
  const coords = points.map(p => [p.lat, p.lng])
  return props.mapOp.renderTrajectory(coords, {
    batchId: getBatchId(startIdx),
    showPoints: false,
    lineStyle: { color: '#3b82f6', width: 2, opacity: 0.85 },
    fitBounds: false,
  })
}

const removeBatch = (startIdx) => {
  props.mapOp?.removePolyline?.(getBatchId(startIdx))
}

const manageBatches = (newStartIdx) => {
  const newBatch = {
    startIdx: newStartIdx,
    endIdx: Math.min(newStartIdx + BATCH_SIZE - 1, props.totalCount - 1),
  }
  if (!visibleBatches.value.some(b => b.startIdx === newStartIdx)) {
    visibleBatches.value.push(newBatch)
  }
  while (visibleBatches.value.length > MAX_VISIBLE_BATCHES) {
    const oldest = visibleBatches.value.shift()
    removeBatch(oldest.startIdx)
  }
}

const clearBatches = () => {
  visibleBatches.value.forEach(b => removeBatch(b.startIdx))
  visibleBatches.value = []
}

// 数据加载
const loadBatch = async (start, end, isPreload = false) => {
  if (!props.mmsi || start > end) return false
  try {
    const res = await getTrajectoryByIndex(props.mmsi, start, end)
    if (!res?.points?.length) return false

    const points = res.points.map((p, i) => parsePoint(p, start + i))

    if (allPoints.value.length === 0 && !isPreload) {
      // 首次加载
      allPoints.value = points
      loadedStart.value = start
      loadedEnd.value = start + points.length - 1
      renderBatch(points, start, loadedEnd.value)
      manageBatches(start)
    } else if (isPreload) {
      // 预加载追加
      allPoints.value.push(...points)
      loadedEnd.value = start + points.length - 1
      renderBatch(points, start, loadedEnd.value)
      manageBatches(start)
    }
    return true
  } catch (err) {
    console.error('加载轨迹失败:', err)
    return false
  }
}

const preloadNext = async () => {
  if (isPreloading.value || loadedEnd.value >= props.totalCount - 1) return
  isPreloading.value = true
  const nextStart = loadedEnd.value + 1
  const nextEnd = Math.min(props.totalCount - 1, nextStart + BATCH_SIZE - 1)
  await loadBatch(nextStart, nextEnd, true)
  isPreloading.value = false
}

// 标记更新
const updateMarker = () => {
  const p = currentPoint.value
  if (p && props.mapOp?.updateShipMarker) {
    props.mapOp.updateShipMarker({
      lng: p.lng,
      lat: p.lat,
      heading: p.heading,
      timestamp: p.timestamp,
      idx: p.idx,
    })
  }
}

// 播放控制
const getFrameInterval = () =>
  Math.max(MIN_FRAME_MS, BASE_INTERVAL_MS / speed.value)

const animate = () => {
  if (!isPlaying.value) return
  const now = performance.now()
  const elapsed = now - lastTimestamp
  if (elapsed >= getFrameInterval()) {
    lastTimestamp = now

    const relativeIdx = currentGlobalIdx.value - loadedStart.value
    if (relativeIdx < allPoints.value.length - 1) {
      // 移动到下一个点
      currentGlobalIdx.value++
      updateMarker()
      if (needPreload.value && !isPreloading.value) preloadNext()
    } else if (loadedEnd.value < props.totalCount - 1) {
      // 当前批次播完，加载下一批
      preloadNext().then(() => {
        if (allPoints.value.length && isPlaying.value) {
          // 调整相对位置，继续播放
          const newRelative = currentGlobalIdx.value - loadedStart.value
          if (newRelative < allPoints.value.length) {
            animate()
          } else {
            stop()
          }
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

const start = async (fromIdx = 0) => {
  if (!canPlay.value || isPlaying.value) return false
  const safeStart = Math.min(Math.max(0, fromIdx), props.totalCount - 1)
  const batchStart = safeStart
  const batchEnd = Math.min(props.totalCount - 1, batchStart + BATCH_SIZE - 1)

  const ok = await loadBatch(batchStart, batchEnd)
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
}

const stop = () => {
  pause()
  clearBatches()
  allPoints.value = []
  loadedStart.value = 0
  loadedEnd.value = -1
  currentGlobalIdx.value = 0
  if (props.mapOp?.removeShipMarker) props.mapOp.removeShipMarker()
}

const togglePlay = () => {
  if (isPlaying.value) {
    pause()
  } else {
    const idx = startIndex.value
    start(idx)
  }
}

// 监听 totalCount 重置
watch(() => props.totalCount, (val) => {
  if (val <= 0) stop()
})

// 监听速度变化（实时生效，无需额外处理，动画循环会使用新速度）
watch(speed, (val) => {
  // 速度改变立即生效，无需额外动作
})

// 清理
onUnmounted(() => {
  pause()
  clearBatches()
})