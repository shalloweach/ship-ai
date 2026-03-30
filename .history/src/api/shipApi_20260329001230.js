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

import axios from 'axios'


export const API_CONFIG = {
  baseUrl: 'http://localhost:8877/api/ship',
  timeout: 30000,
  endpoints: {
    byTime: '/byTime',
    byIndex: '/byIndex',
    marks:'/marks'
  }
}
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
  
  const response = await axios.get(url, config)
  return response.data
}

 /**
   * 📍 批量提交停留标记
   * @param {Array} marks - 标记数组，格式见下方
   */
 export const submitStayMarks = async (marks) => {
  try {
    const res = await api.post(`${baseUrl}${endpoints.marks}`, { marks })
    return handleResponse(res)
  } catch (err) {
    return handleError(err)
  }
}