// The case: her halo turning, the doors, the channels, the X-ray and the live
// readouts. The markup is already on the page (src/markup.ts); this wires it up.

import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './styles/base.css';
import './styles/stage.css';
import './styles/doors.css';
import './styles/wings.css';
import './styles/channels.css';
import './styles/layout.css';

import scene from './art/scene.json';
import content from './content/site.json';
import herUrl from './art/her.webp?url';
import titleUrl from './art/title.svg?url';
import xrayUrl from './art/her-xray.webp?url';
import { advance, aim, frontAngle, frontIndex, poses, shortestTurn, wire, type Pose } from './halo.ts';
import { copyNumber, marksOf, saveCopy, seedOf } from './copy.ts';

type View = 'hub' | 'channel';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
const ids = content.channels.map((c) => c.id);
const halo = scene.halo;
const [SW] = scene.size as [number, number];

const caseEl = $('#case');
const card = $('[data-card]');
const stage = $('[data-stage]');
const cams = $$<HTMLAnchorElement>('.cam');
const wiresBack = $$<SVGLineElement>('.wires--back line');
const wiresFront = $$<SVGLineElement>('.wires--front line');
const xr = $('.xr');
const xrIn = $('.xr__in');
const lens = $<SVGSVGElement>('.lens');
const bandLabel = $('.card__band-label');
const feeds = $$<HTMLAnchorElement>('.feed');
const keys = $$<HTMLAnchorElement>('.key');
const radar = $$<SVGCircleElement>('[data-radar]');
const flash = $('.tc__flash');
const nextLink = $<HTMLAnchorElement>('[data-next]');
const hint = $('[data-hint]');
const hintText = hint.textContent ?? '';

const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
const deskQ = matchMedia('(min-width: 1024px)');
// ?still=<degrees> pins the halo at that angle with nothing moving (screenshots, tests).
const stillParam = new URLSearchParams(location.search).get('still');
const still = stillParam !== null && !Number.isNaN(Number(stillParam));
let reduce = reduceQ.matches || still;
let desk = deskQ.matches;

// ---------- State ----------
let angle = still ? Number(stillParam) : halo.startAngle;
let hover = -1;
let ps: Pose[] = poses(halo, scene.cameras, angle);
let live = frontIndex(ps);
const t0 = performance.now();
let scale = 0.4572;
// X-ray: where the lens or band points, in her painting's pixels
let mx = scene.chest.x;
let my = scene.chest.y;
let pointerIn = false;
let scanning = false;
// A channel's camera on its way round to the front (see bringToFront)
let turn: { from: number; by: number; t0: number; ms: number } | null = null;

const state = () => caseEl.dataset.state as 'sealed' | 'open';
const view = () => caseEl.dataset.view as View;
const channel = () => caseEl.dataset.channel ?? 'info';
const chIndex = () => Math.max(0, ids.indexOf(channel()));

// ---------- Layout ----------
const camMult = () => (desk ? 1 : 1.13);

function layout(): void {
  scale = card.clientWidth / SW;
  stage.style.setProperty('--s', String(scale));
  xr.style.setProperty('--lfs', (desk ? 11 / scale : 10 / scale).toFixed(1) + 'px');
  const fig = $('.xray__svg');
  if (fig) {
    const k = Math.min(fig.clientWidth / 560, fig.clientHeight / 680) || 1;
    fig.style.setProperty('--lfs', (11 / k).toFixed(1) + 'px');
  }
  measureShots();
  renderHalo(true);
  renderXray();
  renderShots();
}

