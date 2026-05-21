if (!customElements.get('preview-grid')) {
  class PreviewGrid extends HTMLElement {
    /** @type {HTMLElement} */
    #root = null;

    /**
     * @type {Map<string, { thumbnail: string, videoUrl: string, width?: number, height?: number }>}
     * key: 视频URL (作为唯一标识)
     * value: { thumbnail: 视频第一帧的base64缩略图, videoUrl: 视频URL, width: 视频宽度, height: 视频高度 }
     */
    #items = new Map();

    get root() {
      if (this.#root) {
        return this.#root;
      }

      this.#root = document.createElement('div');
      this.#root.classList.add('preview-grid-container');
      this.appendChild(this.#root);
      return this.#root;
    }

    get value() {
      return Array.from(this.#items.keys());
    }

    /**
     * @param {string} id
     * @return {HTMLImageElement}
     */
    #getImage(id) {
      return this.querySelector(`[data-id="v-${id}"]`);
    }

    update(id, process) {
      const image = this.#getImage(id);
      if (!image) {
        return;
      }

      if (parseInt(process) >= 100) {
        image.removeAttribute('data-process');
        return;
      }

      image.dataset.process = Number(process).toFixed(2);
    }

    remove(id) {
      const image = this.#getImage(id);
      if (!image) {
        return;
      }

      image.parentElement.removeChild(image);
      const data = this.#items.get(id);
      // 如果是 base64 缩略图，不需要 revokeObjectURL
      // 只有 ObjectURL 才需要 revoke
      this.#items.delete(id);
    }

    /**
     * 添加视频预览项
     * @param {string} videoUrl - 视频URL（作为唯一标识）
     * @param {string} thumbnail - 视频第一帧的base64缩略图
     * @param {number} width - 视频宽度
     * @param {number} height - 视频高度
     */
    push(videoUrl, thumbnail, width, height) {
      if (this.#items.has(videoUrl)) {
        return;
      }

      const node = document.createElement('div');
      node.classList.add('preview-grid-item');
      node.dataset.id = `v-${videoUrl}`;

      // 使用视频第一帧作为封面图
      const image = document.createElement('img');
      image.src = thumbnail; // thumbnail 是视频第一帧的base64图片
      image.alt = '';

      node.append(image);
      this.root.appendChild(node);
      // 保存缩略图和视频信息
      this.#items.set(videoUrl, { thumbnail, videoUrl, width, height });
    }

    /**
     * 获取指定视频的尺寸信息
     * @param {string} id - 视频的 URL 或 ID
     * @returns {{width: number, height: number} | null}
     */
    getDimensions(id) {
      const item = this.#items.get(id);
      if (item && item.width && item.height) {
        return {
          width: item.width,
          height: item.height,
        };
      }
      return null;
    }

    /**
     * 获取第一个视频的尺寸信息
     * @returns {{width: number, height: number} | null}
     */
    getFirstVideoDimensions() {
      for (const [id, item] of this.#items) {
        if (item.width && item.height) {
          return {
            width: item.width,
            height: item.height,
          };
        }
      }
      return null;
    }
  }

  customElements.define('preview-grid', PreviewGrid);
}
