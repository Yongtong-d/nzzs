const STORAGE_TOKEN_KEY = 'accessToken';
const STORAGE_USER_KEY = 'loginUser';
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

function formatDate(value) {
  if (!value) {
    return '\u5f85\u5b9a';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStatusMeta(status) {
  const statusMap = {
    pending: { text: '\u5f85\u63a5\u5355', className: 'pending' },
    accepted: { text: '\u5df2\u63a5\u5355', className: 'accepted' },
    serving: { text: '\u670d\u52a1\u4e2d', className: 'serving' },
    completed: { text: '\u5df2\u5b8c\u6210', className: 'completed' },
    cancelled: { text: '\u5df2\u53d6\u6d88', className: 'cancelled' },
  };

  return statusMap[status] || { text: status || '\u672a\u77e5\u72b6\u6001', className: 'pending' };
}

const texts = {
  roleLabel: '\u5f53\u524d\u8eab\u4efd',
  roleName: '\u5ba0\u7269\u5582\u517b\u8005',
  switchRoleText: '\u5207\u6362\u8eab\u4efd',
  pickupButtonText: '\u53bb\u63a5\u5355',
  quickEntryTitle: '\u5feb\u6377\u5165\u53e3',
  orderHallTitle: '\u8ba2\u5355\u5927\u5385',
  orderHallDesc: '\u6d4f\u89c8\u53ef\u63a5\u53d6\u7684\u670d\u52a1\u8ba2\u5355',
  myTakenTitle: '\u6211\u63a5\u53d6\u7684\u8ba2\u5355',
  myTakenDesc: '\u67e5\u770b\u5f53\u524d\u8d1f\u8d23\u7684\u8ba2\u5355',
  recordsTitle: '\u670d\u52a1\u8bb0\u5f55',
  recordsDesc: '\u67e5\u770b\u5386\u53f2\u670d\u52a1\u8fdb\u5ea6',
  profileTitle: '\u4e2a\u4eba\u4e2d\u5fc3',
  profileDesc: '\u67e5\u770b\u8d44\u6599\u4e0e\u8d26\u6237\u8bbe\u7f6e',
  pendingOrdersTitle: '\u5f85\u670d\u52a1\u8ba2\u5355',
  viewAllText: '\u67e5\u770b\u5168\u90e8',
  loadingText: '\u6b63\u5728\u52a0\u8f7d\u5f85\u670d\u52a1\u8ba2\u5355...',
  emptyText: '\u6682\u65e0\u5f85\u670d\u52a1\u8ba2\u5355\uff0c\u5148\u53bb\u8ba2\u5355\u5927\u5385\u770b\u770b\u5427\u3002',
  serviceTimeLabel: '\u670d\u52a1\u65f6\u95f4',
  detailButtonText: '\u67e5\u770b\u8be6\u60c5',
};

Page({
  data: {
    loading: false,
    errorMessage: '',
    pendingOrders: [],
    texts,
  },

  onShow() {
    this.loadTakenOrders();
  },

  async loadTakenOrders() {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55',
        pendingOrders: [],
      });
      return;
    }

    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);
    if (loginUser) {
      app.globalData = app.globalData || {};
      app.globalData.loginUser = loginUser;
      app.globalData.token = token;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    try {
      const result = await request({
        url: '/orders/my/taken',
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderList = Array.isArray(result.data) ? result.data : [];
      const pendingOrders = orderList.slice(0, 5).map((item) => {
        const statusMeta = getStatusMeta(item.status);
        return {
          id: item.id,
          rawStatus: item.status,
          petName: item.pet && item.pet.pet_name ? item.pet.pet_name : '\u672a\u547d\u540d\u5ba0\u7269',
          serviceType: item.service && item.service.service_type ? item.service.service_type : '\u6682\u65e0\u670d\u52a1\u7c7b\u578b',
          serviceTime: item.service && item.service.service_date ? formatDate(item.service.service_date) : '\u5f85\u5b9a',
          statusText: statusMeta.text,
          statusClass: statusMeta.className,
        };
      });

      this.setData({
        pendingOrders,
      });
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '\u5f85\u670d\u52a1\u8ba2\u5355\u52a0\u8f7d\u5931\u8d25',
        pendingOrders: [],
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  goOrderHall() {
    wx.navigateTo({
      url: '/pages/order-hall/index',
    });
  },

  goTakenOrders() {
    wx.navigateTo({
      url: '/pages/my-taken-orders/index',
    });
  },

  goServiceRecords() {
    const recordOrder = this.data.pendingOrders.find(
      (item) => item.rawStatus === 'accepted' || item.rawStatus === 'serving'
    );

    if (recordOrder && recordOrder.id) {
      wx.navigateTo({
        url: `/pages/service-record-list/index?order_id=${recordOrder.id}`,
      });
      return;
    }

    wx.showToast({
      title: '\u8bf7\u5148\u4ece\u6211\u63a5\u53d6\u7684\u8ba2\u5355\u4e2d\u9009\u62e9\u8ba2\u5355',
      icon: 'none',
    });

    wx.navigateTo({
      url: '/pages/my-taken-orders/index',
    });
  },

  goProfile() {
    wx.navigateTo({
      url: '/pages/profile/index',
    });
  },

  goRoleSelect() {
    wx.navigateTo({
      url: '/pages/role-select/index',
    });
  },

  goOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },
});
