# hongs-form

基于 JSON Schema 模式的极简表单验证与转换库。

为何不用 **AJV** 等？没为什么，只是单纯想做个极简的，能做基本校验转换即可。

校验通过返回转换后的数据；否则抛出异常/错误，而非返回 `true/false`。这样编程身心负担小，有错抛出异常就中止，接口统一包装识别处理错误数据。异常有 `getErrors()`，可返回类似 AJV 的错误列表 `[{ message, keyword, params, instancePath, instanceName}]`。

## 特性

- 无第三方依赖
- 支持类型转换（不仅校验还转换）
- 支持部分校验（补充、更新模式）
- 支持嵌套对象和数组校验
- 支持自定义校验函数
- 错误收集与层级拉平
- MongoDB 和 MariaDB/MySQL 查询清理和 SQL 转换 

### 与标准 JSON Schema 的差异

适配 JSON Schema Draft-07 部分规范，不支持 `if/then/else/allOf/anyOf/oneOf/not` 及 `$ref/$defs` 等，一切复杂的逻辑都交给 `validate` 自定义校验函数。

`type=string` 可以接受数字，`type=number` 也可以接受字符串，只要可被转换即可。此库主要用于表单数据的存储、查询，`type` 仅支持一个值，因为一个字段多种类型会对存储、读取造成困扰。所有 `type` 都隐性包含 'null'，当处于 patch mode（部分更新），null 视为将值设为 null，undefined/缺失视为不做变动。故单独的 `type=null` 没有意义，视作非存储字段（保留给前端表单用）。如果字段不接受 null，加上 `required: true` 即可，null 和空串都会被拒绝。

`required: true` 表示所在层级的字段值不能为 `undefined`、`null`、空串，但 patch mode 会忽略 `undefined`。同时支持 JSON Schema 中的 `required: []` 下级属性约束。建议用前者，层级分明；前者的错误消息分层放置，后者的错误消息放在上层。

特别增加 `type=date`，这将转为 Date 对象，接受时间戳（毫秒）和 ISO 日期时间格式（YYYY-MM-DDTHH:mm:ss.sssZ）的字符串。也可用 `type=number|string` 加 `inputType=datetime|date|time`，这会转为时间戳或格式化的字符串。

### 增加的配置项：

| 配置项 | 说明 |
|--------|------|
| `validate`    | 校验函数，一个或多个，参数 `(value, schema, config, state)`，抛错则当前字段校验中止。如需自定义校验前执行默认、必填、类型校验，可用 `validate: [baseValidate, yourValidate]`。 |
| `defined`     | 预设取值，可为一个值、多个值，也可为函数，参数同 `validate`。 |
| `definedOn`   | 默认时机，可选 post 新增时、patch 更新时、always 总是(默认)。 |
| `inputType`   | 控件类型，可选 text、textarea、number、range、select、switch、radio、check（没 box）等。 |
| `options`     | 选项字典，对 `enum` 的补充，提供选项值对应的标签，以供前端构建选择控件及显示对应的标签。 |
| `ignores`     | 忽略取值, 用于 `array` 类型，默认 `[undefined, null, '']` |
| `title`       | 字段标题。 |
| `description` | 字段帮助信息。 |
| `label`       | 表单标签。 |
| `placeholder` | 表单占位提示。 |
| `findable`    | 许可用于查询。 |
| `sortable`    | 许可用于排序。 |

`title`、`description` 没变，放这儿与 `label`、`placeholder` 对比。`label` 缺失时用 `title` 替代。`label` 的意义是有用户喜欢在表单里用长名称并加序号，导致数据表格的表头很难看。

### 校验器配置项：

| 选项 | 说明 |
|------|------|
| `patchMode: true\|false` | 是否局部更新模式，为 true 忽略不存在的值和 undefined。 |
| `pickyMode: true\|false` | 是否错误敏感模式，为 true 遇首个错误立即中止全部校验。 |
| `ignoreErrors: true\|false` | 忽略错误，仅限 validateData、validateFind、validateSqls，用 validate 无效。比如用于查询，希望命中了哪些就用哪些查。 |
| `verifies: [(schema) => ((value, schema, config, state) => {})]` | 一组 Verify 函数，用于判断什么 schema 用什么来校验，可用于替代默认校验规则表。 |
| `quotoType: 'QUOTE\|BTICK\|BRACK'` | 字段引号类型，分别是双引号、反引号、方括号，默认为反引号，也可以写 `quoteType: '""'`。 |
| `levelSep: '.\|__'` | 字段层级分隔，点或双下划线，默认双下划线。 |

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

