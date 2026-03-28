// src/views/TrackFlow/utils/errorHandlers.js

/**
 * 构建用户友好的错误消息
 */
export const buildErrorMessage = (err) => {
    // 网络/请求错误
    if (err?.response?.status === 404) {
      return '🔍 未找到该 MMSI 的轨迹数据'
    }
    if (err?.response?.status === 400) {
      return '❌ 请求参数错误，请检查查询条件'
    }
    if (err?.response?.status === 500) {
      return '🔧 服务器内部错误，请稍后重试'
    }
    
    // 客户端网络错误
    if (err?.code === 'ECONNABORTED') {
      return '⏱️ 请求超时，请检查网络连接'
    }
    if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
      return '🌐 网络连接失败，请检查后端服务'
    }
    
    // 默认错误
    return err?.message || '❓ 未知错误，请查看控制台详情'
  }
  
  /**
   * 日志记录辅助
   */
  export const logRequest = (url, params) => {
    console.log(`🔍 请求：${url}`, params)
  }
  
  export const logResponse = (pointCount, duration) => {
    console.log(`✅ 加载 ${pointCount} 个轨迹点 | 耗时: ${duration}ms`)
  }
  
  export const logError = (context, err) => {
    console.error(`❌ ${context}:`, err)
  }