// src/assets/mapRender/trajectoryPopup.js



// 📦 构建数据弹窗内容 - ✅ 所有标签严格闭合
export const buildPopupContent = (point, callbacks = {}) => {
  if (!point) return '<div class="popup-empty">📭 无数据</div>'
  
  const { onMarkClick } = callbacks
  
  // 标记按钮（仅当提供回调时）
  const markBtn = onMarkClick ? `
    <div class="popup-section">
      <button id="popup-mark-btn" class="popup-btn-primary">
        🏷️ 创建停留标记
      </button>
    </div>
  ` : ''
  
  
  return `
    <div class="popup-wrapper">
      <div class="popup-header">
        <span class="popup-title">📌 轨迹点 #${point.idx}</span>
        <span class="popup-time">${formatTime(point.utc_time)}</span>
      </div>
      
      <div class="popup-body">
        <div class="popup-row">
          <span class="popup-label">📍 坐标</span>
          <span class="popup-value">${point.lat?.toFixed(4)}, ${point.lon?.toFixed(4)}</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">⚡ 速度</span>
          <span class="popup-value">${point.speed?.toFixed(1) ?? '-'} kn</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">🧭 航向</span>
          <span class="popup-value">${point.course?.toFixed(0) ?? '-'}°</span>
        </div>
        <div class="popup-row">
          <span class="popup-label">📊 状态</span>
          <span class="popup-value">${formatNavStatus(point.navigationstatus)}</span>
        </div>
      </div>
      
      ${markBtn}
    </div>
  `
}


// 📊 状态格式化
export const formatNavStatus = (status) => {
  const MAP = {
    0: '在航', 1: '锚泊', 2: '失控', 3: '操纵受限',
    4: '吃水受限', 5: '靠泊', 6: '搁浅', 7: '捕鱼',
    8: '帆船', 9: '拖带', 10: '引航', 15: '未知'
  }
  const num = typeof status === 'string' ? parseInt(status) : Number(status)
  return MAP[num] ?? String(status ?? '-')
}

// ⏱️ 时长格式化
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分`
}