import * as THREE from 'three';
import { TrailBuffer } from './trailBuffer';

/**
 * A line trail whose GPU buffers are written in place. The geometry, its two attributes and the
 * material are allocated once in the constructor; `push` writes one point and updates the draw
 * range, so nothing is created per frame. Call `dispose` when the owner unmounts.
 */
export class TrailLine {
  readonly line: THREE.Line;

  private readonly trail: TrailBuffer;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineBasicMaterial;
  private readonly positionAttr: THREE.BufferAttribute;
  private readonly indexAttr: THREE.BufferAttribute;

  constructor(capacity: number, color: string, opacity: number) {
    this.trail = new TrailBuffer(capacity);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(this.trail.positions, 3).setUsage(
      THREE.DynamicDrawUsage
    );
    this.indexAttr = new THREE.BufferAttribute(this.trail.order, 1).setUsage(
      THREE.DynamicDrawUsage
    );
    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setIndex(this.indexAttr);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this.line = new THREE.Line(this.geometry, this.material);
  }

  /** Adds one point; the oldest point is dropped once the trail is full. */
  push(x: number, y: number, z: number): void {
    this.trail.push(x, y, z);
    this.positionAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, this.trail.writeDrawOrder());
    this.indexAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
