<!-- src/views/TrackFlowView.vue -->
<template>
  <main class="track-flow-container">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel">
      
      <!-- 图标导航 -->
      <nav class="panel-nav">
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'timeSlider' }"
          @click="activePanel = 'timeSlider'"
          title="时间轴"
        >📅<span class="tooltip">时间轴</span></button>
        
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'player' }"
          @click="activePanel = 'player'"
          title="播放器"
        >▶️<span class="tooltip">播放器</span></button>
        
        <button
          class="nav-icon-btn"
          :class="{ active: activePanel === 'marker' }"
          @click="activePanel = 'marker'"
          title="标记"
        >🏷️<span class="tooltip">标记</span></button>
        
        <div class="nav-divider"></div>
        <button class="nav-icon-btn" @click="handleSettings" title="设置">⚙️</button>
      </nav>

      <!-- 面板内容 -->
      <div class="panel-content-wrapper">
        
        <!-- 时间轴面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'timeSlider'" class="panel-content">
            <TimeSliderPanel
              v-if="mmsi"
              :key="`time-${mmsi}`"
              :mmsi="mmsi"
              :totalCount="totalCount"
              :mapOp="mapOp"
            />
          </div>
        </transition>

        <!-- 播放器面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'player'" class="panel-content">
            <PlayerCard
              v-if="mmsi"
              :key="`player-${mmsi}`"
              :mmsi="mmsi"
              :totalCount="totalCount"
              :mapOp="mapOp"
            />
          </div>
        </transition>
        
        <!-- 标记面板 -->
        <transition name="panel-fade" mode="out-in">
          <div v-if="activePanel === 'marker'" class="panel-content">
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
            />
          </div>
        </transition>
        
      </div>
      
      <!-- 错误提示 -->
      <div v-if="error" class="error-toast" @click="error = null">
        ⚠️ {{ error }}
      </div>
    </aside>

    <!-- 🗺️ 地图区域 -->
    <section class="map-wrapper" @click="onMapClick">
      <div 
        :id="'mapContainer-' + mmsi" 
        class="map-container" 
        ref="mapContainerRef"
      ></div>
      
      <!-- 标记流程提示 -->
      <transition name="fade">
        <div v-if="markFlow.mode !== 'idle'" class="mark-flow-hint">
          <span>{{ markFlow.mode === 'selecting-start' ? '1️⃣' : '2️⃣' }}</span>
          <span>{{ markFlow.mode === 'selecting-start' ? '请选择开始点' : '请选择结束点' }}</span>
          <button class="hint-cancel" @click="cancelMarkFlow">取消</button>
        </div>
      </transition>
      
      <!-- 图层切换 -->
      <div class="layer-switch">
        <button 
          class="layer-btn" 
          :class="{ active: currentLayer === 'standard' }"
          @click="mapOp?.switchBaseLayer?.('standard')"
        >🗺️ 标准</button>
        <button 
          class="layer-btn" 
          :class="{ active: currentLayer === 'satellite' }"
          @click="mapOp?.switchBaseLayer?.('satellite')"
        >🛰️ 卫星</button>
      </div>

      <!-- 加载状态 -->
      <div v-show="loading" class="loading-mask">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>
      
      <!-- 数据信息 -->
      <div v-show="hasData && !loading" class="data-info">
        <span>📊 {{ currentPointsCount }} 个点</span>
      </div>
      
      <!-- MMSI 标签 -->
      <div class="mmsi-tag">🚢 {{ mmsi }}</div>
    </section>
    
    <!-- 🔧 编辑弹窗（Teleport 到 body） -->
    <Teleport to="body">
      <div v-if="editDialog.visible" class="mark-dialog-overlay" @click.self="closeEditDialog">
        <div class="mark-dialog">
          <!-- 使用组件替代 innerHTML，避免标签解析问题 -->
          <MarkEditDialog
            v-if="editDialog.visible"
            :mark="editDialog.currentMark"
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { buildPopupContent, buildMarkEditContent } from '@/assets/mapRender/trajectoryPopup'
import MarkCard from '@/components/StayMarkPanel/MarkCard'
import { useStayMarker } from '@/components/StayMarkPanel/useStayMarker'

