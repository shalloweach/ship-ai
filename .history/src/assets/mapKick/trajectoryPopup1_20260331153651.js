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

// 📦 构建编辑弹窗内容 - ✅ 独立组件更安全
export const buildMarkEditContent = (mark) => {
  return `
    <div class="mark-edit-wrapper">
      <div class="mark-edit-header">
        <span>🏷️ 编辑停留标记</span>
        <button id="mark-edit-close" class="mark-edit-close">✕</button>
      </div>
      <div class="mark-edit-body">
        <div class="mark-edit-field">
          <label>时间范围</label>
          <div class="mark-edit-time">${formatTime(mark.startTime)} → ${formatTime(mark.endTime)}</div>
        </div>
        <div class="mark-edit-field">
          <label>停留类型</label>
          <select id="mark-edit-type" class="mark-edit-select">
            <option value="靠泊" ${mark.stayType === '靠泊' ? 'selected' : ''}>靠泊</option>
            <option value="锚泊" ${mark.stayType === '锚泊' ? 'selected' : ''}>锚泊</option>
            <option value="作业" ${mark.stayType === '作业' ? 'selected' : ''}>作业</option>
            <option value="待泊" ${mark.stayType === '待泊' ? 'selected' : ''}>待泊</option>
            <option value="其他" ${mark.stayType === '其他' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="mark-edit-field">
          <label>港口</label>
          <input id="mark-edit-port" type="text" value="${mark.port || ''}" maxlength="20" placeholder="请输入港口"/>
        </div>
        <div class="mark-edit-field">
          <label>备注</label>
          <textarea id="mark-edit-note" maxlength="100" placeholder="可选说明">${mark.note || ''}</textarea>
        </div>
      </div>
      <div class="mark-edit-footer">
        <button id="mark-edit-delete" class="mark-edit-btn delete">🗑️ 删除</button>
        <button id="mark-edit-cancel" class="mark-edit-btn">取消</button>
        <button id="mark-edit-save" class="mark-edit-btn primary">✅ 保存</button>
      </div>
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