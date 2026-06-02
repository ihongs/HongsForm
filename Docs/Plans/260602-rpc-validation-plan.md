# RPC 接口校验强化计划

## 一、目标

检查所有 RPC 接口的参数校验情况，找出缺少校验的接口，确保数据完整性和安全性。

## 二、当前校验情况分析

### 2.1 接口校验状态汇总

#### 已完成校验的接口

| 接口文件 | 校验状态 | 备注 |
|----------|----------|------|
| admin/mine.ts | ✅ 已统一 | 使用 Zod 校验，与 agent/mine.ts 保持一致 |
| admin/form.ts | ✅ 已检查 | admin 接口采用宽松策略 |
| agent/form.ts | ✅ 良好 | 通过 `findOwnedForm` 验证归属 |
| agent/formRecord.ts | ✅ 良好 | 通过 `requireOwnedForm`/`requireOwnedFormData` 验证归属 |
| form/formRecord.ts | ✅ 良好 | 通过查询表单验证外键 |
| shared/users.ts | ✅ 良好 | 使用 Zod 校验 |

#### 待优化的接口

| 接口文件 | 问题描述 | 优先级 |
|----------|----------|--------|
| admin/formRecord.ts | update 缺少数据校验 | 低 |
| admin/user.ts | list 参数无校验 | 低 |

### 2.2 外键校验策略

根据业务需求，采用分层校验策略：

| 接口类型 | 外键校验策略 | 说明 |
|----------|--------------|------|
| **admin 接口** | 宽松处理 | 直接使用参数查询，查不到自然报错 |
| **agent 接口** | 严格校验 | 通过 `requireOwnedForm` 等方法验证数据归属 |
| **公开接口** | 严格校验 | 查询关联数据验证外键有效性 |

### 2.3 已完成的改造

**1. admin/mine.ts 统一校验**

将手动 if 校验替换为 Zod 校验：

```typescript
const updateNicknameSchema = z.object({
  nickname: z.string().min(1).max(50)
});

const bindPhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  verifyCode: z.string().min(1)
});

const bindEmailSchema = z.object({
  email: z.string().email()
});
```

**2. agent 接口外键校验**

所有 agent 接口均通过 `findOwnedForm`、`requireOwnedForm`、`requireOwnedFormData` 等方法验证数据归属：

```typescript
registerAgentMethod('form.get', async (params, ctx) => {
  const { id } = params as any;
  if (!id) throw new Error('Form ID is required');
  return findOwnedForm(ctx, id);  // 验证表单归属
});
```

**3. 公开接口外键校验**

通过查询关联数据验证外键：

```typescript
const form = await ctx.db.collection('forms').findOne({
  _id: new ObjectId(formId),
  deletedAt: null,
  status: 2
});
if (!form) throw new Error('Form not found');
```

## 三、核心校验原则

### 3.1 外键校验原则

> **核心思想**：外键校验的本质是验证数据关系的有效性，而非单纯验证格式。

1. **admin 接口**：信任管理员操作，直接使用参数，数据库查询失败时自然报错
2. **agent 接口**：必须验证数据归属关系，确保用户只能操作自己的数据
3. **公开接口**：必须验证外键对应的数据存在且状态正常

### 3.2 数据完整性校验

| 操作类型 | 校验要求 |
|----------|----------|
| **create** | 必须校验必填字段，外键字段可选校验 |
| **update** | 必须校验更新字段，外键变更需额外验证 |
| **delete** | 验证数据存在即可 |
| **list/get** | 参数校验宽松，主要依赖数据库查询 |

### 3.3 安全校验层次

```
┌─────────────────────────────────────────────────────────┐
│                    公开接口层                           │
│  - 验证表单存在且已发布                                 │
│  - 验证验证码（如有）                                   │
│  - 验证重复提交限制（如有）                             │
├─────────────────────────────────────────────────────────┤
│                    Agent 接口层                         │
│  - 验证用户登录状态                                     │
│  - 验证数据归属（用户只能操作自己的数据）                │
├─────────────────────────────────────────────────────────┤
│                    Admin 接口层                         │
│  - 验证管理员权限                                       │
│  - 宽松的数据校验（信任管理员操作）                      │
└─────────────────────────────────────────────────────────┘
```

## 四、后续优化建议

### 4.1 低优先级优化

1. **admin/formRecord.ts**：为 `update` 方法添加数据字段校验
2. **admin/user.ts**：为 `list` 方法添加分页参数校验
3. **统一错误消息格式**：标准化错误返回格式

### 4.2 代码质量改进

1. **提取通用校验逻辑**：将重复的校验逻辑抽取为工具函数
2. **类型安全**：为所有接口添加 TypeScript 类型定义
3. **文档完善**：为关键接口添加 JSDoc 注释

## 五、总结

当前 RPC 接口的校验体系已经基本完善：

- ✅ **admin/mine.ts** 已与 agent/mine.ts 统一使用 Zod 校验
- ✅ **agent 接口** 均有完善的数据归属验证
- ✅ **公开接口** 均有外键有效性验证
- ✅ **create/update 操作** 均有参数校验
- ✅ **admin 接口** 采用宽松策略，符合管理员操作特性

核心校验策略：**外键校验的本质是验证数据关系有效性，而非格式验证**。对于 admin 接口宽松处理，对于 agent 和公开接口严格校验数据归属和存在性。
