<template>
  <div class="query-panel-wrapper">
    <div class="query-panel">
      
      <!-- 面板头部：标题 + 关闭/折叠 -->
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

      <!-- 折叠时只显示摘要 -->
      <div v-if="collapsed" class="panel-summary">
        <small>
          📊 {{ endIndex - startIndex + 1 }}点 | 
          🕐 {{ formatTimestamp(startTimestamp) }} ~ {{ formatTimestamp(endTimestamp) }}
        </small>
      </div>

      <!-- 展开时显示完整参数 -->
      <template v-if="!collapsed">
        
        <!-- 模式切换 -->
        <div class="mode-switch">
          <label class="sync-toggle">
            <input type="checkbox" v-model="syncEnabled" />
            <span>🔗 时间↔索引联动</span>
          </label>
          <span class="range-hint">
            全局: [{{ globalMinIdx }}~{{ globalMaxIdx }}]
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
                <option v-for="s in timeSteps" :key="s" :value="s">{{ s }}分钟</option>
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
                <option v-for="s in timeSteps" :key="s" :value="s">{{ s }}分钟</option>
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
                <option v-for="s in indexSteps" :key="s" :value="s">{{ s }}</option>
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
                <option v-for="s in indexSteps" :key="s" :value="s">{{ s }}</option>
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
          <span>📊 区间: <b>{{ endIndex - startIndex + 1 }}</b> 点</span>
          <span>🕐 时长: <b>{{ formatDuration(endTimestamp - startTimestamp) }}</b></span>
        </div>

        <!-- 操作按钮 -->
        <div class="panel-actions">
          <button class="btn primary" @click="emitQuery" :disabled="loading">
            {{ loading ? '🔄 查询中...' : '🚀 刷新轨迹' }}
          </button>
          <button class="btn" @click="resetToDefault">🔄 重置</button>
          <button class="btn" @click="expandFull">📐 全量</button>
        </div>

        <!-- 参数预览（调试用） -->
        <div class="params-preview" v-if="previewText">
          <small>参数: <code>{{ previewText }}</code></small>
        </div>

      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mmsi: { type: String, required: true },
  // 全局范围
  globalMinTs: { type: Number, default: null },
  globalMaxTs: { type: Number, default: null },
  globalMinIdx: { type: Number, default: 0 },
  globalMaxIdx: { type: Number, default: 10000 },
  // 当前选中范围
  currentStartTs: { type: Number, default: null },
  currentEndTs: { type: Number, default: null },
  currentStartIdx: { type: Number, default: 0 },
  currentEndIdx: { type: Number, default: 1000 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['query', 'params-change'])

// 步进配置
const timeSteps = [1, 5, 10, 30, 60, 120, 360, 720]  // 1分钟 ~ 12小时
const indexSteps = [1, 2, 5, 10, 50, 100, 500, 1000, 5000]
const timeStep = ref(10)   // 默认时间步长 10分钟
const indexStep = ref(10)  // 默认索引步长 10

// 内部状态
const startTimestamp = ref(props.currentStartTs)
const endTimestamp = ref(props.currentEndTs)
const startIndex = ref(props.currentStartIdx)
const endIndex = ref(props.currentEndIdx)

// 控制状态
const syncEnabled = ref(true)  // 默认开启联动
const collapsed = ref(false)   // 默认展开

// 计算属性
const previewText = computed(() => {
  const t = startTimestamp.value && endTimestamp.value 
    ? `time:[${startTimestamp.value},${endTimestamp.value}]` 
    : 'time:[-,-]'
  const i = `idx:[${startIndex.value},${endIndex.value}]`
  return `${t} | ${i}`
})

// ==================== 格式化函数 ====================

// 时间戳 → 完整本地时间字符串
const formatTimestamp = (ts) => {
  if (!ts && ts !== 0) return '--:--:--'
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-')
}

// 时间戳 → 日期部分（用于副标题）
const formatLocalDate = (ts) => {
  if (!ts && ts !== 0) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\//g, '-')
}

// 时间戳 → 仅时间部分
const formatTimeOnly = (ts) => {
  if (!ts && ts !== 0) return '--:--'
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 秒数 → 可读时长
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '-'
  if (seconds < 0) seconds = -seconds
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds/60)}m`
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h${Math.floor((seconds%3600)/60)}m`
  return `${Math.floor(seconds/86400)}d${Math.floor((seconds%86400)/3600)}h`
}

// ==================== 校验与边界处理 ====================

const clamp = (val, min, max) => {
  if (min === null || max === null) return val
  return Math.max(min, Math.min(max, val))
}