### 预设值

```typescript
// 使用 defined 设置预设值
const result = validate({}, {
  properties: {
    title: { type: 'string', defined: '无题' },
    updateAt: { type: 'string', defined: () => new Date().toISOString() },
    createAt: { type: 'string', defined: () => new Date().toISOString(), definedOn: 'post' },
  },
}, { patchMode: false });
// 结果: { title: '无题', updateAt: '2026-05-26...', createAt: '2026-05-26...' }
// definedOn: 'post' 新增时赋值(patchMode: false), 'patch' 更新时赋值(patchMode: true), 默认总赋值
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
    console.log(errors); // [ { message: '此字段为必填项', key: 'required', instanceName: 'email', instancePath: '/email' } ]
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

## MongoDB 查询转换（validateFind）

`validateFind` 用于将查询参数转换为 MongoDB 查询格式。

```typescript
import { validateFind } from 'hongs-form';

// 查询参数
const params = {
  name: '张三',
  age: { $gte: 18 },
  sort: ['age', '-status'],
  cols: ['name']
  skip: 10,
  limit: 20
};

// 字段配置
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', findable: true },
    age: { type: 'integer', findable: true, sortable: true }
  }
};

const result = validateFind(params, schema, {});
```

**返回结构**：
```typescript
{
  find: { name: '张三', age: { '$gte': 18 } },  // 查询条件（对象）
  sort: { age: 1, status: -1 },                 // 排序对象 {field: 1|-1}
  cols: { name: 1 }                             // 投影对象 {field: 1|0}
  skip: 10,                                     // 跳过行数
  limit: 20,                                    // 返回行数
}
```

**排序格式支持**：
- 对象格式：`{ age: 1, status: -1 }`
- 数组格式（-前缀降序）：`['age', '-status']`
- 数组格式（!后缀降序）：`['age', 'status!']`

为规避客户端 JSON 对象可能无法保障顺序的问题，支持数组格式的排序参数。所有格式统一转换为 MongoDB 标准对象格式：`{ age: 1, status: -1 }`

## SQL 查询转换（validateSqls）

`validateSqls` 用于将 MongoDB 风格的查询参数转换为 SQL 语句，支持 MariaDB/MySQL 等数据库。该函数从 schema 内部读取表名、别名、关联等。

### 完整示例

```typescript
import { validateSqls } from 'hongs-form';

const userSchema = {
  type: 'object',
  tableName: 'users',
  nameAs: 'user',
  properties: {
    id: { type: 'string', findable: true },
    name: { type: 'string', findable: true },
    age: { type: 'integer', findable: true, sortable: true },
    dept: {
      type: 'object',
      tableName: 'departments',
      nameAs: 'dept',
      joinOn: 'dept.id = user.dept_id',
      properties: {
        id: { type: 'string', findable: true },
        name: { type: 'string', findable: true },
        boost: { type: 'integer', findable: true, sortable: true },
        company: {
          type: 'object',
          tableName: 'companys',
          joinOn: 'company.id = dept.company_id',
          joinType: 'LEFT',
          properties: {
            id: { type: 'string', findable: true },
            name: { type: 'string', findable: true }
          }
        }
      }
    }
  }
};

const params = {
  cols: ['id', 'name', 'age', 'dept__name', 'dept__company__name'],
  sort: ['age', '-dept__boost'],  // 支持数组格式，-前缀表示降序
  age: { $gte: 18 },
  dept: {
    company: { id: '1' }
  },
  skip: 20,
  limit: 10
};

const result = validateSqls(params, userSchema, {});

// 获取 SQL 片段
console.log(result.select);  // `user`.`id`, `user`.`name`, `user`.`age`, `dept`.`name` AS `dept__name`, `dept__company`.`name` AS `dept__company__name`
console.log(result.where);   // `user`.`age` >= ? AND `dept__company`.`id` = ?
console.log(result.order);   // `user`.`age` ASC, `dept`.`boost` DESC
console.log(result.skip);    // 20
console.log(result.limit);   // 10
console.log(result.whereParams);  // [18, '1']

