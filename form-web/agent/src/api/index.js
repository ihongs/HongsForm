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
export const commonRpc = new RpcClient('/api/rpc/common')

export const agentApi = {
  login(username, password, verify) {
    return rpc.call('login', { username, password, verify })
  },
  loginByEmail(email, code) {
    return rpc.call('loginByEmail', { email, code })
  },
  loginByPhone(phone, code) {
    return rpc.call('loginByPhone', { phone, code })
  },
  registerByEmail(email, code, nickname, avatar) {
    return rpc.call('registerByEmail', { email, code, nickname, avatar })
  },
  registerByPhone(phone, code, nickname, avatar) {
    return rpc.call('registerByPhone', { phone, code, nickname, avatar })
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
  recountForm(id) {
    return rpc.call('form.recount', { id })
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
  updatePassword(oldPassword, newPassword, username, verify) {
    return rpc.call('mine.updatePassword', { oldPassword, newPassword, username, verify })
  },
  bindEmail(email, code) {
    return rpc.call('mine.bindEmail', { email, code })
  },
  unbindEmail() {
    return rpc.call('mine.unbindEmail')
  },
  bindPhone(phone, code) {
    return rpc.call('mine.bindPhone', { phone, code })
  },
  unbindPhone() {
    return rpc.call('mine.unbindPhone')
  }
}

export const verifyApi = {
  generateToken() {
    return commonRpc.call('verify.generateToken')
  },
  generateSlideCaptcha() {
    return commonRpc.call('verify.generateSlideCaptcha')
  },
  verifySlideCaptcha(captchaId, x) {
    return commonRpc.call('verify.verifySlideCaptcha', { captchaId, x })
  },
  sendSmsCode(verifyToken, phone) {
    return commonRpc.call('verify.sendSmsCode', { verifyToken, phone })
  },
  sendEmailCode(verifyToken, email) {
    return commonRpc.call('verify.sendEmailCode', { verifyToken, email })
  }
}

export async function uploadConfig(scene, fileName, fileSize, fileHash) {
  return commonRpc.call('upload.getConfig', { scene, fileName, fileSize, fileHash })
}
