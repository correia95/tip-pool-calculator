export interface Staff {
  name: string;
  hours: number;
  weight: number;
}

export function effectiveWeight(p: Staff): number {
  return p.hours * p.weight;
}

export function totalWeight(people: Staff[]): number {
  return people.reduce((sum, p) => sum + effectiveWeight(p), 0);
}

export function rawShare(pool: number, person: Staff, total: number): number {
  if (total <= 0) return 0;
  return pool * (effectiveWeight(person) / total);
}

// Largest-remainder (Hamilton) apportionment: round each raw share down to the
// cent, then hand out the leftover cents one at a time to whoever's fractional
// remainder is largest, so the shares always sum to exactly the pool.
export function allocateShares(pool: number, people: Staff[]): number[] {
  if (people.length === 0) return [];
  const total = totalWeight(people);
  if (total <= 0) return people.map(() => 0);

  const raw = people.map((p) => rawShare(pool, p, total));
  const cents = raw.map((r) => Math.floor(r * 100 + 1e-9));
  const allocatedCents = cents.reduce((a, b) => a + b, 0);
  const totalCents = Math.round(pool * 100);
  const remainder = totalCents - allocatedCents;

  const order = raw
    .map((r, i) => ({ i, frac: r * 100 - cents[i] }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remainder; k++) {
    cents[order[k % order.length].i] += 1;
  }

  return cents.map((c) => c / 100);
}

export interface State {
  pool: number;
  people: Staff[];
  currency: string;
}

function toUint8Array(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function toBase64Url(text: string): string {
  const bytes = toUint8Array(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeState(state: State): URLSearchParams {
  const params = new URLSearchParams();
  params.set('d', toBase64Url(JSON.stringify(state)));
  return params;
}

export function decodeState(params: URLSearchParams, fallback: State): State {
  const raw = params.get('d');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.pool !== 'number' || !Array.isArray(parsed.people)) {
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
