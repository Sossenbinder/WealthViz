import * as THREE from 'three';

/** €100 bill footprint at true physical scale (meters). */
export const BILL = {
  length: 0.147,
  width: 0.082,
  thickness: 0.0001,
  value: 100,
};

export const HUMAN_HEIGHT = 1.75;

export const COFFEE_PRICE = 4;
export const EXAMPLE_RENT = 1200;
export const CAR_PRICE = 30_000; // average new car, example
export const HOUSE_PRICE = 420_000; // average home, example

/** Real-world heights that become rungs on the €1B climb (1 m = €1M). */
export const FLYUP_MILESTONES = [
  { label: 'Big Ben', height: 96 },
  { label: 'Eiffel Tower', height: 330 },
  { label: 'Burj Khalifa', height: 828 },
];

/**
 * Magnitude ladder: reference lines that turn the empty sky into a labeled
 * axis. Heights are € millions at the 1 m = €1M scale; anchors marked * are
 * order-of-magnitude examples, not statistics.
 */
export const MAGNITUDE_LADDER = [
  { height: 5, note: 'a year of a DAX CEO*' },
  { height: 20, note: 'a private jet*' },
  { height: 50, note: 'a star football transfer*' },
  { height: 135, note: 'most expensive car ever auctioned' },
  { height: 200, note: 'a Hollywood blockbuster*' },
  { height: 500, note: 'the largest superyachts*' },
];

export const COLORS = {
  sky: 0x04060a,
  horizon: 0x16202c,
  ground: 0x0d1117,
  fogColor: 0x0e131a,
  bill: 0x9db8a2,
  billEdgeLight: '#b9c8b6',
  billEdgeDark: '#8ba18c',
  human: 0x849098,
  accentYou: 0xe8b84b,
  accentSlice: 0xe8b84b,
  peer: 0x3f4a54,
  peerUserRow: 0x9aa896,
  stairs: 0x45606c,
  ribbon: 0x232b36,
  gridMajor: 0x27303c,
  gridMinor: 0x1a212b,
};

/**
 * Everything lives on ONE line (z = 0) so every amount shares a baseline and a
 * frame — the whole point is side-by-side comparison at a single scale.
 */
export const LINEUP_X = {
  coffee: 0,
  rent: 0.55,
  income: 1.1,
  spending: 1.7,
  car: 2.45,
  you: 3.25,
  human: 2.7,
  house: 4.05,
  fire: 4.85,
  million: 5.65,
  lifetime: 6.5,
  billion: 14,
  projection: 46,
};

export const LINEUP_CENTER = new THREE.Vector3(3.5, 0, 0);
