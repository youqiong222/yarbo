const GlobalAudioContext = {
  activeElement: null,
};

const APILoader = {
  yt: { loading: false, callbacks: [] },
  vimeo: { loading: false, callbacks: [] },
  loadYouTube(cb) {
    if (window.YT && window.YT.Player) return cb();
    this.yt.callbacks.push(cb);
    if (!this.yt.loading) {
      this.yt.loading = true;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        this.yt.callbacks.forEach((c) => c());
      };
      document.head.appendChild(script);
    }
  },
  loadVimeo(cb) {
    if (window.Vimeo && window.Vimeo.Player) return cb();
    this.vimeo.callbacks.push(cb);
    if (!this.vimeo.loading) {
      this.vimeo.loading = true;
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.onload = () => {
        this.vimeo.callbacks.forEach((c) => c());
      };
      document.head.appendChild(script);
    }
  },
};

class VideoIntersectionInsert extends HTMLElement {
  constructor() {
    super();
    this._observer = null;
    this._isPlaying = false;
    this._loaded = false;
    this._ready = false;
    this._pendingPlay = false;

    this._provider = this.dataset.provider || 'html5';
    this._videoId = this.dataset.videoId;
    this._muted = this.dataset.muted === 'true';
    this._controls = this.dataset.controls === 'true';
    this._player = null;
    this._isModal = this.dataset.isModal === 'true';
    this._pausedOnLoad = this.dataset.pausedOnLoad === 'true';
  }

  connectedCallback() {
    if (!this._videoId && !this.dataset.src) return;

    this._observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isVisible = entry.isIntersecting;

        if (isVisible && !this._loaded) {
          this.loadMedia();
        }

        if (this._pausedOnLoad) {
          if (!isVisible && this._isPlaying) {
            this.pauseMedia();
          }
        } else {
          if (isVisible && this._loaded && !this._isPlaying) {
            if (this._muted || this._isModal) {
              this.playMedia();
            }
          } else if (!isVisible && this._isPlaying) {
            this.handleViewportExit();
          }
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: [0],
      },
    );

