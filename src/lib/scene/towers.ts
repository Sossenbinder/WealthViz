import * as THREE from 'three';
import {
  bracketCurve,
  bracketFor,
  dataset,
  fireAge,
  fireTarget,
  formatEUR,
  formatHeight,
  heightFor,
  lifetimeEarnings,
  percentileRank,
  projectWealth,
  rankInBracket,
  WORK_YEARS,
  type UserConfig,
} from '../data/model';
import {
  BILL,
  CAR_PRICE,
  COFFEE_PRICE,
  COLORS,
  EXAMPLE_RENT,
  FLYUP_MILESTONES,
  HOUSE_PRICE,
  HUMAN_HEIGHT,
  LINEUP_X,
} from './constants';
import { EDGE_TEXTURE_METERS, makeBeamTexture, makeEdgeTexture, makeBillTopTexture } from './textures';
import { makeTag } from './labels';
import { fmtCount, ratio, reachLabel, relationRows, runwayMonths, yearsOf } from '../data/context';
import type { HoverHit, Pickable } from './hover';

export interface LineupHandles {
  group: THREE.Group;
  /** world position of each item's base, keyed by id */
  positions: Map<string, THREE.Vector3>;
  /** stack heights in meters, keyed by id */
  heights: Map<string, number>;
  /** hover-inspectable objects */
  pickables: Pickable[];
}

interface SharedTex {
  edge: THREE.CanvasTexture;
  top: THREE.CanvasTexture;
}

let shared: SharedTex | null = null;

function tex(): SharedTex {
  if (!shared) shared = { edge: makeEdgeTexture(), top: makeBillTopTexture() };
  return shared;
}

/** Below this many bills a stack is rendered as individual instanced notes. */
const MAX_INSTANCED_BILLS = 4000;

/** Baseline ribbon thickness — items stand on top of it. */
const RIBBON_H = 0.015;

/** A stack of n €100 notes: individual bills when countable, textured block above. */
function makeStack(amount: number): THREE.Object3D {
  const { edge, top } = tex();
  const n = Math.max(1, Math.round(amount / BILL.value));

  if (n > MAX_INSTANCED_BILLS) {
    const h = n * BILL.thickness;
    const edgeTex = edge.clone();
    edgeTex.needsUpdate = true;
    edgeTex.repeat.set(1, h / EDGE_TEXTURE_METERS);
    const side = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(BILL.length, h, BILL.width), [
      side,
      side,
      topMat,
      side,
      side,
      side,
    ]);
    mesh.position.y = h / 2;
    return mesh;
  }

  const geo = new THREE.BoxGeometry(BILL.length, BILL.thickness, BILL.width);
  const mat = new THREE.MeshStandardMaterial({ map: top, roughness: 0.75 });
  const inst = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    q.setFromAxisAngle(up, (Math.random() - 0.5) * 0.07);
    m.compose(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (i + 0.5) * BILL.thickness,
        (Math.random() - 0.5) * 0.003
      ),
      q,
      new THREE.Vector3(1, 1, 1)
    );
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

function makeCoins(count: number): THREE.Group {
  const g = new THREE.Group();
  const r = 0.0129; // €2 coin: 25.75 mm diameter
  const t = 0.0022;
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.7, roughness: 0.35 });
  for (let i = 0; i < count; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 28), mat);
    coin.position.set((Math.random() - 0.5) * 0.002, (i + 0.5) * t, (Math.random() - 0.5) * 0.002);
    g.add(coin);
  }
  return g;
}

/** Minimal architectural pictogram — a scale figure, not a character. */
export function makeHuman(withLabel = true): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.human, roughness: 0.6, metalness: 0.1 });
  const bodyH = 1.42;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, bodyH, 20), mat);
  body.position.y = 0.06 + bodyH / 2;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), mat);
  head.position.y = HUMAN_HEIGHT - 0.115;
  g.add(head);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24), mat);
  base.position.y = 0.01;
  g.add(base);
  if (withLabel) {
    const label = makeTag([`1.75 m`], { variant: 'micro' });
    label.position.set(0, HUMAN_HEIGHT + 0.12, 0);
    g.add(label);
  }
  return g;
}

interface ItemSpec {
  id: string;
  title: string;
  sub?: string;
  amount: number;
  x: number;
  gold?: boolean;
  coins?: boolean;
}

