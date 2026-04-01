<template>
  <!-- 使用默认布局包裹整个应用 -->
  <DefaultLayout />
</template>

<script setup>
// 引入默认布局组件
import DefaultLayout from './layouts/DefaultLayout.vue'

import './styles/component-theme.css'
</script>

<style>
/* 可以在这里放置全局样式 */
#app {
  height: 100vh; /* 让根元素占满视口高度 */
  display: flex;
  flex-direction: column;
}
/* 重置一些默认样式，确保布局正确 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>