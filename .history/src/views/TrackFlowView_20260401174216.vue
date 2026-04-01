<!-- src/views/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" :style="{ width: panelWidth + 'px' }" role="complementary" aria-label="查询控制面板">
      <!-- ✅ 左侧图标导航栏（垂直排列） -->
      <nav class="panel-nav" role="tablist" aria-label="面板类型切换">
        
        <!-- 时间轴面板切换按钮 -->
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'timeSlider' }"
          @click="activePanel = 'timeSlider'"
          role="tab"
          :aria-selected="activePanel === 'timeSlider'"
          aria-controls="time-slider-panel"
          title="时间轴查询"
        >
          <span class="icon" aria-hidden="true">📅</span>
          <span class="tooltip">时间轴</span>
          <span class="active-indicator"></span>
        </button>
        
        <!-- 播放器面板切换按钮 -->
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'player' }"
          @click="activePanel = 'player'"
          role="tab"
          :aria-selected="activePanel === 'player'"
          aria-controls="player-panel"
          title="轨迹播放"
        >
          <span class="icon" aria-hidden="true">▶️</span>
          <span class="tooltip">播放器</span>
          <span class="active-indicator"></span>
        </button>
        <!-- 📌 在 panel-nav 中添加第三个导航按钮 -->
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'markCard' }"
          @click="activePanel = 'markCard'"
          role="tab"
          aria-controls="mark-card-panel"
          title="停留标记"
        >
          <span class="icon" aria-hidden="true">🏷️</span>
          <span class="tooltip">停留标记</span>
          <span class="active-indicator"></span>
        </button>

        
        <!-- 分隔线 -->
        <div class="nav-divider"></div>
        
        <!-- 设置按钮（可扩展） -->
        <button
          class="nav-icon-btn"
          @click="handleSettings"
          title="设置"
        >
          <span class="icon" aria-hidden="true">⚙️</span>
          <span class="tooltip">设置</span>
        </button>
        
      </nav>

      <!-- 面板内容区域 -->
      <div class="panel-content-wrapper">
        
        <!-- 模块 1: 时间/索引查询 -->
        <transition name="panel-fade" mode="out-in">
          <div
            v-if="activePanel === 'timeSlider'"
            id="time-slider-panel"
            role="tabpanel"
            aria-labelledby="time-slider-tab"
            class="panel-content"
            key="time-slider"
          >
            <TimeSliderPanel
              :key="`time-${mmsi}`" 
              ref="timeSliderRef"
              :mmsi="mmsi"
              :totalCount="totalCount"
              :mapOp="mapOp"
            />
          </div>
        </transition>

        <!-- 模块 2: 轨迹播放器 -->
        <transition name="panel-fade" mode="out-in">
          <div
            v-if="activePanel === 'player'"
            id="player-panel"
            role="tabpanel"
            aria-labelledby="player-tab"
            class="panel-content"
            key="player"
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
        </transition>

        <!-- 模块 3: 管理停留段 -->
        <transition name="panel-fade" mode="out-in">
          <div
            v-if="activePanel === 'markCard'"
            id="mark-card-panel"
            role="tabpanel"
            class="panel-content"
            key="mark-card"
          >
          
          <MarkCard
            :mmsi="mmsi"            
            :has-points="totalCount > 0"
            @mark-update="syncMapHighlight"  
            @mark-highlight="focusTrackSegment" 
          />
          </div>
        </transition> 
                
      </div>
      
      <!-- 状态提示 -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>

      <div 
        class="resize-hotzone" 
        @mousedown="startResize"
        @dblclick="resetPanelWidth"
        title="拖拽调整宽度，双击重置"
        aria-label="调整面板宽度"
      ></div>
      
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
import MarkCard from '@/components/StayMarkPanel/MarkCard.vue'

// 🔹 声明ref
// ========== 📦 状态管理 ==========
const route = useRoute()

const mapContainerRef = ref(null)
const timeSliderRef = ref(null)
const playerCardRef = ref(null)
const markCardRef = ref(null)

// 船舶参数
const mmsi = ref('')
const totalCount = ref(0)

// 地图操作
const mapOp = markRaw(useMapOperation(mapContainerRef))

// ✅ 面板切换状态
const activePanel = ref('timeSlider') // 'timeSlider' | 'player'

