// src/api/shipApi.js

import axios from 'axios';
import { CONFIG } from '../components/config';

// ✅ 在这里统一配置后端服务器地址
// const API_BASE = 'http://106.15.176.173:3026'
// const API_BASE = 'http://localhost:3026'
const API_BASE = ''

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