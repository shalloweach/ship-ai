<!-- src/components/StayMarkPanel/MarkCard.vue -->
<template>
  <fieldset class="control-card marker-card">
    <legend>
      <span aria-hidden="true">🏷️</span> 停留标记
      <span v-if="sortedMarks.length > 0" class="badge">{{ sortedMarks.length }}</span>
    </legend>
    
    <!-- 快捷操作 -->
    <div class="mark-actions">
      <button class="btn-mark primary" @click="emit('start-mark-flow')" :disabled="!hasPoints">✨ 新建</button>
      <button class="btn-mark success" @click="handleSubmit" :disabled="sortedMarks.length === 0">📤 提交({{ sortedMarks.length }})</button>
      <button class="btn-mark danger" @click="handleClear" :disabled="sortedMarks.length === 0">🗑️ 清空</button>
    </div>
    
    <!-- 空状态 -->
    <div v-if="sortedMarks.length === 0" class="empty-hint">
      <p>💡 点击「新建」然后在地图上选择起止点创建停留标记</p>
    </div>
    
    <!-- 📋 标记表格（支持排序） -->
    <div v-else class="marks-table-wrapper">
      <table class="marks-table">
        <thead>
          <tr>
            <th @click="handleSort('startTime')" class="sortable">
              开始时间 <span v-if="sortKey==='startTime'">{{ sortOrder==='asc'?'↑':'↓' }}</span>
            </th>
            <th @click="handleSort('startIndex')" class="sortable">
              起始索引 <span v-if="sortKey==='startIndex'">{{ sortOrder==='asc'?'↑':'↓' }}</span>
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
            v-for="mark in sortedMarks" :key="mark.id" 
            class="mark-row" 
            :class="{ 'highlighted': highlightedMarkId === mark.id }"
            @click="handleRowClick(mark)"
          >
            <td><button class="link-btn" @click.stop="emit('mark-select', mark)">{{ formatTime(mark.startTime) }}</button></td>
            <td>{{ mark.startIndex ?? '-' }}</td>
            <td>{{ formatTime(mark.endTime) }}</td>
            <td>{{ formatDuration(mark.endTime - mark.startTime) }}</td>
            <td>
              <select v-model="mark.stayType" @change="handleFieldUpdate(mark, 'stayType', mark.stayType)" class="inline-select">
                <option v-for="t in STAY_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </td>
            <td><input type="text" v-model="mark.port" @input="handleFieldUpdate(mark, 'port', mark.port)" class="inline-input" maxlength="20" placeholder="港口"/></td>
            <td class="actions">
              <button class="btn-icon" @click.stop="emit('mark-reselect', mark)" title="重选范围">🔄</button>
              <button class="btn-icon" @click.stop="openNoteEdit(mark)" title="编辑备注">✏️</button>
              <button class="btn-icon delete" @click.stop="handleDelete(mark.id)" title="删除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 备注编辑弹窗（略，保持原有逻辑） -->
    <Teleport to="body">
      <div v-if="noteEdit.visible" class="note-dialog-overlay" @click.self="closeNoteEdit">
        <div class="note-dialog">
          <div class="note-dialog-header">
            <span>📝 编辑备注</span>
            <button class="close-btn" @click="closeNoteEdit">✕</button>
          </div>
          <textarea v-model="noteEdit.content" maxlength="100" class="note-textarea"></textarea>
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
import { ref, computed, watch } from 'vue'
// 🔹 改用新管理器（markFlow.js 保持原样，仅流程状态用）
import { 
  markTable,
  saveMark, getSortedMarks, toggleSort, sortConfig,
  highlightedMarkId, highlightMark, updateMarkField,
  submitMarks, clearMarks, deleteMark
} from './markTableManager'
// import { markFlow } from '@/components/MarkEditDialog/markFlow'

// ========== Props & Emits ==========
const props = defineProps({
  mmsi: { type: [String, Number], required: true },
  hasPoints: { type: Boolean, default: false }
})

const emit = defineEmits([
  'start-mark-flow', 'submit', 'mark-select', 'mark-update',
  'mark-reselect', 'mark-delete', 'mark-highlight',
  'submit-success', 'submit-error'
])

// ========== 常量 ==========
const STAY_TYPES = ['作业停留', '锚泊', '靠港', '其他']
const noteEdit = ref({ visible: false, content: '', targetMark: null })

// ========== 计算属性 ==========
const sortedMarks = computed(() => getSortedMarks())
const sortKey = computed(() => sortConfig.value.key)
const sortOrder = computed(() => sortConfig.value.order)

// ========== 工具函数 ==========
const formatTime = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', { 
  month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' 
}) : '-'

