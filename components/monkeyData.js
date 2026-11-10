// Plush-monkey mascot: pure-JS SVG builder + catalog of dress-up items.
// A "look" is a small JSON object saved with the user's data:
//   { name, fur, hat, eyes, neck, outfit, shoes, held }   (every slot optional)

const K = "#2A1A10";
const MINT = "#7CF0B8";

export const FUR = {
  Cocoa: { f1: "#D79A6C", f2: "#8A5A3A", m1: "#FFF1DA", m2: "#E5C79B", inner: "#E7B58E", nose: "#8A5A3A" },
  Caramel: { f1: "#E8B07A", f2: "#B07240", m1: "#FFF1DA", m2: "#E5C79B", inner: "#E7B58E", nose: "#8A5A3A" },
  Charcoal: { f1: "#7A808A", f2: "#3B4048", m1: "#E8EAEE", m2: "#BFC4CC", inner: "#A9AEB8", nose: "#2A2F36" },
  Cream: { f1: "#F7E9CC", f2: "#D8BE8F", m1: "#FFFFFF", m2: "#F0E0C2", inner: "#F2C9B0", nose: "#B98F63" },
  Golden: { f1: "#F6C860", f2: "#C98A22", m1: "#FFF6DC", m2: "#F0D79A", inner: "#F4C990", nose: "#A8691A" },
  Mint: { f1: "#9FF0CC", f2: "#3FA77C", m1: "#F2FFF8", m2: "#BDEAD3", inner: "#7CD6AA", nose: "#2F7E5C" },
  Rose: { f1: "#F6B6C4", f2: "#C9667F", m1: "#FFF4F6", m2: "#F2D2D9", inner: "#F9D0D8", nose: "#A8445E" },
};

const flower = (() => {
  let s = '<g transform="translate(86 32)">';
  for (let i = 0; i < 5; i++) s += `<circle cx="${(6 * Math.cos(i * 1.2566)).toFixed(1)}" cy="${(6 * Math.sin(i * 1.2566)).toFixed(1)}" r="4.6" fill="#FF8FC7"/>`;
  return s + '<circle r="3.4" fill="#FFD84D"/></g>';
})();

