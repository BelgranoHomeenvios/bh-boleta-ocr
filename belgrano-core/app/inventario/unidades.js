// =====================================================================
//  Belgrano Soft · Inventario · Unidades
//  La planilla de siempre, hecha sistema. Una fila por unidad —la pieza,
//  no el modelo— con su estado a la vista y el botón de reservar en el
//  renglón. El vendedor busca lo que le pidió el cliente y reserva ESA
//  unidad; Administración ve proveedor, ubicación y fechas sin salir.
// =====================================================================
(function (global) {
  const VER_KEY = 'bh_inv_cats';

  const Unidades = {
    _mount: 'view',
    texto: '',
    filtro: 'todo',        // todo · disponible · stock · produccion · reservada · entregada · marcas
    cats: [],              // categorías marcadas
    _abre: (() => { try { return localStorage.getItem(VER_KEY) === '1'; } catch { return false; } })(),

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div>
            <div class="kick">Inventario</div>
            <h1 class="h-title">Unidades</h1>
            <div class="h-sub" id="un-sub"></div>
          </div>
        </div>
        <div class="un-bar">
          <div class="un-busca"><input id="un-q" placeholder="Buscar por número, modelo, medida o color…"
            value="${UI.esc(this.texto)}"></div>
          <button class="btn" id="un-vercat">Categorías<span id="un-cn"></span></button>
        </div>
        <div id="un-filtros"></div>
        <div id="un-lista">${UI.spinner()}</div>
        ${this.estilos()}`;

      const q = document.getElementById('un-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim(); this.pintar();
      }, 200); };
      document.getElementById('un-vercat').onclick = () => {
        this._abre = !this._abre;
        try { localStorage.setItem(VER_KEY, this._abre ? '1' : '0'); } catch {}
        this.pintar();
      };
      try { this.arbol = await global.DB.arbolCategorias(); } catch { this.arbol = []; }
      this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
      this.pintar();
    },

    // ---- Datos -------------------------------------------------------------
    catDe(u) {
      const p = (this.prods || []).find(x => x.id === u.productoId);
      if (!p) return null;
      return (this.arbol || []).find(c => c.id === p.categoria_id) || null;
    },
    // Lo que se ve, ya filtrado. El buscador entiende número, modelo, medida y
    // color en cualquier orden: "borges 100 pb" y "pb 100 borges" son lo mismo.
    lista() {
      const t = this.texto.toLowerCase().split(/\s+/).filter(Boolean);
      return global.DB.unidadesTodas().filter(u => {
        if (this.cats.length) {
          const c = this.catDe(u);
          if (!c || !this.cats.includes(c.id)) return false;
        }
        if (!this.pasaFiltro(u)) return false;
        if (!t.length) return true;
        const txt = `${u.serie} ${u.modelo} ${u.medida} ${u.color} ${u.orden || ''}`.toLowerCase();
        return t.every(x => txt.includes(x));
      });
    },
    pasaFiltro(u) {
      const f = this.filtro;
      if (f === 'todo') return true;
      if (f === 'disponible') return global.DB.disponible(u);
      if (f === 'reservada') return !!u.orden && u.estado !== 'entregada';
      if (f === 'marcas') return !!u.marca;
      return u.estado === f;
    },
    cuenta(f) {
      const antes = this.filtro;
      this.filtro = f;
      const base = global.DB.unidadesTodas().filter(u => {
        if (!this.cats.length) return true;
        const c = this.catDe(u); return c && this.cats.includes(c.id);
      });
      const n = base.filter(u => this.pasaFiltro(u)).length;
      this.filtro = antes;
      return n;
    },

    FILTROS: [
      { k: 'todo', label: 'Todo' },
      { k: 'disponible', label: 'Disponible' },
      { k: 'stock', label: 'En stock' },
      { k: 'produccion', label: 'En producción' },
      { k: 'reservada', label: 'Reservadas' },
      { k: 'entregada', label: 'Entregadas' },
      { k: 'marcas', label: 'Con marca' },
    ],

    // ---- Pintado -----------------------------------------------------------
    pintar() {
      const us = this.lista();
      const sub = document.getElementById('un-sub');
      if (sub) {
        const tot = global.DB.unidadesTodas().length;
        sub.textContent = us.length === tot
          ? `${tot} unidades` : `${us.length} de ${tot} unidades`;
      }
      const f = document.getElementById('un-filtros');
      if (f) {
        f.innerHTML = `<div class="segm" style="margin-bottom:12px">${this.FILTROS.map(x =>
          `<button class="seg ${this.filtro === x.k ? 'on' : ''}" data-f="${x.k}">${UI.esc(x.label)}
            <b>${this.cuenta(x.k)}</b></button>`).join('')}</div>`;
        f.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
          this.filtro = b.dataset.f; this.pintar();
        });
      }
      const bc = document.getElementById('un-cn');
      if (bc) bc.textContent = this.cats.length || '';
      const bv = document.getElementById('un-vercat');
      if (bv) bv.classList.toggle('on', this._abre);

      const cont = document.getElementById('un-lista');
      cont.innerHTML = `<div class="un-cols ${this._abre ? '' : 'sin-c'}">
        <div id="un-tabla"></div>
        ${this._abre ? this.htmlCats() : ''}
      </div>`;
      this.pintarTabla(document.getElementById('un-tabla'), us);
      this.engancharCats();
    },

    // Las categorías al costado, como en el catálogo: se marcan varias.
    htmlCats() {
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        const c = this.catDe(u); if (!c) return;
        m.set(c.id, (m.get(c.id) || 0) + 1);
      });
      const ops = [...m.entries()].map(([id, n]) => ({
        id, n, label: (this.arbol.find(c => c.id === id) || {}).nombre || '—',
      })).sort((a, b) => a.label.localeCompare(b.label));
      if (!ops.length) return '';
      return `<aside class="un-c">
        <div class="un-c-h"><span>Categorías</span>
          ${this.cats.length ? '<button class="lnk" id="un-todas">ver todas</button>' : ''}</div>
        <label class="un-o ${this.cats.length ? '' : 'on'}">
          <input type="checkbox" data-cat="" ${this.cats.length ? '' : 'checked'}>
          <span class="un-o-n">Todas</span><span class="un-o-c tnum">${global.DB.unidadesTodas().length}</span></label>
        ${ops.map(o => `<label class="un-o ${this.cats.includes(o.id) ? 'on' : ''}">
          <input type="checkbox" data-cat="${o.id}" ${this.cats.includes(o.id) ? 'checked' : ''}>
          <span class="un-o-n">${UI.esc(o.label)}</span>
          <span class="un-o-c tnum">${o.n}</span></label>`).join('')}
      </aside>`;
    },
    engancharCats() {
      document.querySelectorAll('[data-cat]').forEach(i => i.onchange = () => {
        const v = i.dataset.cat;
        if (!v) this.cats = [];
        else {
          const id = Number(v);
          this.cats = this.cats.includes(id) ? this.cats.filter(x => x !== id) : [...this.cats, id];
        }
        this.pintar();
      });
      const t = document.getElementById('un-todas');
      if (t) t.onclick = () => { this.cats = []; this.pintar(); };
    },

    // El renglón es bajo a propósito: se trabaja mirando muchos a la vez.
    pintarTabla(cont, us) {
      if (!us.length) { cont.innerHTML = UI.vacio('Ninguna unidad con ese filtro.'); return; }
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      // Agrupadas por modelo, como la planilla: el corte ayuda a leer.
      const grupos = [];
      us.forEach(u => {
        const ult = grupos[grupos.length - 1];
        if (ult && ult.modelo === u.modelo) ult.items.push(u);
        else grupos.push({ modelo: u.modelo, items: [u] });
      });

      cont.innerHTML = `<div class="card un-tabla">
        <table>
          <thead><tr>
            <th>N°</th><th>Modelo</th><th>Medida</th><th>Color</th><th>Estado</th>
            <th>Ubicación</th><th>Proveedor</th><th>Llega / listo</th><th>Venta</th>
            <th></th>
          </tr></thead>
          <tbody>${grupos.map(g => `
            <tr class="un-g"><td colspan="10">${UI.esc(g.modelo)}
              <span class="muted">${g.items.length}</span></td></tr>
            ${g.items.map(u => this.renglon(u, ed)).join('')}`).join('')}
          </tbody>
        </table></div>
        <div class="hint" style="margin-top:9px">Se reserva la unidad exacta, no "una de las
          cuatro". <b>Disponible</b> es lo que está en stock, sin dueño y sin marcas. La que es
          <b>a medida</b> lleva su foto para que el vendedor sepa qué está vendiendo.</div>`;

      cont.querySelectorAll('[data-res]').forEach(b => b.onclick = () => this.reservar(Number(b.dataset.res)));
      cont.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => this.liberar(Number(b.dataset.lib)));
      cont.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => this.modalFoto(Number(b.dataset.foto)));
      cont.querySelectorAll('[data-tipo]').forEach(el => el.onclick = () => {
        const u = global.DB.unidad(Number(el.dataset.tipo)); if (!u) return;
        global.DB.guardarUnidad({ id: u.id, tipo: u.tipo === 'medida' ? 'estandar' : 'medida' });
        this.pintar();
      });
    },

    renglon(u, ed) {
      const e = global.DB.etiquetaUnidad(u);
      const enProd = u.estado === 'produccion';
      const disp = global.DB.disponible(u);
      return `<tr class="${u.estado === 'entregada' ? 'off' : ''}">
        <td class="td-n"><span class="tnum nom">${UI.esc(u.serie)}</span>
          ${this.botonFoto(u, ed)}</td>
        <td>${UI.esc(u.modelo)}${u.tipo === 'medida'
          ? ' <span class="un-tipo med">a medida</span>' : ''}</td>
        <td class="tnum">${UI.esc(u.medida)}</td>
        <td>${UI.esc(u.color)}</td>
        <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
        <td class="muted">${UI.esc(global.DB.ubicacionLabel(u.ubicacion) || '—')}</td>
        <td class="muted">${UI.esc(u.proveedor || '—')}</td>
        <td>${enProd ? `<b>llega ${UI.esc(u.fechaProv)}</b>`
          : `<span class="muted">${UI.esc(u.fechaProv || '—')}</span>`}</td>
        <td class="muted">${u.orden ? `${UI.esc(u.orden)}${u.fechaVenta ? ` · ${UI.esc(u.fechaVenta)}` : ''}` : '—'}</td>

        <td class="td-acc">${
          disp ? `<button class="bres" data-res="${u.id}">Reservar</button>`
          : (enProd && !u.orden) ? `<button class="bres" data-res="${u.id}">Reservar sobre pedido</button>`
          : (u.orden && u.estado !== 'entregada') ? `<button class="b-x" data-lib="${u.id}">Liberar</button>`
          : ''}</td>
      </tr>`;
    },

    // La foto no ocupa una columna entera: es un botón chico que muestra la
    // miniatura si la tiene. La que se hizo a medida es la que más la necesita.
    botonFoto(u, ed) {
      const ic = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="3" width="14" height="10"
        rx="2"/><circle cx="8" cy="8" r="2.6"/><rect x="5" y="1.5" width="6" height="2" rx="1"/></svg>`;
      if (u.foto) {
        return `<button class="un-foto hay" data-foto="${u.id}" title="Ver la foto de esta unidad">
          <img src="${UI.esc(u.foto)}" alt=""></button>`;
      }
      if (!ed) return '<span class="muted">—</span>';
      return `<button class="un-foto" data-foto="${u.id}"
        title="${u.tipo === 'medida' ? 'Falta la foto: es a medida' : 'Cargar una foto'}"
        >${ic}</button>`;
    },

    modalFoto(id) {
      const u = global.DB.unidad(id); if (!u) return;
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:460px;width:100%">
            <h3 class="h-title" style="font-size:17px">${UI.esc(u.serie)} · ${UI.esc(u.modelo)}</h3>
            <p class="h-sub">${UI.esc([u.medida, u.color].filter(Boolean).join(' · '))}${
              u.tipo === 'medida' ? ' · <b>a medida</b>' : ''}</p>
            <div class="un-prev">${u.foto
              ? `<img src="${UI.esc(u.foto)}" alt="">`
              : '<span class="muted">Sin foto todavía</span>'}</div>
            ${u.tipo === 'medida' && !u.foto ? `<div class="banner warn" style="margin-top:10px">
              Es <b>a medida</b>: no se parece a la foto del catálogo. Cargale una para que el
              vendedor sepa qué está vendiendo.</div>` : ''}
            <div class="row" style="margin-top:16px;gap:10px">
              ${ed ? `<button class="btn" id="un-tipo">${u.tipo === 'medida'
                ? 'Pasar a estándar' : 'Marcar como a medida'}</button>` : ''}
              ${ed && u.foto ? '<button class="btn" id="un-quitar">Quitar</button>' : ''}
              <div class="sp"></div>
              <button class="btn" id="un-x">Cerrar</button>
              ${ed ? '<button class="btn primary" id="un-subir">Subir foto</button>' : ''}
            </div>
            <input type="file" id="un-file" hidden accept="image/*">
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      const bt = document.getElementById('un-tipo');
      if (bt) bt.onclick = () => {
        global.DB.guardarUnidad({ id, tipo: u.tipo === 'medida' ? 'estandar' : 'medida' });
        cerrar(); this.pintar(); this.modalFoto(id);
      };
      const q = document.getElementById('un-quitar');
      if (q) q.onclick = () => { global.DB.guardarUnidad({ id, foto: '' }); cerrar(); this.pintar(); };
      const sub = document.getElementById('un-subir');
      if (sub) {
        const file = document.getElementById('un-file');
        sub.onclick = () => file.click();
        file.onchange = () => {
          const f = file.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            global.DB.guardarUnidad({ id, foto: r.result });
            cerrar(); this.pintar();
          };
          r.readAsDataURL(f);
        };
      }
    },

    // Reservar es asignarle un dueño. Cuando Ventas esté enganchado, la orden
    // sale de ahí; por ahora se escribe, que es lo que hoy se hace a mano.
    reservar(id) {
      const u = global.DB.unidad(id); if (!u) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:440px;width:100%">
            <h3 class="h-title" style="font-size:17px">Reservar ${UI.esc(u.serie)}</h3>
            <p class="h-sub">${UI.esc(u.modelo)} ${UI.esc(u.medida)} · ${UI.esc(u.color)}${
              u.estado === 'produccion'
                ? ` — <b>todavía en fábrica, llega el ${UI.esc(u.fechaProv)}</b>` : ''}</p>
            <label class="fld" style="margin-top:14px"><span class="lbl">Número de venta</span>
              <input id="un-orden" placeholder="#S00250"></label>
            <div class="hint" style="margin-top:6px">${u.estado === 'produccion'
              ? 'Queda vendida sobre pedido: el cliente sabe que llega con esa fecha.'
              : 'Queda apartada para esa venta y deja de estar disponible.'}</div>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="sp"></div>
              <button class="btn" id="un-x">Cancelar</button>
              <button class="btn primary" id="un-ok">Reservar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      document.getElementById('un-ok').onclick = () => {
        const o = document.getElementById('un-orden').value.trim();
        if (!o) return UI.aviso('Poné el número de venta', 'warn');
        global.DB.guardarUnidad({ id, orden: o, fechaVenta: hoy() });
        UI.aviso(`${u.serie} reservada para ${o}`, 'ok');
        cerrar(); this.pintar();
      };
    },
    liberar(id) {
      const u = global.DB.unidad(id); if (!u) return;
      global.DB.guardarUnidad({ id, orden: null, fechaVenta: '' });
      UI.aviso(`${u.serie} vuelve a estar disponible`, 'ok');
      this.pintar();
    },

    estilos() {
      return `<style>
        .un-bar{display:flex;gap:8px;align-items:center;margin-bottom:12px}
        .un-busca{flex:1;min-width:180px}
        .un-busca input{width:100%;padding:9px 12px;font-size:13px}
        .un-bar .btn{flex:none;white-space:nowrap}
        .un-bar .btn.on{background:var(--navy);border-color:var(--navy);color:#fff}
        #un-cn{margin-left:6px;font-size:11px;background:var(--brand);color:#fff;border-radius:999px;
          padding:1px 6px}
        #un-cn:empty{display:none}
        .btn.on #un-cn{background:#fff;color:var(--navy)}
        .segm{display:flex;gap:6px;flex-wrap:wrap}
        .seg{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:5px 13px;
          font-size:12.5px;font-weight:650;color:var(--ink-soft);cursor:pointer}
        .seg b{opacity:.6;margin-left:5px;font-weight:700}
        .seg.on{background:var(--navy);border-color:var(--navy);color:#fff}
        .seg.on b{opacity:.75}

        .un-cols{display:grid;grid-template-columns:minmax(0,1fr) 206px;gap:18px;align-items:start}
        .un-cols.sin-c{grid-template-columns:1fr}
        @media(max-width:1100px){.un-cols{grid-template-columns:1fr}}
        .un-c{position:sticky;top:104px;display:flex;flex-direction:column}
        .un-c-h{display:flex;align-items:baseline;gap:8px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:5px}
        .un-c .lnk{border:0;background:none;padding:0;font:inherit;font-size:11px;font-weight:600;
          color:var(--brand);cursor:pointer;text-transform:none;letter-spacing:0}
        .un-c .lnk:hover{text-decoration:underline}
        .un-o{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer;font-size:12.5px;
          color:var(--ink-soft)}
        .un-o:hover{color:var(--navy)}
        .un-o.on{color:var(--navy);font-weight:650}
        .un-o input{width:14px;height:14px;accent-color:var(--brand);flex:none;margin:0}
        .un-o-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .un-o-c{font-size:11px;color:var(--muted);flex:none;margin-left:5px}

        /* El renglón va bajo: se trabaja mirando muchos a la vez. */
        .un-tabla{overflow-x:auto}
        .un-tabla table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:940px}
        .un-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap;background:var(--panel);position:sticky;top:95px;z-index:2}
        .un-tabla td{padding:3px 8px;border-bottom:1px solid var(--line-soft);white-space:nowrap;
          line-height:1.35}
        .un-tabla th{padding-left:8px;padding-right:8px}
        .un-tabla tr.off{opacity:.55}
        .un-tabla tr:hover td{background:var(--panel-2)}
        .un-g td{background:var(--panel-2);font-weight:700;color:var(--navy);font-size:11px;
          text-transform:uppercase;letter-spacing:.04em;padding:5px 9px;
          border-top:1px solid var(--line)}
        .un-g:hover td{background:var(--panel-2)}
        .un-g .muted{font-weight:600;margin-left:6px}
        .un-tabla .nom{font-weight:700;color:var(--navy)}
        .un-tipo{font-size:11px;padding:1px 7px;border:1px solid var(--line);border-radius:999px;
          background:var(--panel);color:var(--muted);white-space:nowrap}
        .un-tipo[data-tipo]{cursor:pointer}
        .un-tipo[data-tipo]:hover{border-color:var(--brand);color:var(--brand)}
        .un-tipo.med{background:var(--brand-soft);border-color:#cfe0fb;color:var(--brand-ink);
          font-weight:700}
        .td-n{display:flex;align-items:center;gap:7px}
        /* El número y el botón de reservar quedan pegados a los bordes: son
           las dos puntas que se miran, y la tabla es más ancha que la pantalla. */
        .un-tabla th:first-child,.un-tabla td:first-child{position:sticky;left:0;z-index:1;
          background:var(--panel);box-shadow:1px 0 0 var(--line-soft)}
        .un-tabla th:last-child,.un-tabla td.td-acc{position:sticky;right:0;z-index:1;
          background:var(--panel);box-shadow:-1px 0 0 var(--line-soft)}
        .un-tabla tr:hover td:first-child,.un-tabla tr:hover td.td-acc{background:var(--panel-2)}
        .un-tabla .un-g td{position:static;box-shadow:none}
        .un-tabla th:first-child{z-index:3} .un-tabla th:last-child{z-index:3}
        .td-acc{text-align:right;padding-right:10px}
        .un-foto{width:26px;height:26px;border:1px dashed var(--line);border-radius:7px;
          background:var(--panel);color:var(--muted);cursor:pointer;display:grid;place-items:center;
          padding:0;overflow:hidden}
        .un-foto svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.4}
        .un-foto:hover{border-color:var(--brand);color:var(--brand)}
        .un-foto.hay{border-style:solid;border-color:var(--line)}
        .un-foto img{width:100%;height:100%;object-fit:cover}
        .bres{border:1px solid var(--brand);background:var(--brand-soft);color:var(--brand-ink);
          border-radius:7px;padding:2px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;
          white-space:nowrap}
        .bres:hover{background:var(--brand);color:#fff}
        .b-x{border:1px solid var(--line);background:var(--panel);border-radius:7px;padding:2px 8px;
          font:inherit;font-size:11.5px;color:var(--muted);cursor:pointer}
        .b-x:hover{border-color:var(--brand);color:var(--brand)}
        .un-back{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .un-prev{margin-top:12px;height:200px;border:1px solid var(--line);border-radius:10px;
          background:var(--panel-2);display:grid;place-items:center;overflow:hidden}
        .un-prev img{width:100%;height:100%;object-fit:contain}
        .pill.viol{background:#f3e8ff;color:#6b21a8}
      </style>`;
    },
  };

  // Fecha de hoy en el formato corto que se usa en la planilla.
  function hoy() {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  global.Unidades = Unidades;
})(typeof window !== 'undefined' ? window : globalThis);
