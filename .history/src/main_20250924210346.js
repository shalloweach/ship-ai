import 'leaflet/dist/leaflet.css'
// 引入Leaflet对象 挂载到Vue上，便于全局使用，也可以单独页面中单独引用
import * as L from 'leaflet'
import 'leaflet.pm'
import 'leaflet.pm/dist/leaflet.pm.css'

Vue.config.productionTip = false;
Vue.L = Vue.prototype.$L = L

/* leaflet icon */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})



// 创建 Vue 应用实例
const app = createApp(App)

// 使用 Pinia 状态管理 (如果需要)
const pinia = createPinia()
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 挂载到 public/index.html 中的 #app 元素上
app.mount('#app')