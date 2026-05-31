# API/MCP 接口开发计划

## 一、需求概述

基于现有的 `api/rpc`（JSON-RPC 2.0）架构，开发一套兼容 MCP（Model Context Protocol）协议的接口，供 AI 代理调用。

## 二、路由设计

### 2.1 Endpoint 规范

根据 MCP Streamable HTTP 协议规范（2025-11-25）：

- **单一端点**：每个 scope 提供一个 HTTP endpoint，GET 和 POST 使用**同一个 URI**
- **POST**：客户端发送 JSON-RPC 请求，服务器返回 JSON 响应或 SSE 流
- **GET**：用于 SSE 流（服务器向客户端推送通知），返回 `Content-Type: text/event-stream`
- **协议版本头**：客户端必须在所有请求中包含 `MCP-Protocol-Version: 2025-11-25` 头

| Endpoint | Scope | 支持方法 | 说明 |
|----------|-------|---------|------|
| `/api/mcp/agent` | agent | `POST`, `GET` | agent 用户操作，需认证（`form.prompt` 除外） |
| `/api/mcp/form` | form | `POST`, `GET` | 公开表单操作，无需认证 |

**注意**：GET 和 POST 访问同一个 URI，不是分离的 `/sse` 或 `/message` 端点。

### 2.2 请求格式

**POST 请求示例**：

```http
POST /api/mcp/agent HTTP/1.1
Content-Type: application/json
Authorization: Bearer <sk>

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "form.list",
    "arguments": { "page": 1, "pageSize": 20 }
  },
  "id": 1
}
```

**响应格式**（JSON 模式）：

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      { "type": "text", "text": "{\"items\":[...],\"total\":100}" }
    ]
  },
  "id": 1
}
```

### 2.3 方法命名规则

- URI: `/api/mcp/{scope}`
- 方法格式: `entity.action`
- scope 只是命名空间，方法名中是否带实体前缀取决于操作的是什么实体

## 三、目标目录结构

```
api/mcp/
├── scopes/
│   ├── agent/              # agent scope（本次实现）
│   │   ├── index.ts        # McpServer 实例与 transport 配置
│   │   ├── auth.ts         # 认证中间件
│   │   └── tools/
│   │       ├── forms.ts    # form.list/get/create/update
│   │       ├── formData.ts # formData.list/get
│   │       └── prompt.ts   # form.prompt
│   └── form/               # form scope（后续实现）
│       ├── index.ts
│       └── tools/
└── index.ts                # 统一导出
```

## 四、MCP 方法设计

### 4.1 agent scope（本次实现）

Endpoint: `POST /api/mcp/agent`

agent 只是 scope 名，不是实体，方法不带 `agent.` 前缀。

**注意**：MCP 供 AI 调用，不提供 `login` 方法。AI 使用已有的认证凭据（`userAuth.sk`）通过 `Authorization: Bearer <sk>` 访问。服务端仅验证 `userAuth` 集合中的 `sk`，不支持 JWT token。

| Method | 说明 | 认证 |
|--------|------|------|
| `form.list` | 列举当前用户的表单 | 是 |
| `form.get` | 获取指定 ID 的表单详情 | 是 |
| `form.create` | 创建新表单 | 是 |
| `form.update` | 修改表单 | 是 |
| `formData.list` | 列举当前用户的表单数据 | 是 |
| `formData.get` | 获取指定 ID 的表单数据详情 | 是 |
| `form.prompt` | 返回表单构建提示词 | 否 |

### 4.2 form scope（后续实现）

Endpoint: `POST /api/mcp/form`

form 是实体，方法带 `form.` 前缀。

| Method | 说明 | 认证 |
|--------|------|------|
| `form.schema` | 通过 ID 获取已发布表单 schema | 否 |
| `form.submit` | 提交表单数据 | 否 |

## 五、agent.form.prompt 方法详细设计

### 5.1 功能说明

返回一段结构化的提示词文本，用于指导 AI 理解如何帮助用户构建 HongsForm 表单。

### 5.2 返回内容

提示词包含以下信息：

1. **FormSchema 根结构说明**
   - `type: "object"` 表示整张表单是对象
   - `properties` 保存字段定义，key 是提交数据里的字段名
   - `required` 必填属性名列表

2. **字段通用属性**
   - `type`：数据类型（string、number、integer、boolean、array、object）
   - `title`：字段标题
   - `label`：表单标签（可选）
   - `description`：字段说明
   - `placeholder`：输入占位提示
   - `inputType`：前端控件类型
   - `enum`：可选值列表
   - `options`：选项值到显示标签的映射
   - `format`：字符串格式
   - `pattern`：正则校验
   - `minimum` / `maximum`：数值范围
   - `minLength` / `maxLength`：字符串长度
   - `minItems` / `maxItems`：数组长度

3. **inputType 类型对照表**

   | inputType | FormSchema 类型 | 说明 |
   | --- | --- | --- |
   | `text` | `type: "string"` | 单行文本 |
   | `email` | `type: "string", format: "email"` | 邮箱 |
   | `phone` | `type: "string", pattern: "^1[3-9]\\d{9}$"` | 手机号 |
   | `textarea` | `type: "string"` | 多行文本 |
   | `select` | `type: "string", enum, options` | 下拉单选 |
   | `radio` | `type: "string", enum, options` | 单选 |
   | `check` | `type: "array", items.enum, options` | 多选 |
   | `range` | `type: "number", minimum, maximum` | 范围数值 |
   | `switch` | `type: "boolean"` | 开关 |
   | `datetime` | `type: "string", format: "date-time"` | 日期时间 |
   | `date` | `type: "string", format: "date"` | 日期 |
   | `time` | `type: "string", pattern` | 时间 |
   | `file` | `type: "string"` | 文件 |

4. **必填规则**
   - 至少有一个字段
   - 至少有一个字段是必填或必选
   - 字段内使用 `required: true` 标示必填
   - `check` 字段还需设置 `minItems: 1`

5. **示例 schema**

### 5.3 返回格式

```json
{
  "jsonrpc": "2.0",
  "result": {
    "prompt": "你是一个 HongsForm 表单构建助手...\n\n## FormSchema 根结构\n...\n\n## 字段类型\n...\n\n## 示例\n..."
  },
  "id": 1
}
```

## 六、开发步骤

### 第一阶段：agent scope（本次实现）

1. **配置 `package.json`**
   - 添加依赖：`@modelcontextprotocol/sdk`
   - 运行 `npm install`

2. **创建 `api/mcp/scopes/agent/index.ts`**
   - 创建 `McpServer` 实例
   - 配置 `StreamableHTTPServerTransport`
   - 注册所有工具（Tools）

3. **创建 `api/mcp/scopes/agent/tools/`**
   - `forms.ts` - 注册 `form.list`、`form.get`、`form.create`、`form.update` 工具
   - `formData.ts` - 注册 `formData.list`、`formData.get` 工具
   - `prompt.ts` - 注册 `form.prompt` 工具

4. **实现认证中间件**
   - 自定义 Bearer 认证逻辑
   - 仅验证 `userAuth.sk`，不支持 JWT
   - 将 `userId`、`role` 注入工具上下文

5. **创建 `api/mcp/index.ts`**
   - 导出 agent scope 的 MCP handler

6. **修改 `server.ts`**
   - 注册 `/api/mcp/agent` 路由（支持 POST 和 GET）

### 第二阶段：form scope（后续实现）

- 同上结构，创建 `api/mcp/scopes/form/`

## 七、与 RPC 的对比

| 特性 | RPC | MCP |
|------|-----|-----|
| agent endpoint | `/api/rpc/agent` | `/api/mcp/agent` |
| form endpoint | `/api/rpc/form` | `/api/mcp/form` |
| HTTP 方法 | `POST` | `POST`, `GET` |
| 调用方式 | `method: "form.list"` | `method: "tools/call", params.name: "form.list"` |
| 响应格式 | `{ result: {...} }` | `{ result: { content: [...] } }` |
| 协议 | JSON-RPC 2.0 | JSON-RPC 2.0 + MCP 规范 |

**MCP 调用示例**：

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "form.list",
    "arguments": { "page": 1, "pageSize": 20 }
  },
  "id": 1
}
```

