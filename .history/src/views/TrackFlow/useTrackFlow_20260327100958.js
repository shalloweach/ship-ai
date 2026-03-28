// src/views/TrackFlow/useTrackFlow.js

import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchTrajectory } from './useApi'
import { 
  initLeafletMap, renderTrajectoryToMap, 
  cleanupMap, centerMapToTrajectory 
} from './useMap'
import { parsePoints, extractTimeRange, extractIndexRange } from './utils/dataParser'
import { buildErrorMessage, logError, logResponse } from './utils/errorHandlers'
import { formatDuration } from './utils/formatters'
import { QUERY_CONFIG, STORAGE_KEYS, MAP_CONFIG } from './utils/config'

export function useTrackFlow(mapContainerRef) {
  // Vue Router
  const route = useRoute()
  const router = useRouter()
  
  // 地图相关
  let map = null
  let layers = { markers: null, trajectory: null }
  
  // 响应式状态
  const currentMmsi = ref('')
  const globalRange = ref({
    time: { min: null, max: null },
    index: { min: 0, max: QUERY_CONFIG.defaultGlobalIndex.max }
  })
  const queryRange = ref({
    time: { start: null, end: null },
    index: { ...QUERY_CONFIG.defaultIndexRange }
  })
  
  const loading = ref(false)
  const error = ref(null)
  const currentPointsCount = ref(0)
  const currentPoints = ref([])  // 缓存用于导出
  
  // 防重复查询
  const isQuerying = ref(false)
  
  // 计算属性
  const hasData = computed(() => currentPointsCount.value > 0)
  
  // ==================== 地图初始化 ====================
  const initMap = () => {
    if (!mapContainerRef?.value) {
      logError('地图初始化', '容器未找到')
      return
    }
    
    map = initLeafletMap(mapContainerRef.value)
    
    // 初始化空图层
    layers.markers = L.layerGroup().addTo(map)
    layers.trajectory = L.polyline([], MAP_CONFIG.polylineStyle).addTo(map)
    
    // 延迟调整尺寸（确保容器已渲染）
    setTimeout(() => map?.invalidateSize(), 100)
    
    console.log('🗺️ 地图初始化完成')
  }
  
  const cleanupMapResources = () => {
    cleanupMap(map, layers)
    map = null
    layers = { markers: null, trajectory: null }
    currentPoints.value = []
  }
  
  // ==================== MMSI 处理 ====================
  const handleMmsiChange = async (newMmsi) => {
    currentMmsi.value = newMmsi
    localStorage.setItem(STORAGE_KEYS.currentMmsi, newMmsi)
    
    // 清理并重建地图
    cleanupMapResources()
    await nextTick()
    
    if (mapContainerRef.value) {
      initMap()
    }
    
    // 重置查询范围
    resetQueryRange()
    
    // 执行新查询
    await doQuery({
      mmsi: newMmsi,
      mode: 'index',
      index: { ...QUERY_CONFIG.defaultIndexRange }
    })
  }
  
  // ==================== 查询范围管理 ====================
  const resetQueryRange = () => {
    globalRange.value = {
      time: { min: null, max: null },
      index: { min: 0, max: QUERY_CONFIG.defaultGlobalIndex.max }
    }
    queryRange.value = {
      time: { start: null, end: null },
      index: { ...QUERY_CONFIG.defaultIndexRange }
    }
    currentPointsCount.value = 0
    currentPoints.value = []
  }
  
  const updateGlobalRange = (apiResponse, points) => {
    // 时间范围
    if (apiResponse.startTime !== undefined && apiResponse.endTime !== undefined) {
      const { min, max } = globalRange.value.time
      globalRange.value.time.min = min === null 
        ? apiResponse.startTime 
        : Math.min(min, apiResponse.startTime)
      globalRange.value.time.max = max === null 
        ? apiResponse.endTime 
        : Math.max(max, apiResponse.endTime)
    }
    
    // 索引范围
    if (apiResponse.startIdx !== undefined && apiResponse.endIdx !== undefined) {
      const { min, max } = globalRange.value.index
      globalRange.value.index.min = Math.min(min, apiResponse.startIdx)
      globalRange.value.index.max = Math.max(max, apiResponse.endIdx)
    }
    
    // 兜底：从 points 推算
    if (points.length > 0) {
      const timeRange = extractTimeRange(points)
      const indexRange = extractIndexRange(points)
      
      if (timeRange.min && globalRange.value.time.min === null) {
        globalRange.value.time.min = timeRange.min
        globalRange.value.time.max = timeRange.max
      }
      if (indexRange.max > 0) {
        globalRange.value.index.min = Math.min(globalRange.value.index.min, indexRange.min)
        globalRange.value.index.max = Math.max(globalRange.value.index.max, indexRange.max)
      }
    }
  }
  
  const updateQueryRangeEcho = (apiResponse, requestParams) => {
    if (apiResponse.startTime !== undefined) {
      queryRange.value.time.start = apiResponse.startTime
      queryRange.value.time.end = apiResponse.endTime
    } else if (requestParams.time?.start) {
      queryRange.value.time.start = requestParams.time.start
      queryRange.value.time.end = requestParams.time.end
    }
    
    if (apiResponse.startIdx !== undefined) {
      queryRange.value.index.start = apiResponse.startIdx
      queryRange.value.index.end = apiResponse.endIdx
    } else if (requestParams.index?.start !== undefined) {
      queryRange.value.index.start = requestParams.index.start
      queryRange.value.index.end = requestParams.index.end
    }
  }
  
  // ==================== 核心查询逻辑 ====================
  const doQuery = async (params) => {
    if (!params?.mmsi) {
      error.value = 'MMSI 不能为空'
      return
    }
    
    // 防抖：避免重复查询
    if (isQuerying.value) {
      console.log('⚠️ 查询进行中，忽略重复请求')
      return
    }
    
    isQuerying.value = true
    loading.value = true
    error.value = null
    
    const startTime = Date.now()
    
    try {
      // 请求数据
      const data = await fetchTrajectory(params)
      
      // 解析点数据
      const points = parsePoints(data.points || [])
      
      if (points.length === 0) {
        error.value = '📭 未找到轨迹数据，请调整查询范围或更换 MMSI'
        if (layers.markers) layers.markers.clearLayers()
        if (layers.trajectory && map) map.removeLayer(layers.trajectory)
        currentPointsCount.value = 0
        return
      }
      
      // 更新范围信息
      updateGlobalRange(data, points)
      updateQueryRangeEcho(data, params)
      
      // 渲染地图
      const newLayers = renderTrajectoryToMap(map, points, layers)
      layers = newLayers
      
      // 缓存数据
      currentPoints.value = points
      currentPointsCount.value = points.length
      
      // 日志
      logResponse(points.length, Date.now() - startTime)
      
    } catch (err) {
      logError('查询失败', err)
      error.value = buildErrorMessage(err)
      if (layers.markers) layers.markers.clearLayers()
      if (layers.trajectory && map) map.removeLayer(layers.trajectory)
      currentPointsCount.value = 0
    } finally {
      loading.value = false
      isQuerying.value = false
    }
  }
  
  const onQuery = async (params) => {
    await doQuery(params)
  }
  
  // ==================== 扩展功能 ====================
  const exportTrajectory = () => {
    if (!currentPoints.value.length) return
    
    const headers = ['idx', 'timestamp', 'lat', 'lon', 'speed', 'course', 'destination', 'draught', 'navigationStatus']
    const rows = currentPoints.value.map(p => 
      headers.map(h => {
        const val = p[h]
        return val === null || val === undefined ? '' : String(val)
      }).join(',')
    )
    
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `track_${currentMmsi.value}_${Date.now()}.csv`
    a.click()
    
    URL.revokeObjectURL(url)
    console.log('📥 轨迹导出完成')
  }
  
  const clearMap = () => {
    if (layers.markers) layers.markers.clearLayers()
    if (layers.trajectory && map) {
      map.removeLayer(layers.trajectory)
      layers.trajectory = null
    }
    currentPointsCount.value = 0
    currentPoints.value = []
    console.log('🗑️ 地图已清空')
  }
  
  const centerMap = () => {
    centerMapToTrajectory(map, layers.trajectory)
  }
  
  const refreshQuery = () => {
    doQuery({
      mmsi: currentMmsi.value,
      mode: queryRange.value.time.start ? 'time' : 'index',
      time: { ...queryRange.value.time },
      index: { ...queryRange.value.index }
    })
  }
  
  // ==================== 生命周期 & 监听 ====================
  const setup = async () => {
    await nextTick()
    
    // 获取 MMSI（路由 > localStorage > 默认）
    const mmsi = route.query.mmsi || localStorage.getItem(STORAGE_KEYS.currentMmsi) || ''
    if (mmsi) {
      currentMmsi.value = mmsi
    }
    
    // 初始化地图
    if (mapContainerRef.value) {
      initMap()
    }
    
    // 自动查询
    if (currentMmsi.value) {
      await doQuery({
        mmsi: currentMmsi.value,
        mode: 'index',
        index: { ...QUERY_CONFIG.defaultIndexRange }
      })
    }
  }
  
  const teardown = () => {
    cleanupMapResources()
  }
  
  // 监听路由 MMSI 变化
  watch(() => route.query.mmsi, async (newMmsi) => {
    if (newMmsi && newMmsi !== currentMmsi.value) {
      await handleMmsiChange(newMmsi)
    }
  })
  
  // 监听 localStorage 变化（跨标签页同步）
  watch(() => localStorage.getItem(STORAGE_KEYS.currentMmsi), (newMmsi) => {
    if (newMmsi && newMmsi !== currentMmsi.value && !route.query.mmsi) {
      handleMmsiChange(newMmsi)
    }
  })
  
  // ==================== 暴露方法 ====================
  const exposeMethods = {
    refresh: refreshQuery,
    setMmsi: handleMmsiChange,
    getPoints: () => [...currentPoints.value],
    clearMap,
    centerMap,
    exportTrajectory
  }
  
  return {
    // 状态
    currentMmsi, globalRange, queryRange, loading, error, currentPointsCount, hasData,
    // 方法
    onQuery, refreshQuery, resetQueryRange,
    exportTrajectory, clearMap, centerMap,
    // 工具函数（供模板使用）
    formatDuration,
    // 生命周期
    setup, teardown,
    // 暴露方法
    exposeMethods
  }
}