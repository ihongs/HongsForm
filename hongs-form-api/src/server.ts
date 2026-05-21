import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { parse } from 'node:url';
import { handleRpc } from './api/rpc/index.js';
import { connectDb } from './utils/db.js';
import { loadEnv } from './utils/env.js';

const env = loadEnv();

const PORT = parseInt(env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// JSON-RPC 2.0 服务器
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname } = parse(req.url || '/');

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // RPC 端点
  if (pathname === '/api/rpc' && req.method === 'POST') {
    await handleRpc(req, res);
    return;
  }

  // 健康检查
  if (pathname === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // 404
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not Found', code: 404 }));
});

// 启动服务器
async function start() {
  await connectDb(env.MONGODB_URI || 'mongodb://localhost:27017/hongs_form');
  server.listen(PORT, HOST, () => {
    console.log(`HongsForm API Server running on http://${HOST}:${PORT}`);
    console.log(`RPC endpoint: http://${HOST}:${PORT}/api/rpc`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
  });
}

start().catch(console.error);
