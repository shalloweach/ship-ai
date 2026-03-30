// src/components/timeUtils.js

/**
 * 时间格式化工具函数
 * 统一处理系统中的时间转换和显示
 */

/**
 * 将时间戳转换为格式化字符串
 * @param {number|string} timestamp - 时间戳 (秒或毫秒)
 * @param {string} format - 输出格式，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!timestamp) return '';
  
  // 兼容秒和毫秒时间戳
  let ts = Number(timestamp);
  if (ts < 10000000000) {
    ts *= 1000; // 如果是秒，转为毫秒
  }
  
  const date = new Date(ts);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 将时间戳转换为日期字符串 (YYYY-MM-DD)
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatDate(timestamp) {
  return formatTime(timestamp, 'YYYY-MM-DD');
}

/**
 * 将时间戳转换为时间字符串 (HH:mm:ss)
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatTimeString(timestamp) {
  return formatTime(timestamp, 'HH:mm:ss');
}

/**
 * 计算两个时间戳之间的持续时间（人类可读格式）
 * @param {number} start 
 * @param {number} end 
 * @returns {string} 例如："2小时 30分"
 */
export function getDuration(start, end) {
  if (!start || !end) return '';
  const diff = Math.abs(end - start);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分`);
  
  return parts.length > 0 ? parts.join(' ') : '不到1分钟';
}

/**
 * 获取当前时间戳 (秒)
 * @returns {number}
 */
export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}