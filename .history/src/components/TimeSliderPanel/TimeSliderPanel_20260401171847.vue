<!-- src\components\TimeSliderPanel\TimeSliderPanel.vue -->
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
          <span class="hint-label">轨迹点总数</span>
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

import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
  mapOp: { type: Object, default: null },
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



defineExpose({
  emitQuery,
  resetToDefault,
  expandFull,
  currentPoints,
})

</script>



<style scoped>
/* 导入共享样式（构建工具需支持） */
/* @import '@/styles/component-theme.css'; */

/* 🔹 组件特有变量（覆盖全局） */
.time-slider-panel {
  /* 如需微调可在此定义局部变量 */
}

/* 🔹 面板容器 */
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--ui-bg);
  padding: var(--ui-space-4);
}

/* 🔹 模式切换栏 */
.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ui-space-3) var(--ui-space-4);
  background: var(--ui-bg-card);
  border-bottom: 1px solid var(--ui-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 🔹 参数网格 */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ui-space-3);
  padding: var(--ui-space-4);
}

.param-card {
  composes: ui-card; /* 如果构建工具支持 */
  padding: var(--ui-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-2);
}

/* 🔹 时间/索引显示 */
.time-display, .index-display {
  font-family: var(--ui-font-mono);
  font-weight: 600;
  padding: var(--ui-space-1) var(--ui-space-2);
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
  transition: background var(--ui-transition);
}
.time-display { color: var(--ui-text-primary); }
.index-display { 
  color: var(--ui-success); 
  background: var(--ui-success-light);
  text-align: center;
  font-size: 1.25rem;
}
.time-display:hover, .index-display:hover {
  background: var(--ui-bg-hover);
}

/* 🔹 步进按钮组 */
.step-buttons {
  display: flex;
  gap: var(--ui-space-2);
}
.step-btn {
  composes: ui-btn;
  padding: 0.4rem;
  font-size: 0.8rem;
}
.step-btn.pos {
  composes: ui-btn success;
}

/* 🔹 范围摘要 */
.range-summary {
  display: flex;
  justify-content: space-between;
  padding: var(--ui-space-3) var(--ui-space-4);
  background: var(--ui-bg-subtle);
  border-top: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
.range-summary b { color: var(--ui-primary); }

/* 🔹 操作按钮组 */
.panel-actions {
  display: flex;
  gap: var(--ui-space-3);
  padding: var(--ui-space-4);
  border-top: 1px solid var(--ui-border);
}
.panel-actions .btn {
  composes: ui-btn;
  flex: 1;
}
.panel-actions .btn.primary {
  composes: ui-btn primary;
}

/* 🔹 响应式 */
@media (max-width: 768px) {
  .param-grid { grid-template-columns: 1fr; }
  .panel-actions { flex-direction: column; }
  .mode-switch { flex-direction: column; align-items: flex-start; gap: var(--ui-space-2); }
}
</style>