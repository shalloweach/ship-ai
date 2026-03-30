<template>
  <section class="time-slider-panel" role="region" aria-label="轨迹查询面板">
    <div id="panel-content" class="panel-content" role="group" aria-label="查询参数设置">
      
  
      <!-- 🔗 状态指示（精简版） -->
      <div class="mode-switch" role="toolbar" aria-label="查询模式">
        <!-- 图标指示器（可替换） -->
        <span class="sync-indicator" title="查询后同步更新面板">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg> 
          
        </span>
        
        <!-- 轨迹点总数 + 徽章 -->
        <span class="range-hint" aria-live="polite">
          <span class="hint-label">轨迹点zong'shi</span>
          <span v-if="props.totalCount" class="total-badge" :title="`共 ${props.totalCount} 个轨迹点`">
            {{ props.totalCount }}
          </span>
          <span v-else class="total-badge empty">-</span>
        </span>
      </div>


      <!-- 🎴 四参数输入网格 -->
      <div class="param-grid" role="group" aria-label="查询范围参数">
        
        <!-- 🕐 开始时间（✅ 支持编辑） -->
        <fieldset class="param-card time-param">
          <legend class="param-label">
            <span aria-hidden="true">🕐</span> 开始时间
          </legend>
          
          <!-- 编辑模式 -->
          <template v-if="isEditingTime.start">
            <input
              type="text"
              :value="startTimestamp"
              @change="updateTime('start', $event.target.value)"
              @blur="isEditingTime.start = false"
              @keyup.enter="updateTime('start', $event.target.value)"
              @keyup.escape="isEditingTime.start = false"
              class="time-input"
              placeholder="时间戳(秒) 或 2023-01-01 12:00:00"
              autofocus
              title="输入秒级时间戳 或 日期时间字符串"
            />
          </template>
          <!-- 显示模式 -->
          <template v-else>
            <div 
              class="time-display clickable"
              @click="isEditingTime.start = true"
              tabindex="0"
              @keyup.enter="isEditingTime.start = true"
              title="点击编辑时间"
            >
              {{ formatTimestamp(startTimestamp) }}
            </div>
            <div class="time-sub">{{ formatLocalDate(startTimestamp) }}</div>
          </template>
          
          <!-- 步长选择 + 调整按钮 -->
          <div class="step-group">
            <label for="timeStep-start" class="step-label">步长:</label>
            <select id="timeStep-start" v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }} 分钟</option>
            </select>
          </div>
          <div class="step-buttons" role="group" aria-label="调整开始时间">
            <button class="step-btn" @click="adjustTime('start', -timeStep)">−{{ timeStep }}m</button>
            <button class="step-btn pos" @click="adjustTime('start', timeStep)">+{{ timeStep }}m</button>
          </div>
        </fieldset>

        <!-- 🕑 结束时间（✅ 支持编辑） -->
        <fieldset class="param-card time-param">
          <legend class="param-label">
            <span aria-hidden="true">🕑</span> 结束时间
          </legend>
          
          <template v-if="isEditingTime.end">
            <input
              type="text"
              :value="endTimestamp"
              @change="updateTime('end', $event.target.value)"
              @blur="isEditingTime.end = false"
              @keyup.enter="updateTime('end', $event.target.value)"
              @keyup.escape="isEditingTime.end = false"
              class="time-input"
              placeholder="时间戳(秒) 或 2023-01-01 12:00:00"
              autofocus
            />
          </template>
          <template v-else>
            <div 
              class="time-display clickable"
              @click="isEditingTime.end = true"
              tabindex="0"
              @keyup.enter="isEditingTime.end = true"
            >
              {{ formatTimestamp(endTimestamp) }}
            </div>
            <div class="time-sub">{{ formatLocalDate(endTimestamp) }}</div>
          </template>
          
          <div class="step-group">
            <label for="timeStep-end" class="step-label">步长:</label>
            <select id="timeStep-end" v-model="timeStep" class="step-select">
              <option v-for="s in TIME_STEPS" :key="s" :value="s">{{ s }} 分钟</option>
            </select>
          </div>
          <div class="step-buttons" role="group" aria-label="调整结束时间">
            <button class="step-btn" @click="adjustTime('end', -timeStep)">−{{ timeStep }}m</button>
            <button class="step-btn pos" @click="adjustTime('end', timeStep)">+{{ timeStep }}m</button>
          </div>
        </fieldset>

        <!-- 📍 开始索引（保持原逻辑） -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">📍</span> 开始索引
          </legend>
          
          <template v-if="isEditingIndex.start">
            <input
              type="number"
              :min="globalMinIdx ?? 0"
              :max="endIndex - 1"
              :value="startIndex"
              @change="updateIndex('start', $event.target.value)"
              @blur="isEditingIndex.start = false"
              @keyup.enter="updateIndex('start', $event.target.value)"
              class="index-input"
              autofocus
            />
          </template>
          <template v-else>
            <div 
              class="index-display clickable"
              @click="isEditingIndex.start = true"
              tabindex="0"
              @keyup.enter="isEditingIndex.start = true"
            >
              {{ startIndex }}
            </div>
          </template>
          
          <div class="index-sub" v-if="startTimestamp">
            <span aria-hidden="true">🕐</span>{{ formatTimeOnly(startTimestamp) }}
          </div>
          
          <div class="step-group">
            <label for="indexStep-start" class="step-label">步长:</label>
            <select id="indexStep-start" v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="step-buttons" role="group" aria-label="调整开始索引">
            <button class="step-btn" @click="adjustIndex('start', -indexStep)">−{{ indexStep }}</button>
            <button class="step-btn pos" @click="adjustIndex('start', indexStep)">+{{ indexStep }}</button>
          </div>
        </fieldset>

        <!-- 🏁 结束索引（保持原逻辑） -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">🏁</span> 结束索引
          </legend>
          
          <template v-if="isEditingIndex.end">
            <input
              type="number"
              :min="startIndex + 1"
              :max="globalMaxIdx"
              :value="endIndex"
              @change="updateIndex('end', $event.target.value)"
              @blur="isEditingIndex.end = false"
              @keyup.enter="updateIndex('end', $event.target.value)"
              class="index-input"
              autofocus
            />
          </template>
          <template v-else>
            <div 
              class="index-display clickable"
              @click="isEditingIndex.end = true"
              tabindex="0"
              @keyup.enter="isEditingIndex.end = true"
            >
              {{ endIndex }}
            </div>
          </template>
          
          <div class="index-sub" v-if="endTimestamp">
            <span aria-hidden="true">🕐</span>{{ formatTimeOnly(endTimestamp) }}
          </div>
          
          <div class="step-group">
            <label for="indexStep-end" class="step-label">步长:</label>
            <select id="indexStep-end" v-model="indexStep" class="step-select">
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="step-buttons" role="group" aria-label="调整结束索引">
            <button class="step-btn" @click="adjustIndex('end', -indexStep)">−{{ indexStep }}</button>
            <button class="step-btn pos" @click="adjustIndex('end', indexStep)">+{{ indexStep }}</button>
          </div>
        </fieldset>

      </div>

      <!-- 📊 范围摘要 -->
      <div class="range-summary" role="status" aria-live="polite">
        <span>
          <span aria-hidden="true">📊</span>
          区间：<b>{{ endIndex - startIndex + 1 }}</b> / {{ globalMaxIdx + 1 }} 点
        </span>
        <span>
          <span aria-hidden="true">🕐</span>
          时长：<b>{{ formatDuration((endTimestamp||0) - (startTimestamp||0)) }}</b>
        </span>
      </div>

      <!-- 🔘 操作按钮组 -->
      <div class="panel-actions" role="group" aria-label="查询操作">
        <button 
          class="btn primary" 
          @click="emitQuery" 
          :disabled="loading"
          :aria-busy="loading"
          :title="`最后修改: ${lastModifiedSource || '未设置'}，将调用对应接口`"
        >
          <span aria-hidden="true">{{ loading ? '🔄' : '🚀' }}</span>
          {{ loading ? '查询中...' : '刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault" :disabled="loading" title="恢复默认 0-1000">
          <span aria-hidden="true">🔄</span> 重置
        </button>
        <button class="btn" @click="expandFull" :disabled="loading" :title="`展示全部 ${globalMaxIdx + 1} 点`">
          <span aria-hidden="true">📐</span> 全量
        </button>
      </div>

    </div>
  </section>
</template>

<script setup>
import { watch } from 'vue'
import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: () => ({}) },
  // 外部控制参数（可选）
  currentStartTs: { type: Number, default: null },
  currentEndTs: { type: Number, default: null },
  currentStartIdx: { type: Number, default: null },
  currentEndIdx: { type: Number, default: null }
})