const props = defineProps({
  mmsi: { type: String, required: true },
  // ... 其他 props
})

// ========== 状态管理 ==========

// 标记流程状态机
const markFlow = ref({
  mode: 'idle',              // idle | selecting-start | selecting-end | editing
  startPoint: null,          // { idx, lat, lon, timestamp, ... }
  endPoint: null,
  tempMark: null             // 临时标记数据（编辑中）
})

// 待提交标记列表（按开始时间升序）
const pendingMarks = ref([])

// 编辑弹窗状态
const editDialog = ref({
  visible: false,
  content: '',
  currentMarkId: null,
  callbacks: {}
})

// 临时高亮轨迹点索引数组
const tempHighlight = ref([])

// 高亮图层引用
const highlightLayerRef = ref(null)

// MarkCard 引用
const markCardRef = ref(null)

// 地图操作 + 轨迹数据
const { mapOp, trajectoryPoints, loadTrajectory } = useMapAndData(props)

// ========== 标记核心逻辑 ==========

// 🔧 初始化标记管理器
const { 
  createMark, updateMark, deleteMark, 
  highlightSegment, clearHighlight,
  sortMarksByStartTime 
} = useStayMarker({
  mmsi: props.mmsi,
  points: trajectoryPoints,
  mapOp,
  onUpdate: syncPendingMarks
})

// 🔧 地图点击事件（统一入口）
const onMapClick = async (e) => {
  const point = await pickPointFromMap(e)
  if (!point) return
  
  // 1️⃣ 标记流程中：选择起止点
  if (markFlow.value.mode === 'selecting-start') {
    markFlow.value.startPoint = point
    markFlow.value.mode = 'selecting-end'
    return
  }
  
  if (markFlow.value.mode === 'selecting-end') {
    markFlow.value.endPoint = point
    // ✅ 两点已选，构建临时标记 + 高亮轨迹
    await handlePointsSelected(markFlow.value.startPoint, markFlow.value.endPoint)
    return
  }
  
  // 2️⃣ 非标记流程：显示数据弹窗 + 标记按钮
  showDataPopup(point)
}

// 🔧 从地图事件拾取轨迹点（适配不同地图库）
const pickPointFromMap = async (mapEvent) => {
  // 优先使用地图库的拾取方法
  if (mapOp?.pickPointAt) {
    return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
  }
  
  // 降级：附近点搜索（阈值 ~100米）
  const clicked = mapEvent.lnglat || mapEvent.latlng
  const threshold = 0.001
  return trajectoryPoints.value.find(p => 
    Math.abs(p.lat - clicked.lat) < threshold && 
    Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
  )
}

// 🔧 两点选中后：高亮 + 构建标记 + 打开编辑弹窗
const handlePointsSelected = async (start, end) => {
  // 确保 startTime < endTime
  const [s, e] = (start.timestamp || start.utc_time) < (end.timestamp || end.utc_time) 
    ? [start, end] 
    : [end, start]
  
  // 🎨 高亮两点间轨迹
  const highlighted = await highlightSegment(s.idx, e.idx)
  tempHighlight.value = highlighted?.map(p => p.idx) || []
  
  // 📦 构建临时标记数据
  const tempMark = createMark(s, e)
  markFlow.value.tempMark = tempMark
  markFlow.value.mode = 'editing'
  
  // 💬 打开编辑弹窗
  openEditDialog(tempMark, {
    isNew: true,
    onSave: (updated) => handleMarkSave(updated, true),
    onCancel: cancelMarkFlow,
    onDelete: cancelMarkFlow
  })
}

