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


.marker-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.marker-card legend {
  font-weight: 600;
  color: #333;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.mark-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.btn-mark {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-mark.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-mark:not(.primary) {
  background: #f1f5f9;
  color: #334155;
}

.btn-mark:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-mark:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.empty-hint {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  padding: 30px 20px;
  background: #f8fafc;
  border-radius: 8px;
  line-height: 1.5;
}

.marks-table-wrapper {
  flex: 1;
  overflow: auto;
  margin: 0 -14px;
  padding: 0 14px;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.marks-table th {
  background: #f1f5f9;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  user-select: none;
}

.marks-table th.sortable:hover {
  background: #e2e8f0;
}

.marks-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.mark-row:hover {
  background: #f8fafc;
}

.mark-row.highlighted {
  background: #f0f7ff;
  border-left: 3px solid #667eea;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

.inline-select, .inline-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  transition: border-color 0.2s;
}

.inline-select:focus, .inline-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
  opacity: 0.7;
}

.btn-icon:hover {
  opacity: 1;
  background: #f1f5f9;
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 🔧 备注编辑弹窗 */
.note-dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.note-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  overflow: hidden;
}

.note-dialog-header {
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #334155;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  padding: 0 4px;
}

.note-textarea {
  width: 100%;
  min-height: 100px;
  padding: 14px 18px;
  border: none;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}

.note-textarea:focus {
  outline: none;
}

.note-dialog-footer {
  padding: 12px 18px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.char-count {
  font-size: 11px;
  color: #94a3b8;
}

.btn.primary {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary:hover {
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}
</style>