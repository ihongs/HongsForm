import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Db, ObjectId } from 'mongodb';
import { McpAuthContext } from './auth.js';
import { z } from 'zod';
import { formValidate } from 'hongs-form';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function getFormUrl(formId: string): string {
  return `${BASE_URL}/form/${formId}`;
}

export function createAgentMcpServer(db: Db, auth: McpAuthContext): McpServer {
  const server = new McpServer(
    {
      name: 'hongs-form-mcp-agent',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const requireAuth = (): ObjectId => {
    if (!auth.authenticated || !auth.userId) {
      throw new Error('Unauthorized: valid Bearer token required');
    }
    return auth.userId;
  };

  server.registerTool(
    'form.list',
    {
      title: 'List Forms',
      description: '列出当前用户的表单',
      inputSchema: {
        page: z.number().optional().describe('页码，默认 1'),
        pageSize: z.number().optional().describe('每页数量，默认 20'),
        keyword: z.string().optional().describe('搜索关键词'),
        status: z.number().optional().describe('表单状态：1=草稿，2=已发布')
      }
    },
    async (params: any) => {
      const { page = 1, pageSize = 20, keyword = '', status } = params;
      const skip = (page - 1) * pageSize;
      const userId = requireAuth();

      const query: any = { userId, deletedAt: null };
      if (status !== undefined) query.status = status;
      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ];
      }

      const [items, total] = await Promise.all([
        db.collection('form')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        db.collection('form').countDocuments(query)
      ]);

      return {
        content: [{ type: 'text', text: JSON.stringify({ items, total, page, pageSize }) }]
      };
    }
  );

  server.registerTool(
    'form.get',
    {
      title: 'Get Form',
      description: '获取指定 ID 的表单详情',
      inputSchema: {
        id: z.string().describe('表单 ID')
      }
    },
    async (params: any) => {
      const { id } = params;
      if (!id) throw new Error('Form ID is required');

      const userId = requireAuth();

      const form = await db.collection('form').findOne({
        _id: new ObjectId(id),
        userId,
        deletedAt: null
      });

      if (!form) throw new Error('Form not found');

      const formWithUrl = {
        ...form,
        url: getFormUrl(form._id.toString())
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(formWithUrl) }]
      };
    }
  );

  server.registerTool(
    'form.create',
    {
      title: 'Create Form',
      description: '创建新表单',
      inputSchema: {
        name: z.string().describe('表单名称'),
        title: z.string().optional().describe('表单标题'),
        description: z.string().optional().describe('表单描述'),
        schema: z.object({}).describe('表单 schema'),
        config: z.object({
          anonymous: z.boolean().optional(),
          oncePerUser: z.boolean().optional(),
          maxSubmissions: z.number().optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional()
        }).optional().describe('表单配置'),
        icon: z.string().optional().describe('图标'),
        color: z.string().optional().describe('颜色')
      }
    },
    async (params: any) => {
      const { name, title, description, schema, config = {}, icon, color } = params;
      if (!name) throw new Error('Form name is required');
      if (!schema) throw new Error('Form schema is required');

      const userId = requireAuth();

      const validatedSchema = formValidate(schema);
      const now = new Date();
      const result = await db.collection('form').insertOne({
        userId,
        type: 'form',
        name,
        title: title || name,
        description: description || null,
        icon: icon || null,
        color: color || '#1890ff',
        schema: validatedSchema,
        config: {
          anonymous: false,
          oncePerUser: false,
          maxSubmissions: null,
          startAt: null,
          endAt: null,
          ...config
        },
        status: 1,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      });

      const formId = result.insertedId.toString();
      return {
        content: [{ type: 'text', text: JSON.stringify({ id: formId, url: getFormUrl(formId) }) }]
      };
    }
  );

  server.registerTool(
    'form.update',
    {
      title: 'Update Form',
      description: '修改表单',
      inputSchema: {
        id: z.string().describe('表单 ID'),
        name: z.string().optional().describe('表单名称'),
        title: z.string().optional().describe('表单标题'),
        description: z.string().optional().describe('表单描述'),
        schema: z.object({}).optional().describe('表单 schema'),
        config: z.object({}).optional().describe('表单配置'),
        icon: z.string().optional().describe('图标'),
        color: z.string().optional().describe('颜色'),
        status: z.number().optional().describe('状态：1=草稿，2=已发布')
      }
    },
    async (params: any) => {
      const { id, ...updateData } = params;
      if (!id) throw new Error('Form ID is required');

      const userId = requireAuth();

      const form = await db.collection('form').findOne({
        _id: new ObjectId(id),
        userId,
        deletedAt: null
      });
      if (!form) throw new Error('Form not found');

      const allowedFields = ['name', 'title', 'description', 'schema', 'config', 'icon', 'color', 'status'];
      const cleanUpdateData: any = { updatedAt: new Date() };

      for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
          if (key === 'schema') {
            cleanUpdateData.schema = formValidate(updateData.schema);
          } else {
            cleanUpdateData[key] = updateData[key];
          }
        }
      }

      if (cleanUpdateData.status === 2 && !form.publishedAt) {
        cleanUpdateData.publishedAt = new Date();
      }

      await db.collection('form').updateOne(
        { _id: new ObjectId(id) },
        { $set: cleanUpdateData }
      );

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, url: getFormUrl(id) }) }]
      };
    }
  );

  server.registerTool(
    'formData.list',
    {
      title: 'List Form Data',
      description: '列出指定表单的提交数据',
      inputSchema: {
        formId: z.string().describe('表单 ID'),
        page: z.number().optional().describe('页码，默认 1'),
        pageSize: z.number().optional().describe('每页数量，默认 20'),
        startDate: z.string().optional().describe('开始日期'),
        endDate: z.string().optional().describe('结束日期')
      }
    },
    async (params: any) => {
      const { formId, page = 1, pageSize = 20, startDate, endDate } = params;
      if (!formId) throw new Error('Form ID is required');

      const userId = requireAuth();

      const form = await db.collection('form').findOne({
        _id: new ObjectId(formId),
        userId,
        deletedAt: null
      });
      if (!form) throw new Error('Form not found');

      const skip = (page - 1) * pageSize;
      const query: any = { formId: new ObjectId(formId), deletedAt: null };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const [items, total] = await Promise.all([
        db.collection('formData')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        db.collection('formData').countDocuments(query)
      ]);

      return {
        content: [{ type: 'text', text: JSON.stringify({ items, total, page, pageSize }) }]
      };
    }
  );

  server.registerTool(
    'formData.get',
    {
      title: 'Get Form Data',
      description: '获取指定表单数据的详情',
      inputSchema: {
        id: z.string().describe('表单数据 ID')
      }
    },
    async (params: any) => {
      const { id } = params;
      if (!id) throw new Error('Form Data ID is required');

      const userId = requireAuth();

      const formData = await db.collection('formData').findOne({
        _id: new ObjectId(id),
        deletedAt: null
      });

      if (!formData) throw new Error('Form data not found');

      const form = await db.collection('form').findOne({
        _id: formData.formId,
        userId,
        deletedAt: null
      });
      if (!form) throw new Error('Form not found');

      return {
        content: [{ type: 'text', text: JSON.stringify(formData) }]
      };
    }
  );

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const FORM_PROMPT = readFileSync(join(__dirname, 'prompts', 'form.md'), 'utf-8');

  server.registerTool(
    'form.prompt',
    {
      title: 'Form Schema Prompt',
      description: '获取表单构建的提示词，帮助 AI 理解如何构建 FormSchema'
    },
    async () => {
      return {
        content: [{ type: 'text', text: FORM_PROMPT }]
      };
    }
  );

  return server;
}
