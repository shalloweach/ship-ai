<template>
  <div class="track-flow">
    
    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>

    <!-- 查询参数面板 -->
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

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-mask">
      <div class="spinner"></div>
      <span>加载轨迹数据...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-toast" @click="error = null">
      ⚠️ {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import TimeSlider from '../components/layout/TimeSlider.vue'

// ==================== 状态定义 ====================
const route = useRoute()
let map = null
let markersLayer = null
let trajectoryLayer = null

// MMSI（优先从路由获取，其次 localStorage，最后默认值）
const currentMmsi = ref(
  route.query.mmsi || 
  localStorage.getItem('currentMmsi') || 
  '413906353'
)

// 全局数据范围（首次查询后动态更新）
const globalRange = ref({
  time: { min: null, max: null },    // 时间戳（秒），null 表示未知
  index: { min: 0, max: 10000 }       // 索引范围，初始预估值
})

// 当前查询参数
const queryRange = ref({
  time: { start: null, end: null },   // 无默认时间
  index: { start: 0, end: 1000 }      // ✅ 默认按索引查 0-1000
})

const loading = ref(false)
const error = ref(null)

// ==================== 地图初始化 ====================
onMounted(() => {
  initMap()
  // 初始化后自动查询默认范围
  if (currentMmsi.value) {
    doQuery({
      mmsi: currentMmsi.value,
      mode: 'index',  // ✅ 默认按索引模式
      index: { ...queryRange.value.index }
    })
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    markersLayer = null
    trajectoryLayer = null
  }
})

// 监听路由 MMSI 变化
watch(() => route.query.mmsi, (newMmsi) => {
  if (newMmsi && newMmsi !== currentMmsi.value) {
    currentMmsi.value = newMmsi
    localStorage.setItem('currentMmsi', newMmsi)
    // 重置查询范围
    resetQueryRange()
    doQuery({
      mmsi: newMmsi,
      mode: 'index',
      index: { start: 0, end: 1000 }
    })
  }
})

const initMap = () => {
  // 初始化地图（默认聚焦南海/珠江口）
  map = L.map('mapContainer').setView([22.52, 113.83], 10)
  
  // 添加 OpenStreetMap 底图
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
  }).addTo(map)
  
  // 图层组
  markersLayer = L.layerGroup().addTo(map)
  trajectoryLayer = L.polyline([], { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8,
    lineJoin: 'round'
  }).addTo(map)
  
  // 添加点击地图显示坐标功能（调试用）
  map.on('click', (e) => {
    console.log(`📍 点击位置: [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`)
  })
}

// ==================== 查询逻辑 ====================

// 重置查询范围（切换 MMSI 时调用）
const resetQueryRange = () => {
  globalRange.value = {
    time: { min: null, max: null },
    index: { min: 0, max: 10000 }
  }
  queryRange.value = {
    time: { start: null, end: null },
    index: { start: 0, end: 1000 }
  }
}

// TimeSlider 触发查询
const onQuery = async (params) => {
  await doQuery(params)
}

// 执行查询（统一入口）
const doQuery = async (params) => {
  if (!params?.mmsi) {
    error.value = 'MMSI 不能为空'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    let res, apiUrl, apiParams
    
    // 决定调用哪个接口（优先时间模式，可配置）
    if (params.mode === 'time' && params.time?.start && params.time?.end) {
      apiUrl = 'http://localhost:8877/api/ship/byTime'
      apiParams = {
        mmsi: params.mmsi,
        start: params.time.start,
        end: params.time.end
      }
    } else {
      // ✅ 默认走索引查询
      apiUrl = 'http://localhost:8877/api/ship/byIndex'
      apiParams = {
        mmsi: params.mmsi,
        startIdx: params.index?.start ?? 0,
        endIdx: params.index?.end ?? 1000
      }
    }
    
    console.log(`🔍 请求: ${apiUrl}`, apiParams)
    res = await axios.get(apiUrl, { params: apiParams, timeout: 30000 })
    const data = res.data
    
    // ✅ 解析 points 数据（适配真实接口字段）
    const points = parsePoints(data.points || [])
    
    if (points.length === 0) {
      error.value = '未找到轨迹数据，请调整查询范围'
      clearMapLayers()
      return
    }
    
    // ✅ 更新全局范围（用于 TimeSlider 边界限制）
    updateGlobalRange(data, points)
    
    // ✅ 更新当前查询范围回显（用于 TimeSlider 显示）
    updateQueryRangeEcho(data, params)
    
    // ✅ 渲染地图
    renderTrajectory(points)
    
    console.log(`✅ 加载 ${points.length} 个轨迹点`)
    
  } catch (err) {
    console.error('❌ 查询失败:', err)
    error.value = err.response?.data?.message || 
                  err.message || 
                  '网络请求失败，请检查后端服务'
    clearMapLayers()
  } finally {
    loading.value = false
  }
}

