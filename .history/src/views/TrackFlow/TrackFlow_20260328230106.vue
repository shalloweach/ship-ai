<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 模块1: 时间/索引查询 -->
      <TimeSliderPanel
        ref="timeSliderRef"
        :mmsi="currentMmsi"
        :globalMinTs="globalRange.timeMin"
        :globalMaxTs="globalRange.timeMax"
        :globalMinIdx="0"
        :totalPoints="totalPoints"
        :currentStartTs="queryRange.start"
        :currentEndTs="queryRange.end"
        :currentStartIdx="queryRange.startIdx"
        :currentEndIdx="queryRange.endIdx"
        :loading="loading"
        @query="onTimeQuery"
        @params-change="onParamsChange"
      />
      
      <!-- 模块2: 轨迹播放控制 -->
      <PlayerCard
        ref="playerRef"
        :player="player"
        :mmsi="currentMmsi"
        @play-state="onPlayState"
        @speed-change="onSpeedChange"
        @mode-change="onModeChange"
      />
      
      <!-- 模块3: 停留标记 -->
      <MarkCard
        ref="markRef"
        :marker="marker"
        :player="player"
        :loading="loading"
        :mmsi="currentMmsi"
        @mark-state="onMarkState"
        @mark-added="onMarkAdded"
        @marks-submitted="onMarksSubmitted"
      />
      
      <!-- 🛠️ 扩展操作按钮 -->
      <nav class="panel-extensions" role="navigation" aria-label="地图操作">
        <button class="ext-btn" @click="exportTrajectory" :disabled="!hasData || loading">
          <span aria-hidden="true">📥</span><span>导出 CSV</span>
        </button>
        <button class="ext-btn" @click="clearMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🗑️</span><span>清空地图</span>
        </button>
        <button class="ext-btn" @click="centerMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🎯</span><span>居中显示</span>
        </button>
        <button class="ext-btn primary" @click="refreshQuery" :disabled="loading">
          <span aria-hidden="true">🔄</span><span>重新查询</span>
        </button>
      </nav>
      
      <!-- 状态提示 -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>
    </aside>

    <!-- 🗺️ 右侧地图展示区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示" @click="onMapClick">
      
      <!-- 地图容器 -->
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>

      <!-- ⏳ 加载遮罩 -->
      <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>
      
      <!-- ⚠️ 错误提示 -->
      <div v-show="error" class="error-toast map-toast" role="alert">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      </div>
      
      <!-- 📊 数据信息 -->
      <div v-show="hasData && !loading" class="data-info" role="status">
        <span><span aria-hidden="true">📊</span><b>{{ currentPointsCount }}</b> 个轨迹点</span>
        <span v-if="player?.isPlaying?.value">|</span>
        <span v-if="player?.isPlaying?.value"><span aria-hidden="true">▶️</span> 播放中</span>
      </div>
      
      <!-- 🚢 MMSI 标签 -->
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
      
    </section>
    
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'

// 组件导入
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import MarkCard from '@/components/TrackPlayerPanel/MarkCard.vue'

// 工具导入
import { estimateTotalPoints, exportTrajectoryCSV } from '@/api/shipApi'
import { useApi } from './useApi'
import { useMap } from './useMap'

// ========== 状态 ==========
const route = useRoute()
const mapContainerRef = ref(null)
const timeSliderRef = ref(null)
const playerRef = ref(null)
const markRef = ref(null)

// 核心状态
const currentMmsi = ref(route.query.mmsi || '')
const totalPoints = ref(null)  // ✅ 动态总点数
const loading = ref(false)
const error = ref(null)

// 查询范围（与 TimeSliderPanel 同步）
const globalRange = ref({
  timeMin: null,
  timeMax: null
})
const queryRange = ref({
  start: null,
  end: null,
  startIdx: 0,
  endIdx: 1000
})

// 数据状态
const currentPointsCount = ref(0)
const currentPoints = ref([])  // 缓存用于导出

// 计算属性
const hasData = computed(() => currentPointsCount.value > 0)

// ========== 依赖初始化 ==========
let api = null
let map = null

const initDeps = async () => {
  // 初始化 API
  const apiModule = await useApi()
  api = apiModule
  
  // 初始化地图
  if (mapContainerRef.value) {
    map = useMap(mapContainerRef.value)
    await map.init()
  }
  
  // 初始化播放模块（纯前端逻辑）
  player.value = createTrackPlayer({ api, map })
  
  // 初始化标记模块（纯前端逻辑）
  marker.value = createStayMarker({ api, map })
}

// ========== 播放模块（纯前端实现） ==========
const player = ref(null)

