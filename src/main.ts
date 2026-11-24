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
  isPlaying: true,
  rotationSpeed: 1.0,
  elapsedTime: 0,
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

async function boot(): Promise<void> {
  const loader = new LoadingScreen();
  loader.setProgress(8, 'WebGL2 পরীক্ষা হচ্ছে...');

  const canvas = document.getElementById('universe-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    loader.hide();
    document.getElementById('webgl-fallback')?.classList.remove('hidden');
    return;
  }

  loader.setProgress(15, 'HDR রেন্ডার ইঞ্জিন চালু হচ্ছে...');
  const engine = new Engine(canvas);
  const sceneManager = new SceneManager(engine, state);
  const cameraCtrl = new CameraController(engine.camera, state);
  sceneManager.bindCameraController(cameraCtrl);
  const input = new InputManager(canvas, cameraCtrl, state);
  const audio = new CosmicAudio();

  await sceneManager.initialize((pct, label) => loader.setProgress(pct, label));

  const ui = new UIManager(state, sceneManager, cameraCtrl);

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
        if (hit.id === 'laniakea') {
          sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER, { clusterId: 'local_group' });
          cameraCtrl.animateTo(0.55, 0.96, 175, pos ? [pos.x, pos.y, pos.z] : [0, 0, 0]);
        } else if (pos) {
          cameraCtrl.animateTo(0.55, 0.96, 200, [pos.x, pos.y, pos.z]);
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
  document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
    const enabled = audio.toggle();
    state.soundEnabled = enabled;
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
      state.elapsedTime += dt * state.rotationSpeed;
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
});
