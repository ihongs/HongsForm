# FormSchema 与表单转换

`FormSchema` 是 HongsForm 的表单结构定义，接近 JSON Schema，并增加了表单渲染需要的字段元信息。

## 根结构

表单根节点通常是一个对象：

```json
{
  "type": "object",
  "required": ["name", "phone"],
  "properties": {
    "name": {
      "type": "string",
      "title": "姓名",
      "inputType": "text"
    }
  }
}
```

- `type: "object"` 表示整张表单是对象。
- `properties` 保存字段定义，key 是提交数据里的字段名。
- `required` 兼容 JSON Schema 的必填属性名列表形式，例如 `["name", "phone"]`。
- `properties` 的插入顺序就是前端渲染顺序。

## 字段通用属性

每个字段都可以包含：

- `type`：数据类型，如 `string`、`number`、`integer`、`boolean`、`array`、`object`。
- `title`：字段标题，主要用于数据列表、提交详情、管理后台等场景展示。
- `label`：可选的表单标签，只用于表单填写界面；未设置时表单内使用 `title`。当表单内需要长标签、而数据管理只需要短标题时，应使用 `label` 承载长文案。
- `description`：字段说明，显示在表单控件下方的帮助信息，Bootstrap 前端使用 `form-text` 展示。
- `placeholder`：输入占位提示，仅适用于支持占位提示的输入类控件；不支持的 `inputType` 不应写入该属性。
- `inputType`：前端控件类型，如 `text`、`textarea`、`select`、`check`。
- `enum`：可选值列表。
- `options`：选项值到显示标签的映射。
- `format`：字符串格式，如 `email`、`date-time`、`date`。
- `pattern`：正则校验。
- `minimum` / `maximum`：数值范围。
- `minLength` / `maxLength`：字符串长度。
- `minItems` / `maxItems`：数组长度。

## 设计器字段数组

agent 前端设计器内部使用数组记录字段，便于排序和编辑：

```json
[
  {
    "name": "text",
    "inputType": "text",
    "title": "姓名",
    "label": "请输入您的姓名",
    "description": "请填写证件或常用联系人姓名。",
    "placeholder": "请输入姓名",
    "required": true
  },
  {
    "name": "check",
    "inputType": "check",
    "title": "兴趣",
    "required": true,
    "optionText": "sport=运动\nmusic=音乐"
  }
]
```

提交保存时再转换为 `FormSchema`：

1. 数组顺序决定 `properties` 写入顺序。
2. 每个字段的 `name` 作为 `properties` 的 key。
3. 字段是否必填保留在字段 schema 内的 `required: true`。
4. 字段的 `inputType` 决定 schema 的 `type`、`format`、`items` 等属性。

转换结果示例：

```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "title": "姓名",
      "label": "请输入您的姓名",
      "description": "请填写证件或常用联系人姓名。",
      "inputType": "text",
      "placeholder": "请输入姓名",
      "required": true
    },
    "check": {
      "type": "array",
      "title": "兴趣",
      "inputType": "check",
      "required": true,
      "items": {
        "type": "string",
        "enum": ["sport", "music"]
      },
      "options": {
        "sport": "运动",
        "music": "音乐"
      },
      "minItems": 1
    }
  }
}
```

## 字段名规则

字段名按 `inputType` 自动生成：

- 第一个 `text` 字段名为 `text`。
- 后续为 `text1`、`text2`。
- 删除后补空位，例如已有 `phone`、`phone2`，再新增 phone 时生成 `phone1`。
- 总字段数最多 100 个。

## inputType 转换规则

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
| `time` | `type: "string", pattern` | 时间，格式 `HH:mm` 或 `HH:mm:ss` |
| `file` | `type: "string"` | 当前先保存文件名，完整上传能力后续扩展 |

## 必填规则

设计器保存前要求：

- 至少有一个字段。
- 至少有一个字段是必填或必选。

HongsForm 兼容 JSON Schema 的根节点 `required: string[]`，用于列出必填属性名；但内部非必要尽量不用数组形式，更建议在字段定义内使用 `required: true` 分别标示必填状态，设计器也采用这种形式保存。

普通字段的必填通过字段内 `required: true` 表示；`check` 字段除了设置 `required: true`，还会设置 `minItems: 1`，确保至少选择一项。
