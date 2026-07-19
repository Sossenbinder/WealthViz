<script lang="ts">
  import { config, resetConfig } from './config.svelte';
  import { fireTarget, formatEUR, type CountryCode } from '../data/model';

  let { onclose }: { onclose: () => void } = $props();

  let fireAuto = $state(config.fireTargetOverride == null);

  const countries: { code: CountryCode; label: string }[] = [
    { code: 'DE', label: 'Germany' },
    { code: 'EA', label: 'Euro area' },
    { code: 'US', label: 'United States' },
  ];

  let liquidPercent = $derived(Math.round(config.liquidShare * 100));

  function setLiquid(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    config.liquidShare = Math.min(Math.max(v / 100, 0), 1);
  }

  function toggleFireAuto() {
    fireAuto = !fireAuto;
    config.fireTargetOverride = fireAuto ? null : config.annualSpending * 25;
  }

  let nextId = 0;
  function addTarget() {
    config.spendingTargets.push({ id: `t${Date.now()}-${nextId++}`, label: 'New target', amount: 1000 });
  }
  function removeTarget(id: string) {
    const i = config.spendingTargets.findIndex((t) => t.id === id);
    if (i >= 0) config.spendingTargets.splice(i, 1);
  }
</script>

<aside class="panel">
  <header>
    <h2>Your numbers</h2>
    <button class="ghost" onclick={onclose} aria-label="Close">✕</button>
  </header>

  <label>
    Net monthly income
    <input type="number" min="0" step="100" bind:value={config.netMonthlyIncome} />
  </label>

  <label>
    Total wealth
    <input type="number" min="0" step="1000" bind:value={config.totalWealth} />
  </label>

  <label>
    Liquid share — {liquidPercent}% liquid / {100 - liquidPercent}% invested
    <input type="range" min="0" max="100" value={liquidPercent} oninput={setLiquid} />
  </label>

  <label>
    Annual spending
    <input type="number" min="0" step="500" bind:value={config.annualSpending} />
  </label>

  <div class="row">
    <label>
      Age
      <input type="number" min="16" max="110" bind:value={config.age} />
    </label>
    <label>
      Compare with
      <select bind:value={config.country}>
        {#each countries as c (c.code)}
          <option value={c.code}>{c.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="fire">
    <label class="check">
      <input type="checkbox" checked={fireAuto} onchange={toggleFireAuto} />
      FIRE target: auto (25× spending)
    </label>
    {#if fireAuto}
      <p class="hint">= {formatEUR(fireTarget(config))}</p>
    {:else}
      <input type="number" min="0" step="10000" bind:value={config.fireTargetOverride} />
    {/if}
  </div>

  <h3>Spending targets</h3>
  <p class="hint">Shown as glowing slices on your tower.</p>
  {#each config.spendingTargets as target (target.id)}
    <div class="target">
      <input type="text" bind:value={target.label} />
      <input type="number" min="0" step="100" bind:value={target.amount} />
      <button class="ghost" onclick={() => removeTarget(target.id)} aria-label="Remove">✕</button>
    </div>
  {/each}
  <div class="actions">
    <button onclick={addTarget}>+ Add target</button>
    <button class="ghost" onclick={resetConfig}>Reset all</button>
  </div>
</aside>

<style>
  .panel {
    position: absolute;
    top: 64px;
    right: 16px;
    width: 320px;
    max-height: calc(100vh - 96px);
    overflow-y: auto;
    background: rgba(13, 17, 23, 0.94);
    color: #e8ecf1;
    border-radius: 14px;
    padding: 18px;
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 13px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: 16px;
  }
  h3 {
    margin: 8px 0 0;
    font-size: 13px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(232, 236, 241, 0.85);
  }
  input,
  select {
    min-width: 0;
    width: 100%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #fff;
    padding: 7px 9px;
    font-size: 13px;
  }
  input[type='range'] {
    padding: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 10px;
  }
  .check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .check input {
    width: auto;
  }
  .fire {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hint {
    margin: 0;
    color: rgba(232, 236, 241, 0.55);
    font-size: 12px;
  }
  .target {
    display: grid;
    grid-template-columns: 1.3fr 1fr auto;
    gap: 6px;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  button {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    border-radius: 8px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 13px;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .ghost {
    background: transparent;
    border-color: transparent;
    color: rgba(255, 255, 255, 0.6);
  }
</style>
