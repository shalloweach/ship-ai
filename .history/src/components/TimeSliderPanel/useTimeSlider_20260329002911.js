// src/components/TimeSliderPanel/useTimeSlider.js

import { ref, reactive } from 'vue';
import { formatTime } from '../timeUtils';

/**
 * 时间滑块查询逻辑
 * 处理索引/时间范围的选择和数据请求
 */
export function useTimeSlider(deps) {
  const { doFetchByIndex, doFetchByTime } = deps.api;
  
  const queryMode = ref('index'); // 'index' or 'time'
  const isLoading = ref(false);
  
  const state = reactive({
    mmsi: '',
    // 索引模式
    startIdx: 0,
    endIdx: 100,
    totalPoints: 0,
    // 时间模式
    startTime: null,
    endTime: null,
    // 结果
    points: [],
    timeRange: { start: 0, end: 0 }
  });

  /**
   * 按索引查询
   */
  const queryByIndex = async (mmsi, start, end) => {
    if (!mmsi) return;
    isLoading.value = true;
    try {
      const res = await doFetchByIndex(mmsi, start, end);
      state.points = res.points || [];
      state.timeRange = { start: res.startTime, end: res.endTime };
      state.startIdx = start;
      state.endIdx = end;
      return res;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 按时间查询
   */
  const queryByTime = async (mmsi, start, end) => {
    if (!mmsi) return;
    isLoading.value = true;
    try {
      const res = await doFetchByTime(mmsi, start, end);
      state.points = res.points || [];
      state.startIdx = res.startIdx;
      state.endIdx = res.endIdx;
      state.startTime = start;
      state.endTime = end;
      return res;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 重置状态
   */
  const reset = () => {
    state.points = [];
    state.startIdx = 0;
    state.endIdx = 0;
    state.totalPoints = 0;
  };

  return {
    queryMode,
    isLoading,
    state,
    queryByIndex,
    queryByTime,
    reset
  };
}