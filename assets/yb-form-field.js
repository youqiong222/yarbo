if (!customElements.get('form-field')) {
  class FormField extends HTMLElement {
    static ERROR_MESSAGE_SELECTER = '[data-role="errorMessage"]';

    connectedCallback() {
      requestAnimationFrame(() => {
        this.addEventListener('input', this.validate);
        this.addEventListener('change', this.validate);
      });
    }

    disconnectedCallback() {
      this.removeEventListener('input', this.validate);
      this.removeEventListener('change', this.validate);
    }

    reset() {
      this.#clearError();
      const target = this.querySelector('textarea, input, custom-select, searchable-select');
      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        target.checked = false;
      } else if (target) {
        target.value = '';
      }
    }

    get name() {
      return this.getAttribute('name');
    }

    get value() {
      const target = this.querySelector('textarea, input, custom-select, searchable-select');
      if (target instanceof HTMLInputElement) {
        // 对于复选框，返回 checked 状态
        if (target.type === 'checkbox') {
          return target.checked ? 'true' : '';
        }
        return target.value;
      }

      if (target instanceof HTMLTextAreaElement) {
        return target.value;
      }

      const CustomSelect = customElements.get('custom-select');
      if (typeof CustomSelect !== 'undefined' && target instanceof CustomSelect) {
        return target.value;
      }

      const SearchableSelect = customElements.get('searchable-select');
      if (typeof SearchableSelect !== 'undefined' && target instanceof SearchableSelect) {
        return target.value || '';
      }

      return '';
    }

    get entry() {
      return [this.name, this.value];
    }

    validate() {
      const required = this.hasAttribute('required');
      const pattern = this.getAttribute('pattern');
      const label = this.getAttribute('label') || 'Field';

      const target = this.querySelector('textarea, input, custom-select, searchable-select');
      const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';

      if (required) {
        if (isCheckbox) {
          // 复选框验证：必须勾选
          if (!target.checked) {
            this.#showError(`${label} is required`);
            return false;
          }
        } else {
          // 其他输入框验证：必须有值
          const value = this.value;
          if (!value || (typeof value === 'string' && !value.trim())) {
            this.#showError(`${label} is required`);
            return false;
          }
        }
      }

      if (pattern && !isCheckbox) {
        const value = this.value;
        if (!new RegExp(pattern).test(value)) {
          this.#showError(`${label} is invalid`);
          return false;
        }
      }

      this.#clearError();
      return true;
    }

    /** @param {string} message */
    #setErrorMessage(message) {
      const errorElement = this.querySelector(FormField.ERROR_MESSAGE_SELECTER);
      errorElement && (errorElement.textContent = message);
    }

    #showError(message) {
      this.classList.add('error');
      this.#setErrorMessage(message);
    }

    #clearError() {
      this.classList.remove('error');
      this.#setErrorMessage('');
    }
  }

  customElements.define('form-field', FormField);
}
