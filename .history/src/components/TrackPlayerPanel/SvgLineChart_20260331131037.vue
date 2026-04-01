<!-- TrackPlayer/components/SvgLineChart.vue -->
<template>
    <svg 
      :viewBox="`0 0 ${width} ${height}`" 
      :width="width" 
      :height="height"
      class="line-chart"
      preserveAspectRatio="none"
    >
      <!-- 背景网格（可选） -->
      <line x1="0" :y1="padding" :x2="width" :y2="padding" stroke="#e5e7eb" stroke-width="0.5"/>
      <line x1="0" :y1="height - padding" :x2="width" :y2="height - padding" stroke="#e5e7eb" stroke-width="0.5"/>
      
      <!-- 折线路径 -->
      <polyline
        v-if="pathD"
        :points="pathD"
        fill="none"
        :stroke="color"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      
      <!-- 当前点标记 -->
      <circle
        v-if="currentPointPos"
        :cx="currentPointPos.x"
        :cy="currentPointPos.y"
        r="3"
        :fill="color"
        stroke="#fff"
        stroke-width="1"
        class="current-point"
      />
    </svg>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  
  const props = defineProps({
    data: { 
      type: Array, 
      required: true,
      // 格式: [{ x: number, y: number }, ...]
    },
    currentX: { type: Number, default: null }, // 当前播放点的 x 值
    color: { type: String, default: '#3b82f6' },
    width: { type: Number, default: 300 },
    height: { type: Number, default: 60 },
    padding: { type: Number, default: 8 }
  })
  
  // 计算 Y 轴范围（添加 10% 边距）
  const yRange = computed(() => {
    const values = props.data.map(d => d.y).filter(v => v != null)
    if (values.length === 0) return { min: 0, max: 1 }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const margin = (max - min) * 0.1 || 1
    return { min: min - margin, max: max + margin }
  })
  
  // X 轴范围
  const xRange = computed(() => {
    if (props.data.length === 0) return { min: 0, max: 1 }
    return { min: props.data[0].x, max: props.data[props.data.length - 1].x }
  })
  
  // 坐标转换函数
  const toSvgX = (x) => {
    const { min, max } = xRange.value
    if (max === min) return props.width / 2
    return ((x - min) / (max - min)) * (props.width - props.padding * 2) + props.padding
  }
  
  const toSvgY = (y) => {
    const { min, max } = yRange.value
    if (max === min) return props.height / 2
    const normalized = (y - min) / (max - min)
    return props.height - props.padding - normalized * (props.height - props.padding * 2)
  }
  
  // 生成折线路径 points 属性
  const pathD = computed(() => {
    if (props.data.length < 2) return null
    return props.data
      .map(d => `${toSvgX(d.x)},${toSvgY(d.y)}`)
      .join(' ')
  })
  
  // 当前点位置
  const currentPointPos = computed(() => {
    if (props.currentX == null) return null
    const point = props.data.find(d => d.x === props.currentX)
    if (!point) return null
    return { x: toSvgX(point.x), y: toSvgY(point.y) }
  })
  </script>
  
  <style scoped>
  .line-chart {
    display: block;
    width: 100%;
    height: auto;
  }
  .current-point {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%, 100% { r: 3; opacity: 1; }
    50% { r: 4; opacity: 0.7; }
  }
  </style>