// 生成完整 SQL
const sql = result.getSql();
// SELECT `user`.`id`, `user`.`name`, `user`.`age`, `dept`.`name` AS `dept__name`, `dept__company`.`name` AS `dept__company__name`
// FROM `users` AS `user`
// INNER JOIN `departments` AS `dept` ON `dept`.`id` = `user`.`dept_id`
// LEFT JOIN `companys` AS `dept__company` ON `company`.`id` = `dept`.`company_id`
// WHERE `user`.`age` >= ? AND `dept__company`.`id` = ?
// ORDER BY `user`.`age` ASC, `dept`.`boost` DESC
```

### 功能特性

#### 1. 查询条件
支持 MongoDB 风格的查询操作符：
- 比较操作符：`$eq`, `$ne`, `$lt`, `$lte`, `$gt`, `$gte`
- 逻辑操作符：`$and`, `$or`
- 数组操作符：`$in`, `$nin`
- 其他操作符：`$exists`, `$regex`

#### 2. 排序支持
支持多种排序格式输入：
- 对象格式：`{ age: 1, group__boost: -1 }`（MongoDB 风格）
- 数组格式：`['age', '-group__boost']`，`['age', 'group__boost!']`（`-`前缀和`!`后缀都表示降序）

#### 3. 表关联
通过 schema 内部定义表关联：
- `tableName` - 表名
- `nameAs` - 表的别名，仅顶层配置，下级键即别名
- `joinOn` - 关联条件，仅下层配置，关联上层条件（**注意**：`joinOn` 需根据数据库类型自行处理字段引用格式）
- `joinType` - 关联类型（INNER/LEFT/RIGHT/FULL，默认 INNER）

#### 4. 分页处理
`skip` 和 `limit` 参数用于分页，但不会直接写入 SQL：

```typescript
result.skip;   // 跳过的行数
result.limit;  // 返回的行数
```

**注意**：由于不同数据库的分页语法差异较大（MariaDB/MySQL 使用 `LIMIT offset, count`，PostgreSQL 使用 `LIMIT count OFFSET offset`，SQL Server 使用 `ROW_NUMBER()`），分页逻辑需要在应用层根据数据库类型自行处理。

#### 5. 返回字段
通过 `cols` 参数指定返回字段，支持双下划线格式表示关联表字段：

```typescript
cols: ['id', 'name', 'group__name']
// 生成: `user`.`id`, `user`.`name`, `group`.`name` AS `group__name`
```

#### 6. 字段引用配置
通过 `config.quoteType` 参数指定字段引用规则，适配不同数据库的语法要求：

```typescript
// MariaDB/MySQL（默认）- 使用反引号
validateSqls(params, schema, { quoteType: 'BTICK' });
// 生成: `user`.`name`

// ANSI_QUOTES 模式 - 使用双引号
validateSqls(params, schema, { quoteType: 'QUOTE' });
// 生成: "user"."name"

// SQL Server - 使用方括号
validateSqls(params, schema, { quoteType: 'BRACK' });
// 生成: [user].[name]
```

| 参数值 | 说明 | 示例 |
|--------|------|------|
| `BTICK` | MariaDB/MySQL 反引号（默认） | `` `user`.`name` `` |
| `QUOTE` | ANSI_QUOTES 双引号 | `"user"."name"` |
| `BRACK` | SQL Server 方括号 | `[user].[name]` |

**注意**：quote 只是简单的给表名、别名、字段名首尾加符号；schema 默认为内部静态配置，切勿让用户外部指定。

#### 7. 安全特性
- 仅允许 schema 中配置了 `findable: true` 的字段用于查询
- 仅允许 schema 中配置了 `sortable: true` 的字段用于排序
- 所有值通过参数化查询传递，防止 SQL 注入
- 未配置的字段会被自动过滤或拒绝

## API

### validate(value, schema, config, state?)

主校验函数。

### 内置校验器

- `defineds` - 预设赋值
- `defaults` - 默认赋值
- `optional` - 选填校验
- `required` - 必填校验
- `requires` - 对象属性必填校验
- `isString` - 字符串校验与转换
- `isNumber` - 数字校验与转换
- `isInteger` - 整数校验与转换
- `isBoolean` - 布尔值校验与转换
- `isDateTime` - 日期时间校验与转换
- `isArray` - 数组校验与转换
- `isObject` - 对象校验与转换
- `baseValidate` - 基础校验，按 schema 将以上都试一遍

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