const formatDuration = (ms) => {
  if (!ms || ms < 0) return '-'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

// ========== 事件处理 ==========
const handleSort = (key) => toggleSort(key)

const handleRowClick = (mark) => {
  highlightMark(mark.id, {
    onToggle: (currentId, clickedId) => {
      emit('mark-highlight', currentId ? mark : null)
    }
  })
}

const handleFieldUpdate = async (mark, field, value) => {
  await updateMarkField(
    { id: mark.id, field, value },
    {
      // 🔹 真实项目传入实际API
      // apiFn: (payload) => api.vesselMarks.updateField(payload),
      onAfterUpdate: () => {
        emit('mark-update', { id: mark.id, field, value })
      }
    }
  )
}



const handleClear = () => {
  if (clearMarks(true)) {  // 带确认
    emit('submit')  // 可触发父组件同步清空地图标记
  }
}

const handleDelete = (id) => {
  if (deleteMark(id, true)) {
    emit('mark-delete', id)
  }
}

// 备注编辑（保持原有逻辑）
const openNoteEdit = (mark) => {
  noteEdit.value = { visible: true, content: mark.note || '', targetMark: mark }
}
const closeNoteEdit = () => { noteEdit.value.visible = false }
const saveNoteEdit = async () => {
  if (noteEdit.value.targetMark) {
    await updateMarkField(
      { id: noteEdit.value.targetMark.id, field: 'note', value: noteEdit.value.content },
      { onAfterUpdate: () => emit('mark-update', { 
          id: noteEdit.value.targetMark.id, 
          field: 'note', 
          value: noteEdit.value.content 
        }) 
      }
    )
  }
  closeNoteEdit()
}
</script>

<style scoped>
.mark-row.highlighted { 
  background: #eff6ff; 
  border-left: 3px solid #3b82f6; 
  cursor: pointer;
}
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: #3b82f6; }
.mark-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.btn-mark { 
  padding: 0.4rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 6px; 
  background: #fff; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
}
.btn-mark.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn-mark.success { background: #22c55e; color: white; border-color: #22c55e; }
.btn-mark.danger { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.btn-mark:disabled { opacity: 0.5; cursor: not-allowed; }
/* 原有样式保持不变 */
.marker-card { border: 1px solid #e0e0e0; border-radius: 10px; padding: 14px; background: #fff; max-height: 600px; display: flex; flex-direction: column; }
.marker-card legend { font-weight: 600; color: #333; padding: 0 8px; display: flex; align-items: center; gap: 6px; }
.badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: bold; }
.mark-actions { display: flex; gap: 10px; margin-bottom: 14px; }
.btn-mark { flex: 1; padding: 10px 14px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-mark.primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-mark:not(.primary) { background: #f1f5f9; color: #334155; }
.btn-mark:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-mark:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.empty-hint { text-align: center; color: #64748b; font-size: 13px; padding: 30px 20px; background: #f8fafc; border-radius: 8px; line-height: 1.5; }
.marks-table-wrapper { flex: 1; overflow: auto; margin: 0 -14px; padding: 0 14px; }
.marks-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.marks-table th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 1; cursor: pointer; user-select: none; }
.marks-table th.sortable:hover { background: #e2e8f0; }
.marks-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.mark-row:hover { background: #f8fafc; }
.mark-row.highlighted { background: #f0f7ff; border-left: 3px solid #667eea; }
.link-btn { background: none; border: none; color: #667eea; font-size: 12px; cursor: pointer; padding: 0; text-decoration: none; }
.link-btn:hover { text-decoration: underline; }
.inline-select, .inline-input { width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; background: white; transition: border-color 0.2s; }
.inline-select:focus, .inline-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
.actions { display: flex; gap: 4px; justify-content: flex-end; }
.btn-icon { background: none; border: none; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s; opacity: 0.7; }
.btn-icon:hover { opacity: 1; background: #f1f5f9; }
.btn-icon.delete:hover { background: #fee2e2; color: #dc2626; }
.note-dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.note-dialog { background: white; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }
.note-dialog-header { padding: 14px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #334155; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b; padding: 0 4px; }
.note-textarea { width: 100%; min-height: 100px; padding: 14px 18px; border: none; font-size: 14px; resize: vertical; box-sizing: border-box; font-family: inherit; }
.note-textarea:focus { outline: none; }
.note-dialog-footer { padding: 12px 18px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.char-count { font-size: 11px; color: #94a3b8; }
.btn.primary { padding: 8px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn.primary:hover { box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); }




/* 🔧 新增样式 */
.mark-flow-hint {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea, #764ba2); color: white;
  padding: 10px 20px; border-radius: 24px; font-size: 13px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4); z-index: 1000;
  animation: slideDown 0.3s ease;
}
.hint-icon { font-size: 16px; font-weight: bold; }
.hint-text { flex: 1; }
.hint-cancel {
  background: rgba(255,255,255,0.2); border: none; color: white;
  padding: 4px 12px; border-radius: 14px; font-size: 12px; cursor: pointer;
}
.hint-cancel:hover { background: rgba(255,255,255,0.3); }
@keyframes slideDown { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

.temp-highlight-info {
  position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: rgba(102, 126, 234, 0.9); color: white;
  padding: 6px 14px; border-radius: 20px; font-size: 12px; z-index: 900;
}
.mark-dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex;
  align-items: center; justify-content: center; z-index: 2000;
  animation: fadeIn 0.2s ease;
}
.mark-dialog-container { animation: scaleIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }


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