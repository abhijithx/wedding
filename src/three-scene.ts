/**
 * Three.js Ambient Hero Scene
 * 
 * Lightweight drifting leaf/petal particles with parallax.
 * Full fallback cascade: WebGL → CSS animation → static background.
 * 
 * Performance safeguards:
 * - InstancedMesh for all particles
 * - Pixel ratio capped at 2 (1.5 on mobile)
 * - Delta-time clamped to prevent jumps
 * - Visibility API + IntersectionObserver pause/resume
 * - Device-tier detection for particle count adjustment
 * - WebGL context lost recovery
 * 
 * To adjust particle density per device tier, modify PARTICLE_COUNTS below.
 */

import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  type WebGLRendererParameters,
} from 'three';

// ---- PARTICLE COUNT CONFIGURATION ----
const PARTICLE_COUNTS = {
  high: 55,    // Desktop with good GPU
  medium: 30,  // Regular mobile / tablet
  low: 15,     // Low-tier devices
};

// ---- Device Tier Detection ----
interface DeviceTier {
  level: 'high' | 'medium' | 'low' | 'skip';
  particleCount: number;
}

function detectDeviceTier(): DeviceTier {
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory || 4; // GB, Chrome only

  // Very low-tier: skip WebGL entirely
  if ((cores <= 2 && memory <= 2) || (isMobile && cores <= 2)) {
    return { level: 'skip', particleCount: 0 };
  }

  // Low-tier mobile
  if (isMobile && (cores <= 4 || memory <= 3)) {
    return { level: 'low', particleCount: PARTICLE_COUNTS.low };
  }

  // Regular mobile or tablet
  if (isMobile || isTablet) {
    return { level: 'medium', particleCount: PARTICLE_COUNTS.medium };
  }

  // Desktop
  return { level: 'high', particleCount: PARTICLE_COUNTS.high };
}

// ---- Particle Colors (from palette) ----
const PARTICLE_COLORS = [
  new Color('#A8B5A0'), // sage
  new Color('#B5C4AD'), // sage light
  new Color('#C2CEBC'), // sage lighter
  new Color('#E8C4C4'), // blush
  new Color('#F0D5D5'), // blush light
  new Color('#7A2E3A'), // burgundy (few accents)
  new Color('#C9A15D'), // gold (few accents)
  new Color('#D4AD6A'), // gold light
];

// Weight distribution: more greens, fewer reds/golds
const COLOR_WEIGHTS = [3, 3, 2, 2, 2, 1, 1, 1]; // total = 15

function getWeightedRandomColor(): Color {
  const totalWeight = COLOR_WEIGHTS.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < PARTICLE_COLORS.length; i++) {
    random -= COLOR_WEIGHTS[i];
    if (random <= 0) return PARTICLE_COLORS[i];
  }
  return PARTICLE_COLORS[0];
}

// ---- Particle Data ----
interface ParticleData {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  driftSpeed: number;
  driftAmplitudeX: number;
  driftAmplitudeY: number;
  rotationSpeed: number;
  phase: number; // Random phase offset for sine wave
  opacity: number;
}

export function initThreeScene(): void {
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const tier = detectDeviceTier();

  // Skip WebGL for very low-tier devices
  if (tier.level === 'skip') {
    canvas.style.display = 'none';
    showCSSFallback();
    return;
  }

  try {
    createScene(canvas, tier);
  } catch (e) {
    console.warn('Three.js initialization failed, falling back to CSS:', e);
    canvas.style.display = 'none';
    showCSSFallback();
  }
}

function showCSSFallback(): void {
  const fallback = document.getElementById('css-floral-fallback');
  if (fallback) {
    fallback.style.display = 'block';
  }
}

