<script lang="ts">
  import type { Mode } from '../scene/scene';

  let {
    mode,
    ontour,
    onfly,
    onorbit,
    onconfig,
    onsources,
  }: {
    mode: Mode;
    ontour: () => void;
    onfly: () => void;
    onorbit: () => void;
    onconfig: () => void;
    onsources: () => void;
  } = $props();
</script>

<div class="hud">
  <div class="left">
    <span class="brand">WealthViz</span>
    <span class="scale">1 note = 0.1 mm · €1M = 1 m · you = 1.75 m</span>
  </div>
  <div class="right">
    <button class:active={mode === 'tour'} onclick={ontour}>▶ Tour</button>
    <button class:active={mode === 'fly'} onclick={onfly}>Fly</button>
    <button class:active={mode === 'orbit'} onclick={onorbit}>Orbit</button>
    <button onclick={onconfig}>Configure</button>
    <button class="ghost" onclick={onsources}>Data sources</button>
  </div>
</div>

{#if mode === 'fly'}
  <div class="flyhint">WASD move · E/Q up/down · Shift boost · wheel speed · click to capture mouse</div>
{/if}

<style>
  .hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    pointer-events: none;
  }
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
  }
  .brand {
    font-weight: 750;
    font-size: 17px;
    color: #101418;
    background: rgba(255, 255, 255, 0.85);
    padding: 6px 12px;
    border-radius: 10px;
  }
  .scale {
    font-size: 12px;
    color: #101418;
    background: rgba(255, 255, 255, 0.65);
    padding: 5px 10px;
    border-radius: 8px;
  }
  button {
    background: rgba(13, 17, 23, 0.88);
    color: #eef2f7;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 7px 13px;
    font-size: 13px;
    font-weight: 550;
    cursor: pointer;
  }
  button:hover {
    background: rgba(13, 17, 23, 0.94);
  }
  button.active {
    background: #e8b84b;
    color: #101418;
    border-color: transparent;
  }
  .ghost {
    background: rgba(13, 17, 23, 0.55);
  }
  .flyhint {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: #101418;
    background: rgba(255, 255, 255, 0.75);
    padding: 5px 12px;
    border-radius: 8px;
    pointer-events: none;
  }
</style>
