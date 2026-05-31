# 通用文件/图片上传服务开发计划

## 一、项目定位

**全站通用上传服务** - 面向整个平台的文件上传基础设施
- 表单填报附件（无需登录）
- 用户头像
- 管理后台资源
- 其他需要文件上传的场景

## 二、核心原则

- 全站通用（不限 form）
- 无需登录即可上传（表单填报场景）
- 同一 Token 与文件强绑定，一次性使用
- 频率限制 + 配额限制

## 三、架构设计

### 3.1 云存储接口抽象层

```
front-end (FormInput/FormRenderer/AnyComponent)
    ↓ 上传请求
upload.upload(file) → 返回 URL
    ↓
┌─────────────────────────────────────┐
│   UploadDriver (接口)                │
├─────────────────────────────────────┤
│ - LocalUploadDriver (开发环境)      │  ← 直接写入 form-api/public/upload/
│ - S3UploadDriver (AWS S3)           │  ← 线上环境
│ - OSSUploadDriver (阿里云OSS)       │  ← 线上环境
│ - QiniuUploadDriver (七牛云)        │  ← 线上环境
└─────────────────────────────────────┘
```

### 3.2 前端上传流程

```
用户选择文件
    ↓
前端计算文件 Hash (SHA256) + 文件大小
    ↓
前端请求 upload.getConfig，携带 fileHash + fileSize
    ↓
后端检查:
  - IP Rate Limit
  - 用户配额（可选，已登录用户）
  - 文件 Hash 去重（已存在直接返回 URL）
  - 生成与文件强绑定的 Token
    ↓
前端使用 Token 直接上传到云存储/本地端点
    ↓
上传完成后，Token 被标记为已使用
    ↓
业务提交时携带文件 URL
```

### 3.3 开发阶段无缝切换

通过环境变量配置上传驱动，前端不感知具体存储类型：

```bash
# .env
UPLOAD_TYPE=local  # 开发环境
# UPLOAD_TYPE=s3
# UPLOAD_BUCKET=...
# UPLOAD_REGION=...
# UPLOAD_ACCESS_KEY=...
# UPLOAD_SECRET_KEY=...
```

## 四、目录结构

```
form-api/src/
├── utils/
│   └── upload/
│       ├── index.ts          # 导出统一的 upload 实例
│       ├── types.ts          # UploadDriver 接口定义
│       ├── drivers/
│       │   ├── local.ts      # 本地上传驱动
│       │   ├── s3.ts         # AWS S3 驱动
│       │   └── oss.ts        # 阿里云 OSS 驱动
│       └── utils.ts          # 通用工具函数

form-api/src/api/rpc/scopes/common/
└── methods/
    ├── upload.ts             # upload.getConfig 接口
    └── index.ts             # 注册上传接口
```

## 五、接口设计

> **接口分类说明**
> - `upload.getConfig` - RPC common 方法，调用 `/api/rpc/common`
> - `/api/upload` - 直接 REST 端点（本地模式），既非 RPC 也非 MCP，用于实际文件上传

### 5.1 获取上传配置（RPC common）

**请求**
```
POST /api/rpc/common
{
  "jsonrpc": "2.0",
  "method": "upload.getConfig",
  "params": {
    "fileHash": "sha256:abc123...",     // 文件 SHA256 Hash
    "fileSize": 123456,                   // 文件大小（字节）
    "fileName": "image.jpg",              // 原始文件名
    "type": "image",                       // image | file
    "scene": "form"                       // form | avatar | common
  },
  "id": 1
}
```

**响应 - 本地上传模式**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "local",
    "uploadUrl": "http://localhost:3000/api/upload",
    "token": "uuid-token",
    "dir": "upload/"
  }
}
```

**响应 - 云存储模式（如 S3）**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "s3",
    "token": "uuid-token",
    "bucket": "my-bucket",
    "region": "ap-east-1",
    "accessKeyId": "xxx",
    "host": "https://my-bucket.s3.ap-east-1.amazonaws.com",
    "dir": "uploads/",
    "policy": "eyJleHBpcmF0aW9uIjoi...",
    "signature": "abc123..."
  }
}
```

**错误响应 - 需要重试（如 Rate Limit）**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Rate limit exceeded",
    "data": { "retryAfter": 60 }
  }
}
```

**错误响应 - 配额用完**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32002,
    "message": "Upload quota exceeded",
    "data": { "quotaType": "ip", "resetAt": "2025-05-31T12:00:00Z" }
  }
}
```

### 5.2 本地模式实际上传（REST）

**请求**
```
POST /api/upload
Content-Type: multipart/form-data
file: <binary>
X-Upload-Token: uuid-token
```

**成功响应**
```json
{
  "url": "/upload/2025/05/31/abc123.jpg"
}
```

**失败响应 - Token 无效或已使用**
```json
{
  "error": "Invalid or used token"
}
```

