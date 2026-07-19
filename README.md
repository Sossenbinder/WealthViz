# WealthViz — money at human scale

A 3D experience that makes money magnitudes *viscerally* graspable. Every amount is a stack of
€100 notes at true physical scale: one note is 0.1 mm thin, so **€1,000,000 is exactly 1 metre**
— and the human figure standing beside the towers is 1.75 m. One honest, linear scale from your
morning coffee to a billionaire's fortune.

Built from `specs/outlines/wealth-scale-3d-experience.md`.

## What's inside

A premium dark scene — night sky, gold accents, subtle bloom, screen-space HTML labels — built
around three data structures:

- **The line** — every personal amount on one baseline ribbon at one scale: coffee, rent, income,
  annual spending, a car (~€30k), your wealth, a home (~€420k), FIRE target, €1M (the gold
  reference line runs through the whole scene), lifetime earnings, and €1B (1 km tall, with
  Big Ben / Eiffel / Burj Khalifa rungs on the climb). €200B is a light beam — it does not fit.
- **The wealth landscape** — percentiles 5–99 × six age brackets of the selected country as an
  instanced field of ~290 stacks: the inequality cliff in physical form, with a gold beacon
  standing at *your* percentile.
- **The trajectory staircase** — one stack per year until 67 (savings + 4% real returns), with a
  translucent gold FIRE plane; the step that pierces it is the age you could stop working.
- **Guided tour** with free orbit at every stop (drag to look around, Space to continue), ending
  in a timed 30-second fly-up of the €1B stack and release into free flight (WASD).
- **Config panel** — income, wealth, liquid split, spending, age, country, spending targets;
  persisted to localStorage; the whole scene rebuilds live.

## Data honesty

Peer percentiles live in `src/lib/data/percentiles.json`. Median values are anchored to published
results (Fed SCF 2022, Bundesbank PHF 2021, ECB HFCS 2021); the other percentiles are approximate
interpolations and are labelled as such in the UI ("Data sources" button).

## Development

```sh
npm install
npm run dev      # dev server
npm run build    # production build → dist/
npm run check    # svelte-check + tsc
```

Stack: Vite · Svelte 5 · TypeScript · three.js (plain, no wrapper — the scene is driven
imperatively from `src/lib/scene/`, Svelte owns the UI overlay).
