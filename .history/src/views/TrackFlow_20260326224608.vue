<template>
  <div class="track-flow">
    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>

    <!-- 时间/索引滑块 -->
    <!-- TimeSlider 使用 -->
    <TimeSlider 
      :mmsi="currentMmsi"
      :globalMinTs="globalTimeRange.min"
      :globalMaxTs="globalTimeRange.max"
      :globalMinIdx="globalIndexRange.min"
      :globalMaxIdx="globalIndexRange.max"
      :currentStartTs="queryRange.time.start"
      :currentEndTs="queryRange.time.end"
      :currentStartIdx="queryRange.index.start"
      :currentEndIdx="queryRange.index.end"
      :loading="loading"
      @query="onQuery"
    />
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>加载轨迹数据...</span>
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

let map = null
let markersLayer = null
let trajectoryLayer = null

const route = useRoute()
const currentMmsi = ref(route.query.mmsi || localStorage.getItem('currentMmsi') || '413906353')
const totalRecords = ref(1000)  // 可后续通过接口获取真实值

// 默认时间范围（2023全年）
const defaultMinTs = 1672500000  // 2023-01-01 00:00:00 UTC
const defaultMaxTs = 1672565118  // 2023-12-31 23:59:59 UTC

const loading = ref(false)

onMounted(() => {
  initMap()
  if (currentMmsi.value) {
    // 初始加载：使用默认时间范围查询
    fetchShipData({
      mmsi: currentMmsi.value,
      mode: 'time',
      start: defaultMinTs,
      end: defaultMaxTs
    })
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// 监听路由参数变化（MMSI）
watch(() => route.query.mmsi, (newMmsi) => {
  if (newMmsi && newMmsi !== currentMmsi.value) {
    currentMmsi.value = newMmsi
    localStorage.setItem('currentMmsi', newMmsi)
    // 重置查询
    fetchShipData({
      mmsi: newMmsi,
      mode: 'time',
      start: defaultMinTs,
      end: defaultMaxTs
    })
  }
})

const initMap = () => {
  map = L.map('mapContainer').setView([22.52, 113.83], 10)
  
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)
  
  markersLayer = L.layerGroup().addTo(map)
  trajectoryLayer = L.polyline([], { color: '#007bff', weight: 3, opacity: 0.7 }).addTo(map)
}

// 滑块查询参数变化
const onQueryChange = async (params) => {
  await fetchShipData(params)
}

// 统一数据获取方法
const fetchShipData = async (query) => {
  if (!query.mmsi) return
  
  loading.value = true
  markersLayer?.clearLayers()
  trajectoryLayer?.setLatLngs([])
  
  try {
    let res
    const baseUrl = 'http://localhost:8877/api/ship'
    
    if (query.mode === 'time') {
      // 调用 byTime 接口
      res = await axios.get(`${baseUrl}/byTime`, {
        params: {
          mmsi: query.mmsi,
          start: query.start,
          end: query.end
        }
      })
    } else {
      // 调用 byIndex 接口
      res = await axios.get(`${baseUrl}/byIndex`, {
        params: {
          mmsi: query.mmsi,
          startIdx: query.startIdx,
          endIdx: query.endIdx
        }
      })
    }
    
    const points = res.data.points || res.data.data || []
    if (!points.length) {
      console.warn('未找到轨迹数据')
      return
    }
    
    // 更新总记录数（如果接口返回）
    if (res.data.total !== undefined) {
      totalRecords.value = res.data.total
    }
    
    // 绘制轨迹点
    const latlngs = []
    points.forEach(p => {
      const lat = p.lat || p.latitude
      const lon = p.lon || p.longitude || p.lng
      if (lat && lon) {
        latlngs.push([lat, lon])
        
        // 添加标记点（可选：采样显示避免过多）
        if (points.length <= 500 || Math.random() > 0.9) {
          L.circleMarker([lat, lon], {
            radius: 4,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.6,
            weight: 1
          }).bindPopup(`
            <b>时间:</b> ${formatTime(p.timestamp || p.utc_time)}<br>
            <b>速度:</b> ${p.speed || '-'} 节<br>
            <b>航向:</b> ${p.course || p.heading || '-'}°<br>
            <b>位置:</b> [${lat.toFixed(4)}, ${lon.toFixed(4)}]
          `).addTo(markersLayer)
        }
      }
    })
    
    // 绘制轨迹线
    if (latlngs.length > 1) {
      trajectoryLayer.setLatLngs(latlngs)
    }
    
    // 自适应缩放
    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] })
    }
    
  } catch (err) {
    console.error('获取船舶数据失败:', err)
    // 可添加错误提示组件
  } finally {
    loading.value = false
  }
}

// 格式化时间（支持时间戳或字符串）
const formatTime = (t) => {
  if (!t) return '-'
  const date = typeof t === 'number' 
    ? new Date(t * 1000) 
    : new Date(t)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.track-flow {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

.map-container {
  flex: 1;
  min-height: 400px;
  z-index: 1;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.9);
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  z-index: 1000;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>