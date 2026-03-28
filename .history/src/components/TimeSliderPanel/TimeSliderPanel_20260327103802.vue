<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<template>
  <section 
    class="time-slider-panel" 
    role="region" 
    aria-label="轨迹查询面板"
  >
    
    <!-- 🔷 面板头部 -->
    <header class="panel-header">
      <div class="header-left">
        <h2 class="panel-title">
          <span aria-hidden="true">🔍</span>
          <span class="sr-only">轨迹查询</span>
          <span aria-hidden="true">轨迹查询</span>
        </h2>
        <span 
          v-if="mmsi" 
          class="mmsi-badge" 
          role="status"
          aria-label="当前船舶 MMSI: {{ mmsi }}"
        >
          MMSI: <code>{{ mmsi }}</code>
        </span>
      </div>
      
      <div class="header-right">
        <button 
          class="icon-btn" 
          @click="toggleCollapse" 
          :title="collapsed ? '展开面板' : '折叠面板'"
          :aria-expanded="!collapsed"
          aria-controls="panel-content"
        >
          <span aria-hidden="true">{{ collapsed ? '▶' : '▼' }}</span>
          <span class="sr-only">{{ collapsed ? '展开' : '折叠' }}</span>
        </button>
      </div>
    </header>

    <!-- 📋 折叠状态摘要（点击可展开） -->
    <button
      v-show="collapsed" 
      class="panel-summary" 
      @click="toggleCollapse"
      type="button"
      aria-label="点击展开查询面板"
    >
      <small>
        <span aria-hidden="true">📊</span>
        <b>{{ endIndex - startIndex + 1 }}</b> 点 | 
        <span aria-hidden="true">🕐</span>
        {{ formatTimestamp(startTimestamp) }} ~ {{ formatTimestamp(endTimestamp) }}
      </small>
      <span class="expand-hint" aria-hidden="true">点击展开 ↓</span>
    </button>

    <!-- 📦 展开内容区域 -->
    <div 
      v-show="!collapsed" 
      id="panel-content"
      class="panel-content"
      role="group"
      aria-label="查询参数设置"
    >
      
      <!-- 🔗 联动模式切换 -->
      <div class="mode-switch" role="toolbar" aria-label="查询模式">
        <label class="sync-toggle">
          <input 
            type="checkbox" 
            v-model="syncEnabled" 
            aria-label="启用时间与索引联动"
          />
          <span>
            <span aria-hidden="true">🔗</span>
            时间↔索引联动
          </span>
        </label>
        <span class="range-hint" aria-live="polite">
          全局范围: [{{ formatRange(globalMinIdx) }} ~ {{ formatRange(globalMaxIdx) }}]
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
            <label :for="'timeStep-start-' + _uid" class="step-label">步长:</label>
            <select 
              :id="'timeStep-start-' + _uid"
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
            <label :for="'timeStep-end-' + _uid" class="step-label">步长:</label>
            <select 
              :id="'timeStep-end-' + _uid"
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

        <!-- 📍 开始索引 -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">📍</span> 开始索引
          </legend>
          <div class="index-display" aria-live="polite">
            {{ startIndex }}
          </div>
          <div class="index-sub" v-if="startTimestamp">
            <span aria-hidden="true">🕐</span>
            {{ formatTimeOnly(startTimestamp) }}
          </div>
          
          <div class="step-group">
            <label :for="'indexStep-start-' + _uid" class="step-label">步长:</label>
            <select 
              :id="'indexStep-start-' + _uid"
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

        <!-- 🏁 结束索引 -->
        <fieldset class="param-card index-param">
          <legend class="param-label">
            <span aria-hidden="true">🏁</span> 结束索引
          </legend>
          <div class="index-display" aria-live="polite">
            {{ endIndex }}
          </div>
          <div class="index-sub" v-if="endTimestamp">
            <span aria-hidden="true">🕐</span>
            {{ formatTimeOnly(endTimestamp) }}
          </div>
          
          <div class="step-group">
            <label :for="'indexStep-end-' + _uid" class="step-label">步长:</label>
            <select 
              :id="'indexStep-end-' + _uid"
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
          区间：<b>{{ endIndex - startIndex + 1 }}</b> 点
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
        <button class="btn" @click="resetToDefault">
          <span aria-hidden="true">🔄</span> 重置
        </button>
        <button class="btn" @click="expandFull">
          <span aria-hidden="true">📐</span> 全量
        </button>
      </div>

      <!-- 🔍 参数预览（调试用） -->
      <div class="params-preview" v-if="previewText" aria-hidden="true">
        <small>参数：<code>{{ previewText }}</code></small>
      </div>

    </div>
  </section>
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

<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<!-- 仅替换 <style scoped> 部分内容 -->

<style scoped>
/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;               /* ✅ 占满父容器（side-panel）高度 */
  background: var(--color-bg-card);
  overflow: hidden;
  border-radius: 0;           /* ✅ 侧边栏不需要圆角 */
}

/* ============ 📦 面板内容 ============ */
.panel-content {
  flex: 1;                    /* ✅ 内容区域自适应剩余高度 */
  overflow-y: auto;           /* ✅ 内部滚动，不影响外部布局 */
  padding: 0;
  background: var(--color-bg);
}

/* 滚动条优化（保持原有） */
.panel-content::-webkit-scrollbar {
  width: 6px;
}
.panel-content::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}
.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-light);
}

/* ============ 🔘 操作按钮区（吸底） ============ */
.panel-actions {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;             /* ✅ 防止被压缩 */
}