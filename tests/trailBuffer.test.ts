import { describe, expect, it } from 'vitest';
import { TrailBuffer } from '@/lib/trailBuffer';

/** Reads the points in draw order (oldest first) through the index list, as the GPU does. */
function drawnX(trail: TrailBuffer): number[] {
  const count = trail.writeDrawOrder();
  const xs: number[] = [];
  for (let i = 0; i < count; i++) {
    xs.push(trail.positions[trail.order[i] * 3]);
  }
  return xs;
}

describe('TrailBuffer', () => {
  it('rejects capacities that are not integers from 1 to 65535', () => {
    expect(() => new TrailBuffer(0)).toThrow(RangeError);
    expect(() => new TrailBuffer(1.5)).toThrow(RangeError);
    expect(() => new TrailBuffer(65536)).toThrow(RangeError);
    expect(() => new TrailBuffer(100)).not.toThrow();
  });

  it('keeps the points in time order before the first wrap-around', () => {
    const trail = new TrailBuffer(5);
    for (let i = 1; i <= 3; i++) trail.push(i, 0, 0);
    expect(trail.length).toBe(3);
    expect(drawnX(trail)).toEqual([1, 2, 3]);
  });

  it('draws the last `capacity` points oldest to newest after wrapping (no seam)', () => {
    const trail = new TrailBuffer(4);
    for (let i = 1; i <= 10; i++) trail.push(i, 0, 0);
    expect(trail.length).toBe(4);
    expect(drawnX(trail)).toEqual([7, 8, 9, 10]);
  });

  it('keeps the chronological order at every step once full', () => {
    const capacity = 7;
    const trail = new TrailBuffer(capacity);
    for (let i = 1; i <= 40; i++) {
      trail.push(i, 0, 0);
      const xs = drawnX(trail);
      const expectedLength = Math.min(i, capacity);
      const expected = Array.from({ length: expectedLength }, (_, k) => i - expectedLength + 1 + k);
      expect(xs).toEqual(expected);
    }
  });

  it('stores x, y, z packed per slot and reuses the same arrays', () => {
    const trail = new TrailBuffer(2);
    const positions = trail.positions;
    const order = trail.order;
    trail.push(1, 2, 3);
    trail.push(4, 5, 6);
    trail.push(7, 8, 9);
    expect(trail.positions).toBe(positions);
    expect(trail.order).toBe(order);
    // Slot 0 was overwritten by the third push, slot 1 holds the second point.
    expect(Array.from(trail.positions)).toEqual([7, 8, 9, 4, 5, 6]);
    trail.writeDrawOrder();
    expect(Array.from(trail.order.subarray(0, 2))).toEqual([1, 0]);
  });
});
