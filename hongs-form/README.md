# hongs-form

基于 JSON Schema 模式的极简表单验证与转换库。

## 特性

- 无第三方依赖
- 支持类型转换（不仅校验还转换）
- 支持部分校验（补充、更新模式）
- 支持嵌套对象和数组校验
- 支持自定义校验函数
- 错误收集与层级展开
- MongoDB 和 MariaDB/MySQL 查询清理和 SQL 转换 

### 与标准 JSON Schema 的差异

适配 JSON Schema Draft-07 基础，不支持 `if/then/else/allOf/anyOf/oneOf/not` 及 `$ref/$defs` 等，一切复杂的逻辑都交给 `validate` 自定义校验函数。

与 JSON Schema 的最大区别在于：非静态规则，不仅验证、还要转换。`type=string` 可以接受数字，`type=number` 也可以接受字符串，只要可被转换即可。此库主要用于表单数据的存储、查询，`type` 仅支持一个值，因为一个字段多种类型会对存储、读取造成困扰。所有 `type` 都隐性包含 'null'，当处于 patch mode（部分更新），null 视为将值设为 null，undefined/缺失视为不做变动。故单独的 `type=null` 没有意义，视作非存储字段，仅用于前端显式，会被后端丢弃。如果字段不接受 null，加上 `required: true` 即可，null 和空串都会被拒绝。

`required: true` 表示所在层级的字段值不能为 `undefined`、`null`、空串，但 patch mode 会忽略 `undefined`。同时支持 JSON Schema 中的 `required: []` 下级属性约束。建议用前者，层级分明；前者的错误消息分层放置，后者的错误消息放在上层。

特别增加 `type=date`，这将转为 Date 对象，接受时间戳（毫秒）和 ISO 日期时间格式（YYYY-MM-DDTHH:mm:ss.sssZ）的字符串。也可用 `type=number|string` 加 `inputType=datetime|date|time`，这会转为时间戳或格式化的字符串。

### 增加及不同的配置项：

|---|---|
| `validate`    | 校验函数，一个或多个，参数 `(value, schema, config, state)`，抛错则当前字段校验中止。如需自定义校验前执行默认、必填、类型校验，可用 `validate: [baseValidate, yourValidate]`。 |
| `default`     | 默认取值，可以是具体的一个值、多个值，也可以是函数，参数同 `validate`。 |
| `defaultOn`   | 默认时机，可选 post 新增时、patch 更新时，以及 over-post、over-patch、over-always 覆盖。 |
| `inputType`   | 控件类型，可选 text、textarea、number、range、select、switch、radio、check（没 box）等。 |
| `options`     | 选项字典，对 `enum` 的补充，提供选项值对应的标签，以供前端构建选择控件及显示对应的标签。 |
| `title`       | 字段标题 |
| `description` | 字段帮助信息。 |
| `label`       | 表单页面字段标签。 |
| `placeholder` | 输入占位提示。 |
| `findable`    | 许可用于查询。 |
| `sortable`    | 许可用于排序。 |

### 校验函数 config 选项：

|---|---|
| `patchMode: true\|false` | 是否局部更新模式，为 true 忽略不存在的值和 undefined。 |
| `pickyMode: true\|false` | 是否错误敏感模式，为 true 遇首个错误立即中止全部校验。 |
| `ignoreErrors: true\|false` | 忽略错误，仅限 validateData、validateFind、validateSqls，用 validate 无效。比如查询，希望命中了哪些参数就用哪些参数查。 |
| `verifies:` | 一组 Verify 函数，即 `[(scheam) => ((value, schema, config, state) => {})]`，用于替代默认校验规则表。 |

## 安装

```bash
npm install hongs-form
```

## 快速开始

```typescript
import { validate, VError } from 'hongs-form';

const schema = {
  properties: {
    name: { type: 'string', required: true },
    age: { type: 'number', minimum: 18 },
  },
};

try {
  const result = validate({ name: 'test', age: '25' }, schema, {});
  console.log('结果:', result); // { name: 'test', age: 25 }
} catch (err) {
  if (err instanceof VError) {
    console.log('错误:', err.getErrors());
  }
}
```

## 核心用法

### 基础用法

```typescript
const userSchema = {
  properties: {
    name: { type: 'string', required: true },
    age: { type: 'number', minimum: 18 },
    email: { type: 'string', format: 'email' },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  },
};

// 正常校验
const result = validate({
  name: 'test',
  age: 20,
  email: 'test@example.com',
  tags: ['tag1', 'tag2'],
}, userSchema, {});
```

### patchMode：部分更新模式

```typescript
// 只更新部分字段，其他为 undefined 时会跳过
const result = validate({ name: 'test' }, userSchema, { patchMode: true });
```

### 类型转换

