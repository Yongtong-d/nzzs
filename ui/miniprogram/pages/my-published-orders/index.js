const STORAGE_TOKEN_KEY = 'accessToken';
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

function extractTimeRange(remark) {
  if (!remark) {
    return '';
  }

  const startMatch = remark.match(/\u5f00\u59cb\u65f6\u95f4[:\uff1a]\s*(\d{2}:\d{2})/);
  const endMatch = remark.match(/\u7ed3\u675f\u65f6\u95f4[:\uff1a]\s*(\d{2}:\d{2})/);

  if (startMatch && endMatch) {
    return `${startMatch[1]}-${endMatch[1]}`;
  }
  if (startMatch) {
    return startMatch[1];
  }
  return '';
}

function getStatusMeta(status) {
  const map = {
    all: { text: '\u5168\u90e8', className: 'all' },
    pending: { text: '\u5f85\u63a5\u5355', className: 'pending' },
    accepted: { text: '\u5df2\u63a5\u5355', className: 'accepted' },
    serving: { text: '\u670d\u52a1\u4e2d', className: 'serving' },
    completed: { text: '\u5df2\u5b8c\u6210', className: 'completed' },
    cancelled: { text: '\u5df2\u53d6\u6d88', className: 'cancelled' },
  };

  return map[status] || { text: status || '\u672a\u77e5\u72b6\u6001', className: 'pending' };
}

function mapOrder(item) {
  const statusMeta = getStatusMeta(item.status);
  const serviceDate = item.service && item.service.service_date ? formatDate(item.service.service_date) : '\u5f85\u5b9a';
  const timeRange = item.service && item.service.service_remark ? extractTimeRange(item.service.service_remark) : '';

  return {
    id: item.id,
    rawStatus: item.status,
    petName: item.pet && item.pet.pet_name ? item.pet.pet_name : '\u672a\u547d\u540d\u5ba0\u7269',
    serviceType: item.service && item.service.service_type ? item.service.service_type : '\u6682\u65e0\u670d\u52a1\u7c7b\u578b',
    serviceTime: timeRange ? `${serviceDate} ${timeRange}` : serviceDate,
    price: item.service && item.service.service_price ? item.service.service_price : '0',
    statusText: statusMeta.text,
    statusClass: statusMeta.className,
  };
}

const texts = {
  loadingText: '\u6b63\u5728\u52a0\u8f7d\u8ba2\u5355\u5217\u8868...',
  emptyText: '\u6682\u65e0\u7b26\u5408\u6761\u4ef6\u7684\u8ba2\u5355\uff0c\u4e0b\u62c9\u53ef\u91cd\u65b0\u5237\u65b0\u3002',
  serviceTimeLabel: '\u670d\u52a1\u65f6\u95f4',
  priceLabel: '\u4ef7\u683c',
  pricePrefix: '\u00a5',
  detailButton: '\u67e5\u770b\u8be6\u60c5',
};

const tabs = [
  { label: '\u5168\u90e8', value: 'all' },
  { label: '\u5f85\u63a5\u5355', value: 'pending' },
  { label: '\u5df2\u63a5\u5355', value: 'accepted' },
  { label: '\u670d\u52a1\u4e2d', value: 'serving' },
  { label: '\u5df2\u5b8c\u6210', value: 'completed' },
  { label: '\u5df2\u53d6\u6d88', value: 'cancelled' },
];

Page({
  data: {
    loading: false,
    errorMessage: '',
    texts,
    tabs,
    currentTab: 'all',
    orderList: [],
    filteredOrders: [],
  },

  onLoad() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders(true);
  },

  async loadOrders(fromPullDown = false) {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55',
        orderList: [],
        filteredOrders: [],
      });
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
      return;
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

      const list = Array.isArray(result.data) ? result.data.map(mapOrder) : [];
      this.setData({
        orderList: list,
      });
      this.applyFilters();
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '\u8ba2\u5355\u5217\u8868\u52a0\u8f7d\u5931\u8d25',
        orderList: [],
        filteredOrders: [],
      });
    } finally {
      this.setData({
        loading: false,
      });
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  applyFilters() {
    const { currentTab, orderList } = this.data;
    const filteredOrders =
      currentTab === 'all' ? [...orderList] : orderList.filter((item) => item.rawStatus === currentTab);

    this.setData({
      filteredOrders,
    });
  },

  handleTabChange(e) {
    const { value } = e.currentTarget.dataset;
    if (!value || value === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: value,
    });
    this.applyFilters();
  },

  goOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },
});
