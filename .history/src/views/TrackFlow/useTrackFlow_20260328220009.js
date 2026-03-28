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

    // ========== ▶️ 播放控制 ==========
  
    const play = () => {
      if (!canPlay.value || isPlaying.value) return
      
      isPlaying.value = true
      startIndexByPoint()
    }
    
    const pause = () => {
      isPlaying.value = false
      if (playTimer) {
        clearInterval(playTimer)
        playTimer = null
      }
      emit('play-state', { playing: false, index: currentIndex.value })
    }
    
    const togglePlay = () => {
      isPlaying.value ? pause() : play()
    }
    
    const stop = () => {
      pause()
      currentIndex.value = 0
      emit('play-seek', { index: 0 })
    }
    
    const setSpeed = (speed) => {
      if (PLAY_CONFIG.SPEEDS.includes(speed)) {
        playbackSpeed.value = speed
        // 如果正在播放，重启以应用新速度
        if (isPlaying.value) {
          pause()
          play()
        }
        emit('speed-change', { speed })
      }
    }
    
    // 逐点播放核心逻辑
    const startIndexByPoint = () => {
      // 基础间隔：100ms/点，倍速越快间隔越短
      const baseInterval = 100
      const interval = baseInterval / playbackSpeed.value
      
      playTimer = setInterval(() => {
        // 边界检查
        if (currentIndex.value >= allPoints.value.length - 1) {
          pause()
          emit('play-complete')
          return
        }
        
        // 移动索引
        currentIndex.value++
        const point = allPoints.value[currentIndex.value]
        
        // 更新地图：高亮当前点 + 移动船舶图标
        if (isMapReady.value && point) {
          updateShipMarker(point, { animate: true, duration: interval })
        }
        
        // 发射事件（父组件可同步更新面板）
        emit('play-point', {
          index: currentIndex.value,
          point,
          progress: (currentIndex.value / allPoints.value.length) * 100
        })
        
        // 🔥 预加载检查
        if (needPreload.value) {
          preloadNextBatch()
        }
        
      }, interval)
    }
    
    // 预加载下一批数据
    const preloadNextBatch = async () => {
      if (!nextBatchStart.value || isPreloading.value || !queryRange.value.end) return
      
      isPreloading.value = true
      
      try {
        const result = await fetchTrajectoryByTime(
          mmsi.value,
          nextBatchStart.value,
          queryRange.value.end,
          PLAY_CONFIG.BATCH_SIZE
        )
        
        const newPoints = parsePoints(result.data || result)
        
        if (newPoints.length > 0) {
          // 追加到所有点
          const offset = allPoints.value.length
          const pointsWithIndex = newPoints.map((p, i) => ({ ...p, index: offset + i }))
          
          allPoints.value = [...allPoints.value, ...pointsWithIndex]
          
          // 更新预加载锚点
          if (newPoints.length >= PLAY_CONFIG.BATCH_SIZE) {
            nextBatchStart.value = newPoints[newPoints.length - 1].timestamp + 1
          } else {
            nextBatchStart.value = null // 已全部加载
          }
          
          console.log(`✅ 预加载 ${newPoints.length} 点，总计 ${allPoints.value.length} 点`)
          emit('data-appended', { count: newPoints.length, total: allPoints.value.length })
        }
        
      } catch (err) {
        console.warn('⚠️ 预加载失败:', err)
        // 不中断播放，仅记录
      } finally {
        isPreloading.value = false
      }
    }
    
    // 跳转到指定点
    const seekTo = (index) => {
      const target = Math.max(0, Math.min(index, allPoints.value.length - 1))
      currentIndex.value = target
      const point = allPoints.value[target]
      
      if (isMapReady.value && point) {
        updateShipMarker(point)
        centerOn(point.lat, point.lng)
      }
      
      emit('play-seek', { index: target, point })
    }
  
    // ========== 📍 停留标记管理 ==========
    
    // 开始标记：选中起点
    const startMarking = (point, index) => {
      if (markMode.value !== 'idle') return
      
      markMode.value = 'selecting-start'
      currentMark.value = {
        id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        mmsi: mmsi.value,
        startPoint: point,
        startIndex: index,
        startTime: point?.timestamp,
        endPoint: null,
        endIndex: null,
        endTime: null,
        stayType: '靠泊',  // 默认
        port: '',
        note: '',
        status: 'draft'
      }
      
      emit('mark-state', { mode: 'selecting-start', mark: currentMark.value })
    }
    
    // 结束标记：选中终点
    const endMarking = (point, index) => {
      if (markMode.value !== 'selecting-start' || !currentMark.value) return
      
      currentMark.value = {
        ...currentMark.value,
        endPoint: point,
        endIndex: index,
        endTime: point?.timestamp
      }
      
      markMode.value = 'editing'
      emit('mark-state', { mode: 'selecting-end', mark: currentMark.value })
    }
    
    // 更新标记字段
    const updateMarkField = (field, value) => {
      if (!currentMark.value) return
      currentMark.value[field] = value
      emit('mark-update', { field, value })
    }
    
    // 添加到待提交列表
    const addPendingMark = () => {
      if (!currentMark.value?.startTime || !currentMark.value?.endTime) {
        error.value = '请选择起始和结束点'
        return
      }
      
      // 去重：相同时间范围的标记
      const exists = pendingMarks.value.some(m => 
        m.startTime === currentMark.value.startTime && 
        m.endTime === currentMark.value.endTime
      )
      
      if (!exists) {
        pendingMarks.value.push({ ...currentMark.value })
        emit('mark-added', { mark: currentMark.value })
      }
      
      resetMarkForm()
    }
    
    // 从待提交列表移除
    const removePendingMark = (id) => {
      const idx = pendingMarks.value.findIndex(m => m.id === id)
      if (idx >= 0) {
        const removed = pendingMarks.value.splice(idx, 1)[0]
        emit('mark-removed', { id, mark: removed })
        return true
      }
      return false
    }
    
    // 批量提交到后端
    const submitPendingMarks = async () => {
      if (pendingMarks.value.length === 0) {
        error.value = '没有可提交的标记'
        return
      }
      
      loading.value = true
      
      try {
        // 转换格式：前端 -> 后端
        const marksForApi = pendingMarks.value.map(m => ({
          mmsi: m.mmsi,
          startTime: m.startTime,
          endTime: m.endTime,
          stayType: m.stayType,
          port: m.port,
          note: m.note  // 可选
        }))
        
        const result = await submitStayMarks(marksForApi)
        
        // 更新状态：标记为已提交
        pendingMarks.value.forEach(m => {
          m.status = 'synced'
          m.serverId = result?.ids?.[m.id] // 如果后端返回新 ID
        })
        
        // 在地图上绘制
        if (isMapReady.value) {
          pendingMarks.value.forEach(m => {
            if (m.startPoint && m.endPoint) {
              drawStayMarker(m)
            }
          })
        }
        
        emit('marks-submitted', { count: pendingMarks.value.length, result })
        
        // 清空待提交列表
        pendingMarks.value = []
        
        return { success: true, result }
        
      } catch (err) {
        console.error('❌ 提交标记失败:', err)
        error.value = err.message || '提交失败'
        emit('submit-error', { error: err })
        return { success: false, error: err }
      } finally {
        loading.value = false
      }
    }
    
    // 重置标记表单
    const resetMarkForm = () => {
      currentMark.value = null
      markMode.value = 'idle'
    }
    
    // 取消当前标记
    const cancelMarking = () => {
      resetMarkForm()
      emit('mark-state', { mode: 'idle', mark: null })
    }
  
    // ========== 🔄 工具 & 清理 ==========
    
    // 清空轨迹
    const clearTrajectory = () => {
      allPoints.value = []
      displayedPoints.value = []
      currentIndex.value = 0
      nextBatchStart.value = null
      pause()
      if (isMapReady.value && layers.value.trajectory) {
        map.value.removeLayer(layers.value.trajectory)
      }
    }
    
    // 清空标记
    const clearMarks = () => {
      pendingMarks.value = []
      if (isMapReady.value) {
        clearStayMarkers()
      }
    }
    
    // 导出标记为表格数据
    const exportMarksTable = () => {
      return pendingMarks.value.map(m => ({
        ID: m.id,
        MMSI: m.mmsi,
        开始时间: formatTime(m.startTime),
        结束时间: formatTime(m.endTime),
        时长: formatDuration(m.endTime - m.startTime),
        类型: m.stayType,
        港口: m.port,
        备注: m.note,
        状态: m.status
      }))
    }
  
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