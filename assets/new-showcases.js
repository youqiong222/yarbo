class ShowcasesManager {
  constructor() {
    ((this.isLoading = !1),
      (this.totalItems = 0),
      (this.isMobile = this.checkIsMobile()),
      (this.apiUrl = 'https://yarbo-backend-api.yarbo.ai/backend/v3/ambassador/page'),
      (this.countryApiUrl = 'https://yarbo-backend-api.yarbo.ai/backend/v3/ambassador/country'),
      (this.productsApiUrl = 'https://yarbo-backend-api.yarbo.ai/backend/v3/ambassador/products'),
      (this.currentFilter = 'All Products'),
      (this.productsList = []),
      (this.currentCountry = ''),
      (this.currentState = ''),
      (this.isInContentArea = !1),
      (this.isInMapArea = !1),
      (this.contentMaxScroll = 0),
      (this.scrollWrapper = null),
      (this.gridContainer = null),
      (this.isMobile = window.innerWidth <= 833),
      (this.drawerStates = { COLLAPSED: 'drawer-collapsed', HALF: 'drawer-half', FULLSCREEN: 'drawer-fullscreen' }),
      (this.currentDrawerState = this.drawerStates.HALF),
      (this.isDragging = !1),
      (this.startY = 0),
      (this.startHeight = 0),
      (this.debugMode = !1),
      (this.totalLoaded = 0),
      (this.currentFilter = 'All Products'),
      (this.currentCountry = ''),
      (this.currentState = ''),
      (this.showcasesData = []),
      (this.countriesData = []),
      (this.scrollTimeout = null),
      this.init());
  }
  init() {
    (this.bindEvents(),
      this.loadShowcases(),
      console.log('Constructor: window width:', window.innerWidth, 'isMobile:', this.isMobile),
      this.isMobile
        ? (console.log('Initializing mobile drawer...'),
          this.disableMobileScroll(),
          setTimeout(() => {
            (this.initMobileDrawer(),
              setTimeout(() => {
                this.ensureMobileDrawerState();
              }, 200));
          }, 150))
        : console.log('Desktop mode, skipping mobile drawer initialization'));
  }
  checkIsMobile() {
    return window.innerWidth <= 833;
  }
  disableMobileScroll() {
    this.isMobile &&
      ((document.body.style.overflow = 'hidden'),
      (document.body.style.height = '100vh'),
      (document.documentElement.style.overflow = 'hidden'),
      (document.documentElement.style.height = '100vh'),
      (this.allowedScrollAreas = { mapContainer: null, leftBox: null, headerList: null, headerContainer: null }),
      setTimeout(() => {
        ((this.allowedScrollAreas.mapContainer = document.querySelector('.content-right-box, #mapContainer')),
          (this.allowedScrollAreas.leftBox = document.querySelector('.content-left-box')),
          (this.allowedScrollAreas.headerList = document.querySelector('.new-showcases-search-box-header-list')),
          (this.allowedScrollAreas.headerContainer = document.querySelector('.new-showcases-search-box-header')));
      }, 100),
      (this.globalTouchMoveHandler = (e) => {
        if (this.isDragging) return;
        const target = e.target;
        this.allowedScrollAreas.mapContainer?.contains(target) ||
          this.allowedScrollAreas.leftBox?.contains(target) ||
          this.allowedScrollAreas.headerList?.contains(target) ||
          this.allowedScrollAreas.headerContainer?.contains(target) ||
          e.preventDefault();
      }),
      document.addEventListener('touchmove', this.globalTouchMoveHandler, { passive: !1 }));
  }
  initMobileDrawer() {
    console.log('initMobileDrawer called, window width:', window.innerWidth, 'isMobile:', this.isMobile);
    const leftBox = document.querySelector('.content-left-box'),
      mapContainer = document.querySelector('.map-container');
    if (!leftBox || !mapContainer) {
      console.error('\u672A\u627E\u5230\u5FC5\u8981\u7684DOM\u5143\u7D20', { leftBox: !!leftBox, mapContainer: !!mapContainer });
      return;
    }
    (this.createDrawerElements(leftBox),
      this.bindDrawerEvents(leftBox),
      this.bindMapClickEvent(mapContainer, leftBox),
      this.bindDrawerClickEvent(leftBox),
      this.createMapToggleButton(),
      this.bindContentSwipeGestures(leftBox),
      this.resetDrawerStyles(leftBox),
      this.setDrawerState(this.drawerStates.HALF),
      this.hideFooterOnMobile());
  }
  createDrawerElements(leftBox) {
    if ((console.log('createDrawerElements called, window width:', window.innerWidth), leftBox.querySelector('.drawer-handle'))) {
      console.log('Drawer handle already exists, skipping creation');
      return;
    }
    console.log('Creating drawer elements...');
    const handle = document.createElement('div');
    handle.className = 'drawer-handle';
    const header = document.createElement('div');
    ((header.className = 'drawer-header'), leftBox.insertBefore(handle, leftBox.firstChild), leftBox.insertBefore(header, leftBox.children[1]));
  }
  hideFooterOnMobile() {
    if (!this.isMobile) return;
    (['footer', '.footer', '[role="contentinfo"]', '#footer', '.site-footer', '.main-footer'].forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        ((element.style.display = 'none'),
          (element.style.visibility = 'hidden'),
          (element.style.opacity = '0'),
          (element.style.height = '0'),
          (element.style.overflow = 'hidden'),
          console.log('\u5DF2\u9690\u85CFfooter\u5143\u7D20:', selector, element));
      });
    }),
      console.log('\u79FB\u52A8\u7AEFfooter\u9690\u85CF\u5B8C\u6210'));
  }
  cleanupMobileDrawer() {
    const leftBox = document.querySelector('.content-left-box');
    if (!leftBox) return;
    const handle = leftBox.querySelector('.drawer-handle'),
      header = leftBox.querySelector('.drawer-header');
    (handle && handle.remove(),
      header && header.remove(),
      (leftBox.style.cssText = ''),
      leftBox.classList.remove('drawer-expanded', 'drawer-collapsed', 'drawer-half'),
      (document.body.style.overflow = ''),
      (document.body.style.height = ''));
    const mapContainer = document.querySelector('.content-right-box');
    if (mapContainer) {
      const newMapContainer = mapContainer.cloneNode(!0);
      mapContainer.parentNode.replaceChild(newMapContainer, mapContainer);
    }
  }
  bindMapClickEvent(mapContainer, leftBox) {
    mapContainer.addEventListener('click', (e) => {
      this.currentDrawerState !== this.drawerStates.COLLAPSED && this.handleMapToggleClick();
    });
  }
  bindDrawerClickEvent(leftBox) {
    (leftBox.addEventListener('click', (e) => {
      this.isDragging ||
        e.target.closest('button, a, .showcase-actions') ||
        (this.currentDrawerState === this.drawerStates.COLLAPSED
          ? this.setDrawerState(this.drawerStates.HALF)
          : this.currentDrawerState === this.drawerStates.HALF && this.setDrawerState(this.drawerStates.FULLSCREEN));
    }),
      setTimeout(() => {
        const handle = leftBox.querySelector('.drawer-handle');
        handle &&
          handle.addEventListener('click', (e) => {
            (e.stopPropagation(),
              this.currentDrawerState === this.drawerStates.COLLAPSED
                ? this.setDrawerState(this.drawerStates.HALF)
                : this.currentDrawerState === this.drawerStates.HALF
                  ? this.setDrawerState(this.drawerStates.FULLSCREEN)
                  : this.currentDrawerState === this.drawerStates.FULLSCREEN && this.setDrawerState(this.drawerStates.HALF));
          });
      }, 100));
  }
  createMapToggleButton() {
    if (document.querySelector('.map-toggle-button')) return;
    const toggleButton = document.createElement('div');
    ((toggleButton.className = 'map-toggle-button'),
      (toggleButton.innerHTML = `
    <div class="map-toggle-icon" style="display: flex; align-items: center; gap: 8px; color: white;">
        <span style="color: white; font-size: 14px;">Map</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style="display:block;height:16px;width:16px;fill:white;" aria-hidden="true" role="presentation" focusable="false"><path d="M31.25 3.75a2.29 2.29 0 0 0-1.01-1.44A2.29 2.29 0 0 0 28.5 2L21 3.67l-10-2L2.5 3.56A2.29 2.29 0 0 0 .7 5.8v21.95a2.28 2.28 0 0 0 1.06 1.94A2.29 2.29 0 0 0 3.5 30L11 28.33l10 2 8.49-1.89a2.29 2.29 0 0 0 1.8-2.24V4.25a2.3 2.3 0 0 0-.06-.5zM12.5 25.98l-1.51-.3L9.5 26H9.5V4.66l1.51-.33 1.49.3v21.34zm10 1.36-1.51.33-1.49-.3V6.02l1.51.3L22.5 6h.01v21.34z"></path></svg>
    </div>
`),
      document.body.appendChild(toggleButton),
      (toggleButton.style.display = 'flex !important'),
      (toggleButton.style.visibility = 'visible'),
      (toggleButton.style.opacity = '1'),
      (toggleButton.style.zIndex = '9999'),
      toggleButton.addEventListener('click', () => {
        this.handleMapToggleClick();
      }),
      (window.testMapToggle = {
        show: () => {
          const btn = document.querySelector('.map-toggle-button');
          btn && (btn.style.display = 'flex');
        },
        hide: () => {
          const btn = document.querySelector('.map-toggle-button');
          btn && (btn.style.display = 'none');
        },
        check: () => {
          const btn = document.querySelector('.map-toggle-button');
        },
      }));
  }
  handleMapToggleClick() {
    (console.log('\u5730\u56FE\u5207\u6362\u6309\u94AE\u88AB\u70B9\u51FB\uFF0C\u5F00\u59CB\u91CD\u7F6E\u5185\u5BB9\u548C\u6570\u636E'),
      this.setDrawerState(this.drawerStates.COLLAPSED),
      this.scrollToTop(),
      this.resetContentAndData(),
      setTimeout(() => {
        this.reloadShowcases();
      }, 300));
  }
  scrollToTop() {
    const gridContainer = document.querySelector('.showcases-grid-container');
    gridContainer && (gridContainer.scrollTo({ top: 0, behavior: 'smooth' }), console.log('\u5185\u5BB9\u5DF2\u6EDA\u52A8\u5230\u9876\u90E8'));
  }
  resetContentAndData() {
    ((this.showcasesData = []), (this.totalLoaded = 0));
    const endMessage = document.querySelector('.end-message');
    endMessage && endMessage.remove();
    const errorMessage = document.querySelector('.error-message');
    errorMessage && errorMessage.remove();
    const loadingIndicator = document.querySelector('.loading-indicator');
    (loadingIndicator && loadingIndicator.remove(), console.log('\u5185\u5BB9\u548C\u6570\u636E\u5DF2\u91CD\u7F6E'));
  }
  reloadShowcases() {
    (console.log('\u5F00\u59CB\u91CD\u65B0\u52A0\u8F7D\u5C55\u793A\u6570\u636E'), this.showSkeleton(), this.loadShowcases());
  }
  bindDrawerEvents(leftBox) {
    setTimeout(() => {
      const handle = leftBox.querySelector('.drawer-handle'),
        header = leftBox.querySelector('.drawer-header');
      if (!handle && !header) {
        console.error('\u672A\u627E\u5230\u53EF\u62D6\u62FD\u7684\u5143\u7D20');
        return;
      }
      ([handle, header]
        .filter((el) => el)
        .forEach((element) => {
          element &&
            (element.addEventListener(
              'mousedown',
              (e) => {
                (e.preventDefault(), e.stopPropagation(), this.startDrag(e, leftBox));
              },
              { passive: !1 },
            ),
            element.addEventListener(
              'touchstart',
              (e) => {
                const mapContainer = document.querySelector('.content-right-box, #mapContainer');
                (mapContainer && mapContainer.contains(e.target)) || (e.preventDefault(), e.stopPropagation(), this.startDrag(e, leftBox));
              },
              { passive: !1 },
            ));
        }),
        this.bindGlobalDragEvents(leftBox));
    }, 100);
  }
  bindGlobalDragEvents(leftBox) {
    (this.mouseMoveHandler &&
      (document.removeEventListener('mousemove', this.mouseMoveHandler),
      document.removeEventListener('mouseup', this.mouseUpHandler),
      document.removeEventListener('touchmove', this.touchMoveHandler),
      document.removeEventListener('touchend', this.touchEndHandler)),
      (this.mouseMoveHandler = (e) => {
        this.isDragging &&
          (this.dragThrottleFrame ||
            (this.dragThrottleFrame = requestAnimationFrame(() => {
              (this.onDrag(e, leftBox), (this.dragThrottleFrame = null));
            })));
      }),
      (this.mouseUpHandler = () => {
        this.isDragging && this.endDrag(leftBox);
      }),
      (this.touchMoveHandler = (e) => {
        this.isDragging &&
          (this.dragThrottleFrame ||
            (this.dragThrottleFrame = requestAnimationFrame(() => {
              (this.onDrag(e, leftBox), (this.dragThrottleFrame = null));
            })));
      }),
      (this.touchEndHandler = () => {
        this.isDragging && this.endDrag(leftBox);
      }),
      document.addEventListener('mousemove', this.mouseMoveHandler, { passive: !1 }),
      document.addEventListener('mouseup', this.mouseUpHandler, { passive: !0 }),
      document.addEventListener('touchmove', this.touchMoveHandler, { passive: !1 }),
      document.addEventListener('touchend', this.touchEndHandler, { passive: !0 }),
      document.addEventListener('touchcancel', this.touchEndHandler, { passive: !0 }));
  }
  startDrag(e, leftBox) {
    if (this.isDragging) return;
    const mapContainer = document.querySelector('.content-right-box, #mapContainer');
    (mapContainer && mapContainer.contains(e.target)) ||
      (e.preventDefault(),
      e.stopPropagation(),
      (this.isDragging = !0),
      (this.startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY),
      (this.dragStartTime = Date.now()),
      (this.initialTranslateY = this.getCurrentTranslateY(leftBox)),
      (this.currentTranslateY = this.initialTranslateY),
      leftBox.style.setProperty('transition', 'none', 'important'),
      leftBox.style.setProperty('will-change', 'transform', 'important'),
      (document.body.style.userSelect = 'none'),
      (document.body.style.overflow = 'hidden'),
      (document.documentElement.style.overflow = 'hidden'),
      leftBox.classList.add('dragging'));
  }
  getCurrentTranslateY(leftBox) {
    const windowHeight = window.innerHeight;
    switch (this.currentDrawerState) {
      case this.drawerStates.COLLAPSED:
        return windowHeight - 80;
      case this.drawerStates.HALF:
        return windowHeight * 0.5;
      case this.drawerStates.FULLSCREEN:
        return 80;
      default:
        return windowHeight * 0.5;
    }
  }
  onDrag(e, leftBox) {
    if (!this.isDragging) return;
    e.preventDefault();
    const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY,
      deltaY = currentY - this.startY,
      newTranslateY = Math.max(80, Math.min(window.innerHeight - 80, this.initialTranslateY + deltaY));
    ((this.lastY = currentY),
      (this.currentTranslateY = newTranslateY),
      leftBox && this.isDragging && leftBox.style.setProperty('transform', `translateY(${newTranslateY}px) translate3d(0, 0, 0)`, 'important'));
  }
  endDrag(leftBox) {
    if (!this.isDragging) return;
    const dragDuration = Date.now() - this.dragStartTime;
    ((this.isDragging = !1),
      leftBox.classList.remove('dragging'),
      this.dragAnimationFrame && (cancelAnimationFrame(this.dragAnimationFrame), (this.dragAnimationFrame = null)),
      this.dragThrottleFrame && (cancelAnimationFrame(this.dragThrottleFrame), (this.dragThrottleFrame = null)),
      leftBox.style.setProperty('transition', 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', 'important'),
      leftBox.style.removeProperty('will-change'),
      (document.body.style.userSelect = ''),
      (document.body.style.overflow = 'hidden'),
      (document.documentElement.style.overflow = 'hidden'));
    const currentTranslateY = this.currentTranslateY || window.innerHeight * 0.5,
      windowHeight = window.innerHeight,
      collapsedThreshold = windowHeight - 200,
      halfThreshold = windowHeight * 0.65,
      fullscreenThreshold = windowHeight * 0.35,
      dragDistance = Math.abs(this.lastY - this.startY),
      isQuickDrag = dragDuration < 300 && dragDistance > 50,
      dragDirection = this.lastY > this.startY ? 'down' : 'up';
    let targetState;
    (isQuickDrag
      ? dragDirection === 'up'
        ? this.currentDrawerState === this.drawerStates.COLLAPSED
          ? (targetState = this.drawerStates.HALF)
          : (targetState = this.drawerStates.FULLSCREEN)
        : this.currentDrawerState === this.drawerStates.FULLSCREEN
          ? (targetState = this.drawerStates.HALF)
          : (targetState = this.drawerStates.COLLAPSED)
      : currentTranslateY >= collapsedThreshold
        ? (targetState = this.drawerStates.COLLAPSED)
        : currentTranslateY >= halfThreshold
          ? (targetState = this.drawerStates.HALF)
          : (targetState = this.drawerStates.FULLSCREEN),
      this.setDrawerState(targetState));
  }
  setDrawerState(state) {
    const leftBox = document.querySelector('.content-left-box'),
      mapToggleButton = document.querySelector('.map-toggle-button');
    leftBox &&
      (Object.values(this.drawerStates).forEach((stateClass) => {
        stateClass && leftBox.classList.remove(stateClass);
      }),
      state && leftBox.classList.add(state),
      (this.currentDrawerState = state),
      this.forceDrawerStyle(leftBox, state),
      mapToggleButton
        ? state === this.drawerStates.FULLSCREEN
          ? ((mapToggleButton.style.display = 'flex'), (mapToggleButton.style.visibility = 'visible'), (mapToggleButton.style.opacity = '1'))
          : (mapToggleButton.style.display = 'none')
        : console.warn('\u5730\u56FE\u5207\u6362\u6309\u94AE\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u63A7\u5236\u663E\u793A/\u9690\u85CF'));
  }
  bindInfiniteScroll(leftBox) {}
  bindContentSwipeGestures(leftBox) {
    if (!this.isMobile) return;
    const gridContainer = leftBox.querySelector('.showcases-grid-container');
    if (!gridContainer) {
      console.error('\u672A\u627E\u5230\u62BD\u5C49\u5185\u5BB9\u5BB9\u5668');
      return;
    }
    let startY = 0,
      startTime = 0,
      isSwipeGesture = !1,
      initialScrollTop = 0,
      lastY = 0;
    const handleTouchStart = (e) => {
        if (this.isDragging) return;
        const mapContainer = document.querySelector('.content-right-box, #mapContainer');
        (mapContainer && mapContainer.contains(e.target)) ||
          ((startY = e.touches[0].clientY), (lastY = startY), (startTime = Date.now()), (initialScrollTop = gridContainer.scrollTop), (isSwipeGesture = !1));
      },
      handleTouchMove = (e) => {
        if (this.isDragging || !startY) return;
        const currentY = e.touches[0].clientY,
          deltaY = startY - currentY,
          timeDiff = Date.now() - startTime;
        lastY = currentY;
        let currentScrollTop = 0,
          isAtTop = !1;
        if (Math.abs(deltaY) > 20 && timeDiff < 500) ((currentScrollTop = gridContainer.scrollTop), (isAtTop = currentScrollTop <= 10));
        else return;
        if (deltaY > 25 && timeDiff < 500 && !isSwipeGesture) {
          let shouldTrigger = !1;
          ((this.currentDrawerState === this.drawerStates.COLLAPSED || (this.currentDrawerState === this.drawerStates.HALF && isAtTop)) && (shouldTrigger = !0),
            shouldTrigger &&
              ((isSwipeGesture = !0),
              requestAnimationFrame(() => {
                const targetState = this.currentDrawerState === this.drawerStates.COLLAPSED ? this.drawerStates.HALF : this.drawerStates.FULLSCREEN;
                (this.setDrawerState(targetState),
                  console.log(`\u5411\u4E0A\u6ED1\u52A8\u624B\u52BF\u89E6\u53D1\uFF1A${this.currentDrawerState} -> ${targetState}`));
              }),
              (this.currentDrawerState === this.drawerStates.COLLAPSED || isAtTop) && e.preventDefault()));
        } else if (deltaY < -25 && timeDiff < 500 && !isSwipeGesture) {
          let shouldTrigger = !1;
          (((this.currentDrawerState === this.drawerStates.FULLSCREEN && isAtTop) || (this.currentDrawerState === this.drawerStates.HALF && isAtTop)) &&
            (shouldTrigger = !0),
            shouldTrigger &&
              ((isSwipeGesture = !0),
              requestAnimationFrame(() => {
                const targetState = this.currentDrawerState === this.drawerStates.FULLSCREEN ? this.drawerStates.HALF : this.drawerStates.COLLAPSED;
                (this.setDrawerState(targetState),
                  console.log(`\u5411\u4E0B\u6ED1\u52A8\u624B\u52BF\u89E6\u53D1\uFF1A${this.currentDrawerState} -> ${targetState}`));
              }),
              isAtTop && e.preventDefault()));
        }
      },
      handleTouchEnd = () => {
        setTimeout(() => {
          ((startY = 0), (startTime = 0), (isSwipeGesture = !1), (initialScrollTop = 0), (lastY = 0));
        }, 50);
      };
    (gridContainer.addEventListener('touchstart', handleTouchStart, { passive: !0 }),
      gridContainer.addEventListener('touchmove', handleTouchMove, { passive: !1 }),
      gridContainer.addEventListener('touchend', handleTouchEnd, { passive: !0 }),
      setTimeout(() => {
        const handle = leftBox.querySelector('.drawer-handle');
        handle &&
          (handle.addEventListener('touchstart', handleTouchStart, { passive: !0 }),
          handle.addEventListener('touchmove', handleTouchMove, { passive: !1 }),
          handle.addEventListener('touchend', handleTouchEnd, { passive: !0 }));
      }, 100));
  }
  handleScroll(container) {}
  checkAutoTrigger() {}
  async loadMoreItems() {}
  async fetchAllShowcasesFromAPI() {
    try {
      const apiUrl = this.apiUrl,
        params = { page: 1, limit: 1e4, country: this.currentCountry || '', state: this.currentState || '' };
      this.currentFilter && this.currentFilter !== 'All Products' && (params.product = this.currentFilter);
      const controller = new AbortController(),
        timeoutId = setTimeout(() => {
          (console.warn('API\u8BF7\u6C42\u8D85\u65F6\uFF0C\u6B63\u5728\u4E2D\u65AD\u8BF7\u6C42...'), controller.abort());
        }, 3e4),
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });
      if ((clearTimeout(timeoutId), !response.ok)) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      const result = await response.json();
      return this.normalizeAllApiData(result);
    } catch (error) {
      throw (
        console.error('API\u8BF7\u6C42\u9519\u8BEF:', error),
        error.name === 'AbortError'
          ? (console.warn('API\u8BF7\u6C42\u88AB\u4E2D\u65AD\uFF0C\u53EF\u80FD\u662F\u7F51\u7EDC\u95EE\u9898\u6216\u670D\u52A1\u5668\u54CD\u5E94\u6162'),
            new Error('Request timeout, please check your network connection'))
          : error.message.includes('Failed to fetch')
            ? (console.warn('\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25'), new Error('Network connection failed, please check your network'))
            : error
      );
    }
  }
  async fetchProductsList() {
    try {
      const response = await fetch(this.productsApiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.code === 0 && result.data && Array.isArray(result.data)
        ? ((this.productsList = result.data
            .map((product) => product.trim())
            .filter((product) => product && product.length > 0)
            .filter((product) => !product.includes(')') || product.includes('Trimmer'))),
          this.productsList)
        : (console.error('\u4EA7\u54C1\u5217\u8868API\u8FD4\u56DE\u683C\u5F0F\u9519\u8BEF:', result), []);
    } catch (error) {
      return (
        console.error('\u83B7\u53D6\u4EA7\u54C1\u5217\u8868\u5931\u8D25:', error),
        ['Yarbo Core', 'Blower Module', ' Trimmer)', 'Lawn Mower Pro', 'Yarbo core', 'Lawn Mower Module', 'Snow Blower Module', 'Blower']
      );
    }
  }
  getCurrentFilter() {
    const activeFilter = document.querySelector('.new-showcases-search-box-header-list li.active');
    return activeFilter ? activeFilter.textContent.trim() : 'All Products';
  }
  normalizeAllApiData(apiResponse) {
    let items = [],
      rawItems = [],
      totalCount = 0;
    if (apiResponse.code === 0 && apiResponse.data) {
      const originalItems = apiResponse.data.list || [];
      ((totalCount = apiResponse.data.count || 0), (this.currentFilter = this.getCurrentFilter()));
      const filteredItems = this.filterDataByProduct(originalItems);
      ((rawItems = filteredItems), (items = filteredItems.map((item) => this.transformApiItem(item))));
    } else console.error('API\u54CD\u5E94\u683C\u5F0F\u9519\u8BEF:', apiResponse);
    return { items, rawItems, total: totalCount };
  }
  transformApiItem(apiItem) {
    return {
      id: apiItem.record_id || apiItem.id,
      name: `${apiItem.first_name || ''} ${apiItem.last_name || ''}`.trim() || apiItem.name,
      location: this.formatLocation(apiItem),
      image: this.getItemImage(apiItem),
      profileImage: apiItem.profile_file || null,
      description: apiItem.introduction || apiItem.description || '',
      products: apiItem.products_owned || [],
      yardConditions: apiItem.yard_conditions || [],
      calendarLink: apiItem.google_calendar || null,
      coordinates: apiItem.location || null,
      email: apiItem.email || null,
      phone: apiItem.phone_number || null,
    };
  }
  formatLocation(apiItem) {
    const parts = [];
    return (
      apiItem.city && parts.push(apiItem.city),
      apiItem.state && parts.push(apiItem.state),
      apiItem.country && parts.push(apiItem.country),
      parts.join(', ') || 'Unknown Location'
    );
  }
  getItemImage(apiItem) {
    return apiItem.yarbo_photos && apiItem.yarbo_photos.length > 0
      ? apiItem.yarbo_photos[0]
      : apiItem.profile_file
        ? apiItem.profile_file
        : 'https://via.placeholder.com/300x200?text=No+Image';
  }
  generateMockItems(count) {
    const items = [],
      baseId = this.totalLoaded;
    for (let i = 0; i < count; i++)
      items.push({
        id: baseId + i + 1,
        name: `Product Demo Program ${baseId + i + 1}`,
        location: `Location ${baseId + i + 1}`,
        image: 'https://via.placeholder.com/300x200',
        description: `Description for product demo program ${baseId + i + 1}`,
      });
    return items;
  }
  appendNewItems(items) {
    const gridContainer = document.getElementById('showcasesGrid');
    if (!gridContainer) {
      console.error('\u672A\u627E\u5230showcasesGrid\u5BB9\u5668');
      return;
    }
    items.forEach((item, index) => {
      const itemElement = this.createShowcaseElement(item);
      gridContainer.appendChild(itemElement);
    });
  }
  createShowcaseItem(item) {
    const div = document.createElement('div');
    ((div.className = 'showcase-item'), (div.dataset.itemId = item.id));
    const productsHtml =
        item.products && item.products.length > 0
          ? `<div class="showcase-products">
         ${item.products
           .slice(0, 2)
           .map((product) => `<span class="product-tag">${product}</span>`)
           .join('')}
         ${item.products.length > 2 ? `<span class="product-more">+${item.products.length - 2}</span>` : ''}
       </div>`
          : '',
      avatarHtml = item.profileImage
        ? `<div class="showcase-avatar">
         <img src="${item.profileImage}" alt="${item.name}" loading="lazy">
       </div>`
        : '',
      actionsHtml = `
    <div class="showcase-actions">
        ${item.calendarLink ? `<a href="${item.calendarLink}" target="_blank" class="btn-book">Check Availability & Book Now</a>` : `<button class="btn-contact" onclick="this.contactShowcase('${item.id}')">Contact</button>`}
    </div>
`;
    return (
      (div.innerHTML = `
    <div class="showcase-image">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        ${avatarHtml}
    </div>
    <div class="showcase-info">
        <div class="showcase-header">
            <p class="location">${item.location}</p>
            ${productsHtml}
        </div>
        <h3>${item.name}</h3>
        <p class="description">${this.truncateText(item.description, 100)}</p>
        ${actionsHtml}
    </div>
`),
      div.addEventListener('click', (e) => {
        e.target.closest('.showcase-actions') || this.highlightMapMarker(item.id, item.coordinates);
      }),
      div
    );
  }
  truncateText(text, maxLength) {
    return text ? (text.length > maxLength ? text.substring(0, maxLength) + '...' : text) : '';
  }
  highlightMapMarker(itemId, coordinates) {
    window.googleMapManager && coordinates && window.googleMapManager.highlightMarker(itemId);
  }
  contactShowcase(itemId) {
    console.log('\u8054\u7CFB\u5C55\u793A\u8005:', itemId);
  }
  showLoadingIndicator() {
    const endMessage = document.querySelector('.end-message');
    if ((endMessage && (endMessage.style.display = 'none'), this.isMobile)) {
      this.showMobileContentLoading();
      return;
    }
    let indicator = document.querySelector('.loading-indicator');
    if (!indicator) {
      ((indicator = document.createElement('div')), (indicator.className = 'loading-indicator'));
      const mobileStyles = this.isMobile
        ? `
    position: fixed !important;
    bottom: 80px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: rgba(0, 0, 0, 0.8) !important;
    color: white !important;
    border-radius: 12px !important;
    padding: 16px 24px !important;
    z-index: 9999 !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
    margin: 0 !important;
  `
        : '';
      if (
        ((indicator.style.cssText = `
    display: flex !important;
    justify-content: center;
    align-items: center;
    padding: 20px;
    color: #666;
    font-size: 14px;
    gap: 10px;
    position: relative;
    z-index: 1000;
    ${mobileStyles}
  `),
        (indicator.innerHTML = `
    <div class="loading-spinner" style="
      width: 20px;
      height: 20px;
      border: 2px solid ${this.isMobile ? '#ffffff40' : '#f3f3f3'};
      border-top: 2px solid ${this.isMobile ? '#ffffff' : '#3498db'};
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <span>Loading...</span>
  `),
        !document.querySelector('#loading-spinner-style'))
      ) {
        const style = document.createElement('style');
        ((style.id = 'loading-spinner-style'),
          (style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `),
          document.head.appendChild(style));
      }
      const gridContainer = document.querySelector('.showcases-grid-container');
      gridContainer ? gridContainer.appendChild(indicator) : console.error('\u672A\u627E\u5230.showcases-grid-container\u5BB9\u5668');
    }
    ((indicator.style.display = 'flex !important'),
      (indicator.style.visibility = 'visible'),
      (indicator.style.opacity = '1'),
      this.isMobile &&
        ((indicator.style.position = 'fixed'),
        (indicator.style.bottom = '80px'),
        (indicator.style.left = '50%'),
        (indicator.style.transform = 'translateX(-50%)'),
        (indicator.style.background = 'rgba(0, 0, 0, 0.8)'),
        (indicator.style.color = 'white'),
        (indicator.style.borderRadius = '12px'),
        (indicator.style.padding = '16px 24px'),
        (indicator.style.zIndex = '9999'),
        (indicator.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'),
        (indicator.style.margin = '0')));
  }
  showIOSLoading() {
    document.querySelectorAll('.loading-indicator, .ios-loading').forEach((el) => el.remove());
    const iosLoading = document.createElement('div');
    ((iosLoading.className = 'ios-loading'),
      (iosLoading.innerHTML = `
  <div class="ios-loading-content">
    <div class="ios-spinner"></div>
    <span class="ios-loading-text">Loading...</span>
  </div>
`),
      document.body.appendChild(iosLoading));
    const style = document.createElement('style');
    ((style.id = 'ios-loading-style'),
      (style.textContent = `
  .ios-loading {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.3) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 999999 !important;
    pointer-events: none !important;
  }
  
  .ios-loading-content {
    background: rgba(0, 0, 0, 0.8) !important;
    color: white !important;
    padding: 20px 30px !important;
    border-radius: 12px !important;
    display: flex !important;
    align-items: center !important;
    gap: 15px !important;
    font-size: 16px !important;
    font-weight: 500 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }
  
  .ios-spinner {
    width: 24px !important;
    height: 24px !important;
    border: 3px solid rgba(255, 255, 255, 0.3) !important;
    border-top: 3px solid white !important;
    border-radius: 50% !important;
    animation: ios-spin 1s linear infinite !important;
  }
  
  @keyframes ios-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`),
      document.querySelector('#ios-loading-style') || document.head.appendChild(style));
  }
  showMobileContentLoading() {
    document.querySelectorAll('.mobile-content-loading, .ios-loading, .loading-indicator').forEach((el) => el.remove());
    const gridContainer = document.querySelector('.showcases-grid-container'),
      showcasesGrid = document.querySelector('.showcases-grid, #showcasesGrid');
    if (!gridContainer && !showcasesGrid) {
      (console.error('\u672A\u627E\u5230\u5185\u5BB9\u5BB9\u5668\uFF0C\u4F7F\u7528\u5907\u7528\u65B9\u6848'), this.showFallbackLoading());
      return;
    }
    const loading = document.createElement('div');
    ((loading.className = 'mobile-content-loading'),
      (loading.innerHTML = `
  <div class="mobile-loading-spinner"></div>
  <span class="mobile-loading-text">Loading...</span>
`),
      Object.assign(loading.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '20px',
        margin: '10px 0',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        color: '#666',
        fontSize: '14px',
        fontWeight: '500',
        position: 'relative',
        zIndex: '100',
        width: '100%',
        boxSizing: 'border-box',
      }));
    const spinner = loading.querySelector('.mobile-loading-spinner');
    (Object.assign(spinner.style, {
      width: '20px',
      height: '20px',
      border: '2px solid #f0f0f0',
      borderTop: '2px solid #1890ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }),
      (gridContainer || showcasesGrid).appendChild(loading));
  }
  showFallbackLoading() {
    const loading = document.createElement('div');
    ((loading.className = 'fallback-loading'),
      (loading.textContent = '\u23F3 Loading...'),
      Object.assign(loading.style, {
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '9999',
        textAlign: 'center',
      }),
      document.body.appendChild(loading));
  }
  hideLoadingIndicator() {
    const loadings = document.querySelectorAll('.ios-loading, .simple-mobile-loading, .loading-indicator, .mobile-content-loading, .fallback-loading');
    (loadings.forEach((loading) => {
      loading.remove();
    }),
      loadings.length === 0 && console.log('\u672A\u627E\u5230\u4EFB\u4F55loading\u5143\u7D20'));
  }
  showErrorMessage(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
      ((errorDiv = document.createElement('div')), (errorDiv.className = 'error-message'));
      const gridContainer = document.querySelector('.showcases-grid-container');
      gridContainer && gridContainer.appendChild(errorDiv);
    }
    ((errorDiv.innerHTML = `
    <div class="error-content">
        <span class="error-icon">\u26A0\uFE0F</span>
        <span class="error-text">${message}</span>
        <button class="error-retry" onclick="window.showcasesManager.retryLoadMore()">Retry</button>
    </div>
`),
      (errorDiv.style.display = 'flex'),
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5e3));
  }
  showEndMessage() {
    if (document.querySelector('.end-message')) return;
    const endDiv = document.createElement('div');
    ((endDiv.className = 'end-message'),
      (endDiv.style.cssText = `
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
  border-top: 1px solid #eee;
  margin-top: 20px;
`),
      (endDiv.innerHTML = `
  <div style="text-align: center;">
    <div style="margin-bottom: 8px;">\u{1F4CD}</div>
    <div>All content displayed</div>
  </div>
`));
    const gridContainer = document.querySelector('.showcases-grid-container');
    gridContainer && gridContainer.appendChild(endDiv);
  }
  retryLoadMore() {
    const errorDiv = document.querySelector('.error-message');
    (errorDiv && (errorDiv.style.display = 'none'), (this.isLoadingMore = !1), this.loadMoreItems());
  }
  throttle(func, wait) {
    let timeout;
    return function (...args) {
      const later = () => {
        (clearTimeout(timeout), func(...args));
      };
      (clearTimeout(timeout), (timeout = setTimeout(later, wait)));
    };
  }
  resetDrawerStyles(leftBox) {
    ([
      'height',
      'min-height',
      'max-height',
      'width',
      'min-width',
      'max-width',
      'position',
      'top',
      'bottom',
      'left',
      'right',
      'transition',
      'display',
      'flex',
      'flex-grow',
      'flex-shrink',
      'flex-basis',
      'overflow',
      'overflow-x',
      'overflow-y',
      'z-index',
      'background',
      'border-radius',
      'box-shadow',
      'margin',
      'padding',
    ].forEach((prop) => {
      leftBox.style.removeProperty(prop);
    }),
      Object.entries({
        position: 'fixed',
        bottom: '0',
        left: '0',
        width: '100%',
        height: '100vh',
        background: '#fff',
        'border-radius': '16px 16px 0 0',
        'box-shadow': '0 -4px 20px rgba(0, 0, 0, 0.15)',
        'z-index': '100',
        overflow: 'hidden',
        display: 'block',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transform: 'translateY(50vh) translate3d(0, 0, 0)',
        'will-change': 'transform',
        'backface-visibility': 'hidden',
        contain: 'layout style paint',
      }).forEach(([prop, value]) => {
        leftBox.style.setProperty(prop, value, 'important');
      }),
      setTimeout(() => {
        leftBox.style.removeProperty('will-change');
      }, 1e3));
  }
  forceDrawerStyle(leftBox, state) {
    (leftBox.style.removeProperty('height'),
      leftBox.style.removeProperty('transition'),
      leftBox.offsetHeight,
      requestAnimationFrame(() => {
        switch (state) {
          case this.drawerStates.COLLAPSED:
            leftBox.style.setProperty('transform', 'translateY(calc(100vh - 80px)) translate3d(0, 0, 0)', 'important');
            break;
          case this.drawerStates.HALF:
            leftBox.style.setProperty('transform', 'translateY(50vh) translate3d(0, 0, 0)', 'important');
            break;
          case this.drawerStates.FULLSCREEN:
            leftBox.style.setProperty('transform', 'translateY(80px) translate3d(0, 0, 0)', 'important');
            break;
        }
      }));
  }
  async generateProductFilters() {
    try {
      const products = await this.fetchProductsList(),
        filterList = document.querySelector('.new-showcases-search-box-header-list');
      if (!filterList) {
        console.error('\u672A\u627E\u5230\u7B5B\u9009\u5217\u8868\u5BB9\u5668');
        return;
      }
      filterList.innerHTML = '';
      const allProductsLi = document.createElement('li');
      ((allProductsLi.textContent = 'All Products'),
        allProductsLi.classList.add('active'),
        filterList.appendChild(allProductsLi),
        products.forEach((product) => {
          const li = document.createElement('li');
          ((li.textContent = product), filterList.appendChild(li));
        }),
        this.bindFilterEvents());
    } catch (error) {
      console.error('\u751F\u6210\u4EA7\u54C1\u7B5B\u9009\u5217\u8868\u5931\u8D25:', error);
    }
  }
  bindFilterEvents() {
    document.querySelectorAll('.new-showcases-search-box-header-list li').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.handleFilterChange(item, index);
      });
    });
  }
  bindEvents() {
    (this.generateProductFilters(),
      this.isMobile ? window.addEventListener('scroll', this.handleScroll.bind(this)) : this.enableNativeScroll(),
      window.addEventListener('resize', this.handleResize.bind(this)),
      window.addEventListener('beforeunload', this.cleanup.bind(this)));
  }
  handleResize() {
    const wasMobile = this.isMobile;
    ((this.isMobile = this.checkIsMobile()),
      wasMobile !== this.isMobile && (wasMobile && !this.isMobile && this.cleanupMobileDrawer(), this.resetAndReload(), this.updatePaginationVisibility()));
  }
  handleScroll() {
    if (!this.isMobile) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop,
      windowHeight = window.innerHeight,
      documentHeight = document.documentElement.scrollHeight;
    scrollTop + windowHeight >= documentHeight - 200 && !this.isLoadingMore && this.hasMore && this.loadMoreItems();
  }
  goToPage(page) {}
  handleFilterChange(clickedItem, index) {
    (document.querySelectorAll('.new-showcases-search-box-header-list li').forEach((item) => {
      item.classList.remove('active');
    }),
      clickedItem.classList.add('active'),
      (this.currentFilter = clickedItem.textContent.trim()),
      this.resetAndReload());
  }
  filterDataByProduct(data) {
    return !data || data.length === 0
      ? (console.log('\u8F93\u5165\u6570\u636E\u4E3A\u7A7A\uFF0C\u8FD4\u56DE\u7A7A\u6570\u7EC4'), [])
      : this.currentFilter === 'All Products' || !this.currentFilter
        ? data
        : data.filter((item) =>
            !item.products_owned || !Array.isArray(item.products_owned)
              ? (console.log('\u9879\u76EE\u7F3A\u5C11products_owned\u5B57\u6BB5:', item.first_name || item.record_id), !1)
              : item.products_owned.some((product) => {
                  const productLower = product.toLowerCase(),
                    filterLower = this.currentFilter.toLowerCase();
                  return productLower === filterLower || productLower.includes(filterLower) || filterLower.includes(productLower);
                }),
          );
  }
  updateMapMarkers(data) {
    window.googleMapManager && window.googleMapManager.isMapLoaded
      ? ((this.mapRetryCount = 0),
        window.googleMapManager.clearMarkers(),
        data.forEach((item, index) => {
          item.location && Array.isArray(item.location) && item.location.length >= 2
            ? window.googleMapManager.addShowcaseMarker(item)
            : console.warn(`\u7B2C${index + 1}\u4E2A\u6570\u636E\u7F3A\u5C11\u6709\u6548\u4F4D\u7F6E:`, item);
        }),
        window.googleMapManager.fitMapToMarkers())
      : (console.warn('\u5730\u56FE\u672A\u51C6\u5907\u597D\uFF0C\u5EF6\u8FDF\u6DFB\u52A0\u6807\u8BB0'),
        this.mapRetryCount || (this.mapRetryCount = 0),
        this.mapRetryCount < 3
          ? (this.mapRetryCount++,
            console.log(`\u5730\u56FE\u91CD\u8BD5\u7B2C ${this.mapRetryCount} \u6B21`),
            setTimeout(() => {
              this.updateMapMarkers(data);
            }, 1e3))
          : (console.error('\u5730\u56FE\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u5DF2\u8FBE\u5230\u6700\u5927\u91CD\u8BD5\u6B21\u6570'),
            (this.mapRetryCount = 0)));
  }
  resetAndReload() {
    (this.resetTimeout && clearTimeout(this.resetTimeout),
      (this.resetTimeout = setTimeout(() => {
        this.showcasesData = [];
        const endMessage = document.querySelector('.end-message');
        endMessage && endMessage.remove();
        const errorMessage = document.querySelector('.error-message');
        errorMessage && errorMessage.remove();
        const loadingIndicator = document.querySelector('.loading-indicator');
        (loadingIndicator && (loadingIndicator.style.display = 'none'), this.showSkeleton());
        const gridContainer = document.querySelector('.showcases-grid-container');
        (gridContainer && (gridContainer.scrollTop = 0),
          this.loadShowcases(),
          this.isMobile &&
            setTimeout(() => {
              this.initMobileDrawer();
            }, 200));
      }, 100)));
  }
  async loadShowcases() {
    if (!this.isLoading) {
      this.isLoading = !0;
      try {
        const apiData = await this.fetchAllShowcasesFromAPI();
        if (apiData && apiData.rawItems) {
          ((this.showcasesData = apiData.rawItems), (this.totalItems = apiData.total || apiData.rawItems.length));
          const filteredData = this.filterDataByProduct(this.showcasesData);
          requestAnimationFrame(() => {
            (this.renderShowcases(filteredData),
              setTimeout(() => {
                this.updateMapMarkers(this.showcasesData);
              }, 100),
              this.hidePagination());
          });
        } else throw new Error('No data received from API');
      } catch (error) {
        (console.error('\u52A0\u8F7D\u6570\u636E\u5931\u8D25:', error),
          error.name === 'AbortError'
            ? (console.warn('\u8BF7\u6C42\u88AB\u4E2D\u65AD\uFF0C\u53EF\u80FD\u662F\u7F51\u7EDC\u95EE\u9898\u6216\u670D\u52A1\u5668\u54CD\u5E94\u6162'),
              this.showError('Request timeout, please check your network connection and try again'))
            : error.message.includes('Failed to fetch')
              ? (console.warn('\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25'), this.showError('Network connection failed, please check your network and try again'))
              : error.message.includes('404')
                ? (console.warn('API\u7AEF\u70B9\u4E0D\u5B58\u5728'), this.showError('Service temporarily unavailable, please try again later'))
                : (console.warn('\u672A\u77E5\u9519\u8BEF:', error.message), this.showError('Failed to load data, please try again later')));
      } finally {
        ((this.isLoading = !1), this.hideLoading(), this.hideSkeleton());
      }
    }
  }
  showSkeleton() {
    const grid = document.getElementById('showcasesGrid');
    if (!grid) return;
    const skeletonCount = this.isMobile ? 6 : 9;
    let skeletonHTML = '';
    for (let i = 0; i < skeletonCount; i++)
      skeletonHTML += `
<div class="skeleton-item">
  <div class="skeleton-image">
    <div class="skeleton-avatar"></div>
  </div>
  <div class="skeleton-content">
    <div class="skeleton-location"></div>
    <div class="skeleton-title"></div>
    <div class="skeleton-title-second"></div>
    <div class="skeleton-button"></div>
  </div>
</div>
`;
    ((grid.innerHTML = skeletonHTML), (grid.className = 'skeleton-grid'));
  }
  hideSkeleton() {
    const grid = document.getElementById('showcasesGrid');
    grid && ((grid.className = 'showcases-grid'), grid.classList.remove('initial-loading'));
  }
  showError(message) {
    const grid = document.getElementById('showcasesGrid');
    grid &&
      ((grid.innerHTML = `
<div class="error-state">
  <div class="error-icon">\u26A0\uFE0F</div>
  <h3 class="error-title">Loading Failed</h3>
  <p class="error-message">${message}</p>
  <button class="error-retry-btn" onclick="showcasesManager.resetAndReload()">
    Reload
  </button>
</div>
`),
      (grid.className = 'showcases-grid'));
  }
  async loadCountries() {
    try {
      const response = await fetch(this.countryApiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.data && Array.isArray(result.data)) return ((this.countriesData = result.data), this.countriesData);
    } catch (error) {
      return (console.error('\u52A0\u8F7D\u56FD\u5BB6\u6570\u636E\u5931\u8D25:', error), []);
    }
  }
  renderShowcases(data) {
    const grid = document.getElementById('showcasesGrid');
    if (!grid) {
      console.error('\u672A\u627E\u5230showcasesGrid\u5143\u7D20');
      return;
    }
    ((grid.className = 'showcases-grid'), grid.classList.remove('skeleton-grid', 'initial-loading'));
    const fragment = document.createDocumentFragment();
    if (!data || data.length === 0) {
      const emptyState = document.createElement('div');
      ((emptyState.className = 'error-state'),
        (emptyState.innerHTML = `
<div class="error-icon">\u{1F50D}</div>
<h3 class="error-title">No Showcase Data</h3>
<p class="error-message">No relevant showcases found under current filter conditions, please try other filter conditions</p>
<button class="error-retry-btn" onclick="showcasesManager.handleFilterChange(document.querySelector('.new-showcases-search-box-header-list li'), 0)">
  View All
</button>
`),
        fragment.appendChild(emptyState));
    } else
      data.forEach((item, index) => {
        const showcaseElement = this.createShowcaseElement(item);
        fragment.appendChild(showcaseElement);
      });
    ((grid.innerHTML = ''), grid.appendChild(fragment));
  }
  appendShowcases(data) {
    const grid = document.getElementById('showcasesGrid');
    grid &&
      data.forEach((item) => {
        const showcaseElement = this.createShowcaseElement(item);
        grid.appendChild(showcaseElement);
      });
  }
  createShowcaseElement(item) {
    const div = document.createElement('div');
    ((div.className = 'showcase-item'),
      div.setAttribute('data-showcase-id', item.record_id),
      this.isMobile ||
        (div.addEventListener('mouseenter', () => {
          (this.highlightMapMarker(item.record_id), div.classList.add('showcase-item-hovered'));
        }),
        div.addEventListener('mouseleave', () => {
          (this.unhighlightMapMarker(item.record_id), div.classList.remove('showcase-item-hovered'));
        })));
    const showcaseImage =
        item.yarbo_photos && item.yarbo_photos.length > 0
          ? item.yarbo_photos[0]
          : 'https://launch.yarbo.com/wp-content/uploads/2025/02/default_pic_20250220.webp',
      avatarImage = item.profile_file || 'https://via.placeholder.com/40x40?text=User',
      location = `${item.city}, ${item.state}`,
      title = `${item.first_name}'s Product Demo in ${item.city}, ${item.state}`,
      imageContainer = document.createElement('div');
    imageContainer.className = 'showcase-item-image';
    const imageLink = document.createElement('a'),
      detailUrl = `/pages/product-demo-program-detail?id=${item.record_id}`;
    ((imageLink.href = detailUrl),
      (imageLink.target = '_blank'),
      (imageLink.style.cssText = 'display: block; width: 100%; height: 100%; text-decoration: none;'));
    const mainImg = document.createElement('img');
    ((mainImg.alt = title),
      (mainImg.loading = 'lazy'),
      (mainImg.style.opacity = '0'),
      (mainImg.style.transition = 'opacity 0.3s ease'),
      (mainImg.style.cssText += 'width: 100%; height: 100%; object-fit: cover; display: block;'),
      (mainImg.onload = () => {
        mainImg.style.opacity = '1';
      }),
      (mainImg.onerror = () => {
        ((mainImg.src = 'https://launch.yarbo.com/wp-content/uploads/2025/02/default_pic_20250220.webp'), (mainImg.style.opacity = '1'));
      }),
      (mainImg.src = showcaseImage),
      imageLink.appendChild(mainImg));
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'showcase-item-avatar';
    const avatarImg = document.createElement('img');
    ((avatarImg.src = avatarImage),
      (avatarImg.alt = item.first_name),
      (avatarImg.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;'),
      (avatarImg.onload = () => {
        avatarImg.style.opacity = '1';
      }),
      (avatarImg.onerror = () => {
        ((avatarImg.src = 'https://via.placeholder.com/40x40?text=User'), (avatarImg.style.opacity = '1'));
      }),
      avatarDiv.appendChild(avatarImg),
      imageContainer.appendChild(imageLink),
      imageContainer.appendChild(avatarDiv));
    const contentDiv = document.createElement('div');
    return (
      (contentDiv.className = 'showcase-item-content'),
      (contentDiv.innerHTML = `
        <div class="showcase-item-location">${location}</div>
        <div class="showcase-item-title">${title}</div>
        <p class="showcase-item-button" onclick="showcasesManager.viewShowcase('${item.record_id}')">
        Check Availability & Book Now
        </p>
      `),
      div.appendChild(imageContainer),
      div.appendChild(contentDiv),
      div
    );
  }
  viewShowcase(recordId) {
    window.googleMapManager && window.googleMapManager.isMapLoaded && this.highlightMapMarker(recordId);
    const showcaseData = this.showcasesData.find((item) => item.record_id === recordId);
    window.open(
      'https://forms.zohopublic.com/yarbo/form/ShowcaseCustomerBookingFormWebsiteEmbedded/formperma/P3AY1EqsYaD6Q6ffgqcwKPMXxU8bERRa1G-iynfaR8A',
      '_blank',
    );
  }
  highlightMapMarker(recordId) {
    if (!window.googleMapManager || !window.googleMapManager.markers) return;
    const marker = window.googleMapManager.markers.find((m) => m.showcaseId === recordId);
    marker &&
      (window.googleMapManager.highlightMarker(marker),
      window.googleMapManager.markers.forEach((m) => {
        m.infoWindow && m.infoWindow.close();
      }));
  }
  unhighlightMapMarker(recordId) {
    if (!window.googleMapManager || !window.googleMapManager.markers) return;
    const marker = window.googleMapManager.markers.find((m) => m.showcaseId === recordId);
    marker && (window.googleMapManager.unhighlightMarker(marker), marker.infoWindow && marker.infoWindow.close());
  }
  highlightShowcaseItem(recordId) {
    const showcaseItem = document.querySelector(`[data-showcase-id="${recordId}"]`);
    showcaseItem && this.smoothHighlightWithAnimation(showcaseItem);
  }
  smoothHighlightWithAnimation(showcaseItem) {
    const container = showcaseItem.closest('.showcases-grid-container');
    if (!container) return;
    (this.addSmoothTransitionStyles(),
      this.showTransitionOverlay(container),
      this.checkIfScrollNeeded(showcaseItem)
        ? this.animatedScrollToItem(showcaseItem, () => {
            (showcaseItem.classList.add('showcase-item-hovered'), this.hideTransitionOverlay());
          })
        : setTimeout(() => {
            (showcaseItem.classList.add('showcase-item-hovered'), this.hideTransitionOverlay());
          }, 200));
  }
  checkIfScrollNeeded(showcaseItem) {
    const container = showcaseItem.closest('.showcases-grid-container');
    if (!container) return !1;
    const containerHeight = container.clientHeight,
      containerScrollTop = container.scrollTop,
      itemOffsetTop = showcaseItem.offsetTop,
      itemHeight = showcaseItem.offsetHeight,
      visibleTop = containerScrollTop,
      visibleBottom = containerScrollTop + containerHeight,
      topMargin = 60,
      bottomMargin = 60,
      itemTop = itemOffsetTop,
      itemBottom = itemOffsetTop + itemHeight;
    return itemTop < visibleTop + topMargin || itemBottom > visibleBottom - bottomMargin;
  }
  debouncedScrollToItem(showcaseItem, callback) {
    (this.scrollTimeout && clearTimeout(this.scrollTimeout),
      (this.scrollTimeout = setTimeout(() => {
        this.smoothScrollToItem(showcaseItem, callback);
      }, 50)));
  }
  smoothScrollToItem(showcaseItem, callback) {
    const container = showcaseItem.closest('.showcases-grid-container');
    if (!container) {
      callback && callback();
      return;
    }
    const containerHeight = container.clientHeight,
      containerScrollTop = container.scrollTop,
      containerScrollHeight = container.scrollHeight,
      itemOffsetTop = showcaseItem.offsetTop,
      itemHeight = showcaseItem.offsetHeight,
      visibleTop = containerScrollTop,
      visibleBottom = containerScrollTop + containerHeight,
      topMargin = 60,
      bottomMargin = 60;
    let targetScrollTop = null;
    const itemTop = itemOffsetTop,
      itemBottom = itemOffsetTop + itemHeight;
    if (
      (itemTop < visibleTop + topMargin
        ? (targetScrollTop = Math.max(0, itemTop - topMargin))
        : itemBottom > visibleBottom - bottomMargin && (targetScrollTop = itemBottom - containerHeight + bottomMargin),
      targetScrollTop !== null)
    ) {
      const maxScrollTop = Math.max(0, containerScrollHeight - containerHeight);
      ((targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))),
        Math.abs(targetScrollTop - containerScrollTop) > 10
          ? (container.scrollTo({ top: targetScrollTop, behavior: 'smooth' }), this.waitForScrollComplete(container, targetScrollTop, callback))
          : callback && callback());
    } else callback && callback();
  }
  waitForScrollComplete(container, targetScrollTop, callback) {
    let checkCount = 0;
    const maxChecks = 50,
      checkScroll = () => {
        checkCount++;
        const currentScrollTop = container.scrollTop;
        Math.abs(currentScrollTop - targetScrollTop) < 5 || checkCount >= maxChecks ? callback && callback() : setTimeout(checkScroll, 50);
      };
    setTimeout(checkScroll, 100);
  }
  showTransitionOverlay(container) {
    if (container.querySelector('.transition-overlay')) return;
    const overlay = document.createElement('div');
    ((overlay.className = 'transition-overlay'),
      (overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.8) 0%, 
              rgba(248, 250, 252, 0.9) 50%, 
              rgba(255, 255, 255, 0.8) 100%);
          z-index: 999;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
          backdrop-filter: blur(1px);
          pointer-events: none;
      `),
      (container.style.position = 'relative'),
      container.appendChild(overlay),
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      }));
  }
  hideTransitionOverlay() {
    const overlay = document.querySelector('.transition-overlay');
    overlay &&
      ((overlay.style.opacity = '0'),
      setTimeout(() => {
        overlay.parentNode && overlay.parentNode.removeChild(overlay);
      }, 200));
  }
  animatedScrollToItem(showcaseItem, callback) {
    const container = showcaseItem.closest('.showcases-grid-container');
    if (!container) {
      callback && callback();
      return;
    }
    const containerHeight = container.clientHeight,
      containerScrollTop = container.scrollTop,
      itemOffsetTop = showcaseItem.offsetTop,
      itemHeight = showcaseItem.offsetHeight,
      targetScrollTop = Math.max(0, itemOffsetTop - containerHeight / 2 + itemHeight / 2);
    (container.scrollTo({ top: targetScrollTop, behavior: 'smooth' }), this.waitForScrollComplete(container, targetScrollTop, callback));
  }
  addSmoothTransitionStyles() {
    if (document.getElementById('smooth-transition-styles')) return;
    const style = document.createElement('style');
    ((style.id = 'smooth-transition-styles'),
      (style.textContent = `
          .showcases-grid-container {
              scroll-behavior: smooth;
          }
          
          .showcase-item {
              transition: all 0.3s ease-in-out;
          }
          
          .showcase-item-hovered {
              transform: scale(1.02);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
              border-color: #007bff;
          }
          
          .transition-overlay {
              animation: shimmer 1.5s ease-in-out infinite;
          }
          
          @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: calc(200px + 100%) 0; }
          }
      `),
      document.head.appendChild(style));
  }
  showScrollSkeleton() {
    const container = document.querySelector('.showcases-grid-container');
    if (!container || container.querySelector('.scroll-skeleton-overlay')) return;
    this.addScrollSkeletonStyles();
    const overlay = document.createElement('div');
    ((overlay.className = 'scroll-skeleton-overlay'),
      (overlay.innerHTML = `
          <div class="scroll-skeleton-content">
              <div class="scroll-skeleton-item">
                  <div class="scroll-skeleton-image"></div>
                  <div class="scroll-skeleton-text">
                      <div class="scroll-skeleton-line"></div>
                      <div class="scroll-skeleton-line short"></div>
                  </div>
              </div>
              <div class="scroll-skeleton-item">
                  <div class="scroll-skeleton-image"></div>
                  <div class="scroll-skeleton-text">
                      <div class="scroll-skeleton-line"></div>
                      <div class="scroll-skeleton-line short"></div>
                  </div>
              </div>
              <div class="scroll-skeleton-item">
                  <div class="scroll-skeleton-image"></div>
                  <div class="scroll-skeleton-text">
                      <div class="scroll-skeleton-line"></div>
                      <div class="scroll-skeleton-line short"></div>
                  </div>
              </div>
          </div>
      `),
      (overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
          opacity: 1;
      `),
      (container.style.position = 'relative'),
      container.appendChild(overlay),
      overlay.offsetHeight);
  }
  hideScrollSkeleton() {
    const overlay = document.querySelector('.scroll-skeleton-overlay');
    overlay &&
      ((overlay.style.opacity = '0'),
      setTimeout(() => {
        overlay.parentNode && overlay.parentNode.removeChild(overlay);
      }, 200));
  }
  addScrollSkeletonStyles() {
    if (document.querySelector('#scroll-skeleton-styles')) return;
    const style = document.createElement('style');
    ((style.id = 'scroll-skeleton-styles'),
      (style.textContent = `
          .scroll-skeleton-content {
              display: flex;
              flex-direction: column;
              gap: 16px;
              padding: 20px;
          }
          
          .scroll-skeleton-item {
              display: flex;
              gap: 12px;
              align-items: center;
          }
          
          .scroll-skeleton-image {
              width: 60px;
              height: 60px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 8px;
          }
          
          .scroll-skeleton-text {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 8px;
          }
          
          .scroll-skeleton-line {
              height: 12px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 6px;
          }
          
          .scroll-skeleton-line.short {
              width: 60%;
          }
          
          @keyframes skeleton-loading {
              0% {
                  background-position: 200% 0;
              }
              100% {
                  background-position: -200% 0;
              }
          }
          
          .scroll-skeleton-overlay {
              transition: opacity 0.2s ease;
          }
      `),
      document.head.appendChild(style));
  }
  unhighlightShowcaseItem(recordId) {
    const showcaseItem = document.querySelector(`[data-showcase-id="${recordId}"]`);
    (showcaseItem && showcaseItem.classList.remove('showcase-item-hovered'), this.hideScrollSkeleton(), this.hideTransitionOverlay());
  }
  showLoading() {
    const loading = document.getElementById('loading');
    loading && (loading.style.display = 'block');
  }
  hideLoading() {
    const loading = document.getElementById('loading');
    loading && (loading.style.display = 'none');
  }
  hidePagination() {
    const pagination = document.getElementById('pagination');
    pagination && (pagination.style.display = 'none');
  }
  createPageButton(pageNumber) {
    const button = document.createElement('button');
    return (
      (button.className = `pagination-btn pagination-page ${pageNumber === this.currentPage ? 'active' : ''}`),
      (button.textContent = pageNumber),
      (button.onclick = () => this.goToPage(pageNumber)),
      button
    );
  }
  updatePaginationVisibility() {
    this.hidePagination();
  }
  enableNativeScroll() {
    const gridContainer = document.querySelector('.showcases-grid-container');
    if (gridContainer) {
      ((gridContainer.style.overflow = 'auto'),
        (gridContainer.style.height = '100%'),
        (gridContainer.style.scrollbarWidth = 'none'),
        (gridContainer.style.msOverflowStyle = 'none'));
      const style = document.createElement('style');
      ((style.textContent = `
.showcases-grid-container::-webkit-scrollbar {
  display: none;
}
`),
        document.head.appendChild(style));
    }
  }
  updateContentScrollInfo() {}
  enableDebug() {
    ((this.debugMode = !0), console.log('\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u542F\u7528'));
  }
  disableDebug() {
    ((this.debugMode = !1), console.log('\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u7981\u7528'));
  }
  getDebugInfo() {
    return {
      isInContentArea: this.isInContentArea,
      isInMapArea: this.isInMapArea,
      nativeScrollTop: this.gridContainer ? this.gridContainer.scrollTop : 0,
      hasGridContainer: !!this.gridContainer,
      isDragging: this.isDragging,
      currentDrawerState: this.currentDrawerState,
      hasGlobalTouchHandler: !!this.globalTouchMoveHandler,
      hasDragHandlers: !!this.mouseMoveHandler,
      activeAnimationFrames: { dragAnimation: !!this.dragAnimationFrame, dragThrottle: !!this.dragThrottleFrame },
    };
  }
  startPerformanceMonitor() {
    this.debugMode &&
      ((this.performanceStats = { touchMoveCount: 0, dragCount: 0, lastTouchTime: 0, averageInterval: 0 }),
      console.log('\u6027\u80FD\u76D1\u63A7\u5DF2\u542F\u52A8'));
  }
  logPerformanceStats() {
    !this.debugMode || !this.performanceStats || console.log('\u6027\u80FD\u7EDF\u8BA1:', this.performanceStats);
  }
  resetScrollState() {
    const gridContainer = document.querySelector('.showcases-grid-container');
    gridContainer && (gridContainer.scrollTop = 0);
  }
  ensureMobileDrawerState() {
    if (!this.isMobile) return;
    const leftBox = document.querySelector('.content-left-box');
    if (!leftBox) {
      (console.warn('\u672A\u627E\u5230\u62BD\u5C49\u5BB9\u5668\uFF0C\u91CD\u65B0\u521D\u59CB\u5316'), setTimeout(() => this.initMobileDrawer(), 100));
      return;
    }
    (leftBox.querySelector('.drawer-handle') ||
      (console.warn('\u672A\u627E\u5230\u62BD\u5C49\u624B\u67C4\uFF0C\u91CD\u65B0\u521B\u5EFA'),
      this.createDrawerElements(leftBox),
      this.bindDrawerEvents(leftBox)),
      this.resetDrawerStyles(leftBox),
      this.setDrawerState(this.drawerStates.HALF),
      console.log('\u79FB\u52A8\u7AEF\u62BD\u5C49\u72B6\u6001\u5DF2\u786E\u4FDD\u6B63\u786E'));
  }
  cleanup() {
    (this.resetTimeout && clearTimeout(this.resetTimeout),
      this.globalTouchMoveHandler && (document.removeEventListener('touchmove', this.globalTouchMoveHandler), (this.globalTouchMoveHandler = null)),
      this.mouseMoveHandler &&
        (document.removeEventListener('mousemove', this.mouseMoveHandler),
        document.removeEventListener('mouseup', this.mouseUpHandler),
        document.removeEventListener('touchmove', this.touchMoveHandler),
        document.removeEventListener('touchend', this.touchEndHandler),
        document.removeEventListener('touchcancel', this.touchEndHandler)),
      this.dragAnimationFrame && (cancelAnimationFrame(this.dragAnimationFrame), (this.dragAnimationFrame = null)),
      this.dragThrottleFrame && (cancelAnimationFrame(this.dragThrottleFrame), (this.dragThrottleFrame = null)),
      (this.allowedScrollAreas = null),
      (this.scrollWrapper = null),
      (this.gridContainer = null));
  }
}
(window.addEventListener('error', function (event) {
  const message = event.message || '',
    filename = event.filename || '';
  if (
    message.includes('version') ||
    message.includes('video.js') ||
    message.includes('Script error') ||
    filename.includes('extension') ||
    filename.includes('chrome-extension') ||
    filename.includes('moz-extension')
  )
    return (console.warn('\u5DF2\u8FC7\u6EE4\u7B2C\u4E09\u65B9\u9519\u8BEF:', message), event.preventDefault(), !1);
}),
  document.addEventListener('DOMContentLoaded', function () {
    try {
      ((window.showcasesManager = new ShowcasesManager()),
        (window.googleMapManager = new GoogleMapManager()),
        window.showcasesManager.init(),
        window.googleMapManager.init(),
        window.innerWidth <= 833 &&
          setTimeout(() => {
            window.showcasesManager && window.showcasesManager.isMobile && window.showcasesManager.ensureMobileDrawerState();
          }, 300));
    } catch (error) {
      console.error('\u9875\u9762\u521D\u59CB\u5316\u5931\u8D25:', error);
      const errorDiv = document.createElement('div');
      ((errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `),
        (errorDiv.innerHTML = `
        <strong>Page Loading Failed</strong><br>
        ${error.message}<br>
        <button onclick="location.reload()" style="margin-top:10px;padding:5px 10px;background:white;color:#ff4444;border:none;border-radius:3px;cursor:pointer;">Reload</button>
      `),
        document.body.appendChild(errorDiv));
    }
  }));
//# sourceMappingURL=/s/files/1/0604/5394/5441/files/new-showcases.js.map
