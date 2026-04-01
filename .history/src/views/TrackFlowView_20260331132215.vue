<!-- src/views/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- ✅ 选项卡切换 -->
      <nav class="panel-tabs" role="tablist" aria-label="面板类型切换">
        <button
          class="tab-btn"
          :class="{ active: activePanel === 'timeSlider' }"
          @click="activePanel = 'timeSlider'"
          role="tab"
          :aria-selected="activePanel === 'timeSlider'"
          aria-controls="time-slider-panel"
        >
          <span aria-hidden="true">📅</span>
          <span>时间轴</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activePanel === 'player' }"
          @click="activePanel = 'player'"
          role="tab"
          :aria-selected="activePanel === 'player'"
          aria-controls="player-panel"
        >
          <span aria-hidden="true">▶️</span>
          <span>播放器</span>
        </button>
      </nav>

      <!-- 模块 1: 时间/索引查询 -->
      <div
        v-show="activePanel === 'timeSlider'"
        id="time-slider-panel"
        role="tabpanel"
        aria-labelledby="time-slider-tab"
        class="panel-content"
      >
        <TimeSliderPanel
          :key="`time-${mmsi}`" 
          ref="timeSliderRef"
          :mmsi="mmsi"
          :totalCount="totalCount"
          :mapOp="mapOp"
        />
      </div>

      <!-- 模块 2: 轨迹播放器 -->
      <div
        v-show="activePanel === 'player'"
        id="player-panel"
        role="tabpanel"
        aria-labelledby="player-tab"
        class="panel-content"
      >
        <PlayerCard
          v-if="mmsi"
          :key="`player-${mmsi}`"  
          ref="playerCardRef"
          :mmsi="mmsi"
          :totalCount="totalCount"
          :mapOp="mapOp" 
        />
      </div>
      
      <!-- 状态提示 -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>
    </aside>

    <!-- 🗺️ 右侧地图展示区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示" @click="onMapClick">
      <div 
        :id="'mapContainer-' + mmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>
      
      <!-- 🆕 图层切换控件 -->
      <div class="layer-switch" role="group" aria-label="地图图层切换">
        <button  
          class="layer-btn" 
          :class="{ active: currentLayer === 'standard' }"
          @click="mapOp.switchBaseLayer('standard')"
          :disabled="loading"
        >
          🗺️ 标准地图
        </button>
        <button  
          class="layer-btn" 
          :class="{ active: currentLayer === 'satellite' }"
          @click="mapOp.switchBaseLayer('satellite')"
          :disabled="loading"
        >
          🛰️ 卫星地图
        </button>
      </div>

      <!-- ⏳ 加载遮罩 -->
      <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>
      
      <!-- ⚠️ 错误提示 -->
      <div v-show="error" class="error-toast map-toast" role="alert">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      </div>
      
      <!-- 📊 数据信息 -->
      <div v-show="hasData && !loading" class="data-info" role="status">
        <span><span aria-hidden="true">📊</span><b>{{ currentPointsCount }}</b> 个轨迹点</span>
        <span v-if="playerIsPlaying">|</span>
        <span v-if="playerIsPlaying"><span aria-hidden="true">▶️</span> 播放中</span>
      </div>
      
      <!-- 🚢 MMSI 标签 -->
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ mmsi }}</strong>
      </div>
      
    </section>
    
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, markRaw, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import useMapOperation from '@/assets/mapOperation/mapOperation'

// ========== 📦 状态管理 ==========
const route = useRoute()

const mapContainerRef = ref(null)
const timeSliderRef = ref(null)
const playerCardRef = ref(null)

// 船舶参数
const mmsi = ref('')
const totalCount = ref(0)

// 地图操作
const mapOp = markRaw(useMapOperation(mapContainerRef))

