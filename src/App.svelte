<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createScene,
    type SceneApi,
    type CaptionState,
    type HoverEvent,
    type Mode,
  } from './lib/scene/scene';
  import { config, persist } from './lib/ui/config.svelte';
  import ConfigPanel from './lib/ui/ConfigPanel.svelte';
  import Caption from './lib/ui/Caption.svelte';
  import Hud from './lib/ui/Hud.svelte';
  import Sources from './lib/ui/Sources.svelte';

  let canvas: HTMLCanvasElement;
  let api: SceneApi | undefined;
  let ready = $state(false);
  let caption = $state<CaptionState | null>(null);
  let mode = $state<Mode>('orbit');
  let hover = $state<HoverEvent | null>(null);
  let winW = $state(1280);
  let winH = $state(800);
  let showConfig = $state(false);
  let showSources = $state(false);
  let showIntro = $state(true);

  onMount(() => {
    api = createScene(canvas, $state.snapshot(config), {
      onCaption: (c) => (caption = c),
      onMode: (m) => (mode = m),
      onTourEnd: () => {},
      onHover: (h) => (hover = h),
    });
    ready = true;
    return () => api?.dispose();
  });

  $effect(() => {
    const snap = $state.snapshot(config);
    persist(snap);
    if (ready) api?.updateConfig(snap);
  });

  function startTour() {
    showIntro = false;
    showConfig = false;
    api?.startTour();
  }
</script>

<svelte:window bind:innerWidth={winW} bind:innerHeight={winH} />

<canvas bind:this={canvas}></canvas>

{#if hover}
  <div
    class="tooltip"
    style="left: {Math.min(hover.x + 18, winW - 272)}px; top: {Math.min(hover.y + 14, winH - 190)}px"
  >
    <div class="tt-title" class:gold={hover.info.gold}>{hover.info.title}</div>
    <div class="tt-meta">{hover.info.meta}</div>
    {#each hover.info.rows as row (row.label)}
      <div class="tt-row"><span>{row.label}</span><b>{row.value}</b></div>
    {/each}
  </div>
{/if}

<Hud
  {mode}
  ontour={startTour}
  onfly={() => {
    showIntro = false;
    api?.setMode('fly');
  }}
  onorbit={() => {
    showIntro = false;
    api?.setMode('orbit');
  }}
  onconfig={() => (showConfig = !showConfig)}
  onsources={() => (showSources = true)}
/>

{#if showIntro}
  <div class="intro">
    <h1>How much is money, really?</h1>
    <p>
      Behind this card, every amount stands on <strong>one line at one scale</strong>: stacks of real
      €100 notes, 0.1&nbsp;mm each, so <strong>€1,000,000 is exactly 1 metre</strong> — coffee, your
      income, your wealth, your peers, and a billion, side by side. Drag to orbit any time, even
      during the tour.
    </p>
    <p class="cta-row">
      <button class="primary" onclick={startTour}>Start the tour</button>
      <button onclick={() => (showConfig = true)}>Enter your numbers first</button>
    </p>
  </div>
{/if}

{#if showConfig}
  <ConfigPanel onclose={() => (showConfig = false)} />
{/if}

{#if caption}
  <Caption {caption} onadvance={() => api?.advance()} />
{/if}

{#if showSources}
  <Sources onclose={() => (showSources = false)} />
{/if}

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
  }
  .tooltip {
    position: fixed;
    z-index: 15;
    width: 254px;
    background: rgba(13, 17, 23, 0.96);
    border: 1px solid rgba(232, 184, 75, 0.3);
    border-radius: 10px;
    padding: 11px 13px;
    font-size: 12px;
    color: #eef2f7;
    pointer-events: none;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.55);
    font-variant-numeric: tabular-nums;
  }
  .tt-title {
    font-weight: 650;
    font-size: 13px;
  }
  .tt-title.gold {
    color: #e8b84b;
  }
  .tt-meta {
    color: rgba(238, 242, 247, 0.45);
    margin-bottom: 7px;
    font-size: 11px;
  }
  .tt-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 3.5px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    color: rgba(238, 242, 247, 0.62);
  }
  .tt-row b {
    color: #eef2f7;
    font-weight: 600;
    white-space: nowrap;
  }
  .intro {
    position: absolute;
    left: 24px;
    bottom: 24px;
    width: min(460px, calc(100vw - 40px));
    background: rgba(13, 17, 23, 0.94);
    color: #eef2f7;
    border-radius: 18px;
    padding: 28px 30px;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.3);
  }
  h1 {
    margin: 0 0 12px;
    font-size: 26px;
  }
  .intro p {
    margin: 0 0 10px;
    font-size: 14.5px;
    line-height: 1.6;
    color: rgba(238, 242, 247, 0.82);
  }
  .cta-row {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  button {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  button.primary {
    background: #e8b84b;
    color: #101418;
    border-color: transparent;
  }
  button:hover {
    filter: brightness(1.08);
  }
</style>
