/* ============================================================================
   TRAILDENSE — main.js
   - background: procedural Cascade-foothills terrain w/ shader contour lines
   - foreground: animated trail tubes growing across the terrain
   - scroll-driven camera path
   - second canvas: 3D phone mockup
============================================================================ */

import * as THREE from 'three';

/* --------------------------------------------------- simplex noise (2D)   */
/* compact public-domain implementation by Stefan Gustavson, ported to JS  */
const Simplex = (() => {
  const grad3 = new Float32Array([1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
                                  1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
                                  0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1]);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates with a fixed seed (so terrain is reproducible)
  let seed = 1337;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }

  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  function noise2D(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]] * 3;
    const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
    const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0+1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1+1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2+1] * y2); }
    return 70 * (n0 + n1 + n2);
  }
  return { noise2D };
})();

/* --------------------------------------------------- terrain heightfield */
function terrainHeight(x, z) {
  // Layered noise for ridge-like Cascade foothills
  let h = 0;
  h += Simplex.noise2D(x * 0.012, z * 0.012) * 16.0;            // big rolls
  h += Simplex.noise2D(x * 0.034, z * 0.034) * 6.0;             // mid ridges
  h += Math.abs(Simplex.noise2D(x * 0.05, z * 0.05)) * 4.0;     // ridged
  h += Simplex.noise2D(x * 0.11, z * 0.11) * 1.4;               // detail
  // Subtle valley along x=0
  const valley = Math.exp(-Math.pow(x * 0.02, 2)) * -2.5;
  return h + valley;
}

