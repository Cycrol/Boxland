// Input handler: raycasts into the terrain mesh and applies soft radial displacement.
// Supports raise/lower brush modes and adjustable brush size.
// Accepts the shared THREE instance from the main module to avoid duplicate copies.
export function setupInput(THREE, renderer, camera, scene, cloth, mesh) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let lastY = 0;
  let activeIndex = -1;
  let lastCenter = null;
  
  // Terrain sculpting parameters
  let brushSize = Math.max(cloth.width, cloth.height) * 0.12;
  let brushMode = 'raise';  // 'raise' or 'lower'
  const baseRadius = brushSize;

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
      lastCenter = intersects[0].point.clone();
      // stronger immediate feedback when starting a sculpt
      applyRadialDisplacement(lastCenter, 0.08);
    }
  }

  function onMove(e) {
    if (!dragging) return;
    const deltaY = (e.clientY - lastY) / renderer.domElement.clientHeight;
    lastY = e.clientY;

    // Map screen delta to world vertical displacement
    // Scale based on brush mode: allow much larger upward stretch
    const strength = brushMode === 'raise' ? -24.0 : 12.0;
    const amount = deltaY * strength;

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

    lastCenter = center.clone();
    applyRadialDisplacement(center, amount);
  }

  function onUp() {
    dragging = false;
    activeIndex = -1;
    if (lastCenter) stabilizeRegion(lastCenter, brushSize * 1.2);
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
    const r2 = brushSize * brushSize;
    for (let i = 0; i < cloth.particles.length; i++) {
      const p = cloth.particles[i];
      if (p.pinned) continue;  // Don't move pinned border vertices
      
      const dx = p.position.x - center.x;
      const dy = p.position.y - center.y;
      const dz = p.position.z - center.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      
      const d = Math.sqrt(d2);
      const normalized = d / brushSize;
      // Cubic falloff for smooth interaction gradient
      const falloff = 1 - (normalized * normalized * normalized);
      
      // Apply displacement to Y (height) with strong falloff
      p.position.y += amount * falloff;
      // Add only a small previous-position adjustment to reduce long-term pulsing
      p.prevPosition.y += amount * falloff * 0.1;
    }
  }

  function stabilizeRegion(center, radius) {
    const r2 = radius * radius;
    for (let i = 0; i < cloth.particles.length; i++) {
      const p = cloth.particles[i];
      if (p.pinned) continue;
      const dx = p.position.x - center.x;
      const dy = p.position.y - center.y;
      const dz = p.position.z - center.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      p.prevPosition.x = p.position.x;
      p.prevPosition.y = p.position.y;
      p.prevPosition.z = p.position.z;
    }
  }

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Keyboard controls for brush mode and size
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') brushMode = 'raise';   // R for raise
    if (e.key === 'l' || e.key === 'L') brushMode = 'lower';   // L for lower
    if (e.key === '[') brushSize = Math.max(0.1, brushSize - 0.1);  // [ to shrink
    if (e.key === ']') brushSize = Math.min(2.0, brushSize + 0.1);  // ] to grow
  });

  return {
    dispose() {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
  };
}