**结论**：MCP 在 JSON-RPC 2.0 基础上增加了 `tools/call`、`tools/list` 等标准方法，业务逻辑可复用现有 RPC 代码。

## 八、技术架构

### 8.1 MCP SDK

使用官方 TypeScript SDK：`@modelcontextprotocol/sdk`

```bash
npm install @modelcontextprotocol/sdk
```

### 8.2 传输方式

采用 **Streamable HTTP** 传输（推荐用于远程服务器）：
- 支持 HTTP POST 请求/响应
- 支持服务端向客户端推送通知（SSE）
- 支持无状态和有状态会话

### 8.3 核心概念映射

| MCP 概念 | 说明 | HongsForm 对应 |
|---------|------|---------------|
| **Tools** | 让 LLM 执行操作 | `form.list`、`form.create` 等方法 |
| **Resources** | 暴露数据给 LLM | 暂不使用 |
| **Prompts** | 可重用的交互模板 | `form.prompt` 返回提示词 |

### 8.4 MCP 标准方法

MCP 协议定义了以下标准 JSON-RPC 方法：

| 方法 | 说明 |
|------|------|
| `initialize` | 初始化连接，协商协议版本和能力 |
| `tools/list` | 列出所有可用工具 |
| `tools/call` | 调用指定工具 |
| `prompts/list` | 列出所有可用提示词模板 |
| `prompts/get` | 获取指定提示词模板 |

**调用工具示例**：

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "form.list",
    "arguments": { "page": 1, "pageSize": 20 }
  },
  "id": 1
}
```

### 8.5 代码结构示例

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'hongs-form-mcp',
  version: '1.0.0'
});

// 注册工具
server.registerTool(
  'form.list',
  {
    title: 'List Forms',
    description: '列出当前用户的表单',
    inputSchema: {
      page: z.number().optional().describe('页码'),
      pageSize: z.number().optional().describe('每页数量')
    }
  },
  async (params, extra) => {
    // 业务逻辑
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }
);
```

### 8.6 认证集成

MCP SDK 支持 Bearer 认证中间件，我们将：
1. 使用 `requireBearerAuth` 中间件
2. 自定义验证逻辑：仅查询 `userAuth` 集合验证 `sk`
3. 将用户信息注入到 `extra` 参数中供工具使用

## 九、技术选型

- **MCP SDK**：`@modelcontextprotocol/sdk` 官方 TypeScript SDK
- **传输方式**：Streamable HTTP
- **验证库**：`zod`（SDK 内置依赖）
- **认证机制**：仅支持 `userAuth.sk` 认证，不支持 JWT token
  - AI 通过 `Authorization: Bearer <sk>` 访问
  - 服务端查询 `userAuth` 集合验证 `sk` 的有效性
