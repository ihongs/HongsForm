# 表单脚本功能设计计划

## 1. 需求概述

为表单系统增加 `form.script` 字段，用于控制字段联动逻辑，例如：
- 字段1选择A时，关闭字段2（并清空字段2的值）
- 字段1选择B时，关闭字段3，显示字段2

### 核心要求

1. **安全执行**：脚本在 Web Worker 沙箱中执行，无法访问主线程危险对象
2. **简单灵活**：通过 `myForm` 对象提供 API，语法直观，易于AI翻译人类需求
3. **双向联动**：支持前端实时联动和后端提交时校验

---

## 2. 设计原则

### 2.1 沙箱执行环境 - Web Worker

```
┌─────────────────────────────────────────────────────────────┐
│                     主线程 (Main Thread)                      │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │  FormRenderer   │◄──►│   useFormScript │                 │
│  │    .vue        │    │   .ts (Hook)    │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                       │                          │
│           │    postMessage         │                          │
│           └───────────┬───────────┘                          │
│                       ▼                                       │
├─────────────────────────────────────────────────────────────┤
│                     Worker 线程 (Sandbox)                     │
│   天然隔离：window, document, fetch, eval 不可访问            │
│   可通过 terminate() 强制终止失控脚本                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 脚本语法设计 - form 对象

```javascript
// 用户脚本示例
form.onChange('field1', (field) => {
  const value = field.value();
  if (value === 'A') {
    form.field('field2').hide().clear();
  } else if (value === 'B') {
    form.field('field3').hide();
    form.field('field2').show();
  }
});
```

---

## 3. form API 设计

### 3.1 入口函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `form.onChange(field, callback)` | 监听字段值变化（回调接收 field 对象） | `form.onChange('field1', (f) => {})` |

**回调参数**：`field` 对象包含以下属性和方法：
- `field.name` - 字段名称
- `field.value()` - 获取当前值
- `field.value(v)` - 设置值
- `field.hide()` - 隐藏字段
- `field.show()` - 显示字段
- `field.clear()` - 清空字段
- `field.isHidden()` - 是否隐藏

### 3.2 Field 对象 API（链式调用）

通过 `form.field(fieldName)` 获取 field 对象：

```javascript
form.field('field2').hide().clear();
form.field('field3').value('value').show();
```

| 函数 | 说明 | 示例 |
|------|------|------|
| `field.value()` | 获取当前值 | `f.value()` |
| `field.value(v)` | 设置值（返回 field 支持链式） | `f.value('xxx')` |
| `field.hide()` | 隐藏字段 | `f.hide()` |
| `field.show()` | 显示字段 | `f.show()` |
| `field.clear()` | 清空字段值 | `f.clear()` |
| `field.isHidden()` | 是否隐藏 | `f.isHidden()` |

### 3.3 form 快捷方法

| 函数 | 说明 | 示例 |
|------|------|------|
| `form.field(field)` | 获取 field 对象 | `form.field('field2')` |
| `form.hide(field)` | 隐藏字段 | `form.hide('field2')` |
| `form.show(field)` | 显示字段 | `form.show('field2')` |
| `form.clear(field)` | 清空字段值 | `form.clear('field2')` |
| `form.isHidden(field)` | 字段是否隐藏 | `form.isHidden('field2')` |

**字段类型处理**：

| inputType | 类型 | value(v) 行为 |
|-----------|------|--------------|
| text, textarea, date, time, datetime | 文本型 | 填充文本值 |
| radio, select | 单选型 | 设置选中值 |
| checkbox, tags | 多选型 | 设置选中值/数组 |
| number | 数字型 | 填充数字值 |

**使用示例**：
```javascript
// 使用 field 对象（推荐）
form.onChange('field1', (f) => {
  const value = f.value();
  if (value === 'A') {
    form.field('field2').hide().clear();
    form.field('field3').value('default').show();
  }
});

// 使用快捷方法（兼容）
form.onChange('field1', (f) => {
  const value = form.getValue('field1');
  if (value === 'A') {
    form.hide('field2').clear('field2');
    form.setValue('field3', 'default').show('field3');
  }
});
```

---

## 4. 执行时机

### 4.1 前端联动（实时）

- **触发时机**：字段值变更时立即执行（防抖 50ms）
- **执行位置**：Web Worker 沙箱
- **用途**：提升用户体验，实时响应

---

## 5. 目录结构

```
hongs-form-web/form/src/
  components/
    FormRenderer.vue        # 修改：集成 FormScript 组件
    FormScript.vue          # 新增：脚本组件
  utils/
    form-script.ts          # 新增：脚本引擎（包含类型、Worker、执行器）
