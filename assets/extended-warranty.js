// Extended Warranty Form JavaScript
class ExtendedWarrantyForm {
  constructor() {
    this.uploadedFile = null;
    // S3配置
    this.s3Config = {
      bucket: 'erp-shipping-label', // 根据实际S3 bucket名称修改
      baseURL: 'extended-warranty',
      folderPath: `${Date.now()}`
    };
    this.init();
  }

  init() {
    this.initializeProductOptions();
    this.initializePricingTable(); // 初始化价格组合表
    this.initializeCurrencyMapping(); // 初始化货币映射表
    this.bindEvents();
    this.initializeDatePicker();
    this.loadCountriesAndRegions();
    this.initializeQuoteTracking(); // 初始化报价跟踪

    // 初始化报价显示
    this.updateQuoteDisplay();
  }

  // 定义产品选项
  initializeProductOptions() {
    this.productOptions = [
      { value: 'yarbo-core', label: 'Yarbo Core' },
      { value: 'yarbo-m1-pro', label: 'Yarbo Lawn Mower Pro Module' },
      { value: 'yarbo-m1', label: 'Lawn Mower Module' },
      { value: 'yarbo-s1', label: 'Snow Blower Module' },
      { value: 'yarbo-b1', label: 'Blower Module' },
      { value: 'yarbo-t1', label: 'Yarbo Trimmer Package' },
    ];
  }

  // 产品价格组合表
  initializePricingTable() {
    // 单产品价格表
    this.singleProductPrices = {
      'yarbo-core': 3999,     // Yarbo Core
      'yarbo-s1': 1299,       // Snow Blower Module
      'yarbo-m1': 1299,       // Lawn Mower Module
      'yarbo-b1': 1099,       // Blower Module
      'yarbo-m1-pro': 2299,   // Lawn Mower Pro Module
      'yarbo-t1': 799         // Yarbo Trimmer
    };

    // 产品组合价格表 - 根据你的价格表定义
    this.comboPrices = {
      // Y + 单个模块 (Core + 单模块)
      'yarbo-core,yarbo-s1': 4999,         // Y+S = $4,999
      'yarbo-core,yarbo-m1': 4999,         // Y+M = $4,999
      'yarbo-core,yarbo-b1': 4799,         // Y+B = $4,799
      'yarbo-core,yarbo-m1-pro': 5999,     // Y + M Pro = $5,999
      'yarbo-core,yarbo-t1': 4549,         // Y+T = $4,549

      // Y + 双模块 (Core + 2模块)
      'yarbo-core,yarbo-s1,yarbo-m1': 6199,        // Y+S+M = $6,199
      'yarbo-core,yarbo-s1,yarbo-b1': 5999,        // Y+S+B = $5,999
      'yarbo-core,yarbo-m1,yarbo-b1': 5999,        // Y+M+B = $5,999
      'yarbo-core,yarbo-m1-pro,yarbo-t1': 6749,    // Y+M Pro+ T = $6,749
      'yarbo-core,yarbo-m1,yarbo-t1': 5749,        // Y+M+T = $5,749
      'yarbo-core,yarbo-s1,yarbo-m1-pro': 7199,    // Y + S + M Pro = $7,199
      'yarbo-core,yarbo-m1-pro,yarbo-b1': 6999,    // Y+M Pro +B = $6,999
      'yarbo-core,yarbo-b1,yarbo-t1': 5549,        // Y+B+T = $5,549
      'yarbo-core,yarbo-s1,yarbo-t1': 5749,        // Y+S+T = $5,749

      // Y + 三模块 (Core + 3模块)
      'yarbo-core,yarbo-s1,yarbo-m1,yarbo-b1': 6999,       // Y+S+M+B = $6,999
      'yarbo-core,yarbo-s1,yarbo-m1-pro,yarbo-b1': 7999,   // Y+S+M Pro+B = $7,999
      'yarbo-core,yarbo-s1,yarbo-b1,yarbo-t1': 6549,       // Y+S+B+T = $6,549
      'yarbo-core,yarbo-s1,yarbo-m1,yarbo-t1': 6749,       // Y+S+M+T = $6,749
      'yarbo-core,yarbo-s1,yarbo-m1-pro,yarbo-t1': 7749,   // Y+S+M Pro+T = $7,749
      'yarbo-core,yarbo-m1,yarbo-b1,yarbo-t1': 6549,       // Y+M+B+T = $6,549
      'yarbo-core,yarbo-m1-pro,yarbo-b1,yarbo-t1': 7549,   // Y+M Pro+B+T = $7,549

      // Y + 四模块 (Core + 4模块)
      'yarbo-core,yarbo-s1,yarbo-m1,yarbo-b1,yarbo-t1': 7749,      // Y+S+M+B+T = $7,749
      'yarbo-core,yarbo-s1,yarbo-m1-pro,yarbo-b1,yarbo-t1': 8749   // Y+S+M Pro+B+T = $8,749
    };

    // 延保价格百分比表
    this.warrantyPercentages = {
      '1_Year': 0.05,   // 1年延保 = 商品价格 × 5%
      '3_Years': 0.13,  // 3年延保 = 商品价格 × 13%
      '5_Years': 0.17   // 5年延保 = 商品价格 × 17%
    };
  }


