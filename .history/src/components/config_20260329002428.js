// src/components/config.js

/**
 * 全局常量配置
 * 统一管理系统中的静态配置项
 */

export const CONFIG = {
  // API 基础路径
  BASE_URL: '/api',
  
  // 船舶相关配置
  SHIP: {
    DEFAULT_SPEED: 1,       // 默认播放倍速
    MAX_SPEED: 10,          // 最大播放倍速
    MIN_SPEED: 0.5,         // 最小播放倍速
    PRELOAD_THRESHOLD: 1000,// 预加载阈值（剩余点数）
    MARKER_ANIMATION_DURATION: 1000, // 标记动画时长(ms)
  },

  // 地图配置
  MAP: {
    DEFAULT_ZOOM: 12,
    MIN_ZOOM: 3,
    MAX_ZOOM: 18,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; OpenStreetMap contributors'
  },

  // 停留点类型配置
  STAY_TYPES: [
    { value: '靠泊', label: '靠泊', icon: '🏭' },
    { value: '抛锚', label: '抛锚', icon: '⚓' },
    { value: '滞航', label: '滞航', icon: '⚠️' },
    { value: '作业', label: '作业', icon: '📦' }
  ],

  // 时间格式
  TIME_FORMAT: {
    DISPLAY: 'YYYY-MM-DD HH:mm:ss',
    ISO: 'YYYY-MM-DDTHH:mm:ssZ',
    TIMESTAMP: 'X'
  }
};

export default CONFIG;