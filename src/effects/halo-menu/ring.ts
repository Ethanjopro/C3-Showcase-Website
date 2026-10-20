// The ring itself: Three.js, loaded only when the menu opens (index.ts).
//
// A ring of boxy screens on a cable loop, one per section, in flat token
// colors: MeshBasicMaterial, no light, no gloss. Her line lives in the face
// textures, drawn with raster.roughStroke; three drawings of every face cycle
// at 10 fps and the box corners jitter on the same step, so the boxes boil
// like her line. The Projects screen shows static.
//
// The list stays the source of truth. The ring is aria-hidden (its mount is)
// and follows focus: focusing a link turns its screen to the front. Dragging
// or swiping turns the ring with inertia and snaps to the nearest screen,
// whose link then takes focus. Tapping the front screen dollies the camera in
// (300 ms) and emits `navigate`; menu.ts closes the dialog and scrolls.
//
// Everything is created on open and disposed on close: renderer (its context
// released with forceContextLoss), geometries, materials, textures.

import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { add as addTick, ticker } from '../../core/ticker';
import { color, number } from '../../core/palette';
import { slot } from '../../core/art';
import { content } from '../../core/content';
import { emit } from '../../core/bus';
import { frozenAt } from '../../core/clock';
import { noiseTile, rng, roughStroke, type Point } from '../../core/raster';

export interface Ring {
  dispose(): void;
}

export interface RingOptions {
  /** The menu's links, in order: one screen each. */
  links: HTMLAnchorElement[];
  /** The link that has focus as the ring opens: its screen starts at the front. */
  active: number;
  /** Opened from the halo in the poster: the screens grow out of her halo's screens. */
  fromHalo: boolean;
}

// --- Tuning (README "Tuning knobs") -------------------------------------------

/** Ring radius and box size, world units. */
const RADIUS = 2.7;
const BOX = { w: 2.1, h: 1.5, d: 0.95 };
/**
 * How far each screen faces out of the ring (1) versus toward the viewer (0):
 * turned partway in, the side screens show their labels, not just their sides.
 */
const YAW = 0.55;
/** Drawings per face, cycled at --fps-boil. */
const VARIANTS = 3;
/** Corner jitter, world units. */
const JITTER = 0.035;
/** Camera: field of view, height above the ring, and the margin kept around it. */
const FOV = 30;
const CAMERA_Y = 2.3;
const FIT_MARGIN = 1.04;
/** Drag: radians per canvas width. */
const DRAG = Math.PI * 0.9;
/** Inertia friction (per second) and the speed below which the ring snaps. */
const FRICTION = 3.5;
const SNAP_SPEED = 1.4;
/** Snap and entrance stiffness (per second). */
const SNAP_RATE = 11;
/** Tap: at most this far (px) and this long (ms). */
const TAP_MOVE = 8;
const TAP_MS = 400;
/** Dolly in before navigating (PLAN: 300 ms) and the entrance from the halo. */
const DOLLY_MS = 300;
const ENTRANCE_MS = 560;
/** Texture size of a box front, px; other faces scale from it. */
const TEX = 384;
/** Static on the Projects screen: noise ink. Low, so it never reads as a flash. */
const NOISE_INK = 0.22;

const TAU = Math.PI * 2;
const wrap = (a: number) => ((a % TAU) + TAU) % TAU;
/** Shortest signed distance between two angles. */
const delta = (from: number, to: number) => ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
/**
 * A screen's yaw within the ring, for ring angle a at rotation phi: in world
 * terms it faces out of the ring, turned partway toward the viewer, so the
 * screen at the front faces the camera square.
 */
const yaw = (a: number, phi: number) => delta(0, a + phi) * YAW - phi;

interface Palette {
  ink: string;
  accent: string;
  paper: string;
  text: string;
  display: string;
  body: string;
}

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  return {
    ink: color('ink'),
    accent: color('accent'),
    paper: color('paper-2'),
    text: color('text'),
    display: css.getPropertyValue('--font-display').trim() || 'serif',
    body: css.getPropertyValue('--font-text').trim() || 'sans-serif',
  };
}

