<!-- src/components/StayMarkPanel/MarkCard.vue -->
<template>
  <fieldset class="control-card marker-card">
    <legend>
      <span aria-hidden="true">🏷️</span> 停留标记
      <span v-if="sortedMarks.length > 0" class="badge">{{ sortedMarks.length }}</span>
    </legend>
    
    <!-- 快捷操作 -->
    <div class="mark-actions">
      <button class="btn-mark primary" @click="startMarkFlow" :disabled="!hasPoints">
        ✨ 新建标记
      </button>
      <button class="btn-mark" @click="emit('submit')" :disabled="sortedMarks.length === 0">
        📤 提交全部 ({{ sortedMarks.length }})
      </button>
    </div>
    
    <!-- 空状态 -->
    <div v-if="sortedMarks.length === 0" class="empty-hint">
      <p>💡 点击「新建标记」然后在地图上选择起止点，或点击轨迹点弹窗中的「🏷️ 创建停留标记」</p>
    </div>
    
    <!-- 🔧 标记表格（按开始时间升序） -->
    <div v-else class="marks-table-wrapper">
      <table class="marks-table">
        <thead>
          <tr>
            <th @click="sortBy('startTime')" class="sortable">
              开始时间 {{ sortKey === 'startTime' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th>结束时间</th>
            <th>时长</th>
            <th>类型</th>
            <th>港口</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="mark in sortedMarks" 
            :key="mark.id" 
            class="mark-row"
            :class="{ 'highlighted': highlightedMarkId === mark.id }"
            @mouseenter="onRowHover(mark)"
            @mouseleave="onRowLeave"
          >
            <td>
              <button class="link-btn" @click="selectMark(mark)" title="地图查看">
                {{ formatTime(mark.startTime) }}
              </button>
            </td>
            <td>{{ formatTime(mark.endTime) }}</td>
            <td>{{ formatDuration(mark.endTime - mark.startTime) }}</td>
            <td>
              <select 
                v-model="mark.stayType" 
                @change="emit('mark-update', { id: mark.id, field: 'stayType', value: mark.stayType })"
                class="inline-select"
              >
                <option v-for="t in STAY_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </td>
            <td>
              <input 
                type="text" 
                v-model="mark.port" 
                @input="emit('mark-update', { id: mark.id, field: 'port', value: mark.port })"
                class="inline-input" 
                maxlength="20"
                placeholder="港口"
              />
            </td>
            <td class="actions">
              <button class="btn-icon" @click="reselectMark(mark)" title="重新选择起止点">🔄</button>
              <button class="btn-icon" @click="editMark(mark)" title="编辑备注">✏️</button>
              <button class="btn-icon delete" @click="emit('mark-delete', mark.id)" title="删除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 备注编辑弹窗（简单版，复杂场景用独立组件） -->
    <Teleport to="body">
      <div v-if="noteEdit.visible" class="note-dialog-overlay" @click.self="closeNoteEdit">
        <div class="note-dialog">
          <div class="note-dialog-header">
            <span>📝 编辑备注</span>
            <button class="close-btn" @click="closeNoteEdit">✕</button>
          </div>
          <textarea 
            v-model="noteEdit.content" 
            maxlength="100"
            placeholder="请输入备注说明..."
            class="note-textarea"
          ></textarea>
          <div class="note-dialog-footer">
            <span class="char-count">{{ noteEdit.content?.length || 0 }}/100</span>
            <button class="btn primary" @click="saveNoteEdit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </fieldset>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MARKER_CONFIG } from './config'

const props = defineProps({
  mmsi: { type: String, required: true },
  marks: { type: Array, default: () => [] },
  mapOp: { type: Object, default: null }
})

const emit = defineEmits([
  'mark-select', 'mark-reselect', 'mark-update', 'mark-delete', 'submit'
])

// 🔧 配置
const STAY_TYPES = MARKER_CONFIG.STAY_TYPES.map(t => t.value)

// 🔧 排序状态
const sortKey = ref('startTime')
const sortOrder = ref('asc')  // asc | desc

// 🔧 高亮行
const highlightedMarkId = ref(null)

// 🔧 备注编辑弹窗
const noteEdit = ref({
  visible: false,
  markId: null,
  content: ''
})

// 🔧 计算：排序后的标记列表
const sortedMarks = computed(() => {
  const sorted = [...props.marks].sort((a, b) => {
    const valA = a[sortKey.value]
    const valB = b[sortKey.value]
    const order = sortOrder.value === 'asc' ? 1 : -1
    return (valA > valB ? 1 : valA < valB ? -1 : 0) * order
  })
  return sorted
})

// 🔧 是否有轨迹点
const hasPoints = computed(() => props.mapOp?.hasPoints?.() || false)

// ========== 交互逻辑 ==========

// 🔧 开始新建标记流程
const startMarkFlow = () => {
  emit('start-mark-flow')  // 通知父组件进入选择模式
}

// 🔧 点击行：地图跳转 + 高亮
const selectMark = (mark) => {
  emit('mark-select', mark)
  highlightedMarkId.value = mark.id
  setTimeout(() => { highlightedMarkId.value = null }, 2000)
}

// 🔧 重新选择起止点
const reselectMark = (mark) => {
  emit('mark-reselect', mark)
}

// 🔧 编辑备注（简单弹窗）
const editMark = (mark) => {
  noteEdit.value = {
    visible: true,
    markId: mark.id,
    content: mark.note || ''
  }
}

// 🔧 保存备注
const saveNoteEdit = () => {
  if (noteEdit.value.markId) {
    emit('mark-update', {
      id: noteEdit.value.markId,
      field: 'note',
      value: noteEdit.value.content
    })
  }
  closeNoteEdit()
}

// 🔧 关闭备注弹窗
const closeNoteEdit = () => {
  noteEdit.value.visible = false
  noteEdit.value.markId = null
  noteEdit.value.content = ''
}

// 🔧 行悬停效果（可选：地图预览）
const onRowHover = (mark) => {
  // 可选：轻微高亮地图上的轨迹段
  // if (props.mapOp?.previewSegment) {
  //   props.mapOp.previewSegment(mark.startPoint.idx, mark.endPoint.idx)
  // }
}

const onRowLeave = () => {
  // if (props.mapOp?.clearPreview) {
  //   props.mapOp.clearPreview()
  // }
}

// 🔧 切换排序
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

// 🔧 工具函数
const formatTime = (ts) => {
  if (!ts) return '-'
  const timestamp = ts > 1e12 ? ts : ts * 1000
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

// 🔧 暴露方法
defineExpose({
  startMarkFlow,
  getMarks: () => [...props.marks]
})
</script>

<style scoped>
.marker-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.marker-card legend {
  font-weight: 600;
  color: #333;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.mark-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.btn-mark {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-mark.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-mark:not(.primary) {
  background: #f1f5f9;
  color: #334155;
}

.btn-mark:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-mark:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.empty-hint {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  padding: 30px 20px;
  background: #f8fafc;
  border-radius: 8px;
  line-height: 1.5;
}

.marks-table-wrapper {
  flex: 1;
  overflow: auto;
  margin: 0 -14px;
  padding: 0 14px;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.marks-table th {
  background: #f1f5f9;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  user-select: none;
}

.marks-table th.sortable:hover {
  background: #e2e8f0;
}

.marks-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.mark-row:hover {
  background: #f8fafc;
}

.mark-row.highlighted {
  background: #f0f7ff;
  border-left: 3px solid #667eea;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

.inline-select, .inline-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  transition: border-color 0.2s;
}

.inline-select:focus, .inline-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
  opacity: 0.7;
}

.btn-icon:hover {
  opacity: 1;
  background: #f1f5f9;
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 🔧 备注编辑弹窗 */
.note-dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.note-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  overflow: hidden;
}

.note-dialog-header {
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #334155;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  padding: 0 4px;
}

.note-textarea {
  width: 100%;
  min-height: 100px;
  padding: 14px 18px;
  border: none;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}

.note-textarea:focus {
  outline: none;
}

.note-dialog-footer {
  padding: 12px 18px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.char-count {
  font-size: 11px;
  color: #94a3b8;
}

.btn.primary {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary:hover {
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}
</style>