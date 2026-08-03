// =====================================================================
//  Belgrano Soft · Catálogo
//  Navegación como en Tienda Nube: ambiente → tipo de mueble → modelo →
//  variantes. O búsqueda directa por texto. Es el cimiento del presupuesto.
// =====================================================================
(function (global) {
  const VISTA_KEY = 'bh_catalogo_vista';
  const FILTROS_KEY = 'bh_catalogo_filtros';
  const CATS_KEY = 'bh_catalogo_cats';
  const CERRADAS_KEY = 'bh_catalogo_cerradas';
  const GRUPOS_KEY = 'bh_catalogo_grupos';
  const Catalogo = {
    arbol: [],           // categorías cargadas
    ruta: [],            // breadcrumb: [{id,nombre}] hasta la categoría actual
    texto: '',           // búsqueda libre
    vista: (() => { try { return localStorage.getItem(VISTA_KEY) || 'bloques'; } catch { return 'bloques'; } })(),
    verFiltros: (() => { try { return localStorage.getItem(FILTROS_KEY) !== '0'; } catch { return true; } })(),
    verCats: (() => { try { return localStorage.getItem(CATS_KEY) !== '0'; } catch { return true; } })(),
    // Abajo de este ancho los dos costados no entran al mismo tiempo que los
    // muebles: se abren encima, de a uno.
    chico() {
      try { return window.matchMedia('(max-width:1180px)').matches; } catch { return false; }
    },
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
        </div>
        <div class="cat-bar">
          <div class="cat-busca">
            <input id="cat-q" placeholder="Buscar por nombre o código…" value="${UI.esc(this.texto)}">
          </div>
          <button class="btn" id="cat-verf">Filtrar<span id="cat-fn"></span></button>
          <select id="cat-orden" class="cat-ord" title="Cómo se ordenan">
            <option value="cat">Por categoría</option>
            <option value="nombre">Por nombre</option>
            <option value="precio">Por precio</option>
          </select>
          <div class="vista-tog" role="group" aria-label="Formato de vista">
            <button id="v-bloques" title="Ver con fotos" aria-label="Ver con fotos">
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="6" height="6" rx="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.4"/></svg></button>
            <button id="v-lista" title="Ver como listado" aria-label="Ver como listado">
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/></svg></button>
          </div>
        </div>
        <div id="cat-crumb"></div>
        <div id="cat-lista">${UI.spinner()}</div>
        <style>
          .vista-tog{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;
            background:var(--panel)}
          .vista-tog button{border:0;background:transparent;padding:6px 9px;cursor:pointer;
            color:var(--muted);line-height:0;display:grid;place-items:center}
          .vista-tog button+button{border-left:1px solid var(--line)}
          .vista-tog button svg{width:15px;height:15px;fill:currentColor}
          .vista-tog button:hover{color:var(--navy)}
          .vista-tog button.on{background:var(--brand-soft);color:var(--brand-ink)}

          /* Filtros al costado y resultados al lado: el vendedor filtra sin
             perder de vista lo que está mirando. */
          .cat-bar{display:flex;gap:8px;align-items:center;margin-bottom:12px}
          @media(max-width:760px){.cat-bar{flex-wrap:wrap}}
          .cat-busca{flex:1 1 auto;min-width:160px}
          .cat-busca input{width:100%;padding:9px 12px;font-size:13px}
          .cat-bar .btn{flex:none;white-space:nowrap}
          .cat-ord{flex:none;width:auto;min-width:146px;padding:8px 10px;font-size:12.5px;
            font-weight:650;color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;
            background:var(--panel)}
          .cat-bar .vista-tog{flex:none}
          #cat-fn{margin-left:6px;font-size:11px;background:var(--brand);color:#fff;border-radius:999px;
            padding:1px 6px}
          #cat-fn:empty{display:none}
          .cat-amb{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
          .amb-n{font-size:11px;opacity:.65;margin-left:3px}
          /* Cada categoría con su título: "ver todo" es recorrer el catálogo
             como está ordenado en la cabeza, no una lista suelta. */
          .cat-sec+.cat-sec{margin-top:22px}
          .cat-sec-h{display:flex;align-items:baseline;gap:9px;margin-bottom:9px;
            border-bottom:1px solid var(--line);padding-bottom:6px}
          .cat-sec-t{font-size:12.5px;font-weight:700;color:var(--navy);text-transform:uppercase;
            letter-spacing:.04em}
          .cat-sec-n{font-size:11.5px;color:var(--muted)}
          .cat-sec-v{margin-left:auto;font-size:11.5px}
          .amb{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:5px 13px;
            font:inherit;font-size:12.5px;font-weight:650;color:var(--ink-soft);cursor:pointer;transition:.12s}
          .amb:hover{border-color:var(--brand);color:var(--navy)}
          .amb.on{background:var(--navy);border-color:var(--navy);color:#fff}
          /* Plegar un costado tiene que servir para algo: entra una tarjeta
             más por fila. Por eso el número de columnas de la grilla depende
             de cuántos costados estén abiertos. */
          .cat-cols{display:grid;grid-template-columns:206px minmax(0,1fr) 210px;gap:18px;
            align-items:start;--cols:4}
          .cat-cols.sin-f{grid-template-columns:26px minmax(0,1fr) 210px;--cols:5}
          .cat-cols.sin-c{grid-template-columns:206px minmax(0,1fr) 26px;--cols:5}
          .cat-cols.sin-f.sin-c{grid-template-columns:26px minmax(0,1fr) 26px;--cols:6}
          @media(max-width:1180px){.cat-cols,.cat-cols.sin-f,.cat-cols.sin-c,
            .cat-cols.sin-f.sin-c{grid-template-columns:1fr;--cols:3}}
          /* La flecha que pliega cada costado, sobre el borde de adentro. */
          .cat-fl{border:1px solid var(--line);background:var(--panel);border-radius:8px;
            width:24px;height:34px;cursor:pointer;color:var(--muted);font-size:15px;line-height:1;
            display:grid;place-items:center;padding:0}
          .cat-fl:hover{border-color:var(--brand);color:var(--brand)}
          .cat-fl.dentro{position:absolute;top:-2px}
          .cat-fl.izq.dentro{right:-10px} .cat-fl.der.dentro{left:-10px}
          .cat-f,.cat-c{position:relative}
          .cat-f,.cat-c{position:sticky;top:104px;display:flex;flex-direction:column;gap:14px}
          /* El pop-up de Filtrar: una fila de opciones por grupo, se elige una. */
          .mdl-back{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
            place-items:center;padding:20px}
          .mdl-caja{max-width:520px;width:100%;max-height:86vh;overflow:auto}
          .fx-g{margin-top:14px}
          .fx-t{font-size:11.5px;font-weight:700;color:var(--ink-soft);margin-bottom:6px}
          .fx-ops{display:flex;gap:6px;flex-wrap:wrap}
          .fx-o{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:6px 12px;
            font:inherit;font-size:12.5px;font-weight:650;color:var(--ink-soft);cursor:pointer}
          .fx-o:hover{border-color:var(--brand);color:var(--navy)}
          .fx-o.on{background:var(--brand);border-color:var(--brand);color:#fff}
          /* El listado: renglón entero clickeable, foto chica al final. */
          .cat-tabla tbody tr{cursor:pointer}
          .cat-tabla tbody tr:hover{background:var(--panel-2)}
          .cat-tabla .cat-tr-h{cursor:default}
          .cat-tabla .cat-tr-h:hover{background:none}
          .cat-tabla .cat-tr-h td{background:var(--panel-2);padding:7px 12px;
            border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
          .cat-tabla .cat-tr-h .cat-sec-n{margin-left:8px}
          .cat-tabla .cat-tr-h .cat-sec-v{float:right}
          /* El título de cada categoría es el botón para plegarla. */
          .cat-sec-b{display:inline-flex;align-items:baseline;gap:8px;border:0;background:none;
            font:inherit;cursor:pointer;padding:0;text-align:left}
          .cat-sec-b:hover .cat-sec-t{color:var(--brand)}
          .cat-sec-g{font-size:10px;color:var(--muted);width:10px;flex:none}
          .cat-sec.plegada .cat-sec-h{border-bottom-color:var(--line-soft);margin-bottom:0}
          .cat-sec.plegada+.cat-sec{margin-top:10px}
          .lnk-b{align-self:flex-start;padding-left:22px}
          .cat-tabla .th-foto{width:70px}
          .cat-tabla .td-foto{padding-top:4px;padding-bottom:4px}
          .mini{display:grid;place-items:center;width:56px;height:56px;border-radius:8px;
            background:var(--panel-2);border:1px solid var(--line-soft);overflow:hidden;
            color:var(--muted)}
          .mini img{width:100%;height:100%;object-fit:cover;display:block}
          .mini .sil{width:44px;height:34px}
          .cat-tabla .td-mas{width:44px;text-align:right}
          .cat-tabla .lx{border:1px solid var(--line);background:var(--panel);border-radius:8px;
            cursor:pointer;font-size:14px;line-height:1;padding:4px 8px;color:var(--muted)}
          .cat-tabla .lx:hover{border-color:var(--brand);color:var(--brand)}
          .cat-menu-back{position:fixed;inset:0;z-index:59}
          .cat-menu{position:fixed;z-index:60;width:190px;background:var(--panel);
            border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(15,26,42,.16);
            padding:5px;display:flex;flex-direction:column}
          .cat-menu button{border:0;background:none;font:inherit;font-size:12.5px;text-align:left;
            padding:7px 10px;border-radius:7px;cursor:pointer;color:var(--ink-soft)}
          .cat-menu button:hover{background:var(--brand-soft);color:var(--brand-ink)}
          /* La lista de categorías scrollea sola: son veinte y pico y no
             tienen que empujar la pantalla. */
          .cat-lc{display:flex;flex-direction:column;max-height:min(60vh,520px);overflow:auto;
            padding-right:4px}
          .cat-lc::-webkit-scrollbar{width:6px}
          .cat-lc::-webkit-scrollbar-thumb{background:var(--line);border-radius:9px}
          /* Con la pantalla chica el costado se abre encima. Se cierra con la
             flecha, tocando afuera, o volviendo a apretar el botón. */
          .cat-back{position:fixed;inset:0;background:rgba(12,22,44,.35);z-index:40}
          .cat-cajon{position:fixed;top:0;right:0;bottom:0;width:min(330px,88vw);z-index:41;
            background:var(--panel);border-left:1px solid var(--line);display:flex;
            flex-direction:column;box-shadow:-8px 0 24px rgba(15,26,42,.14)}
          .cat-cajon-h{display:flex;align-items:center;gap:8px;padding:11px 14px;
            border-bottom:1px solid var(--line);font-size:13.5px;color:var(--navy)}
          .cat-cajon-h .lx{border:0;background:none;cursor:pointer;font-size:19px;line-height:1;
            color:var(--muted);padding:2px 6px;border-radius:7px}
          .cat-cajon-h .lx:hover{background:var(--panel-2);color:var(--navy)}
          .cat-cajon-b{padding:14px;overflow:auto;flex:1}
          .cat-cajon .cat-f,.cat-cajon .cat-c{position:static;top:auto}
          /* Adentro del cajón el título ya está arriba: no se repite. */
          .cat-cajon .cat-f-h>span{display:none}
          .cat-cajon .cat-f-h{margin-top:-6px}
          .cat-cajon .cat-lc{max-height:none}
          .cat-bar .btn.on{background:var(--navy);border-color:var(--navy);color:#fff}
          #cat-cn{margin-left:6px;font-size:11px;background:var(--brand);color:#fff;border-radius:999px;
            padding:1px 6px}
          #cat-cn:empty{display:none}
          .btn.on #cat-fn,.btn.on #cat-cn{background:#fff;color:var(--navy)}
          .cat-f-h{display:flex;align-items:baseline;gap:8px;font-size:11px;font-weight:700;
            text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
          .cat-f .cat-f-h{padding-right:22px}
          .cat-c .cat-f-h{padding-left:22px}
          .cat-c-sub{margin-top:-10px;padding-left:22px}
          .lnk-mas{margin-top:3px;align-self:flex-start}
          /* Los enlaces del costado son texto, no botones con caja. */
          .cat-c .lnk,.cat-f .lnk{border:0;background:none;padding:0;font:inherit;font-size:11px;
            font-weight:600;color:var(--brand);cursor:pointer;text-transform:none;letter-spacing:0}
          .cat-c .lnk:hover,.cat-f .lnk:hover{text-decoration:underline}
          /* Cada grupo se abre y se cierra desde su título. */
          .cat-g{display:flex;flex-direction:column}
          .cat-g-t{display:flex;align-items:center;gap:6px;width:100%;border:0;background:none;
            padding:3px 0;cursor:pointer;font:inherit;font-size:11px;font-weight:700;
            text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left}
          .cat-g-t:hover{color:var(--navy)}
          .cat-g.on .cat-g-t{margin-bottom:3px;color:var(--ink-soft)}
          .cat-g-fl{font-size:9px;width:9px;flex:none}
          .cat-g-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .cat-g-m{font-size:10px;font-weight:700;background:var(--brand);color:#fff;
            border-radius:999px;padding:0 6px;line-height:15px;flex:none}
          .cat-g-r{font-size:11.5px;color:var(--brand);padding-left:15px;margin-bottom:2px;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .cat-o{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer;font-size:12.5px;
            color:var(--ink-soft)}
          .cat-o:hover{color:var(--navy)}
          .cat-o.on{color:var(--navy);font-weight:650}
          .cat-o input{width:14px;height:14px;accent-color:var(--brand);flex:none;margin:0}
          .cat-o-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .cat-o-c{font-size:11px;color:var(--muted);flex:none;margin-left:5px}
          .pt{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.18);flex:none;
            display:inline-block}
          .pts{display:inline-flex;align-items:center;gap:3px}

          /* Cuatro por fila, que es donde el mueble se ve y la fila no queda
             desierta. Abajo de 1180 el costado ya se fue a un cajón, así que
             el ancho alcanza igual. */
          .grid-prod{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:12px}
          @media(max-width:1000px){.grid-prod{grid-template-columns:repeat(3,minmax(0,1fr))}}
          @media(max-width:760px){.grid-prod{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media(max-width:460px){.grid-prod{grid-template-columns:1fr}}
          .prod-tile{display:flex;flex-direction:column;gap:3px;align-items:stretch;padding:0 0 11px;
            border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:var(--shadow);
            cursor:pointer;text-align:left;transition:.15s;overflow:hidden}
          .prod-tile:hover{border-color:var(--brand);transform:translateY(-1px)}
          .prod-img{position:relative;display:grid;place-items:center;background:var(--panel-2);
            padding:14px;color:var(--muted);height:154px;border-bottom:1px solid var(--line-soft);
            margin-bottom:9px;overflow:hidden}
          .prod-img img{width:100%;height:100%;object-fit:cover;display:block;
            position:absolute;inset:0}
          .prod-tile:hover .prod-img{color:var(--brand)}
          .prod-est{position:absolute;top:9px;left:9px}
          .sil{width:100%;max-width:150px;height:96px}
          .prod-n{font-weight:700;color:var(--navy);font-size:13px;padding:0 11px;line-height:1.3}
          .prod-c{font-size:11.5px;color:var(--muted);padding:0 11px}
          .prod-b{display:flex;align-items:center;gap:8px;padding:5px 11px 0}
          .prod-v{font-size:11.5px;color:var(--brand);font-weight:650;flex:1}
          .prod-s{font-size:11.5px;color:var(--muted);padding:3px 11px 0}
          .prod-s.hay{color:var(--ok)} .prod-s b{font-size:12.5px}
        </style>`;
      this.pintarTog();
      document.getElementById('v-bloques').onclick = () => this.setVista('bloques');
      document.getElementById('v-lista').onclick   = () => this.setVista('lista');
      const so = document.getElementById('cat-orden');
      so.value = this.orden;
      so.onchange = () => { this.orden = so.value; this.pintar(); };
      // Los costados se pueden esconder: con el catálogo filtrado uno quiere
      // la pantalla entera para mirar muebles.
      document.getElementById('cat-verf').onclick = () => this.modalFiltros();
      // Al agrandar o achicar la ventana cambia si los costados entran.
      if (!this._resize) {
        this._resize = () => { const c = this.chico(); if (c !== this._eraChico) this.pintar(); };
        window.addEventListener('resize', this._resize);
      }

      if (global.DB.modo() === 'demo') {
        v.insertAdjacentHTML('afterbegin',
          `<div class="banner info">Modo demo — árbol y productos de ejemplo.
           <a href="#" id="cat-conectar">Conectar Belgrano Soft</a> para ver el catálogo real.</div>`);
        document.getElementById('cat-conectar').onclick = e => { e.preventDefault(); this.modalConexion(); };
      }

      const q = document.getElementById('cat-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim(); this.pintar();
      }, 220); };

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
    // Ambiente y categoría son del mueble; el resto son sus propiedades
    // principales —estructura, frente, medida— y cada una filtra por su
    // cuenta, no todas amontonadas en una lista.
    _f: { ambiente: [], tipo: [] },
    _fp: {},
    selProp(k) { return this._fp[k] || []; },
    _verMas: new Set(),
    // Los grupos del costado arrancan cerrados: con cinco propiedades la
    // columna era una lista interminable. Cerrado igual dice qué tiene
    // marcado, así que no hace falta abrirlo para saberlo.
    _gAbiertos: (() => {
      try { return new Set(JSON.parse(localStorage.getItem(GRUPOS_KEY)) || []); }
      catch { return new Set(); }
    })(),
    grupoAbierto(k) { return this._gAbiertos.has(k); },
    abrirGrupo(k) {
      if (this._gAbiertos.has(k)) this._gAbiertos.delete(k); else this._gAbiertos.add(k);
      try { localStorage.setItem(GRUPOS_KEY, JSON.stringify([...this._gAbiertos])); } catch {}
    },

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
      // Cada propiedad principal filtra aparte: marcar Blanca en ESTRUCTURA y
      // Negro en FRENTE tiene que buscar los que tienen las dos cosas.
      for (const k of Object.keys(this._fp)) {
        const sel = this._fp[k];
        if (!sel.length || salvo === 'prop:' + k) continue;
        const vals = ((p.props || {})[k] || []).map(v => this.normTerm(v));
        if (!vals.some(v => sel.includes(v))) return false;
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
        todo.filter(p => this.pasa(p, salvo) && this.pasaX(p)).forEach(p => {
          [].concat(fn(p) || []).filter(x => x != null).forEach(k => m.set(k, (m.get(k) || 0) + 1));
        });
        return m;
      };
      const cAmb = cuenta('ambiente', p => (this.ambienteDe(p.categoria_id) || {}).id);
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || '—';
      const ord = (m, etiqueta) => [...m.entries()]
        .map(([k, n]) => ({ k, n, label: etiqueta(k) }))
        .sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label)));

      // Una lista por propiedad principal. Se cuenta por el valor normalizado
      // —"Blanca" y "BLANCA" son la misma— y se muestra como está cargado.
      const claves = [];
      todo.forEach(p => Object.keys(p.props || {}).forEach(k => {
        if (!claves.includes(k)) claves.push(k);
      }));
      const grupos = claves.map(k => {
        const nombres = new Map();
        todo.forEach(p => ((p.props || {})[k] || []).forEach(v => {
          const nk = this.normTerm(v);
          if (!nombres.has(nk)) nombres.set(nk, v);
        }));
        const c = cuenta('prop:' + k, p =>
          [...new Set(((p.props || {})[k] || []).map(v => this.normTerm(v)))]);
        const prop = global.DB.propiedad(k);
        const rol = global.DB.rolDe(k);
        return {
          k: 'prop:' + k, prop: k,
          titulo: (prop && prop.nombre) || k,
          ops: ord(c, x => nombres.get(x) || x),
          color: ['estructura', 'frente', 'terminacion', 'material'].includes(rol),
        };
      });

      return [{ k: 'ambiente', titulo: 'Ambiente', ops: ord(cAmb, nom) }, ...grupos]
        .filter(g => g.ops.length > 1 || this.marcadosDe(g.k).length);
    },

    // Un grupo puede ser del mueble (_f) o de una propiedad (_fp).
    marcadosDe(k) {
      return k.startsWith('prop:') ? this.selProp(k.slice(5)) : (this._f[k] || []);
    },
    ponerMarca(k, v, on) {
      if (k.startsWith('prop:')) {
        const pk = k.slice(5);
        const sel = this.selProp(pk);
        this._fp[pk] = on ? [...sel, v] : sel.filter(x => x !== v);
        if (!this._fp[pk].length) delete this._fp[pk];
      } else {
        this._f[k] = on ? [...(this._f[k] || []), v] : (this._f[k] || []).filter(x => x !== v);
      }
    },
    marcados() {
      return Object.values(this._f).reduce((a, x) => a + x.length, 0)
        + Object.values(this._fp).reduce((a, x) => a + x.length, 0);
    },

    // Los filtros de estado — cómo está el mueble hoy, no qué es. Viven en el
    // pop-up de Filtrar porque son los que uno usa de a ratos: "mostrame lo
    // que está bajo el mínimo", "lo que entrego en 15 días".
    FX: [
      { k: 'stock', titulo: 'Disponibilidad', ops: [
        ['todos', 'Todos'], ['hay', 'Con stock'], ['sin', 'Sin stock'] ] },
      { k: 'minimo', titulo: 'Stock mínimo', ops: [
        ['todos', 'Todos'], ['bajo', 'Por debajo del mínimo'], ['con', 'Con mínimo definido'],
        ['sin', 'Sin mínimo'] ] },
      { k: 'entrega', titulo: 'Demora de entrega', ops: [
        ['todos', 'Todos'], ['15', 'Hasta 15 días'], ['30', 'Hasta 30 días'], ['mas', 'Más de 30'] ] },
      { k: 'pub', titulo: 'Publicación', ops: [
        ['todos', 'Todos'], ['tn', 'En Tienda Nube'], ['interno', 'Sólo interno'] ] },
    ],
    _fx: { stock: 'todos', minimo: 'todos', entrega: 'todos', pub: 'todos' },
    marcadosX() { return Object.values(this._fx).filter(v => v !== 'todos').length; },

    diasDe(p) {
      const cat = this.arbol.find(c => c.id === p.categoria_id);
      return global.DB.plazoDe(p, cat ? [cat] : []).dias;
    },

    pasaX(p) {
      const f = this._fx;
      const st = Number(p.stock) || 0;
      if (f.stock === 'hay' && !st) return false;
      if (f.stock === 'sin' && st) return false;
      if (f.minimo === 'bajo' && !(p.bajoMinimo > 0)) return false;
      if (f.minimo === 'con' && !(p.conMinimo > 0)) return false;
      if (f.minimo === 'sin' && p.conMinimo > 0) return false;
      if (f.entrega !== 'todos') {
        const d = this.diasDe(p);
        if (f.entrega === '15' && d > 15) return false;
        if (f.entrega === '30' && d > 30) return false;
        if (f.entrega === 'mas' && d <= 30) return false;
      }
      if (f.pub === 'tn' && !p.publicado_tn) return false;
      if (f.pub === 'interno' && p.publicado_tn) return false;
      return true;
    },

    // El pop-up. Cada grupo es una fila de opciones y se elige una sola.
    modalFiltros() {
      const antes = { ...this._fx };
      document.body.insertAdjacentHTML('beforeend', `
        <div class="mdl-back" id="mdl">
          <div class="card pad mdl-caja">
            <h3 class="h-title" style="font-size:18px">Filtrar muebles</h3>
            <p class="h-sub">Por cómo está el mueble hoy. Lo que <b>es</b> —ambiente, terminación,
              categoría— se elige en los costados.</p>
            ${this.FX.map(g => `<div class="fx-g">
              <div class="fx-t">${UI.esc(g.titulo)}</div>
              <div class="fx-ops">${g.ops.map(([k, l]) =>
                `<button class="fx-o ${this._fx[g.k] === k ? 'on' : ''}"
                  data-fx="${g.k}|${k}">${UI.esc(l)}</button>`).join('')}</div>
            </div>`).join('')}
            <div class="row" style="margin-top:18px;gap:10px">
              <button class="btn" id="mf-borrar">Borrar filtros</button>
              <div class="sp"></div>
              <button class="btn" id="mf-x">Cancelar</button>
              <button class="btn primary" id="mf-ok">Filtrar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('mdl'); if (m) m.remove(); };
      const pintar = () => document.querySelectorAll('[data-fx]').forEach(b => {
        const [g, k] = b.dataset.fx.split('|');
        b.classList.toggle('on', this._fx[g] === k);
      });
      document.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
        const [g, k] = b.dataset.fx.split('|');
        this._fx[g] = k; pintar();
      });
      document.getElementById('mf-borrar').onclick = () => {
        Object.keys(this._fx).forEach(k => { this._fx[k] = 'todos'; }); pintar();
      };
      document.getElementById('mf-x').onclick = () => { this._fx = antes; cerrar(); };
      document.getElementById('mdl').onclick = e => {
        if (e.target.id === 'mdl') { this._fx = antes; cerrar(); }
      };
      document.getElementById('mf-ok').onclick = () => { cerrar(); this.pintar(); };
    },

    htmlFiltros() {
      const gs = this.grupos();
      if (!gs.length) return '';
      return `<aside class="cat-f">
        ${this.chico() ? '' : `<button class="cat-fl izq dentro" data-plegar="f"
          title="Ocultar los filtros" aria-label="Ocultar los filtros">‹</button>`}
        <div class="cat-f-h">
          <span>Filtros</span>
          ${this.marcados() ? '<button class="lnk" id="cat-limpiar">limpiar</button>' : ''}
        </div>
        ${gs.map(g => {
          const sel = this.marcadosDe(g.k);
          // Con muchas opciones —las medidas son doce— la columna se hace
          // interminable: se muestran las primeras y el resto a pedido. Las
          // marcadas van siempre a la vista.
          const abierto = this._verMas.has(g.k);
          const tope = 6;
          const ops = abierto ? g.ops
            : [...g.ops.slice(0, tope), ...g.ops.slice(tope).filter(o => sel.includes(o.k))];
          const ocultas = g.ops.length - ops.length;
          const on = this.grupoAbierto(g.k);
          // Cerrado, el título lleva lo que esté marcado: "ESTRUCTURA · Blanca".
          const resumen = sel.length
            ? g.ops.filter(o => sel.includes(o.k)).map(o => o.label).join(', ')
            : '';
          return `<div class="cat-g ${on ? 'on' : ''}">
          <button class="cat-g-t" data-grupo="${UI.esc(g.k)}" aria-expanded="${on}">
            <span class="cat-g-fl">${on ? '▾' : '▸'}</span>
            <span class="cat-g-n">${UI.esc(g.titulo)}</span>
            ${sel.length ? `<span class="cat-g-m">${sel.length}</span>` : ''}
          </button>
          ${!on && resumen ? `<div class="cat-g-r">${UI.esc(resumen)}</div>` : ''}
          ${!on ? '' : ops.map(o => `<label class="cat-o ${sel.includes(o.k) ? 'on' : ''}">
            <input type="checkbox" data-f="${UI.esc(g.k)}" data-v="${UI.esc(String(o.k))}"
              ${sel.includes(o.k) ? 'checked' : ''}>
            ${g.color ? `<span class="pt" style="background:${global.DB.colorDe(o.label)}"></span>` : ''}
            <span class="cat-o-n">${UI.esc(o.label)}</span>
            <span class="cat-o-c tnum">${o.n}</span>
          </label>`).join('')}
          ${!on || !(ocultas > 0 || abierto) ? '' : `<button class="lnk lnk-mas"
            data-vermas="${UI.esc(g.k)}">${abierto ? 'ver menos' : `ver ${ocultas} más`}</button>`}
        </div>`; }).join('')}
      </aside>`;
    },

    engancharFiltros() {
      document.querySelectorAll('[data-f]').forEach(i => i.onchange = () => {
        // Las claves numéricas del árbol vuelven del DOM como texto.
        const v = /^\d+$/.test(i.dataset.v) ? Number(i.dataset.v) : i.dataset.v;
        this.ponerMarca(i.dataset.f, v, i.checked);
        this.pintar();
      });
      document.querySelectorAll('[data-grupo]').forEach(b => b.onclick = () => {
        this.abrirGrupo(b.dataset.grupo); this.pintar();
      });
      document.querySelectorAll('[data-vermas]').forEach(b => b.onclick = () => {
        const k = b.dataset.vermas;
        if (this._verMas.has(k)) this._verMas.delete(k); else this._verMas.add(k);
        this.pintar();
      });
      const l = document.getElementById('cat-limpiar');
      if (l) l.onclick = () => {
        this._f.ambiente = []; this._fp = {};
        this.pintar();
      };
    },

    // Las categorías de mueble, arriba y en una fila. Así se piensa el
    // catálogo: todas las mesas de luz, todas las cómodas — no por ambiente ni
    // por fecha de alta. Cada una dice cuántos muebles tiene.
    // Las categorías van a la derecha, en una lista con tilde: se marcan
    // varias a la vez —cómodas y mesas de luz— y cada una dice cuántos
    // muebles tiene. A la izquierda quedan las variables y sus opciones.
    htmlCats() {
      const g = this.grupoTipos();
      if (!g.length) return '';
      const sel = this._f.tipo;
      const flechaCat = this.chico() ? '' : `<button class="cat-fl der dentro" data-plegar="c"
        title="Ocultar las categorías" aria-label="Ocultar las categorías">›</button>`;
      const todos = (this._todo || []).filter(p => this.pasa(p, 'tipo')).length;
      const visibles = g.map(o => o.k);
      const todasPlegadas = visibles.length && visibles.every(k => this.plegada(k));
      return `<aside class="cat-c">
        <div class="cat-f-h"><span>Categorías</span>
          ${sel.length ? `<button class="lnk" data-tipo="">ver todas</button>` : ''}</div>
        ${this.orden === 'cat' && visibles.length > 1 ? `<div class="cat-c-sub">
          <button class="lnk" id="cat-plegar">${
            todasPlegadas ? 'abrir todas' : 'plegar todas'}</button></div>` : ''}
        ${flechaCat}
        <div class="cat-lc">
          <label class="cat-o ${sel.length ? '' : 'on'}">
            <input type="checkbox" data-tipo="" ${sel.length ? '' : 'checked'}>
            <span class="cat-o-n">Todas</span>
            <span class="cat-o-c tnum">${todos}</span></label>
          ${g.map(o => `<label class="cat-o ${sel.includes(o.k) ? 'on' : ''}">
            <input type="checkbox" data-tipo="${o.k}" ${sel.includes(o.k) ? 'checked' : ''}>
            <span class="cat-o-n">${UI.esc(o.label)}</span>
            <span class="cat-o-c tnum">${o.n}</span></label>`).join('')}
        </div>
      </aside>`;
    },

    engancharCats() {
      const pl = document.getElementById('cat-plegar');
      if (pl) pl.onclick = () => {
        const vis = this.grupoTipos().map(o => o.k);
        const todas = vis.every(k => this.plegada(k));
        vis.forEach(k => this.plegar(k, !todas));
        this.pintar();
      };
      document.querySelectorAll('[data-tipo]').forEach(el => {
        const usar = () => {
          const v = el.dataset.tipo;
          if (!v) this._f.tipo = [];
          else {
            const id = Number(v);
            this._f.tipo = this._f.tipo.includes(id)
              ? this._f.tipo.filter(x => x !== id) : [...this._f.tipo, id];
          }
          this.pintar();
        };
        if (el.tagName === 'INPUT') el.onchange = usar; else el.onclick = usar;
      });
    },

    // Las categorías que se ofrecen arriba, con su cuenta. Se calculan
    // ignorando la selección de categoría —si no, al elegir una las demás
    // quedarían en cero y no se podría sumar una segunda— pero sí respetan el
    // resto de los filtros.
    grupoTipos() {
      const m = new Map();
      (this._todo || []).filter(p => this.pasa(p, 'tipo') && this.pasaX(p)).forEach(p => {
        m.set(p.categoria_id, (m.get(p.categoria_id) || 0) + 1);
      });
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || '—';
      return [...m.entries()].map(([k, n]) => ({ k, n, label: nom(k) }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },

    async pintar() {
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
        .filter(p => this.pasa(p) && this.pasaX(p));

      // Tres columnas: las variables a la izquierda, los muebles en el medio
      // y las categorías a la derecha. Si la pantalla no da para las tres, el
      // costado que esté abierto se muestra encima, como un cajón, y el otro
      // se cierra: no tiene sentido tapar los muebles dos veces.
      const chico = this.chico();
      this._eraChico = chico;
      const fh = this.verFiltros ? this.htmlFiltros() : '';
      const ch = this.verCats ? this.htmlCats() : '';
      const cajon = chico && (fh || ch);
      const flecha = (id, abierto, lado) => `<button class="cat-fl ${lado}" data-plegar="${id}"
        title="${abierto ? 'Ocultar' : 'Mostrar'} ${id === 'f' ? 'los filtros' : 'las categorías'}"
        aria-label="${abierto ? 'Ocultar' : 'Mostrar'} ${id === 'f' ? 'los filtros' : 'las categorías'}"
        >${lado === 'izq' ? (abierto ? '‹' : '›') : (abierto ? '›' : '‹')}</button>`;
      cont.innerHTML = `<div class="cat-cols ${fh && !chico ? '' : 'sin-f'} ${ch && !chico ? '' : 'sin-c'}">
        ${chico ? '' : (fh || flecha('f', false, 'izq'))}
        <div class="cat-res" id="cat-res"></div>
        ${chico ? '' : (ch || flecha('c', false, 'der'))}
      </div>
      ${cajon ? `<div class="cat-back" id="cat-back"></div>
        <aside class="cat-cajon">
          <div class="cat-cajon-h">
            <button class="lx" id="cat-cerrar" title="Cerrar">›</button>
            <b>${fh ? 'Filtrar muebles' : 'Categorías'}</b>
          </div>
          <div class="cat-cajon-b">${fh || ch}</div>
        </aside>` : ''}`;
      this.engancharCats();
      const cerrar = () => {
        this.verFiltros = false; this.verCats = false;
        try { localStorage.setItem(FILTROS_KEY, '0'); localStorage.setItem(CATS_KEY, '0'); } catch {}
        this.pintar();
      };
      const bk = document.getElementById('cat-back'); if (bk) bk.onclick = cerrar;
      const cc = document.getElementById('cat-cerrar'); if (cc) cc.onclick = cerrar;
      // Cada costado se pliega con su flecha. Al plegarlo entra una tarjeta
      // más por fila, que es para lo que se pliega.
      document.querySelectorAll('[data-plegar]').forEach(b => b.onclick = () => {
        if (b.dataset.plegar === 'f') {
          this.verFiltros = !this.verFiltros;
          try { localStorage.setItem(FILTROS_KEY, this.verFiltros ? '1' : '0'); } catch {}
        } else {
          this.verCats = !this.verCats;
          try { localStorage.setItem(CATS_KEY, this.verCats ? '1' : '0'); } catch {}
        }
        this.pintar();
      });

      const bf = document.getElementById('cat-verf');
      if (bf) {
        bf.classList.toggle('on', !!this.marcadosX());
        const n = document.getElementById('cat-fn');
        if (n) n.textContent = this.marcadosX() || '';
      }
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

    // Dispatcher: pinta la lista de productos en el formato elegido. Cuando
    // se ordena por categoría, cada una lleva su título: recorrer "todo" es
    // recorrer el catálogo como está ordenado en la cabeza.
    pintarProductos(cont, vacio) {
      if (!cont) return;
      const prods = this.ordenados(this._prods || []);
      const uno = p => (this.vista === 'lista' ? this.htmlLista(p) : this.htmlBloques(p));
      if (!prods.length) { cont.innerHTML = UI.vacio(vacio); this.enganchar(cont); this.pintarSub(); return; }

      const grupos = this.orden === 'cat' ? this.porCategoria(prods) : null;
      // En el listado el encabezado de la tabla no se repite por categoría:
      // va una sola tabla con un renglón de título entre grupo y grupo.
      if (this.vista === 'lista' && grupos && grupos.length > 1) {
        cont.innerHTML = this.htmlLista(prods, grupos);
        this.enganchar(cont);
        this.engancharPlegar(cont);
        cont.querySelectorAll('[data-solo]').forEach(a => a.onclick = e => {
          e.preventDefault(); e.stopPropagation();
          this._f.tipo = [Number(a.dataset.solo)]; this.pintar();
        });
        this.pintarSub();
        return;
      }
      cont.innerHTML = grupos && grupos.length > 1
        ? grupos.map(g => {
            const cerrada = this.plegada(g.id);
            return `<section class="cat-sec ${cerrada ? 'plegada' : ''}">
            <div class="cat-sec-h">
              <button class="cat-sec-b" data-plegarcat="${g.id}"
                aria-expanded="${!cerrada}" title="${cerrada ? 'Mostrar' : 'Ocultar'} ${UI.esc(g.nombre)}">
                <span class="cat-sec-g">${cerrada ? '▸' : '▾'}</span>
                <span class="cat-sec-t">${UI.esc(g.nombre)}</span>
                <span class="cat-sec-n">${g.items.length} ${g.items.length === 1 ? 'mueble' : 'muebles'}</span>
              </button>
              <a class="cat-sec-v" href="#" data-solo="${g.id}">ver sólo esta ›</a>
            </div>
            ${cerrada ? '' : uno(g.items)}
          </section>`; }).join('')
        : uno(prods);
      this.enganchar(cont);
      this.engancharPlegar(cont);
      cont.querySelectorAll('[data-solo]').forEach(a => a.onclick = e => {
        e.preventDefault();
        this._f.tipo = [Number(a.dataset.solo)];
        this.pintar();
      });
      this.pintarSub();
    },

    orden: 'cat',
    _cerradas: (() => {
      try { return new Set(JSON.parse(localStorage.getItem(CERRADAS_KEY)) || []); }
      catch { return new Set(); }
    })(),
    plegada(id) { return this._cerradas.has(id); },
    plegar(id, valor) {
      if (valor === undefined) valor = !this.plegada(id);
      if (valor) this._cerradas.add(id); else this._cerradas.delete(id);
      try { localStorage.setItem(CERRADAS_KEY, JSON.stringify([...this._cerradas])); } catch {}
    },
    engancharPlegar(cont) {
      cont.querySelectorAll('[data-plegarcat]').forEach(b => b.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        this.plegar(Number(b.dataset.plegarcat));
        this.pintar();
      });
    },
    ordenados(prods) {
      const l = [...prods];
      if (this.orden === 'nombre') return l.sort((a, b) => a.nombre.localeCompare(b.nombre));
      if (this.orden === 'precio') return l.sort((a, b) => (a.desde || 0) - (b.desde || 0));
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || '';
      return l.sort((a, b) => nom(a.categoria_id).localeCompare(nom(b.categoria_id))
        || a.nombre.localeCompare(b.nombre));
    },
    porCategoria(prods) {
      const m = new Map();
      prods.forEach(p => {
        if (!m.has(p.categoria_id)) m.set(p.categoria_id, []);
        m.get(p.categoria_id).push(p);
      });
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || 'Sin categoría';
      return [...m.entries()].map(([id, items]) => ({ id, nombre: nom(id), items }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
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

    // El listado: lo mismo que la tarjeta pero apretado para comparar. Sin
    // código ni precio —no es lo que se mira acá—, con una foto chica para
    // reconocer el mueble de un vistazo. Se entra tocando el renglón; los
    // tres puntitos son para ir derecho a una solapa.
    htmlLista(prods, grupos) {
      // La foto va primera: es lo que identifica el mueble de un vistazo. El
      // estado y las terminaciones no van — para eso está la vista con fotos.
      const renglon = p => `<tr data-prod="${p.id}">
            <td class="td-foto"><span class="mini">${p.foto
              ? `<img src="${UI.esc(p.foto)}" alt="">`
              : this.silueta(p.categoria_id)}</span></td>
            <td><b>${UI.esc(p.nombre)}</b></td>
            <td class="muted">${UI.esc(this.catDe(p.categoria_id))}</td>
            <td style="text-align:right" class="tnum">${p.variantes}</td>
            <td style="text-align:right" class="tnum">${p.stock || '—'}</td>
            <td class="td-mas"><button class="lx" data-mas="${p.id}"
              title="Abrir en…" aria-label="Abrir en…">⋯</button></td></tr>`;
      const cuerpo = grupos
        ? grupos.map(g => {
            const cerrada = this.plegada(g.id);
            return `<tr class="cat-tr-h"><td colspan="6">
            <button class="cat-sec-b" data-plegarcat="${g.id}"
              aria-expanded="${!cerrada}" title="${cerrada ? 'Mostrar' : 'Ocultar'} ${UI.esc(g.nombre)}">
              <span class="cat-sec-g">${cerrada ? '▸' : '▾'}</span>
              <span class="cat-sec-t">${UI.esc(g.nombre)}</span>
              <span class="cat-sec-n">${g.items.length} ${g.items.length === 1 ? 'mueble' : 'muebles'}</span>
            </button>
            <a class="cat-sec-v" href="#" data-solo="${g.id}">ver sólo esta ›</a>
          </td></tr>${cerrada ? '' : g.items.map(renglon).join('')}`; }).join('')
        : prods.map(renglon).join('');
      return `<div class="card"><table class="cat-tabla">
        <thead><tr><th class="th-foto"></th><th>Producto</th><th>Tipo</th>
          <th style="text-align:right">Variantes</th><th style="text-align:right">Stock</th>
          <th></th></tr></thead>
        <tbody>${cuerpo}</tbody></table></div>`;
    },

    // El menú de los tres puntitos: entrar derecho a la solapa que hace falta.
    menuMueble(id, boton) {
      document.querySelectorAll('.cat-menu').forEach(m => m.remove());
      const solapas = [
        ['producto', 'Información general'], ['inventario', 'Inventario'],
        ['produccion', 'Producción'],
      ];
      if (global.App && global.App.puede && global.App.puede('verCostos')) {
        solapas.push(['costos', 'Compra y venta']);
      }
      solapas.push(['documentos', 'Documentos']);
      const r = boton.getBoundingClientRect();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cat-menu-back"></div>
        <div class="cat-menu" style="top:${Math.round(r.bottom + 4)}px;left:${Math.round(r.right - 190)}px">
          ${solapas.map(([k, l]) => `<button data-ir="${k}">${UI.esc(l)}</button>`).join('')}
        </div>`);
      const cerrar = () => document.querySelectorAll('.cat-menu,.cat-menu-back').forEach(x => x.remove());
      document.querySelector('.cat-menu-back').onclick = cerrar;
      document.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => {
        const k = b.dataset.ir; cerrar();
        this.ficha(id).then(() => {
          if (global.ProductoDet && global.ProductoDet.p) {
            global.ProductoDet._tab = k; global.ProductoDet.pintar();
          }
        });
      });
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

    // La tarjeta no muestra plata: acá se mira qué es el mueble, en cuántas
    // versiones viene y cuánto hay hecho. El precio está adentro.
    htmlBloques(prods) {
      return `<div class="grid-prod">${prods.map(p => {
        const e = this.estado(p);
        const st = Number(p.stock) || 0;
        return `<button class="prod-tile" data-prod="${p.id}">
            <div class="prod-img">${p.foto
              ? `<img src="${UI.esc(p.foto)}" alt="${UI.esc(p.nombre)}">`
              : this.silueta(p.categoria_id)}
              <span class="pill ${e.pill} prod-est">${UI.esc(e.label)}</span></div>
            <div class="prod-n">${UI.esc(p.nombre)}</div>
            <div class="prod-c">${UI.esc(this.catDe(p.categoria_id))}</div>
            <div class="prod-b">
              <span class="prod-v">${p.variantes} ${p.variantes === 1 ? 'variante' : 'variantes'}</span>
              ${this.puntos(p)}
            </div>
            <div class="prod-s ${st ? 'hay' : ''}">${st
              ? `<b class="tnum">${st}</b> en depósito`
              : 'sin stock — se fabrica'}</div>
          </button>`;
      }).join('')}</div>`;
    },

    enganchar(cont) {
      // En las dos vistas se entra a la FICHA del mueble: es la pantalla donde
      // el vendedor mira precios, medidas y terminaciones antes de cotizar.
      cont.querySelectorAll('[data-prod]').forEach(el =>
        el.onclick = e => {
          if (e.target.closest('[data-mas]')) return;   // los puntitos tienen lo suyo
          this.ficha(Number(el.dataset.prod));
        });
      cont.querySelectorAll('[data-mas]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        this.menuMueble(Number(b.dataset.mas), b);
      });
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
