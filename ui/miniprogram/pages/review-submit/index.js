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

function getRevieweeId(order, currentUserId) {
  if (!order || !currentUserId) {
    return 0;
  }

  const publisherId = order.publisher && order.publisher.id ? order.publisher.id : 0;
  const takerId = order.taker && order.taker.id ? order.taker.id : 0;

  if (currentUserId === publisherId) {
    return takerId;
  }
  if (currentUserId === takerId) {
    return publisherId;
  }
  return 0;
}

const texts = {
  scoreTitle: '\u661f\u7ea7\u8bc4\u5206',
  contentTitle: '\u8bc4\u4ef7\u5185\u5bb9',
  contentPlaceholder: '\u8bf7\u8f93\u5165\u5bf9\u672c\u6b21\u670d\u52a1\u7684\u8bc4\u4ef7',
  submitButton: '\u63d0\u4ea4\u8bc4\u4ef7',
  starChar: '\u2605',
};

const stars = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

Page({
  data: {
    loading: false,
    submitting: false,
    errorMessage: '',
    orderId: '',
    reviewerId: 0,
    revieweeId: 0,
    stars,
    scoreText: '\u8bf7\u9009\u62e9\u8bc4\u5206',
    texts,
    form: {
      score: 0,
      content: '',
    },
  },

  onLoad(options) {
    const orderId = options && options.order_id ? String(options.order_id) : '';
    const loginUser = wx.getStorageSync(STORAGE_USER_KEY);
    const reviewerId = loginUser && loginUser.id ? Number(loginUser.id) : 0;

    this.setData({
      orderId,
      reviewerId,
    });

    if (!orderId) {
      this.setData({
        errorMessage: '\u7f3a\u5c11 order_id',
      });
      return;
    }

    this.loadOrderDetail();
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

      const revieweeId = getRevieweeId(result.data, this.data.reviewerId);
      this.setData({
        revieweeId,
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

  handleScoreTap(e) {
    const score = Number(e.currentTarget.dataset.score) || 0;
    const scoreTextMap = {
      1: '\u975e\u5e38\u4e0d\u6ee1\u610f',
      2: '\u4e0d\u592a\u6ee1\u610f',
      3: '\u4e00\u822c',
      4: '\u6bd4\u8f83\u6ee1\u610f',
      5: '\u975e\u5e38\u6ee1\u610f',
    };

    this.setData({
      'form.score': score,
      scoreText: scoreTextMap[score] || '\u8bf7\u9009\u62e9\u8bc4\u5206',
    });
  },

  handleContentInput(e) {
    this.setData({
      'form.content': e.detail.value,
    });
  },

  validateForm() {
    const { orderId, reviewerId, revieweeId, form } = this.data;

    if (!orderId) {
      return '\u7f3a\u5c11 order_id';
    }
    if (!reviewerId) {
      return '\u7f3a\u5c11 reviewer_id';
    }
    if (!revieweeId) {
      return '\u65e0\u6cd5\u786e\u5b9a\u88ab\u8bc4\u4ef7\u4eba';
    }
    if (!form.score) {
      return '\u8bf7\u9009\u62e9\u661f\u7ea7\u8bc4\u5206';
    }
    if (!form.content.trim()) {
      return '\u8bf7\u586b\u5199\u8bc4\u4ef7\u5185\u5bb9';
    }
    return '';
  },

  buildRequestBody() {
    const { orderId, reviewerId, revieweeId, form } = this.data;
    return {
      order_id: Number(orderId),
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      score: form.score,
      content: form.content.trim(),
    };
  },

  async handleSubmit() {
    if (this.data.submitting) {
      return;
    }

    const validationMessage = this.validateForm();
    if (validationMessage) {
      this.setData({
        errorMessage: validationMessage,
      });
      wx.showToast({
        title: validationMessage,
        icon: 'none',
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

    this.setData({
      submitting: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: '\u63d0\u4ea4\u4e2d',
      mask: true,
    });

    try {
      await request({
        url: '/reviews',
        method: 'POST',
        data: this.buildRequestBody(),
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      wx.showToast({
        title: '\u63d0\u4ea4\u6210\u529f',
        icon: 'success',
      });

      const pages = getCurrentPages();
      const prevPage = pages.length > 1 ? pages[pages.length - 2] : null;
      if (prevPage && typeof prevPage.loadOrderDetail === 'function') {
        prevPage.loadOrderDetail();
      }

      setTimeout(() => {
        if (getCurrentPages().length > 1) {
          wx.navigateBack({
            delta: 1,
          });
          return;
        }

        wx.redirectTo({
          url: `/pages/order-detail/index?id=${this.data.orderId}`,
        });
      }, 300);
    } catch (error) {
      const message = (error && error.message) || '\u8bc4\u4ef7\u63d0\u4ea4\u5931\u8d25';
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
        submitting: false,
      });
    }
  },
});
