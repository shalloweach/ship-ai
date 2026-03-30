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


export async function useApi() {
  const api = await createApiClient()
  
  /**
   * 🚢 按时间范围查询轨迹点（后端接口：/byTime）
   */
  const fetchTrajectoryByTime = async (mmsi, start, end, limit = 5000) => {
    try {
      const res = await api.get(API_CONFIG.ENDPOINTS.TRAJECTORY_BY_TIME, {
        params: { mmsi, start, end, limit }
      })
      return handleResponse(res)
    } catch (err) {
      return handleError(err)
    }
  }

  /**
   * 📍 批量提交停留标记（后端接口：/marks）
   * 格式：{ marks: [{ mmsi, startTime, endTime, stayType, port, note }] }
   */
  const submitStayMarks = async (marks) => {
    try {
      const res = await api.post(API_CONFIG.ENDPOINTS.SUBMIT_MARKS, { marks })
      return handleResponse(res)
    } catch (err) {
      return handleError(err)
    }
  }



  return {
    fetchTrajectoryByTime,
    submitStayMarks,
    fetchStayMarks
  }
}

export default useApi


export default {
  getShipAttributes,
  getShipItinerary,
  getAIReport,
  estimateTotalPoints,
  exportTrajectoryCSV,
  validateStayMarks
}