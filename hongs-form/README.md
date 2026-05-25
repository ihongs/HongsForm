# hongs-form

基于 JSON Schema 模式的极简表单库。

与 JSON Schema 的最大区别在于：不仅验证、还要转换。故 `type=string` 也可以接受数字，`type=number` 也可以接受字符串，只要能够被转为数字即可。所有 `type` 都隐性包含 'null'，当处于 patch mode 时，null 视为将值设为 null，否则 (undefined) 视为不做变动。故单独的 `type=null` 没有意义，视作非存储的字段（仅用于前端显式），会被丢弃。这个 shcema 不仅用于校验、转换，还用于前端将其渲染为表单页面。

## 特性

- 无第三方依赖
- 支持类型转换（不仅校验还转换）
- 支持部分校验（补充、更新模式）
- 支持嵌套对象和数组校验
- 支持自定义校验函数
- 错误收集与层级展开

## 安装

```bash
npm install hongs-form
```

## 使用

### 基础用法

```typescript
import { validate, VError } from 'hongs-form';

const userSchema = {
  properties: {
    name: { type: 'string', required: true },
    age: { type: 'number', minimum: 18 },
    email: { type: 'string', format: 'email' },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  },
};

const user = {
  name: 'test',
  age: 20,
  email: 'test@example.com',
  tags: ['tag1', 'tag2'],
};

try {
  const result = validate(user, userSchema, {});
  console.log('校验通过:', result);
} catch (err) {
  if (err instanceof VError) {
    console.log('校验错误:', err.getErrors());
  }
}
```

### patchMode：部分更新模式

```typescript
// 只更新 name 字段，其他字段为 undefined 时会跳过校验
try {
  const result = validate({ name: 'test' }, userSchema, { patchMode: true });
  console.log('部分更新:', result);
} catch (err) {
  if (err instanceof VError) {
    console.log('错误:', err.getErrors());
  }
}
```

### 类型转换示例

```typescript
// hongs-form 会自动转换类型，不仅校验
const data = {
  age: '25', // 字符串数字会自动转为 number
  active: 'true', // 布尔字符串会自动转为 boolean
  tags: 'tag1,tag2,tag3' // 逗号分隔字符串会自动转为数组
};

const schema = {
  properties: {
    age: { type: 'number' },
    active: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

const result = validate(data, schema, {});
// 结果: { age: 25, active: true, tags: ['tag1', 'tag2', 'tag3'] }
```

## 高级用法

### 1. 自定义校验函数

```typescript
import { validate, VError, coreValidate } from 'hongs-form';

const userSchema = {
  properties: {
    username: {
      type: 'string',
      required: true,
      validate: [coreValidate, (value) => {
        // coreValidate 先执行默认校验（必填、字符串）
        if (value.length < 3) {
          throw new Error('用户名至少需要3个字符');
        }
        if (value.length > 20) {
          throw new Error('用户名不能超过20个字符');
        }
        return value.toLowerCase(); // 自动转换为小写
      }]
    },
    password: {
      type: 'string',
      required: true,
      validate: (value) => {
        // 完全自定义校验
        if (value.length < 8) {
          throw new Error('密码至少需要8个字符');
        }
        if (!/[A-Z]/.test(value)) {
          throw new Error('密码需要包含大写字母');
        }
        if (!/[0-9]/.test(value)) {
          throw new Error('密码需要包含数字');
        }
        return value; // 不做转换，直接返回
      }
    },
  },
};

try {
  const result = validate({
    username: 'AdminUser',
    password: 'MyPassword123'
  }, userSchema, {});
  // 结果: { username: 'adminuser', password: 'MyPassword123' }
  console.log(result);
} catch (err) {
  if (err instanceof VError) {
    console.log(err.getErrors());
  }
}
```

### 2. 复杂嵌套对象与数组

```typescript
import { validate, VError } from 'hongs-form';

const orderSchema = {
  properties: {
    orderNo: { type: 'string', required: true },
    createdAt: { type: 'string', inputType: 'datetime' },
    customer: {
      type: 'object',
      required: true,
      properties: {
        name: { type: 'string', required: true },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', pattern: '^1[3-9]\\d{9}$' },
        address: {
          type: 'object',
          properties: {
            province: { type: 'string', required: true },
            city: { type: 'string', required: true },
            detail: { type: 'string', required: true },
          },
        },
      },
    },
    items: {
      type: 'array',
      required: true,
      minItems: 1,
      maxItems: 50,
      uniqueItems: true,
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', required: true },
          productName: { type: 'string', required: true },
          price: { type: 'number', minimum: 0, required: true },
          quantity: { type: 'integer', minimum: 1, required: true },
        },
      },
    },
  },
};

const orderData = {
  orderNo: 'ORD-001',
  createdAt: new Date(), // 会自动转为 ISO 字符串
  customer: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    address: {
      province: '广东省',
      city: '深圳市',
      detail: '南山区科技园',
    },
  },
  items: [
    {
      productId: 'PROD-001',
      productName: '商品1',
      price: 99.99,
      quantity: 2,
    },
    {
      productId: 'PROD-002',
      productName: '商品2',
      price: 49.99,
      quantity: 1,
    },
  ],
};

try {
  const result = validate(orderData, orderSchema, {});
  console.log('订单校验通过:', result);
} catch (err) {
  if (err instanceof VError) {
    console.log('订单校验错误:', err.getErrors());
    // 错误示例: {
    //   "items": {
    //     "1": { "price": "number 必须大于等于 0" }
    //   }
    // }
  }
}
```

### 3. 条件校验与动态校验

