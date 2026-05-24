<template>
  <div class="hongs-captcha" :style="{ width: `${width}px` }">
    <div class="captcha-container" :style="{ height: `${height}px` }">
      <canvas ref="bgCanvas" class="bg-canvas" :width="width" :height="height"></canvas>
      <canvas ref="blockCanvas" class="block-canvas" :width="width" :height="height" :style="{ left: `${blockX}px` }"></canvas>
      <div v-if="status === 'success'" class="captcha-overlay success">
        <span class="icon">✓</span>
        <span class="text">验证成功</span>
      </div>
      <div v-if="status === 'fail'" class="captcha-overlay fail">
        <span class="icon">✗</span>
        <span class="text">验证失败，请重试</span>
      </div>
    </div>
    <div class="slider-container">
      <div class="slider-track"></div>
      <div class="slider-tip" v-show="status === 'idle'">
        向右拖动滑块完成拼图
      </div>
      <div 
        class="slider-button"
        :class="{ active: isDragging, success: status === 'success', fail: status === 'fail' }"
        :style="{ left: `${sliderX}px` }"
        @mousedown="onMouseDown"
        @touchstart="onTouchStart"
      >
        <span class="slider-icon" v-if="status === 'idle'">→</span>
        <span class="slider-icon" v-else-if="status === 'success'">✓</span>
        <span class="slider-icon" v-else-if="status === 'fail'">✗</span>
        <span class="slider-icon" v-else>→</span>
      </div>
    </div>
    <div class="actions">
      <button @click="refresh" class="refresh-btn" :disabled="status === 'dragging'">
        刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { CaptchaOrdeal, CaptchaAnswer } from '../../src/types'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  tolerance?: number
}>(), {
  width: 320,
  height: 180,
  tolerance: 5
})

const emit = defineEmits<{
  (e: 'ready', ordeal: CaptchaOrdeal): void
  (e: 'success', answer: CaptchaAnswer): void
  (e: 'fail'): void
  (e: 'refresh'): void
}>()

const bgCanvas = ref<HTMLCanvasElement | null>(null)
const blockCanvas = ref<HTMLCanvasElement | null>(null)

const ordeal = ref<CaptchaOrdeal | null>(null)
const status = ref<'idle' | 'dragging' | 'success' | 'fail'>('idle')
const sliderX = ref(0)
const blockX = ref(0)
const isDragging = ref(false)
const trail = ref<Array<{ x: number, y: number, t: number }>>([])

