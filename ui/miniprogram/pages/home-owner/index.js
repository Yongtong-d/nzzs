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
          `请求失败，状态码 ${res.statusCode}`;
        reject(new Error(message));
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络请求失败'));
      },
    });
  });
}

function formatDate(value) {
  if (!value) {
    return '待定';
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
    pending: { text: '待接单', className: 'pending' },
    accepted: { text: '已接单', className: 'accepted' },
    serving: { text: '服务中', className: 'serving' },
    completed: { text: '已完成', className: 'completed' },
    cancelled: { text: '已取消', className: 'cancelled' },
  };

  return statusMap[status] || { text: status || '未知状态', className: 'pending' };
}

Page({
  data: {
    loading: false,
    errorMessage: '',
    recentOrders: [],
  },

  onShow() {
    this.loadRecentOrders();
  },

  async loadRecentOrders() {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '请先完成登录',
        recentOrders: [],
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
        url: '/orders/my/published',
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderList = Array.isArray(result.data) ? result.data : [];
      const recentOrders = orderList.slice(0, 5).map((item) => {
        const statusMeta = getStatusMeta(item.status);
        return {
          id: item.id,
          petName: item.pet && item.pet.pet_name ? item.pet.pet_name : '未命名宠物',
          serviceType: item.service && item.service.service_type ? item.service.service_type : '暂无服务类型',
          serviceTime: item.service && item.service.service_date ? formatDate(item.service.service_date) : '待定',
          statusText: statusMeta.text,
          statusClass: statusMeta.className,
        };
      });

      this.setData({
        recentOrders,
      });
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '最近订单加载失败',
        recentOrders: [],
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  goCreateOrder() {
    wx.navigateTo({
      url: '/pages/order-create/index',
    });
  },

  goPublishedOrders() {
    wx.navigateTo({
      url: '/pages/my-published-orders/index',
    });
  },

  goServiceRecords() {
    wx.navigateTo({
      url: '/pages/service-records/index',
    });
  },

  goMyReviews() {
    wx.navigateTo({
      url: '/pages/my-reviews/index',
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
