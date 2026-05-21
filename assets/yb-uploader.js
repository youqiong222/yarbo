if (!customElements.get('file-uploader')) {
  class FileUploader extends HTMLElement {
    static TOKEN_URL = 'https://4zx17x5q7l.execute-api.us-east-1.amazonaws.com/Stage/yarbo/common/presignedUrlMultiple';
    static BUCKET = 'ugc-upload';
    static FOLDER_IMAGE = 'photo';
    static FOLDER_VIDEO = 'video';
    static allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    connectedCallback() {
      requestAnimationFrame(() => {
        this.html = this.innerHTML;
        this.setupEvent();
      });
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.#handleOpen);
      this.removeEventListener('click', this.#handleClose);
      this.removeEventListener('click', this.#videoUploadTypeChange);
    }

    #handleOpen(event) {
      if (this.classList.contains('open')) {
        return;
      }

      const control = event.target.closest('[data-role="control"]');
      if (!control) {
        return;
      }

      const role = control.dataset.show;
      this.dataset.target = role;
      this.classList.add('open');
    }

    #handleClose(event) {
      if (!this.classList.contains('open')) {
        return;
      }

      const control = event.target.closest('[data-role="close"]');
      if (!control) {
        return;
      }

      this.dataset.target = '';
      this.innerHTML = this.html;
      this.classList.remove('open');
    }

    #updateVideoUploadType(type) {
      const videoUrlform = this.querySelector('.video-form');
      const videoPreview = this.querySelector('.video-preview');
      if (type === 'file') {
        videoUrlform.classList.remove('active');
        videoPreview.classList.add('active');
      }
      if (type === 'url') {
        videoUrlform.classList.add('active');
        videoPreview.classList.remove('active');
      }
    }

    #videoUploadTypeChange(event) {
      if (event.target.closest('.video-url-button')) {
        this.#updateVideoUploadType('url');
      }
    }

    #getImageThumbnail(file) {
      if (file) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const objectURL = URL.createObjectURL(file);
          img.src = objectURL;

          img.onload = () => {
            resolve({
              thumbnail: objectURL,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };

          img.onerror = () => {
            URL.revokeObjectURL(objectURL);
            reject('Failed to load image');
          };
        });
      }

      return Promise.reject('');
    }

    #getVideoThumbnail(file) {
      if (file) {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          const objectURL = URL.createObjectURL(file);
          video.src = objectURL;
          video.preload = 'metadata';
          video.muted = true; // 静音以确保可以自动播放

          // 使用第一帧（currentTime = 0）作为封面
          video.addEventListener('loadedmetadata', function () {
            // 尝试获取第一帧（currentTime = 0）
            video.currentTime = 0;

            video.addEventListener(
              'seeked',
              function () {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataURL = canvas.toDataURL('image/jpeg', 0.9); // 使用较高的质量

                // 返回缩略图和尺寸信息
                resolve({
                  thumbnail: dataURL,
                  width: video.videoWidth,
                  height: video.videoHeight,
                });
                URL.revokeObjectURL(objectURL);
              },
              { once: true },
            ); // 只执行一次

            // 如果第一帧加载失败，尝试第0.1秒的帧作为备选
            video.addEventListener('error', function () {
              video.currentTime = 0.1;
            });
          });

          video.onerror = () => {
            URL.revokeObjectURL(objectURL);
            reject('Failed to load video');
          };
        });
      }
      return Promise.reject('');
    }

    async #handleUpload(event) {
      const fileInput = event.target.closest('[type="file"]');
      if (!fileInput || !fileInput.files || !fileInput.files.length) return;
      const files = Array.from(fileInput.files);
      fileInput.value = null;
      const list = files
        .map((file) => ({
          file,
          progress: 0,
          type: file.type.match(/image\/(.*)/) ? 'image' : file.type.match(/video\/(.*)/) ? 'video' : null,
          thumbnail: null,
          url: null,
          width: null,
          height: null,
        }))
        .filter(({ type }) => type);
      if (!list.length) return;
      for (const item of list) {
        if (item.type === 'image') {
          const maxSize = 5 * 1024 * 1024;
          if (!FileUploader.allowedTypes.includes(item.file.type)) {
            window.__SL_toast__.show({ type: 'error', message: 'Only JPG, PNG, WEBP and GIF image formats are supported' });
            return;
          }
          if (item.file.size > maxSize) {
            window.__SL_toast__.show({ type: 'error', message: 'File size cannot exceed 5MB' });
            return;
          }
        } else if (item.type === 'video') {
          const maxSize = 1024 * 1024 * 1024;
          if (item.file.size > maxSize) {
            window.__SL_toast__.show({ type: 'error', message: 'File size cannot exceed 1GB' });
            return;
          }
          this.#updateVideoUploadType('file');
        }
      }

      const uploadButton = event.target.parentElement;
      event.target.disabled = true;
      if (uploadButton) {
        uploadButton.classList.add('disabled');
      }
      const previewGrid = this.querySelector(`preview-grid[data-role="${this.dataset.target}"]`);
      const onFinish = () => {
        event.target.disabled = false;
        if (uploadButton) uploadButton.classList.remove('disabled');
      };
      const onSuccess = (item) => {
        previewGrid.update(item.url, 100);
        item.finished = true;
        list.every((item) => item.finished) && onFinish();
      };
      const onProgress = (item, progress) => {
        item.progress = progress;
        previewGrid.push(item.url, item.thumbnail, item.width, item.height);
        previewGrid.update(item.url, progress);
      };
      const onAbort = (item) => {
        previewGrid.remove(item.url);
        item.finished = true;
        list.every((item) => item.finished) && onFinish();
      };

      // 业务要求的上传失败提示信息
      const uploadFailedMessage = 'Please contact us at [media@yarbo.com] for assistance.';

      await Promise.allSettled(
        list.map(async (item) => {
          try {
            if (item.type === 'image') {
              const imageData = await this.#getImageThumbnail(item.file);
              item.thumbnail = imageData.thumbnail;
              item.width = imageData.width;
              item.height = imageData.height;
            } else if (item.type === 'video') {
              const videoData = await this.#getVideoThumbnail(item.file);
              item.thumbnail = videoData.thumbnail;
              item.width = videoData.width;
              item.height = videoData.height;
            }
            const url = await this.#upload(item, (progress) => onProgress(item, progress));
            onSuccess(item, url);
          } catch (error) {
            console.error('S3 upload error:', error);
            // 显示上传失败提示
            if (window.__SL_toast__) {
              window.__SL_toast__.show({ type: 'error', message: uploadFailedMessage });
            }
            onAbort(item);
          }
        }),
      );
    }

    #uploadPromise(url, formData, onProgress) {
      let progress = 0;
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
        xhr.credentials = 'omit';
        xhr.mode = 'cors';
        xhr.open('POST', url, true);
        xhr.onload = () => {
          if (xhr.status === 204 || xhr.status === 200) {
            progress !== 100 && onProgress(100);
          }
          resolve(xhr);
        };
        xhr.onerror = () => {
          resolve(xhr);
        };
        xhr.onabort = () => {
          resolve(xhr);
        };
        xhr.send(formData);
        onProgress(progress);
      });
    }

    async #upload(item, onProgress) {
      const objectKey = `${item.type === 'image' ? FileUploader.FOLDER_IMAGE : item.type === 'video' ? FileUploader.FOLDER_VIDEO : 'file'}/${Date.now()}/${item.file.name}`;
      const { url, token, key, AWSAccessKeyId, policy, signature, contentType } = await this.#getToken(item.file, objectKey);
      const fileUrl = `${FileUploader.S3_DOMAIN ?? ''}/${key}`;
      item.url = fileUrl;
      const formData = new FormData();
      formData.append('key', key);
      formData.append('x-amz-security-token', token);
      formData.append('AWSAccessKeyId', AWSAccessKeyId);
      formData.append('policy', policy);
      formData.append('signature', signature);
      formData.append('Content-Type', contentType);
      formData.append('file', item.file);

      const response = await this.#uploadPromise(url, formData, onProgress);
      if (response.status !== 204) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      return fileUrl;
    }

    async #getToken(file, objectKey) {
      const bucket = FileUploader.BUCKET;
      const contentType = file.type;
      const items = [{ contentType, objectKey }];

      const response = await fetch(FileUploader.TOKEN_URL, {
        method: 'POST',
        body: JSON.stringify({ bucket, items }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const repsonse = await response.json();
      if (!repsonse.success) {
        // 如果获取预签名URL失败，也抛出错误，会被上层catch捕获并显示提示
        throw new Error(`Failed to get presigned URL: ${repsonse.message}`);
      }

      const data = repsonse.data || {};
      const item = data[objectKey];
      if (!item) {
        throw new Error(`Failed to get presigned URL for ${objectKey}`);
      }

      const url = item.url;
      if (!url) {
        throw new Error('Failed to get presigned URL');
      }

      const fields = item.fields;
      if (!fields) {
        throw new Error('Failed to get presigned URL');
      }

      const { 'x-amz-security-token': token, key, AWSAccessKeyId, policy, signature } = fields;
      return { url, token, key, AWSAccessKeyId, policy, signature, contentType };
    }

    setupEvent() {
      this.addEventListener('click', this.#handleOpen);
      this.addEventListener('click', this.#handleClose);
      this.addEventListener('click', this.#videoUploadTypeChange);
      this.addEventListener('change', this.#handleUpload);
    }

    /** @type {File} */
    convertBase64Image(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    }
  }

  customElements.define('file-uploader', FileUploader);
}
