// Renders the page body at build time (scripts/vite/case-html.ts), so the first
// paint has every word and image in place and nothing shifts when main.ts boots.
// One DOM serves both layouts: CSS turns it into the desktop case (doors either
// side of her) or the phone case (her card, channel keys, door leaves over her).

import type { CameraArt, Halo } from './halo.ts';
import { fitFraction, type Widths } from './fit.ts';
import { organs } from './organs.ts';

export interface Channel {
  id: string;
  name: string;
  desc: string;
  title: [string, string];
}

export interface Content {
  title: string;
  description: string;
  url: string;
  date: string;
  location: string;
  about: string;
  rsvpUrl: string;
  rsvpSoon: string;
  followUrl: string;
  followLabel: string;
  calendarUrl: string;
  mapUrl: string;
  sourceUrl: string;
  artist: string;
  piece: { title: string; year: string; medium: string };
  builtBy: string;
  projects: { count: number; teaser: string };
  channels: Channel[];
}

export interface Scene {
  size: [number, number];
  halo: Halo;
  cameras: CameraArt[];
  lettering: { x: number; y: number; w: number; h: number };
  face: { x: number; y: number };
  chest: { x: number; y: number };
  occluderBelow: number;
}

const ART = '/src/art/';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const num = (i: number) => String(i + 1).padStart(2, '0');
const dot = (cls = '') => `<i class="dot${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`;

/** True while a value is still her placeholder ("0.0.0") or empty. */
export const isTBA = (v: string) => !v.trim() || v.trim() === '0.0.0';

/** A caption that says "TBA" while its value is still her placeholder. */
const capFor = (label: string, v: string) =>
  `<p class="cap">${label}${isTBA(v) ? '<span class="tba" aria-hidden="true"> · TBA</span><span class="vh">: to be announced</span>' : ''}</p>`;

/** A big value. Her placeholder still shows, but isn't read out: its caption already says so. */
const bigFor = (v: string, cls = 'big') => `<p class="${cls}"${isTBA(v) ? ' aria-hidden="true"' : ''}>${esc(v)}</p>`;

/** A link if there's a URL, nothing otherwise (empty URLs hide their links). */
const maybeLink = (url: string, text: string, cls = 'lk') => (url ? `<a class="${cls}" href="${esc(url)}" rel="noopener">${text}</a>` : '');

function ellipse(h: Halo, sweep: 0 | 1): string {
  return `M${h.cx - h.rx} ${h.cy}A${h.rx} ${h.ry} 0 0 ${sweep} ${h.cx + h.rx} ${h.cy}`;
}

function stage(c: Content, s: Scene): string {
  const [W, H] = s.size;
  const h = s.halo;
  const svg = (cls: string, inner: string) => `<svg class="${cls}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">${inner}</svg>`;
  const ring = (sweep: 0 | 1) => `<path class="ring__body" d="${ellipse(h, sweep)}"/><path class="ring__glint" d="${ellipse(h, sweep)}"/>`;
  const wires = s.cameras.map(() => '<line x1="0" y1="0" x2="0" y2="0"/>').join('');
  const cams = s.cameras
    .map((cam, i) => {
      const ch = c.channels[i] as Channel;
      const w = Math.round(cam.w * h.cameraScale);
      const hh = Math.round(cam.h * h.cameraScale);
      return `<a class="cam" href="#${ch.id}" data-cam="${i}" tabindex="-1" aria-hidden="true" style="width:${w}px;height:${hh}px"><img src="${ART}${cam.file}.webp" alt="" draggable="false" decoding="async"><span class="cam__tag">${num(i)}</span></a>`;
    })
    .join('');
  const L = s.lettering;
  return `<div class="stage" data-stage style="width:${W}px;height:${H}px">
<img class="stage__her" src="${ART}her.webp" alt="Her poster art: a dark-haired girl with small grey wings, hands pressed together in prayer, in a great ruffled white dress on grey. Above her head a halo of six cameras turns, each hung on a wire." width="${W}" height="${H}" fetchpriority="high" draggable="false">
${svg('wires wires--back', wires)}
${svg('ring ring--back', ring(1))}
${cams}
<div class="stage__occ" aria-hidden="true"></div>
${svg('ring ring--front', ring(0))}
${svg('wires wires--front', wires)}
<div class="stage__title" aria-hidden="true" style="left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px"></div>
<div class="xr" aria-hidden="true"><div class="xr__in"><img data-xray alt="" width="${W}" height="${H}" decoding="async"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${organs()}</svg></div><span class="xr__scan"></span></div>
</div>`;
}

