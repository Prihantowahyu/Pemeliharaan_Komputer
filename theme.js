/**
 * Global Theme Engine - Instant Sync & Eye-Comfort Switcher
 */
(function() {
  function applyTheme(isLight) {
    if (isLight) {
      document.documentElement.classList.add('light-mode');
      document.body && document.body.classList.add('light-mode');
      localStorage.setItem('portal_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body && document.body.classList.remove('light-mode');
      localStorage.setItem('portal_theme', 'dark');
    }
    updateButtons(isLight);
  }

  function updateButtons(isLight) {
    const btns = document.querySelectorAll('.btn-theme-switcher');
    btns.forEach(btn => {
      btn.innerHTML = isLight ? '☀️ Mode Terang' : '🌙 Mode Gelap';
      btn.setAttribute('title', isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang (Lebih Nyaman Dibaca)');
    });
  }

  // Pre-apply before DOM load to avoid flash
  const saved = localStorage.getItem('portal_theme');
  const isLight = saved === 'light'; // If user prefers light, apply immediately
  if (isLight) {
    document.documentElement.classList.add('light-mode');
  }

  window.togglePortalTheme = function() {
    const currentlyLight = document.documentElement.classList.contains('light-mode');
    applyTheme(!currentlyLight);
  };

  document.addEventListener('DOMContentLoaded', function() {
    const isLightCurrent = document.documentElement.classList.contains('light-mode');
    if (isLightCurrent && document.body) {
      document.body.classList.add('light-mode');
    }

    // Auto-inject Theme Toggle button & Home Portal button to .hud-inner, .topbar-inner, or header
    const headerContainer = document.querySelector('.hud-inner, .topbar-inner, .topbar, .top-hud, header.hero');
    if (headerContainer) {
      const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('.html');
      
      // 1. Inject Home Button on sub-modules if not already present
      if (!isIndexPage && !document.querySelector('.btn-home-nav')) {
        const homeBtn = document.createElement('a');
        homeBtn.href = './index.html';
        homeBtn.className = 'btn-home-nav';
        homeBtn.innerHTML = '🏠 <span>Beranda</span>';
        homeBtn.setAttribute('title', 'Kembali ke Beranda Portal Pembelajaran');
        headerContainer.insertBefore(homeBtn, headerContainer.firstChild);
      }

      // 2. Inject Theme Toggle Button if not already present
      if (!document.querySelector('.btn-theme-switcher')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-theme-switcher';
        btn.onclick = window.togglePortalTheme;
        btn.innerHTML = isLightCurrent ? '☀️ Mode Terang' : '🌙 Mode Gelap';
        btn.style.marginLeft = 'auto';
        btn.style.marginRight = '8px';
        
        const lastChild = headerContainer.lastElementChild;
        if (lastChild) {
          headerContainer.insertBefore(btn, lastChild);
        } else {
          headerContainer.appendChild(btn);
        }
      }
    }
    updateButtons(isLightCurrent);
  });
})();
