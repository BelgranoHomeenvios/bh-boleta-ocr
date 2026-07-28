// =====================================================================
//  Belgrano Soft · Catálogo
//  Buscar productos, ver sus variantes con los tres ejes + la bolsa.
//  Es el cimiento del presupuesto: de acá se eligen los muebles.
// =====================================================================
(function (global) {
  const Catalogo = {
    estado: { texto: '', categoria: '', abierto: null },

    async render() {
      const v = document.getElementById('view');
      v.innerHTML = `
        <div class="row" style="margin-bottom:18px">
          <div>
            <div class="kick">Catálogo</div>
            <h1 class="h-title">Productos</h1>
            <div class="h-sub" id="cat-sub">Cargando…</div>
          </div>
          <div class="sp"></div>
        </div>
        <div class="card pad" style="margin-bottom:16px">
          <div class="wrap-row">
            <label class="fld" style="flex:2; min-width:220px">
              <span class="lbl">Buscar</span>
              <input id="cat-q" placeholder="Amberes, placard, mesa…" value="${UI.esc(this.estado.texto)}">
            </label>
            <label class="fld" style="flex:1; min-width:160px">
              <span class="lbl">Categoría</span>
              <select id="cat-cat"><option value="">Todas</option></select>
            </label>
          </div>
        </div>
        <div id="cat-lista">${UI.spinner()}</div>`;

      // Aviso si estamos en modo demo (sin conexión a la base real).
      if (global.DB.modo() === 'demo') {
        v.insertAdjacentHTML('afterbegin',
          `<div class="banner info" id="cat-demo">Modo demo — mostrando productos de ejemplo.
           <a href="#" id="cat-conectar">Conectar Belgrano Soft</a> para ver el catálogo real.</div>`);
        document.getElementById('cat-conectar').onclick = e => { e.preventDefault(); this.modalConexion(); };
      }

      const q = document.getElementById('cat-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.estado.texto = q.value.trim(); this.cargar(); }, 250); };
      document.getElementById('cat-cat').onchange = e => { this.estado.categoria = e.target.value; this.cargar(); };

      this.cargarCategorias();
      this.cargar();
    },

    async cargarCategorias() {
      try {
        const cats = await global.DB.categorias();
        const sel = document.getElementById('cat-cat');
        if (!sel) return;
        sel.innerHTML = '<option value="">Todas</option>' +
          cats.map(c => `<option value="${UI.esc(c)}"${c === this.estado.categoria ? ' selected' : ''}>${UI.esc(c)}</option>`).join('');
      } catch (e) { /* silencioso: la búsqueda sigue andando */ }
    },

    async cargar() {
      const cont = document.getElementById('cat-lista');
      cont.innerHTML = UI.spinner();
      try {
        const [prods, tot] = await Promise.all([
          global.DB.productos({ texto: this.estado.texto, categoria: this.estado.categoria }),
          global.DB.totales().catch(() => null),
        ]);
        const sub = document.getElementById('cat-sub');
        if (sub && tot) sub.textContent = `${tot.productos.toLocaleString('es-AR')} productos · ${tot.variantes.toLocaleString('es-AR')} variantes`;
        if (!prods.length) { cont.innerHTML = UI.vacio('No hay productos para esa búsqueda.'); return; }
        cont.innerHTML = `<div class="card"><table>
          <thead><tr><th>Producto</th><th>Categoría</th><th style="text-align:right">Variantes</th><th></th></tr></thead>
          <tbody>${prods.map(p => this.filaProducto(p)).join('')}</tbody></table></div>`;
        cont.querySelectorAll('[data-prod]').forEach(tr =>
          tr.onclick = () => this.toggle(Number(tr.dataset.prod)));
      } catch (e) {
        cont.innerHTML = `<div class="banner warn">No se pudo leer el catálogo: ${UI.esc(e.message || e)}</div>`;
      }
    },

    filaProducto(p) {
      const tn = p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>';
      return `<tr data-prod="${p.id}" style="cursor:pointer">
        <td><b>${UI.esc(p.nombre)}</b> ${tn}</td>
        <td class="muted">${UI.esc(p.categoria || '—')}</td>
        <td style="text-align:right" class="tnum">${p.variantes}</td>
        <td style="text-align:right" class="muted">ver ›</td>
      </tr>`;
    },

    async toggle(prodId) {
      // Si ya está abierto debajo, cerrarlo.
      const existe = document.getElementById('var-' + prodId);
      if (existe) { existe.remove(); return; }
      const tr = document.querySelector(`[data-prod="${prodId}"]`);
      const fila = document.createElement('tr');
      fila.id = 'var-' + prodId;
      fila.innerHTML = `<td colspan="4" style="background:var(--panel-2)">${UI.spinner('Variantes…')}</td>`;
      tr.after(fila);
      try {
        const vars = await global.DB.variantes(prodId);
        fila.querySelector('td').innerHTML = this.tablaVariantes(vars);
      } catch (e) {
        fila.querySelector('td').innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`;
      }
    },

    tablaVariantes(vars) {
      if (!vars.length) return UI.vacio('Este producto todavía no tiene variantes cargadas.');
      return `<table style="margin:2px 0">
        <thead><tr><th>Medida</th><th>Estructura</th><th>Frente</th><th>Otros</th><th style="text-align:right">Precio</th></tr></thead>
        <tbody>${vars.map(v => {
          const extras = UI.extras(v).map(([k, val]) =>
            `<span class="pill soft">${UI.esc(k)}: ${UI.esc(val)}</span>`).join(' ') || '<span class="muted">—</span>';
          return `<tr>
            <td class="tnum">${UI.esc(v.medida || '—')}</td>
            <td>${UI.esc(v.estructura || '—')}</td>
            <td>${UI.esc(v.frente || '—')}</td>
            <td>${extras}</td>
            <td style="text-align:right"><b class="tnum">${UI.pesos(v.precio)}</b></td>
          </tr>`;
        }).join('')}</tbody></table>`;
    },

    modalConexion() {
      const c = global.DB.cfg();
      const html = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:grid;place-items:center;padding:20px" id="mdl">
          <div class="card pad" style="max-width:460px;width:100%">
            <h3 class="h-title" style="font-size:18px">Conectar Belgrano Soft</h3>
            <p class="h-sub">Pegá la <b>anon key</b> de tu proyecto (Settings → API → Project API keys → anon public). Es pública, va en el frontend.</p>
            <label class="fld" style="margin-top:14px"><span class="lbl">URL del proyecto</span>
              <input id="mc-url" value="${UI.esc(c.url || global.DB.DEFAULT_URL)}"></label>
            <label class="fld" style="margin-top:12px"><span class="lbl">anon key</span>
              <input id="mc-key" placeholder="eyJ…" value="${UI.esc(c.key || '')}"></label>
            <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
              <button class="btn" id="mc-cancel">Cancelar</button>
              <button class="btn primary" id="mc-ok">Conectar</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const cerrar = () => document.getElementById('mdl').remove();
      document.getElementById('mc-cancel').onclick = cerrar;
      document.getElementById('mc-ok').onclick = () => {
        const url = document.getElementById('mc-url').value.trim();
        const key = document.getElementById('mc-key').value.trim();
        if (!key) { UI.aviso('Falta la anon key', 'warn'); return; }
        global.DB.guardarCfg(url, key);
        UI.aviso('Conectado. Recargando…', 'ok');
        setTimeout(() => location.reload(), 600);
      };
    },
  };

  global.Catalogo = Catalogo;
})(typeof window !== 'undefined' ? window : globalThis);
