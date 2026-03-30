// src/views/TrackFlow/useApi.js

import { ref } from 'vue';
import { shipApi } from '../../api/shipApi';

/**
 * API 调用逻辑封装
 * 提供统一的错误处理和loading状态管理
 */
export function useShipApi() {
  const loading = ref(false);
  const error = ref(null);

  /**
   * 执行异步请求，统一处理 loading 和 error
   */
  const execute = async (fn) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await fn();
      return result;
    } catch (err) {
      error.value = err.message || '请求失败';
      console.error('API Error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    /**
     * 缓存船舶 MMSI
     */
    async doCacheMmsi(mmsi) {
      return execute(() => shipApi.cacheMmsi(mmsi));
    },

    /**
     * 按索引查询轨迹
     */
    async doFetchByIndex(mmsi, startIdx, endIdx) {
      return execute(() => shipApi.getTrajectoryByIndex(mmsi, startIdx, endIdx));
    },

    /**
     * 按时间查询轨迹
     */
    async doFetchByTime(mmsi, startTime, endTime) {
      return execute(() => shipApi.getTrajectoryByTime(mmsi, startTime, endTime));
    },

    /**
     * 提交停留标记
     */
    async doSubmitMarks(marks) {
      return execute(() => shipApi.submitStayMarks(marks));
    },

    loading,
    error
  };
}