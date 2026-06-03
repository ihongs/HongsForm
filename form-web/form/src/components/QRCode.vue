<template>
  <QrcodeVue :value="value" :size="size" level="M" render-as="canvas" />
</template>

<script setup>
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
canvas {
  display: block;
  margin: 0 auto;
}
</style>