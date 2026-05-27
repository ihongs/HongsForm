# 验证码验证接口文档

## RPC

HongsForm 验证接口使用 JSON-RPC 2.0，endpoint 为 `/api/rpc/common`，用于处理人机校验、发送验证码等公共验证功能，无需鉴权。

### 基本信息

| Scope | Endpoint | 鉴权 | 用途 |
|------|----------|------|------|
| common | `/api/rpc/common` | 不需要鉴权 | 人机校验、发送验证码等公共验证功能 |

### JSON-RPC 格式

请求统一使用 `POST`，`Content-Type: application/json`。

```json
{
  "jsonrpc": "2.0",
  "method": "verify.generateSlideCaptcha",
  "params": {},
  "id": 1
}
```

成功响应：

```json
{
  "jsonrpc": "2.0",
  "result": {},
  "id": 1
}
```

错误响应：

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Token无效或已过期",
    "data": {}
  },
  "id": 1
}
```

通知请求：如果 `id` 为 `null` 或未提供，方法执行成功后返回 `204 No Content`。

### 错误码

| code | 含义 |
|------|------|
| `-32700` | JSON 解析失败 |
| `-32600` | JSON-RPC 请求格式错误 |
| `-32601` | 当前 scope 下没有对应 method |
| `-32000` | 方法执行错误 |

### common scope

Endpoint：`POST /api/rpc/common`

所有方法都不需要鉴权。

#### `verify.generateToken`

生成算力验证 token（旧版验证方式），用于登录等关键接口的防爆破保护。

参数：无

返回：

```json
{
  "token": "a1b2c3d4e5f6...",
  "nonce": "1234567890_123456",
  "difficulty": 4
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | 验证 token |
| `nonce` | string | 随机数 |
| `difficulty` | number | 难度值（需要 hash 前导 0 的数量） |

验证方式：

- 前端需根据返回的 `nonce` 计算 `answer`，使得 `SHA256(nonce + answer)` 的前导 0 数量满足 `difficulty` 要求
- 调用需要验证的接口（如登录）时，需传入 `verify` 对象 `{token, nonce, answer}`
- 后端接收后展开参数，使用 `verifyProof` 函数验证答案是否正确，验证后 token 立即失效防止重放

#### `verify.generateSlideCaptcha`

生成滑块验证码，用于后续发送验证码前的人机校验。

参数：无

返回：

```json
{
  "captchaId": "a1b2c3d4e5f6...",
  "backgroundImage": "data:image/svg+xml;base64,...",
  "sliderImage": "data:image/svg+xml;base64,...",
  "sliderWidth": 50,
  "sliderHeight": 50,
  "captchaWidth": 300,
  "captchaHeight": 150
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `captchaId` | string | 验证码 ID，有效期 10 分钟 |
| `backgroundImage` | string | 背景图（base64 SVG） |
| `sliderImage` | string | 滑块图（base64 SVG） |
| `sliderWidth` | number | 滑块宽度（像素） |
| `sliderHeight` | number | 滑块高度（像素） |
| `captchaWidth` | number | 验证码图片宽度（像素） |
| `captchaHeight` | number | 验证码图片高度（像素） |

#### `verify.verifySlideCaptcha`

验证滑块验证码的位置，验证通过后返回 verifyToken。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `captchaId` | string | 是 | 验证码 ID |
| `x` | number | 是 | 用户拖动滑块的 X 坐标 |

返回：

```json
{
  "success": true,
  "verifyToken": "a1b2c3d4e5f6..."
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否验证成功 |
| `verifyToken` | string | 验证通过的令牌，有效期 5 分钟，用于后续发送验证码请求 |

错误情况：

| 错误信息 | 说明 |
|----------|------|
| `参数不完整` | 必填参数缺失 |
| `验证失败，请重试` | 滑块位置不正确 |

#### `verify.sendSmsCode`

发送短信验证码，需要先通过滑块验证获取 verifyToken。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `verifyToken` | string | 是 | 滑块验证通过的令牌 |
| `phone` | string | 是 | 手机号 |

返回：

```json
{
  "success": true,
  "message": "验证码发送成功"
}
```

错误情况：

| 错误信息 | 说明 |
|----------|------|
| `参数不完整` | 必填参数缺失 |
| `请X秒后再试` | 距离上次发送不足 55 秒，请等待 |
| `1小时内发送次数过多，请稍后再试` | 该手机号 1 小时内已发送 5 次 |

#### `verify.sendEmailCode`

发送邮箱验证码，需要先通过滑块验证获取 verifyToken。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `verifyToken` | string | 是 | 滑块验证通过的令牌 |
| `email` | string | 是 | 邮箱地址 |

返回：

```json
{
  "success": true,
  "message": "验证码发送成功"
}
```

错误情况同 `sendSmsCode`。

### 后端存储规则

所有临时数据存储在 `roster` 中，所有 key 加上 `verify.` 前缀：

#### 1）滑块验证码存储

```typescript
// 生成验证码时保存正确位置（10分钟过期）
await roster.set(`verify.slide.${captchaId}`, { x: correctX, y: correctY }, 600);

// 验证时获取并立即删除
const storedData = await roster.get(`verify.slide.${captchaId}`);
await roster.remove(`verify.slide.${captchaId}`);

// 验证位置偏差（允许±10像素）
const deviation = Math.abs(userX - storedData.x);
const success = deviation <= 10;
```

#### 2）滑块验证令牌存储

```typescript
// 验证通过后生成令牌（5分钟过期）
const verifyToken = randomBytes(20).toString('hex');
await roster.set(`verify.slide.token.${verifyToken}`, 1, 300);

// 使用时验证并立即删除
const tokenStatus = await roster.get(`verify.slide.token.${verifyToken}`);
if (!tokenStatus) throw new Error('验证令牌无效或已过期');
await roster.remove(`verify.slide.token.${verifyToken}`);
```

#### 3）频率计数（手机号/邮箱）

```typescript
// 对 target（手机号/邮箱）做 md5 防止超长 key 攻击
const targetMd5 = md5(target);

// 获取完整记录（包含 updatedAt）
const countRecord = await roster.getRecord(`verify.${type}.limit.${targetMd5}`);
const currentCount = countRecord?.value || 0;

// 验证上次发送时间间隔（至少 55 秒）
if (countRecord?.updatedAt) {
  const timeSinceLast = (Date.now() - countRecord.updatedAt.getTime()) / 1000;
  if (timeSinceLast < 55) {
    throw new Error(`请${Math.ceil(55 - timeSinceLast)}秒后再试`);
  }
}

// 验证每小时发送次数（最多5次）
if (currentCount >= 5) {
  throw new Error('1小时内发送次数过多，请稍后再试');
}

// 设置（1小时过期）
await roster.set(`verify.${type}.limit.${targetMd5}`, currentCount + 1, 3600);
```

#### 4）短信验证码存储

```typescript
// 对 phone 做 md5 防止超长 key 攻击
const phoneMd5 = md5(phone);

// 存入验证码（5分钟过期）
await roster.set(`verify.sms.code.${phoneMd5}`, code, 300);

// 验证时获取并立即删除（防止重复使用）
const storedCode = await roster.get(`verify.sms.code.${phoneMd5}`);
if (!storedCode) throw new Error('验证码已过期，请重新获取');
if (storedCode !== userCode) throw new Error('验证码错误');
await roster.remove(`verify.sms.code.${phoneMd5}`);
```

#### 5）邮箱验证码存储

```typescript
// 对 email 做 md5 防止超长 key 攻击
const emailMd5 = md5(email);

// 存入验证码（5分钟过期）
await roster.set(`verify.email.code.${emailMd5}`, code, 300);

// 验证时获取并立即删除（防止重复使用）
const storedCode = await roster.get(`verify.email.code.${emailMd5}`);
if (!storedCode) throw new Error('验证码已过期，请重新获取');
if (storedCode !== userCode) throw new Error('验证码错误');
await roster.remove(`verify.email.code.${emailMd5}`);
```

#### 6）表单相关验证码存储（带表单ID）

```typescript
// 表单验证码key格式：verify.${type}.code.${formId}.${targetMd5}
// 这样同一个手机号/邮箱可以在不同表单中分别使用验证码

// 发送时存储（包含表单ID）
await roster.set(`verify.${type}.code.${formId}.${targetMd5}`, code, 300);

// 验证时获取并立即删除（包含表单ID）
const storedCode = await roster.get(`verify.${type}.code.${formId}.${targetMd5}`);
if (!storedCode) throw new Error('验证码已过期，请重新获取');
if (storedCode !== userCode) throw new Error('验证码错误');
await roster.remove(`verify.${type}.code.${formId}.${targetMd5}`);

// 发送前检查重复提交
const existingRecord = await db.collection('formData').findOne({
  formId: ObjectId(formId),
  data: { phone/email }
});
if (existingRecord) {
  throw new Error('该手机号/邮箱已填写过此表单');
}
```

**验证码验证说明**：
- 使用 `get + remove` 原子操作获取并删除验证码，防止重复使用
- 验证码有效期为 5 分钟
- 表单验证码会与表单ID绑定，不同表单相互独立

### 验证令牌安全规则

- 滑块验证令牌有效期 **5 分钟**
- 使用后立即失效
- 无法重放、无法复用、无法爆破

### 完整工作流程

1. 前端调用 `verify.generateSlideCaptcha` 获取验证码图片和 captchaId
2. 显示滑块验证界面，用户拖动滑块
3. 前端调用 `verify.verifySlideCaptcha` 传入 `captchaId` 和用户拖动的位置 `x`
4. 验证通过后，返回 `verifyToken`
5. 前端使用 `verifyToken` 调用 `verify.sendSmsCode` 或 `verify.sendEmailCode` 发送验证码
6. 后端验证 verifyToken 有效性、频率限制
7. 验证通过后，发送真实的验证码

### 示例

#### 生成滑块验证码

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/common \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"verify.generateSlideCaptcha","params":{},"id":1}'
```

响应：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "captchaId": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    "backgroundImage": "data:image/svg+xml;base64,...",
    "sliderImage": "data:image/svg+xml;base64,...",
    "sliderWidth": 50,
    "sliderHeight": 50,
    "captchaWidth": 300,
    "captchaHeight": 150
  },
  "id": 1
}
```

#### 验证滑块验证码

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/common \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "method":"verify.verifySlideCaptcha",
    "params":{
      "captchaId":"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      "x":150
    },
    "id":2
  }'
