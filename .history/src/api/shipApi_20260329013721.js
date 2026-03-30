// src/api/shipApi.js
// ✅ 统一配置后端服务器地址（根据环境切换）
// const API_BASE = 'http://106.15.176.173:3026'  // 生产
// const API_BASE = 'http://localhost:3026'        // 开发备用
const API_BASE = 'http://localhost:8877'  // ✅ 当前使用

// ✅ 统一接口配置中心
export const API_CONFIG = {
  BASE_URL: `${API_BASE}/api/ship`,
  TIMEOUT: 10000,
  ENDPOINTS: {
    // 船舶基础信息
    ATTRIBUTES: '/attributes',
    ITINERARY: '/itinerary',
    // AI报告（独立服务）
    DIFY_REPORT: '/api/dify/report',
    // 轨迹查询
    CACHE_MMSI: '/cacheMmsi',
    BY_INDEX: '/byIndex',
    BY_TIME: '/byTime',
    // 停留标记
    MARKS: '/marks'
  }
}

// ✅ 统一请求封装（基于 fetch，支持超时 & 错误处理）
const request = async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(`请求失败 [${res.status}]: ${msg}`)
    }
    
    // 兼容空响应/非JSON响应
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await res.json()
    }
    return null
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`请求超时 (${API_CONFIG.TIMEOUT}ms)`)
    }
    console.error(`❌ [${options.method || 'GET'}] ${url} 错误:`, err)
    throw err
  }
}

// ==================== 🚢 七个统一后端接口 ====================

/**
 * 1️⃣ 获取船舶属性
 * GET /api/ship/attributes?mmsi=xxx
 */
export const getShipAttributes = async (mmsi) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATTRIBUTES}?mmsi=${encodeURIComponent(mmsi)}`
  const data = await request(url)
  return data
}

/**
 * 2️⃣ 获取船舶行程
 * GET /api/ship/itinerary?mmsi=xxx&year=xxx
 */
export const getShipItinerary = async (mmsi, year) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ITINERARY}?mmsi=${encodeURIComponent(mmsi)}&year=${year || ''}`
  const data = await request(url)
  return data
}

/**
 * 3️⃣ 获取 AI 报告（独立服务）
 * POST /api/dify/report
 */
export const getAIReport = async (data) => {
  const url = `${API_BASE}${API_CONFIG.ENDPOINTS.DIFY_REPORT}`
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data || {})
  })
}

/**
 * 4️⃣ 缓存 MMSI 数据
 * GET /api/ship/cacheMmsi?mmsi=xxx
 */
export const cacheMmsi = async (mmsi) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CACHE_MMSI}?mmsi=${encodeURIComponent(mmsi)}`
  const data = await request(url)
  return data
}


/**
 * 5️⃣ 按索引范围查询轨迹
 * GET /api/ship/byIndex?mmsi=xxx&startIdx=xxx&endIdx=xxx
 */
export const getTrajectoryByIndex = async (mmsi, startIdx, endIdx) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BY_INDEX}?mmsi=${encodeURIComponent(mmsi)}&startIdx=${startIdx}&endIdx=${endIdx}`
  const data = await request(url)
  return data
}

/**
 * 6️⃣ 按时间范围查询轨迹
 * GET /api/ship/byTime?mmsi=xxx&start=xxx&end=xxx
 */
export const getTrajectoryByTime = async (mmsi, startTime, endTime) => {
  if (!mmsi) throw new Error('MMSI 不能为空')
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BY_TIME}?mmsi=${encodeURIComponent(mmsi)}&start=${startTime}&end=${endTime}`
  const data = await request(url)
  return data
}

/**
 * 7️⃣ 提交停留标记
 * POST /api/ship/marks
 */
export const submitStayMarks = async (marks) => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MARKS}`
  return request(url, {
    method: 'POST',
    body: JSON.stringify({ marks })
  })
}

// ✅ 统一导出（确保外部调用一致）
export default {
  getShipAttributes,
  getShipItinerary,
  getAIReport,
  cacheMmsi,
  getTrajectoryByIndex,
  getTrajectoryByTime,
  submitStayMarks
}