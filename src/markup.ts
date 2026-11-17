// Renders the page body at build time (scripts/vite/case-html.ts), so the first
// paint has every word and image in place and nothing shifts when main.ts boots.
// One DOM serves both layouts: CSS turns it into the desktop case (doors either
// side of her) or the phone case (her card, channel keys, door leaves over her).

import { CAM_BOX, type Halo } from './halo.ts';
import { fitFraction, type Widths } from './fit.ts';
import { googleCalendarUrl, type EventInfo } from './event.ts';
import { organs } from './organs.ts';

export interface Channel {
  id: string;
  name: string;
  desc: string;
  title: [string, string];
}

export interface Project {
  title: string;
  by?: string;
  url?: string;
}

export interface Content extends EventInfo {
  pageTitle: string;
  /** Her poster's short form, shown big: 12.03.26 */
  date: string;
  /** "Thursday, December 3" */
  dateLong: string;
  /** With the year, for the page heading and screen readers. */
  dateSpoken: string;
  time: string;
  /** A short line under the location on the doors, as on her poster: "Meadows". */
  area: string;
  /** The other rooms the show spills into. */
  rooms: string;
  mapUrl: string;
  about: string;
  rsvpUrl: string;
  followUrl: string;
  followLabel: string;
  artist: string;
  builtBy: string;
  work: { kinds: string[]; projects: Project[] };
  channels: Channel[];
}

/** A piece of her that moves (a wing): cut out by `npm run art`, turned by CSS. */
export interface Part {
  id: string;
  box: [number, number, number, number];
  root: [[number, number], [number, number]];
  swing: [number, number];
  seconds: number;
  delay: number;
}

export interface Scene {
  size: [number, number];
  halo: Halo;
  front: { x: number; y: number; w: number; h: number };
  title: { x: number; y: number; w: number; h: number };
  parts: { list: Part[] };
  face: { x: number; y: number };
  chest: { x: number; y: number };
}

const ART = '/src/art/';
/** Her poster with the event details, and the calendar file: both sit beside index.html. */
export const POSTER_FILE = 'c3-showcase-poster.webp';
export const ICS_FILE = 'c3-showcase.ics';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const num = (i: number) => String(i + 1).padStart(2, '0');
const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/** True while a value is still her placeholder ("0.0.0") or empty. */
export const isTBA = (v: string) => !v.trim() || v.trim() === '0.0.0';

/** A link out of the site: a new tab, and no handle back to this one. */
const out = (url: string, text: string, cls: string) => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${text}<span class="vh"> (opens in a new tab)</span></a>`;

/** What the "come along" action is called: RSVP once there is somewhere to RSVP. */
const attendLabel = (c: Content) => (c.rsvpUrl ? 'RSVP' : 'Save the date');

function stage(c: Content, s: Scene): string {
  const [W, H] = s.size;
  const cams = c.channels
    .map((ch, i) => `<a class="cam" href="#${ch.id}" data-cam="${i}" tabindex="-1" aria-hidden="true" style="width:${CAM_BOX.w}px;height:${CAM_BOX.h}px"><span class="cam__tag">${num(i)}</span></a>`)
    .join('');
  const F = s.front;
  const at = (p: Part) => `left:${p.box[0]}px;top:${p.box[1]}px`;
  const size = (p: Part) => `width="${p.box[2]}" height="${p.box[3]}" alt="" draggable="false" decoding="async"`;
  // What shows where a piece has moved aside, then (above the back of the halo) the pieces.
  const unders = s.parts.list.map((p) => `<img class="under" src="${ART}under-${p.id}.webp" ${size(p)} style="${at(p)}">`).join('');
  const parts = s.parts.list
    .map((p) => {
      // It turns about the middle of the line where it joins her.
      const pivot = [(p.root[0][0] + p.root[1][0]) / 2 - p.box[0], (p.root[0][1] + p.root[1][1]) / 2 - p.box[1]];
      return `<img class="part" src="${ART}part-${p.id}.webp" ${size(p)} style="${at(p)};transform-origin:${pivot[0]}px ${pivot[1]}px;--from:${p.swing[0]}deg;--to:${p.swing[1]}deg;--beat:${p.seconds}s;--lag:${p.delay}s">`;
    })
    .join('');
  return `<div class="stage" data-stage style="width:${W}px;height:${H}px">
