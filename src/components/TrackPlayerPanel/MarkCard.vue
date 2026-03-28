<!-- src/components/TrackPlayerPanel/MarkCard.vue -->
<template>
  <fieldset class="control-card marker-card">
    <legend><span aria-hidden="true">📍</span> 停留标记</legend>
    
    <!-- 标记状态提示 -->
    <div v-if="marker.isMarking.value" class="mark-hint" :class="marker.markMode.value">
      <span aria-hidden="true">
        {{ marker.markMode.value === 'selecting-start' ? '👆' : '👇' }}
      </span>
      {{ marker.markMode.value === 'selecting-start' ? '点击轨迹选择起点' : '点击轨迹选择终点' }}
      <button class="hint-cancel" @click="marker.cancelMarking">取消</button>
    </div>
    
    <!-- 标记操作按钮 -->
    <div v-if="marker.markMode.value === 'idle'" class="mark-actions">
      <button class="btn-mark" @click="startMarkAtCurrent" 
              :disabled="!currentPoint || !player.hasData.value">
        🏁 从当前点开始标记
      </button>
    </div>
    
    <!-- 标记表单 -->
    <div v-if="marker.markMode.value === 'editing'" class="mark-form">
      <!-- 停留类型 -->
      <div class="form-row">
        <label>类型:</label>
        <div class="type-options">
          <button 
            v-for="t in marker.STAY_TYPES" 
            :key="t.value"
            class="type-btn" 
            :class="{ active: marker.currentMark.value?.stayType === t.value }"
            @click="marker.updateMarkField('stayType', t.value)"
            :style="{ borderColor: t.color }"
          >
            <span aria-hidden="true">{{ t.label.split(' ')[0] }}</span>
            {{ t.label.split(' ').slice(1).join(' ') }}
          </button>
        </div>
      </div>
      
      <!-- 停留港口 -->
      <div class="form-row">
        <label>港口:</label>
        <select v-model="marker.currentMark.value.port" 
                @change="marker.updateMarkField('port', $event.target.value)"
                class="port-select">
          <option value="">请选择...</option>
          <option v-for="p in marker.DEFAULT_PORTS" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      
      <!-- 备注 -->
      <div class="form-row">
        <label>备注:</label>
        <input type="text" v-model="marker.currentMark.value.note" 
               @input="marker.updateMarkField('note', $event.target.value)"
               placeholder="可选说明" maxlength="50" class="note-input"/>
      </div>
      
      <!-- 时间预览 -->
      <div class="form-row time-preview">
        <small>
          🕐 {{ formatTime(marker.currentMark.value?.startTime) }} 
          → {{ formatTime(marker.currentMark.value?.endTime) }}
          ({{ formatDuration(marker.currentMark.value?.endTime - marker.currentMark.value?.startTime) }})
        </small>
      </div>
      
      <!-- 操作按钮 -->
      <div class="form-actions">
        <button class="btn primary" @click="marker.addPendingMark" 
                :disabled="!marker.canSaveMark.value">
          ✅ 添加到表格
        </button>
        <button class="btn" @click="marker.cancelMarking">❌ 取消</button>
      </div>
    </div>
    
    <!-- 待提交表格 -->
    <div v-if="marker.pendingMarks.value.length > 0" class="marks-table-wrapper">
      <table class="marks-table">
        <thead>
          <tr>
            <th>开始时间</th>
            <th>结束时间</th>
            <th>类型</th>
            <th>港口</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in marker.pendingMarks.value" :key="m.id" class="mark-row">
            <td>{{ formatTime(m.startTime) }}</td>
            <td>{{ formatTime(m.endTime) }}</td>
            <td>
              <select v-model="m.stayType" 
                      @change="marker.updatePendingMark(m.id, 'stayType', $event.target.value)" 
                      class="inline-select">
                <option v-for="t in marker.STAY_TYPES" :key="t.value" :value="t.value">{{ t.value }}</option>
              </select>
            </td>
            <td>
              <input type="text" v-model="m.port" 
                     @input="marker.updatePendingMark(m.id, 'port', $event.target.value)" 
                     class="inline-input" maxlength="20"/>
            </td>
            <td>
              <button class="btn-icon" @click="marker.removePendingMark(m.id)" title="删除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="table-actions">
        <button class="btn primary" @click="marker.submitPendingMarks" 
                :disabled="props.loading || marker.pendingMarks.value.length === 0">
          {{ props.loading ? '提交中...' : `✅ 提交 ${marker.pendingMarks.value.length} 条` }}
        </button>
        <button class="btn" @click="marker.exportToCSV">📥 导出 CSV</button>
      </div>
    </div>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import { formatTimeOnly, formatDuration } from '../timeUtils'

