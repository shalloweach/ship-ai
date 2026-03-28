<template>
  <footer class="time-slider">
    <div class="slider-container">
      <!-- 当前选中区间 -->
      <div class="slider-label">
        {{ formatDate(currentStartDate) }} - {{ formatDate(currentEndDate) }}
      </div>

      <!-- 开始日期滑块 -->
      <input
        type="range"
        class="slider"
        :min="0"
        :max="totalDays - 1"
        v-model.number="startDayIndex"
        @input="onTimeChange"
      />

      <!-- 结束日期滑块 -->
      <input
        type="range"
        class="slider slider-end"
        :min="0"
        :max="totalDays - 1"
        v-model.number="endDayIndex"
        @input="onTimeChange"
      />

      <!-- 月份标注 -->
      <div class="month-labels">
        <span
          v-for="(label, idx) in monthPositions"
          :key="idx"
          :style="{ left: label.left + '%' }"
        >
          {{ label.name }}
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import dayOfYear from 'dayjs/plugin/dayOfYear'
dayjs.extend(dayOfYear)

// Props：年份
const props = defineProps({
  year: {
    type: Number,
    default: 2023
  }
})

// 事件
const emit = defineEmits(['time-change'])

// 滑块天索引
const startDayIndex = ref(0)
const endDayIndex = ref(dayjs(`${props.year}-12-31`).dayOfYear() - 1)

// 当前日期
const currentStartDate = computed(() =>
  dayjs(`${props.year}-01-01`).add(startDayIndex.value, 'day')
)
const currentEndDate = computed(() =>
  dayjs(`${props.year}-01-01`).add(endDayIndex.value, 'day')
)

// 滑块拖动
const onTimeChange = () => {
  // 保证 start <= end
  if (startDayIndex.value > endDayIndex.value) {
    const tmp = startDayIndex.value
    startDayIndex.value = endDayIndex.value
    endDayIndex.value = tmp
  }

  emit('time-change', {
    start: currentStartDate.value.format('YYYY-MM-DD'),
    end: currentEndDate.value.format('YYYY-MM-DD')
  })
}

// 一年的天数
const totalDays = computed(() => dayjs(`${props.year}-12-31`).dayOfYear())

// 月份标注位置
const monthPositions = computed(() => {
  const months = []
  for (let m = 1; m <= 12; m++) {
    const startOfMonth = dayjs(`${props.year}-${String(m).padStart(2, '0')}-01`).dayOfYear() - 1
    months.push({
      name: `${m}月`,
      left: (startOfMonth / (totalDays.value - 1)) * 100
    })
  }
  return months
})

// 监听 year 变化
watch(() => props.year, () => {
  startDayIndex.value = 0
  endDayIndex.value = totalDays.value - 1
})

// 格式化显示日期
const formatDate = (d) => d.format('YYYY-MM-DD')
</script>

<style scoped>
.time-slider {
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 1rem;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.slider-container {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  width: 100%;
}

.slider-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  font-size: 1rem;
  text-align: center;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  background: #ddd;
  outline: none;
  border-radius: 5px;
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
}

.slider-end {
  background: #bbb;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007bff;
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007bff;
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.month-labels {
  position: relative;
  margin-top: 25px;
  height: 1rem;
}

.month-labels span {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #6c757d;
}
</style>