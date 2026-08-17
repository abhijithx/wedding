/**
 * Amalu & Athul — Wedding Invitation
 * Main Entry Point
 * 
 * Orchestrates:
 * 1. CSS/font loading (critical path)
 * 2. Scroll reveal initialization
 * 3. Countdown timer start
 * 4. Lazy Three.js import (after LCP)
 * 5. Lazy Google Maps loading
 */

import './style.css';
import { initCountdown } from './countdown';
import { initScrollReveal, initLazyMap } from './scroll-reveal';

// ---- Initialize on DOM ready ----
function init(): void {
  // 1. Start countdown immediately (lightweight, critical content)
  initCountdown();

  // 2. Initialize scroll reveal system
  initScrollReveal();

  // 3. Initialize lazy map loading
  initLazyMap();

  // 4. Lazy-load Three.js scene AFTER critical content has painted
  // This ensures fonts/text are visible before we load the heavy WebGL bundle
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const loadThree = () => {
      import('./three-scene')
        .then(({ initThreeScene }) => {
          initThreeScene();
        })
        .catch((err) => {
          console.warn('Failed to load Three.js scene:', err);
          // Show CSS fallback
          const fallback = document.getElementById('css-floral-fallback');
          if (fallback) fallback.style.display = 'block';
        });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadThree);
    } else {
      setTimeout(loadThree, 100);
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
