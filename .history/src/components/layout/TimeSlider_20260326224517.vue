<template>
  <footer class="query-panel">
    <div class="panel-container">
      
      <!-- 头部：模式 + 范围摘要 -->
      <div class="panel-header">
        <div>
          <span class="panel-title">🔍 轨迹查询</span>
          <span class="mmsi-badge" v-if="mmsi">MMSI: {{ mmsi }}</span>
        </div>
        <div class="range-summary">
          <small>
            📊 {{ endIndex - startIndex + 1 }} 点 | 
            🕐 {{ formatDuration(endTimestamp - startTimestamp) }}
          </small>
        </div>
      </div>

      <!-- 四参数网格 -->
      <div class="param-grid">
        
        <!-- 🕐 开始时间 -->
        <div class="param-card time-card">
          <div class="param-label">🕐 开始时间</div>
          <input type="datetime-local" v-model="startTimeLocal" @change="onTimeChange('start')" class="time-input" />
          <div class="param-meta">
            <span class="idx-tag">Idx: {{ startIndex }}</span>
            <span class="ts-tag">{{ startTimestamp }}</span>
          </div>
          <div class="step-group">
            <span class="step-label">±分钟:</span>
            <button v-for="s in timeSteps" :key="s" class="step-btn" @click="adjustTime('start', -s)">-{{s}}</button>
            <button v-for="s in timeSteps" :key="s" class="step-btn pos" @click="adjustTime('start', s)">+{{s}}</button>
          </div>
        </div>

        <!-- 🕑 结束时间 -->
        <div class="param-card time-card">
          <div class="param-label">🕑 结束时间</div>
          <input type="datetime-local" v-model="endTimeLocal" @change="onTimeChange('end')" class="time-input" />
          <div class="param-meta">
            <span class="idx-tag">Idx: {{ endIndex }}</span>
            <span class="ts-tag">{{ endTimestamp }}</span>
          </div>
          <div class="step-group">
            <span class="step-label">±分钟:</span>
            <button v-for="s in timeSteps" :key="s" class="step-btn" @click="adjustTime('end', -s)">-{{s}}</button>
            <button v-for="s in timeSteps" :key="s" class="step-btn pos" @click="adjustTime('end', s)">+{{s}}</button>
          </div>
        </div>

        <!-- 📍 开始索引 -->
        <div class="param-card index-card">
          <div class="param-label">📍 开始索引</div>
          <input type="number" v-model.number="startIndex" @change="onIndexChange('start')" :min="0" :max="maxIndex" class="index-input" />
          <div class="param-meta">
            <span class="time-tag">🕐 {{ formatTimestamp(startTimestamp) }}</span>
          </div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="indexStep" class="step-select">
              <option v-for="s in indexSteps" :key="s" :value="s">{{ s }}</option>
            </select>
            <button class="step-btn" @click="adjustIndex('start', -indexStep)">-{{indexStep}}</button>
            <button class="step-btn pos" @click="adjustIndex('start', indexStep)">+{{indexStep}}</button>
          </div>
        </div>

        <!-- 🏁 结束索引 -->
        <div class="param-card index-card">
          <div class="param-label">🏁 结束索引</div>
          <input type="number" v-model.number="endIndex" @change="onIndexChange('end')" :min="0" :max="maxIndex" class="index-input" />
          <div class="param-meta">
            <span class="time-tag">🕐 {{ formatTimestamp(endTimestamp) }}</span>
          </div>
          <div class="step-group">
            <span class="step-label">步长:</span>
            <select v-model="indexStep" class="step-select">
              <option v-for="s in indexSteps" :key="s" :value="s">{{ s }}</option>
            </select>
            <button class="step-btn" @click="adjustIndex('end', -indexStep)">-{{indexStep}}</button>
            <button class="step-btn pos" @click="adjustIndex('end', indexStep)">+{{indexStep}}</button>
          </div>
        </div>

      </div>

      <!-- 操作栏 -->
      <div class="panel-actions">
        <button class="btn primary" @click="emitQuery" :disabled="loading">
          {{ loading ? '🔄 查询中...' : '🚀 刷新轨迹' }}
        </button>
        <button class="btn" @click="resetToDefault">🔄 重置</button>
        <button class="btn" @click="expandFull">📐 全量</button>
        
        <!-- 联动开关 -->
        <label class="sync-toggle">
          <input type="checkbox" v-model="syncEnabled" />
          <span>🔗 时间↔索引联动</span>
        </label>
        
        <!-- 查询参数预览 -->
        <span class="query-preview" v-if="previewText">
          <code>{{ previewText }}</code>
        </span>
      </div>

    </div>
  </footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mmsi: { type: String, required: true },
  // 全局范围（从接口获取或默认）
  globalMinTs: { type: Number, default: 1672531200 },
  globalMaxTs: { type: Number, default: 1704067199 },
  globalMinIdx: { type: Number, default: 0 },
  globalMaxIdx: { type: Number, default: 10000 },
  // 当前选中范围
  currentStartTs: { type: Number, default: 1672531200 },
  currentEndTs: { type: Number, default: 1672617599 },
  currentStartIdx: { type: Number, default: 0 },
  currentEndIdx: { type: Number, default: 999 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['query', 'params-change'])

