/**
 * Fixed-capacity ring of 3D points for a line trail, with no allocation after construction.
 *
 * Positions are written into one preallocated `Float32Array` (3 floats per point). Once the ring is
 * full, each push overwrites the oldest point. A line drawn straight through the buffer would join
 * the newest point back to the oldest at the write position, so `writeDrawOrder` fills a second
 * preallocated `Uint16Array` with the slots in time order (oldest first). Drawing through that index
 * list keeps the trail continuous across the wrap-around. The module has no three.js dependency, so
 * Node tests can cover it.
 */
export class TrailBuffer {
  readonly capacity: number;
  /** Packed x, y, z per slot; the same array is reused for the life of the buffer. */
  readonly positions: Float32Array;
  /** Slot indices, oldest to newest, valid for the first `writeDrawOrder()` entries. */
  readonly order: Uint16Array;

  /** Slot the next push writes to. */
  private head = 0;
  /** Number of stored points, at most `capacity`. */
  private size = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 65535) {
      throw new RangeError(`TrailBuffer capacity must be an integer from 1 to 65535, got ${capacity}`);
    }
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.order = new Uint16Array(capacity);
  }

  get length(): number {
    return this.size;
  }

  push(x: number, y: number, z: number): void {
    const offset = this.head * 3;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.head = this.head + 1 === this.capacity ? 0 : this.head + 1;
    if (this.size < this.capacity) this.size++;
  }

  /**
   * Fills `order` with the stored slots, oldest first, and returns how many are valid
   * (the number of points to draw).
   */
  writeDrawOrder(): number {
    // Before the first wrap the oldest point is slot 0; afterwards it is the slot at `head`.
    let slot = this.size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.size; i++) {
      this.order[i] = slot;
      slot = slot + 1 === this.capacity ? 0 : slot + 1;
    }
    return this.size;
  }
}
