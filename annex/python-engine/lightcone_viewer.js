// ui/src/LightconeView.js
import * as THREE from "three";
import { tableFromIPC } from "apache-arrow";

export class LightconeView {
  constructor(canvas, api) {
    this.api = api;
    this.renderer = new THREE.WebGLRenderer({ canvas, logarithmicDepthBuffer: true });
    this.scene = new THREE.Scene();
    // far plane = 15 Gpc ; near = 1 kpc  → log-depth অপরিহার্য
    this.camera = new THREE.PerspectiveCamera(50, 1, 1e-3, 2e4);
    this.frame = "observed";           // "observed" | "comoving-now"
    this.shells = new Map();           // z-bin → THREE.Points (LOD)
  }

  // পর্যবেক্ষিত ফ্রেম: গ্যালাক্সি বসে χ(z_obs) এ, যেমনটা আলো এসেছে
  // comoving-now ফ্রেম: একই বস্তু "আজ" কোথায়  (volume realization থেকে)
  positionFor(g) {
    const r = this.frame === "observed" ? g.chi : g.chi_now ?? g.chi;
    const th = THREE.MathUtils.degToRad(90 - g.dec), ph = THREE.MathUtils.degToRad(g.ra);
    return [r*Math.sin(th)*Math.cos(ph), r*Math.sin(th)*Math.sin(ph), r*Math.cos(th)];
  }

  async loadCone({ ra, dec, radius_deg, z_min, z_max, min_logmstar }) {
    const meta = await this.api.post("/galaxies/cone", { ra, dec, radius_deg, z_min, z_max, min_logmstar });
    const buf  = await (await fetch(meta.arrow_ipc_url)).arrayBuffer();
    const tbl  = tableFromIPC(buf);
    const n = tbl.numRows, pos = new Float32Array(3*n), col = new Float32Array(3*n), size = new Float32Array(n);
    const ra_ = tbl.getChild("ra").toArray(), dec_ = tbl.getChild("dec").toArray(),
          chi = tbl.getChild("chi").toArray(), ms = tbl.getChild("log_mstar").toArray(),
          sfr = tbl.getChild("sfr").toArray(), z = tbl.getChild("z_obs").toArray();
    for (let i=0;i<n;i++){
      const [x,y,zz] = this.positionFor({ra:ra_[i],dec:dec_[i],chi:chi[i]});
      pos.set([x,y,zz], 3*i);
      // রং: সত্যিকারের রং (SPS) বা এনকোডেড বৈশিষ্ট্য — এখানে sSFR
      const ssfr = Math.log10(sfr[i]/10**ms[i] + 1e-13);
      const c = ssfr > -10.5 ? [0.4,0.6,1.0] : [1.0,0.5,0.3];
      col.set(c, 3*i);
      size[i] = Math.max(0.5, (ms[i]-8)) * (1+z[i]);   // cosmological dimming ইঙ্গিত
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
    geo.setAttribute("color",    new THREE.BufferAttribute(col,3));
    geo.setAttribute("psize",    new THREE.BufferAttribute(size,1));
    const mat = new THREE.ShaderMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 1.0 }, uFrame: { value: this.frame === "observed" ? 1 : 0 } },
      vertexShader: `
        attribute float psize; varying vec3 vCol;
        void main(){ vCol=color; vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize = psize * 300.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `
        varying vec3 vCol; void main(){ float d=length(gl_PointCoord-0.5);
          if(d>0.5) discard; gl_FragColor=vec4(vCol, 1.0-2.0*d); }`
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts); this.shells.set(`${z_min}-${z_max}`, pts);
  }

  // স্কেল-ন্যাভিগেশন: ক্যামেরা দূরত্ব অনুযায়ী LOD (শেল-ভিত্তিক) লোড/আনলোড
  updateLOD(cameraChi) {
    for (const [key, pts] of this.shells) {
      const [z0,z1] = key.split("-").map(Number);
      pts.visible = true;                 // শেল-কালিং এখানে
    }
  }

  setFrame(frame){ this.frame = frame; /* সব শেল পুনঃস্থাপন */ }
  render(){ this.renderer.render(this.scene, this.camera); }
