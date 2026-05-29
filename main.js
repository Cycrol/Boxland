import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { Renderer } from './renderer.js';
import { GraphSurface } from './graph.js';
import { Surfer } from './surfer.js';
import { createUI } from './ui.js';
import { presets } from './presets.js';
import { AudioManager } from './audio.js';

const container = document.getElementById('app');
const renderer = new Renderer(container);
const graph = new GraphSurface(renderer.scene, {
  size: 220,
  segments: 220,
  colorMap: 'futuristic'
});
renderer.setMesh(graph.mesh);

const surfer = new Surfer(renderer.scene, graph);
const controls = { left: false, right: false };
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyA' || event.key === 'a') controls.left = true;
  if (event.code === 'KeyD' || event.key === 'd') controls.right = true;
});
window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyA' || event.key === 'a') controls.left = false;
  if (event.code === 'KeyD' || event.key === 'd') controls.right = false;
});
surfer.setControls(controls);

const audio = new AudioManager();
let cameraMode = 'firstPerson';
let cameraDistance = 1.2;
const cameraDistanceMin = 0.6;
const cameraDistanceMax = 18;

window.addEventListener('wheel', (event) => {
  if (cameraMode !== 'firstPerson') return;
  const delta = event.deltaY > 0 ? 1 : -1;
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + delta * 0.28, cameraDistanceMin, cameraDistanceMax);
  event.preventDefault();
}, { passive: false });

const ui = createUI({
  equation: 'sin(sqrt(x*x + z*z) - t)',
  presets,
  onEquationChange(expr) {
    graph.setExpression(expr);
  },
  onPlayPause(paused) {
    renderer.setPaused(paused);
    if (!paused) {
      audio.start();
    }
  },
  onSpeedChange(speed) {
    graph.setSpeed(speed);
  },
  onAmplitudeChange(amplitude) {
    graph.setAmplitude(amplitude);
  },
  onWavelengthChange(wavelength) {
    graph.setWaveScale(wavelength);
  },
  onTurbulenceChange(turbulence) {
    graph.setTurbulence(turbulence);
  },
  onViewToggle() {
    cameraMode = cameraMode === 'firstPerson' ? 'thirdPerson' : 'firstPerson';
    renderer.controls.setEnabled(false);
    return cameraMode === 'firstPerson' ? 'First Person' : 'Third Person';
  }
});

graph.setExpression(ui.getEquation());
graph.setAmplitude(1);
graph.setSpeed(1);
graph.setWaveScale(0.18);
graph.setTurbulence(0.45);

renderer.onTick((time, delta) => {
  graph.update(time);
  surfer.update(delta, time);

  const localX = surfer.worldX - graph.offsetX;
  const localZ = surfer.worldZ - graph.offsetZ;
  const boundary = graph.size * 0.35;
  if (Math.abs(localX) > boundary || Math.abs(localZ) > boundary) {
    graph.setOffset(
      graph.offsetX + localX * 0.5,
      graph.offsetZ + localZ * 0.5
    );
  }

  const headPosition = surfer.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0));
  const forward = new THREE.Vector3(Math.sin(surfer.heading), 0, Math.cos(surfer.heading));
  const lookAtTarget = headPosition.clone().add(forward.clone().multiplyScalar(12));

  if (cameraMode === 'firstPerson') {
    const cameraOffset = forward.clone().multiplyScalar(-cameraDistance).add(new THREE.Vector3(0, 1.2 + cameraDistance * 0.18, 0));
    const desiredCam = headPosition.clone().add(cameraOffset);
    renderer.camera.position.lerp(desiredCam, 0.18);
    renderer.camera.lookAt(lookAtTarget);
    const desiredFov = 72 - Math.min(18, cameraDistance * 1.2);
    renderer.camera.fov = THREE.MathUtils.lerp(renderer.camera.fov, desiredFov, 0.08);
  } else {
    const behind = forward.clone().multiplyScalar(-12 - cameraDistance * 0.8);
    const desiredCam = headPosition.clone().add(behind).add(new THREE.Vector3(0, 5 + cameraDistance * 0.4, 0));
    renderer.camera.position.lerp(desiredCam, 0.1);
    renderer.camera.lookAt(headPosition);
    const desiredFov = 38 + Math.min(16, surfer.speed * 0.7);
    renderer.camera.fov = THREE.MathUtils.lerp(renderer.camera.fov, desiredFov, 0.06);
  }

  renderer.camera.updateProjectionMatrix();
});

graph.update(0);
renderer.controls.setEnabled(false);
renderer.start();

audio.start().catch(() => {
  window.addEventListener('pointerdown', () => audio.resume(), { once: true });
});