function lensRing(): string {
  let ticks = '';
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12;
    const r2 = k % 6 === 0 ? 117 : 111;
    ticks += `M${(120 + 106 * Math.cos(a)).toFixed(1)} ${(120 + 106 * Math.sin(a)).toFixed(1)}L${(120 + r2 * Math.cos(a)).toFixed(1)} ${(120 + r2 * Math.sin(a)).toFixed(1)}`;
  }
  return `<svg class="lens" viewBox="0 0 240 268" width="240" height="268" aria-hidden="true" focusable="false"><circle cx="120" cy="120" r="104" class="lens__edge"/><circle cx="120" cy="120" r="100.5" class="lens__glint"/><path d="${ticks}" class="lens__ticks"/><path d="M120 112V128M112 120H128" class="lens__glint"/><rect x="32" y="240" width="176" height="22" class="lens__plate"/><circle cx="45" cy="251" r="3.5" class="lens__dot"/><text x="56" y="255.5">X-RAY · INSIDE HER</text></svg>`;
}

function feedShot(i: number, extra = ''): string {
  return `<span class="shot" data-shot="${i}" aria-hidden="true"><span class="shot__img"></span><span class="scan"></span><span class="shot__ns"><span class="chip">Behind her</span></span>${extra}</span>`;
}

function feeds(c: Content): string {
  const rows = c.channels
    .map(
      (ch, i) => `<li><a class="feed" href="#${ch.id}" data-feed="${i}">${feedShot(i, `<span class="shot__cam">CAM ${num(i)}</span>${dot('shot__dot')}`)}<span class="feed__txt"><span class="cap feed__state" data-state-of="${i}" aria-hidden="true">${num(i)} · Live</span><span class="feed__name">${esc(ch.name)}</span><span class="feed__desc">${esc(ch.desc)}</span></span></a></li>`,
    )
    .join('');
  return `<nav class="wing__in feeds" aria-label="Channels">
<div class="wing__head"><p class="wing__title" aria-hidden="true">FEEDS</p><p class="cap wing__sub">Six cameras on her halo</p><p class="cap wing__live" aria-hidden="true">${dot()}<span data-cams>4</span>/6 live</p></div>
<ol class="feeds__list">${rows}</ol>
<p class="cap wing__foot">Pick a feed, or click a camera on her halo, to tune in.</p>
</nav>`;
}

function keys(c: Content): string {
  const rows = c.channels
    .map(
      (ch, i) => `<li><a class="key" href="#${ch.id}" data-key="${i}">${feedShot(i)}<span class="key__txt"><span class="key__num" aria-hidden="true">CH ${num(i)}</span><span class="key__name">${esc(ch.name)}</span></span>${dot('key__dot')}</a></li>`,
    )
    .join('');
  return `<nav class="keys" aria-label="Channels"><ol>${rows}</ol></nav>`;
}

const dateLoc = (c: Content, cls: string) =>
  `<div class="${cls}"><div>${capFor('Date', c.date)}${bigFor(c.date)}</div><div>${capFor('Location', c.location)}${bigFor(c.location)}</div></div>`;

const ekg = (cls = '') =>
  `<div class="ekg ${cls}" aria-hidden="true"><p class="cap ekg__l">Pump</p><p class="cap ekg__r">72 bpm</p><svg viewBox="0 0 672 70" preserveAspectRatio="none"><path class="ekg__line" d="${ekgPath()}"/></svg><span class="scan scan--dark"></span></div>`;

