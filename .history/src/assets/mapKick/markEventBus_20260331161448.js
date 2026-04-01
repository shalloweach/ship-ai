// src/assets/mapKick/markEventBus.js
/**
 * 🏷️ 标记事件总线 - 避免循环依赖的轻量方案
 */

const listeners = {}

export const markEventBus = {
  // 订阅事件
  on(event, callback) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(callback)
    return () => {
      listeners[event] = listeners[event]?.filter(cb => cb !== callback)
    }
  },
  
  // 发布事件
  emit(event, data) {
    listeners[event]?.forEach(cb => cb(data))
  },
  
  // 清空
  clear(event) {
    if (event) {
      delete listeners[event]
    } else {
      Object.keys(listeners).forEach(key => delete listeners[key])
    }
  }
}

// 事件名称常量
export const MARK_EVENTS = {
  START: 'mark:start',      // 开始标记（点击🏷️）
  END: 'mark:end',          // 选择终点
  SAVED: 'mark:saved',      // 标记已保存
  SUBMITTED: 'mark:submitted' // 标记已提交
}

export default markEventBus