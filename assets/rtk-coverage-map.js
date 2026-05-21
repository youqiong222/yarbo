// RTK Coverage Map Manager Class - 参考 ProofMapManager 的设计模式
class RTKCoverageMapManager {
    constructor() {
        this.map = null;
        this.autocomplete = null;
        this.searchMarker = null;
        this.searchInfoWindow = null;
        this.allStations = [];
        this.stationMarkers = [];
        this.isMapLoaded = false;
        this.mapContainer = null;

        // 配置
        this.CONFIG = {
            GEODNET_API_URL: 'https://rtk.geodnet.com/api/v3/station/list',
            APP_ID: 'yarbo',
            APP_KEY: '8cc91bd29799cda6',
            COVERAGE_RADIUS: 50,
            BUFFER_STEPS: 16,
            BATCH_SIZE: 50,
            CACHE_KEY_STATIONS: 'rtk_v2_stations',
            CACHE_KEY_GEOJSON_NA: 'rtk_v2_geojson_north_america',
            CACHE_KEY_GEOJSON_OTHER: 'rtk_v2_geojson_other_regions',
            CACHE_EXPIRY: 24 * 60 * 60 * 1000,
            DEFAULT_CENTER: { lat: 20, lng: 0 },
            DEFAULT_ZOOM: 3
        };
    }

