// =====================================================================
//  Belgrano Soft · Catálogo
//  Navegación como en Tienda Nube: ambiente → tipo de mueble → modelo →
//  variantes. O búsqueda directa por texto. Es el cimiento del presupuesto.
// =====================================================================
(function (global) {
  const VISTA_KEY = 'bh_catalogo_vista';
  const Catalogo = {
    arbol: [],           // categorías cargadas
    ruta: [],            // breadcrumb: [{id,nombre}] hasta la categoría actual
    texto: '',           // búsqueda libre
    vista: (() => { try { return localStorage.getItem(VISTA_KEY) || 'bloques'; } catch { return 'bloques'; } })(),
    _prods: null,        // últimos productos pintados (para re-render al cambiar de vista)

    async render() {
      const v = document.getElementById('view');
      v.innerHTML = `
        <div class="row" style="margin-bottom:16px">
          <div>
            <div class="kick">Catálogo</div>
            <h1 class="h-title">Productos</h1>
            <div class="h-sub" id="cat-sub"></div>
          </div>
          <div class="sp"></div>
          <label class="fld" style="width:260px">
            <span class="lbl">Buscar en todo el catálogo</span>
            <input id="cat-q" placeholder="Amberes, oliver, mesa…" value="${UI.esc(this.texto)}">
          </label>
          <div class="vista-tog" role="group" aria-label="Formato de vista" style="align-self:flex-end">
            <button id="v-bloques" title="Bloques" aria-label="Bloques">▦</button>
            <button id="v-lista"   title="Listado" aria-label="Listado">☰</button>
          </div>
        </div>
        <div id="cat-crumb"></div>
        <div id="cat-lista">${UI.spinner()}</div>
        <style>
          .vista-tog{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel)}
          .vista-tog button{border:0;background:transparent;padding:8px 12px;cursor:pointer;font-size:16px;color:var(--muted);line-height:1}
          .vista-tog button+button{border-left:1px solid var(--line)}
          .vista-tog button.on{background:var(--brand-soft);color:var(--brand-ink)}
        </style>`;
      this.pintarTog();
      document.getElementById('v-bloques').onclick = () => this.setVista('bloques');
      document.getElementById('v-lista').onclick   = () => this.setVista('lista');

      if (global.DB.modo() === 'demo') {
        v.insertAdjacentHTML('afterbegin',
          `<div class="banner info">Modo demo — árbol y productos de ejemplo.
           <a href="#" id="cat-conectar">Conectar Belgrano Soft</a> para ver el catálogo real.</div>`);
        document.getElementById('cat-conectar').onclick = e => { e.preventDefault(); this.modalConexion(); };
      }

      const q = document.getElementById('cat-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim();
        if (this.texto) this.buscar(); else { this.ruta = []; this.pintar(); }
      }, 250); };

      try {
        this.arbol = await global.DB.arbolCategorias();
        const tot = await global.DB.totales().catch(() => null);
        const sub = document.getElementById('cat-sub');
        if (sub && tot) sub.textContent = `${tot.productos.toLocaleString('es-AR')} productos · ${tot.variantes.toLocaleString('es-AR')} variantes`;
      } catch (e) { /* seguimos con lo que haya */ }
      this.pintar();
    },

    // Hijos de una categoría (o las raíces si padre es null).
    hijos(padreId) {
      return this.arbol.filter(c => (c.padre_id ?? null) === (padreId ?? null))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },

    crumb() {
      const c = document.getElementById('cat-crumb');
      if (!c) return;
      const items = [{ id: null, nombre: 'Todo' }, ...this.ruta];
      c.innerHTML = `<div class="wrap-row" style="margin-bottom:14px;align-items:center">` +
        items.map((it, i) => {
          const last = i === items.length - 1;
          return `<span>${last
            ? `<b style="color:var(--navy)">${UI.esc(it.nombre)}</b>`
            : `<a href="#" data-crumb="${i}">${UI.esc(it.nombre)}</a>`}</span>` +
            (last ? '' : '<span class="muted">›</span>');
        }).join('') + `</div>`;
      c.querySelectorAll('[data-crumb]').forEach(a =>
        a.onclick = e => { e.preventDefault(); this.ruta = this.ruta.slice(0, Number(a.dataset.crumb)); this.pintar(); });
    },

    async pintar() {
      this.crumb();
      const cont = document.getElementById('cat-lista');
      const actual = this.ruta.length ? this.ruta[this.ruta.length - 1].id : null;
      const subcats = this.hijos(actual);

      // Si la categoría actual tiene subcategorías, mostramos el árbol.
      if (subcats.length) {
        cont.innerHTML = `<div class="grid-cats">${subcats.map(c =>
          `<button class="cat-tile" data-cat="${c.id}">
             <span class="cat-n">${UI.esc(c.nombre)}</span>
             <span class="cat-go">›</span>
           </button>`).join('')}</div>
          <style>
            .grid-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
            .cat-tile{display:flex;align-items:center;gap:10px;padding:16px;border:1px solid var(--line);
              border-radius:12px;background:var(--panel);box-shadow:var(--shadow);cursor:pointer;text-align:left;transition:.15s}
            .cat-tile:hover{border-color:var(--brand);transform:translateY(-1px)}
            .cat-n{font-weight:650;color:var(--navy);flex:1}
            .cat-go{color:var(--muted);font-size:18px}
          </style>`;
        cont.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
          const c = this.arbol.find(x => x.id === Number(b.dataset.cat));
          this.ruta.push({ id: c.id, nombre: c.nombre }); this.pintar();
        });
        return;
      }

      // Es una hoja (tipo de mueble): mostramos sus productos.
      cont.innerHTML = UI.spinner();
      try {
        this._prods = await global.DB.productos({ categoriaId: actual });
        this.pintarProductos(cont,
          actual ? 'Este tipo de mueble no tiene productos.' : 'Elegí un ambiente para empezar.');
      } catch (e) {
        this._prods = null;
        cont.innerHTML = `<div class="banner warn">No se pudo leer: ${UI.esc(e.message || e)}</div>`;
      }
    },

    async buscar() {
      this.ruta = [];
      document.getElementById('cat-crumb').innerHTML = '';
      const cont = document.getElementById('cat-lista');
      cont.innerHTML = UI.spinner();
      try {
        this._prods = await global.DB.productos({ texto: this.texto });
        this.pintarProductos(cont, 'No hay productos para esa búsqueda.');
      } catch (e) {
        this._prods = null;
        cont.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`;
      }
    },

    // Cambia entre bloques/listado y re-pinta lo que haya sin volver a la base.
    setVista(v) {
      if (v === this.vista) return;
      this.vista = v;
      try { localStorage.setItem(VISTA_KEY, v); } catch {}
      this.pintarTog();
      const cont = document.getElementById('cat-lista');
      if (this._prods) this.pintarProductos(cont, 'Sin productos.');
    },

    pintarTog() {
      const b = document.getElementById('v-bloques'), l = document.getElementById('v-lista');
      if (!b || !l) return;
      b.className = this.vista === 'bloques' ? 'on' : '';
      l.className = this.vista === 'lista' ? 'on' : '';
    },

    // Dispatcher: pinta la lista de productos en el formato elegido.
    pintarProductos(cont, vacio) {
      const prods = this._prods || [];
      cont.innerHTML = prods.length
        ? (this.vista === 'lista' ? this.htmlLista(prods) : this.htmlBloques(prods))
        : UI.vacio(vacio);
      this.enganchar(cont);
    },

    htmlLista(prods) {
      return `<div class="card"><table>
        <thead><tr><th>Producto</th><th style="text-align:right">Variantes</th><th></th></tr></thead>
        <tbody>${prods.map(p => {
          const tn = p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>';
          return `<tr data-prod="${p.id}" style="cursor:pointer">
            <td><b>${UI.esc(p.nombre)}</b> ${tn}</td>
            <td style="text-align:right" class="tnum">${p.variantes}</td>
            <td style="text-align:right" class="muted">ver ›</td></tr>`;
        }).join('')}</tbody></table></div>`;
    },

    htmlBloques(prods) {
      return `<div class="grid-prod">${prods.map(p => {
        const tn = p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>';
        return `<button class="prod-tile" data-prod="${p.id}">
            <div class="prod-top"><span class="prod-n">${UI.esc(p.nombre)}</span> ${tn}</div>
            <div class="prod-meta"><b class="tnum">${p.variantes}</b> variantes</div>
          </button>`;
      }).join('')}</div>
        <div id="cat-detalle"></div>
        <style>
          .grid-prod{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
          .prod-tile{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:16px;
            border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow);
            cursor:pointer;text-align:left;transition:.15s}
          .prod-tile:hover{border-color:var(--brand);transform:translateY(-1px)}
          .prod-tile.on{border-color:var(--brand);background:var(--brand-soft)}
          .prod-top{display:flex;align-items:center;gap:8px}
          .prod-n{font-weight:650;color:var(--navy)}
          .prod-meta{color:var(--muted);font-size:13px}
        </style>`;
    },

    enganchar(cont) {
      cont.querySelectorAll('[data-prod]').forEach(el =>
        el.onclick = () => this.vista === 'lista'
          ? this.toggle(Number(el.dataset.prod))
          : this.abrirDetalle(Number(el.dataset.prod), el));
    },

    // Vista bloques: las variantes van a un panel debajo de la grilla.
    async abrirDetalle(prodId, tile) {
      const det = document.getElementById('cat-detalle');
      const yaAbierto = tile.classList.contains('on');
      document.querySelectorAll('.prod-tile.on').forEach(t => t.classList.remove('on'));
      if (yaAbierto) { det.innerHTML = ''; return; }
      tile.classList.add('on');
      det.innerHTML = `<div class="card pad" style="margin-top:12px">${UI.spinner('Variantes…')}</div>`;
      try {
        const vars = await global.DB.variantes(prodId);
        det.innerHTML = `<div class="card pad" style="margin-top:12px">${this.tablaVariantes(vars)}</div>`;
      } catch (e) {
        det.innerHTML = `<div class="banner warn" style="margin-top:12px">${UI.esc(e.message || e)}</div>`;
      }
    },

    async toggle(prodId) {
      const existe = document.getElementById('var-' + prodId);
      if (existe) { existe.remove(); return; }
      const tr = document.querySelector(`[data-prod="${prodId}"]`);
      const fila = document.createElement('tr');
      fila.id = 'var-' + prodId;
      fila.innerHTML = `<td colspan="3" style="background:var(--panel-2)">${UI.spinner('Variantes…')}</td>`;
      tr.after(fila);
      try {
        const vars = await global.DB.variantes(prodId);
        fila.querySelector('td').innerHTML = this.tablaVariantes(vars);
      } catch (e) {
        fila.querySelector('td').innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`;
      }
    },

    tablaVariantes(vars) {
      if (!vars.length) return UI.vacio('Sin variantes cargadas.');
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
            <td style="text-align:right"><b class="tnum">${UI.pesos(v.precio)}</b></td></tr>`;
        }).join('')}</tbody></table>`;
    },

    modalConexion() {
      const c = global.DB.cfg();
      document.body.insertAdjacentHTML('beforeend', `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:grid;place-items:center;padding:20px" id="mdl">
          <div class="card pad" style="max-width:460px;width:100%">
            <h3 class="h-title" style="font-size:18px">Conectar Belgrano Soft</h3>
            <p class="h-sub">Pegá la <b>anon key</b> (Settings → API → Project API keys → anon public). Es pública, va en el frontend.</p>
            <label class="fld" style="margin-top:14px"><span class="lbl">URL del proyecto</span>
              <input id="mc-url" value="${UI.esc(c.url || global.DB.DEFAULT_URL)}"></label>
            <label class="fld" style="margin-top:12px"><span class="lbl">anon key</span>
              <input id="mc-key" placeholder="eyJ…" value="${UI.esc(c.key || '')}"></label>
            <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
              <button class="btn" id="mc-cancel">Cancelar</button>
              <button class="btn primary" id="mc-ok">Conectar</button>
            </div>
          </div>
        </div>`);
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
