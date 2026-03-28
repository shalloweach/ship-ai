// src/api/difyApi.js
const DIFY_API_BASE = 'http://106.15.176.173/v1'
const API_KEY = 'your-dify-api-key-here' // 替换为你的 Dify API Key

export const generateAIReport = async (mmsi, shipInfo, itinerary) => {
  const response = await fetch(`${DIFY_API_BASE}/workflows/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {
        mmsi: mmsi,
        shipInfo: shipInfo,
        itinerary: itinerary
      },
      response_mode: 'blocking', // 使用阻塞模式，简单易用
      user: `user_${Date.now()}` // 用户标识，可以是 session ID 或时间戳
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dify API Error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  
  // 提取 AI 生成的报告文本
  if (data.data && data.data.outputs && data.data.outputs.text) {
    return data.data.outputs.text
  } else {
    throw new Error('AI 报告生成失败：未返回有效内容')
  }
}