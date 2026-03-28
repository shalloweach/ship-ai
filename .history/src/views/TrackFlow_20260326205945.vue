<template>
  <div class="track-flow">

    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>

    <!-- 时间滑块 -->
    <TimeSlider :year="2023" @time-change="onDateRangeChange"/>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import TimeSlider from '../components/layout/TimeSlider.vue'

let map = null
let markersLayer = null
const MMSI = ref('413906353')

onMounted(() => {
  map = L.map('mapContainer').setView([22.52, 113.83], 10)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)

  // 默认加载全年
  fetchShipData('2023-01-01', '2023-01-02')
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

const onDateRangeChange = ({ start, end }) => {
  fetchShipData(start, end)
}

const fetchShipData = async (startStr, endStr) => {
  if (!MMSI.value) return
  markersLayer.clearLayers()

  try {
    const res = await axios.get('http://localhost:8877/api/ship/rawData', {
      params: {
        mmsi: MMSI.value,
        start: startStr.replace(/-/g,'') + '00',
        end: endStr.replace(/-/g,'') + '23',
        cursor: 0,
        limit: 1000
      }
    })

    const points = res.data.points || []
    if (!points.length) return

    points.forEach(p => {
      L.circleMarker([p.lat, p.lon], {
        radius: 5,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 0.7
      }).bindPopup(`速度: ${p.speed} 节<br>方向: ${p.course}°<br>时间: ${p.utc_time}`)
        .addTo(markersLayer)
    })

    const latlngs = points.map(p => [p.lat, p.lon])
    map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] })

  } catch (err) {
    console.error('获取船舶数据失败', err)
  }
}
</script>

<style scoped>
.track-flow {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.navbar {
  height: 50px;
  background-color: #007bff;
  color: white;
  display: flex;
  align-items: center;
  padding-left: 1rem;
  font-weight: bold;
  font-size: 1.1rem;
}

.map-container {
  width: 100%;
  flex: 1;
  min-height: 500px;
}
</style>