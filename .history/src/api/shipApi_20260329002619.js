// src/api/shipApi.js
// ✅ 在这里统一配置后端服务器地址
// const API_BASE = 'http://106.15.176.173:3026'
// const API_BASE = 'http://localhost:3026'
const API_BASE = ''
// 获取船舶属性
export const getShipAttributes = async (mmsi) => {
  const url = `${API_BASE}/api/ship/attributes?mmsi=${mmsi}`
  const res = await fetch(url)
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`获取属性失败: ${msg}`)
  }
  return res.json()
}

// 获取船舶行程
export const getShipItinerary = async (mmsi, year) => {
  const url = `${API_BASE}/api/ship/itinerary?mmsi=${mmsi}&year=${year}`
  const res = await fetch(url)
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`获取行程失败: ${msg}`)
  }
  return res.json()
}

// 获取 AI 报告（如果后续需要）
export const getAIReport = async (data) => {
  const url = `${API_BASE}/api/dify/report`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`获取AI报告失败: ${msg}`)
  }
  return res.json()
}



import axios from 'axios';
import { CONFIG } from '../components/config';

const apiClient = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 船舶轨迹相关 API
 * 只包含后端实际存在的接口
 */
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