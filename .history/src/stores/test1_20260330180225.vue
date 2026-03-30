<template>
    <div class="container">
      <!-- 1. 搜索框区域 -->
      <div class="search-box">
        <input 
          v-model.number="inputCount" 
          type="number" 
          placeholder="输入点的数量 (count)" 
        />
        <button @click="handleSearch">🔍 搜索</button>
        <p class="info">URL 参数: count = {{ currentCount }}</p >
      </div>
  
      <!-- 2. 地图区域 + 左侧面板 -->
      <div class="map-wrapper">
        <div id="map" class="map-container"></div>
        
        <!-- ✅ 通过 props 传递 map 实例和 markers 数组给子组件 -->
        <LeftPanel :map="map" :markers="markers" />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AMapLoader from '@amap/amap-jsapi-loader'
  import LeftPanel from './LeftPanel.vue'
  
  const route = useRoute()
  const router = useRouter()
  
  // 状态
  const inputCount = ref(10)
  const currentCount = ref(0)
  let map = null // 高德地图实例
  const markers = ref([]) // ✅ 响应式数组，存储所有标记点（供子组件使用）
  
  // 初始化高德地图
  const initMap = async () => {
    if (map) return
  
    try {
      const AMap = await AMapLoader.load({
        key: '60eb1e3f81883411db470e05d9314712', // ⚠️ 建议换成 import.meta.env.VITE_AMAP_KEY
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar']
      })
  
      map = new AMap.Map('map', {
        zoom: 11,
        center: [116.4074, 39.9042], // 高德坐标：[经度, 纬度]
        viewMode: '2D',
        resizeEnable: true
      })
  
      map.addControl(new AMap.Scale())
      map.addControl(new AMap.ToolBar())
      
      // 地图加载完成后，如果有 count 参数，渲染标记点
      if (currentCount.value > 0) {
        updateMapMarkers(currentCount.value)
      }
      
    } catch (e) {
      console.error('高德地图加载失败:', e)
      alert('地图加载失败，请检查 Key 配置或网络')
    }
  }
  
  // 生成随机坐标点（北京附近）
  const generateRandomPoints = (count) => {
    const points = []
    for (let i = 0; i < count; i++) {
      const lng = 116.4074 + (Math.random() - 0.5) * 0.1
      const lat = 39.9042 + (Math.random() - 0.5) * 0.1
      points.push([lng, lat]) // 高德顺序：[经度, 纬度]
    }
    return points
  }
  
  
  
  // ✅ 父组件负责：创建/更新/销毁标记点，并维护 markers 数组
  const updateMapMarkers = (count) => {
    if (!map) return
  
    // 1. 清除旧标记
    markers.value.forEach(marker => marker.setMap(null))
    markers.value = []
  
    // 2. 生成新坐标
    const points = generateRandomPoints(count)
    
    // 3. 创建新标记点，并存入响应式数组
    points.forEach((point, index) => {
      const marker = new AMap.Marker({
        position: point,
        map: map,
        title: `点 ${index + 1}`,
        extData: { id: index } // 自定义数据，方便追踪
      })
  
  
      console.log('🗺️ [父组件] 地图实例创建:', map)
      console.log('🗺️ [父组件] 实例类型:', map?.constructor?.name)
      console.log('🗺️ [父组件] 实例ID:', map?.__id__ || '无ID')
  
  
      // 点击弹窗
      marker.on('click', () => {
        const pos = marker.getPosition()
        marker.setContent(`
          <div style="padding:8px;min-width:120px">
            <strong>点 ${index + 1}</strong><br>
            <span style="color:#666;font-size:12px">
              ${pos.getLng().toFixed(4)}, ${pos.getLat().toFixed(4)}
            </span>
          </div>
        `)
        marker.openInfoWindow()
      })
      
      markers.value.push(marker) // ✅ 关键：存入数组，子组件可通过 props 访问
    })
  
    // 4. 自动调整视野
    if (points.length > 0) {
      map.setFitView(markers.value)
    }
  }
  
  // 搜索按钮点击：更新 URL 参数
  const handleSearch = () => {
    router.push({
      query: {
        ...route.query,
        count: inputCount.value
      }
    })
  }
  
  // 监听 URL 参数变化：触发父组件的标记点更新
  watch(
    () => route.query.count,
    (newCount) => {
      const count = parseInt(newCount) || 0
      currentCount.value = count
      inputCount.value = count
      
      if (count > 0 && map) {
        updateMapMarkers(count) // ✅ 父组件方法：管理点的创建
      }
    },
    { immediate: true }
  )
  
  onMounted(() => {
    initMap()
  })
  </script>
  
  <style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 20px;
    box-sizing: border-box;
    background: #f5f7fa;
  }
  
  .search-box {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
    align-items: center;
    background: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  
  input {
    padding: 8px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    width: 100px;
    font-size: 14px;
  }
  
  button {
    padding: 8px 16px;
    background-color: #67c23a;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
  }
  
  button:hover {
    background-color: #85ce61;
  }
  
  .info {
    margin: 0;
    font-size: 13px;
    color: #909399;
    margin-left: auto;
  }
  
  .map-wrapper {
    display: flex;
    flex: 1;
    gap: 15px;
    min-height: 0;
  }
  
  .map-container {
    flex: 1;
    border-radius: 8px;
    border: 1px solid #dcdfe6;
    background: #fff;
    min-width: 0;
  }
  </style>