<template>
  <div class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-card">
      <div class="dialog-header">
        <h4>✏️ 编辑标记</h4>
        <button class="btn-close" @click="handleCancel">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="dialog-form">
        <!-- 停留类型 -->
        <div class="form-row">
          <label>停留类型 *</label>
          <div class="input-group">
            <select v-model="form.stayType" @change="onStayTypeChange">
              <option value="">请选择</option>
              <option value="靠泊">靠泊</option>
              <option value="锚泊">锚泊</option>
              <option value="异常">异常</option>
              <option value="custom">手动输入</option>
            </select>
            <input 
              v-if="form.stayType === 'custom'" 
              v-model="form._stayTypeCustom"
              placeholder="输入类型" 
              class="custom-input"
            />
          </div>
        </div>

        <!-- 港口搜索 -->
        <div class="form-row">
          <label>港口 *</label>
          <div class="port-search">
            <input 
              v-model="portKeyword" 
              @input="handleSearch" 
              placeholder="搜索港口，如：香→香港港"
              class="search-input"
            />
            <ul v-if="portSuggestions.length" class="suggestion-list">
              <li 
                v-for="p in portSuggestions" 
                :key="p.code"
                @click="selectPort(p.name)"
                class="suggestion-item"
              >
                {{ p.name }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 作业状态 -->
        <div class="form-row">
          <label>作业状态 *</label>
          <div class="input-group">
            <select v-model="form.status" @change="onStatusChange">
              <option value="">请选择</option>
              <option value="装货">装货</option>
              <option value="卸货">卸货</option>
              <option value="中转">中转</option>
              <option value="等待">等待</option>
              <option value="未知">未知</option>
              <option value="custom">手动输入</option>
            </select>
            <input 
              v-if="form.status === 'custom'" 
              v-model="form._statusCustom"
              placeholder="输入状态" 
              class="custom-input"
            />
          </div>
        </div>

        <!-- 吃水变化折线图（新增） -->
        <div v-if="draughts && draughts.length" class="form-row draught-chart">
          <label>吃水变化曲线（单位：米）</label>
          <canvas ref="chartCanvas" width="400" height="150" style="width:100%; height:150px; background:#f9fafb; border-radius:6px; margin-top:8px;"></canvas>
          <div class="chart-note">
            <span>起始吃水: {{ draughts[0]?.toFixed(2) || '--' }} m</span>
            <span>结束吃水: {{ draughts[draughts.length-1]?.toFixed(2) || '--' }} m</span>
            <span>变化趋势: {{ trendText }}</span>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
          <button type="submit" class="btn-ok" :disabled="!valid">✅ 提交</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { searchPorts, searchPortsByCoord } from './chinaPortsData'

const props = defineProps({
  markData: Object,
  draughts: { type: Array, default: () => [] },
  onConfirm: Function,
  onCancel: Function
})


// 表单数据
const form = ref({
  id: '',
  mmsi: '',
  startTime: null,
  endTime: null,
  stayType: '',
  _stayTypeCustom: '',
  port: '',
  status: '',
  _statusCustom: ''
})

// 港口搜索
const portKeyword = ref('')
const portSuggestions = ref([])

// 是否手动设置过作业状态（避免自动覆盖）
const statusManuallySet = ref(false)

// 吃水折线图 canvas 引用
const chartCanvas = ref(null)

// 计算趋势文本（仅用于显示）
const trendText = computed(() => {
  if (!props.draughts || props.draughts.length < 2) return '数据不足'
  const first = props.draughts[0]
  const last = props.draughts[props.draughts.length - 1]
  if (first > last) return '下降（卸货）'
  if (first < last) return '上升（装货）'
  return '平稳'
})

// 自动设置作业状态的规则函数
const applyAutoStatus = () => {
  // 如果用户已手动设置过，不再自动覆盖
  if (statusManuallySet.value) return

  // 修正：删除重复定义，直接使用 form.value.stayType 并设置默认值
  const stayType = form.value.stayType || '靠泊'
  let autoStatus = '未知'

  if (stayType === '锚泊') {
    autoStatus = '等待'
  } else if (stayType === '靠泊') {
    // 需要吃水数据判断
    if (props.draughts && props.draughts.length >= 2) {
      const first = props.draughts[0]
      const last = props.draughts[props.draughts.length - 1]
      if (first > last) {
        autoStatus = '卸货'
      } else if (first < last) {
        autoStatus = '装货'
      } else {
        autoStatus = '未知'
      }
    } else {
      autoStatus = '未知'
    }
  } else {
    // 其他类型（异常、自定义等）默认为未知
    autoStatus = '未知'
  }

  // 更新状态，但不标记为手动（因为自动）
  form.value.status = autoStatus
}

// 根据坐标自动搜索并填充港口（避免覆盖用户已选值）
const autoFillPortByCoord = async () => {
  // 如果用户已手动选择港口，则不自动填充
  if (form.value.port?.trim()) return
  
  // 兼容 markData 为对象或数组的情况
  
  try {
    const results = await searchPortsByCoord(props.first.lon, props.first.lat)
    if (results?.length > 0 && !form.value.port?.trim()) {
      // 取最近的第一个港口作为默认值
      const defaultPort = results[0]
      form.value.port = defaultPort.name
      portKeyword.value = defaultPort.name
      console.log('✅ 自动填充港口:', defaultPort.name)
    }
  } catch (error) {
    console.warn('⚠️ 坐标搜索港口失败:', error)
    // 失败时静默处理，不影响用户体验
  }
}


// 绘制吃水折线图
const drawChart = () => {
  const canvas = chartCanvas.value
  if (!canvas || !props.draughts || props.draughts.length === 0) return

  const ctx = canvas.getContext('2d')
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  canvas.width = width
  canvas.height = height

  const data = props.draughts
  const count = data.length
  if (count < 2) {
    // 只有一点时，画一个点
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 3, 0, 2 * Math.PI)
    ctx.fill()
    return
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1  // 避免除零

  // 计算每个点的坐标
  const points = data.map((value, idx) => {
    const x = (idx / (count - 1)) * width
    const y = height - ((value - min) / range) * height
    return { x, y, value }
  })

  ctx.clearRect(0, 0, width, height)

  // 绘制网格线
  ctx.beginPath()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * height
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // 绘制折线
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.stroke()

  // 绘制数据点
  ctx.fillStyle = '#ef4444'
  points.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI)
    ctx.fill()
  })

  // 标注起点和终点值
  ctx.font = '10px sans-serif'
  ctx.fillStyle = '#1e293b'
  ctx.fillText(points[0].value.toFixed(2), points[0].x - 15, points[0].y - 5)
  ctx.fillText(points[points.length-1].value.toFixed(2), points[points.length-1].x + 5, points[points.length-1].y - 5)
}

