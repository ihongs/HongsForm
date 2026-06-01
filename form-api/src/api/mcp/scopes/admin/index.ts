import { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ZodError } from 'zod';
import { getDb } from '../../../../utils/db.js';
import { verifyAdminSkAuth, McpAdminAuthContext } from './auth.js';
import { createAdminMcpServer } from './server.js';

export async function handleAdminMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const db = getDb();
  const authContext = await verifyAdminSkAuth(req);

  const server = createAdminMcpServer(db, authContext);

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
    console.error('Error handling MCP admin request:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      
      const errorData: any = { code: -32603, message: 'Internal server error' };

      // ZodError
      if (error instanceof ZodError) {
        errorData.message = 'ZodError';
        errorData.code = -32602;
        errorData.data = {
          errors: error.issues.map(issue => {
            const { path, code, message, ...params } = issue;
            return { path,  code, message, params };
          })
        };
      } else if (error instanceof Error) {
        errorData.message = error.message;
      }
      
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: errorData,
        id: null
      }));
    }
  }
}