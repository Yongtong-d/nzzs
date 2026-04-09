Page({
  onShow() {
    this.setTabBarSelected(2);
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
});
