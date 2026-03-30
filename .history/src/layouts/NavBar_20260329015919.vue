



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
          :disabled="searching"
        />
        <button @click="handleSearch" class="search-button" :disabled="searching">
          {{ searching ? '🔄 缓存中...' : '🔍 搜索' }}
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

      <!-- 登录/用户 -->
      <div class="user-section">
        <button @click="handleLoginClick" class="login-button">
          {{ isLoggedIn ? '👤 用户中心' : '🔐 登录' }}
        </button>
      </div>
    </div>

    <!-- 搜索状态提示 -->
    <div v-if="searchStatus" :class="['search-toast', searchStatus.type]">
      {{ searchStatus.message }}
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// ✅ 引入统一封装的 shipApi
import shipApi from '@/api/shipApi'

const props = defineProps({
  logoUrl: { type: String, default: '' },
  logoAlt: { type: String, default: 'Logo' },
  logoText: { type: String, default: '船舶跟踪系统' },
  searchPlaceholder: { type: String, default: '输入 MMSI 搜索船舶...' },
  navLinks: {
    type: Array,
    default: () => [
      { name: '艘船', path: '/ships' },
      { name: '轨迹回放', path: '/track_flow' },
      { name: '密度图', path: '/density-map' },
      { name: 'AI 分析', path: '/ai-analysis' }
    ]
  }
})

const emit = defineEmits(['mmsi-cached', 'search-error'])

const searchQuery = ref('')
const isLoggedIn = ref(false)
const searching = ref(false)
const searchStatus = ref(null)

const router = useRouter()

// ✅ 删除本地 cacheMmsi 函数，改用 shipApi.cacheMmsi

// 验证 MMSI 格式
const validateMmsi = (mmsi) => {
  // MMSI 通常是 9 位数字
  return /^\d{9}$/.test(mmsi)
}

// 显示状态提示
const showStatus = (message, type = 'info', duration = 3000) => {
  searchStatus.value = { message, type }
  setTimeout(() => {
    if (searchStatus.value?.message === message) {
      searchStatus.value = null
    }
  }, duration)
}

// 处理搜索
const handleSearch = async () => {
  const mmsi = searchQuery.value.trim()
  
  if (!mmsi) {
    showStatus('请输入 MMSI', 'warning')
    return
  }
  
  if (!validateMmsi(mmsi)) {
    showStatus('MMSI 格式不正确（应为 9 位数字）', 'error')
    return
  }
  
  searching.value = true
  searchStatus.value = null
  
  try {
    // ✅ 调用统一接口，获取完整响应
    const result = await shipApi.cacheMmsi(mmsi)
    
    // ✅ 解构关键字段（后续 .vue 文件可直接使用）
    const { totalCount, mmsi: cachedMmsi, success, message } = result
    
    // 缓存成功标识 + 存储关键字段
    localStorage.setItem('currentMmsi', cachedMmsi)
    localStorage.setItem('mmsiCacheTime', Date.now().toString())
    localStorage.setItem('mmsiTotalCount', String(totalCount)) // ✅ 暴露 totalCount
    
    // ✅ 发射事件时携带完整数据，供父组件/其他页面使用
    emit('mmsi-cached', { 
      mmsi: cachedMmsi, 
      totalCount, 
      success, 
      message,
      raw: result  // 保留原始数据，便于扩展
    })
    
    // 根据 totalCount 给出不同提示
    if (success && totalCount > 0) {
      showStatus(`✅ 找到 ${totalCount} 条轨迹`, 'success')
    } else if (success) {
      showStatus(`⚠️ 该船舶暂无轨迹数据`, 'warning')
    } else {
      showStatus(`⚠️ ${message || '缓存异常'}`, 'warning')
    }
    
    // 跳转到轨迹回放页，携带关键参数
    router.push({ 
      path: '/track_flow', 
      query: { 
        mmsi: cachedMmsi,
        totalCount,  // ✅ 传递 totalCount 供目标页面使用
        t: Date.now()
      } 
    })
    
  } catch (err) {
    console.error('❌ 缓存 MMSI 失败:', err)
    
    // 失败时仍传递基础信息，保证链路完整
    emit('search-error', { 
      mmsi, 
      error: err,
      totalCount: 0  // ✅ 显式传递 0，避免调用方判空
    })
    
    if (err.message?.includes('超时')) {
      showStatus('⚠️ 请求超时，但仍可查询', 'warning')
    } else if (err.message?.includes('404') || err.message?.includes('未找到')) {
      showStatus('⚠️ 未找到该船舶轨迹', 'warning')
    } else {
      showStatus('⚠️ 缓存异常，但仍可查询', 'warning')
    }
    
    router.push({ 
      path: '/track_flow', 
      query: { mmsi, totalCount: 0, t: Date.now() } 
    })
    
  } finally {
    searching.value = false
  }
}

// 登录点击
const handleLoginClick = () => {
  if (isLoggedIn.value) {
    router.push('/user-profile')
  } else {
    showStatus('登录功能开发中', 'info')
    // router.push('/login')
  }
}

// 导出方法供父组件调用
defineExpose({
  setSearchQuery: (query) => { searchQuery.value = query },
  triggerSearch: handleSearch
})
</script>

<style scoped>
.navbar {
  background: linear-gradient(135deg, #1a3a5c, #2c5282);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  position: relative;
  z-index: 1000;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  gap: 1rem;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-img {
  height: 40px;
  border-radius: 4px;
}

.logo-text {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 400px;
}

.search-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 6px 0 0 6px;
  font-size: 0.95rem;
  background: rgba(255,255,255,0.95);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

.search-input:disabled {
  background: rgba(255,255,255,0.7);
  cursor: not-allowed;
}

.search-button {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.search-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.search-button:disabled {
  background: #6b7280;
  cursor: not-allowed;
  transform: none;
}

/* 导航链接 */
.nav-links {
  display: flex;
  list-style: none;
  gap: 0.3rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: rgba(255,255,255,0.85);
  font-weight: 500;
  font-size: 0.95rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255,255,255,0.15);
}

.nav-link.active {
  color: #fff;
  background: rgba(255,255,255,0.25);
  font-weight: 600;
}

/* 用户区域 */
.user-section {
  display: flex;
  align-items: center;
}

.login-button {
  padding: 0.5rem 1.2rem;
  background: transparent;
  border: 2px solid rgba(255,255,255,0.6);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.login-button:hover {
  background: rgba(255,255,255,0.15);
  border-color: #fff;
}

/* 搜索状态提示 */
.search-toast {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.5rem;
  border-radius: 0 0 8px 8px;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 1001;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.search-toast.success {
  background: #10b981;
  color: #fff;
}

.search-toast.error {
  background: #ef4444;
  color: #fff;
}

.search-toast.warning {
  background: #f59e0b;
  color: #1f2937;
}

.search-toast.info {
  background: #3b82f6;
  color: #fff;
}

/* 响应式 */
@media (max-width: 1024px) {
  .navbar-container {
    flex-wrap: wrap;
  }
  
  .search-box {
    order: 3;
    max-width: 100%;
    margin-top: 0.5rem;
  }
  
  .nav-links {
    order: 2;
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .logo-text {
    font-size: 1.2rem;
  }
  
  .nav-link {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .search-input,
  .search-button {
    padding: 0.5rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>