<!-- src\components\TimeSliderPanel\TimeSliderPanel.vue -->
<template>
  <section class="time-slider-panel" role="region" aria-label="轨迹查询面板">
    <div class="panel-content" role="group" aria-label="查询参数设置">
      
      <!-- 🔗 顶部状态栏（精简） -->
      <header class="panel-header">
        <div class="header-left">
          <span class="sync-icon" title="查询后同步更新面板" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </span>
          <span class="header-title">轨迹查询</span>
        </div>
        <div class="header-right">
          <span class="total-count" :title="`共 ${props.totalCount} 个轨迹点`">
            {{ props.totalCount || '—' }}
            <small>点</small>
          </span>
        </div>
      </header>

      <!-- 🎴 四参数网格（扁平化设计） -->
      <div class="param-grid">
        
        <!-- 🕐 开始时间 -->
        <div class="param-item time-param">
          <label class="param-label">
            <span class="param-icon">🕐</span>
            <span class="param-text">开始时间</span>
          </label>
          
          <!-- 显示模式 -->
          <div v-if="!isEditingTime.start" class="param-value-group">
            <div 
              class="param-value time-value clickable"
              @click="isEditingTime.start = true"
              tabindex="0"
              @keyup.enter="isEditingTime.start = true"
            >
              {{ formatTimestamp(startTimestamp) }}
            </div>
            <div class="param-sub">{{ formatLocalDate(startTimestamp) }}</div>
          </div>
          
          <!-- 编辑模式 -->
          <input
            v-else
            type="text"
            :value="startTimestamp"
            @change="updateTime('start', $event.target.value)"
            @blur="isEditingTime.start = false"
            @keyup.enter="updateTime('start', $event.target.value)"
            @keyup.escape="isEditingTime.start = false"
            class="param-input time-input"
            placeholder="时间戳或日期"
            autofocus
            ref="startInputRef"
          />
          
          <!-- 步长 + 调整（单行布局） -->
          <div class="param-actions">
            <select v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }}m</option>
            </select>
            <div class="step-btns">
              <button class="step-btn" @click="adjustTime('start', -timeStep)" title="减少">−</button>
              <button class="step-btn primary" @click="adjustTime('start', timeStep)" title="增加">+</button>
            </div>
          </div>
        </div>

        <!-- 🕑 结束时间 -->
        <div class="param-item time-param">
          <label class="param-label">
            <span class="param-icon">🕑</span>
            <span class="param-text">结束时间</span>
          </label>
          
          <div v-if="!isEditingTime.end" class="param-value-group">
            <div 
              class="param-value time-value clickable"
              @click="isEditingTime.end = true"
              tabindex="0"
              @keyup.enter="isEditingTime.end = true"
            >
              {{ formatTimestamp(endTimestamp) }}
            </div>
            <div class="param-sub">{{ formatLocalDate(endTimestamp) }}</div>
          </div>
          
          <input
            v-else
            type="text"
            :value="endTimestamp"
            @change="updateTime('end', $event.target.value)"
            @blur="isEditingTime.end = false"
            @keyup.enter="updateTime('end', $event.target.value)"
            @keyup.escape="isEditingTime.end = false"
            class="param-input time-input"
            placeholder="时间戳或日期"
            autofocus
            ref="endInputRef"
          />
          
          <div class="param-actions">
            <select v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }}m</option>
            </select>
            <div class="step-btns">
              <button class="step-btn" @click="adjustTime('end', -timeStep)">−</button>
              <button class="step-btn primary" @click="adjustTime('end', timeStep)">+</button>
            </div>
          </div>
        </div>

        <!-- 📍 开始索引 -->
        <div class="param-item index-param">
          <label class="param-label">
            <span class="param-icon">📍</span>
            <span class="param-text">开始索引</span>
          </label>
          
          <div v-if="!isEditingIndex.start" class="param-value-group">
            <div 
              class="param-value index-value clickable"
              @click="isEditingIndex.start = true"
              tabindex="0"
              @keyup.enter="isEditingIndex.start = true"
            >
              {{ startIndex }}
            </div>
            <div class="param-sub">{{ formatTimeOnly(startTimestamp) }}</div>
          </div>
          
          <input
            v-else
            type="number"
            :min="globalMinIdx ?? 0"
            :max="endIndex - 1"
            :value="startIndex"
            @change="updateIndex('start', $event.target.value)"
            @blur="isEditingIndex.start = false"
            @keyup.enter="updateIndex('start', $event.target.value)"
            class="param-input index-input"
            autofocus
          />
          
          <div class="param-actions">
            <select v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
            <div class="step-btns">
              <button class="step-btn" @click="adjustIndex('start', -indexStep)">−</button>
              <button class="step-btn primary" @click="adjustIndex('start', indexStep)">+</button>
            </div>
          </div>
        </div>

        <!-- 🏁 结束索引 -->
        <div class="param-item index-param">
          <label class="param-label">
            <span class="param-icon">🏁</span>
            <span class="param-text">结束索引</span>
          </label>
          
          <div v-if="!isEditingIndex.end" class="param-value-group">
            <div 
              class="param-value index-value clickable"
              @click="isEditingIndex.end = true"
              tabindex="0"
              @keyup.enter="isEditingIndex.end = true"
            >
              {{ endIndex }}
            </div>
            <div class="param-sub">{{ formatTimeOnly(endTimestamp) }}</div>
          </div>
          
          <input
            v-else
            type="number"
            :min="startIndex + 1"
            :max="globalMaxIdx"
            :value="endIndex"
            @change="updateIndex('end', $event.target.value)"
            @blur="isEditingIndex.end = false"
            @keyup.enter="updateIndex('end', $event.target.value)"
            class="param-input index-input"
            autofocus
          />
          
          <div class="param-actions">
            <select v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
            <div class="step-btns">
              <button class="step-btn" @click="adjustIndex('end', -indexStep)">−</button>
              <button class="step-btn primary" @click="adjustIndex('end', indexStep)">+</button>
            </div>
          </div>
        </div>

      </div>

      <!-- 📊 范围摘要 -->
      <div class="range-summary">
        <span class="summary-item">
          <span class="summary-icon">📊</span>
          <span><b>{{ endIndex - startIndex + 1 }}</b> / {{ globalMaxIdx + 1 }} 点</span>
        </span>
        <span class="summary-item">
          <span class="summary-icon">🕐</span>
          <span><b>{{ formatDuration((endTimestamp||0) - (startTimestamp||0)) }}</b></span>
        </span>
      </div>

      <!-- 🔘 操作按钮 -->
      <footer class="panel-footer">
        <button class="btn primary" @click="emitQuery" :disabled="loading">
          {{ loading ? '🔄 查询中...' : '🚀 刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault" :disabled="loading" title="恢复默认 0-1000">
          重置
        </button>
        <button class="btn" @click="expandFull" :disabled="loading" :title="`展示全部 ${globalMaxIdx + 1} 点`">
          全量
        </button>
      </footer>

    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: null },
})

