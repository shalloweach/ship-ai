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
          <button @click="handleSearch" class="search-button" :disabled="searching">
            {{ searching ? '缓存中...' : '搜索' }}
          </button>
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
            {{ isLoggedIn ? '用户中心' : '登录' }}
          </button>
        </div>
      </div>
    </header>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import axios from 'axios'

  const props = defineProps({
    logoUrl: { type: String, default: '' },
    logoAlt: { type: String, default: 'Logo' },
    logoText: { type: String, default: '船舶跟踪系统' },
    searchPlaceholder: { type: String, default: '输入MMSI搜索...' },
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

  const emit = defineEmits(['mmsi-cached', 'search-error'])

  const searchQuery = ref('')
  const isLoggedIn = ref(false)
  const searching = ref(false)
  const router = useRouter()

  // 调用缓存接口
  const cacheMmsi = async (mmsi) => {
    try {
      await axios.get('http://localhost:8877/api/ship/cacheMmsi', {
        params: { mmsi }
      })
      // 缓存成功，存储到localStorage便于其他组件使用
      localStorage.setItem('currentMmsi', mmsi)
      emit('mmsi-cached', mmsi)
      return true
    } catch (err) {
      console.error('缓存MMSI失败:', err)
      emit('search-error', err)
      return false
    }
  }

  const handleSearch = async () => {
    const mmsi = searchQuery.value.trim()
    if (!mmsi) return
    
    searching.value = true
    try {
      const success = await cacheMmsi(mmsi)
      if (success) {
        // 缓存成功后跳转到轨迹回放页并携带MMSI
        router.push({ path: '/track_flow', query: { mmsi } })
      }
    } finally {
      searching.value = false
    }
  }

  const handleLoginClick = () => {
    if (isLoggedIn.value) {
      router.push('/user-profile')
    } else {
      console.log('执行登录操作')
      // router.push('/login')
    }
  }
  </script>
  
  <style scoped>
  /* 保持原有样式，仅添加搜索按钮禁用状态 */
  .search-button:disabled {
    background-color: #6c757d;
    border-color: #6c757d;
    cursor: not-allowed;
  }

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