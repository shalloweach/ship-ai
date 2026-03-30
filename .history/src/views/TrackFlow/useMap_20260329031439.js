// src/views/TrackFlow/useMap.js

import { ref } from 'vue'
import getTrajectoryByIndex from '@/api/shipApi'

export function useMap(mapOp, shipSearchInfo) {
  const currentPoints = ref([])
  const currentPointsCount = ref(0)
  const error = ref(null)
  const loading = ref(false)

  const firstShowPoints = 1000

  const loadTrajectoryByIndex = async (mmsi, start = 0, limit = firstShowPoints) => {
    loading.value = true
    error.value = null

    try {
      const result = await getTrajectoryByIndex(mmsi, start, limit)
      
      if (result) {
        const points = Array.isArray(result) ? result : (result.points || result.data || [])
        currentPoints.value = points
        currentPointsCount.value = points.length

        mapOp.renderTrajectory(points, {
          showPoints: true,
          fitBounds: true,
          lineStyle: { color: '#8b5cf6' }
        })
        
        return { success: true, points }
      }
      return { success: false }
    } catch (err) {
      console.error('轨迹查询失败:', err)
      error.value = err.message || '轨迹加载失败'
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  // 监听 MMSI 变化自动加载
  const watchMmsi = (newMmsi) => {
    if (newMmsi) {
      loadTrajectoryByIndex(newMmsi)
    }
  }

  return {
    currentPoints,
    currentPointsCount,
    error,
    loading,
    loadTrajectoryByIndex,
    watchMmsi
  }
}