// 输入框引用（用于编辑时自动聚焦）
const startInputRef = ref(null)
const endInputRef = ref(null)

const {
  startTimestamp,
  endTimestamp,
  startIndex,
  endIndex,
  timeStep,
  indexStep,
  isEditingTime,
  isEditingIndex,
  loading,
  error,
  currentPoints,
  currentPointsCount,
  TIME_STEPS,
  INDEX_STEPS,
  adjustTime,
  adjustIndex,
  updateTime,
  updateIndex,
  emitQuery,
  resetToDefault,
  expandFull,
  formatTimestamp,
  formatLocalDate,
  formatTimeOnly,
  formatDuration,
  formatRange,
  globalMinIdx,
  globalMaxIdx,
  lastModifiedSource
} = useTimeSlider(props.mapOp, props.mmsi, props.totalCount)

// 编辑时自动聚焦输入框
const watch = (await import('vue')).watch
watch(() => isEditingTime.start, (val) => {
  if (val) setTimeout(() => startInputRef.value?.focus(), 50)
})
watch(() => isEditingTime.end, (val) => {
  if (val) setTimeout(() => endInputRef.value?.focus(), 50)
})

defineExpose({
  emitQuery,
  resetToDefault,
  expandFull,
  currentPoints,
})
</script>

<style scoped>
/* ============ 🎨 CSS 变量 ============ */
.time-slider-panel {
  /* 色彩系统 */
  --tsp-primary: #2563eb;
  --tsp-primary-hover: #1d4ed8;
  --tsp-primary-bg: rgba(37, 99, 235, 0.08);
  --tsp-success: #10b981;
  --tsp-success-bg: rgba(16, 185, 129, 0.08);
  --tsp-text: #1e293b;
  --tsp-text-secondary: #64748b;
  --tsp-text-muted: #94a3b8;
  --tsp-bg: #f8fafc;
  --tsp-bg-card: #ffffff;
  --tsp-border: #e2e8f0;
  --tsp-border-hover: #cbd5e1;
  
  /* 尺寸 & 圆角 */
  --tsp-radius: 8px;
  --tsp-radius-lg: 12px;
  --tsp-gap: 0.75rem;
  
  /* 动画 */
  --tsp-transition: 150ms ease;
  --tsp-font-mono: ui-monospace, 'SF Mono', monospace;
}

