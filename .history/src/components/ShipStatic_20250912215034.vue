<!-- src/components/ShipStatic.vue -->
<template>
  <div v-if="shipInfo" class="mb-8 p-6 bg-white shadow rounded-lg">
    <h2 class="text-xl font-semibold mb-4">船舶属性信息</h2>
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border px-4 py-2 bg-gray-100 text-left">字段</th>
          <th class="border px-4 py-2 bg-gray-100 text-left">值</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="border px-4 py-2">MMSI</td><td class="border px-4 py-2">{{ shipInfo.mmsi }}</td></tr>
        <tr><td class="border px-4 py-2">船名</td><td class="border px-4 py-2">{{ shipInfo.name || '未知' }}</td></tr>
        <tr><td class="border px-4 py-2">船长 (米)</td><td class="border px-4 py-2">{{ shipInfo.length }}</td></tr>
        <tr><td class="border px-4 py-2">型宽 (米)</td><td class="border px-4 py-2">{{ shipInfo.width }}</td></tr>
        <tr><td class="border px-4 py-2">吃水 (米)</td><td class="border px-4 py-2">{{ shipInfo.draught }}</td></tr>
        <tr><td class="border px-4 py-2">IMO 编号</td><td class="border px-4 py-2">{{ shipInfo.imo || '无' }}</td></tr>
        <tr><td class="border px-4 py-2">呼号</td><td class="border px-4 py-2">{{ shipInfo.callsign || '无' }}</td></tr>
        <tr><td class="border px-4 py-2">船舶类型代码</td><td class="border px-4 py-2">{{ shipInfo.type }}</td></tr>
        <tr><td class="border px-4 py-2">贸易类型代码</td><td class="border px-4 py-2">{{ shipInfo.tradetype }}</td></tr>
        <tr><td class="border px-4 py-2">左舷距船首 (米)</td><td class="border px-4 py-2">{{ shipInfo.left }}</td></tr>
        <tr><td class="border px-4 py-2">尾迹距船尾 (米)</td><td class="border px-4 py-2">{{ shipInfo.trail }}</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  shipInfo: {
    type: Object,
    required: false,
    default: null
  }
})
</script>