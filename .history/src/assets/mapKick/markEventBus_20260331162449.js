// src/assets/mapKick/markEventBus.js
/**
 * 🏷️ 标记事件总线
 * 用于模块间解耦通信，避免循环依赖
 */

const listeners = {}

export const markEventBus = {
  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = []
    }
    listeners[event].push(callback)
    
    // 返回取消订阅函数
    return () => {
      listeners[event] = listeners[event]?.filter(cb => cb !== callback)
    }
  },
  
  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    listeners[event]?.forEach(callback => {
      try {
        callback(data)
      } catch (err) {
        console.error(`🏷️ 事件回调错误 [${event}]:`, err)
      }
    })
  },
  
  /**
   * 清空事件监听
   * @param {string} event - 事件名称，为空则清空所有
   */
  clear(event) {
    if (event) {
      delete listeners[event]
    } else {
      Object.keys(listeners).forEach(key => delete listeners[key])
    }
  },
  
  /**
   * 获取监听器数量（调试用）
   */
  getListenerCount(event) {
    return listeners[event]?.length || 0
  }
}

// ========== 事件名称常量 ==========
export const MARK_EVENTS = {
  /** 开始标记（点击🏷️按钮） */
  START: 'mark:start',
  
  /** 选择终点完成 */
  END: 'mark:end',
  
  /** 标记已保存到表格 */
  SAVED: 'mark:saved',
  
  /** 标记已提交到后端 */
  SUBMITTED: 'mark:submitted',
  
  /** 标记流程取消 */
  CANCEL: 'mark:cancel',
  
  /** 标记数据更新 */
  UPDATED: 'mark:updated',
  
  /** 标记删除 */
  DELETED: 'mark:deleted'
}

export default markEventBus