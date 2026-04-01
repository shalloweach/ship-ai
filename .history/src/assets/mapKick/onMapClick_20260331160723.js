// src/assets/mapKick/onMapClick.js
// 🔧 导入标记管理器
import { useStayMarker } from '@/./useStayMarker'

// ========== 🎯 初始化（在组件 setup 中调用） ==========
/**
 * 使用示例：
 * const { onMapClick, pickPointFromMap, marker } = useMapClickHandler({
 *   mapOp,
 *   trajectoryPoints,
 *   mmsi,
 *   onSubmit: submitStayMarks  // 后端提交函数
 * })
 */
export function useMapClickHandler({ mapOp, trajectoryPoints, mmsi, onSubmit }) {
  // 🔧 初始化标记管理器
  const marker = useStayMarker({
    mapOp,
    onSubmit
  })
  
  // 🔧 从地图事件拾取轨迹点
  const pickPointFromMap = async (mapEvent) => {
    // 优先：地图库拾取
    if (mapOp?.pickPointAt) {
      return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
    }
    
    // 降级：附近点搜索
    const clicked = mapEvent.lnglat || mapEvent.latlng
    if (!clicked || !trajectoryPoints?.value?.length) return null
    
    const threshold = 0.001  // ~100 米
    return trajectoryPoints.value.find(p => 
      Math.abs(p.lat - clicked.lat) < threshold && 
      Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
    )
  }
  
  // 🔧 地图点击事件 - 核心入口
  const onMapClick = async (e) => {
    const { mode, startPoint } = marker.markFlow.value
    
    // 🔥 情况 1：正在等待选终点
    if (mode === 'selecting-end' && startPoint) {
      const point = await pickPointFromMap(e)
      if (point) {
        // ✅ 两点已齐，处理配对
        await marker.handlePointsSelected(startPoint, point, {
          onHighlight: async (startIdx, endIdx) => {
            // 高亮轨迹（如果 mapOp 支持）
            if (mapOp?.highlightTrajectory) {
              const segment = trajectoryPoints.value.slice(
                Math.min(startIdx, endIdx), 
                Math.max(startIdx, endIdx) + 1
              )
              await mapOp.highlightTrajectory(segment, {
                color: '#667eea',
                weight: 4,
                opacity: 0.9
              })
            }
          },
          onEditOpen: (tempMark) => {
            // 打开编辑弹窗（由父组件实现）
            // 这里通过事件通知，避免循环依赖
            window.__onMarkEditOpen?.(tempMark)
          }
        })
      }
      return
    }
    
    // 🔥 情况 2：普通点击 → 显示数据弹窗
    const point = await pickPointFromMap(e)
    if (point) {
      showDataPopup(point)
    }
  }
  
  // 🔧 显示数据弹窗（调用 trajectoryPopup）
  const showDataPopup = (point) => {
    if (!mapOp?.showPopup) return
    
    // 构建弹窗内容（trajectoryPopup.js 已实现）
    const content = buildPopupContent(point, {
      onMarkClick: (p) => {
        // 🏷️ 点击标记按钮 → 进入选终点模式
        marker.startMarkFlow(p)
      },
      onNavigate: (pos) => {
        // 🔍 定位到此点
        mapOp?.flyTo?.(pos.lon, pos.lat, 14)
      }
    })
    
    // 显示弹窗（需 mapOp 实现 showPopup）
    mapOp.showPopup(point.lon, point.lat, content)
  }
  
  // 🔧 暴露：供外部调用
  const expose = () => ({
    // 状态
    markFlow: marker.markFlow,
    pendingMarks: marker.pendingMarks,
    editDialog: marker.editDialog,
    
    // 方法
    onMapClick,
    pickPointFromMap,
    startMarkFlow: marker.startMarkFlow,
    cancelMarkFlow: marker.cancelMarkFlow,
    saveMarkToTable: marker.saveMarkToTable,
    submitPendingMarks: marker.submitPendingMarks,
    
    // 注册弹窗编辑回调（避免循环依赖）
    onEditOpen: (callback) => {
      window.__onMarkEditOpen = callback
    }
  })
  
  return expose()
}

export default useMapClickHandler