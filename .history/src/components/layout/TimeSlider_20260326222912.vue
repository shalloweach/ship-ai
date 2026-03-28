<template>
  <footer class="time-slider">
    <div class="slider-container">
      
      <!-- 模式切换 -->
      <div class="mode-switch">
        <label>
          <input type="radio" v-model="queryMode" value="time" @change="onModeChange" />
          按时间查询
        </label>
        <label>
          <input type="radio" v-model="queryMode" value="index" @change="onModeChange" />
          按索引查询
        </label>
      </div>

      <!-- 时间范围滑块 -->
      <div v-show="queryMode === 'time'" class="slider-section">
        <div class="slider-label">
          🕐 时间范围: {{ formatTimestamp(currentStartTs) }} - {{ formatTimestamp(currentEndTs) }}
        </div>
        <div class="slider-track">
          <input type="range" class="slider slider-start" :min="minTimestamp" :max="maxTimestamp" 
                 v-model.number="startTimestamp" @input="onTimeChange" />
          <input type="range" class="slider slider-end" :min="minTimestamp" :max="maxTimestamp" 
                 v-model.number="endTimestamp" @input="onTimeChange" />
          <div class="slider-range" :style="timeRangeStyle"></div>
        </div>
        <div class="timestamp-hints">
          <span>{{ formatTimestamp(minTimestamp) }}</span>
          <span>{{ formatTimestamp(maxTimestamp) }}</span>
        </div>
      </div>

      <!-- 索引范围滑块 -->
      <div v-show="queryMode === 'index'" class="slider-section">
        <div class="slider-label">
          📊 索引范围: {{ startIndex }} - {{ endIndex }} 
          <span class="hint">(总记录: {{ totalRecords }})</span>
        </div>
        <div class="slider-track">
          <input type="range" class="slider slider-start" :min="0" :max="totalRecords - 1" 
                 v-model.number="startIndex" @input="onIndexChange" />
          <input type="range" class="slider slider-end" :min="0" :max="totalRecords - 1" 
                 v-model.number="endIndex" @input="onIndexChange" />
          <div class="slider-range" :style="indexRangeStyle"></div>
        </div>
        <div class="index-hints">
          <span>0</span>
          <span>{{ totalRecords }}</span>
        </div>
      </div>

      <!-- 当前参数预览 -->
      <div class="params-preview">
        <small>查询参数: </small>
        <code>{{ previewParams }}</code>
      </div>

    </div>
  </footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mmsi: { type: String, required: true },
  minTimestamp: { type: Number, default: 1672500000 },  // 2023-01-01 00:00:00
  maxTimestamp: { type: Number, default: 1672565118 },  // 2023-12-31 23:59:59
  totalRecords: { type: Number, default: 1000 }         // 该MMSI总记录数
})

const emit = defineEmits(['query-change'])

// 查询模式: 'time' | 'index'
const queryMode = ref('time')

// 时间范围（时间戳，秒）
const startTimestamp = ref(props.minTimestamp)
const endTimestamp = ref(props.maxTimestamp)

// 索引范围
const startIndex = ref(0)
const endIndex = ref(Math.min(999, props.totalRecords - 1))

// 模式切换
const onModeChange = () => {
  emitQuery()
}

// 时间滑块变化
const onTimeChange = () => {
  if (startTimestamp.value > endTimestamp.value) {
    [startTimestamp.value, endTimestamp.value] = [endTimestamp.value, startTimestamp.value]
  }
  emitQuery()
}

// 索引滑块变化
const onIndexChange = () => {
  if (startIndex.value > endIndex.value) {
    [startIndex.value, endIndex.value] = [endIndex.value, startIndex.value]
  }
  emitQuery()
}

// 发送查询参数
const emitQuery = () => {
  const params = {
    mmsi: props.mmsi,
    mode: queryMode.value
  }
  
  if (queryMode.value === 'time') {
    params.start = startTimestamp.value
    params.end = endTimestamp.value
  } else {
    params.startIdx = startIndex.value
    params.endIdx = endIndex.value
  }
  
  emit('query-change', params)
}

// 计算样式
const timeRangeStyle = computed(() => {
  const range = props.maxTimestamp - props.minTimestamp
  const left = ((startTimestamp.value - props.minTimestamp) / range) * 100
  const width = ((endTimestamp.value - startTimestamp.value) / range) * 100
  return { left: `${left}%`, width: `${width}%` }
})

const indexRangeStyle = computed(() => {
  const left = (startIndex.value / (props.totalRecords - 1)) * 100
  const width = ((endIndex.value - startIndex.value) / (props.totalRecords - 1)) * 100
  return { left: `${left}%`, width: `${Math.max(width, 1)}%` }
})

// 参数预览
const previewParams = computed(() => {
  if (queryMode.value === 'time') {
    return `byTime?mmsi=${props.mmsi}&start=${startTimestamp.value}&end=${endTimestamp.value}`
  }
  return `byIndex?mmsi=${props.mmsi}&startIdx=${startIndex.value}&endIdx=${endIndex.value}`
})

// 格式化时间戳
const formatTimestamp = (ts) => {
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// 监听props变化
watch(() => props.mmsi, () => {
  // MMSI变化时重置滑块
  startTimestamp.value = props.minTimestamp
  endTimestamp.value = props.maxTimestamp
  startIndex.value = 0
  endIndex.value = Math.min(999, props.totalRecords - 1)
  emitQuery()
})

// 初始化发射一次
emitQuery()
</script>

<style scoped>
.time-slider {
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.slider-container {
  max-width: 1000px;
  margin: 0 auto;
}

.mode-switch {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.mode-switch label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.slider-section {
  margin-bottom: 1rem;
}

.slider-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: #333;
}

.slider-label .hint {
  font-weight: normal;
  color: #6c757d;
  margin-left: 0.5rem;
}

.slider-track {
  position: relative;
  height: 20px;
  margin: 10px 0;
}

.slider {
  position: absolute;
  width: 100%;
  top: 8px;
  -webkit-appearance: none;
  background: transparent;
  pointer-events: all;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007bff;
  border: 3px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-range {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  background: rgba(0,123,255,0.4);
  border-radius: 3px;
  pointer-events: none;
}

.timestamp-hints,
.index-hints {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 5px;
}

.params-preview {
  margin-top: 0.8rem;
  padding: 0.5rem;
  background: #e9ecef;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  color: #495057;
}

.params-preview code {
  color: #007bff;
}
</style>