```

### 文件职责说明

| 文件 | 职责 | 说明 |
|------|------|------|
| `form-script.ts` | 脚本引擎核心 | 类型定义、Worker 脚本、执行逻辑、事件联动、死循环检测 |
| `FormScript.vue` | 脚本组件 | 接收 script/fields props，调用引擎，监听变化 |
| `FormRenderer.vue` | 表单渲染器 | 嵌入 FormScript，根据返回状态控制显示 |

## 6. 实现步骤

### Phase 1: 前端脚本引擎（hongs-form-web/form）

1. **脚本引擎核心** (`utils/form-script.ts`)
   - 定义类型：`Action`、`FieldState`、`ScriptContext`、`WorkerMessage`
   - 内联 Worker 脚本（字符串形式）
   - 实现 `FormScriptEngine` 类：
     - 管理 Worker 生命周期
     - 监听字段变化，触发脚本执行
     - Promise 批量触发机制（收集操作后一次性应用）
     - 死循环检测（调用深度限制、执行超时）
     - 调试日志输出

2. **脚本组件** (`components/FormScript.vue`)
   - 接收 props：`script`（脚本内容）、`fields`（字段配置）
   - 创建 `FormScriptEngine` 实例
   - 监听表单数据变化，调用引擎更新
   - 通过事件或 v-model 返回字段状态

3. **修改 `FormRenderer.vue`**
   - 导入并嵌入 `FormScript` 组件
   - 根据返回的字段状态控制显示/隐藏
   - 同步脚本设置的字段值到表单数据

---

## 7. 数据库变更

### form 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `script` | String | 否 | null | 自定义脚本内容 |

**已有字段，无需修改**

---

## 8. 示例脚本库

### 简单联动

```javascript
form.onChange('country', (country) => {
  if (country.value() === '中国') {
    form.field('state').hide().clear();
  } else {
    form.field('state').show();
  }
});
```

### 复杂条件

```javascript
form.onChange('membership', (member) => {
  const points = form.field('points').value();
  if (member.value() === 'VIP' && points > 1000) {
    form.field('vipGift').show();
  } else {
    form.field('vipGift').hide().clear();
  }
});
```

### 多选字段

```javascript
form.onChange('role', (role) => {
  if (role.value() === 'admin') {
    form.field('permissions').value(['read', 'write', 'delete']);
  } else if (role.value() === 'editor') {
    form.field('permissions').value(['read', 'write']);
  } else {
    form.field('permissions').value(['read']);
  }
});
```

### 文本/选项混合

```javascript
form.onChange('memberType', (type) => {
  if (type.value() === 'personal') {
    form.field('companyName').hide().clear();
  } else if (type.value() === 'enterprise') {
    form.field('companyName').show();
  }
});
```

### 双向联动

```javascript
form.onChange('field1', (f1) => {
  if (f1.value() === 'A') {
    form.field('field2').value('default');
  }
});

form.onChange('field2', (f2) => {
  if (f2.value() === 'special') {
    form.field('field3').show();
  }
});
```

---

## 9. Worker 与主线程通信协议

### 主线程 → Worker

```typescript
interface ExecuteMessage {
  id: string;
  type: 'execute';
  script: string;
  fieldValues: Record<string, any>;      // 当前字段值
  fieldMetas: Record<string, FieldMeta>; // 字段元信息（用于查询状态）
}

interface FieldMeta {
  visible: boolean;
  disabled: boolean;
}
```

### Worker → 主线程

```typescript
interface ResultMessage {
  id: string;
  type: 'result';
  actions: Action[];
}

interface ErrorMessage {
  id: string;
  type: 'error';
  error: string;
}

interface Action {
  type: 'hide' | 'show' | 'clear' | 'setValue';
  field: string;
  value?: any;
}
```

---

## 10. 事件联动机制

### 10.1 触发链设计

当脚本执行导致字段值或状态变化时，应自动触发相关监听器。**采用 Promise 批量触发机制，避免连续触发多次 onChange**：

```
用户操作字段1 → onChange('field1')触发 → 脚本执行 → 收集所有操作 → 批量应用 → 一次性触发关联字段的 onChange
```

**触发规则**：

| 操作 | 是否触发 onChange | 是否触发 onShow/hide |
|------|------------------|---------------------|
| `value(v)` | ✅ 是（值变化时，批量触发） | ❌ |
| `hide(field)` | ❌ | ✅ 触发 onHide |
| `show(field)` | ❌ | ✅ 触发 onShow |
| `clear(field)` | ✅ 是（值变化时，批量触发） | ❌ |

### 10.2 Promise 批量触发机制

**核心思路**：所有操作先收集到队列中，脚本执行完毕后一次性应用并触发 onChange，避免中间状态导致的多次触发。

```javascript
// 执行流程
form.onChange('field1', (f) => {
  // 这些操作会被收集，不会立即触发 onChange
  form.field('field2').hide().clear();
  form.field('field3').value('value');
});
// 脚本执行完毕 → 批量应用所有操作 → 一次性触发 field2、field3 的 onChange
```

**实现方式**：

| 阶段 | 说明 |
|------|------|
| **收集阶段** | hide/clear/setValue 调用时将操作添加到队列 |
| **批量应用** | 脚本执行完毕后，Promise 微任务触发批量应用 |
| **触发 onChange** | 所有值变化的字段一次性触发 onChange |

### 10.3 死循环检测

**问题场景**：
```javascript
form.onChange('field1', (f1) => {
  form.field('field2').value('value');  // 触发 field2 的 onChange
});

