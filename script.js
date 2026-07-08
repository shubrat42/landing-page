// GSAP + ScrollTrigger are loaded via CDN in index.html.
gsap.registerPlugin(ScrollTrigger);

// Scroll-reveal: every element marked data-reveal fades/slides up into view
// the first time it enters the viewport. Work cards are handled separately
// below so they can cascade in one-by-one.
gsap.utils.toArray('[data-reveal]').forEach((el, i) => {
  if (el.classList.contains('work-card')) return;
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    delay: el.closest('.hero') ? i * 0.08 : 0,
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
});

// Selected Work cards: reveal one after another as the section scrolls into
// view. The cards sit side-by-side in a grid, so a shared timeline with a
// stagger makes them cascade in sequence (first, then second, then third)
// instead of appearing all at once.
const workCards = gsap.utils.toArray('.work-card');
if (workCards.length) {
  gsap.to(workCards, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.28,
    scrollTrigger: {
      trigger: '.work-grid',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

// Parallax: hero background layers move at different speeds than the
// foreground content as the page scrolls, using each layer's data-parallax
// value as its relative speed.
gsap.utils.toArray('[data-parallax]').forEach((el) => {
  const speed = parseFloat(el.dataset.parallax);
  gsap.to(el, {
    yPercent: speed * 40,
    ease: 'none',
    scrollTrigger: {
      trigger: el.closest('.hero'),
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
});

// Reveal-border spotlight: as the mouse nears a .spotlight-border card, a
// bright arc grows along the edge closest to the cursor (Windows 10 Fluent
// "reveal highlight" style). Tracks proximity even before the mouse enters
// the card, not just on hover.
if (window.matchMedia('(pointer: fine)').matches) {
  const glowEls = gsap.utils.toArray('.spotlight-border');
  const proximity = 140;

  document.addEventListener('mousemove', (e) => {
    glowEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const nearX = Math.min(Math.max(e.clientX, rect.left), rect.right);
      const nearY = Math.min(Math.max(e.clientY, rect.top), rect.bottom);
      const dist = Math.hypot(e.clientX - nearX, e.clientY - nearY);

      if (dist > proximity) {
        el.style.setProperty('--glow', 0);
        return;
      }

      el.style.setProperty('--mx', `${nearX - rect.left}px`);
      el.style.setProperty('--my', `${nearY - rect.top}px`);
      el.style.setProperty('--glow', 1 - dist / proximity);
    });
  });
}

// Custom cursor (styled like macOS's arrow pointer) — runs across the
// whole site. Only on devices with a real mouse (pointer: fine); touch
// devices keep their normal cursor.
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorEl = document.getElementById('customCursor');
  const cursorX = gsap.quickTo(cursorEl, 'x', { duration: 0.12, ease: 'power3' });
  const cursorY = gsap.quickTo(cursorEl, 'y', { duration: 0.12, ease: 'power3' });

  document.addEventListener('mousemove', (e) => {
    cursorX(e.clientX);
    cursorY(e.clientY);
  });

  document.addEventListener('mouseenter', () => {
    document.body.classList.add('is-mouse-active');
    gsap.to(cursorEl, { opacity: 1, duration: 0.2 });
  });

  document.addEventListener('mouseleave', () => {
    document.body.classList.remove('is-mouse-active');
    gsap.to(cursorEl, { opacity: 0, duration: 0.2 });
  });
}

// Mouse-reactive hero mesh + spotlight.
// Only runs on devices with a real mouse (pointer: fine) — touch devices
// keep the static mesh. Guarded on hero/mesh existing since pages other
// than the homepage don't have a .hero section.
const hero = document.querySelector('.hero');
const heroMeshEl = document.getElementById('heroMesh');
if (window.matchMedia('(pointer: fine)').matches && hero && heroMeshEl) {
  const mesh = heroMeshEl;

  // Build the dot grid once. Each dot remembers its resting position
  // (in pixels, relative to the hero) so we can measure distance from
  // the mouse to it later.
  const cols = 12;
  const rows = 7;
  const dots = [];

  function buildGrid() {
    mesh.querySelectorAll('.hero-mesh-dot').forEach((d) => d.remove());
    dots.length = 0;

    const { width, height } = hero.getBoundingClientRect();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = ((col + 0.5) / cols) * width;
        const baseY = ((row + 0.5) / rows) * height;

        const dot = document.createElement('div');
        dot.className = 'hero-mesh-dot';
        dot.style.left = baseX + 'px';
        dot.style.top = baseY + 'px';
        mesh.appendChild(dot);

        dots.push({ el: dot, baseX, baseY });
      }
    }
  }

  buildGrid();
  window.addEventListener('resize', buildGrid);

  // Spotlight position: smoothed with quickTo, written into CSS vars.
  const spotlightPos = { x: 50, y: 50 };
  const spotX = gsap.quickTo(spotlightPos, 'x', { duration: 0.3, ease: 'power3', onUpdate: applySpotlightVars });
  const spotY = gsap.quickTo(spotlightPos, 'y', { duration: 0.3, ease: 'power3', onUpdate: applySpotlightVars });

  function applySpotlightVars() {
    hero.style.setProperty('--mx', spotlightPos.x + '%');
    hero.style.setProperty('--my', spotlightPos.y + '%');
  }

  // "Poke" falloff: dots near the mouse shrink/dim, a ring just outside
  // that radius slightly grows/brightens, like fabric reacting to a poke.
  const radius = 180;
  let rafId = null;
  let lastEvent = null;

  function updateMesh() {
    rafId = null;
    if (!lastEvent) return;

    const rect = hero.getBoundingClientRect();
    const mouseX = lastEvent.clientX - rect.left;
    const mouseY = lastEvent.clientY - rect.top;

    dots.forEach(({ el, baseX, baseY }) => {
      const dx = mouseX - baseX;
      const dy = mouseY - baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const t = Math.max(0, 1 - distance / radius);
      const elevate = Math.sin(Math.min(distance / radius, 1) * Math.PI) * 0.4;

      const scale = 1 - 0.5 * t + elevate * 0.3;
      const opacity = 0.15 + 0.15 * (1 - t) + elevate * 0.3;

      gsap.set(el, {
        scale,
        opacity,
        x: -dx * 0.15 * t,
        y: -dy * 0.15 * t,
      });
    });
  }

  function onHeroMouseMove(e) {
    const rect = hero.getBoundingClientRect();
    spotX(((e.clientX - rect.left) / rect.width) * 100);
    spotY(((e.clientY - rect.top) / rect.height) * 100);

    lastEvent = e;
    if (!rafId) rafId = requestAnimationFrame(updateMesh);
  }

  hero.addEventListener('mousemove', onHeroMouseMove);

  hero.addEventListener('mouseenter', () => {
    hero.classList.add('is-mouse-active');
  });

  hero.addEventListener('mouseleave', () => {
    hero.classList.remove('is-mouse-active');
    lastEvent = null;

    dots.forEach(({ el }) => {
      gsap.to(el, { scale: 1, opacity: 0.35, x: 0, y: 0, duration: 0.6 });
    });
  });
}

// Loading screen: count 0 -> 100%, then zoom the whole panel toward the
// viewer and fade it out to reveal the site. Scroll is locked (via the
// is-loading class on <html>) until it finishes.
(function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) {
    document.documentElement.classList.remove('is-loading');
    return;
  }

  const numEl = document.getElementById('loaderNum');
  const fillEl = document.getElementById('loaderFill');
  const duration = 2200;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 2); // easeOutQuad — fast start, gentle finish
    const pct = Math.round(eased * 100);
    numEl.textContent = pct;
    fillEl.style.width = pct + '%';

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      // Brief hold at 100%, then the zoom-reveal.
      setTimeout(() => {
        loader.classList.add('is-complete');
        document.documentElement.classList.remove('is-loading');
        if (window.ScrollTrigger) ScrollTrigger.refresh();
        setTimeout(() => loader.classList.add('is-hidden'), 950);
      }, 260);
    }
  }

  requestAnimationFrame(tick);
})();