function addSlices(parent: THREE.Group, x: number, cfg: UserConfig, pickables: Pickable[]): void {
  let offset = 0;
  cfg.spendingTargets.forEach((target, i) => {
    const sliceH = Math.max(heightFor(target.amount), 0.0008);
    const slice = new THREE.Mesh(
      new THREE.BoxGeometry(BILL.length * 1.1, sliceH, BILL.width * 1.1),
      new THREE.MeshStandardMaterial({
        color: COLORS.accentSlice,
        emissive: COLORS.accentSlice,
        emissiveIntensity: 1.4,
        toneMapped: false,
      })
    );
    const y = RIBBON_H + offset + sliceH / 2;
    slice.position.set(x, y, 0);
    parent.add(slice);

    pickables.push({
      object: slice,
      resolve: () => ({
        info: {
          title: target.label,
          meta: `${formatEUR(target.amount)} · ${formatHeight(sliceH)} · ${fmtCount(target.amount / 100)} notes`,
          gold: true,
          rows: [
            { label: 'of your wealth', value: ratio(target.amount, cfg.totalWealth) },
            {
              label: 'in months of your income',
              value: `${(target.amount / Math.max(cfg.netMonthlyIncome, 1)).toLocaleString('de-DE', {
                maximumFractionDigits: 1,
              })} months`,
            },
            { label: 'in years of your spending', value: yearsOf(target.amount, cfg.annualSpending) },
          ],
        },
        center: new THREE.Vector3(x, y, 0),
        size: new THREE.Vector3(BILL.length * 1.1, sliceH, BILL.width * 1.1),
      }),
    });

    const labelPos = new THREE.Vector3(x + 0.42 + i * 0.3, y + 0.06 + i * 0.16, 0.5);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, BILL.width * 0.55),
        labelPos,
      ]),
      new THREE.LineBasicMaterial({ color: COLORS.accentSlice, transparent: true, opacity: 0.6 })
    );
    parent.add(line);

    const label = makeTag([target.label, `${formatEUR(target.amount)} · ${formatHeight(sliceH)}`], {
      variant: 'gold',
    });
    label.position.copy(labelPos);
    parent.add(label);

    offset += sliceH;
  });
}

function itemInfo(spec: ItemSpec, h: number, cfg: UserConfig) {
  const meta = `${formatEUR(spec.amount)} · ${formatHeight(h)} · ${
    spec.coins ? 'two €2 coins' : `${fmtCount(spec.amount / BILL.value)} notes`
  }`;
  if (spec.id === 'you') {
    return {
      title: 'Your wealth',
      meta,
      gold: true,
      rows: [
        {
          label: 'your age group',
          value: `top ${100 - percentileRank(cfg.country, cfg.age, cfg.totalWealth)} %`,
        },
        { label: 'runway at your spending', value: `${fmtCount(runwayMonths(cfg))} months` },
        { label: 'of your FIRE target', value: ratio(cfg.totalWealth, fireTarget(cfg)) },
        {
          label: 'liquid · invested',
          value: `${Math.round(cfg.liquidShare * 100)} % · ${Math.round((1 - cfg.liquidShare) * 100)} %`,
        },
      ],
    };
  }
  return { title: spec.title, meta, gold: spec.gold, rows: relationRows(cfg, spec.amount) };
}