const {
  startTimestamp,
  endTimestamp,
  startIndex,
  endIndex,
  timeStep,
  indexStep,
  isEditingTime,      // ✅ 新增
  isEditingIndex,
  loading,
  error,
  currentPoints,
  currentPointsCount,
  TIME_STEPS,
  INDEX_STEPS,
  adjustTime,
  adjustIndex,
  updateTime,         // ✅ 新增
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
  lastModifiedSource  // ✅ 新增
} = useTimeSlider(props.mapOp, props.mmsi, props.totalCount)

// 监听外部参数变化（仅初始化/路由跳转时同步，不触发查询）
watch(
  () => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx],
  ([newStartTs, newEndTs, newStartIdx, newEndIdx]) => {
    if (newStartTs != null && newStartTs !== startTimestamp.value) {
      startTimestamp.value = newStartTs
    }
    if (newEndTs != null && newEndTs !== endTimestamp.value) {
      endTimestamp.value = newEndTs
    }
    if (newStartIdx != null && newStartIdx !== startIndex.value) {
      startIndex.value = newStartIdx
    }
    if (newEndIdx != null && newEndIdx !== endIndex.value) {
      endIndex.value = newEndIdx
    }
  },
  { immediate: true }
)

defineExpose({
  emitQuery,
  resetToDefault,
  expandFull,
  currentPoints
})
</script>



