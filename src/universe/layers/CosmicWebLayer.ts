/**
 * Scale 1: Cosmic Web — supercluster nodes, dense 3D filamentary galaxy web,
 * and cosmic voids (carved around the Boötes Void).
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { SUPERCLUSTERS } from '../../data/cosmicData';
import { buildStarData, createStarPoints, createGlowSprite } from '../helpers';
import { mulberry32, gaussianRandom, densityBrightness } from '../../utils/math';
import { getSuperclusterMemberNodes } from '../superclusters';

export class CosmicWebLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private glows: THREE.Sprite[] = [];
  private glowBaseSizes: number[] = [];
  private filamentGroup = new THREE.Group();
  private flowGroup = new THREE.Group();
  private darkMatterGroup = new THREE.Group();
  private flowCurves: THREE.QuadraticBezierCurve3[] = [];
  private flowTracerPoints: THREE.Points | null = null;
  private flowTracerPhases: Float32Array = new Float32Array(0);
  private flowTracerCurves: Uint16Array = new Uint16Array(0);
  private flowTracerMaterial: THREE.ShaderMaterial | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  constructor() {
    const rand = mulberry32(60606);

    const voidSc = SUPERCLUSTERS.find((s) => s.id === 'bootes_void');
    const voidCenter = voidSc ? new THREE.Vector3(...voidSc.position) : new THREE.Vector3(60, 120, -180);
    const voidRadius = 82;

    // --- Supercluster nodes ---
    interface WebNode {
      pos: THREE.Vector3;
      color: THREE.Color;
      major: boolean;
    }
    const webNodes: WebNode[] = [];

    SUPERCLUSTERS.forEach((sc) => {
      const pos = new THREE.Vector3(...sc.position);
      const isVoid = sc.id === 'bootes_void';
      const size = isVoid ? 12 : 15 + sc.radiusMly * 0.045;

      const halo = createGlowSprite(sc.color, size, isVoid ? 0.14 : 0.34);
      halo.position.copy(pos);
      this.group.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(size);

      if (!isVoid) {
        const coreSize = size * 0.28;
        const core = createGlowSprite('#ffffff', coreSize, 0.65, sc.color);
        core.position.copy(pos);
        this.group.add(core);
        this.glows.push(core);
        this.glowBaseSizes.push(coreSize);

        webNodes.push({ pos, color: new THREE.Color(sc.color), major: true });
      }

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(11, size * 0.55), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      pick.position.copy(pos);
      pick.userData = { pickType: 'supercluster', nodeId: sc.id };
      this.group.add(pick);
      this.pickTargets.push(pick);

      // Named member clusters get their own small core + click target so the
      // supercluster can be explored instead of only viewed as one blob.
      if (!isVoid) {
        getSuperclusterMemberNodes(sc).forEach((node, index) => {
          if (index > 0) {
            const memberGlow = createGlowSprite(
              sc.color,
              Math.max(4, size * (0.14 + (index % 3) * 0.02)),
              0.38,
              '#ffffff'
            );
            memberGlow.position.copy(node.world);
            this.filamentGroup.add(memberGlow);
            this.glows.push(memberGlow);
            this.glowBaseSizes.push(memberGlow.scale.x);
          }

          const memberPick = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(6, size * 0.18), 10, 10),
            pick.material
          );
          memberPick.position.copy(node.world);
          memberPick.userData = {
            pickType: 'member',
            nodeId: node.member.id,
            superclusterId: sc.id,
          };
          this.group.add(memberPick);
          this.pickTargets.push(memberPick);
        });
      }
    });

    // --- Secondary galaxy cluster nodes forming a 3D cosmic web around voids ---
    const clusterPalette = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#38bdf8'];
    for (let i = 0; i < 34; i++) {
      let candidate = new THREE.Vector3();
      for (let attempt = 0; attempt < 12; attempt++) {
        const r = 55 + rand() * 210;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        candidate.set(
          r * Math.sin(ph) * Math.cos(th),
          r * Math.cos(ph) * 0.78,
          r * Math.sin(ph) * Math.sin(th)
        );
        if (candidate.distanceTo(voidCenter) > voidRadius) break;
      }
      if (candidate.distanceTo(voidCenter) <= voidRadius) {
        // Push outward to the rim of Boötes Void (forming a void wall)
        candidate.sub(voidCenter).normalize().multiplyScalar(voidRadius + 10).add(voidCenter);
      }

      const hex = clusterPalette[i % clusterPalette.length];
      const col = new THREE.Color(hex);
      webNodes.push({ pos: candidate, color: col, major: false });

      const subGlow = createGlowSprite(hex, 6 + rand() * 6, 0.22);
      subGlow.position.copy(candidate);
      this.filamentGroup.add(subGlow);
      this.glows.push(subGlow);
      this.glowBaseSizes.push(subGlow.scale.x);
    }

    // --- Branching 3D cosmic filaments + galaxy cluster chains ---
    const filamentParticles: Array<{ pos: THREE.Vector3; color: THREE.Color; size: number }> = [];
    const connected = new Set<string>();

    webNodes.forEach((nodeA, i) => {
      const kNearest = nodeA.major ? 4 : 3;
      const dists = webNodes
        .map((n, j) => ({ j, d: nodeA.pos.distanceTo(n.pos) }))
        .filter((e) => e.j !== i && e.d < 250)
        .sort((a, b) => a.d - b.d)
        .slice(0, kNearest);

      dists.forEach(({ j, d }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (connected.has(key)) return;
        connected.add(key);

        const nodeB = webNodes[j];
        const mid = nodeA.pos.clone().add(nodeB.pos).multiplyScalar(0.5);
        // Organic curvature + push away from Boötes Void
        mid.x += gaussianRandom(rand) * d * 0.09;
        mid.y += gaussianRandom(rand) * d * 0.09;
        mid.z += gaussianRandom(rand) * d * 0.09;
        if (mid.distanceTo(voidCenter) < voidRadius) {
          mid.sub(voidCenter).normalize().multiplyScalar(voidRadius + 12).add(voidCenter);
        }

        const curve = new THREE.QuadraticBezierCurve3(nodeA.pos, mid, nodeB.pos);
        const pts = curve.getPoints(32);

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array(pts.length * 3);
        const tmp = new THREE.Color();
        for (let k = 0; k < pts.length; k++) {
          tmp.copy(nodeA.color).lerp(nodeB.color, k / (pts.length - 1));
          colors[k * 3] = tmp.r;
          colors[k * 3 + 1] = tmp.g;
          colors[k * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const isMajorLink = nodeA.major || nodeB.major;
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: isMajorLink ? 0.42 : 0.24,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        this.filamentGroup.add(line);

        // Dense galaxy clusters hugging the filament spine
        const pCount = isMajorLink ? 85 : 45;
        for (let k = 0; k < pCount; k++) {
          const t = rand();
          const p = curve.getPoint(t);
          const spread = 2.4 + Math.sin(t * Math.PI) * 3.8;
          p.x += gaussianRandom(rand) * spread;
          p.y += gaussianRandom(rand) * spread;
          p.z += gaussianRandom(rand) * spread;
          if (p.distanceTo(voidCenter) < voidRadius * 0.9) continue;
          const col = nodeA.color.clone().lerp(nodeB.color, t);
          if (rand() < 0.25) col.lerp(new THREE.Color('#ffffff'), 0.5);
          filamentParticles.push({
            pos: p,
            color: col,
            size: 0.35 + rand() * 0.72,
          });
        }
      });
    });

    // Dense galaxy swarms inside major supercluster nodes
    webNodes.forEach((n) => {
      const nodeCount = n.major ? 260 : 50;
      const spread = n.major ? 14 : 6;
      for (let k = 0; k < nodeCount; k++) {
        const p = new THREE.Vector3(
          n.pos.x + gaussianRandom(rand) * spread,
          n.pos.y + gaussianRandom(rand) * spread * 0.75,
          n.pos.z + gaussianRandom(rand) * spread
        );
        const col = n.color.clone().lerp(new THREE.Color('#fff5e6'), rand() * 0.55);
        filamentParticles.push({ pos: p, color: col, size: 0.4 + rand() * 0.8 });
      }
    });

    if (filamentParticles.length > 0) {
      const data = buildStarData(filamentParticles.length, (i) => ({
        pos: [filamentParticles[i].pos.x, filamentParticles[i].pos.y, filamentParticles[i].pos.z],
        color: filamentParticles[i].color,
        size: filamentParticles[i].size,
        seed: rand(),
      }));
      const { points, material } = createStarPoints(data, 0.85);
      this.particleMaterial = material;
      this.filamentGroup.add(points);
    }

    this.group.add(this.filamentGroup);

    // --- Boötes Void boundary wireframe sphere ---
    const voidShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(voidRadius, 2),
      new THREE.MeshBasicMaterial({
        color: '#475569',
        wireframe: true,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      })
    );
    voidShell.position.copy(voidCenter);
    this.filamentGroup.add(voidShell);

    // --- Laniakea Gravitational Flow Lines (streamlines toward Great Attractor & Shapley) ---
    const laniakea = SUPERCLUSTERS.find((s) => s.id === 'laniakea');
    const attractorTarget = laniakea
      ? new THREE.Vector3(...laniakea.position).add(new THREE.Vector3(18, -8, 12))
      : new THREE.Vector3(18, -8, 12);

    for (let i = 0; i < 16; i++) {
      const th = (i / 16) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const ph = Math.acos(2 * rand() - 1);
      const r = 75 + rand() * 85;
      const start = new THREE.Vector3(
        attractorTarget.x + r * Math.sin(ph) * Math.cos(th),
        attractorTarget.y + r * Math.cos(ph) * 0.65,
        attractorTarget.z + r * Math.sin(ph) * Math.sin(th)
      );
      const mid = start.clone().lerp(attractorTarget, 0.52);
      mid.x += gaussianRandom(rand) * 18;
      mid.y += gaussianRandom(rand) * 12;
      mid.z += gaussianRandom(rand) * 18;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, attractorTarget);
      this.flowCurves.push(curve);
      const linePts = curve.getPoints(36);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineCols = new Float32Array(linePts.length * 3);
      const cStart = new THREE.Color('#38bdf8');
      const cEnd = new THREE.Color('#fbbf24');
      const cTmp = new THREE.Color();
      for (let k = 0; k < linePts.length; k++) {
        cTmp.copy(cStart).lerp(cEnd, k / (linePts.length - 1));
        lineCols[k * 3] = cTmp.r;
        lineCols[k * 3 + 1] = cTmp.g;
        lineCols[k * 3 + 2] = cTmp.b;
      }
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCols, 3));
      const flowLine = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      flowLine.frustumCulled = false;
      this.flowGroup.add(flowLine);
    }

    const tracerTotal = this.flowCurves.length * 10;
    this.flowTracerPhases = new Float32Array(tracerTotal);
    this.flowTracerCurves = new Uint16Array(tracerTotal);
    const tracerData = buildStarData(tracerTotal, (idx) => {
      const cIdx = idx % this.flowCurves.length;
      const phase = rand();
      this.flowTracerCurves[idx] = cIdx;
      this.flowTracerPhases[idx] = phase;
      const p = this.flowCurves[cIdx].getPoint(phase);
      return {
        pos: [p.x, p.y, p.z],
        color: new THREE.Color(phase > 0.6 ? '#fde68a' : '#7dd3fc'),
        size: 0.95 + rand() * 0.5,
        seed: rand(),
      };
    });
    const tracers = createStarPoints(tracerData, 1.35);
    this.flowTracerPoints = tracers.points;
    this.flowTracerMaterial = tracers.material;
    this.flowGroup.add(tracers.points);
    this.group.add(this.flowGroup);

    // --- Dark Matter Halos enveloping superclusters & web nodes ---
    SUPERCLUSTERS.filter((s) => s.id !== 'bootes_void').forEach((sc) => {
      const dmHalo = createGlowSprite('#7c3aed', 36 + sc.radiusMly * 0.18, 0.28, '#a855f7');
      dmHalo.position.set(...sc.position);
      this.darkMatterGroup.add(dmHalo);
    });
    webNodes.slice(0, 18).forEach((wn) => {
      if (!wn.major) {
        const subDm = createGlowSprite('#6366f1', 18, 0.22, '#818cf8');
        subDm.position.copy(wn.pos);
        this.darkMatterGroup.add(subDm);
      }
    });
    this.darkMatterGroup.visible = false;
    this.group.add(this.darkMatterGroup);
  }

  public build(): void {
    // Static layer.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    const ageNorm = THREE.MathUtils.clamp(state.cosmicAge / 13.8, 0, 1);
    const expansionScale = 0.65 + 0.35 * Math.pow(Math.max(0.05, ageNorm), 0.6);
    const maturity = THREE.MathUtils.smoothstep(state.cosmicAge, 0.15, 2.5);

    this.group.scale.setScalar(expansionScale);
    this.group.rotation.y += dt * 0.008 * Math.min(state.rotationSpeed, 6);
    this.filamentGroup.visible = state.layers.cosmicWeb && maturity > 0.02;
    this.flowGroup.visible = state.layers.flowLines && maturity > 0.08;
    this.darkMatterGroup.visible = state.layers.darkMatter && maturity > 0.05;

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = state.elapsedTime;
      this.particleMaterial.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
      this.particleMaterial.uniforms.uBrightness.value =
        densityBrightness(state.density) * (0.2 + 0.8 * maturity);
    }

    if (this.flowTracerPoints && this.flowTracerMaterial && this.flowGroup.visible) {
      const posAttr = this.flowTracerPoints.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const tmpPt = new THREE.Vector3();
      const flowAdvance = state.isPlaying ? dt * 0.14 * Math.min(state.rotationSpeed, 4) : 0;
      for (let i = 0; i < this.flowTracerPhases.length; i++) {
        let p = this.flowTracerPhases[i] + flowAdvance;
        if (p > 1) p -= 1;
        this.flowTracerPhases[i] = p;
        this.flowCurves[this.flowTracerCurves[i]].getPoint(p, tmpPt);
        const off = i * 3;
        arr[off] = tmpPt.x;
        arr[off + 1] = tmpPt.y;
        arr[off + 2] = tmpPt.z;
      }
      posAttr.needsUpdate = true;
      this.flowTracerMaterial.uniforms.uTime.value = state.elapsedTime;
      this.flowTracerMaterial.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    }

    const pulse = 1 + Math.sin(state.elapsedTime * 0.8) * 0.06;
    this.glows.forEach((g, i) => {
      const base = this.glowBaseSizes[i] || 1;
      g.scale.set(
        base * pulse * Math.max(0.25, maturity),
        base * pulse * Math.max(0.25, maturity),
        1
      );
    });
  }

  public dispose(): void {
    this.group.clear();
    this.glows = [];
    this.glowBaseSizes = [];
  }
}
