<template>
    <div class="track_flow">
      <h1>联系我们</h1>
      <p>联系方式或联系表单。</p>
      <!-- 联系内容 -->
    </div>

    <!-- 底部时间轴 -->
      <TimeSlider />

  </template>
  
  <script setup>
  import TimeSlider from '../components/layout/TimeSlider.vue'
  </script>
  
  <style scoped>
  .contact-view {
    padding: 2rem;
  }
  </style>