// Write an attribute only when it changes: these run many times a second.
const flag = (el: Element, name: string, on: boolean) => {
  if (el.hasAttribute(name) !== on) el.toggleAttribute(name, on);
};
const attr = (el: Element, name: string, value: string | null) => {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

// ---------- The halo ----------
const lastZ: number[] = [];
const lastLive: boolean[] = [];

function renderHalo(force = false): void {
  ps = poses(halo, scene.cameras, angle, hover);
  const nextLive = hover >= 0 ? hover : view() === 'channel' ? chIndex() : frontIndex(ps);
  const liveChanged = nextLive !== live;
  live = nextLive;
  // Cameras and wires are only drawn while her side of the panel shows (or turns away).
  if (view() === 'channel' && !force && !turn) return;
  const m = camMult();
  ps.forEach((p, i) => {
    const el = cams[i] as HTMLAnchorElement;
    const art = scene.cameras[i]!;
    const w = art.w * halo.cameraScale;
    const h = art.h * halo.cameraScale;
    el.style.transform = `translate3d(${(p.x - w / 2).toFixed(2)}px,${(p.y - h / 2).toFixed(2)}px,0) scale(${(p.scale * m).toFixed(4)}) rotate(${p.rotate.toFixed(2)}deg)`;
    const z = i === hover ? 15 : p.depth < 0 ? 3 + Math.round((p.depth + 1) * 2) : 10 + Math.round(p.depth * 3);
    if (force || lastZ[i] !== z) {
      el.style.zIndex = String(z);
      lastZ[i] = z;
    }
    const isLive = i === live;
    if (force || lastLive[i] !== isLive) {
      el.toggleAttribute('data-live', isLive);
      lastLive[i] = isLive;
    }
    const [x1, y1, x2, y2] = wire(halo, p, h * m);
    const on = p.depth < 0 ? wiresBack[i]! : wiresFront[i]!;
    const off = p.depth < 0 ? wiresFront[i]! : wiresBack[i]!;
    on.setAttribute('x1', x1.toFixed(1));
    on.setAttribute('y1', y1.toFixed(1));
    on.setAttribute('x2', x2.toFixed(1));
    on.setAttribute('y2', String(y2));
    flag(on, 'data-on', true);
    flag(on, 'data-live', isLive);
    flag(off, 'data-on', false);
    flag(off, 'data-live', false);
  });
  if (liveChanged || force) renderLists();
}

// ---------- Feeds, keys, radar ----------
function renderLists(): void {
  const inCh = view() === 'channel';
  const ci = chIndex();
  ps.forEach((p, i) => {
    const onDisplay = inCh && i === ci;
    for (const el of [feeds[i], keys[i]]) {
      if (!el) continue;
      flag(el, 'data-live', i === live);
      flag(el, 'data-obstructed', p.obstructed);
      flag(el, 'data-hover', i === hover);
      attr(el, 'aria-current', onDisplay ? 'page' : null);
    }
    setText(`[data-state-of="${i}"]`, `${pad(i + 1)} · ${onDisplay ? 'On display' : p.obstructed ? 'Behind her' : i === live ? 'On air' : 'Live'}`);
    for (const shot of all(`.shot[data-shot="${i}"]`)) flag(shot, 'data-obstructed', p.obstructed);
    // The radar only shows in the desktop subject panel at the hub.
    const dot = radar[i];
    if (dot && desk && !inCh) {
      attr(dot, 'cx', (38 + (29 * (p.x - halo.cx)) / halo.rx).toFixed(1));
      attr(dot, 'cy', (38 + (29 * (p.y - halo.cy)) / halo.ry).toFixed(1));
      attr(dot, 'r', i === live ? '4.5' : '3');
      flag(dot, 'data-live', i === live);
      flag(dot, 'data-obstructed', p.obstructed);
    }
  });
  const inView = ps.filter((p) => !p.obstructed).length;
  setText('[data-cams]', String(inView));
  setText('[data-cams-of]', `${inView}/6`);
  setText('[data-front-num]', pad(live + 1));
  setText('[data-front-name]', content.channels[live]?.name ?? '');
  const cam = ps[ci];
  for (const shot of all('.shot[data-shot="-1"]')) flag(shot, 'data-obstructed', !!cam?.obstructed);
  setText('[data-cam-state]', cam?.obstructed ? 'Behind her' : 'On air');
}

// The page never adds or removes these elements, so look each selector up once.
const found = new Map<string, HTMLElement[]>();
const all = (sel: string): HTMLElement[] => {
  let els = found.get(sel);
  if (!els) found.set(sel, (els = $$(sel)));
  return els;
};

function setText(sel: string, text: string): void {
  for (const el of all(sel)) if (el.textContent !== text) el.textContent = text;
}

// A feed is a crop of her painting, pointed at her face from where its camera sits.
const shotBoxes = new Map<HTMLElement, { w: number; h: number; img: HTMLElement }>();
function measureShots(): void {
  shotBoxes.clear();
  for (const shot of $$('.shot')) {
    const img = $('.shot__img', shot);
    if (shot.offsetParent === null) continue;
    shotBoxes.set(shot, { w: shot.clientWidth, h: shot.clientHeight, img });
  }
}

function renderShots(): void {
  const ci = chIndex();
  for (const [shot, box] of shotBoxes) {
    const i = Number(shot.dataset.shot);
    const p = ps[i < 0 ? ci : i];
    if (!p || !box.w) continue;
    // How much of her each kind of feed shows across, in her pixels.
    const across = i < 0 ? 250 : box.w < 60 ? 200 : 280;
    const zoom = box.w / across;
    const a = aim(halo, scene.face, p);
    box.img.style.backgroundSize = `${(SW * zoom).toFixed(1)}px auto`;
    box.img.style.backgroundPosition = `${(box.w / 2 - a.x * zoom).toFixed(1)}px ${(box.h / 2 - a.y * zoom).toFixed(1)}px`;
  }
}

// ---------- The X-ray: lens on desktop, band on phone ----------
const BAND = 176;
// The halo lives above this line (in her pixels). The X-ray stays below it, so it
// never covers a camera you're reaching for.
const HALO_LINE = halo.cy + halo.ry + 50;
function renderXray(): void {
  const hub = view() === 'hub' && state() === 'open';
  if (desk) {
    const R = 104 / scale;
    xr.style.borderRadius = '50%';
    xr.style.width = xr.style.height = `${2 * R}px`;
    xr.style.transform = `translate3d(${(mx - R).toFixed(1)}px,${(my - R).toFixed(1)}px,0)`;
    xrIn.style.transform = `translate3d(${(R - mx).toFixed(1)}px,${(R - my).toFixed(1)}px,0)`;
    lens.style.transform = `translate3d(${(mx * scale - 120).toFixed(1)}px,${(my * scale - 120).toFixed(1)}px,0)`;
    xr.style.boxShadow = '';
    const on = hub && pointerIn && hover < 0;
    flag(xr, 'data-on', on);
    flag(lens, 'data-on', on);
    flag(card, 'data-lens', on);
    bandLabel.style.display = '';
  } else {
    const bh = BAND / scale;
    const top = my - bh / 2;
    xr.style.borderRadius = '0';
    xr.style.width = `${SW}px`;
    xr.style.height = `${bh}px`;
    xr.style.transform = `translate3d(0,${top.toFixed(1)}px,0)`;
    xr.style.boxShadow = `inset 0 ${1.5 / scale}px 0 #eeeaee, inset 0 ${-1.5 / scale}px 0 #eeeaee`;
    xrIn.style.transform = `translate3d(0,${(-top).toFixed(1)}px,0)`;
    flag(xr, 'data-on', hub && scanning);
    flag(lens, 'data-on', false);
    bandLabel.style.display = hub && scanning ? 'flex' : 'none';
    bandLabel.style.transform = `translateY(${(top * scale).toFixed(1)}px)`;
    setText('[data-depth]', String(Math.round(20 + (my * scale) / 10)));
  }
}

function toStage(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = card.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

function clampToCard(y: number, half: number): number {
  const maxY = card.clientHeight / scale - half;
  return Math.max(half, Math.min(maxY, y));
}

/** The phone band's centre for a finger at y: below the halo, inside the card. */
function bandY(y: number): number {
  const half = BAND / scale / 2;
  return Math.max(HALO_LINE + half, clampToCard(y, half));
}

card.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const p = toStage(e);
  if (desk) {
    // Over her, the lens follows; up among the cameras, it gets out of the way.
    const R = 104 / scale;
    pointerIn = p.y > HALO_LINE + R * 0.35;
    mx = Math.max(R * 0.6, Math.min(SW - R * 0.6, p.x));
    my = Math.max(HALO_LINE + R, clampToCard(p.y, R * 0.6));
  } else {
    // A mouse on the phone layout scans as it moves, below the halo.
    const was = scanning;
    scanning = p.y > HALO_LINE;
    my = bandY(p.y);
    if (was !== scanning) syncHint();
  }
  renderXray();
});

