export interface LoginPayload {
  code: string
  nickname: string
  avatar: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  is_new_user: boolean
  user: LoginUserInfo
}

export interface RoleResponse {
  role: 'owner' | 'feeder'
  available_roles: Array<'owner' | 'feeder'>
  user: LoginUserInfo
}

export interface SwitchRoleResponse extends RoleResponse {
  access_token: string
  token_type: string
}

function request<T>(
  baseUrl: string,
  url: string,
  method: 'GET' | 'POST' | 'PUT',
  data?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request<T>({
      url: `${baseUrl}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
          resolve(res.data)
          return
        }
        const detail = typeof res.data === 'object' && res.data && 'detail' in res.data
          ? String((res.data as { detail: string }).detail)
          : `请求失败，状态码 ${res.statusCode}`
        reject(new Error(detail))
      },
      fail: (error) => {
        const errMsg = typeof error === 'object' && error && 'errMsg' in error
          ? String((error as { errMsg: string }).errMsg)
          : '请求失败'
        reject(new Error(errMsg))
      },
    })
  })
}

export function loginRequest(baseUrl: string, payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>(baseUrl, '/auth/login', 'POST', payload)
}

export function getCurrentRole(baseUrl: string, token: string): Promise<RoleResponse> {
  return request<RoleResponse>(baseUrl, '/roles/current', 'GET', undefined, token)
}

export function switchRole(
  baseUrl: string,
  token: string,
  role: 'owner' | 'feeder',
): Promise<SwitchRoleResponse> {
  return request<SwitchRoleResponse>(baseUrl, '/roles/current', 'PUT', { role }, token)
}
