<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 模块 1: 时间/索引查询 -->
      <TimeSliderPanel
        ref="timeSliderRef"
        :mmsi="mmsi"
        :totalCount="totalCount"
        :mapOp="mapOp"
        :loading="loading"
        @update:current-index="handleCurrentIndexChange"
        @export-trajectory="exportTrajectory"
      />

      <!-- 模块 2: 轨迹播放控制 -->
      <PlayerCard
        v-if="mmsi"
        ref="playerCardRef"
        :mmsi="mmsi"
        :totalCount="totalCount"
        :mapOp="mapOp"
        :loading="loading"
        @play-state-change="handlePlayStateChange"
        @seek-to-index="handleSeekToIndex"
      />

      <!-- 🛠️ 扩展操作按钮 -->
      <nav class="panel-extensions" role="navigation" aria-label="地图操作">
        <button class="ext-btn" @click="handleExportCSV" :disabled="!hasData || loading" aria-label="导出轨迹数据为CSV文件">
          <span aria-hidden="true">📥</span><span>导出 CSV</span>
        </button>
        <button class="ext-btn" @click="handleClearMap" :disabled="!hasData || loading" aria-label="清空地图所有图层">
          <span aria-hidden="true">🗑️</span><span>清空地图</span>
        </button>
        <button class="ext-btn" @click="handleCenterView" :disabled="!hasData || loading" aria-label="地图居中显示轨迹">
          <span aria-hidden="true">🎯</span><span>居中显示</span>
        </button>
        <button class="ext-btn primary" @click="handleRefreshQuery" :disabled="loading" aria-label="重新查询轨迹数据">
          <span aria-hidden="true">🔄</span><span>重新查询</span>
        </button>
      </nav>
      
      <!-- 状态提示 -->
      <div v-if="error" class="error-toast" @click="error = null" role="alert" tabindex="0">
        ⚠️ {{ error }} <small>(点击关闭)</small>
      </div>
    </aside>

    <!-- 🗺️ 右侧地图展示区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示">
      <div 
        :id="'mapContainer-' + (mmsi || 'default')" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>

      <!-- ⏳ 加载遮罩 -->
      <Transition name="fade">
        <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"></div>
          <span>🔄 加载轨迹数据...</span>
        </div>
      </Transition>
      
      <!-- 📊 数据信息 -->
      <Transition name="fade">
        <div v-show="hasData && !loading" class="data-info" role="status" aria-live="polite">
          <span><span aria-hidden="true">📊</span><b>{{ currentPointsCount }}</b> 个轨迹点</span>
          <span v-if="playerIsPlaying">|</span>
          <span v-if="playerIsPlaying"><span aria-hidden="true">▶️</span> 播放中</span>
        </div>
      </Transition>
      
      <!-- 🚢 MMSI 标签 -->
      <div class="mmsi-tag" role="note" aria-live="polite">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ mmsi || '未选择' }}</strong>
      </div>
    </section>
    
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import useMapOperation from '@/components/mapOperation'

// ========== 📦 状态管理 ==========
const route = useRoute()
const router = useRouter()
const mapContainerRef = ref(null)
const timeSliderRef = ref(null)
const playerCardRef = ref(null)

// 船舶核心参数（响应式，供子组件使用）
const mmsi = ref('')
const totalCount = ref(0)
const currentIndex = ref(0)

// UI 状态
const loading = ref(false)
const error = ref('')
const playerIsPlaying = ref(false)
const currentPointsCount = computed(() => totalCount.value > 0 ? totalCount.value : 0)
const hasData = computed(() => mmsi.value && totalCount.value > 0)

// 地图操作实例（核心：传递给子组件操作地图）
const mapOp = useMapOperation(mapContainerRef)

// ========== 🗺️ 地图初始化 ==========
onMounted(async () => {
  try {
    // 1. 初始化地图（默认展示中国沿海示例区域）
    await mapOp?.init({ 
      center: [31.2, 122], // [lat, lng]
      zoom: 8,
      style: 'default' // 可根据需求扩展主题
    })
    
    // 2. 检查 URL 是否已有查询参数，有则自动加载
    if (route.query.mmsi) {
      await handleRouteQueryChange(route.query)
    }
  } catch (err) {
    console.error('地图初始化失败:', err)
    error.value = '地图加载失败，请刷新重试'
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  mapOp?.destroy?.()
})

// ========== 🔍 URL 参数监听（核心逻辑） ==========
watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    // 避免重复处理相同参数
    if (newQuery.mmsi === oldQuery?.mmsi && newQuery.totalCount === oldQuery?.totalCount) {
      return
    }
    await handleRouteQueryChange(newQuery)
  },
  { deep: true }
)

