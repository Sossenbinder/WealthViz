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
  groceries: 0.5,
  rent: 1.0,
  income: 1.5,
  rentYear: 2.0,
  wedding: 2.5,
  spending: 3.0,
  car: 3.55,
  salary: 4.1,
  child: 4.65,
  human: 4.75,
  you: 5.3,
  house: 6.1,
  fire: 6.9,
  million: 7.7,
  lifetime: 8.5,
  turbine: 9.6,
  school: 10.7,
  ice: 11.8,
  airbus: 13.2,
  fighter: 14.6,
  billion: 18,
  projection: 50,
};

export const LINEUP_CENTER = new THREE.Vector3(5.0, 0, 0);

/**
 * A euro-pallet block of €100 notes: 1.2 × 0.8 m footprint, 1 m high.
 * (1.2·0.8)/(0.147·0.082) ≈ 80 metre-stacks → ≈ €80M per pallet.
 */
export const PALLET = { w: 1.2, d: 0.8, h: 1.0, value: 80_000_000 };
