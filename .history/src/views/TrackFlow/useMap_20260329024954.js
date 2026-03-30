// src/views/TrackFlow/useMap.js

初始化地图
import getTrajectoryByIndex from '@/api/shipApi'

const loadTrajectoryByIndex = async (mmsi, 0, endIdx) => {
  if (!mmsi || startIdx == null || endIdx == null) return null
  
  try {
    // ✅ 调用后端按索引查询接口
    const result = await getTrajectoryByIndex(mmsi, startIdx, endIdx)
    
    if (result) {
      const points = Array.isArray(result) ? result : (result.points || result.data || [])
      currentPoints.value = points
      currentPointsCount.value = points.length
      return { success: true, points }
    }
    return { success: false }
  } catch (err) {
    console.error('❌ 按索引查询失败:', err)
    error.value = err.message || '轨迹加载失败'
    return { success: false, error: err }
  }
}