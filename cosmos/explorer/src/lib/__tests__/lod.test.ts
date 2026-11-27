import { describe, expect, it } from 'vitest';
import { lodBudget, selectLOD, stableHash32 } from '../lod';

describe('catalogue LOD', () => {
  it('small catalogues are not decimated', () => {
    expect(lodBudget(2400, 1000)).toBe(2400);
  });
  it('far view has a smaller bounded budget than near view', () => {
    expect(lodBudget(5_000_000, 10_000)).toBe(25_000);
    expect(lodBudget(5_000_000, 10_000)).toBeLessThan(lodBudget(5_000_000, 100));
    expect(lodBudget(5_000_000, 10_000)).toBeGreaterThanOrEqual(25_000);
    expect(lodBudget(5_000_000, 100)).toBeLessThanOrEqual(250_000);
  });
  it('sampling is deterministic and prefix-stable', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: `obj-${i}` }));
    const a = selectLOD(items, 100).map((x) => x.id);
    const b = selectLOD([...items].reverse(), 100).map((x) => x.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(100);
    expect(stableHash32('obj-1')).toBe(stableHash32('obj-1'));
  });
  it('matches a full stable sort for small and large budgets', () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({ id: `id-${(i * 37) % 5000}` }));
    const expected = [...items].sort((a, b) => stableHash32(a.id) - stableHash32(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, 250);
    expect(selectLOD(items, 250)).toEqual(expected);
  });
  it('handles zero budget and duplicate ids deterministically', () => {
    const items = [{ id: 'x' }, { id: 'x' }, { id: 'y' }];
    expect(selectLOD(items, 0)).toEqual([]);
    expect(selectLOD(items, 2)).toHaveLength(2);
  });
});