<style scoped>
/* ============ 🎨 CSS 变量定义 ============ */
/* 使用组件级变量，避免 :root 在 scoped 中失效 */
.time-slider-panel {
  /* 主色调 */
  --ts-primary: #1e40af;
  --ts-primary-dark: #1e3a8a;
  --ts-primary-light: #3b82f6;
  --ts-primary-gradient: linear-gradient(135deg, #1e40af, #3b82f6);
  
  /* 辅助色 */
  --ts-success: #10b981;
  --ts-success-light: rgba(16, 185, 129, 0.1);
  --ts-warning: #f59e0b;
  --ts-error: #ef4444;
  
  /* 背景色 */
  --ts-bg: #f8fafc;
  --ts-bg-card: #ffffff;
  --ts-bg-subtle: #f1f5f9;
  --ts-bg-input: #ffffff;
  --ts-bg-button: #ffffff;
  --ts-bg-hover: #f1f5f9;
  
  /* 边框色 */
  --ts-border: #e2e8f0;
  --ts-border-hover: #cbd5e1;
  
  /* 文字色 */
  --ts-text: #1e293b;
  --ts-text-secondary: #64748b;
  --ts-text-muted: #94a3b8;
  --ts-text-primary: #1e293b;
  
  /* 阴影 & 圆角 */
  --ts-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --ts-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --ts-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --ts-radius-sm: 6px;
  --ts-radius-md: 10px;
  --ts-radius-lg: 14px;
  
  /* 动画 */
  --ts-transition: 150ms ease;
  --ts-font-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;
}

/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ts-bg-card);
  border-radius: var(--ts-radius-lg);
  border: 1px solid var(--ts-border);
  box-shadow: var(--ts-shadow-sm);
  overflow: hidden;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--ts-bg);
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 滚动条优化 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}
.panel-content::-webkit-scrollbar-track {
  background: transparent;
}
.panel-content::-webkit-scrollbar-thumb {
  background: var(--ts-border-hover);
  border-radius: 3px;
  transition: background var(--ts-transition);
}
.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--ts-primary-light);
}

/* ============ 🔗 模式切换栏 ============ */
.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--ts-bg-card);
  border-bottom: 1px solid var(--ts-border);
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ts-text);
  font-weight: 500;
}

.sync-indicator::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--ts-success);
  border-radius: 50%;
  animation: ts-pulse 2s infinite;
}

