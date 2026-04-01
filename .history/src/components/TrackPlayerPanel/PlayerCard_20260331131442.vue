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
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid #e5e7eb;
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
  transition: all 0.3s;
}

.player-card.is-playing {
  box-shadow: 0 8px 24px rgba(59,130,246,0.25);
  border-color: #3b82f6;
}

legend {
  font-weight: 600;
  color: #111827;
}

/* 配置 */
.player-config {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.config-item {
  display: flex;
  gap: 6px;
  align-items: center;
}

input, select {
  border-radius: 6px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
}

/* 按钮 */
.btn {
  border-radius: 999px;
  padding: 6px 14px;
  border: none;
  cursor: pointer;
  transition: 0.2s;
}

.btn:active {
  transform: scale(0.95);
}

.btn-play {
  background: linear-gradient(135deg,#3b82f6,#2563eb);
  color: white;
}

.player-card.is-playing .btn-play {
  background: linear-gradient(135deg,#f59e0b,#d97706);
}

.btn-stop {
  background: linear-gradient(135deg,#ef4444,#dc2626);
  color: white;
}

/* 进度条 */
.progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg,#3b82f6,#22c55e);
  position: relative;
}

.progress-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg,transparent,rgba(255,255,255,0.4),transparent);
  animation: move 1.5s infinite;
}

@keyframes move {
  0% { transform: translateX(-100%) }
  100% { transform: translateX(100%) }
}

/* 状态 */
.point-status {
  background: #f1f5f9;
  border-radius: 10px;
  padding: 10px;
  margin-top: 10px;
}

.status-row {
  display: flex;
  justify-content: space-between;
}

.destination {
  color: #059669;
}

.status-meta {
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  justify-content: space-between;
}

/* 图表 */
.charts-container {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.mini-chart {
  background: white;
  border-radius: 10px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  transition: 0.2s;
}

.mini-chart:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.08);
}

.chart-title {
  display: flex;
  justify-content: space-between;
}

.current {
  color: #dc2626;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% { opacity: 0.4 }
}

/* 加载 */
.preload-hint {
  font-size: 12px;
  color: #3b82f6;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  50% { opacity: 0.5 }
}
</style>