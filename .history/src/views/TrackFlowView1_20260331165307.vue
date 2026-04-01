<!-- src/views/TrackFlowView.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 图标导航栏 -->
      <nav class="panel-nav" role="tablist" aria-label="面板类型切换">
        
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'timeSlider' }"
          @click="activePanel = 'timeSlider'"
          role="tab" :aria-selected="activePanel === 'timeSlider'"
          aria-controls="time-slider-panel" title="时间轴查询"
        >
          <span class="icon" aria-hidden="true">📅</span>
          <span class="tooltip">时间轴</span>
          <span class="active-indicator"></span>
        </button>
        
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'player' }"
          @click="activePanel = 'player'"
          role="tab" :aria-selected="activePanel === 'player'"
          aria-controls="player-panel" title="轨迹播放"
        >
          <span class="icon" aria-hidden="true">▶️</span>
          <span class="tooltip">播放器</span>
          <span class="active-indicator"></span>
        </button>
        
        <!-- 🔧 标记面板 -->
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'marker' }"
          @click="activePanel = 'marker'"
          role="tab" :aria-selected="activePanel === 'marker'"
          aria-controls="marker-panel" title="停留标记"
        >
          <span class="icon" aria-hidden="true">🏷️</span>
          <span class="tooltip">标记</span>
          <span class="active-indicator"></span>
        </button>
        
        <div class="nav-divider"></div>
        <button class="nav-icon-btn" @click="handleSettings" title="设置">
          <span class="icon" aria-hidden="true">⚙️</span>
          <span class="tooltip">设置</span>
        </button>
      </nav>

      <!-- 面板内容 -->
      <div class="panel-content-wrapper">
        
        <!-- 时间轴面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'timeSlider'" class="panel-content" key="time-slider">
            <TimeSliderPanel
              :key="`time-${mmsi}`" 
              ref="timeSliderRef"
              :mmsi="mmsi" :totalCount="totalCount" :mapOp="mapOp"
            />
          </div>
        </transition>

        <!-- 播放器面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'player'" class="panel-content" key="player">
            <PlayerCard
              v-if="mmsi" :key="`player-${mmsi}`" ref="playerCardRef"
              :mmsi="mmsi" :totalCount="totalCount" :mapOp="mapOp" 
            />
          </div>
        </transition>
        
        <!-- 🔧 标记面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'marker'" class="panel-content" key="marker">
            <MarkCard
              v-if="mmsi" ref="markCardRef"
              :mmsi="mmsi"
              :marks="pendingMarks"
              :mapOp="mapOp"
              :is-marking="isMarking"
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
      
      <!-- 错误提示 -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>
    </aside>

    <!-- 🗺️ 地图区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示" @click="onMapClick">
      <div 
        :id="'mapContainer-' + mmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application" aria-label="船舶轨迹地图"
      ></div>
      
      <!-- 🔧 标记流程提示 -->
      <transition name="fade">
        <div v-if="isMarking" class="mark-flow-hint" role="status">
          <span class="hint-icon" aria-hidden="true">{{ markFlow.mode === 'selecting-start' ? '1️⃣' : '2️⃣' }}</span>
          <span class="hint-text">{{ markFlow.mode === 'selecting-start' ? '请点击轨迹选择【开始点】' : '请点击轨迹选择【结束点】' }}</span>
          <button class="hint-cancel" @click="cancelMarkFlow">取消</button>
        </div>
      </transition>
      
      <!-- 临时高亮信息 -->
      <div v-if="tempHighlight.length > 0" class="temp-highlight-info">
        ✨ 已选择 {{ tempHighlight.length }} 个轨迹点
      </div>
      
      <!-- 图层切换 -->
      <div class="layer-switch" role="group" aria-label="地图图层切换">
        <button class="layer-btn" :class="{ active: currentLayer === 'standard' }" @click="mapOp.switchBaseLayer('standard')" :disabled="loading">🗺️ 标准</button>
        <button class="layer-btn" :class="{ active: currentLayer === 'satellite' }" @click="mapOp.switchBaseLayer('satellite')" :disabled="loading">🛰️ 卫星</button>
      </div>

      <!-- 加载遮罩 -->
      <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>
      
      <!-- 数据信息 -->
      <div v-show="hasData && !loading" class="data-info" role="status">
        <span>📊 <b>{{ currentPointsCount }}</b> 个轨迹点</span>
        <span v-if="isMarking">| {{ markFlow.mode === 'selecting-start' ? '🚩 等待起点' : '🏁 等待终点' }}</span>
      </div>
      
      <!-- MMSI 标签 -->
      <div class="mmsi-tag" role="note">🚢 MMSI: <strong>{{ mmsi }}</strong></div>
    </section>
    
    <!-- 🔧 编辑弹窗 -->
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
// ========== 📦 导入（只导入，不写逻辑） ==========
import { ref, watch, onMounted, onUnmounted, markRaw, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'

// 组件
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import MarkCard from '@/components/StayMarkPanel/MarkCard.vue'
import MarkEditDialog from '@/components/StayMarkPanel/MarkEditDialog.vue'

// 地图 + 标记模块
import useMapOperation from '@/assets/mapOperation/mapOperation'
import { markFlow, pendingMarks, startMarkFlow as _startMarkFlow, cancelMarkFlow as _cancelMarkFlow, saveMarkToTable, submitPendingMarks } from '@/assets/mapKick/useMarkFlow'
import { markEventBus, MARK_EVENTS } from '@/assets/mapKick/markEventBus'
import { useTrajectoryPopup } from '@/assets/mapKick/useTrajectoryPopup'
import { createMapClickHandler, handlePointsSelected } from '@/assets/mapKick/onMapClick'

// ========== 🎯 状态（响应式引用） ==========
const route = useRoute()
const mapContainerRef = ref(null)
const timeSliderRef = ref(null)
const playerCardRef = ref(null)
const markCardRef = ref(null)

const mmsi = ref('')
const totalCount = ref(0)
const activePanel = ref('timeSlider')
const loading = ref(false)
const error = ref(null)
const currentLayer = ref('standard')
const hasData = ref(false)
const currentPointsCount = ref(0)

// 标记相关
const editDialog = ref({ visible: false, currentMark: null, isNew: false })
const tempHighlight = ref([])
const trajectoryPoints = ref([])

// 🔧 计算属性（只读）
const mapOp = markRaw(useMapOperation(mapContainerRef))
const popupApi = useTrajectoryPopup(() => mapOp.instance)
const isMarking = computed(() => markFlow.value.mode !== 'idle')

// ========== 🔗 事件绑定（直接引用外部函数） ==========
const onMapClick = createMapClickHandler({
  mapOp,
  trajectoryPoints,
  mmsi,
  onHighlight: async (startIdx, endIdx) => {
    // 高亮逻辑（可移到外部）
    if (mapOp.highlightTrajectory) {
      const segment = trajectoryPoints.value.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1)
      await mapOp.highlightTrajectory(segment, { color: '#667eea', weight: 4, opacity: 0.9 })
      tempHighlight.value = segment.map(p => p.idx)
    }
  },
  onEditOpen: (mark) => openEditDialog(mark, { isNew: true })
})

