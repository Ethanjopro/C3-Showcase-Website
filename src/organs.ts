// What the X-ray finds inside her: our own drawing, in her painting's pixels
// (853 x 1280), laid over a ghost of her outline. A machine built like a body:
// optics behind her eyes, a core, a stack of spine plates with ribs hung off it,
// bellows for lungs, a red pump for a heart, and under the dress the mount she
// stands on. Moving parts are animated in CSS (stage.css: .o-pump, .o-blades,
// .o-bellows, .o-optic) and hold still under reduced motion.

const LINE = '#ECE6D6';
const RED = '#D24A50';
const MID = 425; // her centre line

const f = (n: number) => String(Math.round(n * 10) / 10);

/** The spine: a stack of plates from her neck to her hips, each with a stub either side. */
function spine(): string {
  let g = '';
  for (let i = 0; i < 11; i++) {
    const y = 700 + i * 30;
    g += `<rect x="${MID - 12}" y="${y}" width="24" height="22" rx="4"/><path d="M${MID - 19} ${y + 11}H${MID - 12}M${MID + 12} ${y + 11}H${MID + 19}"/>`;
  }
  return g;
}

/** Six pairs of ribs hung off the spine, shorter toward the waist, each ending in a rivet. */
function ribs(): string {
  let g = '';
  for (let i = 0; i < 6; i++) {
    const y = 742 + i * 26;
    const k = 1 - i * 0.07;
    for (const s of [-1, 1]) {
      const tip = MID + s * 98 * k;
      g +=
        `<path d="M${MID + s * 12} ${y}C${f(MID + s * 44 * k)} ${y - 12} ${f(tip - s * 8)} ${y - 4} ${f(tip)} ${y + 28}"/>` +
        `<path d="M${MID + s * 12} ${y + 7}C${f(MID + s * 41 * k)} ${y - 4} ${f(tip - s * 12)} ${y + 4} ${f(tip - s * 6)} ${y + 31}" opacity=".45"/>` +
        `<circle cx="${f(tip - s * 14)}" cy="${y + 8}" r="2.4" fill="${LINE}" stroke="none"/>`;
    }
  }
  return g;
}

/** One bellows: a rounded can with pleats. */
const bellows = (x: number) =>
  `<rect x="${x}" y="740" width="58" height="128" rx="14"/><path d="${Array.from({ length: 7 }, (_, j) => `M${x + 4} ${756 + 16 * j}H${x + 54}`).join('')}" opacity=".45"/>`;

/** Under the dress: the hip ring, the column she stands on, its legs, and two slack cables. */
function mount(): string {
  const collars = [1078, 1138, 1198, 1258].map((y) => `<path d="M${MID - 26} ${y}H${MID + 26}"/>`).join('');
  const legs = [-1, 1]
    .map((s) => `<path d="M${MID + s * 18} 1052L${MID + s * 210} 1262M${MID + s * 18} 1052L${MID + s * 112} 1280"/><circle cx="${MID + s * 210}" cy="1262" r="7"/><path d="M${MID + s * 110} 1160L${MID + s * 61} 1166" opacity=".45"/>`)
    .join('');
  const cables = [-1, 1].map((s) => `<path d="M${MID + s * 62} 968C${MID + s * 150} 1010 ${MID + s * 190} 1120 ${MID + s * 140} 1196" opacity=".45" stroke-dasharray="2 7"/>`).join('');
  return `<ellipse cx="${MID}" cy="964" rx="72" ry="20"/><ellipse cx="${MID}" cy="964" rx="54" ry="13" opacity=".45"/>
<rect x="${MID - 27}" y="1000" width="54" height="32" rx="4"/><path d="M${MID + 27} 1008V1024M${MID - 19} 1016H${MID - 5}M${MID - 12} 1009V1023M${MID + 5} 1016H${MID + 19}"/>
<path d="M${MID - 18} 1032V1280M${MID + 18} 1032V1280"/>${collars}${legs}${cables}`;
}

