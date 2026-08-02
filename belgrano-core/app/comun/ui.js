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

    // Código de barras Code 128 (juego B) dibujado como SVG. Se usa para las
    // etiquetas de las unidades: cualquier lector de mano lo lee, admite
    // letras y números, y ocupa poco. El EAN-13 es para la venta al público
    // —hay que comprarle el prefijo a GS1— y ese vive en la variante.
    C128: ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 ' +
      '112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 ' +
      '321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 ' +
      '132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 ' +
      '213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 ' +
      '111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 ' +
      '413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 ' +
      '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 ' +
      '211412 211214 211232 2331112').split(' '),
    barras(texto, alto = 34, modulo = 1.6) {
      const t = String(texto || '');
      if (!t) return '';
      const vals = [...t].map(c => c.charCodeAt(0) - 32).filter(n => n >= 0 && n < 95);
      if (!vals.length) return '';
      // Arranca en el juego B y cierra con el dígito de control, que es lo que
      // hace que el lector avise si leyó mal en vez de inventar un número.
      const suma = vals.reduce((a, v, i) => a + v * (i + 1), 104);
      const codigos = [104, ...vals, suma % 103, 106];
      let x = 0, barras = '';
      codigos.forEach(c => {
        [...UI.C128[c]].forEach((ancho, i) => {
          const w = Number(ancho) * modulo;
          if (i % 2 === 0) barras += `<rect x="${x}" y="0" width="${w}" height="${alto}"/>`;
          x += w;
        });
      });
      return `<svg class="cbar" viewBox="0 0 ${x} ${alto}" width="${x}" height="${alto}"
        role="img" aria-label="Código ${UI.esc(t)}">${barras}</svg>`;
    },
    // Pill de estado a partir de un mapa {label, pill}.
    estado(mapa, clave) {
      const e = mapa?.[clave] || { label: clave || '—', pill: 'soft' };
      return `<span class="pill ${e.pill}">${UI.esc(e.label)}</span>`;
    },
    // Cabecera de módulo: kick + título + subtítulo, con acciones a la derecha.
    head(kick, titulo, sub, acciones = '') {
      return `<div class="row" style="margin-bottom:16px;align-items:flex-start">
        <div><div class="kick">${UI.esc(kick)}</div><h1 class="h-title">${UI.esc(titulo)}</h1>
          ${sub ? `<div class="h-sub">${UI.esc(sub)}</div>` : ''}</div>
        <div class="sp"></div>${acciones}</div>`;
    },
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
