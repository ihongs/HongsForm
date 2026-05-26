<template>
  <div class="app">
    <router-view />
    <SlideCaptcha ref="slideCaptchaRef" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SlideCaptcha from './components/SlideCaptcha.vue'

const slideCaptchaRef = ref(null)

onMounted(() => {
  window.verifySlideCaptcha = async () => {
    if (!slideCaptchaRef.value) {
      throw new Error('验证码组件未加载')
    }
    return await slideCaptchaRef.value.openModal()
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
}
</style>