const createTrackPlayer = ({ api, map }) => {
  const isPlaying = ref(false)
  const currentIndex = ref(0)
  const playbackSpeed = ref(1)
  const allPoints = ref([])
  
  const canPlay = computed(() => allPoints.value.length > 0 && !loading.value)
  const progress = computed(() => 
    allPoints.value.length ? Math.round(currentIndex.value / allPoints.value.length * 100) : 0
  )
  const currentPoint = computed(() => allPoints.value[currentIndex.value] || null)
  
  let playTimer = null
  
  const loadTrajectory = async (params) => {
    if (!api?.fetchTrajectoryByTime) return { success: false }
    
    try {
      const result = await api.fetchTrajectoryByTime(
        params.mmsi, params.start, params.end, params.limit || 5000
      )
      
      // 解析点数据（适配后端格式）
      const points = (result.points || result.data || []).map((p, idx) => ({
        index: idx,
        timestamp: p.timestamp || p.time,
        lng: p.longitude || p.lng || p.lon,
        lat: p.latitude || p.lat,
        speed: p.speed,
        heading: p.course || p.heading,
        raw: p
      })).filter(p => p.lat && p.lng)
      
      allPoints.value = points
      currentIndex.value = 0
      
      // 渲染到地图
      if (map?.renderTrajectory) {
        map.renderTrajectory(points)
      }
      
      return { success: true, count: points.length }
    } catch (err) {
      console.error('❌ 加载轨迹失败:', err)
      return { success: false, error: err }
    }
  }
  
  const play = () => {
    if (!canPlay.value || isPlaying.value) return
    isPlaying.value = true
    
    const interval = 100 / playbackSpeed.value  // 基础 100ms/点
    
    playTimer = setInterval(() => {
      if (currentIndex.value >= allPoints.value.length - 1) {
        pause()
        return
      }
      
      currentIndex.value++
      const point = allPoints.value[currentIndex.value]
      
      // 更新地图：移动船舶图标
      if (map?.updateShipMarker && point) {
        map.updateShipMarker(point)
      }
    }, interval)
  }
  
  const pause = () => {
    isPlaying.value = false
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = null
    }
  }
  
  const toggle = () => { isPlaying.value ? pause() : play() }
  const stop = () => { pause(); currentIndex.value = 0 }
  
  const setSpeed = (speed) => {
    if ([0.5, 1, 2, 4, 8].includes(speed)) {
      playbackSpeed.value = speed
      if (isPlaying.value) { pause(); play() }
    }
  }
  
  const seekTo = (index) => {
    const target = Math.max(0, Math.min(index, allPoints.value.length - 1))
    currentIndex.value = target
    const point = allPoints.value[target]
    if (map?.updateShipMarker && point) {
      map.updateShipMarker(point)
      map.centerOn?.(point.lat, point.lng)
    }
  }
  
  const clear = () => {
    pause()
    allPoints.value = []
    currentIndex.value = 0
    if (map?.clearTrajectory) map.clearTrajectory()
  }
  
  return {
    isPlaying, currentIndex, playbackSpeed, allPoints, currentPoint,
    canPlay, progress,
    loadTrajectory, play, pause, toggle, stop, setSpeed, seekTo, clear
  }
}

// ========== 标记模块（纯前端实现） ==========
const marker = ref(null)

