// ─── Scroll Reveal ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
  revealObserver.observe(el);
});

// ─── Stat Counter Animation ───
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const isDecimal = target % 1 !== 0;
      const duration = 1500;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;

        el.textContent = isDecimal ? current.toFixed(1) : Math.round(current);

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number[data-target]').forEach(el => {
  statObserver.observe(el);
});

// ─── 3D Tilt on Showcase Cards ───
document.querySelectorAll('.tilt-card').forEach(card => {
  const inner = card.querySelector('.showcase-card-inner');
  const glow = card.querySelector('.showcase-card-glow');

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    inner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

    if (glow) {
      const percX = (x / rect.width) * 100;
      const percY = (y / rect.height) * 100;
      glow.style.setProperty('--glow-x', percX + '%');
      glow.style.setProperty('--glow-y', percY + '%');
    }
  });

  card.addEventListener('mouseleave', () => {
    inner.style.transform = '';
  });
});

// ─── Parallax on Step Cards ───
const stepCards = document.querySelectorAll('.step-card-3d');
if (stepCards.length > 0) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        stepCards.forEach(card => {
          const rect = card.getBoundingClientRect();
          const viewH = window.innerHeight;
          if (rect.top < viewH && rect.bottom > 0) {
            const center = rect.top + rect.height / 2;
            const offset = (center - viewH / 2) / viewH;
            card.style.transform = `rotateX(${offset * 6}deg) rotateY(${offset * -4}deg)`;
          }
        });
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ─── Demo Scene Cycling ───
function initDemoCycler(screenId, sceneClass, interval) {
  const screen = document.getElementById(screenId);
  if (!screen) return;
  const scenes = screen.querySelectorAll('.' + sceneClass);
  if (scenes.length === 0) return;
  let current = 0;
  let started = false;

  const demoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started = true;
        setInterval(() => {
          scenes[current].classList.remove('demo-scene-active');
          current = (current + 1) % scenes.length;
          scenes[current].classList.add('demo-scene-active');
        }, interval);
      }
    });
  }, { threshold: 0.3 });

  demoObserver.observe(screen);
}

initDemoCycler('demo-login', 'demo-login-scene', 2500);
initDemoCycler('demo-instance', 'demo-instance-scene', 3000);
initDemoCycler('demo-mods', 'demo-mods-scene', 3500);

// ─── Nav Background on Scroll ───
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(0,0,0,0.85)';
    } else {
      nav.style.background = 'rgba(0,0,0,0.6)';
    }
  });
}
