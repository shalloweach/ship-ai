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