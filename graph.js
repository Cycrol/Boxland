import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

const ALLOWED_IDENTIFIERS = new Set([
  'x', 'z', 't', 'wave', 'wavelength', 'turb', 'amp', 'speed',
  'sin', 'cos', 'tan', 'sqrt', 'abs', 'pow', 'exp', 'log', 'pi'
]);

const colorLerp = (a, b, t) => a + (b - a) * t;

const COLOR_MAPS = {
  futuristic(norm) {
    return [
      colorLerp(0.04, 0.52, norm),
      colorLerp(0.08, 0.86, norm),
      colorLerp(0.16, 1.0, norm)
    ];
  }
};

export class GraphSurface {
  constructor(scene, options = {}) {
    this.size = options.size ?? 14;
    this.segments = options.segments ?? 100;
    this.amplitude = 1.0;
    this.speed = 1.0;
    this.expr = 'sin(sqrt(x*x + z*z) - t)';
    this.compileError = null;
    this.colorMap = COLOR_MAPS[options.colorMap] || COLOR_MAPS.futuristic;

    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geometry.rotateX(-Math.PI / 2);

    this.positionArray = geometry.attributes.position.array;
    this.vertexCount = geometry.attributes.position.count;
    this.basePositions = new Float32Array(this.positionArray.length);
    this.basePositions.set(this.positionArray);

    this.colorArray = new Float32Array(this.vertexCount * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

    this.offsetX = 0;
    this.offsetZ = 0;
    this.wave = 0.18;
    this.turb = 0.45;

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0x061220,
      emissiveIntensity: 0.16,
      side: THREE.DoubleSide,
      flatShading: false,
      transparent: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.compileExpression(this.expr);
  }

  setOffset(offsetX, offsetZ) {
    this.offsetX = offsetX;
    this.offsetZ = offsetZ;
  }

  setExpression(expression) {
    this.expr = expression;
    this.compileExpression(expression);
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  setAmplitude(amplitude) {
    this.amplitude = amplitude;
  }

  setWaveScale(scale) {
    this.wave = scale;
  }

  setTurbulence(turbulence) {
    this.turb = turbulence;
  }

  compileExpression(expression) {
    const raw = expression.trim();
    const cleaned = raw.replace(/^y\s*=\s*/i, '').replace(/\s+/g, '');
    const identifiers = Array.from(cleaned.matchAll(/[A-Za-z_]\w*/g)).map((m) => m[0]);

    for (const name of identifiers) {
      if (!ALLOWED_IDENTIFIERS.has(name)) {
        this.compileError = `Disallowed identifier: ${name}`;
        console.warn(this.compileError);
        this.fn = null;
        return;
      }
    }

    try {
      this.fn = new Function(
        'x', 'z', 't', 'wave', 'wavelength', 'turb', 'amp', 'speed',
        'sin', 'cos', 'tan', 'sqrt', 'abs', 'pow', 'exp', 'log', 'pi',
        `return ${cleaned};`
      );
      this.compileError = null;
    } catch (error) {
      this.compileError = error.message;
      this.fn = null;
      console.warn('Surface compile error:', error);
    }
  }

  evaluate(x, z, t) {
    if (!this.fn) return 0;
    try {
      return this.fn(
        x,
        z,
        t,
        this.wave,
        this.wave,
        this.turb,
        this.amplitude,
        this.speed,
        Math.sin,
        Math.cos,
        Math.tan,
        Math.sqrt,
        Math.abs,
        Math.pow,
        Math.exp,
        Math.log,
        Math.PI
      );
    } catch (error) {
      return 0;
    }
  }

  getSurfaceData(x, z, t) {
    const y = this.evaluate(x, z, t) * this.amplitude;
    const eps = 0.35;
    const hx = (this.evaluate(x + eps, z, t) - this.evaluate(x - eps, z, t)) / (2 * eps) * this.amplitude;
    const hz = (this.evaluate(x, z + eps, t) - this.evaluate(x, z - eps, t)) / (2 * eps) * this.amplitude;
    const nextY = this.evaluate(x, z, t + 0.06) * this.amplitude;
    const normal = new THREE.Vector3(-hx, 1, -hz).normalize();

    return {
      height: y,
      normal,
      gradient: { x: hx, z: hz },
      surfaceVelocity: (nextY - y) / 0.06
    };
  }

  update(time) {
    const t = time * this.speed;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < this.vertexCount; i += 1) {
      const j = i * 3;
      const x = this.basePositions[j] + this.offsetX;
      const z = this.basePositions[j + 2] + this.offsetZ;
      const value = this.evaluate(x, z, t) * this.amplitude;
      this.positionArray[j + 1] = value;
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }

    const range = Math.max(maxValue - minValue, 0.0001);
    for (let i = 0; i < this.vertexCount; i += 1) {
      const j = i * 3;
      const y = this.positionArray[j + 1];
      const norm = (y - minValue) / range;
      const [r, g, b] = this.colorMap(norm);
      this.colorArray[j] = r;
      this.colorArray[j + 1] = g;
      this.colorArray[j + 2] = b;
    }

    const geometry = this.mesh.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
