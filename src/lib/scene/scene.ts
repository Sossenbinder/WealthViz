import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { UserConfig } from '../data/model';
import { COLORS, LINEUP_X } from './constants';
import { SceneControls, type Mode } from './controls';
import { buildLineup, type LineupHandles } from './towers';
import { buildTourStops, Tour, type CaptionState } from './tour';
import { disposeObject, makeBillTopTexture, makeCloudTexture } from './textures';
import type { HoverInfo, Pickable } from './hover';

export type { Mode } from './controls';
export type { CaptionState, Chip } from './tour';
export type { HoverInfo } from './hover';

export interface HoverEvent {
  info: HoverInfo;
  x: number;
  y: number;
}

export interface SceneEvents {
  onCaption(c: CaptionState | null): void;
  onMode(m: Mode): void;
  onTourEnd(): void;
  onHover(h: HoverEvent | null): void;
}

export interface SceneApi {
  updateConfig(cfg: UserConfig): void;
  startTour(): void;
  stopTour(): void;
  setMode(m: Exclude<Mode, 'tour'>): void;
  advance(): void;
  dispose(): void;
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  void main() {
    float f = pow(max(vDir.y, 0.0), 0.5);
    gl_FragColor = vec4(mix(uHorizon, uZenith, f), 1.0);
  }
`;

export function createScene(canvas: HTMLCanvasElement, cfg: UserConfig, events: SceneEvents): SceneApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.fogColor, 70, 1300);

  // Open on the comparison: the whole line in one frame.
  const camera = new THREE.PerspectiveCamera(55, 1, 0.02, 30000);
  camera.position.set(3.8, 1.4, 8.5);
  camera.lookAt(4.1, 0.7, 0);

  // Night-sky dome + stars.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uHorizon: { value: new THREE.Color(COLORS.horizon) },
        uZenith: { value: new THREE.Color(COLORS.sky) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  scene.add(sky);

  {
    const starCount = 700;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 0.85); // bias to upper sky
      const r = 8500;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0x9db1cc,
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.7,
        fog: false,
      })
    );
    scene.add(stars);
  }

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8000, 64),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const grid = new THREE.GridHelper(60, 60, COLORS.gridMajor, COLORS.gridMinor);
  grid.position.set(LINEUP_X.million / 2, 0.001, 0);
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.transparent = true;
  gridMat.opacity = 0.5;
  scene.add(grid);

  // Moonlit lighting: cool key, low ambient dome.
  scene.add(new THREE.HemisphereLight(0x2c3a50, 0x0a0d12, 1.1));
  const key = new THREE.DirectionalLight(0xdfe8f5, 1.9);
  key.position.set(-140, 380, 260);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899b0, 0.4);
  fill.position.set(200, 120, -180);
  scene.add(fill);
  // Short-range lantern on the camera so close-ups read; falls off before it
  // can flatten the wider night scene.
  const lantern = new THREE.PointLight(0xcfdae8, 6, 10, 2);
  camera.add(lantern);
  scene.add(camera);

  // Thin moonlit haze layer around 600–820 m — the €1B stack pierces it.
  const cloudTex = makeCloudTexture();
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  for (let i = 0; i < 20; i++) {
    const size = 140 + Math.random() * 300;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), cloudMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 150 + Math.random() * 1000;
    plane.position.set(
      LINEUP_X.billion + Math.cos(angle) * radius,
      600 + Math.random() * 220,
      Math.sin(angle) * radius
    );
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = Math.random() * Math.PI * 2;
    clouds.add(plane);
  }
  scene.add(clouds);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One €100 note, forever fluttering down beside the start of the line —
  // the unit of the whole scene, falling through it.
  const fallingNote = new THREE.Mesh(
    new THREE.PlaneGeometry(0.147, 0.082),
    new THREE.MeshStandardMaterial({
      map: makeBillTopTexture(),
      side: THREE.DoubleSide,
      roughness: 0.75,
    })
  );
  fallingNote.visible = !reducedMotion;
  scene.add(fallingNote);

  // Config-driven content.
  let lineup: LineupHandles = buildLineup(cfg);
  scene.add(lineup.group);
  let currentCfg = cfg;
  let pickMap = new Map<THREE.Object3D, Pickable>(lineup.pickables.map((p) => [p.object, p]));
  let beamRef = lineup.group.getObjectByName('beam200b') as THREE.Mesh | undefined;

  // Hover inspect: raycast on pointer move, gold edge box on the hit.
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let pointerClient = { x: 0, y: 0 };
  let pointerDirty = false;
  let hovering = false;
  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xe8b84b, transparent: true, opacity: 0.9 })
  );
  highlight.visible = false;
  highlight.renderOrder = 5;
  scene.add(highlight);

  function onPointerMove(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    pointerClient = { x: e.clientX, y: e.clientY };
    pointerDirty = true;
  }
  canvas.addEventListener('pointermove', onPointerMove);

  function clearHover(): void {
    if (!hovering) return;
    hovering = false;
    highlight.visible = false;
    canvas.style.cursor = '';
    events.onHover(null);
  }

  function updateHover(): void {
    if (!pointerDirty) return;
    pointerDirty = false;
    if (controls.pointer.isLocked || tour.travelling) {
      clearHover();
      return;
    }
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(
      lineup.pickables.map((p) => p.object),
      true
    );
    for (const hit of hits) {
      // Walk up to the registered ancestor (coin groups hit child meshes).
      let node: THREE.Object3D | null = hit.object;
      let pickable: Pickable | undefined;
      while (node && !(pickable = pickMap.get(node))) node = node.parent;
      if (!pickable) continue;
      const resolved = pickable.resolve(hit);
      if (!resolved) continue;
      hovering = true;
      highlight.position.copy(resolved.center);
      highlight.scale.copy(resolved.size).multiplyScalar(1.04);
      highlight.visible = true;
      canvas.style.cursor = 'pointer';
      events.onHover({ info: resolved.info, x: pointerClient.x, y: pointerClient.y });
      return;
    }
    clearHover();
  }

  // Screen-space HTML labels.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  canvas.parentElement?.appendChild(labelRenderer.domElement);

  // Post: subtle bloom so the gold accents and the €200B beam glow.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.55, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const controls = new SceneControls(camera, canvas, (m) => events.onMode(m));
  controls.orbit.target.set(4.1, 0.7, 0);

  const tour = new Tour(camera, {
    onCaption: (c) => events.onCaption(c),
    // The camera is yours at every stop: orbit around the current focus.
    onArrive: (stop) => {
      controls.orbit.target.copy(stop.look);
      controls.orbit.enabled = true;
    },
    onTravelStart: () => {
      controls.orbit.enabled = false;
    },
    onFinish: () => {
      // Enter fly mode without grabbing the pointer — the user clicks the canvas
      // to capture the mouse, so HUD buttons stay reachable after the tour.
      controls.mode = 'fly';
      controls.orbit.enabled = false;
      events.onMode('fly');
      events.onTourEnd();
    },
  });

  function rebuild(next: UserConfig): void {
    currentCfg = next;
    clearHover();
    scene.remove(lineup.group);
    disposeObject(lineup.group);
    lineup = buildLineup(next);
    scene.add(lineup.group);
    pickMap = new Map(lineup.pickables.map((p) => [p.object, p]));
    beamRef = lineup.group.getObjectByName('beam200b') as THREE.Mesh | undefined;
  }

  function onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.code === 'Space' || e.code === 'Enter') && tour.active) {
      e.preventDefault();
      tour.advance();
    }
  }
  window.addEventListener('keydown', onKey);

  function resize(): void {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let disposed = false;

  renderer.setAnimationLoop(() => {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    tour.update(dt);
    controls.update(dt);
    updateHover();

    if (!reducedMotion) {
      // Slow tumble down from 2.8 m, then start over.
      const cycle = 9;
      const phase = (t % cycle) / cycle;
      fallingNote.position.set(
        LINEUP_X.coffee - 0.55 + Math.sin(t * 1.7) * 0.12,
        2.8 * (1 - phase),
        0.55 + Math.cos(t * 1.3) * 0.1
      );
      fallingNote.rotation.set(t * 0.9, t * 0.5, Math.sin(t * 1.1) * 0.6);
      if (beamRef) {
        (beamRef.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 0.6) * 0.1;
      }
    }

    composer.render();
    labelRenderer.render(scene, camera);
  });

  return {
    updateConfig(next) {
      rebuild(next);
    },
    startTour() {
      controls.mode = 'tour';
      controls.orbit.enabled = false;
      if (controls.pointer.isLocked) controls.pointer.unlock();
      events.onMode('tour');
      tour.start(buildTourStops(currentCfg, lineup));
    },
    stopTour() {
      tour.stop();
      controls.setMode('orbit');
    },
    setMode(m) {
      if (tour.active) tour.stop();
      controls.setMode(m);
    },
    advance() {
      tour.advance();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      controls.dispose();
      disposeObject(scene);
      composer.dispose();
      labelRenderer.domElement.remove();
      renderer.dispose();
    },
  };
}