    this._observer.observe(this);
  }

  handleViewportExit() {
    this.pauseMedia();
    if (!this._muted) {
      this.muteMedia();
    }
  }

  loadMedia() {
    this.innerHTML = '';
    this._loaded = true;

    if (this._provider === 'youtube') {
      const container = document.createElement('div');
      container.className = 'w-full h-full';
      if (!this._controls && this._muted) container.style.pointerEvents = 'none';
      this.appendChild(container);
      APILoader.loadYouTube(() => this.initYouTube(container));
    } else if (this._provider === 'vimeo') {
      const container = document.createElement('div');
      container.className = 'w-full h-full';
      if (!this._controls && this._muted) container.style.pointerEvents = 'none';
      this.appendChild(container);
      APILoader.loadVimeo(() => this.initVimeo(container));
    } else {
      this.loadHTML5();
    }
  }

  loadHTML5() {
    if (this.dataset.src) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.dataset.src;
      this._player = tempDiv.querySelector('video');
      this.appendChild(this._player);
    } else {
      this._player = document.createElement('video');
      this._player.src = this._videoId;
      this._player.className = this.dataset.class || '';
      this._player.loop = true;
      this._player.playsInline = true;
      if (this._muted) this._player.muted = true;
      if (this._controls) {
        this._player.controls = true;
      }
      this.appendChild(this._player);
    }

    if (!this._controls) {
      this._player.removeAttribute('controls');
      if (this._muted) {
        this._player.style.pointerEvents = 'none';
      } else {
        this._player.style.cursor = 'pointer';
        this._player.addEventListener('click', () => {
          if (this._isPlaying) {
            this.pauseMedia();
          } else {
            this.playMedia();
          }
        });
      }
    }

    if (this._muted) {
      if (this._player.readyState >= 1) {
        this.playMedia();
      } else {
        this._player.addEventListener(
          'loadedmetadata',
          () => {
            this.playMedia();
          },
          { once: true },
        );
      }
    }

    this._player.addEventListener('play', () => {
      this._isPlaying = true;
    });
    this._player.addEventListener('pause', () => {
      this._isPlaying = false;
    });
  }

  initYouTube(container) {
    const autoplayFlag = this._muted && !this._pausedOnLoad ? 1 : 0;

    // 动态判断：有控制条就给完整原生体验，无控制条则极限精简
    const playerVars = {
      autoplay: autoplayFlag,
      controls: this._controls ? 1 : 0,
      mute: this._muted ? 1 : 0,
      loop: 1,
      playlist: this._videoId,
      playsinline: 1,
      rel: 0,
    };

    if (!this._controls) {
      playerVars.modestbranding = 1;
      playerVars.disablekb = 1;
      playerVars.iv_load_policy = 3;
    }

    this._player = new YT.Player(container, {
      videoId: this._videoId,
      width: '100%', // 强制满宽满高，修复 UI 控制栏被切除的 Bug
      height: '100%',
      playerVars: playerVars,
      events: {
        onReady: () => {
          this._ready = true;
          if (this._pendingPlay) {
            this._pendingPlay = false;
            this.playMedia();
          } else if (!this._pausedOnLoad && (this._muted || this._isModal)) {
            this.playMedia();
          }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            this._isPlaying = true;
          } else if (e.data === YT.PlayerState.PAUSED) {
            this._isPlaying = false;
          }
        },
      },
    });
  }

  initVimeo(container) {
    this._player = new Vimeo.Player(container, {
      id: this._videoId,
      width: '100%',
      height: '100%',
      autoplay: this._muted && !this._pausedOnLoad,
      controls: this._controls,
      muted: this._muted,
      loop: true,
      background: !this._controls && this._muted && !this._pausedOnLoad,
      // 动态判断：只有 controls: true 时才显示原生标题和头像信息
      title: this._controls,
      byline: this._controls,
      portrait: this._controls,
      dnt: true,
    });

    this._player.ready().then(() => {
      this._ready = true;
      if (this._pendingPlay) {
        this._pendingPlay = false;
        this.playMedia();
      } else if (!this._pausedOnLoad && (this._muted || this._isModal)) {
        this.playMedia();
      }
    });

    this._player.on('play', () => {
      this._isPlaying = true;
    });
    this._player.on('pause', () => {
      this._isPlaying = false;
    });
  }

  playMedia() {
    if ((this._provider === 'youtube' || this._provider === 'vimeo') && !this._ready) {
      if (!this._loaded) this.loadMedia();
      this._pendingPlay = true;
      return;
    }

    if (!this._muted) {
      if (GlobalAudioContext.activeElement && GlobalAudioContext.activeElement !== this) {
        GlobalAudioContext.activeElement.muteMedia();
      }
      GlobalAudioContext.activeElement = this;
    }

    if (this._provider === 'html5' && this._player) {
      const playPromise = this._player.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this._isPlaying = true;
            if (!this._muted) this._player.muted = false;
          })
          .catch(() => {
            this._isPlaying = false;
          });
      }
    } else if (this._provider === 'youtube' && this._player?.playVideo) {
      this._player.playVideo();
      if (!this._muted) this._player.unMute();
      this._isPlaying = true;
    } else if (this._provider === 'vimeo' && this._player?.play) {
      this._player.play();
      if (!this._muted) this._player.setVolume(1);
      this._isPlaying = true;
    }
  }

  pauseMedia() {
    if (this._provider === 'html5' && this._player) {
      this._player.pause();
    } else if (this._provider === 'youtube' && this._player?.pauseVideo) {
      this._player.pauseVideo();
    } else if (this._provider === 'vimeo' && this._player?.pause) {
      this._player.pause();
    }
    this._isPlaying = false;
  }

  muteMedia() {
    if (this._provider === 'html5' && this._player) {
      this._player.muted = true;
    } else if (this._provider === 'youtube' && this._player?.mute) {
      this._player.mute();
    } else if (this._provider === 'vimeo' && this._player?.setVolume) {
      this._player.setVolume(0);
    }

    if (GlobalAudioContext.activeElement === this) {
      GlobalAudioContext.activeElement = null;
    }
  }

  resetMedia() {
    if (this._provider === 'html5' && this._player) {
      this._player.currentTime = 0;
    } else if (this._provider === 'youtube' && this._player?.seekTo) {
      this._player.seekTo(0, true);
    } else if (this._provider === 'vimeo' && this._player?.setCurrentTime) {
      this._player.setCurrentTime(0);
    }
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }
}

