// src/components/TimeSliderPanel/useTrajectoryPlayer.js
import { ref, computed, watch, onUnmounted } from 'vue'

export function useTrajectoryPlayer(props, emit) {
  // ========== 播放状态 ==========
  const isPlaying = ref(false)
  const currentPointIndex = ref(0)
  const playbackSpeed = ref(1)        // 倍速：0.5, 1, 2, 4, 8
  const playMode = ref('line-first')  // 'point-by-point' | 'line-first'
  
  // 轨迹数据（由父组件传入）
  const trajectoryPoints = ref([])
  
  // 播放定时器
  let playTimer = null
  
  // ========== 计算属性 ==========
  const canPlay = computed(() => trajectoryPoints.value.length > 0)
  const progress = computed(() => {
    if (trajectoryPoints.value.length === 0) return 0
    return Math.round((currentPointIndex.value / (trajectoryPoints.value.length - 1)) * 100)
  })
  
  const currentPoint = computed(() => {
    return trajectoryPoints.value[currentPointIndex.value] || null
  })
  
  // ========== 播放控制 ==========
  const play = () => {
    if (!canPlay.value || isPlaying.value) return
    
    isPlaying.value = true
    
    // 模式1：逐点出现
    if (playMode.value === 'point-by-point') {
      startPointByPointPlay()
    } 
    // 模式2：先画线，船移动
    else if (playMode.value === 'line-first') {
      emit('play-mode-change', { mode: 'line-first', fullLine: true })
      startShipAnimation()
    }
  }
  
  const pause = () => {
    isPlaying.value = false
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = null
    }
    emit('play-state-change', { playing: false, currentIndex: currentPointIndex.value })
  }
  
  const toggle = () => {
    isPlaying.value ? pause() : play()
  }
  
  const stop = () => {
    pause()
    currentPointIndex.value = 0
    emit('play-seek', { index: 0, point: trajectoryPoints.value[0] || null })
  }
  
  // 逐点播放：每个点显示间隔 = 基础间隔 / 倍速
  const startPointByPointPlay = () => {
    const baseInterval = 500 // 基础 500ms/点
    const interval = baseInterval / playbackSpeed.value
    
    emit('play-mode-change', { mode: 'point-by-point', visibleCount: 1 })
    
    playTimer = setInterval(() => {
      if (currentPointIndex.value >= trajectoryPoints.value.length - 1) {
        pause()
        return
      }
      
      currentPointIndex.value++
      const point = trajectoryPoints.value[currentPointIndex.value]
      
      // 发射当前点，父组件负责在地图上高亮
      emit('play-point-update', {
        index: currentPointIndex.value,
        point,
        visibleRange: { start: 0, end: currentPointIndex.value }
      })
    }, interval)
  }
  
  // 船舶沿线动画：根据时间差计算移动速度
  const startShipAnimation = () => {
    if (trajectoryPoints.value.length < 2) return
    
    // 计算总时长和总距离，推导动画时长
    const first = trajectoryPoints.value[0]
    const last = trajectoryPoints.value[trajectoryPoints.value.length - 1]
    const totalDuration = last.timestamp - first.timestamp // 毫秒
    const baseDuration = 10000 // 基础动画 10 秒
    
    // 倍速影响：速度越快，动画时间越短
    const animationDuration = Math.max(2000, baseDuration / playbackSpeed.value)
    
    let startTime = null
    let animationFrame = null
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // 根据进度插值计算当前点索引（支持小数，用于平滑移动）
      const floatIndex = progress * (trajectoryPoints.value.length - 1)
      const lowerIdx = Math.floor(floatIndex)
      const upperIdx = Math.min(lowerIdx + 1, trajectoryPoints.value.length - 1)
      const ratio = floatIndex - lowerIdx
      
      // 线性插值获取船舶位置
      const lower = trajectoryPoints.value[lowerIdx]
      const upper = trajectoryPoints.value[upperIdx]
      const interpolated = {
        lng: lower.lng + (upper.lng - lower.lng) * ratio,
        lat: lower.lat + (upper.lat - lower.lat) * ratio,
        timestamp: lower.timestamp + (upper.timestamp - lower.timestamp) * ratio,
        // 保留原始点的其他属性（如航向、速度）
        ...lower
      }
      
      emit('play-point-update', {
        index: floatIndex, // 小数索引
        point: interpolated,
        isInterpolated: true,
        visibleRange: { start: 0, end: trajectoryPoints.value.length - 1 }
      })
      
      if (progress < 1 && isPlaying.value) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        pause()
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    
    // 清理函数
    onUnmounted(() => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    })
  }
  
  // 倍速控制
  const setSpeed = (speed) => {
    const validSpeeds = [0.5, 1, 2, 4, 8]
    if (validSpeeds.includes(speed)) {
      playbackSpeed.value = speed
      // 如果正在播放，重启以应用新速度
      if (isPlaying.value) {
        pause()
        play()
      }
      emit('play-speed-change', { speed })
    }
  }
  
  // 跳转指定点
  const seekTo = (index) => {
    const target = Math.max(0, Math.min(index, trajectoryPoints.value.length - 1))
    currentPointIndex.value = target
    emit('play-seek', { 
      index: target, 
      point: trajectoryPoints.value[target] 
    })
  }
  
  // 设置轨迹数据
  const setTrajectory = (points) => {
    trajectoryPoints.value = points || []
    currentPointIndex.value = 0
    if (isPlaying.value) pause()
  }
  
  // 暴露方法
  const exposeMethods = {
    play, pause, toggle, stop, setSpeed, seekTo, setTrajectory,
    setPlayMode: (mode) => { playMode.value = mode }
  }
  
  return {
    // 状态
    isPlaying, currentPointIndex, playbackSpeed, playMode,
    trajectoryPoints, currentPoint, progress, canPlay,
    // 方法
    play, pause, toggle, stop, setSpeed, seekTo, setTrajectory,
    exposeMethods
  }
}