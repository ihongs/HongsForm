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

```
POST /api/rpc
```

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

### MCP 工具

```json
{
  "name": "form.create",
  "description": "根据自然语言描述自动生成表单 Schema",
  "inputSchema": {
    "type": "object",
    "properties": {
      "schema": { "type": "object" },
      "name": { "type": "string" }
    }
  }
}
```

## 开发

```bash
# 构建核心库
cd hongs-form && npm run build

# 启动 API
cd ../hongs-form-api/server && npm run dev

# 启动表单前端
cd ../../hongs-form-web/form && npm run dev

# 测试核心库
cd ../../hongs-form && npm test
```

## 路线图

- [x] 核心验证库
- [ ] JSON-RPC 2.0 API 服务
- [ ] MongoDB 数据持久化
- [ ] MCP 服务器集成
- [ ] Web 管理后台
- [ ] AI 表单生成

## License

MIT