### 5.3 云存储模式实际上传（直接 PUT）

```
PUT https://my-bucket.s3.region.amazonaws.com/upload/2025/05/31/abc123.jpg
Content-Type: image/jpeg
X-Amz-Signature: xxx
X-Amz-Date: xxx
<binary>
```

**成功响应**: HTTP 200（云存储返回）

### 5.4 查询已存在文件（Hash 去重）

当请求 getConfig 时，如果文件 Hash 已存在，可直接返回已有 URL，跳过实际上传。

## 六、安全防护

### 6.1 Token 机制

```typescript
interface UploadToken {
  token: string
  fileHash: string           // 与文件 Hash 强绑定
  fileSize: number           // 与文件大小强绑定
  fileName: string           // 原始文件名（仅用于记录）
  type: 'image' | 'file'     // 文件类型
  scene: string              // 业务场景：form | avatar | common
  used: boolean              // 一次性使用
  expiresAt: number          // 5分钟过期
  createdAt: number
}
```

### 6.2 数据分类

**scene 业务场景**
| scene | 说明 | 配额限制 | 存储路径 |
|-------|------|----------|----------|
| `form` | 表单附件 | 独立配额 | `upload/form/{date}/{uuid}.{ext}` |
| `avatar` | 用户头像 | 独立配额 | `upload/avatar/{date}/{uuid}.{ext}` |
| `common` | 通用附件 | 独立配额 | `upload/common/{date}/{uuid}.{ext}` |

**请求参数增加 scene**
```typescript
// upload.getConfig 请求
{
  "fileHash": "sha256:abc123...",
  "fileSize": 123456,
  "fileName": "image.jpg",
  "type": "image",
  "scene": "form"      // 新增：业务场景
}
```

**存储路径**
```
upload/{scene}/{YYYY/MM/DD}/{uuid}.{ext}
```

### 6.3 频率限制

使用 `roster` 工具存储计次记录，按对象批量存储，便于一次性清理：

**存储键格式**
| 键格式 | 值示例 | 过期时间 | 说明 |
|--------|--------|----------|------|
| `upload:rip:{ip}` | `{form:{c_h:3,c_m:1,u_h:10},avatar:{c_h:1,...},common:{...}}` | 1小时 | IP 频率计数 |
| `upload:ru:{userId}` | `{form:{c_h:20,c_m:5,u_h:50},...}` | 1小时 | 用户频率计数 |

**数据结构**
```typescript
interface RateLimitRecord {
  // key: scene
  [scene: string]: {
    c_h: number                    // 获取配置次数（小时窗口）
    c_m: number                    // 获取配置次数（分钟窗口）
    u_h: number                    // 上传次数（小时窗口）
    updatedAt: number               // 最后更新时间
  }
}
// 过期后整个对象删除，无需逐 key 清理
```

### 6.4 上传配额

使用 `roster` 工具存储配额记录，按 scene 分开存储：

**存储键格式**
| 键格式 | 值示例 | 过期时间 | 说明 |
|--------|--------|----------|------|
| `upload:qip:{ip}:{scene}` | `5242880` | 24小时 | IP 配额（字节） |
| `upload:quser:{userId}:{scene}` | `10485760` | 24小时 | 用户配额（字节） |

**说明**
- 每个 scene 独立键值，过期独立清理
- roster 自动处理过期，无需手动清理

**scene 独立配额示例**
| scene | 单文件限制 | 用户配额 | IP 配额 |
|-------|------------|----------|---------|
| `form` | 20MB | 200MB | 100MB |
| `avatar` | 5MB | 10MB | 20MB |
| `common` | 20MB | 100MB | 50MB |

**清理时查询**
```
# 查询过期配额记录
db.records.find({ key: { $regex: '^upload:qip:' }, expiresAt: { $lt: new Date() } })

# 清理孤立的临时文件
db.records.find({ key: { $regex: '^upload:p:' }, expiresAt: { $lt: new Date() } })
```

### 6.5 文件验证

**扩展名白名单**
```typescript
const ALLOWED_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  file: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar']
}
```

**MIME 类型白名单**
```typescript
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  file: ['application/pdf', 'application/msword', ...]
}
```

**Magic Number 验证**（文件头标识，防止伪造）
```typescript
const MAGIC_NUMBERS = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
}
```

### 6.6 文件名安全处理

```typescript
// 原始文件名不信任，生成随机文件名
function generateFileName(ext: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/')  // 2025/05/31/
  const uuid = crypto.randomUUID()
  return `${date}${uuid}.${ext}`
}
```

### 6.7 路径隔离

```typescript
// 目录结构: upload/{scene}/{YYYY/MM/DD}/{uuid}.{ext}
// scene: form | avatar | common
// 不暴露用户信息在路径中
// 云存储 Policy 限制上传路径
```

## 七、UploadDriver 接口

