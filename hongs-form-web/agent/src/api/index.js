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
    return rpc.call('login', { username, password })
  },
  generateCaptchaOrdeal() {
    return rpc.call('generateCaptchaOrdeal')
  },
  verifyCaptcha(answer) {
    return rpc.call('verifyCaptcha', { answer })
  },
  sendEmailVerificationCode(email, captchaAnswer) {
    return rpc.call('sendEmailVerificationCode', { email, type: 'login', captchaAnswer })
  },
  sendSmsVerificationCode(phone, captchaAnswer) {
    return rpc.call('sendSmsVerificationCode', { phone, type: 'login', captchaAnswer })
  },
  loginOrRegisterByEmail(email, code) {
    return rpc.call('loginOrRegisterByEmail', { email, code })
  },
  loginOrRegisterByPhone(phone, code) {
    return rpc.call('loginOrRegisterByPhone', { phone, code })
  },
  listForms(params = {}) {
    return rpc.call('form.list', params)
  },
  getForm(id) {
    return rpc.call('form.get', { id })
  },
  createForm(data) {
    return rpc.call('form.create', data)
  },
  updateForm(id, data) {
    return rpc.call('form.update', { id, ...data })
  },
  publishForm(id) {
    return rpc.call('form.publish', { id })
  },
  unpublishForm(id) {
    return rpc.call('form.unpublish', { id })
  },
  deleteForm(id) {
    return rpc.call('form.delete', { id })
  },
  listData(params = {}) {
    return rpc.call('formData.list', params)
  },
  deleteData(id) {
    return rpc.call('formData.delete', { id })
  },
  getStats(formId) {
    return rpc.call('formData.stats', { formId })
  }
}