// ========== 🎯 事件处理（极简转发） ==========
const startMarkFlow = (point) => _startMarkFlow(point)
const cancelMarkFlow = () => { _cancelMarkFlow(); tempHighlight.value = [] }

const onMarkSelect = (mark) => {
  if (mark.startPoint?.lat && mapOp.flyTo) {
    const centerLat = (mark.startPoint.lat + mark.endPoint?.lat) / 2
    const centerLon = (mark.startPoint.lon + mark.endPoint?.lon) / 2
    mapOp.flyTo(centerLon, centerLat, 13)
  }
}

const onMarkReselect = (mark) => {
  if (mapOp.clearHighlight) mapOp.clearHighlight()
  _startMarkFlow(mark.startPoint)
  tempHighlight.value = []
}

const onMarkUpdate = ({ id, field, value }) => {
  // 直接调用外部函数更新
  import('@/assets/mapKick/useMarkFlow').then(({ updatePendingMark }) => {
    updatePendingMark(id, field, value)
  })
}

const onMarkDelete = (id) => {
  import('@/assets/mapKick/useMarkFlow').then(({ removePendingMark }) => {
    const removed = removePendingMark(id)
    if (removed && mapOp.removeStayMarker) mapOp.removeStayMarker(removed)
  })
}

const onSubmitMarks = async () => {
  loading.value = true
  try {
    const result = await submitPendingMarks(async (marks) => {
      return await fetch('/api/stay-marks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks })
      }).then(r => r.json())
    })
    if (!result.success) throw new Error(result.error)
    return result
  } finally {
    loading.value = false
  }
}

