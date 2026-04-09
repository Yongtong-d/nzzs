Page({
  data: {
    texts: {
      pageTitle: '\u9996\u9875',
      pageSubtitle: '\u5ba0\u7269\u5582\u517b\u8005\u5de5\u4f5c\u53f0',
      createTitle: '\u5feb\u901f\u63a5\u5355',
      createDesc: '\u67e5\u770b\u6700\u65b0\u53ef\u63a5\u670d\u52a1\u8ba2\u5355\uff0c\u6309\u65f6\u95f4\u548c\u9700\u6c42\u5feb\u901f\u54cd\u5e94\u3002',
      pickupButtonText: '\u53bb\u63a5\u5355',
      quickEntryTitle: '\u5feb\u6377\u5165\u53e3',
      orderHallTitle: '\u8ba2\u5355\u7ba1\u7406',
      orderHallDesc: '\u7edf\u4e00\u5728\u8ba2\u5355\u9875\u67e5\u770b\u4e0e\u7ba1\u7406',
      myTakenTitle: '\u6211\u7684\u63a5\u5355',
      myTakenDesc: '\u67e5\u770b\u5f53\u524d\u8d1f\u8d23\u7684\u8ba2\u5355',
      recordsTitle: '\u670d\u52a1\u8bb0\u5f55',
      recordsDesc: '\u4ece\u6211\u7684\u63a5\u5355\u8fdb\u5165\u8bb0\u5f55\u8be6\u60c5',
      profileTitle: '\u4e2a\u4eba\u4e2d\u5fc3',
      profileDesc: '\u67e5\u770b\u8d44\u6599\u4e0e\u8d26\u6237\u8bbe\u7f6e',
    },
  },

  onShow() {
    this.setTabBarSelected(0);
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

  goOrderHall() {
    wx.switchTab({
      url: '/pages/order-hall/index',
    });
  },

  goTakenOrders() {
    wx.navigateTo({
      url: '/pages/my-taken-orders/index',
    });
  },

  goServiceRecords() {
    wx.navigateTo({
      url: '/pages/my-taken-orders/index',
    });
  },

  goProfile() {
    wx.switchTab({
      url: '/pages/profile/index',
    });
  },
});
