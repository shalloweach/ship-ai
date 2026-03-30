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