// 🔧 显示数据弹窗（原有功能 + 标记入口）
const showDataPopup = (point) => {
  const content = buildPopupContent(point, {
    onMarkClick: (p) => {
      // 点击"创建停留标记"按钮
      markFlow.value.startPoint = p
      markFlow.value.mode = 'selecting-end'
      closeAllPopups()  // 关闭当前数据弹窗
    },
    onNavigate: (pos) => {
      // 定位到指定点
      mapOp?.flyTo?.(pos.lon, pos.lat, 14)
    }
  })
  
  mapOp?.showPopup?.(point.lon, point.lat, content)
  
  // 绑定全局回调
  window.__onMarkClick = (p) => { /* 已在 buildPopupContent 内处理 */ }
  window.__onNavigate = (pos) => { mapOp?.flyTo?.(pos.lon, pos.lat, 14) }
}

// 🔧 打开标记编辑弹窗
const openEditDialog = (markData, { isNew = false, onSave, onCancel, onDelete } = {}) => {
  editDialog.value.currentMarkId = markData.id
  editDialog.value.content = buildMarkEditContent(markData, {
    onSave: () => {
      // 收集弹窗内最新数据（通过全局回调更新到 tempMark）
      onSave?.(markFlow.value.tempMark)
      closeEditDialog()
    },
    onCancel: () => {
      onCancel?.()
      closeEditDialog()
    },
    onDelete: () => {
      onDelete?.()
      closeEditDialog()
    }
  })
  
  // 绑定弹窗内事件回调
  window.__onMarkUpdate = (field, value) => {
    if (markFlow.value.tempMark) {
      markFlow.value.tempMark[field] = value
    }
  }
  window.__onMarkSave = onSave
  window.__onMarkCancel = onCancel
  window.__onMarkDelete = onDelete
  
  editDialog.value.visible = true
  markFlow.value.mode = 'editing'
}

// 🔧 关闭编辑弹窗
const closeEditDialog = () => {
  editDialog.value.visible = false
  editDialog.value.content = ''
  editDialog.value.callbacks = {}
  
  // 清理全局回调
  delete window.__onMarkUpdate
  delete window.__onMarkSave
  delete window.__onMarkCancel
  delete window.__onMarkDelete
  
  // 如果非新建，恢复高亮
  if (!editDialog.value.isNew && markFlow.value.tempMark) {
    highlightMarkSegment(markFlow.value.tempMark)
  }
}

// 🔧 标记保存处理
const handleMarkSave = (markData, isNew = false) => {
  if (isNew) {
    // ➕ 新增标记
    pendingMarks.value.push({ ...markData, status: 'draft' })
    sortMarksByStartTime(pendingMarks.value)
    
    // 🎨 永久高亮（可选）
    if (mapOp?.drawStayMarker) {
      mapOp.drawStayMarker(markData)
    }
  } else {
    // ✏️ 更新现有标记
    const idx = pendingMarks.value.findIndex(m => m.id === markData.id)
    if (idx >= 0) {
      pendingMarks.value[idx] = { ...markData }
      sortMarksByStartTime(pendingMarks.value)
    }
  }
  
  // 🧹 清理临时状态
  resetMarkFlow()
}

// 🔧 取消标记流程
const cancelMarkFlow = () => {
  clearHighlight()
  tempHighlight.value = []
  markFlow.value = { mode: 'idle', startPoint: null, endPoint: null, tempMark: null }
  closeEditDialog()
}

// 🔧 重置标记流程（保留数据）
const resetMarkFlow = () => {
  markFlow.value.mode = 'idle'
  markFlow.value.startPoint = null
  markFlow.value.endPoint = null
  markFlow.value.tempMark = null
}

// 🔧 关闭所有弹窗（数据弹窗 + 编辑弹窗）
const closeAllPopups = () => {
  mapOp?.closePopup?.()
  closeEditDialog()
}

// ========== MarkCard 事件处理 ==========

// 🔧 点击表格记录：地图跳转 + 高亮该段轨迹
const onMarkSelect = (mark) => {
  if (!mark.startPoint?.lat || !mark.endPoint?.lat) return
  
  // 🎯 定位到轨迹段中心
  const centerLat = (mark.startPoint.lat + mark.endPoint.lat) / 2
  const centerLon = (mark.startPoint.lon + mark.endPoint.lon) / 2
  mapOp?.flyTo?.(centerLon, centerLat, 13)
  
  // 🎨 高亮该段轨迹
  highlightMarkSegment(mark)
  
  // 💬 可选：显示该段摘要弹窗
  showMarkSummaryPopup(mark)
}

