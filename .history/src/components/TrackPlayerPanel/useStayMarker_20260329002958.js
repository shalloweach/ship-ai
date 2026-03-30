// src/components/TrackPlayerPanel/useStayMarker.js

import { ref, reactive } from 'vue';
import { CONFIG } from '../config';

/**
 * 停留标记管理逻辑
 * 处理标记的创建、校验和提交
 */
export function useStayMarker(deps) {
  const { doSubmitMarks } = deps.api;
  const { drawStayMarker } = deps.map;

  const isMarking = ref(false);
  const pendingMarks = ref([]);
  const startMark = ref(null);

  /**
   * 开始标记
   */
  const startMarking = (point, index) => {
    isMarking.value = true;
    startMark.value = {
      point,
      index,
      time: point.utc_time
    };
    console.log('开始标记:', point);
  };

  /**
   * 结束标记
   */
  const endMarking = (point, index, formData) => {
    if (!startMark.value) return;

    const newMark = {
      mmsi: formData.mmsi,
      startTime: startMark.value.time,
      endTime: point.utc_time,
      startIdx: startMark.value.index,
      endIdx: index,
      lat: (startMark.value.point.lat + point.lat) / 2, // 取中点
      lon: (startMark.value.point.lon + point.lon) / 2,
      stayType: formData.stayType,
      port: formData.port,
      status: formData.status
    };

    // 校验
    if (validateStayMark(newMark)) {
      pendingMarks.value.push(newMark);
      drawStayMarker(newMark);
      console.log('标记已添加:', newMark);
    }

    // 重置
    isMarking.value = false;
    startMark.value = null;
  };

  /**
   * 校验标记数据
   */
  const validateStayMark = (mark) => {
    if (!mark.mmsi) {
      alert('缺少 MMSI');
      return false;
    }
    if (mark.endTime <= mark.startTime) {
      alert('结束时间必须大于开始时间');
      return false;
    }
    if (!CONFIG.STAY_TYPES.some(t => t.value === mark.stayType)) {
      alert('无效的停留类型');
      return false;
    }
    return true;
  };

  /**
   * 提交所有待处理标记到后端
   */
  const submitPendingMarks = async () => {
    if (pendingMarks.value.length === 0) {
      alert('没有可提交的标记');
      return;
    }

    // 再次校验
    const validMarks = pendingMarks.value.filter(validateStayMark);
    if (validMarks.length === 0) return;

    try {
      await doSubmitMarks(validMarks);
      alert(`成功提交 ${validMarks.length} 个标记`);
      pendingMarks.value = []; // 清空
    } catch (err) {
      console.error('提交失败:', err);
      alert('提交失败，请重试');
    }
  };

  /**
   * 取消当前标记
   */
  const cancelMarking = () => {
    isMarking.value = false;
    startMark.value = null;
  };

  return {
    isMarking,
    pendingMarks,
    startMarking,
    endMarking,
    submitPendingMarks,
    cancelMarking
  };
}