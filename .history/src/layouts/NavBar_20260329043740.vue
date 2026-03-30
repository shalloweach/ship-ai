src\layouts\NavBar.vue
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

      <!-- 用户区 -->
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

// 验证 MMSI
const validateMmsi = (mmsi) => /^\d{9}$/.test(mmsi)

// 显示提示
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
   
    const result = await shipApi.cacheMmsi(mmsi)
    const { success, totalCount, message } = result
    
    // 存储到 localStorage
    localStorage.setItem('currentMmsi', mmsi)
    localStorage.setItem('mmsiCacheTime', Date.now().toString())
    localStorage.setItem('mmsiTotalCount', String(totalCount))
    
    // 发射事件（让父组件更新 provide）
    emit('mmsi-cached', { mmsi, totalCount, success, message })
    
    // 提示
    if (success) {
      showStatus(`✅ 找到 ${totalCount} 条轨迹`, 'success')
    } else if (success) {
      showStatus(`⚠️ 该船舶暂无轨迹数据`, 'warning')
    } else {
      showStatus(`⚠️ ${message}`, 'warning')
    }
    
    // 跳转
    router.push({ 
      path: '/track_flow'
    })
    
  } catch (err) {
    console.error('❌ 缓存失败:', err)
    
    emit('search-error', { mmsi, error: err })
    
    if (err.message?.includes('超时')) {
      showStatus('⚠️ 请求超时，但仍可查询', 'warning')
    } else {
      showStatus('⚠️ 缓存异常，但仍可查询', 'warning')
    }
    
    router.push({ 
      path: '/track_flow', 
      query: { mmsi} 
    })
    
  } finally {
    searching.value = false
  }
}

const handleLoginClick = () => {
  if (isLoggedIn.value) {
    router.push('/user-profile')
  } else {
    showStatus('登录功能开发中', 'info')
  }
}

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