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

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatDate(new Date());
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  const matched = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!matched) {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map((item) => Number(item));
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function validateServiceDate(serviceDate) {
  const selected = parseDate(serviceDate);
  const today = parseDate(getTodayDate());
  if (!selected || !today) {
    return false;
  }
  return selected.getTime() > today.getTime();
}

function validateServiceDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const today = parseDate(getTodayDate());
  if (!start || !end || !today) {
    return {
      valid: false,
      message: '\u8bf7\u9009\u62e9\u670d\u52a1\u65e5\u671f\u8303\u56f4',
    };
  }
  if (start.getTime() <= today.getTime() || end.getTime() <= today.getTime()) {
    return {
      valid: false,
      message: ADVANCE_RULE_MESSAGE,
    };
  }
  if (end.getTime() < start.getTime()) {
    return {
      valid: false,
      message: '\u7ed3\u675f\u65e5\u671f\u4e0d\u80fd\u65e9\u4e8e\u5f00\u59cb\u65e5\u671f',
    };
  }
  return {
    valid: true,
    message: '',
  };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }
  const matched = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!matched) {
    return null;
  }
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function isTimeInRange(timeStr, minTime, maxTime) {
  const value = parseTimeToMinutes(timeStr);
  const minValue = parseTimeToMinutes(minTime);
  const maxValue = parseTimeToMinutes(maxTime);
  if (value === null || minValue === null || maxValue === null) {
    return false;
  }
  return value >= minValue && value <= maxValue;
}

function validateServiceTimeRange(startTime, endTime, minTime, maxTime, minDurationMinutes) {
  if (!startTime || !endTime) {
    return { valid: true, message: '' };
  }

  if (!isTimeInRange(startTime, minTime, maxTime) || !isTimeInRange(endTime, minTime, maxTime)) {
    return {
      valid: false,
      message: `\u670d\u52a1\u65f6\u95f4\u9700\u5728${minTime}-${maxTime}\u4e4b\u95f4`,
    };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) {
    return { valid: false, message: '\u65f6\u95f4\u683c\u5f0f\u4e0d\u6b63\u786e' };
  }
  if (endMinutes - startMinutes < minDurationMinutes) {
    return {
      valid: false,
      message: '\u7ed3\u675f\u65f6\u95f4\u81f3\u5c11\u6bd4\u5f00\u59cb\u65f6\u95f4\u665a1\u5c0f\u65f6',
    };
  }

  return { valid: true, message: '' };
}

function normalizeNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

const ADVANCE_RULE_MESSAGE = '\u6240\u6709\u670d\u52a1\u9700\u81f3\u5c11\u63d0\u524d\u4e00\u5929\u9884\u7ea6';
const SERVICE_TIME_MIN = '08:00';
const SERVICE_TIME_MAX = '22:00';
const MIN_DURATION_MINUTES = 60;

const defaultPetTypeOptions = ['\u732b', '\u72d7', '\u5176\u4ed6'];
const genderOptions = ['\u516c', '\u6bcd', '\u672a\u77e5'];
const defaultServiceTypeOptions = ['\u4e0a\u95e8\u5582\u517b', '\u905b\u72d7', '\u4e0a\u95e8\u7167\u770b'];