function createScene(canvas: HTMLCanvasElement, tier: DeviceTier): void {
  const count = tier.particleCount;
  const isMobile = window.innerWidth < 768;

  // ---- Renderer ----
  const maxPixelRatio = isMobile ? 1.5 : 2;
  const pixelRatio = Math.min(window.devicePixelRatio, maxPixelRatio);

  const rendererParams: WebGLRendererParameters = {
    canvas,
    alpha: true,
    antialias: false, // Save GPU budget
    powerPreference: 'low-power',
  };

  const renderer = new WebGLRenderer(rendererParams);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  // ---- WebGL Context Lost Handler ----
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('WebGL context lost — falling back to CSS');
    cleanup();
    canvas.style.display = 'none';
    showCSSFallback();
  });

  // ---- Scene & Camera ----
  const scene = new Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 10;
  const camera = new OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    100
  );
  camera.position.z = 10;

  // ---- Geometry & Material ----
  // Leaf-like elongated plane
  const geometry = new PlaneGeometry(0.3, 0.6, 1, 1);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: DoubleSide,
    depthTest: false,
  });

  // ---- InstancedMesh ----
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);

  // ---- Initialize Particles ----
  const particles: ParticleData[] = [];
  const dummy = new Object3D();
  const spreadX = frustumSize * aspect;
  const spreadY = frustumSize;

  for (let i = 0; i < count; i++) {
    const p: ParticleData = {
      x: (Math.random() - 0.5) * spreadX * 1.2,
      y: (Math.random() - 0.5) * spreadY * 1.3,
      z: Math.random() * 2 - 1,
      baseX: 0,
      baseY: 0,
      scaleX: 0.5 + Math.random() * 1.2,
      scaleY: 0.5 + Math.random() * 1.2,
      rotation: Math.random() * Math.PI * 2,
      driftSpeed: 0.1 + Math.random() * 0.3,
      driftAmplitudeX: 0.2 + Math.random() * 0.5,
      driftAmplitudeY: 0.1 + Math.random() * 0.3,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.35,
    };
    p.baseX = p.x;
    p.baseY = p.y;
    particles.push(p);

    // Set initial transform
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.z = p.rotation;
    dummy.scale.set(p.scaleX, p.scaleY, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Set instance color
    const color = getWeightedRandomColor();
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  // ---- Mouse Tracking (desktop only) ----
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  if (!isMobile) {
    window.addEventListener('mousemove', (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ---- Scroll Parallax ----
  let scrollY = 0;
  let targetScrollY = 0;
  window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY / window.innerHeight;
  }, { passive: true });

  // ---- Animation Loop ----
  let rafId: number | null = null;
  let lastTime = 0;
  let isVisible = true;
  let isInViewport = true;
  let elapsed = 0;

  function animate(timestamp: number): void {
    if (!isVisible || !isInViewport) {
      rafId = requestAnimationFrame(animate);
      return;
    }

    // Delta time with clamp (prevent jumps after tab switch)
    let delta = (timestamp - lastTime) / 1000;
    if (lastTime === 0) delta = 0.016; // First frame: assume 60fps
    delta = Math.min(delta, 0.05); // Clamp to 50ms max
    lastTime = timestamp;
    elapsed += delta;

    // Smooth mouse following
    mouseX += (targetMouseX - mouseX) * 0.03;
    mouseY += (targetMouseY - mouseY) * 0.03;

    // Smooth scroll following
    scrollY += (targetScrollY - scrollY) * 0.05;

    // Update particles
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const t = elapsed * p.driftSpeed + p.phase;

      // Gentle sine-wave drift
      p.x = p.baseX + Math.sin(t) * p.driftAmplitudeX + mouseX * 0.3 * (1 + p.z * 0.5);
      p.y = p.baseY + Math.cos(t * 0.7) * p.driftAmplitudeY - scrollY * 0.8 * (1 + p.z * 0.3) + mouseY * 0.15;
      p.rotation += p.rotationSpeed * delta;

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.z = p.rotation;
      dummy.scale.set(p.scaleX, p.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);

    rafId = requestAnimationFrame(animate);
  }

  // ---- Visibility API ----
  function handleVisibility(): void {
    if (document.hidden) {
      isVisible = false;
    } else {
      isVisible = true;
      lastTime = 0; // Reset to prevent delta jump
    }
  }
  document.addEventListener('visibilitychange', handleVisibility);

  // ---- IntersectionObserver for Canvas ----
  const canvasObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isInViewport = entry.isIntersecting;
        if (entry.isIntersecting) {
          lastTime = 0; // Reset delta on re-entry
        }
      });
    },
    { threshold: 0 }
  );
  canvasObserver.observe(canvas);

  // ---- Resize Handler ----
  function handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const newAspect = w / h;

    camera.left = -frustumSize * newAspect / 2;
    camera.right = frustumSize * newAspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
  }

  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(handleResize, 200);
  }, { passive: true });

  // ---- Start ----
  rafId = requestAnimationFrame(animate);

  // Fade in canvas
  requestAnimationFrame(() => {
    canvas.classList.add('visible');
  });

  // ---- Cleanup Function ----
  function cleanup(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    document.removeEventListener('visibilitychange', handleVisibility);
    canvasObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }

  // Store cleanup for potential use
  (window as any).__cleanupThreeScene = cleanup;
}
