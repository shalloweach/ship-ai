// src/components/timeUtils.js

/** 秒级 → 毫秒级 */
export const toMilliseconds = (ts) => {
  if (ts == null) return null
  return ts > 1e12 ? ts : ts * 1000
}

/** 毫秒级 → 秒级 */
export const toSeconds = (ts) => {
  if (ts == null) return null
  return ts < 1e12 ? ts : Math.floor(ts / 1000)
}

/** 格式化时间戳为可读字符串 */
export const formatTimestamp = (ts, options = {}) => {
  if (!ts) return '-'
  const date = new Date(toMilliseconds(ts))
  const { showSeconds = false, locale = 'zh-CN' } = options
  return date.toLocaleString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...(showSeconds && { second: '2-digit' })
  })
}

/** 格式化日期 (年月日) */
export const formatLocalDate = (ts) => {
  if (!ts) return '-'
  return new Date(toMilliseconds(ts)).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}

/** 格式化时间 (时分) */
export const formatTimeOnly = (ts) => {
  if (!ts) return '-'
  return new Date(toMilliseconds(ts)).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit'
  })
}

/** 格式化时长 (毫秒差 → 可读字符串) */
export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '-'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}小时`
  const days = Math.round(hours / 24)
  return `${days}天`
}

/** 格式化范围值 */
export const formatRange = (value) => {
  if (value == null) return '-'
  return Number.isInteger(value) ? value.toLocaleString() : value
}

/** 数值钳制 */
export const clamp = (value, min, max) => {
  if (min != null) value = Math.max(min, value)
  if (max != null) value = Math.min(max, value)
  return value
}

export default {
  toMilliseconds, toSeconds, formatTimestamp, formatLocalDate,
  formatTimeOnly, formatDuration, formatRange, clamp
}