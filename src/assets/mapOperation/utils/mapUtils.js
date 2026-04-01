/**
 * 地图通用工具函数
 */

/**
 * 解析轨迹点为 AMap.LngLat（兼容多种格式）
 */
export const parsePointToLngLat = (point) => {
    if (!point) return null
    
    // 对象格式: { lng, lat } / { lon, latitude } 等
    if (typeof point === 'object' && !Array.isArray(point)) {
      const lng = point.lon ?? point.lng ?? point.longitude
      const lat = point.lat ?? point.latitude
      
      if (typeof lng === 'number' && typeof lat === 'number') {
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          return new AMap.LngLat(lng, lat)
        } else {
          console.warn('⚠️ 坐标超出有效范围:', { lng, lat })
          return null
        }
      }
    }
    
    // 数组格式: [lng, lat] 或 [lat, lng]
    if (Array.isArray(point) && point.length >= 2) {
      const [a, b] = point
      if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
        return new AMap.LngLat(a, b)
      } else if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        return new AMap.LngLat(b, a)
      }
    }
    
    console.warn('⚠️ 无法解析轨迹点格式:', point)
    return null
  }