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
      
      <!-- 预留扩展按钮区域 -->
      <div class="panel-extensions">
        <button class="ext-btn" @click="exportTrajectory" :disabled="!hasData">
          📥 导出轨迹
        </button>
        <button class="ext-btn" @click="clearMap" :disabled="!hasData">
          🗑️ 清空地图
        </button>
        <button class="ext-btn" @click="centerMap" :disabled="!hasData">
          🎯 居中显示
        </button>
      </div>
    </div>

    <!-- 右侧地图容器 -->
    <div class="map-wrapper">
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
      ></div>

      <!-- ✅ 使用 v-show 避免 DOM 移除冲突 -->
      <div v-show="loading" class="loading-mask">
        <div class="spinner"></div>
        <span>加载轨迹数据...</span>
      </div>

      <!-- 错误提示 -->
      <div v-show="error" class="error-toast" @click="error = null">
        ⚠️ {{ error }}
      </div>

      <!-- 数据信息 -->
      <div v-show="hasData && !loading" class="data-info">
        <span>📊 {{ currentPointsCount }} 个轨迹点</span>
        <span v-if="queryRange.time.start && queryRange.time.end">
          | 🕐 {{ formatDuration(queryRange.time.end - queryRange.time.start) }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import TimeSlider from '../components/layout/TimeSlider.vue'

// ==================== 状态定义 ====================
const route = useRoute()
const mapContainerRef = ref(null)

let map = null
let markersLayer = null
let trajectoryLayer = null

const currentMmsi = ref(
  route.query.mmsi || 
  localStorage.getItem('currentMmsi') || 
  '413906353'
)

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

// ✅ 防止重复查询的标志
const isQuerying = ref(false)

const hasData = computed(() => currentPointsCount.value > 0)

// ==================== 地图初始化 ====================
onMounted(async () => {
  await nextTick()
  
  if (mapContainerRef.value) {
    initMap()
  }
  
  if (currentMmsi.value) {
    doQuery({
      mmsi: currentMmsi.value,
      mode: 'index',
      index: { ...queryRange.value.index }
    })
  }
})

onBeforeUnmount(() => {
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
})

watch(() => route.query.mmsi, async (newMmsi) => {
  if (newMmsi && newMmsi !== currentMmsi.value) {
    currentMmsi.value = newMmsi
    localStorage.setItem('currentMmsi', newMmsi)
    
    if (map) {
      if (markersLayer) map.removeLayer(markersLayer)
      if (trajectoryLayer) map.removeLayer(trajectoryLayer)
      map.remove()
      map = null
      markersLayer = null
      trajectoryLayer = null
    }
    
    await nextTick()
    
    if (mapContainerRef.value) {
      initMap()
    }
    
    resetQueryRange()
    doQuery({
      mmsi: newMmsi,
      mode: 'index',
      index: { start: 0, end: 1000 }
    })
  }
})

const initMap = () => {
  if (!mapContainerRef.value) {
    console.error('❌ 地图容器未找到')
    return
  }
  
  map = L.map(mapContainerRef.value).setView([22.52, 113.83], 10)
  
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map)
  
  markersLayer = L.layerGroup().addTo(map)
  trajectoryLayer = L.polyline([], { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8,
    lineJoin: 'round'
  }).addTo(map)
  
  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 100)
  
  console.log('🗺️ 地图初始化完成')
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
}

const onQuery = async (params) => {
  // ✅ 防止重复查询
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
  
  // ✅ 设置查询中标志
  isQuerying.value = true
  loading.value = true
  error.value = null
  
  try {
    let res, apiUrl, apiParams
    
    if (params.mode === 'time' && params.time?.start && params.time?.end) {
      apiUrl = 'http://localhost:8877/api/ship/byTime'
      apiParams = {
        mmsi: params.mmsi,
        start: params.time.start,
        end: params.time.end
      }
    } else {
      apiUrl = 'http://localhost:8877/api/ship/byIndex'
      apiParams = {
        mmsi: params.mmsi,
        startIdx: params.index?.start ?? 0,
        endIdx: params.index?.end ?? 1000
      }
    }
    
    console.log(`🔍 请求：${apiUrl}`, apiParams)
    res = await axios.get(apiUrl, { params: apiParams, timeout: 30000 })
    const data = res.data
    
    const points = parsePoints(data.points || [])
    
    if (points.length === 0) {
      error.value = '未找到轨迹数据，请调整查询范围'
      clearMapLayers()
      currentPointsCount.value = 0
      return
    }
    
    updateGlobalRange(data, points)
    updateQueryRangeEcho(data, params)
    renderTrajectory(points)
    
    currentPointsCount.value = points.length
    console.log(`✅ 加载 ${points.length} 个轨迹点`)
    
  } catch (err) {
    console.error('❌ 查询失败:', err)
    error.value = err.response?.data?.message || 
                  err.message || 
                  '网络请求失败，请检查后端服务'
    clearMapLayers()
    currentPointsCount.value = 0
  } finally {
    // ✅ 确保 loading 一定被重置
    loading.value = false
    isQuerying.value = false
    console.log('🔄 查询完成，loading 已重置')
  }
}

