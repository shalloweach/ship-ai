<!-- src/components/ShipDynamics.vue -->
<template>
  <div v-if="itineraryData" class="mb-8">
    <!-- 总统计 -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">📊 总统计</h3>
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border px-3 py-2 text-left">指标</th>
            <th class="border px-3 py-2 text-left">靠泊</th>
            <th class="border px-3 py-2 text-left">锚泊</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2 font-medium">次数</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.totalBerthingCount }}</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.totalAnchoringCount }}</td>
          </tr>
          <tr class="bg-gray-50">
            <td class="border px-3 py-2 font-medium">总时长（分钟）</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.totalBerthingMinutes }}</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.totalAnchoringMinutes }}</td>
          </tr>
          <tr>
            <td class="border px-3 py-2 font-medium">平均时长（分钟）</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.avgBerthingMinutes.toFixed(1) }}</td>
            <td class="border px-3 py-2">{{ itineraryData.summaryStats.avgAnchoringMinutes.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 行程列表 -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">📋 行程列表（共 {{ itineraryData.itineraryList.length }} 条）</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-2 py-1">时间</th>
              <th class="border px-2 py-1">港口</th>
              <th class="border px-2 py-1">时长(分钟)</th>
              <th class="border px-2 py-1">类型</th>
              <th class="border px-2 py-1">坐标</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in itineraryData.itineraryList" :key="index" :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'">
              <td class="border px-2 py-1 whitespace-nowrap">
                {{ formatDate(item.startUnixtime) }}<br>
                <span class="text-xs text-gray-500">({{ item.year }}-{{ pad(item.month) }}-{{ pad(item.day) }})</span>
              </td>
              <td class="border px-2 py-1">{{ item.portName || '—' }}</td>
              <td class="border px-2 py-1 text-center">{{ item.durationMinutes }}</td>
              <td class="border px-2 py-1 text-center">
                <span :class="item.stayType === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'" class="px-2 py-0.5 rounded text-xs">
                  {{ item.stayType === 1 ? '靠泊' : '锚泊' }}
                </span>
              </td>
              <td class="border px-2 py-1 text-xs">
                {{ item.centerLat.toFixed(4) }}, {{ item.centerLon.toFixed(4) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 港口统计 -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">⚓ 港口统计</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-3 py-2 text-left">港口</th>
              <th class="border px-3 py-2 text-center">靠泊次数</th>
              <th class="border px-3 py-2 text-center">靠泊总时长</th>
              <th class="border px-3 py-2 text-center">锚泊次数</th>
              <th class="border px-3 py-2 text-center">锚泊总时长</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stat, index) in itineraryData.portStats" :key="index" :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'">
              <td class="border px-3 py-2 font-medium">{{ stat.portName }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.berthingCount }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.berthingTotalMinutes }} 分钟</td>
              <td class="border px-3 py-2 text-center">{{ stat.anchoringCount }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.anchoringTotalMinutes }} 分钟</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 月度统计 -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4">📈 月度统计</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="border px-3 py-2 text-left">月份</th>
              <th class="border px-3 py-2 text-center">靠泊次数</th>
              <th class="border px-3 py-2 text-center">靠泊总时长</th>
              <th class="border px-3 py-2 text-center">锚泊次数</th>
              <th class="border px-3 py-2 text-center">锚泊总时长</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stat, index) in itineraryData.monthlyStats" :key="index" :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'">
              <td class="border px-3 py-2 font-medium">{{ stat.year }}-{{ pad(stat.month) }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.berthingCount }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.berthingTotalMinutes }} 分钟</td>
              <td class="border px-3 py-2 text-center">{{ stat.anchoringCount }}</td>
              <td class="border px-3 py-2 text-center">{{ stat.anchoringTotalMinutes }} 分钟</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 加载中 -->
  <div v-else-if="loading" class="text-center py-8">
    <p class="text-gray-600">正在加载行程数据...</p>
  </div>

  <!-- 无数据 -->
  <div v-else class="text-center py-8 text-gray-500">
    无行程数据
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from 'vue'

const props = defineProps({
  itinerary: {
    type: Object,
    required: false,
    default: null
  }
})

const loading = ref(false)
const itineraryData = computed(() => props.itinerary)

// 格式化 Unix 时间戳
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 补零
const pad = (num) => num.toString().padStart(2, '0')
</script>

<style scoped>
table {
  min-width: 600px;
}
</style>