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
  "method": "verify.generateToken",
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

生成验证 token 和算力挑战，用于后续验证码发送前的人机校验。

参数：无

返回：

```json
{
  "token": "a1b2c3d4e5f6...",
  "nonce": "1716630000000_123456",
  "difficulty": 4
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | 验证 token，有效期 1 小时 |
| `nonce` | string | 随机数，用于算力计算 |
| `difficulty` | number | 算力难度，表示 SHA-256 哈希前缀需要的 0 的个数 |

#### `verify.sendSmsCode`

发送短信验证码，需要先通过 `verify.generateToken` 获取 token 并完成算力校验。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `token` | string | 是 | 验证 token |
| `nonce` | string | 是 | 算力挑战的 nonce |
| `answer` | number | 是 | 算力答案 |
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
| `token无效或已过期` | token 不存在或已超过 1 小时有效期 |
| `请勿重复发送` | token 已被使用过 |
| `验证失败` | 算力答案不正确 |
| `请X秒后再试` | 距离上次发送不足 55 秒，请等待 |
| `1小时内发送次数过多，请稍后再试` | 该手机号/邮箱 1 小时内已发送 5 次 |

#### `verify.sendEmailCode`

发送邮箱验证码，需要先通过 `verify.generateToken` 获取 token 并完成算力校验。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `token` | string | 是 | 验证 token |
| `nonce` | string | 是 | 算力挑战的 nonce |
| `answer` | number | 是 | 算力答案 |
| `email` | string | 是 | 邮箱地址 |

返回：

```json
{
  "success": true,
  "message": "验证码发送成功"
}
```

错误情况同 `sendSmsCode`。

### 算力验证规则

#### 前端算力计算

前端需要根据 `nonce` 和 `answer` 计算 SHA-256 哈希，确保哈希值以 `difficulty` 个 0 开头。

计算公式：

```javascript
hash = SHA256(nonce + answer)
```

示例（difficulty = 4）：

```javascript
// 正确示例
nonce = "1716630000000_123456"
answer = 42
hash = SHA256("1716630000000_12345642")
// hash = "0000a1b2c3d4e5f6..." → 验证通过

// 错误示例
answer = 41
hash = SHA256("1716630000000_12345641")
// hash = "a1b2c3d4e5f6..." → 验证失败
```

### 后端存储规则

所有临时数据存储在 `roster` 中，所有 key 加上 `verify.` 前缀：

#### 1）频率计数（手机号/邮箱）

```typescript
// 对 target（手机号/邮箱）做 md5 防止超长 key 攻击
const targetMd5 = MD5(target);

// 获取完整记录（包含 updatedAt）
const countRecord = await roster.getRecord("verify.sms.limit." + targetMd5);
const currentCount = countRecord?.value || 0;

// 验证上次发送时间间隔（至少 55 秒）
if (countRecord?.updatedAt) {
  const timeSinceLast = (Date.now() - countRecord.updatedAt.getTime()) / 1000;
  if (timeSinceLast < 55) {
    throw new Error(`请${Math.ceil(55 - timeSinceLast)}秒后再试`);
  }
}

// 设置（1小时过期）
await roster.set("verify.sms.limit." + targetMd5, currentCount + 1, 3600);
```

#### 2）token 存储

```typescript
// 生成 token 时存入（状态=0，表示未使用）
await roster.set("verify.token." + token, 0, 3600);

// 使用后标记为已使用（状态=1）
await roster.set("verify.token." + token, 1, 3600);
```

#### 3）短信验证码存储

```typescript
// 对 phone 做 md5 防止超长 key 攻击
const phoneMd5 = MD5(phone);

// 存入验证码（5分钟过期）
await roster.set("verify.sms.code." + phoneMd5, code, 300);

// 其他接口验证时获取并立即删除（防止重复使用）
const storedCode = await roster.getAndRemove("verify.sms.code." + phoneMd5);
```

#### 4）邮箱验证码存储

```typescript
// 对 email 做 md5 防止超长 key 攻击
const emailMd5 = MD5(email);

// 存入验证码（5分钟过期）
await roster.set("verify.email.code." + emailMd5, code, 300);

// 其他接口验证时获取并立即删除（防止重复使用）
const storedCode = await roster.getAndRemove("verify.email.code." + emailMd5);
```

**验证码验证说明**：
- 使用 `getAndRemove` 原子操作获取并删除验证码，防止重复使用
- 验证码有效期为 5 分钟

### Token 安全规则

- token 有效期 **1 小时**
- 1 小时内 **第二次使用** → 拦截：请勿重复发送
- 1 小时后 **自动过期** → 拦截：token无效或已过期
- 无法重放、无法复用、无法爆破

### 完整工作流程

1. 前端调用 `generateToken` 获取 `token`、`nonce`、`difficulty`
2. 前端根据 `nonce` 和 `difficulty` 计算满足条件的 `answer`
3. 前端调用 `sendSmsCode` 或 `sendEmailCode`，传入 `token`、`nonce`、`answer` 和目标地址
4. 后端验证 token 有效性、算力答案、频率限制
5. 验证通过后，发送真实的验证码
6. 后端标记 token 为已使用状态

### 示例

#### 生成验证 token

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/common \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"verify.generateToken","params":{},"id":1}'
```

响应：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    "nonce": "1716630000000_123456",
    "difficulty": 4
  },
  "id": 1
}
```

#### 发送短信验证码

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/common \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "method":"verify.sendSmsCode",
    "params":{
      "token":"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      "nonce":"1716630000000_123456",
      "answer":42,
      "phone":"13800138000"
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
    "message": "验证码发送成功"
  },
  "id": 2
}
```

错误响应示例：

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "验证失败"
  },
  "id": 2
}
```
