<template>
  <div class="track-flow">

    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>

    <!-- 时间滑块 -->
    <TimeSlider :year="2023" @time-change="onDateChange"/>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import TimeSlider from '../components/layout/TimeSlider.vue'

// 地图实例
let map = null
let markersLayer = null

// 当前船舶 MMSI（可改为 props 或输入框动态选择）
const MMSI = ref('413906353')

// 初始化地图
onMounted(() => {
  map = L.map('mapContainer').setView([22.52, 113.83], 10)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)

  // 创建图层用于显示船舶点
  markersLayer = L.layerGroup().addTo(map)

  // 初始加载当天数据（2023-01-01）
  fetchShipData('2023-01-01')
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// 滑块回调
const onDateChange = (dateStr) => {
  fetchShipData(dateStr)
}

// 请求后端数据
const fetchShipData = async (dateStr) => {
  if (!MMSI.value) return

  // 清空旧标记
  markersLayer.clearLayers()

  // 构造时间段：当天 00:00 ~ 23:59
  const start = `${dateStr.replace(/-/g,'')}00`
  const end = `${dateStr.replace(/-/g,'')}23`

  try {
    const res = await axios.get('http://localhost:8877/api/ship/rawData', {
      params: {
        mmsi: MMSI.value,
        start,
        end,
        cursor: 0,
        limit: 500 // 可适当调整
      }
    })

    const points = res.data.points || []
    if (points.length === 0) return

    // 遍历绘制标记
    points.forEach(p => {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 5,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 0.7
      }).bindPopup(`速度: ${p.speed} 节<br>方向: ${p.course}°<br>时间: ${p.utc_time}`)
      marker.addTo(markersLayer)
    })

    // 调整视图到所有点
    const latlngs = points.map(p => [p.lat, p.lon])
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [50, 50] })

  } catch (error) {
    console.error('获取船舶数据失败', error)
  }
}
</script>

<style scoped>
.track-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.map-container {
  width: 100%;
  height: 600px;
  margin-bottom: 1rem;
}
</style>