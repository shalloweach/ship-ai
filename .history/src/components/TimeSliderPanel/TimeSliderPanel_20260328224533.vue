<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<template>
  <section 
    class="time-slider-panel" 
    role="region" 
    aria-label="轨迹查询面板"
  >
    <!-- 面板内容区域 -->
    <div 
      id="panel-content"
      class="panel-content"
      role="group"
      aria-label="查询参数设置"
    >
      
      <!-- 🔗 联动指示（始终启用，移除复选框） -->
      <div class="mode-switch" role="toolbar" aria-label="查询模式">
        <span class="sync-indicator" title="时间与索引自动联动">
          <span aria-hidden="true">🔗</span>
          时间↔索引自动联动
        </span>
        <span class="range-hint" aria-live="polite">
          全局范围: {{ formatRange(props.globalMinIdx) }} ~ {{ formatRange(globalMaxIdx) }} 
          (共 {{ globalMaxIdx + 1 }} 点)
        </span>
      </div>

      <!-- 🎴 四参数输入网格 -->
      <div class="param-grid" role="group" aria-label="查询范围参数">
        
        <!-- 🕐 开始时间 -->
        <fieldset class="param-card time-param">
          <legend class="param-label">
            <span aria-hidden="true">🕐</span> 开始时间
          </legend>
          <div class="time-display" aria-live="polite">
            {{ formatTimestamp(startTimestamp) }}
          </div>
          <div class="time-sub">{{ formatLocalDate(startTimestamp) }}</div>
          
          <div class="step-group">
            <label :for="'timeStep-start'" class="step-label">步长:</label>
            <select 
              id="timeStep-start"
              v-model="timeStep" 
              class="step-select"
              aria-label="开始时间调整步长"
            >
              <option v-for="s in TIME_STEPS" :key="s" :value="s">
                {{ s }} 分钟
              </option>
            </select>
          </div>
          
          <div class="step-buttons" role="group" aria-label="调整开始时间">
            <button 
              class="step-btn" 
              @click="adjustTime('start', -timeStep)"
              aria-label="开始时间减少 {{ timeStep }} 分钟"
            >
              −{{ timeStep }}m
            </button>
            <button 
              class="step-btn pos" 
              @click="adjustTime('start', timeStep)"
              aria-label="开始时间增加 {{ timeStep }} 分钟"
            >
              +{{ timeStep }}m
            </button>
          </div>
        </fieldset>

        <!-- 🕑 结束时间 -->
        <fieldset class="param-card time-param">
          <legend class="param-label">
            <span aria-hidden="true">🕑</span> 结束时间
          </legend>
          <div class="time-display" aria-live="polite">
            {{ formatTimestamp(endTimestamp) }}
          </div>
          <div class="time-sub">{{ formatLocalDate(endTimestamp) }}</div>
          
          <div class="step-group">
            <label :for="'timeStep-end'" class="step-label">步长:</label>
            <select 
              id="timeStep-end"
              v-model="timeStep" 
              class="step-select"
              aria-label="结束时间调整步长"
            >
              <option v-for="s in TIME_STEPS" :key="s" :value="s">
                {{ s }} 分钟
              </option>
            </select>
          </div>
          
          <div class="step-buttons" role="group" aria-label="调整结束时间">
            <button 
              class="step-btn" 
              @click="adjustTime('end', -timeStep)"
              aria-label="结束时间减少 {{ timeStep }} 分钟"
            >
              −{{ timeStep }}m
            </button>
            <button 
              class="step-btn pos" 
              @click="adjustTime('end', timeStep)"
              aria-label="结束时间增加 {{ timeStep }} 分钟"
            >
              +{{ timeStep }}m
            </button>
          </div>
        </fieldset>

        <!-- 📍 开始索引（✅ 改为可编辑输入框） -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">📍</span> 开始索引
          </legend>
          
          <!-- 编辑模式：数字输入框 -->
          <template v-if="isEditingIndex.start">
            <input
              type="number"
              :min="props.globalMinIdx ?? 0"
              :max="endIndex - 1"
              :value="startIndex"
              @change="updateIndex('start', $event.target.value)"
              @blur="isEditingIndex.start = false"
              @keyup.enter="updateIndex('start', $event.target.value)"
              class="index-input"
              aria-label="输入开始索引"
              autofocus
            />
          </template>
          <!-- 显示模式：可点击编辑 -->
          <template v-else>
            <div 
              class="index-display clickable"
              @click="isEditingIndex.start = true"
              aria-label="点击编辑开始索引"
              tabindex="0"
              @keyup.enter="isEditingIndex.start = true"
            >
              {{ startIndex }}
            </div>
          </template>
          
          <div class="index-sub" v-if="startTimestamp">
            <span aria-hidden="true">🕐</span>
            {{ formatTimeOnly(startTimestamp) }}
          </div>
          
          <div class="step-group">
            <label :for="'indexStep-start'" class="step-label">步长:</label>
            <select 
              id="indexStep-start"
              v-model="indexStep" 
              class="step-select"
              aria-label="开始索引调整步长"
            >
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">
                {{ s }}
              </option>
            </select>
          </div>
          
          <div class="step-buttons" role="group" aria-label="调整开始索引">
            <button 
              class="step-btn" 
              @click="adjustIndex('start', -indexStep)"
              aria-label="开始索引减少 {{ indexStep }}"
            >
              −{{ indexStep }}
            </button>
            <button 
              class="step-btn pos" 
              @click="adjustIndex('start', indexStep)"
              aria-label="开始索引增加 {{ indexStep }}"
            >
              +{{ indexStep }}
            </button>
          </div>
        </fieldset>

        <!-- 🏁 结束索引（✅ 改为可编辑输入框） -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">🏁</span> 结束索引
          </legend>
          
          <!-- 编辑模式：数字输入框 -->
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
              aria-label="输入结束索引"
              autofocus
            />
          </template>
          <!-- 显示模式：可点击编辑 -->
          <template v-else>
            <div 
              class="index-display clickable"
              @click="isEditingIndex.end = true"
              aria-label="点击编辑结束索引"
              tabindex="0"
              @keyup.enter="isEditingIndex.end = true"
            >
              {{ endIndex }}
            </div>
          </template>
          
          <div class="index-sub" v-if="endTimestamp">
            <span aria-hidden="true">🕐</span>
            {{ formatTimeOnly(endTimestamp) }}
          </div>
          
          <div class="step-group">
            <label :for="'indexStep-end'" class="step-label">步长:</label>
            <select 
              id="indexStep-end"
              v-model="indexStep" 
              class="step-select"
              aria-label="结束索引调整步长"
            >
              <option v-for="s in INDEX_STEPS" :key="s" :value="s">
                {{ s }}
              </option>
            </select>
          </div>
          
          <div class="step-buttons" role="group" aria-label="调整结束索引">
            <button 
              class="step-btn" 
              @click="adjustIndex('end', -indexStep)"
              aria-label="结束索引减少 {{ indexStep }}"
            >
              −{{ indexStep }}
            </button>
            <button 
              class="step-btn pos" 
              @click="adjustIndex('end', indexStep)"
              aria-label="结束索引增加 {{ indexStep }}"
            >
              +{{ indexStep }}
            </button>
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
          时长：<b>{{ formatDuration(endTimestamp - startTimestamp) }}</b>
        </span>
      </div>

      <!-- 🔘 操作按钮组 -->
      <div class="panel-actions" role="group" aria-label="查询操作">
        <button 
          class="btn primary" 
          @click="emitQuery" 
          :disabled="loading"
          :aria-busy="loading"
        >
          <span aria-hidden="true">{{ loading ? '🔄' : '🚀' }}</span>
          {{ loading ? '查询中...' : '刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault" :disabled="loading">
          <span aria-hidden="true">🔄</span> 重置
        </button>
        <button class="btn" @click="expandFull" :disabled="loading">
          <span aria-hidden="true">📐</span> 全量
        </button>
      </div>

      <!-- 🔍 参数预览（调试用，可隐藏） -->
      <details class="params-debug" v-if="false">
        <summary>调试信息</summary>
        <pre class="params-preview"><code>{{ previewText }}</code></pre>
      </details>

    </div>
  </section>
</template>

<script setup>
import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  
  // 时间范围（秒级时间戳，与后端一致）
  globalMinTs: { type: Number, default: null },
  globalMaxTs: { type: Number, default: null },
  currentStartTs: { type: Number, default: null },
  currentEndTs: { type: Number, default: null },
  
  // 索引范围
  globalMinIdx: { type: Number, default: 0 },
  currentStartIdx: { type: Number, default: 0 },
  currentEndIdx: { type: Number, default: 1000 },
  
  // ✅ 新增：该 MMSI 的总点数（动态获取，替代硬编码 10000）
  totalPoints: { type: Number, default: null },
  
  // 其他
  batchSize: { type: Number, default: 5000 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits([
  'query',           // 用户点击查询时发射
  'params-change',   // 参数变更时发射（用于联动）
  'map-ready'        // 地图初始化完成后发射（可选）
])

// 使用组合函数
const {
  // 状态
  timeStep, indexStep, startTimestamp, endTimestamp,
  startIndex, endIndex, collapsed, isEditingIndex,
  // 计算属性
  globalMaxIdx, previewText, queryParams,
  // 常量
  TIME_STEPS, INDEX_STEPS,
  // 工具函数
  formatTimestamp, formatLocalDate, formatTimeOnly,
  formatDuration, formatRange, toSeconds, toMilliseconds,
  // 操作方法
  adjustTime, adjustIndex, updateIndex, toggleCollapse,
  emitQuery, resetToDefault, expandFull,
  // 地图操作
  initMap, renderTrajectory, clearTrajectory, fitBounds, centerOn, getMap,
  // 暴露方法
  exposeMethods
} = useTimeSlider(props, emit)

// 暴露方法给父组件
defineExpose(exposeMethods)
</script>

<style scoped>
/* ============ 🎨 设计变量 ============ */
:root {
  --color-primary: #1e40af;
  --color-primary-dark: #1e3a8a;
  --color-primary-light: #3b82f6;
  --color-primary-gradient: linear-gradient(135deg, #1e40af, #3b82f6);
  --color-success: #10b981;
  --color-bg: #f8fafc;
  --color-bg-card: #ffffff;
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --transition-fast: 150ms ease;
}

/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-card);
  overflow: hidden;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--color-bg);
}

/* 滚动条优化 */
.panel-content::-webkit-scrollbar { width: 6px; }
.panel-content::-webkit-scrollbar-track { background: transparent; }
.panel-content::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}
.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-light);
}

