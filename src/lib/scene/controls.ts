import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export type Mode = 'tour' | 'fly' | 'orbit';

export class SceneControls {
  mode: Mode = 'orbit';
  readonly orbit: OrbitControls;
  readonly pointer: PointerLockControls;
  flySpeed = 10; // m/s, adjustable with the mouse wheel

  private keys = new Set<string>();
  private velocity = new THREE.Vector3();
  private camera: THREE.PerspectiveCamera;
  private dom: HTMLElement;
  private onModeChange: (m: Mode) => void;
  private disposed = false;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement, onModeChange: (m: Mode) => void) {
    this.camera = camera;
    this.dom = dom;
    this.onModeChange = onModeChange;

    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.minDistance = 0.1;
    this.orbit.maxDistance = 2000;
    this.orbit.target.set(3.6, 0.9, 0);

    this.pointer = new PointerLockControls(camera, dom);
    this.pointer.addEventListener('unlock', () => {
      if (this.mode === 'fly' && !this.disposed) this.onModeChange('fly');
    });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('click', this.onClick);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT')
      return;
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== 'fly') return;
    e.preventDefault();
    this.flySpeed = THREE.MathUtils.clamp(this.flySpeed * Math.pow(1.15, -Math.sign(e.deltaY)), 1, 400);
  };

  private onClick = () => {
    if (this.mode === 'fly' && !this.pointer.isLocked) this.pointer.lock();
  };

  setMode(mode: Mode): void {
    this.mode = mode;
    this.orbit.enabled = mode === 'orbit';
    if (mode === 'fly') {
      this.pointer.lock();
    } else if (this.pointer.isLocked) {
      this.pointer.unlock();
    }
    if (mode === 'orbit') {
      // Re-aim the orbit pivot a few meters ahead of wherever the camera is now.
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.orbit.target.copy(this.camera.position).addScaledVector(dir, 10);
    }
    this.onModeChange(mode);
  }

  update(dt: number): void {
    // Orbit can be live outside orbit mode too (e.g. parked at a tour stop).
    if (this.orbit.enabled) {
      this.orbit.update();
      return;
    }
    if (this.mode !== 'fly') return;

    const accel = new THREE.Vector3();
    if (this.keys.has('KeyW')) accel.z -= 1;
    if (this.keys.has('KeyS')) accel.z += 1;
    if (this.keys.has('KeyA')) accel.x -= 1;
    if (this.keys.has('KeyD')) accel.x += 1;
    if (this.keys.has('KeyE') || this.keys.has('Space')) accel.y += 1;
    if (this.keys.has('KeyQ') || this.keys.has('KeyC')) accel.y -= 1;

    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1;
    if (accel.lengthSq() > 0) {
      accel.normalize();
      // W/S follow the full camera direction (pitch included) so you can fly up a tower face.
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const move = new THREE.Vector3()
        .addScaledVector(forward, -accel.z)
        .addScaledVector(right, accel.x)
        .addScaledVector(new THREE.Vector3(0, 1, 0), accel.y)
        .normalize();
      this.velocity.addScaledVector(move, this.flySpeed * boost * dt * 6);
    }
    this.velocity.multiplyScalar(Math.max(0, 1 - dt * 5));
    const maxV = this.flySpeed * boost;
    if (this.velocity.length() > maxV) this.velocity.setLength(maxV);
    this.camera.position.addScaledVector(this.velocity, dt);
    if (this.camera.position.y < 0.3) this.camera.position.y = 0.3;
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.dom.removeEventListener('wheel', this.onWheel);
    this.dom.removeEventListener('click', this.onClick);
    this.orbit.dispose();
    this.pointer.dispose();
  }
}
