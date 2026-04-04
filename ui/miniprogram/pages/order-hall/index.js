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

function getStatusMeta(status) {
  const map = {
    pending: { text: '\u5f85\u63a5\u5355', className: 'pending' },
    accepted: { text: '\u5df2\u63a5\u5355', className: 'accepted' },
    serving: { text: '\u670d\u52a1\u4e2d', className: 'serving' },
    completed: { text: '\u5df2\u5b8c\u6210', className: 'completed' },
    cancelled: { text: '\u5df2\u53d6\u6d88', className: 'cancelled' },
  };

  return map[status] || { text: status || '\u672a\u77e5\u72b6\u6001', className: 'pending' };
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

function mapOrder(item) {
  const statusMeta = getStatusMeta(item.status);
  const petType = item.pet && item.pet.pet_type ? item.pet.pet_type : '';
  const petBreed = item.pet && item.pet.pet_breed ? item.pet.pet_breed : '';
  const serviceDate = item.service && item.service.service_date ? formatDate(item.service.service_date) : '\u5f85\u5b9a';
  const timeRange = item.service && item.service.service_remark ? extractTimeRange(item.service.service_remark) : '';

  return {
    id: item.id,
    rawStatus: item.status,
    petName: item.pet && item.pet.pet_name ? item.pet.pet_name : '\u672a\u547d\u540d\u5ba0\u7269',
    petTypeBreed: [petType, petBreed].filter(Boolean).join(' / ') || '\u6682\u65e0\u54c1\u79cd\u4fe1\u606f',
    serviceType: item.service && item.service.service_type ? item.service.service_type : '\u6682\u65e0\u670d\u52a1\u7c7b\u578b',
    serviceDate: item.service && item.service.service_date ? item.service.service_date : '',
    serviceDateTime: timeRange ? `${serviceDate} ${timeRange}` : serviceDate,
    address: item.service && item.service.service_address ? item.service.service_address : '\u6682\u65e0\u5730\u5740',
    price: item.service && item.service.service_price ? item.service.service_price : '0',
    statusText: statusMeta.text,
    statusClass: statusMeta.className,
    acceptDisabled: item.status !== 'pending',
    createdAt: item.created_at || '',
  };
}

function sortOrders(list, sortValue) {
  const nextList = [...list];

  if (sortValue === '\u4ef7\u683c\u4f18\u5148') {
    nextList.sort((a, b) => Number(b.price) - Number(a.price));
    return nextList;
  }

  nextList.sort((a, b) => {
    const timeA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
    const timeB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
    return timeA - timeB;
  });
  return nextList;
}

const texts = {
  filterTitle: '\u7b5b\u9009\u6761\u4ef6',
  reloadText: '\u91cd\u65b0\u52a0\u8f7d',
  serviceTypeLabel: '\u670d\u52a1\u7c7b\u578b',
  dateFilterLabel: '\u65e5\u671f\u7b5b\u9009',
  dateFilterPlaceholder: '\u5168\u90e8\u65e5\u671f',
  sortLabel: '\u6392\u5e8f\u65b9\u5f0f',
  clearDateText: '\u6e05\u7a7a\u65e5\u671f\u7b5b\u9009',
  listTitle: '\u8ba2\u5355\u5217\u8868',
  orderCountSuffix: '\u6761',
  loadingText: '\u6b63\u5728\u52a0\u8f7d\u8ba2\u5355\u5927\u5385...',
  emptyText: '\u6682\u65e0\u7b26\u5408\u6761\u4ef6\u7684\u8ba2\u5355\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002',
  serviceTypeInfoLabel: '\u670d\u52a1\u7c7b\u578b',
  serviceTimeInfoLabel: '\u670d\u52a1\u65f6\u95f4',
  addressInfoLabel: '\u670d\u52a1\u5730\u5740',
  pricePrefix: '\u00a5',
  detailButton: '\u67e5\u770b\u8be6\u60c5',
  acceptButton: '\u63a5\u5355',
  acceptedButton: '\u4e0d\u53ef\u63a5\u5355',
};

Page({
  data: {
    loading: false,
    errorMessage: '',
    texts,
    serviceTypeOptions: ['\u5168\u90e8\u670d\u52a1', '\u4e0a\u95e8\u5582\u517b', '\u905b\u72d7', '\u4e0a\u95e8\u7167\u770b'],
    sortOptions: ['\u65f6\u95f4\u4f18\u5148', '\u4ef7\u683c\u4f18\u5148'],
    serviceTypeIndex: 0,
    sortIndex: 0,
    selectedDate: '',
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
        url: '/orders/hall',
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
        errorMessage: (error && error.message) || '\u8ba2\u5355\u5927\u5385\u52a0\u8f7d\u5931\u8d25',
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
    const serviceType = this.data.serviceTypeOptions[this.data.serviceTypeIndex];
    const sortValue = this.data.sortOptions[this.data.sortIndex];
    const selectedDate = this.data.selectedDate;

    let list = [...this.data.orderList];

    if (serviceType && serviceType !== '\u5168\u90e8\u670d\u52a1') {
      list = list.filter((item) => item.serviceType === serviceType);
    }

    if (selectedDate) {
      list = list.filter((item) => item.serviceDate === selectedDate);
    }

    list = sortOrders(list, sortValue);

    this.setData({
      filteredOrders: list,
    });
  },

  handleServiceTypeFilterChange(e) {
    this.setData({
      serviceTypeIndex: Number(e.detail.value),
    });
    this.applyFilters();
  },

  handleDateFilterChange(e) {
    this.setData({
      selectedDate: e.detail.value,
    });
    this.applyFilters();
  },

  handleSortChange(e) {
    this.setData({
      sortIndex: Number(e.detail.value),
    });
    this.applyFilters();
  },

  clearDateFilter() {
    this.setData({
      selectedDate: '',
    });
    this.applyFilters();
  },

  handleReload() {
    this.loadOrders();
  },

  async handleAcceptOrder(e) {
    const { id } = e.currentTarget.dataset;
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!id || !token || this.data.loading) {
      return;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: '\u63a5\u5355\u4e2d',
      mask: true,
    });

    try {
      await request({
        url: `/orders/${id}/accept`,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      wx.showToast({
        title: '\u63a5\u5355\u6210\u529f',
        icon: 'success',
      });

      await this.loadOrders();
    } catch (error) {
      const message = (error && error.message) || '\u63a5\u5355\u5931\u8d25';
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

  goOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`,
    });
  },
});
