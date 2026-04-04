/// <reference path="./types/index.d.ts" />

interface LoginUserInfo {
  id: number
  openid: string
  nickname: string
  avatar: string
  role: 'owner' | 'feeder'
  created_at: string
  last_login_at: string
}

interface IAppOption {
  globalData: {
    apiBaseUrl: string
    token?: string
    loginUser?: LoginUserInfo
  }
}
