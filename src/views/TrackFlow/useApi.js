// src/views/TrackFlow/useApi.js
/**
 * 🔗 TrackFlow - API 调用封装层
 * 职责：统一请求配置、错误处理、参数构建
 */

import axios from 'axios'
import { API_CONFIG } from '@/components/config'

// 创建 axios 实例
const createApiClient = () => {
  return axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
  })
}

// 响应处理
const handleResponse = (res) => res.data
const handleError = (err) => {
  console.error('❌ API 请求失败:', err.config?.url, err.message)
  return Promise.reject({
    code: err.response?.status || 'NETWORK_ERROR',
    message: err.response?.data?.message || err.message || '请求失败',
    raw: err
  })
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
   * 格式：{ marks: [{ mmsi, startTime, endTime, stayType, port, note? }] }
   */
  const submitStayMarks = async (marks) => {
    try {
      const res = await api.post(API_CONFIG.ENDPOINTS.SUBMIT_MARKS, { marks })
      return handleResponse(res)
    } catch (err) {
      return handleError(err)
    }
  }

  /**
   * 📋 查询历史标记（后端接口：/marks，可选）
   */
  const fetchStayMarks = async (mmsi) => {
    try {
      const res = await api.get(API_CONFIG.ENDPOINTS.GET_MARKS, { params: { mmsi } })
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