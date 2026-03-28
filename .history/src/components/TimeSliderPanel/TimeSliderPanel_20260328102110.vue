<!-- src/components/TimeSliderPanel/TimeSliderPanel.vue -->
<template>
  <section class="time-slider-panel" role="region" aria-label="轨迹查询面板">
    
    <!-- 模块1：时间/索引参数设置（保持原有） -->
    <div id="panel-content" class="panel-content" role="group">
      <!-- ... 原有时间/索引网格代码 ... -->
      
      <!-- 🔗 联动指示（移除复选框） -->
      <div class="mode-switch">
        <span class="sync-indicator">
          <span aria-hidden="true">🔗</span>时间↔索引自动联动
        </span>
        <span class="range-hint">全局索引: [{{ globalMinIdx }} ~ {{ globalMaxIdx }}]</span>
      </div>
      
      <!-- ... 原有四参数网格 ... -->
      
      <!-- 📊 范围摘要（保持原有） -->
      
      <!-- ✨ 模块2：轨迹播放控制 -->
      <fieldset class="param-card player-card">
        <legend class="param-label">
          <span aria-hidden="true">▶️</span> 轨迹播放
        </legend>
        
        <!-- 播放控制条 -->
        <div class="player-controls">
          <button class="player-btn" @click="player.toggle" :disabled="!canPlay">
            <span aria-hidden="true">{{ isPlaying ? '⏸️' : '▶️' }}</span>
            {{ isPlaying ? '暂停' : '播放' }}
          </button>
          
          <button class="player-btn" @click="player.stop" :disabled="!canPlay">
            <span aria-hidden="true">⏹️</span> 停止
          </button>
          
          <!-- 倍速选择 -->
          <select v-model="playbackSpeed" @change="player.setSpeed(Number($event.target.value))" 
                  class="speed-select" :disabled="!canPlay">
            <option v-for="s in [0.5, 1, 2, 4, 8]" :key="s" :value="s">
              {{ s }}x
            </option>
          </select>
        </div>
        
        <!-- 播放模式 -->
        <div class="player-mode">
          <label>
            <input type="radio" value="point-by-point" v-model="playMode" 
                   @change="player.setPlayMode('point-by-point')" :disabled="!canPlay"/>
            <small>逐点出现</small>
          </label>
          <label>
            <input type="radio" value="line-first" v-model="playMode" 
                   @change="player.setPlayMode('line-first')" :disabled="!canPlay"/>
            <small>船舶沿线移动</small>
          </label>
        </div>
        
        <!-- 进度条 -->
        <div class="player-progress">
          <span class="progress-label">进度: {{ progress }}%</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="point-index">
            点 {{ currentPointIndex + 1 }} / {{ trajectoryPoints?.length || 0 }}
          </span>
        </div>
      </fieldset>

      <!-- ✨ 模块3：停留标记 -->
      <fieldset class="param-card marker-card">
        <legend class="param-label">
          <span aria-hidden="true">📍</span> 停留标记
        </legend>
        
        <!-- 标记状态提示 -->
        <div v-if="isMarking" class="marker-hint" :class="markerMode">
          <span aria-hidden="true">
            {{ markerMode === 'selecting-start' ? '👆' : '👇' }}
          </span>
          {{ markerMode === 'selecting-start' ? '请点击轨迹起点' : '请点击轨迹终点' }}
          <button class="hint-cancel" @click="marker.cancelMarker">取消</button>
        </div>
        
        <!-- 标记操作按钮 -->
        <div class="marker-actions" v-if="!isMarking">
          <button class="btn-marker" @click="startMarkerAtCurrent" 
                  :disabled="!currentPoint || !hasData">
            <span aria-hidden="true">🏁</span> 标记停留 (从当前点)
          </button>
        </div>
        
        <!-- 标记表单（选中终点后显示） -->
        <div v-if="markerMode === 'editing'" class="marker-form">
          <!-- 停留类型 -->
          <div class="form-row">
            <label>停留类型:</label>
            <div class="type-options">
              <button 
                v-for="t in STAY_TYPES" 
                :key="t.value"
                class="type-btn" 
                :class="{ active: markerForm.type === t.value }"
                @click="marker.setMarkerType(t.value)"
                :style="{ borderColor: t.color }"
              >
                <span aria-hidden="true">{{ t.label.split(' ')[0] }}</span>
                {{ t.label.split(' ').slice(1).join(' ') }}
              </button>
            </div>
          </div>
          
          <!-- 停留港口 -->
          <div class="form-row">
            <label>所在港口:</label>
            <select v-model="markerForm.port" @change="marker.setMarkerPort($event.target.value)"
                    class="port-select">
              <option value="">请选择...</option>
              <option v-for="p in DEFAULT_PORTS" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          
          <!-- 备注（可选） -->
          <div class="form-row">
            <label>备注:</label>
            <input type="text" v-model="markerForm.note" placeholder="可选说明" 
                   class="note-input" maxlength="50"/>
          </div>
          
          <!-- 时间范围预览 -->
          <div class="form-row time-preview">
            <small>
              🕐 {{ formatMarkerTime(currentMarker?.startTs) }} 
              → {{ formatMarkerTime(currentMarker?.endTs) }}
              ({{ getStayDuration(currentMarker?.startTs, currentMarker?.endTs) }})
            </small>
          </div>
          
          <!-- 操作按钮 -->
          <div class="form-actions">
            <button class="btn primary" @click="marker.saveMarker" 
                    :disabled="!marker.canSaveMarker.value">
              ✅ 保存标记
            </button>
            <button class="btn" @click="marker.cancelMarker">❌ 取消</button>
          </div>
        </div>
        
        <!-- 已保存标记列表（可展开） -->
        <details class="marker-list" v-if="markers.length > 0">
          <summary>
            📋 已标记停留 ({{ markers.length }})
          </summary>
          <div class="marker-items">
            <div v-for="m in markers.slice().reverse()" :key="m.id" class="marker-item">
              <div class="marker-header">
                <span class="marker-type" :style="{ color: getStayType(m.stay_type)?.color }">
                  {{ getStayType(m.stay_type)?.label }}
                </span>
                <span class="marker-port">{{ m.port }}</span>
                <button class="marker-delete" @click="marker.deleteMarker(m.id)" 
                        aria-label="删除标记">🗑️</button>
              </div>
              <div class="marker-time">
                {{ formatMarkerTime(m.start_time) }} ~ {{ formatMarkerTime(m.end_time) }}
                ({{ getStayDuration(m.start_time, m.end_time) }})
              </div>
            </div>
          </div>
        </details>
      </fieldset>

      <!-- 🔘 原有操作按钮组（保持） -->
      <div class="panel-actions">
        <button class="btn primary" @click="emitQuery" :disabled="loading">
          {{ loading ? '🔄 查询中...' : '🚀 刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault">🔄 重置</button>
        <button class="btn" @click="expandFull">📐 全量</button>
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
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
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