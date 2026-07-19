import * as THREE from 'three';
import { COLORS } from './constants';

/**
 * Bill-edge texture. One vertical repeat represents EDGE_TEXTURE_METERS of
 * stacked bills (1,000 bills = €100,000); towers set repeat.y = height / EDGE_TEXTURE_METERS.
 */
export const EDGE_TEXTURE_METERS = 0.1;

export function makeEdgeTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = COLORS.billEdgeLight;
  ctx.fillRect(0, 0, w, h);

  // Fine per-bill lines (blur into tone at distance via mipmaps).
  for (let y = 0; y < h; y += 2) {
    const v = 0.75 + Math.random() * 0.25;
    ctx.fillStyle = `rgba(110, 130, 110, ${(1 - v) * 1.6})`;
    ctx.fillRect(0, y, w, 1);
  }
  // A darker seam every 100 bills (1 cm — a €10,000 bundle).
  const bundlePx = h / 10;
  ctx.fillStyle = 'rgba(70, 90, 75, 0.55)';
  for (let i = 0; i <= 10; i++) {
    ctx.fillRect(0, Math.round(i * bundlePx), w, 2);
  }
  // Slight horizontal unevenness.
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Stylized (deliberately non-realistic) €100 note face for tops and single bills. */
export function makeBillTopTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 288;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#aec7ab');
  g.addColorStop(1, '#8fae92');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(60, 85, 65, 0.8)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = 'rgba(60, 85, 65, 0.25)';
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.5, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2f4a38';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('100', 36, h * 0.5);
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('EURO', 40, h * 0.78);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft white blob for the cloud layer. */
export function makeCloudTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical white gradient, opaque at the bottom fading to nothing — for light beams. */
export function makeBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    // CSS2D labels own DOM nodes that outlive the scene graph — remove them.
    const css = obj as THREE.Object3D & { isCSS2DObject?: boolean; element?: HTMLElement };
    if (css.isCSS2DObject && css.element) css.element.remove();
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      const mat = m as THREE.Material & { map?: THREE.Texture | null };
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  });
}
