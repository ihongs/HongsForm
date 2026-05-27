# HongsForm

基于 JSON Schema 的 AI 表单构建系统，支持 JSON-RPC 2.0 和 MCP 协议。核心组件为 **[hongs-form](https://github.com/ihongs/HongsForm/tree/main/hongs-form)**。

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

[基于 JSON Schema 模式的极简表单验证库。](https://github.com/ihongs/HongsForm/tree/main/hongs-form)

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

## AI 看这里

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

### 原则问题

- 校验原则：接口向数据库(MongoDB)添加、更新数据前，要么已明确各字段的类型、取值，要么用 `hongs-form` 进行校验，不可直接把 `params` 丢进数据库。`hongs-form` 的 `validate` 可以不用管异常，rpc/mcp 接口有包装异常处理。可以不用 `hongs-form` 的自定义校验功能，只用其清理出符合表 schema 定义的基础数据，然后对清理过的数据写一大票 if/else 判断，这是允许的；但如果你发现原来有用 `hongs-form` 校验，不要擅自改成展开的对象和一堆的 if/else 判断。
- 报错原则：**成功无需多言，失败总有理由**。发生异常时必须展示错误，未知错误也是错误。不得通过错误消息来做程序逻辑判断，如必须针对错误执行逻辑，务必明确对应错误标识。
- 对齐原则：此项目作者有严重的对齐强迫症，如果你看到一块代码中间有用于对齐的多余空格，不要动它。但你添加的代码大可不必如此，按正常规范编写即可。
- 克制原则：抑制疯狂编码的冲动，非 `/plan` 模式规划好的任务，当一个问题要动很多地方时，详细说明问题并停止编码，等待开发者确认。
- 礼貌原则：通常作者不骂人，如果作者骂你蠢，请告诉他你是什么模型，并针对问题礼貌的向他推荐其他模型。