/** Two seconds of heartbeat, drawn twice so it can scroll seamlessly. */
function ekgPath(): string {
  const pts: string[] = [];
  for (let x = 0; x <= 672; x += 3) {
    let ph = ((x / 336) * 2.4) % 1;
    if (ph < 0) ph += 1;
    const v =
      0.08 * Math.exp(-(((ph - 0.12) * 30) ** 2)) -
      0.12 * Math.exp(-(((ph - 0.3) * 80) ** 2)) +
      0.9 * Math.exp(-(((ph - 0.33) * 70) ** 2)) -
      0.25 * Math.exp(-(((ph - 0.36) * 70) ** 2)) +
      0.16 * Math.exp(-(((ph - 0.58) * 18) ** 2));
    pts.push(`${x},${(70 * 0.62 - v * 70 * 0.55).toFixed(1)}`);
  }
  return 'M' + pts.join('L');
}

function subject(c: Content): string {
  const stat = (label: string, attr: string, val: string) => `<div><p class="cap">${label}</p><p class="mono stat" ${attr}>${val}</p></div>`;
  return `<aside class="wing__in subject" aria-label="The subject">
<div class="subject__hub">
<div class="wing__head"><p class="wing__title" aria-hidden="true">SUBJECT</p><p class="cap wing__sub">Under augmentation</p></div>
<p class="cap subject__rec" aria-hidden="true">${dot()}Rec <span data-tc>00:00:00:00</span></p>
<div class="subject__aug" aria-hidden="true"><div class="row-between"><p class="cap">Augmentation</p><p class="mono subject__augv"><span data-aug>74.20</span>%</p></div><div class="meter"><span class="meter__fill" data-aug-bar></span></div></div>
<div class="subject__stats" aria-hidden="true">${stat('Halo', 'data-deg', '015°')}${stat('Cams in view', 'data-cams-of', '4/6')}</div>
${ekg('subject__ekg')}
${dateLoc(c, 'dateloc subject__dl')}
<div class="label subject__label"><p class="cap">On display</p><p class="label__title">${esc(c.piece.title)}</p><p class="label__meta">${isTBA(c.artist) ? '' : `${esc(c.artist)}, `}${esc(c.piece.year)}. ${esc(c.piece.medium)}.</p></div>
<div class="radar subject__radar" aria-hidden="true"><div class="radar__row"><svg viewBox="4 4 68 68" width="64" height="64"><circle cx="38" cy="38" r="29" class="radar__orbit"/><circle cx="38" cy="38" r="9" class="radar__head"/><path d="M38 68V72" class="radar__you"/>${c.channels.map((_, i) => `<circle class="radar__cam" data-radar="${i}" cx="38" cy="38" r="3"/>`).join('')}</svg><div><p class="cap">Her halo, from above</p><p class="mono radar__front">Front: cam <span data-front-num>01</span></p><p class="mono radar__name" data-front-name>Info</p></div></div>
<p class="radar__hint">Hover her to see what’s inside.</p><p class="cap">Click a camera to tune in</p></div>
<button class="btn btn--line subject__close" type="button" data-close>Close the case</button>
</div>
<div class="subject__ch">
<div class="row-between"><p class="cap">${dot()}Cam <span data-ch-num>01</span> · <span data-cam-state>On air</span></p><p class="mono subject__tc" aria-hidden="true"><span data-tc>00:00:00:00</span></p></div>
<div class="live" aria-hidden="true">${feedShot(-1, `<span class="hud"></span><span class="live__tag mono">CAM <span data-ch-num>01</span> · LIVE</span>`)}</div>
<a class="btn btn--solid" href="#halo"><svg viewBox="0 0 26 14" width="26" height="14" aria-hidden="true"><ellipse cx="13" cy="7" rx="11" ry="5"/></svg>Back to her halo</a>
<div class="subject__stats subject__stats--2" aria-hidden="true">${stat('Augmentation', 'data-aug-pct', '74.20%')}${stat('Halo', 'data-deg', '015°')}</div>
${ekg('subject__ekg subject__ekg--ch')}
${dateLoc(c, 'dateloc subject__dl')}
<p class="cap subject__turning" aria-hidden="true">Her halo, held on cam <span data-ch-num>01</span></p>
</div>
</aside>`;
}

