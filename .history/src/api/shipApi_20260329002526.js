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