export function buildLineup(cfg: UserConfig): LineupHandles {
  const group = new THREE.Group();
  const positions = new Map<string, THREE.Vector3>();
  const heights = new Map<string, number>();
  const pickables: Pickable[] = [];

  const monthly = Math.max(cfg.netMonthlyIncome, 100);
  const annual = Math.max(cfg.annualSpending, 100);

  const items: ItemSpec[] = [
    { id: 'coffee', title: 'Coffee', sub: 'two €2 coins', amount: COFFEE_PRICE, x: LINEUP_X.coffee, coins: true },
    { id: 'rent', title: 'Rent, one month*', amount: EXAMPLE_RENT, x: LINEUP_X.rent },
    { id: 'income', title: 'Monthly income', amount: monthly, x: LINEUP_X.income },
    { id: 'spending', title: 'Annual spending', amount: annual, x: LINEUP_X.spending },
    { id: 'car', title: 'A new car*', amount: CAR_PRICE, x: LINEUP_X.car },
    {
      id: 'you',
      title: 'Your wealth',
      sub: `top ${100 - percentileRank(cfg.country, cfg.age, cfg.totalWealth)}% of your age group`,
      amount: cfg.totalWealth,
      x: LINEUP_X.you,
      gold: true,
    },
    { id: 'house', title: 'A home*', amount: HOUSE_PRICE, x: LINEUP_X.house },
    {
      id: 'fire',
      title: 'FIRE target',
      sub: cfg.fireTargetOverride == null ? '25× annual spending' : 'custom target',
      amount: fireTarget(cfg),
      x: LINEUP_X.fire,
      gold: true,
    },
    { id: 'million', title: '€1 million', sub: 'exactly 1 metre', amount: 1_000_000, x: LINEUP_X.million },
    {
      id: 'lifetime',
      title: 'Lifetime earnings',
      sub: `${WORK_YEARS} years of net income`,
      amount: lifetimeEarnings(cfg),
      x: LINEUP_X.lifetime,
    },
    { id: 'billion', title: '€1 billion', sub: '1 km of notes', amount: 1_000_000_000, x: LINEUP_X.billion },
  ];

  items.forEach((spec, i) => {
    const h = Math.max(heightFor(spec.amount), BILL.thickness);
    const obj = spec.coins ? makeCoins(Math.round(spec.amount / 2)) : makeStack(spec.amount);
    obj.position.x += spec.x;
    obj.position.y += RIBBON_H; // stand ON the baseline ribbon, not inside it
    group.add(obj);

    const label = makeTag(
      [spec.title, `${formatEUR(spec.amount)} · ${formatHeight(h)}`, ...(spec.sub ? [spec.sub] : [])],
      { variant: spec.gold ? 'gold' : 'item', raised: i % 2 === 1 }
    );
    label.position.set(spec.x, RIBBON_H + h + 0.02, 0);
    group.add(label);

    positions.set(spec.id, new THREE.Vector3(spec.x, 0, 0));
    heights.set(spec.id, h);

    pickables.push({
      object: obj,
      resolve: (): HoverHit => ({
        info: itemInfo(spec, h, cfg),
        center: new THREE.Vector3(spec.x, RIBBON_H + h / 2, 0),
        size: spec.coins
          ? new THREE.Vector3(0.05, Math.max(h, 0.005), 0.05)
          : new THREE.Vector3(BILL.length, h, BILL.width),
      }),
    });
  });

  addSlices(group, LINEUP_X.you, cfg, pickables);

  // One continuous baseline ribbon under everything: one line, one scale.
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(LINEUP_X.billion - LINEUP_X.coffee + 1.6, RIBBON_H, 0.75),
    new THREE.MeshStandardMaterial({ color: COLORS.ribbon, roughness: 0.9 })
  );
  ribbon.position.set((LINEUP_X.coffee + LINEUP_X.billion) / 2, RIBBON_H / 2, 0);
  group.add(ribbon);

  // €200B ultra-wealth: a projection beam on the same line — it does not fit in the sky.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 4000, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xbdd4f5,
      map: makeBeamTexture(),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
  );
  beam.position.set(LINEUP_X.projection, 2000, 0);
  group.add(beam);
  const beamBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.05, 32),
    new THREE.MeshStandardMaterial({
      color: 0xbdd4f5,
      emissive: 0xbdd4f5,
      emissiveIntensity: 0.9,
      toneMapped: false,
    })
  );
  beamBase.position.set(LINEUP_X.projection, 0, 0);
  group.add(beamBase);
  positions.set('projection', new THREE.Vector3(LINEUP_X.projection, 0, 0));

  // ——— Chart wall: faint money-lines behind the lineup; the gold one is €1M ———
  {
    const wallZ = -1.35;
    const x0 = -0.5;
    const x1 = LINEUP_X.lifetime + 1.2;
    const lines: { y: number; gold?: boolean }[] = [
      { y: 0.25 },
      { y: 0.5 },
      { y: 0.75 },
      { y: 1.0, gold: true },
      { y: 1.5 },
      { y: 2.0 },
    ];
    for (const l of lines) {
      const mat = new THREE.LineBasicMaterial({
        color: l.gold ? COLORS.accentYou : 0x3a4552,
        transparent: true,
        opacity: l.gold ? 0.9 : 0.5,
      });
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, l.y, wallZ),
        new THREE.Vector3(x1, l.y, wallZ),
      ]);
      group.add(new THREE.Line(geo, mat));
      const tag = makeTag([formatEUR(l.y * 1_000_000)], { variant: l.gold ? 'gold' : 'axis' });
      tag.position.set(x1 + 0.3, l.y, wallZ);
      group.add(tag);
    }
  }

  // ——— Milestone rungs on the €1B climb ———
  for (const m of FLYUP_MILESTONES) {
    const rung = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.04, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.8 })
    );
    rung.position.set(LINEUP_X.billion, m.height, 0);
    group.add(rung);
    const tag = makeTag([`${m.label} · ${m.height} m`, formatEUR(m.height * 1_000_000)], {
      variant: 'axis',
    });
    tag.position.set(LINEUP_X.billion + 0.8, m.height + 0.5, 0.6);
    group.add(tag);
  }

  const human = makeHuman();
  human.position.set(LINEUP_X.human + 0.3, 0, -0.6);
  group.add(human);

  buildField(cfg, group, positions, pickables);
  buildStaircase(cfg, group, positions, pickables);

  return { group, positions, heights, pickables };
}