const parsePoints = (rawPoints) => {
  return rawPoints.map(p => ({
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
  })).filter(p => p.lat && p.lon)
}

const updateGlobalRange = (apiResponse, points) => {
  if (apiResponse.startTime !== undefined && apiResponse.endTime !== undefined) {
    const { min, max } = globalRange.value.time
    globalRange.value.time.min = min === null 
      ? apiResponse.startTime 
      : Math.min(min, apiResponse.startTime)
    globalRange.value.time.max = max === null 
      ? apiResponse.endTime 
      : Math.max(max, apiResponse.endTime)
  }
  
  if (apiResponse.startIdx !== undefined && apiResponse.endIdx !== undefined) {
    const { min, max } = globalRange.value.index
    globalRange.value.index.min = Math.min(min, apiResponse.startIdx)
    globalRange.value.index.max = Math.max(max, apiResponse.endIdx)
  }
  
  if (points.length > 0) {
    const timestamps = points.map(p => p.timestamp).filter(t => t)
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

const renderTrajectory = (points) => {
  clearMapLayers()
  
  if (!points.length || !map) return
  
  const latlngs = points.map(p => [p.lat, p.lon])
  trajectoryLayer = L.polyline(latlngs, { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8 
  }).addTo(map)
  
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
    
    marker.bindPopup(`
      <div style="min-width: 180px; font-size: 12px;">
        <b style="color:#0066cc;">🚢 轨迹点 #${p.idx}</b><br/>
        <hr style="margin:4px 0; border:0; border-top:1px solid #eee;"/>
        <b>🕐 时间:</b> ${formatTime(p.timestamp)}<br/>
        <b>📍 坐标:</b> [${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}]<br/>
        <b>⚡ 速度:</b> ${formatValue(p.speed, '节')}<br/>
        <b>🧭 航向:</b> ${formatValue(p.course, '°')}<br/>
        <b>🎯 目的地:</b> ${p.destination}<br/>
        <b>🌊 吃水:</b> ${formatValue(p.draught, 'm')}<br/>
        <b>📊 状态:</b> ${p.navigationStatus}
      </div>
    `)
    
    marker.addTo(markersLayer)
  })
  
  if (latlngs.length >= 2) {
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 12)
  }
}

const clearMapLayers = () => {
  markersLayer?.clearLayers()
  if (trajectoryLayer && map) {
    map.removeLayer(trajectoryLayer)
    trajectoryLayer = null
  }
}

// ==================== 扩展功能按钮 ====================
const exportTrajectory = () => {
  console.log('📥 导出轨迹功能')
}

const clearMap = () => {
  clearMapLayers()
  currentPointsCount.value = 0
  console.log('🗑️ 地图已清空')
}

const centerMap = () => {
  if (trajectoryLayer && map) {
    const bounds = trajectoryLayer.getBounds()
    map.fitBounds(bounds, { padding: [50, 50] })
  }
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
  return val !== null && val !== undefined ? `${val}${unit}` : '-'
}

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '-'
  if (seconds < 0) seconds = -seconds
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds/60)}m`
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h${Math.floor((seconds%3600)/60)}m`
  return `${Math.floor(seconds/86400)}d${Math.floor((seconds%86400)/3600)}h`
}

defineExpose({
  refresh: () => doQuery({
    mmsi: currentMmsi.value,
    mode: queryRange.value.time.start ? 'time' : 'index',
    time: { ...queryRange.value.time },
    index: { ...queryRange.value.index }
  }),
  setMmsi: (mmsi) => {
    currentMmsi.value = mmsi
    localStorage.setItem('currentMmsi', mmsi)
    resetQueryRange()
    doQuery({ mmsi, mode: 'index', index: { start: 0, end: 1000 } })
  }
})
</script>

<style scoped>
/* 保持之前的样式不变 */
.track-flow-container {
  display: flex;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background: #f5f7fa;
  overflow: hidden;
}

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
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
}

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
  padding: 0.6rem 1rem;
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
  transform: translateX(2px);
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.loading-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  z-index: 1000;
  font-size: 0.95rem;
  color: #333;
  border: 1px solid #e0e6ed;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-toast {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fff5f5;
  color: #c53030;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border-left: 4px solid #fc8181;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1001;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.error-toast:hover {
  opacity: 0.9;
}

.data-info {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 0.85rem;
  color: #495057;
  z-index: 1000;
  border: 1px solid #e9ecef;
}

:deep(.leaflet-popup-content) {
  margin: 8px 12px;
  line-height: 1.5;
}

:deep(.leaflet-popup-tip) {
  background: #fff;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

@media (max-width: 1024px) {
  .side-panel {
    width: 320px;
    min-width: 320px;
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
    height: 40vh;
    border-right: none;
    border-bottom: 1px solid #dee2e6;
  }
  
  .map-wrapper {
    height: 60vh;
  }
}
</style>