// 步进配置
const timeSteps = [1, 5, 10, 30, 60, 120, 360]  // 分钟
const indexSteps = [1, 2, 5, 10, 50, 100, 500, 1000]
const indexStep = ref(10)

// 内部状态
const startTimestamp = ref(props.currentStartTs)
const endTimestamp = ref(props.currentEndTs)
const startIndex = ref(props.currentStartIdx)
const endIndex = ref(props.currentEndIdx)
const syncEnabled = ref(true)  // 默认开启联动

// 计算属性
const maxIndex = computed(() => props.globalMaxIdx)
const startTimeLocal = computed({
  get: () => tsToLocalStr(startTimestamp.value),
  set: (v) => { startTimestamp.value = localStrToTs(v); validateTimeRange('start') }
})
const endTimeLocal = computed({
  get: () => tsToLocalStr(endTimestamp.value),
  set: (v) => { endTimestamp.value = localStrToTs(v); validateTimeRange('end') }
})

const previewText = computed(() => {
  return `time:[${startTimestamp.value},${endTimestamp.value}] | idx:[${startIndex.value},${endIndex.value}]`
})

// 工具函数
const tsToLocalStr = (ts) => {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const localStrToTs = (str) => {
  if (!str) return props.globalMinTs
  return Math.floor(new Date(str).getTime() / 1000)
}
const formatTimestamp = (ts) => {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN', { 
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
  })
}
const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds/60)}m`
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h`
  return `${Math.floor(seconds/86400)}d`
}

