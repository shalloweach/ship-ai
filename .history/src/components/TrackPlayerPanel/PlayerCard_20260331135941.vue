<template>
  <fieldset class="control-card player-card" :class="{ 'is-playing': isPlaying }">
    <legend><span aria-hidden="true">▶️</span> 轨迹播放</legend>

    <!-- 配置区域 -->
    <div class="player-config">
      <div class="config-item">
        <label for="startIndex">起始索引</label>
        <input
          id="startIndex"
          v-model.number="localStartIndex"
          type="number"
          min="0"
          :max="Math.max(0, totalCount - 1)"
          :disabled="isPlaying"
          @change="setIndex"
        />
      </div>
      <div class="config-item">
        <label for="speed">播放速度</label>
        <select id="speed" v-model.number="speed" @change="setSpeed">
          <option v-for="s in speeds" :key="s" :value="s">{{ s }}x</option>
        </select>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="player-actions">
      <button
        class="btn btn-play"
        @click="handlePlayPause"
        :disabled="!canPlay && !isPlaying"
      >
        <span aria-hidden="true">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        {{ isPlaying ? '暂停' : '开始' }}
      </button>
      <button class="btn btn-stop" @click="handleStop" :disabled="!hasData">
        <span aria-hidden="true">⏹️</span> 结束
      </button>
    </div>

    <!-- 进度条 -->
    <div class="player-progress">
      <div class="progress-bar" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-info">
        <span>{{ currentIndex + 1 }} / {{ totalCount }} 点</span>
        <span v-if="remaining > 0"> ({{ remaining }} 剩余)</span>
      </div>
    </div>

    <!-- ✅ 当前点状态信息 -->
    <div v-if="currentPoint" class="point-status">
      <div class="status-row">
        <span class="status-label">航行状态:</span>
        <span class="status-value">{{ formatNavigationStatus(currentPoint.navigationstatus) }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">目的地:</span>
        <span class="status-value destination">{{ currentPoint.destination || '—' }}</span>
      </div>
      <div class="status-meta">
        <span>时间: {{ formatTime(currentPoint.timestamp) }}</span>
        <span>位置: {{ currentPoint.lat?.toFixed(4) }}, {{ currentPoint.lng?.toFixed(4) }}</span>
      </div>
    </div>

    <!-- ✅ 三折线图区域 -->
    <div > 0" class="charts-container">
      <!-- Speed 折线图 -->
      <div class="mini-chart">
        <div class="chart-title">
          <span class="chart-label">Speed (kn)</span>
          <span class="chart-current" :class="{ 'is-current': true }">
            {{ currentPoint?.speed?.toFixed(1) ?? '—' }}
          </span>
        </div>
        <SvgLineChart
          :data="chartData.speed"
          :current-x="chartData.currentIdx"
          color="#3b82f6"
          height="60"
        />
      </div>

      <!-- Course 折线图 -->
      <div class="mini-chart">
        <div class="chart-title">
          <span class="chart-label">Course (°)</span>
          <span class="chart-current" :class="{ 'is-current': true }">
            {{ currentPoint?.course?.toFixed(0) ?? '—' }}
          </span>
        </div>
        <SvgLineChart
          :data="chartData.course"
          :current-x="chartData.currentIdx"
          color="#22c55e"
          height="60"
        />
      </div>

      <!-- Draught 折线图 -->
      <div class="mini-chart">
        <div class="chart-title">
          <span class="chart-label">Draught (m)</span>
          <span class="chart-current" :class="{ 'is-current': true }">
            {{ currentPoint?.draught?.toFixed(2) ?? '—' }}
          </span>
        </div>
        <SvgLineChart
          :data="chartData.draught"
          :current-x="chartData.currentIdx"
          color="#f59e0b"
          height="60"
        />
      </div>
    </div>

    <!-- 预加载提示 -->
    <transition name="fade">
      <span v-if="isPreloading" class="preload-hint" aria-live="polite">
        🔄 预加载中...
      </span>
    </transition>
  </fieldset>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTrackPlayer } from './useTrackPlayer'
import SvgLineChart from './SvgLineChart.vue' // ✅ 子组件：轻量SVG折线图

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: null },
})

const localStartIndex = ref(0)

const {
  // 函数
  setIndex,
  setSpeed,
  handlePlayPause,
  handleStop,

  // 状态
  isPlaying,
  currentIndex,


  // 工具
  formatNavigationStatus,
  formatTime,


  isPreloading,
  progress,
  hasData,
  canPlay,
  remaining,
  speed,
  speeds,
  start,
  pause,
  stop,
  togglePlay,
  
  jumpTo,
  resume,
  currentPoint,  // ✅ 当前点详情
  chartData,     // ✅ 图表数据
} = useTrackPlayer(() => props.totalCount, () => props.mmsi, props.mapOp)





// ✅ 格式化辅助函数




// 暴露方法
defineExpose({
  isPlaying,
  currentIndex,
  stop,
  start,
  pause,
  resume,
  togglePlay,
  jumpTo,
  setSpeed,
})

watch(() => props.totalCount, (newVal) => {
  if (localStartIndex.value >= newVal && newVal > 0) {
    localStartIndex.value = newVal - 1
  }
})
</script>

<style scoped>
.control-card {
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.control-card legend {
  font-weight: 600;
  color: #1f2937;
  padding: 0 8px;
}

.player-config {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4b5563;
}

.config-item label { white-space: nowrap; }
.config-item input,
.config-item select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  min-width: 60px;
}
.config-item input:disabled { background: #f3f4f6; cursor: not-allowed; }

.player-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-play { background: #3b82f6; color: white; }
.btn-play:hover:not(:disabled) { background: #2563eb; }
.btn-stop { background: #ef4444; color: white; }
.btn-stop:hover:not(:disabled) { background: #dc2626; }

.player-progress { margin-bottom: 12px; }
.progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.1s linear;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

/* ✅ 状态信息区域 */
.point-status {
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  margin-bottom: 12px;
  font-size: 13px;
}
.status-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.status-label {
  color: #6b7280;
  min-width: 68px;
}
.status-value {
  color: #1f2937;
  font-weight: 500;
}
.status-value.destination {
  color: #059669;
  font-family: monospace;
}
.status-meta {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  color: #9ca3af;
  font-size: 12px;
}

/* ✅ 折线图区域 */
.charts-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.mini-chart {
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}
.chart-label {
  color: #4b5563;
  font-weight: 500;
}
.chart-current {
  color: #1f2937;
  font-weight: 600;
  font-family: monospace;
}
.chart-current.is-current {
  color: #dc2626;
}

.preload-hint {
  display: inline-block;
  font-size: 12px;
  color: #6b7280;
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.player-card.is-playing .btn-play { background: #f59e0b; }
.player-card.is-playing .btn-play:hover:not(:disabled) { background: #d97706; }
</style>