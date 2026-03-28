// src/views/TrackFlow/utils/dataParser.js

/**
 * 解析原始轨迹点数据为标准格式
 */
export const parsePoints = (rawPoints) => {
    if (!Array.isArray(rawPoints)) return []
    
    return rawPoints
      .map(p => ({
        idx: Number(p.idx) ?? 0,
        lat: Number(p.lat) ?? Number(p.latitude) ?? 0,
        lon: Number(p.lon) ?? Number(p.longitude) ?? Number(p.lng) ?? 0,
        timestamp: Number(p.utc_time) ?? Number(p.timestamp) ?? 0,
        speed: p.speed !== undefined ? Number(p.speed) : null,
        course: p.course !== undefined ? Number(p.course) : null,
        heading: p.heading !== undefined ? Number(p.heading) : null,
        destination: p.destination || '-',
        draught: p.draught !== undefined ? Number(p.draught) : null,
        navigationStatus: p.navigationstatus || p.navigation_status || '-',
        _raw: p  // 保留原始数据供扩展使用
      }))
      .filter(p => 
        p.lat && p.lon && 
        !isNaN(p.lat) && !isNaN(p.lon) &&
        p.lat >= -90 && p.lat <= 90 &&
        p.lon >= -180 && p.lon <= 180
      )
  }
  
  /**
   * 从点数据中提取时间范围
   */
  export const extractTimeRange = (points) => {
    const timestamps = points
      .map(p => p.timestamp)
      .filter(t => t && t > 0)
    
    if (timestamps.length === 0) return { min: null, max: null }
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    }
  }
  
  /**
   * 从点数据中提取索引范围
   */
  export const extractIndexRange = (points) => {
    const indices = points
      .map(p => p.idx)
      .filter(i => i !== undefined && i !== null)
    
    if (indices.length === 0) return { min: 0, max: 0 }
    return {
      min: Math.min(...indices),
      max: Math.max(...indices)
    }
  }