  bindEvents() {
    // File upload events
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('file-upload');

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
      uploadArea.addEventListener('drop', this.handleDrop.bind(this));
      fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    // File action events
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        this.deleteFile(e.target);
      }
      if (e.target.classList.contains('view-btn')) {
        this.viewFile(e.target);
      }
    });

    // Add product button
    const addProductBtn = document.querySelector('.add-product-btn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', this.addProduct.bind(this));
    }

    // Get Price Estimate button
    const estimateBtn = document.querySelector('#get-estimate-btn');
    if (estimateBtn) {
      estimateBtn.addEventListener('click', this.handleGetEstimate.bind(this));
    }

    // Modal submit button
    const modalSubmitBtn = document.querySelector('#modal-submit-btn');
    if (modalSubmitBtn) {
      modalSubmitBtn.addEventListener('click', this.handleSubmit.bind(this));
    }

    // Modal close button
    const modalCloseBtn = document.querySelector('#price-modal-close');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', this.closePriceModal.bind(this));
    }

    // Add ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalOverlay = document.querySelector('#price-modal-overlay');
        if (modalOverlay && modalOverlay.classList.contains('show')) {
          this.closePriceModal();
        }
      }
    });

    // Country/Region change
    // const countrySelect = document.querySelector('select[data-field="country"]');
    // if (countrySelect) {
    //   countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    // }

    // Province/State change
    // const provinceSelect = document.querySelector('select[data-field="province"]');
    // if (provinceSelect) {
    //   provinceSelect.addEventListener('change', this.handleProvinceChange.bind(this));
    // }

    // 初始化第一个产品选择器
    this.populateInitialProductSelect();
  }

  populateInitialProductSelect() {
    const initialSelect = document.getElementById('initial-product-select');
    if (initialSelect && this.productOptions) {
      // 添加默认空选项
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select a product';
      initialSelect.appendChild(defaultOption);

      // 添加产品选项
      this.productOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        initialSelect.appendChild(optionElement);
      });
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#ffd700';
    e.currentTarget.style.background = '#fffef7';
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      this.processFile(file);
    }

    // Reset styles
    e.currentTarget.style.borderColor = '#ddd';
    e.currentTarget.style.background = '#fafafa';
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  async processFile(file) {
    if (this.validateFile(file)) {
      // 立即上传文件到S3
      await this.uploadFileImmediately(file);
    }
  }

  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
      window.__SL_toast__.show({ type: 'info', message: 'File size cannot exceed 10MB' })
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      window.__SL_toast__.show({ type: 'info', message: 'Only JPG, JPEG, PNG, WEBP, PDF formats are supported' })
      return false;
    }
    return true;
  }

  // 立即上传文件到S3
  async uploadFileImmediately(file) {
    try {
      // 显示上传中状态
      this.showUploadingState(file);

      const fileName = file.name;
      const fileType = file.type;

      // 1. 生成唯一的文件名和objectKey（确保一致性）
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const objectKey = `prodcut/${this.s3Config.baseURL}/${this.s3Config.folderPath}/${uniqueFileName}`;

      // 2. 获取预签名URL（传入完整的objectKey）
      const presignedData = await this.getPresignedUrlWithObjectKey(fileType, objectKey);

      // 3. 上传到S3
      await this.uploadToS3(presignedData.url, file, presignedData.values);

      // 4. 保存上传成功的文件信息（使用相同的objectKey）
      this.uploadedFile = file;
      this.uploadedFileObjectKey = objectKey;

      // 5. 显示上传成功状态
      this.showUploadSuccessState(file);

    } catch (error) {
      this.showUploadErrorState(file, error.message);
      throw error;
    }
  }

  // 使用指定的objectKey获取预签名URL
  async getPresignedUrlWithObjectKey(fileType, objectKey) {
    try {
      const requestData = {
        bucket: this.s3Config.bucket,
        objectKey: objectKey,
        contentType: fileType,
      };

      const response = await fetch(`${this.apiBaseUrl}/s3/presigneUpload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();

        if (!result.success) {
          throw new Error('Failed to get presigned URL: ' + (result.message || 'Unknown error'));
        }

        return result.data;
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // 显示上传中状态
  showUploadingState(file) {
    const fileUploadRow = document.querySelector('.file-upload-row');
    if (fileUploadRow) {
      fileUploadRow.innerHTML = '';
    }

    const fileItem = document.createElement('div');
    fileItem.className = 'file-upload-item uploading';

    fileItem.innerHTML = `
    <div class="file-upload-icon uploading">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    </div>
    <div class="file-upload-info">
      <div class="file-upload-name">${file.name}</div>
      <div class="file-upload-size uploading">Uploading... ${this.formatFileSize(file.size)}</div>
    </div>
    <div class="file-upload-actions">
      <div class="file-upload-progress">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffc107" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    </div>
  `;

    if (fileUploadRow) {
      fileUploadRow.appendChild(fileItem);
    }
  }

  // 显示上传成功状态
  showUploadSuccessState(file) {
    const fileUploadRow = document.querySelector('.file-upload-row');
    if (fileUploadRow) {
      fileUploadRow.innerHTML = '';
    }

    const fileItem = document.createElement('div');
    fileItem.className = 'file-upload-item uploaded';

    fileItem.innerHTML = `
    <div class="file-upload-icon uploaded">✓</div>
    <div class="file-upload-info">
      <div class="file-upload-name">${file.name}</div>
      <div class="file-upload-size uploaded">Uploaded - ${this.formatFileSize(file.size)}</div>
    </div>
    <div class="file-upload-actions">
      <svg class="view-btn file-action-icon view" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <svg class="delete-btn file-action-icon delete" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>
  `;

    if (fileUploadRow) {
      fileUploadRow.appendChild(fileItem);
    }
  }

  // 显示上传错误状态
  showUploadErrorState(file, errorMessage) {
    const fileUploadRow = document.querySelector('.file-upload-row');
    if (fileUploadRow) {
      fileUploadRow.innerHTML = '';
    }

    const fileItem = document.createElement('div');
    fileItem.className = 'file-upload-item error';

    fileItem.innerHTML = `
    <div class="file-upload-icon error">!</div>
    <div class="file-upload-info">
      <div class="file-upload-name">${file.name}</div>
      <div class="file-upload-size error">Upload failed - ${errorMessage}</div>
    </div>
    <div class="file-upload-actions">
      <svg class="retry-btn file-action-icon retry" onclick="extendedWarrantyForm.retryUpload()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
        <polyline points="23,4 23,10 17,10"/>
        <polyline points="1,20 1,14 7,14"/>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
      </svg>
      <svg class="delete-btn file-action-icon delete" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>
  `;

    if (fileUploadRow) {
      fileUploadRow.appendChild(fileItem);
    }
  }

  // 重试上传
  async retryUpload() {
    if (this.uploadedFile) {
      await this.uploadFileImmediately(this.uploadedFile);
    }
  }

  addFileToList(file) {
    // 这个方法现在由 showUploadSuccessState 替代
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  }

  deleteFile(deleteBtn) {
    const fileItem = deleteBtn.closest('.file-upload-item');

    // Clear uploaded file and objectKey
    this.uploadedFile = null;
    this.uploadedFileObjectKey = null;

    // Remove from DOM
    fileItem.remove();

    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  viewFile() {
    if (this.uploadedFile) {
      // Create object URL and open in new tab
      const url = URL.createObjectURL(this.uploadedFile);
      window.open(url, '_blank');
    }
  }

  addProduct() {
    const productsContainer = document.querySelector('.products-container');
    const addButton = document.querySelector('.add-product-btn');

    // 计算当前产品数量
    const currentProducts = productsContainer.querySelectorAll('.product-item');
    const nextProductNumber = currentProducts.length + 1;

    const productItem = document.createElement('div');
    productItem.className = 'product-item';

    // 生成产品选项HTML
    const productOptionsHtml = this.productOptions.map(option =>
      `<option value="${option.value}">${option.label}</option>`
    ).join('');

    productItem.innerHTML = `
    <label><span class="required-asterisk">*</span>Product ${nextProductNumber}</label>
    <div class="product-row">
      <select class="product-select" required>
        <option value="">Please select a product</option>
        ${productOptionsHtml}
      </select>
      <input type="text" class="serial-input" placeholder="Enter your product SN" required>
      <button type="button" class="remove-product-btn" onclick="extendedWarrantyForm.removeProduct(this)">✕</button>
    </div>
  `;

    if (productsContainer && addButton) {
      // 在"Add another product"按钮之前插入新产品
      productsContainer.insertBefore(productItem, addButton);

      // 立即更新报价显示
      this.updateQuoteDisplay();
    }
  }

  removeProduct(button) {
    const productItem = button.closest('.product-item');
    const productsContainer = document.querySelector('.products-container');

    // 检查是否是第一个产品
    const allProducts = Array.from(productsContainer.querySelectorAll('.product-item'));
    const productIndex = allProducts.indexOf(productItem);

    if (productIndex === 0) {
      window.__SL_toast__.show({ type: 'info', message: 'The first product cannot be removed' })
      return;
    }

    // 删除产品
    productItem.remove();

    // 重新编号所有产品
    this.updateProductNumbers();

    // 更新报价显示
    this.updateQuoteDisplay();
  }

  updateProductNumbers() {
    const productsContainer = document.querySelector('.products-container');
    const productItems = productsContainer.querySelectorAll('.product-item');

    productItems.forEach((item, index) => {
      const label = item.querySelector('label');
      if (label) {
        label.textContent = `Product ${index + 1}`;
      }
    });
  }

  initializeDatePicker() {
    const datePickerContainer = document.querySelector('.date-picker-container');
    if (datePickerContainer) {
      this.createCustomDatePicker(datePickerContainer);
    }
  }

  createCustomDatePicker(container) {
    // Create custom date picker HTML
    const customDatePicker = document.createElement('div');
    customDatePicker.className = 'custom-date-picker';

    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.className = 'form-input date-display';
    dateInput.placeholder = 'Select the date you purchased your product';
    dateInput.readOnly = true;

    const calendarIcon = document.createElement('div');
    calendarIcon.className = 'calendar-icon';
    calendarIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    `;

    const calendarDropdown = document.createElement('div');
    calendarDropdown.className = 'calendar-dropdown';

    customDatePicker.appendChild(dateInput);
    customDatePicker.appendChild(calendarIcon);
    customDatePicker.appendChild(calendarDropdown);

    // Replace the original container content
    container.innerHTML = '';
    container.appendChild(customDatePicker);

    // Initialize calendar functionality
    this.initializeCustomCalendar(dateInput, calendarDropdown, calendarIcon);

    // Store reference for form validation
    this.dateInput = dateInput;
  }

  initializeCustomCalendar(dateInput, calendarDropdown, calendarIcon) {
    let selectedDate = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    const today = new Date();
    const maxDate = new Date(today);
    const minDate = new Date(today);
    minDate.setFullYear(today.getFullYear() - 5);

    // Year range for dropdown (more flexible range for selection)
    const minSelectableYear = today.getFullYear() - 15; // 15 years ago for better coverage
    const maxSelectableYear = today.getFullYear(); // current year

    // But validation still uses the 5-year limit for actual date validation

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const formatDate = (date) => {
      // 使用本地时间格式化，避免时区偏移
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      return `${monthNames[month]} ${day}, ${year}`;
    };

    const renderCalendar = () => {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      // Generate year options (use selectable range, not validation range)
      const yearOptions = [];
      for (let year = minSelectableYear; year <= maxSelectableYear; year++) {
        yearOptions.push(`<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`);
      }

      // Check if we're at the boundaries
      const isAtMinBoundary = (currentYear === minSelectableYear && currentMonth === 0);
      const isAtMaxBoundary = (currentYear === maxSelectableYear && currentMonth === 11);

      let calendarHTML = `
        <div class="calendar-header">
          <button type="button" class="calendar-nav prev-month" ${isAtMinBoundary ? 'disabled' : ''}>&lt;</button>
          <div class="calendar-title-container">
            <select class="month-select">
              ${monthNames.map((month, index) =>
        `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${month}</option>`
      ).join('')}
            </select>
            <select class="year-select">
              ${yearOptions.join('')}
            </select>
          </div>
          <button type="button" class="calendar-nav next-month" ${isAtMaxBoundary ? 'disabled' : ''}>&gt;</button>
        </div>
        <div class="calendar-weekdays">
          ${dayNames.map(day => `<div class="weekday">${day}</div>`).join('')}
        </div>
        <div class="calendar-days">
      `;

      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        const isDisabled = date > maxDate || date < minDate;

        let dayClass = 'calendar-day';
        if (!isCurrentMonth) dayClass += ' other-month';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';
        if (isDisabled) dayClass += ' disabled';

        // 使用本地日期格式，避免时区转换
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        calendarHTML += `<div class="${dayClass}" data-date="${dateStr}">${date.getDate()}</div>`;
      }

      calendarHTML += '</div>';
      calendarDropdown.innerHTML = calendarHTML;

      // Add event listeners with preventDefault to stop event bubbling
      const prevButton = calendarDropdown.querySelector('.prev-month');
      const nextButton = calendarDropdown.querySelector('.next-month');

      prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (prevButton.disabled) return;

        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
          // Don't go below minimum selectable year
          if (currentYear < minSelectableYear) {
            currentYear = minSelectableYear;
            currentMonth = 0; // January
          }
        }
        renderCalendar();
      });

      nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (nextButton.disabled) return;

        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
          // Don't go above maximum selectable year
          if (currentYear > maxSelectableYear) {
            currentYear = maxSelectableYear;
            currentMonth = 11; // December
          }
        }
        renderCalendar();
      });

      // Month select change
      calendarDropdown.querySelector('.month-select').addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentMonth = parseInt(e.target.value);
        renderCalendar();
      });

      // Year select change
      calendarDropdown.querySelector('.year-select').addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedYear = parseInt(e.target.value);
        // Ensure year is within selectable range
        if (selectedYear >= minSelectableYear && selectedYear <= maxSelectableYear) {
          currentYear = selectedYear;
        }
        renderCalendar();
      });

      // Day selection
      calendarDropdown.querySelectorAll('.calendar-day:not(.disabled)').forEach(day => {
        day.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const dateStr = day.getAttribute('data-date');

          // 直接从dateStr解析日期，避免时区问题
          const [year, month, dayNum] = dateStr.split('-').map(Number);
          selectedDate = new Date(year, month - 1, dayNum); // month - 1 因为月份从0开始

          dateInput.value = formatDate(selectedDate);
          dateInput.style.color = '#333';
          calendarDropdown.classList.remove('open');

          // Store the selected date value for form submission
          this.selectedDateValue = dateStr;

          // Trigger validation
          this.handleDateChange({ target: { value: dateStr } });
        });
      });
    };

    // Event listeners
    dateInput.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      calendarDropdown.classList.toggle('open');
      if (calendarDropdown.classList.contains('open')) {
        renderCalendar();
      }
    });

    calendarIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      calendarDropdown.classList.toggle('open');
      if (calendarDropdown.classList.contains('open')) {
        renderCalendar();
      }
    });

    // Prevent calendar dropdown from closing when clicking inside it
    calendarDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close calendar when clicking outside
    document.addEventListener('click', (e) => {
      const customDatePicker = dateInput.closest('.custom-date-picker');
      if (customDatePicker && !customDatePicker.contains(e.target)) {
        calendarDropdown.classList.remove('open');
      }
    });

    // Initialize with current month
    renderCalendar();
  }

  handleDateChange(e) {
    const selectedDate = e.target.value;
    if (selectedDate) {
      const date = new Date(selectedDate);
      const today = new Date();

      // Check if date is in the future
      if (date > today) {
        window.__SL_toast__.show({ type: 'info', message: 'Purchase date cannot be in the future' })
        e.target.value = '';
        return;
      }

      // Check if date is too old (more than 5 years)
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);

      if (date < fiveYearsAgo) {
        window.__SL_toast__.show({ type: 'info', message: 'Purchase date cannot be more than 5 years ago' })
        e.target.value = '';
        return;
      }
    }
  }

  // 过滤国家数据，只保留美国和加拿大（暂时限制，月底会恢复所有国家）
  filterAvailableCountries(countries) {
    if (!countries || !Array.isArray(countries)) {
      return [];
    }

    // 只保留美国和加拿大
    const availableCountryCodes = ['US', 'CA'];

    return countries.filter(country => {
      // 支持多种字段名：countryCode, id, code
      const countryCode = country.countryCode || country.id || country.code;
      return availableCountryCodes.includes(countryCode);
    });
  }

  // 通过接口加载国家数据
  async loadCountriesAndRegions() {
    try {
      // 设置API基础URL
      this.apiBaseUrl = 'https://erp-api.yarbo.ai/api/v1';


      // 获取国家列表
      const response = await fetch(`${this.apiBaseUrl}/common/countries`);


      if (response.ok) {
        const apiResponse = await response.json();

        // API返回格式: {success: true, code: '00000', data: Array(250), message: '', timestamp: xxx}
        const countries = apiResponse.data || apiResponse;

        if (countries && Array.isArray(countries) && countries.length > 0) {
          // 过滤只保留美国和加拿大
          this.countriesData = this.filterAvailableCountries(countries);
          this.populateCountrySelect();
        } else {
          this.loadDefaultCountriesData();
        }
      } else {
        const errorText = await response.text();
        this.loadDefaultCountriesData();
      }
    } catch (error) {
      this.loadDefaultCountriesData();
    }
  }

  // 默认国家数据（作为备用）- 只保留美国和加拿大
  loadDefaultCountriesData() {
    this.countriesData = [
      { id: 'US', name: 'United States' },
      { id: 'CA', name: 'Canada' }
    ];
    this.populateCountrySelect();
  }

  // 填充可搜索的国家下拉选择器
  populateCountrySelect() {
    const searchableSelect = document.querySelector('.searchable-select[data-field="country"]');

    if (!searchableSelect) {
      return;
    }

    if (!this.countriesData) {
      return;
    }


    // 初始化可搜索下拉框
    this.initSearchableDropdown(searchableSelect, this.countriesData, {
      valueField: ['countryCode', 'id'],
      textField: ['countryName', 'name'],
      noResultsText: 'No countries found',
      onSelect: (value) => {
        // 国家选择完成，州和城市现在是手动输入
        console.log(`Country selected: ${value}`);
      }
    });

  }

  // 初始化可搜索下拉框
  initSearchableDropdown(container, data, options = {}) {
    const input = container.querySelector('.searchable-input');
    const dropdown = container.querySelector('.searchable-dropdown');
    const searchInput = container.querySelector('.search-input');
    const optionsContainer = container.querySelector('.options-container');

    // 配置选项
    const config = {
      valueField: options.valueField || ['countryCode', 'id'],
      textField: options.textField || ['countryName', 'name'],
      onSelect: options.onSelect || null,
      noResultsText: options.noResultsText || 'No results found'
    };

    let selectedValue = '';
    let selectedText = '';
    let filteredData = [...data];

    // 获取字段值的辅助函数
    const getFieldValue = (item, fieldArray) => {
      for (let field of fieldArray) {
        if (item[field]) return item[field];
      }
      return '';
    };

    // 渲染选项
    const renderOptions = (options) => {
      optionsContainer.innerHTML = '';

      if (options.length === 0) {
        optionsContainer.innerHTML = `<div class="no-results">${config.noResultsText}</div>`;
        return;
      }

      options.forEach(item => {
        const value = getFieldValue(item, config.valueField);
        const text = getFieldValue(item, config.textField);

        const option = document.createElement('div');
        option.className = 'searchable-option';
        option.textContent = text;
        option.dataset.value = value;

        if (value === selectedValue) {
          option.classList.add('selected');
        }

        option.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          selectedValue = value;
          selectedText = text;
          input.value = text;
          dropdown.classList.remove('open');
          searchInput.value = '';
          filteredData = [...data];
          renderOptions(filteredData);

          // 调用回调函数
          if (config.onSelect) {
            config.onSelect(selectedValue);
          }
        });

        optionsContainer.appendChild(option);
      });
    };

    // 搜索过滤
    const filterOptions = (searchTerm) => {
      const term = searchTerm.toLowerCase();
      filteredData = data.filter(item => {
        const text = getFieldValue(item, config.textField).toLowerCase();
        const value = getFieldValue(item, config.valueField).toLowerCase();
        return text.includes(term) || value.includes(term);
      });
      renderOptions(filteredData);
    };

    // 事件绑定
    input.addEventListener('click', () => {
      dropdown.classList.toggle('open');
      if (dropdown.classList.contains('open')) {
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', (e) => {
      filterOptions(e.target.value);
    });

    // 防止下拉框内部点击事件冒泡
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 点击外部关闭下拉框
    const handleOutsideClick = (e) => {
      if (!container.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    };

    // 使用延迟添加事件监听器，避免与选项点击冲突
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);

    // 初始渲染
    renderOptions(filteredData);

    // 存储获取选中值的方法
    container.getValue = () => selectedValue;
    container.getText = () => selectedText;
    container.clearSelection = () => {
      selectedValue = '';
      selectedText = '';
      input.value = '';
      searchInput.value = '';
      filteredData = [...data];
      renderOptions(filteredData);
    };
  }

  // 清空可搜索下拉框
  clearSearchableSelect(container, placeholder) {
    if (!container) return;

    const input = container.querySelector('.searchable-input');
    const optionsContainer = container.querySelector('.options-container');

    if (input) {
      input.value = '';
      input.placeholder = placeholder;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
    }

    // 如果有clearSelection方法，调用它
    if (container.clearSelection) {
      container.clearSelection();
    }
  }

  // 移除了级联选择逻辑，州和城市现在是手动输入

  // 处理获取价格估算
  async handleGetEstimate(e) {
    e.preventDefault();

    // 验证基本信息（不包括所有必填项，只验证价格计算需要的信息）
    if (!this.validateEstimateForm()) {
      return;
    }

    // 显示加载状态
    const estimateBtn = e.target;
    const originalText = estimateBtn.textContent;
    estimateBtn.textContent = 'Getting Estimate...';
    estimateBtn.disabled = true;

    try {
      // 收集价格估算需要的数据
      const estimateData = this.collectEstimateData();

      // 调用价格估算API
      const priceData = await this.getPriceEstimate(estimateData);

      // 更新弹窗内容并显示
      this.updateModalContent(priceData);
      this.showPriceModal();

    } catch (error) {
      console.error('Price estimate error:', error);
      window.__SL_toast__.show({
        type: 'error',
        message: 'Failed to get price estimate. Please try again.'
      });
    } finally {
      // 重置按钮状态
      estimateBtn.textContent = originalText;
      estimateBtn.disabled = false;
    }
  }

  // 验证价格估算表单
  validateEstimateForm() {
    // 验证产品信息
    const productItems = document.querySelectorAll('.product-item');
    const products = [];

    for (let i = 0; i < productItems.length; i++) {
      const item = productItems[i];
      const productSelect = item.querySelector('.product-select');
      const serialInput = item.querySelector('.serial-input');

      const productName = productSelect?.value?.trim();
      const serialNumber = serialInput?.value?.trim();

      if (!productName) {
        window.__SL_toast__.show({ type: 'info', message: `Please select a product for Product ${i + 1}` });
        productSelect?.focus();
        return false;
      }

      if (!serialNumber) {
        window.__SL_toast__.show({ type: 'info', message: `Please enter the serial number for Product ${i + 1}` });
        serialInput?.focus();
        return false;
      }

      const selectedOption = this.productOptions.find(option => option.value === productName);
      const productLabel = selectedOption ? selectedOption.label : productName;

      products.push({
        productName: productLabel,
        productSerialNumber: serialNumber
      });
    }

    if (products.length === 0) {
      window.__SL_toast__.show({ type: 'info', message: 'Please add at least one product' });
      return false;
    }

    // 验证YarboCare计划
    const yarboCarePlan = document.querySelector('#yarbocare-plan-select')?.value;
    if (!yarboCarePlan) {
      window.__SL_toast__.show({ type: 'info', message: 'Please select a YarboCare™ plan' });
      document.querySelector('#yarbocare-plan-select')?.focus();
      return false;
    }

    // 验证国家信息（价格估算需要）
    const country = document.querySelector('.searchable-select[data-field="country"]')?.getValue?.();
    if (!country) {
      window.__SL_toast__.show({ type: 'info', message: 'Please select a country to get price estimate' });
      return false;
    }

    return true;
  }

  // 收集价格估算数据
  collectEstimateData() {
    // 收集产品数据
    const products = [];
    const productItems = document.querySelectorAll('.product-item');

    productItems.forEach((item) => {
      const select = item.querySelector('.product-select');
      const serial = item.querySelector('.serial-input');

      if (select?.value && serial?.value) {
        const selectedOption = this.productOptions.find(option => option.value === select.value);
        const productLabel = selectedOption ? selectedOption.label : select.value;

        products.push({
          productName: productLabel,
          productSerialNumber: serial.value.trim()
        });
      }
    });

    // 获取国家信息
    const country = document.querySelector('.searchable-select[data-field="country"]')?.getValue?.() || '';

    return {
      product_list: products.map(p => p.productName).filter(name => name),
      yarbo_care_plan: document.querySelector('#yarbocare-plan-select')?.value || '',
      country: country // 添加国家参数
    };
  }

  // 调用价格估算API
  async getPriceEstimate(estimateData) {
    try {
      // 设置API基础URL（如果还没有设置）
      if (!this.apiBaseUrl) {
        this.apiBaseUrl = 'https://erp-test-api.yarbo.ai/api/v1';
      }

      const response = await fetch(`${this.apiBaseUrl}/order/quality/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          // 转换API数据格式为内部使用的格式
          return this.transformApiResponse(result.data, estimateData);
        } else {
          throw new Error(result.message || 'Failed to get price estimate');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      // 如果API调用失败，使用本地计算作为备用
      console.warn('API call failed, using local calculation:', error);
      return this.calculateLocalPriceEstimate(estimateData);
    }
  }

  // 转换API响应数据格式
  transformApiResponse(apiData, originalEstimateData) {
    // API返回的是数组，通常第一个元素包含主要信息
    const firstItem = apiData[0] || {};

    // 从API响应中获取货币信息并设置当前货币
    // 优先使用商品货币，如果没有则使用质保货币
    const productCurrency = firstItem.productGroupCurrency;
    const warrantyCurrency = firstItem.warrantyCurrency;

    if (productCurrency) {
      this.setCurrency(productCurrency);
    } else if (warrantyCurrency) {
      this.setCurrency(warrantyCurrency);
    }

    // 保存两种货币信息供后续使用
    this.apiCurrencies = {
      productCurrency: productCurrency || 'USD',
      warrantyCurrency: warrantyCurrency || 'USD'
    };

    // 计算总产品价格
    let totalProductPrice = 0;
    apiData.forEach(item => {
      if (item.productGroupPrice) {
        totalProductPrice += item.productGroupPrice;
      }
    });

    // 计算总延保价格
    let totalWarrantyPrice = 0;
    apiData.forEach(item => {
      if (item.warrantyPrice) {
        totalWarrantyPrice += item.warrantyPrice;
      }
    });

    // 从API数据的subItems中提取产品名称
    const productNames = [];
    apiData.forEach(item => {
      if (item.subItems && Array.isArray(item.subItems)) {
        productNames.push(...item.subItems);
      }
    });

    // 创建产品对象数组，使用API返回的产品名称
    const products = productNames.map(name => ({
      productName: name
    }));

    // 转换为内部使用的数据格式
    return {
      products: products,
      totalProductPrice: totalProductPrice,
      warrantyPrice: totalWarrantyPrice,
      yarboCarePlan: originalEstimateData.yarbo_care_plan || '',
      // 保存原始API数据以备后用
      apiData: apiData,
      // 产品组信息
      productGroups: apiData.map(item => ({
        groupName: item.ProductGroupName || '',
        currency: item.productGroupCurrency || 'USD',
        price: item.productGroupPrice || 0,
        sku: item.productGroupSku || '',
        subItems: item.subItems || [],
        warrantyName: item.warrantyName || '',
        warrantyPrice: item.warrantyPrice || 0,
        warrantyProductId: item.warrantyProductId || '',
        warrantyVariantId: item.warrantyVariantId || ''
      }))
    };
  }

  // 本地价格计算（作为API的备用）
  calculateLocalPriceEstimate(estimateData) {
    console.log('=== Using Local Price Calculation (API Fallback) ===');
    console.log('Estimate Data:', estimateData);

    const products = estimateData.product_list || [];
    const selectedProducts = products.map(p => {
      const productOption = this.productOptions.find(option => option.label === p.productName);
      return productOption ? productOption.value : p.productName;
    });

    const totalProductPrice = this.getComboBasePrice(selectedProducts);
    const priceResult = this.calculateOptimalPrice(estimateData.yarbo_care_plan);
    const warrantyPrice = typeof priceResult === 'object' ? priceResult.finalPrice : 0;

    return {
      products: products,
      totalProductPrice: totalProductPrice,
      warrantyPrice: warrantyPrice,
      yarboCarePlan: estimateData.yarbo_care_plan,
      country: estimateData.country // 保留国家信息
    };
  }

  // 更新弹窗内容
  updateModalContent(priceData) {
    // 更新产品信息
    const modalProductEl = document.getElementById('modal-selected-product');
    if (modalProductEl && priceData.products) {
      // 直接显示所有产品名称，用逗号分隔
      const productNames = priceData.products.map(p => p.productName);
      const displayText = productNames.join(', ');

      modalProductEl.textContent = displayText;

      // 添加完整列表的tooltip（当文本被截断时有用）
      modalProductEl.title = displayText;
    }

    // 更新总产品价格
    const modalTotalPriceEl = document.getElementById('modal-total-product-price');
    if (modalTotalPriceEl) {
      const amount = priceData.totalProductPrice || 0;
      modalTotalPriceEl.textContent = this.formatProductPrice(amount);
      modalTotalPriceEl.dataset.amount = amount; // 保存原始金额用于货币切换
      modalTotalPriceEl.dataset.priceType = 'product'; // 保存价格类型
    }

    // 更新覆盖期间
    const modalCoveragePeriodEl = document.getElementById('modal-coverage-period');
    if (modalCoveragePeriodEl) {
      const planDetails = this.getPlanDetails(priceData.yarboCarePlan);
      modalCoveragePeriodEl.textContent = planDetails.period;
    }

    // 更新延保价格
    const modalWarrantyPriceEl = document.getElementById('modal-warranty-price');
    if (modalWarrantyPriceEl) {
      const amount = priceData.warrantyPrice || 0;
      modalWarrantyPriceEl.textContent = this.formatWarrantyPrice(amount);
      modalWarrantyPriceEl.dataset.amount = amount; // 保存原始金额用于货币切换
      modalWarrantyPriceEl.dataset.priceType = 'warranty'; // 保存价格类型
    }
  }

  // 显示价格弹窗
  showPriceModal() {
    const modalOverlay = document.getElementById('price-modal-overlay');
    if (modalOverlay) {
      modalOverlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  // 关闭价格弹窗
  closePriceModal() {
    const modalOverlay = document.getElementById('price-modal-overlay');
    if (modalOverlay) {
      modalOverlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  validateForm() {
    // 验证文件上传
    if (!this.uploadedFile || !this.uploadedFileObjectKey) {
      window.__SL_toast__.show({ type: 'info', message: 'Please upload a receipt or invoice file' })
      return false;
    }

    // 验证发票号码
    const invoiceNumber = document.querySelector('input[placeholder="Enter your invoice number"]')?.value?.trim();
    if (!invoiceNumber) {
      window.__SL_toast__.show({ type: 'info', message: 'Please enter your invoice number' })
      document.querySelector('input[placeholder="Enter your invoice number"]')?.focus();
      return false;
    }

    // 验证邮箱
    const emailInput = document.querySelector('input[type="email"]');
    const email = emailInput?.value?.trim();
    if (!email) {
      window.__SL_toast__.show({ type: 'info', message: 'Please enter your email address' })
      emailInput?.focus();
      return false;
    }

    // 验证邮箱格式
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      window.__SL_toast__.show({ type: 'info', message: 'Please enter a valid email address' })
      emailInput?.focus();
      return false;
    }

    // 验证国家
    const country = document.querySelector('.searchable-select[data-field="country"]')?.getValue?.();
    if (!country) {
      window.__SL_toast__.show({ type: 'info', message: 'Please select a country' })
      return false;
    }

    // 省份/地区和城市现在是可选的，不需要验证

    // 验证购买日期
    const purchaseDate = this.dateInput?.value || document.querySelector('.date-display')?.value;
    if (!purchaseDate) {
      window.__SL_toast__.show({ type: 'info', message: 'Please select your purchase date' })
      this.dateInput?.focus() || document.querySelector('.date-display')?.focus();
      return false;
    }

    // 验证YarboCare计划
    const yarboCarePlan = document.querySelector('#yarbocare-plan-select')?.value;
    if (!yarboCarePlan) {
      window.__SL_toast__.show({ type: 'info', message: 'Please select a YarboCare™ plan' })
      document.querySelector('#yarbocare-plan-select')?.focus();
      return false;
    }

    // 验证产品信息
    const productItems = document.querySelectorAll('.product-item');
    const products = [];

    for (let i = 0; i < productItems.length; i++) {
      const item = productItems[i];
      const productSelect = item.querySelector('.product-select');
      const serialInput = item.querySelector('.serial-input');

      const productName = productSelect?.value?.trim();
      const serialNumber = serialInput?.value?.trim();

      if (!productName) {
        window.__SL_toast__.show({ type: 'info', message: `Please select a product for Product ${i + 1}` })
        productSelect?.focus();
        return false;
      }

      if (!serialNumber) {
        window.__SL_toast__.show({ type: 'info', message: `Please enter the serial number for Product ${i + 1}` })
        serialInput?.focus();
        return false;
      }

      // 根据value找到对应的label用于验证
      const selectedOption = this.productOptions.find(option => option.value === productName);
      const productLabel = selectedOption ? selectedOption.label : productName;

      products.push({
        productName: productLabel,
        productSerialNumber: serialNumber
      });
    }

    if (products.length === 0) {
      window.__SL_toast__.show({ type: 'info', message: 'Please add at least one product' })
      return false;
    }

    return true;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    // Show loading state
    const submitBtn = e.target;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      // Collect form data
      const formData = await this.collectFormData();

      // Submit to API
      const response = await fetch(`${this.apiBaseUrl}/order/quality/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 先关闭价格弹窗
          this.closePriceModal();
          // 然后显示成功弹窗
          this.showSuccessMessage();
        } else {
          window.__SL_toast__.show({ type: 'error', message: result.message })
        }
      } else {
        const errorData = await response.json().catch(() => ({}));

        const errorMessage = errorData.message || `Server error: ${response.status} ${response.statusText}`;
        window.__SL_toast__.show({ type: 'error', message: errorMessage })

      }
    } catch (error) {
      window.__SL_toast__.show({ type: 'error', message: 'Network error occurred. Please check your connection and try again.' })
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  async collectFormData() {
    // 收集产品数据
    const products = [];
    const productItems = document.querySelectorAll('.product-item');

    productItems.forEach((item) => {
      const select = item.querySelector('.product-select');
      const serial = item.querySelector('.serial-input');

      if (select?.value && serial?.value) {
        // 根据value找到对应的label
        const selectedOption = this.productOptions.find(option => option.value === select.value);
        const productLabel = selectedOption ? selectedOption.label : select.value;

        products.push({
          productName: productLabel,
          productSerialNumber: serial.value.trim()
        });
      }
    });

    // 计算产品总价
    const productTotalPrice = this.calculateTotalProductPrice(products);

    // 计算延保价格
    const selectedPlan = document.querySelector('#yarbocare-plan-select')?.value || '';
    let productPrice = 0;
    if (selectedPlan) {
      const priceResult = this.calculateOptimalPrice(selectedPlan);
      productPrice = typeof priceResult === 'object' ? priceResult.finalPrice : 0;
    }

    // 转换购买日期为零时区格式
    const purchaseDateDisplay = this.dateInput?.value || document.querySelector('.date-display')?.value;
    let purchaseDateUtc = '';
    if (purchaseDateDisplay && this.selectedDateValue) {
      purchaseDateUtc = this.selectedDateValue + 'T00:00:00';
    }

    // 获取已上传文件的objectKey
    let receiptInvoiceFile = '';
    if (this.uploadedFileObjectKey) {
      receiptInvoiceFile = this.uploadedFileObjectKey;
    } else {
    }

    const data = {
      city: document.querySelector('#city-input')?.value?.trim() || '',
      country: document.querySelector('.searchable-select[data-field="country"]')?.getValue?.() || '',
      emailAddress: document.querySelector('input[type="email"]')?.value?.trim() || '',
      productPrice: productPrice,
      productTotalPrice: productTotalPrice,
      products: products,
      purchaseDateUtc: purchaseDateUtc,
      receiptInvoiceFile: receiptInvoiceFile, // S3 objectKey
      receiptInvoiceFileNumber: document.querySelector('input[placeholder="Enter your invoice number"]')?.value?.trim() || '',
      region: document.querySelector('#state-province-input')?.value?.trim() || '',
      yarboCarePlan: document.querySelector('#yarbocare-plan-select')?.value || ''
    };


    return data;
  }

  // 计算产品总价
  calculateTotalProductPrice(products) {
    // 需要将label转换回value来计算价格
    const selectedProducts = products.map(p => {
      // 根据productName(label)找到对应的value
      const productOption = this.productOptions.find(option => option.label === p.productName);
      return productOption ? productOption.value : p.productName;
    });
    return this.getComboBasePrice(selectedProducts);
  }


  // 上传文件到S3存储
  async uploadToS3(presignedUrl, file, params) {
    try {
      const formData = new FormData();
      // 添加预签名参数
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // 添加文件（必须最后添加）
      formData.append('file', file);

      const response = await fetch(presignedUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload to S3 failed');
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  // 初始化货币映射表
  initializeCurrencyMapping() {
    this.currencyMap = {
      'USD': { symbol: '$', name: '美元', country: '美国' },
      'EUR': { symbol: '€', name: '欧元', country: '欧元区（如德国、法国、意大利等）' },
      'CAD': { symbol: 'C$', name: '加拿大元', country: '加拿大' },
      'GBP': { symbol: '£', name: '英镑', country: '英国（英格兰、苏格兰等）' },
      'CNY': { symbol: '¥', name: '人民币（元）', country: '中国' },
      'JPY': { symbol: '¥', name: '日元', country: '日本（注：与人民币符号相同，需结合语境区分）' },
      'AUD': { symbol: 'A$', name: '澳大利亚元', country: '澳大利亚' },
      'HKD': { symbol: 'HK$', name: '港元', country: '中国香港特别行政区' },
      'SEK': { symbol: 'kr', name: '瑞典克朗', country: '瑞典' }
    };

    // 默认货币设置
    this.currentCurrency = 'USD';
  }

  // 格式化价格显示
  formatPrice(amount, currencyCode = null, priceType = null) {
    let currency = currencyCode;

    // 如果没有指定货币，根据价格类型使用对应的API货币
    if (!currency) {
      if (priceType === 'product' && this.apiCurrencies?.productCurrency) {
        currency = this.apiCurrencies.productCurrency;
      } else if (priceType === 'warranty' && this.apiCurrencies?.warrantyCurrency) {
        currency = this.apiCurrencies.warrantyCurrency;
      } else {
        currency = this.currentCurrency || 'USD';
      }
    }

    const currencyInfo = this.currencyMap[currency] || this.currencyMap['USD'];

    if (amount === 0 || amount === null || amount === undefined) {
      return `${currencyInfo.symbol}0.00`;
    }

    return `${currencyInfo.symbol}${parseFloat(amount).toFixed(2)}`;
  }

  // 格式化商品价格
  formatProductPrice(amount, currencyCode = null) {
    return this.formatPrice(amount, currencyCode, 'product');
  }

  // 格式化质保价格
  formatWarrantyPrice(amount, currencyCode = null) {
    return this.formatPrice(amount, currencyCode, 'warranty');
  }

  // 获取货币信息
  getCurrencyInfo(currencyCode = null) {
    const currency = currencyCode || this.currentCurrency || 'USD';
    return this.currencyMap[currency] || this.currencyMap['USD'];
  }

  // 设置当前货币（仅用于API响应处理）
  setCurrency(currencyCode) {
    if (this.currencyMap[currencyCode]) {
      this.currentCurrency = currencyCode;
      console.log(`Currency automatically set to: ${currencyCode}`);
    }
  }

  // 初始化报价跟踪功能
  initializeQuoteTracking() {
    // 监听产品选择变化
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('product-select')) {
        this.updateQuoteDisplay();
      }
    });

    // 监听延保计划选择变化
    const yarboCareSelect = document.getElementById('yarbocare-plan-select');
    if (yarboCareSelect) {
      yarboCareSelect.addEventListener('change', () => {
        this.updateQuoteDisplay();
        // 直接更新Coverage Summary
        this.updateCoverageSummary(yarboCareSelect.value);
      });
    }

  }

  // 更新报价展示
  updateQuoteDisplay() {
    // 获取所有选中的产品
    const selectedProducts = this.getAllSelectedProducts();
    const selectedPlan = this.getSelectedPlan();

    // 只要有产品选择就更新显示
    if (selectedProducts.length > 0) {
      this.updateQuoteContent(selectedProducts, selectedPlan);
    } else {
      this.resetQuoteContent();
    }
  }

  // 获取选中的产品
  getSelectedProduct() {
    const productSelect = document.querySelector('#initial-product-select');
    if (productSelect && productSelect.value) {
      const selectedOption = this.productOptions.find(option => option.value === productSelect.value);
      return selectedOption ? selectedOption.label : null;
    }
    return null;
  }

  // 获取选中的延保计划
  getSelectedPlan() {
    const planSelect = document.getElementById('yarbocare-plan-select');
    if (planSelect && planSelect.value) {
      return {
        value: planSelect.value,
        text: planSelect.options[planSelect.selectedIndex].text
      };
    }
    return null;
  }

  // 更新报价内容
  updateQuoteContent(selectedProducts, plan) {
    const selectedProductEl = document.getElementById('selected-product');
    const totalProductPriceEl = document.getElementById('total-product-price');
    const coveragePeriodEl = document.getElementById('coverage-period');
    const quotePriceEl = document.getElementById('quote-price');
    const planTitleEl = document.getElementById('plan-title');

    if (selectedProductEl && totalProductPriceEl && coveragePeriodEl && quotePriceEl && planTitleEl) {
      // 更新产品名称 - 限制显示数量，使用省略号
      const productLabels = selectedProducts.map(productValue =>
        this.productOptions.find(p => p.value === productValue)?.label || productValue
      );

      const fullText = productLabels.join(', ');

      if (productLabels.length <= 4) {
        // 5个或以下产品，全部显示
        selectedProductEl.textContent = fullText;
        selectedProductEl.removeAttribute('title'); // 清除tooltip
      } else {
        // 5个以上产品，显示前4个 + 省略号
        const displayText = `${productLabels.slice(0, 4).join(', ')}...`;
        selectedProductEl.textContent = displayText;
        selectedProductEl.title = fullText; // 鼠标悬浮显示完整列表
      }

      // 更新商品总价 - 获取组合基础价格
      const comboBasePrice = this.getComboBasePrice(selectedProducts);
      totalProductPriceEl.textContent = this.formatProductPrice(comboBasePrice);

      // 更新覆盖期间
      if (plan && plan.value) {
        const planDetails = this.getPlanDetails(plan.value);
        coveragePeriodEl.textContent = planDetails.period;
        planTitleEl.textContent = planDetails.title;

        // 更新延保价格
        quotePriceEl.textContent = this.calculatePrice(plan.value);

        // 更新计划特性
        this.updatePlanFeatures(plan.value);
      } else {
        // 如果没有选择计划，显示默认值
        coveragePeriodEl.textContent = 'Select a plan';
        quotePriceEl.textContent = 'Select a plan to see warranty price';
        planTitleEl.textContent = 'Extended Warranty Plan';

        // 显示默认计划特性
        this.updatePlanFeatures('1_Year');
      }
    }
  }

  // 重置报价内容为默认值
  resetQuoteContent() {
    const selectedProductEl = document.getElementById('selected-product');
    const totalProductPriceEl = document.getElementById('total-product-price');
    const coveragePeriodEl = document.getElementById('coverage-period');
    const quotePriceEl = document.getElementById('quote-price');
    const planTitleEl = document.getElementById('plan-title');

    if (selectedProductEl && totalProductPriceEl && coveragePeriodEl && quotePriceEl && planTitleEl) {
      // 重置为默认值
      selectedProductEl.textContent = '-';
      totalProductPriceEl.textContent = this.formatProductPrice(0);
      coveragePeriodEl.textContent = '-';
      quotePriceEl.textContent = this.formatWarrantyPrice(0);
      planTitleEl.textContent = '3 Years EW';

      // 重置计划特性为默认
      this.updatePlanFeatures('1_Year');
    }
  }

  // 获取计划详情
  getPlanDetails(planValue) {
    const planMap = {
      '1_Year': {
        period: '3 Years EW',
        title: '3 Years EW'
      },
      '3_Years': {
        period: '1 Year AD + 3 Years EW',
        title: '1 Year AD + 3 Years EW'
      },
      '5_Years': {
        period: '3 Years AD + 3 Years EW',
        title: '3 Years AD + 3 Years EW'
      }
    };
    return planMap[planValue] || { period: '[1 Year]', title: '1-Year Plan' };
  }

  // 计算最优组合价格
  calculateOptimalPrice(planValue) {
    // 获取所有选中的产品
    const selectedProducts = this.getAllSelectedProducts();

    if (selectedProducts.length === 0) {
      return this.formatWarrantyPrice(0);
    }

    // 获取产品组合的基础价格
    const comboBasePrice = this.getComboBasePrice(selectedProducts);

    // 计算延保价格
    const warrantyPercentage = this.warrantyPercentages[planValue];
    let totalWarrantyPrice = 0;

    if (comboBasePrice && warrantyPercentage) {
      // 保留完整的计算精度，不四舍五入百分比
      totalWarrantyPrice = comboBasePrice * warrantyPercentage;
    }

    // 延保价格就是最终价格（组合优惠已经体现在基础价格中）
    const finalPrice = totalWarrantyPrice;

    // 返回格式化的价格信息，保留两位小数
    const result = {
      comboBasePrice: comboBasePrice,
      warrantyPrice: totalWarrantyPrice,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      formattedPrice: this.formatWarrantyPrice(finalPrice),
      breakdown: this.getProductPriceBreakdown(planValue)
    };
    return result;
  }

  // 获取所有选中的产品
  getAllSelectedProducts() {
    const selectedProducts = [];
    const productItems = document.querySelectorAll('.product-item');

    productItems.forEach(item => {
      const select = item.querySelector('.product-select');
      if (select && select.value) {
        selectedProducts.push(select.value);
      }
    });

    return selectedProducts;
  }

  // 智能组合算法 - 形成最优组合
  createOptimalCombos(selectedProducts) {
    if (selectedProducts.length === 0) {
      return [];
    }

    const combos = [];
    const remaining = [...selectedProducts];

    // 1. 如果含 Core → 优先形成 "Core + 多个头的最大可能组合"
    const cores = remaining.filter(p => this.moduleTypes.core.includes(p));

    cores.forEach(core => {
      // 移除已处理的Core
      const coreIndex = remaining.indexOf(core);
      if (coreIndex > -1) remaining.splice(coreIndex, 1);

      // 收集可以与Core组合的模块
      const availableModules = [];

      // 3. 如果有 Pro → 优先把 Pro 放进组合里
      const proModule = remaining.find(p => p === 'yarbo-m1-pro');
      if (proModule) {
        availableModules.push(proModule);
        remaining.splice(remaining.indexOf(proModule), 1);
      }

      // 添加其他模块（优先级：S1 > M1 > B1 > T1）
      const modulesPriority = ['yarbo-s1', 'yarbo-m1', 'yarbo-b1', 'yarbo-t1'];
      modulesPriority.forEach(module => {
        const moduleIndex = remaining.indexOf(module);
        if (moduleIndex > -1) {
          availableModules.push(module);
          remaining.splice(moduleIndex, 1);
        }
      });

      // 形成Core组合
      if (availableModules.length > 0) {
        combos.push([core, ...availableModules]);
      } else {
        combos.push([core]);
      }
    });

    // 4. 剩余模块 → 再看能否组合（S+M / S+B / M+B），否则单买
    this.formModuleCombos(remaining, combos);

    return combos;
  }

  // 形成模块组合
  formModuleCombos(remainingModules, combos) {
    const modules = [...remainingModules];

    // 定义模块组合优先级
    const moduleComboPatterns = [
      ['yarbo-m1-pro', 'yarbo-s1'],  // Pro + Snow
      ['yarbo-m1', 'yarbo-s1'],      // Mower + Snow
      ['yarbo-s1', 'yarbo-b1'],      // Snow + Blower
      ['yarbo-m1', 'yarbo-b1'],      // Mower + Blower
      ['yarbo-m1-pro', 'yarbo-b1'],  // Pro + Blower
    ];

    // 尝试形成双模块组合
    for (let pattern of moduleComboPatterns) {
      const [module1, module2] = pattern;
      const index1 = modules.indexOf(module1);
      const index2 = modules.indexOf(module2);

      if (index1 > -1 && index2 > -1) {
        combos.push([module1, module2]);
        modules.splice(Math.max(index1, index2), 1);
        modules.splice(Math.min(index1, index2), 1);
        break; // 只形成一个组合，避免重复
      }
    }

    // 剩余的单独处理
    modules.forEach(module => {
      combos.push([module]);
    });
  }

  // 获取产品组合的基础价格
  getComboBasePrice(selectedProducts) {
    if (selectedProducts.length === 0) {
      return 0;
    }

    // 如果只有一个产品，返回单产品价格
    if (selectedProducts.length === 1) {
      return this.singleProductPrices[selectedProducts[0]] || 0;
    }

    // 创建组合键（按字母顺序排序以确保一致性）
    const sortedProducts = [...selectedProducts].sort();
    const comboKey = sortedProducts.join(',');

    // 首先查找精确匹配的组合价格
    if (this.comboPrices[comboKey]) {
      return this.comboPrices[comboKey];
    }

    // 如果没有找到组合价格，回退到单产品价格之和
    let totalPrice = 0;
    selectedProducts.forEach(product => {
      totalPrice += this.singleProductPrices[product] || 0;
    });

    return totalPrice;
  }

  // 数组比较辅助方法
  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  // 获取产品价格详情（用于调试和展示）
  getProductPriceBreakdown(planValue) {
    const selectedProducts = this.getAllSelectedProducts();
    const comboBasePrice = this.getComboBasePrice(selectedProducts);
    const warrantyPercentage = this.warrantyPercentages[planValue];

    // 创建产品标签列表
    const productLabels = selectedProducts.map(productValue =>
      this.productOptions.find(p => p.value === productValue)?.label || productValue
    );

    // 创建组合键
    const comboKey = selectedProducts.sort().join(',');

    // 判断是否有组合价格
    const hasComboPrice = selectedProducts.length > 1 && this.comboPrices[comboKey];

    const breakdown = {
      selectedProducts: productLabels,
      comboKey: comboKey,
      comboType: selectedProducts.length === 1 ? 'Single Product' : (hasComboPrice ? 'Product Combo' : 'Individual Sum'),
      comboBasePrice: parseFloat(comboBasePrice.toFixed(2)),
      warrantyPercentage: parseFloat((warrantyPercentage * 100).toFixed(2)),
      warrantyPrice: parseFloat((comboBasePrice * warrantyPercentage).toFixed(2)),
      hasComboDiscount: hasComboPrice
    };

    return breakdown;
  }

  // 向后兼容的价格计算方法
  calculatePrice(planValue) {
    const priceResult = this.calculateOptimalPrice(planValue);
    return typeof priceResult === 'object' ? priceResult.formattedPrice : priceResult;
  }

  // 更新Coverage Summary部分
  updateCoverageSummary(planValue) {
    const planTitleEl = document.getElementById('plan-title');
    const planFeaturesEl = document.querySelector('.plan-features');

    if (planTitleEl || planFeaturesEl) {
      const planDetails = this.getPlanDetails(planValue);
      const features = this.getPlanFeatures(planValue);

      // 更新计划标题
      if (planTitleEl) {
        planTitleEl.textContent = planDetails.title;
      }

      // 更新计划特性
      if (planFeaturesEl) {
        planFeaturesEl.innerHTML = features.map(feature => `<li>${feature}</li>`).join('');
      }
    }
  }

  // 获取计划特性
  getPlanFeatures(planValue) {
    const featuresMap = {
      '1_Year': [
        'Extended warranty: 3 additional years after the standard 2-year warranty, extending all original warranty coverage.',
        'Covers malfunctions during normal use.',
        'Waiver of repair, labor and service charges.',
        'Free two-way shipping and official technical support.'
      ],
      '3_Years': [
        'Accidental damage protection: 1 year, covering damage caused by unexpected events during normal use.',
        'Extended warranty: 3 additional years after the standard 2-year warranty, extending all original warranty coverage.',
        'Covers malfunctions during normal use.',
        'Waiver of repair, labor, and service charges.',
        'Free two-way shipping and official technical support.'
      ],
      '5_Years': [
        'Accidental damage protection: 3 years, covering damage caused by unexpected events during normal use.',
        'Extended warranty: 3 additional years after the standard 2-year warranty, extending all original warranty coverage.',
        'Covers malfunctions during normal use.',
        'Waiver of repair, labor, and service charges.',
        'Free two-way shipping and official technical support.'
      ]
    };

    return featuresMap[planValue] || featuresMap['1_Year'];
  }

  // 更新计划特性（保持向后兼容）
  updatePlanFeatures(planValue) {
    const planFeaturesEl = document.querySelector('.plan-features');
    if (planFeaturesEl) {
      const features = this.getPlanFeatures(planValue);
      planFeaturesEl.innerHTML = features.map(feature => `<li>${feature}</li>`).join('');
    }
  }

  showSuccessMessage() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'success-modal-overlay';

    // 创建弹窗内容
    const modal = document.createElement('div');
    modal.className = 'success-modal';

    // 添加背景装饰
    const backgroundDecor = document.createElement('div');
    backgroundDecor.className = 'success-modal-background';

    // 成功图标
    const successIcon = document.createElement('div');
    successIcon.className = 'success-modal-icon';

    const checkIcon = document.createElement('svg');
    checkIcon.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20,6 9,17 4,12"></polyline>
    </svg>
  `;
    successIcon.appendChild(checkIcon);

    // 成功标题
    const successTitle = document.createElement('h2');
    successTitle.className = 'success-modal-title';
    successTitle.textContent = 'Application Submitted Successfully!';

    // 成功消息
    const successMessage = document.createElement('p');
    successMessage.className = 'success-modal-message';
    successMessage.textContent = 'Thank you for your application. We will contact you soon with your extended warranty details.';

    // 倒计时消息
    const countdownMessage = document.createElement('div');
    countdownMessage.className = 'success-modal-countdown';

    // 组装弹窗内容
    modal.appendChild(backgroundDecor);
    modal.appendChild(successIcon);
    modal.appendChild(successTitle);
    modal.appendChild(successMessage);
    modal.appendChild(countdownMessage);

    // 将弹窗添加到遮罩层
    overlay.appendChild(modal);

    // 添加到页面
    document.body.appendChild(overlay);

    // 阻止页面滚动
    document.body.style.overflow = 'hidden';

    // 显示弹窗动画
    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1) translateY(0)';
    }, 50);

    // 开始5秒倒计时
    let countdown = 5;
    const updateCountdown = () => {
      countdownMessage.textContent = `Redirecting to official website in ${countdown} seconds...`;

      countdown--;

      if (countdown <= 0) {
        // 显示跳转中状态
        countdownMessage.textContent = 'Redirecting...';

        // 跳转到官网
        window.location.href = '/';

        // 延迟关闭弹窗和恢复滚动，确保跳转有足够时间
        setTimeout(() => {
          overlay.style.opacity = '0';
          modal.style.transform = 'scale(0.9) translateY(-30px)';
          document.body.style.overflow = '';

          // 再延迟一点移除弹窗
          setTimeout(() => {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
          }, 1000);
        }, 500);
      } else {
        setTimeout(updateCountdown, 1000);
      }
    };
    updateCountdown();
  }

  resetForm() {
    // Reset all form inputs
    document.querySelectorAll('.form-input, .form-select').forEach(input => {
      input.value = '';
    });

    // Reset state and city inputs specifically
    const stateInput = document.querySelector('#state-province-input');
    const cityInput = document.querySelector('#city-input');
    if (stateInput) stateInput.value = '';
    if (cityInput) cityInput.value = '';

    // Reset custom date picker
    if (this.dateInput) {
      this.dateInput.value = '';
      this.dateInput.style.color = '#999';
      this.selectedDateValue = null;
    }

    // Clear uploaded file
    this.uploadedFile = null;
    this.uploadedFileObjectKey = null;
    document.querySelector('.file-upload-row').innerHTML = '';

    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.value = '';
    }

    // Reset to only first product
    const productsContainer = document.querySelector('.products-container');
    const extraProducts = productsContainer.querySelectorAll('.product-item:nth-child(n+2)');
    extraProducts.forEach(item => item.remove());

    // Update numbering
    this.updateProductNumbers();

    // 重置报价内容
    this.resetQuoteContent();

    // Reset currency to USD
    this.currentCurrency = 'USD';
    this.apiCurrencies = null;
  }
}

// Initialize the form when DOM is loaded
let extendedWarrantyForm;
document.addEventListener('DOMContentLoaded', () => {
  extendedWarrantyForm = new ExtendedWarrantyForm();
});
