// src/assets/mapRender/trajectoryPopup.js

// 🕐 时间格式化
const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-')
  }
  
  const formatValue = (value, unit = '', decimal = 1) => {
    if (value == null || isNaN(value)) return '-'
    return `${Number(value).toFixed(decimal)}${unit}`
  }
  // 📍 坐标格式化
  const formatCoord = (value) => {
    return value != null ? Number(value).toFixed(4) : '-'
  }
  
  // 📦 构建弹窗内容（纯展示，无交互）
  export const buildPopupContent = (point) => {
    if (!point) return '<div class="popup-empty">📭 无数据</div>'
    
    const lng = point.lng ?? point.lon ?? '-'
    const lat = point.lat ?? '-'
    
    return `
      <div class="ts-popup ts-popup-point">
        <div class="popup-header">
          <span class="popup-icon">📍</span>
          <span class="popup-title">轨迹点 #${point.idx ?? '-'}</span>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="popup-label">🕐 时间</span>
            <span class="popup-value">${formatTime(point.timestamp)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">📍 坐标</span>
            <span class="popup-value">${formatCoord(lat)}, ${formatCoord(lng)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">⚡ 速度</span>
            <span class="popup-value">${formatValue(point.speed, ' kn')}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">🧭 航向</span>
            <span class="popup-value">${formatValue(point.course ?? point.heading, '°', 0)}</span>
          </div>
          ${point.destination ? `
          <div class="popup-row">
            <span class="popup-label">🎯 目的地</span>
            <span class="popup-value">${point.destination}</span>
          </div>` : ''}
          ${point.draught != null ? `
          <div class="popup-row">
            <span class="popup-label">🌊 吃水</span>
            <span class="popup-value">${formatValue(point.draught, ' m')}</span>
          </div>` : ''}
          ${point.navigationStatus ? `
          <div class="popup-row">
            <span class="popup-label">📊 状态</span>
            <span class="popup-value">${point.navigationStatus}</span>
          </div>` : ''}
        </div>
      </div>
    `
  }