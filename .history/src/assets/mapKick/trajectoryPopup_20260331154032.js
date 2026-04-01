// src/assets/mapRender/trajectoryPopup.js

// 🕐 时间格式化
const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
    const date = new Date(ts)
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-')
  }
  
  // 🔢 数值格式化
  export const formatValue = (value, unit = '', decimal = 1) => {
    if (value == null || value === '') return '-'
    return `${Number(value).toFixed(decimal)}${unit}`
  }
  
  // 📍 坐标格式化
  export const formatCoord = (value, precision = 4) => {
    if (value == null) return '-'
    return Number(value).toFixed(precision)
  }
  
  // 📊 状态值格式化（数字→中文）
  export const formatNavStatus = (status) => {
    if (!status && status !== 0) return '-'
    
    const NAV_STATUS_MAP = {
      0: '在航', 1: '锚泊', 2: '失控', 3: '操纵受限',
      4: '吃水受限', 5: '靠泊', 6: '搁浅', 7: '捕鱼',
      8: '帆船', 9: '拖带', 10: '引航', 15: '未知'
    }
    
    // 字符串数字转整数
    const numStatus = typeof status === 'string' 
      ? parseInt(status, 10) 
      : Number(status)
      
    return NAV_STATUS_MAP[numStatus] ?? String(status)
  }
  
  // 🎨 样式常量
  const ROW_STYLE = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;'
  const LABEL_STYLE = 'color:#666;'
  const VALUE_STYLE = 'font-weight:500; text-align:right; word-break:break-all; max-width: 55%;'
  
  // 📦 构建弹窗内容
  export const buildPopupContent = (point, callbacks = {}) => {
    if (!point) return '<div style="padding:12px; color:#666">📭 无数据</div>'
    
    // 📌 获取字段（单一路径）
    // {"course":149.4,"destination":"","draught":0.0,"idx":5,"lat":22.437446666666666,"lon":113.8823116666666
    // 7,"navigationstatus":"0.0","speed":0.65,"utc_time":1672549379}
    
    // 🎯 渲染单行辅助函数
    const row = (label, value, noBorder = false) => `
      <div style="${ROW_STYLE}${noBorder ? '' : 'border-bottom:none'}">
        <span style="${LABEL_STYLE}">${label}</span>
        <span style="${VALUE_STYLE}">${value ?? '-'}</span>
      </div>
    `
    
    // 💡 各字段显示值
    const v = {
      time: point.utc_time ? formatTime(point.utc_time) : '-',
      coord: (point.lat != null && point.lon != null) 
        ? `${formatCoord(point.lat)}, ${formatCoord(point.lon)}` : '-',
      speed: point.speed != null ? formatValue(point.speed, ' kn', 1) : '-',
      course: point.course != null ? `${Math.round(point.course)}°` : '-',
      draught: point.draught != null ? formatValue(point.draught, ' m', 2) : '-',
      destination: point.destination || '-',
      eta: point.utc_time ? point.utc_time : '-',
    //   status: formatNavStatus(point.navigationstatus)
      status: point.navigationstatus
    }
    
    const { onMarkClick } = callbacks
  
    // 标记按钮（仅当提供回调时）
    // const markBtn = onMarkClick ? `
    //   <div class="popup-section">
    //     <button id="popup-mark-btn" class="popup-btn-primary">
    //       🏷️ 创建停留标记
    //     </button>
    //   </div>
    // ` : ''

    const markBtn = onMarkClick ? `
      <div class="popup-section" style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
        <button 
          id="popup-mark-btn" 
          style="
            width: 100%;
            padding: 8px 12px;
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.1s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.1)';"
        >
          🏷️ 创建停留标记
        </button>
      </div>
    ` : ''

    // 🔧 返回 HTML
    return `
      <div style="
        min-width:240px; max-width:320px; font-size:12px;
        font-family:-apple-system,sans-serif; background:#fff;
        border-radius:6px; box-shadow:0 4px 20px rgba(0,0,0,0.15);
      ">
        <div style="
          padding:8px 12px; 
          background:linear-gradient(135deg,#667eea,#764ba2); 
          color:white; font-weight:500
        ">
          📌 轨迹点 #${point.idx}
        </div>
        <div style="padding:10px 12px;">
          ${row('🕐 时间', v.time)}
          ${row('📍 坐标', v.coord)}
          ${row('⚡ 速度', v.speed)}
          ${row('🧭 航向', v.course)}
          ${row('🌊 吃水', v.draught)}
          ${row('🎯 目的地', v.destination)}
          ${row('⏰ UTC', v.eta)}
          ${row('📊 状态', v.status, true)}
        </div>

        ${markBtn}
      </div>
    `
  }