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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import TimeSlider from '@/components/TimeSliderPanel/TimeSliderPanel.vue'
import { useTrackFlow } from './useTrackFlow'

// 地图容器引用
const mapContainerRef = ref(null)

// 使用核心逻辑组合函数
const {
  // 状态
  currentMmsi, globalRange, queryRange, loading, error, currentPointsCount, hasData,
  // 方法
  onQuery, refreshQuery, exportTrajectory, clearMap, centerMap,
  // 工具函数
  formatDuration,
  // 生命周期
  setup, teardown,
  // 暴露方法
  exposeMethods
} = useTrackFlow(mapContainerRef)

// 生命周期
onMounted(async () => {
  await setup()
})

onBeforeUnmount(() => {
  teardown()
})

// 暴露方法给父组件
defineExpose(exposeMethods)
</script>

<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<!-- 仅替换 <style scoped> 部分内容 -->

<style scoped>
/* ============ 🎨 设计变量（与主容器保持一致） ============ */
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
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-card);
  overflow: hidden;
  border-radius: 0;
}

/* ============ 🔷 面板头部 ============ */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--color-primary-gradient);
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.panel-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  z-index: 1;
}

.panel-title {
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mmsi-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: 'SF Mono', 'Consolas', monospace;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all var(--transition-fast);
}

.mmsi-badge:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.header-right .icon-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  position: relative;
  z-index: 1;
}

.header-right .icon-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.5);
}

.header-right .icon-btn:active {
  transform: scale(0.98);
  transition-duration: 50ms;
}

/* ============ 📋 折叠摘要 ============ */
.panel-summary {
  padding: 0.875rem 1.25rem;
  background: linear-gradient(to right, #f8fafc, #f1f5f9);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  font-size: 0.85rem;
}

.panel-summary:hover {
  background: linear-gradient(to right, #f1f5f9, #e2e8f0);
  padding-left: 1.5rem;
}

.panel-summary small {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.panel-summary small b {
  color: var(--color-primary);
  font-weight: 600;
}

.expand-hint {
  font-size: 0.8rem;
  color: var(--color-primary-light);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.expand-hint::before {
  content: '↓';
  font-size: 0.7rem;
  transition: transform var(--transition-fast);
}

.panel-summary:hover .expand-hint::before {
  transform: translateY(2px);
}

/* ============ 📦 面板内容 ============ */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--color-bg);
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
  transition: background var(--transition-fast);
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

.sync-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  color: var(--color-text);
  font-weight: 500;
  user-select: none;
  transition: color var(--transition-fast);
}

.sync-toggle:hover {
  color: var(--color-primary);
}

.sync-toggle input {
  cursor: pointer;
  accent-color: var(--color-primary);
  width: 16px;
  height: 16px;
  border-radius: 4px;
  transition: transform var(--transition-fast);
}

.sync-toggle input:hover {
  transform: scale(1.1);
}

.range-hint {
  color: var(--color-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.range-hint b {
  color: var(--color-primary);
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
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.param-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  transition: background var(--transition-fast);
}

.param-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.param-card:hover::before {
  background: var(--color-primary-gradient);
}

.param-card:has(.time-display) {
  border-left: 3px solid var(--color-info);
}

.param-card:has(.index-display) {
  border-left: 3px solid var(--color-success);
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
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.time-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
  font-weight: 500;
}

/* 索引显示 */
.index-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 0.15rem;
  letter-spacing: 0.5px;
}

.index-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
  font-weight: 500;
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
  transition: all var(--transition-fast);
  font-weight: 500;
}

.step-select:hover {
  border-color: var(--color-primary-light);
  background: #f8fafc;
}

.step-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
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
  transition: all var(--transition-fast);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.step-btn:hover {
  background: #f1f5f9;
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.step-btn:active {
  transform: translateY(0);
  transition-duration: 50ms;
}

.step-btn.pos {
  border-color: var(--color-success);
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.05);
}

.step-btn.pos:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: #059669;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
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
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transition: left 0.4s ease;
}

.btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn:hover:not(:disabled)::before {
  left: 100%;
}

.btn:active:not(:disabled) {
  transform: translateY(-1px);
  transition-duration: 50ms;
}

.btn.primary {
  background: var(--color-primary-gradient);
  color: #fff;
  border-color: transparent;
  box-shadow: var(--shadow-md);
  font-weight: 600;
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(59, 130, 246, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  background: #f8fafc;
}

.btn:disabled::before {
  display: none;
}

/* ============ 🔍 参数预览 ============ */
.params-preview {
  padding: 0.6rem 1.25rem;
  background: #f8fafc;
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.params-preview code {
  background: #e2e8f0;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-family: 'SF Mono', 'Consolas', monospace;
  color: var(--color-primary);
  margin-left: 0.3rem;
  font-weight: 500;
  border: 1px solid var(--color-border);
}

/* ============ 🎨 暗色模式支持 ============ */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-card: #1e293b;
    --color-border: #334155;
    --color-border-hover: #475569;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
  }
  
  .time-slider-panel {
    background: var(--color-bg-card);
  }
  
  .panel-summary,
  .mode-switch,
  .range-summary,
  .panel-actions,
  .params-preview {
    background: var(--color-bg-card);
    border-color: var(--color-border);
  }
  
  .param-card {
    background: var(--color-bg-card);
    border-color: var(--color-border);
  }
  
  .param-card:hover {
    border-color: var(--color-primary-light);
  }
  
  .step-select,
  .step-btn,
  .btn {
    background: var(--color-bg-card);
    border-color: var(--color-border);
    color: var(--color-text);
  }
  
  .step-select:hover,
  .step-btn:hover,
  .btn:hover:not(:disabled) {
    background: #334155;
  }
  
  .step-btn.pos {
    background: rgba(16, 185, 129, 0.1);
  }
  
  .step-btn.pos:hover {
    background: rgba(16, 185, 129, 0.2);
  }
  
  .params-preview {
    background: #1e293b;
  }
  
  .params-preview code {
    background: #334155;
    border-color: #475569;
  }
}

/* ============ 📱 响应式优化 ============ */
@media (max-width: 480px) {
  .param-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
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
/* 卡片悬停光效 */
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
  /* -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); */
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.param-card:hover::after {
  opacity: 1;
}

/* 按钮焦点状态 */
.btn:focus-visible,
.step-btn:focus-visible,
.step-select:focus-visible,
.icon-btn:focus-visible {
  outline: 2px solid var(--color-primary-light);
  outline-offset: 2px;
}

/* 平滑过渡 */
.time-display,
.index-display,
.param-card {
  transition: all var(--transition-normal);
}
</style>