form.onChange('field2', (f2) => {
  form.field('field1').value('value');  // 触发 field1 的 onChange → 死循环
});
```

**解决方案**：

| 方案 | 说明 | 实现难度 |
|------|------|----------|
| **调用深度限制** | 限制触发链深度（如最大10层） | 低 |
| **循环检测** | 检测是否形成闭环 | 中 |
| **执行超时** | 设置脚本执行总时间限制 | 低 |

**推荐方案**：组合使用

1. **调用深度限制**：设置最大递归深度（默认10层）
2. **执行超时**：单个脚本最大执行时间（100ms）
3. **调试日志**：控制台输出每次操作和触发链

### 10.4 调试支持

**控制台输出格式**：
```
[FormScript] field1 changed
[FormScript] field2 set value "value"
[FormScript] field2 changed
[FormScript] field2 clear value
[FormScript] ⚠️ 检测到循环调用，已阻止 [深度: 3]
```

**调试信息包含**：
- 触发的字段名
- 执行的操作类型
- 当前调用深度
- 警告/错误信息

---

## 11. 安全考虑 - Web Worker 沙箱

### 11.1 安全优势

| 特性 | 说明 |
|------|------|
| **隔离环境** | Worker 内无法访问 `window`, `document`, `localStorage` |
| **无 DOM** | 无法操作 DOM，无法实现 XSS |
| **无法网络** | 无法使用 `fetch`, `XMLHttpRequest`, `WebSocket` |
| **无定时器** | 无法使用 `setTimeout/setInterval` 阻塞主线程 |
| **可强制终止** | `worker.terminate()` 可立即终止失控脚本 |
| **错误隔离** | Worker 崩溃不影响主线程 |

### 11.2 危险对象对比

| 对象/函数 | new Function() 主线程 | Web Worker |
|-----------|----------------------|-------------|
| window | ❌ 不可直接访问* | ❌ 不可访问 |
| document | ❌ 不可直接访问* | ❌ 不可访问 |
| fetch | ✅ 可以调用 | ❌ 不可访问 |
| eval | ✅ 可以调用 | ❌ 不可访问 |
| setTimeout | ✅ 可以调用 | ❌ 不可访问 |
| XMLHttpRequest | ✅ 可以调用 | ❌ 不可访问 |

*主线程中 `new Function()` 虽然无法直接访问外部变量，但可以通过 `this.fetch()` 等方式调用危险函数

### 11.3 额外安全措施

1. **防抖限制**：脚本执行防抖 50ms，避免频繁执行
2. **超时控制**：Worker 内设置执行超时（100ms）
3. **调用深度限制**：最大触发链深度（10层）
4. **错误捕获**：捕获脚本执行中的所有错误
5. **消息验证**：验证 Worker 返回的消息格式
6. **调试日志**：控制台输出所有操作，便于追踪问题

---

## 12. 错误处理

| 错误类型 | 说明 | 处理方式 |
|----------|------|----------|
| `ScriptSyntaxError` | 脚本语法错误 | 返回错误位置和提示 |
| `FieldNotFoundError` | 引用的字段不存在 | 返回错误字段名 |
| `WorkerTimeoutError` | Worker 执行超时 | 终止并重启 Worker |
| `WorkerCrashError` | Worker 崩溃 | 报告错误，保持表单可用 |
| `RecursionLimitError` | 触发链超过最大深度 | 阻止继续执行，输出警告 |

---

## 12. 代码范围

### 12.1 前端实现（hongs-form-web）

| 文件路径 | 说明 | 操作 |
|----------|------|------|
| `form/src/components/FormScript.vue` | 脚本组件（供 FormRenderer 嵌入） | 新建 |
| `form/src/utils/form-script.ts` | 脚本引擎（包含类型、Worker、执行器） | 新建 |
| `form/src/components/FormRenderer.vue` | 表单渲染器 | 修改（集成 FormScript 组件） |

### 12.2 文件职责

**1. form-script.ts**
- 类型定义（Action、FieldState、ScriptContext 等）
- Worker 脚本内容（内联字符串）
- 脚本执行器（管理 Worker 生命周期、事件联动、死循环检测）

**2. FormScript.vue**
- 接收 script 和 fields props
- 调用脚本引擎
- 监听字段变化触发脚本执行
- 返回字段状态给父组件

**3. FormRenderer.vue**
- 嵌入 FormScript 组件
- 根据返回的字段状态控制显示/隐藏

### 12.3 后端说明

后端仅存储脚本内容（`form.script` 字段），不执行脚本。脚本执行完全在前端 Web Worker 沙箱中完成，确保安全性。

---

## 13. AI 提示词模板

当需要 AI 生成脚本时，可使用以下提示词模板：

```
按照用户需求生成脚本，若无法满足需求，请提示用户。
可用对象：
- form 表单对象
- field 字段对象
可用方法：
- form.onChange(fieldName, (field) => {})
- form.onShow(fieldName, (field) => {})
- form.onHide(fieldName, (field) => {})
- form.field(fieldName)
- form.field(fieldName).hide()
- form.field(fieldName).show()
- form.field(fieldName).value()
- form.field(fieldName).value(value)
```
