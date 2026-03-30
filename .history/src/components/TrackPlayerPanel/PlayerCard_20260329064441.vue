<!-- src/components/TrackPlayerPanel/PlayerCard.vue -->
<template>
  <fieldset class="control-card player-card">
    <legend><span aria-hidden="true">▶️</span> 轨迹播放</legend>
    
    <!-- 🎮 A&B: 起始索引 + 播放速度 -->
    <div class="player-controls">
      <!-- A. 起始索引输入（默认0） -->
      <div class="control-group">
        <label for="startIndex" class="control-label">起始索引</label>
        <input 
          id="startIndex"
          v-model.number="startIndex" 
          type="number" 
          min="0" 
          :max="Math.max(0, totalCount - 1)"
          class="index-input"
          placeholder="0"
          :disabled="isPlaying"
        />
      </div>
      
      <!-- B. 播放速度 -->
      <div class="control-group">
        <label for="speed" class="control-label">播放速度</label>
        <select 
          id="speed"
          v-model.number="playSpeed" 
          @change="updateSpeed"
          class="speed-select"
          :disabled="isPlaying"
          aria-label="播放速度">
          <option v-for="s in speeds" :key="s" :value="s">{{ s }}x</option>
        </select>
      </div>
    </div>
    
    <!-- C&D: 开始/暂停 + 结束按钮 -->
    <div class="player-actions">
      <button 
        class="btn-play" 
        @click="handleStartPause"
        :disabled="!canStart"
      >
        <span aria-hidden="true">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        {{ isPlaying ? '暂停' : '开始' }}
      </button>
      
      <button class="btn-stop" @click="handleStop" :disabled="!hasData">
        <span aria-hidden="true">⏹️</span> 结束
      </button>
    </div>
    
    <!-- 📊 进度条 -->
    <div class="player-progress">
      <div class="progress-bar" role="progressbar" 
           :aria-valuenow="progressPercent" aria-valuemin="0" :aria-valuemax="100">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-text">
        {{ displayedIndex + 1 }} / {{ totalCount }} 点
        <span v-if="remainingCount > 0">({{ remainingCount }} 剩余)</span>
      </span>
    </div>
    
    <!-- 🔄 预加载提示 -->
    <span v-if="isPreloading" class="preload-hint" aria-live="polite">
      🔄 预加载下一批数据...
    </span>
  </fieldset>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: () => ({}) },
  batchSize: { type: Number, default: 100 },      // 每批加载数量
  preloadThreshold: { type: Number, default: 0.1 } // 预加载触发阈值（默认剩余10%）
})

const emit = defineEmits([
  'loadTrajectory',  // 请求加载轨迹数据: { startIndex, endIndex, mmsi, isPreload }
  'clearMap',        // 清空地图轨迹
  'updateMarker'     // 更新marker位置: { point, index }
])

// ========== 本地状态 ==========
const startIndex = ref(0)        // A. 起始索引
const playSpeed = ref(1)         // B. 播放速度
const isPlaying = ref(false)     // C. 播放状态
const currentIndex = ref(0)      // 当前播放到的相对索引（0 ~ batch数据内）
const isPreloading = ref(false)  // 预加载标志

// 可用速度选项
const speeds = [0.5, 1, 2, 4, 8]

// 已加载的轨迹数据（由父组件通过loadTrajectory回调填充）
const trajectoryData = ref([])

// ========== 计算属性 ==========
const canStart = computed(() => {
  return startIndex.value >= 0 && 
         startIndex.value < props.totalCount && 
         !isPlaying.value
})

const hasData = computed(() => {
  return trajectoryData.value.length > 0
})

const displayedIndex = computed(() => {
  return startIndex.value + currentIndex.value
})

const remainingCount = computed(() => {
  return Math.max(0, props.totalCount - displayedIndex.value - 1)
})

const progressPercent = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.min(100, Math.round((displayedIndex.value + 1) / props.totalCount * 100))
})

// 当前批次剩余数据量
const batchRemaining = computed(() => {
  return trajectoryData.value.length - currentIndex.value
})

// ========== 核心逻辑 ==========

// 更新播放速度
const updateSpeed = () => {
  // 速度变更即时生效，由动画循环使用
}

// 处理开始/暂停切换（C）
const handleStartPause = async () => {
  if (isPlaying.value) {
    // 暂停
    isPlaying.value = false
    stopAnimation()
  } else {
    // 开始播放
    await startPlayback()
  }
}

// 开始播放主流程
const startPlayback = async () => {
  // 1️⃣ 加载第一批数据: [startIndex, startIndex + batchSize)
  const endIndex = Math.min(startIndex.value + props.batchSize, props.totalCount)
  
  emit('loadTrajectory', {
    startIndex: startIndex.value,
    endIndex: endIndex,
    mmsi: props.mmsi,
    isPreload: false
  })
  
  // 2️⃣ 等待父组件填充 trajectoryData（通过watch监听）
  // 3️⃣ 启动动画循环
  isPlaying.value = true
  currentIndex.value = 0
  startAnimation()
}

// 处理结束（D）：清空地图 + 重置状态
const handleStop = () => {
  isPlaying.value = false
  stopAnimation()
  emit('clearMap')
  // 重置本地状态
  trajectoryData.value = []
  currentIndex.value = 0
  startIndex.value = 0
}

