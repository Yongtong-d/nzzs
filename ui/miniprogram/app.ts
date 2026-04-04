const DEVTOOLS_API_BASE_URL = 'http://127.0.0.1:8000'
const LAN_API_BASE_URL = 'http://192.168.31.233:8000'

App<IAppOption>({
  globalData: {
    apiBaseUrl: DEVTOOLS_API_BASE_URL,
    token: '',
    loginUser: undefined,
  },
  onLaunch() {
    const { platform } = wx.getSystemInfoSync()
    this.globalData.apiBaseUrl = platform === 'devtools' ? DEVTOOLS_API_BASE_URL : LAN_API_BASE_URL

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    const token = wx.getStorageSync('accessToken')
    const loginUser = wx.getStorageSync('loginUser')

    if (token) {
      this.globalData.token = token
    }
    if (loginUser) {
      this.globalData.loginUser = loginUser
    }
  },
})