/* ============ 🔗 模式切换 ============ */
.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-text);
  font-weight: 500;
}

.sync-indicator::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.range-hint {
  color: var(--color-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 0.8rem;
}

/* ============ 🎴 四参数网格 ============ */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
  padding: 1rem 1.25rem;
}

.param-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0.875rem;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.param-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.param-label {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* 时间显示 */
.time-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1rem;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 0.15rem;
}

.time-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

/* ✅ 索引显示 + 输入框 */
.index-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 0.15rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.index-display.clickable {
  cursor: pointer;
}

.index-display.clickable:hover {
  background: #f1f5f9;
}

.index-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--color-primary-light);
  border-radius: 6px;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-success);
  background: #fff;
  margin-bottom: 0.15rem;
  outline: none;
}

.index-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.index-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

/* 步长选择 */
.step-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.step-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.step-select {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  background: var(--color-bg-card);
  color: var(--color-text);
  cursor: pointer;
  min-width: 65px;
}

.step-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* 步进按钮 */
.step-buttons {
  display: flex;
  gap: 0.4rem;
}

.step-btn {
  flex: 1;
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s;
  text-align: center;
}

.step-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.step-btn.pos {
  border-color: var(--color-success);
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.05);
}

.step-btn.pos:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: #059669;
}

/* ============ 📊 范围摘要 ============ */
.range-summary {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(to right, #f8fafc, #f1f5f9);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
}

.range-summary b {
  color: var(--color-primary);
  font-weight: 700;
}

/* ============ 🔘 操作按钮 ============ */
.panel-actions {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: 0.7rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn.primary {
  background: var(--color-primary-gradient);
  color: #fff;
  border-color: transparent;
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(59, 130, 246, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ============ 🔍 调试信息 ============ */
.params-debug {
  margin: 0 1.25rem;
  padding: 0.5rem 0;
  font-size: 0.75rem;
}

.params-preview {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.params-preview code {
  font-family: 'SF Mono', 'Consolas', monospace;
  color: var(--color-primary);
}

/* ============ 📱 响应式 ============ */
@media (max-width: 480px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
  
  .panel-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .mode-switch {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* ============ ✨ 微交互 ============ */
.param-card {
  isolation: isolate;
}

.param-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, transparent, var(--color-primary-light), transparent);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.param-card:hover::after {
  opacity: 1;
}

.btn:focus-visible,
.step-btn:focus-visible,
.step-select:focus-visible,
.index-input:focus {
  outline: 2px solid var(--color-primary-light);
  outline-offset: 2px;
}
</style>