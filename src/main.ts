/**
 * My Universe Studio — Realistic Multi-Scale 3D Universe Simulation
 * Entry point: initializes WebGL2 HDR engine, layers, input, audio and UI.
 */
import './styles/global.css';
import { Engine } from './core/Engine';
import { SceneManager } from './core/SceneManager';
import { CameraController } from './core/CameraController';
import { InputManager } from './core/InputManager';
import { UIManager } from './ui/UIManager';
import { LoadingScreen } from './ui/LoadingScreen';
import { Toasts } from './ui/Toasts';
import { CosmicAudio } from './audio/CosmicAudio';
import { AppState, ScaleLevel } from './core/types';
import { eventBus } from './core/EventBus';
import { SIM_DAYS_PER_SECOND, STAR_SYSTEMS_CATALOG, SUPERCLUSTERS } from './data/cosmicData';
import {
  applyStoredPreferences,
  getStoredView,
  loadStoredState,
  saveStoredState,
  type StoredView,
} from './core/preferences';
import { parseDeepLink, syncDeepLink, type DeepLinkTarget } from './core/deepLink';

export const state: AppState = {
  currentScale: ScaleLevel.OBSERVABLE_UNIVERSE,
  zoomLevel: 0,
  cameraMinRadius: 2.0,
  activeObjectId: null,
  activeSystemId: 'solar',
  activePlanetId: 'earth',
  activeGalaxyId: 'milkyway',
  activeClusterId: 'local_group',
  activePreset: 'god-eye',
  activeSuperclusterId: null,
  activeMemberClusterId: null,
  godsEye: false,
  isPlaying: true,
  rotationSpeed: 1.0,
  elapsedTime: 0,
  elapsedSimDays: 0,
  cosmicAge: 13.8,
  density: 'medium',
  layers: {
    stars: true,
    nebulae: true,
    orbits: true,
    labels: true,
    halo: true,
    cosmicWeb: true,
    cmb: true,
    darkMatter: false,
    habitableZones: true,
    flowLines: false,
    dustLanes: true,
  },
  soundEnabled: false,
  showMinimap: false,
  showTimeline: false,
  showControls: false,
  showInfo: true,
  photoMode: false,
  searchOpen: false,
  helpOpen: false,
  bloom: 0.65,
  quality: 'high',
  autoRotate: false,
  fps: 60,
};

const WEBGL_MAX_ATTEMPTS = 3;
let lastContextError = '';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Capture the driver's own explanation for a failed context creation. */
function watchContextErrors(canvas: HTMLCanvasElement): void {
  lastContextError = '';
  canvas.addEventListener('webglcontextcreationerror', (event) => {
    lastContextError = (event as WebGLContextEvent).statusMessage || '';
  });
}

/** A failed canvas can be permanently poisoned — retry on a fresh one. */
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  try {
    old.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // The context never existed; nothing to release.
  }
  const next = old.cloneNode(false) as HTMLCanvasElement;
  next.id = old.id;
  next.className = old.className;
  const label = old.getAttribute('aria-label');
  if (label) next.setAttribute('aria-label', label);
  old.replaceWith(next);
  return next;
}

/**
 * WebGL2 creation can fail transiently when the GPU process is restarting,
 * the browser is resuming from sleep, or several contexts were just released
 * by a dev-server reload. Retry a couple of times on a clean canvas before
 * declaring the browser unsupported.
 */
async function createEngineWithRetry(
  initialCanvas: HTMLCanvasElement,
  loader: LoadingScreen
): Promise<{ engine: Engine; canvas: HTMLCanvasElement } | null> {
  let canvas = initialCanvas;

  for (let attempt = 1; attempt <= WEBGL_MAX_ATTEMPTS; attempt++) {
    watchContextErrors(canvas);
    loader.setProgress(8 + (attempt - 1) * 3, 'WebGL2 কনটেক্সট তৈরি হচ্ছে...');
    try {
      const engine = new Engine(canvas);
      if (!engine.renderer.getContext()) {
        throw new Error('WebGL2 context is null');
      }
      return { engine, canvas };
    } catch (error) {
      console.warn(`WebGL2 init attempt ${attempt}/${WEBGL_MAX_ATTEMPTS} failed:`, error);
      if (attempt === WEBGL_MAX_ATTEMPTS) break;
      await delay(220 * attempt);
      canvas = replaceCanvas(canvas);
    }
  }
  return null;
}

