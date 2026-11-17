// The case: her halo turning, the doors, the channels, the X-ray and the
// countdown. The markup is already on the page (src/markup.ts); this wires it up.

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
import xrayUrl from './art/her-xray.webp?url';
import { advance, aim, bases, CAM_BOX, frontAngle, frontIndex, poses, shortestTurn, type Pose } from './halo.ts';
import { drawRig } from './rig.ts';
import { countdown } from './event.ts';

type View = 'hub' | 'channel';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
const wrap = (deg: number) => ((deg % 360) + 360) % 360;
const ids = content.channels.map((c) => c.id);
const halo = scene.halo;
const camBases = bases(ids.length);
const [SW, SH] = scene.size as [number, number];

const caseEl = $('#case');
const card = $('[data-card]');
const stage = $('[data-stage]');
const cams = $$<HTMLAnchorElement>('.cam');
const rigBack = $<HTMLCanvasElement>('.rig--back');
const rigFront = $<HTMLCanvasElement>('.rig--front');
const ctxBack = rigBack.getContext('2d');
const ctxFront = rigFront.getContext('2d');
const xr = $('.xr');
const xrIn = $('.xr__in');
const lens = $<SVGSVGElement>('.lens');
const feeds = $$<HTMLAnchorElement>('.feed');
const keys = $$<HTMLAnchorElement>('.key');
const flash = $('.tc__flash');
const nextLink = $<HTMLAnchorElement>('[data-next]');
const hint = $('[data-hint]');
const hintText = hint.textContent ?? '';

const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
const deskQ = matchMedia('(min-width: 1024px)');
// ?still=<degrees> pins the halo at that angle with nothing moving (screenshots, tests).
const stillParam = new URLSearchParams(location.search).get('still');
const still = stillParam !== null && !Number.isNaN(Number(stillParam));
if (still) document.documentElement.dataset.still = '';
let reduce = reduceQ.matches || still;
let desk = deskQ.matches;

// ---------- State ----------
let angle = still ? Number(stillParam) : halo.startAngle;
let hover = -1;
let ps: Pose[] = poses(halo, camBases, angle);
let live = frontIndex(ps);
// Her painting's pixels to screen pixels, and how far down the card she sits: when the card
// is taller than her painting (some desktop shapes) her dress meets the bottom edge and her
// night-blue ground fills the space above.
let scale = 0.4572;
let sy = 0;
// X-ray: where the lens or band points, in her painting's pixels
let mx = scene.chest.x;
let my = scene.chest.y;
let pointerIn = false;
let scanning = false;
// A channel's camera on its way round to the front (see bringToFront)
let turn: { from: number; by: number; t0: number; ms: number } | null = null;
// How fast the halo is turning, as a share of full speed: it eases down while a camera is
// pointed at (slow enough to read and click, never stopped) and back up after.
let speed = 1;
const HOVER_SPEED = 0.14;
// Turning the panel over takes this long (--t-turn): half for one face out, half for the other in.
// The build may write the time as "950ms" or ".95s": read either.
const TURN_MS = (() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--t-turn').trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return 950;
  return v.endsWith('ms') ? n : n * 1000;
})();
// Until when her side of the panel is still in view after tuning in (its half of the turn)
let frontShowsUntil = 0;

const state = () => caseEl.dataset.state as 'sealed' | 'open';
const view = () => caseEl.dataset.view as View;
const channel = () => caseEl.dataset.channel ?? ids[0]!;
const chIndex = () => Math.max(0, ids.indexOf(channel()));

// Write an attribute only when it changes: these run many times a second.
const flag = (el: Element, name: string, on: boolean) => {
  if (el.hasAttribute(name) !== on) el.toggleAttribute(name, on);
};
const attr = (el: Element, name: string, value: string | null) => {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};
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

// ---------- Layout ----------
const camSize = () => (desk ? halo.cameraSize : halo.cameraSizePhone);
// The rig's canvases cover her painting from the card's top edge down to just under the halo.
const RIG_BOTTOM = halo.cy + halo.ry + 150;
let rigK = 1;
let rigTop = 0;