export const HATS = {
  Beanie: `<path d="M26 40 Q26 4 60 4 Q94 4 94 40 Z" fill="${MINT}"/><path d="M36 14 v26 M50 8 v32 M64 8 v32 M78 14 v26" stroke="#3FC590" stroke-width="2.4"/><rect x="22" y="36" width="76" height="12" rx="6" fill="#3FC590"/><circle cx="60" cy="4" r="7" fill="#FFF1DA"/>`,
  "Party hat": '<polygon points="60,-2 42,34 78,34" fill="#FF5CA8"/><path d="M52 20 l16 0 M47 28 l26 0" stroke="#fff" stroke-width="2.4"/><circle cx="60" cy="-2" r="5" fill="#FFD84D"/>',
  Crown: '<path d="M34 34 L38 10 L50 24 L60 6 L70 24 L82 10 L86 34 Z" fill="#F6C84B" stroke="#C9962A" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="26" r="3.4" fill="#FF5C93"/><circle cx="46" cy="29" r="2.6" fill="#7CF0B8"/><circle cx="74" cy="29" r="2.6" fill="#7CF0B8"/>',
  Cap: '<path d="M26 42 Q26 12 60 12 Q94 12 94 42 Z" fill="#4B7BE8"/><path d="M58 36 h44 q8 0 8 6 q0 4 -8 4 h-44 Z" fill="#365FC4"/><circle cx="60" cy="12" r="3.4" fill="#365FC4"/>',
  Cowboy: '<ellipse cx="60" cy="38" rx="48" ry="8" fill="#8B5A2B"/><path d="M38 38 Q36 10 60 12 Q84 10 82 38 Z" fill="#A8703A"/><rect x="38" y="30" width="44" height="6" fill="#5C3A1A"/>',
  Chef: '<g fill="#fff" stroke="#E2E2E2" stroke-width="1.5"><circle cx="44" cy="20" r="12"/><circle cx="60" cy="14" r="13"/><circle cx="76" cy="20" r="12"/><rect x="40" y="22" width="40" height="18" rx="4"/></g>',
  Santa: '<path d="M26 40 Q34 2 78 10 Q92 14 100 34 Q70 26 26 40Z" fill="#D93A3A"/><rect x="24" y="32" width="72" height="11" rx="5.5" fill="#fff"/><circle cx="100" cy="32" r="6.5" fill="#fff"/>',
  Sprout: '<path d="M60 26 q0 -8 2 -12" stroke="#3FA46A" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="53" cy="12" rx="9" ry="5" fill="#5CD68F" transform="rotate(-25 53 12)"/><ellipse cx="68" cy="11" rx="9" ry="5" fill="#7CF0B8" transform="rotate(25 68 11)"/>',
  Nightcap: '<path d="M26 36 Q40 -4 76 6 Q92 12 100 30 Q82 20 70 26 Z" fill="#4B3BD6"/><rect x="24" y="30" width="72" height="10" rx="5" fill="#8F7CF0"/><circle cx="100" cy="30" r="6" fill="#FFF1DA"/>',
  Headphones: `<path d="M22 58 Q22 12 60 12 Q98 12 98 58" fill="none" stroke="${MINT}" stroke-width="5" stroke-linecap="round"/><rect x="11" y="48" width="14" height="24" rx="6" fill="${MINT}"/><rect x="95" y="48" width="14" height="24" rx="6" fill="${MINT}"/>`,
  Wizard: '<path d="M32 40 L60 0 L88 40 Z" fill="#5B3FD1"/><ellipse cx="60" cy="40" rx="44" ry="8" fill="#4630A8"/><circle cx="55" cy="22" r="2.6" fill="#FFD84D"/><circle cx="67" cy="30" r="2" fill="#FFD84D"/><circle cx="62" cy="12" r="1.6" fill="#fff"/>',
  Pirate: '<path d="M22 40 Q60 -8 98 40 Q60 28 22 40Z" fill="#1E1E24"/><circle cx="60" cy="19" r="5.4" fill="#fff"/><rect x="56.4" y="23" width="7.2" height="3.6" rx="1" fill="#fff"/><circle cx="58" cy="18" r="1.3" fill="#1E1E24"/><circle cx="62" cy="18" r="1.3" fill="#1E1E24"/>',
  "Grad cap": '<path d="M60 6 L104 24 L60 42 L16 24Z" fill="#23232B"/><path d="M40 34 v13 q20 9 40 0 v-13 L60 42Z" fill="#33333D"/><path d="M98 26 v17" stroke="#F6C84B" stroke-width="2.4"/><circle cx="98" cy="46" r="3.4" fill="#F6C84B"/>',
  Flower: flower,
  Bow: '<g transform="translate(84 30) rotate(18)"><path d="M0 0 L-14 -8 L-14 8 Z M0 0 L14 -8 L14 8 Z" fill="#FF5C93" stroke="#C93A6E" stroke-width="1.4" stroke-linejoin="round"/><circle r="3.6" fill="#C93A6E"/></g>',
};