// 校验时间范围
const validateTimeRange = (which) => {
  // 全局边界
  if (props.globalMinTs !== null) startTimestamp.value = Math.max(props.globalMinTs, startTimestamp.value)
  if (props.globalMaxTs !== null) endTimestamp.value = Math.min(props.globalMaxTs, endTimestamp.value)
  
  // 起止顺序：至少间隔 1 秒
  if (startTimestamp.value >= endTimestamp.value) {
    if (which === 'start') {
      endTimestamp.value = Math.min(
        props.globalMaxTs !== null ? props.globalMaxTs : Infinity,
        startTimestamp.value + 1
      )
    } else {
      startTimestamp.value = Math.max(
        props.globalMinTs !== null ? props.globalMinTs : -Infinity,
        endTimestamp.value - 1
      )
    }
  }
  
  if (syncEnabled.value) syncIndexFromTime()
}

// 校验索引范围
const validateIndexRange = (which) => {
  startIndex.value = clamp(startIndex.value, props.globalMinIdx, props.globalMaxIdx)
  endIndex.value = clamp(endIndex.value, props.globalMinIdx, props.globalMaxIdx)
  
  if (startIndex.value >= endIndex.value) {
    if (which === 'start') {
      endIndex.value = Math.min(props.globalMaxIdx, startIndex.value + 1)
    } else {
      startIndex.value = Math.max(props.globalMinIdx, endIndex.value - 1)
    }
  }
  
  if (syncEnabled.value) syncTimeFromIndex()
}

// ==================== 调整函数 ====================

// 调整时间（分钟）
const adjustTime = (which, minutes) => {
  const delta = minutes * 60  // 转为秒
  
  if (which === 'start') {
    const newStart = startTimestamp.value + delta
    const limit = endTimestamp.value - 1
    startTimestamp.value = props.globalMinTs !== null 
      ? Math.max(props.globalMinTs, Math.min(newStart, limit))
      : Math.min(newStart, limit)
  } else {
    const newEnd = endTimestamp.value + delta
    const limit = startTimestamp.value + 1
    endTimestamp.value = props.globalMaxTs !== null
      ? Math.min(props.globalMaxTs, Math.max(newEnd, limit))
      : Math.max(newEnd, limit)
  }
  
  validateTimeRange(which)
}

// 调整索引
const adjustIndex = (which, step) => {
  if (which === 'start') {
    startIndex.value = clamp(
      startIndex.value + step,
      props.globalMinIdx,
      endIndex.value - 1
    )
  } else {
    endIndex.value = clamp(
      endIndex.value + step,
      startIndex.value + 1,
      props.globalMaxIdx
    )
  }
  
  validateIndexRange(which)
}

// ==================== 精准联动 ====================

// 时间 → 索引（按比例估算，数据均匀分布假设）
const syncIndexFromTime = () => {
  if (props.globalMinTs === null || props.globalMaxTs === null) return
  if (props.globalMaxTs <= props.globalMinTs) return
  
  const timeSpan = props.globalMaxTs - props.globalMinTs
  const idxSpan = props.globalMaxIdx - props.globalMinIdx
  
  const ratioStart = (startTimestamp.value - props.globalMinTs) / timeSpan
  const ratioEnd = (endTimestamp.value - props.globalMinTs) / timeSpan
  
  startIndex.value = Math.floor(props.globalMinIdx + ratioStart * idxSpan)
  endIndex.value = Math.floor(props.globalMinIdx + ratioEnd * idxSpan)
  
  validateIndexRange('start')
}

// 索引 → 时间（按比例估算）
const syncTimeFromIndex = () => {
  if (props.globalMinIdx === props.globalMaxIdx) return
  if (props.globalMinTs === null || props.globalMaxTs === null) return
  
  const timeSpan = props.globalMaxTs - props.globalMinTs
  const idxSpan = props.globalMaxIdx - props.globalMinIdx
  
  const ratioStart = (startIndex.value - props.globalMinIdx) / idxSpan
  const ratioEnd = (endIndex.value - props.globalMinIdx) / idxSpan
  
  startTimestamp.value = Math.floor(props.globalMinTs + ratioStart * timeSpan)
  endTimestamp.value = Math.floor(props.globalMinTs + ratioEnd * timeSpan)
  
  validateTimeRange('start')
}

// ==================== 查询与操作 ====================

// 发送查询
const emitQuery = () => {
  const params = {
    mmsi: props.mmsi,
    time: { start: startTimestamp.value, end: endTimestamp.value },
    index: { start: startIndex.value, end: endIndex.value }
  }
  emit('query', params)
  emit('params-change', params)
}

// 重置为默认值
const resetToDefault = () => {
  startTimestamp.value = props.currentStartTs
  endTimestamp.value = props.currentEndTs
  startIndex.value = props.currentStartIdx
  endIndex.value = props.currentEndIdx
  emitQuery()
}

// 扩展到全量范围
const expandFull = () => {
  if (props.globalMinTs !== null && props.globalMaxTs !== null) {
    startTimestamp.value = props.globalMinTs
    endTimestamp.value = props.globalMaxTs
  }
  startIndex.value = props.globalMinIdx
  endIndex.value = props.globalMaxIdx
  emitQuery()
}

