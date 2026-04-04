const DEFAULT_AVATAR = 'https://dummyimage.com/200x200/e8eef6/8a94a6.png&text=PET';
const STORAGE_TOKEN_KEY = 'accessToken';
const STORAGE_USER_KEY = 'loginUser';
const STORAGE_WECHAT_PROFILE_KEY = 'wechatProfile';
const app = getApp();

function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options;
  const baseUrl = (app.globalData && app.globalData.apiBaseUrl) || '';

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        const message =
          (res.data && res.data.detail) ||
          (res.data && res.data.message) ||
          `\u8bf7\u6c42\u5931\u8d25\uff0c\u72b6\u6001\u7801 ${res.statusCode}`;
        reject(new Error(message));
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25'));
      },
    });
  });
}

function getTargetPage(role) {
  return role === 'feeder' ? '/pages/home-feeder/index' : '/pages/home-owner/index';
}

function buildStepError(stepText, error, fallbackText) {
  const detail = (error && error.message) || fallbackText;
  return `${stepText}${detail ? `\uff1a${detail}` : ''}`;
}

Page({
  data: {
    loading: false,
    errorMessage: '',
    nickname: '',
    avatarUrl: DEFAULT_AVATAR,
    texts: {
      avatarFallback: '\u5934\u50cf',
      nicknamePlaceholder: '\u8bf7\u586b\u5199\u6635\u79f0',
      changeAvatar: '\u66f4\u6362\u5934\u50cf',
      loggingIn: '\u767b\u5f55\u4e2d...',
      loginButton: '\u5fae\u4fe1\u767b\u5f55',
    },
  },

  onShow() {
    const token = wx.getStorageSync(STORAGE_TOKEN_KEY);
    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);

    if (token && loginUser && loginUser.role) {
      app.globalData = app.globalData || {};
      app.globalData.token = token;
      app.globalData.loginUser = loginUser;
      wx.reLaunch({
        url: getTargetPage(loginUser.role),
      });
    }
  },

  handleAvatarTap() {},

  handleChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl ? e.detail.avatarUrl : '';
    if (!avatarUrl) {
      return;
    }

    console.log('[login] chooseAvatar result:', {
      avatarUrl,
    });

    this.setData({
      avatarUrl,
    });
  },

  handleNicknameInput(e) {
    this.setData({
      nickname: e.detail.value,
    });
  },

  handleNicknameBlur(e) {
    this.setData({
      nickname: (e.detail.value || '').trim(),
    });
  },

  validateProfile() {
    if (!this.data.avatarUrl || this.data.avatarUrl === DEFAULT_AVATAR) {
      return '\u8bf7\u5148\u9009\u62e9\u5934\u50cf';
    }

    if (!this.data.nickname.trim()) {
      return '\u8bf7\u586b\u5199\u6635\u79f0';
    }

    return '';
  },

  async handleLogin() {
    if (this.data.loading) {
      return;
    }

    const validationMessage = this.validateProfile();
    if (validationMessage) {
      this.setData({
        errorMessage: validationMessage,
      });
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      });
      return;
    }

    const nickname = this.data.nickname.trim();
    const avatarUrl = this.data.avatarUrl;
    const wechatProfile = {
      nickname,
      avatar: avatarUrl,
    };

    this.setData({
      loading: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: '\u767b\u5f55\u4e2d',
      mask: true,
    });

    try {
      let loginRes;
      try {
        loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success(res) {
              if (!res.code) {
                reject(new Error('\u672a\u83b7\u53d6\u5230\u5fae\u4fe1\u767b\u5f55 code'));
                return;
              }
              resolve(res);
            },
            fail(err) {
              reject(new Error((err && err.errMsg) || 'wx.login \u8c03\u7528\u5931\u8d25'));
            },
          });
        });
        console.log('[login] wx.login result:', {
          code: loginRes && loginRes.code ? loginRes.code : '',
        });
      } catch (error) {
        throw new Error(buildStepError('wx.login \u5931\u8d25', error, '\u5fae\u4fe1\u767b\u5f55\u5931\u8d25'));
      }

      let result;
      try {
        console.log('[login] request /auth/login payload:', {
          nickname,
          avatar: avatarUrl,
          code: loginRes.code,
        });
        result = await request({
          url: '/auth/login',
          method: 'POST',
          data: {
            code: loginRes.code,
            nickname,
            avatar: avatarUrl,
          },
        });
        console.log('[login] /auth/login response:', {
          user: result && result.user ? result.user : null,
          hasAccessToken: !!(result && result.access_token),
        });
      } catch (error) {
        throw new Error(buildStepError('/auth/login \u5931\u8d25', error, '\u540e\u7aef\u767b\u5f55\u5931\u8d25'));
      }

      if (!result || !result.user || !result.access_token) {
        throw new Error('\u767b\u5f55\u54cd\u5e94\u683c\u5f0f\u4e0d\u6b63\u786e');
      }

      const nextUser = {
        ...result.user,
        nickname,
        avatar: avatarUrl,
      };

      app.globalData = app.globalData || {};
      app.globalData.token = result.access_token;
      app.globalData.loginUser = nextUser;
      app.globalData.wechatProfile = wechatProfile;
      wx.setStorageSync(STORAGE_TOKEN_KEY, result.access_token);
      wx.setStorageSync(STORAGE_USER_KEY, nextUser);
      wx.setStorageSync(STORAGE_WECHAT_PROFILE_KEY, wechatProfile);

      wx.showToast({
        title: '\u767b\u5f55\u6210\u529f',
        icon: 'success',
      });

      setTimeout(() => {
        wx.reLaunch({
          url: getTargetPage(nextUser.role),
        });
      }, 400);
    } catch (error) {
      const message = (error && error.message) || '\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
      this.setData({
        errorMessage: message,
      });
      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
      this.setData({
        loading: false,
      });
    }
  },
});
