class CEndWarrantyForm {
  constructor() {
    ((this.apiBaseUrl = 'https://erp-api.yarbo.ai/api/v1'),
      (this.orderData = null),
      (this.priceData = null),
      (this.warrantyProductId = null),
      (this.warrantyVariantId = null),
      (this.isOrderQueried = !1),
      (this.isQuerying = !1),
      this.init());
  }
  init() {
    (this.bindEvents(), this.disableQueryButton(), this.disableSubmitButton());
  }
  bindEvents() {
    const orderNumberInput = document.getElementById('c-order-number'),
      emailInput = document.getElementById('c-email-address'),
      queryBtn = document.getElementById('c-query-btn'),
      submitBtn = document.getElementById('c-submit-btn'),
      planSelect = document.getElementById('c-yarbocare-plan-select'),
      modalSubmitBtn = document.getElementById('c-modal-submit-btn'),
      modalCloseBtn = document.getElementById('c-price-modal-close'),
      updateQueryButtonState = () => {
        const orderNumber = orderNumberInput?.value?.trim(),
          email = emailInput?.value?.trim();
        orderNumber && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !this.isOrderQueried
          ? this.enableQueryButton()
          : this.isOrderQueried || this.disableQueryButton();
      };
    (orderNumberInput && orderNumberInput.addEventListener('input', updateQueryButtonState),
      emailInput && emailInput.addEventListener('input', updateQueryButtonState),
      queryBtn &&
        queryBtn.addEventListener('click', (e) => {
          (e.preventDefault(), !queryBtn.disabled && this.handleQueryOrder());
        }),
      submitBtn &&
        submitBtn.addEventListener('click', (e) => {
          (e.preventDefault(), this.handleSubmit());
        }),
      planSelect &&
        planSelect.addEventListener('change', () => {
          this.updateSubmitButtonState();
        }),
      modalSubmitBtn && modalSubmitBtn.addEventListener('click', () => this.handleModalSubmit()),
      modalCloseBtn && modalCloseBtn.addEventListener('click', () => this.closePriceModal()),
      document.getElementById('c-timeout-modal-close')?.addEventListener('click', () => this.closeTimeoutModal()),
      document.getElementById('c-success-modal-close')?.addEventListener('click', () => this.closeSuccessModal()),
      document.addEventListener('keydown', (e) => {
        e.key === 'Escape' && this.closePriceModal();
      }));
  }
  updateSubmitButtonState() {
    const selectedPlan = document.getElementById('c-yarbocare-plan-select')?.value;
    this.isOrderQueried && selectedPlan ? this.enableSubmitButton() : this.disableSubmitButton();
  }
  async handleQueryOrder() {
    if (this.isQuerying) return;
    this.isQuerying = !0;
    const orderNumberInput = document.getElementById('c-order-number'),
      emailInput = document.getElementById('c-email-address'),
      orderNumber = orderNumberInput?.value?.trim(),
      email = emailInput?.value?.trim();
    if (!orderNumber || !email) {
      this.isQuerying = !1;
      return;
    }
    const queryBtn = document.getElementById('c-query-btn'),
      originalText = queryBtn.textContent;
    try {
      ((queryBtn.disabled = !0),
        (queryBtn.textContent = 'Querying...'),
        (await this.queryOrder(orderNumber, email)) ? this.updateSubmitButtonState() : ((queryBtn.textContent = originalText), (queryBtn.disabled = !1)));
    } catch {
      ((queryBtn.textContent = originalText), (queryBtn.disabled = !1));
    } finally {
      this.isQuerying = !1;
    }
  }
  async queryOrder(orderNumber, email) {
    try {
      this.showQueryLoadingModal();
      const response = await fetch(`${this.apiBaseUrl}/order/shopline/getSkuShipDate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderNumber, email }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if ((this.hideQueryLoadingModal(), result.success && result.data)) {
        if (
          ((this.orderData = result.data), (this.isOrderQueried = !0), !result.data.data || !Array.isArray(result.data.data) || result.data.data.length === 0)
        )
          return (
            window.__SL_toast__.show({ type: 'info', message: 'the order has been cancelled or does not exist. please check your form' }),
            this.hideWarrantyPlanSelect(),
            this.disableSubmitButton(),
            !1
          );
        const firstSku = result.data.data[0];
        if (!firstSku || !firstSku.shipDate) throw new Error(`Missing shipDate in SKU data: ${JSON.stringify(firstSku)}`);
        const shipDate = new Date(firstSku.shipDate);
        if (isNaN(shipDate.getTime())) throw new Error(`Invalid shipDate format: "${firstSku.shipDate}"`);
        const daysDifference = Math.floor((new Date() - shipDate) / (1e3 * 60 * 60 * 24));
        return daysDifference > 540
          ? (window.__SL_toast__.show({ type: 'info', message: 'This order is not within the purchase range (18 months).' }),
            this.hideWarrantyPlanSelect(),
            this.disableSubmitButton(),
            !1)
          : daysDifference > 60
            ? (this.disableSubmitButton(), this.showTimeoutModal(), !1)
            : (this.showWarrantyPlanSelect(), this.disableSubmitButton(), this.disableQueryButton(), !0);
      } else
        return (
          window.__SL_toast__.show({ type: 'error', message: result.message || 'Order not found or invalid' }),
          this.hideWarrantyPlanSelect(),
          this.disableSubmitButton(),
          !1
        );
    } catch (error) {
      return (
        this.hideQueryLoadingModal(),
        console.error('Query order error:', error),
        window.__SL_toast__.show({ type: 'error', message: 'Failed to verify order. Please try again.' }),
        this.hideWarrantyPlanSelect(),
        this.disableSubmitButton(),
        !1
      );
    }
  }
  showQueryLoadingModal() {
    const modalOverlay = document.getElementById('c-query-loading-modal-overlay');
    modalOverlay && (modalOverlay.classList.add('show'), (document.body.style.overflow = 'hidden'));
  }
  hideQueryLoadingModal() {
    const modalOverlay = document.getElementById('c-query-loading-modal-overlay');
    modalOverlay && (modalOverlay.classList.remove('show'), (document.body.style.overflow = ''));
  }
  showWarrantyPlanSelect() {
    const planRow = document.getElementById('warranty-plan-row');
    planRow && (planRow.style.display = 'block');
  }
  hideWarrantyPlanSelect() {
    const planRow = document.getElementById('warranty-plan-row');
    planRow && (planRow.style.display = 'none');
    const planSelect = document.getElementById('c-yarbocare-plan-select');
    planSelect && (planSelect.value = '');
  }
  disableSubmitButton() {
    const submitBtn = document.getElementById('c-submit-btn');
    submitBtn && ((submitBtn.disabled = !0), (submitBtn.style.opacity = '0.5'), (submitBtn.style.cursor = 'not-allowed'));
  }
  enableSubmitButton() {
    const submitBtn = document.getElementById('c-submit-btn');
    submitBtn && ((submitBtn.disabled = !1), (submitBtn.style.opacity = '1'), (submitBtn.style.cursor = 'pointer'));
  }
  disableQueryButton() {
    const queryBtn = document.getElementById('c-query-btn');
    queryBtn && ((queryBtn.disabled = !0), (queryBtn.style.opacity = '0.5'), (queryBtn.style.cursor = 'not-allowed'));
  }
  enableQueryButton() {
    const queryBtn = document.getElementById('c-query-btn');
    queryBtn && ((queryBtn.disabled = !1), (queryBtn.style.opacity = '1'), (queryBtn.style.cursor = 'pointer'));
  }
  async calculatePrice(plan) {
    if (!this.orderData || !this.orderData.data || !Array.isArray(this.orderData.data)) {
      window.__SL_toast__.show({ type: 'error', message: 'Order data not available' });
      return;
    }
    try {
      const skuList = this.orderData.data.map((item) => item.sku),
        response = await fetch(`${this.apiBaseUrl}/order/quality/calculate-warranty-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: this.orderData.country || 'US', sku_list: skuList, yarbo_care_plan: plan }),
        });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data)
        if (((this.priceData = result.data), result.data.product_list && Array.isArray(result.data.product_list) && result.data.product_list.length > 0)) {
          const firstProduct = result.data.product_list[0];
          ((this.warrantyProductId = firstProduct.warranty_product_id), (this.warrantyVariantId = firstProduct.warranty_variant_id));
        } else window.__SL_toast__.show({ type: 'error', message: 'Invalid price data received' });
      else window.__SL_toast__.show({ type: 'error', message: result.message || 'Failed to calculate price' });
    } catch {
      window.__SL_toast__.show({ type: 'error', message: 'Failed to calculate warranty price. Please try again.' });
    }
  }
  async handleSubmit() {
    if (!this.isOrderQueried) {
      window.__SL_toast__.show({ type: 'info', message: 'Please query your order first' });
      return;
    }
    const planSelect = document.getElementById('c-yarbocare-plan-select'),
      selectedPlan = planSelect?.value;
    if (!selectedPlan) {
      (window.__SL_toast__.show({ type: 'info', message: 'Please select a YarboCare\u2122 plan' }), planSelect?.focus());
      return;
    }
    const submitBtn = document.getElementById('c-submit-btn'),
      originalText = submitBtn.textContent;
    try {
      ((submitBtn.textContent = 'Getting Price...'),
        (submitBtn.disabled = !0),
        await this.calculatePrice(selectedPlan),
        this.priceData && this.warrantyProductId && this.warrantyVariantId
          ? (this.updateModalContent(), this.showPriceModal())
          : window.__SL_toast__.show({ type: 'error', message: 'Unable to get price information. Please try again.' }));
    } catch {
      window.__SL_toast__.show({ type: 'error', message: 'Failed to get warranty price. Please try again.' });
    } finally {
      ((submitBtn.textContent = originalText), this.updateSubmitButtonState());
    }
  }
  updateModalContent() {
    if (!this.priceData || !this.priceData.product_list || !Array.isArray(this.priceData.product_list)) return;
    const products = this.priceData.product_list;
    let totalWarrantyPrice = 0,
      totalProductPrice = 0;
    const productNames = [];
    products.forEach((product) => {
      (product.warranty_price && (totalWarrantyPrice += product.warranty_price),
        product.price && (totalProductPrice += product.price),
        product.name && productNames.push(product.name));
    });
    const modalProductEl = document.getElementById('c-modal-selected-product');
    modalProductEl && (modalProductEl.textContent = productNames.length > 0 ? productNames.join(', ') : 'N/A');
    const modalTotalPriceEl = document.getElementById('c-modal-total-product-price');
    modalTotalPriceEl && (modalTotalPriceEl.textContent = this.formatPrice(totalProductPrice));
    const selectedPlan = document.getElementById('c-yarbocare-plan-select')?.value,
      modalCoveragePeriodEl = document.getElementById('c-modal-coverage-period');
    modalCoveragePeriodEl && (modalCoveragePeriodEl.textContent = this.getPlanPeriod(selectedPlan));
    const modalWarrantyPriceEl = document.getElementById('c-modal-warranty-price');
    modalWarrantyPriceEl && (modalWarrantyPriceEl.textContent = this.formatPrice(totalWarrantyPrice));
  }
  getPlanPeriod(plan) {
    return (
      {
        '1_Year': '3 Years Extended Warranty',
        '3_Years': '1 Year Accidental Damage + 3 Years Extended Warranty',
        '5_Years': '3 Years Accidental Damage + 3 Years Extended Warranty',
      }[plan] || '-'
    );
  }
  formatPrice(amount) {
    return typeof amount != 'number' ? '$0.00' : `$${amount.toFixed(2)}`;
  }
  showPriceModal() {
    const modalOverlay = document.getElementById('c-price-modal-overlay');
    modalOverlay && (modalOverlay.classList.add('show'), (document.body.style.overflow = 'hidden'));
  }
  closePriceModal() {
    const modalOverlay = document.getElementById('c-price-modal-overlay');
    modalOverlay && (modalOverlay.classList.remove('show'), (document.body.style.overflow = ''));
  }
  async handleModalSubmit() {
    const orderNumberInput = document.getElementById('c-order-number'),
      emailInput = document.getElementById('c-email-address');
    if (!this.warrantyProductId || !this.warrantyVariantId) {
      window.__SL_toast__.show({ type: 'error', message: 'Warranty information is missing. Please try again.' });
      return;
    }
    const formData = {
      orderId: orderNumberInput?.value?.trim(),
      email: emailInput?.value?.trim(),
      warrantyProductId: this.warrantyProductId,
      warrantyVariantId: this.warrantyVariantId,
    };
    try {
      const submitBtn = document.getElementById('c-modal-submit-btn');
      submitBtn && ((submitBtn.disabled = !0), (submitBtn.textContent = 'Processing...'));
      const response = await fetch(`${this.apiBaseUrl}/order/quality/history-order-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data && result.data.link) (this.closePriceModal(), this.showSuccessModal(result.data.link));
      else throw new Error(result.message || 'Submission failed');
    } catch (error) {
      window.__SL_toast__.show({ type: 'error', message: `Failed to submit: ${error.message}` });
      const submitBtn = document.getElementById('c-modal-submit-btn');
      submitBtn && ((submitBtn.disabled = !1), (submitBtn.textContent = 'Confirm & Submit'));
    }
  }
  showTimeoutModal() {
    const modalOverlay = document.getElementById('c-timeout-modal-overlay');
    modalOverlay && (modalOverlay.classList.add('show'), (document.body.style.overflow = 'hidden'));
  }
  closeTimeoutModal() {
    const modalOverlay = document.getElementById('c-timeout-modal-overlay');
    modalOverlay && (modalOverlay.classList.remove('show'), (document.body.style.overflow = ''));
  }
  closeSuccessModal() {
    const modalOverlay = document.getElementById('c-success-modal-overlay');
    modalOverlay && (modalOverlay.classList.remove('show'), (document.body.style.overflow = ''));
  }
  showSuccessModal(paymentLink) {
    const modalOverlay = document.getElementById('c-success-modal-overlay');
    if (!modalOverlay) return;
    (modalOverlay.classList.add('show'), (document.body.style.overflow = 'hidden'));
    let countdown = 3;
    const countdownEl = document.getElementById('success-countdown'),
      updateCountdown = () => {
        (countdownEl && (countdownEl.textContent = `Redirecting to payment page in ${countdown} seconds...`),
          countdown--,
          countdown < 0 && (countdownEl && (countdownEl.textContent = 'Redirecting...'), (window.location.href = paymentLink)));
      };
    updateCountdown();
    const timer = setInterval(() => {
      (updateCountdown(), countdown < 0 && clearInterval(timer));
    }, 1e3);
  }
}
document.addEventListener('DOMContentLoaded', function () {
  new CEndWarrantyForm();
});
