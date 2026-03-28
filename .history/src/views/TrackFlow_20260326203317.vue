<template>
  <div class="track_flow">
    <h1>船舶轨迹展示</h1>
  </div>

  <!-- 地图容器 -->
  <div id="mapContainer" class="map-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'

let map = null
const points = ref([])

onMounted(async () => {
  if (!document.getElementById('mapContainer')) return

  // 1️⃣ 初始化地图
  map = L.map('mapContainer').setView([22.52, 113.83], 10) // 先用第一个点附近作为中心
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)

  console.log('Leaflet 地图已初始化')

  try {
    // 2️⃣ 请求后端轨迹数据
    const url = 'http://localhost:8877/api/ship/rawData?mmsi=413906353&start=2023010100&end=2024010101&cursor=0&limit=100'
    const res = await axios.get(url)
    if (res.data && res.data.points) {
      points.value = res.data.points

      // 3️⃣ 将轨迹点画在地图上
      const latlngs = points.value.map(p => [p.lat, p.lon])

      // 添加折线
      L.polyline(latlngs, { color: 'blue', weight: 3, opacity: 0.7 }).addTo(map)

      // 添加每个点的圆标记
      points.value.forEach(p => {
        L.circleMarker([p.lat, p.lon], {
          radius: 4,
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.6
        })
        .bindPopup(`UTC: ${p.utc_time}<br>Speed: ${p.speed} kn<br>Course: ${p.course}`)
        .addTo(map)
      })

      // 4️⃣ 调整地图视角，让所有点都可见
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  } catch (err) {
    console.error('加载轨迹数据失败', err)
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 600px;
  margin-top: 1rem;
}
</style>