function layout(): void {
  scale = card.clientWidth / SW;
  sy = Math.max(0, Math.round(card.clientHeight - SH * scale));
  stage.style.setProperty('--s', String(scale));
  stage.style.setProperty('--sy', `${sy}px`);
  xr.style.setProperty('--lfs', (desk ? 11 / scale : 10 / scale).toFixed(1) + 'px');
  // One canvas pixel per screen pixel, so the drawing stays crisp at any size.
  rigK = scale * Math.min(window.devicePixelRatio || 1, 3);
  rigTop = -Math.ceil(sy / scale);
  const h = RIG_BOTTOM - rigTop;
  for (const c of [rigBack, rigFront]) {
    const [w, hh] = [Math.round(SW * rigK), Math.round(h * rigK)];
    if (c.width !== w || c.height !== hh) {
      c.width = w;
      c.height = hh;
    }
    c.style.width = `${SW}px`;
    c.style.height = `${h}px`;
    c.style.top = `${rigTop}px`;
  }
  measureShots();
  renderHalo(true);
  renderXray();
  renderShots();
}

// ---------- The halo ----------
const lastZ: number[] = [];
const lastLive: boolean[] = [];

function renderHalo(force = false): void {
  ps = poses(halo, camBases, angle, hover);
  const nextLive = hover >= 0 ? hover : view() === 'channel' ? chIndex() : frontIndex(ps);
  const liveChanged = nextLive !== live;
  live = nextLive;
  // The rig is only drawn while her side of the panel shows (or is still turning away).
  if (view() === 'channel' && !force && performance.now() > frontShowsUntil) return;
  const size = camSize();
  // The link and number tag of each camera ride on top of its drawing.
  ps.forEach((p, i) => {
    const el = cams[i] as HTMLAnchorElement;
    el.style.transform = `translate3d(${(p.x - CAM_BOX.w / 2).toFixed(2)}px,${(p.y - CAM_BOX.h / 2).toFixed(2)}px,0) scale(${(p.scale * size).toFixed(4)})`;
    // Behind her head a camera stays behind it, hovered or not: its drawing is on the back canvas.
    const z = p.depth < 0 ? 4 : i === hover ? 15 : 10 + Math.round(p.depth * 3);
    if (force || lastZ[i] !== z) {
      el.style.zIndex = String(z);
      lastZ[i] = z;
    }
    const isLive = i === live;
    if (force || lastLive[i] !== isLive) {
      el.toggleAttribute('data-live', isLive);
      lastLive[i] = isLive;
    }
  });
  const o = { halo, poses: ps, turn: angle, live, size, k: rigK, origin: [0, rigTop] as [number, number] };
  if (ctxBack) drawRig(ctxBack, 'back', o);
  if (ctxFront) drawRig(ctxFront, 'front', o);
  if (liveChanged || force) renderLists();
}

// ---------- Feeds and keys ----------
function renderLists(): void {
  const inCh = view() === 'channel';
  const ci = chIndex();
  ps.forEach((p, i) => {
    for (const el of [feeds[i], keys[i]]) {
      if (!el) continue;
      flag(el, 'data-live', i === live);
      flag(el, 'data-hover', i === hover);
      attr(el, 'aria-current', inCh && i === ci ? 'page' : null);
    }
    for (const shot of all(`.shot[data-shot="${i}"]`)) flag(shot, 'data-obstructed', p.obstructed);
  });
}

// A feed is a crop of her painting, pointed at her face from where its camera sits.
const shotBoxes = new Map<HTMLElement, { w: number; h: number; img: HTMLElement }>();
function measureShots(): void {
  shotBoxes.clear();
  for (const shot of $$('.shot')) {
    if (shot.offsetParent === null) continue;
    shotBoxes.set(shot, { w: shot.clientWidth, h: shot.clientHeight, img: $('.shot__img', shot) });
  }
}

function renderShots(): void {
  for (const [shot, box] of shotBoxes) {
    const p = ps[Number(shot.dataset.shot)];
    if (!p || !box.w) continue;
    // How much of her each feed shows across, in her pixels.
    const zoom = box.w / (box.w < 60 ? 200 : 280);
    const a = aim(halo, scene.face, p);
    box.img.style.backgroundSize = `${(SW * zoom).toFixed(1)}px auto`;
    box.img.style.backgroundPosition = `${(box.w / 2 - a.x * zoom).toFixed(1)}px ${(box.h / 2 - a.y * zoom).toFixed(1)}px`;
  }
}

