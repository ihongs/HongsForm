const TOKEN_KEY = 'hongs_admin_token'
const USER_KEY = 'hongs_admin_user'

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
  constructor(baseUrl = '/api/rpc/admin') {
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
export const commonRpc = new RpcClient('/api/rpc/common')

export const adminApi = {
  login(username, password, verify) {
    return rpc.call('login', { username, password, verify })
  },
  listUsers(params = {}) {
    return rpc.call('user.list', params)
  },
  createUser(data) {
    return rpc.call('user.create', data)
  },
  updateUser(id, data) {
    return rpc.call('user.update', { id, ...data })
  },
  getUser(id) {
    return rpc.call('user.get', { id })
  },
  disableUser(id) {
    return rpc.call('user.update', { id, status: 0 })
  },
  enableUser(id) {
    return rpc.call('user.update', { id, status: 1 })
  },
  deleteUser(id) {
    return rpc.call('user.delete', { id })
  },
  listForms(params = {}) {
    return rpc.call('form.list', params)
  },
  getForm(id) {
    return rpc.call('form.get', { id })
  },
  listFormRecords(params = {}) {
    return rpc.call('formRecord.list', params)
  },
  deleteFormRecord(id) {
    return rpc.call('formRecord.delete', { id })
  },
  getFormRecordStats(formId) {
    return rpc.call('formRecord.stats', { formId })
  },
  // API Key 管理
  listApiKeys() {
    return rpc.call('mineApiKey.list')
  },
  createApiKey(name) {
    return rpc.call('mineApiKey.create', { name })
  },
  deleteApiKey(id) {
    return rpc.call('mineApiKey.delete', { id })
  },
  // 个人资料管理
  getProfile() {
    return rpc.call('mine.getProfile')
  },
  updateNickname(nickname) {
    return rpc.call('mine.updateNickname', { nickname })
  },
  updateAvatar(avatar) {
    return rpc.call('mine.updateAvatar', { avatar })
  },
  updatePassword(data) {
    return rpc.call('mine.updatePassword', data)
  },
  bindEmail(email) {
    return rpc.call('mine.bindEmail', { email })
  },
  unbindEmail() {
    return rpc.call('mine.unbindEmail')
  },
  bindPhone(phone) {
    return rpc.call('mine.bindPhone', { phone })
  },
  unbindPhone() {
    return rpc.call('mine.unbindPhone')
  }
}

export const verifyApi = {
  generateToken() {
    return commonRpc.call('verify.generateToken')
  },
  sendSmsCode(token, nonce, answer, phone) {
    return commonRpc.call('verify.sendSmsCode', { token, nonce, answer, phone })
  },
  sendEmailCode(token, nonce, answer, email) {
    return commonRpc.call('verify.sendEmailCode', { token, nonce, answer, email })
  }
}
