<template>
  <div v-if="visible" class="slide-captcha-overlay" @click="handleOverlayClick">
    <div class="slide-captcha-modal" @click.stop>
      <div class="modal-header">
        <h5 class="modal-title">拖动准星瞄准标靶</h5>
        <button type="button" class="btn-close" @click="closeModal"></button>
      </div>
      <div class="modal-body">
        <div v-if="captchaLoading" class="text-center py-4">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
        <div v-else class="d-flex justify-content-center">
          <div class="captcha-container" :style="{ width: captchaWidth + 'px', height: captchaHeight + 'px' }">
            <!-- 背景图 -->
            <img 
              :src="backgroundImage" 
              class="captcha-bg" 
              :width="captchaWidth" 
              :height="captchaHeight"
              draggable="false" 
            />
            
            <!-- 滑块轨道 -->
            <div class="slider-track" 
                 :style="{ width: captchaWidth + 'px', height: '50px', bottom: '0' }">
              <!-- 滑块 -->
              <div class="slider"
                   :style="{ 
                     width: sliderWidth + 'px', 
                     height: sliderHeight + 'px',
                     left: sliderX + 'px'
                   }"
                   :class="{ dragging: isDragging }"
                   @mousedown="startDrag"
                   @touchstart.prevent="startDrag">
                <img 
                  :src="sliderImage" 
                  :width="sliderWidth" 
                  :height="sliderHeight" 
                  draggable="false" 
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="captchaError" class="alert alert-danger mt-3">{{ captchaError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const resolveCallback = ref(null)

const captchaId = ref('')
const backgroundImage = ref('')
const sliderImage = ref('')
const sliderWidth = ref(50)
const sliderHeight = ref(50)
const captchaWidth = ref(300)
const captchaHeight = ref(150)
const sliderX = ref(0)
const isDragging = ref(false)
const captchaLoading = ref(false)
const captchaError = ref('')
let startX = 0
let startSliderX = 0

async function generateCaptcha() {
  captchaLoading.value = true
  captchaError.value = ''
  
  try {
    const response = await fetch('/api/rpc/common', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'verify.generateSlideCaptcha',
        params: {},
        id: Date.now()
      })
    })
    const result = await response.json()
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    const data = result.result
    captchaId.value = data.captchaId
    backgroundImage.value = data.backgroundImage
    sliderImage.value = data.sliderImage
    sliderWidth.value = data.sliderWidth
    sliderHeight.value = data.sliderHeight
    captchaWidth.value = data.captchaWidth
    captchaHeight.value = data.captchaHeight
    sliderX.value = 0
  } catch (err) {
    captchaError.value = err.message || '加载验证码失败'
  } finally {
    captchaLoading.value = false
  }
}

async function verifyCaptcha(x) {
  const response = await fetch('/api/rpc/common', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'verify.verifySlideCaptcha',
      params: { captchaId: captchaId.value, x },
      id: Date.now()
    })
  })
  const result = await response.json()
  
  if (result.error) {
    throw new Error(result.error.message)
  }
  
  return result.result.verifyToken
}

function startDrag(e) {
  if (isDragging.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  isDragging.value = true
  const touch = e.touches?.[0] || e
  startX = touch.clientX
  startSliderX = sliderX.value
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e) {
  if (!isDragging.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const touch = e.touches?.[0] || e
  let newX = startSliderX + (touch.clientX - startX)
  
  newX = Math.max(0, Math.min(newX, captchaWidth.value - sliderWidth.value))
  sliderX.value = newX
}

async function stopDrag() {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
  
  try {
    const verifyToken = await verifyCaptcha(sliderX.value)
    closeModal()
    resolveCallback.value?.(verifyToken)
  } catch (err) {
    captchaError.value = err.message || '验证失败'
    await generateCaptcha()
  }
}

function handleOverlayClick() {
  // 点击遮罩不关闭
}

function closeModal() {
  visible.value = false
  captchaError.value = ''
}

async function openModal() {
  visible.value = true
  await generateCaptcha()
  
  return new Promise((resolve) => {
    resolveCallback.value = resolve
  })
}

defineExpose({
  openModal
})
</script>

<style scoped>
.slide-captcha-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.slide-captcha-modal {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
}

.captcha-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid #e0e0e0;
  user-select: none;
  -webkit-user-select: none;
}

.captcha-bg {
  display: block;
}

.slider-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
}

.slider {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  transition: transform 0.1s ease;
  user-select: none;
  -webkit-user-select: none;
}

.slider:hover {
  transform: translateY(-50%) scale(1.05);
}

.slider.dragging {
  transform: translateY(-50%) scale(1.1);
  transition: none;
}

.slider img {
  display: block;
}
</style>
