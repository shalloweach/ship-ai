// 样式配置
const STYLES = {
    trajectory: {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8
    },
    trajectoryPlaying: {
      color: '#10b981',
      weight: 4,
      opacity: 1
    },
    shipIcon: {
      iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    },
    stayMarker: {
      berth: { color: '#10b981', fillOpacity: 0.2, icon: '🏭' },
      anchor: { color: '#3b82f6', fillOpacity: 0.2, icon: '⚓' },
      abnormal: { color: '#ef4444', fillOpacity: 0.3, icon: '⚠️' },
      other: { color: '#6b7280', fillOpacity: 0.15, icon: '📦' }
    }
  }// 渲染完整轨迹线
  const renderTrajectory = (points, options = {}) => {
    if (!map.value || !points?.length) return
    
    // 清除旧轨迹
    if (layers.value.trajectory) {
      map.value.removeLayer(layers.value.trajectory)
    }
    
    // 提取坐标
    const coords = points.map(p => [p.lat, p.lng])
    
    // 创建 polyline
    const style = {
      ...STYLES.trajectory,
      ...(options.style || {})
    }
    
    layers.value.trajectory = L.polyline(coords, style).addTo(map.value)
    
    // 自动适配视野
    if (options.fitBounds !== false) {
      fitBounds(coords)
    }
    
    return layers.value.trajectory
  }

  // 更新播放中的轨迹（高亮已播放部分）
  const updatePlayingTrajectory = (visibleRange, points) => {
    if (!map.value || !layers.value.trajectory) return
    
    const { start = 0, end = points.length - 1 } = visibleRange
    const visibleCoords = points.slice(start, end + 1).map(p => [p.lat, p.lng])
    
    // 更新样式为播放状态
    layers.value.trajectory.setStyle(STYLES.trajectoryPlaying)
    
    // 如果需要动态更新线段（性能考虑：建议重绘）
    // 简单方案：重绘可见部分
    const tempLine = L.polyline(visibleCoords, STYLES.trajectoryPlaying)
    tempLine.addTo(map.value)
    
    return tempLine
  }

  // 显示/更新船舶图标
  const updateShipMarker = (point, options = {}) => {
    if (!map.value || !point) return
    
    const { lat, lng, heading = 0 } = point
    
    // 移除旧图标
    if (layers.value.ship) {
      map.value.removeLayer(layers.value.ship)
    }
    
    // 创建旋转图标（根据航向）
    const icon = L.divIcon({
      className: 'ship-marker',
      html: `
        <div style="
          transform: rotate(${heading}deg);
          transition: transform 0.3s ease;
        ">🚢</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    
    layers.value.ship = L.marker([lat, lng], { icon })
      .addTo(map.value)
      .bindPopup(`
        <b>🚢 船舶实时位置</b><br/>
        时间: ${new Date(point.timestamp * 1000).toLocaleString()}<br/>
        速度: ${point.speed?.toFixed(1) || '-'} kn<br/>
        航向: ${heading}°
      `)
    
    // 平滑移动动画（可选）
    if (options.animate) {
      animateMarker(layers.value.ship, [lat, lng], options.duration || 1000)
    }
    
    return layers.value.ship
  }

  // 绘制停留标记区域
  const drawStayMarker = (marker) => {
    if (!map.value || !marker.startPoint || !marker.endPoint) return
    
    const { id, startPoint, endPoint, stayType, port } = marker
    const style = STYLES.stayMarker[stayType] || STYLES.stayMarker.other
    
    // 创建矩形区域（简化：用两点包围盒）
    const bounds = L.latLngBounds(
      [startPoint.lat, startPoint.lng],
      [endPoint.lat, endPoint.lng]
    )
    
    // 绘制区域
    const rect = L.rectangle(bounds, {
      color: style.color,
      weight: 2,
      fillOpacity: style.fillOpacity,
      dashArray: '5,5'
    }).addTo(map.value)
    
    // 添加标记图标（起点）
    const iconMarker = L.marker([startPoint.lat, startPoint.lng], {
      icon: L.divIcon({
        className: 'stay-icon',
        html: `<span style="font-size:20px">${style.icon}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map.value)
    
    // 绑定弹窗
    const popupContent = `
      <b>${style.icon} ${stayType}</b><br/>
      📍 ${port}<br/>
      🕐 ${formatTime(marker.startTime)} ~ ${formatTime(marker.endTime)}<br/>
      ⏱️ ${formatDuration(marker.endTime - marker.startTime)}
    `
    rect.bindPopup(popupContent)
    iconMarker.bindPopup(popupContent)
    
    // 保存到 layers
    layers.value.stayMarkers.set(id, { rect, iconMarker })
    
    return { rect, iconMarker }
  }

  // 移除停留标记
  const removeStayMarker = (id) => {
    const layers = layers.value.stayMarkers.get(id)
    if (layers && map.value) {
      map.value.removeLayer(layers.rect)
      map.value.removeLayer(layers.iconMarker)
      layers.value.stayMarkers.delete(id)
      return true
    }
    return false
  }

  // 清空所有标记
  const clearStayMarkers = () => {
    layers.value.stayMarkers.forEach(({ rect, iconMarker }) => {
      if (map.value) {
        map.value.removeLayer(rect)
        map.value.removeLayer(iconMarker)
      }
    })
    layers.value.stayMarkers.clear()
  }

  // 工具：适配视野
  const fitBounds = (coords, padding = [50, 50]) => {
    if (!map.value || !coords?.length) return
    const bounds = L.latLngBounds(coords)
    map.value.fitBounds(bounds, { padding })
    currentBounds.value = bounds
  }

  // 工具：居中到点
  const centerOn = (lat, lng, zoom = null) => {
    if (!map.value) return
    map.value.setView([lat, lng], zoom || map.value.getZoom(), { animate: true })
  }

  // 工具：标记点动画
  const animateMarker = (marker, targetLatLng, duration = 1000) => {
    const start = marker.getLatLng()
    const startTime = Date.now()
    
    const step = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 缓动函数
      const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      
      const lat = start.lat + (targetLatLng[0] - start.lat) * ease(progress)
      const lng = start.lng + (targetLatLng[1] - start.lng) * ease(progress)
      
      marker.setLatLng([lat, lng])
      
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }

  // 工具：时间格式化
  const formatTime = (ts) => {
    if (!ts) return '-'
    return new Date(ts * 1000).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins}分钟`
    const hours = Math.round(mins / 60)
    if (hours < 24) return `${hours}小时`
    return `${Math.round(hours / 24)}天`
  }

  // 清理
  const destroy = () => {
    if (map.value) {
      map.value.remove()
      map.value = null
    }
    layers.value = { trajectory: null, ship: null, stayMarkers: new Map() }
    isMapReady.value = false
  }

  // 生命周期
  onMounted(() => {
    if (containerRef.value) {
      initMap()
    }
  })
  
  onBeforeUnmount(() => {
    destroy()
  })

  return {
    // 状态
    map, layers, isMapReady, currentBounds,
    // 方法
    initMap, renderTrajectory, updatePlayingTrajectory,
    updateShipMarker, drawStayMarker, removeStayMarker, clearStayMarkers,
    fitBounds, centerOn, animateMarker,
    formatTime, formatDuration,
    destroy
  }
}
// 播放配置
const PLAY_CONFIG = {
    BATCH_SIZE: 5000,           // 每次请求点数
    PRELOAD_THRESHOLD: 1000,    // 剩余点数 < 1000 时预加载下一批
    DEFAULT_SPEED: 1,           // 默认倍速 (1 = 1点/100ms)
    SPEEDS: [0.5, 1, 2, 4, 8]   // 可选倍速
  }
  
  // 标记类型
  const STAY_TYPES = ['靠泊', '锚泊', '异常', '其他']
  
  export function useTrackFlow(containerRef, props, emit) {
    // ========== 依赖注入 ==========
    const { fetchTrajectoryByTime, submitStayMarks } = useApi()
    const {
      map, layers, isMapReady,
      renderTrajectory, updateShipMarker, drawStayMarker, clearStayMarkers,
      fitBounds, centerOn, formatTime, formatDuration
    } = useMap(containerRef)
  
    // ========== 状态 ==========
    
    // 查询参数
    const mmsi = ref(props.mmsi || '')
    const queryRange = ref({
      start: null,  // 秒级时间戳
      end: null
    })
    
    // 轨迹数据
    const allPoints = ref([])           // 已加载的所有点
    const displayedPoints = ref([])     // 当前渲染的点
    const loading = ref(false)
    const error = ref(null)
    
    // 播放控制
    const isPlaying = ref(false)
    const currentIndex = ref(0)
    const playbackSpeed = ref(PLAY_CONFIG.DEFAULT_SPEED)
    let playTimer = null
    
    // 预加载控制
    const nextBatchStart = ref(null)    // 下一批查询的起始时间
    const isPreloading = ref(false)
    
    // 停留标记（前端编辑态）
    const pendingMarks = ref([])        // 待提交的标记列表
    const currentMark = ref(null)       // 正在创建的标记
    const markMode = ref('idle')        // idle | selecting-start | selecting-end | editing
  
    // ========== 计算属性 ==========
    
    const hasData = computed(() => allPoints.value.length > 0)
    const canPlay = computed(() => hasData.value && !loading.value)
    const remainingPoints = computed(() => allPoints.value.length - currentIndex.value)
    const needPreload = computed(() => 
      remainingPoints.value <= PLAY_CONFIG.PRELOAD_THRESHOLD && 
      nextBatchStart.value && 
      !isPreloading.value
    )
  
    // ========== 🔍 轨迹查询（主入口） ==========
    
    const queryTrajectory = async (params) => {
      const { mmsi, start, end } = params
      if (!mmsi || !start || !end) {
        error.value = '缺少必要参数'
        return
      }
      
      loading.value = true
      error.value = null
      
      try {
        // 1. 查询第一批数据
        const result = await fetchTrajectoryByTime(mmsi, start, end, PLAY_CONFIG.BATCH_SIZE)
        
        // 2. 解析点数据（确保格式统一）
        const points = parsePoints(result.data || result)
        
        // 3. 更新状态
        mmsi.value = mmsi
        queryRange.value = { start, end }
        allPoints.value = points
        displayedPoints.value = points
        currentIndex.value = 0
        
        // 4. 设置预加载锚点
        if (points.length >= PLAY_CONFIG.BATCH_SIZE) {
          nextBatchStart.value = points[points.length - 1].timestamp + 1 // 秒级
        } else {
          nextBatchStart.value = null // 已全部加载
        }
        
        // 5. 渲染地图
        if (isMapReady.value) {
          renderTrajectory(points)
          if (points[0]) {
            centerOn(points[0].lat, points[0].lng, 12)
          }
        }
        
        // 6. 通知父组件
        emit('data-loaded', { count: points.length, range: { start, end } })
        
        return { success: true, count: points.length }
        
      } catch (err) {
        console.error('❌ 轨迹查询失败:', err)
        error.value = err.message || '查询失败'
        emit('query-error', { error: err })
        return { success: false, error: err }
      } finally {
        loading.value = false
      }
    }
    
    // 解析点数据（适配不同后端格式）
    const parsePoints = (raw) => {
      return (raw || []).map((p, idx) => ({
        index: idx,
        timestamp: p.timestamp || p.time || p.ts,  // 秒级
        lng: p.longitude || p.lng || p.lon,
        lat: p.latitude || p.lat,
        speed: p.speed || p.sog,
        heading: p.heading || p.cog || 0,
        // 保留原始数据
        raw: p
      })).filter(p => p.lat && p.lng && p.timestamp) // 过滤无效点
    }
  
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
  

/**
 * 标记停留
 */
// 样式配置
const STYLES = {
  trajectory: {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.8
  },
  trajectoryPlaying: {
    color: '#10b981',
    weight: 4,
    opacity: 1
  },
  shipIcon: {
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  },
  stayMarker: {
    berth: { color: '#10b981', fillOpacity: 0.2, icon: '🏭' },
    anchor: { color: '#3b82f6', fillOpacity: 0.2, icon: '⚓' },
    abnormal: { color: '#ef4444', fillOpacity: 0.3, icon: '⚠️' },
    other: { color: '#6b7280', fillOpacity: 0.15, icon: '📦' }
  }
}


// 更新播放中的轨迹（高亮已播放部分）
const updatePlayingTrajectory = (visibleRange, points) => {
  if (!map.value || !layers.value.trajectory) return
  
  const { start = 0, end = points.length - 1 } = visibleRange
  const visibleCoords = points.slice(start, end + 1).map(p => [p.lat, p.lng])
  
  // 更新样式为播放状态
  layers.value.trajectory.setStyle(STYLES.trajectoryPlaying)
  
  // 如果需要动态更新线段（性能考虑：建议重绘）
  // 简单方案：重绘可见部分
  const tempLine = L.polyline(visibleCoords, STYLES.trajectoryPlaying)
  tempLine.addTo(map.value)
  
  return tempLine
}

// 显示/更新船舶图标
const updateShipMarker = (point, options = {}) => {
  if (!map.value || !point) return
  
  const { lat, lng, heading = 0 } = point
  
  // 移除旧图标
  if (layers.value.ship) {
    map.value.removeLayer(layers.value.ship)
  }
  
  // 创建旋转图标（根据航向）
  const icon = L.divIcon({
    className: 'ship-marker',
    html: `
      <div style="
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease;
      ">🚢</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
  
  layers.value.ship = L.marker([lat, lng], { icon })
    .addTo(map.value)
    .bindPopup(`
      <b>🚢 船舶实时位置</b><br/>
      时间: ${new Date(point.timestamp * 1000).toLocaleString()}<br/>
      速度: ${point.speed?.toFixed(1) || '-'} kn<br/>
      航向: ${heading}°
    `)
  
  // 平滑移动动画（可选）
  if (options.animate) {
    animateMarker(layers.value.ship, [lat, lng], options.duration || 1000)
  }
  
  return layers.value.ship
}

