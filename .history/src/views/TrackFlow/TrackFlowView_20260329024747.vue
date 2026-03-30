<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 模块 1: 时间/索引查询 -->
      <TimeSliderPanel
        ref="timeSliderRef"
        :mmsi="currentMmsi"
        @query="onTimeQuery"
        @params-change="onParamsChange"
      />
      
      <!-- 🛠️ 扩展操作按钮（保持不变） -->
      <nav class="panel-extensions" role="navigation" aria-label="地图操作">
        <button class="ext-btn" @click="exportTrajectory" :disabled="!hasData || loading">
          <span aria-hidden="true">📥</span><span>导出 CSV</span>
        </button>
        <button class="ext-btn" @click="clearMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🗑️</span><span>清空地图</span>
        </button>
        <button class="ext-btn" @click="centerMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🎯</span><span>居中显示</span>
        </button>
        <button class="ext-btn primary" @click="refreshQuery" :disabled="loading">
          <span aria-hidden="true">🔄</span><span>重新查询</span>
        </button>
      </nav>
      
      <!-- 状态提示（保持不变） -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>
    </aside>

    <!-- 🗺️ 右侧地图展示区域（保持不变） -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示" @click="onMapClick">
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>

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
        <span v-if="player?.isPlaying?.value">|</span>
        <span v-if="player?.isPlaying?.value"><span aria-hidden="true">▶️</span> 播放中</span>
      </div>
      
      <!-- 🚢 MMSI 标签 -->
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
    </section>
    
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, watch } from 'vue'
import { useRoute } from 'vue-router'

// 组件导入
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import { useMap } from './useMap'


// ========== 状态 ==========
const route = useRoute()
const shipSearchInfo = inject('shipSearchInfo', ref({ mmsi: '', totalCount: 0 }))

const mapContainerRef = ref(null)
const timeSliderRef = ref(null)


const queryRange = ref({ start: null, end: null, startIdx: 0, endIdx: 1000 })

const currentPointsCount = ref(0)
const currentPoints = ref([])
const hasData = computed(() => currentPointsCount.value > 0)

// ========== 依赖 ==========
let api = null
let map = null
let player = null
let marker = null

// ========== 🔑 核心：按索引范围查询轨迹（新增） ==========
/**
 * ✅ 按索引范围查询并更新地图
 * @param {string} mmsi - 船舶MMSI
 * @param {number} startIdx - 开始索引
 * @param {number} endIdx - 结束索引
 */
const loadTrajectoryByIndex = async (mmsi, startIdx, endIdx) => {
  if (!mmsi || startIdx == null || endIdx == null) return null
  
  try {
    // ✅ 调用后端按索引查询接口
    const result = await getTrajectoryByIndex(mmsi, startIdx, endIdx)
    
    if (result) {
      const points = Array.isArray(result) ? result : (result.points || result.data || [])
      currentPoints.value = points
      currentPointsCount.value = points.length
      return { success: true, points }
    }
    return { success: false }
  } catch (err) {
    console.error('❌ 按索引查询失败:', err)
    error.value = err.message || '轨迹加载失败'
    return { success: false, error: err }
  }
}

// ========== 事件处理 - ✅ 修改 onTimeQuery 支持索引查询 ==========
const onTimeQuery = async (params) => {
  if (!params?.mmsi) {
    error.value = '缺少 MMSI 参数'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // ✅ 优先使用索引范围查询（TimeSliderPanel 发射的格式）
    if (params.index?.start != null && params.index?.end != null) {
      await loadTrajectoryByIndex(params.mmsi, params.index.start, params.index.end)
      
      // 更新 queryRange 保持同步
      queryRange.value = {
        ...queryRange.value,
        startIdx: params.index.start,
        endIdx: params.index.end,
        start: params.time?.start,
        end: params.time?.end
      }
    } 
    // 降级：使用时间范围查询
    else if (params.time?.start != null && params.time?.end != null) {
      const result = await player?.loadTrajectory?.({
        mmsi: params.mmsi,
        start: params.time.start,
        end: params.time.end,
        limit: params.limit || 5000
      })
      
      if (result?.success) {
        currentPoints.value = player?.allPoints?.value || []
        currentPointsCount.value = currentPoints.value.length
      }
    }
    
    currentMmsi.value = params.mmsi
    
  } catch (err) {
    error.value = err.message || '查询失败'
  } finally {
    loading.value = false
  }
}

const onParamsChange = (params) => {
  // 仅同步参数，不触发查询
  if (params.index) {
    queryRange.value.startIdx = params.index.start
    queryRange.value.endIdx = params.index.end
  }
  if (params.time) {
    queryRange.value.start = params.time.start
    queryRange.value.end = params.time.end
  }
}

// 其他事件处理（保持不变）
const onPlayState = () => {}
const onSpeedChange = () => {}
const onModeChange = () => {}
const onMarkState = () => {}
const onMarkAdded = () => {}
const onMarksSubmitted = () => {}

const onMapClick = (e) => {
  if (!marker || marker.markMode.value === 'idle') return
  const point = player?.currentPoint?.value || player?.allPoints?.value?.[0]
  const index = player?.currentIndex?.value || 0
  if (point) {
    if (marker.markMode.value === 'selecting-start') {
      marker.startMarking(point, index)
    } else if (marker.markMode.value === 'selecting-end') {
      marker.endMarking(point, index)
    }
  }
}

