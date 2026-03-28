<template>
    <div class="track_flow">
      <h1>联系我们</h1>
      <p>联系方式或联系表单。</p>
      <!-- 联系内容 -->
    </div>
    <!-- 地图容器 -->
    <div id="mapContainer" class="map-container"></div>


    <!-- 底部时间轴 -->
      <TimeSlider />

  </template>
  
  <script setup>

    // 时间模块
    import TimeSlider from '../components/layout/TimeSlider.vue'

    // 地图模块
    import { onMounted, onBeforeUnmount, ref } from 'vue'

    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css' // 引入 Leaflet CSS
  
    
    let map = null // Leaflet 地图实例
    
    onMounted(() => {
      // 初始化地图
      if (document.getElementById('mapContainer')) {
        map = L.map('mapContainer').setView([51.505, -0.09], 7) // 设置初始中心点和缩放级别
    
        // 添加 OpenStreetMap 瓦片图层 (需要网络访问)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map)
    
        // 示例：添加一个标记
        const marker = L.marker([51.5, -0.09]).addTo(map)
        marker.bindPopup('一个标记').openPopup()
    
        console.log('Leaflet 地图已初始化')
      }
    
    })
    
    onBeforeUnmount(() => {
      // 清理地图实例，防止内存泄漏
      if (map) {
        map.remove()
        map = null
      }
    }
  </script>
  
  <style scoped>
  .contact-view {
    padding: 2rem;
  }
  </style>