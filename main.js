import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import { Cloth } from './physics.js';
import { setupInput } from './input.js';

// Scene setup
const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.5, 6);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Lights
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 10, 5);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.left = -10;
dir.shadow.camera.right = 10;
dir.shadow.camera.top = 10;
dir.shadow.camera.bottom = -10;
scene.add(dir);

const amb = new THREE.HemisphereLight(0x8899aa, 0x10121a, 0.6);
scene.add(amb);

// Create cloth
const cloth = new Cloth(6, 6, 80, 80);

// Build geometry and mesh
const segmentsX = cloth.segmentsX;
const segmentsY = cloth.segmentsY;
const vertCount = (segmentsX + 1) * (segmentsY + 1);
const positions = new Float32Array(vertCount * 3);
const normals = new Float32Array(vertCount * 3);
const uvs = new Float32Array(vertCount * 2);

// Fill initial positions & UVs
let ptr = 0;
let uptr = 0;
for (let j = 0; j <= segmentsY; j++) {
  for (let i = 0; i <= segmentsX; i++) {
    const p = cloth.particles[j * (segmentsX + 1) + i].position;
    positions[ptr++] = p.x;
    positions[ptr++] = p.y;
    positions[ptr++] = p.z;
    uvs[uptr++] = i / segmentsX;
    uvs[uptr++] = j / segmentsY;
  }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// Build indices for a grid
const indices = [];
for (let j = 0; j < segmentsY; j++) {
  for (let i = 0; i < segmentsX; i++) {
    const a = i + (segmentsX + 1) * j;
    const b = i + (segmentsX + 1) * (j + 1);
    const c = (i + 1) + (segmentsX + 1) * (j + 1);
    const d = (i + 1) + (segmentsX + 1) * j;
    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}
geometry.setIndex(indices);
geometry.computeVertexNormals();

// Material: subtle glowing fabric
const material = new THREE.MeshStandardMaterial({
  color: 0xd0e7ff,
  emissive: 0x05253a,
  emissiveIntensity: 0.3,
  roughness: 0.6,
  metalness: 0.05,
  side: THREE.DoubleSide,
  flatShading: false
});

const clothMesh = new THREE.Mesh(geometry, material);
clothMesh.castShadow = true;
clothMesh.receiveShadow = true;
scene.add(clothMesh);

// Add a subtle ground (for shadow contact) but keep transparent
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.6;
ground.receiveShadow = true;
scene.add(ground);

// Input
const input = setupInput(renderer, camera, scene, cloth, clothMesh);

// Physics loop using fixed timestep for stability
let lastTime = performance.now();
let accumulator = 0;
const fixedDt = 1 / 60;

function updatePhysics(dt) {
  // Small global damping is applied in integrate; no global gravity to keep cloth floating
  // But we add a tiny restorative force to avoid numerical drift
  const restoreStrength = 0.001;
  for (let i = 0; i < cloth.particles.length; i++) {
    const p = cloth.particles[i];
    // gentle pull toward initial plane (y=0) so cloth settles softly
    const dy = -p.position.y * restoreStrength;
    p.acceleration.y += dy;
  }

  cloth.integrate(dt, 0.99);
  cloth.satisfyConstraints(5);
}

// Render loop
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let frameDt = (now - lastTime) / 1000;
  if (frameDt > 0.25) frameDt = 0.25;
  lastTime = now;
  accumulator += frameDt;

  while (accumulator >= fixedDt) {
    updatePhysics(fixedDt);
    accumulator -= fixedDt;
  }

  // copy particle positions into geometry buffer
  cloth.fillPositions(geometry.attributes.position.array);
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();

// Expose for debugging
window.__boxland = { scene, camera, cloth, clothMesh };
