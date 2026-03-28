// src/components/TimeSliderPanel/useStayMarker.js
import { ref, computed } from 'vue'

// 停留类型枚举
export const STAY_TYPES = [
  { value: 'berth', label: '🏭 靠泊', color: '#10b981' },
  { value: 'anchor', label: '⚓ 锚泊', color: '#3b82f6' },
  { value: 'abnormal', label: '⚠️ 异常', color: '#ef4444' },
  { value: 'other', label: '📦 其他', color: '#6b7280' }
]

// 港口选项（实际应从后端获取）
export const DEFAULT_PORTS = [
  '上海港', '宁波舟山港', '深圳港', '广州港', '青岛港',
  '天津港', '厦门港', '大连港', '其他'
]

export function useStayMarker(props, emit) {
  // ========== 标记状态 ==========
  const markers = ref([])           // 已保存的标记列表
  const currentMarker = ref(null)   // 正在创建的标记
  const markerMode = ref('idle')    // 'idle' | 'selecting-start' | 'selecting-end' | 'editing'
  
  // 表单状态
  const markerForm = ref({
    type: 'berth',
    port: '',
    note: ''
  })
  
  // ========== 计算属性 ==========
  const isMarking = computed(() => markerMode.value !== 'idle')
  const canSaveMarker = computed(() => {
    return currentMarker.value?.startPoint && 
           currentMarker.value?.endPoint &&
           markerForm.value.type
  })
  
  // ========== 标记流程控制 ==========
  
  /** 开始标记：选中起始点 */
  const startMarker = (point, index) => {
    if (markerMode.value !== 'idle') return
    
    markerMode.value = 'selecting-start'
    currentMarker.value = {
      id: `temp_${Date.now()}`,
      mmsi: props.mmsi,
      startPoint: point,
      startIndex: index,
      startTs: point?.timestamp,
      endPoint: null,
      endIndex: null,
      endTs: null,
      ...markerForm.value
    }
    
    emit('marker-state-change', {
      mode: 'selecting-start',
      tempMarker: currentMarker.value
    })
  }
  
  /** 结束标记：选中结束点 */
  const endMarker = (point, index) => {
    if (markerMode.value !== 'selecting-start' || !currentMarker.value) return
    
    currentMarker.value = {
      ...currentMarker.value,
      endPoint: point,
      endIndex: index,
      endTs: point?.timestamp
    }
    
    markerMode.value = 'editing'
    emit('marker-state-change', {
      mode: 'selecting-end',
      tempMarker: currentMarker.value
    })
  }
  
  /** 设置停留类型 */
  const setMarkerType = (type) => {
    if (!currentMarker.value) return
    markerForm.value.type = type
    currentMarker.value.type = type
    emit('marker-form-update', { field: 'type', value: type })
  }
  
  /** 设置停留港口 */
  const setMarkerPort = (port) => {
    if (!currentMarker.value) return
    markerForm.value.port = port
    currentMarker.value.port = port
    emit('marker-form-update', { field: 'port', value: port })
  }
  
  /** 保存标记 */
  const saveMarker = async () => {
    if (!canSaveMarker.value) return
    
    const marker = {
      id: currentMarker.value.id,
      mmsi: currentMarker.value.mmsi,
      start_time: currentMarker.value.startTs,      // 毫秒时间戳
      end_time: currentMarker.value.endTs,
      stay_type: currentMarker.value.type,
      port: currentMarker.value.port || '未知',
      note: currentMarker.value.note || '',
      // 附加轨迹点索引（便于回溯）
      start_index: currentMarker.value.startIndex,
      end_index: currentMarker.value.endIndex,
      // 坐标快照
      start_location: {
        lng: currentMarker.value.startPoint?.lng,
        lat: currentMarker.value.startPoint?.lat
      },
      end_location: {
        lng: currentMarker.value.endPoint?.lng,
        lat: currentMarker.value.endPoint?.lat
      }
    }
    
    try {
      // 🔥 发射标记数据，由父组件负责提交后端
      emit('marker-saved', marker)
      
      // 添加到本地列表
      markers.value.push(marker)
      
      // 重置状态
      resetMarkerForm()
      
      return { success: true, marker }
    } catch (err) {
      console.error('❌ 保存标记失败:', err)
      emit('marker-error', { error: err, marker: currentMarker.value })
      return { success: false, error: err }
    }
  }
  
  /** 取消当前标记 */
  const cancelMarker = () => {
    resetMarkerForm()
    emit('marker-state-change', { mode: 'idle', tempMarker: null })
  }
  
  /** 重置表单 */
  const resetMarkerForm = () => {
    currentMarker.value = null
    markerMode.value = 'idle'
    markerForm.value = { type: 'berth', port: '', note: '' }
  }
  
  /** 删除已保存的标记 */
  const deleteMarker = (markerId) => {
    const idx = markers.value.findIndex(m => m.id === markerId)
    if (idx >= 0) {
      const deleted = markers.value.splice(idx, 1)[0]
      emit('marker-deleted', { id: markerId, marker: deleted })
      return true
    }
    return false
  }
  
  /** 加载已有标记（从后端获取后调用） */
  const loadMarkers = (markerList) => {
    markers.value = markerList || []
  }
  
  // ========== 工具函数 ==========
  const formatMarkerTime = (ts) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }
  
  const getStayDuration = (startTs, endTs) => {
    if (!startTs || !endTs) return '-'
    const minutes = Math.round((endTs - startTs) / 60000)
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} 小时`
    const days = Math.round(hours / 24)
    return `${days} 天`
  }
  
  // ========== 暴露方法 ==========
  const exposeMethods = {
    startMarker, endMarker, setMarkerType, setMarkerPort,
    saveMarker, cancelMarker, deleteMarker, loadMarkers,
    resetMarkerForm
  }
  
  return {
    // 状态
    markers, currentMarker, markerMode, markerForm,
    isMarking, canSaveMarker,
    // 枚举
    STAY_TYPES, DEFAULT_PORTS,
    // 方法
    startMarker, endMarker, setMarkerType, setMarkerPort,
    saveMarker, cancelMarker, deleteMarker, loadMarkers,
    // 工具
    formatMarkerTime, getStayDuration,
    exposeMethods
  }
}