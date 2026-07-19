import raw from './percentiles.json';

export type CountryCode = 'DE' | 'EA' | 'US';

export interface SpendingTarget {
  id: string;
  label: string;
  amount: number;
}

export interface UserConfig {
  netMonthlyIncome: number;
  totalWealth: number;
  /** fraction of totalWealth that is liquid (0..1); the rest is invested */
  liquidShare: number;
  annualSpending: number;
  age: number;
  country: CountryCode;
  /** null → 25× annual spending */
  fireTargetOverride: number | null;
  spendingTargets: SpendingTarget[];
}

export const defaultConfig: UserConfig = {
  netMonthlyIncome: 3200,
  totalWealth: 150_000,
  liquidShare: 0.4,
  annualSpending: 30_000,
  age: 29,
  country: 'DE',
  fireTargetOverride: null,
  spendingTargets: [
    { id: 'roadtrip', label: 'Roadtrip', amount: 8_000 },
    { id: 'laptop', label: 'New laptop', amount: 2_500 },
  ],
};

export interface Bracket {
  ageMin: number;
  ageMax: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p99: number;
}

export interface PercentilePoint {
  percentile: number;
  value: number;
}

interface Dataset {
  disclaimer: string;
  sources: { id: string; label: string; url: string }[];
  countries: Record<string, { label: string; sourceId: string; brackets: Bracket[] }>;
}

export const dataset = raw as Dataset;

export function countryLabel(code: CountryCode): string {
  return dataset.countries[code]?.label ?? code;
}

export function bracketFor(country: CountryCode, age: number): Bracket {
  const brackets = dataset.countries[country].brackets;
  return (
    brackets.find((b) => age >= b.ageMin && age <= b.ageMax) ?? brackets[brackets.length - 1]
  );
}

export function percentilesFor(country: CountryCode, age: number): PercentilePoint[] {
  const b = bracketFor(country, age);
  return [
    { percentile: 25, value: b.p25 },
    { percentile: 50, value: b.p50 },
    { percentile: 75, value: b.p75 },
    { percentile: 90, value: b.p90 },
    { percentile: 99, value: b.p99 },
  ];
}

export function fireTarget(cfg: UserConfig): number {
  return cfg.fireTargetOverride ?? cfg.annualSpending * 25;
}

/** Working years assumed for the lifetime-earnings stack. */
export const WORK_YEARS = 42;

export function lifetimeEarnings(cfg: UserConfig): number {
  return cfg.netMonthlyIncome * 12 * WORK_YEARS;
}

/**
 * Smooth a bracket's five published percentiles into a full 5–99 curve.
 * Log-linear between anchors, quadratic fade toward zero below p25.
 * Approximate by construction — same caveat as the dataset itself.
 */
export function bracketCurve(b: Bracket, step = 2): { q: number; value: number }[] {
  const anchors: [number, number][] = [
    [25, b.p25],
    [50, b.p50],
    [75, b.p75],
    [90, b.p90],
    [99, b.p99],
  ];
  const at = (q: number): number => {
    if (q <= 25) return b.p25 * Math.pow(q / 25, 2);
    for (let i = 0; i < anchors.length - 1; i++) {
      const [q0, v0] = anchors[i];
      const [q1, v1] = anchors[i + 1];
      if (q <= q1) {
        const t = (q - q0) / (q1 - q0);
        if (v0 > 0 && v1 > 0) return Math.exp(THREE_lerp(Math.log(v0), Math.log(v1), t));
        return THREE_lerp(v0, v1, t);
      }
    }
    return b.p99;
  };
  const out: { q: number; value: number }[] = [];
  for (let q = 5; q <= 99; q += step) out.push({ q, value: at(q) });
  return out;
}

const THREE_lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Which percentile of a bracket a given wealth lands on (5–99). */
export function rankInBracket(b: Bracket, wealth: number): number {
  const curve = bracketCurve(b, 1);
  for (const point of curve) {
    if (wealth < point.value) return Math.max(point.q - 1, 5);
  }
  return 99;
}

/** Which percentile of their age bracket the user's wealth lands on (5–99). */
export function percentileRank(country: CountryCode, age: number, wealth: number): number {
  return rankInBracket(bracketFor(country, age), wealth);
}

export interface ProjectionPoint {
  age: number;
  value: number;
}

/** Assumed real return for the trajectory staircase. */
export const REAL_RETURN = 0.04;
export const PROJECTION_END_AGE = 67;

/** Year-by-year wealth projection: compounding plus annual savings. */
export function projectWealth(cfg: UserConfig): ProjectionPoint[] {
  const savings = cfg.netMonthlyIncome * 12 - cfg.annualSpending;
  let v = cfg.totalWealth;
  const out: ProjectionPoint[] = [{ age: cfg.age, value: v }];
  for (let age = cfg.age + 1; age <= PROJECTION_END_AGE; age++) {
    v = Math.max(v * (1 + REAL_RETURN) + savings, 0);
    out.push({ age, value: v });
  }
  return out;
}

/** First age the projection crosses the FIRE target, or null if it never does. */
export function fireAge(cfg: UserConfig): number | null {
  const target = fireTarget(cfg);
  for (const p of projectWealth(cfg)) {
    if (p.value >= target) return p.age;
  }
  return null;
}

/** The one honest scale: 1 bill = 0.1 mm → €1M = 1 m. */
export const METERS_PER_EURO = 1e-6;

export function heightFor(amount: number): number {
  return amount * METERS_PER_EURO;
}

const eur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEUR(amount: number): string {
  return eur.format(amount);
}

export function formatHeight(meters: number): string {
  if (meters < 0.001) return `${(meters * 1000).toFixed(2)} mm`;
  if (meters < 0.01) return `${(meters * 1000).toFixed(1)} mm`;
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  if (meters < 1000) return `${meters.toFixed(meters < 10 ? 2 : 0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