// 解析点数据（字段映射 + 类型转换）
const parsePoints = (rawPoints) => {
  return rawPoints.map(p => ({
    // 必填字段
    idx: Number(p.idx) ?? 0,
    lat: Number(p.lat) ?? Number(p.latitude) ?? 0,
    lon: Number(p.lon) ?? Number(p.longitude) ?? Number(p.lng) ?? 0,
    timestamp: Number(p.utc_time) ?? Number(p.timestamp) ?? 0,
    
    // 可选字段
    speed: p.speed !== undefined ? Number(p.speed) : null,
    course: p.course !== undefined ? Number(p.course) : null,
    heading: p.heading !== undefined ? Number(p.heading) : null,
    destination: p.destination || '-',
    draught: p.draught !== undefined ? Number(p.draught) : null,
    navigationStatus: p.navigationstatus || p.navigation_status || '-',
    
    // 原始数据备份（调试用）
    _raw: p
  })).filter(p => p.lat && p.lon) // 过滤无效坐标
}

// 更新全局范围（用于滑块边界）
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
  
  // 兜底：从 points 推算（防止接口未返回范围）
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

// 更新查询范围回显（TimeSlider 显示当前选中值）
const updateQueryRangeEcho = (apiResponse, requestParams) => {
  // 时间回显
  if (apiResponse.startTime !== undefined) {
    queryRange.value.time.start = apiResponse.startTime
    queryRange.value.time.end = apiResponse.endTime
  } else if (requestParams.time?.start) {
    // 请求时传了时间但接口没返回，保持原值
    queryRange.value.time.start = requestParams.time.start
    queryRange.value.time.end = requestParams.time.end
  }
  
  // 索引回显
  if (apiResponse.startIdx !== undefined) {
    queryRange.value.index.start = apiResponse.startIdx
    queryRange.value.index.end = apiResponse.endIdx
  } else if (requestParams.index?.start !== undefined) {
    queryRange.value.index.start = requestParams.index.start
    queryRange.value.index.end = requestParams.index.end
  }
}

// 渲染轨迹到地图
const renderTrajectory = (points) => {
  clearMapLayers()
  
  if (!points.length) return
  
  // 1. 绘制轨迹线
  const latlngs = points.map(p => [p.lat, p.lon])
  trajectoryLayer = L.polyline(latlngs, { 
    color: '#007bff', 
    weight: 3, 
    opacity: 0.8 
  }).addTo(map)
  
  // 2. 采样添加标记点（避免过多点导致卡顿）
  const maxMarkers = 200  // 最多显示 200 个标记
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
    
    // 弹出信息框
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
  
  // 3. 自适应缩放（保留边距）
  if (latlngs.length >= 2) {
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 12)
  }
}

// 清空地图图层
const clearMapLayers = () => {
  markersLayer?.clearLayers()
  if (trajectoryLayer) {
    map.removeLayer(trajectoryLayer)
    trajectoryLayer = null
  }
}

// ==================== 工具函数 ====================

// 格式化时间戳（秒 → 本地字符串）
const formatTime = (ts) => {
  if (!ts) return '-'
  const date = new Date(ts * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

// 格式化可选值
const formatValue = (val, unit) => {
  return val !== null && val !== undefined ? `${val}${unit}` : '-'
}

// 导出方法（供父组件调用，可选）
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
.track-flow {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  position: relative;
  background: #f5f7fa;
}

/* 地图容器 */
.map-container {
  flex: 1;
  min-height: 400px;
  z-index: 1;
}

/* 加载遮罩 */
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

/* 错误提示（可点击关闭） */
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

/* Leaflet 弹窗样式优化 */
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
</style>