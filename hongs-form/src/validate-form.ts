import { Validate, FormSchema } from './types.js';
import { validate, isObject } from './validates.js';

// form schema 的 input 校准
export const isInput: Validate = function(value: any, schema: any, config: any) {
    if (!value.type) {
        switch (value.inputType) {
            case 'legend':
            case 'figure':
                value.type = 'null';
                break;
        }
    }
    return value;
};

// form schema 的 schema
export const formStruct: FormSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        required: { type: 'array', items: { type: 'string' } },
        properties: {
            type: 'object',
            required: true,
            properties: {},
            additionalProperties: {
                type: 'object',
                properties: {
                    title: { type: 'string', required: true },
                    description: { type: 'string' },
                    label: { type: 'string' },
                    placeholder: { type: 'string' },
                    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'date', 'null'] },
                    required: { type: 'boolean' },
                    format: { type: 'string' },
                    pattern: { type: 'string' },
                    minimum: { type: 'number' },
                    maximum: { type: 'number' },
                    minItems: { type: 'number' },
                    maxItems: { type: 'number' },
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
                    },
                    inputType: {
                        type: 'string',
                        enum: ['text', 'email', 'phone', 'textarea', 'number', 'range', 'select', 'check', 'radio', 'switch', 'datetime', 'date', 'time', 'file', 'legend', 'figure'],
                    }
                },
                validate: [ isObject, isInput ]
            }
        }
    }
};

// 校验表单结构
export const validateForm = function (schema: any) {
    return validate(schema, formStruct, {});
}

// 校验表单结构
// @deprecated 改用 validateForm 替代
export const formValidate = function (schema: any) {
    return validateForm(schema);
}
