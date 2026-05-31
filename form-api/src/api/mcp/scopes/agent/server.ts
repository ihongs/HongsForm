import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Db, ObjectId } from 'mongodb';
import { McpAuthContext } from './auth.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { formCreateSchema, formUpdateSchema } from '../../../../schemas/form.js';

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

  async function requireOwnedForm(userId: ObjectId, formId: string): Promise<any> {
    const form = await db.collection('forms').findOne({
      _id: new ObjectId(formId),
      userId,
      deletedAt: null
    });
    if (!form) throw new Error('Form not found');
    return form;
  }

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
      const userId = requireAuth();
      const { page = 1, pageSize = 20, keyword = '', status } = params;
      const skip = (page - 1) * pageSize;

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
        db.collection('forms')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        db.collection('forms').countDocuments(query)
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
      const userId = requireAuth();
      const { id } = params;
      if (!id) throw new Error('Form ID is required');

      const form = await db.collection('forms').findOne({
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
      description: '创建新表单，参考 form.prompt',
      inputSchema: {
        name: z.string().describe('表单名称'),
        title: z.string().optional().describe('表单标题'),
        description: z.string().optional().describe('表单描述'),
        fields: z.unknown().describe('表单字段定义'),
        config: z.record(z.string(), z.any()).optional().describe('表单配置'),
        script: z.string().optional().describe('表单脚本')
      }
    },
    async (params: any) => {
      const userId = requireAuth();

      const validatedData = formCreateSchema.parse(params);

      const now = new Date();
      const result = await db.collection('forms').insertOne({
        ...validatedData,
        userId,
        type: 'form',
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
      description: '修改表单，参考 form.prompt',
      inputSchema: {
        id: z.string().describe('表单 ID'),
        name: z.string().optional().describe('表单名称'),
        title: z.string().optional().describe('表单标题'),
        description: z.string().optional().describe('表单描述'),
        fields: z.unknown().optional().describe('表单字段定义'),
        config: z.record(z.string(), z.any()).optional().describe('表单配置'),
        script: z.string().optional().describe('表单脚本'),
        status: z.number().optional().describe('状态：1=草稿，2=已发布')
      }
    },
    async (params: any) => {
      const userId = requireAuth();
      if (!params.id) throw new Error('Form ID is required');

      const validatedData = formUpdateSchema.parse(params);

      const { id, ...updateData } = validatedData;
      (updateData as any).updatedAt = new Date();

      await db.collection('forms').updateOne(
        { _id: new ObjectId(id), userId: userId, deletedAt: null },
        { $set: updateData }
      );

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, url: getFormUrl(id) }) }]
      };
    }
  );

  server.registerTool(
    'formRecord.export',
    {
      title: 'Export Form Data',
      description: '导出指定表单的数据',
      inputSchema: {
        formId: z.string().describe('表单 ID'),
        skip: z.number().optional().describe('跳过数量'),
        limit: z.number().optional().describe('导出数量，默认 100')
      }
    },
    async (params: any) => {
      const userId = requireAuth();
      const { formId, limit, skip } = params;
      if (!formId) throw new Error('Form ID is required');

      requireOwnedForm(userId, formId);

      const query: any = { formId: new ObjectId(formId), deletedAt: null };

      const [items, total] = await Promise.all([
        db.collection('formRecords')
          .find(query)
          .sort({ createdAt: 1 })
          .skip(skip || 0)
          .limit(limit)
          .toArray(),
        db.collection('formRecords').countDocuments(query)
      ]);

      return {
        content: [{ type: 'text', text: JSON.stringify({ items, total, limit, skip }) }]
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