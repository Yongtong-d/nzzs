import { loginRequest } from '../../utils/api'

const app = getApp<IAppOption>()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    apiBaseUrl: app.globalData.apiBaseUrl,
    nickname: '',
    avatarUrl: defaultAvatarUrl,
    accessToken: '',
    isNewUser: false,
    isLoggedIn: false,
    loading: false,
    currentRole: 'owner',
    statusText: '填写昵称并选择头像，页面会先调用 wx.login 获取 code，再请求后端完成登录。',
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },
  lifetimes: {
    attached() {
      this.syncLoginState()
    },
  },
  pageLifetimes: {
    show() {
      this.syncLoginState()
    },
  },
  methods: {
    syncLoginState() {
      const loginUser = app.globalData.loginUser
      const token = app.globalData.token || ''
      if (!loginUser || !token) {
        return
      }

      this.setData({
        nickname: loginUser.nickname,
        avatarUrl: loginUser.avatar,
        accessToken: token,
        currentRole: loginUser.role,
        isLoggedIn: true,
        statusText: `已登录：${loginUser.nickname}，当前身份 ${loginUser.role}`,
      })
    },
    onChooseAvatar(e: WechatMiniprogram.CustomEvent) {
      const { avatarUrl } = e.detail as { avatarUrl: string }
      this.setData({
        avatarUrl,
      })
    },
    onNicknameChange(e: WechatMiniprogram.Input) {
      this.setData({
        nickname: e.detail.value.trim(),
      })
    },
    async submitLogin() {
      if (!this.data.nickname || !this.data.avatarUrl) {
        wx.showToast({
          title: '请先填写完整信息',
          icon: 'none',
        })
        return
      }

      this.setData({
        loading: true,
        statusText: '正在请求登录接口...',
      })

      try {
        const loginResult = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
          wx.login({
            success: (res) => {
              if (!res.code) {
                reject(new Error('未获取到微信登录 code'))
                return
              }
              resolve(res)
            },
            fail: reject,
          })
        })

        const result = await loginRequest(this.data.apiBaseUrl, {
          code: loginResult.code,
          nickname: this.data.nickname,
          avatar: this.data.avatarUrl,
        })

        app.globalData.token = result.access_token
        app.globalData.loginUser = result.user
        wx.setStorageSync('accessToken', result.access_token)
        wx.setStorageSync('loginUser', result.user)

        this.setData({
          accessToken: result.access_token,
          isNewUser: result.is_new_user,
          isLoggedIn: true,
          avatarUrl: result.user.avatar,
          nickname: result.user.nickname,
          currentRole: result.user.role,
          statusText: result.is_new_user
            ? `首次登录成功，已创建账号，当前身份 ${result.user.role}`
            : `登录成功，当前身份 ${result.user.role}`,
        })

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '请求失败'
        this.setData({
          statusText: message,
        })
        wx.showToast({
          title: '登录失败',
          icon: 'none',
        })
      } finally {
        this.setData({
          loading: false,
        })
      }
    },
    goToRolePage() {
      if (!this.data.isLoggedIn) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        })
        return
      }

      wx.navigateTo({
        url: '/pages/role/role',
      })
    },
    clearLoginState() {
      app.globalData.token = ''
      app.globalData.loginUser = undefined
      wx.removeStorageSync('accessToken')
      wx.removeStorageSync('loginUser')
      this.setData({
        nickname: '',
        avatarUrl: defaultAvatarUrl,
        accessToken: '',
        isNewUser: false,
        isLoggedIn: false,
        currentRole: 'owner',
        statusText: '本地登录状态已清空。',
      })
    },
  },
})
