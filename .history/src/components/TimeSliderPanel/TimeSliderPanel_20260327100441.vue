<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<template>
  <div class="time-slider-panel">
    
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="panel-title">🔍 轨迹查询</span>
        <span class="mmsi-badge" v-if="mmsi">MMSI: {{ mmsi }}</span>
      </div>
      <div class="header-right">
        <button class="icon-btn" @click="toggleCollapse" :title="collapsed ? '展开' : '折叠'">
          {{ collapsed ? '▶' : '▼' }}
        </button>
      </div>
    </div>

    <!-- 折叠摘要 -->
    <div v-show="collapsed" class="panel-summary" @click="toggleCollapse">
      <small>
        📊 {{ endIndex - startIndex + 1 }} 点 | 
        🕐 {{ formatTimestamp(startTimestamp) }} ~ {{ formatTimestamp(endTimestamp) }}
      </small>
      <span class="expand-hint">点击展开</span>
    </div>

    <!-- 展开内容 -->
    <div v-show="!collapsed" class="panel-content">
      
      <!-- 模式切换 -->
      <div class="mode-switch">
        <label class="sync-toggle">
          <input type="checkbox" v-model="syncEnabled" />
          <span>🔗 时间↔索引联动</span>
        </label>
        <span class="range-hint">
          全局：[{{ formatRange(globalMinIdx) }}~{{ formatRange(globalMaxIdx) }}]
        </span>
      </div>

      <!-- 四参数网格 -->
      <div class="param-grid">
        
        <!-- 🕐 开始时间 -->
        <div class="param-card">
          <div class="param-label">🕐 开始时间</div>
          <div class="time-display">{{ formatTimestamp(startTimestamp) }}</div>
          <div class="time-sub">{{ formatLocalDate(startTimestamp) }}</div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }} 分钟</option>
            </select>
          </div>
          <div class="step-buttons">
            <button class="step-btn" @click="adjustTime('start', -timeStep)">−{{ timeStep }}m</button>
            <button class="step-btn pos" @click="adjustTime('start', timeStep)">+{{ timeStep }}m</button>
          </div>
        </div>

        <!-- 🕑 结束时间 -->
        <div class="param-card">
          <div class="param-label">🕑 结束时间</div>
          <div class="time-display">{{ formatTimestamp(endTimestamp) }}</div>
          <div class="time-sub">{{ formatLocalDate(endTimestamp) }}</div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }} 分钟</option>
            </select>
          </div>
          <div class="step-buttons">
            <button class="step-btn" @click="adjustTime('end', -timeStep)">−{{ timeStep }}m</button>
            <button class="step-btn pos" @click="adjustTime('end', timeStep)">+{{ timeStep }}m</button>
          </div>
        </div>

        <!-- 📍 开始索引 -->
        <div class="param-card">
          <div class="param-label">📍 开始索引</div>
          <div class="index-display">{{ startIndex }}</div>
          <div class="index-sub" v-if="startTimestamp">🕐 {{ formatTimeOnly(startTimestamp) }}</div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="step-buttons">
            <button class="step-btn" @click="adjustIndex('start', -indexStep)">−{{ indexStep }}</button>
            <button class="step-btn pos" @click="adjustIndex('start', indexStep)">+{{ indexStep }}</button>
          </div>
        </div>

        <!-- 🏁 结束索引 -->
        <div class="param-card">
          <div class="param-label">🏁 结束索引</div>
          <div class="index-display">{{ endIndex }}</div>
          <div class="index-sub" v-if="endTimestamp">🕐 {{ formatTimeOnly(endTimestamp) }}</div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="step-buttons">
            <button class="step-btn" @click="adjustIndex('end', -indexStep)">−{{ indexStep }}</button>
            <button class="step-btn pos" @click="adjustIndex('end', indexStep)">+{{ indexStep }}</button>
          </div>
        </div>

      </div>

      <!-- 范围摘要 -->
      <div class="range-summary">
        <span>📊 区间：<b>{{ endIndex - startIndex + 1 }}</b> 点</span>
        <span>🕐 时长：<b>{{ formatDuration(endTimestamp - startTimestamp) }}</b></span>
      </div>

      <!-- 操作按钮 -->
      <div class="panel-actions">
        <button class="btn primary" @click="emitQuery" :disabled="loading">
          {{ loading ? '🔄 查询中...' : '🚀 刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault">🔄 重置</button>
        <button class="btn" @click="expandFull">📐 全量</button>
      </div>

      <!-- 参数预览 -->
      <div class="params-preview" v-if="previewText">
        <small>参数：<code>{{ previewText }}</code></small>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  globalMinTs: { type: Number, default: null },
  globalMaxTs: { type: Number, default: null },
  globalMinIdx: { type: Number, default: 0 },
  globalMaxIdx: { type: Number, default: 10000 },
  currentStartTs: { type: Number, default: null },
  currentEndTs: { type: Number, default: null },
  currentStartIdx: { type: Number, default: 0 },
  currentEndIdx: { type: Number, default: 1000 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['query', 'params-change'])

// 使用组合函数
const {
  // 状态
  timeStep, indexStep, startTimestamp, endTimestamp,
  startIndex, endIndex, syncEnabled, collapsed,
  // 配置
  TIME_STEPS, INDEX_STEPS,
  // 计算属性
  previewText,
  // 工具函数
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange,
  // 操作方法
  adjustTime, adjustIndex, toggleCollapse,
  emitQuery, resetToDefault, expandFull,
  // 暴露方法
  exposeMethods
} = useTimeSlider(props, emit)

// 暴露方法给父组件
defineExpose(exposeMethods)
</script>

<style scoped>
/* ============ 保持原有样式不变，此处省略 ============ */
/* 建议：可将样式提取到 TimeSliderPanel.css 并 import 引入 */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  overflow: hidden;
}
/* ... 其余样式保持不变 ... */
</style>