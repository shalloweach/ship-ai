/**
 * 🗺️ TSuseMap - 地图操作封装（仅渲染，无业务逻辑）
 * 职责：draw / clear / update trajectory by index range
 */

/**
 * @param {Ref<Object>} mapRef - 地图实例 ref
 */
export function useTSMap(mapRef) {
  
    // 绘制轨迹
    const drawTrajectory = (points, options = {}) => {
      const map = mapRef.value
      if (!map?.addTrajectory || !points?.length) return
      
      map.addTrajectory(points, {
        color: options.color || '#3b82f6',
        width: options.width || 3,
        opacity: options.opacity ?? 0.8,
        ...options
      })
    }
    
    // 清除轨迹
    const clearTrajectory = () => {
      mapRef.value?.clearTrajectory?.()
    }
    
    // 居中显示
    const centerOn = (point, zoom = 12) => {
      if (!point?.lat || !point?.lng) return
      mapRef.value?.centerOn?.(point.lat, point.lng, zoom)
    }
    
    // 更新轨迹（先清后画）
    const updateTrajectory = (points, options = {}) => {
      clearTrajectory()
      if (points?.length > 0) {
        drawTrajectory(points, options)
        centerOn(points[0], 12)  // 自动居中到起点
      }
    }
    
    // ✅ 核心：按索引范围截取并绘制
    const drawByIndexRange = (allPoints, startIdx, endIdx, options = {}) => {
      if (!Array.isArray(allPoints) || allPoints.length === 0) {
        clearTrajectory()
        return
      }
      const clipped = allPoints.slice(startIdx, Math.min(endIdx + 1, allPoints.length))
      updateTrajectory(clipped, options)
    }
    
    // 销毁
    const destroy = () => clearTrajectory()
    
    return {
      drawTrajectory,
      clearTrajectory,
      centerOn,
      updateTrajectory,
      drawByIndexRange,  // ✅ 核心方法
      destroy
    }
  }
  
  export default useTSMap