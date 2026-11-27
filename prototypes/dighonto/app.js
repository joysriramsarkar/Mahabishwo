const $ = (id) => document.getElementById(id);

async function start() {
  const THREE = await import("three");
  const { OrbitControls } = await import(
    "three/addons/controls/OrbitControls.js"
  );

  const CONFIG = {
    seed: 2026,
    count: 16000,
    maxZ: 8,
    displayRadius: 360,

    // শুধু ডেমোর distance conversion।
    H0: 67.7,
    omegaM: 0.311,
    c: 299792.458
  };

  const stage = $("stage");
  const canvas = $("universe");

  let mode = "space";
  let selected = -1;
  let toastTimer = 0;

  const viewport = { width: 1, height: 1 };

  const format = (n, digits = 2) =>
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });

  function notify(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("toast").hidden = true;
    }, 3200);
  }

  // ------------------------------------------------------------
  // 1. সরল flat ΛCDM distance table
  //    z <= 8 ডেমোর জন্য radiation বাদ দেওয়া হয়েছে।
  // ------------------------------------------------------------

  const STEPS = 2400;
  const dz = CONFIG.maxZ / STEPS;
  const chiTable = new Float64Array(STEPS + 1);
  const lookbackTable = new Float64Array(STEPS + 1);

  const E = (z) =>
    Math.sqrt(
      CONFIG.omegaM * (1 + z) ** 3 +
      (1 - CONFIG.omegaM)
    );

  for (let i = 1; i <= STEPS; i++) {
    const z0 = (i - 1) * dz;
    const z1 = i * dz;

    const invE0 = 1 / E(z0);
    const invE1 = 1 / E(z1);

    chiTable[i] =
      chiTable[i - 1] +
      (CONFIG.c / CONFIG.H0) *
      dz * 0.5 * (invE0 + invE1);

    lookbackTable[i] =
      lookbackTable[i - 1] +
      (977.8 / CONFIG.H0) *
      dz * 0.5 *
      (invE0 / (1 + z0) + invE1 / (1 + z1));
  }

  function tableAt(z, table) {
    const x = THREE.MathUtils.clamp(z, 0, CONFIG.maxZ) / dz;
    const i = Math.min(STEPS - 1, Math.floor(x));
    const t = x - i;

    return table[i] * (1 - t) + table[i + 1] * t;
  }

  function zFromDistance(distance) {
    let lo = 0;
    let hi = STEPS;

    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;

      if (chiTable[mid] < distance) lo = mid;
      else hi = mid;
    }

    const t =
      (distance - chiTable[lo]) /
      (chiTable[hi] - chiTable[lo]);

    return (lo + t) * dz;
  }

  const maxChi = chiTable[STEPS];

  // ------------------------------------------------------------
  // 2. Seeded synthetic catalog
  //    এটি cosmological simulation নয়।
  // ------------------------------------------------------------

  let randomState = CONFIG.seed;

  function random() {
    let t = randomState += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function gaussian() {
    const u = Math.max(1e-9, random());
    return Math.sqrt(-2 * Math.log(u)) *
      Math.cos(2 * Math.PI * random());
  }

  function randomSpherePoint() {
    const p = new THREE.Vector3();

    do {
      p.set(
        random() * 2 - 1,
        random() * 2 - 1,
        random() * 2 - 1
      );
    } while (p.lengthSq() > 1 || p.lengthSq() < 0.002);

    return p.multiplyScalar(0.94);
  }

  const nodes = Array.from(
    { length: 24 },
    () => randomSpherePoint()
  );

  const edges = nodes.map((node, i) => {
    const nearest = nodes
      .map((_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) =>
        node.distanceToSquared(nodes[a]) -
        node.distanceToSquared(nodes[b])
      );

    return [i, nearest[Math.floor(random() * 3)]];
  });

  const catalog = [];
  const spacePositions = new Float32Array(CONFIG.count * 3);
  const skyPositions = new Float32Array(CONFIG.count * 3);
  const colors = new Float32Array(CONFIG.count * 3);
  const sizes = new Float32Array(CONFIG.count);
  const visibility = new Float32Array(CONFIG.count).fill(1);

  for (let i = 0; i < CONFIG.count; i++) {
    let p;

    if (random() < 0.78) {
      const edge = edges[Math.floor(random() * edges.length)];

      p = nodes[edge[0]]
        .clone()
        .lerp(nodes[edge[1]], random());

      p.add(new THREE.Vector3(
        gaussian() * 0.035,
        gaussian() * 0.035,
        gaussian() * 0.035
      ));
    } else {
      p = randomSpherePoint();
    }

    if (p.length() < 0.015) p.setLength(0.015);
    if (p.length() > 0.97) p.setLength(0.97);

    const radius = p.length();
    const chi = radius * maxChi;
    const z = zFromDistance(chi);

    const ra =
      (THREE.MathUtils.radToDeg(Math.atan2(p.y, p.x)) + 360) % 360;

    const dec =
      THREE.MathUtils.radToDeg(Math.asin(p.z / radius));

    const logMass = 8 + 4 * random();
    const quenched = random() < 0.3;

    const sfr =
      10 ** (logMass - 10 + 1.4 * (random() - 0.5)) *
      (quenched ? 0.015 : 1);

    const object = {
      id: `DEMO-${String(i + 1).padStart(6, "0")}`,
      origin: "synthetic-ui-demo",
      ra,
      dec,
      z,
      chi,
      lookback: tableAt(z, lookbackTable),
      logMass,
      sfr,
      uncertainty: null
    };

    catalog.push(object);

    spacePositions.set([
      p.x * CONFIG.displayRadius,
      p.y * CONFIG.displayRadius,
      p.z * CONFIG.displayRadius
    ], i * 3);

    // RA বামদিকে বাড়ছে; Dec ওপরে বাড়ছে।
    skyPositions.set([180 - ra, dec, 0], i * 3);

    // এটি শুধু প্রতীকী point size।
    sizes[i] = 2.1 + (logMass - 8) * 0.65;
  }

  // ------------------------------------------------------------
  // 3. Three.js renderer, camera ও controls
  // ------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050914, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const spaceCamera = new THREE.PerspectiveCamera(
    48, 1, 0.1, 5000
  );

  spaceCamera.up.set(0, 0, 1);
  spaceCamera.position.set(550, 350, 440);

  const skyCamera = new THREE.OrthographicCamera(
    -200, 200, 110, -110, 0.1, 3000
  );

  skyCamera.position.set(0, 0, 1000);

  const reducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const spaceControls = new OrbitControls(spaceCamera, canvas);
  spaceControls.enableDamping = !reducedMotion;
  spaceControls.dampingFactor = 0.07;
  spaceControls.minDistance = 8;
  spaceControls.maxDistance = 2500;

  const skyControls = new OrbitControls(skyCamera, canvas);
  skyControls.enableRotate = false;
  skyControls.enableDamping = !reducedMotion;
  skyControls.minZoom = 0.7;
  skyControls.maxZoom = 16;
  skyControls.enabled = false;

  skyControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  skyControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  skyControls.touches.ONE = THREE.TOUCH.PAN;

  const activeCamera = () =>
    mode === "space" ? spaceCamera : skyCamera;

  const activeControls = () =>
    mode === "space" ? spaceControls : skyControls;

  // ------------------------------------------------------------
  // 4. গ্যালাক্সি points
  // ------------------------------------------------------------

  const geometry = new THREE.BufferGeometry();

  const spaceAttribute = new THREE.BufferAttribute(spacePositions, 3);
  const skyAttribute = new THREE.BufferAttribute(skyPositions, 3);

  geometry.setAttribute("position", spaceAttribute);
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute(
    "aShow",
    new THREE.BufferAttribute(visibility, 1)
  );

  const pointMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,

    uniforms: {
      uDpr: { value: renderer.getPixelRatio() },
      uSky: { value: 0 }
    },

    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aShow;

      uniform float uDpr;
      uniform float uSky;

      varying vec3 vColor;
      varying float vShow;

      void main() {
        vColor = aColor;
        vShow = aShow;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;

        float scale = 1.0;

        if (uSky < 0.5) {
          scale = clamp(
            430.0 / max(40.0, -mv.z),
            0.55,
            4.0
          );
        }

        gl_PointSize = clamp(
          aSize * uDpr * scale,
          1.0,
          20.0
        );

        if (aShow < 0.5) {
          gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
        }
      }
    `,

    fragmentShader: `
      varying vec3 vColor;
      varying float vShow;

      void main() {
        if (vShow < 0.5) discard;

        float r = length(gl_PointCoord - vec2(0.5));
        if (r > 0.5) discard;

        float alpha = 1.0 - smoothstep(0.02, 0.5, r);

        gl_FragColor = vec4(vColor, alpha * 0.92);

        #include <colorspace_fragment>
      }
    `
  });

  const points = new THREE.Points(geometry, pointMaterial);
  points.frustumCulled = false;
  scene.add(points);

  // ------------------------------------------------------------
  // 5. গ্রিড ও পর্যবেক্ষক
  // ------------------------------------------------------------

  const spaceGrid = new THREE.Group();

  const groundGrid = new THREE.GridHelper(
    800, 16, 0x294457, 0x173043
  );

  // Equatorial XY plane
  groundGrid.rotation.x = Math.PI / 2;
  groundGrid.material.transparent = true;
  groundGrid.material.opacity = 0.28;

  spaceGrid.add(groundGrid);

  for (let r = 90; r <= 360; r += 90) {
    const ringPoints = [];

    for (let j = 0; j < 128; j++) {
      const angle = j / 128 * Math.PI * 2;

      ringPoints.push(new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle) * r,
        0
      ));
    }

    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ringPoints),
      new THREE.LineBasicMaterial({
        color: 0x397280,
        transparent: true,
        opacity: 0.18
      })
    );

    spaceGrid.add(ring);
  }

  scene.add(spaceGrid);

  const skyGridPositions = [];

  for (let x = -180; x <= 180; x += 30) {
    skyGridPositions.push(x, -90, -1, x, 90, -1);
  }

  for (let y = -90; y <= 90; y += 15) {
    skyGridPositions.push(-180, y, -1, 180, y, -1);
  }

  const skyGridGeometry = new THREE.BufferGeometry();

  skyGridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(skyGridPositions, 3)
  );

  const skyGrid = new THREE.LineSegments(
    skyGridGeometry,
    new THREE.LineBasicMaterial({
      color: 0x31536c,
      transparent: true,
      opacity: 0.25
    })
  );

  skyGrid.visible = false;
  scene.add(skyGrid);

  const observer = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x55dfd3 })
  );

  scene.add(observer);

  const selectionLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3()
    ]),
    new THREE.LineBasicMaterial({
      color: 0xffc77c,
      transparent: true,
      opacity: 0.5
    })
  );

  selectionLine.visible = false;
  scene.add(selectionLine);

  // ------------------------------------------------------------
  // 6. রং, ফিল্টার ও ইনস্পেক্টর
  // ------------------------------------------------------------

  const blue = new THREE.Color("#6b8bff");
  const cyan = new THREE.Color("#51dfd4");
  const gold = new THREE.Color("#ffc77c");
  const violet = new THREE.Color("#9e83ff");
  const orange = new THREE.Color("#ffb178");
  const tempColor = new THREE.Color();

  function paintPoints() {
    const byMass = $("colorMode").value === "mass";

    for (let i = 0; i < catalog.length; i++) {
      const g = catalog[i];

      if (byMass) {
        const t = (g.logMass - 8) / 4;
        tempColor.copy(violet).lerp(orange, t);
      } else {
        const t = g.z / CONFIG.maxZ;

        if (t < 0.5) {
          tempColor.copy(blue).lerp(cyan, t * 2);
        } else {
          tempColor.copy(cyan).lerp(gold, (t - 0.5) * 2);
        }
      }

      colors.set([
        tempColor.r,
        tempColor.g,
        tempColor.b
      ], i * 3);
    }

    geometry.attributes.aColor.needsUpdate = true;

    $("legendTitle").textContent =
      byMass ? "রং: log₁₀ নাক্ষত্রিক ভর" : "রং: রেডশিফট";

    $("legendMin").textContent = byMass ? "8" : "0";
    $("legendMax").textContent = byMass ? "12" : "8";

    $("legendBar").style.background = byMass
      ? "linear-gradient(90deg, #9e83ff, #ffb178)"
      : "linear-gradient(90deg, #6b8bff, #51dfd4, #ffc77c)";
  }

  function selectedPosition() {
    return new THREE.Vector3().fromBufferAttribute(
      geometry.attributes.position,
      selected
    );
  }

  function syncSelection() {
    const isVisible =
      selected >= 0 && visibility[selected] > 0.5;

    $("outsideFilter").hidden =
      selected < 0 || isVisible;

    selectionLine.visible =
      mode === "space" && isVisible;

    if (selectionLine.visible) {
      selectionLine.geometry.setFromPoints([
        new THREE.Vector3(),
        selectedPosition()
      ]);
    }
  }

  function syncLayers() {
    const gridEnabled = $("showGrid").checked;

    spaceGrid.visible = mode === "space" && gridEnabled;
    skyGrid.visible = mode === "sky" && gridEnabled;

    observer.visible =
      mode === "space" && $("showObserver").checked;

    $("showObserver").disabled = mode === "sky";
  }

  function applyFilters() {
    const maxZ = Number($("zSlider").value);
    const minMass = Number($("minMass").value);
    const enabled = $("showGalaxies").checked;

    let count = 0;

    for (let i = 0; i < catalog.length; i++) {
      const g = catalog[i];

      const show =
        enabled &&
        g.z <= maxZ &&
        g.logMass >= minMass;

      visibility[i] = show ? 1 : 0;
      if (show) count++;
    }

    geometry.attributes.aShow.needsUpdate = true;

    $("zOutput").textContent = maxZ.toFixed(2);
    $("massOutput").textContent = minMass.toFixed(1);

    $("visibleCount").textContent =
      `${format(count, 0)} / ${format(CONFIG.count, 0)}`;

    $("distanceLimit").textContent =
      format(tableAt(maxZ, chiTable), 0);

    $("noResults").hidden = count > 0;

    syncLayers();
    syncSelection();
  }

  function resetFilters() {
    $("showGalaxies").checked = true;
    $("zSlider").value = CONFIG.maxZ;
    $("minMass").value = 8;
    applyFilters();
  }

  function selectObject(index) {
    selected = index;
    const g = catalog[index];

    $("emptyInspector").hidden = true;
    $("objectInspector").hidden = false;

    $("objectId").textContent = g.id;
    $("zValue").textContent = format(g.z, 4);
    $("chiValue").textContent = `${format(g.chi, 0)} Mpc`;
    $("lookbackValue").textContent =
      `${format(g.lookback, 2)} Gyr`;

    $("massValue").textContent = format(g.logMass, 2);
    $("sfrValue").textContent =
      `${format(g.sfr, 3)} M☉ / yr`;

    $("coordValue").textContent =
      `RA ${format(g.ra, 2)}° · Dec ${format(g.dec, 2)}°`;

    syncSelection();

    if (window.innerWidth <= 1120) {
      openPanel("inspector");
    }
  }

  // ------------------------------------------------------------
  // 7. ক্যামেরা ও ভিউ বদল
  // ------------------------------------------------------------

  function resetCamera() {
    if (mode === "space") {
      spaceControls.target.set(0, 0, 0);
      spaceCamera.position.set(550, 350, 440);
      spaceControls.update();
    } else {
      skyControls.target.set(0, 0, 0);
      skyCamera.position.set(0, 0, 1000);
      skyCamera.zoom = 1;
      skyCamera.updateProjectionMatrix();
      skyControls.update();
    }
  }

  function setMode(nextMode) {
    mode = nextMode;

    geometry.setAttribute(
      "position",
      mode === "space" ? spaceAttribute : skyAttribute
    );

    geometry.computeBoundingSphere();

    pointMaterial.uniforms.uSky.value =
      mode === "sky" ? 1 : 0;

    spaceControls.enabled = mode === "space";
    skyControls.enabled = mode === "sky";

    $("mode3d").classList.toggle("active", mode === "space");
    $("modeSky").classList.toggle("active", mode === "sky");

    $("mode3d").setAttribute(
      "aria-pressed", String(mode === "space")
    );

    $("modeSky").setAttribute(
      "aria-pressed", String(mode === "sky")
    );

    $("modeCaption").textContent = mode === "space"
      ? "পর্যবেক্ষককেন্দ্রিক ৩ডি আলোক-শঙ্কুর বিন্যাস; সরাসরি আকাশের ছবি নয়।"
      : "RA–Dec প্রক্ষেপণ; RA বামদিকে ও Dec ওপরের দিকে বাড়ে।";

    $("viewModeLabel").textContent = mode === "space"
      ? "৩ডি আলোক-শঙ্কু"
      : "RA–Dec আকাশচিত্র";

    syncLayers();
    syncSelection();
    resetCamera();
  }

  function focusSelected() {
    if (selected < 0) {
      notify("আগে একটি অবজেক্ট বাছুন।");
      return;
    }

    if (visibility[selected] < 0.5) {
      notify("অবজেক্টটি ফিল্টারের বাইরে। আগে ফিল্টার পরিবর্তন করুন।");
      return;
    }

    const p = selectedPosition();

    if (mode === "space") {
      const direction = spaceCamera.position
        .clone()
        .sub(spaceControls.target)
        .normalize();

      spaceControls.target.copy(p);
      spaceCamera.position.copy(p).addScaledVector(direction, 95);
      spaceControls.update();
    } else {
      skyControls.target.copy(p);
      skyCamera.position.set(p.x, p.y, 1000);
      skyCamera.zoom = 3;
      skyCamera.updateProjectionMatrix();
      skyControls.update();
    }
  }

  // ------------------------------------------------------------
  // 8. JSON export
  // ------------------------------------------------------------

  function downloadJSON(filename, value) {
    const blob = new Blob(
      [JSON.stringify(value, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveView() {
    const camera = activeCamera();
    const controls = activeControls();

    downloadJSON("digonto-view.json", {
      formatVersion: 1,
      application: "Digonto UI Demo",
      data: {
        kind: "synthetic-ui-demo",
        seed: CONFIG.seed,
        objectCount: CONFIG.count
      },
      distanceModel: {
        type: "simplified-flat-LambdaCDM",
        H0: CONFIG.H0,
        omegaM: CONFIG.omegaM,
        radiationIncluded: false
      },
      view: {
        mode,
        cameraPosition: camera.position.toArray(),
        cameraTarget: controls.target.toArray(),
        zoom: camera.zoom,
        colorMode: $("colorMode").value
      },
      filters: {
        maxZ: Number($("zSlider").value),
        minLogStellarMass: Number($("minMass").value),
        galaxiesEnabled: $("showGalaxies").checked
      },
      selectedId: selected >= 0 ? catalog[selected].id : null
    });

    notify("বর্তমান ভিউ JSON হিসেবে সংরক্ষিত হয়েছে।");
  }

  // ------------------------------------------------------------
  // 9. Sidebar drawers ও help
  // ------------------------------------------------------------

  function closePanels() {
    $("leftPanel").classList.remove("is-open");
    $("rightPanel").classList.remove("is-open");

    $("layersToggle").setAttribute("aria-expanded", "false");
    $("inspectorToggle").setAttribute("aria-expanded", "false");

    $("drawerBackdrop").hidden = true;
  }

  function openPanel(which) {
    closePanels();

    const isLayers = which === "layers";

    $(isLayers ? "leftPanel" : "rightPanel")
      .classList.add("is-open");

    $(isLayers ? "layersToggle" : "inspectorToggle")
      .setAttribute("aria-expanded", "true");

    $("drawerBackdrop").hidden = false;
  }

  function togglePanel(which) {
    const panel = $(which === "layers" ? "leftPanel" : "rightPanel");
    const wasOpen = panel.classList.contains("is-open");

    if (wasOpen) closePanels();
    else openPanel(which);
  }

  function openHelp() {
    closePanels();

    if (!$("helpDialog").open) {
      $("helpDialog").showModal();
    }
  }

  // ------------------------------------------------------------
  // 10. Pointer selection
  // ------------------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let pointerStart = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    pointerStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;

    const moved = Math.hypot(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y
    );

    pointerStart = null;

    // Drag-কে click হিসেবে ধরা হবে না।
    if (moved > 5) return;

    const rect = canvas.getBoundingClientRect();

    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.params.Points.threshold =
      mode === "space" ? 3.2 : 1.4;

    raycaster.setFromCamera(pointer, activeCamera());

    const hit = raycaster
      .intersectObject(points)
      .find((item) => visibility[item.index] > 0.5);

    if (hit) selectObject(hit.index);
  });

  canvas.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  // ------------------------------------------------------------
  // 11. UI event bindings
  // ------------------------------------------------------------

  $("mode3d").onclick = () => setMode("space");
  $("modeSky").onclick = () => setMode("sky");
  $("resetCamera").onclick = resetCamera;

  $("colorMode").onchange = paintPoints;

  $("zSlider").oninput = applyFilters;
  $("minMass").oninput = applyFilters;
  $("showGalaxies").onchange = applyFilters;

  $("showGrid").onchange = syncLayers;
  $("showObserver").onchange = syncLayers;

  $("resetFilters").onclick = resetFilters;
  $("resetEmpty").onclick = resetFilters;

  $("focusObject").onclick = focusSelected;
  $("saveButton").onclick = saveView;

  $("exportObject").onclick = () => {
    if (selected < 0) return;

    downloadJSON(`${catalog[selected].id}.json`, {
      application: "Digonto UI Demo",
      warning: "Synthetic object; not an observed galaxy.",
      object: catalog[selected]
    });

    notify("ডেমো অবজেক্টের JSON সংরক্ষিত হয়েছে।");
  };

  $("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const id = $("searchInput").value.trim().toUpperCase();
    const index = catalog.findIndex((item) => item.id === id);

    if (index < 0) {
      notify("এই ID পাওয়া যায়নি। উদাহরণ: DEMO-000125");
      return;
    }

    if (visibility[index] < 0.5) {
      resetFilters();
      notify("অবজেক্টটি দেখাতে ফিল্টার রিসেট করা হয়েছে।");
    }

    selectObject(index);
    focusSelected();
  });

  $("layersToggle").onclick = () => togglePanel("layers");
  $("inspectorToggle").onclick = () => togglePanel("inspector");

  $("drawerBackdrop").onclick = closePanels;

  document.querySelectorAll("[data-close-panels]")
    .forEach((button) => {
      button.onclick = closePanels;
    });

  $("helpButton").onclick = openHelp;
  $("caveatButton").onclick = openHelp;
  $("whyObject").onclick = openHelp;

  $("closeHelp").onclick = () => $("helpDialog").close();

  $("helpDialog").addEventListener("click", (event) => {
    if (event.target === $("helpDialog")) {
      $("helpDialog").close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanels();

    if ($("helpDialog").open) return;

    const editing = event.target.matches(
      "input, select, textarea, [contenteditable='true']"
    );

    if (editing) return;

    if (event.key === "/") {
      event.preventDefault();
      $("searchInput").focus();
    }

    if (event.key.toLowerCase() === "r") resetCamera();
    if (event.key.toLowerCase() === "f") focusSelected();
  });

  // ------------------------------------------------------------
  // 12. Resize ও render loop
  // ------------------------------------------------------------

  function resize() {
    viewport.width = Math.max(1, stage.clientWidth);
    viewport.height = Math.max(1, stage.clientHeight);

    const aspect = viewport.width / viewport.height;

    renderer.setSize(
      viewport.width,
      viewport.height,
      false
    );

    spaceCamera.aspect = aspect;
    spaceCamera.updateProjectionMatrix();

    const halfHeight = Math.max(105, 195 / aspect);

    skyCamera.left = -halfHeight * aspect;
    skyCamera.right = halfHeight * aspect;
    skyCamera.top = halfHeight;
    skyCamera.bottom = -halfHeight;

    skyCamera.updateProjectionMatrix();
  }

  new ResizeObserver(resize).observe(stage);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) closePanels();
  });

  const projected = new THREE.Vector3();

  function updateReticle() {
    if (selected < 0 || visibility[selected] < 0.5) {
      $("reticle").hidden = true;
      return;
    }

    projected
      .copy(selectedPosition())
      .project(activeCamera());

    const onScreen =
      projected.z >= -1 &&
      projected.z <= 1 &&
      Math.abs(projected.x) <= 1 &&
      Math.abs(projected.y) <= 1;

    $("reticle").hidden = !onScreen;

    if (onScreen) {
      $("reticle").style.left =
        `${(projected.x * 0.5 + 0.5) * viewport.width}px`;

      $("reticle").style.top =
        `${(-projected.y * 0.5 + 0.5) * viewport.height}px`;
    }
  }

  let frameCount = 0;
  let lastFPSUpdate = performance.now();

  function render(now) {
    requestAnimationFrame(render);

    if (document.hidden) return;

    activeControls().update();
    renderer.render(scene, activeCamera());
    updateReticle();

    frameCount++;

    if (now - lastFPSUpdate >= 1000) {
      $("fpsValue").textContent = String(
        Math.round(frameCount * 1000 / (now - lastFPSUpdate))
      );

      frameCount = 0;
      lastFPSUpdate = now;
    }
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    $("loader").hidden = false;
    $("loaderText").textContent =
      "গ্রাফিক্স সংযোগ বিচ্ছিন্ন হয়েছে। পৃষ্ঠা পুনরায় লোড করুন।";
  });

  paintPoints();
  applyFilters();
  setMode("space");
  resize();

  $("loader").hidden = true;

  requestAnimationFrame(render);
}

start().catch((error) => {
  console.error(error);

  $("loader").hidden = false;
  $("loader").textContent =
    "৩ডি ভিউ লোড হয়নি। ইন্টারনেট সংযোগ, CDN অ্যাক্সেস এবং WebGL2 সমর্থন পরীক্ষা করুন।";
});
