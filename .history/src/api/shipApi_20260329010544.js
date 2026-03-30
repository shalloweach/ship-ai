// src/api/shipApi.js
// ✅ 统一配置后端服务器地址（根据环境切换）
// const API_BASE = 'http://106.15.176.173:3026'  // 生产
// const API_BASE = 'http://localhost:3026'        // 开发备用
const API_BASE = 'http://localhost:8877'  // ✅ 当前使用
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8877/api/ship',
  TIMEOUT: 30000,
  ENDPOINTS: {
    TRAJECTORY_BY_TIME: '/byTime',
    SUBMIT_MARKS: '/marks',
    GET_MARKS: '/marks',
    DELETE_MARK: '/marks/{id}'
  }
}
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

export const shipApi = {
  /**
   * 1. 缓存 MMSI 数据
   * GET /api/ship/cacheMmsi?mmsi=xxx
   * 导航栏搜索时调用，将数据加载到后端缓存
   */
  async cacheMmsi(mmsi) {
    const response = await apiClient.get('/ship/cacheMmsi', {
      params: { mmsi }
    });
    return response.data;
  },

  /**
   * 2. 按索引范围查询轨迹
   * GET /api/ship/byIndex?mmsi=xxx&startIdx=xxx&endIdx=xxx
   * 从缓存中读取指定索引范围的数据
   */
  async getTrajectoryByIndex(mmsi, startIdx, endIdx) {
    const response = await apiClient.get('/ship/byIndex', {
      params: { mmsi, startIdx, endIdx }
    });
    return response.data;
  },

  /**
   * 3. 按时间范围查询轨迹
   * GET /api/ship/byTime?mmsi=xxx&start=xxx&end=xxx
   * 从缓存中读取指定时间范围的数据
   */
  async getTrajectoryByTime(mmsi, startTime, endTime) {
    const response = await apiClient.get('/ship/byTime', {
      params: { mmsi, start: startTime, end: endTime }
    });
    return response.data;
  },

  /**
   * 4. 提交停留标记
   * POST /api/ship/marks
   * 提交前端生成的标记数据到后端存储
   * @param {Array} marks - 标记数组
   */
  async submitStayMarks(marks) {
    const response = await apiClient.post('/ship/marks', { marks });
    return response.data;
  }
};

export default shipApi;

export default {
  getShipAttributes,
  getShipItinerary,
  getAIReport,
  estimateTotalPoints,
  exportTrajectoryCSV,
  validateStayMarks
}