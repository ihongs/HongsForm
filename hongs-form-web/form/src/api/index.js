// JSON-RPC 2.0 客户端
class RpcClient {
  constructor(baseUrl = '/api/rpc') {
    this.baseUrl = baseUrl
    this.id = 0
  }

  async call(method, params = {}) {
    const id = ++this.id
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id
      })
    })

    const result = await response.json()

    if (result.error) {
      const error = new Error(result.error.message)
      error.code = result.error.code
      error.data = result.error.data
      throw error
    }

    return result.result
  }
}

const rpc = new RpcClient()

export const formApi = {
  // 获取表单 schema
  getSchema(id) {
    return rpc.call('form.schema', { id })
  },

  // 提交表单数据
  submitData(formId, data, userId = null) {
    return rpc.call('formData.create', {
      formId,
      userId,
      data,
      channel: 'web'
    })
  }
}

export default rpc
