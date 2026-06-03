# 签到表单功能开发计划

## 一、目标

实现独立的签到表单类型（`type: 'sign'`），支持两种签到模式：
1. **代理扫码签到**：代理登录系统后扫描客户二维码完成签到
2. **客户自主签到**：客户扫描代理生成的二维码，通过手机/邮箱验证完成签到

## 二、数据库变更

### 2.1 不新增字段，复用现有结构

| 复用字段 | 用途 |
|----------|------|
| `form.type` | 标记为 `'sign'` 表示签到表单 |
| `form.fields` | 要求必须包含 `name` 字段 |
| `form.createdBy` | 表单创建者ID，用于生成checksum |
| `form.config.signWord` | 签到暗语（4个字以内） |
| `formRecord._id` | 提交记录唯一标识 |
| `formRecord.createdBy` | 记录创建者ID，用于生成checksum |
| `formRecord.data.name` | 用户姓名 |
| `formRecord.data.phone` | 用户手机号 |
| `formRecord.data.email` | 用户邮箱 |
| `formRecord.status` | 状态标记（0=作废, 1=正常, 2=已签到） |

### 2.2 formRecord.status 状态语义

| status | 说明 |
|--------|------|
| `0` | 作废（内部操作） |
| `1` | 正常（已提交，未签到） |
| `2` | 已签到 |

## 三、签到页面URL规范

### 3.1 页面URL定义

| 页面 | URL | checksum计算 | 说明 |
|------|-----|-------------|------|
| 1号页（代理/客户） | `/form/{formId}/sign/{recordId}/{checksum}` | `md5(formRecord.createdBy + formRecord._id)` | 代理扫描客户二维码后打开，或客户报名后直接进入 |
| 2号页（代理二维码页） | `/form/{formId}/sign-agent/{checksum}` | `md5(form.createdBy + form._id)` | 代理端展示，显示3号页URL的二维码 |
| 3号页（客户签到检验） | `/form/{formId}/sign-guest/{checksum}` | `md5(form.createdBy + form._id)` | 客户扫码后打开，走手机/邮箱验证流程 |

### 3.2 页面关系图

```
客户报名
    ↓
formRecord.create 返回 checksum
    ↓
[1号页] - 客户模式
┌─────────────────┐
│ 签到暗语：XXX   │
│ 保存二维码按钮  │
└─────────────────┘
      │
      ↓ 保存二维码
          ↓
代理扫码 ──────────────────────────┐
          ↓                      │
[1号页] - 代理模式                │
┌─────────────────┐              │
│ 客户信息：张三  │              │
│ [确认签到按钮]  │              │
└─────────────────┘              │
          ↓                      │
确认签到 ─────────────────────────┘
```

```
代理展示2号页
    ↓
客户扫码
    ↓
[3号页] - 客户签到检验
┌─────────────────┐
│ 输入手机号/邮箱 │
│ 获取验证码      │
│ 提交验证        │
└─────────────────┘
    ↓
验证通过？
    ├─ 是，已报名 → 跳转1号页
    └─ 否，未报名 → 跳转表单报名页
```

## 四、业务规则

### 4.1 表单类型规则

| 规则 | 说明 |
|------|------|
| 表单类型 | `type` 必须为 `'sign'` |
| 必填字段 | 必须包含 `name` 字段（姓名） |
| 签到暗语 | 可设置4个字以内的签到暗语，存储在 `form.config.signWord` |
| 表单状态 | 发布后 (`status: 2`) 才能接收提交和签到 |

### 4.2 签到开关配置

| 配置项 | 说明 |
|--------|------|
| `oncePerPhone` | 开启后支持手机号签到验证 |
| `oncePerEmail` | 开启后支持邮箱签到验证 |

> **注意**：`signByPhone`、`signByEmail` 只有开启了对应的限定才有此功能，未开启则2号页显示"未开启某某"提示。

### 4.3 1号页两种状态

| 状态 | 显示内容 |
|------|---------|
| 客户模式 | 显示签到暗语 + 客户信息 + 二维码 + 保存二维码按钮 |
| 代理模式 | 显示客户信息 + 签到按钮（如果未签到）/ 已签到状态 |

### 4.4 checksum校验规则

| 校验项 | 说明 |
|--------|------|
| checksum不匹配 | 直接返回错误，前端显示错误提示 |
| 1号页agent用户校验 | 如果当前登录用户是表单的创建者/代理，显示代理模式，出确认签到按钮 |
| 已签到状态校验 | 已签到记录显示"已签到"状态，不显示签到按钮 |

## 五、API接口设计

所有接口都是 JSON RPC 模式，统一使用 POST。

### 5.1 /api/rpc/form scope 接口

| method | 说明 |
|--------|------|
| `form.checksum` | 校验表单checksum，获取手机、邮箱开关等配置 |
| `formRecord.checksum` | 校验记录checksum，获取名字、状态等信息 |
| `formRecord.signByPhone` | 通过手机号验证码签到 |
| `formRecord.signByEmail` | 通过邮箱验证码签到 |

#### form.checksum

**请求参数：**
```javascript
{
  id: string,           // form._id
  checksum: string      // md5(form.createdBy + form._id)
}
```

**返回结果（成功）：**
```javascript
{
  success: true,
  form: {
    _id: "formId",
    type: "sign",
    name: "会议签到",
    title: "会议签到",
    config: {
      oncePerPhone: true,
      oncePerEmail: false
    },
    status: 2
  }
}
```

**返回结果（失败）：**
```javascript
{
  success: false,
  code: "INVALID_CHECKSUM" | "FORM_NOT_FOUND" | "FORM_NOT_PUBLISHED",
  message: "校验失败"
}
```

#### formRecord.checksum

