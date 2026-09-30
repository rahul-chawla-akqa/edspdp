import { moveInstrumentation } from '../../scripts/scripts.js';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isAuthoring(block) {
  return block.hasAttribute('data-aue-resource')
    || [...block.children].some((row) => row.hasAttribute('data-aue-resource'));
}

function getSlides(block) {
  return [...block.querySelectorAll('.carousel-slide')];
}

function getScrollBehavior() {
  return prefersReducedMotion() ? 'instant' : 'smooth';
}

function scrollToSlide(track, slide, behavior) {
  track.scrollTo({
    top: 0,
    left: slide.offsetLeft,
    behavior,
  });
}

function getCenteredSlide(block) {
  const track = block.querySelector('.carousel-slides');
  const slides = getSlides(block);
  if (!track || !slides.length) return null;

  const center = track.scrollLeft + track.clientWidth / 2;
  return slides.reduce((closest, slide) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const dist = Math.abs(slideCenter - center);
    if (!closest || dist < closest.dist) {
      return { slide, dist };
    }
    return closest;
  }, null)?.slide;
}

function setInteractiveTabIndex(root, enabled) {
  root.querySelectorAll('a, button').forEach((el) => {
    if (enabled) {
      el.removeAttribute('tabindex');
    } else {
      el.setAttribute('tabindex', '-1');
    }
  });
}

function updateNavButtons(block) {
  const slides = getSlides(block);
  const slideIndex = parseInt(block.dataset.activeSlide, 10);
  const prev = block.querySelector('.slide-prev');
  const next = block.querySelector('.slide-next');
  if (!slides.length) return;

  const atStart = slideIndex <= 0;
  const atEnd = slideIndex >= slides.length - 1;

  if (prev) {
    prev.disabled = atStart;
    prev.setAttribute('aria-disabled', String(atStart));
  }
  if (next) {
    next.disabled = atEnd;
    next.setAttribute('aria-disabled', String(atEnd));
  }
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  if (!block) return;

  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  if (Number.isNaN(slideIndex)) return;

  block.dataset.activeSlide = String(slideIndex);

  const slides = getSlides(block);
  slides.forEach((aSlide, idx) => {
    const isActive = idx === slideIndex;
    aSlide.setAttribute('aria-hidden', String(!isActive));
    setInteractiveTabIndex(aSlide, isActive);
  });

  block.setAttribute('aria-label', `Slide ${slideIndex + 1} of ${slides.length}`);

  block.querySelectorAll('.carousel-slide-indicator').forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (!button) return;
    const isCurrent = idx === slideIndex;
    button.disabled = isCurrent;
    if (isCurrent) {
      button.setAttribute('aria-current', 'true');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  updateNavButtons(block);
}

function showSlide(block, slideIndex = 0, behavior = getScrollBehavior()) {
  const slides = getSlides(block);
  const track = block.querySelector('.carousel-slides');
  if (!slides.length || !track) return;

  const realSlideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
  const activeSlide = slides[realSlideIndex];
  updateActiveSlide(activeSlide);
  scrollToSlide(track, activeSlide, behavior);
}

function bindEvents(block) {
  const track = block.querySelector('.carousel-slides');
  const prev = block.querySelector('.slide-prev');
  const next = block.querySelector('.slide-next');

  block.querySelectorAll('.carousel-slide-indicator button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  prev?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  next?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    }
  });

  if (track) {
    let scrollTimer;
    track.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const centered = getCenteredSlide(block);
        if (centered) updateActiveSlide(centered);
      }, 80);
    }, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) || 0, 'instant');
    });
    resizeObserver.observe(track);
  }
}

function createNavButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');
  moveInstrumentation(row, slide);

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy?.id) {
    slide.setAttribute('aria-labelledby', labeledBy.id);
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const authoring = isAuthoring(block);
  const rows = [...block.querySelectorAll(':scope > div')];
  const isSingleSlide = rows.length < 2;

  if (authoring) {
    block.classList.add('carousel-authoring');
  }

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');
  block.setAttribute('tabindex', '0');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  let slideIndicators;
  if (!isSingleSlide && !authoring) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.append(
      createNavButton('slide-prev', 'Previous Slide'),
      createNavButton('slide-next', 'Next Slide'),
    );
    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      const indicatorButton = document.createElement('button');
      indicatorButton.type = 'button';
      indicatorButton.setAttribute('aria-label', `Show Slide ${idx + 1} of ${rows.length}`);
      indicator.append(indicatorButton);
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  const firstSlide = block.querySelector('.carousel-slide');
  if (firstSlide && !authoring) updateActiveSlide(firstSlide);

  if (!isSingleSlide && !authoring) {
    bindEvents(block);
    showSlide(block, 0, 'instant');
  }
}
