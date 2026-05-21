/**
 * Cart Recommendations Web Component
 * Uses Shopify Section Rendering API to fetch server-rendered product cards.
 * Only re-fetches when the first cart product changes.
 */
class CartRecommendations extends HTMLElement {
  constructor() {
    super();
    this.productId = this.dataset.productId;
    this.swiperInstance = null;
    this.loaded = false;
    this.recommendationsUrl = this.dataset.recommendationsUrl;
    this.sectionId = this.dataset.sectionId || 'sa-cart-recommendations';
  }

  connectedCallback() {
    this.loadRecommendations();
    this.observeCartChanges();
  }

  disconnectedCallback() {
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  observeCartChanges() {
    document.addEventListener('cart:updated', (event) => {
      const items = event.detail?.items;
      if (!items || items.length === 0) return;
      const newFirstProductId = String(items[0].product_id);
      if (newFirstProductId !== this.productId) {
        this.productId = newFirstProductId;
        this.dataset.productId = this.productId;
        this.loaded = false;
        this.loadRecommendations();
      }
    });
  }

  getSectionUrl() {
    return `${this.recommendationsUrl}?product_id=${this.productId}&limit=10&section_id=${this.sectionId}`;
  }

  async loadRecommendations() {
    if (this.loaded) return;

    try {
      const response = await fetch(this.getSectionUrl());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const sectionContent = parsed.querySelector('.shopify-section');

      if (!sectionContent || !sectionContent.innerHTML.trim()) {
        this.style.display = 'none';
        return;
      }

      this.innerHTML = sectionContent.innerHTML;
      this.style.display = '';
      this.loaded = true;
      this.classList.add('loaded');
      this.initSwiper();
    } catch (error) {
      console.error('Cart recommendations error:', error);
      this.style.display = 'none';
    }
  }

  initSwiper() {
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
    }

    const swiperEl = this.querySelector('.cart-recs__swiper, .prod-recs__swiper');
    const prevBtn = this.querySelector('.swiper-button-prev');
    const nextBtn = this.querySelector('.swiper-button-next');
    if (!swiperEl || typeof Swiper === 'undefined') return;

    const isProdRecs = swiperEl.classList.contains('prod-recs__swiper');

    this.swiperInstance = new Swiper(swiperEl, {
      observer: true,
      observeParents: true,
      // 核心：开启触控板/鼠标滚轮支持
      mousewheel: true,
      slidesPerView: 1.2,
      spaceBetween: 12,
      breakpoints: {
        768: { slidesPerView: 1.5, spaceBetween: 12 },
      },
      navigation: {
        nextEl: nextBtn,
        prevEl: prevBtn,
      },
    });
  }
}

if (!customElements.get('cart-recommendations')) {
  customElements.define('cart-recommendations', CartRecommendations);
}
