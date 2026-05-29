// Cloth physics using Verlet integration and distance constraints
// Exports a Cloth class that maintains particles and constraints,
// integrates motion using Verlet, and solves constraints iteratively.

export class Cloth {
  constructor(width = 4, height = 4, segX = 80, segY = 80) {
    this.width = width;
    this.height = height;
    this.segmentsX = segX;
    this.segmentsY = segY;

    this.particles = [];
    this.constraints = [];

    this.restDistanceX = width / segX;
    this.restDistanceY = height / segY;

    this.initParticles();
    this.initConstraints();
  }

  // Create particles arranged in a grid. Each particle has position, previous position, and acceleration.
  initParticles() {
    const sx = this.segmentsX;
    const sy = this.segmentsY;
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    for (let j = 0; j <= sy; j++) {
      for (let i = 0; i <= sx; i++) {
        const x = (i / sx) * this.width - halfW;
        const y = 0; // keep terrain initially horizontal in XZ plane at y=0
        const z = (j / sy) * this.height - halfH;
        const pos = { x, y, z };
        // Pin all border vertices (edges of the terrain remain fixed in place)
        const pinned = i === 0 || i === sx || j === 0 || j === sy;
        this.particles.push({
          position: { ...pos },
          prevPosition: { ...pos },
          originalPosition: { ...pos },
          acceleration: { x: 0, y: 0, z: 0 },
          mass: 1,
          invMass: 1,
          pinned
        });
      }
    }
  }

  // Create structural and shear constraints between neighboring particles.
  initConstraints() {
    const sx = this.segmentsX;
    const sy = this.segmentsY;

    const idx = (i, j) => j * (sx + 1) + i;

    for (let j = 0; j <= sy; j++) {
      for (let i = 0; i <= sx; i++) {
        if (i < sx) {
          this.constraints.push({ a: idx(i, j), b: idx(i + 1, j), rest: this.restDistanceX });
        }
        if (j < sy) {
          this.constraints.push({ a: idx(i, j), b: idx(i, j + 1), rest: this.restDistanceY });
        }
        // Shear constraints (diagonals)
        if (i < sx && j < sy) {
          const d = Math.sqrt(this.restDistanceX * this.restDistanceX + this.restDistanceY * this.restDistanceY);
          this.constraints.push({ a: idx(i, j), b: idx(i + 1, j + 1), rest: d });
          this.constraints.push({ a: idx(i + 1, j), b: idx(i, j + 1), rest: d });
        }
      }
    }
  }

  // Add an external force to a particle (e.g., from interaction)
  addForce(index, fx, fy, fz) {
    const p = this.particles[index];
    p.acceleration.x += fx * p.invMass;
    p.acceleration.y += fy * p.invMass;
    p.acceleration.z += fz * p.invMass;
  }

  // Verlet integration. We integrate positions using previous position and acceleration.
  integrate(dt, damping = 0.98) {
    const dt2 = dt * dt;
    for (const p of this.particles) {
      if (p.pinned) continue;
      const pos = p.position;
      const prev = p.prevPosition;

      // velocity = pos - prev
      const vx = (pos.x - prev.x) * damping;
      const vy = (pos.y - prev.y) * damping;
      const vz = (pos.z - prev.z) * damping;

      // verlet integration: newPos = pos + velocity + acc * dt^2
      const nx = pos.x + vx + p.acceleration.x * dt2;
      const ny = pos.y + vy + p.acceleration.y * dt2;
      const nz = pos.z + vz + p.acceleration.z * dt2;

      // update
      p.prevPosition.x = pos.x;
      p.prevPosition.y = pos.y;
      p.prevPosition.z = pos.z;

      p.position.x = nx;
      p.position.y = ny;
      p.position.z = nz;

      // reset acceleration for next frame
      p.acceleration.x = 0;
      p.acceleration.y = 0;
      p.acceleration.z = 0;
    }
  }

  // Solve distance constraints by moving particles along the connecting line.
  // Terrain stiffness is much higher than cloth (default ~15 iterations instead of 5).
  satisfyConstraints(iterations = 15) {
    for (let iter = 0; iter < iterations; iter++) {
      for (const c of this.constraints) {
        const a = this.particles[c.a];
        const b = this.particles[c.b];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist === 0) dist = 1e-6;
        const diff = (dist - c.rest) / dist;

        // For terrain, use stronger correction but avoid full snap to prevent oscillation.
        const corr = 0.75;

        if (!a.pinned) {
          a.position.x += dx * diff * corr;
          a.position.y += dy * diff * corr;
          a.position.z += dz * diff * corr;
        }
        if (!b.pinned) {
          b.position.x -= dx * diff * corr;
          b.position.y -= dy * diff * corr;
          b.position.z -= dz * diff * corr;
        }
      }
    }
  }

  // Apply terrain smoothing: neighboring vertices partially average their heights.
  // This gives a geological, smooth appearance instead of sharp jagged spikes.
  smoothTerrain(strength = 0.08) {
    const sx = this.segmentsX;
    const sy = this.segmentsY;
    const newHeights = new Float32Array((sx + 1) * (sy + 1));

    // Copy current heights
    for (let i = 0; i < this.particles.length; i++) {
      newHeights[i] = this.particles[i].position.y;
    }

    // Average each height with its neighbors (4-connectivity)
    const idx = (i, j) => j * (sx + 1) + i;
    for (let j = 0; j <= sy; j++) {
      for (let i = 0; i <= sx; i++) {
        if (this.particles[idx(i, j)].pinned) continue; // Don't smooth border
        let sum = newHeights[idx(i, j)];
        let count = 1;
        if (i > 0) { sum += newHeights[idx(i - 1, j)]; count++; }
        if (i < sx) { sum += newHeights[idx(i + 1, j)]; count++; }
        if (j > 0) { sum += newHeights[idx(i, j - 1)]; count++; }
        if (j < sy) { sum += newHeights[idx(i, j + 1)]; count++; }
        const avg = sum / count;
        this.particles[idx(i, j)].position.y += (avg - this.particles[idx(i, j)].position.y) * strength;
      }
    }
  }

  // Utility to map grid indices
  index(i, j) {
    return j * (this.segmentsX + 1) + i;
  }

  // Update positions into a Float32Array used for rendering.
  fillPositions(positions) {
    let ptr = 0;
    for (const p of this.particles) {
      positions[ptr++] = p.position.x;
      positions[ptr++] = p.position.y;
      positions[ptr++] = p.position.z;
    }
  }
}
