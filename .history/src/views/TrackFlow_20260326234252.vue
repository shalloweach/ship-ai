<template>
  <div class="track-flow-container">
    
    <!-- 左侧查询面板 -->
    <div class="side-panel">
      <TimeSlider 
        :mmsi="currentMmsi"
        :globalMinTs="globalRange.time.min"
        :globalMaxTs="globalRange.time.max"
        :globalMinIdx="globalRange.index.min"
        :globalMaxIdx="globalRange.index.max"
        :currentStartTs="queryRange.time.start"
        :currentEndTs="queryRange.time.end"
        :currentStartIdx="queryRange.index.start"
        :currentEndIdx="queryRange.index.end"
        :loading="loading"
        @query="onQuery"
      />
      
      <!-- 扩展按钮区域 -->
      <div class="panel-extensions">
        <button class="ext-btn" @click="exportTrajectory" :disabled="!hasData || loading">
          📥 导出 CSV
        </button>
        <button class="ext-btn" @click="clearMap" :disabled="!hasData || loading">
          🗑️ 清空地图
        </button>
        <button class="ext-btn" @click="centerMap" :disabled="!hasData || loading">
          🎯 居中显示
        </button>
        <button class="ext-btn primary" @click="refreshQuery" :disabled="loading">
          🔄 重新查询
        </button>
      </div>
    </div>

    <!-- 右侧地图区域 -->
    <div class="map-wrapper">
      <!-- 地图容器：key 确保 MMSI 变化时重建 -->
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
      ></div>

      <!-- 加载遮罩：使用 v-show 避免 DOM 冲突 -->
      <div v-show="loading" class="loading-mask">
        <div class="spinner"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>

      <!-- 错误提示 -->
      <div v-show="error" class="error-toast" @click="error = null">
        ⚠️ {{ error }} <span class="close-hint">（点击关闭）</span>
      </div>

      <!-- 数据信息 -->
      <div v-show="hasData && !loading" class="data-info">
        <span>📊 {{ currentPointsCount }} 个轨迹点</span>
        <span v-if="queryRange.time.start && queryRange.time.end">
          | 🕐 {{ formatDuration(queryRange.time.end - queryRange.time.start) }}
        </span>
      </div>

      <!-- MMSI 标签 -->
      <div class="mmsi-tag">
        🚢 MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import TimeSlider from '../components/layout/TimeSlider.vue'

// ==================== 状态定义 ====================
const route = useRoute()
const router = useRouter()
const mapContainerRef = ref(null)

let map = null
let markersLayer = null
let trajectoryLayer = null
let currentPoints = []  // 缓存当前点数据用于导出

const currentMmsi = ref('')
const globalRange = ref({
  time: { min: null, max: null },
  index: { min: 0, max: 10000 }
})
const queryRange = ref({
  time: { start: null, end: null },
  index: { start: 0, end: 1000 }
})

const loading = ref(false)
const error = ref(null)
const currentPointsCount = ref(0)

// 防重复查询标志
const isQuerying = ref(false)

// 计算属性
const hasData = computed(() => currentPointsCount.value > 0)

// ==================== 初始化 ====================
onMounted(async () => {
  await nextTick()
  
  // 获取 MMSI（路由 > localStorage > 默认）
  const mmsi = route.query.mmsi || localStorage.getItem('currentMmsi')
  currentMmsi.value = mmsi
  
  if (mapContainerRef.value) {
    initMap()
  }
  
  // 自动查询
  if (currentMmsi.value) {
    doQuery({
      mmsi: currentMmsi.value,
      mode: 'index',
      index: { start: 0, end: 1000 }
    })
  }
})

onBeforeUnmount(() => {
  cleanupMap()
})

// 监听路由 MMSI 变化
watch(() => route.query.mmsi, async (newMmsi) => {
  if (newMmsi && newMmsi !== currentMmsi.value) {
    await handleMmsiChange(newMmsi)
  }
})

// 监听 localStorage 中的 MMSI 变化（跨标签页同步）
watch(() => localStorage.getItem('currentMmsi'), (newMmsi) => {
  if (newMmsi && newMmsi !== currentMmsi.value && !route.query.mmsi) {
    handleMmsiChange(newMmsi)
  }
})