// 校验时间范围
const validateTimeRange = (which) => {
  // 边界限制
  startTimestamp.value = clamp(startTimestamp.value, props.globalMinTs, props.globalMaxTs)
  endTimestamp.value = clamp(endTimestamp.value, props.globalMinTs, props.globalMaxTs)
  
  // 起止顺序
  if (startTimestamp.value >= endTimestamp.value) {
    if (which === 'start') {
      endTimestamp.value = Math.min(props.globalMaxTs, startTimestamp.value + 60)
    } else {
      startTimestamp.value = Math.max(props.globalMinTs, endTimestamp.value - 60)
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

const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

// 时间输入变更
const onTimeChange = (which) => {
  validateTimeRange(which)
  // 可选：实时查询或手动点击
}

// 索引输入变更
const onIndexChange = (which) => {
  validateIndexRange(which)
}

// 调整时间（分钟）
const adjustTime = (which, minutes) => {
  const delta = minutes * 60
  if (which === 'start') {
    startTimestamp.value = clamp(
      startTimestamp.value + delta,
      props.globalMinTs,
      endTimestamp.value - 60
    )
  } else {
    endTimestamp.value = clamp(
      endTimestamp.value + delta,
      startTimestamp.value + 60,
      props.globalMaxTs
    )
  }
  if (syncEnabled.value) syncIndexFromTime()
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
  if (syncEnabled.value) syncTimeFromIndex()
}

// 🔗 精准联动：时间 → 索引（依赖后端返回的 startIdx/endIdx 映射）
const syncIndexFromTime = () => {
  // 实际场景：父组件传入 timeToIdxMap 或使用最新查询结果中的映射
  // 简化版：按全局比例估算（数据均匀分布假设）
  const ratio = (startTimestamp.value - props.globalMinTs) / (props.globalMaxTs - props.globalMinTs)
  startIndex.value = Math.floor(props.globalMinIdx + ratio * (props.globalMaxIdx - props.globalMinIdx))
  
  const ratioEnd = (endTimestamp.value - props.globalMinTs) / (props.globalMaxTs - props.globalMinTs)
  endIndex.value = Math.floor(props.globalMinIdx + ratioEnd * (props.globalMaxIdx - props.globalMinIdx))
}

// 🔗 精准联动：索引 → 时间（依赖后端返回的 startTime/endTime 映射）
const syncTimeFromIndex = () => {
  const ratio = (startIndex.value - props.globalMinIdx) / (props.globalMaxIdx - props.globalMinIdx)
  startTimestamp.value = Math.floor(props.globalMinTs + ratio * (props.globalMaxTs - props.globalMinTs))
  
  const ratioEnd = (endIndex.value - props.globalMinIdx) / (props.globalMaxIdx - props.globalMinIdx)
  endTimestamp.value = Math.floor(props.globalMinTs + ratioEnd * (props.globalMaxTs - props.globalMinTs))
}

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

const resetToDefault = () => {
  startTimestamp.value = props.currentStartTs
  endTimestamp.value = props.currentEndTs
  startIndex.value = props.currentStartIdx
  endIndex.value = props.currentEndIdx
  emitQuery()
}

const expandFull = () => {
  startTimestamp.value = props.globalMinTs
  endTimestamp.value = props.globalMaxTs
  startIndex.value = props.globalMinIdx
  endIndex.value = props.globalMaxIdx
  emitQuery()
}

// 监听 props 更新（父组件传入最新查询结果的范围）
watch(() => [props.currentStartTs, props.currentEndTs, props.currentStartIdx, props.currentEndIdx], () => {
  startTimestamp.value = props.currentStartTs
  endTimestamp.value = props.currentEndTs
  startIndex.value = props.currentStartIdx
  endIndex.value = props.currentEndIdx
})

// 初始化
emitQuery()
</script>

<style scoped>
.query-panel {
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 0.8rem 1rem;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.9rem;
}
.panel-container { max-width: 1200px; margin: 0 auto; }

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.8rem; padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}
.panel-title { font-weight: 600; color: #333; margin-right: 0.5rem; }
.mmsi-badge {
  background: #e7f1ff; color: #0066cc; padding: 0.2rem 0.5rem;
  border-radius: 12px; font-size: 0.8rem; font-weight: 500;
}
.range-summary small { color: #6c757d; }

.param-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem;
  margin-bottom: 0.8rem;
}
.param-card {
  background: #fff; border: 1px solid #dee2e6; border-radius: 6px;
  padding: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.param-label {
  font-weight: 600; color: #495057; margin-bottom: 0.5rem; font-size: 0.9rem;
}
.time-input, .index-input {
  width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #ced4da;
  border-radius: 4px; font-size: 0.9rem; box-sizing: border-box;
  margin-bottom: 0.3rem;
}
.time-input:focus, .index-input:focus {
  outline: none; border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.15);
}
.param-meta {
  display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem;
}
.idx-tag { background: #e9ecef; padding: 0.1rem 0.4rem; border-radius: 3px; color: #495057; }
.ts-tag { background: #fff3cd; padding: 0.1rem 0.4rem; border-radius: 3px; color: #856404; font-family: monospace; }
.time-tag { background: #d4edda; padding: 0.1rem 0.4rem; border-radius: 3px; color: #155724; }

.step-group {
  display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center;
}
.step-label { font-size: 0.8rem; color: #6c757d; margin-right: 0.2rem; }
.step-btn {
  padding: 0.2rem 0.5rem; border: 1px solid #adb5bd; background: #fff;
  border-radius: 3px; cursor: pointer; font-size: 0.8rem;
  transition: all 0.1s; min-width: 2rem; text-align: center;
}
.step-btn:hover { background: #e9ecef; border-color: #868e96; }
.step-btn.pos { border-color: #28a745; color: #28a745; }
.step-btn.pos:hover { background: #d4edda; }
.step-select {
  padding: 0.2rem 0.4rem; border: 1px solid #ced4da; border-radius: 3px;
  font-size: 0.8rem; background: #fff; cursor: pointer;
}

.panel-actions {
  display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;
}
.btn {
  padding: 0.4rem 1rem; border: 1px solid #ced4da; background: #fff;
  border-radius: 4px; cursor: pointer; font-size: 0.9rem;
  transition: all 0.15s;
}
.btn:hover:not(:disabled) { background: #e9ecef; }
.btn.primary { background: #007bff; color: #fff; border-color: #007bff; }
.btn.primary:hover:not(:disabled) { background: #0056b3; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.sync-toggle {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.85rem; color: #495057; cursor: pointer;
  margin-left: auto;
}
.sync-toggle input { cursor: pointer; }

.query-preview {
  font-size: 0.8rem; color: #6c757d;
}
.query-preview code {
  background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 3px;
  font-family: monospace; margin-left: 0.3rem; color: #0066cc;
}

/* 响应式 */
@media (max-width: 1024px) {
  .param-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .param-grid { grid-template-columns: 1fr; }
  .panel-actions { flex-direction: column; align-items: stretch; }
  .sync-toggle, .query-preview { margin-left: 0; text-align: center; }
}
</style>