function door(c: Content, side: 'l' | 'r'): string {
  const L = side === 'l';
  const dots = [90, 150, 210, 270, 330, 30]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(225 + 214 * Math.cos(r)).toFixed(1)}" cy="${(150 + 68 * Math.sin(r)).toFixed(1)}" r="${a === 90 ? 5 : 3.4}" class="${a === 90 ? 'orbit__live' : 'orbit__cam'}"/>`;
    })
    .join('');
  return `<div class="wing__out door door--${side}">
<span class="door__panel" aria-hidden="true"></span>
<div class="door__col" aria-hidden="true">
<p class="cap door__label">${L ? 'Creative' : 'Computing'}</p>
<div class="door__c3"><span class="door__c3art"></span><svg class="orbit" viewBox="0 0 450 270" preserveAspectRatio="none"><ellipse cx="225" cy="150" rx="214" ry="68"/>${dots}</svg></div>
<p class="door__word">${L ? 'SHOW' : 'CASE'}</p>
<div class="door__tape"><span class="cap">See what’s inside</span></div>
<p class="cap door__open"><span class="door__handle"></span><span class="door__open-t">${L ? '<span class="when-phone">Tap to</span><span class="when-desk">Click to</span>' : 'open'}</span></p>
<div class="door__dl">${capFor(L ? 'Date' : 'Location', L ? c.date : c.location)}<p class="big">${esc(L ? c.date : c.location)}</p></div>
</div>
</div>`;
}

function titleLines(ch: Channel, widths: Widths): string {
  return ch.title
    .map((line, i) => `<span class="tl tl--${i + 1}" style="--k:${fitFraction(line, widths).toFixed(4)}">${esc(line)}</span>`)
    .join('');
}

/** While the date or place is still her placeholder, say so in words. */
function comingSoon(c: Content): string {
  const d = isTBA(c.date);
  const l = isTBA(c.location);
  if (!d && !l) return '';
  const what = d && l ? 'The date and place are' : d ? 'The date is' : 'The place is';
  return `<p class="body body--dim">${what} coming soon, and will be posted here first.</p>\n`;
}

