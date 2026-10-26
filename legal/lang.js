// Idioma de las páginas legales: ?lang=en|es, si no el del navegador. Los dos textos están en la misma página.
(function () {
  const q = new URLSearchParams(location.search).get('lang');
  const set = l => { document.documentElement.lang = l; document.querySelectorAll('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === l))); };
  set(q === 'en' || q === 'es' ? q : (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  document.addEventListener('click', e => { const b = e.target.closest('.lang-switch button'); if (b) set(b.dataset.l); });
})();
