// src/views/TrackFlow/useApi.js

import axios from 'axios'
import { API_CONFIG } from './utils/config'
import { logRequest } from './utils/errorHandlers'

/**
 * 构建轨迹查询请求参数
 */
export const buildApiRequest = (params) => {
  const { baseUrl, endpoints } = API_CONFIG
  
  // 时间模式查询
  if (params.mode === 'time' && params.time?.start && params.time?.end) {
    return {
      url: `${baseUrl}${endpoints.byTime}`,
      config: {
        params: {
          mmsi: params.mmsi,
          start: params.time.start,
          end: params.time.end
        },
        timeout: API_CONFIG.timeout
      }
    }
  }
  
  // 索引模式查询（默认）
  return {
    url: `${baseUrl}${endpoints.byIndex}`,
    config: {
      params: {
        mmsi: params.mmsi,
        startIdx: params.index?.start ?? 0,
        endIdx: params.index?.end ?? 1000
      },
      timeout: API_CONFIG.timeout
    }
  }
}

/**
 * 执行轨迹查询
 */
export const fetchTrajectory = async (params) => {
  const { url, config } = buildApiRequest(params)
  
  logRequest(url, config.params)
  
  const response = await axios.get(url, config)
  return response.data
}

 /**
   * 📍 批量提交停留标记
   * @param {Array} marks - 标记数组，格式见下方
   */
 export const submitStayMarks = async (marks) => {
  try {
    const res = await api.post(`${baseUrl}${endpoints.marks}`)
    return handleResponse(res)
  } catch (err) {
    return handleError(err)
  }
}
