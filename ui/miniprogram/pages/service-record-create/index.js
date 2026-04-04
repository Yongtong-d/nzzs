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

function padNumber(value) {
  return `${value}`.padStart(2, '0');
}

function getCurrentDateTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

const texts = {
  contentSectionTitle: '\u8bb0\u5f55\u5185\u5bb9',
  contentLabel: '\u8bb0\u5f55\u5185\u5bb9',
  contentPlaceholder: '\u8bf7\u8f93\u5165\u672c\u6b21\u670d\u52a1\u5185\u5bb9\uff0c\u4f8b\u5982\u5582\u98df\u3001\u6362\u6c34\u3001\u6e05\u7406\u60c5\u51b5\u7b49',
  imageLabel: '\u56fe\u7247\u4e0a\u4f20',
  imagePlaceholder: '\u70b9\u51fb\u9009\u62e9\u56fe\u7247',
  imageTip: '\u5f53\u524d\u4e3a\u672c\u5730\u9009\u56fe\u793a\u4f8b\uff0c\u53ef\u76f4\u63a5\u4f7f\u7528\u672c\u5730\u4e34\u65f6\u8def\u5f84\u4f5c\u4e3a image_url \u5360\u4f4d\u63d0\u4ea4\u3002',
  metaSectionTitle: '\u6253\u5361\u4fe1\u606f',
  checkinTimeLabel: '\u6253\u5361\u65f6\u95f4',
  locationLabel: '\u5b9a\u4f4d\u63cf\u8ff0',
  locationPlaceholder: '\u8bf7\u8f93\u5165\u5f53\u524d\u670d\u52a1\u5730\u70b9\u63cf\u8ff0',
  submitButton: '\u63d0\u4ea4\u8bb0\u5f55',
};

Page({
  data: {
    texts,
    orderId: '',
    submitting: false,
    errorMessage: '',
    form: {
      content: '',
      imageUrl: '',
      checkinTime: '',
      locationText: '',
    },
  },

  onLoad(options) {
    const orderId = options && options.order_id ? String(options.order_id) : '';
    const checkinTime = getCurrentDateTime();

    this.setData({
      orderId,
      form: {
        ...this.data.form,
        checkinTime,
      },
    });

    if (!orderId) {
      this.setData({
        errorMessage: '\u7f3a\u5c11 order_id',
      });
    }
  },

  handleContentInput(e) {
    this.setData({
      'form.content': e.detail.value,
    });
  },

  handleLocationInput(e) {
    this.setData({
      'form.locationText': e.detail.value,
    });
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths.length ? res.tempFilePaths[0] : '';
        this.setData({
          'form.imageUrl': filePath,
        });
      },
      fail: (error) => {
        const message = (error && error.errMsg) || '\u56fe\u7247\u9009\u62e9\u5931\u8d25';
        this.setData({
          errorMessage: message,
        });
      },
    });
  },

  validateForm() {
    const { orderId, form } = this.data;

    if (!orderId) {
      return '\u7f3a\u5c11 order_id';
    }
    if (!form.content.trim()) {
      return '\u8bf7\u586b\u5199\u8bb0\u5f55\u5185\u5bb9';
    }
    if (!form.locationText.trim()) {
      return '\u8bf7\u586b\u5199\u5b9a\u4f4d\u63cf\u8ff0';
    }
    return '';
  },

  buildRequestBody() {
    const { orderId, form } = this.data;
    return {
      order_id: orderId,
      content: form.content.trim(),
      image_url: form.imageUrl,
      checkin_time: form.checkinTime,
      location_text: form.locationText.trim(),
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
        url: '/service-records',
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

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/service-record-list/index?order_id=${this.data.orderId}`,
        });
      }, 300);
    } catch (error) {
      const message = (error && error.message) || '\u670d\u52a1\u8bb0\u5f55\u63d0\u4ea4\u5931\u8d25';
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
