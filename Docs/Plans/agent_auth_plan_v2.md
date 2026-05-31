# Agent 认证系统 v2 升级计划

## 1. 概述

本次升级将把 agent 认证系统迁移到新的 common scope 的 verify 接口，包括以下改动：

1. 废弃旧的 `sendEmailVerificationCode`、`sendSmsVerificationCode` 接口
2. 废弃旧的 `generateCaptchaOrdeal`、`verifyCaptcha` 接口
3. 更新 `loginOrRegisterByEmail`、`loginOrRegisterByPhone` 使用新的 roster key 规则和 `getAndDelete` 方法
4. 保留旧的 password `login` 接口（可后续废弃）

### 新的验证流程

用户发送验证码的流程：
```
1. 客户端调用 verify.generateToken 获取 token 和 nonce
2. 客户端完成算力验证，得到 answer
3. 客户端调用 verify.sendSmsCode 或 verify.sendEmailCode 发送验证码
4. 客户端输入验证码
5. 客户端调用 agent 的 loginOrRegisterByEmail 或 loginOrRegisterByPhone 完成登录/注册
```

***

## 2. 旧接口与新接口对比

### 废弃接口
| 旧接口 | 替代方案 |
|------|-------|
| `agent.generateCaptchaOrdeal` | `common.verify.generateToken` |
| `agent.verifyCaptcha` | 已集成到 `verify.sendSmsCode`/`verify.sendEmailCode` |
| `agent.sendEmailVerificationCode` | `common.verify.sendEmailCode` |
| `agent.sendSmsVerificationCode` | `common.verify.sendSmsCode` |

### 更新接口
| 接口 | 改动 |
|------|-----|
| `agent.loginOrRegisterByEmail` | 使用新的 roster key 规则 `verify.email.code.{md5(email)}`，使用 `getAndDelete` |
| `agent.loginOrRegisterByPhone` | 使用新的 roster key 规则 `verify.sms.code.{md5(phone)}`，使用 `getAndDelete` |
| `agent.login` | 保持不变 |

***

## 3. 实施步骤

### 3.1 更新 shared/users.ts

#### 改动：
1. 移除旧的验证码发送函数 `sendEmailVerificationCode`、`sendSmsVerificationCode`
2. 移除旧的验证码相关函数 `generateCaptchaOrdeal`、`verifyCaptcha`
3. 更新 `loginOrRegisterByEmail` 使用新的 key 规则和 `getAndDelete`
4. 更新 `loginOrRegisterByPhone` 使用新的 key 规则和 `getAndDelete`
5. 添加 md5 辅助函数（或者从 verify 模块引入）

### 3.2 更新 agent/methods/auth.ts

#### 改动：
1. 移除旧方法注册：
   - `generateCaptchaOrdeal`
   - `verifyCaptcha`
   - `sendEmailVerificationCode`
   - `sendSmsVerificationCode`
2. 保留 `login`、`loginOrRegisterByEmail`、`loginOrRegisterByPhone`

### 3.3 清理 roster.ts 中可能的重复代码

检查一下 verify 模块的 md5 函数是否可以复用，或者考虑提取到共享工具。

***

## 4. 具体修改文件清单

| 文件路径 | 操作类型 | 说明 |
|---------|--------|------|
| hongs-form-api/server/src/api/rpc/shared/users.ts | 编辑 | 更新认证相关逻辑，移除旧接口 |
| hongs-form-api/server/src/api/rpc/scopes/agent/methods/auth.ts | 编辑 | 移除旧方法注册 |
| hongs-form-api/server/src/utils/roster.ts | 编辑 | 确保 getAndDelete 可用（已实现） |

***

## 5. Roster Key 规则

### 新的 Key 格式（verify 模块已实现）
- Token 状态：`verify.token.{token}`
- 频率限制（短信）：`verify.sms.limit.{md5(phone)}`
- 短信验证码：`verify.sms.code.{md5(phone)}`
- 频率限制（邮箱）：`verify.sms.limit.{md5(email)}`
- 邮箱验证码：`verify.email.code.{md5(email)}`

### 旧的 Key 格式（废弃）
- `verify:email:{type}:{email}`
- `verify:phone:{type}:{phone}`

***

## 6. 注意事项

1. 向后兼容：考虑是否需要临时保留旧接口（可选，建议直接废弃）
2. 客户端需要更新：使用新的 common scope 接口发送验证码
3. 验证码验证仍然由 agent scope 处理：`loginOrRegisterByEmail`/`loginOrRegisterByPhone`
4. 使用 `getAndDelete` 确保验证码使用后立即删除，防止重复使用
