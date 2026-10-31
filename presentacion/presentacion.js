/* KeepGoing · web de presentación: demos interactivas y movimiento */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  /* ---------- Tema ---------- */
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('[data-theme-toggle]').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('kg-web-theme', next); } catch (e) {}
  });

  /* ---------- Barra: cristal al bajar, menú móvil, sección actual ---------- */
  const nav = $('[data-nav]'), burger = $('[data-burger]');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));
  const navMap = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navMap.forEach(a => a.classList.remove('is-here'));
    const a = navMap.get(e.target.id); if (a) a.classList.add('is-here');
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));

  /* ---------- Revelar al hacer scroll ---------- */
  const revObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in'); revObs.unobserve(e.target);
    e.target.dispatchEvent(new CustomEvent('reveal'));
  }), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, [data-chart], [data-bracket]').forEach(el => revObs.observe(el));

  /* ---------- Móvil del hero: cambia de pestaña solo ---------- */
  const views = $$('[data-ph-view]'), phTitle = $('[data-ph-title]');
  const titles = ['Hoy', 'Organización', 'Libreta'];
  let pv = 0;
  if (views.length) setInterval(() => {
    if (document.hidden) return;
    views[pv].classList.remove('is-on');
    pv = (pv + 1) % views.length;
    views[pv].classList.add('is-on');
    phTitle.style.opacity = 0;
    setTimeout(() => { phTitle.textContent = titles[pv]; phTitle.style.opacity = 1; }, 200);
  }, 3600);

  /* ---------- Orbe de lunas ---------- */
  const MOONS = {
    habitos: { k: '01 · Hábitos y Proyectos', t: 'Lo que quieres hacer cada día', d: 'Hábitos diarios, semanales o mensuales, de contar, de cantidad o para dejar algo. Los proyectos son carpetas con una meta, hitos y fecha límite.', a: 'Ver Hábitos' },
    organizacion: { k: '02 · Organización', t: 'Tus turnos, tus horas y tu paga', d: 'Año, Mes, Semana y Día. Pinta turnos, rutinas y colores con el pincel, ficha entrada y salida y saca el PDF del mes.', a: 'Ver Organización' },
    diario: { k: '03 · Diario semanal', t: 'Tus semanas, una detrás de otra', d: 'Cada semana es un marco con tus horas, turnos, días perfectos, valoración media y notas. Viajas por ellas como por un pasillo.', a: 'Ver el Diario' },
    libreta: { k: '04 · Libreta', t: 'Tu dinero, cifrado en tu móvil', d: 'Gastos, ingresos, presupuesto, varias monedas, deudas, inversiones y una calculadora que proyecta tu patrimonio.', a: 'Ver la Libreta' },
    grupos: { k: '05 · Chat y grupos', t: 'Hábitos que se comparten', d: 'Chats con amigos, grupos con ranking, retos en vivo con votación y torneos por eliminatorias.', a: 'Ver Grupos' },
    maestrias: { k: '06 · Maestrías', t: 'Cartas que se ganan con rachas', d: 'Diez rangos, de Iniciado a Trascendente. Tu nivel, tu contrato personal y tus trofeos viven aquí.', a: 'Ver Maestrías' }
  };
  const orbit = $('[data-orbit]');
  if (orbit) {
    const moons = $$('.moon', orbit), panel = $('[data-orbit-panel]'), stage = $('.orbit-stage', orbit), core = $('.orbit-core', orbit);
    const place = () => { const r = stage.clientWidth * (stage.clientWidth < 420 ? .35 : .39); moons.forEach(m => m.style.setProperty('--rr', r + 'px')); };
    place(); addEventListener('resize', place);
    let cur = 0, auto = true, timer;
    const select = (i, focus) => {
      cur = (i + moons.length) % moons.length;
      moons.forEach((m, j) => { m.setAttribute('aria-selected', j === cur); m.tabIndex = j === cur ? 0 : -1; });
      const m = moons[cur], d = MOONS[m.dataset.moon];
      core.style.setProperty('--sel', getComputedStyle(m).getPropertyValue('--c'));
      panel.classList.add('is-swap');
      setTimeout(() => {
        $('[data-op-k]', panel).textContent = d.k; $('[data-op-t]', panel).textContent = d.t; $('[data-op-d]', panel).textContent = d.d;
        const a = $('[data-op-a]', panel); a.href = '#' + m.dataset.moon; a.firstChild.textContent = d.a + ' ';
        panel.classList.remove('is-swap');
      }, reduce.matches ? 0 : 200);
      if (focus) m.focus();
    };
    const stopAuto = () => { auto = false; clearInterval(timer); };
    moons.forEach((m, i) => {
      m.addEventListener('click', () => { stopAuto(); select(i); vibrate(8); });
      m.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); stopAuto(); select(cur + k, true); }
        if (e.key === 'Home') { e.preventDefault(); stopAuto(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); stopAuto(); select(moons.length - 1, true); }
      });
    });
    orbit.addEventListener('reveal', () => {
      if (reduce.matches) return;
      timer = setInterval(() => { if (auto && !document.hidden) select(cur + 1); }, 4200);
    });
    select(0);
  }

  /* ---------- Hábitos: anillos, +1 y día perfecto ---------- */
  const habits = $$('[data-habit]'), ptsEl = $('[data-pts]'), perfect = $('[data-perfect]');
  let streak = 23;
  const countTo = (el, to, ms = 900, fmt = n => Math.round(n)) => {
    if (reduce.matches) { el.textContent = fmt(to); return; }
    const from = parseFloat(el.dataset.v || 0), t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step); else el.dataset.v = to;
    };
    requestAnimationFrame(step);
  };
  const updatePts = () => {
    const done = habits.filter(h => h.classList.contains('is-done')).length;
    const pts = done / habits.length * 10;
    ptsEl.textContent = Number.isInteger(pts) ? pts : pts.toFixed(1).replace('.', ',');
    ptsEl.classList.remove('tick'); void ptsEl.offsetWidth; ptsEl.classList.add('tick');
    return done === habits.length;
  };
  const openPerfect = (x, y) => {
    perfect.style.setProperty('--x', x + 'px'); perfect.style.setProperty('--y', y + 'px');
    perfect.hidden = false; void perfect.offsetWidth;
    perfect.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const p = $('[data-perfect-pts]'), s = $('[data-perfect-streak]');
    p.textContent = '+0'; s.textContent = streak;
    setTimeout(() => { countTo(p, 10, 900, n => '+' + Math.round(n)); p.dataset.v = 0; countTo(s, streak + 1, 900); streak++; }, reduce.matches ? 0 : 1300);
    vibrate([12, 40, 12]);
    perfect.focus && perfect.setAttribute('tabindex', '-1'); perfect.focus();
  };
  const closePerfect = () => {
    perfect.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      perfect.hidden = true;
      habits.forEach(h => h.classList.remove('is-done')); updatePts();
      $('[data-perfect-streak]').dataset.v = 0;
    }, reduce.matches ? 300 : 700);
  };
  habits.forEach(h => h.addEventListener('click', e => {
    h.classList.toggle('is-done');
    h.setAttribute('aria-pressed', h.classList.contains('is-done'));
    if (h.classList.contains('is-done')) { h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); vibrate(10); }
    if (updatePts()) {
      const r = h.querySelector('.ring').getBoundingClientRect();
      setTimeout(() => openPerfect(r.left + r.width / 2, r.top + r.height / 2), reduce.matches ? 0 : 450);
    }
  }));
  habits.forEach(h => h.setAttribute('aria-pressed', 'false'));
  if (perfect) {
    perfect.addEventListener('click', closePerfect);
    addEventListener('keydown', e => { if (e.key === 'Escape' && perfect.classList.contains('is-open')) closePerfect(); });
  }

  /* ---------- Organización: pincel con onda ---------- */
  const month = $('[data-month]');
  if (month) {
    const BR = { m: { c: '--c-org', h: 8 }, t: { c: '--c-hab', h: 8 }, n: { c: '--c-mae', h: 10 }, l: { c: '--c-lib', h: 0 } };
    let brush = 'm';
    // Noviembre de 2026 empieza en domingo: 6 huecos antes del día 1
    const lead = 6, days = 30;
    for (let i = 0; i < lead; i++) month.insertAdjacentHTML('beforeend', '<span class="day empty" aria-hidden="true"></span>');
    for (let d = 1; d <= days; d++) month.insertAdjacentHTML('beforeend', `<span class="day" role="button" tabindex="0" data-d="${d}" aria-label="${d} de noviembre">${d}</span>`);
    const cells = $$('.day[data-d]', month), hEl = $('[data-paint-h]');
    const preset = { 2: 'm', 3: 'm', 4: 't', 5: 't', 6: 'l', 7: 'l' };
    Object.entries(preset).forEach(([d, k]) => setK(cells[d - 1], k));
    function setK(cell, k) {
      if (k) { cell.dataset.k = k; cell.style.setProperty('--k', `var(${BR[k].c})`); }
      else { delete cell.dataset.k; cell.style.removeProperty('--k'); }
    }
    const total = () => { hEl.textContent = cells.reduce((s, c) => s + (c.dataset.k ? BR[c.dataset.k].h : 0), 0); };
    total();
    const cols = 7, pos = c => { const i = lead + (+c.dataset.d) - 1; return [i % cols, Math.floor(i / cols)]; };
    const ripple = origin => {
      if (reduce.matches) return;
      const [ox, oy] = pos(origin);
      cells.forEach(c => {
        const [x, y] = pos(c), dist = Math.hypot(x - ox, y - oy);
        if (dist > 4.2) return;
        c.style.setProperty('--d', Math.round(dist * 55) + 'ms');
        c.style.setProperty('--o', Math.max(0, 1 - dist / 4.2).toFixed(2));
        c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
      });
    };
    let painting = false, erase = false, touched = new Set();
    const paint = (c, first) => {
      if (!c || !c.dataset.d || touched.has(c)) return;
      if (first) erase = c.dataset.k === brush;
      touched.add(c);
      setK(c, erase ? null : brush);
      total(); vibrate(6);
      if (first) ripple(c);
    };
    const cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest && el.closest('.day[data-d]'); };
    let last = null;
    month.addEventListener('pointerdown', e => { const c = cellAt(e); if (!c) return; painting = true; touched = new Set(); paint(c, true); last = [e.clientX, e.clientY]; month.setPointerCapture(e.pointerId); });
    month.addEventListener('pointermove', e => {
      if (!painting) return;
      // Rellena también lo que hay entre dos lecturas del dedo, para no saltarse días
      const [lx, ly] = last, steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - lx, e.clientY - ly) / 8));
      for (let i = 1; i <= steps; i++) paint(cellAt({ clientX: lx + (e.clientX - lx) * i / steps, clientY: ly + (e.clientY - ly) * i / steps }));
      last = [e.clientX, e.clientY];
    });
    const end = () => { painting = false; };
    month.addEventListener('pointerup', end); month.addEventListener('pointercancel', end);
    month.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.d) { e.preventDefault(); touched = new Set(); paint(e.target, true); } });
    $$('[data-brush]').forEach(b => b.addEventListener('click', () => {
      brush = b.dataset.brush;
      $$('[data-brush]').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', x === b); });
    }));
  }

  /* ---------- Diario: teseracto de semanas ---------- */
  const tess = $('[data-tess]');
  if (tess) {
    const stage = $('[data-tess-stage]'), label = $('[data-tess-label]');
    const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });
    const weeks = [];
    const start = new Date(2026, 9, 26); // lunes 26 de octubre de 2026
    const seed = [[38, 5, 6, 8.1], [41, 5, 4, 7.4], [32, 4, 7, 8.6], [44, 6, 3, 6.2], [36, 5, 5, 7.0], [40, 5, 6, 7.9], [28, 4, 7, 8.8], [42, 5, 2, 5.6]];
    seed.forEach((s, i) => {
      const a = new Date(start); a.setDate(a.getDate() - i * 7);
      const b = new Date(a); b.setDate(b.getDate() + 6);
      weeks.push({ a, b, h: s[0], t: s[1], p: s[2], r: s[3] });
    });
    weeks.forEach((w, i) => {
      const f = document.createElement('article');
      f.className = 'frame';
      f.innerHTML = `<h4>${i === 0 ? 'Esta semana' : i === 1 ? 'La semana pasada' : 'Hace ' + i + ' semanas'}</h4>
        <p class="wk">${fmt.format(w.a)} – ${fmt.format(w.b)}</p>
        <dl><div><dt>Horas</dt><dd>${w.h}</dd></div><div><dt>Turnos</dt><dd>${w.t}</dd></div><div><dt>Perfectos</dt><dd>${w.p}/7</dd></div></dl>
        <dl style="margin-top:12px"><div><dt>Valoración</dt><dd>${w.r.toFixed(1).replace('.', ',')}</dd></div></dl>
        <div class="bar"><i style="--w:${Math.round(w.p / 7 * 100)}%"></i></div>`;
      stage.appendChild(f);
    });
    const frames = $$('.frame', stage);
    let at = 0;
    const go = i => {
      at = Math.max(0, Math.min(frames.length - 1, i));
      frames.forEach((f, j) => {
        const p = j - at;
        f.classList.toggle('is-past', p < 0);
        f.style.setProperty('--p', Math.max(0, p));
        f.style.zIndex = 100 - Math.abs(p);
        f.style.visibility = p > 4 ? 'hidden' : 'visible';
        f.setAttribute('aria-hidden', p !== 0);
      });
      const w = weeks[at];
      label.textContent = `${fmt.format(w.a)} – ${fmt.format(w.b)} de 2026`;
    };
    go(0);
    $('[data-tess-next]').addEventListener('click', () => go(at + 1));
    $('[data-tess-prev]').addEventListener('click', () => go(at - 1));
    tess.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(at + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(at - 1); }
    });
    let wheelLock = 0;
    stage.addEventListener('wheel', e => {
      const now = Date.now();
      if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;
      if ((e.deltaY > 0 && at === frames.length - 1) || (e.deltaY < 0 && at === 0)) return; // deja seguir el scroll de la página
      e.preventDefault();
      if (now - wheelLock < 380) return;
      wheelLock = now; go(at + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    let sx = null;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; });
    stage.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- Valoración: forma viva ---------- */
  const rateIn = $('[data-rate-in]');
  if (rateIn) {
    const WORDS = ['Horrible', 'Fatal', 'Muy mal', 'Mal', 'Flojo', 'Normal', 'Correcto', 'Bien', 'Muy bien', 'Genial', 'Perfecto'];
    const blob = $('[data-rate-blob]'), e1 = $('[data-rate-echo1]'), e2 = $('[data-rate-echo2]'), vis = $('.rate-vis');
    const hueFor = v => v <= 5 ? mix([224, 38, 76], [242, 183, 58], v / 5) : mix([242, 183, 58], [31, 158, 87], (v - 5) / 5);
    function mix(a, b, t) { return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; }
    // Forma: de picos afilados (0) a círculo (5) a pétalos redondos (10)
    const shape = (v, R = 70) => {
      const n = 180, pts = [];
      const s = (v - 5) / 5; // -1 picos · 0 círculo · 1 pétalos
      const k = s < 0 ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const th = i / n * Math.PI * 2;
        let r;
        if (s < 0) { const c = Math.cos(k * th); r = R + (-s) * 26 * Math.sign(c) * Math.pow(Math.abs(c), 6) - (-s) * 6; }
        else { r = R + s * 18 * Math.abs(Math.cos(k / 2 * th)) - s * 6; }
        pts.push([r * Math.cos(th), r * Math.sin(th)]);
      }
      return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    };
    let shown = +rateIn.value, target = shown, raf = 0;
    const render = v => {
      blob.setAttribute('d', shape(v)); e1.setAttribute('d', shape(v, 88)); e2.setAttribute('d', shape(v, 104));
      vis.style.setProperty('--rc', hueFor(v));
    };
    const tick = () => {
      shown += (target - shown) * .18;
      if (Math.abs(target - shown) < .01) shown = target;
      render(shown);
      if (shown !== target) raf = requestAnimationFrame(tick); else raf = 0;
    };
    rateIn.addEventListener('input', () => {
      target = +rateIn.value;
      $('[data-rate-n]').textContent = target; $('[data-rate-w]').textContent = WORDS[target];
      rateIn.setAttribute('aria-valuetext', `${target}, ${WORDS[target]}`);
      vibrate(5);
      if (reduce.matches) { shown = target; render(shown); } else if (!raf) raf = requestAnimationFrame(tick);
    });
    render(shown);
  }

  /* ---------- Libreta: gráfico y contador ---------- */
  const chart = $('[data-chart]');
  if (chart) chart.addEventListener('reveal', () => {
    countTo($('[data-chart-n]', chart), 61480, 1800, n => Math.round(n).toLocaleString('es-ES'));
    countTo($('[data-chart-pct]', chart), 648, 1800, n => '+' + Math.round(n) + ' %');
  });

  /* ---------- Chat: deslizar para responder ---------- */
  const sw = $('[data-swipe]');
  if (sw) {
    const inner = $('.bubble-in', sw), ico = $('.reply-ico', sw), replying = $('[data-replying]');
    let x0 = null, dx = 0, armed = false;
    const TH = 64;
    sw.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; inner.style.transition = 'none'; sw.setPointerCapture(e.pointerId); sw.classList.remove('hint'); });
    sw.addEventListener('pointermove', e => {
      if (x0 == null) return;
      dx = Math.max(0, e.clientX - x0);
      const d = dx > TH ? TH + (dx - TH) * .25 : dx; // resistencia pasado el umbral
      inner.style.transform = `translateX(${d}px)`;
      ico.style.opacity = Math.min(1, d / TH); ico.style.transform = `scale(${.8 + Math.min(1, d / TH) * .2})`;
      const now = d >= TH;
      if (now !== armed) { armed = now; sw.classList.toggle('is-armed', armed); if (armed) vibrate(12); }
    });
    const release = () => {
      if (x0 == null) return;
      x0 = null;
      inner.style.transition = 'transform 280ms cubic-bezier(0.23, 1, 0.32, 1)';
      inner.style.transform = '';
      ico.style.opacity = ''; ico.style.transform = '';
      if (armed) { replying.hidden = false; }
      armed = false; sw.classList.remove('is-armed');
    };
    sw.addEventListener('pointerup', release); sw.addEventListener('pointercancel', release);
    const hintObs = new IntersectionObserver(es => { if (es[0].isIntersecting) { sw.classList.add('hint'); hintObs.disconnect(); } }, { threshold: .8 });
    if (!reduce.matches) hintObs.observe(sw);
  }

  /* ---------- Maestrías: cartas que siguen el dedo ---------- */
  const cardsBox = $('[data-cards]');
  if (cardsBox) {
    $$('.card', cardsBox).forEach((c, i) => {
      c.style.setProperty('--n', i);
      const move = e => {
        if (reduce.matches || e.pointerType === 'touch' && !c.matches(':active')) return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        c.style.transition = 'transform 80ms linear';
        c.style.transform = `rotateY(${px * 18}deg) rotateX(${-py * 14}deg) translateZ(20px)`;
        c.style.setProperty('--sx', (px * -100 + 50) + '%');
      };
      const leave = () => { c.style.transition = ''; c.style.transform = ''; c.style.removeProperty('--sx'); };
      c.addEventListener('pointermove', move); c.addEventListener('pointerleave', leave); c.addEventListener('pointerup', leave);
    });
  }

  /* ---------- Precios ---------- */
  const plan = $('[data-plan]');
  if (plan) {
    const P = { month: ['1,49 €', 'al mes'], year: ['14,99 €', 'al año'], forever: ['29,99 €', 'pago único'] };
    const btns = $$('[data-term]', plan), seg = $('.seg', plan), price = $('[data-price]', plan), per = $('[data-per]', plan);
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', x === b); });
      seg.style.setProperty('--k', i);
      price.textContent = P[b.dataset.term][0]; per.textContent = P[b.dataset.term][1];
      price.classList.remove('swap'); void price.offsetWidth; price.classList.add('swap');
    }));
  }
})();
