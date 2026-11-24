/**
 * Scale 0: Observable Universe (~93 billion light-years).
 * A glowing large-scale-structure sphere (CMB / last-scattering surface),
 * a deep field of distant galaxies and filaments tracing the cosmic web.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { SUPERCLUSTERS } from '../../data/cosmicData';
import { CMB_VERTEX, CMB_FRAGMENT } from '../../render/shaders';
import { buildStarData, createStarPoints, createAtmosphere } from '../helpers';
import { mulberry32 } from '../../utils/math';

const SPHERE_RADIUS = 400;

// Approximate on-sphere directions for the superclusters
const NODE_DIRECTIONS: Record<string, [number, number, number]> = {
  laniakea: [0.25, 0.12, 0.96],
  shapley: [0.62, 0.22, -0.42],
  perseus_pisces: [-0.5, 0.32, 0.42],
  coma: [0.02, 0.62, 0.24],
  bootes_void: [0.34, 0.52, -0.72],
};

export class ObservableUniverseLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private cmbMaterial: THREE.ShaderMaterial;
  private starMaterial: THREE.ShaderMaterial;
  private filamentGroup = new THREE.Group();
  private galaxyPoints: THREE.Points;

  constructor() {
    // --- Large-scale-structure sphere ---
    const cmbGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 96, 96);
    this.cmbMaterial = new THREE.ShaderMaterial({
      vertexShader: CMB_VERTEX,
      fragmentShader: CMB_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uBrightness: { value: 0.85 },
        uOpacity: { value: 1 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: true,
    });
    const cmb = new THREE.Mesh(cmbGeo, this.cmbMaterial);
    cmb.frustumCulled = false;
    this.group.add(cmb);

    // Invisible pick spheres on supercluster nodes (tap to fly there)
    const pickMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    SUPERCLUSTERS.forEach((sc) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(26, 12, 12), pickMat);
      s.position.set(...sc.position);
      s.userData = { pickType: 'supercluster', nodeId: sc.id };
      this.group.add(s);
      this.pickTargets.push(s);
    });

    // Subtle cosmic-horizon rim glow around the observable sphere
    const horizonGlow = createAtmosphere(SPHERE_RADIUS * 1.03, '#3b82f6', 0.3, 4.2);
    this.group.add(horizonGlow.mesh);

    // --- Distant galaxy deep field ---
    const rand = mulberry32(90210);
    const count = 7000;
    const data = buildStarData(count, () => {
      const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
      if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
      dir.normalize();
      const r = 352 + rand() * 42;
      const color = new THREE.Color().setHSL(0.55 + rand() * 0.12, 0.3 + rand() * 0.35, 0.45 + rand() * 0.3);
      if (rand() < 0.25) color.setHSL(0.08, 0.55, 0.5);
      return {
        pos: [dir.x * r, dir.y * r, dir.z * r],
        color,
        size: 0.3 + rand() * 0.7,
        seed: rand(),
      };
    });
    const { points, material } = createStarPoints(data, 0.7);
    this.starMaterial = material;
    this.galaxyPoints = points;
    this.group.add(points);

    // --- Filaments on the sphere surface ---
    const nodePositions = SUPERCLUSTERS.map((sc) => {
      const dir = new THREE.Vector3(...(NODE_DIRECTIONS[sc.id] || [0, 0, 1])).normalize();
      return dir.multiplyScalar(SPHERE_RADIUS * 1.005);
    });

    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const a = nodePositions[i];
        const b = nodePositions[j];
        const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(SPHERE_RADIUS * 1.02);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const pts = curve.getPoints(48);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array(pts.length * 3);
        const cA = new THREE.Color(SUPERCLUSTERS[i].color);
        const cB = new THREE.Color(SUPERCLUSTERS[j].color);
        const tmp = new THREE.Color();
        for (let k = 0; k < pts.length; k++) {
          tmp.copy(cA).lerp(cB, k / (pts.length - 1));
          colors[k * 3] = tmp.r;
          colors[k * 3 + 1] = tmp.g;
          colors[k * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        this.filamentGroup.add(line);
      }
    }
    this.group.add(this.filamentGroup);
  }

  public build(): void {
    // Static layer — everything is built in the constructor.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    this.cmbMaterial.uniforms.uTime.value += dt;
    this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    this.starMaterial.uniforms.uScale.value =
      0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    this.filamentGroup.visible = state.layers.cosmicWeb;
    this.group.rotation.y += dt * 0.004 * Math.min(state.rotationSpeed, 6);
  }

  public dispose(): void {
    this.group.clear();
  }
}
