<template>
  <div class="qrcode-container">
    <QrcodeVue v-if="value" :value="value" :size="size" level="M" render-as="canvas" />
    <div v-else class="qrcode-placeholder">二维码加载中...</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'

const props = defineProps({
  value: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 200
  }
})
</script>

<style scoped>
.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.qrcode-placeholder {
  color: #999;
  text-align: center;
  padding: 2rem;
}
</style>