const texts = {
  petSectionTitle: '\u5ba0\u7269\u4fe1\u606f',
  petSectionDesc: '\u53d1\u5e03\u8ba2\u5355\u524d\u8bf7\u5148\u586b\u5199\u5ba0\u7269\u57fa\u7840\u4fe1\u606f\u3002',
  petNameLabel: '\u5ba0\u7269\u6635\u79f0',
  petNamePlaceholder: '\u8bf7\u8f93\u5165\u5ba0\u7269\u6635\u79f0',
  petTypeLabel: '\u5ba0\u7269\u7c7b\u578b',
  petTypePlaceholder: '\u8bf7\u9009\u62e9\u5ba0\u7269\u7c7b\u578b',
  petBreedLabel: '\u54c1\u79cd',
  petBreedPlaceholder: '\u8bf7\u8f93\u5165\u5ba0\u7269\u54c1\u79cd',
  petAgeLabel: '\u5e74\u9f84',
  petAgePlaceholder: '\u4f8b\u5982 2',
  petGenderLabel: '\u6027\u522b',
  petGenderPlaceholder: '\u8bf7\u9009\u62e9\u6027\u522b',
  petWeightLabel: '\u4f53\u91cd(kg)',
  petWeightPlaceholder: '\u4f8b\u5982 3.5',
  petCharacterLabel: '\u6027\u683c\u63cf\u8ff0',
  petCharacterPlaceholder: '\u4f8b\u5982\uff1a\u6d3b\u6cfc\u3001\u7c98\u4eba\u3001\u80c6\u5c0f\u7b49',
  feedingNotesLabel: '\u5582\u517b\u8bf4\u660e',
  feedingNotesPlaceholder: '\u8bf7\u586b\u5199\u98df\u7269\u3001\u9891\u6b21\u3001\u65b9\u6cd5\u7b49',
  specialNotesLabel: '\u7279\u6b8a\u6ce8\u610f\u4e8b\u9879',
  specialNotesPlaceholder: '\u8bf7\u586b\u5199\u5065\u5eb7\u3001\u7981\u5fcc\u3001\u4e60\u60ef\u7b49\u4fe1\u606f',
  petImageLabel: '\u5ba0\u7269\u7167\u7247',
  petImagePlaceholder: '\u6682\u672a\u9009\u62e9\u56fe\u7247',
  chooseImageButton: '\u9009\u62e9\u56fe\u7247',

  serviceSectionTitle: '\u670d\u52a1\u4fe1\u606f',
  serviceSectionDesc: '\u8bbe\u7f6e\u672c\u6b21\u670d\u52a1\u7684\u65f6\u95f4\u3001\u5730\u5740\u548c\u8054\u7cfb\u65b9\u5f0f\u3002',
  serviceTypeLabel: '\u670d\u52a1\u7c7b\u578b',
  serviceTypePlaceholder: '\u8bf7\u9009\u62e9\u670d\u52a1\u7c7b\u578b',
  serviceDateLabel: '\u670d\u52a1\u65e5\u671f\uff08\u65f6\u95f4\u8303\u56f4\uff09',
  serviceDatePlaceholder: '\u5f00\u59cb\u65e5\u671f \u2192 \u7ed3\u675f\u65e5\u671f',
  serviceStartDatePlaceholder: '\u5f00\u59cb\u65e5\u671f',
  serviceEndDatePlaceholder: '\u7ed3\u675f\u65e5\u671f',
  serviceDateTip: ADVANCE_RULE_MESSAGE,
  startTimeLabel: '\u5f00\u59cb\u65f6\u95f4',
  startTimePlaceholder: '\u8bf7\u9009\u62e9\u5f00\u59cb\u65f6\u95f4',
  endTimeLabel: '\u7ed3\u675f\u65f6\u95f4',
  endTimePlaceholder: '\u8bf7\u9009\u62e9\u7ed3\u675f\u65f6\u95f4',
  serviceTimeTip: `\u670d\u52a1\u65f6\u95f4\u8303\u56f4\uff1a${SERVICE_TIME_MIN}~${SERVICE_TIME_MAX}\uff0c\u4e14\u7ed3\u675f\u65f6\u95f4\u81f3\u5c11\u6bd4\u5f00\u59cb\u65f6\u95f4\u665a1\u5c0f\u65f6`,

  addressLabel: '\u670d\u52a1\u5730\u5740',
  addressPlaceholder: '\u6682\u672a\u9009\u62e9\u5730\u56fe\u4f4d\u7f6e\uff0c\u8bf7\u70b9\u51fb\u201c\u5730\u56fe\u9009\u5740\u201d',
  chooseLocationButton: '\u5730\u56fe\u9009\u5740',
  choosingLocation: '\u9009\u5740\u4e2d...',
  detailAddressLabel: '\u8be6\u7ec6\u5730\u5740',
  detailAddressPlaceholder: '\u8bf7\u8f93\u5165\u95e8\u724c\u53f7\u3001\u697c\u680b\u3001\u5355\u5143\u3001\u5ba4\u53f7',

  contactNameLabel: '\u8054\u7cfb\u4eba',
  contactNamePlaceholder: '\u8bf7\u8f93\u5165\u8054\u7cfb\u4eba\u59d3\u540d',
  contactPhoneLabel: '\u8054\u7cfb\u7535\u8bdd',
  contactPhonePlaceholder: '\u8bf7\u8f93\u5165\u624b\u673a\u53f7',
  priceLabel: '\u4ef7\u683c',
  pricePlaceholder: '\u8bf7\u8f93\u5165\u670d\u52a1\u4ef7\u683c',
  photoFeedbackLabel: '\u662f\u5426\u9700\u8981\u62cd\u7167\u53cd\u9988',
  remarkLabel: '\u5907\u6ce8',
  remarkPlaceholder: '\u8bf7\u586b\u5199\u5176\u4ed6\u8bf4\u660e\u4fe1\u606f',

  submitButton: '\u63d0\u4ea4\u8ba2\u5355',
  submitting: '\u63d0\u4ea4\u4e2d...',
};

