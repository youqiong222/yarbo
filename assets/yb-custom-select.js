if (!customElements.get('custom-select')) {
  class CustomSelect extends HTMLElement {
    static get observedAttributes() {
      return ['placeholder'];
    }

    constructor() {
      super();
      this._selected = '';
      this._options = [];
      this._isOpen = false;
    }

    connectedCallback() {
      this.setAttribute('tabindex', '0');
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

        // Check for selected attribute
        const selectedValue = this.getAttribute('selected');
        if (selectedValue) {
          const selectedOption = this.querySelector(`[data-value="${selectedValue}"]`);
          if (selectedOption) {
            this._selected = selectedValue;
            hiddenInput.value = selectedValue;
            const trigger = this.querySelector('.select-trigger');
            if (trigger) {
              const triggerText = trigger.querySelector('span');
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

        this.setupEventListeners();
      });
    }

    disconnectedCallback() {
      const trigger = this.querySelector('.select-trigger');
      const optionsContainer = this.querySelector('.select-options');

      if (trigger) {
        trigger.removeEventListener('mousedown', this._handleTriggerClick);
      }

      if (optionsContainer) {
        optionsContainer.removeEventListener('click', this._handleOptionClick);
      }

      document.removeEventListener('click', this._handleDocumentClick);
      this.removeEventListener('focus', this._handleFocus);
      this.removeEventListener('blur', this._handleBlur);
    }

    setupEventListeners() {
      const trigger = this.querySelector('.select-trigger');
      const optionsContainer = this.querySelector('.select-options');

      if (trigger) {
        trigger.addEventListener('mousedown', this._handleTriggerClick);
      }

      if (optionsContainer) {
        optionsContainer.addEventListener('click', this._handleOptionClick);
      }

      document.addEventListener('click', this._handleDocumentClick);
      this.addEventListener('focus', this._handleFocus);
      this.addEventListener('blur', this._handleBlur);
    }

    #handleTriggerClick(event) {
      event.preventDefault();

      const optionsContainer = this.querySelector('.select-options');
      if (!optionsContainer) {
        return;
      }

      this._isOpen = optionsContainer.classList.toggle('open');
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

        // Remove selected class from all options
        this.querySelectorAll('.select-option').forEach((opt) => {
          opt.classList.remove('selected');
        });

        // Add selected class to clicked option
        option.classList.add('selected');

        // Update trigger text
        const triggerText = trigger.querySelector('span');
        if (triggerText) {
          triggerText.textContent = option.textContent;
          trigger.classList.remove('placeholder');
        }

        // Update hidden input value
        if (hiddenInput) {
          hiddenInput.value = value;
        }

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
    }

    #handleFocus(event) {
      const optionsContainer = this.querySelector('.select-options');

      this._isOpen = true;
      if (!optionsContainer) {
        return;
      }

      optionsContainer.classList.add('open');
    }

    #handleBlur() {
      const optionsContainer = this.querySelector('.select-options');

      this._isOpen = false;
      if (!optionsContainer) {
        return;
      }

      optionsContainer.classList.remove('open');
    }

    get value() {
      return this._selected;
    }

    set value(val) {
      this._selected = val;
      const trigger = this.querySelector('[data-role="select-trigger"]');
      const option = this.querySelector(`[data-role="select-option"][data-value="${val}"]`);
      const hiddenInput = this.querySelector('input[type="hidden"]');

      if (trigger && option) {
        const triggerText = trigger.querySelector('span');
        if (triggerText) {
          triggerText.textContent = option.textContent;
          trigger.classList.remove('placeholder');
        }
      }

      if (hiddenInput) {
        hiddenInput.value = val;
      }
    }
  }

  customElements.define('custom-select', CustomSelect);
}
