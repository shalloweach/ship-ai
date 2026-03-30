<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
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
      />

      <PlayerCard
        v-if="hasData"
        ref="player"
        :mmsi="mmsi"
        :total-points="totalCount"
        @play="onPlayerPlay"
        @pause="onPlayerPause"
      />


          
      <!-- 🛠️ 扩展操作按钮 -->
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
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue'
import TimeSliderPanel from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import PlayerCard from '@/components/TrackPlayerPanel/PlayerCard.vue'
import useMapOperation from '@/components/mapOperation'
import { useTimeSlider } from '@/components/TimeSliderPanel/useTimeSlider'
import { useRoute } from 'vue-router'

const route = useRoute()
const timeSliderRef = ref(null)

// ========== 📦 状态管理 ==========
const mmsi = ref('')
const totalCount = ref(0)
const currentPointsCount = ref(0)
const timeSlider = useTimeSlider(mapOp, () => currentMmsi.value, () => totalCount.value)


// 地图相关
const mapContainerRef = ref(null)
const mapOp = useMapOperation(mapContainerRef)

// ✅ 播放器状态（修正嵌套 ref 访问）
const player = ref(null)
const playerIsPlaying = computed(() => {
  const p = player.value
  if (!p) return false
  // 兼容: isPlaying 可能是 ref 或普通 boolean
  return typeof p.isPlaying?.value === 'boolean' ? p.isPlaying.value : p.isPlaying
})

// 其他状态
const loading = ref(false)
const error = ref(null)
const hasData = computed(() => currentPointsCount.value > 0 && !!mmsi.value)

// useTimeSlider 返回的控制方法（用于刷新/重置）
let timeSliderControls = null

// ========== 🔄 核心业务逻辑 ==========

// ✅ 加载轨迹数据
const loadTrajectory = async () => {
  if (!mmsi.value || totalCount.value <= 0) {
    console.warn('⚠️ 缺少必要参数:', { mmsi: mmsi.value, totalCount: totalCount.value })
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // ✅ 正确调用 useTimeSlider，接收返回的控制对象
    timeSliderControls = await useTimeSlider(mapOp, mmsi, totalCount)
    // 使用时：
    const doQuery = async () => {
      await timeSlider.resetToDefault()  // ✅ 通过对象调用，保持响应式
    }
    // ✅ 监听轨迹点数量变化（假设 useTimeSlider 内部会更新）
    if (timeSliderControls?.onPointsUpdate) {
      timeSliderControls.onPointsUpdate((count) => {
        currentPointsCount.value = count
      })
    }
    
    // ✅ 如果没有回调机制，手动触发一次更新（根据实际 API 调整）
    if (typeof timeSliderControls?.getPointCount === 'function') {
      currentPointsCount.value = timeSliderControls.getPointCount()
    }
    
  } catch (e) {
    console.error('❌ 轨迹加载失败:', e)
    error.value = e.message || '轨迹加载失败，请检查网络或 MMSI 是否正确'
    currentPointsCount.value = 0
  } finally {
    loading.value = false
  }
}

// ✅ 清空地图
const clearMap = () => {
  mapOp?.clearLayers?.()
  currentPointsCount.value = 0
  timeSliderControls?.reset?.()
}

// ✅ 居中显示轨迹
const centerMap = () => {
  if (mmsi.value && hasData.value) {
    // ✅ 使用实际存在的方法（根据 useMapOperation 实际导出调整）
    if (typeof mapOp?.fitViewToTrajectory === 'function') {
      mapOp.fitViewToTrajectory()
    } else if (typeof mapOp?.map?.fitBounds === 'function') {
      // 降级方案：使用地图原生 fitBounds
      const bounds = timeSliderControls?.getBounds?.()
      if (bounds) {
        mapOp.map.fitBounds(bounds)
      }
    }
  }
}

// ✅ 重新查询
const refreshQuery = () => {
  if (mmsi.value && totalCount.value > 0) {
    clearMap()
    loadTrajectory()
  }
}

// ✅ 导出轨迹
const exportTrajectory = () => {
  if (!hasData.value) {
    error.value = '暂无可导出的轨迹数据'
    return
  }
  // TODO: 调用后端导出接口或使用 timeSliderControls?.exportToCSV?.()
  console.log('📥 导出轨迹:', { mmsi: mmsi.value, count: currentPointsCount.value })
}

// ✅ 地图点击事件
const onMapClick = (e) => {
  // TODO: 处理地图点击，如显示点位详情
  console.log('🗺️ 地图点击:', e)
}

// ✅ 播放器事件
const onPlayerPlay = () => {
  timeSliderControls?.play?.()
}
const onPlayerPause = () => {
  timeSliderControls?.pause?.()
}

// ========== 🎯 初始化 & 监听 ==========

onMounted(async () => {
  // ✅ 初始化地图：[lng, lat] = [经度, 纬度]，上海约为 [121.5, 31.2]
  await mapOp.init({ center: [121.5, 31.2], zoom: 12 })
  
  // ✅ 优先尝试从 inject 同步数据
  if (injectedShipInfo && syncShipInfo(injectedShipInfo)) {
    loadTrajectory()
    return
  }
  
})



// ✅ 监听路由参数变化（降级方案 / 分享链接场景）
watch(
  () => route.query,
  (newQuery) => {
    const newMmsi = newQuery.mmsi?.toString() || ''
    const newTotalCount = Number(newQuery.totalCount) || 0
    
    // 参数真正变化时才更新，避免重复加载
    if (newMmsi && (newMmsi !== mmsi.value || newTotalCount !== totalCount.value)) {
      mmsi.value = newMmsi
      totalCount.value = newTotalCount
      loadTrajectory()
    }
  },
  { immediate: true }  // 组件挂载时立即检查一次路由参数
)

// ✅ 组件卸载时清理
onUnmounted(() => {
  timeSliderControls?.destroy?.()
  mapOp?.destroy?.()
})

// ✅ 暴露方法给外部调用
defineExpose({
  refreshQuery,
  clearMap,
  centerMap,
  loadTrajectory  // 可选：允许父组件手动触发加载
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