const heart = (x) => `<path d="M${x} 64 C${x - 11} 57 ${x - 11} 48 ${x - 5} 48 C${x - 2} 48 ${x} 50 ${x} 52 C${x} 50 ${x + 2} 48 ${x + 5} 48 C${x + 11} 48 ${x + 11} 57 ${x} 64Z" fill="#FF5C93" stroke="#C93A6E" stroke-width="1.6"/>`;
const star = (cx, cy, R, r) => {
  let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R; d += (i ? "L" : "M") + (cx + rad * Math.cos(a)).toFixed(1) + " " + (cy + rad * Math.sin(a)).toFixed(1); }
  return d + "Z";
};
export const EYES = {
  "Star glasses": `<path d="${star(47, 56, 13, 6)}" fill="#FFD84D" stroke="${K}" stroke-width="2"/><path d="${star(73, 56, 13, 6)}" fill="#FFD84D" stroke="${K}" stroke-width="2"/>`,
  "Round glasses": `<g fill="none" stroke="${K}" stroke-width="2.6"><circle cx="48" cy="56" r="11"/><circle cx="72" cy="56" r="11"/><path d="M59 55 h2"/></g>`,
  Shades: `<rect x="37" y="49" width="21" height="14" rx="6.5" fill="#0B1A13" stroke="${MINT}" stroke-width="2.4"/><rect x="62" y="49" width="21" height="14" rx="6.5" fill="#0B1A13" stroke="${MINT}" stroke-width="2.4"/><path d="M58 54 h4" stroke="${MINT}" stroke-width="2.4"/><path d="M41 53 l5 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,
  "Heart glasses": heart(47) + heart(73),
  Monocle: '<circle cx="72" cy="56" r="10.5" fill="rgba(255,255,255,.15)" stroke="#E0B040" stroke-width="2.6"/><path d="M80 64 Q90 80 84 96" fill="none" stroke="#E0B040" stroke-width="1.6"/>',
};

const lei = (() => {
  let s = "";
  for (let i = 0; i < 9; i++) {
    const a = 0.5 + i * 0.3;
    s += `<circle cx="${(60 + 30 * Math.cos(a)).toFixed(1)}" cy="${(86 + 16 * Math.sin(a)).toFixed(1)}" r="5.2" fill="${i % 2 ? "#FFD84D" : "#FF8FC7"}"/>`;
  }
  return s;
})();
export const NECK = {
  Bowtie: '<path d="M60 98 L44 89 L44 107 Z M60 98 L76 89 L76 107 Z" fill="#FF5C93" stroke="#C93A6E" stroke-width="1.6" stroke-linejoin="round"/><circle cx="60" cy="98" r="4.6" fill="#C93A6E"/>',
  Bandana: '<polygon points="32,86 88,86 60,116" fill="#E5484D"/><circle cx="52" cy="95" r="2" fill="#fff"/><circle cx="68" cy="95" r="2" fill="#fff"/><circle cx="60" cy="104" r="2" fill="#fff"/>',
  Scarf: `<path d="M32 88 Q60 108 88 88 L86 100 Q60 120 34 100Z" fill="${MINT}"/><path d="M76 104 l6 14 l10 -4 l-6 -16Z" fill="#3FC590"/>`,
  Lei: lei,
  "Gold chain": '<path d="M44 88 Q60 112 76 88" fill="none" stroke="#F6C84B" stroke-width="3.2" stroke-dasharray="4 2.5" stroke-linecap="round"/><circle cx="60" cy="106" r="5" fill="#F6C84B" stroke="#C9962A" stroke-width="1.6"/>',
  Medal: '<path d="M48 90 L60 106 L72 90" fill="none" stroke="#4B7BE8" stroke-width="4"/><circle cx="60" cy="108" r="7" fill="#F6C84B" stroke="#C9962A" stroke-width="2"/>',
};

