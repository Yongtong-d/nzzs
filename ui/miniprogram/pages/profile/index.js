const DEFAULT_AVATAR = 'https://dummyimage.com/200x200/e8eef6/8a94a6.png&text=PET';
const STORAGE_TOKEN_KEY = 'accessToken';
const STORAGE_USER_KEY = 'loginUser';
const STORAGE_WECHAT_PROFILE_KEY = 'wechatProfile';
const app = getApp();

function buildUserView(user, wechatProfile) {
  return {
    id: user && user.id ? user.id : 0,
    nickname:
      (wechatProfile && wechatProfile.nickname) ||
      (user && user.nickname) ||
      '\u5fae\u4fe1\u7528\u6237',
    avatar:
      (wechatProfile && wechatProfile.avatar) ||
      (user && user.avatar) ||
      DEFAULT_AVATAR,
    role: user && user.role ? user.role : 'feeder',
  };
}

function getRoleText(role) {
  return role === 'feeder' ? '\u5f53\u524d\u8eab\u4efd\uff1a\u5ba0\u7269\u5582\u517b\u8005' : '\u5f53\u524d\u8eab\u4efd\uff1a\u5ba0\u7269\u4e3b\u4eba';
}

const texts = {
  myPublishedOrders: '\u6211\u53d1\u5e03\u7684\u8ba2\u5355',
  myTakenOrders: '\u6211\u63a5\u53d6\u7684\u8ba2\u5355',
  myReviews: '\u6211\u7684\u8bc4\u4ef7',
  logoutText: '\u9000\u51fa\u767b\u5f55',
  arrowText: '>',
};

Page({
  data: {
    loading: false,
    errorMessage: '',
    user: buildUserView(null),
    currentRoleText: getRoleText('feeder'),
    texts,
  },

  onShow() {
    this.setTabBarSelected(3);
    this.loadUserInfo();
  },

  setTabBarSelected(index) {
    if (typeof this.getTabBar !== 'function') {
      return;
    }
    const tabBar = this.getTabBar();
    if (tabBar && tabBar.setData) {
      tabBar.setData({ selected: index });
    }
  },

  async loadUserInfo() {
    const token = wx.getStorageSync(STORAGE_TOKEN_KEY);
    const localUser = wx.getStorageSync(STORAGE_USER_KEY);
    const wechatProfile = wx.getStorageSync(STORAGE_WECHAT_PROFILE_KEY);

    if (!token && !localUser && !wechatProfile) {
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }

    const nextUser = buildUserView(localUser, wechatProfile);
    this.setData({
      user: nextUser,
      currentRoleText: getRoleText(nextUser.role),
      errorMessage: '',
    });

    app.globalData = app.globalData || {};
    app.globalData.token = token || '';
    app.globalData.loginUser = nextUser;
    app.globalData.wechatProfile = wechatProfile || {};
  },

  goMyPublishedOrders() {
    wx.navigateTo({
      url: '/pages/my-published-orders/index',
    });
  },

  goMyTakenOrders() {
    wx.navigateTo({
      url: '/pages/my-taken-orders/index',
    });
  },

  goMyReviews() {
    wx.showToast({
      title: '\u6211\u7684\u8bc4\u4ef7\u9875\u9762\u5f85\u8865\u5145',
      icon: 'none',
    });
  },

  handleLogout() {
    wx.removeStorageSync(STORAGE_TOKEN_KEY);
    wx.removeStorageSync(STORAGE_USER_KEY);
    wx.removeStorageSync(STORAGE_WECHAT_PROFILE_KEY);

    app.globalData = app.globalData || {};
    delete app.globalData.token;
    delete app.globalData.loginUser;
    delete app.globalData.wechatProfile;

    wx.reLaunch({
      url: '/pages/login/login',
    });
  },
});
