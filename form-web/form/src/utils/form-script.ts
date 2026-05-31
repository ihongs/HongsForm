export interface FieldState {
  hidden: boolean
  value: unknown
}

export interface FieldChanges {
  [fieldName: string]: FieldState
}

export interface Action {
  type: 'hide' | 'show' | 'clear' | 'setValue' | 'getValue' | 'isHidden'
  field?: string
  value?: unknown
}

export interface WorkerMessage {
  type: 'execute' | 'result' | 'error' | 'log'
  action?: Action
  actions?: Action[]
  fieldName?: string
  fieldValue?: unknown
  value?: unknown
  error?: string
  depth?: number
  logs?: string[]
}

export interface ScriptContext {
  fields: Array<{
    name: string
    inputType?: string
    type?: string
    options?: Array<{ label: string; value: unknown }>
    value?: unknown
    hidden?: boolean
  }>
  script: string
  onChange?: (fieldName: string, value: unknown) => void
  onBatchUpdate?: (changes: FieldChanges) => void
}

const WORKER_SCRIPT = `
'use strict';

const fieldStates = {};
const fieldListeners = {};
const actionQueue = [];
let executionDepth = 0;
const MAX_DEPTH = 10;

function getField(name) {
  return {
    name,
    value: (v) => {
      if (v === undefined) {
        return fieldStates[name]?.value ?? null;
      }
      actionQueue.push({ type: 'setValue', field: name, value: v });
      return getField(name);
    },
    hide: () => {
      actionQueue.push({ type: 'hide', field: name });
      return getField(name);
    },
    show: () => {
      actionQueue.push({ type: 'show', field: name });
      return getField(name);
    },
    clear: () => {
      actionQueue.push({ type: 'clear', field: name });
      return getField(name);
    },
    isHidden: () => fieldStates[name]?.hidden ?? false
  };
}

const form = {
  field: (name) => getField(name),
  onChange: (fieldName, callback) => {
    if (!fieldListeners[fieldName]) {
      fieldListeners[fieldName] = [];
    }
    fieldListeners[fieldName].push(callback);
  },
  hide: (name) => {
    actionQueue.push({ type: 'hide', field: name });
    return form;
  },
  show: (name) => {
    actionQueue.push({ type: 'show', field: name });
    return form;
  },
  clear: (name) => {
    actionQueue.push({ type: 'clear', field: name });
    return form;
  },
  isHidden: (name) => fieldStates[name]?.hidden ?? false
};

function processQueue() {
  const batch = [...actionQueue];
  actionQueue.length = 0;

  const changes = {};

  for (const action of batch) {
    if (!action.field) continue;

    if (!fieldStates[action.field]) {
      fieldStates[action.field] = { hidden: false, value: null };
    }

    switch (action.type) {
      case 'hide':
        fieldStates[action.field].hidden = true;
        changes[action.field] = { ...fieldStates[action.field] };
        break;
      case 'show':
        fieldStates[action.field].hidden = false;
        changes[action.field] = { ...fieldStates[action.field] };
        break;
      case 'clear':
        fieldStates[action.field].value = null;
        changes[action.field] = { ...fieldStates[action.field] };
        break;
      case 'setValue':
        fieldStates[action.field].value = action.value;
        changes[action.field] = { ...fieldStates[action.field] };
        break;
    }
  }

  if (Object.keys(changes).length > 0) {
    self.postMessage({ type: 'result', actions: batch, changes });
  }
}

self.onmessage = function(e) {
  const { type, fieldName, value, initFields, script } = e.data;

  if (type === 'init') {
    for (const f of (initFields || [])) {
      fieldStates[f.name] = { hidden: f.hidden ?? false, value: f.value ?? null };
    }
    return;
  }

  if (type === 'executeScript' && script) {
    try {
      eval(script);
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message });
    }
    return;
  }

  if (type === 'change' && fieldName !== undefined) {
    executionDepth++;

    if (executionDepth > MAX_DEPTH) {
      self.postMessage({
        type: 'error',
        error: 'Maximum execution depth exceeded (possible infinite loop)'
      });
      executionDepth--;
      return;
    }

    fieldStates[fieldName] = { ...(fieldStates[fieldName] || {}), value };

    const listeners = fieldListeners[fieldName] || [];
    const currentField = getField(fieldName);

    for (const callback of listeners) {
      try {
        actionQueue.length = 0;
        callback(currentField);

        if (actionQueue.length > 0) {
          processQueue();
        }
      } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
      }
    }

    executionDepth--;
  }

  if (type === 'flush') {
    if (actionQueue.length > 0) {
      processQueue();
    }
  }
};
`;

export class FormScriptEngine {
  private worker: Worker | null = null
  private script: string
  private fields: ScriptContext['fields']
  private onBatchUpdate?: (changes: FieldChanges) => void
  private pendingChanges: FieldChanges = {}
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(context: ScriptContext) {
    this.script = context.script
    this.fields = context.fields
    this.onBatchUpdate = context.onBatchUpdate
    this.initWorker()
  }

  private initWorker() {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    this.worker = new Worker(url)
    URL.revokeObjectURL(url)

    const initFields = this.fields.map(f => ({
      name: f.name,
      hidden: f.hidden ?? false,
      value: f.value !== undefined ? JSON.parse(JSON.stringify(f.value)) : null
    }))
    this.worker.postMessage({ type: 'init', initFields })

    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { type, actions, changes, error } = e.data

      if (type === 'result' && changes) {
        Object.assign(this.pendingChanges, changes)

        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => {
            this.flushPendingChanges()
          }, 0)
        }
      }

      if (type === 'error') {
        console.error('[FormScript]', error)
      }
    }

    this.worker.onerror = (err) => {
      console.error('[FormScript] Worker error:', err)
    }

    this.worker.postMessage({ type: 'executeScript', script: this.script })
  }

  private flushPendingChanges() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (Object.keys(this.pendingChanges).length > 0) {
      this.onBatchUpdate?.(this.pendingChanges)
      this.pendingChanges = {}
    }
  }

  notifyChange(fieldName: string, value: unknown) {
    const plainValue = JSON.parse(JSON.stringify(value))
    this.worker?.postMessage({ type: 'change', fieldName, value: plainValue })
  }

  destroy() {
    this.flushPendingChanges()
    this.worker?.terminate()
    this.worker = null
  }
}

export function createFormScriptEngine(context: ScriptContext): FormScriptEngine {
  return new FormScriptEngine(context)
}
