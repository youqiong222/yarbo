/**
 * Cart Discount Web Component
 * Handles applying and removing discount codes via Shopify AJAX API.
 */
class CartDiscount extends HTMLElement {
  constructor() {
    super();

    this.form = this.querySelector('.cart-discount__form');
    this.input = this.querySelector('.cart-discount__input');
    this.errorEl = this.querySelector('.cart-discount__error');
    this.errorText = this.querySelector('.cart-discount__error-text');
    this.codesContainer = this.querySelector('.cart-discount__codes');
    this.applyBtn = this.querySelector('.cart-discount__apply');
    this.sectionId = this.dataset.sectionId || 'cart-drawer';

    this.form.addEventListener('submit', this.onApply.bind(this));
    this.codesContainer.addEventListener('click', this.onRemove.bind(this));
  }

  get existingCodes() {
    return Array.from(this.querySelectorAll('.cart-discount__pill'))
      .map((pill) => pill.dataset.discountCode)
      .filter(Boolean);
  }

  showError(message) {
    this.errorText.textContent = message;
    this.errorEl.classList.remove('hidden');
    this.errorEl.classList.add('flex');
  }

  hideError() {
    this.errorEl.classList.add('hidden');
    this.errorEl.classList.remove('flex');
    this.errorText.textContent = '';
  }

  setLoading(loading) {
    this.applyBtn.disabled = loading;
    const text = this.applyBtn.querySelector('.cart-discount__apply-text');
    const spinner = this.applyBtn.querySelector('.cart-discount__apply-spinner');
    if (text) text.classList.toggle('hidden', loading);
    if (spinner) spinner.classList.toggle('hidden', !loading);
  }

  async onApply(event) {
    event.preventDefault();

    const code = this.input.value.trim();
    if (!code) return;

    const existing = this.existingCodes;
    if (existing.includes(code.toUpperCase()) || existing.includes(code)) {
      this.showError('This discount code has already been applied.');
      return;
    }

    this.hideError();
    this.setLoading(true);

    const allCodes = [...existing, code];

    try {
      const response = await fetch(routes.cart_update_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          discount: allCodes.join(','),
          sections: [this.sectionId],
        }),
      });

      const data = await response.json();

      // Check if the discount code is invalid
      if (data.discount_codes) {
        const applied = data.discount_codes.find(
          (d) => d.code.toUpperCase() === code.toUpperCase()
        );
        if (applied && applied.applicable === false) {
          this.input.value = '';
          this.showError('Enter a valid discount code.');
          this.setLoading(false);
          return;
        }
      }

      // Re-render sections
      this.input.value = '';
      this.refreshSections(data);
    } catch (error) {
      console.error('Cart discount error:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async onRemove(event) {
    const removeBtn = event.target.closest('.cart-discount__remove');
    if (!removeBtn) return;

    const pill = removeBtn.closest('.cart-discount__pill');
    if (!pill) return;

    const codeToRemove = pill.dataset.discountCode;
    const remaining = this.existingCodes.filter(
      (c) => c.toUpperCase() !== codeToRemove.toUpperCase()
    );

    this.hideError();

    // Optimistic UI: remove pill immediately
    pill.remove();

    try {
      const response = await fetch(routes.cart_update_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          discount: remaining.join(','),
          sections: [this.sectionId],
        }),
      });

      const data = await response.json();
      this.refreshSections(data);
    } catch (error) {
      console.error('Cart discount remove error:', error);
      // Refresh to restore correct state on error
      location.reload();
    }
  }

  refreshSections(data) {
    if (!data.sections) return;

    const newHtml = data.sections[this.sectionId];
    if (!newHtml) return;

    const parsed = new DOMParser().parseFromString(newHtml, 'text/html');

    // Update discount component itself
    const newDiscount = parsed.querySelector('cart-discount');
    if (newDiscount) {
      this.innerHTML = newDiscount.innerHTML;

      // Re-query DOM refs
      this.form = this.querySelector('.cart-discount__form');
      this.input = this.querySelector('.cart-discount__input');
      this.errorEl = this.querySelector('.cart-discount__error');
      this.errorText = this.querySelector('.cart-discount__error-text');
      this.codesContainer = this.querySelector('.cart-discount__codes');
      this.applyBtn = this.querySelector('.cart-discount__apply');

      // Re-bind events
      this.form.addEventListener('submit', this.onApply.bind(this));
      this.codesContainer.addEventListener('click', this.onRemove.bind(this));
    }

    // Update cart drawer items (line totals + per-item discounts)
    const newCartItems = parsed.querySelector('#CartDrawer-CartItems');
    const currentCartItems = document.getElementById('CartDrawer-CartItems');
    if (newCartItems && currentCartItems) {
      currentCartItems.innerHTML = newCartItems.innerHTML;
    }

    // Update cart drawer footer (subtotals, discounts list)
    const newFooter = parsed.querySelector('.drawer__footer');
    const currentFooter = document.querySelector('cart-drawer .drawer__footer');
    if (newFooter && currentFooter) {
      // Only update the subtotal/discount part, not the discount input
      const newSubtotal = newFooter.querySelector('[role="status"]');
      const currentSubtotal = currentFooter.querySelector('[role="status"]');
      if (newSubtotal && currentSubtotal) {
        currentSubtotal.innerHTML = newSubtotal.innerHTML;
      }

      // Update discount applications list
      const newDiscountsList = newFooter.querySelector('.discounts');
      const currentDiscountsWrapper = currentFooter.children[0]?.children[0];
      if (currentDiscountsWrapper) {
        currentDiscountsWrapper.innerHTML = newDiscountsList
          ? newDiscountsList.outerHTML
          : '';
      }
    }

    // Update cart icon bubble
    const bubbleHtml = data.sections['cart-icon-bubble'];
    if (bubbleHtml) {
      const bubbleParsed = new DOMParser().parseFromString(bubbleHtml, 'text/html');
      const newBubble = bubbleParsed.querySelector('.shopify-section');
      const currentBubble = document.getElementById('cart-icon-bubble');
      if (newBubble && currentBubble) {
        currentBubble.innerHTML = newBubble.innerHTML;
      }
    }
  }
}

if (!customElements.get('cart-discount')) {
  customElements.define('cart-discount', CartDiscount);
}
