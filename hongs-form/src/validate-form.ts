import { Validate, FormSchema, VError } from './types.js';
import { validate, isObject } from './validates.js';

// 表单 input 校准
export const isInput: Validate = function(value: any, schema: any, config: any) {
    if (value.default) {
        if (value.type === 'array') {
            if (!Array.isArray(value.default)) {
                throw new VError('default must be array if type is array');
            }
        } else {
            if ( Array.isArray(value.default)) {
                throw new VError('default cannot be array if type is not array');
            }
        }
    } else if (!value.type) {
        switch (value.inputType) {
            case 'tags':
                value.type = 'array';
                break;
            case 'legend':
            case 'figure':
                value.type = 'null';
                break;
        }
    }
    return value;
};

// 表单字段集合
export const formFields: FormSchema = {
    type: 'array',
    required: true,
    items: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                required: true,
                pattern: '/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/',
            },
            inputType: {
                type: 'string',
                required: true,
                pattern: '/^[a-zA-Z][a-zA-Z0-9_]{1,10}$/',
            },
            title: { type: 'string', required: true },
            description: { type: 'string' },
            label: { type: 'string' },
            placeholder: { type: 'string' },
            type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'date', 'null'] },
            required: { type: 'boolean' },
            default: { type: 'any' },
            format: { type: 'string' },
            pattern: { type: 'string' },
            minimum: { type: 'number' },
            minimumExclusive: { type: 'boolean' },
            maximum: { type: 'number' },
            maximumExclusive: { type: 'boolean' },
            minItems: { type: 'number' },
            minItemsExclusive: { type: 'boolean' },
            maxItems: { type: 'number' },
            maxItemsExclusive: { type: 'boolean' },
            minLength: { type: 'number' },
            minLengthExclusive: { type: 'boolean' },
            maxLength: { type: 'number' },
            maxLengthExclusive: { type: 'boolean' },
            enum: {
                type: 'array'
            },
            items: {
                type: 'object'
            },
            options: {
                type: 'object',
                properties: {},
                additionalProperties: { type: 'string' }
            }
        },
        validate: [ isObject, isInput ]
    }
};

// 校验表单字段集合
export const validateFields = function (fields: any) {
    return validate(fields, formFields, {});
}

// 字段集合转表结构，以便校验表单数据
export const fieldsToSchema = function (fields: any) {
    const properties:any = {};
    for(let i = 0; i < fields.length; i ++) {
        let field = fields[i];
        properties[field.name] = field;
    }
    return { properties, type: 'object' }
}
