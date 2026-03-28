<!-- src/components/TrackPlayerPanel/PlayerCard.vue -->
<template>
  <fieldset class="control-card player-card">
    <legend><span aria-hidden="true">▶️</span> 轨迹播放</legend>
    
    <!-- 播放控制条 -->
    <div class="player-controls">
      <button class="btn-play" @click="player.toggle" :disabled="!player.canPlay.value">
        <span aria-hidden="true">{{ player.isPlaying.value ? '⏸️' : '▶️' }}</span>
        {{ player.isPlaying.value ? '暂停' : '播放' }}
      </button>
      
      <button class="btn-stop" @click="player.stop" :disabled="!player.canPlay.value">
        <span aria-hidden="true">⏹️</span> 停止
      </button>
      
      <!-- 倍速选择 -->
      <select v-model="speed" @change="player.setSpeed(Number($event.target.value))" 
              class="speed-select" :disabled="!player.canPlay.value">
        <option v-for="s in playerSpeeds" :key="s" :value="s">{{ s }}x</option>
      </select>
    </div>
    
    <!-- 播放模式 -->
    <div class="player-mode">
      <label v-for="m in playModes" :key="m.value" class="mode-option">
        <input type="radio" :value="m.value" v-model="mode" 
               @change="player.setMode(m.value)" :disabled="!player.canPlay.value"/>
        <small>{{ m.label }}</small>
      </label>
    </div>
    
    <!-- 进度条 -->
    <div class="player-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: player.progress.value + '%' }"></div>
      </div>
      <span class="progress-text">
        {{ player.currentIndex.value + 1 }} / {{ player.allPoints.value.length }} 点
        <span v-if="player.remainingPoints.value > 0">
          ({{ player.remainingPoints.value }} 剩余)
        </span>
      </span>
    </div>
    
    <!-- 预加载状态 -->
    <span v-if="player.isPreloading" class="preload-hint">
      🔄 预加载中...
    </span>
  </fieldset>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PLAYER_CONFIG } from '../config'

const props = defineProps({
  player: { type: Object, required: true },  // useTrackPlayer 返回的对象
  mmsi: { type: String, required: true }
})

const emit = defineEmits(['play-state', 'speed-change', 'mode-change'])

// 本地状态
const speed = ref(PLAYER_CONFIG.DEFAULT_SPEED)
const mode = ref(PLAYER_CONFIG.DEFAULT_MODE)

// 选项
const playerSpeeds = computed(() => PLAYER_CONFIG.SPEEDS)
const playModes = computed(() => [
  { value: PLAYER_CONFIG.MODES.POINT_BY_POINT, label: '逐点显示' },
  { value: PLAYER_CONFIG.MODES.LINE_FIRST, label: '船舶沿线移动' }
])

// 监听变化并发射事件
const emitChanges = () => {
  emit('play-state', { playing: props.player.isPlaying.value, index: props.player.currentIndex.value })
}

// 暴露方法
defineExpose({
  play: props.player.play,
  pause: props.player.pause,
  toggle: props.player.toggle,
  stop: props.player.stop,
  setSpeed: props.player.setSpeed,
  setMode: props.player.setMode,
  seekTo: props.player.seekTo,
  clear: props.player.clear,
  loadTrajectory: props.player.loadTrajectory
})
</script>

<style scoped>
.player-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
  margin: 0.875rem 1.25rem;
}

.player-card legend {
  font-weight: 600;
  color: #1e293b;
  padding: 0 0.5rem;
}

.player-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.btn-play, .btn-stop {
  flex: 1;
  min-width: 70px;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.btn-play:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #3b82f6;
}

.btn-stop:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #ef4444;
}

.btn-play:disabled, .btn-stop:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.speed-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 0.85rem;
  min-width: 60px;
}

.player-mode {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.mode-option input { cursor: pointer; }

.player-progress {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #64748b;
  text-align: right;
}

.preload-hint {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: center;
}
</style>