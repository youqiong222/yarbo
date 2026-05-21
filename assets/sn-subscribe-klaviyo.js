defineCustomElement('yb-subscribe-klaviyo', () => {
  return class YbSubscribeKlaviyo extends HTMLElement {
    constructor() {
      super();
      this._movePopupToBody();
      this.bindEvent();
    }

    _movePopupToBody() {
      if (this.dataset.popupToBody !== 'true') return;
      const id = this.dataset.popupId;
      this.querySelectorAll('.subscribe-popup-container, .subscribe-popup-container-recheck').forEach((el) => {
        document.body.appendChild(el);
      });
    }

    // 在 popup 容器（可能已移到 body）内查找元素
    _$popup(selector) {
      if (this.dataset.popupToBody !== 'true') {
        return this.querySelector(selector);
      }
      const id = this.dataset.popupId;
      for (const root of document.querySelectorAll(`[data-popup-id="${id}"]`)) {
        if (root.matches(selector)) return root;
        const found = root.querySelector(selector);
        if (found) return found;
      }
      return null;
    }

    bindEvent() {
      const formData = {};
      const errorMsg = {
        unChecked: 'Please tick the agreements!',
        email: 'Please enter a valid email address.',
        name: 'Please enter a name with 0-15 characters',
        phone: 'Please enter country code. (eg. +11234567891)',
      };
      this.querySelector('.yb-subscribe-klaviyo-checkbox').addEventListener('change', (e) => {
        const checkboxWrapper = this.querySelector('.yb-subscribe-klaviyo-checkbox-wrapper');
        if (e.target.checked) {
          checkboxWrapper.classList.add(`yb-subscribe-klaviyo-checkbox-checked`);
        } else {
          checkboxWrapper.classList.remove(`yb-subscribe-klaviyo-checkbox-checked`);
        }
      });

      this.querySelector('.yb-subscribe-klaviyo-suffix').addEventListener('click', (e) => {
        const checkbox = this.querySelector('.yb-subscribe-klaviyo-checkbox');
        const wrapper = this.querySelector('.yb-subscribe-klaviyo-input-wrapper');
        const input = this.querySelector('.yb-subscribe-klaviyo-input');
        const step = wrapper.getAttribute('data-step');
        const value = input.value;
        this.showError('');

        // checkbox required for email + phone steps, not name
        if (!checkbox.checked && step !== 'name') {
          this.showError(errorMsg.unChecked);
          return;
        }

        try {
          formData.emailType = this.querySelector('.yb-subscribe-klaviyo-suffix').getAttribute('data-email-type');
          formData.klaviyoListId = this.querySelector('.yb-subscribe-klaviyo-suffix').getAttribute('data-klaviyo-list-id') || '';
        } catch (e) {
          console.error('get email type or klaviyo list id error', e);
        }

        // ── Step 1: Email ──────────────────────────────────────────────
        if (step === 'email') {
          if (value && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
            formData.email = value;
            // Always show email-confirm popup first
            this.showEmailCheckPop(value).then((confirmed) => {
              this.hideEmailCheckPop();
              if (!confirmed) return; // user chose "Re-enter"

              if (this.getAttribute('data-step2')) {
                this.changeToStep('name');
              } else {
                formData.name = '';
                formData.phone = '';
                this.submitKlaviyo(formData, true);
              }
            });
          } else {
            this.showError(errorMsg.email);
          }
          return;
        }

        // ── Step 2: Name ───────────────────────────────────────────────
        if (step === 'name') {
          const trimmed = value.trim();
          if (trimmed.length > 0 && trimmed.length <= 15) {
            formData.name = trimmed;
            if (this.getAttribute('data-step3')) {
              this.changeToStep('phone');
            } else {
              formData.phone = '';
              this.submitKlaviyo(formData, true);
            }
          } else {
            this.showError(errorMsg.name);
          }
          return;
        }

        // ── Step 3: Phone ──────────────────────────────────────────────
        if (step === 'phone') {
          if (value && /^\+\d[\d\s]{6,}$/.test(value.trim())) {
            formData.phone = value.trim();
            this.submitKlaviyo(formData, true);
          } else {
            this.showError(errorMsg.phone);
          }
          return;
        }
      });

      this.querySelector('.yb-subscribe-klaviyo-prefix').addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = this.querySelector('.yb-subscribe-klaviyo-input-wrapper');
        if (wrapper.getAttribute('data-step') === 'phone') {
          this.showDropDown();
        }
      });

      this.querySelector('.subscribe-country-list-wrapper').addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.classList.contains('search-box')) {
          return;
        }
        const item = e.target;
        const countryCode = item.getAttribute('data-country-code');
        const dialCode = item.querySelector('.dial-code').innerHTML.trim();
        if (countryCode) {
          this.updateSelected(countryCode, dialCode);
          this.hideDropDown();
        }
      });

      // 关闭按钮事件绑定
      const closeBtn = this._$popup('.subscribe-popup-close-icon');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hidePopover());
      }

      let debounceTimer;
      const handleSearch = (keyword) => {
        const searchTerm = keyword.toLowerCase();
        this.querySelectorAll('.country').forEach((country) => {
          const name = country.querySelector('.country-name').textContent.toLowerCase();
          const dialCode = country.querySelector('.dial-code').textContent.toLowerCase();
          country.style.display = name.includes(searchTerm) || dialCode.includes(searchTerm) ? 'flex' : 'none';
        });
      };

      this.querySelector('.search-box').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          handleSearch(e.target.value);
        }, 300);
      });

      document.body.addEventListener('click', (e) => {
        this.querySelector('.subscribe-country-list-wrapper').classList.remove('subscribe-show');
      });
    }
    updateSelected(countryCode, dialCode) {
      this.querySelector('.yb-subscribe-klaviyo-prefix').innerHTML = `<div class="flag ${countryCode}"></div>`;
      const oldValue = this.querySelector('.yb-subscribe-klaviyo-input').value || '';
      const newValue = `${dialCode} ${oldValue.replace(/^\+\d+\s?/g, '')}`;
      this.querySelector('.yb-subscribe-klaviyo-input').value = newValue;
    }
    updateDropDown() {}
    showDropDown() {
      this.querySelector('.subscribe-country-list-wrapper').classList.add('subscribe-show');
    }
    hideDropDown() {
      this.querySelector('.subscribe-country-list-wrapper').classList.remove('subscribe-show');
    }
    changeToStep(step) {
      const step2Text = this.getAttribute('data-step2') || 'Go';
      const step3Text = this.getAttribute('data-step3') || 'Subscribe';
      const step2Placeholder = this.getAttribute('data-step2Placeholder') || 'Name';
      const step3Placeholder = this.getAttribute('data-step3Placeholder') || 'Phone';

      const wrapper = this.querySelector('.yb-subscribe-klaviyo-input-wrapper');
      const suffix = this.querySelector('.yb-subscribe-klaviyo-suffix');
      const input = this.querySelector('.yb-subscribe-klaviyo-input');
      const policy = this.querySelector('.yb-subscribe-klaviyo-policy');

      wrapper.setAttribute('data-step', step);
      wrapper.classList.add(`yb-subscribe-klaviyo-input-${step}`);

      if (step === 'name') {
        suffix.innerHTML = step2Text;
        input.value = '';
        input.setAttribute('placeholder', step2Placeholder);
        wrapper.classList.remove('yb-subscribe-klaviyo-input-email');
        this.querySelector('.yb-subscribe-klaviyo-prefix').innerHTML =
          `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.0484 12.7062C15.0484 12.7062 14.1258 11.2126 12.4874 10.5226C12.4874 10.5226 12.4125 10.4892 12.2757 10.4397C13.3803 9.68219 14.107 8.39606 14.107 6.93626C14.107 4.6062 12.2541 2.71777 9.96785 2.71777C7.68163 2.71777 5.82869 4.6062 5.82869 6.93626C5.82869 8.38898 6.54835 9.66965 7.64393 10.4286C7.29369 10.5675 6.94225 10.7479 6.59643 10.9789C6.59639 10.9789 4.11572 12.5488 3.88757 15.5119C3.88757 15.5119 3.80894 16.1341 3.98548 16.4341C3.98548 16.4341 4.22345 16.7613 4.61755 16.7067C4.61755 16.7067 5.18402 16.6714 5.22042 15.9782C5.22042 15.9782 5.20472 15.2686 5.47643 14.5017C5.47643 14.5017 5.71597 13.787 6.16773 13.2081C6.16773 13.2081 6.75285 12.362 7.83419 11.8238C7.83419 11.8238 8.9976 11.1875 10.4053 11.3437C10.4053 11.3437 11.3885 11.3888 12.3994 11.9903C12.3994 11.9903 13.7887 12.6354 14.4863 14.6041C14.4863 14.6041 14.6999 15.2519 14.7082 15.8699C14.7082 15.8699 14.6149 16.6502 15.3802 16.712C15.3802 16.712 16.0524 16.7621 16.0449 15.8662C16.0449 15.8662 16.0798 14.2249 15.0484 12.7062ZM7.01038 6.93736C7.01038 5.27305 8.33403 3.92384 9.96677 3.92384C11.5994 3.92384 12.9231 5.27305 12.9231 6.93736C12.9231 8.60277 11.5994 9.952 9.96677 9.952C8.33403 9.952 7.01038 8.60277 7.01038 6.93736Z" fill="#ACACAC"/>
</svg>`;
        policy.style.visibility = 'hidden';
        return;
      }
      if (step === 'phone') {
        suffix.innerHTML = step3Text;
        input.value = '+852 ';
        input.setAttribute('placeholder', step3Placeholder);
        wrapper.classList.remove('yb-subscribe-klaviyo-input-name');
        this.querySelector('.yb-subscribe-klaviyo-prefix').innerHTML = `<div class="flag hk"></div>`;
        policy.style.visibility = 'visible';
      }
    }
    findPopup() {
      return this._$popup('.subscribe-popup-container');
    }

    showPopover() {
      const popup = this.findPopup();
      if (popup) {
        popup.classList.add('subscribe-popup-show');
      }
    }
    hidePopover() {
      const popup = this.findPopup();
      if (popup) {
        popup.classList.remove('subscribe-popup-show');
      }
    }
    showError(msg) {
      const errorNode = this.querySelector('.yb-subscribe-klaviyo-errors');
      errorNode.innerHTML = msg;
    }

    showEmailCheckPop(email) {
      this._$popup('.subscribe-popup-container-recheck-email').textContent = email;
      this._$popup('.subscribe-popup-container-recheck').classList.add('subscribe-popup-container-recheck-show');
      return new Promise((resolve) => {
        const _this = this;
        function tempClick(e) {
          let result = false;
          if (e.target.classList.contains('subscribe-popup-container-recheck-clear')) {
            result = false;
          }
          if (e.target.classList.contains('subscribe-popup-container-recheck-checked')) {
            result = true;
          }
          resolve(result);
          _this.removeRecheckEmailEvent(tempClick);
        }
        this._$popup('.subscribe-popup-container-recheck-clear').addEventListener('click', tempClick);
        this._$popup('.subscribe-popup-container-recheck-checked').addEventListener('click', tempClick);
      });
    }

    hideEmailCheckPop() {
      this._$popup('.subscribe-popup-container-recheck').classList.remove('subscribe-popup-container-recheck-show');
    }

    removeRecheckEmailEvent(cb) {
      this._$popup('.subscribe-popup-container-recheck-clear').removeEventListener('click', cb);
      this._$popup('.subscribe-popup-container-recheck-checked').removeEventListener('click', cb);
    }

    async submitKlaviyo(formData, show_popover = false) {
      console.log('submitKlaviyo called with:', formData);
      this.setLoading(true);
      try {
        // 首先做前端上报，如果ISV的klaviyo插件未初始化，就不支持
        if (window.klaviyo) {
          window.klaviyo.push([
            'identify',
            {
              email: formData.email,
              phone_number: formData.phone,
              last_name: formData.name,
            },
          ]);
          console.log('Klaviyo identify success');
        } else {
          console.warn('window.klaviyo not available');
        }
        if (window.reportEvent) {
          window.reportEvent({
            event: 'lead_form_submit',
            email: formData.email,
            phone_number: formData.phone,
            last_name: formData.name,
          });
        }
      } catch (error) {
        console.error('Klaviyo frontend error:', error);
      }

      try {
        // 然后做后端上报
        const getCookie = (name) => {
          const cookies = document.cookie.split('; ');
          const cookie = cookies.find((row) => row.startsWith(`${name}=`));
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
        };

        const mUtm = JSON.parse(getCookie('m_utm') || '{}');

        // 只有当 data-country 是 "AU" 时才使用它，否则使用 UTM 中的国家信息
        const customCountry = this.getAttribute('data-country');
        const countryValue = "US";

        const obj = {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          subscribeEmailType: formData.emailType || 'shop', // shop 可以随便传
          klaviyo_list_id: formData.klaviyoListId || '',
          updateDate: new Date().toISOString(), // 时间
          pathname: location.href, // 当前页面
          userId: mUtm.user_id,
          clarityId: '', // 传空
          deviceType: mUtm.os,
          country: countryValue,
          state: mUtm['region-name'],
          city: mUtm.ud_city,
          utmSource: mUtm.utm_source,
          utmMedium: mUtm.utm_medium,
          utmCampaign: mUtm.utm_campaign,
        };
        console.log('obj submit klaviyo data', obj);
        const bodyData = JSON.stringify(obj);
        console.log('body string data:', bodyData);
        console.log('body string length:', bodyData.length);

        const apiUrl = 'https://6eki2htjre.execute-api.us-east-1.amazonaws.com/Stage/yarbo/market/klaviyoSubscribe';
        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: bodyData,
        };

        console.log('API URL:', apiUrl);
        console.log('Request options:', requestOptions);
        console.log('开始发送请求...');

        // 使用 fetch 发送请求
        const response = await fetch(apiUrl, requestOptions);

        console.log('请求已发送');
        console.log('response status:', response.status);
        console.log('response ok:', response.ok);
        console.log('response statusText:', response.statusText);

        // 获取响应文本
        const responseText = await response.text();
        console.log('response text:', responseText);

        // 尝试解析为 JSON
        let result;
        try {
          result = JSON.parse(responseText);
          console.log('response result:', result);
        } catch (e) {
          console.error('JSON parse error:', e);
          console.log('原始响应内容:', responseText);
          throw new Error('Invalid response format');
        }

        // 检查响应状态和业务逻辑是否成功
        if (response.ok && result && result.success !== false) {
          // 只有在真正成功时才显示成功弹窗
          if (show_popover) {
            console.log('订阅成功，显示成功弹窗');
            this.showPopover();
          }
        } else {
          // 请求失败或业务逻辑失败
          const errorMessage = result?.message || 'Subscription failed. Please try again.';
          console.error('订阅失败:', errorMessage);
          this.showError(errorMessage);
        }
      } catch (error) {
        // 网络错误或其他异常
        console.error('Subscription error:', error);
        this.showError('Network error. Please check your connection and try again.');
      } finally {
        this.setLoading(false);
      }
    }

    setLoading(loading) {
      const suffix = this.querySelector('.yb-subscribe-klaviyo-suffix');
      if (!suffix) return;
      if (loading) {
        suffix.classList.add('is-loading');
      } else {
        suffix.classList.remove('is-loading');
      }
    }
  };
});
