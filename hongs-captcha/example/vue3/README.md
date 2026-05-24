# Hongs Captcha - Vue 3 示例

一个干净的滑动验证码 Vue 3 组件示例。

## 使用方式

直接复制 `SliderVerify.vue` 到你的 Vue 3 项目中使用：

```vue
<template>
  <SliderVerify 
    @success="onSuccess"
    @fail="onFail"
  />
</template>

<script setup>
import SliderVerify from './components/SliderVerify.vue'

function onSuccess(answer) {
  console.log('验证成功', answer)
}
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| width | number | 320 | 验证码宽度 |
| height | number | 180 | 验证码高度 |
| tolerance | number | 5 | 验证误差容限 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| ready | ordeal | 验证码准备就绪 |
| success | answer | 验证成功 |
| fail | - | 验证失败 |
| refresh | - | 刷新验证码 |

## 类型引用

如果需要引用类型，从 `../../src/types` 导入：

```typescript
import type { CaptchaOrdeal, CaptchaAnswer } from '../../src/types'
```