**请求参数：**
```javascript
{
  id: string,           // formRecord._id
  checksum: string      // md5(formRecord.createdBy + formRecord._id)
}
```

**返回结果（成功）：**
```javascript
{
  success: true,
  record: {
    _id: "recordId",
    data: { name: "张三", phone: "138xxxx1234", email: "xxx@xxx.com" },
    status: 1,          // 1=未签到, 2=已签到
    createdAt: "2024-01-15T10:00:00Z"
  },
  form: {
    _id: "formId",
    type: "sign",
    name: "会议签到",
    title: "会议签到",
    config: {
      signWord: "签到暗语"
    }
  },
  isAgentMode: false       // 是否为代理模式
}
```

#### formRecord.create（现有接口改造）

**返回结果（签到表单）：**
```javascript
{
  id: "recordId",
  checksum: "checksum"  // 新增：签到checksum
}
```

#### formRecord.signByPhone

**请求参数：**
```javascript
{
  formId: string,
  phone: string,
  verifyCode: string
}
```

**返回结果（成功-已报名）：**
```javascript
{
  success: true,
  id: "recordId",
  isFirstSign: true,
  checksum: "checksum"
}
```

**返回结果（未报名）：**
```javascript
{
  success: false,
  code: "NOT_REGISTERED",
  message: "请先报名"
}
```

#### formRecord.signByEmail

**请求参数：**
```javascript
{
  formId: string,
  email: string,
  verifyCode: string
}
```

**返回结果（成功-已报名）：**
```javascript
{
  success: true,
  id: "recordId",
  isFirstSign: true,
  checksum: "checksum"
}
```

**返回结果（未报名）：**
```javascript
{
  success: false,
  code: "NOT_REGISTERED",
  message: "请先报名"
}
```

### 5.2 /api/rpc/agent scope 接口（需登录，校验agent role权限）

| method | 说明 |
|--------|------|
| `formRecord.confirmSign` | 代理确认签到 |

#### formRecord.confirmSign

**请求参数：**
```javascript
{
  id: string,           // formRecord._id
  formId: string        // form._id
}
```

**返回结果：**
```javascript
{
  success: true,
  id: "recordId",
  signedAt: "2024-01-15T14:30:00Z"
}
```

## 六、前端页面设计

### 6.1 1号页 - 签到验证页面（客户模式/代理模式）

**路径**：`/form/{formId}/sign/{recordId}/{checksum}`

**页面流程：**
1. 加载时调用 `form.formRecord.checksum` 校验
2. 校验失败：显示错误提示
3. 校验成功：
   - **客户模式**（isAgentMode: false）：
     - 显示签到暗语（form.config.signWord）
     - 显示客户信息（姓名等）
     - 显示签到二维码
     - 显示"保存二维码"按钮
   - **代理模式**（isAgentMode: true）：
     - 显示客户信息
     - 如果 status: 1：显示签到按钮
     - 如果 status: 2：显示"已签到"状态
     - 点击签到按钮：调 /api/rpc/agent 的 formRecord.confirmSign

### 6.2 2号页 - 代理二维码页面

**路径**：`/form/{formId}/sign-agent/{checksum}`

**页面流程：**
1. 加载时调用 `form.checksum` 校验
2. 校验失败：显示错误提示
3. 校验成功：
   - 显示表单标题
   - 显示客户自主签到二维码（指向3号页URL）
   - 提示：如果未开启手机/邮箱限制，显示"未开启某某限制，无法自签到"

### 6.3 3号页 - 客户签到检验页面

**路径**：`/form/{formId}/sign-guest/{checksum}`

**页面流程：**
1. 加载时调用 `form.checksum` 校验
2. 校验失败：显示错误提示
3. 校验成功：
   - 显示表单标题和签到说明
   - 根据开启的限制显示手机/邮箱输入选项
   - 输入手机号/邮箱 → 获取验证码 → 提交验证
   - 调 /api/rpc/form 的 formRecord.signByPhone/signByEmail
   - **成功（已报名）**：跳转1号页（此时1号也应该显示已签到状态）
   - **失败（未报名）**：收到 `code: "NOT_REGISTERED"`，跳转表单报名页（`registerUrl`）
   - 显示签到成功页面（区分首次签到和重复签到）

### 6.4 签到成功页面

显示内容：
- 签到状态（未签到/已签到）
- 用户信息展示
- 代理签到二维码（1号页URL）
- 保存二维码按钮

### 6.5 表单设计页改造

- 签到类型表单增加"签到暗语"输入框（4个字以内）
- 校验必须有name字段

## 七、开发任务清单

### 7.1 后端任务

| 任务 | 说明 |
|------|------|
| form类型校验 | 创建表单时支持type:'sign'，校验必须有name字段，signWord限制4字以内 |
| formRecord.create改造 | 签到表单返回checksum |
| form.checksum接口 | 校验表单checksum，返回配置信息（包含config.signWord） |
| formRecord.checksum接口 | 校验记录checksum，返回记录信息、canConfirmSign、isAgentMode、config.signWord |
| formRecord.signByPhone接口 | 手机号验证码签到，未报名返回NOT_REGISTERED和registerUrl |
| formRecord.signByEmail接口 | 邮箱验证码签到，未报名返回NOT_REGISTERED和registerUrl |
| agent 的 formRecord.confirmSign接口 | 代理确认签到 |

### 7.2 前端任务

| 任务 | 说明 |
|------|------|
| 表单设计页改造 | 签到类型表单增加签到暗语输入框，校验必须有name字段 |
| QrCodeGenerator组件 | 二维码生成与导出组件 |
| 1号页 - SignView | 签到成功及验证页面（支持客户模式/代理模式） |
| 2号页 - SignAgentView | 代理二维码展示页面 |
| 3号页 - SignGuestView | 客户签到检验页面，未报名时跳转报名页 |
