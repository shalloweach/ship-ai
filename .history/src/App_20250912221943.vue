<!-- src/App.vue -->
<template>
  <div class="container mx-auto p-6">
    <!-- 搜索框（保持不变） -->
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold mb-4">集装箱船舶跟踪信息系统</h1>
      <div class="flex justify-center gap-2">
        <input
          v-model="mmsi"
          @keyup.enter="searchShip"
          type="text"
          placeholder="请输入 MMSI 号（9位数字）"
          class="border rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="searchShip"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg"
        >
          查询
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">正在查询中，请稍候...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      {{ error }}
    </div>

    <!-- 船舶属性 -->
    <ShipStatic :ship-info="shipInfo" />

    <!-- 船舶行程 -->
    <ShipDynamics :itinerary="itineraryData" />

    <!-- 无数据提示 -->
    <div v-if="!loading && !error && !shipInfo" class="text-center text-gray-500 py-8">
      输入 MMSI 号以查看船舶信息。
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ShipStatic from './components/ShipStatic.vue'
import ShipDynamics from './components/ShipDynamics.vue' // ✅ 新增导入
import { getShipAttributes, getShipItinerary } from './api/shipApi.js'

const mmsi = ref('')
const loading = ref(false)
const error = ref('')
const shipInfo = ref(null)
const itineraryData = ref(null) // ✅ 新增

const searchShip = async () => {
  if (!mmsi.value || !/^\d{9}$/.test(mmsi.value.trim())) {
    error.value = '请填写有效的9位MMSI号码'
    return
  }

  loading.value = true
  error.value = ''
  shipInfo.value = null
  itineraryData.value = null // ✅ 重置

  try {
    // 获取属性
    shipInfo.value = await getShipAttributes(mmsi.value)

    // 获取行程（指定年份 2023）
    itineraryData.value = await getShipItinerary(mmsi.value, '2023')

  } catch (err) {
    error.value = '查询失败：' + err.message
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style>
.container { max-width: 1200px; }
</style>