// ==================== 地图操作 ====================
const initMap = () => {
  if (!mapContainerRef.value) {
    console.error('❌ 地图容器未找到')
    return
  }
  
  // 创建地图实例
  map = L.map(mapContainerRef.value, {
    center: [22.52, 113.83],
    zoom: 10,
    zoomControl: true,
    attributionControl: true
  })
  
  // 添加底图
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map)
  
  // 初始化图层
  markersLayer = L.layerGroup().addTo(map)
  trajectoryLayer = L.polyline([], { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  }).addTo(map)
  
  // 地图加载后调整尺寸
  setTimeout(() => {
    if (map) map.invalidateSize()
  }, 100)
  
  console.log('🗺️ 地图初始化完成')
}

const cleanupMap = () => {
  if (map) {
    if (markersLayer) {
      map.removeLayer(markersLayer)
      markersLayer = null
    }
    if (trajectoryLayer) {
      map.removeLayer(trajectoryLayer)
      trajectoryLayer = null
    }
    map.remove()
    map = null
  }
  currentPoints = []
}

const handleMmsiChange = async (newMmsi) => {
  currentMmsi.value = newMmsi
  localStorage.setItem('currentMmsi', newMmsi)
  
  // 清理旧地图
  cleanupMap()
  
  // 等待 DOM 更新
  await nextTick()
  
  // 重新初始化
  if (mapContainerRef.value) {
    initMap()
  }
  
  // 重置查询范围
  resetQueryRange()
  
  // 执行新查询
  doQuery({
    mmsi: newMmsi,
    mode: 'index',
    index: { start: 0, end: 1000 }
  })
}

// ==================== 查询逻辑 ====================
const resetQueryRange = () => {
  globalRange.value = {
    time: { min: null, max: null },
    index: { min: 0, max: 10000 }
  }
  queryRange.value = {
    time: { start: null, end: null },
    index: { start: 0, end: 1000 }
  }
  currentPointsCount.value = 0
  currentPoints = []
}

const onQuery = async (params) => {
  if (isQuerying.value) {
    console.log('⚠️ 查询进行中，忽略重复请求')
    return
  }
  await doQuery(params)
}

const doQuery = async (params) => {
  if (!params?.mmsi) {
    error.value = 'MMSI 不能为空'
    return
  }
  
  isQuerying.value = true
  loading.value = true
  error.value = null
  
  try {
    const { apiUrl, apiParams } = buildApiRequest(params)
    
    console.log(`🔍 请求：${apiUrl}`, apiParams)
    const res = await axios.get(apiUrl, { params: apiParams, timeout: 30000 })
    const data = res.data
    
    // 解析数据
    const points = parsePoints(data.points || [])
    
    if (points.length === 0) {
      error.value = '📭 未找到轨迹数据，请调整查询范围或更换 MMSI'
      clearMapLayers()
      currentPointsCount.value = 0
      return
    }
    
    // 更新全局范围
    updateGlobalRange(data, points)
    
    // 更新查询范围回显
    updateQueryRangeEcho(data, params)
    
    // 渲染地图
    renderTrajectory(points)
    
    // 缓存数据
    currentPoints = points
    currentPointsCount.value = points.length
    
    console.log(`✅ 加载 ${points.length} 个轨迹点`)
    
  } catch (err) {
    console.error('❌ 查询失败:', err)
    error.value = buildErrorMessage(err)
    clearMapLayers()
    currentPointsCount.value = 0
  } finally {
    // ✅ 确保状态重置
    loading.value = true
    isQuerying.value = false
  }
}

// 构建 API 请求
const buildApiRequest = (params) => {
  const baseUrl = 'http://localhost:8877/api/ship'
  
  if (params.mode === 'time' && params.time?.start && params.time?.end) {
    return {
      apiUrl: `${baseUrl}/byTime`,
      apiParams: {
        mmsi: params.mmsi,
        start: params.time.start,
        end: params.time.end
      }
    }
  } else {
    return {
      apiUrl: `${baseUrl}/byIndex`,
      apiParams: {
        mmsi: params.mmsi,
        startIdx: params.index?.start ?? 0,
        endIdx: params.index?.end ?? 1000
      }
    }
  }
}

// 解析点数据
const parsePoints = (rawPoints) => {
  return rawPoints
    .map(p => ({
      idx: Number(p.idx) ?? 0,
      lat: Number(p.lat) ?? Number(p.latitude) ?? 0,
      lon: Number(p.lon) ?? Number(p.longitude) ?? Number(p.lng) ?? 0,
      timestamp: Number(p.utc_time) ?? Number(p.timestamp) ?? 0,
      speed: p.speed !== undefined ? Number(p.speed) : null,
      course: p.course !== undefined ? Number(p.course) : null,
      heading: p.heading !== undefined ? Number(p.heading) : null,
      destination: p.destination || '-',
      draught: p.draught !== undefined ? Number(p.draught) : null,
      navigationStatus: p.navigationstatus || p.navigation_status || '-',
      _raw: p
    }))
    .filter(p => p.lat && p.lon && !isNaN(p.lat) && !isNaN(p.lon))
}

