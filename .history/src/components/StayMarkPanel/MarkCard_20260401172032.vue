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
import {formatTime, formatDuration} from '@/components/utils'
// 🔹 改用新管理器（markFlow.js 保持原样，仅流程状态用）
import {  getSortedMarks, toggleSort, sortConfig,
  highlightedMarkId, highlightMark, updateMarkField,
  submitMarks, clearMarks, deleteMark
} from './markTableManager'

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
const STAY_TYPES = ['靠泊', '锚泊', '异常', '其他']
const noteEdit = ref({ visible: false, content: '', targetMark: null })

// ========== 计算属性 ==========
const sortedMarks = computed(() => getSortedMarks())
const sortKey = computed(() => sortConfig.value.key)
const sortOrder = computed(() => sortConfig.value.order)



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

const handleSubmit = async () => {
  try {
    const result = await submitMarks(null, { mmsi: props.mmsi })
    if (result.success) {
      emit('submit-success', result)
      clearMarks(false)  // ✅ 提交后静默清空
    } else {
      emit('submit-error', result)
    }
  } catch (e) {
    emit('submit-error', e)
  }
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
.marker-card {
  composes: ui-card;
  padding: var(--ui-space-4);
  display: flex;
  flex-direction: column;
  max-height: 600px;
}

.marker-card legend {
  font-weight: 600;
  color: var(--ui-text);
  padding: 0 var(--ui-space-2);
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
}

/* 🔹 操作按钮 */
.mark-actions {
  display: flex;
  gap: var(--ui-space-2);
  margin-bottom: var(--ui-space-4);
  flex-wrap: wrap;
}
.btn-mark {
  composes: ui-btn;
  flex: 1;
  min-width: 80px;
}
.btn-mark.primary { composes: ui-btn primary; }
.btn-mark.success { composes: ui-btn success; }
.btn-mark.danger  { composes: ui-btn danger; }

/* 🔹 表格区域 */
.marks-table-wrapper {
  flex: 1;
  overflow: auto;
  margin: 0 calc(-1 * var(--ui-space-4));
  padding: 0 var(--ui-space-4);
}
.marks-table {
  composes: ui-table;
}
.mark-row.highlighted {
  background: var(--ui-success-light);
  border-left: 3px solid var(--ui-success);
  cursor: pointer;
}

/* 🔹 行内编辑控件 */
.inline-select, .inline-input {
  composes: ui-select ui-input;
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
}

/* 🔹 图标操作按钮 */
.actions {
  display: flex;
  gap: var(--ui-space-1);
  justify-content: flex-end;
}
.btn-icon {
  composes: ui-btn ui-btn-icon;
}
.btn-icon.delete { composes: ui-btn-icon danger; }

/* 🔹 空状态 */
.empty-hint {
  composes: ui-empty;
}

/* 🔹 弹窗样式 */
.note-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ui-z-modal);
}
.note-dialog {
  composes: ui-card;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}
.note-dialog-header {
  padding: var(--ui-space-3) var(--ui-space-4);
  background: var(--ui-bg-subtle);
  border-bottom: 1px solid var(--ui-border);
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}
.note-textarea {
  composes: ui-textarea;
  border: none;
  min-height: 100px;
  resize: vertical;
}
.note-dialog-footer {
  padding: var(--ui-space-3) var(--ui-space-4);
  background: var(--ui-bg-subtle);
  border-top: 1px solid var(--ui-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.close-btn {
  composes: ui-btn ui-btn-icon;
  padding: 0.2rem;
}

/* 🔹 徽章 */
.badge {
  composes: ui-badge;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
}
</style>