const props = defineProps({
  marker: { type: Object, required: true },   // useStayMarker 返回的对象
  player: { type: Object, required: true },   // useTrackPlayer 返回的对象
  loading: { type: Boolean, default: false },
  mmsi: { type: String, required: true }
})

const emit = defineEmits([
  'mark-state', 'mark-added', 'mark-removed', 'marks-submitted', 'marks-exported'
])

// 当前播放点（用于从当前点开始标记）
const currentPoint = computed(() => props.player.currentPoint.value)

// 辅助：从当前播放点开始标记
const startMarkAtCurrent = () => {
  if (currentPoint.value) {
    props.marker.startMarking(currentPoint.value, props.player.currentIndex.value)
  }
}

// 时间格式化（秒级时间戳）
const formatTime = (ts) => {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// 暴露方法
defineExpose({
  startMarking: props.marker.startMarking,
  endMarking: props.marker.endMarking,
  addPendingMark: props.marker.addPendingMark,
  removePendingMark: props.marker.removePendingMark,
  submitPendingMarks: props.marker.submitPendingMarks,
  cancelMarking: props.marker.cancelMarking,
  clearMarks: props.marker.clearMarks,
  exportToCSV: props.marker.exportToCSV,
  loadExistingMarks: props.marker.loadExistingMarks
})
</script>

<style scoped>
.marker-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
  margin: 0.875rem 1.25rem;
}

.marker-card legend {
  font-weight: 600;
  color: #1e293b;
  padding: 0 0.5rem;
}

.mark-hint {
  padding: 0.6rem;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.mark-hint.selecting-end {
  background: #dbeafe;
  border-left-color: #3b82f6;
}

.hint-cancel {
  margin-left: auto;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.85rem;
}

.hint-cancel:hover { color: #ef4444; }

.btn-mark {
  width: 100%;
  padding: 0.6rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-mark:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-mark:disabled { opacity: 0.6; cursor: not-allowed; }

.mark-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.form-row { display: flex; flex-direction: column; gap: 0.4rem; }
.form-row label { font-size: 0.85rem; font-weight: 500; color: #334155; }

.type-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
}

.type-btn {
  padding: 0.4rem 0.6rem;
  border: 2px solid;
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.type-btn.active {
  background: #f0fdf4;
  font-weight: 600;
  transform: scale(1.02);
}

.port-select, .note-input {
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}

.time-preview {
  background: #f8fafc;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #64748b;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* 标记表格 */
.marks-table-wrapper {
  margin-top: 0.75rem;
  border-top: 1px dashed #e2e8f0;
  padding-top: 0.75rem;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.marks-table th {
  text-align: left;
  padding: 0.5rem;
  background: #f8fafc;
  font-weight: 600;
  color: #334155;
  border-bottom: 2px solid #e2e8f0;
}

.marks-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.inline-select, .inline-input {
  width: 100%;
  padding: 0.3rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  background: #fff;
}

.btn-icon {
  background: none; border: none; cursor: pointer;
  opacity: 0.6; font-size: 1.1rem;
}
.btn-icon:hover { opacity: 1; color: #ef4444; }

.table-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn.primary {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff; border: none;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-weight: 500; cursor: pointer;
}
.btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

@media (max-width: 480px) {
  .type-options { grid-template-columns: 1fr; }
  .table-actions { flex-direction: column; }
  .btn { width: 100%; }
}
</style>