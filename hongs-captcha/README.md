# Hongs Captcha

一个干净、轻量的验证码组件库，包含后端验证逻辑和前端 Vue 3 示例。

## 项目结构

```
hongs-captcha/
├── src/              # 核心库（发布到 npm）
│   ├── index.ts
│   ├── verify.ts
│   ├── storage.ts
│   └── types.ts
├── example/
│   └── vue3/         # Vue 3 示例（不发布）
│       ├── SliderVerify.vue
│       └── README.md
├── package.json
└── README.md
```

## 安装使用

```typescript
import { CaptchaServer } from 'hongs-captcha'

const captcha = new CaptchaServer()

// 生成挑战
const ordeal = await captcha.generateOrdeal()

// 验证答案
const result = await captcha.verify(answer)
```

## 详细说明

### Server 端

详见 [src/](src/)

### Client Web 端

详见 [example/vue3/README.md](example/vue3/README.md)

## 集成示例

### 集成到 Hongs Form API

在 `hongs-form-api/server/src/utils/captcha.ts` 中集成：

```typescript
import { CaptchaServer } from '../../../hongs-captcha/src/verify'
import type { CaptchaOrdeal, CaptchaAnswer, CaptchaResult, CaptchaConfig } from '../../../hongs-captcha/src/types'

class RosterStorage {
  async set(ordeal: CaptchaOrdeal): Promise<void> {
    // 使用 roster 存储
  }
  async get(id: string): Promise<CaptchaOrdeal | null> {
    // 从 roster 获取
  }
}

export const captchaServer = new CaptchaServer({
  storage: new RosterStorage()
})
```

在 `hongs-form-api/server/src/api/rpc/shared/users.ts` 中添加：

```typescript
import { captchaServer } from '../../utils/captcha'

export async function generateCaptchaOrdeal(): Promise<any> {
  return await captchaServer.generateOrdeal()
}

export async function verifyCaptcha(answer: any): Promise<any> {
  return await captchaServer.verify(answer)
}

export async function sendEmailVerificationCode(params: Record<string, unknown>): Promise<{ success: boolean }> {
  const { email, type, captchaAnswer } = params
  if (captchaAnswer) {
    const captchaResult = await captchaServer.verify(captchaAnswer)
    if (!captchaResult.success) throw new Error('Captcha verification failed')
  }
  // 发送邮件验证码逻辑
}
```

### 集成到 Hongs Form Web Agent

复制 `hongs-captcha/example/vue3/SliderVerify.vue` 到 `hongs-form-web/agent/src/views/` 目录，然后在 `LoginView.vue` 中集成：

```vue
<script setup>
import SliderVerify from './SliderVerify.vue'

const captchaAnswer = ref<any>(null)
const captchaVerified = ref(false)

function onCaptchaSuccess(answer: any) {
  captchaAnswer.value = answer
  captchaVerified.value = true
}
</script>
```

## License

MIT