const maxSliderX = computed(() => props.width - 50)

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#667eea')
  gradient.addColorStop(1, '#764ba2')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const r = Math.random() * 30 + 10
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`
    ctx.fill()
  }
  
  const cx = width / 2
  const cy = height / 2
  ctx.beginPath()
  ctx.arc(cx, cy, 40, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 3
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fill()
}

function drawBlock(ctx: CanvasRenderingContext2D, bgCanvas: HTMLCanvasElement, x: number, y: number, size: number, srcX: number) {
  ctx.save()
  ctx.translate(x, y)
  
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 2
  
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  
  ctx.clip()
  ctx.drawImage(bgCanvas, srcX, y, size, size, 0, 0, size, size)
  
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 3
  ctx.stroke()
  
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - r + 5, cy)
  ctx.lineTo(cx + r - 5, cy)
  ctx.moveTo(cx, cy - r + 5)
  ctx.lineTo(cx, cy + r - 5)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.stroke()
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  ctx.restore()
}

function drawBlockHole(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size / 2 - 2
  
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  
  ctx.clip()
  ctx.clearRect(x, y, size, size)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 3
  ctx.stroke()
  
  ctx.restore()
}

function generateOrdeal() {
  const blockSize = 50
  const padding = 10
  const targetX = Math.random() * (props.width - blockSize - padding * 2) + padding
  const targetY = Math.random() * (props.height - blockSize - padding * 2) + padding
  const expiresIn = 300
  
  ordeal.value = {
    id: generateId(),
    targetX,
    targetY,
    width: blockSize,
    height: blockSize,
    expiresAt: Date.now() + expiresIn * 1000
  }
  
  return ordeal.value
}

function render() {
  if (!bgCanvas.value || !blockCanvas.value || !ordeal.value) return
  
  const bgCtx = bgCanvas.value.getContext('2d')
  const blockCtx = blockCanvas.value.getContext('2d')
  
  if (!bgCtx || !blockCtx) return
  
  bgCtx.clearRect(0, 0, props.width, props.height)
  blockCtx.clearRect(0, 0, props.width, props.height)
  
  drawBackground(bgCtx, props.width, props.height)
  
  drawBlockHole(bgCtx, ordeal.value.targetX, ordeal.value.targetY, ordeal.value.width)
  drawBlock(blockCtx, bgCanvas.value, 0, ordeal.value.targetY, ordeal.value.width, ordeal.value.targetX)
}

function refresh() {
  status.value = 'idle'
  sliderX.value = 0
  blockX.value = 0
  trail.value = []
  
  const newOrdeal = generateOrdeal()
  render()
  emit('ready', newOrdeal)
  emit('refresh')
}

function onMouseDown(e: MouseEvent) {
  if (status.value !== 'idle') return
  
  isDragging.value = true
  status.value = 'dragging'
  trail.value = [{ x: 0, y: 0, t: Date.now() }]
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !ordeal.value) return
  
  const rect = blockCanvas.value?.parentElement?.getBoundingClientRect()
  if (!rect) return
  
  const newX = Math.max(0, Math.min(e.clientX - rect.left - 25, maxSliderX.value))
  sliderX.value = newX
  blockX.value = newX
  
  trail.value.push({
    x: newX,
    y: 0,
    t: Date.now()
  })
}

function onMouseUp() {
  if (!isDragging.value) return
  
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  
  verify()
}

function onTouchStart(e: TouchEvent) {
  if (status.value !== 'idle') return
  
  isDragging.value = true
  status.value = 'dragging'
  trail.value = [{ x: 0, y: 0, t: Date.now() }]
  
  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || !ordeal.value) return
  
  const rect = blockCanvas.value?.parentElement?.getBoundingClientRect()
  if (!rect) return
  
  const touch = e.touches[0]
  const newX = Math.max(0, Math.min(touch.clientX - rect.left - 25, maxSliderX.value))
  sliderX.value = newX
  blockX.value = newX
  
  trail.value.push({
    x: newX,
    y: 0,
    t: Date.now()
  })
}

function onTouchEnd() {
  if (!isDragging.value) return
  
  isDragging.value = false
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  
  verify()
}

function verify() {
  if (!ordeal.value) return
  
  const diff = Math.abs(blockX.value - ordeal.value.targetX)
  const isSuccess = diff <= props.tolerance
  
  if (isSuccess) {
    status.value = 'success'
    
    const answer: CaptchaAnswer = {
      id: ordeal.value.id,
      x: blockX.value,
      y: ordeal.value.targetY,
      trail: trail.value
    }
    
    emit('success', answer)
  } else {
    status.value = 'fail'
    emit('fail')
    
    setTimeout(() => {
      refresh()
    }, 1500)
  }
}

onMounted(() => {
  const newOrdeal = generateOrdeal()
  render()
  emit('ready', newOrdeal)
})
</script>

<style scoped>
.hongs-captcha {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  user-select: none;
}

.captcha-container {
  position: relative;
  background: #f5f5f5;
}

.bg-canvas {
  display: block;
}

.block-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.captcha-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
}

.captcha-overlay.success {
  background: rgba(82, 196, 26, 0.9);
  color: #fff;
}

.captcha-overlay.fail {
  background: rgba(245, 34, 45, 0.9);
  color: #fff;
}

.captcha-overlay .icon {
  font-size: 32px;
}

.slider-container {
  position: relative;
  height: 44px;
  background: #f5f5f5;
  border-top: 1px solid #e5e5e5;
}

.slider-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, #e5e5e5, #f5f5f5);
}

.slider-tip {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: #999;
  white-space: nowrap;
}

.slider-button {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.slider-button.active {
  background: #667eea;
}

.slider-button.success {
  background: #52c41a;
}

.slider-button.fail {
  background: #f5222d;
}

.slider-icon {
  font-size: 18px;
  color: #666;
}

.slider-button.active .slider-icon,
.slider-button.success .slider-icon,
.slider-button.fail .slider-icon {
  color: #fff;
}

.actions {
  padding: 12px;
  display: flex;
  justify-content: flex-end;
}

.refresh-btn {
  padding: 6px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
