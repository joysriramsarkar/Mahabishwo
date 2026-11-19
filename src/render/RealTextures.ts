/**
 * Real photographic texture loader (NASA / USGS planetary maps).
 *
 * Textures are streamed from public CDNs (jsDelivr mirrors of the three.js
 * example textures and the threex.planets map collection — both CORS-open).
 * While a real map is downloading the procedural texture is shown; the
 * material is upgraded in place the moment the photograph arrives.
 *
 * If the network is unavailable, everything silently stays procedural.
 */
import * as THREE from 'three';

const THREE_TEX = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets';
const THREEX_TEX = 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images';

export interface RealSet {
  map?: THREE.Texture;
  bumpMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  cloudMap?: THREE.Texture;
  nightMap?: THREE.Texture;
}

const DEFINITIONS: Record<string, { map: string; bump?: string; normal?: string; specular?: string; clouds?: string; night?: string }> = {
  earth: {
    map: `${THREE_TEX}/earth_atmos_2048.jpg`,
    normal: `${THREE_TEX}/earth_normal_2048.jpg`,
    specular: `${THREE_TEX}/earth_specular_2048.jpg`,
    clouds: `${THREE_TEX}/earth_clouds_1024.png`,
    night: `${THREE_TEX}/earth_lights_2048.png`,
  },
  moon: { map: `${THREE_TEX}/moon_1024.jpg`, bump: `${THREEX_TEX}/moonbump1k.jpg` },
  mercury: { map: `${THREEX_TEX}/mercurymap.jpg`, bump: `${THREEX_TEX}/mercurybump.jpg` },
  venus: { map: `${THREEX_TEX}/venusmap.jpg`, bump: `${THREEX_TEX}/venusbump.jpg` },
  mars: { map: `${THREEX_TEX}/marsmap1k.jpg`, bump: `${THREEX_TEX}/marsbump1k.jpg` },
  jupiter: { map: `${THREEX_TEX}/jupitermap.jpg` },
  saturn: { map: `${THREEX_TEX}/saturnmap.jpg` },
  uranus: { map: `${THREEX_TEX}/uranusmap.jpg` },
  neptune: { map: `${THREEX_TEX}/neptunemap.jpg` },
  sun_yellow: { map: `${THREEX_TEX}/sunmap.jpg` },
};

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

const cache = new Map<string, RealSet>();
const pending = new Map<string, Promise<RealSet>>();
const subscribers = new Map<string, Set<(set: RealSet) => void>>();

function loadTex(url: string, srgb: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/** Invert a specular map (ocean=shiny) into a roughness map (ocean=smooth). */
function invertToRoughness(tex: THREE.Texture): THREE.CanvasTexture | undefined {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img || !img.width) return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      // Ocean (bright in specular) -> smooth (dark roughness ~35)
      // Land (dark in specular) -> rough (bright ~235)
      const rough = 235 - (d[i] / 255) * 200;
      d[i] = rough;
      d[i + 1] = rough;
      d[i + 2] = rough;
    }
    ctx.putImageData(data, 0, 0);
    const out = new THREE.CanvasTexture(canvas);
    out.wrapS = THREE.RepeatWrapping;
    out.colorSpace = THREE.NoColorSpace;
    out.needsUpdate = true;
    return out;
  } catch {
    return undefined;
  }
}

async function loadSet(type: string): Promise<RealSet> {
  const def = DEFINITIONS[type];
  if (!def) return {};
  const set: RealSet = {};

  const jobs: Array<Promise<void>> = [];
  const assign = (key: keyof RealSet, url: string | undefined, srgb: boolean) => {
    if (!url) return;
    jobs.push(
      loadTex(url, srgb)
        .then((t) => {
          set[key] = t;
        })
        .catch(() => {
          /* keep procedural fallback */
        })
    );
  };

  assign('map', def.map, true);
  assign('bumpMap', def.bump, false);
  assign('normalMap', def.normal, false);
  assign('cloudMap', def.clouds, true);
  assign('nightMap', def.night, true);

  if (def.specular) {
    jobs.push(
      loadTex(def.specular, false)
        .then((t) => {
          const rough = invertToRoughness(t);
          if (rough) set.roughnessMap = rough;
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(jobs);
  return set;
}

export class RealTextures {
  public static has(type: string): boolean {
    return type in DEFINITIONS;
  }

  /** Returns the real set if already downloaded, otherwise triggers download. */
  public static get(type: string): RealSet | null {
    if (!DEFINITIONS[type]) return null;
    const hit = cache.get(type);
    if (hit) return hit;
    if (!pending.has(type)) {
      const p = loadSet(type).then((set) => {
        cache.set(type, set);
        subscribers.get(type)?.forEach((cb) => cb(set));
        subscribers.delete(type);
        return set;
      });
      pending.set(type, p);
    }
    return null;
  }

  /** Run cb with the real set — immediately if cached, else when downloaded. */
  public static whenReady(type: string, cb: (set: RealSet) => void): void {
    const hit = this.get(type);
    if (hit) {
      cb(hit);
      return;
    }
    if (!DEFINITIONS[type]) return;
    if (!subscribers.has(type)) subscribers.set(type, new Set());
    subscribers.get(type)!.add(cb);
  }

  /**
   * Apply real maps to a MeshStandardMaterial (in place upgrade).
   * Keeps procedural maps for any slot the real set does not provide.
   */
  public static applyToMaterial(
    type: string,
    material: THREE.MeshStandardMaterial,
    options: { clouds?: boolean } = {}
  ): void {
    this.whenReady(type, (set) => {
      if (set.map) material.map = set.map;
      if (set.normalMap) {
        material.normalMap = set.normalMap;
        material.normalScale = new THREE.Vector2(0.9, 0.9);
        material.bumpMap = null;
      } else if (set.bumpMap) {
        material.bumpMap = set.bumpMap;
      }
      if (set.roughnessMap) material.roughnessMap = set.roughnessMap;
      if (set.nightMap) {
        material.emissiveMap = set.nightMap;
        material.emissive = new THREE.Color('#ffca7a');
        material.emissiveIntensity = 1.0;
      }
      material.needsUpdate = true;
    });
  }

  /** Apply a real cloud map to a cloud-layer material. */
  public static applyClouds(type: string, material: THREE.MeshStandardMaterial): void {
    this.whenReady(type, (set) => {
      if (!set.cloudMap) return;
      material.map = set.cloudMap;
      material.alphaMap = set.cloudMap;
      material.transparent = true;
      material.needsUpdate = true;
    });
  }

  /** Preload the most important bodies so first zoom is already photographic. */
  public static preloadCore(): void {
    ['earth', 'moon', 'mars', 'jupiter', 'saturn', 'sun_yellow'].forEach((t) => this.get(t));
  }
}
