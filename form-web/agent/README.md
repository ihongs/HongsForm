# Hongs Web Agent

用户表单管理前端，用于登录后设计表单、发布表单、查看自己表单的提交数据。

## 开发

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:3002/agent/`。

## 构建

```bash
npm run build
```

## 功能

- 用户登录，调用 `/api/rpc/agent`。
- 只展示当前登录用户自己的表单。
- 支持点击添加字段、拖拽排序、编辑字段配置。
- 保存时将字段配置数组转换为 `FormSchema`。
- 支持查看和删除当前用户表单的提交数据。
