(() => {
  // js/helper/throttle.js
  function throttle(callback, delay3 = 15) {
    let throttleTimeout = null,
      storedEvent = null;
    const throttledEventHandler = (event) => {
      storedEvent = event;
      const shouldHandleEvent = !throttleTimeout;
      if (shouldHandleEvent) {
        callback(storedEvent);
        storedEvent = null;
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          if (storedEvent) {
            throttledEventHandler(storedEvent);
          }
        }, delay3);
      }
    };
    return throttledEventHandler;
  }
  class DesktopNavigation extends HTMLElement {
    constructor() {
      super();
      this.openingTimeout = null;
      this.currentMegaMenu = null;
    }

    connectedCallback() {
      this.addEventListener('mouseenter', this.onMouseEnter.bind(this), true);
      this.addEventListener('click', this.onClick.bind(this), true);

      document.addEventListener('shopify:block:select', (event) => {
        this.openDropdown(event.target.parentElement);
      });

      document.addEventListener('shopify:block:deselect', (event) => {
        this.closeDropdown(event.target.parentElement);
      });
    }

    onMouseEnter(event) {
      const target = event.target.closest('.has-dropdown');
      if (!target || !this.contains(target)) return;
      if (event.relatedTarget !== null && event.target === target) {
        this.openDropdown(target);
      }
    }

    onClick(event) {
      const target = event.target.closest('.header__linklist-link[aria-expanded], .nav-dropdown__link[aria-expanded]');
      if (!target || !this.contains(target)) return;

      // Only apply click to open on touch devices
      if (window.matchMedia('(hover: hover)').matches || target.getAttribute('aria-expanded') === 'true') {
        return;
      }

      event.preventDefault();
      this.openDropdown(target.parentElement);
    }

    openDropdown(parentElement) {
      /* Close search modal if open */
      const searchModal = document.querySelector('yarbo-search-modal');
      if (searchModal && searchModal.isOpen) searchModal.close();

      const menuItem = parentElement.querySelector('[aria-controls]');
      const dropdown = parentElement.querySelector(`#${menuItem.getAttribute('aria-controls')}`);
      this.currentMegaMenu = dropdown.classList.contains('mega-menu') ? dropdown : null;

      let openingTimeout = setTimeout(() => {
        if (menuItem.getAttribute('aria-expanded') === 'true') {
          return;
        }

        menuItem.setAttribute('aria-expanded', 'true');
        dropdown.removeAttribute('hidden');

        if (dropdown.classList.contains('mega-menu') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const items = Array.from(dropdown.querySelectorAll('.mega-menu__column, .mega-menu__image-push'));
          items.forEach((item) => {
            item.getAnimations().forEach((a) => a.cancel());
            item.style.opacity = 0;
          });

          items.forEach((item, index) => {
            item.animate(
              {
                opacity: [0, 1],
                transform: ['translateY(20px)', 'translateY(0)'],
              },
              {
                duration: 250,
                delay: 100 + 60 * index,
                easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
                fill: 'forwards',
              },
            );
          });
        }

        const leaveListener = (event) => {
          if (event.relatedTarget !== null) {
            this.closeDropdown(parentElement);
            parentElement.removeEventListener('mouseleave', leaveListener);
          }
        };

        parentElement.addEventListener('mouseleave', leaveListener);
        this.openingTimeout = null;

        this.dispatchEvent(new CustomEvent('desktop-nav:dropdown:open', { bubbles: true }));
      }, 100);

      parentElement.addEventListener(
        'mouseleave',
        () => {
          if (openingTimeout) {
            clearTimeout(openingTimeout);
          }
        },
        { once: true },
      );

      this.openingTimeout = openingTimeout;
    }

    closeDropdown(parentElement) {
      const menuItem = parentElement.querySelector('[aria-controls]');
      const dropdown = parentElement.querySelector(`#${menuItem.getAttribute('aria-controls')}`);

      requestAnimationFrame(() => {
        dropdown.classList.add('is-closing');
        menuItem.setAttribute('aria-expanded', 'false');

        const delay = dropdown.classList.contains('mega-menu') && this.currentMegaMenu !== dropdown ? 250 : 0;

        setTimeout(() => {
          dropdown.setAttribute('hidden', '');
          dropdown.classList.remove('is-closing');
        }, delay);

        this.dispatchEvent(new CustomEvent('desktop-nav:dropdown:close', { bubbles: true }));
      });
    }
  }

  window.customElements.define('desktop-navigation', DesktopNavigation);
  class StoreHeader extends HTMLElement {
    connectedCallback() {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(this._updateCustomProperties.bind(this));
        this.resizeObserver.observe(this);
        this.resizeObserver.observe(this.querySelector('.header__wrapper'));
      }

      if (this.isTransparent) {
        this.isTransparencyDetectionLocked = false;
        this._isMouseOver = false;

        this.addEventListener('desktop-nav:dropdown:open', () => (this.lockTransparency = true));
        this.addEventListener('desktop-nav:dropdown:close', () => (this.lockTransparency = false));
        this.addEventListener('mouseenter', () => {
          if (!window.matchMedia('(hover: hover)').matches) return;
          this._isMouseOver = true;
          this._checkTransparentHeader();
        });
        this.addEventListener('mouseleave', () => {
          this._isMouseOver = false;
          this._checkTransparentHeader();
        });

        document.documentElement.addEventListener('mobile-nav:open', () => (this.lockTransparency = true));
        document.documentElement.addEventListener('mobile-nav:close', () => (this.lockTransparency = false));

        this._checkTransparentHeader();
        this._onWindowResizeListener = throttle(this._checkTransparentHeader.bind(this), 100);
        window.addEventListener('resize', this._onWindowResizeListener);

        this._onWindowScrollListener = throttle(this._checkTransparentHeader.bind(this), 10);
        window.addEventListener('scroll', this._onWindowScrollListener, { passive: true });
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      if (window.ResizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.isTransparent) {
        window.removeEventListener('resize', this._onWindowResizeListener);
        window.removeEventListener('scroll', this._onWindowScrollListener);
      }
    }
    get isSticky() {
      return this.hasAttribute('sticky');
    }
    get isTransparent() {
      return this.hasAttribute('transparent');
    }
    get transparentHeaderThreshold() {
      return 25;
    }
    // @ts-ignore
    set lockTransparency(value) {
      this.isTransparencyDetectionLocked = value;
      this._checkTransparentHeader();
    }
    // @ts-ignore
    _updateCustomProperties(entries) {
      // @ts-ignore
      entries.forEach((entry) => {
        if (entry.target === this) {
          const height = entry.borderBoxSize
            ? entry.borderBoxSize.length > 0
              ? entry.borderBoxSize[0].blockSize
              : entry.borderBoxSize.blockSize
            : entry.target.clientHeight;
          document.documentElement.style.setProperty('--header-height', `${height}px`);
        }
        if (entry.target.classList.contains('header__wrapper')) {
          const heightWithoutNav = entry.borderBoxSize
            ? entry.borderBoxSize.length > 0
              ? entry.borderBoxSize[0].blockSize
              : entry.borderBoxSize.blockSize
            : entry.target.clientHeight;
          document.documentElement.style.setProperty('--header-height-without-bottom-nav', `${heightWithoutNav}px`);
        }
      });
    }
    // @ts-ignore
    _checkTransparentHeader() {
      if (!this.isTransparent) return;

      if (this.isTransparencyDetectionLocked) {
        this.classList.remove('header--transparent');
        return;
      }

      const searchModal = document.querySelector('yarbo-search-modal');
      const searchOpen = searchModal && searchModal.isOpen;

      const announcementBar = document.querySelector('.announcement-bar-section');
      const announcementBarHeight = announcementBar ? announcementBar.offsetHeight : 0;
      const scrolledPastAnnouncement = window.scrollY > announcementBarHeight;

      if (window.innerWidth < 1000) {
        if (searchOpen || scrolledPastAnnouncement) {
          this.classList.remove('header--transparent');
        } else {
          this.classList.add('header--transparent');
        }
        return;
      }

      if (this.isTransparencyDetectionLocked || this._isMouseOver || searchOpen || scrolledPastAnnouncement) {
        this.classList.remove('header--transparent');
      } else {
        this.classList.add('header--transparent');
      }
    }
  }
  window.customElements.define('store-header', StoreHeader);
})();
