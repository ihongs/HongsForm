# MongoDB 数据库设计文档

## 数据库名称

`hongs_form`

## 集合列表

1. [users](#user-用户集合) - 用户集合
2. [userApiKeys](#userApiKeys-用户认证集合) - 用户认证凭证集合
3. [forms](#form-表单集合) - 表单定义集合
4. [formRecords](#formRecords-表单数据集合) - 表单提交数据集合
5. [records](#roster-键值存储集合) - 临时键值存储集合

---

## user (用户集合)

存储系统用户信息。

### 字段说明

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动生成 | 用户唯一标识 | 主键 |
| `username` | String | 是 | null | 用户名，唯一 | 唯一索引 |
| `password` | String | 是 | null | 密码哈希 | - |
| `passsalt` | String | 否 | null | 密码加盐 | - |
| `nickname` | String | 否 | username | 昵称 | - |
| `avatar` | String | 否 | null | 头像 URL | - |
| `email` | String | 否 | null | 邮箱 | 普通索引 |
| `phone` | String | 否 | null | 手机 | 普通索引 |
| `roles` | Array&lt;String&gt; | 是 | `['agent']` | 角色数组：`['admin']`/`['agent']`/`['admin','agent']` | 普通索引 |
| `status` | Number | 是 | `1` | 状态：`1` 启用，`0` 禁用 | 普通索引 |
| `lastLoginIp` | String | 否 | null | 最后登录 IP | - |
| `lastLoginAt` | Date | 否 | null | 最后登录时间 | - |
| `createdAt` | Date | 是 | `new Date()` | 创建时间 | - |
| `updatedAt` | Date | 是 | `new Date()` | 更新时间 | - |
| `deletedAt` | Date | 否 | null | 删除时间（软删除） | - |

### 索引配置

```javascript
// 用户名唯一索引
db.user.createIndex({ username: 1 }, { unique: true });

// 邮箱、收集索引
db.user.createIndex({ email: 1 });
db.user.createIndex({ phone: 1 });

// 角色索引
db.user.createIndex({ roles: 1 });

// 状态索引
db.user.createIndex({ status: -1 });

// 创建时间索引（排序用）
db.user.createIndex({ createdAt: -1 });

// 删除时间索引 (软删除)
db.user.createIndex({ deletedAt: 1 });
```

### 示例数据

```javascript
{
  "_id": ObjectId("60d21b4667d0d8992e610c85"),
  "username": "admin",
  "email": "admin@example.com",
  "phone": "13800138000",
  "password": "$2b$10$...",
  "passsalt": "abc123",
  "nickname": "管理员",
  "avatar": "/avatar.png",
  "roles": ["admin"],
  "status": 1,
  "lastLoginIp": "192.168.1.1",
  "lastLoginAt": ISODate("2024-01-15T10:30:00Z"),
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z"),
  "deletedAt": null
}
```

---

## userApiKeys (用户应用凭证集合)

存储用户应用凭证，包括 API Key 等。

### 字段说明

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动生成 | 凭证唯一标识 | 主键 |
| `userId` | ObjectId | 是 | - | 所属用户 ID | 普通索引 |
| `type` | String | 是 | - | 凭证类型：`apiKey` | - |
| `name` | String | 否 | null | 凭证名称 | - |
| `sk` | String | 是 | - | 密钥（API Key 值） | - |
| `expiresAt` | Date | 否 | null | 过期时间（null 表示永不过期） | - |
| `createdAt` | Date | 是 | `new Date()` | 创建时间 | - |
| `updatedAt` | Date | 是 | `new Date()` | 更新时间 | - |
| `deletedAt` | Date | 否 | null | 删除时间（软删除） | - |

### 索引配置

```javascript
// 用户 ID + 类型索引（查询用户凭证）
db.userAuth.createIndex({ userId: 1, type: 1 });

// 删除时间索引 (软删除)
db.userAuth.createIndex({ deletedAt: 1 });

// 创建时间索引（排序用）
db.userAuth.createIndex({ createdAt: -1 });
```

### 示例数据

```javascript
{
  "_id": ObjectId("60d21b4667d0d8992e610c89"),
  "userId": ObjectId("60d21b4667d0d8992e610c85"),
  "type": "apiKey",
  "name": "MCP 服务密钥",
  "sk": "abc123def456...",
  "expiresAt": null,
  "createdAt": ISODate("2026-05-24T10:00:00Z"),
  "updatedAt": ISODate("2026-05-24T10:00:00Z"),
  "deletedAt": null
}
```

---

## form (表单集合)

存储表单定义，包括 Schema 结构和配置。

### 字段说明

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动生成 | 表单唯一标识 | 主键 |
| `userId` | ObjectId | 是 | - | 创建者用户 ID | 普通索引 |
| `name` | String | 是 | - | 表单名称 | - |
| `type` | String | 是 | - | 表单类型：`form` 表单，`vote` 投票 | - |
| `title` | String | 否 | name | 表单标题 | - |
| `description` | String | 否 | null | 表单描述 | - |
| `config` | Object | 否 | `{}` | 表单配置 | - |
| `config.oncePerPhone` | Boolean | 否 | `false` | 每个手机限填一次 | - |
| `config.oncePerEmail` | Boolean | 否 | `false` | 每个邮箱限填一次 | - |
| `config.oncePerGuest` | Boolean | 否 | `false` | 每个访客限填一次，通过 cookie/localStorage 等标识访客 | - |
| `config.showAfterSubmit` | Boolean | 否 | `false` | 提交后显示结果，仅对投票表单有效 | - |
| `config.maxSubmissions` | Number | 否 | null | 最大提交数限制 | - |
| `config.startAt` | Date | 否 | null | 提交开始时间 | - |
| `config.endAt` | Date | 否 | null | 提交结束时间 | - |
| `fields` | Array | 是 | - | 表单字段配置（JSONSchema[]） | - |
| `script` | String | 否 | null | 自定义脚本（如联动逻辑） | - |
| `status` | Number | 是 | `1` | 状态：`1` 草稿，`2` 发布，`0` 禁用 | 普通索引 |
| `publishedAt` | Date | 否 | null | 发布时间 | - |
| `createdAt` | Date | 是 | `new Date()` | 创建时间 | - |
| `updatedAt` | Date | 是 | `new Date()` | 更新时间 | - |
| `deletedAt` | Date | 否 | null | 删除时间（软删除） | - |

### schema 字段结构

遵循 JSON Schema 规范 (hongs-form/src/types.ts FormSchema)，扩展了表单特定属性：

```javascript
{
  "type": "object",
  "title": "表单标题",
  "description": "表单描述",
  "required": ["field1", "field2"],
  "fields": [
    {
      "name": "fieldName",
      "type": "string" | "number" | "integer" | "boolean" | "array" | "object",
      "inputType": "text" | "textarea" | "select" | "radio" | "check" | "date" | "file" | ...,
      "title": "字段标题",
      "description": "字段说明",
      "label": "表单标签",
      "placeholder": "占位提示",
      "default": "默认值",
      "enum": ["选项1", "选项2"],
      "labels": { "value1": "标签1", "value2": "标签2" },
      // 字符串验证
      "minLength": 2,
      "maxLength": 100,
      "pattern": "^[a-z]+$",
      // 数字验证
      "minimum": 0,
      "maximum": 100,
      // 数组验证
      "minItems": 1,
      "maxItems": 10,
      "uniqueItems": true,
      "items": { /* 子元素 Schema */ },
      // 对象验证
      "properties": { /* 子属性 Schema */ },
      "additionalProperties": true,
      // UI 配置
      "findable": true,
      "sortable": true
    }
  ]
}
```

### 索引配置

```javascript
// 用户 ID 索引
db.form.createIndex({ userId: 1 });

// 状态索引
db.form.createIndex({ status: 1 });

// 发布时间索引（排序用）
db.form.createIndex({ publishedAt: -1 });

// 创建时间索引（排序用）
db.form.createIndex({ createdAt: -1 });

// 删除时间索引 (软删除)
db.form.createIndex({ deletedAt: 1 });

// 表单名称全文索引
db.form.createIndex({ name: "text", title: "text", description: "text" });
```

### 示例数据

```javascript
{
  "_id": ObjectId("60d21b4667d0d8992e610c86"),
  "userId": ObjectId("60d21b4667d0d8992e610c85"),
  "name": "user_survey",
  "title": "用户满意度调查",
  "description": "收集用户对产品的反馈",
  "config": {
    "anonymous": true,
    "oncePerUser": false,
    "maxSubmissions": null,
    "startAt": null,
    "endAt": null
  },
  "fields": [
    {
      "name": "rating",
      "type": "integer",
      "title": "满意度评分",
      "inputType": "rating",
      "minimum": 1,
      "maximum": 5
    },
    {
      "name": "feedback",
      "type": "string",
      "title": "反馈意见",
      "inputType": "textarea",
      "maxLength": 1000
    },
    {
      "name": "recommend",
      "type": "boolean",
      "title": "是否推荐给朋友",
      "default": false
    }
  ],
  "status": 2,
  "publishedAt": ISODate("2024-01-10T08:00:00Z"),
  "createdAt": ISODate("2024-01-05T00:00:00Z"),
  "updatedAt": ISODate("2024-01-10T08:00:00Z"),
  "deletedAt": null
}
```

---

## formRecords (表单记录集合)

存储用户提交的表单记录数据。

### 字段说明

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动生成 | 数据唯一标识 | 主键 |
| `formId` | ObjectId | 是 | - | 所属表单 ID | 普通索引 |
| `userId` | ObjectId | 否 | null | 提交者用户 ID（匿名提交为 null） | 普通索引 |
| `data` | Object | 是 | - | 提交的表单数据 | - |
| `dataHash` | String | 是 | - | 数据内容哈希，用于去重校验 | 唯一索引 |
| `phone` | String | 否 | null | 提交者手机，从 data.phone 提取 | - |
| `email` | String | 否 | null | 提交者邮箱，从 data.email 提取 | - |
| `userIp` | String | 否 | null | 提交者 IP 地址 | - |
| `userAgent` | String | 否 | null | 提交者 UserAgent | - |
| `userToken` | String | 否 | null | 提交者的 cookie/localStorage 等访客标识 | - |
| `channel` | String | 否 | `web` | 提交渠道：`web`/`ai`/`import` | - |
| `status` | Number | 是 | `1` | 状态：`1` 正常，`0` 作废 | 普通索引 |
| `createdAt` | Date | 是 | `new Date()` | 提交时间 | - |
| `updatedAt` | Date | 是 | `new Date()` | 更新时间 | - |
| `deletedAt` | Date | 否 | null | 删除时间（软删除） | - |

### 索引配置

```javascript
// 表单 ID 索引
db.formData.createIndex({ formId: 1 });

// 表单 + 用户索引（用于每用户限填一次校验）
db.formData.createIndex({ formId: 1, userId: 1 }, { sparse: true });

// 表单 + 访客Token索引（用于每访客限填一次校验）
db.formData.createIndex({ formId: 1, userToken: 1 }, { sparse: true });

// 数据哈希唯一索引（防重复提交）
db.formData.createIndex({ dataHash: 1 }, { unique: true });

// 状态索引
db.formData.createIndex({ status: 1 });

// 删除时间索引 (软删除)
db.formData.createIndex({ deletedAt: 1 });

// 提交时间索引（排序和时间范围查询）
db.formData.createIndex({ createdAt: -1 });

// 表单 + 提交时间复合索引
db.formData.createIndex({ formId: 1, createdAt: -1 });

// 渠道索引
db.formData.createIndex({ channel: 1 });
```

### 示例数据

```javascript
{
  "_id": ObjectId("60d21b4667d0d8992e610c87"),
  "formId": ObjectId("60d21b4667d0d8992e610c86"),
  "userId": null,
  "data": {
    "rating": 5,
    "feedback": "产品非常好用，期待更多功能！",
    "recommend": true
  },
  "dataHash": "sha256:abc123def456...",
  "userIp": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "channel": "web",
  "status": 1,
  "createdAt": ISODate("2024-01-15T12:30:00Z"),
  "updatedAt": ISODate("2024-01-15T12:30:00Z"),
  "deletedAt": null
}
```

---

## 设计说明

### 软删除策略

所有集合都使用 `deletedAt` 字段实现软删除：
- `null` 表示未删除
- 有时间值表示已删除

查询时默认过滤 `deletedAt: null`。

### 时间戳规范

- `createdAt` - 记录创建时间，创建后不变
- `updatedAt` - 记录最后更新时间，每次更新时刷新
- 所有时间使用 UTC 时区（ISODate）

### 数据一致性

2. `dataHash` 用于防止重复提交，生成规则：`sha256(formId + userId + JSON.stringify(data))`

### 性能优化建议

1. 大表单数据可考虑对 `data` 字段进行压缩存储
2. 高频查询的统计数据可单独建立统计表
3. 超过一定时间的历史数据可考虑归档到冷存储
4. 考虑为 `data` 字段内常用查询属性建立单字段索引

---

## records (键值存储集合)

临时键值存储集合，用于存储验证码等临时数据。

### 字段说明

| 字段名 | 类型 | 必填 | 默认值 | 说明 | 索引 |
|--------|------|------|--------|------|------|
| `_id` | ObjectId | 是 | 自动生成 | 唯一标识 | 主键 |
| `key` | String | 是 | - | 键，唯一索引 | 唯一索引 |
| `value` | Any | 否 | null | 值 | - |
| `expiresAt` | Date | 是 | - | 过期时间 | 索引 |
| `createdAt` | Date | 是 | new Date() | 创建时间 | - |
| `updatedAt` | Date | 是 | new Date() | 更新时间 | - |

### 索引配置

```javascript
db.roster.createIndex({ key: 1 }, { unique: true });
db.roster.createIndex({ expiresAt: 1 });
```

### 示例数据

```javascript
{
  "_id": ObjectId("60d21b4667d0d8992e610c88"),
  "key": "verify:email:user@example.com",
  "value": { "code": "123456", "type": "login" },
  "expiresAt": ISODate("2024-01-15T15:00:00Z"),
  "createdAt": ISODate("2024-01-15T14:30:00Z"),
  "updatedAt": ISODate("2024-01-15T14:30:00Z")
}
```

### 清理策略

定期清理已过期的记录，默认清理一周前过期的数据。
