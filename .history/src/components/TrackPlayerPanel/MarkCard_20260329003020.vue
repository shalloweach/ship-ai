<!-- src/components/TrackPlayerPanel/MarkCard.vue -->
<template>
  <div class="mark-card">
    <h3>📍 停留标记</h3>
    
    <div v-if="!isMarking" class="status-info">
      <p>当前状态: 空闲</p>
      <button @click="$emit('start-mark')" :disabled="!hasSelection">
        开始标记
      </button>
    </div>

    <div v-else class="marking-form">
      <p class="warning">⚠️ 正在标记中... 请点击地图结束点</p>
      <button @click="$emit('cancel-mark')" class="cancel-btn">取消</button>
    </div>

    <!-- 待提交列表 -->
    <div v-if="pendingMarks.length > 0" class="pending-list">
      <h4>待提交 ({{ pendingMarks.length }})</h4>
      <ul>
        <li v-for="(m, idx) in pendingMarks" :key="idx">
          {{ m.stayType }} @ {{ m.port }}
        </li>
      </ul>
      <button @click="$emit('submit')" class="submit-btn" :disabled="isSubmitting">
        {{ isSubmitting ? '提交中...' : '提交所有标记' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  isMarking: Boolean,
  pendingMarks: Array,
  hasSelection: Boolean,
  isSubmitting: Boolean
});

const emit = defineEmits(['start-mark', 'cancel-mark', 'submit']);
</script>

<style scoped>
.mark-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.warning {
  color: #ff9800;
  font-weight: bold;
}
.pending-list {
  margin-top: 15px;
  border-top: 1px solid #eee;
  padding-top: 10px;
}
.submit-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
}
.submit-btn:disabled {
  background: #ccc;
}
.cancel-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style>