// 监听停留类型变化，自动更新状态
const onStayTypeChange = () => {
  // 重置手动标记（因为用户改了停留类型，可能想重新自动判断）
  statusManuallySet.value = false
  applyAutoStatus()
}

// 作业状态手动变化时标记为已手动设置
const onStatusChange = () => {
  statusManuallySet.value = true
}

// 港口搜索处理
const handleSearch = async () => {
  const keyword = portKeyword.value.trim()
  if (!keyword) {
    portSuggestions.value = []
    return
  }
  try {
    const results = await searchPorts(keyword)
    portSuggestions.value = results || []
  } catch (error) {
    console.error('港口搜索失败:', error)
    portSuggestions.value = []
  }
}

const selectPort = (name) => {
  form.value.port = name
  portKeyword.value = name
  portSuggestions.value = []
}

// 校验表单
const valid = computed(() => {
  const stay = form.value.stayType === 'custom' 
    ? form.value._stayTypeCustom?.trim() 
    : form.value.stayType
  const port = form.value.port?.trim()
  const status = form.value.status === 'custom'
    ? form.value._statusCustom?.trim()
    : form.value.status
  return stay && port && status
})

// 提交
const handleSubmit = () => {
  if (!valid.value) return
  
  const result = {
    id: form.value.id,
    mmsi: form.value.mmsi,
    startTime: form.value.startTime,
    endTime: form.value.endTime,
    stayType: form.value.stayType === 'custom' ? form.value._stayTypeCustom : form.value.stayType,
    port: form.value.port,
    status: form.value.status === 'custom' ? form.value._statusCustom : form.value.status
  }
  
  props.onConfirm?.(result)
}

// 取消
const handleCancel = () => props.onCancel?.()

// 初始化
onMounted(() => {
  if (props.markData) {
    form.value = { ...form.value, ...props.markData }
    if (form.value.status) statusManuallySet.value = true
  }
  
  // 如果停留类型为空，设置为默认值 '靠泊'
  if (!form.value.stayType) {
    form.value.stayType = '靠泊'
  }
  
  // 初始自动判断状态（若未手动）
  if (!statusManuallySet.value) {
    applyAutoStatus()
  }
  
   // 🆕 新增：如果港口为空，尝试根据坐标自动填充
   if (!form.value.port?.trim()) {
    autoFillPortByCoord()
  }
  

  // 绘制图表（需要等待 DOM 渲染）
  nextTick(() => drawChart())
})

// 监听吃水数据变化，重新绘制图表，并重新评估自动状态（若未手动）
watch(() => props.draughts, () => {
  nextTick(() => drawChart())
  if (!statusManuallySet.value) {
    applyAutoStatus()
  }
}, { deep: true })

// 监听表单停留类型变化，自动状态已由 onStayTypeChange 处理，但 watch 也加一层确保
watch(() => form.value.stayType, () => {
  if (!statusManuallySet.value) applyAutoStatus()
})
</script>

<style scoped>
/* 原有样式保持不变，新增折线图相关样式 */
.draught-chart {
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}
.chart-note {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #4b5563;
  margin-top: 8px;
}
/* 其余样式与原代码一致 */
.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 3000;
}
.dialog-card {
  background: #fff; border-radius: 10px; width: 360px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
.dialog-header {
  padding: 14px 18px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
}
.dialog-header h4 { margin: 0; font-size: 16px; }
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #999; }
.dialog-form { padding: 18px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #333; }
.input-group { display: flex; gap: 8px; }
.input-group select, .input-group input, .search-input {
  flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;
}
.custom-input { margin-top: 6px; }
.port-search { position: relative; }
.suggestion-list {
  position: absolute; top: 100%; left: 0; right: 0;
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  max-height: 180px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin: 4px 0 0; padding: 0; list-style: none;
}
.suggestion-item {
  padding: 10px 12px; cursor: pointer; font-size: 13px;
}
.suggestion-item:hover { background: #f5f7fa; }
.readonly p { margin: 4px 0 0; color: #666; font-size: 12px; }
.dialog-footer {
  padding: 14px 18px; border-top: 1px solid #eee;
  display: flex; justify-content: flex-end; gap: 10px;
}
.btn-cancel, .btn-ok {
  padding: 7px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none;
}
.btn-cancel { background: #f3f4f6; color: #374151; }
.btn-ok { background: #8b5cf6; color: #fff; }
.btn-ok:disabled { opacity: 0.6; cursor: not-allowed; }
</style>