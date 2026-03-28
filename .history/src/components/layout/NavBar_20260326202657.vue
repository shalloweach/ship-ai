<template>
    <header class="navbar">
      <div class="navbar-container">
        <!-- Logo -->
        <div class="logo">
          <img v-if="logoUrl" :src="logoUrl" :alt="logoAlt" class="logo-img" />
          <span v-else class="logo-text">{{ logoText }}</span>
        </div>
  
        <!-- 搜索框 -->
        <div class="search-box">
          <input
            type="text"
            :placeholder="searchPlaceholder"
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            class="search-input"
          />
          <button @click="handleSearch" class="search-button">搜索</button>
        </div>
  
        <!-- 导航链接 -->
        <nav class="nav-links">
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.path"
            class="nav-link"
            active-class="active"
          >
            {{ link.name }}
          </router-link>
        </nav>
  
        <!-- 登录图标/用户信息 -->
        <div class="user-section">
          <button @click="handleLoginClick" class="login-button">
            <!-- 这里可以使用图标库，例如 Font Awesome -->
            <!-- <i class="fas fa-user"></i> -->
            {{ isLoggedIn ? '用户中心' : '登录' }}
          </button>
        </div>
      </div>
    </header>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  
  // Props (可选，用于从父组件传递配置)
  const props = defineProps({
    logoUrl: {
      type: String,
      default: '' // 如果没有图片URL，则显示文字Logo
    },
    logoAlt: {
      type: String,
      default: 'Logo'
    },
    logoText: {
      type: String,
      default: '船舶跟踪系统'
    },
    searchPlaceholder: {
      type: String,
      default: '搜索...'
    },
    // 导航链接数据
    navLinks: {
      type: Array,
      default: () => [
        { name: '艘船', path: '/ships' },
        { name: '轨迹回放', path: '/track_flow' },
        { name: '密度图', path: '/density-map' },
        { name: 'AI分析', path: '/ai-analysis' }
      ]
    }
  })
  
  // 状态
  const searchQuery = ref('')
  const isLoggedIn = ref(false) // 示例状态，实际应从状态管理或API获取
  
  // Router 实例
  const router = useRouter()
  
  // 方法
  const handleSearch = () => {
    if (searchQuery.value.trim()) {
      // 处理搜索逻辑，例如跳转到搜索结果页或触发全局搜索事件
      console.log('搜索:', searchQuery.value)
      // 示例：可以 emit 一个事件给父组件或布局
      // emit('search', searchQuery.value)
      // 或者跳转到一个搜索结果页面
      // router.push({ name: 'SearchResults', query: { q: searchQuery.value } })
    }
  }
  
  const handleLoginClick = () => {
    if (isLoggedIn.value) {
      // 跳转到用户中心
      router.push('/user-profile') // 假设你有这个路由
    } else {
      // 执行登录逻辑，例如显示登录弹窗或跳转登录页
      console.log('执行登录操作')
      // 示例：跳转到登录页
      // router.push('/login')
    }
  }
  </script>
  
  <style scoped>
  .navbar {
    background-color: #f8f9fa; /* 轻微的背景色 */
    border-bottom: 1px solid #dee2e6; /* 底部分割线 */
    padding: 0.5rem 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* 添加阴影 */
  }
  
  .navbar-container {
    display: flex;
    align-items: center;
    justify-content: space-between; /* Logo 左，搜索框中，链接和用户右 */
    max-width: 1200px; /* 限制最大宽度 */
    margin: 0 auto; /* 居中 */
  }
  
  .logo {
    display: flex;
    align-items: center;
  }
  
  .logo-img {
    height: 40px; /* 调整 Logo 高度 */
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: bold;
    color: #343a40;
  }
  
  .search-box {
    display: flex;
    align-items: center;
  }
  
  .search-input {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px 0 0 4px; /* 左边圆角 */
    width: 200px; /* 调整宽度 */
    font-size: 1rem;
  }
  
  .search-button {
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: 1px solid #007bff;
    border-radius: 0 4px 4px 0; /* 右边圆角 */
    cursor: pointer;
    font-size: 1rem;
  }
  
  .search-button:hover {
    background-color: #0056b3;
  }
  
  .nav-links {
    display: flex;
    list-style: none;
  }
  
  .nav-link {
    margin: 0 1rem;
    text-decoration: none;
    color: #495057;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
  }
  
  .nav-link:hover {
    color: #0056b3;
    background-color: #e9ecef;
  }
  
  .nav-link.active {
    color: #fff;
    background-color: #007bff;
  }
  
  .user-section {
    display: flex;
    align-items: center;
  }
  
  .login-button {
    background-color: transparent;
    border: 1px solid #007bff;
    color: #007bff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
  }
  
  .login-button:hover {
    background-color: #007bff;
    color: white;
  }
  </style>