import { createRpcHandler } from '../../core/handler.js';
import { formRegistry } from './registry.js';

import './methods/form.js';
import './methods/formRecord.js';

export const handleFormRpc = createRpcHandler(formRegistry);