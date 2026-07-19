import {
  fireTarget,
  projectWealth,
  PROJECTION_END_AGE,
  type UserConfig,
} from './model';

/**
 * Relational context: every amount expressed in units of *you*.
 * Shared by the hover tooltips and the per-stop equivalents chips.
 */

const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const fmtCount = (n: number): string => nf0.format(Math.round(n));

/** "2,8×" above one, "56 %" below. */
export function ratio(amount: number, base: number): string {
  if (base <= 0) return '—';
  const x = amount / base;
  return x >= 0.995 ? `${nf1.format(x)}×` : `${nf0.format(x * 100)} %`;
}

export function yearsOf(amount: number, perYear: number): string {
  if (perYear <= 0) return '—';
  const y = amount / perYear;
  return y >= 1 ? `${nf1.format(y)} yrs` : `${nf0.format(y * 12)} months`;
}

/** When the user's projection first reaches the amount. */
export function reachLabel(cfg: UserConfig, amount: number): string {
  if (amount <= cfg.totalWealth) return 'already yours';
  for (const p of projectWealth(cfg)) {
    if (p.value >= amount) return `age ${p.age}`;
  }
  return `not before ${PROJECTION_END_AGE}`;
}

export interface HoverRow {
  label: string;
  value: string;
}

/** Default relational rows for an arbitrary amount. */
export function relationRows(cfg: UserConfig, amount: number): HoverRow[] {
  return [
    { label: 'vs. your wealth', value: ratio(amount, cfg.totalWealth) },
    { label: 'in years of your spending', value: yearsOf(amount, Math.max(cfg.annualSpending, 1)) },
    { label: 'of your FIRE target', value: ratio(amount, fireTarget(cfg)) },
    { label: 'your projection reaches it', value: reachLabel(cfg, amount) },
  ];
}

export function runwayMonths(cfg: UserConfig): number {
  const monthly = cfg.annualSpending / 12;
  return monthly > 0 ? cfg.totalWealth / monthly : Infinity;
}

export function savingsRate(cfg: UserConfig): number {
  const income = cfg.netMonthlyIncome * 12;
  return income > 0 ? (income - cfg.annualSpending) / income : 0;
}
