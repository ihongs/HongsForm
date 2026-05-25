# API 接口文档

## RPC

HongsForm API 使用 JSON-RPC 2.0，通过不同 endpoint 区分调用范围。endpoint 已经表达 scope，因此 agent/admin 内的方法名不再重复带 `agent.` / `admin.` 前缀。

### API endpoint 及 method 命名规范

- endpoint 命名：`/api/rpc/<scope>`
- method 命名：`[<entity|module>.]<method>`

何为 scope？scope 是 API 的区域划分，通常对应不同的前端。如 `/api/rpc/admin` 是管理后台相关的方法，`/api/rpc/agent` 是客户应用相关的方法。还有些公共的独立设置。

何为 entity/module？entity 是 API 的操作实体，如 `form`、`user` 等；module 是对一些共同归属方法的聚合。有些方法没有具体的 entity/module，还有些方法是顶级方法。

为何 `/api/rpc/form` 的方法有 `form.` 前缀？因为前一个 `form` 是 endpoint scope，后一个 `form` 是 entity。`/api/rpc/form` 也可能有不是操作 `form` 实体的其他方法，如 `login`：要求登录的表单。

### 基本信息

| Scope | Endpoint | 鉴权 | 用途 |
|------|----------|------|------|
| common | `/api/rpc/common` | 不强制鉴权 | 公共方法 |
| form | `/api/rpc/form` | 不强制鉴权 | 公开表单读取与提交 |
| agent | `/api/rpc/agent` | 除 `login` 外需要 agent 身份的 `Authorization` | 客户应用平台 |
| admin | `/api/rpc/admin` | 除 `login` 外需要 admin 身份的 `Authorization` | 系统管理后台 |

### JSON-RPC 格式

请求统一使用 `POST`，`Content-Type: application/json`。

```json
{
  "jsonrpc": "2.0",
  "method": "form.list",
  "params": {
    "page": 1,
    "pageSize": 20
  },
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
    "message": "Form not found",
    "data": {}
  },
  "id": 1
}
```

通知请求：如果 `id` 为 `null` 或未提供，方法执行成功后返回 `204 No Content`。

### 鉴权

需要鉴权的方法通过 HTTP header 传递凭据：

```http
Authorization: Bearer <credential>
```

`Bearer` 是 HTTP 传递方式，`<credential>` 当前支持两类：

1. Web 登录 token：由 `login` 返回，服务端通过签名和过期时间校验，不存放在 `userAuth`。
2. `userAuth.sk`：存放在 `userAuth` 集合中，供 AI skill、后续外部终端等调用。

agent endpoint 允许角色为 `agent` 的登录用户访问；admin endpoint 要求角色为 `admin`。

### 错误码

| code | 含义 |
|------|------|
| `-32700` | JSON 解析失败 |
| `-32600` | JSON-RPC 请求格式错误 |
| `-32601` | 当前 scope 下没有对应 method |
| `-32001` | 未认证或 Bearer 无效 |
| `-32003` | 已认证但权限不足 |
| `-32000` | 方法执行错误 |

### form scope

Endpoint：`POST /api/rpc/form`

#### `form.schema`

获取已发布表单的公开 schema。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 表单 ID |

返回：

```json
{
  "id": "...",
  "type": "form",
  "name": "contact",
  "title": "联系我们",
  "description": "...",
  "icon": null,
  "color": "#1890ff",
  "schema": {},
  "config": {
    "anonymous": true,
    "startAt": null,
    "endAt": null
  },
  "status": 2
}
```

#### `formData.create`

提交公开表单数据。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formId` | string | 是 | 表单 ID |
| `data` | object | 是 | 表单提交数据，会按表单 schema 校验 |
| `channel` | string | 否 | 提交渠道，默认 `web` |
| `userIp` | string | 否 | 提交者 IP |
| `userAgent` | string | 否 | 提交者 User-Agent |

返回：

```json
{
  "id": "..."
}
```

### agent scope

Endpoint：`POST /api/rpc/agent`

除 `login` 外都需要 Bearer。

#### `login`

agent 用户登录。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |

返回：

```json
{
  "token": "...",
  "user": {
    "_id": "...",
    "username": "agent",
    "role": "agent",
    "status": 1
  }
}
```

#### 表单方法

| Method | 说明 |
|--------|------|
| `form.list` | 查询当前用户创建的表单列表 |
| `form.get` | 获取当前用户拥有的单个表单 |
| `form.create` | 创建表单 |
| `form.update` | 更新当前用户拥有的表单 |
| `form.publish` | 发布当前用户拥有的表单 |
| `form.unpublish` | 取消发布当前用户拥有的表单 |
| `form.delete` | 软删除当前用户拥有的表单 |

##### `form.list`

参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `20` | 每页数量 |
| `keyword` | string | 否 | `""` | 按 `name/title/description` 模糊搜索 |
| `status` | number | 否 | - | 表单状态 |

返回：`{ items, total, page, pageSize }`。

##### `form.get`

参数：`{ "id": "..." }`

返回：表单完整文档。

##### `form.create`

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 表单名称 |
| `schema` | object | 是 | 表单 schema，会通过 `formValidate` 校验 |
| `title` | string | 否 | 表单标题，默认 `name` |
| `description` | string | 否 | 表单描述 |
| `config` | object | 否 | 表单配置 |
| `icon` | string | 否 | 图标 |
| `color` | string | 否 | 颜色，默认 `#1890ff` |

返回：`{ "id": "..." }`。

##### `form.update`

参数：`id` 必填，其余字段为要更新的表单字段。传入 `schema` 时会重新校验。

返回：`{ "success": true }`。

##### `form.publish` / `form.unpublish` / `form.delete`

参数：`{ "id": "..." }`

