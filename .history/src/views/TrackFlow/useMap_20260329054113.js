// src/views/TrackFlow/useMap.js

import { ref } from 'vue'
import { useTimeSlider } from './useTimeSlider'
const resetToDefault = useTimeSlider(props.mapOp, props.mmsi, props.totalCount)
export function useMap(mapOp, shipSearchInfo) {



  // 监听 MMSI 变化自动加载
  const watchMmsi = (newMmsi) => {
    if (newMmsi) {
      resetToDefault
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