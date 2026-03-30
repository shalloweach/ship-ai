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
  
  // 📊 通用数值格式化
  const formatValue = (value, unit = '', decimal = 1) => {
    if (value == null || isNaN(value)) return '-'
    return `${Number(value).toFixed(decimal)}${unit}`
  }
  
  // 📍 坐标格式化
  const formatCoord = (value) => {
    return value != null ? Number(value).toFixed(4) : '-'
  }
  
  // 📦 构建弹窗内容（纯展示，无交互）
  export const buildPopupContent = (point, idx) => {
    if (!point) return '<div class="popup-empty">📭 无数据</div>'
  
    // 提取坐标（兼容不同字段名）
    const lng = point.lng ?? point.lon ?? '-'
    const lat = point.lat ?? '-'
  
    // 速度（节）
    const speed = point.speed != null ? formatValue(point.speed, ' kn', 1) : null
    // 航向（度）
    const heading = (point.course ?? point.heading) != null ? Math.round(point.course ?? point.heading) + '°' : null
    // 吃水（米）
    const draught = point.draught != null ? formatValue(point.draught, ' m', 1) : null
    // 导航状态
    const navStatus = point.navigationStatus ? point.navigationStatus : null
    // 目的地
    const destination = point.destination ? point.destination : null
  
    return `
      <div style="
        min-width: 240px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #333;
        line-height: 1.5;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <!-- 标题栏 -->
        <div style="
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          font-weight: 500;
          font-size: 13px;
        ">
          📍 轨迹点 #${idx}
        </div>
        
        <!-- 内容区 -->
        <div style="padding: 10px 12px; background: #fff;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">🕐 时间</span>
            <span style="font-weight: 500;">${formatTime(point.timestamp)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">📍 坐标</span>
            <span style="font-weight: 500;">${formatCoord(lat)}, ${formatCoord(lng)}</span>
          </div>
          ${speed ? `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">⚡ 速度</span>
            <span style="font-weight: 500;">${speed}</span>
          </div>` : ''}
          ${heading ? `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">🧭 航向</span>
            <span style="font-weight: 500;">${heading}</span>
          </div>` : ''}
          ${draught ? `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">🌊 吃水</span>
            <span style="font-weight: 500;">${draught}</span>
          </div>` : ''}
          ${destination ? `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <span style="color: #666;">🎯 目的地</span>
            <span style="font-weight: 500;">${destination}</span>
          </div>` : ''}
          ${navStatus ? `
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #666;">📊 状态</span>
            <span style="font-weight: 500;">${navStatus}</span>
          </div>` : ''}
        </div>
      </div>
    `
  }