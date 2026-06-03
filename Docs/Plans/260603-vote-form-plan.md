# 投票表单功能开发计划

## 一、目标

实现独立的投票表单类型（`type: 'vote'`），支持表单提交后即时展示投票结果分布图表。

## 二、数据库变更

### 2.1 form 集合变更

#### 新增字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `counts` | Object | 否 | `{}` | 提交统计数据 |
| `countedAt` | Date | 否 | null | 统计数据的最后更新时间 |

#### counts 数据结构详解

`counts` 结构为 `{fieldName: {value: count}, __total__: number}`，包含各字段统计和总提交数。

**`__total__` 字段**：记录总提交记录数，用于多选字段百分比计算。
- 投票提交时 `__total__ += 1`
- 校准统计时重新计算

**单选字段（radio/select/switch）**

单选字段值为单个值，直接统计该值的出现次数：

```javascript
// 字段定义
{ name: "rating", inputType: "radio", enum: [1, 2, 3, 4, 5], countable: true }

// counts 结构
{ "rating": { "1": 10, "2": 25, "3": 45, "4": 60, "5": 30 }, "__total__": 170 }

// 百分比计算：total = 各选项票数总和 = 170
// "1": 10/170 = 5.9%, "2": 25/170 = 14.7%, ...
```

**多选字段（check）**

多选字段值为数组，每个选项独立统计出现次数：

```javascript
// 字段定义
{ name: "features", inputType: "check", enum: ["A", "B", "C"], countable: true }

// 提交数据示例：用户1选["A","B"]，用户2选["A"]，用户3选["B","C"]
// counts 结构（每个选项独立计数）
{ "features": { "A": 2, "B": 2, "C": 1 }, "__total__": 3 }

// 百分比计算方式：
// 按总投票人数计算（total = __total__ = 3）
//   "A": 2/3 = 66.7%, "B": 2/3 = 66.7%, "C": 1/3 = 33.3%
//   含义：有多少人选择了该选项
```

**百分比计算规则**

| 字段类型 | 百分比计算方式 | 说明 |
|----------|----------------|------|
| 单选（radio/select/switch） | `count / 各选项票数总和` | 总票数 = 各选项票数总和 |
| 多选（check） | `count / __total__` | __total__ = 总提交记录数 |

> 多选字段采用"按总投票人数"计算，更能反映"有多少人选择了该选项"的含义。

**counts 完整结构示例**

```javascript
{
  "__total__": 100,              // 总提交记录数
  "rating": { "1": 10, "2": 25, "3": 45, "4": 60, "5": 30 },  // 单选
  "features": { "A": 50, "B": 80, "C": 40 }                    // 多选
}
```

- `countedAt` 在每次统计数据更新时自动刷新

### 2.2 fields schema 变更

#### 新增 countable 属性

在 schema 字段配置中增加 `countable` 属性：

```javascript
{
  "name": "rating",
  "type": "integer",
  "inputType": "radio",
  "title": "满意度评分",
  "enum": [1, 2, 3, 4, 5],
  "countable": true  // 参与统计
}
```

#### countable 字段说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `countable` | Boolean | `false` | 标记该字段是否参与投票统计 |

#### countable 约束

- `countable: true` 仅对选项类字段有效：`select`、`check`、`radio`、`switch`
- 其他类型字段设置 `countable: true` 无效

## 三、投票表单业务规则

### 3.1 投票表单创建规则

| 规则 | 说明 |
|------|------|
| 表单类型 | `type` 必须为 `'vote'` |
| countable 字段 | 必须至少有一个选项类字段（select/check/radio/switch）设置 `countable: true` |
| 表单状态 | 发布后 (`status: 2`) 才能接收投票 |

### 3.2 校验时机

| 场景 | 校验规则 |
|------|----------|
| 创建表单 | 如果 `type: 'vote'` 但无 countable 选项字段，提示错误 |
| 发布表单 | 如果 `type: 'vote'` 但无 countable 选项字段，禁止发布 |
| 修改表单 | 如果关闭所有 countable 选项字段，提示警告 |

### 3.3 提交后行为

| 表单类型 | 提交后行为 |
|----------|------------|
| 普通表单 (`type: 'form'`) | 显示提交成功提示 |
| 投票表单 (`type: 'vote'`) | 显示提交成功 + 即时投票结果进度条 |

### 3.4 投票限制

投票限制与普通表单一致，复用现有 `oncePerPhone`、`oncePerEmail`、`oncePerGuest` 配置，不额外增加逻辑。

## 四、统计计算逻辑

### 4.1 counts 数据更新时机

| 触发条件 | 说明 |
|----------|------|
| 新增提交 | 提交成功后，更新对应选项的计数 |
| 校准统计 | 管理员手动触发，遍历表单数据重新计算 |

**注意**：admin/agent 对数据修改、删除后不会自动重算 counts，前端需提示用户点击"校准统计"按钮手动触发重算。

### 4.2 counts 更新流程

```
用户提交表单
    ↓
写入 formRecords
    ↓
获取表单级锁（仅锁当前表单的 counts 更新）
    ↓
更新 form.counts（原子操作 $inc）
    ↓
更新 form.countedAt
    ↓
释放锁
    ↓
返回提交结果 + counts
```

### 4.3 锁机制设计

**目标**：仅针对单个表单的 counts 更新加锁，不锁整个集合。