/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--tsp-bg-card);
  border-radius: var(--tsp-radius-lg);
  border: 1px solid var(--tsp-border);
  overflow: hidden;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--tsp-bg);
}

/* ============ 📋 顶部状态栏 ============ */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  background: var(--tsp-bg-card);
  border-bottom: 1px solid var(--tsp-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--tsp-primary);
  opacity: 0.8;
}

.sync-icon svg {
  width: 16px;
  height: 16px;
}

.header-title {
  font-weight: 600;
  color: var(--tsp-text);
  font-size: 0.95rem;
}

.header-right .total-count {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: var(--tsp-primary-bg);
  color: var(--tsp-primary);
  border-radius: 20px;
  font-family: var(--tsp-font-mono);
  font-weight: 600;
  font-size: 0.9rem;
}

.total-count small {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--tsp-text-secondary);
}

/* ============ 🎴 参数网格 ============ */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--tsp-gap);
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
}

/* 参数卡片（扁平化） */
.param-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--tsp-bg-card);
  border: 1px solid var(--tsp-border);
  border-radius: var(--tsp-radius);
  transition: border-color var(--tsp-transition), box-shadow var(--tsp-transition);
}

.param-item:hover {
  border-color: var(--tsp-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
}

.param-item.time-param .param-value {
  color: var(--tsp-primary);
}

.param-item.index-param .param-value {
  color: var(--tsp-success);
}

/* 标签 */
.param-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--tsp-text);
  flex-shrink: 0;
}

.param-icon {
  font-size: 0.9rem;
}

/* 值显示区域 */
.param-value-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.param-value {
  font-family: var(--tsp-font-mono);
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.3;
  word-break: break-all;
}

.param-value.clickable {
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  transition: background var(--tsp-transition);
}

.param-value.clickable:hover {
  background: var(--tsp-bg);
}

.time-value {
  font-size: 0.95rem;
}

.index-value {
  font-size: 1.25rem;
  text-align: center;
  padding: 0.25rem 0;
}

.param-sub {
  font-size: 0.7rem;
  color: var(--tsp-text-muted);
}

/* 输入框 */
.param-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--tsp-primary);
  border-radius: 6px;
  font-family: var(--tsp-font-mono);
  font-size: 0.9rem;
  color: var(--tsp-text);
  background: var(--tsp-bg-card);
  outline: none;
  transition: border-color var(--tsp-transition), box-shadow var(--tsp-transition);
  box-sizing: border-box;
}

.param-input::placeholder {
  color: var(--tsp-text-muted);
  font-size: 0.8rem;
}

