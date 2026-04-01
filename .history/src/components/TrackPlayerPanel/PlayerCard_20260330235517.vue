<template>
  <fieldset class="control-card player-card">
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
        />
      </div>
      <div class="config-item">
        <label for="speed">播放速度</label>
        <select id="speed" v-model.number="speed" @change="handleSpeedChange">
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
      <div
        class="progress-bar"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-info">
        <span>{{ currentIndex + 1 }} / {{ totalCount }} 点</span>
        <span v-if="remaining > 0"> ({{ remaining }} 剩余)</span>
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
import { ref } from 'vue'
import { useTrackPlayer } from './useTrackPlayer'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: null },
})

// 本地起始索引（与UI绑定）
const localStartIndex = ref(0)

// 使用播放器逻辑
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
} = useTrackPlayer(() => props.totalCount, () => props.mmsi, props.mapOp)

// 事件处理
const handleSpeedChange = () => {
  setSpeed(speed.value)
}

const handlePlayPause = () => {
  if (isPlaying.value) {
    pause()
  } else {
    // 使用本地起始索引开始播放
    start(localStartIndex.value)
  }
}

const handleStop = () => {
  stop()
  localStartIndex.value = 0
}

// 暴露给父组件
defineExpose({
  isPlaying,
  currentIndex,
  stop,
  start,
  pause,
  togglePlay,
})
</script>































<style scoped>
/* ========== 🎨 卡片基础 ========== */
.player-card {
  background: var(--ts-bg-card, #fff);
  border: 1px solid var(--ts-border, #e5e7eb);
  border-radius: var(--ts-radius-lg, 12px);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  box-shadow: var(--ts-shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
}

.player-card legend {
  font-weight: 600;
  color: var(--ts-text, #1f2937);
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
}

/* ========== ⚙️ 配置区域 ========== */
.player-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.config-label {
  font-size: 0.75rem;
  color: var(--ts-text-secondary, #6b7280);
  font-weight: 500;
  letter-spacing: 0.025em;
}

.config-input,
.config-select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--ts-border, #e5e7eb);
  border-radius: var(--ts-radius-sm, 6px);
  font-size: 0.85rem;
  background: var(--ts-bg-input, #f9fafb);
  color: var(--ts-text, #1f2937);
  transition: all 0.15s ease;
}

.config-input:focus,
.config-select:focus {
  outline: none;
  border-color: var(--ts-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #fff;
}

.config-input:disabled,
.config-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--ts-bg-disabled, #f3f4f6);
}

/* ========== 🎮 动作按钮 ========== */
.player-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--ts-border, #e5e7eb);
  border-radius: var(--ts-radius-sm, 6px);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ts-text, #1f2937);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  white-space: nowrap;
  background: var(--ts-bg-button, #f9fafb);
}

.btn:hover:not(:disabled) {
  background: var(--ts-bg-hover, #f3f4f6);
  border-color: var(--ts-primary-light, #60a5fa);
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn-play {
  background: var(--ts-primary, #3b82f6);
  color: #fff;
  border-color: var(--ts-primary-dark, #2563eb);
}
.btn-play:hover:not(:disabled) {
  background: var(--ts-primary-dark, #2563eb);
}

.btn-stop {
  background: var(--ts-bg-subtle, #f3f4f6);
}
.btn-stop:hover:not(:disabled) {
  background: var(--ts-danger, #ef4444);
  border-color: var(--ts-danger-dark, #dc2626);
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
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
  background: var(--ts-bg-subtle, #f3f4f6);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ts-primary, #3b82f6), var(--ts-primary-light, #60a5fa));
  border-radius: 3px;
  transition: width 0.2s ease-out;
}

.progress-info {
  font-size: 0.8rem;
  color: var(--ts-text-secondary, #6b7280);
  font-family: var(--ts-font-mono, ui-monospace, monospace);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-remaining {
  color: var(--ts-text-muted, #9ca3af);
}

/* ========== 🔄 预加载提示 ========== */
.preload-hint {
  font-size: 0.75rem;
  color: var(--ts-text-muted, #9ca3af);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== 📱 响应式 ========== */
@media (max-width: 480px) {
  .player-config {
    grid-template-columns: 1fr;
  }
  .player-actions {
    flex-direction: column;
  }
  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }
}

/* ========== 🌙 暗色模式 ========== */
@media (prefers-color-scheme: dark) {
  .player-card {
    background: var(--ts-bg-card-dark, #1f2937);
    border-color: var(--ts-border-dark, #374151);
  }
  .config-input,
  .config-select,
  .btn {
    background: var(--ts-bg-input-dark, #374151);
    border-color: var(--ts-border-dark, #4b5563);
    color: var(--ts-text-dark, #f9fafb);
  }
  .progress-bar {
    background: var(--ts-bg-subtle-dark, #374151);
  }
}
</style>