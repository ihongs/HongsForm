import { registerAdminMethod } from '../registry.js'
import { ObjectId } from 'mongodb'

// 测试表单配置
const testForms = [
  {
    name: 'user_survey',
    title: '用户满意度调查问卷',
    description: '感谢您抽出宝贵时间参与本次调查，您的反馈对我们非常重要。',
    icon: 'survey',
    color: '#1890ff',
    schema: {
      type: 'object',
      required: ['name', 'rating', 'satisfaction'],
      properties: {
        name: {
          type: 'string',
          title: '您的姓名',
          placeholder: '请输入您的姓名',
          minLength: 2,
          maxLength: 50
        },
        email: {
          type: 'string',
          title: '电子邮箱',
          placeholder: '请输入您的邮箱',
          pattern: '^.+@.+\\..+$'
        },
        rating: {
          type: 'integer',
          title: '整体满意度评分',
          inputType: 'radio',
          enum: [1, 2, 3, 4, 5],
          options: {
            1: '非常不满意',
            2: '不满意',
            3: '一般',
            4: '满意',
            5: '非常满意'
          }
        },
        satisfaction: {
          type: 'array',
          title: '您对哪些方面满意',
          inputType: 'checkbox',
          minItems: 1,
          items: {
            type: 'string',
            enum: ['product', 'service', 'price', 'support']
          },
          options: {
            product: '产品功能',
            service: '客户服务',
            price: '价格合理',
            support: '技术支持'
          }
        },
        feedback: {
          type: 'string',
          title: '改进建议',
          inputType: 'textarea',
          placeholder: '请告诉我们您的建议...',
          maxLength: 500
        },
        recommend: {
          type: 'boolean',
          title: '是否愿意推荐给朋友',
          inputType: 'radio',
          default: false
        }
      }
    },
    config: {
      anonymous: false,
      oncePerUser: false
    },
    status: 2
  },
  {
    name: 'contact_form',
    title: '联系我们',
    description: '有任何问题？请填写以下表单，我们会尽快回复您。',
    icon: 'contact',
    color: '#52c41a',
    schema: {
      type: 'object',
      required: ['name', 'phone', 'message'],
      properties: {
        name: {
          type: 'string',
          title: '姓名',
          placeholder: '请输入您的姓名'
        },
        phone: {
          type: 'string',
          title: '手机号',
          placeholder: '请输入您的手机号',
          pattern: '^1[3-9]\\d{9}$'
        },
        email: {
          type: 'string',
          title: '邮箱（选填）',
          placeholder: '请输入您的邮箱'
        },
        type: {
          type: 'string',
          title: '咨询类型',
          inputType: 'select',
          enum: ['general', 'sales', 'support', 'other'],
          options: {
            general: '一般咨询',
            sales: '销售咨询',
            support: '技术支持',
            other: '其他问题'
          }
        },
        message: {
          type: 'string',
          title: '留言内容',
          inputType: 'textarea',
          placeholder: '请详细描述您的问题...',
          minLength: 10,
          maxLength: 1000
        }
      }
    },
    config: {
      anonymous: true
    },
    status: 2
  },
  {
    name: 'registration',
    title: '活动报名表',
    description: '请填写以下信息完成报名。',
    icon: 'registration',
    color: '#eb2f96',
    schema: {
      type: 'object',
      required: ['realName', 'age', 'company'],
      properties: {
        realName: {
          type: 'string',
          title: '真实姓名',
          placeholder: '请输入您的真实姓名'
        },
        age: {
          type: 'integer',
          title: '年龄',
          placeholder: '请输入年龄',
          minimum: 18,
          maximum: 100
        },
        company: {
          type: 'string',
          title: '所在公司',
          placeholder: '请输入公司名称'
        },
        position: {
          type: 'string',
          title: '职位',
          placeholder: '请输入您的职位'
        },
        dietary: {
          type: 'string',
          title: '饮食偏好',
          inputType: 'select',
          enum: ['none', 'vegetarian', 'halal', 'vegan'],
          options: {
            none: '无特殊要求',
            vegetarian: '素食',
            halal: '清真',
            vegan: '纯素'
          }
        },
        remarks: {
          type: 'string',
          title: '备注',
          inputType: 'textarea',
          placeholder: '其他需要说明的信息'
        }
      }
    },
    config: {
      anonymous: false
    },
    status: 2
  }
]

// 导入测试表单
registerAdminMethod('test.importForms', async (params, ctx) => {
  const { userId } = params as { userId?: string }
  if (!userId) throw new Error('User ID is required')

  const now = new Date()
  const result = []

  for (const form of testForms) {
    const existing = await ctx.db.collection('forms').findOne({
      name: form.name,
      userId: new ObjectId(userId),
      deletedAt: null
    })

    if (existing) {
      result.push({ name: form.name, status: 'skipped', id: existing._id.toString() })
      continue
    }

    const insertResult = await ctx.db.collection('forms').insertOne({
      userId: new ObjectId(userId),
      type: 'form',
      ...form,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })

    result.push({ name: form.name, status: 'created', id: insertResult.insertedId.toString() })
  }

  return result
})

// 获取测试表单列表
registerAdminMethod('test.getForms', async () => {
  return testForms.map(f => ({
    name: f.name,
    title: f.title,
    description: f.description,
    fieldCount: Object.keys(f.schema.properties).length
  }))
})
