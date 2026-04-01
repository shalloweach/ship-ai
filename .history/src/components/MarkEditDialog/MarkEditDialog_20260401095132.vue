<!-- src/components/MarkEditDialog/MarkEditDialog.vue -->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mark-dialog-overlay" @click.self="handleCancel">
      <div class="mark-dialog">
        <header class="dialog-header">
          <h3>📍 新增轨迹标记</h3>
          <button class="btn-close" @click="handleCancel">×</button>
        </header>
        
        <form @submit.prevent="handleSubmit" class="dialog-form">
          <!-- 停留类型 -->
          <div class="form-group">
            <label>停留类型 <span class="required">*</span></label>
            <div class="input-combo">
              <select v-model="form.stayType" @change="handleStayTypeChange">
                <option value="">请选择...</option>
                <option value="靠泊">🚢 靠泊</option>
                <option value="锚泊">⚓ 锚泊</option>
                <option value="异常">⚠️ 异常</option>
              </select>
              <input 
                type="text" 
                v-if="form.stayType === 'custom'" 
                v-model="form.stayTypeCustom"
                placeholder="手动输入类型"
                class="custom-input"
              />
            </div>
          </div>

          <!-- 港口选择（带搜索） -->
          <div class="form-group">
            <label>港口 <span class="required">*</span></label>
            <div class="port-search">
              <input 
                type="text" 
                v-model="portSearch" 
                @input="handlePortSearch"
                placeholder="搜索港口，如：香→香港港"
                class="search-input"
              />
              <ul v-if="portSuggestions.length" class="suggestion-list">
                <li 
                  v-for="port in portSuggestions" 
                  :key="port.code"
                  @click="selectPort(port)"
                  class="suggestion-item"
                >
                  {{ port.name }} <small class="port-code">{{ port.code }}</small>
                </li>
              </ul>
            </div>
          </div>

          <!-- 作业状态 -->
          <div class="form-group">
            <label>作业状态 <span class="required">*</span></label>
            <div class="input-combo">
              <select v-model="form.status" @change="handleStatusChange">
                <option value="">请选择...</option>
                <option value="装货">📦 装货</option>
                <option value="卸货">📤 卸货</option>
                <option value="中转">🔄 中转</option>
                <option value="未知">❓ 未知</option>
              </select>
              <input 
                type="text" 
                v-if="form.status === 'custom'" 
                v-model="form.statusCustom"
                placeholder="手动输入状态"
                class="custom-input"
              />
            </div>
          </div>

          <!-- 只读信息展示 -->
          <div class="form-group readonly">
            <label>时间范围</label>
            <p>{{ formatTime(form.startTime) }} → {{ formatTime(form.endTime) }}</p>
          </div>
          <div class="form-group readonly">
            <label>MMSI</label>
            <p>{{ form.mmsi || '未设置' }}</p>
          </div>

          <!-- 操作按钮 -->
          <footer class="dialog-footer">
            <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
            <button type="submit" class="btn-submit" :disabled="!isFormValid">✅ 保存标记</button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { chinaPorts } from './chinaPortsData' // 港口数据见下方

const props = defineProps({
  modelValue: Boolean,
  markData: Object,
  options: { type: Object, default: () => ({ isNew: false }) }
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

// 表单状态
const form = ref({
  id: '',
  mmsi: '',
  startTime: null,
  endTime: null,
  stayType: '',
  stayTypeCustom: '',
  port: '',
  portCode: '',
  status: '',
  statusCustom: '',
  segment: null
})

// 港口搜索
const portSearch = ref('')
const portSuggestions = ref([])

// 初始化表单
watch(() => props.markData, (newData) => {
  if (newData) {
    form.value = { ...form.value, ...newData }
  }
}, { immediate: true })

// 表单校验
const isFormValid = computed(() => {
  const stayType = form.value.stayType === 'custom' 
    ? form.value.stayTypeCustom?.trim() 
    : form.value.stayType
  const port = form.value.port?.trim()
  const status = form.value.status === 'custom'
    ? form.value.statusCustom?.trim()
    : form.value.status
  return stayType && port && status
})

// 港口搜索逻辑
const handlePortSearch = () => {
  const keyword = portSearch.value.trim().toLowerCase()
  if (!keyword) {
    portSuggestions.value = []
    return
  }
  
  portSuggestions.value = chinaPorts
    .filter(port => 
      port.name.toLowerCase().includes(keyword) || 
      port.code.toLowerCase().includes(keyword) ||
      port.pinyin?.toLowerCase().includes(keyword)
    )
    .slice(0, 10) // 限制显示数量
}

const selectPort = (port) => {
  form.value.port = port.name
  form.value.portCode = port.code
  portSearch.value = port.name
  portSuggestions.value = []
}

// 下拉框变更处理
const handleStayTypeChange = () => {
  if (form.value.stayType !== 'custom') {
    form.value.stayTypeCustom = ''
  }
}
const handleStatusChange = () => {
  if (form.value.status !== 'custom') {
    form.value.statusCustom = ''
  }
}

// 提交处理
const handleSubmit = () => {
  if (!isFormValid.value) return
  
  // 合并自定义输入
  const result = {
    ...form.value,
    stayType: form.value.stayType === 'custom' ? form.value.stayTypeCustom : form.value.stayType,
    status: form.value.status === 'custom' ? form.value.statusCustom : form.value.status,
    submittedAt: new Date().toISOString()
  }
  
  emit('submit', result)
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

// 时间格式化
const formatTime = (ts) => {
  if (!ts) return '-'
  const date = new Date(ts)
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  })
}
</script>

<style scoped>
/* 样式略，建议添加：overlay遮罩、dialog卡片、表单布局、搜索下拉等 */
.mark-dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); 
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.mark-dialog {
  background: #fff; border-radius: 12px; width: 420px; max-height: 90vh;
  overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.dialog-header {
  padding: 16px 20px; border-bottom: 1px solid #eee; 
  display: flex; justify-content: space-between; align-items: center;
}
.dialog-form { padding: 20px; max-height: 70vh; overflow-y: auto; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 500; margin-bottom: 6px; font-size: 14px; }
.required { color: #ef4444; }
.input-combo { display: flex; gap: 8px; }
.input-combo select, .input-combo input, .search-input {
  flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;
}
.port-search { position: relative; }
.suggestion-list {
  position: absolute; top: 100%; left: 0; right: 0; 
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.suggestion-item {
  padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between;
}
.suggestion-item:hover { background: #f5f5f5; }
.port-code { color: #888; font-size: 12px; }
.readonly p { margin: 4px 0 0; color: #666; font-size: 13px; }
.dialog-footer {
  padding: 16px 20px; border-top: 1px solid #eee; 
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-cancel, .btn-submit {
  padding: 8px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none;
}
.btn-cancel { background: #f3f4f6; color: #374151; }
.btn-submit { background: #8b5cf6; color: white; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
</style>