/* ============================================================================
   MAIN BACKGROUND SCENE
============================================================================ */
class TerrainScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.setClearColor(0x08090a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x08090a, 0.0095);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 800);
    this.camera.position.set(0, 28, 78);
    this.camera.lookAt(0, 4, 0);

    // lights
    const sun = new THREE.DirectionalLight(0xffd9b0, 1.1);
    sun.position.set(60, 80, 30);
    this.scene.add(sun);

    const back = new THREE.DirectionalLight(0x4a6080, 0.4);
    back.position.set(-50, 40, -60);
    this.scene.add(back);

    this.scene.add(new THREE.AmbientLight(0x1a2018, 0.5));

    this._buildTerrain();
    this._buildTrails();
    this._buildAtmosphere();

    this.clock = new THREE.Clock();
    this.scrollY = 0;
    this.targetCam = new THREE.Vector3(0, 28, 78);
    this.targetLook = new THREE.Vector3(0, 4, 0);

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('scroll', () => this._onScroll(), { passive: true });
    this._onScroll();
  }

  _buildTerrain() {
    const SIZE = 320;
    const SEG = 220;
    const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    geom.computeVertexNormals();

    // Custom shader — topographic contour lines + dual-tone height shading
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:           { value: 0 },
        uContourSpacing: { value: 1.4 },
        uMajorEvery:     { value: 5.0 },
        uBaseLow:        { value: new THREE.Color(0x0a120c) },
        uBaseMid:        { value: new THREE.Color(0x1f2a1c) },
        uBaseHigh:       { value: new THREE.Color(0x6b6240) },
        uContourColor:   { value: new THREE.Color(0x5a6a48) },
        uMajorColor:     { value: new THREE.Color(0xc9b88a) },
        uAccentColor:    { value: new THREE.Color(0xff4d1c) },
        uFogColor:       { value: new THREE.Color(0x08090a) },
        uFogDensity:     { value: 0.0095 },
        uSunDir:         { value: new THREE.Vector3(0.55, 0.65, 0.4).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(normalMatrix * normal);
          vHeight = position.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;

        uniform float uTime;
        uniform float uContourSpacing;
        uniform float uMajorEvery;
        uniform vec3  uBaseLow;
        uniform vec3  uBaseMid;
        uniform vec3  uBaseHigh;
        uniform vec3  uContourColor;
        uniform vec3  uMajorColor;
        uniform vec3  uAccentColor;
        uniform vec3  uFogColor;
        uniform float uFogDensity;
        uniform vec3  uSunDir;

        // Anti-aliased contour line based on height-mod
        float contour(float h, float spacing) {
          float v = h / spacing;
          float f = abs(fract(v - 0.5) - 0.5);
          float w = fwidth(v) * 1.2;
          return 1.0 - smoothstep(0.0, w, f);
        }

        void main() {
          // Height-driven base palette
          float t1 = smoothstep(-6.0, 4.0, vHeight);
          float t2 = smoothstep(2.0, 18.0, vHeight);
          vec3 base = mix(uBaseLow, uBaseMid, t1);
          base = mix(base, uBaseHigh, t2);

          // Lighting — soft directional + rim
          float ndotl = max(dot(vNormal, uSunDir), 0.0);
          float rim = pow(1.0 - max(dot(vNormal, vec3(0,1,0)), 0.0), 2.5);
          base *= 0.45 + ndotl * 0.65;
          base += vec3(0.06, 0.04, 0.02) * rim;

          // Contour lines (minor)
          float minor = contour(vHeight, uContourSpacing);
          base = mix(base, uContourColor, minor * 0.55);

          // Major contours — every Nth line
          float major = contour(vHeight, uContourSpacing * uMajorEvery);
          base = mix(base, uMajorColor, major * 0.85);

          // Accent contour at high peaks (above ~13m)
          float peakMask = smoothstep(11.0, 16.0, vHeight);
          base = mix(base, uAccentColor, major * peakMask * 0.35);

          // Subtle scanline for texture
          float scan = 0.985 + 0.015 * sin(vWorldPos.x * 4.0 + uTime * 0.4);
          base *= scan;

          // Manual exp² fog
          float dist = length(vWorldPos - cameraPosition);
          float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
          base = mix(base, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(base, 1.0);
        }
      `,
      side: THREE.FrontSide,
    });

    this.terrainMat = mat;
    this.terrain = new THREE.Mesh(geom, mat);
    this.terrain.position.y = 0;
    this.scene.add(this.terrain);

    // Wireframe overlay for added topographic feel (very subtle)
    const wireGeom = geom.clone();
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1d251a, wireframe: true, transparent: true, opacity: 0.18, depthWrite: false,
    });
    const wire = new THREE.Mesh(wireGeom, wireMat);
    wire.position.y = 0.04;
    this.scene.add(wire);
  }

  _buildTrails() {
    this.trails = new THREE.Group();
    this.scene.add(this.trails);

    const TRAIL_COUNT = 14;
    const SEED_X = [-90, -60, -30, -5, 25, 55, 85, -75, 40, 0, -45, 70, -20, 60];
    const SEED_Z = [110, 90, 100, 115, 105, 95, 110, 70, 60, 70, 50, 75, 85, 55];

    for (let t = 0; t < TRAIL_COUNT; t++) {
      const points = [];
      let x = SEED_X[t];
      let z = SEED_Z[t];
      const STEPS = 80;

      // a unique meandering direction per trail
      let heading = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      const wander = 0.18 + Math.random() * 0.12;

      for (let i = 0; i < STEPS; i++) {
        const y = terrainHeight(x, z) + 0.55;
        points.push(new THREE.Vector3(x, y, z));

        // step forward, with a meander informed by terrain gradient
        const dx = terrainHeight(x + 1.5, z) - terrainHeight(x - 1.5, z);
        const dz = terrainHeight(x, z + 1.5) - terrainHeight(x, z - 1.5);
        // bias heading away from steep uphill — cheap "trail follows contour" feel
        heading += (Math.atan2(-dz, -dx) - heading) * 0.04;
        heading += (Math.random() - 0.5) * wander;

        const speed = 2.4 + Math.random() * 0.6;
        x += Math.cos(heading) * speed;
        z += Math.sin(heading) * speed;

        if (Math.abs(x) > 140 || Math.abs(z) > 140) break;
      }

      if (points.length < 6) continue;

      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3);
      const segs = Math.min(400, points.length * 6);
      const tube = new THREE.TubeGeometry(curve, segs, 0.16, 6, false);

      // density-based color + bucket tag (for legend filtering)
      const density = Math.random();
      const col = new THREE.Color();
      let bucket;
      if (density < 0.25) { col.setHex(0x2a4d3a); bucket = 'low'; }
      else if (density < 0.55) { col.setHex(0x9aa66e); bucket = 'mid'; }
      else if (density < 0.82) { col.setHex(0xd4842a); bucket = 'high'; }
      else { col.setHex(0xe63946); bucket = 'hot'; }

      // Custom shader so the trail animates a "growing" highlight along its length
      const trailMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:    { value: Math.random() * 10 },
          uColor:   { value: col },
          uHot:     { value: new THREE.Color(0xfff2c2) },
          uPhase:   { value: Math.random() * Math.PI * 2 },
          uOpacity: { value: 0.65 + density * 0.35 },
          uFogColor:   { value: new THREE.Color(0x08090a) },
          uFogDensity: { value: 0.0095 },
        },
        vertexShader: `
          varying float vU;
          varying vec3 vWorldPos;
          void main() {
            vU = uv.x;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          precision highp float;
          varying float vU;
          varying vec3 vWorldPos;
          uniform float uTime;
          uniform vec3 uColor;
          uniform vec3 uHot;
          uniform float uPhase;
          uniform float uOpacity;
          uniform vec3  uFogColor;
          uniform float uFogDensity;

          void main() {
            // moving highlight pulse
            float pulse = sin(vU * 18.0 - uTime * 1.6 + uPhase) * 0.5 + 0.5;
            pulse = pow(pulse, 5.0);
            vec3 col = mix(uColor, uHot, pulse * 0.55);

            // fade ends
            float endFade = smoothstep(0.0, 0.06, vU) * (1.0 - smoothstep(0.94, 1.0, vU));

            float dist = length(vWorldPos - cameraPosition);
            float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
            col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

            gl_FragColor = vec4(col, uOpacity * endFade);
          }
        `,
        transparent: true,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(tube, trailMat);
      mesh.userData.mat = trailMat;
      mesh.userData.bucket = bucket;
      mesh.userData.baseOpacity = trailMat.uniforms.uOpacity.value;
      mesh.userData.targetOpacity = mesh.userData.baseOpacity;
      this.trails.add(mesh);
    }
  }

  dimTrails(bucket) {
    this.trails.children.forEach(m => {
      const baseOp = m.userData.baseOpacity;
      m.userData.targetOpacity = (bucket === null || m.userData.bucket === bucket) ? baseOp : 0.06;
    });
  }

  _buildAtmosphere() {
    // tiny floating particles ("rain on quad" / map snow)
    const N = 220;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      positions[i*3+0] = (Math.random() - 0.5) * 240;
      positions[i*3+1] = Math.random() * 40 + 5;
      positions[i*3+2] = (Math.random() - 0.5) * 240;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = new THREE.PointsMaterial({
      color: 0xc9b88a,
      size: 0.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.particles = new THREE.Points(g, m);
    this.scene.add(this.particles);

    // a faint horizon glow
    const ringGeom = new THREE.RingGeometry(60, 220, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4d1c, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 14;
    this.scene.add(ring);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollY = max > 0 ? window.scrollY / max : 0;
    this._updateCameraTarget();
  }

  /* Camera path keyframes — eased between section progress */
  _updateCameraTarget() {
    const p = this.scrollY;          // 0 → 1
    // Define keyframes per scroll progress
    // p ~ 0.00  hero (low orbit)
    // p ~ 0.18  manifesto
    // p ~ 0.34  density (top-down-ish)
    // p ~ 0.52  field
    // p ~ 0.66  device
    // p ~ 0.82  cadence
    // p ~ 0.95  beta
    const stops = [
      { p: 0.00, pos: new THREE.Vector3( 0,  28,  78), look: new THREE.Vector3( 0,  4,    0) },
      { p: 0.18, pos: new THREE.Vector3(-22, 22,  62), look: new THREE.Vector3( 6,  6,  -10) },
      { p: 0.34, pos: new THREE.Vector3( 14, 56,  48), look: new THREE.Vector3( 0,  0,    0) },
      { p: 0.52, pos: new THREE.Vector3(-30, 20,  50), look: new THREE.Vector3(10,  4,    0) },
      { p: 0.66, pos: new THREE.Vector3( 28, 16,  44), look: new THREE.Vector3(-6,  6,    0) },
      { p: 0.82, pos: new THREE.Vector3(  0, 70,  90), look: new THREE.Vector3( 0,  0,  -20) },
      { p: 1.00, pos: new THREE.Vector3(  0, 38, 110), look: new THREE.Vector3( 0,  6,    0) },
    ];

    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (p >= stops[i].p && p <= stops[i + 1].p) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = (p - a.p) / Math.max(1e-6, b.p - a.p);
    // smoothstep for easing
    const e = t * t * (3 - 2 * t);
    this.targetCam.lerpVectors(a.pos, b.pos, e);
    this.targetLook.lerpVectors(a.look, b.look, e);
  }

  update() {
    const dt = this.clock.getDelta();
    const time = this.clock.elapsedTime;

    // smooth camera move toward keyframe target
    this.camera.position.lerp(this.targetCam, 0.05);
    // gentle atmospheric sway
    const sway = Math.sin(time * 0.18) * 0.6;
    this.camera.lookAt(this.targetLook.x + sway, this.targetLook.y, this.targetLook.z);

    // trail opacity lerp toward target (legend dimming)
    this.trails.children.forEach(m => {
      const u = m.userData.mat.uniforms.uOpacity;
      u.value += (m.userData.targetOpacity - u.value) * 0.12;
      m.userData.mat.uniforms.uTime.value = time;
    });

    // write terrain uniforms
    this.terrainMat.uniforms.uTime.value = time;

    // particles drift
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 0.6;
        if (y < 1) y = 45;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================================
   PHONE / DEVICE SCENE  (second canvas)
============================================================================ */
class DeviceScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.camera.position.set(0, 0.4, 8.5);

    // lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const k = new THREE.DirectionalLight(0xffe5b9, 1.1);
    k.position.set(3, 4, 4); this.scene.add(k);
    const f = new THREE.DirectionalLight(0xff6a3a, 0.6);
    f.position.set(-3, 2, -2); this.scene.add(f);
    const r = new THREE.DirectionalLight(0x8aa0a8, 0.5);
    r.position.set(-2, -1, 3); this.scene.add(r);

    this._buildPhone();
    this._fitToCanvas();

    this.clock = new THREE.Clock();
    this.targetRotY = -0.25;
    this.targetRotX = 0.05;

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      this.targetRotY = -0.25 + nx * 0.6;
      this.targetRotX =  0.05 + ny * 0.4;
    });
    canvas.addEventListener('pointerleave', () => {
      this.targetRotY = -0.25;
      this.targetRotX =  0.05;
    });

    window.addEventListener('resize', () => this._fitToCanvas());
  }

  _buildPhone() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const W = 1.7, H = 3.6, D = 0.18, R = 0.18;

    // body
    const bodyGeom = new THREE.BoxGeometry(W, H, D);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111513, roughness: 0.55, metalness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    this.group.add(body);

    // bevel ring
    const ringGeom = new THREE.BoxGeometry(W * 1.005, H * 1.005, D * 0.4);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x2a2e2b, roughness: 0.35, metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.z = 0;
    this.group.add(ring);

    // screen plane (front)
    const screenGeom = new THREE.PlaneGeometry(W * 0.92, H * 0.96);
    this.hudCanvas = this._buildHudCanvas();
    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    this.hudTexture.colorSpace = THREE.SRGBColorSpace;
    this.hudTexture.minFilter = THREE.LinearFilter;
    this.hudTexture.magFilter = THREE.LinearFilter;
    const screenMat = new THREE.MeshBasicMaterial({ map: this.hudTexture, toneMapped: false });
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.z = D / 2 + 0.001;
    this.group.add(screen);

    // glass reflection — additive sheen
    const sheenGeom = new THREE.PlaneGeometry(W * 0.92, H * 0.96);
    const sheenMat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.06, color: 0xffffff, blending: THREE.AdditiveBlending,
    });
    const sheen = new THREE.Mesh(sheenGeom, sheenMat);
    sheen.position.z = D / 2 + 0.005;
    this.group.add(sheen);

    // camera punch-hole bump
    const camGeom = new THREE.CircleGeometry(0.06, 24);
    const camMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2 });
    const cam = new THREE.Mesh(camGeom, camMat);
    cam.position.set(0, H * 0.4, D / 2 + 0.002);
    this.group.add(cam);

    // back camera bump
    const backCamGeom = new THREE.BoxGeometry(0.5, 0.18, 0.06);
    const backCamMat = new THREE.MeshStandardMaterial({ color: 0x1a1d1a, roughness: 0.4, metalness: 0.7 });
    const backCam = new THREE.Mesh(backCamGeom, backCamMat);
    backCam.position.set(0, H * 0.36, -D / 2 - 0.03);
    this.group.add(backCam);

    // initial pose
    this.group.rotation.set(0.05, -0.25, 0);

    // rotate slightly tilted
    this.group.position.y = -0.1;
  }

  _buildHudCanvas() {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 1280;
    this.hudCtx = c.getContext('2d');
    this.hudFrame = 0;
    return c;
  }

  _drawHud(t) {
    const ctx = this.hudCtx;
    const W = 600, H = 1280;

    // background
    ctx.fillStyle = '#0a0e0a';
    ctx.fillRect(0, 0, W, H);

    // status bar
    ctx.fillStyle = '#c9b88a';
    ctx.font = '500 22px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('14:42', 36, 50);
    ctx.textAlign = 'right';
    ctx.fillText('5G  ▲ 89%', W - 36, 50);

    // top bar
    ctx.fillStyle = '#ff4d1c';
    ctx.fillRect(36, 88, 50, 4);
    ctx.fillStyle = '#efe7d3';
    ctx.font = '900 26px Big Shoulders Display, Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRAILDENSE', 36, 120);
    ctx.fillStyle = '#4a5a3e';
    ctx.font = '400 18px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('REC ●', W - 36, 120);

    // map area
    const mapY = 160, mapH = 640;
    ctx.fillStyle = '#111712';
    ctx.fillRect(36, mapY, W - 72, mapH);

    // contour lines on the map area
    ctx.save();
    ctx.beginPath();
    ctx.rect(36, mapY, W - 72, mapH);
    ctx.clip();

    ctx.strokeStyle = 'rgba(74, 90, 62, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      const cx = 300 + Math.sin(i * 0.6 + t * 0.04) * 30;
      const cy = mapY + mapH * 0.5 + Math.cos(i * 0.5) * 80;
      const rx = 50 + i * 22;
      const ry = 30 + i * 14;
      ctx.ellipse(cx, cy, rx, ry, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // major contour every 5
    ctx.strokeStyle = 'rgba(201, 184, 138, 0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 22; i += 5) {
      ctx.beginPath();
      const cx = 300 + Math.sin(i * 0.6 + t * 0.04) * 30;
      const cy = mapY + mapH * 0.5 + Math.cos(i * 0.5) * 80;
      const rx = 50 + i * 22;
      const ry = 30 + i * 14;
      ctx.ellipse(cx, cy, rx, ry, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // recorded trail (animated)
    const trail = [];
    const N = 80;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const x = 80 + u * (W - 160) + Math.sin(u * 9 + t * 0.6) * 30;
      const y = mapY + 100 + u * (mapH - 200) + Math.cos(u * 6 + t * 0.4) * 40;
      trail.push([x, y]);
    }
    const drawn = Math.floor((Math.sin(t * 0.4) * 0.5 + 0.5) * (N - 1));
    ctx.strokeStyle = '#ff4d1c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= drawn; i++) {
      const [x, y] = trail[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // current rider position
    const [hx, hy] = trail[Math.min(drawn, trail.length - 1)];
    ctx.fillStyle = 'rgba(255,77,28,0.25)';
    ctx.beginPath(); ctx.arc(hx, hy, 24 + (Math.sin(t * 4) * 0.5 + 0.5) * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4d1c';
    ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0a0e0a'; ctx.lineWidth = 2; ctx.stroke();

    ctx.restore();

    // map frame corner crosses
    ctx.strokeStyle = '#c9b88a';
    ctx.lineWidth = 1.5;
    [[36, mapY], [W - 36, mapY], [36, mapY + mapH], [W - 36, mapY + mapH]].forEach(([cx, cy], i) => {
      const xs = (i === 0 || i === 2) ? 1 : -1;
      const ys = (i < 2) ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + ys * 14); ctx.lineTo(cx, cy);
      ctx.lineTo(cx + xs * 14, cy);
      ctx.stroke();
    });

    // HUD numbers
    const hudY = mapY + mapH + 40;
    const drawStat = (x, label, value, unit) => {
      ctx.fillStyle = '#4a5a3e';
      ctx.font = '500 14px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label.toUpperCase(), x, hudY);

      ctx.fillStyle = '#efe7d3';
      ctx.font = '800 64px Big Shoulders Display, Impact, sans-serif';
      ctx.fillText(value, x, hudY + 70);

      if (unit) {
        ctx.fillStyle = '#4a5a3e';
        ctx.font = '500 18px JetBrains Mono, monospace';
        ctx.fillText(unit, x + ctx.measureText(value).width + 6, hudY + 70);
      }
    };

    // animate distance
    const dist = (8.42 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.06).toFixed(2);
    const min = 42, sec = Math.floor((t * 1) % 60).toString().padStart(2, '0');
    const speed = (10.8 + Math.sin(t * 1.3) * 1.4).toFixed(1);

    drawStat(36, 'distance',  dist,           'km');
    drawStat(36, 'elapsed',   `00:${min}:${sec}`, '');
    drawStat(330, 'speed',    speed,          'km/h');
    drawStat(330, 'climbing', '+312',         'm');

    // shift second row down
    ctx.fillStyle = '#11150f';
    ctx.fillRect(36, hudY + 100, W - 72, 1);
    ctx.fillStyle = '#4a5a3e';
    ctx.font = '500 14px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ELAPSED', 36, hudY + 140);
    ctx.fillText('CLIMBING', 330, hudY + 140);
    ctx.fillStyle = '#efe7d3';
    ctx.font = '800 64px Big Shoulders Display, Impact, sans-serif';
    ctx.fillText(`00:${min}:${sec}`, 36, hudY + 210);
    ctx.fillText('+312', 330, hudY + 210);
    ctx.fillStyle = '#4a5a3e';
    ctx.font = '500 18px JetBrains Mono, monospace';
    ctx.fillText('m', 330 + ctx.measureText('+312').width + 6, hudY + 210);

    // controls bar
    const ctrlY = H - 140;
    ctx.fillStyle = '#11150f';
    ctx.fillRect(36, ctrlY, W - 72, 96);
    // pause button
    ctx.fillStyle = '#efe7d3';
    ctx.fillRect(80, ctrlY + 28, 12, 40);
    ctx.fillRect(108, ctrlY + 28, 12, 40);
    // stop button (square)
    ctx.fillStyle = '#ff4d1c';
    ctx.fillRect(W - 130, ctrlY + 28, 40, 40);
    // labels
    ctx.fillStyle = '#4a5a3e';
    ctx.font = '500 12px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PAUSE', 80, ctrlY + 90);
    ctx.textAlign = 'right';
    ctx.fillText('STOP', W - 90, ctrlY + 90);
  }

  _fitToCanvas() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = r.width * Math.min(window.devicePixelRatio, 2);
    this.canvas.height = r.height * Math.min(window.devicePixelRatio, 2);
    this.canvas.style.width = r.width + 'px';
    this.canvas.style.height = r.height + 'px';
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(r.width, r.height, false);
  }

  update() {
    const t = this.clock.elapsedTime;

    // smooth rotation toward pointer target
    this.group.rotation.x += (this.targetRotX - this.group.rotation.x) * 0.06;
    this.group.rotation.y += (this.targetRotY - this.group.rotation.y) * 0.06;

    // hud redraw
    this._drawHud(t);
    this.hudTexture.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================================
   FLOATERS — small 3D objects scattered above the terrain that react to the
   cursor: a compass whose needle tracks the mouse, a wireframe peak that
   tilts, contour rings that scale on hover, a GPS pin with a pulsing halo,
   and a coordinate crosshair. Each item is added to the main scene group so
   it composes naturally with the terrain + trails.
============================================================================ */
class Floaters {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.items = [];
    this.mx = window.innerWidth / 2;
    this.my = window.innerHeight / 2;
    this._tmp = new THREE.Vector3();

    window.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
    });

    this._build();
  }

  _build() {
    /* 01 — Compass (ring + ticks + free-spinning needle) */
    {
      const g = new THREE.Group();

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.55, 1.7, 64),
        new THREE.MeshBasicMaterial({ color: 0xc9b88a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      g.add(ring);

      // tick marks
      const tickGroup = new THREE.Group();
      for (let i = 0; i < 24; i++) {
        const major = i % 6 === 0;
        const tick = new THREE.Mesh(
          new THREE.PlaneGeometry(major ? 0.08 : 0.04, major ? 0.36 : 0.18),
          new THREE.MeshBasicMaterial({ color: major ? 0xff4d1c : 0xc9b88a, transparent: true, opacity: major ? 0.85 : 0.5 })
        );
        const a = (i / 24) * Math.PI * 2;
        tick.position.set(Math.cos(a) * 1.92, Math.sin(a) * 1.92, 0);
        tick.rotation.z = a + Math.PI / 2;
        tickGroup.add(tick);
      }
      g.add(tickGroup);

      // N indicator (small triangle)
      const nMark = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 3),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c })
      );
      nMark.position.set(0, 2.25, 0);
      nMark.rotation.z = -Math.PI / 6;
      g.add(nMark);

      // needle group — rotates to point at mouse
      const needle = new THREE.Group();
      const point = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 1.45),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c })
      );
      point.position.y = 0.55;
      needle.add(point);
      const tail = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 1.05),
        new THREE.MeshBasicMaterial({ color: 0x6b6240, transparent: true, opacity: 0.7 })
      );
      tail.position.y = -0.45;
      needle.add(tail);
      const hub = new THREE.Mesh(
        new THREE.CircleGeometry(0.16, 16),
        new THREE.MeshBasicMaterial({ color: 0x08090a })
      );
      hub.position.z = 0.01;
      needle.add(hub);
      const hubRing = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.22, 24),
        new THREE.MeshBasicMaterial({ color: 0xc9b88a, side: THREE.DoubleSide })
      );
      hubRing.position.z = 0.011;
      needle.add(hubRing);
      g.add(needle);

      g.userData = {
        type: 'compass',
        basePos: new THREE.Vector3(-46, 18, 18),
        needle, phase: 0, smoothNeedle: 0,
      };
      g.position.copy(g.userData.basePos);
      this.group.add(g);
      this.items.push(g);
    }

    /* 02 — Wireframe peak (tetrahedron) */
    {
      const peak = new THREE.Mesh(
        new THREE.TetrahedronGeometry(2.1, 0),
        new THREE.MeshBasicMaterial({ color: 0xc9b88a, wireframe: true, transparent: true, opacity: 0.55 })
      );
      peak.userData = {
        type: 'peak',
        basePos: new THREE.Vector3(38, 22, -16),
        phase: 1.4,
      };
      peak.position.copy(peak.userData.basePos);
      this.group.add(peak);
      this.items.push(peak);
    }

    /* 03 — Stacked contour rings (3 concentric tori at varying angles) */
    {
      const g = new THREE.Group();
      const colors = [0x9aa66e, 0xc9b88a, 0xff4d1c];
      for (let i = 0; i < 3; i++) {
        const t = new THREE.Mesh(
          new THREE.TorusGeometry(1.1 + i * 0.55, 0.04, 8, 64),
          new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.55 })
        );
        t.userData.spin = (i % 2 ? -1 : 1) * (0.3 + i * 0.1);
        t.userData.tilt = 0.3 + i * 0.2;
        g.add(t);
      }
      g.userData = {
        type: 'rings',
        basePos: new THREE.Vector3(-12, 26, -32),
        phase: 2.6,
      };
      g.position.copy(g.userData.basePos);
      this.group.add(g);
      this.items.push(g);
    }

    /* 04 — GPS pin (sphere head + stem + pulsing halo) */
    {
      const g = new THREE.Group();
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c })
      );
      head.position.y = 1.2;
      g.add(head);

      const haloA = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.65, 32),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      haloA.rotation.x = Math.PI / 2;
      haloA.position.y = 0.05;
      g.add(haloA);

      const haloB = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.5, 32),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      haloB.rotation.x = Math.PI / 2;
      haloB.position.y = 0.05;
      g.add(haloB);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c, transparent: true, opacity: 0.55 })
      );
      stem.position.y = 0.6;
      g.add(stem);

      g.userData = {
        type: 'pin',
        basePos: new THREE.Vector3(28, 16, 26),
        phase: 3.1,
        haloA, haloB,
      };
      g.position.copy(g.userData.basePos);
      this.group.add(g);
      this.items.push(g);
    }

    /* 05 — Coordinate crosshair (cross + 4 corner brackets) */
    {
      const g = new THREE.Group();
      const make = (w, h, c) => new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 })
      );
      g.add(make(1.4, 0.05, 0xc9b88a));
      g.add(make(0.05, 1.4, 0xc9b88a));

      const corners = [[-0.85, 0.85], [0.85, 0.85], [-0.85, -0.85], [0.85, -0.85]];
      corners.forEach(([x, y]) => {
        const sx = Math.sign(x), sy = Math.sign(y);
        const h = make(0.32, 0.05, 0xff4d1c);
        h.position.set(x - sx * 0.14, y, 0); g.add(h);
        const v = make(0.05, 0.32, 0xff4d1c);
        v.position.set(x, y - sy * 0.14, 0); g.add(v);
      });

      g.userData = {
        type: 'coord',
        basePos: new THREE.Vector3(-30, 12, 38),
        phase: 4.2,
      };
      g.position.copy(g.userData.basePos);
      this.group.add(g);
      this.items.push(g);
    }

    /* 06 — Survey rod (tall thin cylinder + cap) */
    {
      const g = new THREE.Group();
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3.4, 8),
        new THREE.MeshBasicMaterial({ color: 0xc9b88a, transparent: true, opacity: 0.7 })
      );
      g.add(rod);
      // alternating bands
      for (let i = -3; i <= 3; i++) {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff4d1c : 0x08090a })
        );
        band.position.y = i * 0.45;
        g.add(band);
      }
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff4d1c })
      );
      cap.position.y = 1.85;
      g.add(cap);
      g.userData = {
        type: 'rod',
        basePos: new THREE.Vector3(54, 14, 4),
        phase: 5.1,
      };
      g.position.copy(g.userData.basePos);
      this.group.add(g);
      this.items.push(g);
    }
  }

  update(time) {
    const nmx = this.mx / window.innerWidth - 0.5;   // -0.5 .. 0.5
    const nmy = this.my / window.innerHeight - 0.5;

    for (const o of this.items) {
      const u = o.userData;
      const phase = u.phase || 0;

      // proximity to mouse (project the floater into screen space)
      this._tmp.copy(o.position).project(this.camera);
      const sx = (this._tmp.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-this._tmp.y * 0.5 + 0.5) * window.innerHeight;
      const sdx = this.mx - sx;
      const sdy = this.my - sy;
      const sdist = Math.hypot(sdx, sdy);
      const proximity = Math.max(0, 1 - sdist / 320);

      // gentle bob + drift
      o.position.y = u.basePos.y + Math.sin(time * 0.55 + phase) * 0.4;
      o.position.x = u.basePos.x + Math.sin(time * 0.27 + phase * 1.3) * 0.5;

      switch (u.type) {
        case 'compass': {
          // billboard
          o.lookAt(this.camera.position);
          // needle points toward mouse (screen-space)
          const targetA = Math.atan2(-sdy, sdx) - Math.PI / 2;
          // wrap-around safe lerp
          let cur = u.smoothNeedle;
          let delta = targetA - cur;
          while (delta >  Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          cur += delta * 0.12;
          u.smoothNeedle = cur;
          u.needle.rotation.z = cur + Math.sin(time * 4 + phase) * 0.04 * (1 - proximity);
          o.scale.setScalar(1 + proximity * 0.18);
          break;
        }
        case 'peak': {
          o.rotation.y = time * 0.18 + nmx * 0.9;
          o.rotation.x = Math.sin(time * 0.4) * 0.08 + nmy * 0.4;
          o.scale.setScalar(1 + proximity * 0.35);
          o.material.opacity = 0.55 + proximity * 0.4;
          break;
        }
        case 'rings': {
          o.rotation.x = nmy * 0.6 + Math.sin(time * 0.3 + phase) * 0.2;
          o.rotation.y = nmx * 0.7 + time * 0.12;
          o.children.forEach((torus, i) => {
            torus.rotation.x = torus.userData.tilt + time * torus.userData.spin;
            torus.rotation.y = (i % 2 ? -1 : 1) * time * 0.2;
            torus.scale.setScalar(1 + proximity * 0.25 * (i + 1));
            torus.material.opacity = 0.45 + proximity * 0.4;
          });
          break;
        }
        case 'pin': {
          o.lookAt(this.camera.position);
          // wobble on hover
          o.rotation.z += nmx * 0.4;
          o.rotation.x += nmy * 0.3;
          // pulsing halos
          const p1 = (Math.sin(time * 1.6 + phase) * 0.5 + 0.5);
          const p2 = (Math.sin(time * 1.6 + phase + 1.2) * 0.5 + 0.5);
          u.haloA.scale.setScalar(1 + p1 * 1.4 + proximity * 0.6);
          u.haloA.material.opacity = (1 - p1) * 0.6;
          u.haloB.scale.setScalar(1 + p2 * 2.0 + proximity * 0.4);
          u.haloB.material.opacity = (1 - p2) * 0.45;
          break;
        }
        case 'coord': {
          o.lookAt(this.camera.position);
          o.scale.setScalar(1 + proximity * 0.6);
          // rotate in plane
          o.rotation.z = nmx * 0.5 + Math.sin(time * 0.4 + phase) * 0.1;
          break;
        }
        case 'rod': {
          // sway like a survey rod planted in the ground
          o.rotation.z = nmx * 0.25 + Math.sin(time * 0.6 + phase) * 0.04;
          o.rotation.x = nmy * 0.18 + Math.cos(time * 0.5 + phase) * 0.03;
          break;
        }
      }
    }
  }
}

/* ============================================================================
   TEXT REACTIVITY — split words/chars and lift them in 3D toward the cursor
============================================================================ */
function splitToChars(el) {
  const text = el.textContent;
  el.textContent = '';
  el.classList.add('is-split');
  const chars = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    if (ch === ' ') {
      span.classList.add('char--space');
      span.innerHTML = '&nbsp;';
    } else {
      span.textContent = ch;
    }
    el.appendChild(span);
    chars.push(span);
  }
  return chars;
}

class CharField {
  constructor(elements, opts = {}) {
    this.range = opts.range ?? 220;
    this.lift = opts.lift ?? 60;
    this.rotPower = opts.rotPower ?? 28;
    this.translatePower = opts.translatePower ?? 14;
    this.chars = [];
    elements.forEach(el => {
      splitToChars(el).forEach(c => this.chars.push(c));
    });
    this.mx = -9999; this.my = -9999;
    this._raf = null;
    window.addEventListener('mousemove', (e) => {
      this.mx = e.clientX; this.my = e.clientY;
      this._schedule();
    });
    window.addEventListener('scroll', () => this._schedule(), { passive: true });
    window.addEventListener('mouseleave', () => {
      this.mx = -9999; this.my = -9999;
      this._schedule();
    });
  }
  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._apply(); });
  }
  _apply() {
    const range = this.range;
    for (const ch of this.chars) {
      const r = ch.getBoundingClientRect();
      // skip far-off-screen chars
      if (r.bottom < -200 || r.top > window.innerHeight + 200) {
        ch.style.transform = '';
        continue;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = this.mx - cx;
      const dy = this.my - cy;
      const d = Math.hypot(dx, dy);
      if (d > range) {
        ch.style.transform = '';
        continue;
      }
      const power = 1 - d / range;
      const e = power * power; // ease
      const tx = -(dx / d || 0) * e * this.translatePower;
      const ty = -(dy / d || 0) * e * this.translatePower * 0.6;
      const lift = e * this.lift;
      const rx = (dy / range) * e * this.rotPower;
      const ry = -(dx / range) * e * this.rotPower;
      ch.style.transform =
        `translate3d(${tx}px, ${ty - lift * 0.25}px, ${lift}px) ` +
        `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  }
}

/* simple heading tilt — applies a single perspective transform per heading
   based on cursor position relative to its centre */
function attachHeadingTilt(selector) {
  const items = document.querySelectorAll(selector);
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let raf = null;
  const apply = () => {
    raf = null;
    items.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        el.style.transform = '';
        return;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (mx - cx) / window.innerWidth;
      const dy = (my - cy) / window.innerHeight;
      const power = Math.max(0, 1 - Math.hypot(dx * 2, dy * 2));
      const ry = dx * 8 * power;
      const rx = -dy * 6 * power;
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  };
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
}

/* ============================================================================
   CURSOR — bone-ink crosshair with screen-space coordinate readout
============================================================================ */
class Cursor {
  constructor() {
    // disable on touch devices
    if (!matchMedia('(hover: hover)').matches || !matchMedia('(pointer: fine)').matches) return;

    this.cursor = document.createElement('div');
    this.cursor.className = 'cursor';
    this.cursor.innerHTML = `
      <svg viewBox="-30 -30 60 60" class="cursor__svg">
        <g class="cursor__crosshair">
          <circle r="22" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.55"/>
          <line x1="-26" y1="0" x2="-12" y2="0" stroke="currentColor" stroke-width="0.6"/>
          <line x1="26"  y1="0" x2="12"  y2="0" stroke="currentColor" stroke-width="0.6"/>
          <line x1="0" y1="-26" x2="0" y2="-12" stroke="currentColor" stroke-width="0.6"/>
          <line x1="0" y1="26"  x2="0" y2="12"  stroke="currentColor" stroke-width="0.6"/>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
          <line x1="0" y1="-6" x2="0" y2="6" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
        </g>
        <g class="cursor__inner-ring">
          <circle r="28" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <circle r="14" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
        </g>
      </svg>
      <div class="cursor__label">
        <em>fix · 1.2 hdop</em>
        <span data-cursor-coord>47.10342 N · 122.73558 W</span>
      </div>
    `;
    this.dot = document.createElement('div');
    this.dot.className = 'cursor-dot';
    document.body.appendChild(this.cursor);
    document.body.appendChild(this.dot);

    this.coordEl = this.cursor.querySelector('[data-cursor-coord]');

    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.tx = this.x;
    this.ty = this.y;

    window.addEventListener('mousemove', (e) => {
      this.tx = e.clientX;
      this.ty = e.clientY;
      this.dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      if (!this._ready) {
        this._ready = true;
        this.cursor.classList.add('is-ready');
        this.dot.classList.add('is-ready');
      }
    });
    window.addEventListener('mousedown', () => { this.cursor.classList.add('is-pressed'); this.dot.classList.add('is-pressed'); });
    window.addEventListener('mouseup',   () => { this.cursor.classList.remove('is-pressed'); this.dot.classList.remove('is-pressed'); });

    // hover state classes via event delegation
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, [data-magnetic]')) this.cursor.classList.add('is-link');
      else if (e.target.closest('.card, .datacard, .week, .legend li')) this.cursor.classList.add('is-card');
      else this.cursor.classList.add('is-terrain');
    }, true);
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, [data-magnetic]')) this.cursor.classList.remove('is-link');
      if (e.target.closest('.card, .datacard, .week, .legend li')) this.cursor.classList.remove('is-card');
    }, true);

    requestAnimationFrame(this.update.bind(this));
  }

  update() {
    if (!this.cursor) return;
    this.x += (this.tx - this.x) * 0.22;
    this.y += (this.ty - this.y) * 0.22;
    this.cursor.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) translate(-50%, -50%)`;

    // coord readout derived from screen-space cursor position
    if (this.coordEl) {
      const u = this.x / window.innerWidth;       // 0..1
      const v = this.y / window.innerHeight;
      const lat = (47.11200 + (0.5 - v) * 0.018).toFixed(5);
      const lon = (-122.74600 + (u - 0.5) * 0.024).toFixed(5);
      this.coordEl.textContent = `${lat} N · ${Math.abs(lon).toFixed(5)} W`;
    }

    requestAnimationFrame(this.update.bind(this));
  }
}

/* ============================================================================
   CARD 3D TILT — perspective rotation following pointer
============================================================================ */
function attachTilt(selector, max = 6, lift = 8) {
  document.querySelectorAll(selector).forEach((card) => {
    let raf = null;
    let tx = 0, ty = 0;
    const apply = () => {
      card.style.transform = `perspective(1100px) rotateX(${-ty * max}deg) rotateY(${tx * max}deg) translateZ(${lift}px)`;
      raf = null;
    };
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) - 0.5;
      ty = ((e.clientY - r.top) / r.height) - 0.5;
      card.classList.add('is-tilting');
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-tilting');
      card.style.transform = '';
    });
  });
}

/* ============================================================================
   MAGNETIC — element drifts toward cursor when nearby
============================================================================ */
function attachMagnetic(selector, strength = 0.32, falloff = 90) {
  document.querySelectorAll(selector).forEach((el) => {
    let raf = null;
    const apply = (mx, my) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const d = Math.hypot(dx, dy);
      if (d > falloff * 2.5) { el.style.transform = ''; el.classList.remove('is-magnetic'); return; }
      el.classList.add('is-magnetic');
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
      raf = null;
    };
    window.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > falloff * 2.5) {
        if (el.classList.contains('is-magnetic')) {
          el.classList.remove('is-magnetic');
          el.style.transform = '';
        }
        return;
      }
      if (!raf) raf = requestAnimationFrame(() => apply(e.clientX, e.clientY));
    });
  });
}

/* ============================================================================
   LEGEND HOVER → terrain trail filter
============================================================================ */
function attachLegend(scene) {
  const legend = document.querySelector('.legend');
  if (!legend) return;
  const buckets = ['low', 'mid', 'high', 'hot'];
  legend.querySelectorAll('li').forEach((li, i) => {
    const bucket = buckets[i];
    li.addEventListener('mouseenter', () => {
      legend.classList.add('is-hovering');
      li.classList.add('is-active');
      scene.dimTrails(bucket);
    });
    li.addEventListener('mouseleave', () => {
      legend.classList.remove('is-hovering');
      li.classList.remove('is-active');
      scene.dimTrails(null);
    });
  });
}

/* ============================================================================
   CREATOR APPLICATION — validation + structured submit + mailto: dispatch

   The site is a static page with no backend, so submissions are emailed to
   rattotom51@gmail.com via a mailto: handoff: every submitted field is
   formatted into a plain-text email body and handed to the visitor's mail
   client. A re-open and a copy-to-clipboard fallback live in the success
   state for cases where mailto: is blocked or unconfigured.
============================================================================ */
const TRAILDENSE_RECIPIENT = 'rattotom51@gmail.com';

function buildEmailBody(payload, buildNo) {
  const stamp = new Date(payload.ts).toUTCString();
  const tab = (k, v) => `${(k + ':').padEnd(18, ' ')}${v}`;
  const yn = (b) => b ? 'YES' : 'NO';
  const orNone = (v) => (v && v.toString().trim()) ? v : '— (not provided)';
  return [
    '═════════════════════════════════════════════',
    '  TRAILDENSE — CREATOR APPLICATION',
    '═════════════════════════════════════════════',
    '',
    tab('Submitted',  stamp),
    tab('Build #',    buildNo),
    tab('Source',     'creator portal — traildense static site'),
    '',
    '── APPLICANT ─────────────────────────────────',
    tab('Name',       payload.name),
    tab('Email',      payload.email),
    tab('Instagram',  orNone(payload.instagram)),
    tab('Strava',     orNone(payload.strava)),
    '',
    '── RIDING ────────────────────────────────────',
    tab('Home region',    payload.region),
    tab('Android device', payload.device),
    tab('Weekly riding',  orNone(payload.riding)),
    '',
    '── WHY YOU ──────────────────────────────────',
    (payload.reason || '').toString().trim() || '— (no answer)',
    '',
    '── CONSENT ──────────────────────────────────',
    tab('GPS recording / public density map', yn(payload.consent)),
    tab('Weekly creator-build notes opt-in',  yn(payload.updates)),
    '',
    '═════════════════════════════════════════════',
    'Reply to this email to follow up with the applicant.',
  ].join('\n');
}

function buildMailto(payload, buildNo) {
  const subject = `Creator application — ${payload.name} · build #${buildNo}`;
  const body = buildEmailBody(payload, buildNo);
  return {
    href: `mailto:${TRAILDENSE_RECIPIENT}`
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(body)}`,
    subject,
    body,
  };
}

function attachBetaForm() {
  const form = document.getElementById('betaForm');
  if (!form) return;

  const requiredText = ['name', 'email', 'region', 'device'];

  // Track the most recent dispatch so the re-open / copy buttons can re-use it
  let lastDispatch = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let valid = true;

    // clear prior error states
    form.querySelectorAll('.is-error').forEach(el => el.classList.remove('is-error'));

    for (const field of requiredText) {
      const input = form.querySelector(`[name="${field}"]`);
      const val = (data.get(field) || '').toString().trim();
      if (!val) { input.closest('label').classList.add('is-error'); valid = false; }
    }
    // email shape
    const emailVal = (data.get('email') || '').toString().trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      form.querySelector('[name="email"]').closest('label').classList.add('is-error');
      valid = false;
    }
    // consent
    const consent = form.querySelector('[name="consent"]');
    if (!consent.checked) { consent.closest('label').classList.add('is-error'); valid = false; }

    if (!valid) {
      form.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ], { duration: 360, easing: 'ease-out' });
      return;
    }

    const buildNo = String(Math.floor(7 + Math.random() * 92)).padStart(3, '0');

    const payload = {
      name:      (data.get('name')      || '').toString().trim(),
      email:     emailVal,
      instagram: (data.get('instagram') || '').toString().trim() || null,
      strava:    (data.get('strava')    || '').toString().trim() || null,
      region:    (data.get('region')    || '').toString().trim(),
      device:    (data.get('device')    || '').toString().trim(),
      riding:    (data.get('riding')    || '').toString().trim() || null,
      reason:    (data.get('reason')    || '').toString().trim() || null,
      consent:   !!data.get('consent'),
      updates:   !!data.get('updates'),
      ts:        new Date().toISOString(),
    };

    const dispatch = buildMailto(payload, buildNo);
    lastDispatch = { ...dispatch, recipient: TRAILDENSE_RECIPIENT };

    // Hand the structured email to the visitor's mail client
    window.location.href = dispatch.href;

    // Populate the sent-state UI
    form.querySelector('[data-sent-email]').textContent  = emailVal;
    form.querySelector('[data-sent-build]').textContent  = buildNo;
    form.querySelector('[data-sent-target]').textContent = TRAILDENSE_RECIPIENT;
    form.classList.add('is-sent');

    // Console echo for visibility during development / debugging
    // eslint-disable-next-line no-console
    console.info('[traildense] creator application dispatched →', payload);
  });

  // Re-open mail client with the most recent application
  form.querySelector('[data-action="resend"]').addEventListener('click', () => {
    if (lastDispatch) window.location.href = lastDispatch.href;
  });

  // Copy "To / Subject / Body" into the clipboard for manual paste
  const copyBtn = form.querySelector('[data-action="copy"]');
  const copyLabel = copyBtn.querySelector('[data-copy-label]');
  copyBtn.addEventListener('click', async () => {
    if (!lastDispatch) return;
    const text =
      `To: ${lastDispatch.recipient}\n` +
      `Subject: ${lastDispatch.subject}\n\n` +
      `${lastDispatch.body}`;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('is-copied');
      copyLabel.textContent = 'copied — paste into gmail';
      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        copyLabel.textContent = 'copy details';
      }, 2400);
    } catch (err) {
      copyLabel.textContent = 'copy failed — select manually';
    }
  });

  // Clear error state as user re-types / re-checks
  form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => {
      input.closest('label')?.classList.remove('is-error');
    });
  });
  form.querySelector('[name="consent"]').addEventListener('change', (e) => {
    if (e.target.checked) e.target.closest('label').classList.remove('is-error');
  });

  // Auto-prefix instagram with @
  const insta = form.querySelector('[name="instagram"]');
  insta.addEventListener('blur', () => {
    const v = insta.value.trim();
    if (v && !v.startsWith('@')) insta.value = '@' + v.replace(/^@+/, '');
  });
}

/* ============================================================================
   BOOT
============================================================================ */
const bg  = new TerrainScene(document.getElementById('scene'));
const dev = new DeviceScene(document.getElementById('deviceCanvas'));
const floaters = new Floaters(bg.scene, bg.camera);

function loop() {
  bg.update();
  floaters.update(bg.clock.elapsedTime);
  dev.update();
  requestAnimationFrame(loop);
}
loop();

// Reveal on intersection
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) e.target.classList.add('is-visible');
  }
}, { threshold: 0.15 });
document.querySelectorAll('section, .card, .week, .datacard').forEach(el => {
  el.setAttribute('data-reveal', '');
  io.observe(el);
});

// Live HUD coordinate readout — pretend the rider is moving
(() => {
  const lat = document.getElementById('rdLat');
  const lon = document.getElementById('rdLon');
  const elev = document.getElementById('rdElev');
  const hdop = document.getElementById('rdHdop');
  let t = 0;
  setInterval(() => {
    t += 0.6;
    if (lat) lat.textContent = (47.10342 + Math.sin(t * 0.13) * 0.0008).toFixed(5);
    if (lon) lon.textContent = (-122.73558 + Math.cos(t * 0.11) * 0.0008).toFixed(5);
    if (elev) elev.textContent = String(Math.floor(820 + Math.sin(t * 0.07) * 18 + Math.sin(t * 0.41) * 6)).padStart(4, '0') + 'm';
    if (hdop) hdop.textContent = (1.0 + Math.abs(Math.sin(t * 0.3)) * 0.6).toFixed(1);
  }, 600);
})();

// Wire interactivity
new Cursor();
attachTilt('.card, .datacard', 5, 6);
attachTilt('.device__readout > div', 4, 4);
attachMagnetic('[data-magnetic]', 0.32, 90);
attachLegend(bg);
attachBetaForm();

// Reactive text — split TRAIL / DENSE / "where the line" and the section tags
new CharField(
  [...document.querySelectorAll('.hero__title-line:not(.hero__title-line--alt)')],
  { range: 240, lift: 70, rotPower: 32, translatePower: 16 }
);
new CharField(
  [...document.querySelectorAll('.hero__title-line--alt i')],
  { range: 180, lift: 24, rotPower: 14, translatePower: 8 }
);
new CharField(
  [...document.querySelectorAll('.section-tag')],
  { range: 140, lift: 14, rotPower: 8, translatePower: 5 }
);

// Subtle 3D mouse tilt on big section headings
attachHeadingTilt('.manifesto h2, .density h3, .field > h2, .device__copy h2, .cadence > h2, .beta h2');

// Hide loader once first frame is rendered
window.addEventListener('load', () => {
  setTimeout(() => document.body.classList.remove('is-loading'), 800);
});
