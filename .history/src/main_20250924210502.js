import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Leaflet 引入
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import 'leaflet.pm'
import 'leaflet.pm/dist/leaflet.pm.css'

// 修复默认图标丢失问题（Vite 不支持 require）
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

// 创建 Vue 应用实例
const app = createApp(App)

// 使用 Pinia 状态管理
app.use(createPinia())

// 使用 Vue Router
app.use(router)

// 全局挂载 Leaflet
app.config.globalProperties.$L = L

// 挂载到 public/index.html 中的 #app 元素
app.mount('#app')