const TORSO = "M52 86 Q70 82 88 86 Q99 100 98 122 Q97 146 70 146 Q43 146 42 122 Q41 100 52 86Z";
const torso = (c) => `<path d="${TORSO}" fill="${c}"/>`;
const sleeves = (c, long) => {
  const cy = long ? 111 : 103, ry = long ? 12.5 : 8;
  return [[41, 14], [99, -14]].map(([x, r]) => `<ellipse cx="${x}" cy="${cy}" rx="9" ry="${ry}" fill="${c}" transform="rotate(${r} ${x} ${cy})"/>`).join("");
};
const pjStripes = [48, 57, 66, 75, 84, 93].map((x) => `<path d="M${x} 88 L${x + 1} 142" stroke="#fff" stroke-width="2.2" opacity=".7"/>`).join("");
export const OUTFITS = {
  Tee: ["", torso("#7CF0B8") + sleeves("#7CF0B8") + '<path d="M60 88 Q70 98 80 88" fill="none" stroke="#3FC590" stroke-width="3"/><path d="M70 110 l2.6 5.4 l5.9 .8 l-4.3 4.1 l1 5.9 l-5.2 -2.8 l-5.2 2.8 l1 -5.9 l-4.3 -4.1 l5.9 -.8Z" fill="#fff"/>'],
  Hoodie: ["", torso("#7C4DFF") + sleeves("#7C4DFF", true) + '<ellipse cx="70" cy="90" rx="23" ry="7" fill="#6A3DE0"/><path d="M54 122 L86 122 L84 138 Q70 142 56 138Z" fill="#6A3DE0"/><path d="M63 97 v11 M77 97 v11" stroke="#E6DEFF" stroke-width="2" stroke-linecap="round"/>'],
  Jersey: ["", torso("#E5484D") + sleeves("#E5484D") + '<text x="70" y="128" text-anchor="middle" font-family="Fredoka,sans-serif" font-size="24" font-weight="600" fill="#fff">7</text>'],
  Overalls: ["", torso("#FFD84D") + sleeves("#FFD84D") + '<ellipse cx="57" cy="144" rx="12" ry="8" fill="#3F6FB5"/><ellipse cx="83" cy="144" rx="12" ry="8" fill="#3F6FB5"/><path d="M54 106 L86 106 Q96 122 95 138 Q94 148 70 148 Q46 148 45 138 Q44 122 54 106Z" fill="#3F6FB5"/><path d="M58 106 L56 90 M82 106 L84 90" stroke="#3F6FB5" stroke-width="5" stroke-linecap="round"/><rect x="61" y="115" width="18" height="12" rx="2" fill="#5A8AD0"/><circle cx="58" cy="106" r="2.2" fill="#FFD84D"/><circle cx="82" cy="106" r="2.2" fill="#FFD84D"/>'],
  Dress: ["", '<path d="M32 160 Q51 152 70 160 Q89 152 108 160 L94 120 L46 120Z" fill="#FF8FC7"/>' + torso("#FF8FC7") + sleeves("#FF8FC7") + '<path d="M32 160 Q51 152 70 160 Q89 152 108 160 L96 130 Q70 140 44 130Z" fill="#FF8FC7"/><rect x="43" y="124" width="54" height="4" fill="#FFD0E8"/><circle cx="70" cy="126" r="3.4" fill="#fff"/>'],
  Cape: ['<path d="M48 88 Q70 82 92 88 L114 160 Q70 172 26 160Z" fill="#E5484D"/>', '<path d="M50 88 Q70 83 90 88 L93 98 Q70 92 47 98Z" fill="#C93A3E"/><circle cx="70" cy="92" r="4.6" fill="#F6C84B" stroke="#C9962A" stroke-width="1.6"/>'],
  Varsity: ["", torso("#1F6B4A") + sleeves("#F0E6CC", true) + '<path d="M42 134 Q70 148 98 134 L98 140 Q70 154 42 140Z" fill="#F0E6CC"/><text x="58" y="120" text-anchor="middle" font-family="Fredoka,sans-serif" font-size="16" font-weight="600" fill="#F0E6CC">S</text>'],
  Tuxedo: ["", torso("#23232B") + sleeves("#23232B", true) + '<path d="M58 88 L70 120 L82 88Z" fill="#fff"/><path d="M70 99 l-8 -5 v10Z M70 99 l8 -5 v10Z" fill="#E5484D"/><circle cx="70" cy="99" r="2.4" fill="#C93A3E"/><circle cx="70" cy="114" r="1.6" fill="#23232B"/><circle cx="70" cy="124" r="1.6" fill="#23232B"/>'],
  Hawaiian: ["", torso("#FF8A3D") + sleeves("#FF8A3D") + '<path d="M56 87 L70 104 L84 87 L78 84 L70 94 L62 84Z" fill="#FFD9B8"/><circle cx="55" cy="116" r="5" fill="#FF8FC7"/><circle cx="84" cy="124" r="5.4" fill="#FFF1A8"/><circle cx="62" cy="136" r="4.4" fill="#7CF0B8"/><circle cx="80" cy="108" r="4" fill="#fff"/><circle cx="70" cy="128" r="3.6" fill="#FF8FC7"/>'],
  Pajamas: ["", torso("#6C8CFF") + pjStripes + sleeves("#6C8CFF", true) + '<ellipse cx="57" cy="144" rx="12" ry="8" fill="#6C8CFF"/><ellipse cx="83" cy="144" rx="12" ry="8" fill="#6C8CFF"/>'],
  "Chef coat": ["", torso("#FFFFFF") + sleeves("#FFFFFF", true) + '<path d="M70 92 V142" stroke="#E2E2E2" stroke-width="2"/><circle cx="61" cy="108" r="2.2" fill="#B8B8B8"/><circle cx="79" cy="108" r="2.2" fill="#B8B8B8"/><circle cx="61" cy="122" r="2.2" fill="#B8B8B8"/><circle cx="79" cy="122" r="2.2" fill="#B8B8B8"/>'],
};

