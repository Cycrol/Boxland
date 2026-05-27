// Input handler: raycasts into the cloth mesh and applies soft radial displacement
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export function setupInput(renderer, camera, scene, cloth, mesh) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let lastY = 0;
  let activeIndex = -1;
  const radius = Math.max(cloth.width, cloth.height) * 0.12;

  function getPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onDown(e) {
    getPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length > 0) {
      dragging = true;
      lastY = e.clientY;
      activeIndex = findNearestParticle(intersects[0].point);
      applyRadialDisplacement(intersects[0].point, 0.02);
    }
  }

  function onMove(e) {
    if (!dragging) return;
    const deltaY = (e.clientY - lastY) / renderer.domElement.clientHeight;
    lastY = e.clientY;

    // Map screen delta to world vertical displacement
    const amount = -deltaY * 6.0; // tuned strength

    // Raycast to get interaction point (for radial falloff center)
    getPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(mesh);
    let center;
    if (intersects.length > 0) center = intersects[0].point;
    else {
      // fallback: use nearest particle world position
      const p = cloth.particles[activeIndex].position;
      center = new THREE.Vector3(p.x, p.y, p.z);
    }

    applyRadialDisplacement(center, amount);
  }

  function onUp() {
    dragging = false;
    activeIndex = -1;
  }

  // Find nearest particle index to a world point
  function findNearestParticle(point) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < cloth.particles.length; i++) {
      const p = cloth.particles[i].position;
      const dx = p.x - point.x;
      const dy = p.y - point.y;
      const dz = p.z - point.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestDist) {
        bestDist = d2;
        best = i;
      }
    }
    return best;
  }

  // Apply a displacement to particles within radius with smooth falloff
  function applyRadialDisplacement(center, amount) {
    const r2 = radius * radius;
    for (let i = 0; i < cloth.particles.length; i++) {
      const p = cloth.particles[i];
      const dx = p.position.x - center.x;
      const dy = p.position.y - center.y;
      const dz = p.position.z - center.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2);
      const falloff = 1 - (d / radius);
      const soft = falloff * falloff; // smooth quadratic falloff

      // Move particle along world Y by scaled amount
      if (!p.pinned) {
        p.position.y += amount * soft;
        // also move previous position a bit to produce velocity
        p.prevPosition.y += amount * soft * 0.6;
      }
    }
  }

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    dispose() {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
  };
}
