// src/assets/mapRender/trajectoryPopup.js

// 🕐 时间格式化
export const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-')
  }
  
  // 🔢 数值格式化
  export const formatValue = (value, unit = '', decimal = 1) => {
    if (value == null || isNaN(value)) return '-'
    return `${Number(value).toFixed(decimal)}${unit}`
  }
  
  // 📍 坐标格式化
  export const formatCoord = (value, precision = 4) => {
    return value != null ? Number(value).toFixed(precision) : '-'
  }
  
  // 📊 状态值格式化（数字→中文）
  export const formatNavStatus = (status) => {
    if (status == null) return '-'
    const NAV_STATUS_MAP = {
      0: '在航', 1: '锚泊', 2: '失控', 3: '操纵受限',
      4: '吃水受限', 5: '靠泊', 6: '搁浅', 7: '捕鱼',
      8: '帆船', 9: '拖带', 10: '引航', 15: '未知'
    }
    return typeof status === 'number' ? (NAV_STATUS_MAP[status] ?? status) : status
  }
  
  // 🎨 样式常量
  const rowStyle = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;'
  const labelStyle = 'color:#666;'
  const valueStyle = 'font-weight:500; text-align:right; word-break:break-all; max-width: 55%;'
  
  // 📦 构建弹窗内容（空值也显示 -）
  export const buildPopupContent = (point) => {
    if (!point) return '<div style="padding:12px; color:#666">📭 无数据</div>'
    
    // 🔁 兼容多种字段名
    const lng = point.lng ?? point.lon ?? point.longitude ?? point.Lon ?? null
    const lat = point.lat ?? point.latitude ?? point.Lat ?? null
    const timestamp = point.timestamp ?? point.time ?? point.dateTime ?? point.updateTime ?? point.ts ?? null
    const speed = point.speed ?? point.sog ?? point.speedOverGround ?? null
    const course = point.course ?? point.cog ?? point.heading ?? point.trueHeading ?? null
    const rot = point.rot ?? point.rateOfTurn ?? null
    const draught = point.draught ?? point.draft ?? point.draughtMeters ?? null
    const destination = point.destination ?? point.dest ?? point.port ?? point.toPort ?? point.to ?? null
    const navStatus = point.navigationStatus ?? point.navStatus ?? point.status ?? point.aisStatus ?? null
    const eta = point.eta ?? point.ETA ?? point.estimatedArrival ?? null
    const idx = point.idx ?? point.index ?? point.no ?? point.pointId ?? '?'
    
    // ✅ 辅助函数：生成一行（空值也显示 -）
    const renderRow = (label, value, showBorder = true) => {
      // 统一格式化：空值 → '-'
      const displayValue = (value == null || value === '' || value === 'null' || value === 'undefined') 
        ? '-' 
        : String(value)
      
      return `
        <div style="${rowStyle}${showBorder ? '' : 'border-bottom:none;'}">
          <span style="${labelStyle}">${label}</span>
          <span style="${valueStyle}">${displayValue}</span>
        </div>
      `
    }
  
    return `
      <div style="
        min-width: 240px;
        max-width: 320px;
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
          
          <!-- 🕐 时间 -->
          ${renderRow('🕐 时间', timestamp ? formatTime(timestamp) : '-')}
          
          <!-- 📍 坐标（特殊处理：需要经纬度都有才显示具体值） -->
          ${renderRow('📍 坐标', 
            (lng != null && lat != null) 
              ? `${formatCoord(lat)}°, ${formatCoord(lng)}°` 
              : '-'
          )}
          
          <!-- ⚡ 速度 -->
          ${renderRow('⚡ 速度', speed != null ? formatValue(speed, ' kn', 1) : '-')}
          
          <!-- 🧭 航向 -->
          ${renderRow('🧭 航向', course != null ? `${Math.round(course)}°` : '-')}
          
          <!-- 🔄 转向率（可选字段） -->
          ${renderRow('🔄 转向率', rot != null ? formatValue(rot, '°/min', 1) : '-')}
          
          <!-- 🌊 吃水 -->
          ${renderRow('🌊 吃水', draught != null ? formatValue(draught, ' m', 2) : '-')}
          
          <!-- 🎯 目的地 -->
          ${renderRow('🎯 目的地', destination || '-')}
          
          <!-- ⏰ ETA -->
          ${renderRow('⏰ ETA', eta ? formatTime(eta) : '-')}
          
          <!-- 📊 状态（最后一条，去掉下边框） -->
          ${renderRow('📊 状态', formatNavStatus(navStatus), false)}
          
        </div>
      </div>
    `
  }