@keyframes ts-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.range-hint {
  color: var(--ts-text-muted);
  font-family: var(--ts-font-mono);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ✅ totalCount 徽章样式 */
.total-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: var(--ts-primary-gradient);
  color: #fff;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  animation: ts-badge-pulse 2.5s infinite;
  box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
}

@keyframes ts-badge-pulse {
  0%, 100% { box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2); }
  50% { box-shadow: 0 4px 8px rgba(30, 64, 175, 0.4); }
}

/* ============ 🎴 四参数输入网格 ============ */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  flex: 1;
}

.param-card {
  position: relative;
  background: var(--ts-bg-card);
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-lg);
  padding: 0.875rem;
  box-shadow: var(--ts-shadow-sm);
  transition: all var(--ts-transition);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-card:hover {
  border-color: var(--ts-primary-light);
  box-shadow: var(--ts-shadow-md);
  transform: translateY(-2px);
}

/* 卡片微交互光效 */
.param-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, transparent, var(--ts-primary-light), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--ts-transition);
  pointer-events: none;
}
.param-card:hover::after {
  opacity: 1;
}

.param-label {
  font-weight: 600;
  color: var(--ts-text);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ============ 🕐 时间显示 & 输入 ============ */
.time-display {
  font-family: var(--ts-font-mono);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ts-primary);
  margin-bottom: 0.1rem;
  line-height: 1.3;
  word-break: break-all;
}

.time-display.clickable {
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: background var(--ts-transition);
}
.time-display.clickable:hover {
  background: var(--ts-bg-subtle);
  outline: 1px dashed var(--ts-border-hover);
}

.time-sub {
  font-size: 0.75rem;
  color: var(--ts-text-muted);
  margin-bottom: 0.4rem;
  flex-shrink: 0;
}