<img class="stage__her" src="${ART}her.webp" alt="Her poster art, framed in silver on a night-blue ground under the C3 Showcase title: a red-haired girl with small white wings, hands pressed together in prayer and a small ring held at them, in a great ruffled cream dress. Above her head turns a halo of ${countWord(c.channels.length).toLowerCase()} cameras, each hung on a wire and pointed at her." width="${W}" height="${H}" fetchpriority="high" draggable="false">
${unders}
<canvas class="rig rig--back" aria-hidden="true"></canvas>
${cams}
<div class="stage__occ" aria-hidden="true"></div>
${parts}
<canvas class="rig rig--front" aria-hidden="true"></canvas>
<img class="stage__front" src="${ART}front.webp" alt="" width="${F.w}" height="${F.h}" style="left:${F.x}px;top:${F.y}px" draggable="false" decoding="async">
<span class="glint" aria-hidden="true" style="left:${s.title.x}px;top:${s.title.y}px;width:${s.title.w}px;height:${s.title.h}px;--mx:${F.x - s.title.x}px;--my:${F.y - s.title.y}px;--mw:${F.w}px;--mh:${F.h}px"></span>
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
  return `<svg class="lens" viewBox="0 0 240 240" width="240" height="240" aria-hidden="true" focusable="false"><circle cx="120" cy="120" r="104" class="lens__edge"/><circle cx="120" cy="120" r="100.5" class="lens__glint"/><path d="${ticks}" class="lens__ticks"/></svg>`;
}

/** A camera's view: a crop of her painting, or static while the camera is behind her head. */
function feedShot(i: number): string {
  return `<span class="shot" data-shot="${i}" aria-hidden="true"><span class="shot__img"></span><span class="scan"></span><span class="shot__ns"></span></span>`;
}

function feeds(c: Content): string {
  const rows = c.channels
    .map(
      (ch, i) => `<li><a class="feed" href="#${ch.id}" data-feed="${i}">${feedShot(i)}<span class="feed__txt"><span class="feed__num" aria-hidden="true">${num(i)}</span><span class="feed__name">${esc(ch.name)}</span><span class="feed__desc">${esc(ch.desc)}</span></span></a></li>`,
    )
    .join('');
  return `<nav class="wing__in feeds" aria-label="Channels">
<div class="wing__head"><p class="wing__title" aria-hidden="true">CHANNELS</p><p class="wing__sub">${countWord(c.channels.length)} cameras on her halo. Pick one.</p></div>
<ol class="feeds__list">${rows}</ol>
</nav>`;
}

function keys(c: Content): string {
  const rows = c.channels
    .map((ch, i) => `<li><a class="key" href="#${ch.id}" data-key="${i}">${feedShot(i)}<span class="key__txt"><span class="key__num" aria-hidden="true">${num(i)}</span><span class="vh">${esc(ch.name)}: </span>${esc(ch.desc)}</span></a></li>`)
    .join('');
  return `<nav class="keys" aria-label="Channels"><ol>${rows}</ol></nav>`;
}

/** The countdown line: empty until main.ts fills it, with its height already kept. */
const count = (cls: string) => `<p class="count ${cls}"><i class="dot" aria-hidden="true"></i><span data-count></span></p>`;

/** Desktop, right door: the event itself, always in view. */
function eventPanel(c: Content): string {
  return `<aside class="wing__in event" aria-label="The showcase">
<div class="wing__head"><p class="wing__title">${esc(c.date)}</p><p class="wing__sub">${esc(c.dateLong)}</p><p class="event__time">${esc(c.time)}</p></div>
${count('event__count')}
<div class="event__where"><p class="cap">Where</p><p class="event__place">${esc(c.location)}</p><p class="event__venue">${esc(c.venue)}</p></div>
<div class="event__acts"><a class="btn btn--solid" href="#attend">${attendLabel(c)}</a>${c.mapUrl ? out(c.mapUrl, 'Open in maps', 'btn btn--line') : ''}</div>
<p class="event__about">${esc(c.about)}</p>
<p class="event__hint">Click a camera to tune in. Hover her to see what’s inside.</p>
<div class="event__foot"><button class="btn btn--line event__close" type="button" data-close>Close the case</button></div>
</aside>`;
}

