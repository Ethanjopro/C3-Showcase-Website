// The machine parts drawn over her X-ray, in her painting's pixels (853 x 1280).
// A placeholder until she draws the inside (OWNER.md). Moving parts are animated
// in CSS (channels.css: .o-pump, .o-blades, .o-bellows, .o-optic), and stop
// under reduced motion.

const LINE = '#EEEAEE';
const RED = '#E0233F';

const f = (n: number) => String(Math.round(n * 10) / 10);

function ribs(): string {
  let g = '';
  for (let i = 0; i < 11; i++) {
    const y = 700 + i * 30;
    g += `<rect x="413" y="${y}" width="24" height="22" rx="4"/><path d="M406 ${y + 11}H413M437 ${y + 11}H444"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const y = 742 + i * 26;
    const k = 1 - i * 0.07;
    const lx = 425 - 98 * k;
    const rx = 425 + 98 * k;
    g +=
      `<path d="M413 ${y}C${f(425 - 44 * k)} ${y - 12} ${f(lx + 8)} ${y - 4} ${f(lx)} ${y + 28}"/>` +
      `<path d="M413 ${y + 7}C${f(425 - 41 * k)} ${y - 4} ${f(lx + 12)} ${y + 4} ${f(lx + 6)} ${y + 31}" opacity=".5"/>` +
      `<path d="M437 ${y}C${f(425 + 44 * k)} ${y - 12} ${f(rx - 8)} ${y - 4} ${f(rx)} ${y + 28}"/>` +
      `<path d="M437 ${y + 7}C${f(425 + 41 * k)} ${y - 4} ${f(rx - 12)} ${y + 4} ${f(rx - 6)} ${y + 31}" opacity=".5"/>` +
      `<circle cx="${f(lx + 14)}" cy="${y + 8}" r="2.4" fill="${LINE}"/><circle cx="${f(rx - 14)}" cy="${y + 8}" r="2.4" fill="${LINE}"/>`;
  }
  return g;
}

const accordion = (x: number) => Array.from({ length: 7 }, (_, j) => `M${x + 4} ${740 + 16 * (j + 1)}H${x + 54}`).join('');
const HEX = '0,-7 6,-3.5 6,3.5 0,7 -6,3.5 -6,-3.5';
const BLADES = Array.from({ length: 6 }, (_, a) => `M0 0L${f(17 * Math.cos((a * Math.PI) / 3))} ${f(17 * Math.sin((a * Math.PI) / 3))}`).join('');

export const LABELS: { x: number; y: number; text: string; anchor: 'start' | 'end'; lead: string }[] = [
  { x: 530, y: 552, text: 'OPTIC ×2', anchor: 'start', lead: 'M496 566L526 556' },
  { x: 482, y: 466, text: 'CORE', anchor: 'start', lead: 'M452 494L478 472' },
  { x: 548, y: 404, text: 'HALO UPLINK', anchor: 'start', lead: 'M512 432L544 410' },
  { x: 512, y: 790, text: 'PUMP · 72 BPM', anchor: 'start', lead: 'M476 792L508 788' },
  { x: 300, y: 772, text: 'BELLOWS', anchor: 'end', lead: 'M340 780L304 776' },
  { x: 300, y: 652, text: 'SERVO ×6', anchor: 'end', lead: 'M410 664L304 656' },
  { x: 548, y: 878, text: 'RIB PLATES', anchor: 'start', lead: 'M516 866L544 874' },
  { x: 300, y: 902, text: 'SPINE BUS', anchor: 'end', lead: 'M413 905L304 902' },
  { x: 330, y: 1022, text: 'CELL', anchor: 'end', lead: 'M398 1016L334 1018' },
];

/** The parts as SVG children (no <svg> wrapper), so callers choose the viewport. */
export function organs(): string {
  return `<g fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round">
<path d="M420 642C400 560 340 440 300 352"/>
<ellipse cx="425" cy="540" rx="96" ry="114" stroke-dasharray="4 6" opacity=".5"/>
<rect x="399" y="478" width="52" height="32" rx="3"/>
<path d="M407 478V470M417 478V470M427 478V470M437 478V470M407 510V518M417 510V518M427 510V518M437 510V518M399 486H378V470M399 500H370M451 486H472V470M451 500H480"/>
<circle cx="378" cy="574" r="15"/><circle cx="482" cy="568" r="15"/>
<g transform="translate(378 574)"><polygon class="o-optic" points="${HEX}"/></g>
<g transform="translate(482 568)"><polygon class="o-optic o-optic--b" points="${HEX}"/></g>
<path d="M393 572H467" stroke-dasharray="3 4"/>
<circle cx="352" cy="618" r="6"/><circle cx="498" cy="612" r="6"/><path d="M356 612L400 510M494 606L450 510" opacity=".45"/>
<path d="M416 640V700M425 636V700M434 640V700"/>
<g class="o-bellows"><rect x="338" y="740" width="58" height="128" rx="14"/><path d="${accordion(338)}" opacity=".5"/><rect x="454" y="740" width="58" height="128" rx="14"/><path d="${accordion(454)}" opacity=".5"/></g>
${ribs()}
<path d="M348 744L306 822M356 748L314 826M502 744L544 822M494 748L536 826"/>
<circle cx="352" cy="746" r="7"/><circle cx="310" cy="824" r="7"/><circle cx="498" cy="746" r="7"/><circle cx="540" cy="824" r="7"/>
<circle cx="414" cy="652" r="4.5"/><circle cx="436" cy="652" r="4.5"/><circle cx="414" cy="670" r="4.5"/><circle cx="436" cy="670" r="4.5"/><circle cx="418" cy="688" r="4.5"/><circle cx="432" cy="688" r="4.5"/>
<rect x="398" y="1000" width="54" height="32" rx="4"/><path d="M452 1008V1024M406 1016H420M413 1009V1023M430 1016H444"/>
</g>
<g fill="none" stroke="${RED}" stroke-width="3" stroke-linecap="round"><path d="M430 642C452 560 512 440 556 350"/><path d="M452 770C452 732 440 714 432 700"/><path d="M428 792H437"/></g>
<g transform="translate(452 792)"><g class="o-pump"><circle r="22" fill="rgba(224,35,63,.22)" stroke="${RED}" stroke-width="3"/><g class="o-blades"><path d="${BLADES}" stroke="${RED}" stroke-width="2.6"/></g><circle r="4" fill="${RED}"/></g></g>
<g fill="none" stroke="${LINE}" stroke-width="1.2" opacity=".8">${LABELS.map((l) => `<path d="${l.lead}"/>`).join('')}</g>
<g class="o-labels" fill="${LINE}">${LABELS.map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}">${l.text}</text>`).join('')}</g>`;
}
