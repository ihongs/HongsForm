# 表单构建指南

## 可用工具

以下工具可用于表单操作：

| 工具名 | 说明 | 参数 |
| --- | --- | --- |
| `form.list` | 列出当前用户的表单 | `page`, `pageSize`, `keyword`, `status` |
| `form.get` | 获取指定 ID 的表单详情 | `id` |
| `form.prompt` | 获取表单构建指南（本文） | 无 |
| `form.create` | 创建表单 | `name`, `title`, `description`, `fields`, `config`, `script` |
| `form.update` | 修改表单 | `id`, `name`, `title`, `description`, `fields`, `config`, `script`, `status` |
| `formRecord.export` | 列出表单提交记录 | `formId`, `page`, `pageSize`, `startDate`, `endDate` |

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
  "fields": [...],
  "config": {...},
  "script": '附加脚本',
  "url": "https://example.com/form/表单ID",
  "status": 1,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### form.create 响应
```json
{
  "id": "新创建的表单ID",
  "url": "https://example.com/form/表单ID"
}
```

### form.update 响应
```json
{
  "success": true,
  "id": "表单ID",
  "url": "https://example.com/form/表单ID"
}
```

## 表单配置

表单由一系列字段、配置和脚本等组成。

基本结构为:
```json
{
  "name": "表单名称",
  "title": "表单标题",
  "description": "表单描述",
  "fields": [...],
  "config": {...},
  "script": '附加脚本'
}
```

### 字段集合

fields 定义表单字段列表，每个字段都是一个 JSONSchema 节点，扩展了 name、inputType、labels、label、placeholder 等属性。

#### 字段命名规范

字段名应遵循以下规则：
- 建议按 `inputType` 自动生成，第一个字段名为 `inputType` 本身，如 `text`、`email`、`phone`
- 后续字段依次添加数字后缀：`text1`、`text2`、`phone1`、`phone2` 等
- 删除后自动补空位，例如已有 `phone`、`phone2`，再新增时生成 `phone1`
- 按手机/邮箱仅限填报一份，则必须使用 `phone`、`email` 作为字段名
- 字段名长度最多 11 位
- 总字段数最多 100 个

#### 字段通用属性

- `name`：字段名，用于提交数据时的键名。
- `type`：数据类型，如 `string`、`number`、`integer`、`boolean`、`array`。
- `inputType`：前端控件类型。
- `title`：字段标题，用于数据列表、提交详情等场景展示。
- `description`：字段说明，显示在表单控件下方。
- `label`：可选的表单标签，未设置时表单内使用 `title`。
- `placeholder`：输入占位提示。
- `enum`：可选值列表。
- `labels`：选项值到显示标签的映射，注意：仅作为 enum 的补充。
- `format`：字符串格式，如 `email`、`date-time`、`date`。
- `pattern`：正则校验。
- `minimum` / `maximum`：数值范围。
- `minLength` / `maxLength`：字符串长度。
- `minItems` / `maxItems`：数组长度。
- `required`：是否必填，值为 `true` 或省略。

#### inputType 类型

| inputType | FormSchema 类型 | 说明 |
| --- | --- | --- |
| `name` | `type: "string"` | 姓名 |
| `email` | `type: "string", format: "email"` | 邮箱 |
| `phone` | `type: "string", pattern: "^1[3-9]\\d{9}$"` | 手机号 |
| `text` | `type: "string"` | 单行文本 |
| `textarea` | `type: "string"` | 多行文本 |
| `select` | `type: "string", enum, options` | 下拉单选 |
| `radio` | `type: "string", enum, options` | 单选 |
| `check` | `type: "array", items.enum, options` | 多选，必选时增加 `minItems: 1` |
| `range` | `type: "number", minimum, maximum` | 范围数值 |
| `switch` | `type: "boolean"` | 开关 |
| `datetime` | `type: "string", format: "date-time"` | 日期时间 |
| `date` | `type: "string", format: "date"` | 日期 |
| `time` | `type: "string", pattern` | 时间 |
| `file` | `type: "string"` | 文件上传 |
| `image` | `type: "string"` | 图片上传 |
| `legend` | `type: "null"` | 小标题，表现为标题下面一条线 |
| `figure` | `type: "null"` | 内容块，表现一块内容，支持 markdown 格式 |

#### 必填规则

