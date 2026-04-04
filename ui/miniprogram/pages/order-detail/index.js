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

function extractFromRemark(remark, label) {
  if (!remark) {
    return '';
  }

  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${safeLabel}[:\\uFF1A]\\s*([^\\r\\n;\\uFF1B]+)`);
  const matched = remark.match(pattern);
  return matched ? matched[1].trim() : '';
}

function joinDateTime(serviceDate, remark) {
  const dateText = serviceDate ? formatDate(serviceDate) : '\u5f85\u5b9a';
  const start = extractFromRemark(remark, '\u5f00\u59cb\u65f6\u95f4');
  const end = extractFromRemark(remark, '\u7ed3\u675f\u65f6\u95f4');

  if (start && end) {
    return `${dateText} ${start}-${end}`;
  }
  if (start) {
    return `${dateText} ${start}`;
  }
  return dateText;
}

function buildRemarkWithoutMeta(remark) {
  if (!remark) {
    return '\u6682\u65e0';
  }

  const items = remark
    .split(/\r?\n|[;\uFF1B]/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item &&
        !item.startsWith('\u5f00\u59cb\u65f6\u95f4') &&
        !item.startsWith('\u7ed3\u675f\u65f6\u95f4') &&
        !item.startsWith('\u9700\u8981\u62cd\u7167\u53cd\u9988')
    );

  return items.length ? items.join('\n') : '\u6682\u65e0';
}

function buildPetCharacter(feedingRequirements) {
  return extractFromRemark(feedingRequirements, '\u6027\u683c\u63cf\u8ff0') || '\u6682\u65e0';
}

function buildFeedingNotes(feedingRequirements) {
  return extractFromRemark(feedingRequirements, '\u5582\u517b\u8bf4\u660e') || feedingRequirements || '\u6682\u65e0';
}

function buildPetImageUrl(feedingRequirements) {
  return extractFromRemark(feedingRequirements, '\u5ba0\u7269\u7167\u7247') || '';
}

function buildNeedPhotoFeedbackText(remark) {
  const result = extractFromRemark(remark, '\u9700\u8981\u62cd\u7167\u53cd\u9988');
  return result || '\u672a\u8bf4\u660e';
}

function mapOrderDetail(data) {
  const statusMeta = getStatusMeta(data.status);
  const feedingRequirements = data.pet && data.pet.pet_feeding_requirements ? data.pet.pet_feeding_requirements : '';
  const remark = data.service && data.service.service_remark ? data.service.service_remark : '';

  return {
    id: data.id,
    rawStatus: data.status,
    statusText: statusMeta.text,
    statusClass: statusMeta.className,
    serviceType: data.service && data.service.service_type ? data.service.service_type : '\u6682\u65e0',
    serviceDateTime: joinDateTime(data.service && data.service.service_date, remark),
    price: data.service && data.service.service_price ? data.service.service_price : '0',
    petName: data.pet && data.pet.pet_name ? data.pet.pet_name : '\u6682\u65e0',
    petType: data.pet && data.pet.pet_type ? data.pet.pet_type : '\u6682\u65e0',
    petBreed: data.pet && data.pet.pet_breed ? data.pet.pet_breed : '\u6682\u65e0',
    petAge: data.pet && (data.pet.pet_age || data.pet.pet_age === 0) ? `${data.pet.pet_age}` : '\u6682\u65e0',
    petGender: data.pet && data.pet.pet_gender ? data.pet.pet_gender : '\u6682\u65e0',
    petWeight: data.pet && data.pet.pet_weight_kg ? `${data.pet.pet_weight_kg}kg` : '\u6682\u65e0',
    petCharacter: buildPetCharacter(feedingRequirements),
    feedingNotes: buildFeedingNotes(feedingRequirements),
    specialNotes: data.pet && data.pet.pet_health_notes ? data.pet.pet_health_notes : '\u6682\u65e0',
    petImageUrl: buildPetImageUrl(feedingRequirements),
    address: data.service && data.service.service_address ? data.service.service_address : '\u6682\u65e0',
    contactName: data.service && data.service.service_contact_name ? data.service.service_contact_name : '\u6682\u65e0',
    contactPhone: data.service && data.service.service_contact_phone ? data.service.service_contact_phone : '\u6682\u65e0',
    needPhotoFeedbackText: buildNeedPhotoFeedbackText(remark),
    remark: buildRemarkWithoutMeta(remark),
  };
}

function getPrimaryAction(role, status) {
  if (status === 'completed') {
    return { key: 'review', text: '\u53bb\u8bc4\u4ef7' };
  }
  if (role === 'feeder' && status === 'pending') {
    return { key: 'accept', text: '\u63a5\u5355' };
  }
  if (role === 'feeder' && status === 'accepted') {
    return { key: 'start', text: '\u5f00\u59cb\u670d\u52a1' };
  }
  if (role === 'feeder' && status === 'serving') {
    return { key: 'finish', text: '\u5b8c\u6210\u8ba2\u5355' };
  }
  if (role === 'owner' && (status === 'pending' || status === 'accepted')) {
    return { key: 'cancel', text: '\u53d6\u6d88\u8ba2\u5355' };
  }
  return { key: '', text: '' };
}

const texts = {
  loadingText: '\u6b63\u5728\u52a0\u8f7d\u8ba2\u5355\u8be6\u60c5...',
  statusSectionTitle: '\u8ba2\u5355\u72b6\u6001',
  serviceTypeLabel: '\u670d\u52a1\u7c7b\u578b',
  serviceDateTimeLabel: '\u670d\u52a1\u65e5\u671f\u65f6\u95f4',
  priceLabel: '\u4ef7\u683c',
  pricePrefix: '\u00a5',
  petSectionTitle: '\u5ba0\u7269\u4fe1\u606f',
  petNameLabel: '\u5ba0\u7269\u6635\u79f0',
  petTypeLabel: '\u5ba0\u7269\u7c7b\u578b',
  petBreedLabel: '\u54c1\u79cd',
  petAgeLabel: '\u5e74\u9f84',
  petGenderLabel: '\u6027\u522b',
  petWeightLabel: '\u4f53\u91cd',
  petCharacterLabel: '\u6027\u683c\u63cf\u8ff0',
  feedingNotesLabel: '\u5582\u517b\u8bf4\u660e',
  specialNotesLabel: '\u7279\u6b8a\u6ce8\u610f\u4e8b\u9879',
  petImageLabel: '\u5ba0\u7269\u7167\u7247',
  noImageText: '\u6682\u65e0\u5ba0\u7269\u7167\u7247',
  serviceSectionTitle: '\u670d\u52a1\u4fe1\u606f',
  addressLabel: '\u670d\u52a1\u5730\u5740',
  contactNameLabel: '\u8054\u7cfb\u4eba',
  contactPhoneLabel: '\u8054\u7cfb\u7535\u8bdd',
  photoFeedbackLabel: '\u662f\u5426\u9700\u8981\u62cd\u7167\u53cd\u9988',
  remarkLabel: '\u5907\u6ce8',
  recordButton: '\u67e5\u770b\u670d\u52a1\u8bb0\u5f55',
};

Page({
  data: {
    loading: false,
    actionLoading: false,
    errorMessage: '',
    orderId: '',
    userRole: '',
    order: {},
    primaryAction: { key: '', text: '' },
    texts,
  },

  onLoad(options) {
    const orderId = options && options.id ? String(options.id) : '';
    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);

    this.setData({
      orderId,
      userRole: loginUser && loginUser.role ? loginUser.role : '',
    });

    if (!orderId) {
      this.setData({
        errorMessage: '\u7f3a\u5c11\u8ba2\u5355 ID',
      });
      return;
    }

    this.loadOrderDetail();
  },

  onPullDownRefresh() {
    this.loadOrderDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadOrderDetail() {
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55',
      });
      return;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    try {
      const result = await request({
        url: `/orders/${this.data.orderId}`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const order = result.data ? mapOrderDetail(result.data) : {};
      this.setData({
        order,
        primaryAction: getPrimaryAction(this.data.userRole, order.rawStatus),
      });
    } catch (error) {
      this.setData({
        errorMessage: (error && error.message) || '\u8ba2\u5355\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  async handlePrimaryAction() {
    if (!this.data.primaryAction.key || this.data.actionLoading) {
      return;
    }

    if (this.data.primaryAction.key === 'review') {
      wx.navigateTo({
        url: `/pages/review-submit/index?order_id=${this.data.orderId}`,
      });
      return;
    }

    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      this.setData({
        errorMessage: '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55',
      });
      return;
    }

    const actionMap = {
      accept: { url: `/orders/${this.data.orderId}/accept`, method: 'POST', title: '\u63a5\u5355\u4e2d' },
      start: { url: `/orders/${this.data.orderId}/start`, method: 'POST', title: '\u5f00\u59cb\u670d\u52a1\u4e2d' },
      finish: { url: `/orders/${this.data.orderId}/finish`, method: 'POST', title: '\u5b8c\u6210\u8ba2\u5355\u4e2d' },
      cancel: {
        url: `/orders/${this.data.orderId}/cancel`,
        method: 'POST',
        title: '\u53d6\u6d88\u8ba2\u5355\u4e2d',
        data: { reason: '\u7528\u6237\u53d6\u6d88' },
      },
    };

    const currentAction = actionMap[this.data.primaryAction.key];
    if (!currentAction) {
      return;
    }

    this.setData({
      actionLoading: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: currentAction.title,
      mask: true,
    });

    try {
      await request({
        url: currentAction.url,
        method: currentAction.method,
        data: currentAction.data || {},
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      wx.showToast({
        title: '\u64cd\u4f5c\u6210\u529f',
        icon: 'success',
      });

      await this.loadOrderDetail();
    } catch (error) {
      const message = (error && error.message) || '\u64cd\u4f5c\u5931\u8d25';
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
        actionLoading: false,
      });
    }
  },

  goServiceRecordList() {
    wx.navigateTo({
      url: `/pages/service-record-list/index?order_id=${this.data.orderId}`,
    });
  },
});