.param-input:focus {
  border-color: var(--tsp-primary-hover);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.time-input {
  font-size: 0.85rem;
}

.index-input {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  color: var(--tsp-success);
}

/* 操作区域（步长 + 按钮单行） */
.param-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.step-select {
  flex: 1;
  min-width: 0;
  padding: 0.3rem 0.45rem;
  border: 1px solid var(--tsp-border);
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--tsp-bg-card);
  color: var(--tsp-text);
  cursor: pointer;
  transition: all var(--tsp-transition);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.35rem center;
  background-repeat: no-repeat;
  background-size: 1em 1em;
  padding-right: 1.3rem;
}

.step-select:focus {
  outline: none;
  border-color: var(--tsp-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.step-btns {
  display: flex;
  gap: 0.25rem;
}

.step-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tsp-border);
  background: var(--tsp-bg-card);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--tsp-text);
  cursor: pointer;
  transition: all var(--tsp-transition);
  line-height: 1;
}

.step-btn:hover:not(:disabled) {
  background: var(--tsp-bg);
  border-color: var(--tsp-border-hover);
}

.step-btn.primary {
  background: var(--tsp-primary);
  border-color: var(--tsp-primary);
  color: #fff;
}

.step-btn.primary:hover:not(:disabled) {
  background: var(--tsp-primary-hover);
}

.step-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============ 📊 范围摘要 ============ */
.range-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  background: var(--tsp-bg-card);
  border-top: 1px solid var(--tsp-border);
  border-bottom: 1px solid var(--tsp-border);
  font-size: 0.8rem;
  color: var(--tsp-text);
  flex-shrink: 0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.summary-icon {
  font-size: 0.9rem;
}

.range-summary b {
  color: var(--tsp-primary);
  font-weight: 700;
}

/* ============ 🔘 底部操作栏 ============ */
.panel-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: var(--tsp-bg-card);
  border-top: 1px solid var(--tsp-border);
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--tsp-border);
  background: var(--tsp-bg-card);
  border-radius: var(--tsp-radius);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--tsp-text);
  cursor: pointer;
  transition: all var(--tsp-transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.btn:hover:not(:disabled) {
  background: var(--tsp-bg);
  border-color: var(--tsp-border-hover);
}

.btn.primary {
  background: var(--tsp-primary);
  border-color: var(--tsp-primary);
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: var(--tsp-primary-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============ 📱 响应式 ============ */
@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
    padding: 0.75rem;
  }
  
  .panel-header {
    padding: 0.75rem;
  }
  
  .header-title {
    font-size: 0.9rem;
  }
  
  .total-count {
    padding: 0.2rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .index-value {
    font-size: 1.1rem;
  }
  
  .param-actions {
    flex-wrap: wrap;
  }
  
  .step-select {
    min-width: 70px;
  }
  
  .panel-footer {
    flex-wrap: wrap;
    padding: 0.75rem;
  }
  
  .btn {
    padding: 0.55rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .param-value {
    font-size: 0.9rem;
  }
  
  .index-value {
    font-size: 1rem;
  }
  
  .step-btn {
    width: 26px;
    height: 26px;
    font-size: 0.8rem;
  }
}

/* ============ ♿ 无障碍 ============ */
.param-value.clickable:focus-visible,
.btn:focus-visible,
.step-btn:focus-visible,
.step-select:focus-visible,
.param-input:focus-visible {
  outline: 2px solid var(--tsp-primary);
  outline-offset: 2px;
  border-radius: 6px;
}

/* ============ 🌙 暗色模式 ============ */
@media (prefers-color-scheme: dark) {
  .time-slider-panel {
    --tsp-text: #f1f5f9;
    --tsp-text-secondary: #94a3b8;
    --tsp-text-muted: #64748b;
    --tsp-bg: #0f172a;
    --tsp-bg-card: #1e293b;
    --tsp-border: #334155;
    --tsp-border-hover: #475569;
    --tsp-primary-bg: rgba(37, 99, 235, 0.2);
    --tsp-success-bg: rgba(16, 185, 129, 0.15);
  }
  
  .param-input {
    background: var(--tsp-bg-card);
  }
  
  .step-select {
    background: var(--tsp-bg-card);
  }
}
</style>