/* KeepGoing — Deudas de la Libreta (v1.25): lógica pura, sin DOM. Se usa en el navegador (window.KGDebts) y en los tests de Node.
   A tu favor: un gasto con «Pendiente de Aportación» (e.owed = { on, parts: [{ id, who, mode: 'fixed'|'pct', v }] }) es lo que
   otras personas te tienen que devolver. Cada parte es una cantidad fija (v en céntimos) o un % (v) del gasto, ya neto de sus
   vinculados. Un ingreso lo paga con e.pay = { e: id del gasto, p: id de la parte }: menos de lo acordado deja la diferencia como
   Deuda; lo exacto la resuelve; de más la resuelve y lo que sobra son Comisiones (solo una etiqueta: ese dinero ya es un ingreso).
   En tu contra: un gasto con «Pendiente de devolver» (e.due = { on, who, paid: fecha | null }) no cuenta en gastos ni en el
   patrimonio hasta que se marca como devuelto. Las deudas nunca tocan los saldos: solo enseñan quién debe qué.
   who = { c: id de contacto } | { name } | { tag } (@nametag de un amigo, solo para identificarlo). */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./ledger.js') : root.KGLedger);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KGDebts = api;
})(typeof self !== 'undefined' ? self : this, function (LED) {
  'use strict';
  const dueOpen = e => !!(e && e.type === 'expense' && e.due && e.due.on && !e.due.paid);
  // Copia de la lista donde los «Pendiente de devolver» sin resolver valen 0 (misma longitud y orden)
  const zeroDue = list => (list || []).some(dueOpen) ? list.map(e => (dueOpen(e) ? { ...e, amountCents: 0, _due: true } : e)) : list || [];
  const owedOn = e => !!(e && e.type === 'expense' && e.owed && e.owed.on && Array.isArray(e.owed.parts) && e.owed.parts.length);

  // Importe del gasto ya neto de sus vinculados (si el grupo acaba siendo un ingreso, la base es 0)
  function baseOf(e, all) {
    const info = e.link && LED.linkInfo(all, e.link);
    if (!info) return Math.max(0, e.amountCents || 0);
    return info.net < 0 ? -info.net : 0;
  }
  const expectedOf = (part, base) => Math.max(0, part.mode === 'pct' ? Math.round(base * (+part.v || 0) / 100) : Math.round(+part.v || 0));

  // Clave de la persona (para juntar por contacto): contacto, @nametag o nombre escrito
  function whoKey(who) {
    if (!who || typeof who !== 'object') return '';
    if (who.c) return 'c:' + who.c;
    if (who.tag) return 't:' + String(who.tag).toLowerCase().replace(/^@/, '');
    if (who.name) return 'n:' + String(who.name).trim().toLowerCase();
    return '';
  }

  /* Todas las deudas: [{ id, side: 'favor'|'contra', eid, pid, who, key, date, note, expected, paid, left, extra, status }]
     left = lo que falta (Deuda), extra = Comisiones, status = 'open' | 'done' */
  function list(all) {
    all = all || [];
    const paidBy = new Map(), payers = new Map();
    for (const e of all) {
      if (e.type !== 'income' || !e.pay || !e.pay.e) continue;
      const k = e.pay.e + '|' + (e.pay.p || '');
      paidBy.set(k, (paidBy.get(k) || 0) + (e.amountCents || 0));
      (payers.get(k) || payers.set(k, []).get(k)).push(e.id);
    }
    const out = [];
    for (const e of all) {
      if (owedOn(e)) {
        const base = baseOf(e, all);
        for (const p of e.owed.parts) {
          const k = e.id + '|' + p.id, expected = expectedOf(p, base), paid = paidBy.get(k) || 0;
          const left = Math.max(0, expected - paid), extra = Math.max(0, paid - expected);
          out.push({ id: k, side: 'favor', eid: e.id, pid: p.id, who: p.who || {}, key: whoKey(p.who), date: e.date, note: e.note || '', expected, paid, left, extra, status: left > 0 ? 'open' : 'done', payers: payers.get(k) || [] });
        }
      }
      if (e.type === 'expense' && e.due && e.due.on) {
        const amt = Math.max(0, e.amountCents || 0), done = !!e.due.paid;
        out.push({ id: e.id + '|due', side: 'contra', eid: e.id, pid: '', who: e.due.who || {}, key: whoKey(e.due.who), date: e.date, note: e.note || '', expected: amt, paid: done ? amt : 0, left: done ? 0 : amt, extra: 0, status: done ? 'done' : 'open', paidOn: e.due.paid || null });
      }
    }
    return out.sort((a, b) => (a.status === b.status ? (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) : a.status === 'open' ? -1 : 1));
  }
  // Partes abiertas a las que un ingreso puede pagar (más la que ya paga ese ingreso, para poder editarlo)
  const openParts = (all, income) => list(all).filter(d => d.side === 'favor' && (d.status === 'open' || (income && income.pay && income.pay.e === d.eid && income.pay.p === d.pid)));

  // Resumen por persona: { key, who, favor (te debe), contra (le debes), extra (comisiones), open, done }
  function byPerson(debts) {
    const m = new Map();
    for (const d of debts) {
      if (!d.key) continue;
      const r = m.get(d.key) || m.set(d.key, { key: d.key, who: d.who, favor: 0, contra: 0, extra: 0, open: 0, done: 0 }).get(d.key);
      if (d.side === 'favor') r.favor += d.left; else r.contra += d.left;
      r.extra += d.extra;
      if (d.status === 'open') r.open++; else r.done++;
    }
    return [...m.values()];
  }
  // Totales: te deben, debes y comisiones
  const totals = debts => debts.reduce((a, d) => { if (d.side === 'favor') a.favor += d.left; else a.contra += d.left; a.extra += d.extra; return a; }, { favor: 0, contra: 0, extra: 0 });

  return { dueOpen, zeroDue, owedOn, baseOf, expectedOf, whoKey, list, openParts, byPerson, totals };
});
