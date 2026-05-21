class GoogleMapManager {
  constructor() {
    ((this.map = null),
      (this.markers = []),
      (this.markerClusterer = null),
      (this.apiKey = 'AIzaSyBhdLQnlnMzIXNiA6SDTeD7El3rAdsdgF0'),
      (this.isMapLoaded = !1),
      (this.mapContainer = null),
      (this.defaultCenter = { lat: 39.8283, lng: -98.5795 }),
      (this.iconCache = { normal: null, highlighted: null }),
      this.init());
  }
  init() {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY') {
      (console.error('Google Maps API Key not set or invalid'), this.showMapError('Google Maps API Key configuration error'));
      return;
    }
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', () => {
          this.initAfterDOM();
        })
      : this.initAfterDOM();
  }
  initAfterDOM() {
    if (((this.mapContainer = document.getElementById('mapContainer')), !this.mapContainer)) {
      console.error('Map container not found, ID: mapContainer');
      const allContainers = document.querySelectorAll('[id*="map"], [class*="map"]');
      return;
    }
    (this.showMapLoading(), this.loadGoogleMapsAPI());
  }
  showMapLoading() {
    this.mapContainer &&
      (this.mapContainer.innerHTML = `
    <div class="map-loading">
      <div class="map-loading-spinner"></div>
      <p>Loading map...</p>
    </div>
  `);
  }
  loadGoogleMapsAPI() {
    if (
      (window.L && console.warn('\u68C0\u6D4B\u5230 Leaflet \u5730\u56FE\u5E93\uFF0C\u53EF\u80FD\u5B58\u5728\u51B2\u7A81'), window.google && window.google.maps)
    ) {
      this.loadMarkerClustererLibrary();
      return;
    }
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      (existingScript.addEventListener('load', () => {
        this.loadMarkerClustererLibrary();
      }),
        existingScript.addEventListener('error', () => {
          (console.error('\u73B0\u6709\u7684Google Maps\u811A\u672C\u52A0\u8F7D\u5931\u8D25'), this.showMapError());
        }));
      return;
    }
    const callbackName = 'initGoogleMap_' + Date.now(),
      self = this;
    window[callbackName] = function () {
      (self.loadMarkerClustererLibrary(), delete window[callbackName]);
    };
    const script = document.createElement('script');
    ((script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=${callbackName}`),
      (script.async = !0),
      (script.defer = !0),
      (script.id = 'google-maps-api'),
      (script.onerror = (error) => {
        (this.showMapError('Map loading failed, please check your network connection or try again later'), delete window[callbackName]);
      }),
      document.head.appendChild(script));
  }
  loadMarkerClustererLibrary() {
    if (window.MarkerClusterer) {
      this.initializeMap();
      return;
    }
    const script = document.createElement('script');
    ((script.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js'),
      (script.onload = () => {
        (console.log('MarkerClusterer\u5E93\u52A0\u8F7D\u6210\u529F'), this.initializeMap());
      }),
      (script.onerror = () => {
        console.warn('MarkerClusterer\u5E93\u52A0\u8F7D\u5931\u8D25\uFF0C\u5C1D\u8BD5\u5907\u7528CDN');
        const backupScript = document.createElement('script');
        ((backupScript.src = 'https://cdn.jsdelivr.net/npm/@googlemaps/markerclusterer@2.5.3/dist/index.min.js'),
          (backupScript.onload = () => {
            (console.log('\u5907\u7528MarkerClusterer\u5E93\u52A0\u8F7D\u6210\u529F'), this.initializeMap());
          }),
          (backupScript.onerror = () => {
            (console.warn('\u6240\u6709MarkerClusterer\u5E93\u52A0\u8F7D\u5931\u8D25\uFF0C\u5C06\u4E0D\u4F7F\u7528\u805A\u5408\u529F\u80FD'),
              this.initializeMap());
          }),
          document.head.appendChild(backupScript));
      }),
      document.head.appendChild(script));
  }
  initializeMap() {
    if (!this.mapContainer) {
      this.showMapError();
      return;
    }
    if (!window.google || !window.google.maps) {
      this.showMapError();
      return;
    }
    try {
      this.mapContainer.innerHTML = '';
      const isMobile = window.innerWidth <= 833;
      ((this.map = new google.maps.Map(this.mapContainer, {
        zoom: 4,
        center: this.defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [],
        mapTypeControl: !isMobile,
        streetViewControl: !isMobile,
        fullscreenControl: !isMobile,
        zoomControl: !isMobile,
        gestureHandling: 'greedy',
        scrollwheel: !isMobile,
        disableDoubleClickZoom: isMobile,
        draggable: !0,
        restriction: isMobile ? { latLngBounds: { north: 85, south: -85, west: -180, east: 180 }, strictBounds: !1 } : null,
      })),
        (this.isMapLoaded = !0),
        this.createIconCache(),
        this.initializeMarkerClusterer(),
        this.preventMapScrollBubbling(),
        this.map.addListener('click', () => {
          (this.markers.forEach((marker) => {
            marker.infoWindow && marker.infoWindow.close();
          }),
            window.innerWidth <= 768 && this.hideMobileInfoWindow());
        }),
        window.showcasesManager &&
          window.showcasesManager.showcasesData.length > 0 &&
          setTimeout(() => {
            window.showcasesManager.updateMapMarkers(window.showcasesManager.showcasesData);
          }, 100));
    } catch (error) {
      ((this.isMapLoaded = !1), this.showMapError('Map initialization failed: ' + error.message));
    }
  }
  fitMapToMarkers() {
    if (!this.map) return;
    if (this.markers.length === 0) {
      (this.map.setCenter(this.defaultCenter), this.map.setZoom(4));
      return;
    }
    if (this.markers.length === 1) {
      (this.map.setCenter(this.markers[0].getPosition()), this.map.setZoom(10));
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    (this.markers.forEach((marker) => {
      bounds.extend(marker.getPosition());
    }),
      this.map.fitBounds(bounds));
    const listener = google.maps.event.addListener(this.map, 'idle', () => {
      const zoom = this.map.getZoom();
      (zoom > 15 ? this.map.setZoom(15) : zoom < 3 && this.map.setZoom(3), google.maps.event.removeListener(listener));
    });
    this.addMarkersToClusterer();
  }
  addMarkersToClusterer() {
    if (!(!this.markerClusterer || this.markers.length === 0))
      try {
        this.markerClusterer.addMarkers
          ? (this.markerClusterer.addMarkers(this.markers),
            console.log(`\u6279\u91CF\u6DFB\u52A0 ${this.markers.length} \u4E2A\u6807\u8BB0\u5230\u65B0\u7248\u672C\u805A\u5408\u5668`))
          : this.markerClusterer.addMarker
            ? (this.markers.forEach((marker) => {
                this.markerClusterer.addMarker(marker);
              }),
              console.log(`\u6279\u91CF\u6DFB\u52A0 ${this.markers.length} \u4E2A\u6807\u8BB0\u5230\u65E7\u7248\u672C\u805A\u5408\u5668`))
            : this.markerClusterer.markers !== void 0 &&
              ((this.markerClusterer.markers = [...this.markers]),
              this.markerClusterer.repaint && this.markerClusterer.repaint(),
              console.log(`\u76F4\u63A5\u8BBE\u7F6E ${this.markers.length} \u4E2A\u6807\u8BB0\u5230\u805A\u5408\u5668`));
      } catch (error) {
        console.error('\u6279\u91CF\u6DFB\u52A0\u6807\u8BB0\u5230\u805A\u5408\u5668\u5931\u8D25:', error);
      }
  }
  showMapError(customMessage = 'Please check your network connection or try again later') {
    this.mapContainer &&
      (this.mapContainer.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
      padding: 20px;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">\u{1F5FA}\uFE0F</div>
      <h3 style="margin: 0 0 8px 0; color: #333;">Map Loading Failed</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px;">${customMessage}</p>
      <button onclick="window.forceInitMap && window.forceInitMap()" style="
        margin-top: 8px;
        padding: 8px 16px;
        background: #FF385C;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Reload Map</button>
    </div>
  `);
  }
  createIconCache() {
    ((this.iconCache.normal = {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#FF385C" stroke="#fff" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="#fff"/>
                </svg>
            `),
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12),
    }),
      (this.iconCache.highlighted = {
        url:
          'data:image/svg+xml;charset=UTF-8,' +
          encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#FF385C" stroke="#fff" stroke-width="3"/>
                    <circle cx="16" cy="16" r="6" fill="#fff"/>
                    <circle cx="16" cy="16" r="3" fill="#FF385C"/>
                </svg>
            `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      }));
  }
  initializeMarkerClusterer() {
    if (window.markerClusterer && window.markerClusterer.MarkerClusterer)
      try {
        ((this.markerClusterer = new window.markerClusterer.MarkerClusterer({ map: this.map, markers: [] })),
          console.log('\u65B0\u7248\u672C\u6807\u8BB0\u805A\u5408\u5668\u521D\u59CB\u5316\u6210\u529F'));
        return;
      } catch (error) {
        console.warn('\u65B0\u7248\u672CMarkerClusterer\u521D\u59CB\u5316\u5931\u8D25:', error);
      }
    if (window.MarkerClusterer)
      try {
        ((this.markerClusterer = new window.MarkerClusterer(this.map, [], {
          styles: this.getClusterStyles(),
          maxZoom: 15,
          gridSize: 60,
          minimumClusterSize: 2,
        })),
          console.log('\u7ECF\u5178\u7248\u672C\u6807\u8BB0\u805A\u5408\u5668\u521D\u59CB\u5316\u6210\u529F'));
        return;
      } catch (error) {
        console.warn('\u7ECF\u5178\u7248\u672CMarkerClusterer\u521D\u59CB\u5316\u5931\u8D25:', error);
      }
    (console.warn('MarkerClusterer\u5E93\u672A\u52A0\u8F7D\u6216\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u5C06\u4E0D\u4F7F\u7528\u805A\u5408\u529F\u80FD'),
      (this.markerClusterer = null));
  }
  getClusterColor(count) {
    return count < 10 ? '#FF6B6B' : count < 25 ? '#4ECDC4' : count < 50 ? '#45B7D1' : '#96CEB4';
  }
  getClusterStyles() {
    return [
      {
        textColor: 'white',
        textSize: 12,
        url:
          'data:image/svg+xml;base64,' +
          btoa(`
                <svg fill="#FF6B6B" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="#FF6B6B" stroke="#fff" stroke-width="3"/>
                    <circle cx="50" cy="50" r="30" fill="#FF6B6B" opacity="0.7"/>
                    <circle cx="50" cy="50" r="20" fill="#FF6B6B" opacity="0.5"/>
                </svg>
            `),
        height: 50,
        width: 50,
        anchorText: [0, 0],
        anchorIcon: [25, 25],
      },
      {
        textColor: 'white',
        textSize: 13,
        url:
          'data:image/svg+xml;base64,' +
          btoa(`
                <svg fill="#4ECDC4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="#4ECDC4" stroke="#fff" stroke-width="3"/>
                    <circle cx="50" cy="50" r="32" fill="#4ECDC4" opacity="0.7"/>
                    <circle cx="50" cy="50" r="22" fill="#4ECDC4" opacity="0.5"/>
                </svg>
            `),
        height: 55,
        width: 55,
        anchorText: [0, 0],
        anchorIcon: [27, 27],
      },
      {
        textColor: 'white',
        textSize: 14,
        url:
          'data:image/svg+xml;base64,' +
          btoa(`
                <svg fill="#45B7D1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="#45B7D1" stroke="#fff" stroke-width="3"/>
                    <circle cx="50" cy="50" r="35" fill="#45B7D1" opacity="0.7"/>
                    <circle cx="50" cy="50" r="25" fill="#45B7D1" opacity="0.5"/>
                </svg>
            `),
        height: 60,
        width: 60,
        anchorText: [0, 0],
        anchorIcon: [30, 30],
      },
      {
        textColor: 'white',
        textSize: 15,
        url:
          'data:image/svg+xml;base64,' +
          btoa(`
                <svg fill="#96CEB4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#96CEB4" stroke="#fff" stroke-width="3"/>
                    <circle cx="50" cy="50" r="37" fill="#96CEB4" opacity="0.7"/>
                    <circle cx="50" cy="50" r="27" fill="#96CEB4" opacity="0.5"/>
                </svg>
            `),
        height: 65,
        width: 65,
        anchorText: [0, 0],
        anchorIcon: [32, 32],
      },
    ];
  }
  clearMarkers() {
    if (this.markerClusterer)
      try {
        this.markerClusterer.clearMarkers
          ? this.markerClusterer.clearMarkers()
          : this.markerClusterer.removeMarkers
            ? this.markerClusterer.removeMarkers(this.markers)
            : this.markerClusterer.markers && ((this.markerClusterer.markers = []), this.markerClusterer.repaint && this.markerClusterer.repaint());
      } catch (error) {
        console.warn('\u6E05\u9664\u805A\u5408\u5668\u6807\u8BB0\u5931\u8D25:', error);
      }
    (this.markers.forEach((marker) => {
      marker.setMap(null);
    }),
      (this.markers = []));
  }
  addShowcaseMarker(showcaseData) {
    if (!this.map || !showcaseData || !showcaseData.location || !Array.isArray(showcaseData.location) || showcaseData.location.length < 2) {
      console.warn('\u65E0\u6548\u7684\u5C55\u793A\u70B9\u6570\u636E:', showcaseData);
      return;
    }
    const [lng, lat] = showcaseData.location;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.warn('\u65E0\u6548\u7684\u5750\u6807\u6570\u636E:', { lat, lng });
      return;
    }
    const marker = new google.maps.Marker({
        position: { lat: parseFloat(lat), lng: parseFloat(lng) },
        map: this.map,
        title: `${showcaseData.first_name} ${showcaseData.last_name}'s Showcase`,
        animation: google.maps.Animation.DROP,
        icon: this.iconCache.normal,
      }),
      isMobile = window.innerWidth <= 768;
    if (isMobile) ((marker.showcaseData = showcaseData), (marker.isMobileMarker = !0));
    else {
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 280px;">
                      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                          ${
                            showcaseData.profile_file
                              ? `<img src="${showcaseData.profile_file}" 
                                   style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;"
                                   alt="${showcaseData.first_name}">`
                              : `<img src="https://img-va.myshopline.com/image/store/1737714205978/7cfd3dd079ff4c10ad10344fe9582140.png?w=195&h=199" 
                                   style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;"
                                   alt="${showcaseData.first_name}">`
                          }
                          <div>
                              <div style="margin-bottom: 5px;">
                                  <span style="color: #666; font-size: 0.9em;">Name: </span>
                                  <strong>${showcaseData.first_name} ${showcaseData.last_name}</strong>
                              </div>
                              <div style="margin-bottom: 5px;">
                                  <span style="color: #666; font-size: 0.9em;">Yarbo owned:</span>
                                  ${showcaseData.products_owned.join(', ')}
                              </div>
                              <a href="/showcases/detail?id=${showcaseData.record_id}" 
                                 style="color: #1890ff; text-decoration: none; font-size: 0.9em;">
                                 Check Availability & Book Now
                              </a>
                          </div>
                      </div>
                      ${
                        showcaseData.introduction?.length > 0
                          ? `<div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 120px; overflow-y: auto;">
                                  ${showcaseData.introduction.replace(/\n/g, '<br/>')}
                              </div>`
                          : ''
                      }
                  </div>
        `,
      });
      marker.infoWindow = infoWindow;
    }
    marker.addListener('click', () => {
      isMobile
        ? (window.showcasesManager &&
            window.showcasesManager.setDrawerState &&
            window.showcasesManager.setDrawerState(window.showcasesManager.drawerStates.COLLAPSED),
          this.showMobileInfoWindow(showcaseData))
        : (this.markers.forEach((m) => {
            m.infoWindow && m.infoWindow.close();
          }),
          marker.infoWindow.open(this.map, marker));
    });
    let hoverTimeout = null;
    (marker.addListener('mouseover', () => {
      (hoverTimeout && (clearTimeout(hoverTimeout), (hoverTimeout = null)),
        !marker.isHighlighted &&
          ((marker.isHighlighted = !0),
          requestAnimationFrame(() => {
            this.highlightMarker(marker);
          })));
    }),
      marker.addListener('mouseout', () => {
        hoverTimeout = setTimeout(() => {
          marker.isHighlighted &&
            ((marker.isHighlighted = !1),
            requestAnimationFrame(() => {
              this.unhighlightMarker(marker);
            }));
        }, 50);
      }),
      (marker.showcaseId = showcaseData.record_id),
      (marker.showcaseData = showcaseData),
      this.markers.push(marker));
  }
  highlightMarker(marker) {
    !marker || !this.iconCache.highlighted || (marker.setIcon(this.iconCache.highlighted), marker.setAnimation && marker.setAnimation(null));
  }
  unhighlightMarker(marker) {
    !marker || !this.iconCache.normal || (marker.setIcon(this.iconCache.normal), marker.setAnimation && marker.setAnimation(null));
  }
  preventMapScrollBubbling() {
    this.mapContainer &&
      (this.mapContainer.addEventListener(
        'wheel',
        (e) => {
          e.stopPropagation();
        },
        { passive: !1 },
      ),
      this.mapContainer.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
        },
        { passive: !0 },
      ),
      this.mapContainer.addEventListener(
        'touchmove',
        (e) => {
          e.stopPropagation();
        },
        { passive: !0 },
      ),
      this.mapContainer.addEventListener(
        'touchend',
        (e) => {
          e.stopPropagation();
        },
        { passive: !0 },
      ),
      this.mapContainer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      }),
      this.mapContainer.addEventListener('mousemove', (e) => {
        e.stopPropagation();
      }),
      this.mapContainer.addEventListener('mouseup', (e) => {
        e.stopPropagation();
      }),
      this.mapContainer.addEventListener('keydown', (e) => {
        e.stopPropagation();
      }));
  }
  handleResize() {
    this.map && google.maps.event.trigger(this.map, 'resize');
  }
  addTestMarker() {
    if (!this.map) {
      console.error('\u5730\u56FE\u672A\u521D\u59CB\u5316');
      return;
    }
    const testData = {
      first_name: 'Test',
      last_name: 'User',
      location: [-74.006, 40.7128],
      city: 'New York',
      state: 'NY',
      products_owned: ['Yarbo Core'],
      introduction: 'This is a test marker',
      record_id: 'test-123',
    };
    this.addShowcaseMarker(testData);
  }
  forceReinit() {
    ((this.isMapLoaded = !1), (this.map = null), (this.markers = []), (this.markerClusterer = null), this.init());
  }
  debugClusterer() {
    (console.log('=== MarkerClusterer Debug Info ==='),
      console.log('markerClusterer exists:', !!this.markerClusterer),
      console.log('markers count:', this.markers.length),
      this.markerClusterer &&
        (console.log('clusterer type:', this.markerClusterer.constructor.name),
        console.log('clusterer methods:', Object.getOwnPropertyNames(this.markerClusterer)),
        this.markerClusterer.markers && console.log('clusterer markers count:', this.markerClusterer.markers.length)),
      console.log('window.MarkerClusterer:', !!window.MarkerClusterer),
      console.log('window.markerClusterer:', !!window.markerClusterer),
      console.log('==================================='));
  }
  showMobileInfoWindow(showcaseData) {
    this.forceCleanupAllPopups();
    const infoWindowContainer = document.createElement('div');
    ((infoWindowContainer.id = 'mobile-info-window'),
      (infoWindowContainer.style.cssText = `
          position: fixed;
          bottom: 0;
          left: 16px;
          right: 16px;
          background: white;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          padding: 16px;
          transform: translateY(100%);
          transition: transform 0.3s ease-out;
          max-height: 35vh;
          overflow-y: auto;
          max-width: 400px;
          margin: 0 auto;
      `),
      (infoWindowContainer.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div style="flex: 1;">
                  <div style="margin-bottom: 4px;">
                      <span style="color: #666; font-size: 14px;">Name: </span>
                      <strong style="font-size: 16px; color: #333;">${showcaseData.first_name} ${showcaseData.last_name}</strong>
                  </div>
                  <div style="margin-bottom: 8px;">
                      <span style="color: #666; font-size: 14px;">Yarbo owned: </span>
                      <span style="font-size: 14px; color: #333;">${showcaseData.products_owned.join(', ')}</span>
                  </div>
                  <a href="/showcases/detail?id=${showcaseData.record_id}" 
                     style="color: #1890ff; text-decoration: none; font-size: 14px;">
                     Check Availability & Book Now
                  </a>
              </div>
              <button id="close-mobile-info" style="
                  background: none;
                  border: none;
                  font-size: 20px;
                  color: #999;
                  cursor: pointer;
                  padding: 4px;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                  transition: background-color 0.2s;
                  margin-left: 8px;
              " onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='transparent'">
                  \xD7
              </button>
          </div>
          
          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
              ${
                showcaseData.profile_file
                  ? `<img src="${showcaseData.profile_file}" 
                       style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; flex-shrink: 0;"
                       alt="${showcaseData.first_name}">`
                  : `<img src="https://img-va.myshopline.com/image/store/1737714205978/7cfd3dd079ff4c10ad10344fe9582140.png?w=195&h=199" 
                       style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; flex-shrink: 0;"
                       alt="${showcaseData.first_name}">`
              }
              <div style="flex: 1;">
                  ${
                    showcaseData.introduction?.length > 0
                      ? `                      <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; max-height: 80px; overflow-y: auto;">
                          <p style="margin: 0; font-size: 13px; color: #333; line-height: 1.4;">
                              ${showcaseData.introduction.replace(/\n/g, '<br/>')}
                          </p>
                      </div>`
                      : '<div style="background: #f5f5f5; padding: 8px; border-radius: 4px;"><p style="margin: 0; font-size: 13px; color: #999; font-style: italic;">No introduction available</p></div>'
                  }
              </div>
          </div>
          

      `),
      document.body.appendChild(infoWindowContainer),
      setTimeout(() => {
        infoWindowContainer.classList.add('show');
      }, 10),
      infoWindowContainer.addEventListener('click', (e) => {
        if (e.target.id === 'close-mobile-info' || e.target.closest('#close-mobile-info')) {
          (e.preventDefault(), e.stopPropagation(), this.hideMobileInfoWindow());
          return;
        }
      }));
    const handleBackgroundClick = (e) => {
      e.target === infoWindowContainer && this.hideMobileInfoWindow();
    };
    (infoWindowContainer.addEventListener('click', handleBackgroundClick), (this.currentMobileInfoWindow = infoWindowContainer));
  }
  forceCleanupAllPopups() {
    (document.querySelectorAll('#mobile-info-window, [id^="mobile-info"]').forEach((popup, index) => {
      popup.parentNode && popup.parentNode.removeChild(popup);
    }),
      (this.currentMobileInfoWindow = null),
      this.markers &&
        this.markers.forEach((marker) => {
          marker.infoWindow && marker.infoWindow.close();
        }));
  }
  hideMobileInfoWindow() {
    const existingWindow = document.getElementById('mobile-info-window');
    if (existingWindow) {
      existingWindow.classList.remove('show');
      const closeBtn = existingWindow.querySelector('#close-mobile-info');
      (closeBtn && closeBtn.replaceWith(closeBtn.cloneNode(!0)),
        setTimeout(() => {
          existingWindow && existingWindow.parentNode && existingWindow.parentNode.removeChild(existingWindow);
        }, 300));
    }
    (this.currentMobileInfoWindow &&
      this.currentMobileInfoWindow !== existingWindow &&
      this.currentMobileInfoWindow.parentNode &&
      this.currentMobileInfoWindow.parentNode.removeChild(this.currentMobileInfoWindow),
      (this.currentMobileInfoWindow = null));
  }
}
let googleMapManager = null;
((window.forceInitMap = function () {
  (window.googleMapManager ? window.googleMapManager.forceReinit() : ((window.googleMapManager = new GoogleMapManager()), window.googleMapManager.init()),
    window.showcasesManager && window.showcasesManager.loadData());
}),
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('mapContainer') &&
      setTimeout(() => {
        try {
          if (typeof GoogleMapManager > 'u') {
            console.error('GoogleMapManager \u7C7B\u672A\u5B9A\u4E49');
            return;
          }
          ((googleMapManager = new GoogleMapManager()),
            (window.testMap = () => {
              googleMapManager ? googleMapManager.addTestMarker() : console.error('googleMapManager \u4E0D\u5B58\u5728');
            }),
            (window.debugClusterer = () => {
              googleMapManager ? googleMapManager.debugClusterer() : console.error('googleMapManager \u4E0D\u5B58\u5728');
            }),
            (window.googleMapManager = googleMapManager),
            (window.forceInitMap = () => {
              googleMapManager ? googleMapManager.initAfterDOM() : ((googleMapManager = new GoogleMapManager()), (window.googleMapManager = googleMapManager));
            }));
        } catch (error) {
          console.error('GoogleMapManager \u521B\u5EFA\u5931\u8D25:', error);
        }
      }, 1e3);
  }),
  window.addEventListener('error', function (event) {
    if (
      event.message &&
      (event.message.includes('message channel closed') ||
        event.message.includes('Extension context invalidated') ||
        event.message.includes('chrome-extension://') ||
        event.message.includes('moz-extension://'))
    )
      return (event.preventDefault(), !1);
  }),
  window.addEventListener('unhandledrejection', function (event) {
    if (
      event.reason &&
      event.reason.message &&
      (event.reason.message.includes('message channel closed') ||
        event.reason.message.includes('Extension context invalidated') ||
        event.reason.message.includes('chrome-extension://') ||
        event.reason.message.includes('moz-extension://'))
    )
      return (event.preventDefault(), !1);
  }),
  window.addEventListener('resize', () => {
    googleMapManager && googleMapManager.handleResize();
  }));
//# sourceMappingURL=/s/files/1/0604/5394/5441/files/google-map.js.map
