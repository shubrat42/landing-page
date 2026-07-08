// GSAP + ScrollTrigger are loaded via CDN in index.html.
gsap.registerPlugin(ScrollTrigger);

// Scroll-reveal: every element marked data-reveal fades/slides up into view
// the first time it enters the viewport.
gsap.utils.toArray('[data-reveal]').forEach((el, i) => {
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
// keep the static mesh.
if (window.matchMedia('(pointer: fine)').matches) {
  const hero = document.querySelector('.hero');
  const mesh = document.getElementById('heroMesh');

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

// Theme toggle: switches between dark/light via a data-theme attribute on
// <html>, persisted to localStorage. Initial theme is set by an inline
// script in <head> (before paint) to avoid a flash of the wrong theme.
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
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
