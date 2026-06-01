import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { connectDb, closeDb } from '../utils/db.js';
import { loadEnv } from '../utils/env.js';

function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

const users = [
  {
    username: 'admin',
    password: 'admin123',
    roles: ['admin'],
    nickname: '管理员'
  },
  {
    username: 'agent',
    password: 'agent123',
    roles: ['agent'],
    nickname: '测试用户'
  }
];

const testForms = [
  {
    name: 'user_survey',
    title: '用户满意度调查问卷',
    description: '感谢您抽出宝贵时间参与本次调查，您的反馈对我们非常重要。',
    fields: [
      {
        name: 'name',
        type: 'string',
        title: '您的姓名',
        placeholder: '请输入您的姓名',
        minLength: 2,
        maxLength: 50,
        required: true
      },
      {
        name: 'email',
        type: 'string',
        title: '电子邮箱',
        placeholder: '请输入您的邮箱',
        format: 'email'
      },
      {
        name: 'rating',
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
        },
        required: true
      },
      {
        name: 'satisfaction',
        type: 'array',
        title: '您对哪些方面满意',
        inputType: 'check',
        required: true,
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
      {
        name: 'feedback',
        type: 'string',
        title: '改进建议',
        inputType: 'textarea',
        placeholder: '请告诉我们您的建议...',
        maxLength: 500
      },
      {
        name: 'recommend',
        type: 'boolean',
        title: '是否愿意推荐给朋友',
        inputType: 'switch',
        default: false
      }
    ],
    config: {
      oncePerUser: false
    },
    status: 2
  },
  {
    name: 'contact_form',
    title: '联系我们',
    description: '有任何问题？请填写以下表单，我们会尽快回复您。',
    fields: [
      {
        name: 'name',
        type: 'string',
        title: '姓名',
        placeholder: '请输入您的姓名',
        required: true
      },
      {
        name: 'phone',
        type: 'string',
        title: '手机号',
        inputType: 'phone',
        placeholder: '请输入您的手机号',
        pattern: '^1[3-9]\\d{9}$',
        required: true
      },
      {
        name: 'email',
        type: 'string',
        title: '邮箱（选填）',
        inputType: 'email',
        placeholder: '请输入您的邮箱',
        format: 'email'
      },
      {
        name: 'type',
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
      {
        name: 'message',
        type: 'string',
        title: '留言内容',
        inputType: 'textarea',
        placeholder: '请详细描述您的问题...',
        minLength: 10,
        maxLength: 1000,
        required: true
      }
    ],
    config: {
      oncePerUser: false
    },
    status: 2
  },
  {
    name: 'registration',
    title: '活动报名表',
    description: '请填写以下信息完成报名。',
    icon: 'registration',
    color: '#eb2f96',
    fields: [
      {
        name: 'realName',
        type: 'string',
        title: '真实姓名',
        placeholder: '请输入您的真实姓名',
        required: true
      },
      {
        name: 'age',
        type: 'integer',
        title: '年龄',
        placeholder: '请输入年龄',
        minimum: 18,
        maximum: 100,
        required: true
      },
      {
        name: 'company',
        type: 'string',
        title: '所在公司',
        placeholder: '请输入公司名称',
        required: true
      },
      {
        name: 'position',
        type: 'string',
        title: '职位',
        placeholder: '请输入您的职位'
      },
      {
        name: 'dietary',
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
      {
        name: 'remarks',
        type: 'string',
        title: '备注',
        inputType: 'textarea',
        placeholder: '其他需要说明的信息'
      }
    ],
    config: {
      oncePerUser: true
    },
    status: 2
  }
];

async function ensureUser(db: any, user: typeof users[number]) {
  const existing = await db.collection('users').findOne({ username: user.username, deletedAt: null });
  if (existing) {
    return { status: 'skipped', id: existing._id };
  }

  const passsalt = generateSalt();
  const now = new Date();
  const result = await db.collection('users').insertOne({
    username: user.username,
    password: hashPassword(user.password, passsalt),
    passsalt,
    roles: user.roles,
    nickname: user.nickname,
    email: null,
    phone: null,
    avatar: null,
    status: 1,
    settings: {},
    lastLoginIp: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { status: 'created', id: result.insertedId };
}

async function ensureForm(db: any, userId: ObjectId, form: typeof testForms[number]) {
  const existing = await db.collection('forms').findOne({ name: form.name, userId, deletedAt: null });
  if (existing) {
    return { status: 'skipped', id: existing._id };
  }

  const now = new Date();
  const result = await db.collection('forms').insertOne({
    userId,
    type: 'form',
    ...form,
    dataCount: 0,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  return { status: 'created', id: result.insertedId };
}

async function main() {
  const env = loadEnv();
  const db = await connectDb(env.MONGODB_URI || 'mongodb://localhost:27017/hongs_form');

  const userResults = new Map<string, Awaited<ReturnType<typeof ensureUser>>>();
  for (const user of users) {
    const result = await ensureUser(db, user);
    userResults.set(user.username, result);
    console.log(`user ${user.username}: ${result.status} ${result.id.toString()}`);
  }

  const admin = userResults.get('admin');
  if (!admin) throw new Error('Admin user not initialized');

  const agent = userResults.get('agent');
  if (!agent) throw new Error('Agent user not initialized');

  for (const form of testForms) {
    const result = await ensureForm(db, agent.id, form);
    console.log(`form ${form.name}: ${result.status} ${result.id.toString()}`);
  }

  console.log('test init completed');
  console.log('admin login: admin / admin123');
  console.log('agent login: agent / agent123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
