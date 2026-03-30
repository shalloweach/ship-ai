import { ref, computed, onUnmounted, watch } from 'vue'
import { getTrajectoryByIndex } from '@/api/shipApi'

/**
 * 创建组件控制器实例
 * @param {Object} props - 组件 props
 * @param {Object} player - useTrackPlayer 返回的播放器实例
 */
export function createPlayerController(props, player) {
  // ─────────────────────────────────────
  // 🔹 区域 1: 本地状态（与 UI 绑定）
  // ─────────────────────────────────────
  const localStartIndex = ref(0)
  const localSpeed = ref(1)

  // ─────────────────────────────────────
  // 🔹 区域 2: 事件处理函数
  // ─────────────────────────────────────

  /**
   * 起始索引变更处理（仅在未播放时记录）
   */
  const onStartIndexChange = () => {
    if (!player.isPlaying.value && localStartIndex.value >= 0) {
      // 仅记录，实际生效在 startPlay 时
      console.log(`📍 起始索引设置为: ${localStartIndex.value}`)
    }
  }

  /**
   * 播放速度变更处理（实时生效）
   */
  const onSpeedChange = () => {
    player.setSpeed(localSpeed.value)
    console.log(`⚡ 播放速度调整为: ${localSpeed.value}x`)
  }

  /**
   * 开始/暂停 切换处理
   */
  const handleStartPause = async () => {
    if (player.isPlaying.value) {
      // 👉 暂停
      player.pausePlay()
    } else {
      // 👉 开始：校验并应用起始索引
      const startIndex = Math.max(
        0, 
        Math.min(localStartIndex.value || 0, props.totalCount - 1)
      )
      const success = await player.startPlay(startIndex)
      if (success) {
        console.log(`🚀 开始播放，起始索引: ${startIndex}`)
      }
    }
  }

  /**
   * 结束播放 + 清空处理
   */
  const handleStop = () => {
    player.stopPlay()
    localStartIndex.value = 0
    console.log('🛑 播放已停止，状态已重置')
  }

  /**
   * 重启播放器（供父组件调用）
   */
  const restart = () => {
    localStartIndex.value = 0
    player.stopPlay()
    console.log('🔄 播放器已重启')
  }

  // ─────────────────────────────────────
  // 🔹 区域 3: 状态同步监听（可选扩展）
  // ─────────────────────────────────────
  watch(() => props.totalCount, (newVal) => {
    if (newVal <= 0) {
      localStartIndex.value = 0
    }
  })

  // ─────────────────────────────────────
  // 🔹 区域 4: 暴露接口
  // ─────────────────────────────────────
  return {
    // 本地状态（v-model 绑定）
    localStartIndex,
    localSpeed,
    
    // 事件处理器（@click / @change 绑定）
    onStartIndexChange,
    onSpeedChange,
    handleStartPause,
    handleStop,
    
    // 调试/外部调用方法
    restart
  }
}