// 处理 URL 参数变化的统一函数
async function handleRouteQueryChange(query) {
  const newMmsi = query.mmsi?.toString() || ''
  const newTotal = Number(query.totalCount) || 0
  
  // 参数校验
  if (!newMmsi) {
    // 清空状态，返回默认地图视图
    resetTrackState()
    await mapOp?.resetView?.([31.2, 122], 8)
    return
  }
  
  // 更新响应式状态
  mmsi.value = newMmsi
  totalCount.value = newTotal
  currentIndex.value = 0
  
  // 触发子组件数据刷新（通过 props 响应式更新 + 事件通知）
  await nextTick()
  
  // 通知子组件加载新轨迹数据
  timeSliderRef.value?.loadTrajectory?.(newMmsi, newTotal)
  playerCardRef.value?.loadTrajectory?.(newMmsi, newTotal)
  
  // 可选：自动居中显示轨迹
  if (newTotal > 0) {
    await handleCenterView()
  }
}

// 重置轨迹相关状态
function resetTrackState() {
  mmsi.value = ''
  totalCount.value = 0
  currentIndex.value = 0
  playerIsPlaying.value = false
  error.value = ''
}

// ========== 🎮 事件处理函数 ==========

// 时间滑块索引变化
function handleCurrentIndexChange(index) {
  currentIndex.value = index
  // 可在这里触发地图高亮对应轨迹点
  mapOp?.highlightPoint?.(index)
}

// 播放器状态变化
function handlePlayStateChange(isPlaying) {
  playerIsPlaying.value = isPlaying
}

// 播放器跳转到指定索引
function handleSeekToIndex(index) {
  currentIndex.value = index
  timeSliderRef.value?.setCurrentIndex?.(index)
  mapOp?.highlightPoint?.(index)
}

// 导出 CSV（委托给子组件或自行实现）
async function handleExportCSV() {
  if (!hasData.value) return
  try {
    loading.value = true
    // 优先使用子组件的导出方法
    if (timeSliderRef.value?.exportTrajectory) {
      await timeSliderRef.value.exportTrajectory()
    } else {
      // 备用：父组件实现导出逻辑
      await exportTrajectoryFallback()
    }
  } catch (err) {
    error.value = '导出失败: ' + err.message
  } finally {
    loading.value = false
  }
}

// 备用导出实现（可根据实际接口调整）
async function exportTrajectoryFallback() {
  // 示例：调用 API 获取轨迹数据并下载
  const response = await fetch(`/api/trajectory/export?mmsi=${mmsi.value}&totalCount=${totalCount.value}`)
  if (!response.ok) throw new Error('导出请求失败')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trajectory_${mmsi.value}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

// 清空地图图层
function handleClearMap() {
  mapOp?.clearLayers?.()
  // 可选：通知子组件重置状态
  timeSliderRef.value?.reset?.()
  playerCardRef.value?.reset?.()
}

// 居中显示轨迹
async function handleCenterView() {
  if (!hasData.value) return
  // 委托给子组件计算轨迹边界，或父组件直接调用
  if (timeSliderRef.value?.getBounds) {
    const bounds = await timeSliderRef.value.getBounds()
    if (bounds) {
      mapOp?.fitBounds?.(bounds)
      return
    }
  }
  // 备用：使用默认居中
  await mapOp?.centerView?.()
}

// 重新查询（刷新当前 MMSI 数据）
async function handleRefreshQuery() {
  if (!mmsi.value) return
  try {
    loading.value = true
    error.value = ''
    // 重新触发路由参数监听（强制刷新）
    await handleRouteQueryChange(route.query)
  } catch (err) {
    error.value = '查询刷新失败: ' + err.message
  } finally {
    loading.value = false
  }
}

// ========== 🔄 暴露给子组件调用的方法（可选） ==========
defineExpose({
  // 允许子组件反向调用父组件方法
  updateMap: mapOp?.update?.bind(mapOp),
  addLayer: mapOp?.addLayer?.bind(mapOp),
  removeLayer: mapOp?.removeLayer?.bind(mapOp),
  getMapInstance: () => mapOp?.getMap?.()
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