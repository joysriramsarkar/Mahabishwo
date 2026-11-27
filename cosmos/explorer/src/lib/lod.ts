/** Deterministic catalogue LOD (production tile streaming remains phase 6). */
export function stableHash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function lodBudget(total: number, cameraDistanceMpc: number, maxBudget = 250_000): number {
  if (total <= maxBudget) return total;
  // Far view: 25k; near view: maxBudget. Log interpolation avoids a hard pop.
  const t = Math.max(0, Math.min(1,
    (Math.log10(Math.max(cameraDistanceMpc, 1)) - 2) / 2)); // 100 Mpc -> 10,000 Mpc
  const farBudget = Math.min(25_000, maxBudget);
  return Math.max(farBudget, Math.min(maxBudget,
    Math.round(maxBudget - (maxBudget - farBudget) * t)));
}

interface Ranked<T extends { id: string }> { item: T; hash: number }

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function better<T extends { id: string }>(a: Ranked<T>, b: Ranked<T>): boolean {
  return a.hash < b.hash || (a.hash === b.hash && compareId(a.item.id, b.item.id) < 0);
}

/** Max-heap by hash/id: root is the worst selected item. */
function worse<T extends { id: string }>(a: Ranked<T>, b: Ranked<T>): boolean {
  return a.hash > b.hash || (a.hash === b.hash && compareId(a.item.id, b.item.id) > 0);
}

function pushHeap<T extends { id: string }>(heap: Ranked<T>[], value: Ranked<T>) {
  heap.push(value);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (!worse(heap[i]!, heap[parent]!)) break;
    [heap[i], heap[parent]] = [heap[parent]!, heap[i]!];
    i = parent;
  }
}

function popHeap<T extends { id: string }>(heap: Ranked<T>[]): Ranked<T> {
  const root = heap[0]!;
  const tail = heap.pop()!;
  if (heap.length) {
    heap[0] = tail;
    let i = 0;
    while (true) {
      const left = i * 2 + 1, right = left + 1;
      let worst = i;
      if (left < heap.length && worse(heap[left]!, heap[worst]!)) worst = left;
      if (right < heap.length && worse(heap[right]!, heap[worst]!)) worst = right;
      if (worst === i) break;
      [heap[i], heap[worst]] = [heap[worst]!, heap[i]!];
      i = worst;
    }
  }
  return root;
}

/**
 * Stable top-k by 32-bit id hash. O(n log k) time and O(k) memory, so a
 * 5-10M catalogue does not require copying/sorting the entire array.
 */
export function selectLOD<T extends { id: string }>(items: T[], budget: number): T[] {
  if (budget <= 0) return [];
  if (items.length <= budget) return items;
  const k = Math.min(budget, items.length);
  const heap: Ranked<T>[] = [];
  for (const item of items) {
    const ranked = { item, hash: stableHash32(item.id) };
    if (heap.length < k) pushHeap(heap, ranked);
    else if (better(ranked, heap[0]!)) {
      popHeap(heap);
      pushHeap(heap, ranked);
    }
  }
  return heap.map((h) => h.item).sort((a, b) => {
    const ha = stableHash32(a.id), hb = stableHash32(b.id);
    return ha - hb || compareId(a.id, b.id);
  });
}