function door(c: Content, side: 'l' | 'r'): string {
  const L = side === 'l';
  return `<div class="wing__out door door--${side}">
<span class="door__panel" aria-hidden="true"></span>
<div class="door__col" aria-hidden="true">
<p class="cap door__label">${L ? 'Creative' : 'Computing'}</p>
<div class="door__c3"><img class="door__c3art" src="${ART}mark.webp" alt="" width="293" height="221" decoding="async"></div>
<img class="door__word" src="${ART}word-${side}.webp" alt="" width="${L ? 316 : 290}" height="144" decoding="async">
<div class="door__tape"><span class="cap"><span class="when-phone">Tap</span><span class="when-desk">Click</span> to see what’s inside</span></div>
<span class="door__handle"></span>
<div class="door__dl"><p class="cap">${L ? 'When' : 'Where'}</p><p class="big">${esc(L ? c.date : c.location)}</p><p class="dl__note">${esc(L ? c.time : c.area)}</p></div>
</div>
</div>`;
}

function titleLines(ch: Channel, widths: Widths): string {
  return ch.title.map((line, i) => `<span class="tl tl--${i + 1}" style="--k:${fitFraction(line, widths).toFixed(4)}">${esc(line)}</span>`).join('');
}

/** When and where, side by side: the two facts everything else hangs off. */
function whenWhere(c: Content): string {
  return `<div class="dateloc dateloc--ch">
<div><p class="cap">When</p><p class="big">${esc(c.date)}</p><p class="dl__note">${esc(c.dateLong)}<br>${esc(c.time)}</p></div>
<div><p class="cap">Where</p><p class="big big--long">${esc(c.location)}</p><p class="dl__note">${esc(c.venue)}${c.rooms ? `<br>Also in the ${esc(c.rooms)}` : ''}</p></div>
</div>`;
}

function channelBody(c: Content, ch: Channel): string {
  switch (ch.id) {
    case 'info':
      return `${whenWhere(c)}
${count('ch__count')}
<p class="body">${esc(c.about)}</p>
<div class="acts"><a class="btn btn--solid" href="#attend">${attendLabel(c)}</a>${c.mapUrl ? out(c.mapUrl, 'Open in maps', 'btn btn--line') : ''}</div>
<p class="body body--dim">${esc(c.address)}</p>`;
    case 'attend':
      return `${c.rsvpUrl ? `${out(c.rsvpUrl, 'RSVP', 'btn btn--solid btn--big')}\n` : ''}<p class="body">${esc(c.dateLong)}, ${esc(c.time)}, in the ${esc(c.location)}. Put it in your calendar so it can’t slip by.</p>
<div class="acts acts--stack">
${out(googleCalendarUrl(c), 'Add to Google Calendar', `btn ${c.rsvpUrl ? 'btn--line' : 'btn--solid'}`)}
<a class="btn btn--line" href="${ICS_FILE}">Add to Apple Calendar or Outlook</a>
<button class="btn btn--line" type="button" data-share>Send it to a friend</button>
</div>
<p class="status" role="status" data-share-status></p>${c.followUrl ? `\n${out(c.followUrl, `${esc(c.followLabel)} the showcase`, 'lk')}` : ''}`;
    case 'work': {
      const projects = c.work.projects
        .map((p) => `<li>${p.url ? out(p.url, esc(p.title), 'projects__title') : `<span class="projects__title">${esc(p.title)}</span>`}${p.by ? `<span class="projects__by">${esc(p.by)}</span>` : ''}</li>`)
        .join('');
      return `<p class="body">${esc(c.about)}</p>
<ul class="kinds">${c.work.kinds.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>${projects ? `\n<ol class="projects">${projects}</ol>` : ''}
<p class="body body--dim">Made by students in Creative Computing at ${esc(c.venue)}.</p>`;
    }
    case 'poster':
      return `<div class="poster">
<img class="poster__img" src="/${POSTER_FILE}" alt="The printed poster: her painting under the C3 Showcase title, with ${esc(c.date)}, ${esc(c.time)} and ${esc(c.location)}, ${esc(c.area)} lettered over it." width="853" height="1280" loading="lazy" decoding="async">
<div class="poster__txt">
${isTBA(c.artist) ? '' : `<p class="cap">Poster art by</p><p class="credit">${esc(c.artist)}</p>\n`}<a class="btn btn--solid" href="${POSTER_FILE}" download>Download the poster</a>
<p class="cap ch__kicker">Site by</p><p class="credit">${esc(c.builtBy)}</p>
</div>
</div>`;
    default:
      return '';
  }
}

