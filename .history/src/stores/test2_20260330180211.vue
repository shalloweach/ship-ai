<template>
    <div class="left-panel">
      <h3>控制面板</h3>
      
      <!-- 刷新点的位置按钮 -->
      <button @click="handleRefresh" :disabled="!isMapReady" class="refresh-btn">
      </button>
      
      <p class="hint" v-if="!isMapReady">⏳ 等待地图加载...</p >
      <p class="hint" v-else>✅ 地图已就绪，共 {{ markerCount }} 个点</p >
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue'
  
  // ✅ 通过 props 接收父组件传递的地图实例和标记点数组
  const props = defineProps({
    map: {
      type: Object,
      default: null
    },
    markers: {
      type: Array,
      default: () => []
    }
  })
  console.log(props.map)
  const isMapReady = ref(false)
  const markerCount = ref(0)
  
  // 监听 map 实例变化，判断是否就绪
  watch(
    () => props.map,
    (newMap) => {
      if (newMap) {
        // 高德地图加载完成后会触发 'complete' 事件
        const checkReady = () => {
          if (newMap.getCenter()) {
            isMapReady.value = true
          } else {
            newMap.on('complete', () => {
              isMapReady.value = true
            })
          }
        }
        checkReady()
      } else {
        isMapReady.value = false
      }
    },
    { immediate: true }
  )
  
  // 监听 markers 数量变化
  watch(
    () => props.markers.length,
    (newLen) => {
      markerCount.value = newLen
    },
    { immediate: true }
  )
  
  // ✅ 子组件自己构建的刷新函数（修复动画问题）
  const handleRefresh = () => {
    if (!props.map || !props.markers.length) {
      console.warn('地图或标记点未就绪')
      return
    }
    
    console.log('🔍 刷新时检查:', {
      hasMap: !!props.map,
      mapType: props.map?.constructor?.name,
      markersCount: props.markers.length,
      isMapReady: isMapReady.value
    })
    
    // 遍历每个标记点，随机更新位置
    props.markers.forEach((marker, index) => {
      // 获取当前坐标
      const oldPos = marker.getPosition()
      const oldLng = oldPos.getLng()
      const oldLat = oldPos.getLat()
      
      // 生成小范围随机偏移（±0.01 度，约 1 公里）
      const newLng = oldLng + (Math.random() - 0.5) * 0.02
      const newLat = oldLat + (Math.random() - 0.5) * 0.02
      
      // ✅ 直接调用高德 Marker 的 setPosition 方法更新位置
      marker.setPosition([newLng, newLat])
      
      // ❌ 移除以下有问题的动画代码（高德 2.0 不支持动态 setAnimation）
      // marker.setAnimation('AMAP_ANIMATION_BOUNCE')
      // setTimeout(() => { marker.setAnimation(null) }, 2000)
      
      // ✅ 替代方案：用视觉反馈代替动画（可选）
      // 临时改变标记点颜色/图标，表示已刷新
      const originalIcon = marker.getIcon()
      marker.setExtData({ ...marker.getExtData(), refreshed: true })
      
      // 1 秒后恢复（如果需要）
      setTimeout(() => {
        marker.setExtData({ ...marker.getExtData(), refreshed: false })
      }, 1000)
    })
    
    // 可选：刷新后轻微调整视野，确保所有点可见
    if (props.markers.length > 0) {
      props.map.setFitView(props.markers)
    }
  }
  </script>
  <style scoped>
  .left-panel {
    padding: 15px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    width: 220px;
    flex-shrink: 0;
  }
  
  .left-panel h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .refresh-btn {
    width: 100%;
    padding: 10px;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
  }
  
  .refresh-btn:hover:not(:disabled) {
    background-color: #66b1ff;
  }
  
  .refresh-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  .hint {
    margin: 12px 0 0 0;
    font-size: 12px;
    color: #909399;
    text-align: center;
    line-height: 1.4;
  }
  </style>