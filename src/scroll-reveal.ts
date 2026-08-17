/**
 * Scroll Reveal System
 * IntersectionObserver-based reveal animations for [data-reveal] elements.
 * Uses CSS transforms/opacity only (GPU-accelerated).
 * Respects prefers-reduced-motion.
 */

export function initScrollReveal(): void {
  // Skip entirely if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make all elements visible immediately
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      (el as HTMLElement).classList.add('revealed');
    });
    return;
  }

  const revealElements = document.querySelectorAll('[data-reveal]');

  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          el.classList.add('revealed');
          observer.unobserve(el); // Only animate once
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  revealElements.forEach((el) => {
    observer.observe(el);
  });
}

/**
 * Lazy-load the Google Maps iframe when the map container scrolls into view.
 */
export function initLazyMap(): void {
  const container = document.getElementById('map-container');
  const placeholder = document.getElementById('map-placeholder');
  
  if (!container) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Create and insert the iframe
          const iframe = document.createElement('iframe');
          iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.0!2d76.8!3d9.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKw!5e0!3m2!1sen!2sin!4v1!5m2!1sen!2sin&q=St.+George%27s+Parish+Hall,+Purathodu,+Idukki';
          iframe.width = '100%';
          iframe.height = '100%';
          iframe.style.border = '0';
          iframe.allowFullscreen = true;
          iframe.loading = 'lazy';
          iframe.referrerPolicy = 'no-referrer-when-downgrade';
          iframe.title = 'Wedding venue location - St. George\'s Parish Hall, Purathodu, Idukki';
          
          // Use the search embed for reliable geocoding
          iframe.src = 'https://www.google.com/maps?q=St.+George%27s+Parish+Hall,+Purathodu,+Idukki&output=embed';
          
          container.insertBefore(iframe, placeholder);

          // Hide placeholder after iframe loads
          iframe.addEventListener('load', () => {
            placeholder?.classList.add('loaded');
          });

          // Also hide placeholder after a timeout in case load event doesn't fire
          setTimeout(() => {
            placeholder?.classList.add('loaded');
          }, 3000);

          observer.unobserve(container);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '200px 0px', // Start loading before it's fully in view
    }
  );

  observer.observe(container);
}