const openEditDialog = (mark, { isNew = false } = {}) => {
  editDialog.value = { visible: true, currentMark: { ...mark }, isNew }
}

const closeEditDialog = () => {
  editDialog.value.visible = false
  editDialog.value.currentMark = null
}

const handleDialogSave = (updatedMark) => {
  const result = saveMarkToTable(updatedMark, { mmsi: mmsi.value })
  if (result.success) {
    closeEditDialog()
    cancelMarkFlow()
  } else {
    error.value = result.error || '保存失败'
  }
}

const handleDialogDelete = (markId) => {
  import('@/assets/mapKick/useMarkFlow').then(({ removePendingMark }) => {
    const removed = removePendingMark(markId)
    if (removed && mapOp.removeStayMarker) mapOp.removeStayMarker(removed)
    closeEditDialog()
  })
}

const handleSettings = () => { console.log('打开设置...') }

// ========== 🔄 监听 + 生命周期 ==========
watch(() => route.query, (newQuery) => {
  const newMmsi = newQuery.mmsi?.toString().trim() || ''
  const newTotalCount = Number(newQuery.totalCount) || 0
  if (newMmsi !== mmsi.value || newTotalCount !== totalCount.value) {
    mmsi.value = newMmsi
    totalCount.value = newTotalCount
    if (newMmsi) {
      nextTick(() => {
        timeSliderRef.value?.initByParams?.(newMmsi, newTotalCount)
        playerCardRef.value?.initByParams?.(newMmsi, newTotalCount)
        timeSliderRef.value.resetToDefault?.()
        loadTrajectoryPoints(newMmsi, newTotalCount)
      })
    }
  }
}, { immediate: true, deep: true })

onMounted(async () => {
  await mapOp.init({ center: [122.2, 31.2], zoom: 8 })
  mapOp.instance?.on('click', onMapClick)
  
  // 监听事件总线
  markEventBus.on(MARK_EVENTS.END, ({ mark }) => openEditDialog(mark, { isNew: true }))
})

onUnmounted(() => {
  mapOp.instance?.off('click', onMapClick)
  mapOp.destroy?.()
  markEventBus.clear()
  tempHighlight.value = []
})

// ========== 🔧 辅助函数 ==========
const loadTrajectoryPoints = async (mmsiVal, count) => {
  if (!mmsiVal || !count) return
  try {
    const res = await fetch(`/api/trajectory/points?mmsi=${mmsiVal}&count=${count}`)
    const data = await res.json()
    if (data.points) {
      trajectoryPoints.value = data.points.map((p, idx) => ({ ...p, idx: p.idx ?? idx, timestamp: p.utc_time || p.timestamp }))
      hasData.value = true
      currentPointsCount.value = trajectoryPoints.value.length
    }
  } catch (err) { console.warn('⚠️ 加载轨迹点失败:', err) }
}

// ========== 📤 暴露 ==========
defineExpose({ activePanel, timeSliderRef, playerCardRef, markCardRef, pendingMarks, markFlow })
</script>

<style scoped>
/* ============ 原有样式保持不变 ============ */
/* ... 保留用户原始文件中的所有 CSS ... */

/* 🔧 新增样式 */
.mark-flow-hint {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea, #764ba2); color: white;
  padding: 10px 20px; border-radius: 24px; font-size: 13px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4); z-index: 1000;
  animation: slideDown 0.3s ease;
}
.hint-icon { font-size: 16px; font-weight: bold; }
.hint-text { flex: 1; }
.hint-cancel {
  background: rgba(255,255,255,0.2); border: none; color: white;
  padding: 4px 12px; border-radius: 14px; font-size: 12px; cursor: pointer;
}
.hint-cancel:hover { background: rgba(255,255,255,0.3); }
@keyframes slideDown { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

.temp-highlight-info {
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: rgba(102, 126, 234, 0.9); color: white;
  padding: 6px 14px; border-radius: 20px; font-size: 12px; z-index: 900;
}
.mark-dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex;
  align-items: center; justify-content: center; z-index: 2000;
  animation: fadeIn 0.2s ease;
}
.mark-dialog-container { animation: scaleIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }



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