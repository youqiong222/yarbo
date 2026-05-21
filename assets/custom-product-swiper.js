class CustomProductSwiper extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.sectionId = this.dataset.section;
    this.swiperDom = this.querySelector('.swiper');

    // 确保找到了 swiper 容器，防止报错
    if (!this.swiperDom) return;

    const swiper = new Swiper(this.swiperDom, {
      direction: 'horizontal',
      loop: true,
      navigation: {
        // 使用 this.querySelector 限制在当前组件内部查找按钮
        // 避免页面上有多个轮播图时按钮点击冲突
        nextEl: this.querySelector('.swiper-custom-button-next'),
        prevEl: this.querySelector('.swiper-custom-button-prev'),
      },
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
    });

    // 获取缩略图元素
    const thumbnailItems = this.querySelectorAll('.thumbnail-item');

    // 初始化：默认高亮第一个（或当前 Swiper 所在的 active 索引）
    if (thumbnailItems.length > 0) {
        const initialIndex = swiper.realIndex;
        if(thumbnailItems[initialIndex]) {
            thumbnailItems[initialIndex].classList.add('thumbnail-selected');
        }
    }

    // 为每个缩略图添加点击事件
    thumbnailItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        swiper.slideToLoop(index);
      });
    });

    // 监听幻灯片切换事件
    swiper.on('slideChange', () => {
      thumbnailItems.forEach(item => {
        item.classList.remove('thumbnail-selected');
      });

      const activeIndex = swiper.realIndex;
      if (thumbnailItems[activeIndex]) {
        thumbnailItems[activeIndex].classList.add('thumbnail-selected');
      }
    });
  }

  disconnectedCallback() {
      // 可以在这里销毁 swiper 实例，但如果只是简单的展示，通常不需要写
  }
}

// 注册自定义元素（防止重复注册报错）
if (!customElements.get('custom-product-swiper')) {
  customElements.define('custom-product-swiper', CustomProductSwiper);
}