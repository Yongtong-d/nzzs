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

function formatToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

const petTypeOptions = ['\u732b', '\u72d7', '\u5176\u4ed6'];
const genderOptions = ['\u516c', '\u6bcd', '\u672a\u77e5'];
const serviceTypeOptions = ['\u4e0a\u95e8\u5582\u517b', '\u905b\u72d7', '\u4e0a\u95e8\u7167\u770b'];

const texts = {
  petSectionTitle: '\u5ba0\u7269\u4fe1\u606f',
  petSectionDesc: '\u53d1\u5e03\u8ba2\u5355\u65f6\u76f4\u63a5\u586b\u5199\u5ba0\u7269\u57fa\u672c\u4fe1\u606f\u3002',
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
  petWeightLabel: '\u4f53\u91cd',
  petWeightPlaceholder: '\u4f8b\u5982 3.5kg',
  petCharacterLabel: '\u6027\u683c\u63cf\u8ff0',
  petCharacterPlaceholder: '\u4f8b\u5982\uff1a\u6d3b\u6cfc\u3001\u7c98\u4eba\u3001\u80c6\u5c0f\u7b49',
  feedingNotesLabel: '\u5582\u517b\u8bf4\u660e',
  feedingNotesPlaceholder: '\u8bf7\u586b\u5199\u98df\u7269\u3001\u9891\u6b21\u3001\u65b9\u6cd5\u7b49',
  specialNotesLabel: '\u7279\u6b8a\u6ce8\u610f\u4e8b\u9879',
  specialNotesPlaceholder: '\u8bf7\u586b\u5199\u5065\u5eb7\u3001\u7981\u5fcc\u3001\u4e60\u60ef\u7b49\u6ce8\u610f\u4e8b\u9879',
  petImageLabel: '\u5ba0\u7269\u7167\u7247',
  petImagePlaceholder: '\u8bf7\u8f93\u5165\u56fe\u7247 URL \u6216\u70b9\u51fb\u9009\u62e9\u672c\u5730\u56fe\u7247',
  chooseImageButton: '\u9009\u62e9\u56fe\u7247\u793a\u4f8b',
  serviceSectionTitle: '\u670d\u52a1\u4fe1\u606f',
  serviceSectionDesc: '\u8bbe\u7f6e\u672c\u6b21\u4e0a\u95e8\u6216\u7167\u62a4\u670d\u52a1\u7684\u65f6\u95f4\u4e0e\u8054\u7cfb\u65b9\u5f0f\u3002',
  serviceTypeLabel: '\u670d\u52a1\u7c7b\u578b',
  serviceTypePlaceholder: '\u8bf7\u9009\u62e9\u670d\u52a1\u7c7b\u578b',
  serviceDateLabel: '\u670d\u52a1\u65e5\u671f',
  serviceDatePlaceholder: '\u8bf7\u9009\u62e9\u670d\u52a1\u65e5\u671f',
  startTimeLabel: '\u5f00\u59cb\u65f6\u95f4',
  startTimePlaceholder: '\u8bf7\u9009\u62e9\u5f00\u59cb\u65f6\u95f4',
  endTimeLabel: '\u7ed3\u675f\u65f6\u95f4',
  endTimePlaceholder: '\u8bf7\u9009\u62e9\u7ed3\u675f\u65f6\u95f4',
  addressLabel: '\u670d\u52a1\u5730\u5740',
  addressPlaceholder: '\u8bf7\u8f93\u5165\u8be6\u7ec6\u670d\u52a1\u5730\u5740',
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
    errorMessage: '',
    minDate: formatToday(),
    petTypeOptions,
    genderOptions,
    serviceTypeOptions,
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
      start_time: '',
      end_time: '',
      address: '',
      contact_name: '',
      contact_phone: '',
      price: '',
      need_photo_feedback: false,
      remark: '',
    },
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

  handleDateChange(e) {
    this.setData({
      'form.service_date': e.detail.value,
      errorMessage: '',
    });
  },

  handleStartTimeChange(e) {
    this.setData({
      'form.start_time': e.detail.value,
      errorMessage: '',
    });
  },

  handleEndTimeChange(e) {
    this.setData({
      'form.end_time': e.detail.value,
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
    if (!form.service_date) return '\u8bf7\u9009\u62e9\u670d\u52a1\u65e5\u671f';
    if (!form.start_time) return '\u8bf7\u9009\u62e9\u5f00\u59cb\u65f6\u95f4';
    if (!form.end_time) return '\u8bf7\u9009\u62e9\u7ed3\u675f\u65f6\u95f4';
    if (form.start_time && form.end_time && form.start_time >= form.end_time) return '\u7ed3\u675f\u65f6\u95f4\u9700\u665a\u4e8e\u5f00\u59cb\u65f6\u95f4';
    if (!form.address.trim()) return '\u8bf7\u586b\u5199\u670d\u52a1\u5730\u5740';
    if (!form.contact_name.trim()) return '\u8bf7\u586b\u5199\u8054\u7cfb\u4eba';
    if (!/^1\d{10}$/.test(form.contact_phone.trim())) return '\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u8054\u7cfb\u7535\u8bdd';
    if (!form.price || Number(form.price) <= 0) return '\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u4ef7\u683c';

    return '';
  },

  buildRequestBody() {
    const { form } = this.data;
    return {
      service_type: form.service_type,
      service_date: form.service_date,
      start_time: form.start_time,
      end_time: form.end_time,
      address: form.address.trim(),
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
      service: {
        service_type: rawPayload.service_type,
        service_date: rawPayload.service_date,
        service_address: rawPayload.address,
        service_price: rawPayload.price,
        service_contact_name: rawPayload.contact_name,
        service_contact_phone: rawPayload.contact_phone,
        service_remark: [
          rawPayload.start_time ? `\u5f00\u59cb\u65f6\u95f4\uff1a${rawPayload.start_time}` : '',
          rawPayload.end_time ? `\u7ed3\u675f\u65f6\u95f4\uff1a${rawPayload.end_time}` : '',
          rawPayload.need_photo_feedback ? '\u9700\u8981\u62cd\u7167\u53cd\u9988\uff1a\u662f' : '\u9700\u8981\u62cd\u7167\u53cd\u9988\uff1a\u5426',
          rawPayload.remark || '',
        ].filter(Boolean).join('\uff1b'),
      },
      pet: {
        pet_name: rawPayload.pet_info.name,
        pet_type: rawPayload.pet_info.type,
        pet_breed: rawPayload.pet_info.breed || null,
        pet_age: rawPayload.pet_info.age,
        pet_gender: rawPayload.pet_info.gender || null,
        pet_weight_kg: rawPayload.pet_info.weight,
        pet_feeding_requirements: [
          rawPayload.pet_info.character ? `\u6027\u683c\u63cf\u8ff0\uff1a${rawPayload.pet_info.character}` : '',
          rawPayload.pet_info.feeding_notes ? `\u5582\u517b\u8bf4\u660e\uff1a${rawPayload.pet_info.feeding_notes}` : '',
          rawPayload.pet_info.pet_image_url ? `\u5ba0\u7269\u7167\u7247\uff1a${rawPayload.pet_info.pet_image_url}` : '',
        ].filter(Boolean).join('\uff1b') || null,
        pet_health_notes: rawPayload.pet_info.special_notes || null,
      },
    };
  },

  async handleSubmit() {
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
});