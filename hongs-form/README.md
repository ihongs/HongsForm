# hongs-form

基于 JSON Schema 模式的极简表单校验库。

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

```typescript
import { validate, required, isString, isNumber, VError, VQUIT, VPASS } from 'hongs-form';

// 基础校验
const schema = { type: 'string', required: true, minLength: 5 };
const result = validate('hello', schema, {});

// 对象校验
const userSchema = {
  properties: {
    name: { type: 'string', required: true },
    age: { type: 'number', minimum: 18 },
  },
};

try {
  validate({ name: 'test', age: 20 }, userSchema, {});
} catch (err) {
  if (err instanceof VError) {
    console.log(err.toMap());
  }
}

// patchMode：undefined 字段跳过校验
validate({ name: 'test' }, userSchema, { patchMode: true });
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

错误类，包含 `errors` 属性和 `toMap()` 方法。

## License

MIT