// Theme toggle with a seamless slide-wipe (~1000ms total). A full-screen
// panel painted in the *incoming* theme's colour slides in to cover the
// screen; the theme flips underneath at the midpoint; then the panel slides
// off the opposite side, revealing the freshly themed page. Painting the
// panel the destination colour is what makes the swap invisible.
const themeToggle = document.getElementById('themeToggle');
const themeWipe = document.getElementById('themeWipe');

// Background colour per theme — kept in sync with --color-bg in style.css.
const THEME_BG = { dark: '#0a0a0a', light: '#f6f6f8' };
let themeAnimating = false;

if (themeToggle && themeWipe) {
  themeToggle.addEventListener('click', () => {
    if (themeAnimating) return;
    themeAnimating = true;

    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    themeWipe.style.background = THEME_BG[next];

    // Light sweeps in from the left, dark from the right.
    const fromLeft = next === 'light';
    const offStart = fromLeft ? '-101%' : '101%';
    const offEnd = fromLeft ? '101%' : '-101%';

    // Park off-screen with no transition, then animate in on the next frame.
    themeWipe.classList.remove('is-animating');
    themeWipe.style.transform = 'translateX(' + offStart + ')';

    requestAnimationFrame(() => {
      themeWipe.classList.add('is-animating');
      themeWipe.style.transform = 'translateX(0)';

      // Midpoint: panel fully covers the screen — flip the theme behind it.
      setTimeout(() => {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeWipe.style.transform = 'translateX(' + offEnd + ')';
      }, 500);

      // End: reset the panel off-screen instantly, ready for next time.
      setTimeout(() => {
        themeWipe.classList.remove('is-animating');
        themeWipe.style.transform = 'translateX(-101%)';
        themeAnimating = false;
      }, 1000);
    });
  });
}

// FAQ accordion: clicking a question expands its answer and closes any
// other open answer.
document.querySelectorAll('.faq-item').forEach((item) => {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');

  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');

    document.querySelectorAll('.faq-item.is-open').forEach((openItem) => {
      openItem.classList.remove('is-open');
      openItem.querySelector('.faq-answer').style.maxHeight = null;
    });

    if (!isOpen) {
      item.classList.add('is-open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});