if (!customElements.get('video-intersection-insert')) {
  customElements.define('video-intersection-insert', VideoIntersectionInsert);
}

class productMediaSwiper extends HTMLElement {
  connectedCallback() {
    this.initSwiper();
  }
  initSwiper() {
    const swiperEl = this.querySelector('.swiper');
    new Swiper(swiperEl, {
      observer: true,
      observeParents: true,
      slidesPerView: 1,
      spaceBetween: 8,
      loop: true,
      loopAdditionalSlides: 3,
      on: {
        slideChange(swiperInstance) {
          const realIndex = swiperInstance.realIndex;
          console.log('Slide changed to index:', realIndex);
        },
      },
      breakpoints: {
        1000: {
          centeredSlides: true,
          spaceBetween: 12,
        },
      },
      pagination: {
        el: this.querySelector('.pagination'),
        clickable: true,
        renderBullet: function (index, className) {
          const bulletClasses = `
              ${className}
              rounded-none
              w-8 h-8 bg-[#CCCCCC] transition-all duration-300 block cursor-pointer
              hover:bg-white
              [&.swiper-pagination-bullet-active]:w-50 [&.swiper-pagination-bullet-active]:h-8 [&.swiper-pagination-bullet-active]:bg-[#FEDB1E]
            `;
          return `<span class="${bulletClasses.trim().replace(/\s+/g, ' ')}"></span>`;
        },
      },
      navigation: {
        nextEl: this.querySelector('.swiper-button-next'),
        prevEl: this.querySelector('.swiper-button-prev'),
      },
    });
  }
}
if (!customElements.get('product-media-swiper')) {
  customElements.define('product-media-swiper', productMediaSwiper);
}

var RecentlyViewedProducts = class extends HTMLElement {
  async connectedCallback() {
    if (this.searchQueryString === '') {
      return;
    }
    const response = await fetch(`/search?type=product&q=${this.searchQueryString}&section_id=${this.sectionId}`);
    const div = document.createElement('div');
    div.innerHTML = await response.text();
    const recentlyViewedProductsElement = div.querySelector('recently-viewed-products');
    if (recentlyViewedProductsElement.hasChildNodes()) {
      this.innerHTML = recentlyViewedProductsElement.innerHTML;
    } else {
      this.innerHTML = '';
    }
  }
  get searchQueryString() {
    const items = JSON.parse(localStorage.getItem('theme:recently-viewed-products') || '[]');
    if (this.hasAttribute('exclude-product-id') && items.includes(parseInt(this.getAttribute('exclude-product-id')))) {
      items.splice(items.indexOf(parseInt(this.getAttribute('exclude-product-id'))), 1);
    }
    return items
      .map((item) => 'id:' + item)
      .slice(0, this.productsCount)
      .join(' OR ');
  }
  get sectionId() {
    return this.getAttribute('section-id');
  }
  get productsCount() {
    return this.getAttribute('products-count') || 4;
  }
};
window.customElements.define('recently-viewed-products', RecentlyViewedProducts);

// 1. 将初始化逻辑封装
const initScrollAnimations = () => {
  const containers = document.querySelectorAll('.js-animate-container');

  const observerOptions = {
    threshold: 0.2,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active', 'group');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  containers.forEach((container) => {
    observer.observe(container);
  });
};

// 2. 正常页面加载时执行
document.addEventListener('DOMContentLoaded', initScrollAnimations);

class ArticleToc extends HTMLElement {
  connectedCallback() {
    const contentSel = this.getAttribute('content-selector') || '.article-template__content';
    const titleSel = this.getAttribute('title-selector') || 'h2';
    const content = document.querySelector(contentSel);
    if (!content) return;

    const headings = Array.from(content.querySelectorAll(titleSel));
    if (headings.length === 0) {
      this.hidden = true;
      return;
    }

    // Shuffle and take up to 6
    const shuffled = headings
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    // Re-sort by DOM order so numbering stays logical
    shuffled.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));

    // Ensure each heading has an id for anchor linking
    shuffled.forEach((h, i) => {
      if (!h.id) {
        h.id =
          'toc-heading-' +
          i +
          '-' +
          h.textContent
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 48);
      }
    });

    const links = shuffled
      .map(
        (h, i) =>
          `<a href="#${h.id}" class="text-[14px] md:text-[15px] hover:opacity-60 transition-opacity">${i + 1} - <span class="underline">${h.textContent.trim()}</span></a>`,
      )
      .join('');

    this.innerHTML = links;
  }
}
customElements.define('article-toc', ArticleToc);

