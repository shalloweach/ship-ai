<template>
  <footer class="time-slider">
    <div class="slider-container">
      <label class="slider-label">{{ formatDate(currentDate) }}</label>

      <!-- 滑块 -->
      <input
        type="range"
        class="slider"
        :min="0"
        :max="totalDays - 1"
        v-model.number="dayIndex"
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
import dayOfYear from 'dayjs/plugin/dayOfYear' // 引入插件
dayjs.extend(dayOfYear) // 使用插件

// Props：可配置年份
const props = defineProps({
  year: {
    type: Number,
    default: 2023
  }
})

// 事件
const emit = defineEmits(['time-change'])

// 滑块天索引
const dayIndex = ref(0)

// 当前日期
const currentDate = computed(() =>
  dayjs(`${props.year}-01-01`).add(dayIndex.value, 'day')
)

// 滑块拖动
const onTimeChange = () => {
  emit('time-change', currentDate.value.format('YYYY-MM-DD'))
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
  dayIndex.value = 0
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
}

.slider-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.slider-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  font-size: 1.2rem;
}

.slider {
  width: 100%;
  height: 10px;
  -webkit-appearance: none;
  appearance: none;
  background: #ddd;
  outline: none;
  border-radius: 5px;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #007bff;
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #007bff;
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.month-labels {
  position: relative;
  margin-top: 0.5rem;
  height: 1rem;
}

.month-labels span {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #6c757d;
}
</style>