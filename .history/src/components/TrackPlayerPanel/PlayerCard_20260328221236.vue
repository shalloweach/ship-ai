<template>

    <!-- ✨ 播放控制卡片 -->
    <fieldset class="control-card player-card">
        <legend><span aria-hidden="true">▶️</span> 轨迹播放</legend>
        
        <div class="player-row">
          <button class="btn-play" @click="togglePlay" :disabled="!canPlay">
            {{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
          </button>
          <button class="btn-stop" @click="stop" :disabled="!canPlay">⏹️ 停止</button>
          
          <select v-model="playbackSpeed" @change="setSpeed(Number($event.target.value))" 
                  class="speed-select" :disabled="!canPlay">
            <option v-for="s in [0.5, 1, 2, 4, 8]" :key="s" :value="s">{{ s }}x</option>
          </select>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <small class="progress-text">
          {{ currentIndex + 1 }} / {{ allPoints.length }} 点 
          ({{ remainingPoints }} 剩余)
        </small>
      </fieldset>
</template>