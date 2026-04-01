<!-- src/views/TrackFlowView.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- ✅ 左侧图标导航栏 -->
      <nav class="panel-nav" role="tablist" aria-label="面板类型切换">
        
        <!-- 时间轴面板 -->
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
        
        <!-- 播放器面板 -->
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
        
        <!-- 🔧 新增：标记面板 -->
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'marker' }"
          @click="activePanel = 'marker'"
          role="tab"
          :aria-selected="activePanel === 'marker'"
          aria-controls="marker-panel"
          title="停留标记"
        >
          <span class="icon" aria-hidden="true">🏷️</span>
          <span class="tooltip">标记</span>
          <span class="active-indicator"></span>
        </button>
        
        <!-- 分隔线 -->
        <div class="nav-divider"></div>
        
        <!-- 设置按钮 -->
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
        
        <!-- 🔧 新增：模块 3 - 停留标记面板 -->
        <transition name="panel-fade" mode="out-in">
          <div
            v-if="activePanel === 'marker'"
            id="marker-panel"
            role="tabpanel"
            class="panel-content"
            key="marker"
          >
            <MarkCard
              v-if="mmsi"
              ref="markCardRef"
              :mmsi="mmsi"
              :marks="pendingMarks"
              :mapOp="mapOp"
              @mark-select="onMarkSelect"
              @mark-reselect="onMarkReselect"
              @mark-update="onMarkUpdate"
              @mark-delete="onMarkDelete"
              @submit="onSubmitMarks"
              @start-mark-flow="startMarkFlow"
            />
          </div>
        </transition>
        
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
      
      <!-- 🔧 标记流程提示 -->
      <transition name="fade">
        <div v-if="markFlow.mode !== 'idle'" class="mark-flow-hint" role="status">
          <span class="hint-icon" aria-hidden="true">
            {{ markFlow.mode === 'selecting-start' ? '1️⃣' : '2️⃣' }}
          </span>
          <span class="hint-text">
            {{ markFlow.mode === 'selecting-start' 
              ? '请点击轨迹选择【开始点】' 
              : '请点击轨迹选择【结束点】' }}
          </span>
          <button class="hint-cancel" @click="cancelMarkFlow">取消</button>
        </div>
      </transition>
      
      <!-- 🔧 临时高亮信息 -->
      <div v-if="tempHighlight.length > 0" class="temp-highlight-info">
        ✨ 已选择 {{ tempHighlight.length }} 个轨迹点
      </div>
      
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
        <span v-if="markFlow.mode !== 'idle'">|</span>
        <span v-if="markFlow.mode !== 'idle'">
          {{ markFlow.mode === 'selecting-start' ? '🚩 等待起点' : '🏁 等待终点' }}
        </span>
      </div>
      
      <!-- 🚢 MMSI 标签 -->
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ mmsi }}</strong>
      </div>
      
    </section>
    
    <!-- 🔧 全局标记编辑弹窗 -->
    <Teleport to="body">
      <div v-if="editDialog.visible" class="mark-dialog-overlay" @click.self="closeEditDialog">
        <div class="mark-dialog-container">
          <MarkEditDialog
            v-if="editDialog.visible"
            :mark="editDialog.currentMark"
            :is-new="editDialog.isNew"
            @save="handleDialogSave"
            @cancel="closeEditDialog"
            @delete="handleDialogDelete"
          />
        </div>
      </div>
    </Teleport>
    
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, markRaw, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import MarkCard from '@/components/StayMarkPanel/MarkCard.vue'
import MarkEditDialog from '@/components/StayMarkPanel/MarkEditDialog.vue'
import useMapOperation from '@/assets/mapOperation/mapOperation'
import { buildPopupContent } from '@/assets/mapKick/trajectoryPopup'

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
const activePanel = ref('timeSlider') // 'timeSlider' | 'player' | 'marker'

// 🔧 标记相关状态
const markFlow = ref({
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,
  endPoint: null,
  tempMark: null
})

// 待提交标记列表
const pendingMarks = ref([])

// 编辑弹窗状态
const editDialog = ref({
  visible: false,
  currentMark: null,
  isNew: false
})

// 临时高亮轨迹点索引
const tempHighlight = ref([])

// 轨迹点缓存（用于标记选择）
const trajectoryPoints = ref([])

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
          // 🔧 加载轨迹点供标记使用
          loadTrajectoryPoints(newMmsi, newTotalCount)
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
  // 清理全局回调
  delete window.__onMarkClick
  delete window.__onNavigate
})


// ========== MarkCard 事件处理 ==========

// 🔧 点击表格记录：地图跳转
const onMarkSelect = (mark) => {
  if (!mark.startPoint?.lat || !mark.endPoint?.lat) return
  
  // 🎯 定位到中心
  const centerLat = (mark.startPoint.lat + mark.endPoint.lat) / 2
  const centerLon = (mark.startPoint.lon + mark.endPoint.lon) / 2
  mapOp?.flyTo?.(centerLon, centerLat, 13)
  
  // 🎨 高亮该段
  highlightSegment(mark.startPoint.idx, mark.endPoint.idx, {
    color: '#667eea',
    weight: 4,
    opacity: 0.9
  })
}

// 🔧 重新选择起止点
const onMarkReselect = (mark) => {
  clearHighlight()
  markFlow.value.tempMark = { ...mark }
  markFlow.value.startPoint = mark.startPoint
  markFlow.value.mode = 'selecting-end'
}

// 🔧 更新标记字段
const onMarkUpdate = ({ id, field, value }) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) {
    mark[field] = value
    if (mapOp?.updateStayMarker) {
      mapOp.updateStayMarker(mark)
    }
  }
}

