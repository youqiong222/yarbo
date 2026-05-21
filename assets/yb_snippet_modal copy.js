(() => {
  // 如果DOM已经加载完成，直接初始化modal
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initModal().catch((err) => {
      console.error('Modal initialization failed:', err);
    });
  } else {
    // 如果DOM还未加载完成，等待DOMContentLoaded事件
    document.addEventListener('DOMContentLoaded', () => {
      initModal().catch((err) => {
        console.error('Modal initialization failed:', err);
      });
    });
  }
})();

async function initModal() {
  const modalButtons = document.querySelectorAll('.modal-btn');

  const modalTemplate = `
    <div class="modal-container">
      <div class="close-btn-box">
        <span class="close-btn">&times;</span>
      </div>
      <div class="modal-content">
        <div class="modal-content-wrapper">
          <div id="yb_section_modal_title" class="modal-title"></div>
          <div id="yb_section_modal_html" class="modal-html"></div>
          <div id="yb_section_modal_video" class="yb-modal-video"></div>
        </div>
      </div>
    </div>
  `;

  let modal = document.getElementById('yb_section_modal');
  if (!modal) {
    const modalElement = Object.assign(document.createElement('div'), {
      id: 'yb_section_modal',
      className: 'modal',
      innerHTML: modalTemplate,
    });
    document.body.appendChild(modalElement);
    modal = modalElement;
  }

  const closeBtn = modal.querySelector('.close-btn');
  const modalTitle = document.getElementById('yb_section_modal_title');
  const modalHtml = document.getElementById('yb_section_modal_html');
  const modalVideo = document.getElementById('yb_section_modal_video');

  const handleModal = (display) => {
    modal.style.display = display;
    document.body.style.overflow = display === 'block' ? 'hidden' : 'auto';

    if (display === 'none') {
      // Stop videos on close
      const iframe = modalVideo.querySelector('iframe');
      const video = modalVideo.querySelector('video');
      if (iframe) iframe.src = ''; // Reset iframe to stop playback
      if (video) video.pause(); // Pause HTML5 video
    }
  };

  closeBtn?.addEventListener('click', () => handleModal('none'));

  modalButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const title = button.getAttribute('data-modal-title');
      const html = button.getAttribute('data-modal-html');
      const videoUrl = button.getAttribute('data-modal-video');
      const videoThumbnail = button.getAttribute('data-modal-video-thumbnail');
      const videoAutoplay = button.getAttribute('data-modal-autoplay');
      const videoType = button.getAttribute('data-modal-video-type');

      modalTitle.innerHTML = title || '';
      modalHtml.innerHTML = html || '';
      modalVideo.innerHTML = '';

      let element;
      let isVideo = false;
      if (videoUrl) {
        if (videoType === 'youtube') {
          const id = videoUrl;
          element = document.createElement('iframe');
          element.src = `https://www.youtube.com/embed/${id}?autoplay=${
            videoAutoplay === 'true' ? 1 : 0
          }&mute=1&loop=1&playlist=${id}`;
          element.allow = 'autoplay; encrypted-media';
          isVideo = true;
        } else if (videoType === 'vimeo') {
          const id = videoUrl;
          element = document.createElement('iframe');
          element.src = `https://player.vimeo.com/video/${id}?autoplay=${videoAutoplay === 'true' ? 1 : 0}&muted=1`;
          element.allow = 'autoplay; encrypted-media';
          isVideo = true;
        } else if (videoType === 'firework' || videoType === 'file' || !videoType) {
          element = document.createElement('video');
          element.src = videoUrl;
          element.poster = videoThumbnail || '';
          element.controls = true;
          element.playsInline = true;
          element.style.width = '100%';
          element.style.height = 'auto';
          if (videoAutoplay === 'true') element.autoplay = true;
          element.muted = true;
          isVideo = true;
        } else {
          // Handle unknown type (optional fallback)
          element = document.createElement('div');
          element.textContent = 'Unsupported content';
          isVideo = false;
        }
      }
      if (element) {
        element.style.width = '100%';
        element.style.height = '100%';
        modalVideo.appendChild(element);
      }

      // Conditionally add/remove the class
      modal.classList.remove('video_modal');
      if (isVideo) {
        modal.classList.add('video_modal');
      }
      handleModal('block');
    });
  });
}
