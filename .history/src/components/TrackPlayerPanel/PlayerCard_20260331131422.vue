<template>
  <fieldset class="control-card player-card" :class="{ 'is-playing': isPlaying }">
    <legend>▶️ 轨迹播放</legend>

    <!-- 配置 -->
    <div class="player-config">
      <div class="config-item">
        <label>起始索引</label>
        <input
          v-model.number="localStartIndex"
          type="number"
          :max="Math.max(0, totalCount - 1)"
          :disabled="isPlaying"
          @change="onStartIndexChange"
        />
      </div>

      <div class="config-item">
        <label>速度</label>
        <select v-model.number="speed" @change="handleSpeedChange">
          <option v-for="s in speeds" :key="s" :value="s">{{ s }}x</option>
        </select>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="player-actions">
      <button class="btn btn-play" @click="handlePlayPause">
        {{ isPlaying ? '⏸️ 暂停' : '▶️ 开始' }}
      </button>

      <button class="btn btn-stop" @click="handleStop">
        ⏹️ 结束
      </button>
    </div>

    <!-- 进度 -->
    <div class="player-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="progress-info">
        <span>{{ currentIndex + 1 }} / {{ totalCount }}</span>
        <span>{{ remaining }} 剩余</span>
      </div>
    </div>

    <!-- 当前点 -->
    <div v-if="currentPoint" class="point-status">
      <div class="status-row">
        <span>航行状态</span>
        <b>{{ formatNavigationStatus(currentPoint.navigationstatus) }}</b>
      </div>

      <div class="status-row">
        <span>目的地</span>
        <b class="destination">{{ currentPoint.destination || '—' }}</b>
      </div>

      <div class="status-meta">
        <span>{{ formatTime(currentPoint.timestamp) }}</span>
        <span>{{ currentPoint.lat?.toFixed(4) }}, {{ currentPoint.lng?.toFixed(4) }}</span>
      </div>
    </div>

    <!-- 图表 -->
    <div v-if="chartData.speed.length" class="charts-container">
      <div class="mini-chart">
        <div class="chart-title">
          <span>Speed</span>
          <b class="current">{{ currentPoint?.speed?.toFixed(1) ?? '-' }}</b>
        </div>
        <SvgLineChart :data="chartData.speed" :current-x="chartData.currentIdx" color="#3b82f6"/>
      </div>

      <div class="mini-chart">
        <div class="chart-title">
          <span>Course</span>
          <b class="current">{{ currentPoint?.course?.toFixed(0) ?? '-' }}</b>
        </div>
        <SvgLineChart :data="chartData.course" :current-x="chartData.currentIdx" color="#22c55e"/>
      </div>

      <div class="mini-chart">
        <div class="chart-title">
          <span>Draught</span>
          <b class="current">{{ currentPoint?.draught?.toFixed(2) ?? '-' }}</b>
        </div>
        <SvgLineChart :data="chartData.draught" :current-x="chartData.currentIdx" color="#f59e0b"/>
      </div>
    </div>

    <!-- 预加载 -->
    <span v-if="isPreloading" class="preload-hint">🔄 加载中...</span>
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
  isPlaying,
  isPreloading,
  currentIndex,
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
  setSpeed,
  jumpTo,
  resume,
  currentPoint,  // ✅ 当前点详情
  chartData,     // ✅ 图表数据
} = useTrackPlayer(() => props.totalCount, () => props.mmsi, props.mapOp)

// 事件处理
const handleSpeedChange = () => setSpeed(speed.value)

const handlePlayPause = () => {
  if (isPlaying.value) {
    pause()
  } else {
    if (props.mapOp?.renderTrajectory) {
      resume()
    } else {
      start(localStartIndex.value)
    }
  }
}

const handleStop = () => {
  stop()
  localStartIndex.value = 0
}

const onStartIndexChange = () => {
  const max = Math.max(0, props.totalCount - 1)
  if (localStartIndex.value < 0) localStartIndex.value = 0
  if (localStartIndex.value > max) localStartIndex.value = max
}

// ✅ 格式化辅助函数
const formatNavigationStatus = (status) => {
  const statusMap = {
    '0': '在航', '1': '锚泊', '2': '失控', '3': '操纵受限',
    '4': '吃水受限', '5': '系泊', '6': '搁浅', '7': '捕鱼',
    '8': '帆船', '9': '备用', '10': '危险品', '11': '危险品(快)',
    '12': '备用', '13': '备用', '14': 'AIS-SART', '15': '未定义'
  }
  const key = String(status)?.split('.')[0] || '15'
  return statusMap[key] || `状态(${status})`
}

const formatTime = (timestamp) => {
  if (!timestamp) return '—'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  })
}

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