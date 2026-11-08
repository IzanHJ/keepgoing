/* KeepGoing — Mapa del cuerpo del Gimnasio (v1.55): dibujo propio, de frente y de espaldas, hombre y mujer.
   Estilo de lámina anatómica: silueta gris y músculos claros separados por surcos, con fibras que siguen la dirección
   de cada músculo. Se dibuja la mitad izquierda y se refleja. La versión de mujer sale de la misma lámina
   (mismo trazo) deformando el contorno: hombros y cintura más estrechos, caderas y muslos más anchos, pecho y pelo propios.
   Sin DOM: devuelve cadenas SVG. Se usa en el navegador (window.KGBody) y en los tests de Node (require). */
(function (root) {
  'use strict';
  const W = 200, H = 470, CX = W / 2;

  /* ---------- lámina de hombre ----------
     Coordenadas absolutas (M, L, C, Z) de la mitad izquierda; x = 100 es el centro.
     Cada músculo: [trazo, ángulo de las fibras]. */
  const SIL = {
    front: [
      // cabeza y orejas
      'M100 9 C88 9 81 18 81 32 C81 40 82 47 85 52 C89 58 94 61 100 61 Z',
      'M83 30 C79 29 78 33 79 38 C80 42 82 43 84 42 Z',
      // cuello, tronco, brazo y pierna
      'M100 54 L91 54 C91 62 90 68 88 72 C80 76 70 79 61 83 C52 86 46 94 45 106 C44 116 43 126 42 140 C41 152 41 164 42 174 C38 186 35 200 34 214 C33 226 33 238 34 248 C30 254 28 262 28 272 C28 280 30 288 34 291 C37 292 39 290 39 286 C40 280 41 274 42 268 C44 262 45 256 46 250 C48 238 50 224 53 210 C55 200 57 190 58 180 C60 168 61 156 62 144 C63 140 64 136 65 132 C66 150 68 170 70 186 C70 198 69 210 66 222 C62 234 59 248 58 262 C57 282 58 302 61 320 C62 330 62 338 61 346 C59 362 59 378 62 394 C64 404 66 412 67 420 C63 426 61 432 63 438 C70 441 82 441 90 439 C91 433 90 427 88 421 C88 410 90 398 92 386 C94 372 95 360 95 348 C95 340 96 332 97 322 C98 300 99 276 100 250 Z'
    ],
    back: [
      'M100 9 C88 9 81 18 81 32 C81 40 82 47 85 52 C89 58 94 61 100 61 Z',
      'M83 30 C79 29 78 33 79 38 C80 42 82 43 84 42 Z',
      'M100 54 L91 54 C91 62 90 68 88 72 C80 76 70 79 61 83 C52 86 46 94 45 106 C44 116 43 126 42 140 C41 152 41 164 42 174 C38 186 35 200 34 214 C33 226 33 238 34 248 C30 254 28 262 28 272 C28 280 30 288 34 291 C37 292 39 290 39 286 C40 280 41 274 42 268 C44 262 45 256 46 250 C48 238 50 224 53 210 C55 200 57 190 58 180 C60 168 61 156 62 144 C63 140 64 136 65 132 C66 150 68 170 70 186 C70 198 69 210 66 222 C62 234 59 248 58 262 C57 282 58 302 61 320 C62 330 62 338 61 346 C59 362 59 378 62 394 C64 404 66 412 67 420 C63 426 61 432 63 438 C70 441 82 441 90 439 C91 433 90 427 88 421 C88 410 90 398 92 386 C94 372 95 360 95 348 C95 340 96 332 97 322 C98 300 99 276 100 254 Z'
    ]
  };
  const MUS = {
    front: {
      traps: [['M91 64 C90 69 88 72 84 75 C78 78 71 80 65 83 C72 84 80 83 87 80 C90 76 92 70 92 64 Z', 20]],
      shoulders: [['M62 86 C53 88 47 96 46 108 C46 117 47 124 49 129 C52 122 55 113 59 105 C63 98 68 93 73 90 C70 87 66 86 62 86 Z', 70]],
      chest: [['M98 92 C90 89 82 88 75 90 C68 94 63 102 61 112 C61 120 64 127 70 131 C78 135 88 135 98 131 Z', -12]],
      biceps: [['M58 128 C51 132 46 142 45 154 C44 164 46 172 50 177 C55 176 58 170 59 160 C61 148 61 136 58 128 Z', 85]],
      forearms: [
        ['M44 178 C40 186 37 198 36 212 C35 224 35 236 36 246 L40 246 C41 232 43 218 46 206 C48 196 49 186 48 178 Z', 80],
        ['M51 180 C51 192 49 206 46 220 C44 230 42 240 42 246 L45 247 C47 236 50 224 53 212 C55 202 57 192 57 184 C55 181 53 180 51 180 Z', 78]
      ],
      abs: [
        ['M99 137 L90 137 C89 137 88 139 88 141 L88 154 C91 155 95 155 99 155 Z', 0],
        ['M99 158 C95 158 91 158 88 157 L88 172 C91 173 95 174 99 174 Z', 0],
        ['M99 177 C95 177 91 176 88 175 L88 191 C91 193 95 194 99 194 Z', 0],
        ['M99 197 C95 197 91 196 88 194 C88 206 89 218 92 228 C94 234 97 238 99 240 Z', 0]
      ],
      obliques: [
        ['M84 138 C79 138 74 141 71 146 L74 149 C77 146 81 144 85 143 Z', -30],
        ['M84 147 C79 148 75 152 72 157 L75 160 C78 156 81 153 85 152 Z', -30],
        ['M84 156 C80 158 76 162 73 168 L76 170 C79 166 82 163 85 161 Z', -30],
        ['M85 166 C80 171 76 177 74 185 C73 194 73 204 75 212 C78 220 82 226 87 232 C87 218 86 204 86 190 C86 180 86 172 85 166 Z', 70]
      ],
      adductors: [['M98 252 C92 256 88 264 86 276 C85 284 86 290 88 296 C92 288 95 280 97 270 C98 264 99 258 98 252 Z', 70]],
      quads: [
        ['M66 236 C61 248 59 264 59 282 C59 300 61 314 64 326 C67 330 70 332 73 332 C72 314 72 296 73 278 C74 262 73 248 70 238 Z', 92],
        ['M75 234 C74 252 74 272 75 292 C76 306 77 318 79 326 C82 328 85 328 87 326 C88 310 89 292 88 274 C87 258 84 244 79 236 Z', 90],
        ['M90 290 C88 300 88 314 89 324 C90 332 92 336 95 338 C96 330 97 318 96 308 C95 300 93 294 90 290 Z', 75]
      ],
      calves: [
        ['M63 350 C60 362 60 376 62 388 C63 396 65 402 67 406 C69 396 70 384 70 372 C70 362 68 355 63 350 Z', 95],
        ['M73 350 C72 364 72 380 73 396 C74 406 75 412 77 418 L81 418 C81 404 81 388 81 372 C81 362 79 355 73 350 Z', 88],
        ['M85 350 C88 360 92 368 93 378 C93 390 90 400 87 408 C85 396 84 382 84 370 C84 362 84 356 85 350 Z', 85]
      ]
    },
    back: {
      traps: [['M100 58 L93 58 C92 64 90 69 86 73 C78 78 70 81 63 84 C70 88 78 93 84 100 C90 108 94 120 97 134 L100 150 Z', 35]],
      shoulders: [['M62 86 C53 88 47 96 46 108 C46 117 47 124 49 129 C52 121 56 113 61 106 C66 100 72 96 78 94 C73 89 68 86 62 86 Z', 110]],
      upperback: [
        ['M80 98 C74 98 68 102 66 108 C66 114 69 118 74 120 C80 121 86 119 90 116 C88 109 85 103 80 98 Z', 20],
        ['M88 104 C91 110 93 118 94 128 L97 140 C96 128 95 116 92 106 Z', 60]
      ],
      lats: [['M66 120 C65 132 66 146 69 160 C72 174 77 188 84 200 C88 206 92 210 96 212 C95 196 95 180 96 164 C96 154 96 144 95 136 C92 128 88 123 82 122 C76 122 71 122 66 120 Z', 60]],
      triceps: [['M58 126 C51 131 46 142 45 154 C44 164 46 172 50 177 C55 175 58 168 59 158 C61 146 61 135 58 126 Z', 95]],
      forearms: [
        ['M44 178 C40 186 37 198 36 212 C35 224 35 236 36 246 L40 246 C41 232 43 218 46 206 C48 196 49 186 48 178 Z', 95],
        ['M51 180 C51 192 49 206 46 220 C44 230 42 240 42 246 L45 247 C47 236 50 224 53 212 C55 202 57 192 57 184 C55 181 53 180 51 180 Z', 100]
      ],
      obliques: [['M70 172 C71 186 70 200 68 214 C70 220 74 222 80 220 C84 218 87 216 90 214 C84 206 79 198 75 188 C73 182 71 177 70 172 Z', 60]],
      lowerback: [['M98 152 C96 160 94 170 94 182 C94 196 95 208 97 218 L99 222 Z', 90], ['M92 214 C86 214 80 216 75 220 C80 224 88 226 97 226 C95 222 94 218 92 214 Z', 0]],
      glutes: [['M98 230 C90 228 80 230 72 236 C66 244 64 254 66 264 C70 272 78 276 88 276 C94 276 98 272 99 266 Z', -25]],
      hamstrings: [
        ['M64 280 C60 296 60 312 62 326 C64 336 68 342 73 346 C76 332 78 316 80 300 C81 292 81 286 79 280 Z', 95],
        ['M83 280 C83 296 83 312 82 326 C81 334 80 340 79 346 L86 346 C91 334 95 318 96 302 C97 292 97 284 96 278 Z', 85]
      ],
      calves: [
        ['M62 350 C58 362 58 376 61 388 C63 396 67 402 73 405 C76 394 78 382 78 370 C78 360 76 353 70 349 Z', 95],
        ['M82 349 C80 360 80 372 82 384 C83 394 85 400 88 405 C92 398 94 388 94 376 C94 364 92 355 87 349 Z', 85]
      ]
    }
  };
  // Detalles que no son grupos del registro (cuello, rodillas, tendones): siempre en reposo
  const DECO = {
    front: ['M90 56 C89 62 90 68 94 74 L97 74 C94 68 92 62 92 56 Z', 'M78 334 C74 336 73 342 75 346 C78 349 84 349 87 346 C89 342 88 336 84 334 Z'],
    back: ['M75 406 C75 412 76 416 78 420 L84 420 C85 415 86 410 86 406 C82 408 78 408 75 406 Z']
  };

  /* ---------- versión de mujer ----------
     Misma lámina con el contorno deformado: k(y) escala la distancia al centro según la altura. */
  const KF = [[0, .97], [60, .97], [80, .92], [110, .9], [150, .9], [185, .86], [205, .92], [235, 1.06], [262, 1.08], [300, 1.04], [340, 1], [470, .97]];
  const kOf = y => { for (let i = 1; i < KF.length; i++) if (y <= KF[i][0]) { const [y0, k0] = KF[i - 1], [y1, k1] = KF[i]; return k0 + (k1 - k0) * (y - y0) / (y1 - y0); } return KF[KF.length - 1][1]; };
  // Brazos algo más finos: se acercan a su propio eje además de seguir al tronco
  const warp = (d, sex) => sex !== 'f' ? d : d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, xs, ys) => {
    const x = +xs, y = +ys; let nx = CX + (x - CX) * kOf(y);
    if (y > 85 && ((x < 62 && y < 230) || (x < 50 && y < 295))) { const axis = y < 178 ? 52 : 44; nx = axis + (x - axis) * .9 + 3.4; }
    return `${Math.round(nx * 10) / 10} ${y}`;
  });
  // Pecho de mujer (sobre el pectoral, mismo estilo) y pelo recogido
  const F_CHEST = 'M98 94 C91 91 83 91 77 94 C70 99 66 108 66 118 C66 128 71 136 79 139 C87 142 94 140 98 136 Z';
  const F_HAIR = {
    front: 'M100 7 C87 7 79 16 79 30 C79 37 80 43 82 47 C83 39 85 31 89 26 C92 23 96 21 100 21 Z M100 0 C95 0 92 3 92 6 C92 9 95 11 100 11 Z',
    back: 'M100 7 C87 7 79 16 79 30 C79 40 81 48 85 54 C89 59 94 61 100 61 Z M100 0 C95 0 92 3 92 6 C92 9 95 11 100 11 Z'
  };

  /* ---------- SVG ---------- */
  const ANGLES = [-30, -25, -12, 0, 20, 35, 60, 70, 75, 78, 80, 85, 88, 90, 92, 95, 100, 110];
  // Rayado de fibras: un patrón por ángulo (en el espacio de cada músculo, así también se refleja)
  const defs = () => `<svg class="gy-body-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${ANGLES.map(a => `<pattern id="gyf${a < 0 ? 'm' + -a : a}" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})"><line x1="0" y1="0" x2="0" y2="3.2" class="gy-fib"/></pattern>`).join('')}</defs></svg>`;
  const fid = a => 'gyf' + (a < 0 ? 'm' + -a : a);
  const MIRROR = `matrix(-1 0 0 1 ${W} 0)`;
  const both = inner => `<g>${inner}</g><g transform="${MIRROR}">${inner}</g>`;

  // side: 'front' | 'back'; sex: 'm' | 'f'; mus: { clave: intensidad 0-1 }; label para lectores de pantalla
  function svg(side, sex, mus, label) {
    const f = sex === 'f', S = SIL[side] || SIL.front, M = MUS[side] || MUS.front;
    let sil = S.map(d => warp(d, sex)).map(d => `<path d="${d}"/>`).join('');
    let out = `<svg class="gy-body-s" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label || ''}"><g class="gy-sil">${both(sil)}</g>`;
    if (f) out += `<path class="gy-hair" d="${F_HAIR[side]}"/><path class="gy-hair" transform="${MIRROR}" d="${F_HAIR[side]}"/>`;
    out += `<g class="gy-deco">${both((DECO[side] || []).map(d => `<path d="${warp(d, sex)}"/>`).join(''))}</g>`;
    let i = 0;
    for (const m in M) {
      const v = (mus || {})[m] || 0;
      const parts = M[m].map(([d, a]) => { const bust = f && side === 'front' && m === 'chest', dd = warp(bust ? F_CHEST : d, sex); return `<path d="${dd}"/>${bust ? '' : `<path class="gy-fibs" d="${dd}" fill="url(#${fid(a)})"/>`}`; }).join('');
      out += `<g class="gy-m ${v ? 'on' : ''}" data-m="${m}" style="--a:${v.toFixed ? v.toFixed(2) : v};--d:${i++}">${both(parts)}</g>`;
    }
    return out + '</svg>';
  }
  const muscles = side => Object.keys(MUS[side] || {});
  const api = { svg, defs, muscles, warp, W, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KGBody = api;
})(typeof window !== 'undefined' ? window : this);
