// src/components/TrackPlayerPanel/useTrackPlayer.js

import { ref, reactive } from 'vue';
import { CONFIG } from '../config';

/**
 * 轨迹播放控制逻辑
 * 支持逐点显示和沿线移动两种模式
 */
export function useTrackPlayer(deps) {
  const { doFetchByIndex } = deps.api;
  const { updateShipMarker, renderTrajectory } = deps.map;

  const isPlaying = ref(false);
  const playMode = ref('move'); // 'step' (逐点) | 'move' (沿线移动)
  const speed = ref(CONFIG.SHIP.DEFAULT_SPEED);
  const currentIndex = ref(0);
  const timer = ref(null);
  
  const state = reactive({
    allPoints: [],
    loadedEndIndex: 0,
    mmsi: ''
  });

  /**
   * 加载轨迹数据 (支持预加载)
   */
  const loadTrajectory = async (mmsi, startIdx, endIdx) => {
    state.mmsi = mmsi;
    const res = await doFetchByIndex(mmsi, startIdx, endIdx);
    state.allPoints = res.points || [];
    state.loadedEndIndex = endIdx;
    currentIndex.value = 0;
    
    // 渲染整条轨迹线
    renderTrajectory(state.allPoints);
    
    // 预加载逻辑：如果剩余点数少，自动请求下一批
    if (state.allPoints.length < CONFIG.SHIP.PRELOAD_THRESHOLD) {
      // 这里可以添加自动请求下一批的逻辑
      console.log('触发预加载条件');
    }
    
    return state.allPoints;
  };

  /**
   * 开始播放
   */
  const play = () => {
    if (isPlaying.value || state.allPoints.length === 0) return;
    
    isPlaying.value = true;
    const interval = 100 / speed.value; // 速度越快，间隔越短

    timer.value = setInterval(() => {
      if (currentIndex.value >= state.allPoints.length - 1) {
        stop();
        return;
      }

      currentIndex.value++;
      const point = state.allPoints[currentIndex.value];

      if (playMode.value === 'move') {
        updateShipMarker(point, { animate: true, duration: interval });
      } else {
        updateShipMarker(point, { animate: false });
      }
    }, interval);
  };

  /**
   * 暂停播放
   */
  const pause = () => {
    if (timer.value) clearInterval(timer.value);
    isPlaying.value = false;
  };

  /**
   * 停止播放
   */
  const stop = () => {
    pause();
    currentIndex.value = 0;
    if (state.allPoints.length > 0) {
      updateShipMarker(state.allPoints[0], { animate: false });
    }
  };

  /**
   * 设置播放速度
   */
  const setSpeed = (val) => {
    speed.value = Math.max(CONFIG.SHIP.MIN_SPEED, Math.min(val, CONFIG.SHIP.MAX_SPEED));
    if (isPlaying.value) {
      pause();
      play(); // 重启以应用新速度
    }
  };

  /**
   * 跳转进度
   */
  const seek = (index) => {
    if (index < 0 || index >= state.allPoints.length) return;
    currentIndex.value = index;
    const point = state.allPoints[index];
    updateShipMarker(point, { animate: false });
  };

  return {
    isPlaying,
    playMode,
    speed,
    currentIndex,
    state,
    loadTrajectory,
    play,
    pause,
    stop,
    setSpeed,
    seek
  };
}