// ---------- The X-ray: lens on desktop, band on phone ----------
const BAND = 176;
// The halo lives above this line (in her pixels). The X-ray stays below it, so it
// never covers a camera you're reaching for.
const HALO_LINE = halo.cy + halo.ry + 60;
function renderXray(): void {
  const hub = view() === 'hub' && state() === 'open';
  if (desk) {
    const R = 104 / scale;
    xr.style.borderRadius = '50%';
    xr.style.width = xr.style.height = `${2 * R}px`;
    xr.style.transform = `translate3d(${(mx - R).toFixed(1)}px,${(my - R).toFixed(1)}px,0)`;
    xrIn.style.transform = `translate3d(${(R - mx).toFixed(1)}px,${(R - my).toFixed(1)}px,0)`;
    lens.style.transform = `translate3d(${(mx * scale - 120).toFixed(1)}px,${(my * scale + sy - 120).toFixed(1)}px,0)`;
    xr.style.boxShadow = '';
    const on = hub && pointerIn && hover < 0;
    flag(xr, 'data-on', on);
    flag(lens, 'data-on', on);
    flag(card, 'data-lens', on);
  } else {
    const bh = BAND / scale;
    const top = my - bh / 2;
    xr.style.borderRadius = '0';
    xr.style.width = `${SW}px`;
    xr.style.height = `${bh}px`;
    xr.style.transform = `translate3d(0,${top.toFixed(1)}px,0)`;
    xr.style.boxShadow = `inset 0 ${1.5 / scale}px 0 #ece6d6, inset 0 ${-1.5 / scale}px 0 #ece6d6`;
    xrIn.style.transform = `translate3d(0,${(-top).toFixed(1)}px,0)`;
    flag(xr, 'data-on', hub && scanning);
    flag(lens, 'data-on', false);
  }
}

function toStage(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = card.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top - sy) / scale };
}

function clampToCard(y: number, half: number): number {
  const maxY = (card.clientHeight - sy) / scale - half;
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
}

// ---------- Hover: a camera, its feed or its key lifts the camera and slows the turn ----------
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

// ---------- Tuning in: the channel's camera swings round to the front and holds ----------
function bringToFront(i: number, instant: boolean): void {
  const base = camBases[i];
  if (base === undefined) return;
  const to = frontAngle(base);
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
let lastAngle = NaN;
function frame(now: number): void {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (state() === 'sealed') return;
  if (turn) {
    const k = Math.max(0, Math.min(1, (now - turn.t0) / turn.ms));
    angle = wrap(turn.from + turn.by * (1 - (1 - k) ** 3));
    if (k >= 1) {
      angle = wrap(turn.from + turn.by);
      turn = null;
    }
  } else if (view() === 'hub') {
    // Ease toward the speed wanted: about a third of a second to slow down or pick back up.
    speed += ((hover < 0 ? 1 : HOVER_SPEED) - speed) * (1 - Math.exp(-dt * 7));
    angle = advance(angle, dt * speed, halo.turnSeconds);
  }
  // Held still (a channel on air): nothing to redraw.
  if (angle === lastAngle) return;
  lastAngle = angle;
  renderHalo();
  if (turn || now - lastShots > 66) {
    lastShots = now;
    renderShots();
    renderLists();
  }
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

// ---------- The countdown: the one live reading, and a real one ----------
const startsAt = Date.parse(content.start);
const endsAt = Date.parse(content.end);
function renderCount(): void {
  const c = countdown(Date.now(), startsAt, endsAt);
  setText('[data-count]', c.text);
  document.documentElement.dataset.event = c.state;
}
setInterval(renderCount, 30_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return stop();
  renderCount();
  start();
});

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

function staticCut(): void {
  if (reduce) return;
  flash.removeAttribute('data-on');
  void flash.offsetWidth;
  flash.setAttribute('data-on', '');
}

// Move focus to where the visitor has just gone. A face of the panel that is still turning
// into view can't take focus yet, so try again until it can (unless they've moved on).
function focusSoon(el: HTMLElement | null | undefined, tries = 8): void {
  if (!el) return;
  const was = document.activeElement;
  requestAnimationFrame(() => {
    el.focus({ preventScroll: true });
    const active = document.activeElement;
    if (active === el || tries <= 0 || (active !== was && active !== document.body)) return;
    setTimeout(() => focusSoon(el, tries - 1), 110);
  });
}

// Which channel the title card is showing (data-shown). It follows data-channel at once,
// except from one channel to another: then the card turns edge-on showing the old one,
// swaps, and turns back in showing the new one.
let cardTurn: Animation | null = null;
// While the card is turning away, the channel it will show when it comes back
let turningTo: { id: string; focus: boolean } | null = null;
function stopCardTurn(): void {
  cardTurn?.cancel();
  cardTurn = null;
  turningTo = null;
}
function showChannel(id: string, turnOver: boolean, focus: boolean): void {
  const show = () => {
    const to = turningTo ?? { id, focus };
    turningTo = null;
    const i = Math.max(0, ids.indexOf(to.id));
    caseEl.dataset.shown = to.id;
    setText('[data-ch-num]', pad(i + 1));
    const next = content.channels[(i + 1) % ids.length]!;
    nextLink.href = `#${next.id}`;
    setText('[data-next-name]', next.name);
    $('.tc__scroll').scrollTop = 0;
    if (to.focus) focusSoon(document.getElementById(`ch-${to.id}-t`));
  };
  // Another choice while the card is still turning away: it just comes back showing that one.
  if (turningTo && turnOver && !reduce) {
    turningTo = { id, focus };
    return;
  }
  stopCardTurn();
  if (!turnOver || reduce || typeof back.animate !== 'function') return show();
  turningTo = { id, focus };
  const ease = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'ease';
  const away = back.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-90deg)' }], { duration: TURN_MS / 2, easing: ease('--ease-turn-in'), fill: 'forwards' });
  cardTurn = away;
  away.finished
    .then(() => {
      if (cardTurn !== away) return;
      show();
      staticCut();
      cardTurn = back.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }], { duration: TURN_MS / 2, easing: ease('--ease-turn-out') });
      away.cancel();
    })
    .catch(() => undefined); // cancelled: a newer choice took over
}

