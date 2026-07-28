// =====================================================================
//  Belgrano Soft · helpers de interfaz
// =====================================================================
(function (global) {
  const UI = {
    // Escape para no romper el HTML con nombres que traen comillas/símbolos.
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    // Pesos argentinos, sin decimales.
    pesos(n) {
      const x = Number(n) || 0;
      return '$' + x.toLocaleString('es-AR', { maximumFractionDigits: 0 });
    },
    // Los tres ejes + la bolsa, como texto legible: "1.20 · blanca · paraiso".
    ejes(v) {
      const base = [v.medida, v.estructura, v.frente].filter(Boolean);
      const extra = Object.entries(v.atributos || {})
        .filter(([k]) => !['medida', 'estructura', 'frente'].includes(k))
        .map(([, val]) => val);
      return [...base, ...extra].join(' · ') || '—';
    },
    // Los atributos de la bolsa que NO son los tres ejes, para mostrarlos aparte.
    extras(v) {
      return Object.entries(v.atributos || {})
        .filter(([k]) => !['medida', 'estructura', 'frente'].includes(k));
    },
    spinner(txt = 'Cargando…') {
      return `<div class="empty"><span class="spin"></span> ${UI.esc(txt)}</div>`;
    },
    vacio(txt) { return `<div class="empty">${UI.esc(txt)}</div>`; },
    // Toast simple.
    aviso(txt, tipo = 'info') {
      let t = document.getElementById('_toast');
      if (!t) {
        t = document.createElement('div');
        t.id = '_toast';
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;box-shadow:0 6px 22px rgba(0,0,0,.2);transition:.2s';
        document.body.appendChild(t);
      }
      const col = { info: ['#2f6fed', '#fff'], ok: ['#128a5b', '#fff'], warn: ['#b5730f', '#fff'], crit: ['#c53b3b', '#fff'] }[tipo] || ['#2f6fed', '#fff'];
      t.style.background = col[0]; t.style.color = col[1];
      t.textContent = txt; t.style.opacity = '1';
      clearTimeout(UI._tt);
      UI._tt = setTimeout(() => { t.style.opacity = '0'; }, 2400);
    },
  };
  global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