/**
 * The wealth landscape: percentiles 5–99 (every 2nd) × all age brackets of the
 * selected country as an instanced field of stacks — the shape of the whole
 * distribution, with a gold beacon standing where the user is.
 */
const FIELD_X0 = -0.3;
const FIELD_DX = 0.24;
const FIELD_Z0 = -3.2;
const FIELD_DZ = -1.05;

function buildField(
  cfg: UserConfig,
  group: THREE.Group,
  positions: Map<string, THREE.Vector3>,
  pickables: Pickable[]
): void {
  const brackets = dataset.countries[cfg.country].brackets;
  const step = 2;
  const curves = brackets.map((b) => bracketCurve(b, step));
  const count = curves.length * curves[0].length;

  const geo = new THREE.BoxGeometry(0.16, 1, 0.11);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const inst = new THREE.InstancedMesh(geo, mat, count);

  const userBracket = bracketFor(cfg.country, cfg.age);
  const userRow = brackets.indexOf(userBracket);
  const userQ = percentileRank(cfg.country, cfg.age, cfg.totalWealth);

  const m = new THREE.Matrix4();
  const baseColor = new THREE.Color(COLORS.peerUserRow);
  const dimColor = new THREE.Color(COLORS.peer);
  let i = 0;
  curves.forEach((curve, row) => {
    const z = FIELD_Z0 + row * FIELD_DZ;
    curve.forEach((point, qi) => {
      const h = Math.max(heightFor(point.value), 0.0015);
      m.makeScale(1, h, 1);
      m.setPosition(FIELD_X0 + qi * FIELD_DX, 0, z);
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, row === userRow ? baseColor : dimColor);
      i++;
    });
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  pickables.push({
    object: inst,
    resolve: (hit): HoverHit | null => {
      const id = hit.instanceId;
      if (id == null) return null;
      const cols = curves[0].length;
      const row = Math.floor(id / cols);
      const qi = id % cols;
      const b = brackets[row];
      const point = curves[row][qi];
      const h = Math.max(heightFor(point.value), 0.0015);
      const ages = b.ageMax >= 120 ? `${b.ageMin}+` : `${b.ageMin}–${b.ageMax}`;
      return {
        info: {
          title: `p${point.q} · ages ${ages}`,
          meta: `${formatEUR(point.value)} · ${formatHeight(h)}`,
          rows: [
            { label: 'vs. your wealth', value: ratio(point.value, cfg.totalWealth) },
            { label: 'vs. this group’s median', value: ratio(point.value, b.p50) },
            { label: 'you in this group', value: `top ${100 - rankInBracket(b, cfg.totalWealth)} %` },
          ],
        },
        center: new THREE.Vector3(FIELD_X0 + qi * FIELD_DX, h / 2, FIELD_Z0 + row * FIELD_DZ),
        size: new THREE.Vector3(0.16, h, 0.11),
      };
    },
  });

  // Row labels (age brackets) at the left edge.
  brackets.forEach((b, row) => {
    const text = b.ageMax >= 120 ? `${b.ageMin}+` : `${b.ageMin}–${b.ageMax}`;
    const tag = makeTag([text], { variant: row === userRow ? 'gold' : 'axis' });
    tag.position.set(FIELD_X0 - 0.6, 0.05, FIELD_Z0 + row * FIELD_DZ);
    group.add(tag);
  });

  // Percentile ticks along the front edge.
  for (const q of [25, 50, 75, 90, 99]) {
    const tag = makeTag([`p${q}`], { variant: 'axis' });
    tag.position.set(FIELD_X0 + ((q - 5) / 2) * FIELD_DX, 0.02, FIELD_Z0 + 0.55);
    group.add(tag);
  }

  // The user's beacon: a gold light pillar at (their percentile, their age row).
  const bx = FIELD_X0 + ((userQ - 5) / 2) * FIELD_DX;
  const bz = FIELD_Z0 + userRow * FIELD_DZ;
  const bh = Math.max(heightFor(cfg.totalWealth), 0.02);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, bh + 1.4, 12),
    new THREE.MeshStandardMaterial({
      color: COLORS.accentYou,
      emissive: COLORS.accentYou,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    })
  );
  beacon.position.set(bx, (bh + 1.4) / 2, bz);
  group.add(beacon);
  const beaconTag = makeTag([`You — top ${100 - userQ}%`, 'of your age group'], { variant: 'gold' });
  beaconTag.position.set(bx, bh + 1.5, bz);
  group.add(beaconTag);

  positions.set('field', new THREE.Vector3(FIELD_X0 + 24 * FIELD_DX, 0, FIELD_Z0 + 2.5 * FIELD_DZ));
}

