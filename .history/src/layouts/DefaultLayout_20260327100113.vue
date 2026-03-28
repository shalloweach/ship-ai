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
  import NavBar from 'NavBar.vue'
  import TimeSlider from '../components/layout/TimeSlider.vue'
  </script>
  
  <style scoped>
  .default-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .main-content {
    flex: 1; /* 占据剩余空间 */
    overflow: auto; /* 如果内容超出，允许滚动 */
  }
  </style>