const FC = [53, 87];
const pair = (fn) => FC.map(fn).join("");
export const SHOES = {
  Sneakers: pair((c) => `<ellipse cx="${c}" cy="152" rx="16" ry="9" fill="#fff" stroke="#D8D8D8" stroke-width="1.2"/><path d="M${c - 16} 155 Q${c} 163 ${c + 16} 155 L${c + 16} 158 Q${c} 166 ${c - 16} 158Z" fill="${MINT}"/><path d="M${c - 6} 147 l10 4" stroke="${MINT}" stroke-width="2.4" stroke-linecap="round"/>`),
  Boots: pair((c) => `<rect x="${c - 10}" y="138" width="20" height="14" rx="3" fill="#8B5A2B"/><rect x="${c - 10.5}" y="136" width="21" height="5" rx="2" fill="#C48A4E"/><ellipse cx="${c}" cy="152" rx="15.5" ry="8.5" fill="#8B5A2B"/><path d="M${c - 15} 157 h30" stroke="#4A2E12" stroke-width="3"/>`),
  Slippers: pair((c) => `<ellipse cx="${c}" cy="152" rx="15.5" ry="8.5" fill="#FFB3D1"/><ellipse cx="${c - 5}" cy="143" rx="2.8" ry="6.5" fill="#FFB3D1"/><ellipse cx="${c + 5}" cy="143" rx="2.8" ry="6.5" fill="#FFB3D1"/><circle cx="${c}" cy="151" r="2" fill="#FF5C93"/>`),
  "Gold sneakers": pair((c) => `<ellipse cx="${c}" cy="152" rx="16" ry="9" fill="#F6C84B" stroke="#C9962A" stroke-width="1.2"/><path d="M${c - 16} 155 Q${c} 163 ${c + 16} 155 L${c + 16} 158 Q${c} 166 ${c - 16} 158Z" fill="#fff"/><path d="M${c - 6} 147 l10 4" stroke="#C9962A" stroke-width="1.6" stroke-linecap="round"/>`),
  Skates: pair((c) => `<path d="M${c - 12} 138 h20 l4 14 q2 6 -4 6 h-22 q-4 0 -4 -4Z" fill="#fff" stroke="#D8D8D8" stroke-width="1.2"/><circle cx="${c - 9}" cy="162" r="3.2" fill="${MINT}"/><circle cx="${c + 9}" cy="162" r="3.2" fill="${MINT}"/><path d="M${c - 13} 158 h28" stroke="#8CBFA6" stroke-width="2"/>`),
};

export const HELD = {
  Balloon: '<path d="M104 122 Q106 84 118 50" fill="none" stroke="#8CBFA6" stroke-width="1.4"/><ellipse cx="120" cy="34" rx="12" ry="15" fill="#FF5C93"/><ellipse cx="115" cy="28" rx="3.4" ry="5.5" fill="#fff" opacity=".4" transform="rotate(20 115 28)"/><path d="M118 49 l2 4 l-4 0Z" fill="#FF5C93"/>',
  Trophy: '<path d="M99 118 h18 v8 q0 8 -9 9 q-9 -1 -9 -9Z" fill="#F6C84B" stroke="#C9962A" stroke-width="1.6"/><path d="M99 120 q-6 0 -5 6 q1 4 5 4 M117 120 q6 0 5 6 q-1 4 -5 4" fill="none" stroke="#C9962A" stroke-width="1.6"/><rect x="106" y="135" width="4" height="5" fill="#C9962A"/><rect x="101" y="140" width="14" height="4.5" rx="1.5" fill="#8A5A1A"/>',
  Pizza: '<g transform="rotate(-15 108 130)"><path d="M96 118 L120 118 L108 146Z" fill="#F6C84B" stroke="#D89A1E" stroke-width="1.6" stroke-linejoin="round"/><path d="M96 118 h24" stroke="#D88A3A" stroke-width="4.4"/><circle cx="106" cy="126" r="2.6" fill="#E5484D"/><circle cx="113" cy="125" r="2.4" fill="#E5484D"/><circle cx="108" cy="135" r="2.4" fill="#E5484D"/></g>',
  Banana: '<g transform="rotate(-20 104 130)"><path d="M92 120 Q112 120 118 140 Q106 132 92 134Z" fill="#F6D04D" stroke="#C9A21E" stroke-width="1.6" stroke-linejoin="round"/></g>',
  Calendar: '<rect x="94" y="116" width="24" height="26" rx="4" fill="#fff" stroke="#D8D8D8" stroke-width="1.2"/><rect x="94" y="116" width="24" height="7" rx="3.5" fill="#E5484D"/><g fill="#8CBFA6"><circle cx="101" cy="130" r="1.6"/><circle cx="106" cy="130" r="1.6"/><circle cx="111" cy="130" r="1.6"/><circle cx="101" cy="136" r="1.6"/><circle cx="106" cy="136" r="1.6" fill="#FF5C93"/><circle cx="111" cy="136" r="1.6"/></g>',
};