```typescript
interface UploadDriver {
  getType(): string

  // 获取上传配置（供前端使用）
  getUploadConfig(token: UploadToken): Promise<UploadConfig>

  // 验证文件（可在此检查文件类型、大小等）
  validateFile(file: File | Buffer, type: 'image' | 'file'): ValidationResult

  // 实际保存文件（仅 LocalUploadDriver 需要）
  saveFile(token: UploadToken, data: Buffer): Promise<string>

  // 删除文件（清理时使用）
  deleteFile(url: string): Promise<void>
}

interface ValidationResult {
  valid: boolean
  error?: string
  allowedMimeTypes?: string[]
  maxSize?: number
}

interface UploadConfig {
  type: string                    // 'local' | 's3' | 'oss'
  uploadUrl?: string               // 本地模式：上传地址
  host: string                    // 云存储模式：host
  dir: string                     // 上传目录
  token: string                   // 一次性 Token
  extraData?: Record<string, string>  // 额外字段（policy, signature 等）
}

// 上传 Token 存储（使用 roster）
// 键格式: upload:t:{token}
// 值: UploadToken（含 scene 字段）
// 过期时间: 5 分钟

// 文件 Hash 去重（使用 roster）
// 键格式: upload:h:{fileHash}
// 值: { url: string, scene: string, createdAt: Date }
// 过期时间: 30 天
// 注意：不同 scene 的相同文件 Hash 会分别记录
```

## 八、关键文件修改

| 文件 | 修改内容 |
|------|----------|
| `utils/upload/types.ts` | 定义 UploadDriver 接口、UploadToken |
| `utils/upload/drivers/local.ts` | 实现本地上传 |
| `utils/upload/drivers/s3.ts` | 实现 S3 上传 |
| `utils/upload/drivers/oss.ts` | 实现阿里云 OSS 上传 |
| `utils/upload/index.ts` | 统一导出，根据配置选择驱动 |
| `api/rpc/scopes/common/methods/upload.ts` | 新增 upload.getConfig 接口 |
| `api/rpc/scopes/common/index.ts` | 注册上传接口 |
| `server.ts` | 添加 /api/upload 路由 |
| `FormInput.vue` | 移除 file/image 特殊处理 |

## 九、开发顺序

1. **定义接口和类型** - `upload/types.ts`, `UploadDriver` 接口, `UploadToken` 类型
2. **实现 LocalUploadDriver** - 开发阶段使用
3. **实现 upload.getConfig 接口** - RPC common 接口
4. **添加 /api/upload 路由** - API server
5. **创建 FormFile/FormImage 组件** - 替换 FormInput 中的 file 处理，调用 `rpc/common` 的 `upload.getConfig`
6. **实现 S3UploadDriver** - 线上环境 AWS S3
7. **实现 OSSUploadDriver** - 线上环境阿里云 OSS
8. **添加 Rate Limit** - IP/用户频率限制
9. **添加配额管理** - 上传配额系统
10. **更新 form.md prompt** - 文档更新

## 十、环境变量配置

```bash
# 开发环境 (.env)
UPLOAD_TYPE=local

# 线上环境 AWS S3 (.env)
UPLOAD_TYPE=s3
UPLOAD_BUCKET=my-bucket
UPLOAD_REGION=ap-east-1
UPLOAD_ACCESS_KEY=AKIA...
UPLOAD_SECRET_KEY=xxx

# 或阿里云 OSS (.env)
UPLOAD_TYPE=oss
UPLOAD_BUCKET=my-bucket
UPLOAD_REGION=oss-cn-hangzhou
UPLOAD_ACCESS_KEY=xxx
UPLOAD_SECRET_KEY=xxx
UPLOAD_ENDPOINT=https://xxx.oss-cn-hangzhou.aliyuncs.com
```

## 十一、其他考虑

### 11.1 清理机制

使用 `roster.cleanup()` 清理过期记录：

```typescript
// 定期执行清理（建议每天）
await roster.cleanup()  // 清理 7 天前记录

// 或手动指定清理时间
await roster.cleanup(new Date(Date.now() - 24 * 60 * 60 * 1000))  // 清理 24 小时前
```

- Token 过期自动失效（roster.set 时设置 expires）
- 孤立文件通过定时任务清理
- 清理后同步删除实际文件

### 11.2 配额重置

配额记录通过 roster 的过期时间自动重置：

- IP 配额：过期时间 24 小时
- 用户配额：过期时间 24 小时
- 到期后 roster 自动清理，下次从 0 开始计数

### 11.3 监控告警

- 上传失败率异常
- 单 IP 流量异常
- 上传使用量告警

### 11.4 未来扩展

- 支持更多上传驱动（腾讯云 COS、七牛云）
- 支持更多文件类型（视频、音频）
- 支持图片压缩/裁剪
- 支持断点续传
- 支持秒传（基于文件 Hash）
