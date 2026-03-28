<template>

    <!-- ✨ 播放控制卡片 -->
    <fieldset class="control-card marker-card">
        <legend><span aria-hidden="true">📍</span> 停留标记</legend>
        
        <!-- 标记状态提示 -->
        <div v-if="markMode !== 'idle'" class="mark-hint">
          {{ markMode === 'selecting-start' ? '👆 点击轨迹选择起点' : '👇 点击轨迹选择终点' }}
          <button class="hint-cancel" @click="cancelMarking">取消</button>
        </div>
        
        <!-- 标记操作 -->
        <div v-if="markMode === 'idle'" class="mark-actions">
          <button class="btn-mark" @click="startMarkAtCurrent" 
                  :disabled="!currentPoint || !hasData">
            🏁 从当前点开始标记
          </button>
        </div>
        
        <!-- 标记表单 -->
        <div v-if="markMode === 'editing'" class="mark-form">
          <div class="form-row">
            <label>类型:</label>
            <select v-model="currentMark.stayType" @change="updateMarkField('stayType', $event.target.value)">
              <option v-for="t in STAY_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>港口:</label>
            <input type="text" v-model="currentMark.port" 
                   @input="updateMarkField('port', $event.target.value)"
                   placeholder="如: 上海" maxlength="20"/>
          </div>
          <div class="form-row">
            <label>备注:</label>
            <input type="text" v-model="currentMark.note" 
                   @input="updateMarkField('note', $event.target.value)"
                   placeholder="可选" maxlength="50"/>
          </div>
          <div class="form-row time-preview">
            <small>🕐 {{ formatTime(currentMark.startTime) }} ~ {{ formatTime(currentMark.endTime) }}</small>
          </div>
          <div class="form-actions">
            <button class="btn primary" @click="addPendingMark" :disabled="!currentMark.endTime">✅ 添加到表格</button>
            <button class="btn" @click="cancelMarking">❌ 取消</button>
          </div>
        </div>
        
        <!-- 待提交表格 -->
        <div v-if="pendingMarks.length > 0" class="marks-table-wrapper">
          <table class="marks-table">
            <thead>
              <tr>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>类型</th>
                <th>港口</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in pendingMarks" :key="m.id" class="mark-row">
                <td>{{ formatTime(m.startTime) }}</td>
                <td>{{ formatTime(m.endTime) }}</td>
                <td>
                  <select v-model="m.stayType" @change="updatePendingMarkType(m.id, $event.target.value)" 
                          class="inline-select">
                    <option v-for="t in STAY_TYPES" :key="t" :value="t">{{ t }}</option>
                  </select>
                </td>
                <td>
                  <input type="text" v-model="m.port" @input="updatePendingMarkPort(m.id, $event.target.value)" 
                         class="inline-input" maxlength="20"/>
                </td>
                <td>
                  <button class="btn-icon" @click="removePendingMark(m.id)" title="删除">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="table-actions">
            <button class="btn primary" @click="submitPendingMarks" :disabled="loading || pendingMarks.length === 0">
              {{ loading ? '提交中...' : `✅ 提交 ${pendingMarks.length} 条` }}
            </button>
            <button class="btn" @click="exportCSV">📥 导出 CSV</button>
          </div>
        </div>
      </fieldset>
</template>