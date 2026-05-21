if (!window.__SL_toast__) {
  /**
   * Toast 通知工具
   * 提供简单的消息提示功能
   */
  class Toast {
    constructor() {
      this.defaultDuration = 5000; // 默认显示时间 5 秒
    }

    /**
     * 创建并显示 toast 元素
     * @param {Object} options - 配置选项
     * @param {string} options.message - 显示的消息
     * @param {string} options.type - toast 类型 (error, success, info)
     * @param {number} options.duration - 显示时间(毫秒)
     */
    show(options) {
      const { message, type = 'info', duration = this.defaultDuration } = options;

      // 创建 toast 元素
      const toast = document.createElement('div');
      toast.className = `toast-container toast-${type}`;

      // 创建图标
      const iconSpan = document.createElement('span');
      iconSpan.className = `toast-icon ${type}-icon`;
      toast.appendChild(iconSpan);

      // 添加消息
      toast.appendChild(document.createTextNode(message));

      // 添加到页面
      document.body.appendChild(toast);

      // 设置定时器移除 toast
      setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, duration);
    }

    /**
     * 显示错误消息
     * @param {Object} options - 配置选项
     * @param {string} options.message - 错误消息
     * @param {number} options.duration - 显示时间(毫秒)
     */
    error(options) {
      this.show({ ...options, type: 'error' });
    }

    /**
     * 显示成功消息
     * @param {Object} options - 配置选项
     * @param {string} options.message - 成功消息
     * @param {number} options.duration - 显示时间(毫秒)
     */
    success(options) {
      this.show({ ...options, type: 'success' });
    }

    /**
     * 显示信息消息
     * @param {Object} options - 配置选项
     * @param {string} options.message - 信息消息
     * @param {number} options.duration - 显示时间(毫秒)
     */
    info(options) {
      this.show({ ...options, type: 'info' });
    }

  }

  // 创建全局 toast 实例
  window.__SL_toast__ = new Toast();
}