// --- Face drawings ---------------------------------------------------------------

function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('halo-menu: no 2D context');
  return [c, ctx];
}

/** Her rough rectangle: four strokes that overshoot the corners. */
function roughRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, lw: number) {
  const r = rng(seed);
  const o = lw * 0.9;
  const j = () => (r() - 0.5) * lw * 0.8;
  const sides: Point[][] = [
    [[x - o, y + j()], [x + w / 2, y + j()], [x + w + o, y + j()]],
    [[x + w + j(), y - o], [x + w + j(), y + h / 2], [x + w + j(), y + h + o]],
    [[x + w + o, y + h + j()], [x + w / 2, y + h + j()], [x - o, y + h + j()]],
    [[x + j(), y + h + o], [x + j(), y + h / 2], [x + j(), y - o]],
  ];
  sides.forEach((pts, i) => roughStroke(ctx, pts, seed * 4 + i, lw));
}

/** Her stacked hatching (the ≡ marks beside the figure). */
function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, gap: number, seed: number, lw: number) {
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const yy = y + i * gap;
    roughStroke(ctx, [[x + r() * w * 0.1, yy], [x + w * (0.75 + r() * 0.25), yy + (r() - 0.5) * gap * 0.3]], seed * 3 + i, lw);
  }
}

function texture(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface Label {
  index: string;
  name: string;
  noisy: boolean;
}

function drawFront(p: Palette, label: Label, seed: number): CanvasTexture {
  const w = TEX;
  const h = Math.round((TEX * BOX.h) / BOX.w);
  const [c, ctx] = canvas2d(w, h);
  const lw = h * 0.035;
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, w, h);
  if (label.noisy) {
    // Chunky static, low ink: the Projects screen's "revealed at the show".
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = NOISE_INK;
    ctx.drawImage(noiseTile(48, 977 + seed * 13), 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
  }
  ctx.strokeStyle = p.ink;
  roughRect(ctx, lw, lw, w - 2 * lw, h - 2 * lw, 11 + seed, lw);
  roughRect(ctx, w * 0.1, h * 0.12, w * 0.8, h * 0.76, 23 + seed, lw * 0.45);
  ctx.fillStyle = p.text;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${Math.round(h * 0.36)}px ${p.display}`;
  ctx.fillText(label.index, w * 0.17, h * 0.52);
  ctx.font = `600 ${Math.round(h * 0.15)}px ${p.body}`;
  ctx.fillText(label.name, w * 0.17, h * 0.75);
  return texture(c);
}

function drawSide(p: Palette, seed: number, w: number, h: number, withHatch: boolean): CanvasTexture {
  const [c, ctx] = canvas2d(w, h);
  const lw = Math.min(w, h) * 0.05;
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = p.ink;
  roughRect(ctx, lw, lw, w - 2 * lw, h - 2 * lw, 41 + seed, lw);
  if (withHatch) hatch(ctx, w * 0.2, h * 0.38, w * 0.6, h * 0.11, 53 + seed, lw * 0.6);
  return texture(c);
}

function drawFocus(p: Palette, seed: number): CanvasTexture {
  const w = TEX;
  const h = Math.round((TEX * BOX.h) / BOX.w);
  const [c, ctx] = canvas2d(w, h);
  ctx.strokeStyle = p.accent;
  const lw = h * 0.05;
  roughRect(ctx, lw * 1.2, lw * 1.2, w - 2.4 * lw, h - 2.4 * lw, 67 + seed, lw);
  return texture(c);
}

// --- The ring ----------------------------------------------------------------------

interface Screen {
  id: string;
  link: HTMLAnchorElement;
  mesh: Mesh<BoxGeometry, Material[]>;
  front: MeshBasicMaterial;
  fronts: Texture[];
  base: Float32Array;
  angle: number;
  /** Entrance: where the screen starts, in ring-local space. */
  from: { pos: Vector3; scale: number; yaw: number } | null;
}

const clampIndex0 = (opts: RingOptions) => Math.max(0, Math.min(opts.links.length - 1, opts.active));

export function createRing(mount: HTMLElement, opts: RingOptions): Ring {
  const p = palette();
  const sections = content.sections.items;
  const fps = number('fps-boil', 10);
  const phone = matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  const dpr = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);

  const canvas = document.createElement('canvas');
  canvas.className = 'halo-ring';
  mount.append(canvas);
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const ring = new Group();
  scene.add(ring);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  // Shared faces: sides (hatched), top and bottom, back. VARIANTS drawings each.
  const sideW = Math.round((TEX * BOX.d) / BOX.w);
  const frontH = Math.round((TEX * BOX.h) / BOX.w);
  const sides = Array.from({ length: VARIANTS }, (_, s) => keep(drawSide(p, s, sideW, frontH, true)));
  const tops = Array.from({ length: VARIANTS }, (_, s) => keep(drawSide(p, s + 5, TEX, sideW, false)));
  const backs = Array.from({ length: VARIANTS }, (_, s) => keep(drawSide(p, s + 9, TEX, frontH, true)));
  const focusFrames = Array.from({ length: VARIANTS }, (_, s) => keep(drawFocus(p, s)));
  const sideMat = keep(new MeshBasicMaterial({ map: sides[0] }));
  const topMat = keep(new MeshBasicMaterial({ map: tops[0] }));
  const backMat = keep(new MeshBasicMaterial({ map: backs[0] }));

  const screens: Screen[] = opts.links.map((link, i) => {
    const id = link.hash.slice(1);
    const s = sections.find((x) => x.id === id);
    const label: Label = { index: s?.index ?? String(i + 1).padStart(2, '0'), name: s?.name ?? link.textContent?.trim() ?? id, noisy: id === 'projects' };
    const fronts = Array.from({ length: VARIANTS }, (_, v) => keep(drawFront(p, label, v + i * VARIANTS)));
    const front = keep(new MeshBasicMaterial({ map: fronts[0] }));
    const geo = keep(new BoxGeometry(BOX.w, BOX.h, BOX.d));
    // BoxGeometry faces: +x, -x, +y, -y, +z (front, facing out of the ring), -z.
    const mesh = new Mesh(geo, [sideMat, sideMat, topMat, topMat, front, backMat] as Material[]);
    const angle = (i / opts.links.length) * TAU;
    mesh.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
    mesh.rotation.y = yaw(angle, -((clampIndex0(opts) / opts.links.length) * TAU));
    mesh.userData.index = i;
    ring.add(mesh);
    return { id, link, mesh, front, fronts, base: (geo.attributes.position as BufferAttribute).array.slice() as Float32Array, angle, from: null };
  });

  // The focus frame: her accent rough frame on the front screen's face.
  const focusMat = keep(new MeshBasicMaterial({ map: focusFrames[0], transparent: true, depthWrite: false }));
  const focusGeo = keep(new PlaneGeometry(BOX.w * 1.14, BOX.h * 1.16));
  const focus = new Mesh(focusGeo, focusMat);
  focus.position.z = BOX.d / 2 + 0.02;

  // The cable loop the screens hang on, through their middles, sagging between
  // them; doubled, like her line. Plus a few drips, as on her halo.
  const cableMat = keep(new MeshBasicMaterial({ color: p.accent }));
  const n = screens.length;
  const loop: Vector3[] = [];
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * TAU;
    const between = Math.sin(((i % 4) / 4) * Math.PI); // 0 at a screen, 1 midway
    loop.push(new Vector3(Math.sin(a) * RADIUS, -0.05 - between * 0.32, Math.cos(a) * RADIUS));
  }
  for (const [r, lift, k] of [
    [0.034, 0, 1],
    [0.016, 0.09, 0.985],
  ] as const) {
    const curve = new CatmullRomCurve3(loop.map((v) => new Vector3(v.x * k, v.y + lift, v.z * k)), true);
    ring.add(new Mesh(keep(new TubeGeometry(curve, n * 40, r, 6, true)), cableMat));
  }
  const dripRand = rng(5);
  for (const s of screens) {
    for (const side of [-1, 1]) {
      if (dripRand() < 0.35) continue;
      const x = side * BOX.w * (0.25 + dripRand() * 0.2);
      const len = 0.9 + dripRand() * 1.4;
      const pts = [new Vector3(x, -BOX.h / 2, 0), new Vector3(x + side * 0.05, -BOX.h / 2 - len * 0.5, 0.05), new Vector3(x - side * 0.04, -BOX.h / 2 - len, 0)];
      const drip = new Mesh(keep(new TubeGeometry(new CatmullRomCurve3(pts), 16, 0.018, 5, false)), cableMat);
      s.mesh.add(drip);
    }
  }

  // --- State --------------------------------------------------------------------
  let phi = -screens[clampIndex(opts.active)]!.angle; // ring rotation: screen i is in front at phi = -angle
  let velocity = 0;
  let target = clampIndex(opts.active);
  let dragging: { id: number; x: number; y: number; t: number; phi: number; lastX: number; lastT: number; moved: boolean } | null = null;
  let dolly: { start: number; index: number; from: Vector3; to: Vector3 } | null = null;
  let entrance = opts.fromHalo && frozenAt === null ? ticker.now() : null;
  let boilStep = -1;
  let dirty = true;
  let size = { w: 1, h: 1 };
  let front = target;
  const camBase = new Vector3();
  const probe = new Vector3();
  const look = new Vector3(0, -0.15, 0);

  function clampIndex(i: number) {
    return Math.max(0, Math.min(screens.length - 1, i));
  }

  /** The screen nearest the front at rotation phi. */
  function nearest(at: number): number {
    let best = 0;
    let bestD = Infinity;
    screens.forEach((s, i) => {
      const d = Math.abs(delta(0, wrap(at + s.angle)));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  /** The screen at the front: its accent frame in the ring, and on its link in the strip. */
  function setFront(i: number) {
    if (focus.parent !== screens[i]!.mesh) screens[i]!.mesh.add(focus);
    screens.forEach((s, k) => s.link.toggleAttribute('data-halo-front', k === i));
    front = i;
    mount.dataset.front = screens[i]!.id;
  }
  setFront(target);

  // --- Layout: the ring fills the space above the list ----------------------------
  function layout() {
    const list = mount.parentElement?.querySelector<HTMLElement>('.menu__list');
    const box = mount.getBoundingClientRect();
    const top = list ? list.getBoundingClientRect().top - box.top : box.height;
    const w = Math.max(1, Math.round(box.width));
    const h = Math.max(1, Math.round(Math.max(120, top)));
    if (w === size.w && h === size.h) return;
    size = { w, h };
    canvas.style.height = `${h}px`;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Back the camera off until the whole ring, boxes and drips, fits.
    // Narrow screens (phones) let the side screens run off the edges, so the
    // ring reads big; wider ones fit it whole.
    const halfW = camera.aspect < 0.8 ? RADIUS * 0.92 : (RADIUS + BOX.w * 0.45) * FIT_MARGIN;
    const halfH = (RADIUS * 0.45 + BOX.h * 1.2) * FIT_MARGIN;
    const t = Math.tan(((FOV / 2) * Math.PI) / 180);
    const dist = Math.max(halfW / (camera.aspect * t), halfH / t) + RADIUS;
    camBase.set(0, CAMERA_Y * (dist / 10), dist);
    if (!dolly) camera.position.copy(camBase);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    if (entrance !== null) startFromHalo();
    dirty = true;
  }

  /** Each screen starts where one of her halo's screens is on the poster. */
  function startFromHalo() {
    const poster = document.querySelector<HTMLElement>('.poster');
    const rects = slot('halo').screens ?? [];
    if (!poster || !rects.length) {
      entrance = null;
      return;
    }
    const pr = poster.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const ray = new Raycaster();
    const dist = camera.position.distanceTo(look);
    const worldPerPx = (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * dist) / size.h;
    ring.rotation.y = phi;
    ring.updateMatrixWorld(true);
    screens.forEach((s, i) => {
      const r = rects[i % rects.length]!;
      const cx = pr.left + (r.x + r.w / 2) * pr.width;
      const cy = pr.top + (r.y + r.h / 2) * pr.height;
      const ndc = new Vector2(((cx - cr.left) / cr.width) * 2 - 1, -((cy - cr.top) / cr.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const world = ray.ray.at(dist, new Vector3());
      s.from = { pos: ring.worldToLocal(world), scale: Math.max(0.05, (r.w * pr.width * worldPerPx) / BOX.w), yaw: -phi };
    });
  }

  // --- Boil: three drawings and jittered corners, stepped ---------------------------
  function boil(step: number) {
    const v = step % VARIANTS;
    sideMat.map = sides[v]!;
    topMat.map = tops[v]!;
    backMat.map = backs[v]!;
    focusMat.map = focusFrames[v]!;
    screens.forEach((s, i) => {
      s.front.map = s.fronts[v]!;
      const r = rng(step * 31 + i * 7 + 1);
      const offsets = Array.from({ length: 8 }, () => [(r() - 0.5) * JITTER * 2, (r() - 0.5) * JITTER * 2, (r() - 0.5) * JITTER * 2]);
      const attr = s.mesh.geometry.attributes.position as BufferAttribute;
      const a = attr.array as Float32Array;
      for (let k = 0; k < a.length; k += 3) {
        const corner = (s.base[k]! > 0 ? 1 : 0) | (s.base[k + 1]! > 0 ? 2 : 0) | (s.base[k + 2]! > 0 ? 4 : 0);
        const o = offsets[corner]!;
        a[k] = s.base[k]! + o[0]!;
        a[k + 1] = s.base[k + 1]! + o[1]!;
        a[k + 2] = s.base[k + 2]! + o[2]!;
      }
      attr.needsUpdate = true;
    });
  }

  // --- Interaction ----------------------------------------------------------------
  const ray = new Raycaster();
  const ndc = new Vector2();

  function hit(x: number, y: number): number | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(screens.map((s) => s.mesh), true)) {
      let o: typeof h.object | null = h.object;
      while (o && o.userData.index === undefined) o = o.parent;
      if (o) return o.userData.index as number;
    }
    return null;
  }

  function turnTo(i: number, focusLink: boolean) {
    target = i;
    velocity = 0;
    if (focusLink && document.activeElement !== screens[i]!.link) screens[i]!.link.focus({ preventScroll: true });
    dirty = true;
  }

  function go(i: number) {
    if (dolly) return;
    turnTo(i, true);
    const toward = new Vector3(0, 0, RADIUS + BOX.d / 2 + 1.1);
    dolly = { start: ticker.now(), index: i, from: camera.position.clone(), to: toward };
    if (frozenAt !== null) finishDolly();
  }

  function finishDolly() {
    const i = dolly?.index;
    if (i === undefined) return;
    emit('navigate', { id: screens[i]!.id });
  }

  const onDown = (e: PointerEvent) => {
    if (dragging || dolly || (e.pointerType === 'mouse' && e.button !== 0)) return;
    canvas.setPointerCapture(e.pointerId);
    const now = performance.now();
    dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now, phi, lastX: e.clientX, lastT: now, moved: false };
    velocity = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const now = performance.now();
    const dx = e.clientX - dragging.x;
    if (!dragging.moved && Math.hypot(dx, e.clientY - dragging.y) > TAP_MOVE) dragging.moved = true;
    if (!dragging.moved) return;
    const next = dragging.phi + (dx / size.w) * DRAG;
    const dt = Math.max(1, now - dragging.lastT) / 1000;
    velocity = (((e.clientX - dragging.lastX) / size.w) * DRAG) / dt;
    dragging.lastX = e.clientX;
    dragging.lastT = now;
    phi = next;
    dirty = true;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const d = dragging;
    dragging = null;
    if (e.type === 'pointercancel') {
      turnTo(nearest(phi), false);
      return;
    }
    if (!d.moved && performance.now() - d.t < TAP_MS) {
      const i = hit(e.clientX, e.clientY);
      if (i === null) return;
      if (i === front && Math.abs(delta(phi, -screens[i]!.angle)) < 0.2) go(i);
      else turnTo(i, true);
      return;
    }
    if (performance.now() - d.lastT > 80) velocity = 0; // held still before letting go
    if (Math.abs(velocity) < SNAP_SPEED) turnTo(nearest(phi), true);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // The ring follows focus: Tab, arrow keys, or a tap on a list link.
  const onFocus = (e: FocusEvent) => {
    const i = screens.findIndex((s) => s.link === e.target);
    if (i >= 0 && i !== target) turnTo(i, false);
  };
  opts.links.forEach((a) => a.addEventListener('focus', onFocus));

  const resize = new ResizeObserver(layout);
  resize.observe(mount);
  layout();

  // --- Frame --------------------------------------------------------------------
  function frame(t: number, dt: number) {
    const s = dt / 1000;
    const step = Math.floor((t * fps) / 1000);
    if (step !== boilStep) {
      boilStep = step;
      boil(step);
      dirty = true;
    }

    if (!dragging) {
      if (Math.abs(velocity) > 0) {
        phi += velocity * s;
        velocity *= Math.exp(-FRICTION * s);
        if (Math.abs(velocity) < SNAP_SPEED) {
          velocity = 0;
          turnTo(nearest(phi), true);
        }
        dirty = true;
      } else {
        const goal = phi + delta(phi, -screens[target]!.angle);
        const k = frozenAt !== null ? 1 : 1 - Math.exp(-SNAP_RATE * s);
        if (Math.abs(goal - phi) > 1e-4) {
          phi += (goal - phi) * k;
          dirty = true;
        } else phi = goal;
      }
    }
    const nowFront = nearest(phi);
    if (nowFront !== front) setFront(nowFront);
    ring.rotation.y = phi;
    if (entrance === null) for (const sc of screens) sc.mesh.rotation.y = yaw(sc.angle, phi);

    if (entrance !== null) {
      const e = Math.min(1, (t - entrance) / ENTRANCE_MS);
      const k = easeOut(e);
      for (const sc of screens) {
        if (!sc.from) continue;
        const home = new Vector3(Math.sin(sc.angle) * RADIUS, 0, Math.cos(sc.angle) * RADIUS);
        sc.mesh.position.lerpVectors(sc.from.pos, home, k);
        sc.mesh.scale.setScalar(sc.from.scale + (1 - sc.from.scale) * k);
        sc.mesh.rotation.y = sc.from.yaw + delta(sc.from.yaw, yaw(sc.angle, phi)) * k;
      }
      if (e >= 1) {
        entrance = null;
        for (const sc of screens) sc.from = null;
      }
      dirty = true;
    }

    if (dolly) {
      const e = frozenAt !== null ? 1 : Math.min(1, (t - dolly.start) / DOLLY_MS);
      // The camera moves toward the front screen, in the ring's own frame.
      camera.position.lerpVectors(dolly.from, dolly.to, easeOut(e));
      camera.lookAt(0, 0, RADIUS);
      dirty = true;
      if (e >= 1 && frozenAt === null) {
        finishDolly();
        dolly = null;
      }
    }

    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
      mount.dataset.rendered = '';
      // Where the front screen is, as fractions of the canvas (tests tap it).
      screens[front]!.mesh.getWorldPosition(probe).project(camera);
      mount.dataset.frontAt = `${((probe.x + 1) / 2).toFixed(3)},${((1 - probe.y) / 2).toFixed(3)}`;
    }
  }
  const off = addTick(frame);

  return {
    dispose() {
      off();
      resize.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      opts.links.forEach((a) => a.removeEventListener('focus', onFocus));
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      screens.forEach((s) => s.link.removeAttribute('data-halo-front'));
      delete mount.dataset.front;
      delete mount.dataset.rendered;
      delete mount.dataset.frontAt;
    },
  };
}
