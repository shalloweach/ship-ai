// src/components/config.js

export const TIME_STEPS = [1, 5, 10, 30, 60, 120, 360, 720] // 分钟
export const INDEX_STEPS = [1, 2, 5, 10, 50, 100, 500, 1000, 5000]
export const DEFAULT_TIME_STEP = 10
export const DEFAULT_INDEX_STEP = 10

// ========== 🕐 时间相关配置 ==========
export const TIME_CONFIG = {
    TIME_STEPS: [1, 5, 10, 30, 60, 120],
    DEFAULT_TIME_STEP: 10,
    INDEX_STEPS: [1, 10, 50, 100, 500],
    DEFAULT_INDEX_STEP: 10,
    MIN_TIME_INTERVAL: 1  // 最小时间间隔(秒)
  }
  
  // ========== ▶️ 播放相关配置 ==========
  export const PLAYER_CONFIG = {
    BATCH_SIZE: 5000,              // 每批请求点数
    PRELOAD_THRESHOLD: 1000,       // 预加载阈值
    SPEEDS: [0.5, 1, 2, 4, 8],     // 倍速选项
    DEFAULT_SPEED: 1,
    BASE_INTERVAL: 100,            // 基础播放间隔(毫秒/点)
    MODES: {
      POINT_BY_POINT: 'point-by-point',
      LINE_FIRST: 'line-first'
    },
    DEFAULT_MODE: 'line-first'
  }
  
  // ========== 📍 停留标记配置 ==========
  export const MARKER_CONFIG = {
    STAY_TYPES: [
      { value: '靠泊', label: '🏭 靠泊', color: '#10b981' },
      { value: '锚泊', label: '⚓ 锚泊', color: '#3b82f6' },
      { value: '异常', label: '⚠️ 异常', color: '#ef4444' },
      { value: '其他', label: '📦 其他', color: '#6b7280' }
    ],
    DEFAULT_PORTS: ['上海', '宁波', '深圳', '广州', '青岛', '天津', '厦门', '大连', '其他'],
    STATUS: {
      DRAFT: 'draft',
      SUBMITTED: 'submitted',
      SYNCED: 'synced'
    }
  }
  
  // ========== 🗺️ 地图样式配置 ==========
  export const MAP_STYLES = {
    trajectory: { color: '#3b82f6', weight: 3, opacity: 0.8 },
    trajectoryPlaying: { color: '#10b981', weight: 4, opacity: 1 },
    shipIcon: {
      size: 32,
      rotation: true,
      html: `<div style="transform: rotate({heading}deg); transition: transform 0.3s ease;">🚢</div>`
    },
    stayMarker: {
      靠泊: { color: '#10b981', fillOpacity: 0.2, icon: '🏭' },
      锚泊: { color: '#3b82f6', fillOpacity: 0.2, icon: '⚓' },
      异常: { color: '#ef4444', fillOpacity: 0.3, icon: '⚠️' },
      其他: { color: '#6b7280', fillOpacity: 0.15, icon: '📦' }
    }
  }

// ========== 🔗 API 配置 ==========

  export default {
    TIME_CONFIG, PLAYER_CONFIG, MARKER_CONFIG, MAP_STYLES, API_CONFIG
  }