import * as THREE from 'three';
import {
  bracketFor,
  fireAge,
  fireTarget,
  formatEUR,
  formatHeight,
  heightFor,
  lifetimeEarnings,
  percentileRank,
  projectWealth,
  countryLabel,
  PROJECTION_END_AGE,
  WORK_YEARS,
  type UserConfig,
} from '../data/model';
import { CAR_PRICE, COFFEE_PRICE, EXAMPLE_RENT, FLYUP_MILESTONES, HOUSE_PRICE, LINEUP_X } from './constants';
import { fmtCount, ratio, reachLabel, runwayMonths, savingsRate, yearsOf } from '../data/context';
import type { LineupHandles } from './towers';

export interface Chip {
  label: string;
  value: string;
  /** 0..1 renders a hairline progress bar */
  progress?: number;
}

export interface CaptionState {
  title: string;
  sub?: string;
  index: number;
  total: number;
  chips?: Chip[];
  /** true while the camera is travelling (no advance hint) */
  travelling?: boolean;
}

export interface TourStop {
  id: string;
  pos: THREE.Vector3;
  look: THREE.Vector3;
  title: string;
  sub?: string;
  chips?: Chip[];
  duration: number;
  linear?: boolean;
  /** per-frame look target override (e.g. track the tower face during the fly-up) */
  lookAtFn?: (camPos: THREE.Vector3) => THREE.Vector3;
  /** per-frame caption override during travel */
  onProgress?: (t: number, elapsed: number) => { title: string; sub?: string };
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Transition {
  curve: THREE.CatmullRomCurve3;
  fromQuat: THREE.Quaternion;
  toQuat: THREE.Quaternion;
  t: number;
  elapsed: number;
  stop: TourStop;
}

export class Tour {
  active = false;
  private camera: THREE.PerspectiveCamera;
  private onCaption: (c: CaptionState | null) => void;
  private onArrive: (stop: TourStop) => void;
  private onTravelStart: () => void;
  private onFinish: () => void;
  private stops: TourStop[] = [];
  private idx = -1;
  private transition: Transition | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    callbacks: {
      onCaption: (c: CaptionState | null) => void;
      onArrive: (stop: TourStop) => void;
      onTravelStart: () => void;
      onFinish: () => void;
    }
  ) {
    this.camera = camera;
    this.onCaption = callbacks.onCaption;
    this.onArrive = callbacks.onArrive;
    this.onTravelStart = callbacks.onTravelStart;
    this.onFinish = callbacks.onFinish;
  }

  start(stops: TourStop[]): void {
    this.stops = stops;
    this.idx = -1;
    this.active = true;
    this.advance();
  }

  get travelling(): boolean {
    return this.transition != null;
  }

  stop(): void {
    this.active = false;
    this.transition = null;
    this.onCaption(null);
  }

  advance(): void {
    if (!this.active) return;
    if (this.transition) {
      // Skip travel: jump to the end of the current leg.
      this.applyTransition(this.transition, 1);
      const stop = this.transition.stop;
      this.transition = null;
      this.arrive(stop);
      return;
    }
    this.idx += 1;
    if (this.idx >= this.stops.length) {
      this.active = false;
      this.onCaption(null);
      this.onFinish();
      return;
    }
    const stop = this.stops[this.idx];
    const from = this.camera.position.clone();
    const to = stop.pos.clone();
    const dist = from.distanceTo(to);
    const mid = from
      .clone()
      .lerp(to, 0.5)
      .add(new THREE.Vector3(0, stop.linear ? 0 : Math.min(dist * 0.1, 12), 0));
    const curve = new THREE.CatmullRomCurve3(stop.linear ? [from, to] : [from, mid, to]);
    const toQuat = quatLookingAt(to, stop.look);
    this.transition = {
      curve,
      fromQuat: this.camera.quaternion.clone(),
      toQuat,
      t: 0,
      elapsed: 0,
      stop,
    };
    this.onTravelStart();
    if (dist < 0.05) {
      this.applyTransition(this.transition, 1);
      this.transition = null;
      this.arrive(stop);
    }
  }