// 🔧 删除标记
const onMarkDelete = (id) => {
  const idx = pendingMarks.value.findIndex(m => m.id === id)
  if (idx >= 0) {
    const removed = pendingMarks.value.splice(idx, 1)[0]
    if (mapOp?.removeStayMarker) {
      mapOp.removeStayMarker(removed)
    }
  }
}

// 🔧 提交所有标记
const onSubmitMarks = async () => {
  if (pendingMarks.value.length === 0) return
  
  try {
    const marksForApi = pendingMarks.value.map(m => ({
      mmsi: m.mmsi,
      startTime: m.startTime,
      endTime: m.endTime,
      stayType: m.stayType,
      port: m.port,
      note: m.note || '',
      startPoint: { lat: m.startPoint.lat, lon: m.startPoint.lon, idx: m.startPoint.idx },
      endPoint: { lat: m.endPoint.lat, lon: m.endPoint.lon, idx: m.endPoint.idx }
    }))
    
    // 📤 调用后端接口
    const response = await fetch('/api/stay-marks/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks: marksForApi })
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || '提交失败')
    }
    
    const result = await response.json()
    
    // ✅ 更新状态
    pendingMarks.value.forEach((m, i) => {
      m.status = 'synced'
      m.serverId = result.ids?.[i] || result.id
    })
    
    return { success: true, result }
    
  } catch (err) {
    console.error('❌ 提交失败:', err)
    throw err
  }
}

// ========== 🔧 辅助函数 ==========

// 🔧 创建标记数据对象
const createMarkData = (startPoint, endPoint) => {
  const startTs = startPoint.timestamp || startPoint.utc_time
  const endTs = endPoint.timestamp || endPoint.utc_time
  
  return {
    id: `mark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mmsi: mmsi.value,
    startTime: Math.min(startTs, endTs),
    endTime: Math.max(startTs, endTs),
    startPoint: { lat: startPoint.lat, lon: startPoint.lon, idx: startPoint.idx },
    endPoint: { lat: endPoint.lat, lon: endPoint.lon, idx: endPoint.idx },
    stayType: '靠泊',
    port: '',
    note: '',
    status: 'draft',
    createdAt: Date.now()
  }
}

// 🔧 高亮轨迹段
const highlightSegment = async (startIndex, endIndex, options = {}) => {
  if (!trajectoryPoints.value.length || startIndex == null || endIndex == null) return
  
  const [s, e] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
  const segment = trajectoryPoints.value.slice(s, e + 1)
  
  if (segment.length < 2 || !mapOp?.highlightTrajectory) return
  
  tempHighlight.value = segment.map(p => p.idx)
  
  await mapOp.highlightTrajectory(segment, {
    color: options.color || '#667eea',
    weight: options.weight || 4,
    opacity: options.opacity || 0.8,
    layerId: `highlight_${mmsi.value}_${s}_${e}`
  })
}

// 🔧 清除高亮
const clearHighlight = () => {
  if (mapOp?.clearHighlight) {
    mapOp.clearHighlight()
  }
  tempHighlight.value = []
}

// 🔧 加载轨迹点（供标记使用）
const loadTrajectoryPoints = async (mmsiVal, count) => {
  if (!mmsiVal || !count) return
  
  try {
    // 🔧 根据实际接口调整
    const response = await fetch(`/api/trajectory/points?mmsi=${mmsiVal}&count=${count}`)
    const data = await response.json()
    
    if (data.points) {
      trajectoryPoints.value = data.points.map((p, idx) => ({
        ...p,
        idx: p.idx ?? idx,
        timestamp: p.utc_time || p.timestamp
      }))
    }
  } catch (err) {
    console.warn('⚠️ 加载轨迹点失败:', err)
  }
}

// 🔧 时间格式化
const formatTime = (ts) => {
  if (!ts) return '-'
  const t = ts > 1e12 ? ts : ts * 1000
  return new Date(t).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// 🔧 时长格式化
const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分`
}

// ========== 🎯 原有事件处理 ==========
const handleSettings = () => {
  console.log('打开设置...')
}

const syncPanelState = () => {
  if (activePanel.value === 'player' && playerCardRef.value) {
    // playerIsPlaying.value = playerCardRef.value.isPlaying?.value || false
  }
}

// ✅ 暴露给父组件
defineExpose({
  activePanel,
  timeSliderRef,
  playerCardRef,
  markCardRef,
  syncPanelState,
  startMarkFlow,
  cancelMarkFlow
})
</script>


/* ============ 原有样式保持不变 ============ */

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

/* ============ 📋 左侧面板（图标导航 + 内容） ============ */
.side-panel {
  width: 400px;
  min-width: 320px;
  max-width: 450px;
  height: 100%;
  display: flex;
  flex-direction: row; /* ✅ 水平排列：图标栏 + 内容区 */
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
}

/* ✅ 左侧图标导航栏（垂直排列） */
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
/* 🔧 新增：标记流程提示 */
.mark-flow-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.hint-icon {
  font-size: 16px;
  font-weight: bold;
}

.hint-text {
  flex: 1;
}

.hint-cancel {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.hint-cancel:hover {
  background: rgba(255,255,255,0.3);
}

@keyframes slideDown {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* 🔧 临时高亮信息 */
.temp-highlight-info {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(102, 126, 234, 0.9);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  z-index: 900;
}

/* 🔧 编辑弹窗遮罩 */
.mark-dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.mark-dialog-container {
  animation: scaleIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>