card.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'touch') return;
  pointerIn = false;
  if (!desk) {
    scanning = false;
    syncHint();
  }
  renderXray();
});

// Phone: hold her to scan, then drag. A quick swipe still scrolls.
let holdTimer = 0;
let touchStart = { clientX: 0, clientY: 0 };
card.addEventListener(
  'touchstart',
  (e) => {
    if (desk || (e.target as Element).closest('.cam')) return;
    const t = e.touches[0];
    if (!t) return;
    touchStart = { clientX: t.clientX, clientY: t.clientY };
    clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      scanning = true;
      my = bandY(toStage(touchStart).y);
      syncHint();
      renderXray();
    }, 160);
  },
  { passive: true },
);
card.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (!t) return;
    if (scanning) {
      e.preventDefault();
      my = bandY(toStage(t).y);
      renderXray();
    } else if (Math.hypot(t.clientX - touchStart.clientX, t.clientY - touchStart.clientY) > 10) {
      clearTimeout(holdTimer);
    }
  },
  { passive: false },
);
const endTouch = () => {
  clearTimeout(holdTimer);
  if (!scanning) return;
  scanning = false;
  syncHint();
  renderXray();
};
card.addEventListener('touchend', endTouch);
card.addEventListener('touchcancel', endTouch);
card.addEventListener('contextmenu', (e) => {
  if (scanning) e.preventDefault();
});

