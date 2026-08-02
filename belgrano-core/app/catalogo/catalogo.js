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
            <button id="v-bloques" title="Con foto">Fotos</button>
            <button id="v-lista"   title="Listado">Listado</button>
          </div>
        </div>
        <div class="row" style="align-items:center;margin-bottom:4px">
          <div id="cat-crumb" style="flex:1;min-width:0"></div>
          <span class="hint" id="cat-cuenta"></span>
        </div>
        <div id="cat-lista">${UI.spinner()}</div>
        <style>
          .vista-tog{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel)}
          .vista-tog button{border:0;background:transparent;padding:8px 13px;cursor:pointer;font:inherit;
            font-size:12.5px;font-weight:650;color:var(--muted);line-height:1.6}
          .vista-tog button+button{border-left:1px solid var(--line)}
          .vista-tog button.on{background:var(--brand-soft);color:var(--brand-ink)}

          /* Filtros al costado y resultados al lado: el vendedor filtra sin
             perder de vista lo que está mirando. */
          .cat-amb{display:flex;gap:6px;flex-wrap:wrap}
          .amb{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:5px 13px;
            font:inherit;font-size:12.5px;font-weight:650;color:var(--ink-soft);cursor:pointer;transition:.12s}
          .amb:hover{border-color:var(--brand);color:var(--navy)}
          .amb.on{background:var(--navy);border-color:var(--navy);color:#fff}
          .cat-cols{display:grid;grid-template-columns:212px minmax(0,1fr);gap:18px;align-items:start}
          @media(max-width:900px){.cat-cols{grid-template-columns:1fr}}
          .cat-f{position:sticky;top:104px;display:flex;flex-direction:column;gap:14px}
          .cat-f-h{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;
            text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
          .cat-f-h .lnk{margin-left:auto;font-size:11.5px;text-transform:none;letter-spacing:0}
          .cat-g-t{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
            color:var(--muted);margin-bottom:5px}
          .cat-o{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer;font-size:12.5px;
            color:var(--ink-soft)}
          .cat-o:hover{color:var(--navy)}
          .cat-o.on{color:var(--navy);font-weight:650}
          .cat-o input{width:14px;height:14px;accent-color:var(--brand);flex:none;margin:0}
          .cat-o-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .cat-o-c{font-size:11px;color:var(--muted);flex:none}
          .pt{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.18);flex:none;
            display:inline-block}
          .pts{display:inline-flex;align-items:center;gap:3px}

          .grid-prod{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:12px}
          .prod-tile{display:flex;flex-direction:column;gap:3px;align-items:stretch;padding:0 0 11px;
            border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow);
            cursor:pointer;text-align:left;transition:.15s;overflow:hidden}
          .prod-tile:hover{border-color:var(--brand);transform:translateY(-1px)}
          .prod-img{position:relative;display:grid;place-items:center;background:var(--panel-2);
            padding:14px;color:var(--muted);min-height:132px;border-bottom:1px solid var(--line-soft);
            margin-bottom:9px}
          .prod-tile:hover .prod-img{color:var(--brand)}
          .prod-est{position:absolute;top:9px;left:9px}
          .sil{width:100%;max-width:150px;height:96px}
          .prod-n{font-weight:700;color:var(--navy);font-size:13px;padding:0 11px;line-height:1.3}
          .prod-c{font-size:11.5px;color:var(--muted);padding:0 11px}
          .prod-p{font-size:13px;color:var(--navy);padding:2px 11px 0}
          .prod-b{display:flex;align-items:center;gap:8px;padding:5px 11px 0}
          .prod-v{font-size:11.5px;color:var(--brand);font-weight:650;flex:1}
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

    // ---- Filtros del costado ----------------------------------------------
    // Se filtra por acá y se navega por el árbol de arriba: son dos cosas
    // distintas. El árbol dice DÓNDE estoy mirando; los filtros, QUÉ de todo
    // eso quiero ver. Marcar dos ambientes es normal —racks y aparadores para
    // el mismo living— y eso el árbol solo no lo puede hacer.
    _f: { ambiente: [], tipo: [], term: [], disp: [], pub: [] },

    // Todos los productos del catálogo, sin filtrar: es contra esto que se
    // cuentan las opciones de cada filtro.
    async cargarTodo() {
      if (this._todo) return this._todo;
      this._todo = await global.DB.productos({ limite: 500 });
      return this._todo;
    },

    normTerm(t) {
      return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    },

    ambienteDe(catId) {
      let c = this.arbol.find(x => x.id === catId);
      while (c && c.padre_id) c = this.arbol.find(x => x.id === c.padre_id);
      return c || null;
    },

    // Un producto pasa el filtro si cumple con TODOS los grupos marcados, y
    // adentro de un grupo alcanza con cualquiera: marcar Living y Dormitorio
    // muestra los dos, no la intersección —que sería siempre vacía—.
    pasa(p, salvo) {
      const f = this._f;
      const amb = this.ambienteDe(p.categoria_id);
      if (salvo !== 'ambiente' && f.ambiente.length && !f.ambiente.includes(amb && amb.id)) return false;
      if (salvo !== 'tipo' && f.tipo.length && !f.tipo.includes(p.categoria_id)) return false;
      if (salvo !== 'term' && f.term.length
        && !(p.terminaciones || []).some(t => f.term.includes(this.normTerm(t)))) return false;
      if (salvo !== 'disp' && f.disp.length) {
        const k = (p.stock || 0) > 0 ? 'stock' : 'pedido';
        if (!f.disp.includes(k)) return false;
      }
      if (salvo !== 'pub' && f.pub.length) {
        const k = p.publicado_tn ? 'tn' : 'interno';
        if (!f.pub.includes(k)) return false;
      }
      return true;
    },

    // Cada opción muestra cuántos muebles quedarían si la marcaras. Se cuenta
    // ignorando su propio grupo: si no, marcar una opción pondría el resto en
    // cero y no se podría elegir una segunda.
    grupos() {
      const todo = this._todo || [];
      const cuenta = (salvo, fn) => {
        const m = new Map();
        todo.filter(p => this.pasa(p, salvo)).forEach(p => {
          [].concat(fn(p) || []).filter(x => x != null).forEach(k => m.set(k, (m.get(k) || 0) + 1));
        });
        return m;
      };
      const cAmb = cuenta('ambiente', p => (this.ambienteDe(p.categoria_id) || {}).id);
      const cTipo = cuenta('tipo', p => p.categoria_id);
      // Se cuenta por la clave normalizada, para que no salgan dos renglones
      // por la misma terminación escrita distinto.
      const cTerm = cuenta('term', p => [...new Set((p.terminaciones || []).map(t => this.normTerm(t)))]);
      const nomTerm = new Map();
      todo.forEach(p => (p.terminaciones || []).forEach(t => {
        const k = this.normTerm(t);
        if (!nomTerm.has(k)) nomTerm.set(k, t);
      }));
      const cDisp = cuenta('disp', p => ((p.stock || 0) > 0 ? 'stock' : 'pedido'));
      const cPub = cuenta('pub', p => (p.publicado_tn ? 'tn' : 'interno'));
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || '—';
      const ord = (m, etiqueta) => [...m.entries()]
        .map(([k, n]) => ({ k, n, label: etiqueta(k) }))
        .sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label)));

      return [
        { k: 'tipo', titulo: 'Tipo de mueble', ops: ord(cTipo, nom) },
        { k: 'term', titulo: 'Terminación', ops: ord(cTerm, k => nomTerm.get(k) || k), color: true },
        { k: 'disp', titulo: 'Disponibilidad',
          ops: ord(cDisp, k => (k === 'stock' ? 'Con stock' : 'A pedido')) },
        { k: 'pub', titulo: 'Publicación',
          ops: ord(cPub, k => (k === 'tn' ? 'En Tienda Nube' : 'Sólo interno')) },
      ].filter(g => g.ops.length > 1 || this._f[g.k].length);
    },

    marcados() {
      return Object.values(this._f).reduce((a, x) => a + x.length, 0);
    },

    htmlFiltros() {
      const gs = this.grupos();
      if (!gs.length) return '';
      return `<aside class="cat-f">
        <div class="cat-f-h">
          <span>Filtros</span>
          ${this.marcados() ? `<button class="lnk" id="cat-limpiar">limpiar ${this.marcados()}</button>` : ''}
        </div>
        ${gs.map(g => `<div class="cat-g">
          <div class="cat-g-t">${UI.esc(g.titulo)}</div>
          ${g.ops.map(o => `<label class="cat-o ${this._f[g.k].includes(o.k) ? 'on' : ''}">
            <input type="checkbox" data-f="${g.k}" data-v="${UI.esc(String(o.k))}"
              ${this._f[g.k].includes(o.k) ? 'checked' : ''}>
            ${g.color ? `<span class="pt" style="background:${global.DB.colorDe(o.label)}"></span>` : ''}
            <span class="cat-o-n">${UI.esc(o.label)}</span>
            <span class="cat-o-c tnum">${o.n}</span>
          </label>`).join('')}
        </div>`).join('')}
      </aside>`;
    },

    engancharFiltros() {
      document.querySelectorAll('[data-f]').forEach(i => i.onchange = () => {
        const g = i.dataset.f;
        // Las claves numéricas del árbol vuelven del DOM como texto.
        const v = /^\d+$/.test(i.dataset.v) ? Number(i.dataset.v) : i.dataset.v;
        this._f[g] = i.checked ? [...this._f[g], v] : this._f[g].filter(x => x !== v);
        this.pintar();
      });
      const l = document.getElementById('cat-limpiar');
      if (l) l.onclick = () => {
        Object.keys(this._f).forEach(k => { this._f[k] = []; });
        this.pintar();
      };
    },

    crumb() {
      const c = document.getElementById('cat-crumb');
      if (!c) return;
      const ambientes = this.hijos(null);
      const sel = this._f.ambiente;
      c.innerHTML = `<div class="cat-amb">
        <button class="amb ${sel.length ? '' : 'on'}" data-amb="">Todo</button>
        ${ambientes.map(a => `<button class="amb ${sel.includes(a.id) ? 'on' : ''}"
          data-amb="${a.id}">${UI.esc(a.nombre)}</button>`).join('')}
      </div>`;
      c.querySelectorAll('[data-amb]').forEach(b => b.onclick = () => {
        const v = b.dataset.amb;
        if (!v) { this._f.ambiente = []; this._f.tipo = []; }
        else {
          const id = Number(v);
          // Cambiar de ambiente limpia los tipos: los de Living no existen
          // en Dormitorio y quedarían filtrando en falso.
          this._f.ambiente = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id];
          this._f.tipo = this._f.tipo.filter(t => {
            const amb = this.ambienteDe(t);
            return !this._f.ambiente.length || (amb && this._f.ambiente.includes(amb.id));
          });
        }
        this.pintar();
      });
    },

    async pintar() {
      this.crumb();
      const cont = document.getElementById('cat-lista');
      cont.innerHTML = UI.spinner();
      const actual = this.ruta.length ? this.ruta[this.ruta.length - 1].id : null;

      try {
        await this.cargarTodo();
      } catch (e) {
        cont.innerHTML = `<div class="banner warn">No se pudo leer: ${UI.esc(e.message || e)}</div>`;
        return;
      }

      // Lo que se ve es: lo que cuelga de donde estoy parado, filtrado, y si
      // hay texto, lo que coincide en todo el catálogo.
      const bajo = id => {
        if (id == null) return () => true;
        const dentro = new Set([id]);
        let cambio = true;
        while (cambio) {
          cambio = false;
          this.arbol.forEach(c => {
            if (c.padre_id != null && dentro.has(c.padre_id) && !dentro.has(c.id)) {
              dentro.add(c.id); cambio = true;
            }
          });
        }
        return p => dentro.has(p.categoria_id);
      };
      const t = global.DB.sinTilde ? global.DB.sinTilde(this.texto) : this.texto.toLowerCase();
      const enTexto = p => !this.texto
        || (p.nombre + ' ' + (p.sku || '')).toLowerCase().includes(this.texto.toLowerCase());

      this._prods = (this._todo || [])
        .filter(this.texto ? enTexto : bajo(actual))
        .filter(p => this.pasa(p));

      cont.innerHTML = `<div class="cat-cols">
        ${this.htmlFiltros()}
        <div class="cat-res" id="cat-res"></div>
      </div>`;
      this.pintarProductos(document.getElementById('cat-res') || cont, this.texto
        ? 'No hay muebles para esa búsqueda.'
        : (this.marcados() ? 'Ningún mueble cumple con esos filtros.' : 'No hay muebles acá.'));
      this.engancharFiltros();
      this.pintarSub();
    },

    // Cuántos se están viendo, arriba a la derecha.
    pintarSub() {
      const s = document.getElementById('cat-cuenta');
      if (!s) return;
      const n = (this._prods || []).length, tot = (this._todo || []).length;
      s.textContent = n === tot
        ? `${tot} ${tot === 1 ? 'mueble' : 'muebles'}`
        : `${n} de ${tot} muebles`;
    },

    async buscar() {
      this.ruta = [];
      this.pintar();
    },

    // Cambia entre bloques/listado y re-pinta lo que haya sin volver a la base.
    setVista(v) {
      if (v === this.vista) return;
      this.vista = v;
      try { localStorage.setItem(VISTA_KEY, v); } catch {}
      this.pintarTog();
      const cont = document.getElementById('cat-res') || document.getElementById('cat-lista');
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
      if (!cont) return;
      const prods = this._prods || [];
      cont.innerHTML = prods.length
        ? (this.vista === 'lista' ? this.htmlLista(prods) : this.htmlBloques(prods))
        : UI.vacio(vacio);
      this.enganchar(cont);
      this.pintarSub();
    },

    // El estado del mueble de un vistazo, que es lo que cambia la conversación
    // con el cliente: si hay en depósito se entrega ya; si no, se fabrica.
    estado(p) {
      if (p.publicado_tn === false && p.publicado === false) return { label: 'Oculto', pill: 'soft' };
      if ((p.stock || 0) > 0) return { label: `Stock ${p.stock}`, pill: 'ok' };
      return { label: 'A pedido', pill: 'warn' };
    },
    puntos(p) {
      const ts = (p.terminaciones || []).slice(0, 5);
      if (!ts.length) return '';
      return `<span class="pts">${ts.map(t =>
        `<span class="pt" title="${UI.esc(t)}" style="background:${global.DB.colorDe(t)}"></span>`).join('')}
        ${(p.terminaciones || []).length > 5
          ? `<small class="muted">+${p.terminaciones.length - 5}</small>` : ''}</span>`;
    },
    catDe(id) { return (this.arbol.find(c => c.id === id) || {}).nombre || ''; },

    htmlLista(prods) {
      return `<div class="card"><table>
        <thead><tr><th>Producto</th><th>Código</th><th>Tipo</th>
          <th style="text-align:right">Variantes</th><th style="text-align:right">Stock</th>
          <th style="text-align:right">Desde</th><th>Terminaciones</th><th></th><th></th></tr></thead>
        <tbody>${prods.map(p => {
          const e = this.estado(p);
          return `<tr data-prod="${p.id}" style="cursor:pointer">
            <td><b>${UI.esc(p.nombre)}</b></td>
            <td class="muted tnum">${UI.esc(p.sku || '—')}</td>
            <td class="muted">${UI.esc(this.catDe(p.categoria_id))}</td>
            <td style="text-align:right" class="tnum">${p.variantes}</td>
            <td style="text-align:right" class="tnum">${p.stock || '—'}</td>
            <td style="text-align:right" class="tnum">${p.desde ? UI.pesos(p.desde) : '—'}</td>
            <td>${this.puntos(p)}</td>
            <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
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
        const e = this.estado(p);
        return `<button class="prod-tile" data-prod="${p.id}">
            <div class="prod-img">${this.silueta(p.categoria_id)}
              <span class="pill ${e.pill} prod-est">${UI.esc(e.label)}</span></div>
            <div class="prod-n">${UI.esc(p.nombre)}</div>
            <div class="prod-c">${UI.esc(this.catDe(p.categoria_id))}</div>
            <div class="prod-p">${p.desde
              ? `desde <b class="tnum">${UI.pesos(p.desde)}</b>` : '<span class="muted">sin precio</span>'}</div>
            <div class="prod-b"><span class="prod-v">${p.variantes}
              ${p.variantes === 1 ? 'variante' : 'variantes'}</span>${this.puntos(p)}</div>
          </button>`;
      }).join('')}</div>`;
    },

    enganchar(cont) {
      // En las dos vistas se entra a la FICHA del mueble: es la pantalla donde
      // el vendedor mira precios, medidas y terminaciones antes de cotizar.
      cont.querySelectorAll('[data-prod]').forEach(el =>
        el.onclick = () => this.ficha(Number(el.dataset.prod)));
    },

    // ---- Ficha del mueble --------------------------------------------------
    // Dirección y Producción entran al mueble para editarlo; el resto ve la
    // ficha de lectura.
    async ficha(prodId) {
      if (global.ProductoDet && global.App && global.App.tab === 'catalogo') {
        return global.ProductoDet.render(this._mount || 'view', prodId);
      }
      return this.fichaLectura(prodId);
    },

    async fichaLectura(prodId) {
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
