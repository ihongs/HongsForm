import { createRpcHandler } from '../../core/handler.js';
import { formRegistry } from './registry.js';

import './methods/forms.js';
import './methods/formRecords.js';

export const handleFormRpc = createRpcHandler(formRegistry);
