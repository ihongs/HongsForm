import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { parse, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { handleAdminRpc, handleAgentRpc, handleFormRpc, handleCommonRpc } from './api/rpc/index.js';
import { handleAgentMcp, handleAdminMcp } from './api/mcp/index.js';
import { connectDb } from './utils/db.js';
import { loadEnv } from './utils/env.js';

const env = loadEnv();

const PORT = parseInt(env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf'
};

function getContentType(filePath: string): string {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  try {
    let filePath = join(PUBLIC_DIR, pathname);
    
    const stats = statSync(filePath);
    
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
      const indexStats = statSync(filePath);
      if (!indexStats.isFile()) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found', code: 404 }));
        return;
      }
    }

    const content = readFileSync(filePath);
    const contentType = getContentType(filePath);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.end(content);
  } catch (err) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found', code: 404 }));
  }
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname } = parse(req.url || '/');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (pathname === '/api/rpc/form' && req.method === 'POST') {
    await handleFormRpc(req, res);
    return;
  }

  if (pathname === '/api/rpc/agent' && req.method === 'POST') {
    await handleAgentRpc(req, res);
    return;
  }

  if (pathname === '/api/rpc/admin' && req.method === 'POST') {
    await handleAdminRpc(req, res);
    return;
  }

  if (pathname === '/api/rpc/common' && req.method === 'POST') {
    await handleCommonRpc(req, res);
    return;
  }

  if (pathname === '/api/mcp/agent' && (req.method === 'POST' || req.method === 'GET')) {
    await handleAgentMcp(req, res);
    return;
  }

  if (pathname === '/api/mcp/admin' && (req.method === 'POST' || req.method === 'GET')) {
    await handleAdminMcp(req, res);
    return;
  }

  if (pathname === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname?.startsWith('/static/') && req.method === 'GET') {
    await serveStatic(req, res, pathname);
    return;
  }

  if (req.method === 'GET' && pathname && !pathname.startsWith('/api/') && !pathname.startsWith('/mcp/')) {
    const staticFileExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.txt', '.pdf'];
    const ext = pathname.toLowerCase().substring(pathname.lastIndexOf('.'));
    if (staticFileExtensions.includes(ext)) {
      await serveStatic(req, res, pathname);
      return;
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not Found', code: 404 }));
});

async function start() {
  await connectDb(env.MONGODB_URI || 'mongodb://localhost:27017/hongs_form');
  server.listen(PORT, HOST, () => {
    console.log(`HongsForm API Server running on http://${HOST}:${PORT}`);
    console.log(`RPC form endpoint: http://${HOST}:${PORT}/api/rpc/form`);
    console.log(`RPC agent endpoint: http://${HOST}:${PORT}/api/rpc/agent`);
    console.log(`RPC admin endpoint: http://${HOST}:${PORT}/api/rpc/admin`);
    console.log(`RPC common endpoint: http://${HOST}:${PORT}/api/rpc/common`);
    console.log(`MCP agent endpoint: http://${HOST}:${PORT}/api/mcp/agent`);
    console.log(`MCP admin endpoint: http://${HOST}:${PORT}/api/mcp/admin`);
    console.log(`Static files: http://${HOST}:${PORT}/static/`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
  });
}

start().catch(console.error);