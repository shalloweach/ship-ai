// src/components/TimeSliderPanel/timeUtils.js

/**
 * 格式化时间戳 (秒) 为本地日期时间字符串
 */
export const formatTimestamp = (ts) => {
    if (ts === null || ts === undefined) return '--:--:--'
    const d = new Date(ts * 1000)
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-')
  }
  
  /**
   * 格式化时间戳为本地日期（含星期）
   */
  export const formatLocalDate = (ts) => {
    if (ts === null || ts === undefined) return ''
    const d = new Date(ts * 1000)
    return d.toLocaleString('zh-CN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' 
    }).replace(/\//g, '-')
  }
  
  /**
   * 格式化时间戳为仅时间部分
   */
  export const formatTimeOnly = (ts) => {
    if (ts === null || ts === undefined) return '--:--'
    const d = new Date(ts * 1000)
    return d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  /**
   * 格式化时长（秒）为可读字符串
   */
  export const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '-'
    seconds = Math.abs(seconds)
    if (seconds < 60) return `${seconds} 秒`
    if (seconds < 3600) return `${Math.floor(seconds/60)} 分钟`
    if (seconds < 86400) return `${Math.floor(seconds/3600)} 小时`
    return `${Math.floor(seconds/86400)} 天`
  }
  
  /**
   * 安全格式化范围值
   */
  export const formatRange = (val) => {
    if (val === null || val === undefined) return '-'
    return String(val)
  }
  
  /**
   * 数值夹逼工具
   */
  export const clamp = (val, min, max) => {
    if (min === null || max === null) return val
    return Math.max(min, Math.min(max, val))
  }