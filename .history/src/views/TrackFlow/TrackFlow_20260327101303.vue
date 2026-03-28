<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
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
      
      
    </div>

    <!-- 右侧地图区域 -->
    <div class="map-wrapper">
      <!-- 地图容器：key 确保 MMSI 变化时重建 -->
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
      ></div>

      <!-- 加载遮罩 -->
      <div v-show="loading" class="loading-mask">
        <div class="spinner"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>

      <!-- 错误提示 -->
      <div v-show="error" class="error-toast" @click="error = null">
        ⚠️ {{ error }} <span class="close-hint">（点击关闭）</span>
      </div>

      <!-- 数据信息 -->
      <div v-show="hasData && !loading" class="data-info">
        <span>📊 {{ currentPointsCount }} 个轨迹点</span>
        <span v-if="queryRange.time.start && queryRange.time.end">
          | 🕐 {{ formatDuration(queryRange.time.end - queryRange.time.start) }}
        </span>
      </div>

      <!-- MMSI 标签 -->
      <div class="mmsi-tag">
        🚢 MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import TimeSlider from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import { useTrackFlow } from './useTrackFlow'

// 地图容器引用
const mapContainerRef = ref(null)

// 使用核心逻辑组合函数
const {
  // 状态
  currentMmsi, globalRange, queryRange, loading, error, currentPointsCount, hasData,
  // 方法
  onQuery, refreshQuery, exportTrajectory, clearMap, centerMap,
  // 工具函数
  formatDuration,
  // 生命周期
  setup, teardown,
  // 暴露方法
  exposeMethods
} = useTrackFlow(mapContainerRef)

// 生命周期
onMounted(async () => {
  await setup()
})

onBeforeUnmount(() => {
  teardown()
})

// 暴露方法给父组件
defineExpose(exposeMethods)
</script>

<style scoped>
/* ============ 布局样式 ============ */
.track-flow-container {
  display: flex;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background: #f5f7fa;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}

/* 左侧面板 */
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
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
}

/* 扩展按钮 */
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
  padding: 0.65rem 1rem;
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
  transform: translateX(3px);
}

.ext-btn.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: #fff;
  border-color: #007bff;
}

.ext-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3, #004494);
  border-color: #004494;
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 右侧地图 */
.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #e5e7eb;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

/* 加载遮罩 */
.loading-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.98);
  padding: 1.2rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  font-size: 1rem;
  color: #333;
  border: 1px solid #e0e6ed;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  color: #991b1b;
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  border-left: 4px solid #ef4444;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 1001;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.error-toast:hover { opacity: 0.95; }
.close-hint { font-size: 0.8rem; color: #6b7280; margin-left: 0.5rem; }

/* 数据信息 */
.data-info {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.98);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.12);
  font-size: 0.9rem;
  color: #374151;
  z-index: 1000;
  border: 1px solid #e5e7eb;
}

/* MMSI 标签 */
.mmsi-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.98);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 0.9rem;
  color: #374151;
  z-index: 1000;
  border: 1px solid #e5e7eb;
}
.mmsi-tag strong { color: #0066cc; font-family: monospace; }

/* Leaflet 弹窗优化 */
:deep(.leaflet-popup-content) { margin: 10px 14px; line-height: 1.5; }
:deep(.leaflet-popup-tip) { background: #fff; }
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}

/* 响应式 */
@media (max-width: 1024px) {
  .side-panel { width: 340px; min-width: 340px; }
}

@media (max-width: 768px) {
  .track-flow-container { flex-direction: column; }
  .side-panel {
    width: 100%; min-width: 100%; max-width: 100%;
    height: 45vh; border-right: none; border-bottom: 1px solid #dee2e6;
  }
  .map-wrapper { height: 55vh; }
}
</style>