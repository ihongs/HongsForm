# FormSchema 构建指南

## 可用工具

以下工具可用于表单操作：

| 工具名 | 说明 | 参数 |
| --- | --- | --- |
| `form.list` | 列出当前用户的表单 | `page`, `pageSize`, `keyword`, `status` |
| `form.get` | 获取指定 ID 的表单详情 | `id` |
| `form.create` | 创建新表单 | `name`, `title`, `description`, `schema`, `config`, `icon`, `color` |
| `form.update` | 修改表单 | `id`, `name`, `title`, `description`, `schema`, `config`, `icon`, `color`, `status` |
| `formData.list` | 列出表单提交数据 | `formId`, `page`, `pageSize`, `startDate`, `endDate` |
| `formData.get` | 获取表单数据详情 | `id` |
| `form.prompt` | 获取表单构建提示词 | 无 |

## 响应结构

所有工具响应均为 JSON 格式，包含以下字段：

### form.list 响应
```json
{
  "items": [...],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

### form.get 响应
```json
{
  "_id": "表单ID",
  "name": "表单名称",
  "title": "表单标题",
  "description": "表单描述",
  "schema": {...},
  "url": "https://example.com/form/表单ID",
  "status": 1,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### form.create 响应
```json
{
  "id": "新创建的表单ID",
  "url": "https://example.com/form/新表单ID"
}
```

### form.update 响应
```json
{
  "success": true,
  "url": "https://example.com/form/表单ID"
}
```

## 根结构

表单根节点是一个对象：
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "姓名",
      "inputType": "text",
      "required": true
    }
  }
}
```

- `type: "object"` 表示整张表单是对象，这是顶层固定写法。
- `properties` 的 key 即提交数据里的字段名。
- `properties` 的插入顺序就是前端渲染顺序。

## 字段命名规范

字段名应遵循以下规则：
- 按 `inputType` 自动生成，第一个字段名为 `inputType` 本身，如 `text`、`email`
- 后续字段依次添加数字后缀：`text1`、`text2`、`phone1`、`phone2` 等
- 删除后自动补空位，例如已有 `phone`、`phone2`，再新增时生成 `phone1`
- 总字段数最多 100 个

## 字段通用属性

- `type`：数据类型，如 `string`、`number`、`integer`、`boolean`、`array`、`object`。
- `title`：字段标题，用于数据列表、提交详情等场景展示。
- `label`：可选的表单标签，未设置时表单内使用 `title`。
- `description`：字段说明，显示在表单控件下方。
- `placeholder`：输入占位提示。
- `inputType`：前端控件类型。
- `enum`：可选值列表。
- `options`：选项值到显示标签的映射。
- `format`：字符串格式，如 `email`、`date-time`、`date`。
- `pattern`：正则校验。
- `minimum` / `maximum`：数值范围。
- `minLength` / `maxLength`：字符串长度。
- `minItems` / `maxItems`：数组长度。
- `required`：是否必填，值为 `true` 或省略。

## inputType 类型

| inputType | FormSchema 类型 | 说明 |
| --- | --- | --- |
| `text` | `type: "string"` | 单行文本 |
| `email` | `type: "string", format: "email"` | 邮箱 |
| `phone` | `type: "string", pattern: "^1[3-9]\\d{9}$"` | 手机号 |
| `textarea` | `type: "string"` | 多行文本 |
| `select` | `type: "string", enum, options` | 下拉单选 |
| `radio` | `type: "string", enum, options` | 单选 |
| `check` | `type: "array", items.enum, options` | 多选，必选时增加 `minItems: 1` |
| `range` | `type: "number", minimum, maximum` | 范围数值 |
| `switch` | `type: "boolean"` | 开关 |
| `datetime` | `type: "string", format: "date-time"` | 日期时间 |
| `date` | `type: "string", format: "date"` | 日期 |
| `time` | `type: "string", pattern` | 时间 |
| `legend` | `type: "null"` | 小标题，表现为标题下面一条线 |
| `figure` | `type: "null"` | 内容块，表现一块内容，支持 markdown 格式 |

## 必填规则

- **强制要求**：表单**必须至少包含一个必填字段**。
- **普通字段**：在字段定义内设置 `required: true`。
- **check 字段**：设置 `required: true` 并增加 `minItems: 1`，确保至少选择一项。

## 完整示例

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "姓名",
      "inputType": "text",
      "placeholder": "请输入姓名",
      "required": true
    },
    "phone": {
      "type": "string",
      "title": "手机号",
      "inputType": "phone",
      "required": true
    },
    "interest": {
      "type": "array",
      "title": "兴趣",
      "inputType": "check",
      "items": {
        "type": "string",
        "enum": ["sport", "music", "reading"]
      },
      "options": {
        "sport": "运动",
        "music": "音乐",
        "reading": "阅读"
      },
      "required": true,
      "minItems": 1
    },
    "email": {
      "type": "string",
      "title": "邮箱",
      "inputType": "email",
      "placeholder": "请输入邮箱地址"
    }
  }
}
```