  update(dt: number): void {
    if (!this.transition) return;
    const tr = this.transition;
    tr.elapsed += dt;
    tr.t = Math.min(tr.elapsed / tr.stop.duration, 1);
    this.applyTransition(tr, tr.t);

    if (tr.stop.onProgress) {
      const e = tr.stop.linear ? tr.t : easeInOutCubic(tr.t);
      const c = tr.stop.onProgress(e, tr.elapsed);
      this.onCaption({
        ...c,
        index: this.idx,
        total: this.stops.length,
        travelling: true,
      });
    }

    if (tr.t >= 1) {
      this.transition = null;
      this.arrive(tr.stop);
    }
  }

  private applyTransition(tr: Transition, t: number): void {
    const e = tr.stop.linear ? t : easeInOutCubic(t);
    const pos = tr.curve.getPoint(e);
    this.camera.position.copy(pos);
    if (tr.stop.lookAtFn) {
      this.camera.quaternion.copy(quatLookingAt(pos, tr.stop.lookAtFn(pos)));
    } else {
      this.camera.quaternion.slerpQuaternions(tr.fromQuat, tr.toQuat, e);
    }
  }

  private arrive(stop: TourStop): void {
    this.onCaption({
      title: stop.title,
      sub: stop.sub,
      chips: stop.chips,
      index: this.idx,
      total: this.stops.length,
    });
    this.onArrive(stop);
  }
}

