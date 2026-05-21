# Hongs Form Web

基于 Vue 3 的表单渲染前端，用于动态渲染表单并提交数据。

## 功能特性

- 📝 根据 JSON Schema 动态渲染表单
- ✅ 支持多种表单字段类型（文本、数字、下拉、单选、多选、文本域）
- 🎯 字段级错误提示显示
- 🔗 Path 路由支持 `/form/:id`

## 技术栈

- Vue 3 (Composition API)
- Vue Router 4
- Vite

## 快速开始

### 安装依赖

```bash
cd hongs-form-web-form
npm install
```

### 开发模式

```bash
npm run dev
```

访问: `http://localhost:3001/form/{表单ID}`

### 构建

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 访问路径

| 路径 | 说明 |
|------|------|
| `/form/{id}` | 表单页面 |
| `/form/{id}/success` | 提交成功页面 |

## 测试表单

启动 API 服务后，调用 `test.importForms` 方法导入测试表单：

```json
{
  "jsonrpc": "2.0",
  "method": "test.importForms",
  "params": {
    "userId": "{用户ID}"
  },
  "id": 1
}
```

内置 3 个测试表单：
1. `user_survey` - 用户满意度调查问卷
2. `contact_form` - 联系我们
3. `registration` - 活动报名表

## 支持的字段类型

| 类型 | inputType | 说明 |
|------|-----------|------|
| string | - | 文本输入 |
| string | textarea | 多行文本 |
| string | select | 下拉选择 |
| string | radio | 单选按钮 |
| string | checkbox | 多选框 |
| number / integer | - | 数字输入 |
| boolean | radio | 布尔单选 |

## 表单 Schema 示例

```json
{
  "type": "object",
  "required": ["name", "email"],
  "properties": {
    "name": {
      "type": "string",
      "title": "姓名",
      "placeholder": "请输入姓名",
      "minLength": 2,
      "maxLength": 50
    },
    "email": {
      "type": "string",
      "title": "邮箱",
      "pattern": "^.+@.+$"
    },
    "rating": {
      "type": "integer",
      "title": "评分",
      "inputType": "radio",
      "enum": [1, 2, 3, 4, 5],
      "options": {
        "1": "很差",
        "2": "较差",
        "3": "一般",
        "4": "满意",
        "5": "非常满意"
      }
    }
  }
}
```