function channelBody(c: Content, ch: Channel, s: Scene): string {
  const [W, H] = s.size;
  switch (ch.id) {
    case 'info':
      return `<div class="dateloc dateloc--ch"><div>${capFor('Date', c.date)}${bigFor(c.date)}${isTBA(c.date) ? '' : maybeLink(c.calendarUrl, 'Add to calendar →')}</div><div>${capFor('Location', c.location)}${bigFor(c.location)}${isTBA(c.location) ? '' : maybeLink(c.mapUrl, 'Open in maps →')}</div></div>
${comingSoon(c)}<p class="body">${esc(c.about)}</p>
<a class="lk" href="#rsvp">RSVP on Ch 02 →</a>
${maybeLink(c.followUrl, `${esc(c.followLabel)} the showcase →`)}`;
    case 'rsvp':
      return `${c.rsvpUrl ? `<a class="rsvp" href="${esc(c.rsvpUrl)}" rel="noopener"><span class="rsvp__word">RSVP</span><span>Get on the list ${dot()}</span></a>` : `<p class="rsvp rsvp--soon"><span class="rsvp__word">RSVP</span><span>${esc(c.rsvpSoon)}</span></p>`}
<p class="cap ch__kicker">${c.rsvpUrl ? 'Then make your own poster' : 'While you wait, make your own poster'}</p>
<p class="body">Type your name. It goes into the small print and the red marks grow from it, so no two posters match.</p>
<div class="copy">
<div class="copy__form"><label class="cap copy__label" for="copy-name">Your name</label><input class="copy__input" id="copy-name" name="name" type="text" maxlength="18" autocomplete="given-name" spellcheck="false" value=""><button class="btn btn--line btn--light copy__save" type="button" data-save>Save my poster</button><p class="copy__status" role="status" data-copy-status></p></div>
<figure class="copy__card" aria-label="Your poster, with your name in the small print"><img src="${ART}her.webp" alt="" width="${W}" height="${H}" decoding="async"><span class="copy__title"></span><svg class="copy__marks" viewBox="0 0 150 243" preserveAspectRatio="none" aria-hidden="true" data-marks></svg><figcaption class="copy__foot"><span class="copy__name" data-copy-name>YOUR NAME</span><span class="copy__no">COPY <span data-copy-no>000000</span> · ${esc(c.date)}</span></figcaption></figure>
</div>`;
    case 'projects':
      return `<p class="body ch__teaser">${esc(c.projects.teaser)}</p>
<ol class="tiles">${Array.from({ length: c.projects.count }, (_, i) => `<li class="tile"><span class="tile__screen" aria-hidden="true"><span class="tile__no">${num(i)}</span>${i % 3 === 2 ? dot('tile__dot tile__dot--on') : dot('tile__dot')}</span><span class="tile__label">Booth ${num(i)}</span></li>`).join('')}</ol>`;
    case 'inside':
      return `<figure class="xray">
<div class="xray__box">
<svg class="xray__svg" viewBox="150 378 560 680" preserveAspectRatio="xMidYMid meet" role="img" aria-label="An X-ray of her: her drawing inverted, with machine parts drawn inside it: optics for eyes, a core chip, servos at the jaw, bellows for lungs, rib plates, a red pump for a heart, a spine bus and a power cell.">
<image data-xray x="0" y="0" width="${W}" height="${H}"/>${organs()}</svg>
<span class="hud" aria-hidden="true"></span><span class="scan scan--dark" aria-hidden="true"></span>
</div>
<figcaption class="cap xray__cap">Fig. 02 · The subject, X-ray. Parts labeled.</figcaption>
</figure>`;
    case 'source':
      return `<pre class="code" tabindex="0" aria-label="The code that turns her halo"><code>// every frame
θ += dt · 360 / 40
for (const cam of halo) {
  a = cam.base + θ
  x = cx + rx · cos a
  y = cy + ry · sin a
  behind = sin a &lt; 0
  scale = 0.8 + 0.24 · (sin a + 1) / 2
}</code></pre>
<p class="body">Hand-built: TypeScript, CSS 3D transforms and her painting. No frameworks, no WebGL. The X-ray is her drawing with its light and dark swapped.</p>
${maybeLink(c.sourceUrl, 'Read the code on GitHub →')}`;
    case 'credits':
      return `${capFor('Drawn by', c.artist)}${bigFor(c.artist, 'credit credit--big')}
<p class="cap ch__kicker">Built by</p><p class="credit">${esc(c.builtBy)}</p>
<p class="body body--dim">Type: Noto Serif Display, by Google. IBM Plex Mono and Sans, by Mike Abbink for IBM.</p>`;
    default:
      return '';
  }
}

function titleCard(c: Content, s: Scene, widths: Widths): string {
  const sections = c.channels
    .map(
      (ch, i) => `<section class="ch" id="ch-${ch.id}" data-ch="${ch.id}" aria-labelledby="ch-${ch.id}-t">
<h2 class="ch__title" id="ch-${ch.id}-t" tabindex="-1"><span class="vh">Channel ${num(i)}: ${esc(ch.name)}. </span>${titleLines(ch, widths)}</h2>
<span class="ch__rule" aria-hidden="true"></span>
<div class="ch__body">${channelBody(c, ch, s)}</div>
</section>`,
    )
    .join('');
  return `<div class="tc">
<div class="tc__top">
<p class="cap tc__route" aria-hidden="true">Cam <span data-ch-num>01</span> → Channel <span data-ch-num>01</span> of 06</p>
<p class="cap tc__air" aria-hidden="true">${dot()}On air <span data-tc>00:00:00:00</span></p>
<div class="tc__phone" aria-hidden="true"><p class="cap">Cam <span data-ch-num>01</span> → Channel <span data-ch-num>01</span></p><p class="tc__ch">CH.<span data-ch-num>01</span></p><span class="ch__rule"></span><p class="cap">Under augmentation</p><p class="mono tc__aug"><span data-aug>74.20</span>%</p><p class="cap">Halo held · <span data-deg>015°</span></p></div>
<div class="tc__feed" aria-hidden="true">${feedShot(-1, '<span class="hud"></span><span class="live__tag mono">CAM <span data-ch-num>01</span> · LIVE</span>')}</div>
</div>
<div class="tc__scroll">${sections}</div>
<div class="tc__foot">
<a class="lk tc__back" href="#halo"><span><span aria-hidden="true">↺ </span>Back to her halo</span></a>
<a class="lk tc__next" href="#info" data-next><span><span class="tc__next-k">Next: </span>Ch <span data-next-num>02</span> <span data-next-name>RSVP</span> <span aria-hidden="true">→</span></span></a>
</div>
<span class="tc__flash" aria-hidden="true"></span>
</div>`;
}

