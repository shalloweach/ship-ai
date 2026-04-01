<!-- src/components/MarkEditDialog/MarkEditDialog.vue -->
<template>
  <div class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-card">
      <div class="dialog-header">
        <h4>✏️ 编辑标记</h4>
        <button class="btn-close" @click="handleCancel">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="dialog-form">
        <!-- 停留类型 -->
        <div class="form-row">
          <label>停留类型 *</label>
          <div class="input-group">
            <select v-model="form.stayType" @change="checkCustom('stayType')">
              <option value="">请选择</option>
              <option value="靠泊">靠泊</option>
              <option value="锚泊">锚泊</option>
              <option value="异常">异常</option>
              <option value="custom">手动输入</option>
            </select>
            <input 
              v-if="form.stayType === 'custom'" 
              v-model="form._stayTypeCustom"
              placeholder="输入类型" 
              class="custom-input"
            />
          </div>
        </div>

        <!-- 港口搜索 -->
        <div class="form-row">
          <label>港口 *</label>
          <div class="port-search">
            <input 
              v-model="portKeyword" 
              @input="searchPorts" 
              placeholder="搜索港口，如：香→香港港"
              class="search-input"
            />
            <ul v-if="portSuggestions.length" class="suggestion-list">
              <li 
                v-for="p in portSuggestions" 
                :key="p.code"
                @click="selectPort(p.name)"
                class="suggestion-item"
              >
                {{ p.name }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 作业状态 -->
        <div class="form-row">
          <label>作业状态 *</label>
          <div class="input-group">
            <select v-model="form.status" @change="checkCustom('status')">
              <option value="">请选择</option>
              <option value="装货">装货</option>
              <option value="卸货">卸货</option>
              <option value="中转">中转</option>
              <option value="等待">等待</option>
              <option value="未知">未知</option>
              <option value="custom">手动输入</option>
            </select>
            <input 
              v-if="form.status === 'custom'" 
              v-model="form._statusCustom"
              placeholder="输入状态" 
              class="custom-input"
            />
          </div>
        </div>

        <!-- 只读信息 -->
        <div class="form-row readonly">
          <label>时间</label>
          <p>{{ fmt(form.startTime) }} → {{ fmt(form.endTime) }}</p>
        </div>
        <div class="form-row readonly">
          <label>MMSI</label>
          <p>{{ form.mmsi || '-' }}</p>
        </div>

        <!-- 按钮 -->
        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
          <button type="submit" class="btn-ok" :disabled="!valid">✅ 提交</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { searchPorts } from './chinaPortsData'
import { useRoute } from 'vue-router'

const props = defineProps({
  markData: Object,
  onConfirm: Function,
  onCancel: Function
})

    const route = useRoute()
    const mmsi = route.query.mmsi
// 表单（仅6个字段 + 2个临时自定义字段）
const form = ref({
  id: '', mmsi: '', startTime: null, endTime: null,
  stayType: '', _stayTypeCustom: '',
  port: '',
  status: '', _statusCustom: ''
})

// 港口搜索
const portKeyword = ref('')
const portSuggestions = ref([])

// 初始化
onMounted(() => {
  if (props.markData) {
    form.value = { ...form.value, ...props.markData }
  }
})

// 校验表单
const valid = computed(() => {
  const stay = form.value.stayType === 'custom' 
    ? form.value._stayTypeCustom?.trim() 
    : form.value.stayType
  const port = form.value.port?.trim()
  const status = form.value.status === 'custom'
    ? form.value._statusCustom?.trim()
    : form.value.status
  return stay && port && status
})

// 处理自定义选项
const checkCustom = (field) => {
  if (form.value[field] !== 'custom') {
    form.value[`_${field}Custom`] = ''
  }
}



const selectPort = (name) => {
  form.value.port = name
  portKeyword.value = name
  portSuggestions.value = []
}

// 提交
const handleSubmit = () => {
  if (!valid.value) return
  
  // 合并自定义值，输出仅6个字段
  const result = {
    id: form.value.id,
    mmsi: form.value.mmsi,
    startTime: form.value.startTime,
    endTime: form.value.endTime,
    stayType: form.value.stayType === 'custom' ? form.value._stayTypeCustom : form.value.stayType,
    port: form.value.port,
    status: form.value.status === 'custom' ? form.value._statusCustom : form.value.status
  }
  
  props.onConfirm?.(result)
}

const handleCancel = () => props.onCancel?.()

// 时间格式化
const fmt = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
}



</script>

<style scoped>
.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 3000;
}
.dialog-card {
  background: #fff; border-radius: 10px; width: 360px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
.dialog-header {
  padding: 14px 18px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
}
.dialog-header h4 { margin: 0; font-size: 16px; }
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #999; }
.dialog-form { padding: 18px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #333; }
.input-group { display: flex; gap: 8px; }
.input-group select, .input-group input, .search-input {
  flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;
}
.custom-input { margin-top: 6px; }
.port-search { position: relative; }
.suggestion-list {
  position: absolute; top: 100%; left: 0; right: 0;
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  max-height: 180px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin: 4px 0 0; padding: 0; list-style: none;
}
.suggestion-item {
  padding: 10px 12px; cursor: pointer; font-size: 13px;
}
.suggestion-item:hover { background: #f5f7fa; }
.readonly p { margin: 4px 0 0; color: #666; font-size: 12px; }
.dialog-footer {
  padding: 14px 18px; border-top: 1px solid #eee;
  display: flex; justify-content: flex-end; gap: 10px;
}
.btn-cancel, .btn-ok {
  padding: 7px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none;
}
.btn-cancel { background: #f3f4f6; color: #374151; }
.btn-ok { background: #8b5cf6; color: #fff; }
.btn-ok:disabled { opacity: 0.6; cursor: not-allowed; }
</style>