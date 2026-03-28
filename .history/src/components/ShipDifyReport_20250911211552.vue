<!-- src/components/ShipDifyReport.vue -->
<template>
    <div v-if="aiReport" class="mb-8 p-6 bg-white shadow rounded-lg">
      <h2 class="text-xl font-semibold mb-4">模块三：AI 分析报告</h2>
      <div class="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {{ aiReport }}
      </div>
    </div>
  </template>
  
  <script setup>
  defineProps({
    aiReport: {
      type: String,
      required: false
    }
  })
  </script>