// 🔧 重新选择起止点
const onMarkReselect = (mark) => {
  // 1. 清除当前高亮
  clearHighlight()
  
  // 2. 进入重选流程
  markFlow.value.tempMark = { ...mark }  // 保留原有数据供编辑
  markFlow.value.startPoint = mark.startPoint
  markFlow.value.mode = 'selecting-end'  // 起点已选，只需选终点
  
  // 3. 提示用户
  error.value = null  // 清除可能的错误
  // 可选：显示临时提示
}

// 🔧 更新标记字段（类型/港口/备注）
const onMarkUpdate = ({ id, field, value }) => {
  const mark = pendingMarks.value.find(m => m.id === id)
  if (mark) {
    mark[field] = value
    // 可选：实时更新地图标注
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
    // 🧹 移除地图高亮
    if (mapOp?.removeStayMarker) {
      mapOp.removeStayMarker(removed)
    }
  }
}

// 🔧 提交所有标记到后端
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
    
    // ✅ 更新本地状态
    pendingMarks.value.forEach((m, i) => {
      m.status = 'synced'
      m.serverId = result.ids?.[i] || result.id
    })
    
    // 🎉 反馈用户
    error.value = null
    // 可选：显示成功提示
    
    return { success: true, result }
    
  } catch (err) {
    console.error('❌ 提交失败:', err)
    error.value = err.message || '提交失败，请重试'
    throw err
  }
}

// 🔧 高亮指定标记的轨迹段
const highlightMarkSegment = (mark) => {
  if (!mark.startPoint?.idx || !mark.endPoint?.idx) return
  highlightSegment(mark.startPoint.idx, mark.endPoint.idx, {
    color: '#667eea',
    weight: 4,
    opacity: 0.8
  })
}

// 🔧 显示标记摘要弹窗
const showMarkSummaryPopup = (mark) => {
  const content = `
    <div style="min-width:200px; padding:10px; font-size:12px;">
      <div style="font-weight:600; margin-bottom:8px; color:#667eea;">
        🏷️ ${mark.stayType} · ${mark.port || '未指定港口'}
      </div>
      <div style="color:#666;">
        🕐 ${formatTime(mark.startTime)} → ${formatTime(mark.endTime)}<br/>
        ⏱️ 时长: ${formatDuration(mark.endTime - mark.startTime)}
      </div>
    </div>
  `
  // 定位到中心点显示
  const centerLat = (mark.startPoint.lat + mark.endPoint.lat) / 2
  const centerLon = (mark.startPoint.lon + mark.endPoint.lon) / 2
  mapOp?.showPopup?.(centerLon, centerLat, content)
}

// 🔧 辅助：时间格式化（秒级时间戳）
const formatTime = (ts) => {
  if (!ts) return '-'
  const timestamp = ts > 1e12 ? ts : ts * 1000
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分`
}

// 🔧 同步排序后的标记列表
const syncPendingMarks = (marks) => {
  pendingMarks.value = [...marks]
}

// 🔧 加载轨迹时初始化
onMounted(async () => {
  await loadTrajectory()
  // 可选：加载历史标记
  // await loadHistoryMarks()
})

// 🔧 清理全局回调
onBeforeUnmount(() => {
  delete window.__onMarkClick
  delete window.__onNavigate
  delete window.__onMarkUpdate
  delete window.__onMarkSave
  delete window.__onMarkCancel
  delete window.__onMarkDelete
  clearHighlight()
})

// 🔧 暴露方法
defineExpose({
  startMarkFlow: () => { markFlow.value.mode = 'selecting-start' },
  cancelMarkFlow,
  getPendingMarks: () => [...pendingMarks.value]
})
</script>

<style scoped>
/* 🔧 标记流程提示 */
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

/* 原有样式保持不变... */
</style>