export function renderCase(c: Content, s: Scene, widths: Widths): string {
  return `<header class="bar">
<p class="cap bar__name">C3 Showcase</p>
<p class="cap bar__status" aria-hidden="true">${dot()}<span data-status>Sealed</span></p>
${c.followUrl ? `<a class="cap bar__rsvp bar__follow" href="${esc(c.followUrl)}" rel="noopener">${esc(c.followLabel)}</a>` : ''}<a class="cap bar__rsvp" href="#rsvp">RSVP</a>
</header>
<main class="case" id="case" data-state="sealed" data-view="hub" data-channel="info">
<script>/* Before first paint: open on a channel from the URL, or open if this visit already opened the case. */(function(m){var h=location.hash.slice(1);var ids=${JSON.stringify(c.channels.map((ch) => ch.id))};try{if(sessionStorage.getItem('c3.open')==='1')m.dataset.state='open';}catch(e){}if(ids.indexOf(h)>=0){m.dataset.state='open';m.dataset.view='channel';m.dataset.channel=h;}})(document.currentScript.parentNode);</script>
<h1 class="vh">C3 Showcase: the Creative Computing class showcase. Date ${isTBA(c.date) ? 'to be announced' : esc(c.date)}. Location ${isTBA(c.location) ? 'to be announced' : esc(c.location)}.</h1>
<div class="frame" aria-hidden="true"><span class="frame__ruler frame__ruler--l"></span><span class="frame__ruler frame__ruler--r"></span><p class="cap frame__cap frame__cap--l">C3 Showcase · Specimen 01 · On display</p><p class="cap frame__cap frame__cap--r">Rec <span data-tc>00:00:00:00</span> · Halo <span data-deg>015°</span> · Augmentation <span data-aug>74.20</span>%</p><span class="frame__hinge frame__hinge--lt"></span><span class="frame__hinge frame__hinge--lb"></span><span class="frame__hinge frame__hinge--rt"></span><span class="frame__hinge frame__hinge--rb"></span></div>
<div class="wing wing--l">
${feeds(c)}
${door(c, 'l')}
</div>
<div class="panel">
<div class="face face--front">
<div class="card" data-card>
<div class="card__view">${stage(c, s)}</div>
${lensRing()}
<span class="card__ruler" aria-hidden="true"></span>
<div class="card__band-label" aria-hidden="true"><p class="cap">${dot()}X-ray</p><p class="cap">Depth <span data-depth>55</span> mm</p></div>
${dateLoc(c, 'dateloc card__plate')}
</div>
<div class="sheet">
<div class="sheet__aug" aria-hidden="true"><div class="row-between"><p class="cap">Augmentation</p><p class="mono"><span data-aug>74.20</span>%</p></div><div class="meter"><span class="meter__fill" data-aug-bar></span></div></div>
<p class="sheet__hint" data-hint>Tap a camera to tune in. Press and hold her picture to see inside.</p>
${keys(c)}
</div>
</div>
<div class="face face--back">
${titleCard(c, s, widths)}
</div>
</div>
<div class="wing wing--r">
${subject(c)}
${door(c, 'r')}
</div>
<button class="seal" type="button" data-open>Open the case: see what’s inside</button>
</main>`;
}
