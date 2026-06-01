# Hongs API Server

基于 JSON-RPC 2.0 的表单 API 服务器，使用 MongoDB 存储。

## 技术栈

- Node.js 20+
- TypeScript
- MongoDB (with mongodb driver)
- JSON-RPC 2.0

## 项目结构

```
hongs-form-api/
└── server/
    ├── src/
    │   ├── server.ts              # 服务器入口
    │   ├── api/
    │   │   └── rpc/
    │   │       ├── index.ts       # RPC 处理器
    │   │       └── methods/
    │   │           ├── user.ts    # 用户相关方法
    │   │           ├── form.ts    # 表单相关方法
    │   │           └── formData.ts # 表单数据相关方法
    │   └── utils/
    │       ├── db.ts              # MongoDB 连接
    │       └── env.ts             # 环境变量加载
    ├── dist/                      # 编译输出
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── .gitignore
```

## 安装依赖

```bash
cd hongs-form-api/server
npm install
```

## 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hongs_form
NODE_ENV=development
```

## 开发模式

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 构建

```bash
npm run build
```

## 生产启动

```bash
npm start
```

## API 端点

### RPC 端点

```
POST http://localhost:3000/api/rpc
Content-Type: application/json
```

### 健康检查

```
GET http://localhost:3000/health
```

## RPC 方法列表

### 用户相关

| 方法名 | 说明 |
|--------|------|
| `user.list` | 用户列表 |
| `user.get` | 获取用户详情 |
| `user.create` | 创建用户 |
| `user.update` | 更新用户 |
| `user.delete` | 删除用户（软删） |
| `user.changePassword` | 修改密码 |
| `user.login` | 用户登录 |

### 表单相关

| 方法名 | 说明 |
|--------|------|
| `form.list` | 表单列表 |
| `form.get` | 获取表单详情（完整信息） |
| `form.schema` | 获取表单 Schema（用于前端渲染） |
| `form.create` | 创建表单 |
| `form.update` | 更新表单 |
| `form.publish` | 发布表单 |
| `form.unpublish` | 取消发布 |
| `form.delete` | 删除表单（软删） |

### 表单数据相关

| 方法名 | 说明 |
|--------|------|
| `formData.list` | 数据列表 |
| `formData.get` | 获取单条数据 |
| `formData.create` | 创建表单数据 |
| `formData.update` | 更新数据 |
| `formData.delete` | 删除数据（软删） |
| `formData.export` | 导出数据 |
| `formData.stats` | 数据统计 |

## 请求示例

### 创建用户

```json
{
  "jsonrpc": "2.0",
  "method": "user.create",
  "params": {
    "username": "admin",
    "password": "admin123",
    "roles": ["admin"],
    "nickname": "管理员"
  },
  "id": 1
}
```

### 创建表单

```json
{
  "jsonrpc": "2.0",
  "method": "form.create",
  "params": {
    "userId": "60d21b4667d0d8992e610c85",
    "name": "survey",
    "title": "用户调查",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "rating": { "type": "integer", "minimum": 1, "maximum": 5 }
      }
    }
  },
  "id": 2
}
```

### 创建表单数据

```json
{
  "jsonrpc": "2.0",
  "method": "formData.create",
  "params": {
    "formId": "60d21b4667d0d8992e610c86",
    "data": {
      "name": "张三",
      "rating": 5
    }
  },
  "id": 3
}
```

## 响应示例

### 成功响应

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": "60d21b4667d0d8992e610c87"
  },
  "id": 1
}
```

### 错误响应

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found"
  },
  "id": 1
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| -32700 | 解析错误 |
| -32600 | 请求无效 |
| -32601 | 方法未找到 |
| -32602 | 参数无效 |
| -32000 | 应用层错误 |