// 3. 关键：针对 Shopify 后台配置模式的修复
// 当用户在后台修改了某个 Section 的设置，该 Section 重新加载后会触发此事件
document.addEventListener('shopify:section:load', (event) => {
  // 我们只需要针对被重新加载的那个 Section 重新运行初始化
  initScrollAnimations();
});

document.addEventListener('alpine:init', () => {
  Alpine.data('tabsComponent', (initialTab) => ({
    activeTab: initialTab,
    sliderWidth: 0,
    sliderOffset: 0,

    updateSlider(tab) {
      if (tab) {
        this.activeTab = tab;
      }

      this.$nextTick(() => {
        const el = this.$refs[this.activeTab];

        if (el) {
          this.sliderWidth = el.offsetWidth;
          this.sliderOffset = el.offsetLeft;

          const container = el.parentElement;
          container.scrollTo({
            left: el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2,
            behavior: 'smooth',
          });
        }
      });
    },

    tabButton(tabName) {
      return {
        ['@click']() {
          this.updateSlider(tabName);
        },
        [':class']() {
          return this.activeTab === tabName ? 'text-[#25282A]' : 'text-[#A6A6A6] hover:text-black';
        },
      };
    },
  }));

  // 接收一个 options 对象，并给个默认空对象防报错
  Alpine.data('swiperTabsComponent', (options = {}) => ({
    // 如果没传 initialTab，默认给 0
    activeTab: `tab_${options.initialTab ?? 0}`,
    sliderWidth: 0,
    sliderOffset: 0,

    init() {
      // 触发传入的 onInit
      if (typeof options.onInit === 'function') {
        options.onInit(this);
      }

      this.$nextTick(() => {
        this.updateSlider(this.activeTab, true);
      });
    },

    updateSlider(tab, syncExternal = true) {
      if (tab) {
        this.activeTab = tab;
      }

      const tabIndex = parseInt(this.activeTab.split('_')[1], 10);

      // 触发传入的 onUpdate
      if (syncExternal && typeof options.onUpdate === 'function') {
        options.onUpdate(this, tabIndex);
      }

      this.$nextTick(() => {
        const el = this.$refs[this.activeTab];

        if (el) {
          this.sliderWidth = el.offsetWidth;
          this.sliderOffset = el.offsetLeft;

          const container = el.parentElement;
          container.scrollTo({
            left: el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2,
            behavior: 'smooth',
          });
        }
      });
    },

    tabButton(tabName) {
      return {
        ['@click']() {
          this.updateSlider(tabName, true);
        },
        [':class']() {
          return this.activeTab === tabName ? 'text-[#25282A]' : 'text-[#A6A6A6] hover:text-black';
        },
      };
    },
  }));
});

// 锚点平滑滚动
function initAnchorScrollLinks() {
  document.querySelectorAll('a[data-anchor-id]').forEach((link) => {
    if (link.dataset.anchorScrollBound === 'true') return;

    link.dataset.anchorScrollBound = 'true';
    link.addEventListener('click', (e) => {
      const targetId = link.dataset.anchorId;
      if (!targetId) return;

      e.preventDefault();

      const target = document.querySelector(`[data-anchor-target-id='${targetId}']`);
      if (!target) return;

      const stickyHeader = document.querySelector('store-header');
      const anchors = document.querySelector('.sa-anchors');
      const headerOffset = stickyHeader ? stickyHeader.offsetHeight : 0;
      const anchorsOffset = anchors ? anchors.offsetHeight : 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - anchorsOffset;
      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initAnchorScrollLinks);
document.addEventListener('shopify:section:load', initAnchorScrollLinks);