function syncHint(): void {
  hint.textContent = scanning ? 'Drag to move the X-ray.' : hintText;
  renderStatus();
}

// ---------- Hover: a camera, its feed or its key lifts the camera and stops the turn ----------
function setHover(i: number): void {
  if (hover === i) return;
  hover = i;
  renderHalo();
  renderLists();
  renderXray();
}
[cams, feeds, keys].forEach((list) =>
  list.forEach((el, i) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') setHover(i);
    });
    el.addEventListener('pointerleave', () => setHover(-1));
    // Only keyboard focus lifts a camera; focus we move after a click shouldn't stop the turn.
    el.addEventListener('focus', () => {
      if (el.matches(':focus-visible')) setHover(i);
    });
    el.addEventListener('blur', () => setHover(-1));
  }),
);

// ---------- Readouts ----------
function timecode(ms: number): string {
  const s = ms / 1000;
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad((ms % 1000) / 40)}`;
}

let lastSlow = -Infinity;
function renderReadouts(now: number): void {
  const el = now - t0;
  const tc = timecode(el);
  setText('[data-tc]', tc);
  if (now - lastSlow > 300) {
    lastSlow = now;
    const aug = 74.2 + (el / 1000) * 0.003;
    setText('[data-aug]', aug.toFixed(2));
    setText('[data-aug-pct]', aug.toFixed(2) + '%');
    for (const b of all('[data-aug-bar]')) b.style.width = `${Math.min(aug, 100).toFixed(2)}%`;
    setText('[data-deg]', `${pad(angle, 3)}°`);
  }
  renderStatus(tc);
}

function renderStatus(tc = timecode(performance.now() - t0)): void {
  const s = state() === 'sealed' ? 'Sealed' : view() === 'channel' ? `On air ${tc}` : scanning ? 'Scanning' : `Rec ${tc}`;
  setText('[data-status]', s);
}

// ---------- Tuning in: the channel's camera swings round to the front and holds ----------
function bringToFront(i: number, instant: boolean): void {
  const cam = scene.cameras[i];
  if (!cam) return;
  const to = frontAngle(cam);
  const by = shortestTurn(angle, to);
  if (instant || reduce || Math.abs(by) < 0.5) {
    turn = null;
    angle = to;
    return;
  }
  turn = { from: angle, by, t0: performance.now(), ms: 450 + Math.abs(by) * 3.5 };
}

// ---------- The loop ----------
let raf = 0;
let last = 0;
let lastShots = 0;
function frame(now: number): void {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (state() === 'sealed') return;
  if (turn) {
    const k = Math.max(0, Math.min(1, (now - turn.t0) / turn.ms));
    const eased = 1 - (1 - k) ** 3;
    angle = (((turn.from + turn.by * eased) % 360) + 360) % 360;
    if (k >= 1) turn = null;
  } else if (hover < 0 && view() === 'hub') {
    angle = advance(angle, dt, halo.turnSeconds);
  }
  renderHalo();
  if (turn || now - lastShots > 66) {
    lastShots = now;
    renderShots();
    renderLists();
  }
  renderReadouts(now);
}

function start(): void {
  if (reduce || raf || document.hidden || state() !== 'open') return;
  last = 0;
  raf = requestAnimationFrame(frame);
}
function stop(): void {
  cancelAnimationFrame(raf);
  raf = 0;
}
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

// ---------- The case: doors, channels, routing ----------
const front = $('.face--front');
const back = $('.face--back');
const insides = $$('.wing__in');
const outsides = $$('.wing__out');

function applyInert(): void {
  const sealed = state() === 'sealed';
  const ch = view() === 'channel';
  $('.panel').inert = sealed;
  front.inert = sealed || ch;
  back.inert = sealed || !ch;
  for (const el of insides) el.inert = sealed;
  for (const el of outsides) el.inert = !sealed;
}

function remember(open: boolean): void {
  try {
    if (open) sessionStorage.setItem('c3.open', '1');
    else sessionStorage.removeItem('c3.open');
  } catch {
    /* private mode: the case just starts sealed next time */
  }
}

function setChannelBits(id: string): void {
  const i = Math.max(0, ids.indexOf(id));
  setText('[data-ch-num]', pad(i + 1));
  const next = content.channels[(i + 1) % ids.length]!;
  nextLink.href = `#${next.id}`;
  setText('[data-next-num]', pad(((i + 1) % ids.length) + 1));
  setText('[data-next-name]', next.name);
}