// ========== 动画控制 ==========
let animationFrameId = null
let lastTimestamp = 0
// 基准间隔：1倍速时每点间隔50ms（可配置）
const BASE_INTERVAL = 50

const startAnimation = () => {
  lastTimestamp = performance.now()
  animate(performance.now())
}

const stopAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

const animate = (timestamp) => {
  if (!isPlaying.value) return
  
  const elapsed = timestamp - lastTimestamp
  const interval = BASE_INTERVAL / playSpeed.value
  
  if (elapsed >= interval) {
    lastTimestamp = timestamp
    
    // 🚶 移动图标：更新marker位置
    if (currentIndex.value < trajectoryData.value.length) {
      const point = trajectoryData.value[currentIndex.value]
      emit('updateMarker', { point, index: displayedIndex.value })
      
      currentIndex.value++
    }
    
    // 🔔 预加载触发：当剩余数据 < 阈值时加载下一批
    if (currentIndex.value >= trajectoryData.value.length * (1 - props.preloadThreshold)) {
      triggerPreload()
    }
    
    // 🏁 播放完成判断
    if (displayedIndex.value >= props.totalCount - 1) {
      isPlaying.value = false
      stopAnimation()
      return
    }
  }
  
  animationFrameId = requestAnimationFrame(animate)
}

// 触发预加载下一批数据
const triggerPreload = () => {
  if (isPreloading.value) return // 避免重复请求
  
  const currentEnd = startIndex.value + trajectoryData.value.length
  if (currentEnd >= props.totalCount) return // 已全部加载
  
  isPreloading.value = true
  const nextStart = currentEnd
  const nextEnd = Math.min(nextStart + props.batchSize, props.totalCount)
  
  emit('loadTrajectory', {
    startIndex: nextStart,
    endIndex: nextEnd,
    mmsi: props.mmsi,
    isPreload: true
  })
}

// 监听父组件返回的新数据，追加到本地缓存
const handleDataLoaded = (newData, isPreload = false) => {
  if (isPreload) {
    // 预加载数据：追加到数组末尾
    trajectoryData.value = [...trajectoryData.value, ...newData]
    isPreloading.value = false
  } else {
    // 首批数据：直接替换
    trajectoryData.value = newData
  }
  
  // 🗺️ 如果是首批，绘制整条折线
  if (!isPreload) {
    emit('drawPolyline', trajectoryData.value)
  }
}

// 暴露方法供父组件调用
defineExpose({
  handleDataLoaded,  // 父组件加载数据后调用此方法
  startIndex,
  playSpeed,
  isPlaying
})

// 清理
onUnmounted(() => {
  stopAnimation()
})
</script>

<style scoped>
/* ========== 🎨 播放器卡片 ========== */
.player-card {
  background: var(--ts-bg-card);
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.player-card legend {
  font-weight: 600;
  color: var(--ts-text);
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
}

/* ========== 🎮 控制区域 ========== */
.player-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-label {
  font-size: 0.75rem;
  color: var(--ts-text-secondary);
  font-weight: 500;
}

.index-input,
.speed-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-sm);
  font-size: 0.85rem;
  background: var(--ts-bg-input);
  color: var(--ts-text);
  transition: all var(--ts-transition);
}

.index-input {
  width: 100%;
  box-sizing: border-box;
}

.index-input:focus,
.speed-select:focus {
  outline: none;
  border-color: var(--ts-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.index-input:disabled,
.speed-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========== 🎮 动作按钮 ========== */
.player-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-play,
.btn-stop {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--ts-border);
  background: var(--ts-bg-button);
  border-radius: var(--ts-radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ts-text);
  transition: all var(--ts-transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  white-space: nowrap;
}

.btn-play:hover:not(:disabled),
.btn-stop:hover:not(:disabled) {
  background: var(--ts-bg-hover);
  border-color: var(--ts-primary-light);
  transform: translateY(-1px);
}

.btn-play {
  background: var(--ts-primary);
  color: #fff;
  border-color: var(--ts-primary-dark);
}
.btn-play:hover:not(:disabled) {
  background: var(--ts-primary-dark);
}

.btn-stop {
  background: var(--ts-bg-subtle);
}
.btn-stop:hover:not(:disabled) {
  background: var(--ts-danger);
  border-color: var(--ts-danger-dark);
  color: #fff;
}

.btn-play:disabled,
.btn-stop:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ========== 📊 进度条 ========== */
.player-progress {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.progress-bar {
  height: 6px;
  background: var(--ts-bg-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--ts-primary-gradient);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--ts-text-secondary);
  font-family: var(--ts-font-mono);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ========== 🔄 预加载提示 ========== */
.preload-hint {
  font-size: 0.75rem;
  color: var(--ts-text-muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  animation: ts-pulse 1.5s infinite;
}

@keyframes ts-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ========== 📱 响应式 ========== */
@media (max-width: 480px) {
  .player-controls {
    grid-template-columns: 1fr;
  }
  .player-actions {
    flex-direction: column;
  }
  .progress-text {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }
}

/* ========== 🌙 暗色模式 ========== */
@media (prefers-color-scheme: dark) {
  .btn-stop {
    background: var(--ts-border);
  }
  .progress-bar {
    background: var(--ts-border);
  }
}
</style>