- **强制要求**：表单**必须至少包含一个必填字段**。
- **普通字段**：在字段定义内设置 `required: true`。
- **check 字段**：设置 `required: true` 并增加 `minItems: 1`，确保至少选择一项。

### config 配置

`config` 用于控制表单的提交限制和时间规则：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `oncePerPhone` | `boolean` | 是否限制每个手机号仅能提交一次 |
| `oncePerEmail` | `boolean` | 是否限制每个邮箱仅能提交一次 |
| `oncePerGuest` | `boolean` | 是否限制每个访客仅能提交一次（基于浏览器指纹） |
| `startAt` | `string` (ISO日期) | 表单开放填写的开始时间 |
| `endAt` | `string` (ISO日期) | 表单截止填写的时间 |

### script 附加脚本

`script` 用于控制字段联动逻辑，在浏览器前端沙箱中执行：

```javascript
form.onChange('字段名', (field) => {
  if (field.value().includes('某个值')) {
    form.field('目标字段').hide().clear();
  } else {
    form.field('目标字段').show();
  }
});
```

可用 API：
- `form.onChange(fieldName, (field) => {})` - 监听字段值变化，回调参数为 field 对象
- `form.field(name).hide()` / `.show()` - 隐藏/显示字段
- `form.field(name).clear()` - 清空字段值
- `form.field(name).value(v)` - 设置字段值，支持数组
- `form.field(name).isHidden()` - 获取字段隐藏状态
- `field.value()` - 获取当前字段值，多选、标签等存在多个值的返回数组

## 完整示例

```json
{
  "name": "用户调查",
  "title": "产品使用满意度调查",
  "description": "感谢您抽出宝贵时间填写此问卷",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "title": "姓名",
      "inputType": "text",
      "placeholder": "请输入姓名"
    },
    {
      "name": "email",
      "type": "string",
      "title": "邮箱",
      "inputType": "email",
      "placeholder": "请输入邮箱地址"
    },
    {
      "name": "phone",
      "type": "string",
      "title": "手机号",
      "inputType": "phone",
      "placeholder": "请输入手机号"
    },
    {
      "name": "textarea",
      "type": "string",
      "title": "个人简介",
      "inputType": "textarea",
      "placeholder": "请简要介绍一下自己"
    },
    {
      "name": "radio",
      "type": "string",
      "title": "性别",
      "inputType": "radio",
      "enum": ["male", "female", "other"],
      "labels": {
        "male": "男",
        "female": "女",
        "other": "其他"
      }
    },
    {
      "name": "check",
      "type": "array",
      "title": "兴趣爱好",
      "inputType": "check",
      "items": {
        "type": "string",
        "enum": ["sport", "music", "reading"]
      },
      "labels": {
        "sport": "运动",
        "music": "音乐",
        "reading": "阅读"
      }
    },
    {
      "name": "select",
      "type": "string",
      "title": "所在地区",
      "inputType": "select",
      "enum": ["cn", "us", "jp", "other"],
      "labels": {
        "cn": "中国",
        "us": "美国",
        "jp": "日本",
        "other": "其他"
      },
      "placeholder": "请选择"
    },
    {
      "name": "range",
      "type": "number",
      "title": "评分",
      "inputType": "range",
      "minimum": 1,
      "maximum": 5
    },
    {
      "name": "switch",
      "type": "boolean",
      "title": "订阅",
      "inputType": "switch"
    },
    {
      "name": "datetime",
      "type": "string",
      "title": "预约时间",
      "inputType": "datetime"
    },
    {
      "name": "date",
      "type": "string",
      "title": "生日",
      "inputType": "date"
    },
    {
      "name": "time",
      "type": "string",
      "title": "会议时间",
      "inputType": "time"
    },
    {
      "name": "image",
      "type": "string",
      "title": "头像",
      "inputType": "image"
    },
    {
      "name": "file",
      "type": "string",
      "title": "附件",
      "inputType": "file"
    },
    {
      "name": "legend",
      "type": "string",
      "title": "基本信息",
      "inputType": "legend"
    },
    {
      "name": "figure",
      "type": "string",
      "title": "**提示**：所有带 * 的字段为必填项",
      "inputType": "figure"
    }
  ],
  "config": {
    "oncePerGuest": true
  },
  "script": "form.onChange('select', (f) => {\n  if (f.value() === 'cn') {\n    form.field('datetime').show();\n  } else {\n    form.field('datetime').hide().clear();\n  }\n});"
}
```
