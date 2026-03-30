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
import {inject, onMounted, watch, computed, ref} from 'vue'
import { useTimeSlider } from './useTimeSlider'

const props = defineProps({
  mmsi: { type: String, required: true },
  totalCount: { type: Number, default: 0 },
})


// ========== 🗺️ 注入 Map 操作实例（核心修复） ==========
// inject 获取的是父组件 provide 的 shallowRef 容器
const mapOpRef = inject('mapOp')

// ✅ 使用 computed 响应式解包 .value，确保能追踪到 init() 后的变化
const mapOp = computed(() => mapOpRef?.value)
const mapInstance = computed(() => mapOp.value?.map)

// ✅ 标志位：记录 map 是否已就绪，避免重复初始化
const isMapReady = ref(false)

// ========== 🔍 监听 Map 实例就绪（核心修复） ==========
// 方案：watch + immediate 捕获 init() 完成后的赋值
watch(
  mapInstance,
  (newMap, oldMap) => {
    if (newMap && !oldMap) {
      console.log('🗺️ ✅ Map 实例已就绪:', newMap)
      isMapReady.value = true
      onMapReady(newMap)  // 🎯 执行依赖 map 的初始化逻辑
    }
  },
  { immediate: true }  // ✅ 关键：确保 init() 完成后能立即捕获
)

// 🎯 Map 就绪后的回调（可选：根据业务需求扩展）
const onMapReady = (map) => {
  // 示例：在 map 就绪后自动刷新一次轨迹
  // emitQuery()
  
  // 示例：绑定地图事件
  // map.on('click', onMapClick)
}

// ========== 🔄 组件挂载后 ==========
onMounted(() => {
  // 调试：确认组件挂载时 map 状态
  console.log('🔹 TimeSliderPanel mounted, map ready:', isMapReady.value)
  
  // 如果 map 已经就绪（极小概率，如父组件 init 极快），手动触发一次
  if (mapInstance.value && !isMapReady.value) {
    isMapReady.value = true
    onMapReady(mapInstance.value)
  }
})

// ========== 🚀 查询逻辑（防御性编程） ==========
// ✅ 包装 useTimeSlider 返回的 emitQuery，添加 map 校验
const handleQuery = async () => {
  // 🔒 防御：确保 map 已初始化
  if (!isMapReady.value || !mapInstance.value) {
    console.warn('⚠️ Map 未就绪，查询已取消')
    // 可选：给用户友好提示
    // error.value = '地图加载中，请稍后查询'
    return
  }
  
  await emitQuery()
}

// 解构 useTimeSlider Hook 

const {

  startTimestamp,
  endTimestamp,
  startIndex,
  endIndex,
  timeStep,
  indexStep,
  loading,
  error,
  currentPoints,
  currentPointsCount,

  TIME_STEPS,
  INDEX_STEPS,

  isEditingTime,
  isEditingIndex,

  adjustTime,
  adjustIndex,
  updateTime,
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

  lastModifiedSource
} = useTimeSlider(mapOp, props.mmsi, props.totalCount)

// 暴露给父组件的方法 
defineExpose({
  emitQuery: handleQuery,
  resetToDefault,
  expandFull,
  currentPoints,
  isMapReady,
  mapInstance
})


</script>



















<style scoped>
/* ============ 🏗️ 容器布局 ============ */
.track-flow-container {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
}

/* ============ 📋 左侧面板 ============ */
.side-panel {
  width: 400px;
  min-width: 320px;
  max-width: 450px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 0.5rem;
  gap: 0.5rem;
}

.panel-extensions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ext-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.ext-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.ext-btn.primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  border-color: transparent;
}

.ext-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ============ 🗺️ 右侧地图 ============ */
.map-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #eef2f7;
}

.map-container { width: 100%; height: 100%; }

/* ============ 🎭 浮层 ============ */
.loading-mask, .error-toast, .data-info, .mmsi-tag {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}

.loading-mask {
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.95);
  padding: 1rem 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: auto;
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-toast {
  top: 1rem; right: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  pointer-events: auto;
  max-width: 300px;
}

.error-toast.map-toast {
  top: auto; bottom: 1rem; left: 1rem; right: auto;
  max-width: none;
}

.data-info {
  bottom: 1rem; left: 1rem;
  background: rgba(255,255,255,0.95);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  pointer-events: auto;
  display: flex; gap: 0.5rem;
}

.mmsi-tag {
  top: 1rem; left: 1rem;
  background: rgba(30, 64, 175, 0.95);
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  pointer-events: auto;
}

/* ============ 📱 响应式 ============ */
@media (max-width: 768px) {
  .track-flow-container { flex-direction: column; }
  .side-panel {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .map-wrapper { height: 50vh; }
  .panel-extensions { flex-wrap: wrap; }
}
</style>