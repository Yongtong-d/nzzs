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

const texts = {
  pageTitle: '\u9009\u62e9\u8eab\u4efd',
  pageDesc: '\u8bf7\u9009\u62e9\u4f60\u5f53\u524d\u8981\u8fdb\u5165\u7684\u5e73\u53f0\u8eab\u4efd',
  ownerName: '\u5ba0\u7269\u4e3b\u4eba',
  feederName: '\u5ba0\u7269\u5582\u517b\u8005',
  ownerDesc: '\u53d1\u5e03\u8ba2\u5355\uff0c\u5bfb\u627e\u5408\u9002\u7684\u5ba0\u7269\u5582\u517b\u8005\u3002',
  feederDesc: '\u6d4f\u89c8\u8ba2\u5355\uff0c\u63a5\u53d6\u5e76\u5b8c\u6210\u5ba0\u7269\u7167\u62a4\u670d\u52a1\u3002',
  selected: '\u5f53\u524d\u5df2\u9009\u4e2d',
  tapToSelect: '\u70b9\u51fb\u9009\u62e9\u8be5\u8eab\u4efd',
  submitting: '\u63d0\u4ea4\u4e2d...',
  confirm: '\u786e\u8ba4\u8fdb\u5165',
  noticeTitle: '\u8eab\u4efd\u8bf4\u660e',
  ownerNoticeLabel: '\u5ba0\u7269\u4e3b\u4eba\uff1a',
  ownerNoticeText: '\u53d1\u5e03\u8ba2\u5355\uff0c\u5bfb\u627e\u5582\u517b\u8005',
  feederNoticeLabel: '\u5ba0\u7269\u5582\u517b\u8005\uff1a',
  feederNoticeText: '\u6d4f\u89c8\u8ba2\u5355\uff0c\u63a5\u53d6\u670d\u52a1\u8ba2\u5355',
};

Page({
  data: {
    loading: false,
    selectedRole: 'owner',
    errorMessage: '',
    texts,
  },

  onLoad() {
    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);
    if (loginUser && loginUser.role) {
      this.setData({
        selectedRole: loginUser.role,
      });
    }
  },

  handleSelectRole(e) {
    const { role } = e.currentTarget.dataset;
    if (!role || role === this.data.selectedRole) {
      return;
    }

    this.setData({
      selectedRole: role,
      errorMessage: '',
    });
  },

  async handleConfirm() {
    if (this.data.loading) {
      return;
    }

    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      const message = '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55';
      this.setData({ errorMessage: message });
      wx.showToast({
        title: message,
        icon: 'none',
      });
      return;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: '\u5207\u6362\u4e2d',
      mask: true,
    });

    try {
      const result = await request({
        url: '/roles/current',
        method: 'PUT',
        data: {
          role: this.data.selectedRole,
        },
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const localUser = wx.getStorageSync(STORAGE_USER_KEY) || {};
      const wechatProfile = wx.getStorageSync(STORAGE_WECHAT_PROFILE_KEY) || {};
      const nextToken = result.access_token || token;
      const nextUser = {
        ...localUser,
        ...(result.user || {}),
        nickname: wechatProfile.nickname || localUser.nickname || (result.user && result.user.nickname) || '\u5fae\u4fe1\u7528\u6237',
        avatar: wechatProfile.avatar || localUser.avatar || (result.user && result.user.avatar) || '',
        role: result.role || this.data.selectedRole,
      };
      const nextRole = result.role || this.data.selectedRole;

      app.globalData = app.globalData || {};
      app.globalData.token = nextToken;
      app.globalData.loginUser = nextUser;
      app.globalData.wechatProfile = wechatProfile;
      wx.setStorageSync(STORAGE_TOKEN_KEY, nextToken);
      wx.setStorageSync(STORAGE_USER_KEY, nextUser);

      wx.showToast({
        title: '\u5207\u6362\u6210\u529f',
        icon: 'success',
      });

      setTimeout(() => {
        wx.reLaunch({
          url: getTargetPage(nextRole),
        });
      }, 300);
    } catch (error) {
      const message = (error && error.message) || '\u8eab\u4efd\u5207\u6362\u5931\u8d25';
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
