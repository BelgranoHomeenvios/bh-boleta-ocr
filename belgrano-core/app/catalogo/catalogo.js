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

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
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
        <thead><tr><th>Producto</th><th>Código</th><th style="text-align:right">Desde</th>
          <th style="text-align:right">Variantes</th><th></th></tr></thead>
        <tbody>${prods.map(p => {
          const tn = p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>';
          return `<tr data-prod="${p.id}" style="cursor:pointer">
            <td><b>${UI.esc(p.nombre)}</b> ${tn}</td>
            <td class="muted tnum">${UI.esc(p.sku || '—')}</td>
            <td style="text-align:right" class="tnum">${p.desde ? UI.pesos(p.desde) : '—'}</td>
            <td style="text-align:right" class="tnum">${p.variantes}</td>
            <td style="text-align:right" class="muted">ver ›</td></tr>`;
        }).join('')}</tbody></table></div>`;
    },

    // Silueta del mueble por tipo. Es un dibujo, no la foto: sirve para
    // reconocer el mueble de un vistazo hasta que estén las fotos de Tienda Nube.
    silueta(catId) {
      const t = { fill: 'none', s: 'currentColor' };
      const D = {
        2: '<rect x="14" y="26" width="92" height="58" rx="3"/><line x1="14" y1="45" x2="106" y2="45"/><line x1="14" y1="64" x2="106" y2="64"/><line x1="50" y1="35" x2="70" y2="35"/><line x1="50" y1="54" x2="70" y2="54"/><line x1="50" y1="74" x2="70" y2="74"/><line x1="22" y1="84" x2="22" y2="92"/><line x1="98" y1="84" x2="98" y2="92"/>',
        3: '<rect x="20" y="12" width="80" height="80" rx="3"/><line x1="60" y1="12" x2="60" y2="92"/><circle cx="54" cy="52" r="2.5"/><circle cx="66" cy="52" r="2.5"/><line x1="20" y1="30" x2="100" y2="30"/>',
        6: '<rect x="30" y="40" width="60" height="34" rx="3"/><line x1="30" y1="58" x2="90" y2="58"/><line x1="52" y1="49" x2="68" y2="49"/><line x1="36" y1="74" x2="36" y2="88"/><line x1="84" y1="74" x2="84" y2="88"/>',
        5: '<rect x="16" y="42" width="88" height="10" rx="2"/><line x1="30" y1="52" x2="24" y2="86"/><line x1="90" y1="52" x2="96" y2="86"/><line x1="34" y1="70" x2="86" y2="70"/>',
        7: '<rect x="12" y="40" width="96" height="34" rx="3"/><line x1="60" y1="40" x2="60" y2="74"/><line x1="12" y1="62" x2="108" y2="62"/><line x1="24" y1="74" x2="24" y2="86"/><line x1="96" y1="74" x2="96" y2="86"/>',
      };
      return `<svg class="sil" viewBox="0 0 120 100" fill="${t.fill}" stroke="${t.s}"
        stroke-width="2" stroke-linecap="round" aria-hidden="true">${D[catId] || D[2]}</svg>`;
    },

    htmlBloques(prods) {
      return `<div class="grid-prod">${prods.map(p => {
        const tn = p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>';
        return `<button class="prod-tile" data-prod="${p.id}">
            <div class="prod-img">${this.silueta(p.categoria_id)}</div>
            <div class="prod-top"><span class="prod-n">${UI.esc(p.nombre)}</span> ${tn}</div>
            <div class="prod-meta">${p.desde ? `desde <b class="tnum">${UI.pesos(p.desde)}</b> · ` : ''}<b class="tnum">${p.variantes}</b> variantes</div>
          </button>`;
      }).join('')}</div>
        <style>
          .grid-prod{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
          .prod-tile{display:flex;flex-direction:column;gap:8px;align-items:stretch;padding:12px;
            border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow);
            cursor:pointer;text-align:left;transition:.15s}
          .prod-tile:hover{border-color:var(--brand);transform:translateY(-1px)}
          .prod-img{display:grid;place-items:center;background:var(--panel-2);border-radius:9px;
            padding:10px;color:var(--muted);min-height:104px}
          .prod-tile:hover .prod-img{color:var(--brand)}
          .sil{width:100%;max-width:150px;height:88px}
          .prod-top{display:flex;align-items:center;gap:8px}
          .prod-n{font-weight:650;color:var(--navy);flex:1;font-size:13.5px}
          .prod-meta{color:var(--muted);font-size:12.5px}
        </style>`;
    },

    enganchar(cont) {
      // En las dos vistas se entra a la FICHA del mueble: es la pantalla donde
      // el vendedor mira precios, medidas y terminaciones antes de cotizar.
      cont.querySelectorAll('[data-prod]').forEach(el =>
        el.onclick = () => this.ficha(Number(el.dataset.prod)));
    },

    // ---- Ficha del mueble --------------------------------------------------
    async ficha(prodId) {
      const v = document.getElementById(this._mount || 'view');
      v.innerHTML = UI.spinner('Abriendo el mueble…');
      let p, vars;
      try {
        p = await global.DB.producto(prodId);
        vars = await global.DB.variantes(prodId);
      } catch (e) {
        v.innerHTML = `<div class="banner warn">No se pudo abrir: ${UI.esc(e.message || e)}</div>`;
        return;
      }
      if (!p) { v.innerHTML = UI.vacio('Ese mueble no está en el catálogo.'); return; }

      // Los tres ejes con sus opciones, para el armador de la ficha.
      const eje = k => [...new Set(vars.map(x => x[k]).filter(Boolean))];
      const EJES = [
        { k: 'medida', lbl: 'Medida', ops: eje('medida') },
        { k: 'estructura', lbl: 'Estructura', ops: eje('estructura') },
        { k: 'frente', lbl: 'Frente', ops: eje('frente') },
      ].filter(e => e.ops.length);
      this._sel = {}; EJES.forEach(e => { this._sel[e.k] = e.ops[0]; });
      this._vars = vars; this._p = p; this._ejes = EJES;

      const tn = p.publicado_tn
        ? '<span class="pill ok">Publicado en Tienda Nube</span>'
        : '<span class="pill soft">Sólo interno</span>';
      const ruta = [p.ambiente && p.ambiente.nombre, p.categoria && p.categoria.nombre].filter(Boolean);

      v.innerHTML = `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div>
            <div class="kick"><a href="#" id="fi-volver">‹ Catálogo</a>${
              ruta.length ? ` · ${UI.esc(ruta.join(' › '))}` : ''}</div>
            <h1 class="h-title">${UI.esc(p.nombre)}</h1>
            <div class="h-sub">${p.sku ? `<span class="tnum">${UI.esc(p.sku)}</span> · ` : ''}${tn}</div>
          </div>
          <div class="sp"></div>
          <button class="btn primary" id="fi-cotizar">Cotizar este mueble</button>
        </div>

        <div class="fi-cols">
          <div class="card pad fi-foto">
            <div class="fi-img">${this.silueta(p.categoria_id)}</div>
            <div class="hint" style="margin-top:8px">Dibujo de referencia — la foto viene de Tienda Nube.</div>
          </div>

          <div class="card pad">
            <div class="fi-precio">
              <span>Precio de lista</span>
              <b class="tnum" id="fi-p">—</b>
              <span class="fi-efe" id="fi-e"></span>
            </div>
            ${EJES.map(e => `<div class="fi-eje">
              <div class="fi-lbl">${UI.esc(e.lbl)}</div>
              <div class="fi-ops">${e.ops.map(o =>
                `<button class="opb" data-eje="${e.k}" data-op="${UI.esc(o)}">${UI.esc(o)}</button>`).join('')}</div>
            </div>`).join('')}
            <div class="fi-nota" id="fi-nota"></div>
          </div>
        </div>

        <div class="fi-cols" style="margin-top:14px">
          <div class="card pad">
            <div class="fi-h">Ficha técnica</div>
            <div class="fi-dl">
              ${p.alto ? `<div><span>Alto</span><b>${String(p.alto).replace('.', ',')} m</b></div>` : ''}
              ${p.prof ? `<div><span>Profundidad</span><b>${String(p.prof).replace('.', ',')} m</b></div>` : ''}
              <div><span>Medidas</span><b>${UI.esc((eje('medida').join(' · ')) || '—')}</b></div>
              <div><span>Plazo de fábrica</span><b>${p.dias ? `${p.dias} días` : 'a confirmar'}</b></div>
              <div class="ancho"><span>Materiales</span><b>${UI.esc(p.materiales || '—')}</b></div>
            </div>
            ${p.desc ? `<p class="fi-desc">${UI.esc(p.desc)}</p>` : ''}
          </div>
          <div class="card pad">
            <div class="fi-h">Todas las combinaciones <span class="muted">(${vars.length})</span></div>
            <div class="fi-tabla">${this.tablaVariantes(vars)}</div>
          </div>
        </div>
        ${this.estiloFicha()}`;

      document.getElementById('fi-volver').onclick = e => { e.preventDefault(); this.render(this._mount || 'view'); };
      document.getElementById('fi-cotizar').onclick = () => this.aCotizar();
      v.querySelectorAll('[data-eje]').forEach(b => b.onclick = () => {
        this._sel[b.dataset.eje] = b.dataset.op; this.refrescarFicha();
      });
      this.refrescarFicha();
    },

    // La variante que corresponde a lo elegido en los tres ejes.
    varSel() {
      return (this._vars || []).find(v => this._ejes.every(e => v[e.k] === this._sel[e.k])) || null;
    },

    refrescarFicha() {
      const v = this.varSel();
      document.querySelectorAll('[data-eje]').forEach(b =>
        b.classList.toggle('on', this._sel[b.dataset.eje] === b.dataset.op));
      const p = document.getElementById('fi-p'); if (!p) return;
      p.textContent = v ? UI.pesos(v.precio) : '—';
      // El de lista es el que se cotiza; el de efectivo sale del mismo lugar
      // que en la cotización (Configuración → Reglas de precio).
      const pct = global.DB.descuentoDe('efectivo');
      const e = document.getElementById('fi-e');
      e.innerHTML = v && pct
        ? `en efectivo <b class="tnum">${UI.pesos(Math.round(v.precio * (1 - pct / 100)))}</b> <span class="int">−${pct}%</span>`
        : '';
      const n = document.getElementById('fi-nota');
      n.innerHTML = v
        ? `<span class="muted">Combinación</span> <b>${UI.esc(this._ejes.map(x => this._sel[x.k]).join(' · '))}</b>`
        : `<span class="warn-t">Esa combinación no está en el catálogo — se cotiza <b>a medida</b>.</span>`;
    },

    // Desde la ficha se salta al presupuesto con el mueble ya cargado.
    aCotizar() {
      const v = this.varSel();
      if (!v) return UI.aviso('Elegí una combinación que exista para cotizarla', 'warn');
      global.Presupuesto._precarga = { nombre: this._p.nombre, variante: v };
      global.App.goSub('ventas', 'nueva');
    },

    estiloFicha() {
      return `<style>
        .fi-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:14px;align-items:start}
        @media(max-width:900px){.fi-cols{grid-template-columns:1fr}}
        .fi-foto .fi-img{display:grid;place-items:center;background:var(--panel-2);border-radius:10px;
          padding:18px;color:var(--muted);min-height:210px}
        .fi-foto .sil{width:100%;max-width:300px;height:180px}
        .fi-precio{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-bottom:12px;
          margin-bottom:12px;border-bottom:1px solid var(--line)}
        .fi-precio>span:first-child{font-size:11px;font-weight:700;letter-spacing:.06em;
          text-transform:uppercase;color:var(--muted)}
        .fi-precio b{font-size:26px;color:var(--navy)}
        .fi-efe{font-size:13px;color:var(--muted)}
        .fi-efe b{font-size:13px;color:var(--ok)}
        .fi-eje{margin-bottom:11px}
        .fi-lbl{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
          color:var(--muted);margin-bottom:5px}
        .fi-ops{display:flex;gap:6px;flex-wrap:wrap}
        .opb{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:6px 12px;
          font-size:13px;color:var(--ink-soft);cursor:pointer;transition:.12s}
        .opb:hover{border-color:var(--brand)}
        .opb.on{border-color:var(--brand);background:var(--brand);color:#fff;font-weight:650}
        .fi-nota{margin-top:12px;padding-top:10px;border-top:1px solid var(--line-soft);font-size:12.5px}
        .fi-nota b{color:var(--navy)}
        .warn-t{color:var(--warn)}
        .fi-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
          color:var(--navy);margin-bottom:11px}
        .fi-dl{display:grid;grid-template-columns:1fr 1fr;gap:9px 16px}
        .fi-dl .ancho{grid-column:1/-1}
        .fi-dl span{display:block;font-size:11px;color:var(--muted)}
        .fi-dl b{font-size:13px;color:var(--navy);font-weight:600}
        .fi-desc{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--line-soft);
          font-size:13px;color:var(--ink-soft);line-height:1.55}
        .fi-tabla{max-height:340px;overflow:auto}
        .fi-tabla table{font-size:12.5px}
      </style>`;
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
