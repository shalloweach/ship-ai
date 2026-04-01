// src/components/StayMarkPanel/config.js
export const MARKER_CONFIG = {
    // 停留类型配置
    STAY_TYPES: [
      { value: '靠泊', label: '⚓ 靠泊', color: '#3b82f6' },
      { value: '锚泊', label: '⚓ 锚泊', color: '#8b5cf6' },
      { value: '作业', label: '🔧 作业', color: '#f59e0b' },
      { value: '待泊', label: '⏳ 待泊', color: '#6b7280' },
      { value: '其他', label: '📦 其他', color: '#64748b' }
    ],
    
    // 默认港口列表
    DEFAULT_PORTS: [
      '上海港', '宁波舟山港', '深圳港', '广州港', '青岛港',
      '天津港', '厦门港', '大连港', '营口港', '其他'
    ],
    
    // 标记状态
    STATUS: {
      DRAFT: 'draft',
      SYNCED: 'synced',
      ERROR: 'error'
    }
  }
  
  export default MARKER_CONFIG