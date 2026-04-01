// 🕐 时间格式化（保持原有）
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000
  const date = new Date(ts)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-')
}

// 🔢 数值格式化（保持原有）
export const formatValue = (value, unit = '', decimal = 1) => {
  if (value == null || value === '') return '-'
  return `${Number(value).toFixed(decimal)}${unit}`
}

// 📍 坐标格式化（保持原有）
export const formatCoord = (value, precision = 4) => {
  if (value == null) return '-'
  return Number(value).toFixed(precision)
}

// 📊 状态值格式化
export const formatNavStatus = (status) => {
  if (!status && status !== 0) return '-'
  const NAV_STATUS_MAP = {
    0: '在航', 1: '锚泊', 2: '失控', 3: '操纵受限',
    4: '吃水受限', 5: '靠泊', 6: '搁浅', 7: '捕鱼',
    8: '帆船', 9: '拖带', 10: '引航', 15: '未知'
  }
  const numStatus = typeof status === 'string' ? parseInt(status, 10) : Number(status)
  return NAV_STATUS_MAP[numStatus] ?? String(status)
}

// 🎨 样式常量
const ROW_STYLE = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;'
const LABEL_STYLE = 'color:#666;'
const VALUE_STYLE = 'font-weight:500; text-align:right; word-break:break-all; max-width: 55%;'

// 📦 构建弹窗内容 - 🔧 新增 onMarkClick 回调
export const buildPopupContent = (point, { onMarkClick = null, onNavigate = null } = {}) => {
  if (!point) return '<div style="padding:12px; color:#666">📭 无数据</div>'
  
  const row = (label, value, noBorder = false) => `
    <div style="${ROW_STYLE}${noBorder ? '' : 'border-bottom:none'}">
      <span style="${LABEL_STYLE}">${label}</span>
      <span style="${VALUE_STYLE}">${value ?? '-'}</span>
    </div>
  `
  
  const v = {
    time: point.utc_time ? formatTime(point.utc_time) : '-',
    coord: (point.lat != null && point.lon != null) 
      ? `${formatCoord(point.lat)}, ${formatCoord(point.lon)}` : '-',
    speed: point.speed != null ? formatValue(point.speed, ' kn', 1) : '-',
    course: point.course != null ? `${Math.round(point.course)}°` : '-',
    draught: point.draught != null ? formatValue(point.draught, ' m', 2) : '-',
    destination: point.destination || '-',
    status: formatNavStatus(point.navigationstatus)
  }
  
  // 🔧 标记按钮（如果提供了回调）
  const markButton = onMarkClick ? `
    <div style="margin-top:12px; padding-top:10px; border-top:1px solid #eee;">
      <button id="mark-btn" style="
        width:100%; padding:8px 12px; 
        background:linear-gradient(135deg, #667eea, #764ba2); 
        color:white; border:none; border-radius:6px; 
        font-size:12px; font-weight:500; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:6px;
        transition:transform 0.1s, box-shadow 0.2s;
      " onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'" 
         onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
        🏷️ 创建停留标记
      </button>
    </div>
    <script>
      document.getElementById('mark-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__onMarkClick?.(${JSON.stringify(point)});
      });
    </script>
  ` : ''
  
  // 🔧 导航按钮（用于表格点击跳转回显）
  const navigateButton = onNavigate ? `
    <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #ddd;">
      <button id="nav-btn" style="
        width:100%; padding:6px 10px; 
        background:#f0f4ff; color:#667eea; 
        border:1px solid #667eea; border-radius:4px; 
        font-size:11px; cursor:pointer;
      ">🔍 定位到此点</button>
    </div>
    <script>
      document.getElementById('nav-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__onNavigate?.(${JSON.stringify({lat: point.lat, lon: point.lon, idx: point.idx})});
      });
    </script>
  ` : ''
  
  return `
    <div style="
      min-width:260px; max-width:340px; font-size:12px;
      font-family:-apple-system,sans-serif; background:#fff;
      border-radius:8px; box-shadow:0 6px 24px rgba(0,0,0,0.18);
      overflow:hidden;
    ">
      <div style="
        padding:10px 14px; 
        background:linear-gradient(135deg,#667eea,#764ba2); 
        color:white; font-weight:600; display:flex; justify-content:space-between; align-items:center;
      ">
        <span>📌 轨迹点 #${point.idx}</span>
        <span style="opacity:0.9; font-size:11px;">${v.time}</span>
      </div>
      <div style="padding:12px 14px;">
        ${row('📍 坐标', v.coord)}
        ${row('⚡ 速度', v.speed)}
        ${row('🧭 航向', v.course)}
        ${row('🌊 吃水', v.draught)}
        ${row('🎯 目的地', v.destination)}
        ${row('📊 状态', v.status, true)}
      </div>
      ${markButton}
      ${navigateButton}
    </div>
  `
}

