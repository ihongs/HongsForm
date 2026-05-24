# HongsForm

基于 JSON Schema 的 AI 表单构建系统，支持 JSON-RPC 2.0 和 MCP 协议。

## 项目结构

```
HongsForm/
├── hongs-form/           # 核心表单验证库
├── hongs-form-api/
│   └── server/           # API 服务端 (JSON-RPC 2.0, MCP)
└── hongs-form-web/
    ├── admin/            # 管理后台
    ├── agent/            # 代理服务
    └── form/             # 表单填报
```

## 技术栈

- **核心库**: TypeScript
- **数据库**: MongoDB
- **API**: JSON-RPC 2.0, MCP

## hongs-form 核心库

基于 JSON Schema 模式的极简表单验证库。

### 安装

```bash
npm install hongs-form
```

### 快速开始

```typescript
import { validate, FormSchema } from 'hongs-form';

const schema: FormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', required: true, minLength: 2 },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    email: { type: 'string', pattern: '^.+@.+$' }
  }
};

try {
  const result = validate({ name: '张三', age: 25 }, schema, {});
  console.log('验证通过:', result);
} catch (err) {
  console.error('验证失败:', err.errors);
}
```

## API 服务 (JSON-RPC 2.0)

### 端点

- `POST /api/rpc/admin` 管理后台，管理全部表单和数据
- `POST /api/rpc/agent` 客户平台，管理自有表单和数据，以及构建表单
- `POST /api/rpc/form`  表单填报

### 示例请求

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "form.create",
  "params": {
    "schema": { "type": "object", "properties": {} },
    "name": "调查表"
  }
}
```

### 支持的方法

- `form.list` - 表单列表
- `form.get` - 获取表单
- `form.create` - 创建表单
- `form.update` - 更新表单
- `form.delete` - 删除表单

## AI 代理 (MCP)

通过 MCP 协议与 OpenClaw 等 AI 模型集成，实现智能表单生成。

### 端点

- `POST /api/mcp/agent` 发布表单，导出数据
- `POST /api/mcp/form`  填报表单

### 示例请求

```json
{
  "jsonrpc": "2.0",
  "id": "随便唯一ID",
  "method": "tools/call",
  "params": {
    "name": "form.create",
    "arguments": {
      "name": "我的表单",
      "title": "周末登山报名",
      "description": "勇攀高峰，相伴云端",
      "schema": {
        "properties": {
          "name": {
            "type": "string",
            "required": true
          }
        }
      }
    }
  }
}
```

## 构建网站

```bash
cd HongsForm
node make-site.js
```

本地构建好后，将 site 打包放到线上，执行以下命令完成环境搭建和启动。注意启动 mongodb，相关配置在 `site/.env`。

```
cd site
npm install --production
cp .evn.example .env
npm start
```

## License

MIT
