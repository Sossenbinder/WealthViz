<script lang="ts">
  import type { CaptionState } from '../scene/scene';

  let { caption, onadvance }: { caption: CaptionState; onadvance: () => void } = $props();
</script>

<div class="caption" class:travelling={caption.travelling}>
  <p class="title">{caption.title}</p>
  {#if caption.sub}
    <p class="sub">{caption.sub}</p>
  {/if}
  {#if caption.chips?.length && !caption.travelling}
    <div class="chips">
      {#each caption.chips as chip (chip.label)}
        <div class="chip">
          <b>{chip.value}</b>
          <span>{chip.label}</span>
          {#if chip.progress != null}
            <div class="chipbar"><i style="width: {Math.min(chip.progress * 100, 100)}%"></i></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  {#if !caption.travelling}
    <div class="footer">
      <div class="dots">
        {#each { length: caption.total } as _, i}
          <span class="dot" class:on={i <= caption.index}></span>
        {/each}
      </div>
      <div class="actions">
        <span class="drag">drag to look around</span>
        <button onclick={onadvance}>Continue · Space</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .caption {
    position: absolute;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    width: min(620px, calc(100vw - 32px));
    background: rgba(13, 17, 23, 0.88);
    color: #eef2f7;
    border-radius: 16px;
    padding: 18px 22px;
    backdrop-filter: blur(10px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }
  .travelling {
    background: rgba(13, 17, 23, 0.6);
  }
  .title {
    margin: 0;
    font-size: 19px;
    font-weight: 650;
  }
  .sub {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(238, 242, 247, 0.75);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 12px;
  }
  .chip {
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 9px;
    padding: 6px 11px;
    font-size: 10.5px;
    color: rgba(238, 242, 247, 0.5);
    font-variant-numeric: tabular-nums;
  }
  .chip b {
    display: block;
    font-size: 12.5px;
    font-weight: 650;
    color: #eef2f7;
  }
  .chipbar {
    margin-top: 4px;
    height: 3px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .chipbar i {
    display: block;
    height: 100%;
    background: #e8b84b;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
  }
  .dot.on {
    background: #e8b84b;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .drag {
    font-size: 11.5px;
    color: rgba(238, 242, 247, 0.45);
  }
  button {
    background: #e8b84b;
    color: #101418;
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-weight: 650;
    font-size: 13px;
    cursor: pointer;
  }
  button:hover {
    filter: brightness(1.08);
  }
</style>