function supportsWebGL2(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function showGraphicsFallback(loader: LoadingScreen, detail?: string): void {
  loader.hide();
  const fallback = document.getElementById('webgl-fallback');
  if (!fallback) return;

  const supported = supportsWebGL2();
  const safeDetail = detail && detail.length > 160 ? `${detail.slice(0, 160)}…` : detail;
  const message = fallback.querySelector('#webgl-fallback-message');
  if (message) {
    if (supported) {
      message.textContent = safeDetail
        ? `ব্রাউজার WebGL2 সমর্থন করে, কিন্তু গ্রাফিক্স কনটেক্সট তৈরি করা যায়নি। GPU ব্যস্ত থাকলে বা ব্রাউজার সদ্য sleep থেকে ফিরলে এমন হতে পারে। আবার চেষ্টা করুন। (${safeDetail})`
        : 'ব্রাউজার WebGL2 সমর্থন করে, কিন্তু গ্রাফিক্স কনটেক্সট তৈরি করা যায়নি। GPU ব্যস্ত থাকলে বা ব্রাউজার সদ্য sleep থেকে ফিরলে এমন হতে পারে। আবার চেষ্টা করুন।';
    } else {
      message.textContent =
        'আপনার ব্রাউজারে WebGL2 সমর্থন পাওয়া যায়নি। আধুনিক ব্রাউজারে হার্ডওয়্যার অ্যাক্সিলারেশন চালু করে আবার চেষ্টা করুন।';
    }
  }
  fallback.classList.remove('hidden');
  fallback.querySelector<HTMLButtonElement>('button')?.focus();
}

async function boot(): Promise<void> {
  const loader = new LoadingScreen();
  const stored = loadStoredState();
  applyStoredPreferences(state, stored?.preferences);

  const initialCanvas = document.getElementById('universe-canvas') as HTMLCanvasElement | null;
  if (!initialCanvas) {
    loader.hide();
    return;
  }

  const created = await createEngineWithRetry(initialCanvas, loader);
  if (!created) {
    showGraphicsFallback(
      loader,
      lastContextError || 'WebGL2 context creation failed after 3 attempts'
    );
    return;
  }

  const engine = created.engine;
  const canvas = created.canvas;

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    Toasts.show('⚠️ গ্রাফিক্স কনটেক্সট হারিয়ে গেছে — পুনরুদ্ধার হচ্ছে...', 5000);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    Toasts.show('✅ গ্রাফিক্স পুনরুদ্ধার হয়েছে', 3000);
  });

  loader.setProgress(15, 'HDR রেন্ডার ইঞ্জিন চালু হচ্ছে...');
  engine.setQuality(state.quality);
  engine.pipeline.setBloom(state.bloom);
  const sceneManager = new SceneManager(engine, state);
  const cameraCtrl = new CameraController(engine.camera, state);
  sceneManager.bindCameraController(cameraCtrl);
  const input = new InputManager(canvas, cameraCtrl, state);
  const audio = new CosmicAudio();

  await sceneManager.initialize((pct, label) => loader.setProgress(pct, label));

  const ui = new UIManager(state, sceneManager, cameraCtrl);

  function storedViewToTarget(view: StoredView | null): DeepLinkTarget | null {
    if (!view) return null;
    if (view.scale >= ScaleLevel.PLANET) {
      return {
        kind: view.godsEye ? 'eye' : 'planet',
        systemId: view.systemId,
        planetId: view.planetId,
      };
    }
    if (view.scale === ScaleLevel.STAR_SYSTEM) {
      return { kind: 'system', systemId: view.systemId };
    }
    return { kind: 'view', preset: view.preset };
  }

  function navigateDeepLink(target: DeepLinkTarget): void {
    switch (target.kind) {
      case 'view':
        if (target.preset) ui.applyPreset(target.preset);
        break;

      case 'supercluster': {
        const superclusterId = target.superclusterId;
        if (!superclusterId || !SUPERCLUSTERS.some((sc) => sc.id === superclusterId)) return;
        sceneManager.focusSupercluster(superclusterId);
        break;
      }

      case 'member': {
        const superclusterId = target.superclusterId;
        const memberId = target.memberId;
        const sc = superclusterId
          ? SUPERCLUSTERS.find((cluster) => cluster.id === superclusterId)
          : undefined;
        if (!sc || !memberId || !sc.members.some((m) => m.id === memberId)) return;
        sceneManager.focusSuperclusterMember(sc.id, memberId);
        break;
      }

      case 'system': {
        const systemId = target.systemId;
        const system = systemId ? STAR_SYSTEMS_CATALOG[systemId] : undefined;
        if (!systemId || !system) return;
        state.activeSystemId = systemId;
        state.activePreset = systemId === 'trappist' ? 'trappist' : 'solar';
        sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId });
        cameraCtrl.animateTo(
          system.defaultCamera.theta,
          system.defaultCamera.phi,
          system.defaultCamera.radius,
          [0, 0, 0]
        );
        break;
      }

      case 'planet':
      case 'eye': {
        const systemId = target.systemId || 'solar';
        const system = STAR_SYSTEMS_CATALOG[systemId];
        const planet = system?.planets.find((p) => p.id === target.planetId);
        if (!system || !planet) return;
        state.activePreset =
          target.kind === 'eye'
            ? planet.id === 'earth'
              ? 'earth-gods-eye'
              : 'planet'
            : planet.id === 'earth'
            ? 'earth'
            : planet.id === 'proxima_b'
            ? 'proxima'
            : planet.id === 'k_f'
            ? 'kepler186'
            : 'planet';
        if (target.kind === 'eye') sceneManager.flyToGodsEye(systemId, planet.id);
        else sceneManager.flyToPlanet(systemId, planet.id);
        break;
      }
    }

    if (target.kind !== 'view') {
      ui.onScaleChange(state.currentScale, state.currentScale);
    }
    syncDeepLink(state);
  }

  // Tap any cosmic object to fly into it (works at every scale)
  input.onTap = (x, y) => {
    const hit = sceneManager.pickAt(x, y);
    if (!hit) return;
    const pos = hit.position;

    switch (hit.type) {
      case 'planet':
        sceneManager.flyToPlanet(hit.systemId || state.activeSystemId, hit.id);
        break;
      case 'star':
        if (pos) {
          cameraCtrl.animateTo(0.85, 1.02, 22, [pos.x, pos.y, pos.z]);
        } else {
          cameraCtrl.animateTo(0.85, 1.02, 22, [0, 0, 0]);
        }
        break;
      case 'supercluster':
        sceneManager.focusSupercluster(hit.id);
        break;
      case 'member':
        if (hit.superclusterId) {
          sceneManager.focusSuperclusterMember(hit.superclusterId, hit.id);
        }
        break;
      case 'galaxy':
        if (hit.id === 'milkyway') {
          sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: 'milkyway' });
          cameraCtrl.goToScale(ScaleLevel.GALAXY);
        } else if (pos) {
          sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER, { galaxyId: hit.id });
          cameraCtrl.animateTo(0.55, 0.96, 130, [pos.x, pos.y, pos.z]);
        }
        break;
      case 'solar':
        sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'solar' });
        cameraCtrl.animateTo(0.85, 1.02, 44, [0, 0, 0]);
        break;
      case 'blackhole':
        cameraCtrl.animateTo(0.45, 1.12, 48, pos ? [pos.x, pos.y, pos.z] : [0, 0, 0]);
        break;
    }
  };

  // Wire audio button
  document.getElementById('btn-toggle-sound')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLElement;
    const enabled = audio.toggle();
    state.soundEnabled = enabled;
    button.setAttribute('aria-pressed', String(enabled));
    const icon = document.getElementById('hud-sound-icon');
    if (icon) icon.textContent = enabled ? '🔊' : '🔇';
    Toasts.show(enabled ? '🔊 মহাজাগতিক শব্দ চালু' : '🔇 শব্দ বন্ধ');
  });

  // Wire scale events
  eventBus.on('SCALE_CHANGE', (ev) => {
    if (ev.type === 'SCALE_CHANGE') {
      ui.onScaleChange(ev.from, ev.to);
      audio.setScale(ev.to);
      audio.playWarp();
    }
  });

  // Resume the last view on reload, unless a share link asks for a specific one.
  const initialTarget = parseDeepLink() ?? storedViewToTarget(getStoredView(stored));
  if (initialTarget) navigateDeepLink(initialTarget);

  window.addEventListener('hashchange', () => {
    ui.tour.close();
    const target = parseDeepLink();
    if (target) navigateDeepLink(target);
  });

  // Persist preferences + last view (cheap no-op when nothing changed).
  window.addEventListener('pagehide', () => saveStoredState(state));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveStoredState(state);
  });
  window.setInterval(() => saveStoredState(state), 4000);

  // Resize handler
  window.addEventListener('resize', () => engine.resize());

  // Main render loop
  let lastTime = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;

  function animate(now: number): void {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (state.isPlaying) {
      // Cosmetic shader time (sun churn, twinkles) stays pleasant even at
      // extreme physics time-scales; the physical clock lives in the layers.
      state.elapsedTime += dt * Math.min(state.rotationSpeed, 4);
      // The unified physical clock: elapsed simulated days for telemetry.
      state.elapsedSimDays += dt * state.rotationSpeed * SIM_DAYS_PER_SECOND;
    }

    cameraCtrl.update(dt);
    sceneManager.update(dt, state);
    ui.update();
    engine.render(dt);

    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      state.fps = fpsFrames / fpsAccum;
      ui.hud.updateFps(state.fps);
      fpsAccum = 0;
      fpsFrames = 0;
    }
  }

  requestAnimationFrame(animate);
  loader.hide();
}

boot().catch((err) => {
  console.error('Boot error:', err);
  document.getElementById('loading-screen')?.remove();
  const fallback = document.getElementById('webgl-fallback');
  if (fallback) {
    const message = fallback.querySelector('#webgl-fallback-message');
    if (message) {
      message.textContent =
        'সিমুলেশন চালু করার সময় একটি সমস্যা হয়েছে। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন, অথবা ব্রাউজারের কনসোল দেখুন।';
    }
    fallback.classList.remove('hidden');
  }
});
