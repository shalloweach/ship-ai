import { createRouter, createWebHistory } from 'vue-router'

// 动态导入页面组件
const HomeView = () => import('../views/HomeView.vue')
const DensityMapView = () => import('../views/DensityMapView.vue')
const ShipsView = () => import('../views/ShipsView.vue')
const AiAnalysisView = () => import('../views/AiAnalysisView.vue')
const TrackFlow = () => import('../views/TrackFlowTrackFlow.vue')
src\views\TrackFlow\TrackFlow.vue
// 定义路由规则
const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/density-map',
    name: 'DensityMap',
    component: DensityMapView
  },
  {
    path: '/ships',
    name: 'Ships',
    component: ShipsView
  },
  {
    path: '/ai-analysis',
    name: 'AiAnalysis',
    component: AiAnalysisView
  },
  {
    path: '/track_flow',
    name: 'TrackFlow',
    component: TrackFlow
  }
  // 可以添加更多路由，例如 404 页面
  // {
  //   path: '/:pathMatch(.*)*',
  //   name: 'NotFound',
  //   component: () => import('../views/NotFoundView.vue')
  // }
]

// 创建路由器实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router