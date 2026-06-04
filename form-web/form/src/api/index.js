// 访客标识
const GUEST_TOKEN_KEY = 'hongs_guest_token'
const AGENT_TOKEN_KEY = 'hongs_agent_token'

// 获取 agent token
export function getAgentToken() {
  return localStorage.getItem(AGENT_TOKEN_KEY)
}

// 生成随机访客标识
function generateGuestToken() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// 获取或生成访客标识
export function getGuestToken() {
  let token = localStorage.getItem(GUEST_TOKEN_KEY)
  if (!token) {
    token = generateGuestToken()
    localStorage.setItem(GUEST_TOKEN_KEY, token)
  }
  return token
}

// JSON-RPC 2.0 客户端
class RpcClient {
  constructor(baseUrl = '/api/rpc/form') {
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

  // 检查访客是否已提交过此表单
  checkSubmitted(formId) {
    return rpc.call('formRecord.checkSubmitted', {
      formId,
      userToken: getGuestToken()
    })
  },

  // 发送手机验证码
  sendSmsCode(formId, phone, verifyToken) {
    return rpc.call('form.verify.sendSmsCode', {
      formId,
      phone,
      verifyToken
    })
  },

  // 发送邮箱验证码
  sendEmailCode(formId, email, verifyToken) {
    return rpc.call('form.verify.sendEmailCode', {
      formId,
      email,
      verifyToken
    })
  },

  // 提交表单数据
  submitData(formId, data, userId = null, phoneCode = null, emailCode = null) {
    return rpc.call('formRecord.create', {
      formId,
      userId,
      data,
      channel: 'web',
      userToken: getGuestToken(),
      phoneCode,
      emailCode
    })
  },

  // 获取投票表单统计数据
  getCounts(formId) {
    return rpc.call('form.getCounts', { id: formId })
  },

  // 校验表单checksum
  checkFormChecksum(id, checksum) {
    return rpc.call('form.checksum', { id, checksum })
  },

  // 校验记录checksum
  checkRecordChecksum(id, checksum, agentToken) {
    return rpc.call('formRecord.checksum', { id, checksum, agentToken })
  },

  // 确认签到
  checkin(id, formId, agentToken) {
    return rpc.call('formRecord.checkin', { id, formId, agentToken })
  },

  // 手机签到
  signByPhone(formId, phone, verifyCode) {
    return rpc.call('formRecord.signByPhone', { formId, phone, verifyCode })
  },

  // 邮箱签到
  signByEmail(formId, email, verifyCode) {
    return rpc.call('formRecord.signByEmail', { formId, email, verifyCode })
  }
}

export default rpc