// 更新全局范围
const updateGlobalRange = (apiResponse, points) => {
  // 时间范围
  if (apiResponse.startTime !== undefined && apiResponse.endTime !== undefined) {
    const { min, max } = globalRange.value.time
    globalRange.value.time.min = min === null 
      ? apiResponse.startTime 
      : Math.min(min, apiResponse.startTime)
    globalRange.value.time.max = max === null 
      ? apiResponse.endTime 
      : Math.max(max, apiResponse.endTime)
  }
  
  // 索引范围
  if (apiResponse.startIdx !== undefined && apiResponse.endIdx !== undefined) {
    const { min, max } = globalRange.value.index
    globalRange.value.index.min = Math.min(min, apiResponse.startIdx)
    globalRange.value.index.max = Math.max(max, apiResponse.endIdx)
  }
  
  // 从 points 兜底推算
  if (points.length > 0) {
    const timestamps = points.map(p => p.timestamp).filter(t => t && t > 0)
    const indices = points.map(p => p.idx).filter(i => i !== undefined)
    
    if (timestamps.length > 0 && globalRange.value.time.min === null) {
      globalRange.value.time.min = Math.min(...timestamps)
      globalRange.value.time.max = Math.max(...timestamps)
    }
    if (indices.length > 0) {
      globalRange.value.index.min = Math.min(globalRange.value.index.min, Math.min(...indices))
      globalRange.value.index.max = Math.max(globalRange.value.index.max, Math.max(...indices))
    }
  }
}

// 更新查询范围回显
const updateQueryRangeEcho = (apiResponse, requestParams) => {
  if (apiResponse.startTime !== undefined) {
    queryRange.value.time.start = apiResponse.startTime
    queryRange.value.time.end = apiResponse.endTime
  } else if (requestParams.time?.start) {
    queryRange.value.time.start = requestParams.time.start
    queryRange.value.time.end = requestParams.time.end
  }
  
  if (apiResponse.startIdx !== undefined) {
    queryRange.value.index.start = apiResponse.startIdx
    queryRange.value.index.end = apiResponse.endIdx
  } else if (requestParams.index?.start !== undefined) {
    queryRange.value.index.start = requestParams.index.start
    queryRange.value.index.end = requestParams.index.end
  }
}

// 渲染轨迹
const renderTrajectory = (points) => {
  clearMapLayers()
  
  if (!points.length || !map) return
  
  const latlngs = points.map(p => [p.lat, p.lon])
  
  // 绘制轨迹线
  trajectoryLayer = L.polyline(latlngs, { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8 
  }).addTo(map)
  
  // 采样添加标记点（避免过多）
  const maxMarkers = 200
  const step = Math.max(1, Math.floor(points.length / maxMarkers))
  
  points.forEach((p, i) => {
    if (i % step !== 0) return
    
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: '#007bff',
      fillColor: '#007bff',
      fillOpacity: 0.7,
      weight: 1
    })
    
    marker.bindPopup(buildPopupContent(p))
    marker.addTo(markersLayer)
  })
  
  // 自适应缩放
  if (latlngs.length >= 2) {
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 12)
  }
}

// 构建弹窗内容
const buildPopupContent = (p) => {
  return `
    <div style="min-width: 200px; font-size: 12px; line-height: 1.6;">
      <div style="font-weight: 600; color: #0066cc; margin-bottom: 6px;">
        🚢 轨迹点 #${p.idx}
      </div>
      <hr style="margin: 4px 0; border: 0; border-top: 1px solid #eee;">
      <div><b>🕐 时间:</b> ${formatTime(p.timestamp)}</div>
      <div><b>📍 坐标:</b> [${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}]</div>
      <div><b>⚡ 速度:</b> ${formatValue(p.speed, ' 节')}</div>
      <div><b>🧭 航向:</b> ${formatValue(p.course, '°')}</div>
      <div><b>🎯 目的地:</b> ${p.destination}</div>
      <div><b>🌊 吃水:</b> ${formatValue(p.draught, 'm')}</div>
      <div><b>📊 状态:</b> ${p.navigationStatus}</div>
    </div>
  `
}