// ========== 🔍 监听 URL 参数变化 ==========
watch(
  () => route.query,
  (newQuery) => {
    const newMmsi = newQuery.mmsi?.toString().trim() || ''
    const newTotalCount = Number(newQuery.totalCount) || 0
    
    // ✅ 修复：即使 newMmsi 为空，也要对比更新（处理清空参数的场景）
    if (newMmsi !== mmsi.value || newTotalCount !== totalCount.value) {
      mmsi.value = newMmsi
      totalCount.value = newTotalCount
      
      // ✅ 关键：参数更新后，确保子组件拿到最新值
      if (newMmsi) {
        nextTick(() => {
          // 触发子组件的数据加载（根据你的组件接口调整）
          timeSliderRef.value?.initByParams?.(newMmsi, newTotalCount)
          playerCardRef.value?.initByParams?.(newMmsi, newTotalCount)

          timeSliderRef.value.resetToDefault()
        })
      }
    }
  },
  { immediate: true, deep: true }
)




// ========== 🗺️ 地图初始化 ==========
onMounted(async () => {
  await mapOp.init({ center: [122.2, 31.2], zoom: 8 })
  
})

// ========== 🧹 清理资源 ==========
onUnmounted(() => {
  if (mapOp && typeof mapOp.destroy === 'function') {
    mapOp.destroy()
  }
})

// ✅ 面板切换状态
const activePanel = ref('timeSlider') // 'timeSlider' | 'player'
// 面板切换时同步状态
const syncPanelState = () => {
  if (activePanel.value === 'player' && playerCardRef.value) {
    playerIsPlaying.value = playerCardRef.value.isPlaying?.value || false
  } else {
    playerIsPlaying.value = false
  }
}


</script>















<style scoped>
/* ============ 🏗️ 容器布局 ============ */
.track-flow-container {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
}

/* ============ 📋 左侧面板 ============ */
.side-panel {
  width: 400px;
  min-width: 320px;
  max-width: 450px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 0;
  gap: 0;
}

/* ✅ 选项卡样式 */
.panel-tabs {
  display: flex;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  padding: 0;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #64748b;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover:not(.active) {
  background: #e2e8f0;
  color: #334155;
}

.tab-btn.active {
  background: #fff;
  color: #1e40af;
  border-bottom-color: #3b82f6;
}

.tab-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* 面板内容区域 */
.panel-content {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
}

/* ============ 🗺️ 右侧地图 ============ */
.map-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #eef2f7;
}

.map-container { 
  width: 100%; 
  height: 100%; 
}

/* ============ 🎭 浮层 ============ */
.loading-mask, .error-toast, .data-info, .mmsi-tag, .layer-switch {
  position: absolute;
  z-index: 20;
}

.layer-switch {
  top: 20px;
  right: 20px;
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.layer-btn {
  border: none;
  background: #fff;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #333;
  border-right: 1px solid #e0e0e0;
}

.layer-btn:last-child {
  border-right: none;
}

.layer-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.layer-btn.active {
  background: #1976d2;
  color: white;
}

.layer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-mask {
  top: 50%; 
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.95);
  padding: 1rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: auto;
}

.spinner {
  width: 20px; 
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { 
  to { transform: rotate(360deg); } 
}

.error-toast {
  top: 1rem; 
  right: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  pointer-events: auto;
  max-width: 300px;
}

.error-toast.map-toast {
  top: auto; 
  bottom: 1rem; 
  left: 1rem; 
  right: auto;
  max-width: none;
}

.data-info {
  bottom: 1rem; 
  left: 1rem;
  background: rgba(255,255,255,0.95);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  pointer-events: auto;
  display: flex; 
  gap: 0.5rem;
}

.mmsi-tag {
  top: 1rem; 
  left: 1rem;
  background: rgba(30, 64, 175, 0.95);
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  pointer-events: auto;
}

/* ============ 📱 响应式 ============ */
@media (max-width: 768px) {
  .track-flow-container { 
    flex-direction: column; 
  }
  
  .side-panel {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .map-wrapper { 
    height: 50vh; 
  }
  
  .panel-tabs {
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .tab-btn {
    padding: 10px 12px;
    font-size: 13px;
  }
}

/* ============ 🎨 滚动条美化 ============ */
.side-panel::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.side-panel::-webkit-scrollbar-track,
.panel-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.side-panel::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.side-panel::-webkit-scrollbar-thumb:hover,
.panel-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>