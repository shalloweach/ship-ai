<!-- src/components/TrackPlayerPanel/PlayerCard.vue -->
<template>
  <fieldset class="control-card player-card">
    <legend><span aria-hidden="true">▶️</span> 轨迹播放</legend>
    
    <!-- 🎮 播放控制 -->
    <div class="player-controls">
      <button class="btn-play" @click="player.togglePlay()" :disabled="!player.canPlay.value">
        <span aria-hidden="true">{{ player.isPlaying.value ? '⏸️' : '▶️' }}</span>
        {{ player.isPlaying.value ? '暂停' : '播放' }}
      </button>
      
      <button class="btn-stop" @click="player.stopPlay()" :disabled="!player.canPlay.value">
        <span aria-hidden="true">⏹️</span> 停止
      </button>
      
      <!-- ⚡ 倍速选择 -->
      <select v-model="speed" @change="player.setSpeed(Number($event.target.value))" 
              class="speed-select" :disabled="!player.canPlay.value"
              aria-label="播放速度">
        <option v-for="s in player.speeds" :key="s" :value="s">{{ s }}x</option>
      </select>
    </div>
    
    <!-- 🚀 起始位置 -->
    <div class="player-start">
      <button class="btn-start" @click="player.startPlay(0)" :disabled="!player.canPlay.value" 
              title="从头开始播放">
        <span aria-hidden="true">⏮️</span> 从头播放
      </button>
      <button class="btn-start" @click="player.startPlay()" :disabled="!player.canPlay.value" 
              title="从当前位置继续播放">
        <span aria-hidden="true">📍</span> 继续播放
      </button>
    </div>
    
    <!-- 📊 进度条 -->
    <div class="player-progress">
      <div class="progress-bar" role="progressbar" 
           :aria-valuenow="player.progress.value" aria-valuemin="0" :aria-valuemax="100">
        <div class="progress-fill" :style="{ width: player.progress.value + '%' }"></div>
      </div>
      <span class="progress-text">
        {{ player.currentIndex.value + 1 }} / {{ totalCount }} 点
        <span v-if="player.remainingTotal.value > 0">
          ({{ player.remainingTotal.value }} 剩余)
        </span>
      </span>
    </div>
    
    <!-- 🔄 预加载提示 -->
    <span v-if="player.isPreloading.value" class="preload-hint" aria-live="polite">
      🔄 预加载中...
    </span>
  </fieldset>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'  // ✅ 添加 watch, onMounted
import { useTrackPlayer } from './useTrackPlayer'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: () => ({}) }
})

// ✅ 调试：打印接收到的 props
onMounted(() => {
  console.log('🎮 PlayerCard mounted:', {
    mmsi: props.mmsi,
    totalCount: props.totalCount,
    hasMap: !!props.mapOp?.map,  // 检查是否有地图实例
    mapOpKeys: Object.keys(props.mapOp)
  })
})

// ✅ 调试：监听 canPlay 变化
const player = useTrackPlayer(
  () => props.mmsi,
  () => props.totalCount,
  props.mapOp
)
const canPlay =true
watch(
  () => player.canPlay?.value,
  (canPlay) => {
    console.log('🔓 canPlay 状态:', canPlay, {
      mmsi: props.mmsi
 
    })
  },
  { immediate: true }
)

const speed = ref(1)
defineExpose({ player })
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

/* ========== 🎮 控制按钮 ========== */
.player-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-play,
.btn-stop,
.btn-start {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ts-border);
  background: var(--ts-bg-button);
  border-radius: var(--ts-radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
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
.btn-stop:hover:not(:disabled),
.btn-start:hover:not(:disabled) {
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

.speed-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-sm);
  font-size: 0.8rem;
  background: var(--ts-bg-input);
  color: var(--ts-text);
  cursor: pointer;
  min-width: 60px;
}
.speed-select:focus {
  outline: none;
  border-color: var(--ts-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

/* ========== 🚀 起始按钮 ========== */
.player-start {
  display: flex;
  gap: 0.5rem;
}

.btn-start {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  background: var(--ts-bg-subtle);
  border-color: var(--ts-border);
}
.btn-start:hover:not(:disabled) {
  background: var(--ts-bg-hover);
  border-color: var(--ts-success);
  color: var(--ts-success);
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

/* ========== ♿ 禁用状态 ========== */
.btn-play:disabled,
.btn-stop:disabled,
.btn-start:disabled,
.speed-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ========== 📱 响应式 ========== */
@media (max-width: 480px) {
  .player-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .speed-select {
    width: 100%;
  }
  .player-start {
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
  .btn-start {
    background: var(--ts-border);
  }
  .progress-bar {
    background: var(--ts-border);
  }
}
</style>