**方案**：使用 MongoDB 文档级乐观锁或 Redis 分布式锁。

```javascript
// 方案一：MongoDB 文档级锁（推荐，无额外依赖）
// 在 form 文档中增加 lockVersion 字段，使用乐观锁
db.forms.updateOne(
  { _id: formId, lockVersion: currentVersion },
  {
    $inc: { "counts.rating.2": 1 },
    $set: { countedAt: new Date(), lockVersion: currentVersion + 1 }
  }
)

// 方案二：Redis 分布式锁（如有 Redis）
const lockKey = `form:counts:${formId}`;
await redis.set(lockKey, '1', 'PX', 5000, 'NX');
// ... 更新 counts ...
await redis.del(lockKey);
```

### 4.4 校准统计流程

管理员在数据查看页点击"校准统计"按钮触发：

```
遍历 formRecords（status: 1）
    ↓
重新计算各 countable 字段的值分布
    ↓
覆盖更新 form.counts
    ↓
更新 form.countedAt
    ↓
返回校准结果
```

### 4.5 统计计算示例

假设初始状态：
```javascript
counts = { "rating": { "1": 5, "2": 10, "3": 20 } }
```

用户提交 `rating: 2` 后：
```javascript
counts = { "rating": { "1": 5, "2": 11, "3": 20 } }
countedAt = new Date()
```

## 五、前端展示

### 5.1 投票结果展示

提交成功后展示投票结果，使用简单进度条：

```
满意度评分
████████████████████░░░░░░░░  5星 (60票, 40%)
████████████░░░░░░░░░░░░░░░░  4星 (30票, 20%)
████████░░░░░░░░░░░░░░░░░░░░  3星 (20票, 13%)
████░░░░░░░░░░░░░░░░░░░░░░░░  2星 (10票, 7%)
██░░░░░░░░░░░░░░░░░░░░░░░░░░  1星 (5票, 3%)
```

### 5.2 展示组件

| 组件 | 说明 |
|------|------|
| `VoteResultBar` | 投票结果进度条组件，显示各选项的票数和百分比 |

### 5.3 数据格式

```javascript
// 图表数据转换函数
function transformCountsToBarData(form, counts) {
  const countableFields = form.fields.filter(f => f.countable);
  const totalRecords = counts.__total__ || 0;
  return countableFields.map(field => {
    const fieldCounts = counts[field.name] || {};
    const isMultiSelect = field.inputType === 'check';
    // 单选：总票数 = 各选项票数总和；多选：总票数 = counts.__total__
    const total = isMultiSelect 
      ? totalRecords 
      : Object.values(fieldCounts).reduce((a, b) => a + b, 0);
    return {
      name: field.title,
      fieldName: field.name,
      isMultiSelect,
      options: (field.enum || []).map(value => ({
        label: field.labels?.[value] || String(value),
        value,
        count: fieldCounts[value] || 0,
        percent: total > 0 ? Math.round((fieldCounts[value] || 0) / total * 100) : 0
      }))
    };
  });
}
```

## 六、API 接口变更

### 6.1 form 接口（公开）

| 接口 | 方法 | 说明 |
|------|------|------|
| `form.submit` | POST | 投票表单提交成功后返回 `counts` 数据 |
| `form.getCounts` | GET | 获取表单投票统计数据 |

#### form.submit 变更

投票表单提交成功后，返回结果增加 `counts` 字段：

```javascript
// 返回结果
{
  success: true,
  recordId: "xxx",
  counts: { "__total__": 35, "rating": { "1": 5, "2": 10, "3": 20 } }
}
```

#### form.getCounts

**请求参数：**
```javascript
{
  formId: string  // 表单 ID
}
```

**返回结果：**
```javascript
{
  counts: { "__total__": 15, "rating": { "1": 5, "2": 10 } },
  countedAt: "2024-01-15T12:00:00Z"
}
```

### 6.2 agent 接口（需登录）

| 接口 | 方法 | 说明 |
|------|------|------|
| `agent/form.recount` | POST | 校准统计，遍历表单数据重新计算 counts |

#### agent/form.recount

**请求参数：**
```javascript
{
  formId: string  // 表单 ID
}
```

**返回结果：**
```javascript
{
  success: true,
  counts: { "__total__": 15, "rating": { "1": 5, "2": 10 } },
  countedAt: "2024-01-15T12:00:00Z"
}
```

## 七、开发任务清单

### 7.1 后端任务

| 任务 | 说明 |
|------|------|
| 更新 Database.md | 添加 counts、countedAt 字段说明 |
| form 类型校验 | 创建/发布时校验 vote 类型必须有 countable 字段 |
| 提交接口改造 | 投票表单提交后更新 counts 并返回 |
| counts 更新锁机制 | 实现表单级锁，防止并发更新冲突 |
| recount 接口 | 实现校准统计接口 |
| admin/agent 页面 | 数据查看页增加"校准统计"按钮 |

### 7.2 前端任务

| 任务 | 说明 |
|------|------|
| 表单设计页改造 | 投票类型时，选项字段增加"投票计数"开关（countable） |
| VoteResultBar 组件 | 投票结果进度条组件 |
| 表单提交页改造 | 投票表单提交后展示投票结果 |
| 统计结果页 | 独立路径 `/form/counts/:formId`，支持直接查看投票统计结果 |
| 数据查看页改造 | 投票表单数据修改/删除后提示用户点击"校准统计"按钮 |

