// src/views/TrackFlow/useMap.js

import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CONFIG } from '../../components/config';

/**
 * Leaflet 地图操作封装
 * 统一管理地图实例、图层和标记
 */
export function useMap(containerId = 'map') {
  const map = ref(null);
  const isMapReady = ref(false);
  const shipMarker = ref(null);
  const trajectoryLayer = ref(null);
  const stayMarkersLayer = ref(null);

  /**
   * 初始化地图
   */
  const initMap = () => {
    if (!document.getElementById(containerId)) return;

    map.value = L.map(containerId).setView([20, 110], 5);

    L.tileLayer(CONFIG.MAP.TILE_LAYER, {
      attribution: CONFIG.MAP.ATTRIBUTION,
      maxZoom: CONFIG.MAP.MAX_ZOOM,
      minZoom: CONFIG.MAP.MIN_ZOOM
    }).addTo(map.value);

    // 初始化图层组
    trajectoryLayer.value = L.layerGroup().addTo(map.value);
    stayMarkersLayer.value = L.layerGroup().addTo(map.value);

    isMapReady.value = true;
    console.log('地图初始化完成');
  };

  /**
   * 渲染轨迹线
   * @param {Array} points - 轨迹点数组 [{lat, lon}, ...]
   */
  const renderTrajectory = (points) => {
    if (!map.value || !points || points.length === 0) return;

    // 清除旧轨迹
    if (trajectoryLayer.value) {
      trajectoryLayer.value.clearLayers();
    }

    const latlngs = points.map(p => [p.lat, p.lon]);
    const polyline = L.polyline(latlngs, { color: 'blue', weight: 3, opacity: 0.8 });
    
    trajectoryLayer.value.addLayer(polyline);
    
    // 自动适配视野
    if (latlngs.length > 0) {
      map.value.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  };

  /**
   * 更新船舶标记位置
   * @param {Object} point - 当前点 {lat, lon, course}
   * @param {Object} options - { animate: boolean, duration: number }
   */
  const updateShipMarker = (point, options = { animate: false, duration: 1000 }) => {
    if (!map.value || !point) return;

    const { lat, lon, course } = point;

    // 创建或更新标记
    if (!shipMarker.value) {
      const icon = L.divIcon({
        className: 'ship-marker',
        html: '<div style="font-size: 24px;">🚢</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      shipMarker.value = L.marker([lat, lon], { icon }).addTo(map.value);
    } else {
      if (options.animate) {
        // 简单动画：直接移动 (Leaflet 原生不支持平滑移动，需插件或自定义插值)
        shipMarker.value.setLatLng([lat, lon]);
      } else {
        shipMarker.value.setLatLng([lat, lon]);
      }
      
      // 更新朝向 (通过 CSS 旋转)
      if (course !== undefined && shipMarker.value.getElement()) {
        const element = shipMarker.value.getElement();
        element.style.transform = `rotate(${course}deg)`;
      }
    }
  };

  /**
   * 绘制停留标记
   * @param {Object} marker - 标记数据 {lat, lon, stayType, ...}
   */
  const drawStayMarker = (marker) => {
    if (!map.value || !marker) return;

    const typeConfig = CONFIG.STAY_TYPES.find(t => t.value === marker.stayType) || CONFIG.STAY_TYPES[0];
    const icon = L.divIcon({
      className: 'stay-marker',
      html: `<div style="font-size: 24px;">${typeConfig.icon}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    const mark = L.marker([marker.lat, marker.lon], { icon })
      .bindPopup(`
        <strong>${typeConfig.label}</strong><br>
        港口: ${marker.port || '未知'}<br>
        状态: ${marker.status || '未知'}<br>
        时间: ${new Date(marker.startTime * 1000).toLocaleString()}
      `);
    
    stayMarkersLayer.value.addLayer(mark);
  };

  /**
   * 清除所有标记
   */
  const clearAllMarkers = () => {
    if (trajectoryLayer.value) trajectoryLayer.value.clearLayers();
    if (stayMarkersLayer.value) stayMarkersLayer.value.clearLayers();
    if (shipMarker.value) {
      map.value.removeLayer(shipMarker.value);
      shipMarker.value = null;
    }
  };

  onMounted(() => {
    initMap();
  });

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  });

  return {
    map,
    isMapReady,
    renderTrajectory,
    updateShipMarker,
    drawStayMarker,
    clearAllMarkers
  };
}