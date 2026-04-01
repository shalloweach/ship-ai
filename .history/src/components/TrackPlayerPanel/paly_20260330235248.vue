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
            @change="onStartIndexChange"
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
  import { ref, watch } from 'vue'
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
    jumpTo,    // ✅ 新增：跳转方法
    resume,    // ✅ 新增：恢复播放
  } = useTrackPlayer(() => props.totalCount, () => props.mmsi, props.mapOp)
  
  // 事件处理
  const handleSpeedChange = () => {
    setSpeed(speed.value)
  }
  
  const handlePlayPause = () => {
    if (isPlaying.value) {
      pause()  // ✅ 暂停时自动显示当前批次的点
    } else {
      // 恢复播放前隐藏点标记（可选，保持界面清爽）
      if (props.mapOp?.renderTrajectory) {
        // 如果有已加载数据，先隐藏点再播放
        resume()  // ✅ 使用 resume 恢复播放
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
    // 限制起始索引范围
    const max = Math.max(0, props.totalCount - 1)
    if (localStartIndex.value < 0) localStartIndex.value = 0
    if (localStartIndex.value > max) localStartIndex.value = max
  }
  
  // ✅ 暴露给父组件的方法
  defineExpose({
    isPlaying,
    currentIndex,
    stop,
    start,
    pause,
    resume,      // ✅ 暴露恢复播放
    togglePlay,
    jumpTo,      // ✅ 暴露跳转方法（支持地图点击）
    setSpeed,
  })
  
  // 监听 totalCount 变化，同步更新本地起始索引
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
  
  .config-item label {
    white-space: nowrap;
  }
  
  .config-item input,
  .config-item select {
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    min-width: 60px;
  }
  
  .config-item input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
  
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
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-play {
    background: #3b82f6;
    color: white;
  }
  
  .btn-play:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .btn-stop {
    background: #ef4444;
    color: white;
  }
  
  .btn-stop:hover:not(:disabled) {
    background: #dc2626;
  }
  
  .player-progress {
    margin-bottom: 8px;
  }
  
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
  
  .preload-hint {
    display: inline-block;
    font-size: 12px;
    color: #6b7280;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  
  /* 暂停状态视觉反馈 */
  .player-card.is-playing .btn-play {
    background: #f59e0b;
  }
  
  .player-card.is-playing .btn-play:hover:not(:disabled) {
    background: #d97706;
  }
  </style>