```typescript
// 会自动转换类型，不仅校验
const result = validate({
  age: '25',       // string -> number
  active: 'true',  // string -> boolean
  tags: 'a,b,c',   // string -> array
}, {
  properties: {
    age: { type: 'number' },
    active: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string' } },
  },
}, {});
// 结果: { age: 25, active: true, tags: ['a', 'b', 'c'] }
```

### 默认值

```typescript
// 使用 default 设置默认值
const result = validate({}, {
  properties: {
    title: { type: 'string', default: '无题' },
    updateAt: { type: 'string', default: () => new Date().toISOString() },
    createAt: { type: 'string', default: () => new Date().toISOString(), defaultOn: 'post' },
  },
}, { patchMode: false });
// 结果: { title: '无题', updateAt: '2026-05-26...', createAt: '2026-05-26...' }
// defaultOn: 'post' 新增时赋值(patchMode: false), 'patch' 更新时赋值(patchMode: true), 默认总赋值
```

### 自定义校验

```typescript
import { validate, VError, baseValidate } from 'hongs-form';

const schema = {
  properties: {
    username: {
      type: 'string',
      required: true,
      validate: [baseValidate, (value) => {
        if (value.length < 3) throw new Error('用户名至少3个字符');
        return value.toLowerCase();
      }],
    },
  },
};

const result = validate({ username: 'AdminUser' }, schema, {});
// 结果: { username: 'adminuser' }
```

### 嵌套对象与数组

```typescript
const orderSchema = {
  properties: {
    orderNo: { type: 'string', required: true },
    customer: {
      type: 'object',
      required: true,
      properties: {
        name: { type: 'string', required: true },
        email: { type: 'string', format: 'email' },
      },
    },
    items: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', required: true },
          price: { type: 'number', minimum: 0 },
        },
      },
    },
  },
};
```

### 条件校验

```typescript
import { validate, VError, baseValidate, VQUIT } from 'hongs-form';

const formSchema = {
  properties: {
    type: { type: 'string', required: true, enum: ['personal', 'company'] },
    personalId: {
      type: 'string',
      validate: [baseValidate, (value, schema, config, state) => {
        if (state?.parent?.values?.type !== 'personal') return VQUIT;
        if (!value) throw new Error('个人证件号不能为空');
        return value;
      }],
    },
    companyId: {
      type: 'string',
      validate: [baseValidate, (value, schema, config, state) => {
        if (state?.parent?.values?.type !== 'company') return VQUIT;
        if (!value) throw new Error('公司证件号不能为空');
        return value;
      }],
    },
  },
};

// 个人类型
validate({ type: 'personal', personalId: '110101199001011234' }, formSchema, {});

// 公司类型
validate({ type: 'company', companyId: 'COMPANY-001' }, formSchema, {});
```

### 国际化（i18n）

推荐在获取错误时传入翻译器，不影响全局：

```typescript
import { validate, VError } from 'hongs-form';

const chineseTranslator = (key: string, params?: Record<string, unknown>) => {
  const messages: Record<string, string> = {
    required: '此字段为必填项',
    number: '请输入有效的数字',
    minimum: '最小值是 {value}',
  };
  let message = messages[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(`{${k}}`, String(v));
    }
  }
  return message;
};

const schema = {
  properties: {
    email: { type: 'string', format: 'email', required: true },
    age: { type: 'number', minimum: 18 },
  },
};

try {
  validate({}, schema, {});
} catch (err) {
  if (err instanceof VError) {
    const errors = err.getErrors(chineseTranslator);
    console.log(errors); // { email: '此字段为必填项' }
  }
}
```

也可使用全局设置（框架统一使用）：

```typescript
import { setTranslator, getTranslator } from 'hongs-form';

const originalTranslator = getTranslator();
setTranslator(chineseTranslator); // 框架初始化时设置

// 后续使用
try {
  validate({}, schema, {});
} catch (err) {
  if (err instanceof VError) {
    const errors = err.getErrors(); // 使用全局翻译器
  }
}
setTranslator(originalTranslator); // 可选恢复
```

## API

### validate(value, schema, config, state?)

主校验函数。

### 内置校验器

- `defaults` - 默认赋值
- `required` - 必填校验
- `requires` - 对象属性必填校验
- `isString` - 字符串校验与转换
- `isNumber` - 数字校验与转换
- `isInteger` - 整数校验与转换
- `isBoolean` - 布尔值校验与转换
- `isDateTime` - 日期时间校验与转换
- `isArray` - 数组校验与转换
- `isObject` - 对象校验与转换
- `baseValidate` - 基础校验，按 schema 将以上都试试

### 控制流常量

- `VQUIT` - 中止后续校验
- `VPASS` - 跳过当前校验函数

### VState

- `getValues()` - 获取原始数据
- `getValids()` - 获取校验过的数据

### VError

错误类，包含 `errors` 属性和方法：

- `getErrors(translator?)` - 获取错误集合
- `getData(translator?)` - 获取错误数据 `{code, error, errors}`，用于 JSON RPC 错误响应

## License

MIT
