import { describe, it, expect } from 'vitest';
import { toHHmm, toMinutes } from '../time';

describe('time utility functions', () => {
  it('converts minutes to HH:mm', () => {
    const cases: [number, string][] = [
      [0, '00:00'],
      [5, '00:05'],
      [60, '01:00'],
      [90, '01:30'],
      [135, '02:15'],
    ];

    for (const [mins, expected] of cases) {
      expect(toHHmm(mins)).toBe(expected);
    }
  });

  it('converts HH:mm to minutes', () => {
    const cases: [string, number][] = [
      ['00:00', 0],
      ['00:05', 5],
      ['01:00', 60],
      ['01:30', 90],
      ['02:15', 135],
    ];

    for (const [hhmm, expected] of cases) {
      expect(toMinutes(hhmm)).toBe(expected);
    }
  });
});
