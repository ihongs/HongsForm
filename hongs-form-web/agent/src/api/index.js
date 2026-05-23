const TOKEN_KEY = 'hongs_agent_token'
const USER_KEY = 'hongs_agent_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  const text = localStorage.getItem(USER_KEY)
  return text ? JSON.parse(text) : null
}

export function setSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

class RpcClient {
  constructor(baseUrl = '/api/rpc/agent') {
    this.baseUrl = baseUrl
    this.id = 0
  }

  async call(method, params = {}) {
    const headers = {
      'Content-Type': 'application/json'
    }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: ++this.id
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

export const rpc = new RpcClient()

export const agentApi = {
  login(username, password) {
    return rpc.call('agent.login', { username, password })
  },
  listForms(params = {}) {
    return rpc.call('agent.form.list', params)
  },
  getForm(id) {
    return rpc.call('agent.form.get', { id })
  },
  createForm(data) {
    return rpc.call('agent.form.create', data)
  },
  updateForm(id, data) {
    return rpc.call('agent.form.update', { id, ...data })
  },
  publishForm(id) {
    return rpc.call('agent.form.publish', { id })
  },
  unpublishForm(id) {
    return rpc.call('agent.form.unpublish', { id })
  },
  deleteForm(id) {
    return rpc.call('agent.form.delete', { id })
  },
  listData(params = {}) {
    return rpc.call('agent.formData.list', params)
  },
  deleteData(id) {
    return rpc.call('agent.formData.delete', { id })
  },
  getStats(formId) {
    return rpc.call('agent.formData.stats', { formId })
  }
}