    // 初始化
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initAfterDOM();
            });
        } else {
            this.initAfterDOM();
        }
    }

    // DOM 加载完成后初始化
    initAfterDOM() {
        this.mapContainer = document.getElementById('rtk-coverage-map');

        if (!this.mapContainer) {
            console.error('RTK地图容器未找到，ID: rtk-coverage-map');
            return;
        }

        this.showMapLoading();
        this.initializeMap();
    }

    // 显示地图加载状态
    showMapLoading() {
        if (!this.mapContainer) return;

        this.mapContainer.innerHTML = `
            <div class="map-loading">
                <div class="map-loading-spinner"></div>
                <p>Loading coverage map...</p>
            </div>
        `;
    }

    // 显示地图错误
    showMapError(message = 'Map loading failed') {
        if (!this.mapContainer) return;

        this.mapContainer.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                text-align: center;
                padding: 20px;
                min-height: 600px;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                <h3 style="margin: 0 0 8px 0; color: #333;">Map Loading Failed</h3>
                <p style="margin: 0 0 16px 0; font-size: 14px;">${message}</p>
            </div>
        `;
    }

    // 初始化地图
    initializeMap() {
        if (!this.mapContainer) {
            this.showMapError();
            return;
        }

        if (!window.google || !window.google.maps) {
            this.showMapError('Google Maps API not loaded');
            return;
        }

        try {
            // 清空容器并创建地图容器结构
            this.mapContainer.innerHTML = `
                <div id="map" style="width: 100%; height: 100%;"></div>
                
                <div class="search-panel">
                    <div style="position: relative; width: 100%;">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #666; pointer-events: none;">🔍</span>
                        <input id="searchInput" type="text" placeholder="Search address or zip code..." style="padding-left: 36px;">
                    </div>
                </div>
                
                <div class="info-panel">
                    <h2>NetRTK Coverage Map</h2>
                    <p>Shows coverage area of all NetRTK stations</p>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #FEDB1E; border-color: #E6BE00;"></div>
                            <span class="legend-text">Coverage Area</span>
                        </div>
                    </div>
                </div>
                
                <div class="stats">
                    <div class="stats-item">
                        Total Stations: <span class="stats-value" id="totalStations">0</span>
                    </div>
                    <div class="stats-item">
                        Active Stations: <span class="stats-value" id="activeStations">0</span>
                    </div>
                </div>
                
                <div class="loading-overlay" id="loadingOverlay" style="display: none;">
                    <div class="loading-content">
                        <div class="map-loading-spinner"></div>
                        <div class="loading-text">Loading station data...</div>
                    </div>
                </div>
            `;

            // 初始化地图
            const mapElement = document.getElementById('map');
            this.map = new google.maps.Map(mapElement, {
                center: this.CONFIG.DEFAULT_CENTER,
                zoom: this.CONFIG.DEFAULT_ZOOM,
                minZoom: 2,
                maxZoom: 20,
                mapTypeControl: false,
                fullscreenControl: true,
                streetViewControl: false,
                zoomControl: true,
                gestureHandling: 'greedy',
                styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                    { featureType: "road", stylers: [{ visibility: "off" }] },
                    { featureType: "transit", stylers: [{ visibility: "off" }] },
                    { featureType: "landscape", stylers: [{ color: "#f5f5f5" }] },
                    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d0d0d0" }, { weight: 1 }] },
                    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#999999" }] },
                    { featureType: "water", stylers: [{ color: "#D8E3E7" }] }
                ]
            });

            this.isMapLoaded = true;
            console.log('✅ RTK Coverage Map 初始化成功');

            // 初始化搜索功能
            this.initAutocomplete();

            // 加载站点数据
            this.loadAllStations();

        } catch (error) {
            console.error('地图初始化失败:', error);
            this.showMapError('Map initialization failed');
        }
    }

    // 生成签名
    generateSign(params) {
        const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort();
        let s = '';
        sortedKeys.forEach(k => { s += params[k].toString(); });
        return md5(s + this.CONFIG.APP_KEY);
    }

    // 加载所有站点
    async loadAllStations() {
        this.setLoadingText('Loading station data...');
        $('#loadingOverlay').fadeIn();

        // 1. 先尝试渲染缓存的北美 GeoJSON
        const cachedNA = this.getCache(this.CONFIG.CACHE_KEY_GEOJSON_NA);
        const cachedOther = this.getCache(this.CONFIG.CACHE_KEY_GEOJSON_OTHER);

        if (cachedNA) {
            console.log('✅ Hit North America GeoJSON cache, rendering directly');
            this.renderGeoJSON(cachedNA);
            $('#loadingOverlay').fadeOut();

            if (cachedOther) {
                setTimeout(() => this.appendGeoJSON(cachedOther), 100);
            }

            const cachedStations = this.getCache(this.CONFIG.CACHE_KEY_STATIONS);
            if (cachedStations) this.updateStats(cachedStations);
            return;
        }

        // 2. 尝试从站点缓存计算
        let stations = this.getCache(this.CONFIG.CACHE_KEY_STATIONS);
        if (!stations) {
            stations = await this.fetchStationsFromAPI();
            if (!stations) return;

            const slim = stations.map(s => ({
                name: s.name,
                status: s.status,
                latitude: s.latitude,
                longitude: s.longitude
            }));
            this.setCache(this.CONFIG.CACHE_KEY_STATIONS, slim);
        }

        this.allStations = stations;
        this.updateStats(stations);

        const active = stations.filter(s => s.status === 'ACTIVE' || s.status === 'ONLINE');
        console.log(`📡 Active stations: ${active.length}`);

        // 3. 渐进式加载
        await this.loadCoverageProgressively(active);
    }

    // 从API获取站点
    async fetchStationsFromAPI() {
        try {
            const params = { appId: this.CONFIG.APP_ID, time: Date.now() };
            params.sign = this.generateSign(params);

            const res = await $.ajax({
                url: this.CONFIG.GEODNET_API_URL,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(params)
            });

            if (res.code === 1000 && res.data) return res.data;
            this.showToast('API error: ' + res.msg, 'error');
            return null;
        } catch (e) {
            console.error(e);
            this.showToast('Request failed, please check console', 'error');
            $('#loadingOverlay').fadeOut();
            return null;
        }
    }

    // 按地理区域分组站点
    groupStationsByRegion(stations) {
        const regions = {
            northAmerica: [],
            other: []
        };

        stations.forEach(s => {
            const lat = parseFloat(s.latitude);
            const lng = parseFloat(s.longitude);

            if (lng >= -170 && lng <= -50 && lat >= 15 && lat <= 85) {
                regions.northAmerica.push(s);
            } else {
                regions.other.push(s);
            }
        });

        return regions;
    }

    // 渐进式加载
    async loadCoverageProgressively(stations) {
        const regions = this.groupStationsByRegion(stations);

        console.log('📍 Region statistics:', {
            northAmerica: regions.northAmerica.length,
            other: regions.other.length
        });

        // 优先加载北美
        this.setLoadingText(`Loading North America coverage (${regions.northAmerica.length} stations)...`);
        const naGeoJSON = await this.computeCoverageGeoJSON(regions.northAmerica);

        if (naGeoJSON) {
            this.renderGeoJSON(naGeoJSON);
            this.fitMapBounds(regions.northAmerica);
            $('#loadingOverlay').fadeOut();

            try {
                this.setCache(this.CONFIG.CACHE_KEY_GEOJSON_NA, naGeoJSON);
            } catch (e) {
                console.warn('North America cache failed');
            }

            console.log('✅ North America displayed, loading other regions in background...');
        } else {
            $('#loadingOverlay').fadeOut();
            return;
        }

        // 后台异步加载其他区域
        if (regions.other.length > 0) {
            console.log(`🔄 Loading other regions in background (${regions.other.length} stations)...`);

            await new Promise(r => setTimeout(r, 200));

            const otherGeoJSON = await this.computeCoverageGeoJSON(regions.other);

            if (otherGeoJSON) {
                this.appendGeoJSON(otherGeoJSON);
                console.log('✅ Other regions loaded');

                try {
                    this.setCache(this.CONFIG.CACHE_KEY_GEOJSON_OTHER, otherGeoJSON);
                } catch (e) {
                    console.warn('Other regions cache failed');
                }
            }
        }

        console.log('✅ Global coverage loading complete');
    }

    // 计算覆盖GeoJSON
    async computeCoverageGeoJSON(stations) {
        try {
            console.time('⏱ Total time');

            this.setLoadingText('Generating coverage circles...');
            const buffers = await this.generateBuffersInBatches(stations);
            console.log(`✅ Generated ${buffers.length} buffers`);

            this.setLoadingText('Merging coverage areas...');
            const merged = await this.divideAndConquerUnion(buffers);
            console.log('✅ Merge complete');

            this.setLoadingText('Optimizing polygons...');
            const simplified = turf.simplify(merged, { tolerance: 0.05, highQuality: false });
            console.log('✅ Simplification complete');

            console.timeEnd('⏱ Total time');
            return simplified;
        } catch (e) {
            console.error('Coverage calculation failed:', e);
            return null;
        }
    }

    // 分批生成buffer
    async generateBuffersInBatches(stations, batchSize = 200) {
        const buffers = [];
        for (let i = 0; i < stations.length; i += batchSize) {
            const chunk = stations.slice(i, i + batchSize);
            chunk.forEach(s => {
                const lat = parseFloat(s.latitude);
                const lng = parseFloat(s.longitude);
                if (isNaN(lat) || isNaN(lng)) return;
                buffers.push(turf.buffer(
                    turf.point([lng, lat]),
                    this.CONFIG.COVERAGE_RADIUS,
                    { units: 'kilometers', steps: this.CONFIG.BUFFER_STEPS }
                ));
            });
            await new Promise(r => setTimeout(r, 0));
            this.setLoadingText(`Generating coverage circles... ${Math.min(i + batchSize, stations.length)}/${stations.length}`);
        }
        return buffers;
    }

    // 分治合并
    async divideAndConquerUnion(features) {
        let current = [...features];
        let round = 1;

        while (current.length > 1) {
            const next = [];
            this.setLoadingText(`Merging coverage areas... Round ${round} (${current.length} blocks)`);

            for (let i = 0; i < current.length; i += 2) {
                if (i + 1 >= current.length) {
                    next.push(current[i]);
                } else {
                    try {
                        next.push(turf.union(current[i], current[i + 1]));
                    } catch (e) {
                        next.push(current[i]);
                    }
                }
                if (i % (this.CONFIG.BATCH_SIZE * 2) === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            current = next;
            round++;
        }

        return current[0];
    }

    // 渲染GeoJSON
    renderGeoJSON(geojson) {
        this.map.data.forEach(f => this.map.data.remove(f));

        this.map.data.addGeoJson({
            type: 'FeatureCollection',
            features: [geojson]
        });

        this.map.data.setStyle({
            fillColor: '#FEDB1E',
            fillOpacity: 0.45,
            strokeColor: '#E6BE00',
            strokeWeight: 1.5,
            strokeOpacity: 0.85,
            clickable: false
        });
    }

    // 追加渲染新区域
    appendGeoJSON(newGeoJSON) {
        this.map.data.addGeoJson({
            type: 'FeatureCollection',
            features: [newGeoJSON]
        });

        this.map.data.setStyle({
            fillColor: '#FEDB1E',
            fillOpacity: 0.45,
            strokeColor: '#E6BE00',
            strokeWeight: 1.5,
            strokeOpacity: 0.85,
            clickable: false
        });
    }

    // 适配地图边界
    fitMapBounds(stations) {
        const bounds = new google.maps.LatLngBounds();
        stations.forEach(s => {
            const lat = parseFloat(s.latitude),
                lng = parseFloat(s.longitude);
            if (!isNaN(lat) && !isNaN(lng)) bounds.extend({ lat, lng });
        });
        this.map.fitBounds(bounds);
        const l = google.maps.event.addListener(this.map, 'idle', () => {
            if (this.map.getZoom() > 8) this.map.setZoom(8);
            google.maps.event.removeListener(l);
        });
    }

    // 初始化自动补全
    initAutocomplete() {
        const input = document.getElementById('searchInput');
        if (!input) return;

        this.autocomplete = new google.maps.places.Autocomplete(input, {
            fields: ['geometry', 'formatted_address', 'name'],
            types: ['geocode']
        });

        // 回车时选中下拉第一个选项
        let selectingFirst = false;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (selectingFirst) return; // 让 Google 处理这次 Enter

                const firstPacItem = document.querySelector('.pac-item');
                if (firstPacItem) {
                    e.preventDefault();
                    selectingFirst = true;
                    // ArrowDown 高亮第一项，Google 内部处理后 Enter 确认选中并触发 place_changed
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                    selectingFirst = false;
                } else {
                    e.preventDefault();
                    this.geocodeAddress(input.value);
                }
            }
        });

        this.autocomplete.addListener('place_changed', async () => {
            const place = this.autocomplete.getPlace();

            if (!place.geometry || !place.geometry.location) {
                await this.geocodeAddress(input.value);
                return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name;

            await this.checkCoverage(lat, lng, address);
        });
    }

    // 使用 Geocoding API 解析地址
    async geocodeAddress(address) {
        if (!address || !address.trim()) {
            this.showToast('Please enter a valid address', 'error');
            return;
        }

        try {
            const geocoder = new google.maps.Geocoder();
            const results = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: address }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                        resolve(results);
                    } else {
                        reject(new Error(status));
                    }
                });
            });

            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            const formattedAddress = results[0].formatted_address;

            await this.checkCoverage(lat, lng, formattedAddress);
        } catch (error) {
            console.error('Geocoding error:', error);
            if (error.message === 'ZERO_RESULTS') {
                this.showToast('Unable to find this address', 'error');
            } else {
                this.showToast('Unable to get location information for this address', 'error');
            }
        }
    }

    // 显示 Toast 提示
    showToast(message, type = 'info') {
        // 移除已存在的 toast
        const existingToast = document.querySelector('.rtk-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 获取对应类型的图标
        const iconSvg = this.getToastIcon(type);

        // 创建 toast 元素
        const toast = document.createElement('div');
        toast.className = `rtk-toast rtk-toast-${type}`;
        toast.innerHTML = `
            <div class="rtk-toast-content">
                <span class="rtk-toast-icon">${iconSvg}</span>
                <span class="rtk-toast-message">${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // 触发动画
        setTimeout(() => toast.classList.add('rtk-toast-show'), 10);

        // 3秒后自动移除
        setTimeout(() => {
            toast.classList.remove('rtk-toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 获取 Toast 图标
    getToastIcon(type) {
        const icons = {
            error: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" fill="#F44336" stroke="#D32F2F" stroke-width="1"/>
                    <path d="M13 7L7 13M7 7L13 13" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            success: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" fill="#4CAF50" stroke="#388E3C" stroke-width="1"/>
                    <path d="M6 10L9 13L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            info: `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" fill="#2196F3" stroke="#1976D2" stroke-width="1"/>
                    <path d="M10 6V7M10 10V14" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `
        };

        return icons[type] || icons.info;
    }

    // 检查覆盖
    async checkCoverage(lat, lng, address) {
        try {
            this.setLoadingText('Checking coverage...');
            $('#loadingOverlay').fadeIn();

            const params = {
                appId: this.CONFIG.APP_ID,
                lat: lat,
                lng: lng,
                radius: 100,
                amount: 10,
                time: Date.now()
            };

            params.sign = this.generateSign(params);

            console.log('🔍 Checking coverage:', { lat, lng, address });

            const response = await $.ajax({
                url: 'https://rtk.geodnet.com/api/v3/coverage/list',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(params)
            });

            $('#loadingOverlay').fadeOut();

            if (response.code === 1000) {
                this.showSearchResult(lat, lng, address, response.data);
            } else {
                this.showToast('Query failed: ' + (response.msg || 'Unknown error'), 'error');
            }

        } catch (error) {
            $('#loadingOverlay').fadeOut();
            console.error('Coverage API error:', error);
            this.showToast('Query failed, please try again later', 'error');
        }
    }

    // 显示搜索结果
    showSearchResult(lat, lng, address, stations) {
        if (this.searchMarker) {
            this.searchMarker.setMap(null);
        }
        if (this.searchInfoWindow) {
            this.searchInfoWindow.close();
        }

        const hasCoverage = stations && stations.length > 0;

        this.searchMarker = new google.maps.Marker({
            position: { lat, lng },
            map: this.map,
            animation: google.maps.Animation.DROP,
            icon: this.createPinIcon(hasCoverage ? '#4CAF50' : '#F44336')
        });

        let infoContent = `
            <div style="padding: 12px; min-width: 250px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                    ${hasCoverage ? 'NetRTK Coverage Available' : 'No NetRTK Coverage'}
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
                    ${address}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #999;">
                    Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </p>
        `;

        if (hasCoverage) {
            infoContent += `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; max-height: 200px; overflow-y: auto;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #666; font-weight: bold;">
                        Nearby Stations (${stations.length}):
                    </p>
            `;

            stations.forEach((station, index) => {
                const distance = station.distance ? `${(station.distance).toFixed(1)}km` : 'Distance unknown';
                infoContent += `
                    <div style="font-size: 12px; color: #777; margin-bottom: 4px;">
                        ${index + 1}. ${station.name || 'Unnamed'} - ${distance}
                    </div>
                `;
            });

            infoContent += `</div>`;
        } else {
            infoContent += `
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    No NetRTK coverage in this area. Please try another location.
                </p>
            `;
        }

        infoContent += `</div>`;

        this.searchInfoWindow = new google.maps.InfoWindow({
            content: infoContent
        });

        this.searchInfoWindow.open(this.map, this.searchMarker);

        this.map.panTo({ lat, lng });
        if (this.map.getZoom() < 10) {
            this.map.setZoom(10);
        }

        console.log('Search result displayed', { hasCoverage, stationCount: stations.length });
    }

    // 创建PIN图标
    createPinIcon(color) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="41" viewBox="0 0 27 41">
                <g fill-rule="nonzero">
                    <g transform="translate(3.0, 29.0)" fill="#000000">
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="10.5" ry="5.25002273"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="9.5" ry="4.77275007"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="8.5" ry="4.29549936"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="7.5" ry="3.81822308"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="6.5" ry="3.34094679"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="5.5" ry="2.86367051"/>
                        <ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="4.5" ry="2.38636864"/>
                    </g>
                    <g fill="${color}">
                        <path d="M27,13.5 C27,19.074644 20.250001,27.000002 14.75,34.500002 C14.016665,35.500004 12.983335,35.500004 12.25,34.500002 C6.7499993,27.000002 0,19.222562 0,13.5 C0,6.0441559 6.0441559,0 13.5,0 C20.955844,0 27,6.0441559 27,13.5 Z"/>
                    </g>
                    <g opacity="0.25" fill="#000000">
                        <path d="M13.5,0 C6.0441559,0 0,6.0441559 0,13.5 C0,19.222562 6.7499993,27 12.25,34.5 C13,35.522727 14.016664,35.500004 14.75,34.5 C20.250001,27 27,19.074644 27,13.5 C27,6.0441559 20.955844,0 13.5,0 Z M13.5,1 C20.415404,1 26,6.584596 26,13.5 C26,15.898657 24.495584,19.181431 22.220703,22.738281 C19.945823,26.295132 16.705119,30.142167 13.943359,33.908203 C13.743445,34.180814 13.612715,34.322738 13.5,34.441406 C13.387285,34.322738 13.256555,34.180814 13.056641,33.908203 C10.284481,30.127985 7.4148684,26.314159 5.015625,22.773438 C2.6163816,19.232715 1,15.953538 1,13.5 C1,6.584596 6.584596,1 13.5,1 Z"/>
                    </g>
                    <g transform="translate(8.0, 8.0)">
                        <circle fill="#000000" opacity="0.25" cx="5.5" cy="5.5" r="5.4999962"/>
                        <circle fill="#FFFFFF" cx="5.5" cy="5.5" r="5.4999962"/>
                    </g>
                </g>
            </svg>
        `;

        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(27, 41),
            anchor: new google.maps.Point(13.5, 41)
        };
    }

    // 工具函数
    updateStats(stations) {
        const active = stations.filter(s => s.status === 'ACTIVE' || s.status === 'ONLINE');
        $('#totalStations').text(stations.length);
        $('#activeStations').text(active.length);
    }

    setLoadingText(text) {
        $('.loading-text').text(text);
    }

    getCache(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { timestamp, data } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CONFIG.CACHE_EXPIRY) {
                localStorage.removeItem(key);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    setCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn(`⚠️ ${key} cache exceeded limit, skipping cache`);
            } else {
                throw e;
            }
        }
    }
}

// 全局初始化函数（供HTML回调使用）
function initRTKCoverageMap() {
    if (!window.rtkCoverageMapManager) {
        window.rtkCoverageMapManager = new RTKCoverageMapManager();
    }
    window.rtkCoverageMapManager.init();
}

// 如果已经加载了Google Maps，直接初始化
if (window.google && window.google.maps) {
    console.log('Google Maps already loaded, initializing RTK Coverage Map');
    initRTKCoverageMap();
}
