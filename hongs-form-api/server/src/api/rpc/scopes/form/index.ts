import { createRpcHandler } from '../../core/handler.js';
import { formRegistry } from './registry.js';

import './methods/forms.js';
import './methods/formData.js';

export const handleFormRpc = createRpcHandler(formRegistry);