```

响应：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "verifyToken": "x9y8z7w6v5u4t3s2r1q0..."
  },
  "id": 2
}
```

## 表单限次填报验证

### form scope

Endpoint：`POST /api/rpc/form`

用于表单相关的验证功能，无需鉴权。

| Scope | Endpoint | 鉴权 | 用途 |
|------|----------|------|------|
| form | `/api/rpc/form` | 不需要鉴权 | 表单验证、表单数据提交等表单相关功能 |

#### `form.verify.sendSmsCode`

发送表单短信验证码，需要先通过滑块验证获取 verifyToken。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formId` | string | 是 | 表单 ID |
| `phone` | string | 是 | 手机号 |
| `verifyToken` | string | 是 | 滑块验证 token |

返回：

```json
{
  "success": true,
  "message": "验证码发送成功"
}
```

错误情况：

| 错误信息 | 说明 |
|----------|------|
| `参数不完整` | 必填参数缺失 |
| `表单不存在` | 表单 ID 无效或未发布 |
| `表单未开启手机号验证` | 表单未配置 oncePerPhone |
| `该手机号已填写过此表单` | 该手机号已提交过此表单 |
| `请X秒后再试` | 距离上次发送不足 55 秒 |
| `1小时内发送次数过多，请稍后再试` | 该手机号 1 小时内已发送 5 次 |

#### `form.verify.sendEmailCode`

发送表单邮箱验证码，需要先通过滑块验证获取 verifyToken。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formId` | string | 是 | 表单 ID |
| `email` | string | 是 | 邮箱地址 |
| `verifyToken` | string | 是 | 滑块验证 token |

