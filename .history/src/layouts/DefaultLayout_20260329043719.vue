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