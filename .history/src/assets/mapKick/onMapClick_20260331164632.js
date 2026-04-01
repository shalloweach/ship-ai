// src/assets/mapKick/onMapClick.js
import { markFlow, createMarkData } from './useMarkFlow'
import { markEventBus, MARK_EVENTS } from './markEventBus'

export const pickPointFromMap = async (mapEvent, { trajectoryPoints, mapOp } = {}) => {
  if (mapOp?.pickPointAt) return await mapOp.pickPointAt(mapEvent.lnglat || mapEvent.latlng)
  const clicked = mapEvent.lnglat || mapEvent.latlng
  if (!clicked || !trajectoryPoints?.length) return null
  const threshold = 0.001
  return trajectoryPoints.find(p => 
    Math.abs(p.lat - clicked.lat) < threshold && 
    Math.abs(p.lon - (clicked.lng || clicked.lon)) < threshold
  )
}

export const handlePointsSelected = async (start, end, options = {}) => {
  const { onHighlight, onEditOpen, mmsi = '' } = options
  const tempMark = createMarkData(start, end)
  
  markFlow.value.tempMark = tempMark
  markFlow.value.mode = 'editing'
  markEventBus.emit(MARK_EVENTS.END, { startPoint: start, endPoint: end, mark: tempMark })
  
  if (onHighlight && start.idx != null && end.idx != null) {
    await onHighlight(start.idx, end.idx, tempMark)
  }
  if (onEditOpen) onEditOpen(tempMark, { isNew: true })
  return tempMark
}

export function createMapClickHandler(options = {}) {
  const { mapOp, trajectoryPoints, mmsi, onHighlight, onEditOpen } = options
  
  return async (e) => {
    const { mode, startPoint } = markFlow.value
    
    // 🔥 等待选终点
    if (mode === 'selecting-end' && startPoint) {
      const point = await pickPointFromMap(e, { trajectoryPoints: trajectoryPoints?.value, mapOp })
      if (point) {
        await handlePointsSelected(startPoint, point, {
          mmsi: mmsi?.value || mmsi, onHighlight, onEditOpen
        })
      }
      return
    }
    // 普通点击由 trajectoryLayer.js 处理弹窗，这里不重复
  }
}

export default { pickPointFromMap, handlePointsSelected, createMapClickHandler, markFlow }