const createStayMarker = ({ api, map }) => {
  const pendingMarks = ref([])
  const currentMark = ref(null)
  const markMode = ref('idle')  // idle | selecting-start | selecting-end | editing
  
  const isMarking = computed(() => markMode.value !== 'idle')
  const canSaveMark = computed(() => 
    currentMark.value?.startTime && currentMark.value?.endTime && currentMark.value?.stayType
  )
  
  const STAY_TYPES = [
    { value: '靠泊', label: '🏭 靠泊', color: '#10b981' },
    { value: '锚泊', label: '⚓ 锚泊', color: '#3b82f6' },
    { value: '异常', label: '⚠️ 异常', color: '#ef4444' },
    { value: '其他', label: '📦 其他', color: '#6b7280' }
  ]
  
  const DEFAULT_PORTS = ['上海', '宁波', '深圳', '广州', '青岛', '天津', '厦门', '大连', '其他']
  
  // 开始标记
  const startMarking = (point, index) => {
    if (markMode.value !== 'idle') return
    markMode.value = 'selecting-start'
    currentMark.value = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mmsi: currentMmsi.value,
      startPoint: point, startIndex: index, startTime: point?.timestamp,
      endPoint: null, endIndex: null, endTime: null,
      stayType: '靠泊', port: '', note: '',
      status: 'draft'
    }
  }
  
  // 结束标记
  const endMarking = (point, index) => {
    if (markMode.value !== 'selecting-start' || !currentMark.value) return
    currentMark.value = {
      ...currentMark.value,
      endPoint: point, endIndex: index, endTime: point?.timestamp
    }
    markMode.value = 'editing'
  }
  
  // 更新字段
  const updateMarkField = (field, value) => {
    if (currentMark.value) currentMark.value[field] = value
  }
  
  // 添加到待提交列表
  const addPendingMark = () => {
    if (!canSaveMark.value) return false
    
    // 去重
    if (pendingMarks.value.some(m => 
      m.startTime === currentMark.value.startTime && m.endTime === currentMark.value.endTime
    )) {
      return false
    }
    
    pendingMarks.value.push({ ...currentMark.value })
    resetMarkForm()
    return true
  }
  
  // 移除待提交
  const removePendingMark = (id) => {
    const idx = pendingMarks.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      pendingMarks.value.splice(idx, 1)
      return true
    }
    return false
  }
  
  // 更新待提交项
  const updatePendingMark = (id, field, value) => {
    const mark = pendingMarks.value.find(m => m.id === id)
    if (mark) {
      mark[field] = value
      return true
    }
    return false
  }
  
  // 提交到后端
  const submitPendingMarks = async () => {
    if (!api?.submitStayMarks || pendingMarks.value.length === 0) return { success: false }
    
    try {
      // 格式转换：前端 → 后端
      const marksForApi = pendingMarks.value.map(m => ({
        mmsi: m.mmsi,
        startTime: m.startTime,
        endTime: m.endTime,
        stayType: m.stayType,
        port: m.port,
        note: m.note || ''
      }))
      
      const result = await api.submitStayMarks(marksForApi)
      
      // 更新状态
      pendingMarks.value.forEach(m => {
        m.status = 'synced'
        if (result?.ids) m.serverId = result.ids[m.id]
      })
      
      // 绘制到地图
      if (map?.drawStayMarker) {
        pendingMarks.value.forEach(m => {
          if (m.startPoint && m.endPoint) map.drawStayMarker(m)
        })
      }
      
      pendingMarks.value = []
      return { success: true, result }
    } catch (err) {
      console.error('❌ 提交标记失败:', err)
      return { success: false, error: err }
    }
  }
  
  // 取消标记
  const cancelMarking = () => {
    currentMark.value = null
    markMode.value = 'idle'
  }
  
  // 重置
  const resetMarkForm = () => {
    currentMark.value = null
    markMode.value = 'idle'
  }
  
  // 清空
  const clearMarks = () => {
    pendingMarks.value = []
    if (map?.clearStayMarkers) map.clearStayMarkers()
  }
  
  // 导出 CSV（纯前端）
  const exportToCSV = () => {
    if (!pendingMarks.value.length) return
    
    const headers = ['MMSI', '开始时间', '结束时间', '时长(秒)', '类型', '港口', '备注']
    const rows = pendingMarks.value.map(m => [
      m.mmsi,
      new Date(m.startTime * 1000).toLocaleString(),
      new Date(m.endTime * 1000).toLocaleString(),
      m.endTime - m.startTime,
      m.stayType,
      m.port,
      m.note || ''
    ])
    
    const csv = ['\ufeff' + headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `marks_${currentMmsi.value}_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return {
    pendingMarks, currentMark, markMode, isMarking, canSaveMark,
    STAY_TYPES, DEFAULT_PORTS,
    startMarking, endMarking, updateMarkField,
    addPendingMark, removePendingMark, updatePendingMark,
    submitPendingMarks, cancelMarking, resetMarkForm, clearMarks,
    exportToCSV
  }
}

// ========== 事件处理 ==========
const onTimeQuery = async (params) => {
  await handleQuery(params)
}

const onParamsChange = (params) => {
  // 同步查询范围
  queryRange.value = {
    start: params.time?.start,
    end: params.time?.end,
    startIdx: params.index?.start,
    endIdx: params.index?.end
  }
}

const onPlayState = (state) => { /* 可选：同步状态到父组件 */ }
const onSpeedChange = (speed) => { /* 可选 */ }
const onModeChange = (mode) => { /* 可选 */ }
const onMarkState = (state) => { /* 可选 */ }
const onMarkAdded = (mark) => { /* 可选 */ }
const onMarksSubmitted = (result) => { /* 可选 */ }

// 地图点击：用于标记选择
const onMapClick = (e) => {
  if (!marker.value || marker.value.markMode.value === 'idle') return
  
  // 简化：使用当前播放点，实际项目需用 leaflet 计算最近点
  const point = player.value?.currentPoint?.value || player.value?.allPoints?.value?.[0]
  const index = player.value?.currentIndex?.value || 0
  
  if (point) {
    if (marker.value.markMode.value === 'selecting-start') {
      marker.value.startMarking(point, index)
    } else if (marker.value.markMode.value === 'selecting-end') {
      marker.value.endMarking(point, index)
    }
  }
}

// ========== 核心查询 ==========
const handleQuery = async (params) => {
  if (!params?.mmsi || !api?.fetchTrajectoryByTime) {
    error.value = '缺少必要参数'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // 1. 加载轨迹
    const result = await player.value?.loadTrajectory?.({
      mmsi: params.mmsi,
      start: params.time?.start,
      end: params.time?.end,
      limit: params.limit || 5000
    })
    
    if (result?.success) {
      currentMmsi.value = params.mmsi
      currentPoints.value = player.value?.allPoints?.value || []
      currentPointsCount.value = currentPoints.value.length
      
      // 2. 估算总点数（前端计算）
      totalPoints.value = await estimateTotalPoints({
        mmsi: params.mmsi,
        time: { start: params.time?.start, end: params.time?.end }
      })
      
      // 3. 更新全局范围
      if (result.timeRange) {
        globalRange.value = {
          timeMin: result.timeRange.min,
          timeMax: result.timeRange.max
        }
      }
    }
  } catch (err) {
    error.value = err.message || '查询失败'
  } finally {
    loading.value = false
  }
}

// ========== 扩展功能 ==========
const exportTrajectory = () => {
  if (!currentPoints.value.length) return
  exportTrajectoryCSV(currentPoints.value, currentMmsi.value)
}

const clearMap = () => {
  if (map?.clearTrajectory) map.clearTrajectory()
  currentPointsCount.value = 0
  currentPoints.value = []
}

const centerMap = () => {
  if (map?.centerOn && currentPoints.value[0]) {
    const p = currentPoints.value[0]
    map.centerOn(p.lat, p.lng, 12)
  }
}

const refreshQuery = () => {
  if (currentMmsi.value && queryRange.value.start && queryRange.value.end) {
    handleQuery({
      mmsi: currentMmsi.value,
      time: { start: queryRange.value.start, end: queryRange.value.end }
    })
  }
}

// ========== 生命周期 ==========
onMounted(async () => {
  await initDeps()
  
  // 自动查询（如果有 MMSI）
  if (currentMmsi.value) {
    // 默认查询最近 1 小时
    const end = Math.floor(Date.now() / 1000)
    const start = end - 3600
    
    await handleQuery({
      mmsi: currentMmsi.value,
      time: { start, end }
    })
  }
})

onBeforeUnmount(() => {
  if (map?.destroy) map.destroy()
  if (player.value?.clear) player.value.clear()
  if (marker.value?.clearMarks) marker.value.clearMarks()
})

// ========== 暴露方法 ==========
defineExpose({
  refreshQuery,
  setMmsi: (mmsi) => {
    currentMmsi.value = mmsi
    if (mmsi) {
      const end = Math.floor(Date.now() / 1000)
      handleQuery({ mmsi, time: { start: end - 3600, end } })
    }
  },
  getPlayer: () => player.value,
  getMarker: () => marker.value,
  getMap: () => map
})
</script>

<style scoped>
/* ============ 🏗️ 容器布局 ============ */
.track-flow-container {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
}

/* ============ 📋 左侧面板 ============ */
.side-panel {
  width: 400px;
  min-width: 320px;
  max-width: 450px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 0.5rem;
  gap: 0.5rem;
}

.panel-extensions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ext-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.ext-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.ext-btn.primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  border-color: transparent;
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============ 🗺️ 右侧地图 ============ */
.map-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #eef2f7;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* ============ 🎭 浮层 ============ */
.loading-mask,
.error-toast,
.data-info,
.mmsi-tag {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}

.loading-mask {
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.95);
  padding: 1rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: auto;
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-toast {
  top: 1rem; right: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  pointer-events: auto;
  max-width: 300px;
}

.error-toast.map-toast {
  top: auto; bottom: 1rem; left: 1rem; right: auto;
  max-width: none;
}

.data-info {
  bottom: 1rem; left: 1rem;
  background: rgba(255,255,255,0.95);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  pointer-events: auto;
  display: flex; gap: 0.5rem;
}

.mmsi-tag {
  top: 1rem; left: 1rem;
  background: rgba(30, 64, 175, 0.95);
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  pointer-events: auto;
}

/* ============ 📱 响应式 ============ */
@media (max-width: 768px) {
  .track-flow-container { flex-direction: column; }
  .side-panel {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .map-wrapper { height: 50vh; }
  .panel-extensions { flex-wrap: wrap; }
}
</style>