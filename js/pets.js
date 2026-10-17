/* KeepGoing — Mascotas de plastilina (gato, perro y ninfa) como SVG en línea: lógica pura.
   Se usa en el navegador (window.KGPets) y en los tests de Node (require).
   pet = { kind: 'cat'|'dog'|'cockatiel', name, fur, colors: [c1, c2?, c3?] }
   · cat:       c1 pelaje · c2 barriga/hocico (opcional, se deriva de c1) · c3 manchas (opcional)
                fur:false → esfinge sin pelo (orejas grandes, arrugas, sin bigotes)
   · dog:       c1 pelaje · c2 hocico/barriga (opcional, se deriva de c1) · c3 orejas + mancha del ojo (opcional)
                fur:true (o ausente) → orejas largas y caídas · fur:false → pelo corto con orejas dobladas pequeñas
   · cockatiel: c1 cuerpo · c2 cara/cresta (opcional, amarillo) · c3 mejillas (opcional, naranja; '' o 'none' = sin mejillas)
                fur se ignora */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGPets = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KINDS = ['cat', 'dog', 'cockatiel'];
  const MOODS = ['happy', 'excited', 'sad', 'sleepy', 'neutral'];

  /* ---------- colores (mismos ayudantes que app.js) ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexToRgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbToHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = h => { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const ink = h => { const L = lum(h); return (L + .05) / .05 > 1.05 / (L + .05) ? '#000000' : '#ffffff'; };
  const isHex = c => typeof c === 'string' && /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c.trim());

  let counter = 0;
  const nextId = p => `kgp${p}${(++counter).toString(36)}`;

  /* ---------- paletas para la personalización ---------- */
  const CAT_COLORS = [['negro', '#1c1c1e'], ['blanco', '#f4f1ea'], ['gris', '#8b9097'], ['naranja', '#e8892b'], ['crema', '#efd0a0'], ['marron', '#6b4428']];
  const PALETTES = {
    cat: [
      { key: 'coat', options: CAT_COLORS },
      { key: 'belly', options: CAT_COLORS },
      { key: 'patches', options: CAT_COLORS }
    ],
    dog: [
      { key: 'coat', options: [['golden', '#d9a04f'], ['black', '#242426'], ['brown', '#7a4a2a'], ['white', '#f4f1ea'], ['cream', '#efd9b0'], ['grey', '#8d9198'], ['red', '#b9622f']] },
      { key: 'muzzle', options: [['cream', '#f6e7c8'], ['white', '#f7f5f0'], ['tan', '#d39a5c'], ['golden', '#e3b267'], ['grey', '#b7bbc1'], ['black', '#2a2a2c']] },
      { key: 'ears', options: [['black', '#242426'], ['brown', '#6a3f22'], ['tan', '#c6874a'], ['golden', '#d9a04f'], ['white', '#f4f1ea'], ['grey', '#7d828a']] }
    ],
    cockatiel: [
      { key: 'body', options: [['grey', '#8e9198'], ['lutino', '#f6efd6'], ['pearl', '#b6a88e'], ['cinnamon', '#9c826b'], ['white', '#f3f2ee']] },
      { key: 'face', options: [['yellow', '#f7cf3f'], ['lemon', '#f8e58a'], ['white', '#f6f4ee']] },
      { key: 'cheek', options: [['orange', '#f2853a'], ['coral', '#f06a55'], ['none', '']] }
    ]
  };
  const DEFAULTS = { cat: ['#1c1c1e'], dog: ['#d9a04f', '#f6e7c8'], cockatiel: ['#8e9198', '#f7cf3f', '#f2853a'] };
  const kindOf = k => KINDS.includes(k) ? k : 'cat';
  const palettes = kind => PALETTES[kindOf(kind)].map(s => ({ key: s.key, options: s.options.map(o => o.slice()) }));
  const defaults = kind => DEFAULTS[kindOf(kind)].slice();

  /* ---------- piezas comunes ---------- */
  const grad = (id, c, cx = '35%', cy = '28%') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="80%"><stop offset="0" stop-color="${mix(c, '#ffffff', .22)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', .25)}"/></radialGradient>`;
  const stars = `<path d="M60 52 l4 -8 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4z" fill="#ffd54a"/><path d="M140 46 l3 -6 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3z" fill="#ffd54a"/>`;
  const zzz = c => `<text x="140" y="44" font-size="22" font-weight="900" fill="${c}" font-family="sans-serif">z</text><text x="154" y="28" font-size="15" font-weight="900" fill="${c}" font-family="sans-serif">z</text>`;
  const open = size => `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">`;
  const shadow = `<ellipse cx="100" cy="188" rx="58" ry="8" fill="#000" opacity=".25"/>`;

  // Ojos redondos y oscuros (perro y ninfa). xl/xr: centros; y: altura; r: radio; iris; line: trazos
  function roundEyes(mood, xl, xr, y, r, iris, pupil, line) {
    const pair = f => f(xl, 1) + f(xr, -1);
    switch (mood) {
      case 'happy': return `<path d="M${xl - 9} ${y + 2} Q${xl} ${y - 9} ${xl + 9} ${y + 2} M${xr - 9} ${y + 2} Q${xr} ${y - 9} ${xr + 9} ${y + 2}" stroke="${line}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      case 'excited': return pair(x => `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="${iris}"/><circle cx="${x}" cy="${y + 1}" r="${r - 2}" fill="${pupil}"/><path d="M${x + 3} ${y - 9} l1.6 3.4 l3.4 1.6 l-3.4 1.6 l-1.6 3.4 l-1.6 -3.4 l-3.4 -1.6 l3.4 -1.6z" fill="#fff"/><circle cx="${x - 4}" cy="${y + 5}" r="1.8" fill="#fff"/>`) + stars;
      case 'sad': return pair((x, s) => `<ellipse cx="${x}" cy="${y + 3}" rx="${r - 1}" ry="${r}" fill="${iris}"/><ellipse cx="${x}" cy="${y + 5}" rx="${r - 4}" ry="${r - 3}" fill="${pupil}"/><circle cx="${x + 2}" cy="${y + 1}" r="2.2" fill="#fff"/><path d="M${x - 10 * s} ${y - 8} Q${x - 1 * s} ${y - 10} ${x + 8 * s} ${y - 15}" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`) + `<path d="M${xl - 6} ${y + 13} q-3 6 0 8 q3 -2 0 -8z" fill="#8fd3ff" opacity=".9"/>`;
      case 'sleepy': return `<path d="M${xl - 9} ${y + 2} Q${xl} ${y + 8} ${xl + 9} ${y + 2} M${xr - 9} ${y + 2} Q${xr} ${y + 8} ${xr + 9} ${y + 2}" stroke="${line}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      default: return pair(x => `<circle cx="${x}" cy="${y}" r="${r}" fill="${iris}"/><circle cx="${x}" cy="${y + 1}" r="${r - 3}" fill="${pupil}"/><circle cx="${x + 3}" cy="${y - 3}" r="3" fill="#fff"/><circle cx="${x - 2.5}" cy="${y + 3.5}" r="1.3" fill="#fff" opacity=".8"/>`);
    }
  }
  const blush = (mood, y, xl = 70, xr = 130) => mood === 'happy' || mood === 'excited' ? `<ellipse cx="${xl}" cy="${y}" rx="8" ry="5" fill="#ff7aa2" opacity=".45"/><ellipse cx="${xr}" cy="${y}" rx="8" ry="5" fill="#ff7aa2" opacity=".45"/>` : '';

  /* ---------- gato (idéntico al catSvg original) ---------- */
  function catSvg(pet, mood, size) {
    const [c1, c2raw, c3] = pet.colors;
    const c2 = c2raw || mix(c1, '#ffffff', lum(c1) > .5 ? .35 : .18);
    const line = mix(ink(c1), c1, .15), dark = lum(c1) > .5 ? '#3a3a3a' : '#0b0b0b';
    const gid = nextId('c');
    const ear = pet.fur ? 0 : 6; // los gatos sin pelo tienen orejas más grandes
    const eyes = {
      happy: `<path d="M74 80 Q83 70 92 80 M108 80 Q117 70 126 80" stroke="${line}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      excited: `<circle cx="83" cy="78" r="11" fill="#ffd54a"/><circle cx="117" cy="78" r="11" fill="#ffd54a"/><circle cx="83" cy="79" r="6" fill="${dark}"/><circle cx="117" cy="79" r="6" fill="${dark}"/><circle cx="86" cy="75" r="3" fill="#fff"/><circle cx="120" cy="75" r="3" fill="#fff"/>${stars}`,
      sad: `<ellipse cx="83" cy="82" rx="8" ry="9" fill="#9ad15b"/><ellipse cx="117" cy="82" rx="8" ry="9" fill="#9ad15b"/><ellipse cx="83" cy="84" rx="3.5" ry="6" fill="${dark}"/><ellipse cx="117" cy="84" rx="3.5" ry="6" fill="${dark}"/><path d="M72 70 L92 75 M128 70 L108 75" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`,
      sleepy: `<path d="M74 82 Q83 88 92 82 M108 82 Q117 88 126 82" stroke="${line}" stroke-width="5" fill="none" stroke-linecap="round"/>${zzz(mix(c1, '#ffffff', .6))}`,
      neutral: `<ellipse cx="83" cy="80" rx="9" ry="10" fill="#9ad15b"/><ellipse cx="117" cy="80" rx="9" ry="10" fill="#9ad15b"/><ellipse cx="83" cy="81" rx="3.5" ry="7.5" fill="${dark}"/><ellipse cx="117" cy="81" rx="3.5" ry="7.5" fill="${dark}"/><circle cx="86" cy="76" r="2.5" fill="#fff"/><circle cx="120" cy="76" r="2.5" fill="#fff"/>`
    };
    const mouth = mood === 'sad' ? `<path d="M92 110 Q100 103 108 110" stroke="${line}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<path d="M100 101 v4 M100 105 Q94 112 88 107 M100 105 Q106 112 112 107" stroke="${line}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const whiskers = pet.fur ? `<path d="M78 100 L50 96 M78 105 L52 108 M122 100 L150 96 M122 105 L148 108" stroke="${mix(line, c1, .3)}" stroke-width="2" stroke-linecap="round"/>` : '';
    const wrinkles = pet.fur ? '' : `<path d="M88 52 Q100 47 112 52 M90 59 Q100 55 110 59" stroke="${mix(c1, '#000000', .25)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    // mechones en las mejillas si tiene pelo
    const fluff = pet.fur ? `<path d="M56 92 l-8 4 l8 2 M144 92 l8 4 l-8 2" stroke="${c1}" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` : '';
    const patches = c3 ? `<ellipse cx="128" cy="134" rx="18" ry="14" fill="${c3}"/><ellipse cx="70" cy="150" rx="12" ry="10" fill="${c3}"/><path d="M58 60 Q66 42 84 48 Q74 62 62 70z" fill="${c3}"/>` : '';
    return `${open(size)}
      <defs>${grad(gid, c1)}</defs>
      ${shadow}
      <path d="M146 160 Q186 150 176 112 Q172 98 162 104" stroke="${c1}" stroke-width="15" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="146" rx="54" ry="42" fill="url(#${gid})"/>
      <ellipse cx="100" cy="154" rx="28" ry="28" fill="${c2}"/>
      ${patches}
      <ellipse cx="78" cy="182" rx="15" ry="8" fill="${c2}"/><ellipse cx="122" cy="182" rx="15" ry="8" fill="${c2}"/>
      <path d="M${62 - ear} 62 L${56 - ear} ${16 - ear} Q${59 - ear} ${11 - ear} ${66} ${17} L94 44 Z" fill="${c1}"/><path d="M${138 + ear} 62 L${144 + ear} ${16 - ear} Q${141 + ear} ${11 - ear} ${134} ${17} L106 44 Z" fill="${c1}"/>
      <path d="M66 54 L63 26 L85 44 Z" fill="#f4a7b9" opacity=".9"/><path d="M134 54 L137 26 L115 44 Z" fill="#f4a7b9" opacity=".9"/>
      <circle cx="100" cy="82" r="46" fill="url(#${gid})"/>
      ${c3 ? `<path d="M118 40 Q146 48 144 78 Q128 66 112 64z" fill="${c3}"/>` : ''}
      <ellipse cx="100" cy="102" rx="22" ry="15" fill="${c2}"/>
      ${wrinkles}${eyes[mood] || eyes.neutral}${blush(mood, 96)}
      <path d="M94 95 h12 l-6 7z" fill="#f28aa3"/>
      ${mouth}${whiskers}${fluff}
    </svg>`;
  }

  /* ---------- perro ---------- */
  function dogSvg(pet, mood, size) {
    const [c1, c2raw, c3] = pet.colors;
    const light = lum(c1) > .5;
    const c2 = c2raw || mix(c1, '#ffffff', light ? .45 : .3);
    const earBase = c3 || (light ? mix(c1, '#000000', .2) : mix(c1, '#ffffff', .06));
    const longEars = pet.fur !== false;
    const g = nextId('d'), ge = nextId('d'), gm = nextId('d'), gn = nextId('d');
    const eyeLine = mix(ink(c1), c1, .15);
    const mLine = mix(ink(c2), c2, lum(c2) > .5 ? .35 : .15);
    const iris = '#6b3e1d', pupil = '#1b100a';
    const tail = mood === 'sad' || mood === 'sleepy'
      ? `<path d="M146 162 Q172 170 176 186" stroke="${c1}" stroke-width="13" fill="none" stroke-linecap="round"/>`
      : `<path d="M144 152 Q170 146 172 116" stroke="${c1}" stroke-width="13" fill="none" stroke-linecap="round"/><circle cx="172" cy="114" r="7" fill="${c2}"/>${mood === 'excited' ? `<path d="M182 104 q6 8 2 18 M188 98 q9 12 3 26" stroke="${mix(c1, '#ffffff', .55)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>` : ''}`;
    // orejas: largas y caídas (fur) o cortas dobladas (pelo corto)
    const droop = mood === 'sad' ? 6 : mood === 'excited' ? -4 : 0;
    const earL = longEars
      ? `M70 50 Q46 40 36 66 Q28 96 38 ${118 + droop} Q48 ${132 + droop} 60 ${120 + droop} Q68 104 66 84 Q66 66 80 54 Z`
      : `M74 48 Q56 30 42 38 Q34 44 38 ${70 + droop} Q42 ${84 + droop} 50 ${80 + droop} Q56 64 72 60 Z`;
    const mirror = d => d.replace(/(M|Q| )(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, p, x, y) => `${p}${200 - +x} ${y}`);
    const earR = mirror(earL);
    const ears = `<path d="${earL}" fill="url(#${ge})"/><path d="${earR}" fill="url(#${ge})"/>`;
    const mouth = mood === 'sad'
      ? `<path d="M100 106 v4 M90 120 Q100 112 110 120" stroke="${mLine}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : mood === 'sleepy'
        ? `<path d="M100 106 v4 M100 110 Q95 114 91 112 M100 110 Q105 114 109 112" stroke="${mLine}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : `${mood === 'happy' || mood === 'excited' ? `<path d="M92 112 Q92 130 100 130 Q108 130 108 112 Z" fill="#ff7a93"/><path d="M100 115 v9" stroke="#e0566f" stroke-width="2" stroke-linecap="round"/>` : ''}<path d="M100 106 v4 M100 110 Q93 118 85 111 M100 110 Q107 118 115 111" stroke="${mLine}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const patch = c3 ? `<ellipse cx="82" cy="76" rx="16" ry="15" fill="${c3}" transform="rotate(-15 82 76)"/>` : '';
    const bodySpot = c3 ? `<ellipse cx="132" cy="138" rx="15" ry="11" fill="${c3}"/>` : '';
    const sleepyZ = mood === 'sleepy' ? zzz(mix(c1, '#ffffff', .6)) : '';
    return `${open(size)}
      <defs>${grad(g, c1)}${grad(ge, earBase, '40%', '20%')}${grad(gm, c2, '40%', '25%')}<radialGradient id="${gn}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#5a4a48"/><stop offset=".6" stop-color="#2a2020"/><stop offset="1" stop-color="#140e0e"/></radialGradient></defs>
      ${shadow}
      ${tail}
      <ellipse cx="100" cy="148" rx="52" ry="40" fill="url(#${g})"/>
      <ellipse cx="100" cy="158" rx="27" ry="25" fill="${c2}"/>
      ${bodySpot}
      <ellipse cx="78" cy="182" rx="16" ry="9" fill="${c2}"/><ellipse cx="122" cy="182" rx="16" ry="9" fill="${c2}"/>
      <path d="M74 179 v5 M82 179 v5 M118 179 v5 M126 179 v5" stroke="${mix(c2, '#000000', .2)}" stroke-width="2" stroke-linecap="round"/>
      <path d="M64 118 Q100 140 136 118" stroke="#e5484d" stroke-width="9" fill="none" stroke-linecap="round"/>
      <circle cx="100" cy="134" r="7" fill="#ffd54a" stroke="#d9a400" stroke-width="2"/>
      <ellipse cx="100" cy="82" rx="49" ry="45" fill="url(#${g})"/>
      ${patch}
      <ellipse cx="100" cy="102" rx="28" ry="20" fill="url(#${gm})"/>
      ${ears}
      ${roundEyes(mood, 82, 118, 78, 9, iris, pupil, eyeLine)}${blush(mood, 100, 66, 134)}
      <path d="M87 95 Q100 88 113 95 Q114 103 100 108 Q86 103 87 95 Z" fill="url(#${gn})"/>
      <ellipse cx="95" cy="94" rx="4" ry="2" fill="#fff" opacity=".55"/>
      ${mouth}${sleepyZ}
    </svg>`;
  }

  /* ---------- ninfa (Nymphicus hollandicus) ---------- */
  function cockatielSvg(pet, mood, size) {
    const [c1, c2raw, c3raw] = pet.colors;
    const c2 = isHex(c2raw) ? c2raw : '#f7cf3f';
    const c3 = c3raw === undefined || c3raw === null ? '#f2853a' : isHex(c3raw) ? c3raw : '';
    const light = lum(c1) > .5;
    const g = nextId('n'), gw = nextId('n'), gf = nextId('n'), gc = nextId('n'), gk = nextId('n'), gb = nextId('n'), gch = nextId('n');
    const wingC = mix(c1, '#000000', light ? .06 : .14);
    const bar = light ? mix('#ffffff', c2, .25) : '#fbfaf6';
    const eyeLine = mix(ink(c2), c2, .2);
    const beak = '#c9b3a4';
    const crestRot = mood === 'excited' ? -10 : mood === 'sad' ? 38 : mood === 'sleepy' ? 30 : mood === 'happy' ? 0 : 8;
    const tip = mix(c2, c1, light ? .35 : .55);
    const feather = (d) => `<path d="${d}" fill="url(#${gk})"/>`;
    const crest = `<g transform="rotate(${crestRot} 102 46)">${feather('M90 48 Q78 22 86 2 Q92 26 104 44 Z')}${feather('M98 46 Q94 16 106 -2 Q106 24 112 46 Z')}${feather('M106 48 Q110 20 126 8 Q118 30 118 50 Z')}</g>`;
    const cheeks = c3
      ? `<circle cx="70" cy="96" r="12" fill="url(#${gch})"/><circle cx="130" cy="96" r="12" fill="url(#${gch})"/>`
      : blush(mood, 98);
    const beakOpen = mood === 'happy' || mood === 'excited';
    const beakSvg = `${beakOpen ? `<path d="M93 101 Q100 116 107 101 Z" fill="#5a3a36"/><path d="M95 104 Q100 112 105 104 Z" fill="#ff8fa3"/>` : `<path d="M94 102 Q100 110 106 102 Z" fill="${mix(beak, '#000000', .15)}"/>`}
      <path d="M89 92 Q100 84 111 92 Q110 101 100 ${beakOpen ? 104 : 107} Q90 101 89 92 Z" fill="url(#${gb})"/>
      <circle cx="95.5" cy="91" r="1.3" fill="${mix(beak, '#000000', .4)}"/><circle cx="104.5" cy="91" r="1.3" fill="${mix(beak, '#000000', .4)}"/>`;
    const wing = side => {
      const X = x => side === 'l' ? x : 200 - x;
      return `<path d="M${X(62)} 112 Q${X(44)} 140 ${X(58)} 170 Q${X(66)} 184 ${X(80)} 178 Q${X(86)} 150 ${X(80)} 124 Q${X(74)} 110 ${X(62)} 112 Z" fill="url(#${gw})"/>
        <path d="M${X(58)} 120 Q${X(50)} 134 ${X(53)} 150 Q${X(60)} 146 ${X(64)} 134 Q${X(70)} 124 ${X(79)} 122 Q${X(70)} 113 ${X(58)} 120 Z" fill="${bar}"/>
        <path d="M${X(64)} 160 Q${X(70)} 168 ${X(76)} 170 M${X(62)} 152 Q${X(68)} 160 ${X(77)} 162" stroke="${mix(wingC, '#000000', .2)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`;
    };
    return `${open(size)}
      <defs>${grad(g, c1)}${grad(gw, wingC, '40%', '20%')}
        <radialGradient id="${gf}" cx="50%" cy="40%" r="55%"><stop offset="0" stop-color="${mix(c2, '#ffffff', .25)}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>
        <linearGradient id="${gk}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${tip}"/></linearGradient>
        <radialGradient id="${gb}" cx="40%" cy="25%" r="80%"><stop offset="0" stop-color="${mix(beak, '#ffffff', .4)}"/><stop offset="1" stop-color="${mix(beak, '#000000', .12)}"/></radialGradient>
        <radialGradient id="${gc}" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${mix(c1, '#ffffff', .45)}"/><stop offset="1" stop-color="${mix(c1, '#ffffff', .1)}"/></radialGradient>
        ${c3 ? `<radialGradient id="${gch}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="${mix(c3, '#ffffff', .3)}"/><stop offset=".7" stop-color="${c3}"/><stop offset="1" stop-color="${mix(c3, '#000000', .12)}"/></radialGradient>` : ''}</defs>
      ${shadow}
      <path d="M104 164 Q120 182 156 194 Q148 186 140 172 Q128 160 116 156 Z" fill="${mix(c1, '#000000', light ? .1 : .25)}"/>
      <path d="M100 166 Q112 184 140 197 Q130 182 124 168 Z" fill="${mix(c1, '#000000', light ? .04 : .12)}"/>
      <ellipse cx="100" cy="140" rx="46" ry="46" fill="url(#${g})"/>
      <ellipse cx="100" cy="150" rx="28" ry="32" fill="url(#${gc})"/>
      ${wing('l')}${wing('r')}
      <path d="M84 180 q-6 6 -2 8 M88 181 q0 7 3 7 M112 181 q0 7 -3 7 M116 180 q6 6 2 8" stroke="#c99a92" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${crest}
      <circle cx="100" cy="80" r="44" fill="url(#${g})"/>
      <ellipse cx="100" cy="74" rx="38" ry="40" fill="url(#${gf})"/>
      ${cheeks}
      ${roundEyes(mood, 82, 118, 80, 9.5, '#3a2418', '#120b08', eyeLine)}
      ${beakSvg}
      ${mood === 'sleepy' ? zzz(mix(c1, '#ffffff', .6)) : ''}
    </svg>`;
  }

  function normalize(pet) {
    const kind = kindOf(pet && pet.kind);
    const raw = pet && Array.isArray(pet.colors) ? pet.colors : [];
    const colors = raw.length && isHex(raw[0]) ? raw.slice(0, 3) : [defaults(kind)[0], ...raw.slice(1, 3)];
    return { kind, name: (pet && pet.name) || '', fur: pet ? pet.fur : true, colors };
  }
  function svg(pet, mood = 'neutral', size = 120) {
    const p = normalize(pet);
    const m = MOODS.includes(mood) ? mood : 'neutral';
    return p.kind === 'dog' ? dogSvg(p, m, size) : p.kind === 'cockatiel' ? cockatielSvg(p, m, size) : catSvg(p, m, size);
  }

  return { KINDS, MOODS, svg, palettes, defaults };
});
