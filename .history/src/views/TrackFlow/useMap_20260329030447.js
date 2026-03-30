// src/views/TrackFlow/useMap.js

初始化地图

import getTrajectoryByIndex from '@/api/shipApi'
import { useMapOperation, buildPopupContent } from '@/components/mapOperation'
export function useMap(mapRef, mmsi) {
const firstShowPoints = 1000
const loadTrajectoryByIndex = async (mmsi, 0, firstShowPoints) => {
  const mapContainerRef = ref(null)
const mapOp = useMapOperation(mapContainerRef)
  try {
    const result = await getTrajectoryByIndex(mmsi, 0, firstShowPoints)
    
    if (result) {
      const points = Array.isArray(result) ? result : (result.points || result.data || [])
      currentPoints.value = points
      currentPointsCount.value = points.length
// 1️⃣ 初始化地图
await mapOp.init({ center: [31.2, 121.5], zoom: 12 })
  
// 2️⃣ 渲染轨迹（自动连线 + 弹窗）
const points = await fetchTrajectory('413000000')
mapOp.renderTrajectory(points, {
  showPoints: true,      // 显示轨迹点
  fitBounds: true,       // 自动适配视野
  lineStyle: { color: '#8b5cf6' }  // 自定义线样式
})
      
      return { success: true, points }
    }
    return { success: false }
  } catch (err) {
    console.error('❌ 按索引查询失败:', err)
    error.value = err.message || '轨迹加载失败'
    return { success: false, error: err }
  }
}