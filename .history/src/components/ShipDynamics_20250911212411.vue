<!-- src/components/ShipDynamics.vue -->
<template>
    <div v-if="itinerary.length > 0" class="mb-8 p-6 bg-white shadow rounded-lg">
      <h2 class="text-xl font-semibold mb-4">模块二：2023年行程信息</h2>
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="border px-4 py-2 bg-gray-100 text-left">起始港口</th>
            <th class="border px-4 py-2 bg-gray-100 text-left">目的港口</th>
            <th class="border px-4 py-2 bg-gray-100 text-left">开始时间</th>
            <th class="border px-4 py-2 bg-gray-100 text-left">结束时间</th>
            <th class="border px-4 py-2 bg-gray-100 text-left">停留类型</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in itinerary" :key="index">
            <td class="border px-4 py-2">{{ item.prevPort || '—' }}</td>
            <td class="border px-4 py-2">{{ item.port_name }}</td>
            <td class="border px-4 py-2">{{ formatTime(item.Start_unixtime) }}</td>
            <td class="border px-4 py-2">{{ formatTime(item.End_unixtime) }}</td>
            <td class="border px-4 py-2">{{ item.stay_type === 1 ? '靠泊' : '锚泊' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script setup>
  defineProps({
    itinerary: {
      type: Array,
      required: true
    }
  })
  
  const formatTime = (unixtime) => {
    if (!unixtime) return '—'
    const date = new Date(unixtime * 1000)
    return date.toLocaleString('zh-CN')
  }
  </script>