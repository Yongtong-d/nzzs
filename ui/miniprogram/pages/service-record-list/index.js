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

function formatDateTime(value) {
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
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function mapRecord(item) {
  return {
    id: item.id,
    checkinTime: formatDateTime(item.checkin_time),
    content: item.content || '\u6682\u65e0',
    imageUrl: item.image_url || '',
    locationText: item.location_text || '\u6682\u65e0',
    createdAt: item.created_at || '',
  };
}

function canCreateRecord(role, status) {
  return role === 'feeder' && (status === 'accepted' || status === 'serving');
}

const texts = {
  loadingText: '\u6b63\u5728\u52a0\u8f7d\u670d\u52a1\u8bb0\u5f55...',
  emptyText: '\u8fd8\u6ca1\u6709\u670d\u52a1\u8bb0\u5f55\uff0c\u53ef\u4ee5\u4ece\u4e0b\u65b9\u65b0\u589e\u672c\u6b21\u6253\u5361\u5185\u5bb9\u3002',
  contentLabel: '\u8bb0\u5f55\u5185\u5bb9',
  locationLabel: '\u5b9a\u4f4d\u63cf\u8ff0',
  imageLabel: '\u73b0\u573a\u56fe\u7247',
  createButton: '\u65b0\u589e\u8bb0\u5f55',
};

Page({
  data: {
    loading: false,
    errorMessage: '',
    orderId: '',
    skipNextShowRefresh: false,
    records: [],
    userRole: '',
    orderStatus: '',
    showCreateButton: false,
    texts,
  },

  onLoad(options) {
    const orderId = options && options.order_id ? String(options.order_id) : '';
    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);

    this.setData({
      orderId,
      userRole: loginUser && loginUser.role ? loginUser.role : '',
      skipNextShowRefresh: true,
    });

    if (!orderId) {
      this.setData({
        errorMessage: '\u7f3a\u5c11 order_id',
      });
      return;
    }

    this.loadPageData();
  },

  onShow() {
    if (!this.data.orderId) {
      return;
    }

    if (this.data.skipNextShowRefresh) {
      this.setData({
        skipNextShowRefresh: false,
      });
      return;
    }

    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  async loadPageData(fromPullDown = false) {
    await Promise.all([this.loadRecords(), this.loadOrderInfo()]).finally(() => {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    });
  },

  async loadRecords() {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55',
        records: [],
      });
      return;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    try {
      const result = await request({
        url: `/orders/${this.data.orderId}/records`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const list = Array.isArray(result.data) ? result.data.map(mapRecord).reverse() : [];
      this.setData({
        records: list,
      });
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '\u670d\u52a1\u8bb0\u5f55\u52a0\u8f7d\u5931\u8d25',
        records: [],
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  async loadOrderInfo() {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      return;
    }

    try {
      const result = await request({
        url: `/orders/${this.data.orderId}`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderStatus = result.data && result.data.status ? result.data.status : '';
      this.setData({
        orderStatus,
        showCreateButton: canCreateRecord(this.data.userRole, orderStatus),
      });
    } catch (error) {
      this.setData({
        showCreateButton: false,
      });
    }
  },

  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) {
      return;
    }

    wx.previewImage({
      current: url,
      urls: [url],
    });
  },

  goCreateRecord() {
    wx.navigateTo({
      url: `/pages/service-record-create/index?order_id=${this.data.orderId}`,
    });
  },
});