返回：`{ "success": true }`。

#### 表单数据方法

| Method | 说明 |
|--------|------|
| `formData.list` | 查询当前用户表单的提交数据 |
| `formData.get` | 获取当前用户表单下的单条提交数据 |
| `formData.update` | 更新提交数据的 `data` 或 `status` |
| `formData.delete` | 软删除提交数据，并减少表单提交计数 |
| `formData.export` | 导出提交数据列表 |
| `formData.stats` | 获取提交统计 |

##### `formData.list`

参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `20` | 每页数量 |
| `formId` | string | 否 | - | 表单 ID |
| `userId` | string | 否 | - | 提交用户 ID |
| `channel` | string | 否 | - | 渠道 |
| `startDate` | string | 否 | - | 创建时间起始 |
| `endDate` | string | 否 | - | 创建时间结束 |

返回：`{ items, total, page, pageSize }`。

##### `formData.get`

参数：`{ "id": "..." }`

返回：提交数据文档。

##### `formData.update`

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 提交数据 ID |
| `data` | object | 否 | 新数据 |
| `status` | number | 否 | 新状态 |

返回：`{ "success": true }`。

##### `formData.delete`

参数：`{ "id": "..." }`

返回：`{ "success": true }`。

##### `formData.export`

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formId` | string | 是 | 表单 ID |
| `startDate` | string | 否 | 创建时间起始 |
| `endDate` | string | 否 | 创建时间结束 |

返回：提交数据数组。

##### `formData.stats`

参数：`{ "formId": "..." }`

返回：

```json
{
  "total": 10,
  "today": 2,
  "byChannel": {
    "web": 10
  }
}
```

### admin scope

Endpoint：`POST /api/rpc/admin`

除 `login` 外都需要 admin Bearer。

#### `login`

admin 用户登录。参数和返回同 agent 的 `login`，但要求用户角色为 `admin`。

#### 用户方法

| Method | 说明 |
|--------|------|
| `user.list` | 用户列表 |
| `user.get` | 用户详情 |
| `user.create` | 创建用户 |
| `user.update` | 更新用户基础信息，不能直接改 `password/passsalt` |
| `user.changePassword` | 修改用户密码 |
| `user.delete` | 软删除用户 |

##### `user.list`

参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `20` | 每页数量 |
| `keyword` | string | 否 | `""` | 按 `username/nickname/email` 模糊搜索 |

返回：`{ items, total, page, pageSize }`，不包含 `password/passsalt`。

##### `user.get`

参数：`{ "id": "..." }`

返回：用户文档，不包含 `password/passsalt`。

##### `user.create`

参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `username` | string | 是 | - | 用户名 |
| `password` | string | 是 | - | 密码 |
| `role` | string | 否 | `agent` | `agent` 或 `admin` |
| `nickname` | string | 否 | username | 昵称 |
| `email` | string | 否 | null | 邮箱 |
| `phone` | string | 否 | null | 手机 |

返回：`{ "id": "..." }`。

##### `user.update`

参数：`id` 必填，其余字段为要更新的用户字段。`password/passsalt` 会被忽略。

返回：`{ "success": true }`。

##### `user.changePassword`

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 用户 ID |
| `oldPassword` | string | 是 | 旧密码 |
| `newPassword` | string | 是 | 新密码 |

返回：`{ "success": true }`。

##### `user.delete`

参数：`{ "id": "..." }`

返回：`{ "success": true }`。

#### admin 表单方法

admin 的 `form.*` 方法和 agent 同名，但不限制表单归属。

| Method | 说明 |
|--------|------|
| `form.list` | 查询全部表单，可按 `userId/status/keyword` 过滤 |
| `form.get` | 获取任意表单 |
| `form.create` | 为指定 `userId` 创建表单 |
| `form.update` | 更新任意表单 |
| `form.publish` | 发布任意表单 |
| `form.unpublish` | 取消发布任意表单 |
| `form.delete` | 软删除任意表单 |

差异参数：

- `form.list` 支持 `userId`。
- `form.create` 要求 `userId`。
- `form.update` 允许更新 `userId`，传入时会转换为 ObjectId。

#### admin 表单数据方法

admin 的 `formData.*` 方法和 agent 同名，但不限制表单归属。

| Method | 说明 |
|--------|------|
| `formData.list` | 查询全部提交数据，可按 `formId/userId/channel/startDate/endDate` 过滤 |
| `formData.get` | 获取任意提交数据 |
| `formData.update` | 更新任意提交数据的 `data` 或 `status` |
| `formData.delete` | 软删除任意提交数据，并减少表单提交计数 |
| `formData.export` | 导出提交数据 |
| `formData.stats` | 获取提交统计 |

#### 测试数据方法

| Method | 说明 |
|--------|------|
| `test.importForms` | 为指定用户导入内置测试表单 |
| `test.getForms` | 获取内置测试表单列表 |

##### `test.importForms`

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 目标用户 ID |

返回：

```json
[
  {
    "name": "user_survey",
    "status": "created",
    "id": "..."
  }
]
```

已有同名表单时，`status` 为 `skipped`。

##### `test.getForms`

参数：无。

返回：

```json
[
  {
    "name": "user_survey",
    "title": "用户满意度调查问卷",
    "description": "...",
    "fieldCount": 6
  }
]
```

### 示例

#### agent 登录

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/agent \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"login","params":{"username":"agent","password":"agent123"},"id":1}'
```

#### agent 查询表单

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/agent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"jsonrpc":"2.0","method":"form.list","params":{"page":1,"pageSize":20},"id":2}'
```

#### public 获取表单 schema

```bash
curl -X POST http://127.0.0.1:3000/api/rpc/form \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"form.schema","params":{"id":"<formId>"},"id":3}'
```
