# HongsForm

基于 JSON Schema 的 AI 表单构建系统，支持 JSON-RPC 2.0 和 MCP 协议。表单定义参见 **[Form.md](https://github.com/ihongs/HongsForm/tree/main/Docs/Form.md)**。

## 项目结构

```
HongsForm/
├── Docs/                 # 文档目录
│   ├── API.md            # API 文档
│   ├── API-Verify.md     # 验证接口文档
|   ├── Form.md           # 表单构建指南
│   └── Database.md       # 数据库文档
├── form-api/             # API 服务端 (JSON-RPC 2.0, MCP)
|   └── public            # 公共资源目录
|       ├── static        # 公共静态资源
|       └── upload        # 本地上传目录，使用云存储则不用
└── form-web/
    ├── admin/            # 管理后台
    ├── agent/            # 代理平台
    └── form/             # 表单填报平台
```

## 技术栈

- **前端**: TypeScript, Vite, Vue 3, Bootstrap 5, 
- **核心**: TypeScript, Zod
- **数据库**: MongoDB
- **API**: JSON-RPC 2.0, MCP

## API 服务 (JSON-RPC 2.0)

### 端点

- `POST /api/rpc/admin` 管理后台，管理全部表单和数据
- `POST /api/rpc/agent` 客户平台，管理自有表单和数据，以及构建表单
- `POST /api/rpc/form`  表单填报

## AI 代理 (MCP)

通过 MCP 协议与 OpenClaw 等 AI 模型集成，实现智能表单生成。

### 端点

- `POST /api/mcp/admin` 数据分析
- `POST /api/mcp/agent` 发布表单，导出数据
- `POST /api/mcp/form`  填报表单

## License

MIT

## AI 看这里

当开发者提到相关短语时，去对应的地方处理。

| 短语 | 位置 |
| --- | --- |
| api server | form-api/server |
| web admin | form-web/admin |
| web agent | form-web/agent |
| web form | form-web/form |
| rpc common | form-api/server/api/rpc/scopes/common |
| rpc admin | form-api/server/api/rpc/scopes/admin |
| rpc agent | form-api/server/api/rpc/scopes/agent |
| rpc form | form-api/server/api/rpc/scopes/form |

### 原则问题

- 校验原则：接口向数据库(MongoDB)添加和更新，除非只有少量明确的参数且已校验和转换过，否则务必使用 Zod 进行数据校验，校验规则在 form-api/src/schemas 中按接口主题定义。
- 报错原则：**成功无需多言，失败总有理由**。发生异常时必须展示错误，未知错误也是错误。不得通过错误消息来做程序逻辑判断，如必须针对错误执行逻辑，务必明确对应错误标识。
- 对齐原则：此项目作者有严重的对齐强迫症，如果你看到一块代码中间有用于对齐的多余空格，不要动它。但你添加的代码大可不必如此，按正常规范编写即可。
- 克制原则：抑制疯狂编码的冲动，非 `/plan` 模式规划好的任务，当一个问题要动很多地方时，详细说明问题并停止编码，等待开发者确认。
- 礼貌原则：通常作者不骂人，如果作者骂你蠢，请告诉他你是什么模型，并针对问题礼貌的向他推荐其他模型。
