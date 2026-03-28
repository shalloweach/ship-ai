<!-- src/components/ShipDifyReport.vue -->
<template>
  <div class="mb-8">
    <div v-if="loading" class="bg-white shadow rounded-lg p-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
        <p class="text-gray-600">AI 正在分析船舶数据，请稍候...</p>
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      <p>❌ {{ error }}</p>
    </div>

    <div v-else-if="aiReport" class="bg-white shadow rounded-lg p-6">
      <h3 class="text-xl font-bold mb-4 text-gray-800">🤖 AI 智能分析报告</h3>
      <div class="prose max-w-none" v-html="formattedReport"></div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      AI 分析报告将在查询后生成
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from 'vue'

const props = defineProps({
  aiReport: {
    type: String,
    required: false,
    default: ''
  },
  loading: {
    type: Boolean,
    required: true
  },
  error: {
    type: String,
    required: false,
    default: ''
  }
})

// 格式化报告（支持 Markdown 风格标题和列表）
const formattedReport = computed(() => {
  if (!props.aiReport) return ''
  
  let html = props.aiReport
    .replace(/^#\s+(.*)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h4 class="text-md font-medium mt-3 mb-1 text-gray-700">$1</h4>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
    .replace(/(\d+)\.\s+(.*)/gm, '<li class="ml-4 mb-1">$1. $2</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 包裹列表
  html = html.replace(/(<li.*?>.*?<\/li>)+/g, match => {
    return `<ul class="list-disc ml-6 mb-3">${match}</ul>`
  })

  return html
})
</script>

<style scoped>
.prose h3, .prose h4 {
  @apply mt-4 mb-2;
}
.prose ul {
  @apply list-disc ml-6 mb-3;
}
.prose li {
  @apply ml-4 mb-1;
}
.prose strong {
  @apply font-semibold;
}
.prose em {
  @apply italic;
}
</style>