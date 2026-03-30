/**
 * 🗺️ TSuseMap - 时间滑块面板的地图操作封装
 * 职责：轨迹渲染、清除、居中、高亮等纯地图交互
 * 注意：不包含业务逻辑，仅操作 map 实例
 */

/**
 * 初始化地图操作实例
 * @param {Ref<Object>} mapRef - 地图实例的 ref
 * @returns {Object} 地图操作方法集合
 */
export function useTSMap(mapRef) {
  
    /**
     * 绘制轨迹点到地图
     * @param {Array} points - 轨迹点数组 [{lat, lng, timestamp, ...}]
     * @param {Object} options - 绘制选项
     */
    const drawTrajectory = (points, options = {}) => {
      const map = mapRef.value
      if (!map?.addTrajectory) {
        console.warn('⚠️ 地图实例未就绪或无 addTrajectory 方法')
        return
      }
      
      map.addTrajectory(points, {
        color: options.color || '#3b82f6',
        width: options.width || 3,
        opacity: options.opacity || 0.8,
        showDots: options.showDots ?? false,
        dotRadius: options.dotRadius || 4,
        ...options
      })
    }
    
    /**
     * 清除地图上的轨迹
     */
    const clearTrajectory = () => {
      const map = mapRef.value
      map?.clearTrajectory?.()
    }
    
    /**
     * 居中显示指定点或轨迹范围
     * @param {Object} point - 目标点 {lat, lng}
     * @param {number} zoom - 缩放级别（可选）
     */
    const centerOn = (point, zoom = 12) => {
      const map = mapRef.value
      if (!point?.lat || !point?.lng) return
      map?.centerOn?.(point.lat, point.lng, zoom)
    }
    
    /**
     * 高亮显示当前播放点
     * @param {Object} point - 当前点
     * @param {string} prevPointId - 上一个高亮点ID（用于清除）
     * @returns {string} 当前高亮点ID
     */
    const highlightPoint = (point, prevPointId = null) => {
      const map = mapRef.value
      if (!point?.lat || !point?.lng) return prevPointId
      
      // 清除上一个高亮
      if (prevPointId && map?.removeMarker) {
        map.removeMarker(prevPointId)
      }
      
      // 添加新的高亮标记
      const markerId = `highlight-${Date.now()}`
      map?.addMarker?.(markerId, {
        lat: point.lat,
        lng: point.lng,
        icon: '🚢',
        size: 24,
        zIndex: 1000
      })
      
      return markerId
    }
    
    /**
     * 批量更新轨迹（先清除再绘制，避免闪烁）
     * @param {Array} points - 新轨迹点
     * @param {Object} drawOptions - 绘制选项
     */
    const updateTrajectory = (points, drawOptions = {}) => {
      clearTrajectory()
      if (points?.length > 0) {
        drawTrajectory(points, drawOptions)
        // 自动居中到第一个点
        centerOn(points[0], 12)
      }
    }
    
    /**
     * 根据索引范围过滤并绘制轨迹
     * @param {Array} allPoints - 全部轨迹点
     * @param {number} startIdx - 开始索引
     * @param {number} endIdx - 结束索引
     * @param {Object} drawOptions - 绘制选项
     */
    const drawByIndexRange = (allPoints, startIdx, endIdx, drawOptions = {}) => {
      if (!Array.isArray(allPoints) || allPoints.length === 0) {
        clearTrajectory()
        return
      }
      
      const clipped = allPoints.slice(startIdx, Math.min(endIdx + 1, allPoints.length))
      updateTrajectory(clipped, drawOptions)
    }
    
    /**
     * 获取当前地图边界（用于联动计算）
     * @returns {Object|null} 边界信息 {north, south, east, west}
     */
    const getBounds = () => {
      const map = mapRef.value
      return map?.getBounds?.() || null
    }
    
    /**
     * 销毁地图资源（组件卸载时调用）
     */
    const destroy = () => {
      clearTrajectory()
      // 如需彻底销毁地图实例，由父组件处理
    }
    
    // 暴露方法供外部调用
    return {
      drawTrajectory,
      clearTrajectory,
      centerOn,
      highlightPoint,
      updateTrajectory,
      drawByIndexRange,
      getBounds,
      destroy
    }
  }
  
  export default useTSMap