/**
 * The trajectory staircase: one stack per year until 67, compounding at 4%
 * real plus annual savings, running in front of the lineup. A translucent
 * gold plane marks the FIRE target; the step that pierces it is the year.
 */
const STAIR_Z = 1.9;
const STAIR_DX = 0.24;

function buildStaircase(
  cfg: UserConfig,
  group: THREE.Group,
  positions: Map<string, THREE.Vector3>,
  pickables: Pickable[]
): void {
  const points = projectWealth(cfg);
  const x0 = LINEUP_X.you;
  const geo = new THREE.BoxGeometry(0.13, 1, 0.11);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.stairs, roughness: 0.7 });
  const inst = new THREE.InstancedMesh(geo, mat, points.length);
  const m = new THREE.Matrix4();
  points.forEach((p, i) => {
    const h = Math.max(heightFor(p.value), 0.0015);
    m.makeScale(1, h, 1);
    m.setPosition(x0 + i * STAIR_DX, 0, STAIR_Z);
    inst.setMatrixAt(i, m);
  });
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);

  const annualSavings = cfg.netMonthlyIncome * 12 - cfg.annualSpending;
  pickables.push({
    object: inst,
    resolve: (hit): HoverHit | null => {
      const id = hit.instanceId;
      if (id == null) return null;
      const p = points[id];
      const h = Math.max(heightFor(p.value), 0.0015);
      const prev = id > 0 ? points[id - 1].value : null;
      const growth = prev != null ? p.value - prev : 0;
      const rows =
        prev != null && p.value > 0
          ? [
              { label: 'saved that year', value: formatEUR(Math.max(annualSavings, 0)) },
              { label: 'returns that year', value: formatEUR(Math.max(growth - annualSavings, 0)) },
              { label: 'of your FIRE target', value: ratio(p.value, fireTarget(cfg)) },
            ]
          : [
              { label: 'of your FIRE target', value: ratio(p.value, fireTarget(cfg)) },
              { label: 'assumption', value: '4 % real · flat savings' },
            ];
      return {
        info: {
          title: id === 0 ? `Age ${p.age} — today` : `Age ${p.age} · in ${id} yrs`,
          meta: `${formatEUR(p.value)} projected · ${formatHeight(h)}`,
          rows,
        },
        center: new THREE.Vector3(x0 + id * STAIR_DX, h / 2, STAIR_Z),
        size: new THREE.Vector3(0.13, h, 0.11),
      };
    },
  });

  const len = (points.length - 1) * STAIR_DX;
  const target = fireTarget(cfg);
  const fireH = heightFor(target);

  // FIRE plane hovering over the staircase.
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(len + 0.8, 0.9),
    new THREE.MeshBasicMaterial({
      color: COLORS.accentYou,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x0 + len / 2, fireH, STAIR_Z);
  group.add(plane);

  const crossing = fireAge(cfg);
  if (crossing != null) {
    const ci = crossing - cfg.age;
    const cx = x0 + ci * STAIR_DX;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, fireH + 0.9, 10),
      new THREE.MeshStandardMaterial({
        color: COLORS.accentYou,
        emissive: COLORS.accentYou,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      })
    );
    pillar.position.set(cx, (fireH + 0.9) / 2, STAIR_Z);
    group.add(pillar);
    const tag = makeTag([`FIRE at ${crossing}`, `${crossing - cfg.age} years from now`], {
      variant: 'gold',
    });
    tag.position.set(cx, fireH + 0.95, STAIR_Z);
    group.add(tag);
  }

  const startTag = makeTag([`age ${cfg.age}`], { variant: 'axis' });
  startTag.position.set(x0, 0.02, STAIR_Z + 0.3);
  group.add(startTag);
  const last = points[points.length - 1];
  const endTag = makeTag([`age ${last.age}`, formatEUR(last.value)], { variant: 'axis' });
  endTag.position.set(x0 + len, Math.max(heightFor(last.value), 0.02) + 0.05, STAIR_Z);
  group.add(endTag);

  positions.set('future', new THREE.Vector3(x0 + len / 2, 0, STAIR_Z));
}
