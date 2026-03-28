<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 时间/索引滑块组件 -->
      <TimeSlider 
        :mmsi="currentMmsi"
        :trajectory-points="trajectoryPoints"  <!-- ✨ 传入轨迹数据 -->
        :has-data="hasData"
        @query="onQuery"
        @params-change="onParamsChange"
        
        <!-- ✨ 播放事件 -->
        @play-point-update="onPlayPointUpdate"
        
        <!-- ✨ 标记事件 -->
        @marker-saved="onMarkerSaved"
        @marker-deleted="onMarkerDeleted"
      />
<!-- 
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
        @params-change="onParamsChange"
      /> -->
      
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
      
    </aside>

    <!-- 🗺️ 右侧地图展示区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示">
      
      <!-- 地图容器（动态 ID 确保 MMSI 变化时重建） -->
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>

      <!-- ⏳ 加载状态遮罩 -->
      <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>
      <div v-show="error" class="error-toast" @click="error = null" role="alert">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      </div>
      <div v-show="hasData && !loading" class="data-info" role="status">
        <span><span aria-hidden="true">📊</span><b>{{ currentPointsCount }}</b> 个轨迹点</span>
      </div>
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
      
    </section>
    
  </main>
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
onMounted(async () => { await setup() })
onBeforeUnmount(() => { teardown() })

// 暴露方法给父组件
defineExpose(exposeMethods)

// ✨ 轨迹数据（从查询结果提取）
const trajectoryPoints = ref([])

// ✨ 播放：接收当前点更新，在地图上高亮
const onPlayPointUpdate = ({ index, point, isInterpolated, visibleRange }) => {
  // 调用 useTrackFlow 的方法更新地图
  updatePlaybackPoint({
    index,
    point,
    isInterpolated,
    visibleRange,
    // 地图层负责：
    // 1. 高亮当前点（不同样式）
    // 2. 如果是 line-first 模式，移动船舶图标
    // 3. 如果是 point-by-point，逐步显示轨迹线
  })
}

// ✨ 标记：保存标记到后端 + 在地图上绘制
const onMarkerSaved = async (marker) => {
  try {
    // 1. 调用后端 API 保存标记
    const res = await axios.post('/api/stay-markers', marker)
    
    // 2. 在地图上绘制标记区域（如半透明多边形 + 图标）
    drawStayMarkerOnMap({
      ...marker,
      id: res.data?.id || marker.id,
      style: getMarkerStyle(marker.stay_type) // 根据类型返回不同颜色/图标
    })
    
    // 3. 提示用户
    showStatus(`✅ 停留标记已保存: ${marker.port}`, 'success')
    
  } catch (err) {
    console.error('保存标记失败:', err)
    showStatus('❌ 标记保存失败，请重试', 'error')
  }
}

// ✨ 标记：删除时同步移除地图元素
const onMarkerDeleted = ({ id, marker }) => {
  removeMarkerFromMap(id)
  showStatus(`🗑️ 已删除标记: ${marker.port}`, 'info')
}

// ✨ 辅助：获取标记样式
const getMarkerStyle = (type) => {
  const styles = {
    berth: { color: '#10b981', icon: '🏭', fillOpacity: 0.2 },
    anchor: { color: '#3b82f6', icon: '⚓', fillOpacity: 0.2 },
    abnormal: { color: '#ef4444', icon: '⚠️', fillOpacity: 0.3 },
    other: { color: '#6b7280', icon: '📦', fillOpacity: 0.15 }
  }
  return styles[type] || styles.other
}

// ✨ 查询成功后，提取轨迹点供播放使用
const onQuery = async (params) => {
  loading.value = true
  try {
    const result = await fetchTrajectory(params) // 您的后端接口
    
    // 解析轨迹点（确保包含 timestamp, lng, lat）
    trajectoryPoints.value = result.points?.map(p => ({
      timestamp: p.timestamp,
      lng: p.longitude || p.lng,
      lat: p.latitude || p.lat,
      ...p // 保留其他字段如 speed, course 等
    })) || []
    
    // 原有地图渲染逻辑...
    renderTrajectoryOnMap(trajectoryPoints.value)
    
    // ✨ 加载该船舶的已有停留标记
    await loadExistingMarkers(params.mmsi)
    
  } catch (err) {
    error.value = '轨迹查询失败'
  } finally {
    loading.value = false
  }
}

// ✨ 加载已有标记
const loadExistingMarkers = async (mmsi) => {
  try {
    const res = await axios.get('/api/stay-markers', { params: { mmsi } })
    // 传递给 TimeSlider 显示列表
    timeSliderRef.value?.loadMarkers(res.data)
    // 在地图上绘制
    res.data.forEach(marker => drawStayMarkerOnMap(marker))
  } catch (err) {
    console.warn('加载历史标记失败:', err)
  }
}

// ✨ 暴露给 TimeSlider 的地图操作方法（通过 ref）
const timeSliderRef = ref(null)
const updatePlaybackPoint = (data) => { /* 调用 useTrackFlow */ }
const drawStayMarkerOnMap = (marker) => { /* 调用 useTrackFlow */ }
const removeMarkerFromMap = (id) => { /* 调用 useTrackFlow */ }

</script>

<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<!-- 仅替换 <style scoped> 部分内容 -->

<style scoped>
/* ============ 🏗️ 容器布局 ============ */
.track-flow-container {
  display: flex;              /* ✅ 横向左右布局 */
  flex: 1;                    /* ✅ 占满父容器剩余空间 */
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
}

/* ============ 📋 左侧面板 ============ */
.side-panel {
  width: 380px;               /* 🔧 可调整为 320~420px */
  min-width: 320px;
  max-width: 450px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.06);
  z-index: 10;
  flex-shrink: 0;             /* ✅ 防止被压缩 */
}

/* 扩展操作按钮区 */
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
  transition: all 0.2s;
}

.ext-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.ext-btn.primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  border-color: transparent;
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============ 🗺️ 右侧地图区域 ============ */
.map-wrapper {
  flex: 1;                    /* ✅ 占据剩余所有宽度 */
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #eef2f7;
}

.map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* ============ 🎭 浮层样式（保持原有，微调定位） ============ */
.loading-mask,
.error-toast,
.data-info,
.mmsi-tag {
  position: absolute;
  z-index: 20;
  pointer-events: none;       /* ✅ 不阻挡地图交互 */
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
  font-weight: 500;
  color: #1e293b;
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

.mmsi-tag strong {
  font-family: 'SF Mono', monospace;
  margin-left: 0.3rem;
}

/* ============ 📱 响应式适配 ============ */
@media (max-width: 1024px) {
  .side-panel {
    width: 320px;
  }
}

@media (max-width: 768px) {
  .track-flow-container {
    flex-direction: column;   /* 📱 小屏改为上下布局 */
  }
  
  .side-panel {
    width: 100%;
    height: auto;
    max-height: 45vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .map-wrapper {
    height: 55vh;
  }
  
  .panel-extensions {
    flex-wrap: wrap;
  }
}
</style>