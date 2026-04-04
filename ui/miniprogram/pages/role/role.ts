import { getCurrentRole, switchRole } from '../../utils/api'

const app = getApp<IAppOption>()

Component({
  data: {
    apiBaseUrl: app.globalData.apiBaseUrl,
    token: '',
    currentRole: 'owner' as 'owner' | 'feeder',
    nickname: '',
    availableRoles: ['owner', 'feeder'] as Array<'owner' | 'feeder'>,
    loading: false,
    statusText: '正在读取当前身份...',
  },
  lifetimes: {
    attached() {
      this.loadCurrentRole()
    },
  },
  pageLifetimes: {
    show() {
      this.loadCurrentRole()
    },
  },
  methods: {
    async loadCurrentRole() {
      const token = app.globalData.token || wx.getStorageSync('accessToken')
      if (!token) {
        this.setData({
          statusText: '请先返回登录页完成登录。',
        })
        return
      }

      this.setData({
        loading: true,
        token,
      })

      try {
        const result = await getCurrentRole(this.data.apiBaseUrl, token)
        app.globalData.loginUser = result.user
        wx.setStorageSync('loginUser', result.user)
        this.setData({
          currentRole: result.role,
          nickname: result.user.nickname,
          availableRoles: result.available_roles,
          statusText: `当前身份为 ${result.role}，可随时切换。`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取身份失败'
        this.setData({
          statusText: message,
        })
      } finally {
        this.setData({
          loading: false,
        })
      }
    },
    async onSwitchRole(e: WechatMiniprogram.BaseEvent) {
      const role = e.currentTarget.dataset.role as 'owner' | 'feeder'
      if (!this.data.token || role === this.data.currentRole) {
        return
      }

      this.setData({
        loading: true,
        statusText: `正在切换到 ${role}...`,
      })

      try {
        const result = await switchRole(this.data.apiBaseUrl, this.data.token, role)
        app.globalData.token = result.access_token
        app.globalData.loginUser = result.user
        wx.setStorageSync('accessToken', result.access_token)
        wx.setStorageSync('loginUser', result.user)
        this.setData({
          token: result.access_token,
          currentRole: result.role,
          nickname: result.user.nickname,
          availableRoles: result.available_roles,
          statusText: `身份已切换为 ${result.role}。`,
        })
        wx.showToast({
          title: '切换成功',
          icon: 'success',
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '切换失败'
        this.setData({
          statusText: message,
        })
        wx.showToast({
          title: '切换失败',
          icon: 'none',
        })
      } finally {
        this.setData({
          loading: false,
        })
      }
    },
  },
})
