<!-- src/layouts/DefaultLayout.vue -->
<template>
  <div class="default-layout">
    <!-- 顶层导航栏 - ✅ 添加事件监听 -->
    <NavBar 
      @mmsi-cached="handleMmsiCached"
      @search-error="handleSearchError"
    />

    <!-- 主要内容区域 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部时间轴 -->
    <!-- <TimeSlider /> -->
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

// ✅ 处理缓存成功事件（来自 NavBar）
const handleMmsiCached = ({ mmsi, totalCount, success, message, raw }) => {
  shipSearchInfo.value = {
    mmsi: mmsi || '',
    totalCount: Number(totalCount) || 0,
    success: success ?? false,
    message,
    timestamp: Date.now(),
    raw  // 保留原始数据供扩展
  }
  // ✅ 通过 provide 传递给所有子路由组件
  provide('shipSearchInfo', shipSearchInfo.value)
}

// ✅ 处理搜索错误事件
const handleSearchError = ({ mmsi, error, totalCount = 0 }) => {
  shipSearchInfo.value = {
    mmsi: mmsi || '',
    totalCount: Number(totalCount) || 0,
    success: false,
    error: error?.message || '搜索失败',
    timestamp: Date.now()
  }
  provide('shipSearchInfo', shipSearchInfo.value)
}

// ✅ 初始化 provide（防止首次加载时无数据）
provide('shipSearchInfo', shipSearchInfo.value)

</script>


<!-- src\layouts\DefaultLayout.vue -->
<template>
    <div class="default-layout">
      <!-- 顶层导航栏 -->
      <NavBar />
  
      <!-- 主要内容区域，显示匹配的路由视图 -->
      <main class="main-content">
        <router-view />
      </main>
  
      <!-- 底部时间轴 -->
      <!-- <TimeSlider /> -->
    </div>
  </template>
  
  <script setup>
  // 引入布局所需的组件
  import NavBar from './NavBar.vue'
  
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