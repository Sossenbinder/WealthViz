<script lang="ts">
  import { dataset } from '../data/model';

  let { onclose }: { onclose: () => void } = $props();
</script>

<div
  class="backdrop"
  onclick={onclose}
  onkeydown={(e) => e.key === 'Escape' && onclose()}
  role="presentation"
>
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    aria-label="Data sources"
    tabindex="-1"
  >
    <header>
      <h2>Data sources</h2>
      <button class="ghost" onclick={onclose} aria-label="Close">✕</button>
    </header>
    <p class="disclaimer">{dataset.disclaimer}</p>
    <ul>
      {#each dataset.sources as s (s.id)}
        <li><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(10, 14, 20, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }
  .modal {
    width: min(560px, calc(100vw - 40px));
    background: rgba(13, 17, 23, 0.94);
    color: #eef2f7;
    border-radius: 16px;
    padding: 22px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: 17px;
  }
  .disclaimer {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(238, 242, 247, 0.75);
  }
  ul {
    margin: 8px 0 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 1.8;
  }
  a {
    color: #e8b84b;
  }
  .ghost {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    cursor: pointer;
  }
</style>
