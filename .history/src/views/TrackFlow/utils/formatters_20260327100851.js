// src/views/TrackFlow/utils/formatters.js

/**
 * 格式化时间戳为本地日期时间字符串
 */
export const formatTime = (ts) => {
    if (!ts) return '-'
    const date = new Date(ts * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
  
  /**
   * 格式化数值（带单位）
   */
  export const formatValue = (val, unit) => {
    return val !== null && val !== undefined && val !== '' ? `${val}${unit}` : '-'
  }
  
  /**
   * 格式化时长（秒）为可读字符串
   */
  export const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '-'
    seconds = Math.abs(seconds)
    if (seconds < 60) return `${seconds} 秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时`
    return `${Math.floor(seconds / 86400)} 天`
  }
  
  /**
   * 格式化坐标显示
   */
  export const formatCoordinate = (val, precision = 4) => {
    if (val === null || val === undefined || isNaN(val)) return '-'
    return Number(val).toFixed(precision)
  }