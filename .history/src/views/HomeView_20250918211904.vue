<template>
    <div class="home-view">
      <!-- 地图容器 -->
      <div id="mapContainer" class="map-container"></div>
  
      <!-- 可以在主页上保留或调整原来的搜索功能 -->
      <!-- <div class="home-search">
        <input v-model="localMmsi" @keyup.enter="searchShipLocal" placeholder="输入 MMSI..." />
        <button @click="searchShipLocal">查询</button>
      </div> -->
    </div>
  </template>
  
  <script setup>
  import { onMounted, onBeforeUnmount, ref } from 'vue'
  // 假设你已经安装了 Leaflet: npm install leaflet
  // 以及 Vue Leaflet 组件库 (例如 vue-leaflet): npm install @vue-leaflet/vue-leaflet
  // 但为了简化，这里直接使用原生 Leaflet API
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css' // 引入 Leaflet CSS
  
  // 状态 (如果需要在主页内处理搜索)
  // const localMmsi = ref('')
  // const searchShipLocal = () => { ... }
  
  let map = null // Leaflet 地图实例
  
  onMounted(() => {
    // 初始化地图
    if (document.getElementById('mapContainer')) {
      map = L.map('mapContainer').setView([51.505, -0.09], 13) // 设置初始中心点和缩放级别
  
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
  
    // 可以在这里监听来自 NavBar 或 TimeSlider 的事件
    // 例如，监听时间轴变化来加载对应年份的数据
    // window.addEventListener('time-change-event', handleTimeChange)
  })
  
  onBeforeUnmount(() => {
    // 清理地图实例，防止内存泄漏
    if (map) {
      map.remove()
      map = null
    }
    // 移除事件监听器
    // window.removeEventListener('time-change-event', handleTimeChange)
  })
  
  // const handleTimeChange = (event) => {
  //   const year = event.detail.year
  //   console.log('主页接收到时间变化:', year)
  //   // 根据年份更新地图数据
  // }
  </script>
  
  <style scoped>
  .home-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .map-container {
    flex: 1; /* 占据剩余空间 */
    width: 100%; 
    height: calc(100vh - /* NavBar 高度 */ - /* TimeSlider 高度 */);
    background-color: #eee; /* 背景色，地图加载前可见 */
  }
  
  /* 调整 Leaflet 控件样式 (可选) */
  .leaflet-container {
    height: 100%;
    width: 100%;
  }
  </style>