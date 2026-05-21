if (!customElements.get('searchable-select')) {
  class SearchableSelect extends HTMLElement {
    static get observedAttributes() {
      return ['placeholder', 'disabled'];
    }

    constructor() {
      super();
      this._selected = '';
      this._options = [];
      this._filteredOptions = [];
      this._isOpen = false;
      this._searchTerm = '';
    }

    connectedCallback() {
      if (this.hasAttribute('disabled')) {
        this.setAttribute('tabindex', '-1');
      } else {
        this.setAttribute('tabindex', '0');
      }
      this.setAttribute('role', 'combobox');
      this.setAttribute('aria-expanded', 'false');
      this.setAttribute('aria-haspopup', 'listbox');

      // Create hidden input
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = this.getAttribute('name') || '';
      this.appendChild(hiddenInput);

      requestAnimationFrame(() => {
        const options = this.querySelectorAll('[data-role="select-option"]');
        this._options = Array.from(options).map((option) => ({
          value: option.dataset.value,
          label: option.textContent,
        }));
        this._filteredOptions = [...this._options];

        // Check for selected attribute
        const selectedValue = this.getAttribute('selected');
        if (selectedValue) {
          const selectedOption = this.querySelector(`[data-value="${selectedValue}"]`);
          if (selectedOption) {
            this._selected = selectedValue;
            hiddenInput.value = selectedValue;
            const trigger = this.querySelector('.select-trigger');
            if (trigger) {
              const triggerText = trigger.querySelector('span:not(.arrow):not(.select-clear)');
              if (triggerText) {
                triggerText.textContent = selectedOption.textContent;
                trigger.classList.remove('placeholder');
              }
            }
            selectedOption.classList.add('selected');
          }
        }

        this._handleTriggerClick = this.#handleTriggerClick.bind(this);
        this._handleOptionClick = this.#handleOptionClick.bind(this);
        this._handleDocumentClick = this.#handleDocumentClick.bind(this);
        this._handleFocus = this.#handleFocus.bind(this);
        this._handleBlur = this.#handleBlur.bind(this);
        this._handleSearchInput = this.#handleSearchInput.bind(this);
        this._handleSearchKeydown = this.#handleSearchKeydown.bind(this);
        this._handleClearClick = this.#handleClearClick.bind(this);

        this.setupEventListeners();

        // 初始化清空按钮（如果有选中值）
        this.#updateClearButton();
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'disabled') {
        const trigger = this.querySelector('.select-trigger');
        if (trigger) {
          if (newValue !== null) {
            trigger.style.opacity = '0.5';
            trigger.style.cursor = 'not-allowed';
            this.setAttribute('tabindex', '-1');
          } else {
            trigger.style.opacity = '1';
            trigger.style.cursor = 'pointer';
            this.setAttribute('tabindex', '0');
          }
        }
      }
    }

    disconnectedCallback() {
      const trigger = this.querySelector('.select-trigger');
      const optionsList = this.querySelector('.select-options-list') || this.querySelector('.select-options');
      const searchInput = this.querySelector('.select-search-input');
      const clearButton = this.querySelector('.select-clear');

      if (trigger) {
        trigger.removeEventListener('mousedown', this._handleTriggerClick);
      }

      if (optionsList) {
        optionsList.removeEventListener('click', this._handleOptionClick);
      }

      if (searchInput) {
        searchInput.removeEventListener('input', this._handleSearchInput);
        searchInput.removeEventListener('keydown', this._handleSearchKeydown);
      }

      if (clearButton) {
        clearButton.removeEventListener('click', this._handleClearClick);
      }

      document.removeEventListener('click', this._handleDocumentClick);
      this.removeEventListener('focus', this._handleFocus);
      this.removeEventListener('blur', this._handleBlur);
    }

    setupEventListeners() {
      const trigger = this.querySelector('.select-trigger');
      const optionsList = this.querySelector('.select-options-list');
      const searchInput = this.querySelector('.select-search-input');

      if (trigger) {
        trigger.addEventListener('mousedown', this._handleTriggerClick);
      }

      if (optionsList) {
        optionsList.addEventListener('click', this._handleOptionClick);
      }

      if (searchInput) {
        searchInput.addEventListener('input', this._handleSearchInput);
        searchInput.addEventListener('keydown', this._handleSearchKeydown);
        searchInput.addEventListener('click', (e) => e.stopPropagation());
      }

      document.addEventListener('click', this._handleDocumentClick);
      this.addEventListener('focus', this._handleFocus);
      this.addEventListener('blur', this._handleBlur);
    }

    #handleTriggerClick(event) {
      if (this.hasAttribute('disabled')) {
        return;
      }

      // 如果点击的是清空按钮，不打开下拉框
      if (event.target.closest('.select-clear')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const optionsContainer = this.querySelector('.select-options');
      if (!optionsContainer) {
        return;
      }

      this._isOpen = optionsContainer.classList.toggle('open');

      // 打开时聚焦搜索框（移动端也需要，但可能需要延迟）
      if (this._isOpen) {
        requestAnimationFrame(() => {
          const searchInput = this.querySelector('.select-search-input');
          if (searchInput) {
            // 移动端可能需要延迟聚焦，避免键盘弹出影响布局
            const isMobile = window.matchMedia('(max-width: 959px)').matches;
            if (isMobile) {
              setTimeout(() => searchInput.focus(), 100);
            } else {
              searchInput.focus();
            }
          }
        });
      }
    }

    #handleClearClick(e) {
      e.stopPropagation();
      e.preventDefault();

      this.value = '';
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { value: '' },
          bubbles: true,
        }),
      );
    }

    #handleOptionClick(e) {
      const option = e.target.closest('.select-option');
      const optionsContainer = this.querySelector('.select-options');
      const trigger = this.querySelector('.select-trigger');
      const hiddenInput = this.querySelector('input[type="hidden"]');

      if (option) {
        const value = option.dataset.value;
        this._selected = value;
        this._isOpen = false;
        if (optionsContainer) {
          optionsContainer.classList.remove('open');
        }

        // 清除搜索
        this._searchTerm = '';
        const searchInput = this.querySelector('.select-search-input');
        if (searchInput) {
          searchInput.value = '';
        }
        this._filteredOptions = [...this._options];
        this.#renderOptions();

        // Remove selected class from all options
        this.querySelectorAll('.select-option').forEach((opt) => {
          opt.classList.remove('selected');
        });

        // Add selected class to clicked option
        option.classList.add('selected');

        // Update trigger text
        const triggerText = trigger.querySelector('span:not(.arrow):not(.select-clear)');
        if (triggerText) {
          triggerText.textContent = option.textContent;
          trigger.classList.remove('placeholder');
        }

        // Update hidden input value
        if (hiddenInput) {
          hiddenInput.value = value;
        }

        // 更新清空按钮
        this.#updateClearButton();

        // Dispatch change event
        this.dispatchEvent(
          new CustomEvent('change', {
            detail: { value },
            bubbles: true,
          }),
        );
      }
    }

    #handleDocumentClick(e) {
      const optionsContainer = this.querySelector('.select-options');
      if (this.contains(e.target)) {
        return;
      }

      this._isOpen = false;
      if (!optionsContainer) {
        return;
      }

      optionsContainer.classList.remove('open');

      // 清除搜索
      this._searchTerm = '';
      const searchInput = this.querySelector('.select-search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      this._filteredOptions = [...this._options];
      this.#renderOptions();
    }

    #handleFocus(event) {
      if (this.hasAttribute('disabled')) {
        return;
      }
      const optionsContainer = this.querySelector('.select-options');

      this._isOpen = true;
      if (!optionsContainer) {
        return;
      }

      optionsContainer.classList.add('open');
    }

    #handleBlur(event) {
      // If focus is moving to a child element (e.g., search input inside dropdown), don't close
      if (event.relatedTarget && this.contains(event.relatedTarget)) {
        return;
      }
      const optionsContainer = this.querySelector('.select-options');

      this._isOpen = false;
      if (!optionsContainer) {
        return;
      }

      optionsContainer.classList.remove('open');
    }

    #handleSearchInput(e) {
      this._searchTerm = e.target.value.toLowerCase().trim();
      this.#filterOptions();
      this.#renderOptions();
    }

    #handleSearchKeydown(e) {
      if (e.key === 'Escape') {
        this.querySelector('.select-options')?.classList.remove('open');
        this._isOpen = false;
      }
      // 移除回车键选中逻辑，避免误操作
    }

    #filterOptions() {
      if (!this._searchTerm) {
        this._filteredOptions = [...this._options];
      } else {
        this._filteredOptions = this._options.filter((option) => {
          const code = (option.value || option.code || '').toLowerCase();
          const label = (option.label || option.name || '').toLowerCase();
          return code.includes(this._searchTerm) || label.includes(this._searchTerm);
        });
      }
    }

    #renderOptions() {
      const optionsContainer = this.querySelector('.select-options');
      if (!optionsContainer) {
        return;
      }

      // 找到或创建选项列表容器（始终创建，即使没有搜索框）
      let optionsList = optionsContainer.querySelector('.select-options-list');
      if (!optionsList) {
        optionsList = document.createElement('div');
        optionsList.className = 'select-options-list';
        optionsList.addEventListener('click', this._handleOptionClick);
        // 如果存在搜索框，插入到搜索框后面，否则直接添加
        const searchWrapper = optionsContainer.querySelector('.select-search-wrapper');
        if (searchWrapper) {
          searchWrapper.insertAdjacentElement('afterend', optionsList);
        } else {
          optionsContainer.appendChild(optionsList);
        }
      }

      // 找到搜索框容器，如果不存在则创建
      let searchWrapper = optionsContainer.querySelector('.select-search-wrapper');
      if (!searchWrapper && this._options.length >= 5) {
        searchWrapper = document.createElement('div');
        searchWrapper.className = 'select-search-wrapper';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'select-search-input';
        searchInput.placeholder = 'Search...';
        searchInput.value = this._searchTerm;
        searchInput.addEventListener('input', this._handleSearchInput);
        searchInput.addEventListener('keydown', this._handleSearchKeydown);
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchWrapper.appendChild(searchInput);
        optionsContainer.insertBefore(searchWrapper, optionsList);
      }

      // 清空选项列表
      optionsList.innerHTML = '';

      // 如果没有过滤后的选项，显示提示
      if (this._filteredOptions.length === 0) {
        if (this._options.length === 0) {
          const noResults = document.createElement('div');
          noResults.className = 'select-no-results';
          noResults.textContent = 'No options available';
          optionsList.appendChild(noResults);
        } else {
          const noResults = document.createElement('div');
          noResults.className = 'select-no-results';
          noResults.textContent = 'No results found';
          optionsList.appendChild(noResults);
        }
        return;
      }

      // 渲染过滤后的选项
      this._filteredOptions.forEach((option) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'select-option';
        optionElement.setAttribute('data-role', 'select-option');
        optionElement.setAttribute('data-value', option.value || option.code);
        optionElement.textContent = option.label || option.name;

        if (this._selected === (option.value || option.code)) {
          optionElement.classList.add('selected');
        }

        optionsList.appendChild(optionElement);
      });
    }

    get value() {
      return this._selected;
    }

    set value(val) {
      if (!val) {
        this._selected = '';
        const hiddenInput = this.querySelector('input[type="hidden"]');
        if (hiddenInput) {
          hiddenInput.value = '';
        }
        const trigger = this.querySelector('.select-trigger');
        if (trigger) {
          const triggerText = trigger.querySelector('span:not(.arrow):not(.select-clear)');
          if (triggerText) {
            triggerText.textContent = this.getAttribute('placeholder') || 'Select...';
            trigger.classList.add('placeholder');
          }
        }
        this.#updateClearButton();
        return;
      }

      this._selected = val;
      const trigger = this.querySelector('.select-trigger');
      const option = this.querySelector(`.select-option[data-value="${val}"]`);
      const hiddenInput = this.querySelector('input[type="hidden"]');

      if (trigger && option) {
        const triggerText = trigger.querySelector('span:not(.arrow):not(.select-clear)');
        if (triggerText) {
          triggerText.textContent = option.textContent;
          trigger.classList.remove('placeholder');
        }
      }

      if (hiddenInput) {
        hiddenInput.value = val;
      }

      this.#updateClearButton();
    }

    #updateClearButton() {
      const trigger = this.querySelector('.select-trigger');
      if (!trigger) return;

      let clearButton = trigger.querySelector('.select-clear');
      const hasValue = !!this._selected;

      if (hasValue && !clearButton) {
        // 创建清空按钮
        clearButton = document.createElement('span');
        clearButton.className = 'select-clear';
        clearButton.innerHTML = '×';
        clearButton.setAttribute('role', 'button');
        clearButton.setAttribute('aria-label', 'Clear selection');

        const arrow = trigger.querySelector('.arrow');
        if (arrow) {
          trigger.insertBefore(clearButton, arrow);
        } else {
          trigger.appendChild(clearButton);
        }

        clearButton.addEventListener('click', this._handleClearClick);
      } else if (!hasValue && clearButton) {
        // 移除清空按钮
        clearButton.remove();
      }
    }

    /**
     * 动态设置选项
     * @param {Array<{code: string, name: string}>} options
     */
    setOptions(options) {
      if (!Array.isArray(options)) {
        console.warn('SearchableSelect: setOptions expects an array');
        return;
      }

      const optionsContainer = this.querySelector('.select-options');
      if (!optionsContainer) {
        console.warn('SearchableSelect: Options container not found');
        return;
      }

      // 更新内部选项数组
      this._options = options.map((item) => ({
        value: item.code || item.value,
        label: item.name || item.label,
      }));
      this._filteredOptions = [...this._options];

      // 渲染选项
      this.#renderOptions();
    }
  }

  customElements.define('searchable-select', SearchableSelect);
}
