// src/views/TrackFlow/useMap.js

import { ref } from 'vue'
import getTrajectoryByIndex from '@/api/shipApi'
const resetToDefault = useTimeSlider(props.mapOp, props.mmsi, props.totalCount)
export function useMap(mapOp, shipSearchInfo) {
  const currentPoints = ref([])
  const currentPointsCount = ref(0)
  const error = ref(null)
  const loading = ref(false)

  const firstShowPoints = Math.min(1000, shipSearchInfo.totalCount)

  

  // 监听 MMSI 变化自动加载
  const watchMmsi = (newMmsi) => {
    if (newMmsi) {
      resetToDefault(newMmsi)
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