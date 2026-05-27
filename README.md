# HongsForm

基于 JSON Schema 的 AI 表单构建系统，支持 JSON-RPC 2.0 和 MCP 协议。核心组件为 **[hongs-form](https://github.com/HongsForm/hongs-form)**。

## 项目结构

```
HongsForm/
├── Docs/                 # 文档目录
│   ├── API.md            # API 文档
│   ├── API-Verify.md     # 验证接口文档
│   ├── Form.md           # 表单定义文档
│   └── Database.md       # 数据库文档
├── hongs-form/           # 核心表单验证库
├── hongs-form-api/
│   └── server/           # API 服务端 (JSON-RPC 2.0, MCP)
└── hongs-form-web/
    ├── admin/            # 管理后台
    ├── agent/            # 代理平台
    └── form/             # 表单填报平台
```

## 技术栈

- **核心库**: TypeScript
- **数据库**: MongoDB
- **API**: JSON-RPC 2.0, MCP
- **前端**: Vite, Vue 3, Bootstrap 5, TypeScript

## hongs-form 核心库

[基于 JSON Schema 模式的极简表单验证库。](https://github.com/HongsForm/hongs-form)

## API 服务 (JSON-RPC 2.0)

### 端点

- `POST /api/rpc/admin` 管理后台，管理全部表单和数据
- `POST /api/rpc/agent` 客户平台，管理自有表单和数据，以及构建表单
- `POST /api/rpc/form`  表单填报

## AI 代理 (MCP)

通过 MCP 协议与 OpenClaw 等 AI 模型集成，实现智能表单生成。

### 端点

- `POST /api/mcp/agent` 发布表单，导出数据
- `POST /api/mcp/form`  填报表单

## 构建网站

```bash
cd HongsForm
cd hongs-form-api/server
npm install
npm run build
cd ../..
cd hongs-form-web/admin
npm install
npm run build
cd ../..
cd hongs-form-web/agent
npm install
npm run build
cd ../..
cd hongs-form-web/form
npm install
npm run build
cd ../..
node make-site.js
```

本地构建好后，将 site 打包放到线上，执行以下命令完成环境搭建和启动。注意启动 mongodb，相关配置在 `site/.env`。

```bash
cd site
npm install --production
cp .evn.example .env
npm start
```

## License

MIT

## AI Coding 看这里

当开发者提到相关短语时，去对应的地方处理。

| 短语 | 位置 |
| --- | --- |
| api server | hongs-form-api/server |
| web admin | hongs-form-web/admin |
| web agent | hongs-form-web/agent |
| web form | hongs-form-web/form |
| rpc common | hongs-form-api/server/api/rpc/scopes/common |
| rpc admin | hongs-form-api/server/api/rpc/scopes/admin |
| rpc agent | hongs-form-api/server/api/rpc/scopes/agent |
| rpc form | hongs-form-api/server/api/rpc/scopes/form |

向数据库(MongoDB)添加、更新数据时，要么已明确各字段的类型、取值，要么用 `hongs-form` 进行校验，不可直接把 `params` 丢进数据库。`hongs-form` 的 `validate` 可以不用管异常，rpc/mcp 接口有包装异常处理。提交、保存等异常时必须显示错误，未知错误也是错误。不得通过错误消息内容来做程序逻辑判断，如必须针对错误执行逻辑，在后端增加对应错误标识。
