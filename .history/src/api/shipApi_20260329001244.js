// src/api/shipApi.js
// ✅ 统一配置后端服务器地址（根据环境切换）
// const API_BASE = 'http://106.15.176.173:3026'  // 生产
// const API_BASE = 'http://localhost:3026'        // 开发备用
const API_BASE = 'http://localhost:8877'  // ✅ 当前使用

// ==================== 后端已有接口（只修错误，不新增） ====================

/**
 * 🚢 获取船舶属性
 * @param {string} mmsi - 船舶MMSI
 */
export const getShipAttributes = async (mmsi) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  
  const url = `${API_BASE}/api/ship/attributes?mmsi=${encodeURIComponent(mmsi)}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(`获取属性失败 [${res.status}]: ${msg}`)
    }
    return await res.json()
  } catch (err) {
    console.error('❌ getShipAttributes 错误:', err)
    throw err
  }
}

/**
 * 🗓️ 获取船舶行程
 * @param {string} mmsi - 船舶MMSI
 * @param {number|string} year - 年份
 */
export const getShipItinerary = async (mmsi, year) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  
  const url = `${API_BASE}/api/ship/itinerary?mmsi=${encodeURIComponent(mmsi)}&year=${year || ''}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(`获取行程失败 [${res.status}]: ${msg}`)
    }
    return await res.json()
  } catch (err) {
    console.error('❌ getShipItinerary 错误:', err)
    throw err
  }
}

/**
 * 🤖 获取 AI 报告（按需启用）
 * @param {Object} data - 报告请求数据
 */
export const getAIReport = async (data) => {
  const url = `${API_BASE}/api/dify/report`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(`获取AI报告失败 [${res.status}]: ${msg}`)
    }
    return await res.json()
  } catch (err) {
    console.error('❌ getAIReport 错误:', err)
    throw err
  }
}

// ==================== 前端补充逻辑（不依赖新后端接口） ====================

/**
 * 📊 前端计算：估算该 MMSI 的总轨迹点数
 * 说明：后端未提供 count 接口，前端用时间范围 + 采样率估算
 * @param {Object} params - 查询参数
 * @returns {Promise<number>} 估算的点数
 */
export const estimateTotalPoints = async (params) => {
  const { mmsi, time, batchSize = 5000 } = params || {}
  if (!mmsi || !time?.start || !time?.end) return 0
  
  try {
    // 先请求一批数据，用返回的 actualCount 或数据长度估算
    const url = `${API_BASE}/api/ship/byTime`
    const res = await fetch(`${url}?mmsi=${mmsi}&start=${time.start}&end=${time.end}&limit=100`)
    if (!res.ok) return 0
    
    const data = await res.json()
    const sampleCount = data.points?.length || 0
    
    // 简单线性估算：(总时长 / 采样时长) * 样本数
    const totalDuration = time.end - time.start
    const sampleDuration = data.endTime - data.startTime || 3600  // 默认1小时
    const estimated = Math.ceil((totalDuration / sampleDuration) * sampleCount)
    
    return Math.min(estimated, 100000)  // 上限10万点，防止溢出
  } catch {
    return 0  // 估算失败返回0，降级使用默认值
  }
}

/**
 * 📦 前端导出：轨迹数据转 CSV（纯前端实现）
 * @param {Array} points - 轨迹点数组
 * @param {string} mmsi - 船舶MMSI
 */
export const exportTrajectoryCSV = (points, mmsi) => {
  if (!points?.length) return
  
  const headers = ['index', 'timestamp', 'latitude', 'longitude', 'speed', 'course', 'destination', 'draught', 'status']
  const rows = points.map((p, idx) => [
    idx,
    p.timestamp || '',
    p.latitude ?? p.lat ?? '',
    p.longitude ?? p.lng ?? p.lon ?? '',
    p.speed ?? '',
    p.course ?? p.heading ?? '',
    p.destination ?? '',
    p.draught ?? '',
    p.navigationStatus ?? p.status ?? ''
  ].map(v => v === null || v === undefined ? '' : String(v)).join(','))
  
  const csv = ['\ufeff' + headers.join(','), ...rows].join('\n')  // \ufeff 解决 Excel 乱码
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `trajectory_${mmsi}_${Date.now()}.csv`
  a.click()
  
  URL.revokeObjectURL(url)
  console.log('📥 CSV 导出完成')
}

/**
 * 📍 前端验证：标记数据格式校验（纯前端实现）
 * @param {Array} marks - 待提交的标记数组
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateStayMarks = (marks) => {
  const errors = []
  
  if (!Array.isArray(marks) || marks.length === 0) {
    errors.push('标记数据不能为空')
    return { valid: false, errors }
  }
  
  marks.forEach((m, idx) => {
    if (!m.mmsi) errors.push(`[#${idx}] 缺少 mmsi`)
    if (!m.startTime || !m.endTime) errors.push(`[#${idx}] 缺少时间范围`)
    if (m.startTime >= m.endTime) errors.push(`[#${idx}] 开始时间不能晚于结束时间`)
    if (!['靠泊', '锚泊', '异常', '其他'].includes(m.stayType)) {
      errors.push(`[#${idx}] 停留类型无效: ${m.stayType}`)
    }
  })
  
  return { valid: errors.length === 0, errors }
}

// 默认导出（方便按需引入）
export default {
  getShipAttributes,
  getShipItinerary,
  getAIReport,
  estimateTotalPoints,
  exportTrajectoryCSV,
  validateStayMarks
}