function staticCut(): void {
  if (reduce) return;
  flash.removeAttribute('data-on');
  void flash.offsetWidth;
  flash.setAttribute('data-on', '');
}

function focusSoon(el: HTMLElement | null | undefined): void {
  if (!el) return;
  requestAnimationFrame(() => el.focus({ preventScroll: true }));
}

// Her X-ray is the biggest image and stays hidden until the case is open: load it then.
function loadXray(): void {
  for (const el of $$('[data-xray]')) {
    el.setAttribute(el instanceof HTMLImageElement ? 'src' : 'href', xrayUrl);
    el.removeAttribute('data-xray');
  }
}

function openDoors(focus = true): void {
  if (state() !== 'sealed') return;
  caseEl.dataset.state = 'open';
  remember(true);
  loadXray();
  applyInert();
  renderStatus();
  layout();
  start();
  if (focus) focusSoon((desk ? feeds[0] : keys[0]) ?? null);
}

function closeDoors(): void {
  stop();
  caseEl.dataset.view = 'hub';
  caseEl.dataset.state = 'sealed';
  remember(false);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  applyInert();
  renderStatus();
  focusSoon($('.seal'));
}

function route(user: boolean): void {
  const h = location.hash.slice(1);
  if (ids.includes(h)) {
    const wasChannel = view() === 'channel';
    const prev = channel();
    caseEl.dataset.state = 'open';
    remember(true);
    caseEl.dataset.channel = h;
    caseEl.dataset.view = 'channel';
    setChannelBits(h);
    // On arrival (user false: a deep link, already marked as a channel before boot) it's set at once.
    if (!user || !wasChannel || prev !== h) bringToFront(ids.indexOf(h), !user);
    if (wasChannel && prev !== h) staticCut();
    if (user) focusSoon(document.getElementById(`ch-${h}-t`));
    const sc = $('.tc__scroll');
    if (sc) sc.scrollTop = 0;
  } else if (view() === 'channel') {
    const prev = chIndex();
    caseEl.dataset.view = 'hub';
    if (user) focusSoon((desk ? feeds[prev] : keys[prev]) ?? null);
  }
  if (state() === 'open') loadXray();
  applyInert();
  renderHalo(true);
  renderLists();
  layout();
  lastSlow = -Infinity; // the halo may have jumped: refresh the slow readouts now
  renderReadouts(performance.now());
  start();
}