function quatLookingAt(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
  const m = new THREE.Matrix4().lookAt(from, to, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

const FLYUP_SECONDS = 30;

export function buildTourStops(cfg: UserConfig, lineup: LineupHandles): TourStop[] {
  const stops: TourStop[] = [];
  const posOf = (id: string) => lineup.positions.get(id)!;
  const hOf = (id: string) => lineup.heights.get(id) ?? 0.01;

  const annualIncome = cfg.netMonthlyIncome * 12;
  const fire = fireTarget(cfg);
  const life = lifetimeEarnings(cfg);
  const wealth = cfg.totalWealth;

  // A close look at one item on the line, camera low, slightly to the right.
  const itemStop = (
    id: string,
    title: string,
    sub: string,
    opts: { up?: number; back?: number; duration?: number; chips?: Chip[] } = {}
  ): TourStop => {
    const p = posOf(id);
    const h = hOf(id);
    const up = opts.up ?? Math.max(h * 0.9, 0.32);
    const back = opts.back ?? Math.max(h * 1.6, 0.8);
    return {
      id,
      pos: p.clone().add(new THREE.Vector3(0.18, up, back)),
      look: p.clone().add(new THREE.Vector3(0, Math.min(h * 0.6, h), 0)),
      title,
      sub,
      chips: opts.chips,
      duration: opts.duration ?? 2.5,
    };
  };

  // 1 — the whole line at once: the comparison IS the app.
  stops.push({
    id: 'overview',
    pos: new THREE.Vector3(3.8, 1.4, 8.5),
    look: new THREE.Vector3(4.1, 0.7, 0),
    title: 'Everything on one line.',
    sub: 'Coffee to a billion euros — every amount is a stack of €100 notes on the same baseline, at true physical scale: €1M = 1 m. Drag to look around at any stop; Space to continue.',
    duration: 4,
  });

  stops.push(
    itemStop('coffee', `A coffee: ${formatEUR(COFFEE_PRICE)}.`, 'Two €2 coins on the ground. This is where the line starts.', {
      up: 0.28,
      back: 0.6,
      duration: 3.5,
      chips: [
        { label: 'your monthly income', value: `${fmtCount(cfg.netMonthlyIncome / COFFEE_PRICE)} coffees` },
        { label: 'your annual spending', value: `${fmtCount(cfg.annualSpending / COFFEE_PRICE)} coffees` },
        { label: 'your wealth', value: `${fmtCount(wealth / COFFEE_PRICE)} coffees` },
      ],
    })
  );
  stops.push(
    itemStop(
      'rent',
      `A month of rent: ${formatEUR(EXAMPLE_RENT)} (example).`,
      `${EXAMPLE_RENT / 100} notes — ${formatHeight(heightFor(EXAMPLE_RENT))}. Every note from here on is real: count them.`,
      {
        up: 0.25,
        back: 0.55,
        duration: 2,
        chips: [
          { label: 'of your monthly income', value: ratio(EXAMPLE_RENT, cfg.netMonthlyIncome) },
          { label: 'a year of rent', value: formatEUR(EXAMPLE_RENT * 12) },
          { label: 'your wealth covers', value: `${fmtCount(wealth / EXAMPLE_RENT)} months` },
        ],
      }
    )
  );
  stops.push(
    itemStop(
      'income',
      `Your net monthly income: ${formatEUR(cfg.netMonthlyIncome)}.`,
      `${formatHeight(heightFor(cfg.netMonthlyIncome))} — a month of your life, thinner than a finger.`,
      {
        up: 0.25,
        back: 0.55,
        duration: 2,
        chips: [
          { label: 'savings rate', value: `${fmtCount(savingsRate(cfg) * 100)} %` },
          { label: 'a year of income', value: `${formatEUR(annualIncome)} · ${formatHeight(heightFor(annualIncome))}` },
          { label: 'to earn €1M', value: yearsOf(1_000_000, annualIncome) },
        ],
      }
    )
  );
  stops.push(
    itemStop(
      'spending',
      `Your annual spending: ${formatEUR(cfg.annualSpending)}.`,
      `Everything you spend in a year: ${formatHeight(heightFor(cfg.annualSpending))} of notes.`,
      {
        up: 0.3,
        back: 0.7,
        duration: 2,
        chips: [
          { label: 'per day', value: formatEUR(cfg.annualSpending / 365) },
          { label: 'of your income', value: ratio(cfg.annualSpending, annualIncome) },
          { label: 'your runway', value: `${fmtCount(runwayMonths(cfg))} months` },
        ],
      }
    )
  );

  stops.push(
    itemStop(
      'car',
      `A new car: ~${formatEUR(CAR_PRICE)}.`,
      `${formatHeight(heightFor(CAR_PRICE))} of notes — a machine you could sit in, three fingers of paper.`,
      {
        duration: 2.5,
        chips: [
          { label: 'your wealth in cars', value: ratio(wealth, CAR_PRICE) },
          { label: 'in months of your income', value: `${fmtCount(CAR_PRICE / Math.max(cfg.netMonthlyIncome, 1))} months` },
          { label: 'of your FIRE target', value: ratio(CAR_PRICE, fire) },
        ],
      }
    )
  );

  {
    const h = hOf('you');
    const rank = percentileRank(cfg.country, cfg.age, cfg.totalWealth);
    stops.push(
      itemStop(
        'you',
        `Your wealth: ${formatEUR(cfg.totalWealth)}.`,
        `${formatHeight(h)} of notes — top ${100 - rank}% of your age group in ${countryLabel(
          cfg.country
        )}. The figure is you, 1.75 m.`,
        {
          up: Math.max(h * 0.8, 0.9),
          back: Math.max(h * 1.6, 1.8),
          duration: 3,
          chips: [
            { label: 'runway at your spending', value: `${fmtCount(runwayMonths(cfg))} months` },
            { label: 'in years of your income', value: yearsOf(wealth, annualIncome) },
            { label: 'FIRE progress', value: ratio(wealth, fire), progress: wealth / fire },
            { label: 'your age group', value: `top ${100 - rank} %` },
          ],
        }
      )
    );
  }

  if (cfg.spendingTargets.length > 0) {
    const first = cfg.spendingTargets[0];
    const p = posOf('you');
    stops.push({
      id: 'slices',
      pos: p.clone().add(new THREE.Vector3(0.5, 0.4, 1.3)),
      look: p.clone().add(new THREE.Vector3(0, 0.1, 0)),
      title: `The ${first.label.toLowerCase()}: ${formatEUR(first.amount)}.`,
      sub: `The glowing slices are your spending targets — ${first.label.toLowerCase()} is ${formatHeight(
        heightFor(first.amount)
      )} of your stack.`,
      chips: (() => {
        const sum = cfg.spendingTargets.reduce((a, t) => a + t.amount, 0);
        return [
          { label: 'all targets together', value: formatEUR(sum) },
          { label: 'of your wealth', value: ratio(sum, wealth) },
          { label: 'of your liquid wealth', value: ratio(sum, wealth * cfg.liquidShare) },
        ];
      })(),
      duration: 2.5,
    });
  }

  // The trajectory: your next decades, one step per year.
  {
    const f = posOf('future');
    const fa = fireAge(cfg);
    stops.push({
      id: 'future',
      pos: f.clone().add(new THREE.Vector3(0.8, 1.5, 4.6)),
      look: f.clone().add(new THREE.Vector3(0, 0.35, 0)),
      title: `Your next ${PROJECTION_END_AGE - cfg.age} years.`,
      sub: `One step per year: your savings compounding at 4% real returns. ${
        fa != null
          ? `The staircase pierces the gold FIRE plane at age ${fa} — ${fa - cfg.age} years from now.`
          : `At this rate, the gold FIRE plane stays above every step until ${PROJECTION_END_AGE}.`
      }`,
      chips: (() => {
        const points = projectWealth(cfg);
        const last = points[points.length - 1];
        const contributions = Math.max(annualIncome - cfg.annualSpending, 0) * (last.age - cfg.age);
        const growth = last.value - wealth - contributions;
        const out: Chip[] = [
          { label: 'FIRE', value: fa != null ? `age ${fa}` : `beyond ${PROJECTION_END_AGE}` },
          { label: `at ${PROJECTION_END_AGE}`, value: formatEUR(last.value) },
          { label: 'you save', value: formatEUR(contributions) },
        ];
        if (growth > 0) out.push({ label: 'markets add', value: formatEUR(growth) });
        return out;
      })(),
      duration: 3.5,
    });
  }

  // The landscape: the whole distribution at once.
  {
    const f = posOf('field');
    const rank = percentileRank(cfg.country, cfg.age, cfg.totalWealth);
    stops.push({
      id: 'landscape',
      pos: new THREE.Vector3(f.x, 4.2, 0.6),
      look: f.clone().add(new THREE.Vector3(0, 0.1, 0)),
      title: `Everyone in ${countryLabel(cfg.country)}, at once.`,
      sub: `Percentiles 5–99 of household net wealth, one stack each, across six age groups. Flat plain, then a cliff. The gold beam is you — top ${
        100 - rank
      }% of your age group. Approximate survey data.`,
      chips: (() => {
        const b = bracketFor(cfg.country, cfg.age);
        return [
          { label: 'your group’s median', value: formatEUR(b.p50) },
          { label: 'you vs. that median', value: ratio(wealth, b.p50) },
          { label: 'top 1 % vs. median', value: ratio(b.p99, b.p50) },
        ];
      })(),
      duration: 4,
    });
  }

  stops.push(
    itemStop(
      'house',
      `A home: ~${formatEUR(HOUSE_PRICE)}.`,
      `An entire house — walls, roof, everything — is ${formatHeight(
        heightFor(HOUSE_PRICE)
      )} of notes. Knee height.`,
      {
        duration: 3,
        chips: [
          { label: 'in years of your income', value: yearsOf(HOUSE_PRICE, annualIncome) },
          { label: 'of your FIRE target', value: ratio(HOUSE_PRICE, fire) },
          { label: 'your projection reaches it', value: reachLabel(cfg, HOUSE_PRICE) },
        ],
      }
    )
  );

  {
    const h = hOf('fire');
    stops.push(
      itemStop(
        'fire',
        `Your FIRE target: ${formatEUR(fireTarget(cfg))}.`,
        cfg.fireTargetOverride == null
          ? `25× your annual spending — ${formatHeight(h)}. Look left: that is the gap between you and never working again.`
          : `Your custom target — ${formatHeight(h)}.`,
        {
          duration: 2.5,
          chips: [
            { label: 'covers', value: `${yearsOf(fire, cfg.annualSpending)} of spending` },
            { label: 'gap from today', value: formatEUR(Math.max(fire - wealth, 0)) },
            { label: 'progress', value: ratio(wealth, fire), progress: wealth / fire },
          ],
        }
      )
    );
  }

  stops.push(
    itemStop('million', '€1,000,000 — exactly one metre.', 'Ten thousand notes. Chest height. Remember it: it is the unit for what comes next.', {
      duration: 2.5,
      chips: [
        { label: 'vs. your wealth', value: ratio(1_000_000, wealth) },
        { label: 'in years of your spending', value: yearsOf(1_000_000, cfg.annualSpending) },
        { label: 'your projection reaches it', value: reachLabel(cfg, 1_000_000) },
      ],
    })
  );

  {
    const h = hOf('lifetime');
    stops.push(
      itemStop(
        'lifetime',
        `Everything you will ever earn: ~${formatEUR(lifetimeEarnings(cfg))}.`,
        `${WORK_YEARS} years of your net income — ${formatHeight(h)}. Your entire working life, next to the million line.`,
        {
          duration: 2.5,
          chips: [
            { label: 'vs. your FIRE target', value: ratio(life, fire) },
            { label: 'per working hour*', value: `≈ ${formatEUR(annualIncome / 1720)}` },
            { label: 'of €1 billion', value: ratio(life, 1_000_000_000) },
          ],
        }
      )
    );
  }

  // Pull back — the line again, now that every stack means something.
  stops.push({
    id: 'compare',
    pos: new THREE.Vector3(4.4, 1.8, 10.5),
    look: new THREE.Vector3(4.8, 1.0, 0),
    title: 'The same line, one more time.',
    sub: 'Coffee, your year, your wealth, your peers, €1M — and the thing on the right that does not stop.',
    duration: 4,
  });

  {
    const p = posOf('billion');
    stops.push({
      id: 'billion-base',
      pos: p.clone().add(new THREE.Vector3(-4, 1.8, 14)),
      look: p.clone().add(new THREE.Vector3(0, 10, 0)),
      title: '€1,000,000,000.',
      sub: 'Same 15 cm footprint as your stack — one thousand metres tall. The top is above the clouds. Look up, then we fly.',
      chips: [
        { label: 'of your lifetimes', value: `${fmtCount(1_000_000_000 / Math.max(life, 1))}×` },
        { label: 'homes', value: fmtCount(1_000_000_000 / HOUSE_PRICE) },
        { label: 'years of your spending', value: fmtCount(1_000_000_000 / Math.max(cfg.annualSpending, 1)) },
      ],
      duration: 4,
    });
  }

  {
    const p = posOf('billion');
    const h = hOf('billion');
    const offset = new THREE.Vector3(4.5, 0, 8);
    const speed = h / FLYUP_SECONDS;
    stops.push({
      id: 'flyup',
      pos: p.clone().add(offset).add(new THREE.Vector3(0, h + 2, 0)),
      look: p.clone().add(new THREE.Vector3(0, h, 0)),
      duration: FLYUP_SECONDS,
      linear: true,
      lookAtFn: (cam) => new THREE.Vector3(p.x, Math.min(cam.y, h), p.z),
      onProgress: (t, elapsed) => {
        const alt = Math.min(t * h, h);
        const euros = Math.min(Math.round((alt / h) * 1_000_000_000), 1_000_000_000);
        const passed = FLYUP_MILESTONES.filter((m) => alt >= m.height).pop();
        return {
          title: formatEUR(Math.round(euros / 1_000_000) * 1_000_000),
          sub: `altitude ${alt.toFixed(0)} m · ${elapsed.toFixed(0)} s at ${speed.toFixed(0)} m/s${
            passed ? ` · above ${passed.label}` : ''
          } — Space to skip`,
        };
      },
      title: `That climb took ${FLYUP_SECONDS} seconds at ${Math.round(speed)} m/s.`,
      sub: 'A wingsuit dive, straight up, for half a minute — one billion euros at the same scale as your coffee.',
      chips: [
        { label: 'you passed', value: 'Big Ben · Eiffel · Burj Khalifa' },
        { label: 'of your lifetimes', value: `${fmtCount(1_000_000_000 / Math.max(life, 1))}×` },
        { label: 'your stack on this tower', value: ratio(wealth, 1_000_000_000) },
      ],
    });
  }

  {
    const p = posOf('billion');
    const h = hOf('billion');
    const proj = posOf('projection');
    stops.push({
      id: 'ultra',
      pos: p.clone().add(new THREE.Vector3(-6, h + 25, 30)),
      look: proj.clone().add(new THREE.Vector3(0, 1200, 0)),
      title: 'The largest private fortunes: roughly €200,000,000,000.',
      sub: 'That beam stands where the stack would: 200 km tall — 200 of the towers you just climbed. It cannot be drawn here; it does not fit in this world.',
      chips: [
        { label: 'vs. the tower you climbed', value: '200×' },
        { label: 'of your lifetimes', value: `${fmtCount(200_000_000_000 / Math.max(life, 1))}×` },
        { label: 'homes', value: fmtCount(200_000_000_000 / HOUSE_PRICE) },
      ],
      duration: 6,
    });
  }

  stops.push({
    id: 'release',
    pos: new THREE.Vector3(9, 40, 30),
    look: new THREE.Vector3(4.0, 1, 0),
    title: 'Now it is yours.',
    sub: 'Free flight is on: WASD to move, E/Q up & down, Shift to boost, mouse wheel for speed — click the scene to capture the mouse.',
    duration: 5,
  });

  return stops;
}