// Her X-ray is the biggest image and stays hidden until the case is open: load it then.
function loadXray(): void {
  for (const el of $$('[data-xray]')) {
    el.setAttribute('src', xrayUrl);
    el.removeAttribute('data-xray');
  }
}

function openDoors(focus = true): void {
  if (state() !== 'sealed') return;
  caseEl.dataset.state = 'open';
  remember(true);
  loadXray();
  applyInert();
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
    // On arrival (user false: a deep link, already marked as a channel before boot) it's set at once.
    if (!user || !wasChannel || prev !== h) bringToFront(ids.indexOf(h), !user);
    if (!wasChannel && user && !reduce) frontShowsUntil = performance.now() + TURN_MS / 2;
    // From her, the panel turns over to the channel. From another channel, the card itself turns.
    showChannel(h, user && wasChannel && prev !== h, user);
  } else if (view() === 'channel') {
    const prev = chIndex();
    // Leaving mid-turn: the card stops where it is and shows the channel that was chosen.
    stopCardTurn();
    caseEl.dataset.shown = channel();
    caseEl.dataset.view = 'hub';
    if (user) focusSoon((desk ? feeds[prev] : keys[prev]) ?? null);
  }
  if (state() === 'open') loadXray();
  applyInert();
  lastAngle = NaN; // the halo may have jumped: draw it afresh
  layout();
  renderLists();
  start();
}

window.addEventListener('hashchange', () => route(true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && view() === 'channel') location.hash = 'halo';
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

// ---------- Send it to a friend: the share sheet where there is one, else copy the link ----------
const shareStatus = $('[data-share-status]');
$('[data-share]').addEventListener('click', async () => {
  const data = { title: content.title, text: `${content.title}: ${content.dateLong}, ${content.time}, ${content.location}.`, url: content.url };
  shareStatus.textContent = '';
  try {
    if (typeof navigator.share === 'function') await navigator.share(data);
    else {
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      shareStatus.textContent = 'Link copied. Paste it to a friend.';
    }
  } catch (err) {
    // Closing the share sheet isn't a failure; anything else, show the link to copy by hand.
    if ((err as Error).name !== 'AbortError') shareStatus.textContent = `Copy this link: ${content.url}`;
  }
});

// ---------- Phone: swipe a channel sideways for the next or the one before ----------
let swipeFrom: { x: number; y: number } | null = null;
const tc = $('.tc');
tc.addEventListener(
  'touchstart',
  (e) => {
    const t = e.touches[0];
    swipeFrom = !desk && t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
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
    if (turn) angle = wrap(turn.from + turn.by);
    turn = null;
    mx = scene.chest.x;
    my = scene.chest.y;
  } else if (state() === 'open') start();
  layout();
}
reduceQ.addEventListener('change', onMedia);
deskQ.addEventListener('change', onMedia);
// Dragged to a sharper or coarser screen: redraw the rig at its pixel size.
(function watchDensity(): void {
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
    'change',
    () => {
      layout();
      watchDensity();
    },
    { once: true },
  );
})();
new ResizeObserver(() => layout()).observe(card);

renderCount();
route(false);
document.documentElement.dataset.booted = '';
