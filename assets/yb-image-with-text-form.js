if (!customElements.get('image-with-text-form')) {
  class ImageWithTextForm extends HTMLElement {
    static SUBMIT_URL = 'https://4zx17x5q7l.execute-api.us-east-1.amazonaws.com/Stage/yarbo/market/ugcUpload';
    static FACEBOOK_URL_PATTERN = '^https?:\\/\\/((.+?)\.)?facebook\.com';
    static INSTAGRAM_URL_PATTERN = '^https?:\/\/((.+?)\.)?instagram\.com';
    static YOUTUBE_URL_PATTERN = '^https?:\/\/((.+?\.)?youtube\.com|youtu\.be)';
    static VIMEO_URL_PATTERN = '^https?:\/\/vimeo\.com';

    connectedCallback() {
      requestAnimationFrame(() => {
        this.addEventListener('change', this.#handleChangePlatform);
        this.addEventListener('click', this.#handleSubmit);

        this.#setVideoUrlPattern('facebook');
        this.#initLocationSelects();
      });
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.#handleChangePlatform);
      this.removeEventListener('click', this.#handleSubmit);
    }

    get mediaType() {
      const uploader = this.querySelector('file-uploader');
      if (!uploader) {
        return;
      }

      return uploader.dataset.target;
    }

    get fields() {
      /** @type {NodeListOf<FormField>} */
      const collection = this.querySelectorAll('form-field');
      return Array.from(collection);
    }

    get formData() {
      console.log('=== Getting Form Data ===');
      let fields = this.fields;
      console.log(
        'All fields:',
        fields.map((f) => ({ name: f.name, value: f.value })),
      );

      const extras = {};
      const file = this.querySelector(`preview-grid[data-role="${this.#tab}"]`);
      console.log('File element:', file);
      console.log('File value:', file?.value);

      if (file?.value?.length) {
        // 构建 objectList 数组，包含每个文件的 key、width、height
        extras.objectList = file.value.map((key) => {
          // 处理 key：去掉开头的 /（如果存在）
          const processedKey = key.startsWith('/') ? key.slice(1) : key;

          // 从 preview-grid 获取该文件的尺寸信息
          const dimensions = file.getDimensions ? file.getDimensions(key) : null;

          return {
            key: processedKey,
            width: dimensions?.width || 0,
            height: dimensions?.height || 0,
          };
        });
        console.log('objectList:', extras.objectList);

        // 注意：视频尺寸在提交时获取，不在这里获取
        // clear other file inputs
        fields = fields.filter((field) => !['platform', 'videoUrl'].includes(field.name));
      }

      const entries = fields.map((field) => field.entry);
      const data = Object.fromEntries(entries);
      console.log('Form entries data:', data);

      // 处理位置数据：从下拉框获取值
      const countrySelect = this.querySelector('[data-role="country-select"]');
      const stateSelect = this.querySelector('[data-role="state-select"]');
      const citySelect = this.querySelector('[data-role="city-select"]');

      console.log('Location selects:', {
        country: countrySelect?.value,
        state: stateSelect?.value,
        city: citySelect?.value,
      });

      // 国家：从下拉框获取 code
      if (countrySelect && countrySelect.value) {
        data.country = countrySelect.value;
      }

      // 州/省：从下拉框获取 code
      if (stateSelect && stateSelect.value) {
        data.state = stateSelect.value;
      }

      // 城市：从下拉框获取 code
      if (citySelect && citySelect.value) {
        data.city = citySelect.value;
      }

      const result = { ...data, ...extras };
      console.log('Final formData:', result);
      console.log('====================');
      return result;
    }

    get #tab() {
      const uploader = this.querySelector('file-uploader');
      return uploader.dataset?.target;
    }

    checkValidity() {
      let fields = this.fields;

      const validateFn = () => fields.map((field) => field.validate());
      if (!this.#tab) {
        if (validateFn()) {
          window.__SL_toast__.show({ type: 'error', message: 'Please upload photo or video!' });
        }

        return false;
      }

      if (this.#tab === 'photo') {
        const photo = this.querySelector('preview-grid[data-role="photo"]');
        if (!photo?.value?.length) {
          if (validateFn()) {
            window.__SL_toast__.show({ type: 'error', message: 'Please upload photo or video!' });
            return;
          }

          return false;
        }

        fields = fields.filter((field) => !['platform', 'videoUrl'].includes(field.name));
      } else if (this.#tab === 'video') {
        const video = this.querySelector('preview-grid[data-role="video"]');
        if (video?.value?.length) {
          fields = fields.filter((field) => !['platform', 'videoUrl'].includes(field.name));
        }
      }

      // 验证复选框是否勾选
      const agreementCheckbox = this.querySelector('input[name="agreement"][type="checkbox"]');
      if (agreementCheckbox && !agreementCheckbox.checked) {
        const agreementField = this.querySelector('form-field[name="agreement"]');
        if (agreementField) {
          agreementField.classList.add('error');
          const errorElement = agreementField.querySelector('[data-role="errorMessage"]');
          if (errorElement) {
            errorElement.textContent = "Please agree to allow your submitted content to be used for Yarbo's brand promotion.";
          }
        }
        window.__SL_toast__.show({ type: 'error', message: "Please agree to allow your submitted content to be used for Yarbo's brand promotion." });
        return false;
      }

      return !validateFn().includes(false);
    }

    reset() {
      this.fields.forEach((field) => field.reset());

      const uploader = this.querySelector('file-uploader');
      if (uploader) {
        uploader.classList.remove('open');
        uploader.removeAttribute('data-target');
      }
    }

    /** @param {'facebook' | 'instagram' | 'youtube' | 'vimeo'} type */
    #setVideoUrlPattern(type) {
      const target = this.querySelector('form-field[name="videoUrl"]');
      if (!target) {
        throw new Error('videoUrl field not found');
      }

      // switch(type) {
      //   case 'facebook':
      //     target.setAttribute('pattern', ImageWithTextForm.FACEBOOK_URL_PATTERN)
      //     break
      //   case 'instagram':
      //     target.setAttribute('pattern', ImageWithTextForm.INSTAGRAM_URL_PATTERN)
      //     break
      //   case 'youtube':
      //     target.setAttribute('pattern', ImageWithTextForm.YOUTUBE_URL_PATTERN)
      //     break
      //   case 'vimeo':
      //     target.setAttribute('pattern', ImageWithTextForm.VIMEO_URL_PATTERN)
      //     break
      //   default:
      //     break
      // }

      target.value && target.validate();
    }

    #handleChangePlatform(event) {
      const control = event.target.closest('form-field[name="platform"]');
      if (!control) {
        return;
      }

      this.#setVideoUrlPattern(control.value);
    }

    /**
     * 从视频 URL 获取尺寸信息
     * @param {string} videoUrl
     * @param {string} platform
     * @returns {Promise<{width: number, height: number} | null>}
     */
    async #getVideoDimensionsFromUrl(videoUrl, platform) {
      if (!videoUrl) return null;

      try {
        switch (platform) {
          case 'youtube':
            return await this.#getYouTubeDimensions(videoUrl);
          case 'vimeo':
            return await this.#getVimeoDimensions(videoUrl);
          case 'facebook':
          case 'instagram':
            // Facebook 和 Instagram 需要 token，建议后端处理
            // 这里返回 null，让后端处理
            console.log(`${platform} video dimensions should be handled by backend (requires token)`);
            return null;
          default:
            return null;
        }
      } catch (error) {
        console.error(`Error getting video dimensions for ${platform}:`, error);
        return null;
      }
    }

    /**
     * 获取 YouTube 视频尺寸（不需要 token）
     * @param {string} videoUrl
     * @returns {Promise<{width: number, height: number} | null>}
     */
    async #getYouTubeDimensions(videoUrl) {
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const response = await fetch(oEmbedUrl);

        if (!response.ok) {
          throw new Error(`YouTube oEmbed API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.width && data.height) {
          return {
            width: parseInt(data.width),
            height: parseInt(data.height),
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching YouTube dimensions:', error);
        return null;
      }
    }

    /**
     * 获取 Vimeo 视频尺寸（不需要 token）
     * @param {string} videoUrl
     * @returns {Promise<{width: number, height: number} | null>}
     */
    async #getVimeoDimensions(videoUrl) {
      try {
        const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(oEmbedUrl);

        if (!response.ok) {
          throw new Error(`Vimeo oEmbed API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.width && data.height) {
          return {
            width: parseInt(data.width),
            height: parseInt(data.height),
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching Vimeo dimensions:', error);
        return null;
      }
    }

    /**
     * 获取上传的视频文件尺寸
     * @returns {Promise<{width: number, height: number} | null>}
     */
    async #getUploadedVideoDimensions() {
      try {
        // 方法1: 从预览中的 video 元素获取尺寸
        const previewGrid = this.querySelector('preview-grid[data-role="video"]');
        if (previewGrid) {
          const videoElement = previewGrid.querySelector('video');
          if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            return {
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
            };
          }
        }

        // 方法2: 从文件输入框获取文件对象并读取尺寸
        const fileInput = this.querySelector('input[type="file"][accept*="video"]');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          return await this.#getVideoDimensionsFromFile(file);
        }

        // 方法3: 从预览图片中查找对应的视频元素
        const previewItems = this.querySelectorAll('.preview-grid-item');
        for (const item of previewItems) {
          const video = item.querySelector('video');
          if (video && video.videoWidth && video.videoHeight) {
            return {
              width: video.videoWidth,
              height: video.videoHeight,
            };
          }
        }

        return null;
      } catch (error) {
        console.error('Error getting uploaded video dimensions:', error);
        return null;
      }
    }

    /**
     * 从文件对象获取视频尺寸
     * @param {File} file
     * @returns {Promise<{width: number, height: number} | null>}
     */
    async #getVideoDimensionsFromFile(file) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
          });
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve(null);
        };

        video.src = URL.createObjectURL(file);
      });
    }

    async #handleSubmit(event) {
      const submit = event.target.closest('[data-role="submit"]');
      if (!submit) {
        return;
      }

      if (!this.checkValidity()) {
        return;
      }

      /** @type {HTMLFormElement} */
      const form = this.querySelector('form');
      if (!form) {
        return;
      }

      let data = {
        ...this.formData,
        mediaType: this.mediaType,
      };

      // 如果是视频，获取视频尺寸
      if (this.#tab === 'video') {
        if (data.videoUrl && !data.objectList) {
          // 视频 URL（不是上传的文件），尝试获取视频尺寸
          const platform = data.platform;
          if (platform) {
            const dimensions = await this.#getVideoDimensionsFromUrl(data.videoUrl, platform);
            if (dimensions && dimensions.width && dimensions.height) {
              data.mediaWidth = dimensions.width;
              data.mediaHeight = dimensions.height;
              console.log('Video URL dimensions:', data.mediaWidth, 'x', data.mediaHeight);
            }
          }
        } else if (data.objectList && data.objectList.length > 0) {
          // 上传的视频文件，objectList 中已经包含了尺寸信息
          // 如果第一个视频的宽高没有正确获取，尝试从 preview-grid 获取
          const firstVideo = data.objectList[0];
          if ((!firstVideo.width || !firstVideo.height) && firstVideo.key) {
            const file = this.querySelector(`preview-grid[data-role="${this.#tab}"]`);
            if (file && file.getDimensions) {
              // 需要找到原始的 key（可能包含 /）
              const originalKey = file.value.find((key) => {
                const processedKey = key.startsWith('/') ? key.slice(1) : key;
                return processedKey === firstVideo.key;
              });
              if (originalKey) {
                const dimensions = file.getDimensions(originalKey);
                if (dimensions && dimensions.width && dimensions.height) {
                  firstVideo.width = dimensions.width;
                  firstVideo.height = dimensions.height;
                  console.log('Updated video dimensions from preview-grid:', firstVideo.width, 'x', firstVideo.height);
                }
              }
            }
            // 如果还是没有尺寸，尝试其他方法获取
            if (!firstVideo.width || !firstVideo.height) {
              console.warn('No dimensions in preview-grid, trying alternative method');
              const dimensions = await this.#getUploadedVideoDimensions();
              if (dimensions && dimensions.width && dimensions.height) {
                firstVideo.width = dimensions.width;
                firstVideo.height = dimensions.height;
                console.log('Uploaded video dimensions (alternative method):', firstVideo.width, 'x', firstVideo.height);
              } else {
                console.warn('Failed to get uploaded video dimensions');
              }
            }
          }
        }
      }

      console.log('Form data before submit:', data);
      delete data.agreement;
      console.log('Payload to submit:', data);
      await this.#submit(data);
    }

    async #submit(payload) {
      //https://yarbo-backend-api.yarbo.ai
      console.log('=== Submit Request ===');
      console.log('URL:', 'https://yarbo-backend-api.yarbo.ai/backend/v3/ugc/v2/ugcUpload');
      console.log('Method:', 'POST');
      console.log('Payload:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));
      console.log('====================');

      const response = await fetch('https://yarbo-backend-api.yarbo.ai/backend/v3/ugc/v2/ugcUpload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('=== Submit Response ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      let data;
      try {
        data = await response.json();
      } catch (error) {
        // 如果响应不是 JSON 格式，显示通用错误
        console.error('Failed to parse response as JSON:', error);
        window.__SL_toast__.show({ type: 'error', message: 'Something went wrong' });
        return;
      }

      console.log('Response data:', data);
      console.log('Response data JSON:', JSON.stringify(data, null, 2));
      console.log('====================');

      // 检查 code 字段，如果不等于 0 则显示错误信息
      if (data.code !== 0) {
        // 优先使用 msg 字段，如果没有则使用 message 字段
        const errorMessage = data.msg || data.message || 'Something went wrong';
        console.error('API Error:', errorMessage);
        window.__SL_toast__.show({ type: 'error', message: errorMessage });
        return;
      }

      // 如果 HTTP 状态码不是 200-299，但 code 是 0，也检查一下
      if (!response.ok) {
        const errorMessage = data.msg || data.message || 'Something went wrong';
        window.__SL_toast__.show({ type: 'error', message: errorMessage });
        return;
      }

      console.log('Submit success!');

      this.reset();
      window.__SL_toast__.show({ type: 'success', message: 'Thank you for your submission' });

      if (this.hasAttribute('redirect-after-submit')) {
        const url = this.hasAttribute('redirect-url') || '/';
        setTimeout(() => (window.location.href = url), 1000);
      }
      this.dispatchEvent(new CustomEvent('snippet-image-with-text-form-submit', { detail: data, bubbles: true }));
    }

    /**
     * 初始化位置选择器（国家、州、城市）
     */
    async #initLocationSelects() {
      const countrySelect = this.querySelector('[data-role="country-select"]');
      const stateSelect = this.querySelector('[data-role="state-select"]');
      const citySelect = this.querySelector('[data-role="city-select"]');

      if (!countrySelect || !stateSelect || !citySelect) {
        console.warn('Location selects not found');
        return;
      }

      // 加载国家列表
      await this.#loadCountries(countrySelect);

      // 监听国家选择变化
      countrySelect.addEventListener('change', async (e) => {
        const countryCode = e.detail.value;
        if (countryCode) {
          // 重置州和城市
          stateSelect.value = null;
          stateSelect.setAttribute('disabled', '');
          citySelect.value = null;
          citySelect.setAttribute('disabled', '');

          // 加载州列表
          await this.#loadStates(stateSelect, countryCode);
        } else {
          stateSelect.value = null;
          stateSelect.setAttribute('disabled', '');
          citySelect.value = null;
          citySelect.setAttribute('disabled', '');
        }
      });

      // 监听州选择变化
      stateSelect.addEventListener('change', async (e) => {
        const stateCode = e.detail.value;
        const countryCode = countrySelect.value;
        if (stateCode && countryCode) {
          // 重置城市
          citySelect.value = null;
          citySelect.setAttribute('disabled', '');

          // 加载城市列表
          await this.#loadCities(citySelect, countryCode, stateCode);
        } else {
          citySelect.value = null;
          citySelect.setAttribute('disabled', '');
        }
      });
    }

    /**
     * 加载国家列表
     */
    async #loadCountries(selectElement) {
      try {
        const response = await fetch('https://yarbo-backend-api.yarbo.ai/backend/v3/common/country', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('ImageWithTextForm: Countries API response:', result);
        if (result.code === 0 && result.data) {
          const countries = Array.isArray(result.data) ? result.data : [];
          console.log('ImageWithTextForm: Countries data:', countries.slice(0, 3));

          // 确保数据格式正确：每个项都有 code 和 name
          const formattedCountries = countries
            .map((item) => {
              // 如果 item 是字符串，直接使用
              if (typeof item === 'string') {
                return {
                  code: item,
                  name: item,
                };
              }

              // 使用小写的 code 和 name 字段
              return {
                code: String(item.code || ''),
                name: String(item.name || ''),
              };
            })
            .filter((item) => {
              // 只过滤掉 code 和 name 都为空的情况
              return item.code && item.name && item.code.trim() !== '' && item.name.trim() !== '';
            });

          console.log('ImageWithTextForm: Formatted countries:', formattedCountries.slice(0, 3));
          console.log('ImageWithTextForm: Formatted count:', formattedCountries.length);

          // 设置选项
          selectElement.setOptions(formattedCountries);
          console.log('ImageWithTextForm: Options set, selectElement:', selectElement);
        } else {
          console.error('Failed to load countries:', result.message || result.msg);
          selectElement.setOptions([]);
        }
      } catch (error) {
        console.error('Error loading countries:', error);
        selectElement.setOptions([]);
      }
    }

    /**
     * 加载州列表
     */
    async #loadStates(selectElement, countryCode) {
      if (!countryCode) {
        selectElement.setOptions([]);
        return;
      }

      try {
        selectElement.removeAttribute('disabled');
        const response = await fetch(`https://yarbo-backend-api.yarbo.ai/backend/v3/common/state?country=${encodeURIComponent(countryCode)}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 0 && result.data) {
          const states = Array.isArray(result.data) ? result.data : [];
          // 确保数据格式正确：每个项都有 code 和 name
          const formattedStates = states
            .map((item) => ({
              code: String(item.code || ''),
              name: String(item.name || ''),
            }))
            .filter((item) => item.code && item.name && item.code.trim() !== '' && item.name.trim() !== '');
          selectElement.setOptions(formattedStates);
        } else {
          console.error('Failed to load states:', result.message || result.msg);
          selectElement.setOptions([]);
        }
      } catch (error) {
        console.error('Error loading states:', error);
        selectElement.setOptions([]);
      }
    }

    /**
     * 加载城市列表
     */
    async #loadCities(selectElement, countryCode, stateCode) {
      if (!countryCode || !stateCode) {
        selectElement.setOptions([]);
        return;
      }

      try {
        selectElement.removeAttribute('disabled');
        const response = await fetch(
          `https://yarbo-backend-api.yarbo.ai/backend/v3/common/city?country=${encodeURIComponent(countryCode)}&state=${encodeURIComponent(stateCode)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 0 && result.data) {
          const cities = Array.isArray(result.data) ? result.data : [];
          // 确保数据格式正确：每个项都有 code 和 name
          const formattedCities = cities
            .map((item) => ({
              code: String(item.code || ''),
              name: String(item.name || ''),
            }))
            .filter((item) => item.code && item.name && item.code.trim() !== '' && item.name.trim() !== '');
          selectElement.setOptions(formattedCities);
        } else {
          console.error('Failed to load cities:', result.message || result.msg);
          selectElement.setOptions([]);
        }
      } catch (error) {
        console.error('Error loading cities:', error);
        selectElement.setOptions([]);
      }
    }
  }

  customElements.define('image-with-text-form', ImageWithTextForm);
}