window.addEventListener('hashchange', () => route(true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && view() === 'channel' && !(e.target as Element).closest('input')) location.hash = 'halo';
});
// A keyboard press (detail 0) moves focus to the first channel; a click leaves it be.
$('.seal').addEventListener('click', (e) => openDoors(e.detail === 0));
$('[data-close]').addEventListener('click', closeDoors);
// Clicking the link for the channel already showing still lands focus on it.
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (a && a.getAttribute('href') === location.hash && ids.includes(location.hash.slice(1))) {
    e.preventDefault();
    focusSoon(document.getElementById(`ch-${location.hash.slice(1)}-t`));
  }
});

// ---------- RSVP: your own copy ----------
const nameInput = $<HTMLInputElement>('#copy-name');
const marksSvg = $('[data-marks]');
function renderCopy(): void {
  const name = nameInput.value.trim();
  const seed = seedOf(name || 'C3');
  setText('[data-copy-name]', (name || 'Your name').toUpperCase());
  setText('[data-copy-no]', copyNumber(seed));
  marksSvg.innerHTML = marksOf(seed)
    .map((m) => `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="2.5"/>`)
    .join('');
}
const copyStatus = $('[data-copy-status]');
nameInput.addEventListener('input', () => {
  renderCopy();
  copyStatus.textContent = '';
});
$('[data-save]').addEventListener('click', async () => {
  copyStatus.textContent = 'Making your poster…';
  const ok = await saveCopy({ name: nameInput.value.trim(), date: content.date, her: herUrl, title: titleUrl }).catch(() => false);
  copyStatus.textContent = ok ? 'Saved. Look in your downloads.' : 'That didn’t save. Try once more?';
});

// ---------- Phone: swipe a channel sideways for the next or the one before ----------
let swipeFrom: { x: number; y: number } | null = null;
const tc = $('.tc');
tc.addEventListener(
  'touchstart',
  (e) => {
    const t = e.touches[0];
    const onOwnScroller = (e.target as Element).closest('input, .code');
    swipeFrom = !desk && t && e.touches.length === 1 && !onOwnScroller ? { x: t.clientX, y: t.clientY } : null;
  },
  { passive: true },
);
tc.addEventListener(
  'touchend',
  (e) => {
    const t = e.changedTouches[0];
    const from = swipeFrom;
    swipeFrom = null;
    if (!from || !t || view() !== 'channel') return;
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const n = ids.length;
    location.hash = ids[(chIndex() + (dx < 0 ? 1 : n - 1)) % n]!;
  },
  { passive: true },
);

// ---------- Boot ----------
function onMedia(): void {
  reduce = reduceQ.matches || still;
  desk = deskQ.matches;
  if (reduce) {
    stop();
    // A swing in progress lands at once.
    if (turn) angle = (((turn.from + turn.by) % 360) + 360) % 360;
    turn = null;
    mx = scene.chest.x;
    my = scene.chest.y;
  } else if (state() === 'open') start();
  layout();
}
reduceQ.addEventListener('change', onMedia);
deskQ.addEventListener('change', onMedia);
new ResizeObserver(() => layout()).observe(card);
const fig = $('.xray');
if (fig) new ResizeObserver(() => layout()).observe(fig);

renderCopy();
setChannelBits(channel());
route(false);
applyInert();
layout();
renderReadouts(performance.now());
document.documentElement.dataset.booted = '';
start();
