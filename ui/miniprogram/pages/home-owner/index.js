Page({
  data: {
    texts: {
      pageTitle: '\u9996\u9875',
      pageSubtitle: '\u5ba0\u7269\u4e3b\u4eba\u7684\u670d\u52a1\u7ba1\u7406',
      createTitle: '\u5feb\u901f\u53d1\u5e03\u9700\u6c42',
      createDesc: '\u7b80\u6d01\u63d0\u4ea4\u5ba0\u7269\u7167\u770b\u9700\u6c42\uff0c\u5feb\u901f\u5339\u914d\u5582\u517b\u8005\u3002',
      createButton: '\u53d1\u5e03\u65b0\u8ba2\u5355',
      quickEntryTitle: '\u6838\u5fc3\u5165\u53e3',
      orderCenterTitle: '\u8ba2\u5355\u7ba1\u7406',
      orderCenterDesc: '\u7edf\u4e00\u5728\u8ba2\u5355\u9875\u67e5\u770b\u4e0e\u7ba1\u7406',
      publishedTitle: '\u6211\u7684\u53d1\u5e03',
      publishedDesc: '\u67e5\u770b\u5df2\u53d1\u5e03\u8ba2\u5355\u8bb0\u5f55',
      reviewsTitle: '\u6211\u7684\u8bc4\u4ef7',
      reviewsDesc: '\u7ba1\u7406\u6536\u5230\u548c\u53d1\u51fa\u7684\u8bc4\u4ef7',
      profileTitle: '\u4e2a\u4eba\u4e2d\u5fc3',
      profileDesc: '\u8d26\u53f7\u4fe1\u606f\u4e0e\u8bbe\u7f6e',
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

  goCreateOrder() {
    wx.navigateTo({
      url: '/pages/order-create/index',
    });
  },

  goPublishedOrders() {
    wx.switchTab({
      url: '/pages/order-hall/index',
    });
  },

  goServiceRecords() {
    wx.navigateTo({
      url: '/pages/my-published-orders/index',
    });
  },

  goMyReviews() {
    wx.showToast({
      title: '\u6211\u7684\u8bc4\u4ef7\u9875\u9762\u5f85\u8865\u5145',
      icon: 'none',
    });
  },

  goProfile() {
    wx.switchTab({
      url: '/pages/profile/index',
    });
  },
});
