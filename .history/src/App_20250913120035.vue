<!-- src/App.vue -->
<template>
    <div class="container mx-auto p-6">
      <!-- 搜索框 -->
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
      <div v-if="loading && !aiLoading" class="text-center py-8">
        <p class="text-gray-600">正在查询船舶数据，请稍候...</p>
      </div>
  
      <!-- 错误提示 -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {{ error }}
      </div>
  
      <!-- 船舶属性 -->
      <ShipStatic :ship-info="shipInfo" />
  
      <!-- 船舶行程 -->
      <ShipDynamics :itinerary="itineraryData" />
  
      <!-- AI 分析报告 -->
      <ShipDifyReport 
        :ai-report="aiReport" 
        :loading="aiLoading" 
        :error="aiError" 
      />
  
      <!-- Dify 聊天框 -->
      <div v-if="shipInfo" class="mt-8">
        <h3 class="text-xl font-bold mb-4">💬 与 AI 聊天助手对话</h3>
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <iframe
            :src="difyChatUrl"
            style="width: 100%; height: 600px; min-height: 600px"
            frameborder="0"
            allow="microphone"
            title="Dify AI 聊天助手"
          ></iframe>
        </div>
      </div>
  
      <!-- 无数据提示 -->
      <div v-if="!loading && !error && !shipInfo" class="text-center text-gray-500 py-8">
        输入 MMSI 号以查看船舶信息。
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import ShipStatic from './components/ShipStatic.vue'
  import ShipDynamics from './components/ShipDynamics.vue'
  import ShipDifyReport from './components/ShipDifyReport.vue'
  import { getShipAttributes, getShipItinerary } from './api/shipApi.js'
  import { generateAIReport } from './api/difyApi.js'
  
  const mmsi = ref('')
  const loading = ref(false)
  const aiLoading = ref(false)
  const error = ref('')
  const aiError = ref('')
  const shipInfo = ref(null)
  const itineraryData = ref(null)
  const aiReport = ref('')
  
  // ✅ 计算 Dify 聊天框 URL（根据 MMSI 动态生成）
  const difyChatUrl = computed(() => {
    if (mmsi.value) {
      // 你可以根据需要传递参数，比如 ?mmsi=209138000
      return `http://106.15.176.173/chatbot/qylJxmAStyBnzDZc?mmsi=${mmsi.value}`
    }
    return 'http://106.15.176.173/chatbot/qylJxmAStyBnzDZc'
  })
  
  const searchShip = async () => {
    if (!mmsi.value || !/^\d{9}$/.test(mmsi.value.trim())) {
      error.value = '请填写有效的9位MMSI号码'
      return
    }
  
    // 重置状态
    loading.value = true
    error.value = ''
    shipInfo.value = null
    itineraryData.value = null
    aiReport.value = ''
    aiError.value = ''
  
    try {
      // 获取船舶属性
      shipInfo.value = await getShipAttributes(mmsi.value)
  
      // 获取行程数据
      itineraryData.value = await getShipItinerary(mmsi.value, '2023')
  
      // 生成 AI 报告
      aiLoading.value = true
      aiReport.value = await generateAIReport(mmsi.value, shipInfo.value, itineraryData.value)
  
    } catch (err) {
      if (aiLoading.value) {
        aiError.value = 'AI 分析失败：' + err.message
      } else {
        error.value = '查询失败：' + err.message
      }
      console.error(err)
    } finally {
      loading.value = false
      aiLoading.value = false
    }
  }
  </script>
  
  <style>
  .container { max-width: 1200px; }
  </style>