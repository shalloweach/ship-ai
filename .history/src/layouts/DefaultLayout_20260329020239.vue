<!-- src/layouts/DefaultLayout.vue -->
<template>
  <div class="default-layout">
    <NavBar 
      @mmsi-cached="handleMmsiCached"
      @search-error="handleSearchError"
    />

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { provide, ref } from 'vue'
import NavBar from './NavBar.vue'

// ✅ 响应式存储搜索到的船舶信息
const shipSearchInfo = ref({
  mmsi: '',
  totalCount: 0,
  success: false,
  timestamp: null
})

// ✅ 处理缓存成功事件
const handleMmsiCached = (data) => {
  shipSearchInfo.value = {
    ...data,
    timestamp: Date.now()
  }
  provide('shipSearchInfo', shipSearchInfo.value)
}

// ✅ 处理搜索错误事件
const handleSearchError = ({ mmsi, error }) => {
  shipSearchInfo.value = {
    mmsi: mmsi || '',
    totalCount: 0,
    success: false,
    error: error?.message || '搜索失败',
    timestamp: Date.now()
  }
  provide('shipSearchInfo', shipSearchInfo.value)
}

// ✅ 初始化 provide
provide('shipSearchInfo', shipSearchInfo.value)
</script>



 
 <style scoped>
  .default-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;        /* ✅ 关键：占满整个视口高度 */
    width: 100vw;
    overflow: hidden;     /* ✅ 防止双重滚动条 */
  }

  .main-content {
    flex: 1;              /* ✅ 占据导航栏下方剩余空间 */
    overflow: hidden;     /* ✅ 滚动交给子组件处理 */
    display: flex;        /* ✅ 支持子组件的左右布局 */
  }
  </style>