function titleCard(c: Content, widths: Widths): string {
  const n = c.channels.length;
  const sections = c.channels
    .map(
      (ch, i) => `<section class="ch" id="ch-${ch.id}" data-ch="${ch.id}" aria-labelledby="ch-${ch.id}-t">
<h2 class="ch__title" id="ch-${ch.id}-t" tabindex="-1"><span class="vh">Channel ${i + 1} of ${n}: ${esc(ch.name)}. </span>${titleLines(ch, widths)}</h2>
<span class="ch__rule" aria-hidden="true"></span>
<div class="ch__body">${channelBody(c, ch)}</div>
</section>`,
    )
    .join('');
  return `<div class="tc">
<p class="cap tc__top" aria-hidden="true"><i class="dot"></i>Channel <span data-ch-num>01</span> of ${String(n).padStart(2, '0')}</p>
<div class="tc__scroll">${sections}</div>
<div class="tc__foot">
<a class="btn btn--line tc__back" href="#halo">Back to her halo</a>
<a class="btn btn--solid tc__next" href="#${c.channels[1 % n]!.id}" data-next><span class="tc__next-k">Next: </span><span data-next-name>${esc(c.channels[1 % n]!.name)}</span><span aria-hidden="true"> →</span></a>
</div>
<span class="tc__flash" aria-hidden="true"></span>
</div>`;
}

export function renderCase(c: Content, s: Scene, widths: Widths): string {
  return `<header class="bar">
<p class="bar__name">C3 Showcase</p>
${c.followUrl ? `${out(c.followUrl, esc(c.followLabel), 'bar__cta bar__follow')}` : ''}<a class="bar__cta" href="#attend">${attendLabel(c)}</a>
</header>
<main class="case" id="case" data-state="sealed" data-view="hub" data-channel="${c.channels[0]!.id}" data-shown="${c.channels[0]!.id}">
<script>/* Before first paint: open on a channel from the URL, or open if this visit already opened the case. */(function(m){var h=location.hash.slice(1);var ids=${JSON.stringify(c.channels.map((ch) => ch.id))};try{if(sessionStorage.getItem('c3.open')==='1')m.dataset.state='open';}catch(e){}if(ids.indexOf(h)>=0){m.dataset.state='open';m.dataset.view='channel';m.dataset.channel=m.dataset.shown=h;}})(document.currentScript.parentNode);</script>
<h1 class="vh">${esc(c.title)}: ${esc(c.tagline.replace(/^The /, 'the '))}. ${esc(c.dateSpoken)}, ${esc(c.time)}. ${esc(c.location)}, ${esc(c.venue)}.</h1>
<div class="frame" aria-hidden="true"><span class="frame__ruler frame__ruler--l"></span><span class="frame__ruler frame__ruler--r"></span><p class="cap frame__cap frame__cap--l">${esc(c.title)} · Creative Computing · SMU Meadows</p><p class="cap frame__cap frame__cap--r">${esc(c.date)} · ${esc(c.time)} · ${esc(c.location)}</p><span class="frame__hinge frame__hinge--lt"></span><span class="frame__hinge frame__hinge--lb"></span><span class="frame__hinge frame__hinge--rt"></span><span class="frame__hinge frame__hinge--rb"></span></div>
<div class="wing wing--l">
${feeds(c)}
${door(c, 'l')}
</div>
<div class="panel">
<div class="face face--front">
<div class="card" data-card>
<div class="card__view">${stage(c, s)}</div>
${lensRing()}
</div>
<div class="sheet">
<div class="dateloc sheet__when"><div><p class="big">${esc(c.date)}</p><p class="dl__note">${esc(c.time)}</p></div><div><p class="big big--long">${esc(c.location)}</p><p class="dl__note">${esc(c.area)}</p></div></div>
${count('sheet__count')}
<p class="sheet__hint" data-hint>Tap a camera to tune in. Press and hold her picture to see inside.</p>
${keys(c)}
</div>
</div>
<div class="face face--back">
${titleCard(c, widths)}
</div>
</div>
<div class="wing wing--r">
${eventPanel(c)}
${door(c, 'r')}
</div>
<button class="seal" type="button" data-open>Open the case: see what’s inside</button>
</main>`;
}