Page({
  data: {
    loading: false,
    locationLoading: false,
    errorMessage: '',
    todayDate: getTodayDate(),
    minDate: getTomorrowDate(),
    serviceTimeMin: SERVICE_TIME_MIN,
    serviceTimeMax: SERVICE_TIME_MAX,
    petTypeOptions: defaultPetTypeOptions,
    genderOptions,
    serviceTypeOptions: defaultServiceTypeOptions,
    petTypeIndex: -1,
    genderIndex: -1,
    serviceTypeIndex: -1,
    texts,
    form: {
      pet_name: '',
      pet_type: '',
      pet_breed: '',
      pet_age: '',
      pet_gender: '',
      pet_weight: '',
      pet_character: '',
      feeding_notes: '',
      special_notes: '',
      pet_image_url: '',
      service_type: '',
      service_date: '',
      service_start_date: '',
      service_end_date: '',
      start_time: '',
      end_time: '',
      address: '',
      detail_address: '',
      latitude: '',
      longitude: '',
      contact_name: '',
      contact_phone: '',
      price: '',
      need_photo_feedback: false,
      remark: '',
    },
  },

  onLoad() {
    this.setData({
      todayDate: getTodayDate(),
      minDate: getTomorrowDate(),
      serviceTimeMin: SERVICE_TIME_MIN,
      serviceTimeMax: SERVICE_TIME_MAX,
    });
    this.loadOrderOptions();
    this.initLocation();
  },

  async loadOrderOptions() {
    try {
      const result = await request({
        url: '/orders/options',
      });
      const data = (result && result.data) || {};
      const petTypes = Array.isArray(data.pet_types) && data.pet_types.length ? data.pet_types : defaultPetTypeOptions;
      const serviceTypes =
        Array.isArray(data.service_types) && data.service_types.length ? data.service_types : defaultServiceTypeOptions;

      const petTypeIndex = petTypes.indexOf(this.data.form.pet_type);
      const serviceTypeIndex = serviceTypes.indexOf(this.data.form.service_type);

      this.setData({
        petTypeOptions: petTypes,
        serviceTypeOptions: serviceTypes,
        petTypeIndex,
        serviceTypeIndex,
      });
    } catch (error) {
      this.setData({
        petTypeOptions: defaultPetTypeOptions,
        serviceTypeOptions: defaultServiceTypeOptions,
      });
    }
  },

  initLocation() {
    this.setData({
      locationLoading: true,
    });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const latitude = Number(res.latitude || 0).toFixed(6);
        const longitude = Number(res.longitude || 0).toFixed(6);
        const fallbackAddress = `\u5f53\u524d\u4f4d\u7f6e\uff08${latitude}, ${longitude}\uff09`;

        this.setData({
          'form.latitude': latitude,
          'form.longitude': longitude,
          'form.address': this.data.form.address || fallbackAddress,
        });
      },
      fail: (err) => {
        const errMsg = (err && err.errMsg) || '';
        if (errMsg.includes('auth deny') || errMsg.includes('auth denied') || errMsg.includes('scope')) {
          this.handleLocationPermissionDenied();
          return;
        }

        wx.showToast({
          title: '\u5b9a\u4f4d\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u5730\u56fe\u9009\u5740',
          icon: 'none',
        });
      },
      complete: () => {
        this.setData({
          locationLoading: false,
        });
      },
    });
  },

  handleLocationPermissionDenied() {
    wx.showModal({
      title: '\u9700\u8981\u5b9a\u4f4d\u6743\u9650',
      content: '\u8bf7\u5148\u5f00\u542f\u5b9a\u4f4d\u6743\u9650\uff0c\u518d\u8fdb\u884c\u5730\u56fe\u9009\u5740\u3002',
      confirmText: '\u53bb\u8bbe\u7f6e',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        wx.openSetting({
          success: (settingRes) => {
            if (settingRes.authSetting && settingRes.authSetting['scope.userLocation']) {
              this.initLocation();
              return;
            }

            wx.showToast({
              title: '\u672a\u5f00\u542f\u5b9a\u4f4d\u6743\u9650',
              icon: 'none',
            });
          },
        });
      },
    });
  },

  handleChooseLocation() {
    this.setData({
      locationLoading: true,
    });

    wx.chooseLocation({
      success: (res) => {
        if (!res) {
          return;
        }

        const address = res.address || res.name || '';
        const latitude = typeof res.latitude === 'number' ? res.latitude.toFixed(6) : '';
        const longitude = typeof res.longitude === 'number' ? res.longitude.toFixed(6) : '';

        this.setData({
          'form.address': address,
          'form.latitude': latitude,
          'form.longitude': longitude,
        });

        wx.showToast({
          title: '\u5730\u5740\u5df2\u66f4\u65b0',
          icon: 'success',
        });
      },
      fail: (err) => {
        const errMsg = (err && err.errMsg) || '';
        if (errMsg.includes('cancel')) {
          return;
        }
        if (errMsg.includes('auth deny') || errMsg.includes('auth denied') || errMsg.includes('scope')) {
          this.handleLocationPermissionDenied();
          return;
        }

        wx.showToast({
          title: '\u5730\u56fe\u9009\u5740\u5931\u8d25',
          icon: 'none',
        });
      },
      complete: () => {
        this.setData({
          locationLoading: false,
        });
      },
    });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value,
      errorMessage: '',
    });
  },

  handlePetTypeChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      petTypeIndex: index,
      'form.pet_type': this.data.petTypeOptions[index],
      errorMessage: '',
    });
  },

  handleGenderChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      genderIndex: index,
      'form.pet_gender': this.data.genderOptions[index],
      errorMessage: '',
    });
  },

  handleServiceTypeChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      serviceTypeIndex: index,
      'form.service_type': this.data.serviceTypeOptions[index],
      errorMessage: '',
    });
  },

  handleStartDateChange(e) {
    const startDate = e.detail.value;
    const endDate = this.data.form.service_end_date;
    const nextData = {
      'form.service_start_date': startDate,
      'form.service_date': startDate,
      errorMessage: '',
    };

    if (!validateServiceDate(startDate)) {
      this.setData({
        'form.service_start_date': '',
        'form.service_date': '',
        errorMessage: ADVANCE_RULE_MESSAGE,
      });
      wx.showToast({
        title: ADVANCE_RULE_MESSAGE,
        icon: 'none',
      });
      return;
    }

    if (endDate) {
      const rangeResult = validateServiceDateRange(startDate, endDate);
      if (!rangeResult.valid) {
        nextData['form.service_end_date'] = '';
        nextData.errorMessage = rangeResult.message;
        wx.showToast({
          title: rangeResult.message,
          icon: 'none',
        });
      }
    }

    this.setData(nextData);
  },

  handleEndDateChange(e) {
    const endDate = e.detail.value;
    const startDate = this.data.form.service_start_date;

    if (!startDate) {
      const message = '\u8bf7\u5148\u9009\u62e9\u5f00\u59cb\u65e5\u671f';
      this.setData({
        'form.service_end_date': '',
        errorMessage: message,
      });
      wx.showToast({
        title: message,
        icon: 'none',
      });
      return;
    }

    const rangeResult = validateServiceDateRange(startDate, endDate);
    if (!rangeResult.valid) {
      this.setData({
        'form.service_end_date': '',
        errorMessage: rangeResult.message,
      });
      wx.showToast({
        title: rangeResult.message,
        icon: 'none',
      });
      return;
    }

    this.setData({
      'form.service_end_date': endDate,
      errorMessage: '',
    });
  },

  handleStartTimeChange(e) {
    const startTime = e.detail.value;

    if (!isTimeInRange(startTime, SERVICE_TIME_MIN, SERVICE_TIME_MAX)) {
      const message = `\u670d\u52a1\u65f6\u95f4\u9700\u5728${SERVICE_TIME_MIN}-${SERVICE_TIME_MAX}\u4e4b\u95f4`;
      this.setData({
        'form.start_time': '',
        errorMessage: message,
      });
      wx.showToast({
        title: message,
        icon: 'none',
      });
      return;
    }

    const validateResult = validateServiceTimeRange(
      startTime,
      this.data.form.end_time,
      SERVICE_TIME_MIN,
      SERVICE_TIME_MAX,
      MIN_DURATION_MINUTES
    );

    if (!validateResult.valid && this.data.form.end_time) {
      this.setData({
        'form.start_time': startTime,
        'form.end_time': '',
        errorMessage: validateResult.message,
      });
      wx.showToast({
        title: validateResult.message,
        icon: 'none',
      });
      return;
    }

    this.setData({
      'form.start_time': startTime,
      errorMessage: '',
    });
  },

  handleEndTimeChange(e) {
    const endTime = e.detail.value;

    if (!isTimeInRange(endTime, SERVICE_TIME_MIN, SERVICE_TIME_MAX)) {
      const message = `\u670d\u52a1\u65f6\u95f4\u9700\u5728${SERVICE_TIME_MIN}-${SERVICE_TIME_MAX}\u4e4b\u95f4`;
      this.setData({
        'form.end_time': '',
        errorMessage: message,
      });
      wx.showToast({
        title: message,
        icon: 'none',
      });
      return;
    }

    const validateResult = validateServiceTimeRange(
      this.data.form.start_time,
      endTime,
      SERVICE_TIME_MIN,
      SERVICE_TIME_MAX,
      MIN_DURATION_MINUTES
    );

    if (!validateResult.valid) {
      this.setData({
        'form.end_time': '',
        errorMessage: validateResult.message,
      });
      wx.showToast({
        title: validateResult.message,
        icon: 'none',
      });
      return;
    }

    this.setData({
      'form.end_time': endTime,
      errorMessage: '',
    });
  },

  handlePhotoFeedbackChange(e) {
    this.setData({
      'form.need_photo_feedback': e.detail.value,
    });
  },

  handleChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0] ? res.tempFilePaths[0] : '';
        if (!filePath) {
          return;
        }
        this.setData({
          'form.pet_image_url': filePath,
        });
      },
    });
  },

  validateForm() {
    const { form } = this.data;

    if (!form.pet_name.trim()) return '\u8bf7\u586b\u5199\u5ba0\u7269\u6635\u79f0';
    if (!form.pet_type) return '\u8bf7\u9009\u62e9\u5ba0\u7269\u7c7b\u578b';
    if (!form.service_type) return '\u8bf7\u9009\u62e9\u670d\u52a1\u7c7b\u578b';
    if (!form.service_start_date) return '\u8bf7\u9009\u62e9\u5f00\u59cb\u65e5\u671f';
    if (!form.service_end_date) return '\u8bf7\u9009\u62e9\u7ed3\u675f\u65e5\u671f';
    const dateRangeResult = validateServiceDateRange(form.service_start_date, form.service_end_date);
    if (!dateRangeResult.valid) return dateRangeResult.message;
    if (!form.start_time) return '\u8bf7\u9009\u62e9\u5f00\u59cb\u65f6\u95f4';
    if (!form.end_time) return '\u8bf7\u9009\u62e9\u7ed3\u675f\u65f6\u95f4';

    if (!isTimeInRange(form.start_time, SERVICE_TIME_MIN, SERVICE_TIME_MAX)) {
      return `\u670d\u52a1\u65f6\u95f4\u9700\u5728${SERVICE_TIME_MIN}-${SERVICE_TIME_MAX}\u4e4b\u95f4`;
    }
    if (!isTimeInRange(form.end_time, SERVICE_TIME_MIN, SERVICE_TIME_MAX)) {
      return `\u670d\u52a1\u65f6\u95f4\u9700\u5728${SERVICE_TIME_MIN}-${SERVICE_TIME_MAX}\u4e4b\u95f4`;
    }
    const validateResult = validateServiceTimeRange(
      form.start_time,
      form.end_time,
      SERVICE_TIME_MIN,
      SERVICE_TIME_MAX,
      MIN_DURATION_MINUTES
    );
    if (!validateResult.valid) {
      return validateResult.message;
    }

    if (!form.address.trim()) return '\u8bf7\u5148\u8fdb\u884c\u5730\u56fe\u9009\u5740';
    if (!form.detail_address.trim()) return '\u8bf7\u586b\u5199\u8be6\u7ec6\u5730\u5740';
    if (!form.contact_name.trim()) return '\u8bf7\u586b\u5199\u8054\u7cfb\u4eba';
    if (!/^1\d{10}$/.test(form.contact_phone.trim())) return '\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u8054\u7cfb\u7535\u8bdd';
    if (!form.price || Number(form.price) <= 0) return '\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u4ef7\u683c';

    return '';
  },

  buildRequestBody() {
    const { form } = this.data;

    return {
      service_type: form.service_type,
      service_date: form.service_start_date,
      service_start_date: form.service_start_date,
      service_end_date: form.service_end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      address: form.address.trim(),
      detail_address: form.detail_address.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      price: Number(form.price),
      need_photo_feedback: form.need_photo_feedback,
      remark: form.remark.trim(),
      pet_info: {
        name: form.pet_name.trim(),
        type: form.pet_type,
        breed: form.pet_breed.trim(),
        age: normalizeNumber(form.pet_age),
        gender: form.pet_gender,
        weight: normalizeNumber(form.pet_weight),
        character: form.pet_character.trim(),
        feeding_notes: form.feeding_notes.trim(),
        special_notes: form.special_notes.trim(),
        pet_image_url: form.pet_image_url.trim(),
      },
    };
  },

  transformPayloadForApi(rawPayload) {
    return {
      address: rawPayload.address,
      detail_address: rawPayload.detail_address,
      latitude: rawPayload.latitude,
      longitude: rawPayload.longitude,
      service: {
        service_type: rawPayload.service_type,
        service_date: rawPayload.service_date,
        service_address: rawPayload.address,
        service_detail_address: rawPayload.detail_address,
        service_latitude: rawPayload.latitude,
        service_longitude: rawPayload.longitude,
        service_price: rawPayload.price,
        service_contact_name: rawPayload.contact_name,
        service_contact_phone: rawPayload.contact_phone,
        service_remark: [
          rawPayload.service_start_date && rawPayload.service_end_date
            ? `\u670d\u52a1\u65e5\u671f\u8303\u56f4\uff1a${rawPayload.service_start_date} \u2192 ${rawPayload.service_end_date}`
            : '',
          rawPayload.start_time ? `\u5f00\u59cb\u65f6\u95f4\uff1a${rawPayload.start_time}` : '',
          rawPayload.end_time ? `\u7ed3\u675f\u65f6\u95f4\uff1a${rawPayload.end_time}` : '',
          rawPayload.need_photo_feedback ? '\u9700\u8981\u62cd\u7167\u53cd\u9988\uff1a\u662f' : '\u9700\u8981\u62cd\u7167\u53cd\u9988\uff1a\u5426',
          rawPayload.remark || '',
        ]
          .filter(Boolean)
          .join('\uff1b'),
      },
      pet: {
        pet_name: rawPayload.pet_info.name,
        pet_type: rawPayload.pet_info.type,
        pet_breed: rawPayload.pet_info.breed || null,
        pet_age: rawPayload.pet_info.age,
        pet_gender: rawPayload.pet_info.gender || null,
        pet_weight_kg: rawPayload.pet_info.weight,
        pet_feeding_requirements:
          [
            rawPayload.pet_info.character ? `\u6027\u683c\u63cf\u8ff0\uff1a${rawPayload.pet_info.character}` : '',
            rawPayload.pet_info.feeding_notes ? `\u5582\u517b\u8bf4\u660e\uff1a${rawPayload.pet_info.feeding_notes}` : '',
            rawPayload.pet_info.pet_image_url ? `\u5ba0\u7269\u7167\u7247\uff1a${rawPayload.pet_info.pet_image_url}` : '',
          ]
            .filter(Boolean)
            .join('\uff1b') || null,
        pet_health_notes: rawPayload.pet_info.special_notes || null,
      },
    };
  },

  async submitOrder() {
    if (this.data.loading) {
      return;
    }

    const validationMessage = this.validateForm();
    if (validationMessage) {
      this.setData({ errorMessage: validationMessage });
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      });
      return;
    }

    const token = (app.globalData && app.globalData.token) || wx.getStorageSync(STORAGE_TOKEN_KEY);
    if (!token) {
      const message = '\u8bf7\u5148\u5b8c\u6210\u767b\u5f55';
      this.setData({ errorMessage: message });
      wx.showToast({
        title: message,
        icon: 'none',
      });
      return;
    }

    this.setData({
      loading: true,
      errorMessage: '',
    });

    wx.showLoading({
      title: '\u63d0\u4ea4\u4e2d',
      mask: true,
    });

    try {
      const rawPayload = this.buildRequestBody();
      const apiPayload = this.transformPayloadForApi(rawPayload);

      await request({
        url: '/orders',
        method: 'POST',
        data: apiPayload,
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      wx.showToast({
        title: '\u8ba2\u5355\u53d1\u5e03\u6210\u529f',
        icon: 'success',
      });

      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack({ delta: 1 });
          return;
        }
        wx.reLaunch({
          url: '/pages/home-owner/index',
        });
      }, 500);
    } catch (error) {
      const message = (error && error.message) || '\u8ba2\u5355\u63d0\u4ea4\u5931\u8d25';
      this.setData({ errorMessage: message });
      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  handleSubmit() {
    this.submitOrder();
  },
});
