
import { createApp } from 'vue'
import { createPinia } from 'pinia' // 如果你计划使用状态管理
import App from './App.vue'
import router from './router' // 引入路由配置
import './styles/component-theme.css'
// 创建 Vue 应用实例
const app = createApp(App)

// 使用 Pinia 状态管理 (如果需要)
const pinia = createPinia()
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 挂载到 public/index.html 中的 #app 元素上
app.mount('#app')