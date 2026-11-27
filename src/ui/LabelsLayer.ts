/**
 * 3D-to-2D Projected Landmark Pins Layer.
 * Projects active superclusters, galaxies, galactic landmarks and planets
 * into crisp interactive pills floating over the canvas.
 */
import * as THREE from 'three';
import { AppState, ProjectedPin, ScaleLevel } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { SUPERCLUSTERS, GALAXIES } from '../data/cosmicData';
import { SOLAR_GALACTIC_POS, M32_REL_POS, M110_REL_POS } from '../universe/layers/GalaxyLayer';
import { getSuperclusterMemberNodes } from '../universe/superclusters';

export class LabelsLayer {
  private el: HTMLElement;
  private state: AppState;
  private sceneManager: SceneManager;
  private cameraCtrl: CameraController;

  private pins: ProjectedPin[] = [];
  private proj = new THREE.Vector3();
  private worldTmp = new THREE.Vector3();

  constructor(state: AppState, sceneManager: SceneManager, cameraCtrl: CameraController) {
    this.el = document.getElementById('labels-layer')!;
    this.state = state;
    this.sceneManager = sceneManager;
    this.cameraCtrl = cameraCtrl;
  }

  public rebuild(): void {
    this.el.innerHTML = '';
    this.pins = [];

    const scale = this.state.currentScale;

    if (this.state.collisionMode) {
      const col = this.sceneManager.galaxyCollision;
      this.addPin(
        'collision_mw',
        '✨ আকাশগঙ্গা কোর (Milky Way)',
        '#fde68a',
        col.core1Marker.position,
        true,
        () => {
          this.cameraCtrl.animateTo(
            0.55,
            0.96,
            40,
            col.core1Marker.position,
            1.1,
            () => this.cameraCtrl.trackObject(col.core1Marker, false),
            col.core1Marker
          );
        },
        'landmark',
        3.8
      );
      this.addPin(
        'collision_m31',
        '🌀 অ্যান্ড্রোমিডা কোর (M31)',
        '#c084fc',
        col.core2Marker.position,
        true,
        () => {
          this.cameraCtrl.animateTo(
            0.55,
            0.96,
            40,
            col.core2Marker.position,
            1.1,
            () => this.cameraCtrl.trackObject(col.core2Marker, false),
            col.core2Marker
          );
        },
        'landmark',
        3.8
      );
      return;
    }

    if (scale === ScaleLevel.OBSERVABLE_UNIVERSE || scale === ScaleLevel.COSMIC_WEB) {
      SUPERCLUSTERS.forEach((sc) => {
        if (sc.id === this.state.activeSuperclusterId) return;
        const worldPos = new THREE.Vector3(...sc.position);
        this.addPin(sc.id, sc.nameBn, sc.color, worldPos, true, () => {
          this.sceneManager.focusSupercluster(sc.id);
        }, 'supercluster');
      });

      // Once a supercluster is selected, expose its named member clusters as
      // their own pins so the detail panel and the 3D view stay in sync.
      const active = SUPERCLUSTERS.find((sc) => sc.id === this.state.activeSuperclusterId);
      if (active) {
        getSuperclusterMemberNodes(active).forEach((node) => {
          const isSelected = node.member.id === this.state.activeMemberClusterId;
          const shortLabel = node.member.nameBn
            .replace(/\s*\(.*?\)\s*/g, ' ')
            .replace(/\s*ক্লাস্টার\s*/, ' ')
            .trim();
          this.addPin(
            node.member.id,
            shortLabel || node.member.nameBn,
            active.color,
            node.world,
            isSelected,
            () => this.sceneManager.focusSuperclusterMember(active.id, node.member.id),
            'member'
          );
        });
      }
    } else if (scale === ScaleLevel.GALAXY_CLUSTER) {
      GALAXIES.forEach((g) => {
        this.addPin(g.id, g.nameBn, g.color, new THREE.Vector3(...g.position), g.id === 'milkyway' || g.id === 'andromeda', () => {
          if (g.id === 'milkyway' || g.id === 'andromeda' || g.id === 'triangulum') {
            this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: g.id });
            this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
          } else {
            this.sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER, { galaxyId: g.id });
            this.cameraCtrl.animateTo(0.55, 0.96, 130, g.position);
          }
        });
      });
    } else if (scale === ScaleLevel.GALAXY && this.state.activeGalaxyId === 'milkyway') {
      this.addPin('sgr_a', 'স্যাজিটেরিয়াস এ* (ব্ল্যাক হোল)', '#fbbf24', new THREE.Vector3(0, 0, 0), true, () => {
        this.cameraCtrl.animateTo(0.45, 1.12, 68, [0, 0, 0]);
      });
      this.addPin('solar_loc', '☀️ আমাদের সৌরজগৎ', '#fde047', SOLAR_GALACTIC_POS.clone(), true, () => {
        this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'solar' });
        this.cameraCtrl.animateTo(0.85, 1.02, 46, [0, 0, 0]);
      });
    } else if (scale === ScaleLevel.GALAXY && this.state.activeGalaxyId === 'andromeda') {
      this.addPin('m31_core', 'M31 দ্বৈত নিউক্লিয়াস (১৪ কোটি M☉ BH)', '#c084fc', new THREE.Vector3(0, 0, 0), true, () => {
        this.cameraCtrl.animateTo(0.45, 1.12, 56, [0, 0, 0]);
      });
      this.addPin('m32_sat', 'উপগ্রহ ছায়াপথ M32', '#fde68a', M32_REL_POS.clone(), false, () => {
        this.cameraCtrl.animateTo(0.65, 1.02, 42, M32_REL_POS);
      });
      this.addPin('m110_sat', 'উপগ্রহ ছায়াপথ M110', '#e2e8f0', M110_REL_POS.clone(), false, () => {
        this.cameraCtrl.animateTo(0.65, 1.02, 46, M110_REL_POS);
      });
    } else if (scale === ScaleLevel.STAR_SYSTEM) {
      this.sceneManager.starSystem.planets.forEach((p) => {
        const isSpecial = p.data.id === 'earth' || p.data.id === 'proxima_b' || p.data.id === 't1_e' || p.data.id === 'k_f';
        this.addPin(p.data.id, p.data.shortNameBn, p.data.color, p.group.position, isSpecial, () => {
          this.sceneManager.flyToPlanet(this.sceneManager.starSystem.activeSystemId, p.data.id);
        });
      });
      const comet = this.sceneManager.starSystem.comets[0];
      if (comet) {
        const cometWorld = new THREE.Vector3();
        this.addPin('solar_comet', '☄️ ধূমকেতু (হ্যালি)', '#7dd3fc', comet.bodyGroup.position, false, () => {
          comet.bodyGroup.getWorldPosition(cometWorld);
          this.cameraCtrl.animateTo(
            0.75,
            1.05,
            14,
            cometWorld,
            1.2,
            () => this.cameraCtrl.trackObject(comet.bodyGroup, false),
            comet.bodyGroup
          );
        });
      }
    }
  }

  private addPin(
    id: string,
    text: string,
    color: string,
    worldPos: THREE.Vector3,
    pulse: boolean,
    onClick: () => void,
    kind: 'supercluster' | 'member' | 'landmark' = 'landmark',
    yOffset = 0
  ): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'landmark-pin';
    btn.innerHTML = `<span class="pin-dot ${pulse ? 'pulse' : ''}" style="background:${color}; color:${color}"></span><span>${text}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    this.el.appendChild(btn);
    this.pins.push({ id, el: btn, worldPos, onClick, kind, yOffset });
  }

  public update(): void {
    if (!this.state.layers.labels) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cam = this.sceneManager.engine.camera;
    const scale = this.state.currentScale;

    const selectedId = this.state.activeMemberClusterId ?? this.state.activeSuperclusterId;
    const placed: Array<{ x: number; y: number }> = [];

    this.pins.forEach((pin) => {
      pin.el.classList.toggle('selected', pin.id === selectedId);
      pin.el.setAttribute('aria-pressed', String(pin.id === selectedId));

      this.worldTmp.copy(pin.worldPos);
      if (pin.yOffset) this.worldTmp.y += pin.yOffset;
      // Account for rotating / transforming parent layer groups
      if (this.state.collisionMode) {
        this.worldTmp.applyMatrix4(this.sceneManager.galaxyCollision.group.matrixWorld);
      } else if (scale === ScaleLevel.OBSERVABLE_UNIVERSE) {
        this.worldTmp.applyMatrix4(this.sceneManager.observableUniverse.group.matrixWorld);
      } else if (scale === ScaleLevel.GALAXY) {
        this.worldTmp.applyMatrix4(this.sceneManager.galaxy.group.matrixWorld);
      } else if (scale === ScaleLevel.COSMIC_WEB) {
        this.worldTmp.applyMatrix4(this.sceneManager.cosmicWeb.group.matrixWorld);
      } else if (scale === ScaleLevel.GALAXY_CLUSTER) {
        this.worldTmp.applyMatrix4(this.sceneManager.localGroup.group.matrixWorld);
      } else if (scale === ScaleLevel.STAR_SYSTEM) {
        if (pin.id === 'solar_comet' && this.sceneManager.starSystem.comets[0]) {
          this.sceneManager.starSystem.comets[0].bodyGroup.getWorldPosition(this.worldTmp);
        } else {
          this.worldTmp.applyMatrix4(this.sceneManager.starSystem.group.matrixWorld);
        }
      }

      this.proj.copy(this.worldTmp).project(cam);
      if (this.proj.z > 1) {
        pin.el.style.opacity = '0';
        pin.el.style.pointerEvents = 'none';
        return;
      }

      let x = (this.proj.x * 0.5 + 0.5) * w;
      let y = (-this.proj.y * 0.5 + 0.5) * h;

      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) {
        pin.el.style.opacity = '0';
        pin.el.style.pointerEvents = 'none';
        return;
      }

      // Member / comet pins can sit close to neighboring nodes or planets. Nudge overlapping labels
      // downward in screen space instead of stacking them into an unreadable pile.
      if (pin.kind === 'member' || pin.id === 'solar_comet') {
        let guard = 0;
        while (
          guard < 8 &&
          placed.some((p) => Math.abs(p.y - y) < 27 && Math.abs(p.x - x) < 145)
        ) {
          y += 29;
          guard++;
        }
      }

      placed.push({ x, y });
      pin.el.style.left = `${x}px`;
      pin.el.style.top = `${y}px`;
      pin.el.style.opacity = '1';
      pin.el.style.pointerEvents = 'auto';
    });
  }
}
