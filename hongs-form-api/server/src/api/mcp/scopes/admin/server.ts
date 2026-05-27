import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Db, ObjectId } from 'mongodb';
import { McpAdminAuthContext, requireAdminAuth } from './auth.js';
import { z } from 'zod';

export function createAdminMcpServer(db: Db, auth: McpAdminAuthContext): McpServer {
  const server = new McpServer(
    {
      name: 'hongs-form-mcp-admin',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const requireAuth = (): ObjectId => {
    return requireAdminAuth(auth);
  };

  server.registerTool(
    'user.list',
    {
      title: 'List Users',
      description: '列出所有用户',
      inputSchema: {
        page: z.number().optional().describe('页码，默认 1'),
        pageSize: z.number().optional().describe('每页数量，默认 20'),
        keyword: z.string().optional().describe('搜索关键词'),
        status: z.number().optional().describe('用户状态：1=正常，0=禁用')
      }
    },
    async (params: any) => {
      requireAuth();
      const { page = 1, pageSize = 20, keyword = '', status } = params;
      const skip = (page - 1) * pageSize;

      const query: any = { deletedAt: null };
      if (status !== undefined && status !== '') query.status = Number(status);
      if (keyword) {
        query.$or = [
          { username: { $regex: keyword, $options: 'i' } },
          { nickname: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } }
        ];
      }

      const [items, total] = await Promise.all([
        db.collection('users')
          .find(query)
          .project({ password: 0, passsalt: 0 })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        db.collection('users').countDocuments(query)
      ]);

      return {
        content: [{ type: 'text', text: JSON.stringify({ items, total, page, pageSize }) }]
      };
    }
  );

  server.registerTool(
    'user.get',
    {
      title: 'Get User',
      description: '获取指定用户详情',
      inputSchema: {
        id: z.string().describe('用户 ID')
      }
    },
    async (params: any) => {
      requireAuth();
      const { id } = params;
      if (!id) throw new Error('User ID is required');

      const user = await db.collection('users').findOne(
        { _id: new ObjectId(id), deletedAt: null },
        { projection: { password: 0, passsalt: 0 } }
      );

      if (!user) throw new Error('User not found');
      return {
        content: [{ type: 'text', text: JSON.stringify(user) }]
      };
    }
  );

  server.registerTool(
    'form.list',
    {
      title: 'List Forms',
      description: '列出所有表单',
      inputSchema: {
        page: z.number().optional().describe('页码，默认 1'),
        pageSize: z.number().optional().describe('每页数量，默认 20'),
        keyword: z.string().optional().describe('搜索关键词'),
        userId: z.string().optional().describe('用户 ID，筛选指定用户的表单'),
        status: z.number().optional().describe('表单状态：1=草稿，2=已发布')
      }
    },
    async (params: any) => {
      requireAuth();
      const { page = 1, pageSize = 20, keyword = '', userId, status } = params;
      const skip = (page - 1) * pageSize;

      const query: any = { deletedAt: null };
      if (userId) query.userId = new ObjectId(userId);
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
      description: '获取指定表单详情',
      inputSchema: {
        id: z.string().describe('表单 ID')
      }
    },
    async (params: any) => {
      requireAuth();
      const { id } = params;
      if (!id) throw new Error('Form ID is required');

      const form = await db.collection('forms').findOne({
        _id: new ObjectId(id),
        deletedAt: null
      });

      if (!form) throw new Error('Form not found');
      return {
        content: [{ type: 'text', text: JSON.stringify(form) }]
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
        startDate: z.string().optional().describe('开始日期'),
        endDate: z.string().optional().describe('结束日期'),
        skip: z.number().optional().describe('跳过数量'),
        limit: z.number().optional().describe('导出数量')
      }
    },
    async (params: any) => {
      requireAuth();
      const { formId, startDate, endDate, skip = 0, limit } = params;
      if (!formId) throw new Error('Form ID is required');

      const query: any = { formId: new ObjectId(formId), deletedAt: null };
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const cursor = db.collection('formRecords')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip);

      if (limit) {
        cursor.limit(limit);
      }

      const items = await cursor.toArray();
      const total = await db.collection('formRecords').countDocuments(query);

      return {
        content: [{ type: 'text', text: JSON.stringify({ items, total, skip, limit }) }]
      };
    }
  );

  server.registerTool(
    'formRecord.get',
    {
      title: 'Get Form Data',
      description: '获取单条表单数据详情',
      inputSchema: {
        id: z.string().describe('数据 ID')
      }
    },
    async (params: any) => {
      requireAuth();
      const { id } = params;
      if (!id) throw new Error('Data ID is required');

      const data = await db.collection('formRecords').findOne({
        _id: new ObjectId(id),
        deletedAt: null
      });

      if (!data) throw new Error('Data not found');
      return {
        content: [{ type: 'text', text: JSON.stringify(data) }]
      };
    }
  );

  return server;
}