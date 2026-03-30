<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<template>
  <div class="track-flow-container">
    <!-- 地图区域 -->
    <div id="map" class="map-area"></div>

    <!-- 左侧面板：时间查询 -->
    <div class="panel left-panel">
      <TimeSliderPanel 
        ref="timeSliderRef"
        :mmsi="currentMmsi"
        @query-success="handleQuerySuccess"
      />
    </div>

    <!-- 右侧面板：播放控制 -->
    <div class="panel right-panel">
      <PlayerCard
        ref="playerRef"
        :mmsi="currentMmsi"
        @play-start="handlePlayStart"
      />
    </div>

    <!-- 右下角面板：标记 -->
    <div class="panel mark-panel">
      <MarkCard
        :is-marking="isMarking"
        :pending-marks="pendingMarks"
        :has-selection="!!selectedPoint"
        :is-submitting="isSubmitting"
        @start-mark="handleStartMark"
        @cancel-mark="handleCancelMark"
        @submit="handleSubmitMarks"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, provide, onBeforeUnmount } from 'vue';
import { useMap } from './useMap';
import { useShipApi } from './useApi';
import { useTimeSlider } from '../../components/TimeSliderPanel/useTimeSlider';
import { useTrackPlayer } from '../TrackPlayerPanel/useTrackPlayer';
import { useStayMarker } from '../TrackPlayerPanel/useStayMarker';

import TimeSliderPanel from '../../components/TimeSliderPanel/TimeSliderPanel.vue';
import PlayerCard from '../TrackPlayerPanel/PlayerCard.vue';
import MarkCard from '../TrackPlayerPanel/MarkCard.vue';

const props = defineProps({
  mmsi: String
});

const currentMmsi = ref(props.mmsi || '');
const selectedPoint = ref(null);
const isMarking = ref(false);
const pendingMarks = ref([]);
const isSubmitting = ref(false);

// 初始化依赖
const api = useShipApi();
const { map, isMapReady, renderTrajectory, updateShipMarker, drawStayMarker, clearAllMarkers } = useMap('map');

// 组合式函数依赖注入
const deps = {
  api,
  map: { renderTrajectory, updateShipMarker, drawStayMarker }
};

const timeSlider = useTimeSlider(deps);
const player = useTrackPlayer(deps);
const marker = useStayMarker(deps);

// 同步状态
const handleQuerySuccess = (points) => {
  renderTrajectory(points);
  player.loadTrajectory(currentMmsi.value, 0, points.length - 1);
};

const handlePlayStart = () => {
  player.play();
};

// 标记流程
const handleStartMark = () => {
  isMarking.value = true;
  // 这里需要监听地图点击事件来获取点，简化起见假设子组件处理
  alert('请在地图上点击起始点和结束点');
};

const handleCancelMark = () => {
  marker.cancelMarking();
  isMarking.value = false;
};

const handleSubmitMarks = async () => {
  isSubmitting.value = true;
  await marker.submitPendingMarks();
  pendingMarks.value = marker.pendingMarks; // 同步列表
  isSubmitting.value = false;
  isMarking.value = false;
};

// 暴露给子组件的方法 (如果需要)
defineExpose({
  reloadShip: (mmsi) => {
    currentMmsi.value = mmsi;
    clearAllMarkers();
    api.doCacheMmsi(mmsi);
  }
});

onBeforeUnmount(() => {
  player.stop();
});
</script>

<style scoped>
.track-flow-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.map-area {
  width: 100%;
  height: 100%;
  z-index: 1;
}
.panel {
  position: absolute;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  margin: 10px;
}
.left-panel {
  top: 10px;
  left: 10px;
  width: 300px;
}
.right-panel {
  top: 10px;
  right: 10px;
  width: 300px;
}
.mark-panel {
  bottom: 10px;
  right: 10px;
  width: 250px;
}
</style>