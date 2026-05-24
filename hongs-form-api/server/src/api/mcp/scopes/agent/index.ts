import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getDb } from '../../../../utils/db.js';
import { verifySkAuth, McpAuthContext } from './auth.js';
import { createAgentMcpServer } from './server.js';

export async function handleAgentMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const db = getDb();
  const authContext = await verifySkAuth(req);

  const server = createAgentMcpServer(db, authContext);

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await server.connect(transport);
    await transport.handleRequest(req as any, res);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      }));
    }
  }
}
