// src/assets/mapKick/onMapClick.js
/**
 * 🖱️ 地图点击事件处理器
 * 处理轨迹点选择、标记流程、两点配对等逻辑
 */

import { markFlow, pendingMarks, createMarkData, saveMarkToTable } from './useMarkFlow'
import { markEventBus, MARK_EVENTS } from './markEventBus'

// ========== 🎯 地图点击事件 ==========

/**
 * 从地图事件拾取轨迹点
 * @param {Object} mapEvent - 地图点击事件
 * @param {Object} options - 选项
 * @returns {Object|null} 轨迹点数据
 */
export const pickPointFromMap = async (mapEvent, { trajectoryPoints, mapOp } = {}) => {
  // 优先：地图库拾取
  if (mapOp?.pickPointAt) {
    return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
  }
  
  // 降级：附近点搜索
  const clicked = mapEvent.lnglat || mapEvent.latlng
  if (!clicked || !trajectoryPoints?.length) return null
  
  const threshold = 0.001  // ~100 米
  return trajectoryPoints.find(p => 
    Math.abs(p.lat - clicked.lat) < threshold && 
    Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
  )
}

/**
 * 处理两点配对（起点 + 终点）
 * @param {Object} start - 起点
 * @param {Object} end - 终点
 * @param {Object} options - 选项
 */
export const handlePointsSelected = async (start, end, options = {}) => {
  const { onHighlight, onEditOpen, mmsi = '' } = options
  
  // 构建标记数据
  const tempMark = createMarkData(start, end)
  markFlow.value.tempMark = tempMark
  markFlow.value.mode = 'editing'
  
  // 🔥 触发事件：选择终点完成
  markEventBus.emit(MARK_EVENTS.END, { 
    startPoint: start, 
    endPoint: end, 
    mark: tempMark 
  })
  
  // 可选：高亮轨迹
  if (onHighlight && start.idx != null && end.idx != null) {
    await onHighlight(start.idx, end.idx, tempMark)
  }
  
  // 可选：打开编辑弹窗
  if (onEditOpen) {
    onEditOpen(tempMark, { isNew: true })
  }
  
  return tempMark
}

/**
 * 地图点击事件处理器
 * @param {Object} options - 配置选项
 * @returns {Function} onMapClick 事件处理函数
 */
export function createMapClickHandler(options = {}) {
  const { mapOp, trajectoryPoints, mmsi, onHighlight, onEditOpen } = options
  
  /**
   * 地图点击事件处理
   * @param {Object} e - 地图点击事件
   */
  const onMapClick = async (e) => {
    const { mode, startPoint } = markFlow.value
    
    // 🔥 情况 1：正在等待选终点
    if (mode === 'selecting-end' && startPoint) {
      const point = await pickPointFromMap(e, { trajectoryPoints: trajectoryPoints?.value, mapOp })
      if (point) {
        await handlePointsSelected(startPoint, point, {
          mmsi: mmsi?.value || mmsi,
          onHighlight,
          onEditOpen
        })
      }
      return
    }
    
    // 🔥 情况 2：普通点击 → 显示数据弹窗（由外部处理）
    // 这里不处理，避免与 trajectoryLayer.js 的弹窗冲突
  }
  
  return onMapClick
}

/**
 * 保存标记到表格（带事件通知）
 * @param {Object} markData - 标记数据
 * @param {string} mmsi - 船舶 MMSI
 * @returns {Object} 保存结果
 */
export const saveMarkWithEvent = (markData, mmsi = '') => {
  const result = saveMarkToTable(markData, { mmsi })
  
  if (result.success) {
    // 🔥 触发事件：标记已保存
    markEventBus.emit(MARK_EVENTS.SAVED, { mark: result.mark })
  }
  
  return result
}

/**
 * 提交标记（带事件通知）
 * @param {Function} onSubmit - 后端提交函数
 * @returns {Object} 提交结果
 */
export const submitMarksWithEvent = async (onSubmit) => {
  // 从 useMarkFlow 导入 submitPendingMarks
  const { submitPendingMarks } = await import('./useMarkFlow')
  const result = await submitPendingMarks(onSubmit)
  
  if (result.success) {
    // 🔥 触发事件：标记已提交
    markEventBus.emit(MARK_EVENTS.SUBMITTED, { count: pendingMarks.value.length })
  }
  
  return result
}

// ========== 📦 默认导出 ==========
export default {
  pickPointFromMap,
  handlePointsSelected,
  createMapClickHandler,
  saveMarkWithEvent,
  submitMarksWithEvent,
  // 重新导出状态
  markFlow,
  pendingMarks
}