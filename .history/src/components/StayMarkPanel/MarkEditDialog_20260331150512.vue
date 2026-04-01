<!-- src/components/StayMarkPanel/MarkEditDialog.vue -->
<template>
    <div class="mark-edit-dialog">
      <!-- 标题 -->
      <div class="dialog-header">
        <span>🏷️ {{ props.isNew ? '新建' : '编辑' }}停留标记</span>
        <button class="close-btn" @click="$emit('cancel')">✕</button>
      </div>
      
      <!-- 内容 -->
      <div class="dialog-body">
        <!-- 时间范围（只读） -->
        <div class="form-group">
          <label>⏱️ 时间范围</label>
          <div class="time-range">
            {{ formatTime(mark.startTime) }} → {{ formatTime(mark.endTime) }}
            <span class="duration">({{ formatDuration(mark.endTime - mark.startTime) }})</span>
          </div>
        </div>
        
        <!-- 停留类型 -->
        <div class="form-group">
          <label>📋 停留类型</label>
          <div class="type-options">
            <button 
              v-for="t in STAY_TYPES" 
              :key="t.value"
              class="type-btn"
              :class="{ active: mark.stayType === t.value }"
              @click="$emit('update:mark', { ...mark, stayType: t.value })"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
        
        <!-- 港口 -->
        <div class="form-group">
          <label>⚓ 港口</label>
          <select v-model="mark.port" class="form-select">
            <option value="">请选择...</option>
            <option v-for="p in DEFAULT_PORTS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        
        <!-- 备注 -->
        <div class="form-group">
          <label>📝 备注</label>
          <textarea 
            v-model="mark.note" 
            maxlength="100"
            placeholder="可选说明"
            class="form-textarea"
          ></textarea>
          <span class="char-count">{{ mark.note?.length || 0 }}/100</span>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="dialog-footer">
        <button class="btn delete" @click="$emit('delete', mark.id)">🗑️ 删除</button>
        <button class="btn" @click="$emit('cancel')">取消</button>
        <button class="btn primary" @click="$emit('save', mark)">✅ 保存</button>
      </div>
    </div>
  </template>
  
  <script setup>
  // 🔧 内联配置，不依赖外部文件
  const STAY_TYPES = [
    { value: '靠泊', label: '⚓ 靠泊' },
    { value: '锚泊', label: '⚓ 锚泊' },
    { value: '作业', label: '🔧 作业' },
    { value: '待泊', label: '⏳ 待泊' },
    { value: '其他', label: '📦 其他' }
  ]
  
  const DEFAULT_PORTS = [
    '上海港', '宁波舟山港', '深圳港', '广州港', '青岛港',
    '天津港', '厦门港', '大连港', '营口港', '其他'
  ]
  
  const props = defineProps({
    mark: { type: Object, required: true },
    isNew: { type: Boolean, default: false }
  })
  
  defineEmits(['save', 'cancel', 'delete', 'update:mark'])
  
  // 工具函数
  const formatTime = (ts) => {
    if (!ts) return '-'
    const t = ts > 1e12 ? ts : ts * 1000
    return new Date(t).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }
  
  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}小时${m}分`
    return `${m}分`
  }
  </script>
  
  <style scoped>
  .mark-edit-dialog {
    min-width: 340px;
    max-width: 420px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.25);
    font-size: 13px;
    overflow: hidden;
  }
  
  .dialog-header {
    padding: 14px 18px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.9;
    padding: 0 4px;
  }
  
  .close-btn:hover { opacity: 1; }
  
  .dialog-body {
    padding: 16px 18px;
  }
  
  .form-group {
    margin-bottom: 14px;
  }
  
  .form-group label {
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
  }
  
  .time-range {
    font-weight: 500;
    color: #334155;
  }
  
  .duration {
    display: block;
    font-size: 11px;
    color: #667eea;
    margin-top: 2px;
  }
  
  .type-options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .type-btn {
    padding: 5px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 16px;
    background: white;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .type-btn.active {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }
  
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 13px;
    box-sizing: border-box;
  }
  
  .form-textarea {
    min-height: 60px;
    resize: vertical;
  }
  
  .char-count {
    display: block;
    text-align: right;
    font-size: 10px;
    color: #94a3b8;
    margin-top: 4px;
  }
  
  .dialog-footer {
    padding: 12px 18px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  
  .btn {
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn.delete {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .btn.primary {
    background: #667eea;
    color: white;
  }
  
  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  </style>