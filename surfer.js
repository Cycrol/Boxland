import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export class Surfer {
  constructor(scene, graph) {
    this.graph = graph;
    this.worldX = 0;
    this.worldZ = 0;
    this.heading = Math.PI;
    this.speed = 8;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.turnStrength = 2.2;
    this.drag = 0.12;
    this.minSpeed = 2.4;
    this.maxSpeed = 28;
    this.boardHeight = 0.22;
    this.controls = { left: false, right: false };
    this.roll = 0;
    this.pitch = 0;

    this.mesh = new THREE.Group();
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 3.4),
      new THREE.MeshStandardMaterial({
        color: 0x80c3ff,
        emissive: 0x0e2f59,
        metalness: 0.25,
        roughness: 0.18,
        flatShading: false
      })
    );
    board.castShadow = true;
    board.receiveShadow = false;
    board.rotation.x = -0.075;
    board.position.y = 0.04;
    this.mesh.add(board);

    const rider = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.52, 10, 18),
      new THREE.MeshStandardMaterial({
        color: 0xdedfe8,
        emissive: 0x17233c,
        roughness: 0.26,
        metalness: 0.08
      })
    );
    rider.castShadow = true;
    rider.receiveShadow = false;
    rider.position.set(0, 0.5, -0.2);
    this.mesh.add(rider);

    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1a4c7f, roughness: 0.2, metalness: 0.15 })
    );
    fin.position.set(0, 0.05, 1.2);
    fin.rotation.x = Math.PI / 2.8;
    this.mesh.add(fin);

    scene.add(this.mesh);
  }

  setControls(controls) {
    this.controls = controls;
  }

  update(delta, time) {
    const surface = this.graph.getSurfaceData(this.worldX, this.worldZ, time);
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const slope = surface.gradient.x * forward.x + surface.gradient.z * forward.z;
    const downwardForce = -slope;

    if (this.controls.left) {
      this.heading += this.turnStrength * delta * (1 + this.speed * 0.06);
    }
    if (this.controls.right) {
      this.heading -= this.turnStrength * delta * (1 + this.speed * 0.06);
    }

    this.speed += downwardForce * delta * 3.2;
    this.speed += 0.24 * delta;
    this.speed -= this.speed * this.drag * delta * 0.7;
    this.speed = THREE.MathUtils.clamp(this.speed, this.minSpeed, this.maxSpeed);

    const dx = forward.x * this.speed * delta;
    const dz = forward.z * this.speed * delta;
    this.worldX += dx;
    this.worldZ += dz;

    this.verticalVelocity += (surface.surfaceVelocity * 1.2 - 9.8 * 0.16) * delta;
    let nextY = this.mesh.position.y + this.verticalVelocity * delta;
    const targetY = surface.height + this.boardHeight;

    if (nextY <= targetY) {
      nextY = targetY;
      this.verticalVelocity = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.mesh.position.set(
      this.worldX - this.graph.offsetX,
      nextY,
      this.worldZ - this.graph.offsetZ
    );

    const up = surface.normal;
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const surfForward = new THREE.Vector3().crossVectors(right, up).normalize();

    const lookMatrix = new THREE.Matrix4();
    lookMatrix.lookAt(
      new THREE.Vector3(0, 0, 0),
      surfForward,
      up
    );

    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    targetQuat.multiply(yawQuat);

    this.mesh.quaternion.slerp(targetQuat, 0.08);

    const bank = (this.controls.left ? 1 : 0) - (this.controls.right ? 1 : 0);
    this.roll = THREE.MathUtils.lerp(this.roll, bank * 0.38 * (this.speed / this.maxSpeed), 0.1);
    this.mesh.rotation.z = this.roll;
  }
}