// Achievements that unlock items. Counts come from the app (see SyncApp `achievements`).
export const ACHIEVEMENTS = {
  plans: { label: "plans made", verb: "Make" },
  friends: { label: "friends added", verb: "Add" },
  free: { label: "free days marked", verb: "Mark" },
  groups: { label: "groups created", verb: "Create" },
  msgs: { label: "messages sent", verb: "Send" },
};
// item name -> { a: achievement key, n: how many }
export const UNLOCKS = {
  "Pizza": { a: "msgs", n: 5 },
  "Star glasses": { a: "friends", n: 2 },
  "Pirate": { a: "msgs", n: 10 },
  "Cape": { a: "friends", n: 3 },
  "Santa": { a: "groups", n: 2 },
  "Crown": { a: "plans", n: 3 },
  "Tuxedo": { a: "friends", n: 4 },
  "Gold sneakers": { a: "plans", n: 5 },
  "Varsity": { a: "free", n: 7 },
  "Hawaiian": { a: "groups", n: 3 },
  "Wizard": { a: "plans", n: 6 },
  "Grad cap": { a: "free", n: 14 },
  "Gold chain": { a: "msgs", n: 25 },
  "Trophy": { a: "plans", n: 10 },
};
export const isUnlocked = (name, progress = {}) => { const u = UNLOCKS[name]; return !u || (progress[u.a] || 0) >= u.n; };
export const unlockHint = (name) => { const u = UNLOCKS[name]; return u ? `${ACHIEVEMENTS[u.a].verb} ${u.n} ${ACHIEVEMENTS[u.a].label.replace(/ (made|added|marked|created|sent)$/, "")} (${ACHIEVEMENTS[u.a].label})` : ""; };

export const SLOTS = [
  { id: "hat", label: "Hats", items: HATS },
  { id: "eyes", label: "Eyes", items: EYES },
  { id: "outfit", label: "Outfit", items: OUTFITS },
  { id: "shoes", label: "Shoes", items: SHOES },
  { id: "neck", label: "Neck", items: NECK },
  { id: "held", label: "Holding", items: HELD },
  { id: "fur", label: "Fur", items: FUR },
];
export const DEFAULT_LOOK = { name: "Saamy", fur: "Mint", eyes: "Round glasses" };
const FUR_NAMES = Object.keys(FUR);

// Default fur for people who haven't picked one: stable per person.
export function defaultLookFor(key) {
  let h = 0;
  for (const ch of String(key || "x")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { fur: FUR_NAMES[h % FUR_NAMES.length] };
}

export function randomLook(progress) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const look = { name: DEFAULT_LOOK.name, fur: pick(FUR_NAMES) };
  for (const s of SLOTS) {
    if (s.id === "fur") continue;
    const names = Object.keys(s.items).filter((n) => isUnlocked(n, progress));
    if (Math.random() < 0.6) look[s.id] = pick(names);
  }
  return look;
}

