<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<template>
  <main class="track-flow-container" role="main" aria-label="船舶轨迹查询系统">
    
    <!-- 📋 左侧控制面板 -->
    <aside class="side-panel" role="complementary" aria-label="查询控制面板">
      
      <!-- 时间/索引滑块组件 -->
      <TimeSlider 
        :mmsi="currentMmsi"
        :globalMinTs="globalRange.time.min"
        :globalMaxTs="globalRange.time.max"
        :globalMinIdx="globalRange.index.min"
        :globalMaxIdx="globalRange.index.max"
        :currentStartTs="queryRange.time.start"
        :currentEndTs="queryRange.time.end"
        :currentStartIdx="queryRange.index.start"
        :currentEndIdx="queryRange.index.end"
        :loading="loading"
        @query="onQuery"
        @params-change="onParamsChange"
      />
      
      <!-- 🛠️ 扩展操作按钮 -->
      <nav class="panel-extensions" role="navigation" aria-label="地图操作">
        <button class="ext-btn" @click="exportTrajectory" :disabled="!hasData || loading">
          <span aria-hidden="true">📥</span><span>导出 CSV</span>
        </button>
        <button class="ext-btn" @click="clearMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🗑️</span><span>清空地图</span>
        </button>
        <button class="ext-btn" @click="centerMap" :disabled="!hasData || loading">
          <span aria-hidden="true">🎯</span><span>居中显示</span>
        </button>
        <button class="ext-btn primary" @click="refreshQuery" :disabled="loading">
          <span aria-hidden="true">🔄</span><span>重新查询</span>
        </button>
      </nav>
      
    </aside>

    <!-- 🗺️ 右侧地图展示区域 -->
    <section class="map-wrapper" role="region" aria-label="轨迹地图展示">
      
      <!-- 地图容器（动态 ID 确保 MMSI 变化时重建） -->
      <div 
        :id="'mapContainer-' + currentMmsi" 
        class="map-container" 
        ref="mapContainerRef"
        role="application"
        aria-label="船舶轨迹地图"
      ></div>

      <!-- ⏳ 加载状态遮罩 -->
      <div v-show="loading" class="loading-mask" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>🔄 加载轨迹数据...</span>
      </div>
      <div v-show="error" class="error-toast" @click="error = null" role="alert">
        <span aria-hidden="true">⚠️</span><span>{{ error }}</span>
      </div>
      <div v-show="hasData && !loading" class="data-info" role="status">
        <span><span aria-hidden="true">📊</span><b>{{ currentPointsCount }}</b> 个轨迹点</span>
      </div>
      <div class="mmsi-tag" role="note">
        <span aria-hidden="true">🚢</span>MMSI: <strong>{{ currentMmsi }}</strong>
      </div>
      
    </section>
    
  </main>
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