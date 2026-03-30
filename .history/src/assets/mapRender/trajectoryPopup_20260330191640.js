// utils/trajectoryPopup.js

// ========== 🎨 状态映射 ==========
const NAV_STATUS_MAP = {
    0: '在航', 1: '锚泊', 2: '失控', 3: '操纵受限',
    5: '靠泊', 6: '搁浅', 7: '捕鱼', 8: '帆船',
    15: '未知'
  }
  
  // ========== 🕐 时间格式化（增强版） ==========
  export const formatTime = (timestamp, showSeconds = true) => {
    if (!timestamp) return '-'
    const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
    const date = new Date(ts)
    
    const options = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }
    if (showSeconds) options.second = '2-digit'
    
    return date.toLocaleString('zh-CN', options).replace(/\//g, '-')
  }
  
  // ========== 📍 坐标格式化（支持复制） ==========
  export const formatCoordinate = (value, precision = 4, withCopy = true) => {
    if (value == null) return '-'
    const formatted = Number(value).toFixed(precision)
    if (!withCopy) return formatted
    
    // 添加复制按钮（需配合事件委托）
    return `<span class="coord-value" data-copy="${value}">${formatted}</span>`
  }
  
  // ========== 🔢 数值格式化 ==========
  export const formatValue = (value, unit = '', decimal = 1, fallback = '-') => {
    if (value == null || isNaN(value)) return fallback
    const num = Number(value).toFixed(decimal)
    return unit ? `${num}${unit}` : num
  }
  
  // ========== 📦 弹窗内容构建（增强版） ==========
  export const buildPopupContent = (point, options = {}) => {
    if (!point) return '<div class="popup-empty">📭 无数据</div>'
    
    const {
      showCopyBtn = true,      // 显示复制按钮
      showActions = true,      // 显示操作按钮
      mmsi = '',               // 当前船舶 MMSI
      onCopy, onNavigate       // 回调函数（外部绑定）
    } = options
    
    const lng = point.lng ?? point.lon ?? point.longitude
    const lat = point.lat ?? point.latitude
    const idx = point.idx ?? point.index ?? point.no ?? '-'
    
    // 动态字段渲染辅助函数
    const renderRow = (icon, label, value, className = '') => {
      if (value == null || value === '-' || value === '') return ''
      return `
        <div class="popup-row ${className}">
          <span class="popup-label">${icon} ${label}</span>
          <span class="popup-value">${value}</span>
        </div>
      `
    }
    
    // 航向箭头可视化
    const course = point.course ?? point.heading ?? point.cog
    const courseArrow = course != null 
      ? `<span class="course-arrow" style="transform:rotate(${course}deg)">🧭</span>` 
      : ''
  
    return `
      <div class="ts-popup ts-popup-point" data-point-idx="${idx}" data-mmsi="${mmsi}">
        
        <!-- 📌 头部：索引 + 时间 -->
        <div class="popup-header">
          <div class="header-left">
            <span class="popup-icon">📍</span>
            <span class="popup-title">轨迹点 #${idx}</span>
          </div>
          <span class="popup-time" title="${formatTime(point.timestamp, true)}">
            ${formatTime(point.timestamp, false)}
          </span>
        </div>
        
        <!-- 📋 主体信息 -->
        <div class="popup-body">
          
          <!-- 坐标行（支持复制） -->
          <div class="popup-row popup-row-coordinate">
            <span class="popup-label">📍 坐标</span>
            <span class="popup-value coord-group">
              ${formatCoordinate(lat, 4, showCopyBtn)}°, 
              ${formatCoordinate(lng, 4, showCopyBtn)}°
              ${showCopyBtn ? `
                <button class="btn-copy" data-copy="${lat},${lng}" title="复制坐标">
                  📋
                </button>
              ` : ''}
            </span>
          </div>
          
          <!-- 核心动态数据 -->
          ${renderRow('⚡', '速度', formatValue(point.speed, ' kn', 1), 'row-speed')}
          
          <div class="popup-row row-course">
            <span class="popup-label">🧭 航向</span>
            <span class="popup-value course-group">
              ${formatValue(course, '°', 0)}
              ${courseArrow}
            </span>
          </div>
          
          ${renderRow('🔄', '转向率', formatValue(point.rot, '°/min', 1))}
          ${renderRow('🌊', '吃水', formatValue(point.draught, ' m', 2))}
          
          <!-- 状态 -->
          ${point.navigationStatus != null ? `
            <div class="popup-row row-status">
              <span class="popup-label">📊 状态</span>
              <span class="popup-value status-badge status-${point.navigationStatus}">
                ${NAV_STATUS_MAP[point.navigationStatus] ?? point.navigationStatus}
              </span>
            </div>
          ` : ''}
          
          <!-- 目的地/港口 -->
          ${point.destination || point.port ? `
            <div class="popup-row row-destination">
              <span class="popup-label">🎯 目的地</span>
              <span class="popup-value">
                ${point.destination || point.port}
                ${point.eta ? `<small class="eta-badge">ETA: ${formatTime(point.eta, false)}</small>` : ''}
              </span>
            </div>
          ` : ''}
          
          <!-- 扩展字段（动态渲染） -->
          ${point.ext ? Object.entries(point.ext).map(([key, val]) => 
            renderRow('🔹', key, formatValue(val, '', 2))
          ).join('') : ''}
          
        </div>
        
        <!-- ⚡ 操作按钮（可选） -->
        ${showActions ? `
        <div class="popup-footer">
          <button class="popup-btn btn-secondary" data-action="center" title="居中显示">
            🎯 居中
          </button>
          <button class="popup-btn btn-secondary" data-action="timeline" title="跳转到时间轴">
            ⏱️ 定位
          </button>
          <button class="popup-btn btn-primary" data-action="detail" title="查看详情">
            📊 详情
          </button>
        </div>
        ` : ''}
        
        <!-- 🔍 隐藏数据容器（供 JS 读取） -->
        <div class="popup-data" style="display:none">
          ${JSON.stringify(point)}
        </div>
      </div>
    `
  }