const clearMapLayers = () => {
  markersLayer?.clearLayers()
  if (trajectoryLayer && map) {
    map.removeLayer(trajectoryLayer)
    trajectoryLayer = null
  }
}

// ==================== 扩展功能 ====================
const exportTrajectory = () => {
  if (!currentPoints.length) return
  
  const headers = ['idx', 'timestamp', 'lat', 'lon', 'speed', 'course', 'destination', 'draught', 'navigationStatus']
  const rows = currentPoints.map(p => 
    headers.map(h => {
      const val = p[h]
      return val === null || val === undefined ? '' : String(val)
    }).join(',')
  )
  
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `track_${currentMmsi.value}_${Date.now()}.csv`
  a.click()
  
  URL.revokeObjectURL(url)
  console.log('📥 轨迹导出完成')
}

const clearMap = () => {
  clearMapLayers()
  currentPointsCount.value = 0
  currentPoints = []
  console.log('🗑️ 地图已清空')
}

const centerMap = () => {
  if (trajectoryLayer && map) {
    const bounds = trajectoryLayer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }
}

const refreshQuery = () => {
  doQuery({
    mmsi: currentMmsi.value,
    mode: queryRange.value.time.start ? 'time' : 'index',
    time: { ...queryRange.value.time },
    index: { ...queryRange.value.index }
  })
}

// ==================== 工具函数 ====================
const formatTime = (ts) => {
  if (!ts) return '-'
  const date = new Date(ts * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const formatValue = (val, unit) => {
  return val !== null && val !== undefined && val !== '' ? `${val}${unit}` : '-'
}

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '-'
  if (seconds < 0) seconds = -seconds
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds/60)} 分钟`
  if (seconds < 86400) return `${Math.floor(seconds/3600)} 小时`
  return `${Math.floor(seconds/86400)} 天`
}

const buildErrorMessage = (err) => {
  if (err.response?.status === 404) return '🔍 未找到该 MMSI 的轨迹数据'
  if (err.response?.status === 400) return '❌ 请求参数错误，请检查查询条件'
  if (err.response?.status === 500) return '🔧 服务器内部错误，请稍后重试'
  if (err.code === 'ECONNABORTED') return '⏱️ 请求超时，请检查网络连接'
  if (err.code === 'ERR_NETWORK') return '🌐 网络连接失败，请检查后端服务'
  return err.message || '❓ 未知错误，请查看控制台详情'
}

// 导出方法
defineExpose({
  refresh: refreshQuery,
  setMmsi: handleMmsiChange,
  getPoints: () => [...currentPoints]
})
</script>

<style scoped>
.track-flow-container {
  display: flex;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background: #f5f7fa;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}

/* 左侧面板 */
.side-panel {
  width: 380px;
  min-width: 380px;
  max-width: 450px;
  background: #fff;
  border-right: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
}

/* 扩展按钮 */
.panel-extensions {
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ext-btn {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid #ced4da;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ext-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateX(3px);
}

.ext-btn.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: #fff;
  border-color: #007bff;
}

.ext-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004494);
  border-color: #004494;
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 右侧地图 */
.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #e5e7eb;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

/* 加载遮罩 */
.loading-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.98);
  padding: 1.2rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  font-size: 1rem;
  color: #333;
  border: 1px solid #e0e6ed;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  color: #991b1b;
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  border-left: 4px solid #ef4444;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 1001;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.error-toast:hover {
  opacity: 0.95;
}

.close-hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin-left: 0.5rem;
}

/* 数据信息 */
.data-info {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.98);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.12);
  font-size: 0.9rem;
  color: #374151;
  z-index: 1000;
  border: 1px solid #e5e7eb;
}

/* MMSI 标签 */
.mmsi-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.98);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 0.9rem;
  color: #374151;
  z-index: 1000;
  border: 1px solid #e5e7eb;
}

.mmsi-tag strong {
  color: #0066cc;
  font-family: monospace;
}

/* Leaflet 弹窗优化 */
:deep(.leaflet-popup-content) {
  margin: 10px 14px;
  line-height: 1.5;
}

:deep(.leaflet-popup-tip) {
  background: #fff;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}

/* 响应式 */
@media (max-width: 1024px) {
  .side-panel {
    width: 340px;
    min-width: 340px;
  }
}

@media (max-width: 768px) {
  .track-flow-container {
    flex-direction: column;
  }
  
  .side-panel {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: 45vh;
    border-right: none;
    border-bottom: 1px solid #dee2e6;
  }
  
  .map-wrapper {
    height: 55vh;
  }
}
</style>