// 绘制停留标记区域
const drawStayMarker = (marker) => {
  if (!map.value || !marker.startPoint || !marker.endPoint) return
  
  const { id, startPoint, endPoint, stayType, port } = marker
  const style = STYLES.stayMarker[stayType] || STYLES.stayMarker.other
  
  // 创建矩形区域（简化：用两点包围盒）
  const bounds = L.latLngBounds(
    [startPoint.lat, startPoint.lng],
    [endPoint.lat, endPoint.lng]
  )
  
  // 绘制区域
  const rect = L.rectangle(bounds, {
    color: style.color,
    weight: 2,
    fillOpacity: style.fillOpacity,
    dashArray: '5,5'
  }).addTo(map.value)
  
  // 添加标记图标（起点）
  const iconMarker = L.marker([startPoint.lat, startPoint.lng], {
    icon: L.divIcon({
      className: 'stay-icon',
      html: `<span style="font-size:20px">${style.icon}</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }).addTo(map.value)
  
  // 绑定弹窗
  const popupContent = `
    <b>${style.icon} ${stayType}</b><br/>
    📍 ${port}<br/>
    🕐 ${formatTime(marker.startTime)} ~ ${formatTime(marker.endTime)}<br/>
    ⏱️ ${formatDuration(marker.endTime - marker.startTime)}
  `
  rect.bindPopup(popupContent)
  iconMarker.bindPopup(popupContent)
  
  // 保存到 layers
  layers.value.stayMarkers.set(id, { rect, iconMarker })
  
  return { rect, iconMarker }
}

// 移除停留标记
const removeStayMarker = (id) => {
  const layers = layers.value.stayMarkers.get(id)
  if (layers && map.value) {
    map.value.removeLayer(layers.rect)
    map.value.removeLayer(layers.iconMarker)
    layers.value.stayMarkers.delete(id)
    return true
  }
  return false
}

// 清空所有标记
const clearStayMarkers = () => {
  layers.value.stayMarkers.forEach(({ rect, iconMarker }) => {
    if (map.value) {
      map.value.removeLayer(rect)
      map.value.removeLayer(iconMarker)
    }
  })
  layers.value.stayMarkers.clear()
}

// 工具：适配视野
const fitBounds = (coords, padding = [50, 50]) => {
  if (!map.value || !coords?.length) return
  const bounds = L.latLngBounds(coords)
  map.value.fitBounds(bounds, { padding })
  currentBounds.value = bounds
}

// 工具：居中到点
const centerOn = (lat, lng, zoom = null) => {
  if (!map.value) return
  map.value.setView([lat, lng], zoom || map.value.getZoom(), { animate: true })
}

// 工具：标记点动画
const animateMarker = (marker, targetLatLng, duration = 1000) => {
  const start = marker.getLatLng()
  const startTime = Date.now()
  
  const step = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 缓动函数
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    
    const lat = start.lat + (targetLatLng[0] - start.lat) * ease(progress)
    const lng = start.lng + (targetLatLng[1] - start.lng) * ease(progress)
    
    marker.setLatLng([lat, lng])
    
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}