返回：

```json
{
  "success": true,
  "message": "验证码发送成功"
}
```

错误情况同 `sendSmsCode`。

#### `formData.create`

提交表单数据，根据表单配置验证相应的验证码。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formId` | string | 是 | 表单 ID |
| `data` | object | 是 | 表单数据 |
| `phoneCode` | string | 否 | 手机验证码（表单开启 oncePerPhone 时必填） |
| `emailCode` | string | 否 | 邮箱验证码（表单开启 oncePerEmail 时必填） |
| `userToken` | string | 否 | 访客标识（表单开启 oncePerGuest 时需要） |
| `userIp` | string | 否 | 用户 IP |
| `userAgent` | string | 否 | 用户代理 |
| `channel` | string | 否 | 渠道，默认 'web' |

返回：

```json
{
  "id": "60a1b2c3d4e5f6...",
}
```

错误情况：

| 错误信息 | 说明 |
|----------|------|
| `Form ID is required` | 表单 ID 缺失 |
| `Form data is required` | 表单数据缺失 |
| `Form not found` | 表单不存在或未发布 |
| `请填写手机号` | 表单开启 oncePerPhone 但未提供手机号 |
| `请填写邮箱` | 表单开启 oncePerEmail 但未提供邮箱 |
| `验证码错误或已过期` | 验证码不正确或已超过 5 分钟 |
| `该手机号已填写过此表单` | 该手机号已提交过此表单 |
| `该邮箱已填写过此表单` | 该邮箱已提交过此表单 |
| `You have already submitted this form` | 访客/用户已提交过此表单（oncePerGuest/oncePerUser） |

### 完整工作流程

1. 前端调用 `verify.generateSlideCaptcha` 获取 `captchaId` 和目标位置
2. 用户拖动滑块到目标位置
3. 前端调用 `verify.verifySlideCaptcha` 传入 `captchaId` 和用户拖动的位置 `x`
4. 验证通过后，返回 `verifyToken`
5. 前端使用 `verifyToken` 和 `formId` 调用 `form.verify.sendSmsCode` 或 `form.verify.sendEmailCode` 发送验证码
6. 后端验证 verifyToken 有效性、表单配置、重复提交、频率限制
7. 验证通过后，发送真实的验证码
8. 用户输入验证码后，调用 `formData.create` 提交表单数据和验证码
9. 后端验证验证码有效性、表单数据、重复提交
10. 验证通过后，保存表单数据

### 示例

#### 发送表单短信验证码

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/form \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "method":"form.verify.sendSmsCode",
    "params":{
      "formId":"60a1b2c3d4e5f6...",
      "phone":"13800138000",
      "verifyToken":"x9y8z7w6v5u4t3s2r1q0..."
    },
    "id":3
  }'
```

响应：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "message": "验证码发送成功"
  },
  "id": 3
}
```

#### 提交表单数据（带验证码）

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/form \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "method":"formData.create",
    "params":{
      "formId":"60a1b2c3d4e5f6...",
      "data":{
        "phone":"13800138000",
        "name":"张三",
        "message":"测试"
      },
      "phoneCode":"123456",
      "userToken":"guest_abc123"
    },
    "id":4
  }'
```

响应：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": "60a1b2c3d4e5f6..."
  },
  "id": 4
}
```

错误响应示例：

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "验证码错误或已过期"
  },
  "id": 4
}
```
