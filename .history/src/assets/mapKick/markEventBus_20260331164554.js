// src/assets/mapKick/markEventBus.js
const listeners = {}

export const markEventBus = {
  on(event, callback) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(callback)
    return () => { listeners[event] = listeners[event]?.filter(cb => cb !== callback) }
  },
  emit(event, data) {
    listeners[event]?.forEach(cb => { try { cb(data) } catch(e) { console.error(e) } })
  },
  clear(event) { if (event) delete listeners[event]; else Object.keys(listeners).forEach(k => delete listeners[k]) }
}

export const MARK_EVENTS = {
  START: 'mark:start',      // 点击🏷️按钮
  END: 'mark:end',          // 选择终点完成
  SAVED: 'mark:saved',      // 标记已保存
  SUBMITTED: 'mark:submitted',
  CANCEL: 'mark:cancel'
}

export default markEventBus