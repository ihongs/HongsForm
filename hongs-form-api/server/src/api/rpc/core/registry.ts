import { RpcHandler } from './types.js';

export interface RpcMethodRegistry {
  scope: string;
  methods: Map<string, RpcHandler>;
  register(name: string, handler: RpcHandler): void;
}

export function createRpcRegistry(scope: string): RpcMethodRegistry {
  const methods = new Map<string, RpcHandler>();

  return {
    scope,
    methods,
    register(name: string, handler: RpcHandler): void {
      if (methods.has(name)) throw new Error(`RPC ${scope} method already registered: ${name}`);
      methods.set(name, handler);
      console.log(`RPC ${scope} method registered: ${name}`);
    }
  };
}