```typescript
import { validate, VError, coreValidate, VPASS, VQUIT } from 'hongs-form';

// 基于字段的条件校验
const formSchema = {
  properties: {
    type: {
      type: 'string',
      required: true,
      enum: ['personal', 'company'],
    },
    personalId: {
      type: 'string',
      validate: [
        coreValidate,
        (value, schema, modes, state) => {
          // 从 state 中访问表单的其他字段值
          if (state?.parent?.values?.type !== 'personal') {
            return VQUIT; // 不是个人类型，跳过此校验
          }
          if (!value) {
            throw new Error('个人证件号不能为空');
          }
          if (!/^\d{17}[\dXx]$/.test(value)) {
            throw new Error('身份证号格式不正确');
          }
          return value;
        },
      ],
    },
    companyId: {
      type: 'string',
      validate: [
        coreValidate,
        (value, schema, modes, state) => {
          if (state?.parent?.values?.type !== 'company') {
            return VQUIT; // 不是公司类型，跳过此校验
          }
          if (!value) {
            throw new Error('公司证件号不能为空');
          }
          return value;
        },
      ],
    },
    amount: {
      type: 'number',
      required: true,
      minimum: 0,
      validate: [
        coreValidate,
        (value, schema, modes, state) => {
          const type = state?.parent?.values?.type;
          // 根据类型设置不同的金额限制
          if (type === 'personal' && value > 10000) {
            throw new Error('个人金额不能超过 10000');
          }
          if (type === 'company' && value > 1000000) {
            throw new Error('公司金额不能超过 1000000');
          }
          return value;
        },
      ],
    },
  },
};

// 测试个人类型
try {
  const personal = validate({
    type: 'personal',
    personalId: '110101199001011234',
    amount: 5000,
  }, formSchema, {});
  console.log('个人表单校验通过:', personal);
} catch (err) {
  if (err instanceof VError) {
    console.log('个人表单错误:', err.getErrors());
  }
}

// 测试公司类型
try {
  const company = validate({
    type: 'company',
    companyId: 'COMPANY-001',
    amount: 500000,
  }, formSchema, {});
  console.log('公司表单校验通过:', company);
} catch (err) {
  if (err instanceof VError) {
    console.log('公司表单错误:', err.getErrors());
  }
}
```

### 4. 国际化（i18n）

推荐在调用 `getErrors()` 或 `getData()` 时传入翻译器，这样不会影响全局状态：

```typescript
import { validate, VError } from 'hongs-form';

// 自定义翻译器
const chineseTranslator = (key: string, params?: Record<string, unknown>) => {
  const messages: Record<string, string> = {
    required: '此字段为必填项',
    number: '请输入有效的数字',
    integer: '请输入整数',
    boolean: '请输入布尔值',
    array: '请输入数组',
    object: '请输入对象',
    pattern: '格式不正确',
    format: '未知格式: {value}',
    date: '日期格式不正确',
    enum: '必须是允许的值之一',
    items: '某些项无效',
    properties: '某些属性无效',
    minimum: '最小值是 {value}',
    maximum: '最大值是 {value}',
    exclusiveMinimum: '必须大于 {value}',
    exclusiveMaximum: '必须小于 {value}',
    minLength: '最小长度是 {value}',
    maxLength: '最大长度是 {value}',
    minItems: '至少 {value} 项',
    maxItems: '最多 {value} 项',
    uniqueItems: '存在重复项',
    additionalItems: '不允许额外的项',
    minProperties: '至少 {value} 个属性',
    maxProperties: '最多 {value} 个属性',
    additionalProperties: '不允许额外的属性',
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
    // 在获取错误时传入翻译器
    const errors = err.getErrors(chineseTranslator);
    console.log(errors); // { email: '此字段为必填项' }
    
    // 或者获取完整的错误数据
    const errorData = err.getData(chineseTranslator);
    console.log(errorData);
    // {
    //   code: "form.invalid",
    //   errors: { email: '此字段为必填项' }
    // }
  }
}
```

如果需要在框架中统一设置翻译，可以使用全局设置（不推荐在业务代码中频繁使用）：

```typescript
import { validate, VError, setTranslator, getTranslator } from 'hongs-form';

// 框架初始化时统一设置
const originalTranslator = getTranslator();
setTranslator(chineseTranslator);

// 业务代码中使用
try {
  validate({}, schema, {});
} catch (err) {
  if (err instanceof VError) {
    const errors = err.getErrors(); // 使用全局翻译器
    console.log(errors);
  }
}

// 恢复原翻译器（可选）
setTranslator(originalTranslator);
```

## API

### validate(value, schema, modes)

主校验函数。

### 内置校验器

- `required` - 必填校验
- `requires` - 对象属性必填校验
- `isString` - 字符串校验与转换
- `isNumber` - 数字校验与转换
- `isInteger` - 整数校验与转换
- `isBoolean` - 布尔值校验与转换
- `isDateTime` - 日期时间校验与转换
- `isArray` - 数组校验与转换
- `isObject` - 对象校验与转换

### 控制流常量

- `VQUIT` - 中止后续校验
- `VPASS` - 跳过当前校验函数

### VError

错误类，包含 `errors` 属性和 `getErrors()`、`getData()` 方法。

`getErrors()` 返回:
```json
{
  "fieldName": "errorMessage",
  "arrayField": {
    "indexNumber": "errorMessage"
  },
  "objectField": {
    "subFieldName": "errorMessage"
  }
}
```

`getData()` 返回 `{code: "form.invalid", errors: getErrors()}`

## License

MIT