// 🔧 构建标记编辑弹窗内容（独立函数）
export const buildMarkEditContent = (markData, { onSave = null, onCancel = null, onDelete = null } = {}) => {
  const { startTime, endTime, stayType = '靠泊', port = '', note = '' } = markData || {}
  
  const duration = endTime && startTime ? formatDuration(endTime - startTime) : '-'
  
  return `
    <div style="
      min-width:320px; max-width:400px; font-size:13px;
      font-family:-apple-system,sans-serif; background:#fff;
      border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,0.2);
      overflow:hidden;
    ">
      <!-- 标题 -->
      <div style="
        padding:12px 16px; background:linear-gradient(135deg,#667eea,#764ba2); 
        color:white; font-weight:600; display:flex; justify-content:space-between; align-items:center;
      ">
        <span>🏷️ 编辑停留标记</span>
        <button id="mark-close-btn" style="
          background:none; border:none; color:white; font-size:18px; 
          cursor:pointer; opacity:0.8; padding:0 4px;
        ">✕</button>
      </div>
      
      <!-- 内容 -->
      <div style="padding:14px 16px;">
        <!-- 时间范围（只读） -->
        <div style="margin-bottom:12px; padding:10px; background:#f8fafc; border-radius:6px;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">⏱️ 时间范围</div>
          <div style="font-weight:500;">
            ${formatTime(startTime)} → ${formatTime(endTime)}
          </div>
          <div style="font-size:11px; color:#667eea; margin-top:2px;">
            时长: ${duration}
          </div>
        </div>
        
        <!-- 类型选择 -->
        <div style="margin-bottom:12px;">
          <div style="font-size:11px; color:#666; margin-bottom:6px;">📋 停留类型</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;" id="type-options">
            ${['靠泊','锚泊','作业','待泊','其他'].map(t => `
              <button data-type="${t}" style="
                padding:4px 12px; border:2px solid ${t === stayType ? '#667eea' : '#ddd'}; 
                border-radius:16px; background:${t === stayType ? '#667eea' : 'white'}; 
                color:${t === stayType ? 'white' : '#333'}; font-size:11px; cursor:pointer;
              ">${t}</button>
            `).join('')}
          </div>
        </div>
        
        <!-- 港口选择 -->
        <div style="margin-bottom:12px;">
          <div style="font-size:11px; color:#666; margin-bottom:6px;">⚓ 港口</div>
          <select id="port-select" style="
            width:100%; padding:8px 10px; border:1px solid #ddd; 
            border-radius:6px; font-size:12px; background:white;
          ">
            <option value="">请选择...</option>
            ${['上海港','宁波舟山港','深圳港','广州港','青岛港','天津港','厦门港','大连港','其他'].map(p => `
              <option value="${p}" ${p === port ? 'selected' : ''}>${p}</option>
            `).join('')}
          </select>
        </div>
        
        <!-- 备注 -->
        <div style="margin-bottom:4px;">
          <div style="font-size:11px; color:#666; margin-bottom:6px;">📝 备注</div>
          <input id="note-input" type="text" value="${note || ''}" placeholder="可选说明" maxlength="50" style="
            width:100%; padding:8px 10px; border:1px solid #ddd; 
            border-radius:6px; font-size:12px; box-sizing:border-box;
          "/>
        </div>
        <div style="font-size:10px; color:#999; text-align:right;">${note?.length || 0}/50</div>
      </div>
      
      <!-- 操作按钮 -->
      <div style="
        padding:12px 16px; background:#f8fafc; border-top:1px solid #eee; 
        display:flex; gap:8px; justify-content:flex-end;
      ">
        <button id="mark-delete-btn" style="
          padding:8px 16px; background:#fee2e2; color:#dc2626; 
          border:none; border-radius:6px; font-size:12px; cursor:pointer;
        ">🗑️ 删除</button>
        <button id="mark-cancel-btn" style="
          padding:8px 16px; background:#e5e7eb; color:#374151; 
          border:none; border-radius:6px; font-size:12px; cursor:pointer;
        ">取消</button>
        <button id="mark-save-btn" style="
          padding:8px 20px; background:#667eea; color:white; 
          border:none; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer;
        ">✅ 保存</button>
      </div>
    </div>
    
    <script>
      // 关闭按钮
      document.getElementById('mark-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__onMarkCancel?.();
      });
      
      // 类型选择
      document.querySelectorAll('#type-options button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('#type-options button').forEach(b => {
            b.style.borderColor = '#ddd';
            b.style.background = 'white';
            b.style.color = '#333';
          });
          e.target.style.borderColor = '#667eea';
          e.target.style.background = '#667eea';
          e.target.style.color = 'white';
          window.__onMarkUpdate?.('stayType', e.target.dataset.type);
        });
      });
      
      // 港口选择
      document.getElementById('port-select')?.addEventListener('change', (e) => {
        e.stopPropagation();
        window.__onMarkUpdate?.('port', e.target.value);
      });
      
      // 备注输入
      document.getElementById('note-input')?.addEventListener('input', (e) => {
        e.stopPropagation();
        window.__onMarkUpdate?.('note', e.target.value);
      });
      
      // 保存
      document.getElementById('mark-save-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__onMarkSave?.();
      });
      
      // 取消
      document.getElementById('mark-cancel-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__onMarkCancel?.();
      });
      
      // 删除
      document.getElementById('mark-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm('确定删除这条标记记录吗？')) {
          window.__onMarkDelete?.();
        }
      });
    </script>
  `
}

// 🔧 辅助：时长格式化
const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}