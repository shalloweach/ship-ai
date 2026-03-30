// src/assets/mapRender/trajectoryPopup.js

// 🕐 时间格式化
export const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const ts = timestamp > e12 ? timestamp : timestamp * 1000
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-')
  }
  
  // 🔢 数值格式化（复用）
  export const formatValue = (value, unit = '', decimal = 1) => {
    if (value == null || isNaN(value)) return '-'
    return `${Number(value).toFixed(decimal)}${unit}`
  }
  
  // 📍 坐标格式化
  export const formatCoord = (value, precision = 4) => {
    return value != null ? Number(value).toFixed(precision) : '-'
  }
  
  // 🎨 通用行样式（避免重复写内联样式）
  const rowStyle = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;'
  const labelStyle = 'color:#666;'
  const valueStyle = 'font-weight:500; text-align:right; word-break:break-all;'
  
  // 📦 构建弹窗内容（纯展示，统一内联样式）
  export const buildPopupContent = (point) => {
    if (!point) return '<div style="padding:12px; color:#666">📭 无数据</div>'
    
    const lng = point.lng ?? point.lon ?? point.longitude ?? '-'
    const lat = point.lat ?? point.latitude ?? '-'
    const idx = point.idx ?? point.index ?? point.no ?? '?'
    
    // 辅助函数：生成一行内容
    const renderRow = (label, value, showBorder = true) => {
      if (value == null || value === '' || value === '-') return ''
      return `
        <div style="${rowStyle}${showBorder ? '' : 'border-bottom:none;'}">
          <span style="${labelStyle}">${label}</span>
          <span style="${valueStyle}">${value}</span>
        </div>
      `
    }
  
    return `
      <div style="
        min-width: 240px;
        max-width: 300px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #333;
        line-height: 1.5;
        background: #fff;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      ">
        <!-- 📌 标题 -->
        <div style="
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 500;
          font-size: 13px;
        ">
          📍 轨迹点 #${idx}
        </div>
        
        <!-- 📋 内容区域 -->
        <div style="padding: 10px 12px; background: #fff;">
          
          <!-- 时间 -->
          ${renderRow('🕐 时间', formatTime(point.timestamp))}
          
          <!-- 坐标 -->
          ${renderRow('📍 坐标', `${formatCoord(lat)}°, ${formatCoord(lng)}°`)}
          
          <!-- 速度 -->
          ${point.speed != null ? renderRow('⚡ 速度', `${formatValue(point.speed, ' kn', 1)}`) : ''}
          
          <!-- 航向 -->
          ${(point.course ?? point.heading) != null 
            ? renderRow('🧭 航向', `${Math.round(point.course ?? point.heading)}°`) 
            : ''}
          
          <!-- 转向率 (ROT) -->
          ${point.rot != null ? renderRow('🔄 转向率', `${formatValue(point.rot, '°/min', 1)}`) : ''}
          
          <!-- 吃水 -->
          ${point.draught != null ? renderRow('🌊 吃水', `${formatValue(point.draught, ' m', 2)}`) : ''}
          
          <!-- 目的地 -->
          ${point.destination ? renderRow('🎯 目的地', point.destination) : ''}
          
          <!-- ETA (预计到达时间) -->
          ${point.eta ? renderRow('⏰ ETA', formatTime(point.eta)) : ''}
          
          <!-- 航行状态 -->
          ${point.navigationStatus != null 
            ? renderRow('📊 状态', point.navigationStatus, false) // 最后一行去掉下边框
            : ''}
          
        </div>
      </div>
    `
  }