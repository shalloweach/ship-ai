<!-- TrackPlayer/components/SvgLineChart.vue -->
<template>
    <svg 
      :viewBox="`0 0 ${width} ${height}`" 
      :width="width" 
      :height="height"
      class="line-chart"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <!-- 折线下方渐变填充 -->
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <!-- 使用静态字符串 offset，动态绑定 stop-color -->
          <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
        
        <!-- 当前点的光晕滤镜 -->
        <filter :id="glowId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
  
        <!-- 折线阴影 -->
        <filter id="lineShadow" x="-5%" y="-10%" width="110%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.15)" />
        </filter>
      </defs>
  
      <!-- 背景网格（动态生成） -->
      <g class="grid-lines" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3 3">
        <line
          v-for="(y, idx) in horizontalGridLines"
          :key="`h-${idx}`"
          x1="0"
          :y1="y"
          :x2="width"
          :y2="y"
        />
        <line
          v-for="(x, idx) in verticalGridLines"
          :key="`v-${idx}`"
          :x1="x"
          y1="0"
          :x2="x"
          :y2="height"
        />
      </g>
  
      <!-- 折线下方面积填充 -->
      <polygon
        v-if="areaPoints"
        :points="areaPoints"
        :fill="`url(#${gradientId})`"
        stroke="none"
      />
  
      <!-- 折线路径 -->
      <polyline
        v-if="pathD"
        :points="pathD"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#lineShadow)"
      />
  
      <!-- 数据点圆点（可选） -->
      <circle
        v-for="(point, idx) in dataPointsPos"
        :key="`dot-${idx}`"
        :cx="point.x"
        :cy="point.y"
        r="2.5"
        :fill="color"
        stroke="#fff"
        stroke-width="1"
        opacity="0.8"
      />
  
      <!-- 当前播放点标记（带光晕） -->
      <circle
        v-if="currentPointPos"
        :cx="currentPointPos.x"
        :cy="currentPointPos.y"
        r="4.5"
        :fill="color"
        stroke="#fff"
        stroke-width="2"
        :filter="`url(#${glowId})`"
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
    },
    currentX: { type: Number, default: null },
    color: { type: String, default: '#3b82f6' },
    width: { type: Number, default: 300 },
    height: { type: Number, default: 60 },
    padding: { type: Number, default: 8 },
    showArea: { type: Boolean, default: true },
    showDots: { type: Boolean, default: true },
    gridCount: { type: Number, default: 5 }
  })
  
  // 生成唯一ID（移除颜色中的 # 以避免 CSS 选择器问题）
  const gradientId = computed(() => `areaGrad-${props.color.replace('#', '')}`)
  const glowId = computed(() => `pointGlow-${props.color.replace('#', '')}`)
  
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
  
  // 生成面积填充的 points
  const areaPoints = computed(() => {
    if (!props.showArea || props.data.length < 2) return null
    const points = props.data.map(d => `${toSvgX(d.x)},${toSvgY(d.y)}`)
    const firstX = toSvgX(props.data[0].x)
    const lastX = toSvgX(props.data[props.data.length - 1].x)
    const bottomY = props.height - props.padding
    return [...points, `${lastX},${bottomY}`, `${firstX},${bottomY}`, points[0]].join(' ')
  })
  
  // 所有数据点的 SVG 坐标
  const dataPointsPos = computed(() => {
    if (!props.showDots) return []
    return props.data.map(d => ({ x: toSvgX(d.x), y: toSvgY(d.y) }))
  })
  
  // 当前点位置
  const currentPointPos = computed(() => {
    if (props.currentX == null) return null
    const point = props.data.find(d => d.x === props.currentX)
    if (!point) return null
    return { x: toSvgX(point.x), y: toSvgY(point.y) }
  })
  
  // 水平网格线位置
  const horizontalGridLines = computed(() => {
    const lines = []
    const step = (props.height - props.padding * 2) / (props.gridCount - 1)
    for (let i = 0; i < props.gridCount; i++) {
      const y = props.padding + i * step
      if (y >= props.padding && y <= props.height - props.padding) {
        lines.push(y)
      }
    }
    return lines
  })
  
  // 垂直网格线位置
  const verticalGridLines = computed(() => {
    const lines = []
    const step = (props.width - props.padding * 2) / (props.gridCount - 1)
    for (let i = 0; i < props.gridCount; i++) {
      const x = props.padding + i * step
      if (x >= props.padding && x <= props.width - props.padding) {
        lines.push(x)
      }
    }
    return lines
  })
  </script>
  
  <style scoped>
  .line-chart {
    display: block;
    width: 100%;
    height: auto;
    background-color: transparent;
    border-radius: 8px;
  }
  
  .current-point {
    animation: softPulse 1.2s infinite ease-in-out;
    transform-origin: center;
    will-change: r, opacity;
  }
  
  @keyframes softPulse {
    0%, 100% {
      r: 4.5;
      opacity: 1;
    }
    50% {
      r: 6;
      opacity: 0.85;
    }
  }
  
  .grid-lines line {
    transition: opacity 0.2s;
  }
  
  @media (prefers-color-scheme: dark) {
    .grid-lines {
      stroke: #374151;
    }
  }
  </style>