// ========== 初始化 - ✅ 搜索成功后默认加载 0-1000 ==========

// ✅ 监听搜索信息变化（来自 NavBar）
watch(
  () => shipSearchInfo.value,
  (newInfo) => {
    if (newInfo?.mmsi && newInfo?.totalCount > 0) {
      currentMmsi.value = newInfo.mmsi
      shipTotalCount.value = newInfo.totalCount
      totalPoints.value = newInfo.totalCount
      
      // ✅ 默认加载索引 0 ~ min(1000, totalCount-1)
      const defaultEndIdx = Math.min(1000, newInfo.totalCount - 1)
      loadTrajectoryByIndex(newInfo.mmsi, 0, defaultEndIdx)
      
      // 同步更新 queryRange
      queryRange.value = {
        ...queryRange.value,
        startIdx: 0,
        endIdx: defaultEndIdx
      }
    }
  },
  { deep: true }
)

// ✅ 初始加载：路由带参时同样应用默认索引范围
onMounted(async () => {
  await initDeps()
  
  const { mmsi, totalCount = 0 } = route.query
  if (mmsi && Number(totalCount) > 0) {
    currentMmsi.value = mmsi
    shipTotalCount.value = Number(totalCount)
    totalPoints.value = Number(totalCount)
    
    // ✅ 默认加载 0-1000
    const defaultEndIdx = Math.min(1000, Number(totalCount) - 1)
    await loadTrajectoryByIndex(mmsi, 0, defaultEndIdx)
    
    queryRange.value = {
      ...queryRange.value,
      startIdx: 0,
      endIdx: defaultEndIdx
    }
  }
})

const initDeps = async () => {
  api = { getTrajectoryByIndex, getTrajectoryByTime }  // ✅ 简化 api 对象
  
  if (mapContainerRef.value) {
    const mapModule = useMap(mapContainerRef)
    await mapModule.init()
    map = mapModule
  }
  
  // 初始化播放模块
  player = useTrackPlayer(
    { mmsi: currentMmsi.value, queryRange: queryRange.value, loading },
    { emit: (event, data) => console.log('🎮 Player event:', event, data) },
    { api, map }
  )
  
  // 初始化标记模块
  marker = useStayMarker(
    { mmsi: currentMmsi.value },
    { emit: (event, data) => console.log('📍 Marker event:', event, data) },
    { api, map }
  )
}

// ========== 扩展功能（保持不变） ==========
const exportTrajectory = () => {
  if (!currentPoints.value.length) return
  exportTrajectoryCSV(currentPoints.value, currentMmsi.value)
}

const clearMap = () => {
  map?.clearTrajectory?.()
  currentPointsCount.value = 0
  currentPoints.value = []
}

const centerMap = () => {
  if (map?.centerOn && currentPoints.value[0]) {
    const p = currentPoints.value[0]
    map.centerOn(p.lat, p.lng, 12)
  }
}

const refreshQuery = () => {
  // ✅ 使用当前 queryRange 的索引重新查询
  if (currentMmsi.value) {
    loadTrajectoryByIndex(
      currentMmsi.value, 
      queryRange.value.startIdx, 
      queryRange.value.endIdx
    )
  }
}

// ========== 生命周期（保持不变） ==========
onBeforeUnmount(() => {
  map?.destroy?.()
  player?.clear?.()
  marker?.clearMarks?.()
})

// ========== 暴露（保持不变） ==========
defineExpose({
  refreshQuery,
  setMmsi: (mmsi) => {
    currentMmsi.value = mmsi
    if (mmsi && shipTotalCount.value > 0) {
      const defaultEndIdx = Math.min(1000, shipTotalCount.value - 1)
      loadTrajectoryByIndex(mmsi, 0, defaultEndIdx)
    }
  },
  getPlayer: () => player?.expose?.(),
  getMarker: () => marker?.expose?.(),
  getMap: () => map?.expose?.()
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
  padding: 0.5rem;
  gap: 0.5rem;
}

.panel-extensions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ext-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.ext-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.ext-btn.primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  border-color: transparent;
}

.ext-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ============ 🗺️ 右侧地图 ============ */
.map-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #eef2f7;
}

.map-container { width: 100%; height: 100%; }

/* ============ 🎭 浮层 ============ */
.loading-mask, .error-toast, .data-info, .mmsi-tag {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}

.loading-mask {
  top: 50%; left: 50%;
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
  width: 20px; height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-toast {
  top: 1rem; right: 1rem;
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
  top: auto; bottom: 1rem; left: 1rem; right: auto;
  max-width: none;
}

.data-info {
  bottom: 1rem; left: 1rem;
  background: rgba(255,255,255,0.95);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  pointer-events: auto;
  display: flex; gap: 0.5rem;
}

.mmsi-tag {
  top: 1rem; left: 1rem;
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
  .track-flow-container { flex-direction: column; }
  .side-panel {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .map-wrapper { height: 50vh; }
  .panel-extensions { flex-wrap: wrap; }
}
</style>