let uid = 0;
// Returns the SVG markup for one monkey. `crop: "bust"` shows head and
// shoulders only (used for avatars).
export function monkeySvg(look = {}, { size = 150, crop = null, shadow = true } = {}) {
  const l = look || {};
  const fu = FUR[l.fur] || FUR.Cocoa;
  const id = `mk${++uid}`;
  const F = `url(#f${id})`, Mu = `url(#m${id})`;
  const defs = `<defs><radialGradient id="f${id}" gradientUnits="userSpaceOnUse" cx="60" cy="70" r="95"><stop offset="0" stop-color="${fu.f1}"/><stop offset="1" stop-color="${fu.f2}"/></radialGradient><radialGradient id="m${id}" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="${fu.m1}"/><stop offset="1" stop-color="${fu.m2}"/></radialGradient></defs>`;
  const [back, mid] = OUTFITS[l.outfit] || ["", ""];
  const tail = `<path d="M92 134 Q130 140 128 108 Q126 94 114 100" fill="none" stroke="${fu.f2}" stroke-width="8" stroke-linecap="round"/>`;
  const legs = [57, 83].map((c) => `<ellipse cx="${c}" cy="144" rx="11" ry="8" fill="${F}"/>`).join("");
  const feet = FC.map((c) => `<ellipse cx="${c}" cy="152" rx="15" ry="8" fill="${F}"/><ellipse cx="${c}" cy="153" rx="7.5" ry="3.8" fill="${Mu}"/>`).join("");
  const arms = [[41, 14], [99, -14]].map(([x, r]) => `<ellipse cx="${x}" cy="112" rx="8.5" ry="15" fill="${F}" transform="rotate(${r} ${x} 112)"/>`).join("");
  const hands = [37, 103].map((x) => `<ellipse cx="${x}" cy="126" rx="8.6" ry="7.6" fill="${F}"/><ellipse cx="${x}" cy="127.5" rx="4.4" ry="3.4" fill="${Mu}"/>`).join("");
  const trunk = `<path d="${TORSO}" fill="${F}"/><ellipse cx="70" cy="122" rx="14" ry="15" fill="${Mu}"/>`;
  const sleepy = l.hat === "Nightcap";
  const eyes = sleepy
    ? `<path d="M42 58 q6 6 12 0 M66 58 q6 6 12 0" fill="none" stroke="${K}" stroke-width="2.8" stroke-linecap="round"/>`
    : `<circle cx="48" cy="57" r="6.2" fill="${K}"/><circle cx="72" cy="57" r="6.2" fill="${K}"/><circle cx="50.2" cy="54.6" r="2.4" fill="#fff"/><circle cx="74.2" cy="54.6" r="2.4" fill="#fff"/><circle cx="46" cy="59.6" r="1.2" fill="#fff"/><circle cx="70" cy="59.6" r="1.2" fill="#fff"/>`;
  const mouth = `<ellipse cx="60" cy="66" rx="3.6" ry="2.5" fill="${fu.nose}"/><path d="M53 72 Q60 79 67 72" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>`;
  const acc = (HATS[l.hat] || "") + (EYES[l.eyes] || "");
  const head = `<circle cx="36" cy="58" r="14" fill="${F}"/><circle cx="36" cy="58" r="8" fill="${fu.inner}"/><circle cx="84" cy="58" r="14" fill="${F}"/><circle cx="84" cy="58" r="8" fill="${fu.inner}"/><ellipse cx="60" cy="60" rx="40" ry="36" fill="${F}"/><circle cx="48" cy="56" r="13" fill="${Mu}"/><circle cx="72" cy="56" r="13" fill="${Mu}"/><ellipse cx="60" cy="69" rx="21" ry="16" fill="${Mu}"/><ellipse cx="40" cy="36" rx="14" ry="7" fill="#fff" opacity=".22" transform="rotate(-25 40 36)"/>${eyes}${mouth}<circle cx="38" cy="68" r="5" fill="#F4A38C" opacity=".55"/><circle cx="82" cy="68" r="5" fill="#F4A38C" opacity=".55"/>${acc}`;
  const ht = "translate(70 73) scale(1.08) translate(-60 -60)";
  const vb = crop === "bust" ? "12 0 116 126" : "0 -8 140 182";
  const [, , vw, vh] = vb.split(" ").map(Number);
  const sh = shadow && !crop ? '<ellipse cx="70" cy="162" rx="46" ry="6" fill="#000" opacity=".3"/>' : "";
  return `<svg width="${size}" height="${Math.round((size * vh) / vw)}" viewBox="${vb}" aria-hidden="true" style="display:block">${defs}${sh}${back}${tail}${legs}${arms}${trunk}${feet}${SHOES[l.shoes] || ""}${hands}${mid}<g transform="${ht}"><g transform="translate(0,-4)">${head}</g>${NECK[l.neck] || ""}</g>${HELD[l.held] || ""}</svg>`;
}