// 折叠/展开切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// ==================== 监听与初始化 ====================

// 监听 props 更新（父组件传入最新查询结果）
watch(() => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx], () => {
  startTimestamp.value = props.currentStartTs
  endTimestamp.value = props.currentEndTs
  startIndex.value = props.currentStartIdx
  endIndex.value = props.currentEndIdx
})

// 监听全局范围变化，校验当前值
watch(() => [props.globalMinTs, props.globalMaxTs, props.globalMinIdx, props.globalMaxIdx], () => {
  validateTimeRange('start')
  validateIndexRange('start')
})

// 初始化发射一次查询（仅当有默认值时）
if (props.currentStartIdx !== undefined || props.currentStartTs !== null) {
  emitQuery()
}

// 导出方法（可选）
defineExpose({
  refresh: emitQuery,
  collapse: () => { collapsed.value = true },
  expand: () => { collapsed.value = false }
})
</script>

<style scoped>
/* ========== 外层容器：左侧悬浮 ========== */
.query-panel-wrapper {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  pointer-events: none;  /* 让鼠标事件穿透到地图 */
}

.query-panel {
  pointer-events: auto;  /* 面板本身可交互 */
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #dee2e6;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 340px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-title {
  font-weight: 600;
  font-size: 1rem;
}

.mmsi-badge {
  background: rgba(255,255,255,0.2);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.header-right .icon-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.header-right .icon-btn:hover {
  background: rgba(255,255,255,0.35);
}

/* 折叠摘要 */
.panel-summary {
  padding: 0.6rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  cursor: pointer;
}

.panel-summary:hover {
  background: #e9ecef;
}

/* 模式切换栏 */
.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.85rem;
}

.sync-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  color: #495057;
}

.sync-toggle input {
  cursor: pointer;
  accent-color: #007bff;
}

.range-hint {
  color: #6c757d;
  font-family: monospace;
}

/* 四参数网格 */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  padding: 0.8rem 1rem;
}

.param-card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.7rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  transition: border-color 0.15s;
}

.param-card:hover {
  border-color: #007bff;
}

.param-label {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

/* 时间显示 */
.time-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 0.95rem;
  color: #0066cc;
  font-weight: 500;
  margin-bottom: 0.2rem;
}

.time-sub {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

/* 索引显示 */
.index-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.1rem;
  font-weight: 600;
  color: #28a745;
  margin-bottom: 0.2rem;
}

.index-sub {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

/* 步进控制组 */
.step-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.step-label {
  font-size: 0.8rem;
  color: #6c757d;
}

.step-select {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.85rem;
  background: #fff;
  cursor: pointer;
  min-width: 70px;
}

.step-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.15);
}

/* 步进按钮 */
.step-buttons {
  display: flex;
  gap: 0.4rem;
}

.step-btn {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 1px solid #adb5bd;
  background: #fff;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;
  text-align: center;
}

.step-btn:hover {
  background: #e9ecef;
  border-color: #868e96;
  transform: translateY(-1px);
}

.step-btn:active {
  transform: translateY(0);
}

.step-btn.pos {
  border-color: #28a745;
  color: #28a745;
}

.step-btn.pos:hover {
  background: #d4edda;
  border-color: #218838;
}

/* 范围摘要 */
.range-summary {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.85rem;
  color: #495057;
}

.range-summary b {
  color: #007bff;
}

/* 操作按钮 */
.panel-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  background: #fff;
  border-top: 1px solid #e9ecef;
}

.btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
}

.btn:hover:not(:disabled) {
  background: #e9ecef;
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn.primary {
  background: #007bff;
  color: #fff;
  border-color: #007bff;
}

.btn.primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 参数预览 */
.params-preview {
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 0.8rem;
  color: #6c757d;
}

.params-preview code {
  background: #e9ecef;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'SF Mono', 'Consolas', monospace;
  color: #0066cc;
  margin-left: 0.3rem;
}

/* 滚动优化 */
.query-panel {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #adb5bd #f8f9fa;
}

.query-panel::-webkit-scrollbar {
  width: 6px;
}

.query-panel::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 3px;
}

.query-panel::-webkit-scrollbar-thumb {
  background: #adb5bd;
  border-radius: 3px;
}

.query-panel::-webkit-scrollbar-thumb:hover {
  background: #868e96;
}

/* 响应式：小屏适配 */
@media (max-width: 768px) {
  .query-panel-wrapper {
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
  }
  
  .query-panel {
    width: auto;
    max-height: 80vh;
  }
  
  .param-grid {
    grid-template-columns: 1fr;  /* 小屏单列 */
  }
}

/* 暗色地图适配：面板半透明背景 */
:deep(.leaflet-container) + .query-panel-wrapper .query-panel {
  background: rgba(255, 255, 255, 0.95);
}
</style>