const HEX = '0,-7 6,-3.5 6,3.5 0,7 -6,3.5 -6,-3.5';
const BLADES = Array.from({ length: 6 }, (_, a) => `M0 0L${f(17 * Math.cos((a * Math.PI) / 3))} ${f(17 * Math.sin((a * Math.PI) / 3))}`).join('');

/** The few parts worth naming, each with a short leader line. */
export const LABELS: { x: number; y: number; text: string; anchor: 'start' | 'end'; lead: string }[] = [
  { x: 536, y: 556, text: 'OPTICS', anchor: 'start', lead: 'M498 566L532 558' },
  { x: 316, y: 524, text: 'CORE', anchor: 'end', lead: 'M398 524L320 524' },
  { x: 512, y: 790, text: 'PUMP', anchor: 'start', lead: 'M476 792L508 788' },
  { x: 300, y: 772, text: 'BELLOWS', anchor: 'end', lead: 'M338 780L304 776' },
  { x: 548, y: 906, text: 'SPINE', anchor: 'start', lead: 'M438 905L544 904' },
  { x: 312, y: 1022, text: 'CELL', anchor: 'end', lead: 'M398 1016L316 1018' },
  { x: 560, y: 1150, text: 'MOUNT', anchor: 'start', lead: 'M444 1138L556 1146' },
];

/** The drawing as SVG children (no <svg> wrapper), so the caller chooses the viewport. */
export function organs(): string {
  return `<g fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M420 642C400 560 340 440 300 352" opacity=".45"/>
<ellipse cx="${MID}" cy="540" rx="96" ry="114" stroke-dasharray="4 6" opacity=".45"/>
<rect x="399" y="506" width="52" height="32" rx="3"/>
<path d="M407 506V498M417 506V498M427 506V498M437 506V498M407 538V546M417 538V546M427 538V546M437 538V546M399 514H378V500M399 528H370M451 514H472V500M451 528H480" opacity=".7"/>
<circle cx="378" cy="578" r="15"/><circle cx="482" cy="572" r="15"/>
<g transform="translate(378 578)"><polygon class="o-optic" points="${HEX}"/></g>
<g transform="translate(482 572)"><polygon class="o-optic o-optic--b" points="${HEX}"/></g>
<path d="M393 576H467" stroke-dasharray="3 4" opacity=".7"/>
<circle cx="352" cy="620" r="6"/><circle cx="498" cy="614" r="6"/><path d="M356 614L392 546M494 608L458 546" opacity=".45"/>
<path d="M416 640V700M${MID} 636V700M434 640V700"/>
<circle cx="414" cy="652" r="4.5"/><circle cx="436" cy="652" r="4.5"/><circle cx="414" cy="670" r="4.5"/><circle cx="436" cy="670" r="4.5"/><circle cx="418" cy="688" r="4.5"/><circle cx="432" cy="688" r="4.5"/>
<g class="o-bellows">${bellows(338)}${bellows(454)}</g>
${spine()}
${ribs()}
<path d="M348 744L306 822M356 748L314 826M502 744L544 822M494 748L536 826"/>
<circle cx="352" cy="746" r="7"/><circle cx="310" cy="824" r="7"/><circle cx="498" cy="746" r="7"/><circle cx="540" cy="824" r="7"/>
${mount()}
</g>
<g fill="none" stroke="${RED}" stroke-width="3" stroke-linecap="round"><path d="M430 642C452 560 512 440 556 350"/><path d="M452 770C452 732 440 714 432 700"/><path d="M428 792H437"/></g>
<g transform="translate(452 792)"><g class="o-pump"><circle r="22" fill="rgba(210,74,80,.22)" stroke="${RED}" stroke-width="3"/><g class="o-blades"><path d="${BLADES}" stroke="${RED}" stroke-width="2.6"/></g><circle r="4" fill="${RED}"/></g></g>
<g fill="none" stroke="${LINE}" stroke-width="1.2" opacity=".7">${LABELS.map((l) => `<path d="${l.lead}"/>`).join('')}</g>
<g class="o-labels" fill="${LINE}">${LABELS.map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}">${l.text}</text>`).join('')}</g>`;
}
