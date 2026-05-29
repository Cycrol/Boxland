import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

const createOrbitControls = (camera, dom) => {
  const state = { rotating: false, startX: 0, startY: 0, startPhi: 0, startTheta: 0 };
  const spherical = new THREE.Spherical();
  const target = new THREE.Vector3(0, 0, 0);
  spherical.setFromVector3(camera.position.clone().sub(target));

  state.enabled = true;

  const handleDown = (event) => {
    if (!state.enabled) return;
    state.rotating = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.startPhi = spherical.phi;
    state.startTheta = spherical.theta;
  };

  const handleMove = (event) => {
    if (!state.rotating || !state.enabled) return;
    const dx = (event.clientX - state.startX) / dom.clientWidth;
    const dy = (event.clientY - state.startY) / dom.clientHeight;
    spherical.theta = state.startTheta - dx * Math.PI * 2 * 0.9;
    spherical.phi = state.startPhi - dy * Math.PI * 0.9;
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));
  };

  const handleUp = () => { state.rotating = false; };
  const handleWheel = (event) => {
    if (!state.enabled) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    spherical.radius *= 1 + delta * 0.05;
    spherical.radius = Math.max(4, Math.min(25, spherical.radius));
  };

  dom.style.touchAction = 'none';
  dom.addEventListener('pointerdown', handleDown);
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', handleUp);
  dom.addEventListener('wheel', handleWheel, { passive: false });

  return {
    update() {
      if (!state.enabled) return;
      const desired = new THREE.Vector3().setFromSpherical(spherical).add(target);
      camera.position.lerp(desired, 0.1);
      camera.lookAt(target);
    },
    setEnabled(value) {
      state.enabled = value;
    },
    dispose() {
      dom.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      dom.removeEventListener('wheel', handleWheel);
    }
  };
};

export class Renderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07101f);
    this.scene.fog = new THREE.FogExp2(0x07101f, 0.04);

    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.set(14, 10, 16);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = createOrbitControls(this.camera, this.renderer.domElement);
    this.ticking = false;
    this.paused = false;
    this.callbacks = [];

    this._setupLights();
    this._setupEnvironment();

    window.addEventListener('resize', () => this.resize());
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0x8fa8d4, 0x09121b, 0.95);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(8, 18, 12);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -14;
    dir.shadow.camera.right = 14;
    dir.shadow.camera.top = 14;
    dir.shadow.camera.bottom = -14;
    dir.shadow.camera.far = 60;
    this.scene.add(dir);

    const fill = new THREE.PointLight(0x8ab7ff, 0.3, 35);
    fill.position.set(-12, 10, -10);
    this.scene.add(fill);

    this.movingLight = new THREE.PointLight(0x9fdcff, 0.45, 42, 2);
    this.movingLight.position.set(0, 12, 0);
    this.scene.add(this.movingLight);
  }

  _setupEnvironment() {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.08 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2.5;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  setMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  onTick(callback) {
    this.callbacks.push(callback);
  }

  setPaused(paused) {
    this.paused = paused;
  }

  start() {
    if (this.ticking) return;
    this.ticking = true;
    this._lastTime = performance.now();
    this._loop();
  }

  _loop() {
    if (!this.ticking) return;
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const delta = (now - this._lastTime) / 1000;
    this._lastTime = now;
    if (!this.paused) {
      this.callbacks.forEach((cb) => cb(now / 1000, delta));
    }
    this.controls.update();
    if (this.movingLight) {
      const t = now * 0.00018;
      this.movingLight.position.set(Math.sin(t) * 12, 10 + Math.cos(t * 1.4) * 2.2, Math.cos(t) * 13);
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
