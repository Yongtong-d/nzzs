const STORAGE_USER_KEY = 'loginUser';
const TAB_PAGES = ['pages/home-owner/index', 'pages/order-hall/index', 'pages/message/index', 'pages/profile/index'];

function normalizePath(path) {
  if (!path) {
    return '';
  }
  return path.replace(/^\//, '');
}

function getCurrentRoute() {
  const pages = getCurrentPages();
  if (!pages || !pages.length) {
    return '';
  }
  return normalizePath(pages[pages.length - 1].route || '');
}

function buildTabList(role) {
  return [
    {
      pagePath: role === 'feeder' ? 'pages/home-feeder/index' : 'pages/home-owner/index',
      text: '\u9996\u9875',
      iconPath: '/assets/tab/home.png',
      selectedIconPath: '/assets/tab/home-active.png',
    },
    {
      pagePath: 'pages/order-hall/index',
      text: '\u8ba2\u5355',
      iconPath: '/assets/tab/order.png',
      selectedIconPath: '/assets/tab/order-active.png',
    },
    {
      pagePath: 'pages/message/index',
      text: '\u6d88\u606f',
      iconPath: '/assets/tab/message.png',
      selectedIconPath: '/assets/tab/message-active.png',
    },
    {
      pagePath: 'pages/profile/index',
      text: '\u6211\u7684',
      iconPath: '/assets/tab/profile.png',
      selectedIconPath: '/assets/tab/profile-active.png',
    },
  ];
}

Component({
  data: {
    selected: 0,
    color: '#888888',
    selectedColor: '#F4D35E',
    role: 'feeder',
    list: buildTabList('feeder'),
  },
  lifetimes: {
    attached() {
      this.syncByRole();
    },
  },
  pageLifetimes: {
    show() {
      this.syncByRole();
    },
  },
  methods: {
    syncByRole() {
      const app = getApp();
      const appUser = app && app.globalData && app.globalData.loginUser;
      const cachedUser = wx.getStorageSync(STORAGE_USER_KEY);
      const role = (appUser && appUser.role) || (cachedUser && cachedUser.role) || 'feeder';
      const list = buildTabList(role);
      const route = getCurrentRoute();
      let selected = this.data.selected;

      const matchedIndex = list.findIndex((item) => normalizePath(item.pagePath) === route);
      if (matchedIndex >= 0) {
        selected = matchedIndex;
      }

      this.setData({
        role,
        list,
        selected,
      });
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      const targetPath = normalizePath(path);
      const currentRoute = getCurrentRoute();
      if (typeof index !== 'number' || !targetPath || targetPath === currentRoute) {
        return;
      }

      if (TAB_PAGES.includes(targetPath)) {
        wx.switchTab({
          url: `/${targetPath}`,
        });
        return;
      }

      wx.reLaunch({
        url: `/${targetPath}`,
      });
    },
  },
});