/* ✅ 时间输入框样式（新增） */
.time-input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 2px solid var(--ts-primary-light);
  border-radius: var(--ts-radius-sm);
  font-family: var(--ts-font-mono);
  font-size: 0.85rem;
  color: var(--ts-text);
  background: var(--ts-bg-input);
  margin-bottom: 0.3rem;
  outline: none;
  transition: all var(--ts-transition);
  box-sizing: border-box;
}
.time-input::placeholder {
  color: var(--ts-text-muted);
  font-size: 0.75rem;
}
.time-input:focus {
  border-color: var(--ts-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.time-input:invalid {
  border-color: var(--ts-error);
}

/* ============ 📍 索引显示 & 输入 ============ */
.index-display {
  font-family: var(--ts-font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ts-success);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  text-align: center;
  background: var(--ts-success-light);
  transition: all var(--ts-transition);
  user-select: none;
}
.index-display.clickable {
  cursor: pointer;
  border: 1px dashed var(--ts-border);
}
.index-display.clickable:hover {
  border-style: solid;
  background: var(--ts-bg-hover);
  transform: scale(1.02);
}

.index-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--ts-primary-light);
  border-radius: var(--ts-radius-sm);
  font-family: var(--ts-font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ts-success);
  background: var(--ts-bg-input);
  text-align: center;
  outline: none;
  transition: all var(--ts-transition);
  box-sizing: border-box;
}
.index-input:focus {
  border-color: var(--ts-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.index-input::-webkit-inner-spin-button,
.index-input::-webkit-outer-spin-button {
  opacity: 1;
}

.index-sub {
  font-size: 0.75rem;
  color: var(--ts-text-muted);
  text-align: center;
  margin-bottom: 0.3rem;
  flex-shrink: 0;
}

/* ============ ⚙️ 步长控制组 ============ */
.step-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.2rem 0;
  flex-shrink: 0;
}
.step-label {
  font-size: 0.75rem;
  color: var(--ts-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}
.step-select {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-sm);
  font-size: 0.8rem;
  background: var(--ts-bg-input);
  color: var(--ts-text);
  cursor: pointer;
  transition: all var(--ts-transition);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.4rem center;
  background-repeat: no-repeat;
  background-size: 1.2em 1.2em;
  padding-right: 1.5rem;
}
.step-select:focus {
  outline: none;
  border-color: var(--ts-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.step-select:hover {
  border-color: var(--ts-border-hover);
}

/* ============ ➕➖ 步进按钮 ============ */
.step-buttons {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.step-btn {
  flex: 1;
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--ts-border);
  background: var(--ts-bg-button);
  border-radius: var(--ts-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ts-text);
  transition: all var(--ts-transition);
  text-align: center;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-btn:hover:not(:disabled) {
  background: var(--ts-bg-hover);
  border-color: var(--ts-border-hover);
  transform: translateY(-1px);
}
.step-btn:active:not(:disabled) {
  transform: translateY(0);
}
.step-btn.pos {
  border-color: var(--ts-success);
  color: var(--ts-success);
  background: var(--ts-success-light);
}
.step-btn.pos:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.2);
  border-color: #059669;
  color: #047857;
}
.step-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ============ 📊 范围摘要栏 ============ */
.range-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(to right, var(--ts-bg-subtle), #e2e8f0);
  border-top: 1px solid var(--ts-border);
  border-bottom: 1px solid var(--ts-border);
  font-size: 0.85rem;
  color: var(--ts-text);
  font-weight: 500;
  flex-shrink: 0;
}
.range-summary b {
  color: var(--ts-primary);
  font-weight: 700;
}
.range-summary span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ============ 🔘 操作按钮组 ============ */
.panel-actions {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  background: var(--ts-bg-card);
  border-top: 1px solid var(--ts-border);
  flex-shrink: 0;
}
.btn {
  flex: 1;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--ts-border);
  background: var(--ts-bg-button);
  border-radius: var(--ts-radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ts-text);
  transition: all var(--ts-transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  white-space: nowrap;
}
.btn:hover:not(:disabled) {
  background: var(--ts-bg-hover);
  border-color: var(--ts-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--ts-shadow-md);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
}
.btn.primary {
  background: var(--ts-primary-gradient);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
}
.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  box-shadow: var(--ts-shadow-lg), 0 0 20px rgba(59, 130, 246, 0.3);
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ============ 🔍 调试信息（开发用） ============ */
.params-debug {
  margin: 0 1.25rem;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: var(--ts-text-muted);
  border-top: 1px dashed var(--ts-border);
}
.params-preview {
  background: var(--ts-bg-subtle);
  padding: 0.5rem;
  border-radius: var(--ts-radius-sm);
  overflow-x: auto;
  margin: 0.5rem 0;
  font-family: var(--ts-font-mono);
  font-size: 0.7rem;
}
.params-preview code {
  color: var(--ts-primary);
}

/* ============ 📱 响应式适配 ============ */
@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
    padding: 0.875rem;
  }
  .mode-switch {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  .range-hint {
    font-size: 0.75rem;
    flex-wrap: wrap;
  }
  .panel-actions {
    flex-direction: column;
    padding: 0.875rem;
  }
  .btn {
    width: 100%;
    padding: 0.8rem;
  }
  .range-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .time-display {
    font-size: 0.95rem;
  }
  .index-display,
  .index-input {
    font-size: 1.1rem;
  }
  .step-btn {
    font-size: 0.75rem;
    padding: 0.4rem;
  }
}

/* ============ ♿ 无障碍聚焦样式 ============ */
.btn:focus-visible,
.step-btn:focus-visible,
.step-select:focus-visible,
.time-input:focus-visible,
.index-input:focus-visible,
.time-display.clickable:focus-visible,
.index-display.clickable:focus-visible {
  outline: 2px solid var(--ts-primary-light);
  outline-offset: 2px;
  border-radius: var(--ts-radius-sm);
}

/* ============ 🌙 暗色模式适配（可选） ============ */
@media (prefers-color-scheme: dark) {
  .time-slider-panel {
    --ts-bg: #0f172a;
    --ts-bg-card: #1e293b;
    --ts-bg-subtle: #334155;
    --ts-bg-input: #1e293b;
    --ts-bg-button: #334155;
    --ts-bg-hover: #475569;
    --ts-border: #475569;
    --ts-border-hover: #64748b;
    --ts-text: #f1f5f9;
    --ts-text-secondary: #94a3b8;
    --ts-text-muted: #64748b;
    --ts-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --ts-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  }
  .index-display {
    background: rgba(16, 185, 129, 0.15);
  }
  .step-btn.pos {
    background: rgba(16, 185, 129, 0.1);
  }
}
</style>