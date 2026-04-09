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

function getUserRole() {
  const appUser = app.globalData && app.globalData.loginUser;
  const cacheUser = wx.getStorageSync(STORAGE_USER_KEY);
  return (appUser && appUser.role) || (cacheUser && cacheUser.role) || 'feeder';
}

function getStatusMeta(status) {
  const map = {
    pending: { text: '待接单', className: 'pending' },
    accepted: { text: '已接单', className: 'accepted' },
    serving: { text: '服务中', className: 'serving' },
    completed: { text: '已完成', className: 'completed' },
    cancelled: { text: '已取消', className: 'cancelled' },
  };

  return map[status] || { text: status || '未知状态', className: 'pending' };
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

function extractTimeRange(remark) {
  if (!remark) {
    return '';
  }

  const startMatch = remark.match(/开始时间[:：]\s*(\d{2}:\d{2})/);
  const endMatch = remark.match(/结束时间[:：]\s*(\d{2}:\d{2})/);

  if (startMatch && endMatch) {
    return `${startMatch[1]}-${endMatch[1]}`;
  }
  if (startMatch) {
    return startMatch[1];
  }
  return '';
}

function mapOrder(item, mode) {
  const statusMeta = getStatusMeta(item.status);
  const petType = item.pet && item.pet.pet_type ? item.pet.pet_type : '';
  const petBreed = item.pet && item.pet.pet_breed ? item.pet.pet_breed : '';
  const serviceDate = item.service && item.service.service_date ? formatDate(item.service.service_date) : '待定';
  const timeRange = item.service && item.service.service_remark ? extractTimeRange(item.service.service_remark) : '';

  return {
    id: item.id,
    rawStatus: item.status,
    petName: item.pet && item.pet.pet_name ? item.pet.pet_name : '未命名宠物',
    petTypeBreed: [petType, petBreed].filter(Boolean).join(' / ') || '暂无品种信息',
    serviceType: item.service && item.service.service_type ? item.service.service_type : '暂无服务类型',
    serviceDate: item.service && item.service.service_date ? item.service.service_date : '',
    serviceDateTime: timeRange ? `${serviceDate} ${timeRange}` : serviceDate,
    address: item.service && item.service.service_address ? item.service.service_address : '暂无地址',
    price: item.service && item.service.service_price ? item.service.service_price : '0',
    statusText: statusMeta.text,
    statusClass: statusMeta.className,
    showAccept: mode === 'hall' && item.status === 'pending',
  };
}

function sortOrders(list, sortValue) {
  const nextList = [...list];

  if (sortValue === '价格优先') {
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

function buildTexts(role, mode) {
  if (mode === 'hall') {
    return {
      filterTitle: '筛选条件',
      reloadText: '重新加载',
      serviceTypeLabel: '服务类型',
      dateFilterLabel: '日期筛选',
      dateFilterPlaceholder: '全部日期',
      sortLabel: '排序方式',
      clearDateText: '清空日期筛选',
      listTitle: '可接订单',
      orderCountSuffix: '条',
      loadingText: '正在加载可接订单...',
      emptyText: '暂无可接订单，请稍后再试。',
      serviceTypeInfoLabel: '服务类型',
      serviceTimeInfoLabel: '服务时间',
      addressInfoLabel: '服务地址',
      pricePrefix: '¥',
      detailButton: '查看详情',
      acceptButton: '接单',
      acceptedButton: '不可接单',
    };
  }

  return {
    filterTitle: '筛选条件',
    reloadText: '重新加载',
    serviceTypeLabel: '服务类型',
    dateFilterLabel: '日期筛选',
    dateFilterPlaceholder: '全部日期',
    sortLabel: '排序方式',
    clearDateText: '清空日期筛选',
    listTitle: role === 'feeder' ? '我的接单' : '我的订单',
    orderCountSuffix: '条',
    loadingText: role === 'feeder' ? '正在加载我的接单...' : '正在加载我的订单...',
    emptyText: role === 'feeder' ? '暂无接单记录。' : '暂无已发布订单。',
    serviceTypeInfoLabel: '服务类型',
    serviceTimeInfoLabel: '服务时间',
    addressInfoLabel: '服务地址',
    pricePrefix: '¥',
    detailButton: '查看详情',
    acceptButton: '接单',
    acceptedButton: '不可接单',
  };
}

Page({
  data: {
    loading: false,
    errorMessage: '',
    role: 'feeder',
    sourceMode: 'taken',
    texts: buildTexts('feeder', 'taken'),
    serviceTypeOptions: ['全部服务'],
    sortOptions: ['时间优先', '价格优先'],
    serviceTypeIndex: 0,
    sortIndex: 0,
    selectedDate: '',
    orderList: [],
    filteredOrders: [],
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.setTabBarSelected(1);
    this.loadOrders();
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

  onPullDownRefresh() {
    this.loadOrders(true);
  },

  async loadOrders(fromPullDown = false) {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '请先完成登录',
        orderList: [],
        filteredOrders: [],
      });
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
      return;
    }

    const role = getUserRole();

    this.setData({
      loading: true,
      errorMessage: '',
      role,
    });

    try {
      let sourceMode = role === 'owner' ? 'owner' : 'taken';
      let endpoint = role === 'owner' ? '/orders/my/published' : '/orders/my/taken';

      let result = await request({
        url: endpoint,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      let rawList = Array.isArray(result.data) ? result.data : [];

      if (role === 'feeder' && rawList.length === 0) {
        sourceMode = 'hall';
        endpoint = '/orders/hall';
        result = await request({
          url: endpoint,
          method: 'GET',
          header: {
            Authorization: `Bearer ${token}`,
          },
        });
        rawList = Array.isArray(result.data) ? result.data : [];
      }

      const orderList = rawList.map((item) => mapOrder(item, sourceMode));
      const serviceTypes = Array.from(new Set(orderList.map((item) => item.serviceType).filter(Boolean)));

      this.setData({
        sourceMode,
        texts: buildTexts(role, sourceMode),
        serviceTypeOptions: ['全部服务', ...serviceTypes],
        serviceTypeIndex: 0,
        selectedDate: '',
        orderList,
      });

      this.applyFilters();
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '订单加载失败',
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
    const serviceType = this.data.serviceTypeOptions[this.data.serviceTypeIndex] || '全部服务';
    const sortValue = this.data.sortOptions[this.data.sortIndex];
    const selectedDate = this.data.selectedDate;

    let list = [...this.data.orderList];

    if (serviceType !== '全部服务') {
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
    if (this.data.sourceMode !== 'hall') {
      return;
    }

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
      title: '接单中',
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
        title: '接单成功',
        icon: 'success',
      });

      await this.loadOrders();
    } catch (error) {
      const message = (error && error.message) || '接单失败';
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