// ========== 🔍 监听 URL 参数变化 ==========
watch(
  () => route.query,
  (newQuery) => {
    const newMmsi = newQuery.mmsi?.toString().trim() || ''
    const newTotalCount = Number(newQuery.totalCount) || 0
    
    if (newMmsi !== mmsi.value || newTotalCount !== totalCount.value) {
      mmsi.value = newMmsi
      totalCount.value = newTotalCount

      if (newMmsi) {
        nextTick(() => {
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
  stopResize()
  if (mapOp && typeof mapOp.destroy === 'function') {
    mapOp.destroy()
  }
})

// ========== 🎯 事件处理 ==========
const onMapClick = (e) => {
  console.log('Map clicked:', e)
}

const handleSettings = () => {
  // 可扩展：打开设置面板
  console.log('打开设置...')
}

// 面板切换时同步状态（如需）
const syncPanelState = () => {
  if (activePanel.value === 'player' && playerCardRef.value) {
    // playerIsPlaying.value = playerCardRef.value.isPlaying?.value || false
  }
}

// 可调节面板宽度
const panelWidth = ref(500)        // 初始宽度 500px（原为400，现增大）
const isResizing = ref(false)

// 拖拽调整宽度
const startResize = (e) => {
  e.preventDefault() // ✅ 防止拖拽时触发文本选择
  isResizing.value = true
  document.body.classList.add('resizing') // ✅ 替代直接设置 style
  document.addEventListener('mousemove', onResize, { passive: true })
  document.addEventListener('mouseup', stopResize, { passive: true })
}

const onResize = (e) => {
  if (!isResizing.value) return
  const container = document.querySelector('.track-flow-container')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  let newWidth = e.clientX - rect.left
  newWidth = Math.min(800, Math.max(320, newWidth))
  
  panelWidth.value = newWidth
  
  document.documentElement.style.setProperty('--panel-width', newWidth + 'px')
}

const stopResize = () => {
  if (!isResizing.value) return
  isResizing.value = false
  document.body.classList.remove('resizing')
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}


// ✅ 暴露给父组件
defineExpose({
  activePanel,
  timeSliderRef,
  playerCardRef,
  syncPanelState
})
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
  position: relative; /* ✅ 添加：为可能的 absolute 子元素提供定位基准 */
}

/* ============ 📋 左侧面板（更新） ============ */
.side-panel {
  /* ✅ 关键：添加 position: relative，为内部绝对定位的热区提供基准 */
  position: relative;
  
  /* 宽度由 :style 动态绑定 */
  height: 100%;
  display: flex;
  flex-direction: row;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
  z-index: 10; /* ✅ 确保热区在地图上方 */
}

/* ============ ✨ 新增：隐形拖拽热区 ============ */
.resize-hotzone {
  /* ✅ 绝对定位在面板右侧边缘 */
  position: absolute;
  top: 0;
  right: 0;      /* ✅ 紧贴右侧 */
  bottom: 0;
  width: 10px;   /* ✅ 热区宽度：8-12px 最佳体验 */
  
  /* ✅ 完全透明，但能响应鼠标事件 */
  background: transparent;
  cursor: col-resize;  /* ✅ 标准列调整光标 */
  
  /* ✅ 层级：高于面板内容，低于可能的弹窗 */
  z-index: 20;
  
  /* ✅ 防止选中文本 */
  user-select: none;
  -webkit-user-select: none;
  
  /* ✅ 可选：极细微的视觉提示（默认隐藏） */
  border-right: 1px solid transparent;
  transition: border-color 0.15s ease;
}

/* ✅ Hover 时：显示微弱视觉反馈 + 光标增强 */
.resize-hotzone:hover {
  border-right-color: rgba(59, 130, 246, 0.4); /* 极细蓝色提示线 */
  /* ✅ 可选：添加轻微背景，帮助调试 */
  /* background: rgba(59, 130, 246, 0.03); */
}

/* ✅ 拖拽中：增强视觉反馈 */
body.resizing .resize-hotzone {
  border-right-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

/* ✅ 可选：添加一个悬浮的 ↔ 图标提示（纯装饰，不干扰点击） */
.resize-hotzone::after {
  content: '↔';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  /* ✅ 默认隐藏，hover 时淡入 */
  opacity: 0;
  color: rgba(59, 130, 246, 0.6);
  font-size: 14px;
  font-weight: 300;
  pointer-events: none; /* ✅ 不拦截鼠标事件 */
  transition: opacity 0.15s ease;
  
  /* ✅ 防止文字选中 */
  user-select: none;
}

.resize-hotzone:hover::after {
  opacity: 1;
}

/* ✅ 拖拽时保持图标可见 */
body.resizing .resize-hotzone::after {
  opacity: 0.8;
  color: #3b82f6;
}


/* ============ ✅ 左侧图标导航栏（垂直排列） ============ */

.panel-nav {
  width: 56px;
  min-width: 56px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  background: #1e293b; /* 深色背景，专业感 */
  border-right: 1px solid #334155;
  gap: 8px;
  flex-shrink: 0;
  z-index: 5;
}

/* 导航按钮样式 */
.nav-icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #94a3b8;
}

.nav-icon-btn:hover {
  background: #334155;
  color: #fff;
}

.nav-icon-btn.active {
  background: #3b82f6;
  color: #fff;
}

.nav-icon-btn .icon {
  font-size: 18px;
  line-height: 1;
}

/* 激活指示条（左侧竖线） */
.nav-icon-btn .active-indicator {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.nav-icon-btn.active .active-indicator {
  opacity: 1;
}

/* 悬停提示（Tooltip） */
.nav-icon-btn .tooltip {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  padding: 4px 10px;
  background: #1e293b;
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  border-radius: 4px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.nav-icon-btn .tooltip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #1e293b;
}

.nav-icon-btn:hover .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(12px);
}

/* 分隔线 */
.nav-divider {
  width: 24px;
  height: 1px;
  background: #334155;
  margin: 8px 0;
}

/* ✅ 内容区域（占据剩余空间） */
.panel-content-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.panel-content {
  flex: 1;
  padding: 0.75rem 1rem;
  overflow-y: auto;
}

/* 面板切换过渡动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
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
    flex-direction: column; /* 移动端恢复垂直布局 */
  }
  
  .panel-nav {
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: 8px;
    border-right: none;
    border-bottom: 1px solid #334155;
  }
  
  .nav-icon-btn {
    width: 44px;
    height: 44px;
  }
  
  .nav-icon-btn .tooltip {
    left: 50%;
    top: 100%;
    transform: translateX(-50%) translateY(8px);
  }
  
  .nav-icon-btn .tooltip::before {
    right: auto;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border-right-color: transparent;
    border-top-color: #1e293b;
  }
  
  .nav-icon-btn:hover .tooltip {
    transform: translateX(-50%) translateY(12px);
  }
  
  .nav-divider {
    width: 1px;
    height: 24px;
  }
  
  .map-wrapper { 
    height: 50vh; 
  }
}

/* ============ 🎨 滚动条美化 ============ */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ============ 🎨 深色导航栏滚动条 ============ */
.panel-nav::-webkit-scrollbar {
  width: 4px;
}

.panel-nav::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 2px;
}
</style>