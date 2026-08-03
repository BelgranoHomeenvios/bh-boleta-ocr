// =====================================================================
//  Belgrano Soft · Producción · A fabricar
//  Una sola lista con tres maneras de apilarla: por proveedor —qué tiene
//  cada taller—, por orden de venta —qué traba cada entrega— y por mueble
//  —para juntar lo igual y armar el pedido—. Producción no inventa
//  muebles: las unidades ya vienen de la venta o de la reposición.
// =====================================================================
(function (global) {
  const AGR_KEY = 'bh_prod_agrupar';

  const Produccion = {
    _mount: 'view',
    texto: '',
    filtro: 'todo',
    agrupar: (() => { try { return localStorage.getItem(AGR_KEY) || 'proveedor'; }
      catch { return 'proveedor'; } })(),
    soloUrgentes: false,
    _abiertos: new Set(),

    AGRUPACIONES: [
      { k: 'proveedor', label: 'Por proveedor', vacio: 'Sin proveedor todavía' },
      { k: 'orden', label: 'Por orden de venta', vacio: 'Para stock' },
      { k: 'mueble', label: 'Por mueble', vacio: '—' },
    ],

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div>
            <div class="kick">Producción</div>
            <h1 class="h-title">A fabricar</h1>
            <div class="h-sub" id="pr-sub"></div>
          </div>
        </div>
        <div class="pr-bar">
          <div class="pr-busca"><input id="pr-q"
            placeholder="Buscar modelo, medida, proveedor, pedido o número de venta…"
            value="${UI.esc(this.texto)}"></div>
          <select id="pr-agr" class="pr-sel" title="Cómo se apila la lista">${
            this.AGRUPACIONES.map(a =>
              `<option value="${a.k}">${UI.esc(a.label)}</option>`).join('')}</select>
        </div>
        <div id="pr-kpis"></div>
        <div id="pr-filtros" style="margin-bottom:12px"></div>
        <div id="pr-lista">${UI.spinner()}</div>
        ${this.estilos()}`;

      const q = document.getElementById('pr-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim(); this.pintar();
      }, 200); };
      try { this.arbol = await global.DB.arbolCategorias(); } catch { this.arbol = []; }
      this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
      this.pintar();
    },

    // ---- Datos -------------------------------------------------------------
    lista() {
      const t = this.texto.toLowerCase().split(/\s+/).filter(Boolean);
      return global.DB.aFabricar().filter(u => {
        if (!this.pasaFiltro(u)) return false;
        if (this.soloUrgentes && !global.DB.vencida(u)) return false;
        if (!t.length) return true;
        const txt = `${u.modelo} ${u.medida} ${u.color} ${u.proveedor || ''} ${u.pedido || ''} ${u.orden || ''}`
          .toLowerCase();
        return t.every(x => txt.includes(x));
      });
    },
    pasaFiltro(u) {
      return this.filtro === 'todo' || global.DB.vistaFab(u) === this.filtro;
    },
    cuenta(f) {
      const antes = this.filtro; this.filtro = f;
      const n = global.DB.aFabricar().filter(u => this.pasaFiltro(u)).length;
      this.filtro = antes; return n;
    },
    filtros() {
      return [{ k: 'todo', label: 'Todo' },
        ...global.DB.VISTAS_FAB.filter(v => v.k !== 'recibido')];
    },

    // Cómo se apilan. La clave y el título de cada montón salen de acá, así
    // cambiar de agrupación no cambia nada más que esto.
    grupoDe(u) {
      if (this.agrupar === 'proveedor') {
        return u.proveedor
          ? { k: `p:${u.proveedor}`, nombre: u.proveedor, tipo: 'proveedor' }
          : { k: 'p:', nombre: 'Sin proveedor todavía', tipo: 'vacio' };
      }
      if (this.agrupar === 'orden') {
        return u.orden
          ? { k: `o:${u.orden}`, nombre: u.orden, tipo: 'orden' }
          : { k: 'o:', nombre: 'Para stock', tipo: 'stock' };
      }
      const key = `${u.modelo} · ${u.medida} · ${u.color}`;
      return { k: `m:${key}`, nombre: key, tipo: 'mueble' };
    },
    grupos(us) {
      const m = new Map();
      us.forEach(u => {
        const g = this.grupoDe(u);
        if (!m.has(g.k)) m.set(g.k, { ...g, items: [] });
        m.get(g.k).items.push(u);
      });
      const gs = [...m.values()];
      gs.forEach(g => {
        g.vencidas = g.items.filter(x => global.DB.vencida(x)).length;
        g.sinPedir = g.items.filter(x => x.estado === 'pedir').length;
        g.trabas = g.items.filter(x => !global.DB.planoListo(x)).length;
        g.items.sort((a, b) => this.peso(a) - this.peso(b)
          || String(a.modelo).localeCompare(b.modelo));
      });
      // Primero lo que hay que hacer —lo que todavía no tiene proveedor—,
      // después lo que se está pasando de fecha, y al final el resto.
      return gs.sort((a, b) => (b.tipo === 'vacio') - (a.tipo === 'vacio')
        || (b.vencidas > 0) - (a.vencidas > 0)
        || (b.sinPedir > 0) - (a.sinPedir > 0)
        || b.items.length - a.items.length
        || a.nombre.localeCompare(b.nombre));
    },
    peso(u) {
      if (global.DB.vencida(u)) return 0;
      if (!global.DB.planoListo(u)) return 1;
      return u.estado === 'pedir' ? 2 : 3;
    },

    // ---- Pintado -----------------------------------------------------------
    pintar() {
      const us = this.lista();
      const tot = global.DB.aFabricar();
      const sub = document.getElementById('pr-sub');
      if (sub) {
        const venc = tot.filter(u => global.DB.vencida(u)).length;
        sub.innerHTML = `${us.length === tot.length ? tot.length
          : `${us.length} de ${tot.length}`} muebles en el circuito${
          venc ? ` · <b style="color:var(--crit)">${venc} vencidos</b>` : ''}`;
      }
      this.pintarKpis(tot);
      const f = document.getElementById('pr-filtros');
      if (f) {
        f.innerHTML = `<div class="segm">${this.filtros().map(x =>
          `<button class="seg ${this.filtro === x.k ? 'on' : ''}" data-f="${x.k}">${UI.esc(x.label)}
            <b>${this.cuenta(x.k)}</b></button>`).join('')}
          <button class="seg urg ${this.soloUrgentes ? 'on' : ''}" data-urg>Vencidos
            <b>${tot.filter(u => global.DB.vencida(u)).length}</b></button></div>`;
        f.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
          this.filtro = b.dataset.f; this.pintar();
        });
        const bu = f.querySelector('[data-urg]');
        if (bu) bu.onclick = () => { this.soloUrgentes = !this.soloUrgentes; this.pintar(); };
      }
      const sa = document.getElementById('pr-agr');
      if (sa) {
        sa.value = this.agrupar;
        sa.onchange = () => {
          this.agrupar = sa.value;
          try { localStorage.setItem(AGR_KEY, this.agrupar); } catch {}
          this._abiertos.clear(); this.pintar();
        };
      }
      this.pintarLista(document.getElementById('pr-lista'), us);
    },

    pintarKpis(tot) {
      const k = document.getElementById('pr-kpis'); if (!k) return;
      const sinDibujo = tot.filter(u => !global.DB.planoListo(u)).length;
      const sinPedir = tot.filter(u => u.estado === 'pedir' && global.DB.planoListo(u)).length;
      const enFabrica = tot.filter(u => u.estado === 'produccion').length;
      const venc = tot.filter(u => global.DB.vencida(u)).length;
      const semana = tot.filter(u => {
        const d = global.DB.diasHasta(u.hasta);
        return u.estado === 'produccion' && d != null && d >= 0 && d <= 7;
      }).length;
      const c = (t, v, p, cl) => `<div class="pr-k"><div class="pr-k-t">${t}</div>
        <div class="pr-k-v ${cl || ''}">${v}</div><div class="pr-k-p">${p}</div></div>`;
      k.innerHTML = `<div class="pr-kpis">
        ${c('Falta dibujar', sinDibujo, sinDibujo ? 'no se pueden pedir' : 'nada trabado',
          sinDibujo ? 'alerta' : '')}
        ${c('Sin pedir', sinPedir, 'vendidos, sin proveedor', sinPedir ? 'alerta' : '')}
        ${c('En fábrica', enFabrica, `<b>${semana}</b> entran esta semana`)}
        ${c('Vencidos', venc, venc ? 'se pasó el rango prometido' : 'todo en fecha',
          venc ? 'alerta' : '')}
      </div>`;
    },

    pintarLista(cont, us) {
      if (!us.length) { cont.innerHTML = UI.vacio('No hay muebles con ese filtro.'); return; }
      const gs = this.grupos(us);
      cont.innerHTML = gs.map(g => this.htmlGrupo(g)).join('') + `
        <div class="hint" style="margin-top:10px">Es la misma lista apilada de tres maneras:
          <b>por proveedor</b> para saber qué tiene cada taller, <b>por orden</b> para saber qué
          traba cada entrega, y <b>por mueble</b> para juntar lo igual antes de pedir.</div>`;
      cont.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        const k = b.dataset.abrir;
        if (this._abiertos.has(k)) this._abiertos.delete(k); else this._abiertos.add(k);
        this.pintar();
      });
      cont.querySelectorAll('[data-ver]').forEach(b => b.onclick = () =>
        this.ficha(Number(b.dataset.ver)));
    },

    htmlGrupo(g) {
      const on = this._abiertos.has(g.k);
      const alerta = g.vencidas > 0;
      return `<section class="pr-g ${alerta ? 'mal' : ''}">
        <button class="pr-g-h" data-abrir="${UI.esc(g.k)}" aria-expanded="${on}">
          <span class="pr-g-fl">${on ? '▾' : '▸'}</span>
          ${g.tipo === 'proveedor'
            ? `<span class="pr-av">${UI.esc(this.inicial(g.nombre))}</span>` : ''}
          <b>${UI.esc(g.nombre)}</b>
          <span class="pill soft">${g.items.length} ${g.items.length === 1 ? 'mueble' : 'muebles'}</span>
          ${g.vencidas ? `<span class="pill crit">${g.vencidas} vencidos</span>` : ''}
          ${g.sinPedir && this.agrupar !== 'mueble'
            ? `<span class="pill warn">${g.sinPedir} sin pedir</span>` : ''}
          ${g.trabas ? `<span class="pill crit">${g.trabas} sin dibujo</span>` : ''}
          <span class="sp"></span>
          ${on ? '' : `<span class="pr-g-r">${UI.esc(this.resumen(g))}</span>`}
        </button>
        ${on ? this.htmlTabla(g) : ''}
      </section>`;
    },

    // Los proveedores vienen numerados —"1Tony"—, así que la inicial es la
    // primera letra de verdad, no el número.
    inicial(nombre) {
      const m = /[a-záéíóúñ]/i.exec(String(nombre || ''));
      return (m ? m[0] : String(nombre || '?')[0] || '?').toUpperCase();
    },

    // Plegado, el montón sigue diciendo lo importante sin tener que abrirlo.
    resumen(g) {
      const m = new Map();
      g.items.forEach(u => {
        const v = global.DB.VISTAS_FAB.find(x => x.k === global.DB.vistaFab(u));
        if (v) m.set(v.label, (m.get(v.label) || 0) + 1);
      });
      return [...m.entries()].map(([l, n]) => `${n} ${l.toLowerCase()}`).join(' · ');
    },

    htmlTabla(g) {
      const porMueble = this.agrupar === 'mueble';
      return `<div class="card pr-tabla">
        <table>
          <thead><tr>
            <th>Estado</th><th>Mueble</th><th>Tipo</th>
            ${porMueble ? '' : '<th>Terminación</th>'}
            <th>Plano</th>
            ${this.agrupar === 'orden' ? '<th>Proveedor</th>' : '<th>Venta</th>'}
            <th>Pedido</th><th>Entra entre</th><th></th>
          </tr></thead>
          <tbody>${g.items.map(u => this.renglon(u, porMueble)).join('')}</tbody>
        </table></div>`;
    },

    renglon(u, porMueble) {
      const v = global.DB.VISTAS_FAB.find(x => x.k === global.DB.vistaFab(u)) || {};
      const t = global.DB.tipoUnidad(u.tipo);
      const pe = global.DB.planoEstado(u.planoEstado || 'ok');
      const venc = global.DB.vencida(u);
      const dias = global.DB.diasHasta(u.hasta);
      const rango = u.desde && u.hasta
        ? `${UI.esc(u.desde)} y ${UI.esc(u.hasta)}` : '';
      return `<tr class="${venc ? 'mal' : ''}">
        <td><span class="pill ${v.pill}">${UI.esc(v.label || '')}</span></td>
        <td class="nom">${UI.esc(u.modelo)}${porMueble ? '' : ` <span class="muted">${UI.esc(u.medida)}</span>`}</td>
        <td>${u.tipo === 'estandar' ? '<span class="muted">estándar</span>'
          : `<span class="pr-tipo ${u.tipo}">${UI.esc(t.label.toLowerCase())}</span>`}
          ${u.cambios && u.cambios.length
            ? `<span class="pr-cambio">${UI.esc(u.cambios[0].propiedad.toLowerCase())}
                <b>${UI.esc(u.cambios[0].pedido)}</b>
                <span class="muted">(era ${UI.esc(u.cambios[0].deCatalogo)})</span></span>` : ''}</td>
        ${porMueble ? '' : `<td class="muted">${UI.esc(u.color)}</td>`}
        <td>${global.DB.planoListo(u) ? '<span class="muted">listo</span>'
          : `<span class="pill ${pe.pill}">${UI.esc(pe.label)}</span>`}</td>
        ${this.agrupar === 'orden'
          ? `<td class="muted">${UI.esc(u.proveedor || '—')}</td>`
          : `<td class="muted">${u.orden ? `<b class="nom">${UI.esc(u.orden)}</b>` : 'stock'}</td>`}
        <td class="muted">${UI.esc(u.pedido || '—')}</td>
        <td class="${venc ? 'venc' : ''}">${rango
          ? `${rango}${venc ? ` · ${Math.abs(dias)} días tarde` : ''}`
          : '<span class="muted">—</span>'}</td>
        <td class="td-acc"><button class="b-x" data-ver="${u.id}">Ver</button></td>
      </tr>`;
    },

    // La ficha de la pieza desde Producción: lo que hace falta para decidir
    // qué hacer con ella, sin irse a Inventario.
    ficha(id) {
      const u = global.DB.unidad(id); if (!u) return;
      const t = global.DB.tipoUnidad(u.tipo);
      const pe = global.DB.planoEstado(u.planoEstado || 'ok');
      const dato = (k, val) => val ? `<div class="fi-r"><span>${k}</span><b>${UI.esc(val)}</b></div>` : '';
      document.body.insertAdjacentHTML('beforeend', `
        <div class="pr-back" id="pr-mdl">
          <div class="card pad" style="max-width:470px;width:100%">
            <div class="row" style="align-items:flex-start">
              <div>
                <h3 class="h-title" style="font-size:17px">${UI.esc(u.modelo)}</h3>
                <p class="h-sub">${UI.esc([u.medida, u.color].filter(Boolean).join(' · '))}</p>
              </div>
              <div class="sp"></div>
              ${u.tipo === 'estandar' ? '' : `<span class="pr-tipo ${u.tipo}">${UI.esc(t.label)}</span>`}
            </div>
            ${!global.DB.planoListo(u) ? `<div class="banner warn" style="margin-top:10px">
              <b>${UI.esc(pe.label)}</b> — ${UI.esc(pe.pie)}</div>` : ''}
            ${(u.cambios || []).length ? `<div class="banner warn" style="margin-top:10px">
              Se pidió con <b>${UI.esc(u.cambios[0].propiedad.toLowerCase())}
              ${UI.esc(u.cambios[0].pedido)}</b> en vez de ${UI.esc(u.cambios[0].deCatalogo)}.
              ${UI.esc(u.detalle || '')}</div>` : ''}
            <div class="fi" style="margin-top:12px">
              ${dato('Tipo', t.label)}
              ${dato('Plano', pe.label)}
              ${dato('Proveedor', u.proveedor)}
              ${dato('Pedido', u.pedido)}
              ${dato('Entra entre', u.desde && u.hasta ? `${u.desde} y ${u.hasta}` : '')}
              ${u.orden ? `<div class="fi-r"><span>Orden de venta</span>
                <b>${UI.esc(u.orden)}</b></div>`
                : '<div class="fi-r"><span>Orden de venta</span><b>Para stock</b></div>'}
              ${dato('Vendida el', u.fechaVenta)}
            </div>
            <div class="hint" style="margin-top:11px">${global.DB.planoListo(u)
              ? 'Se puede pedir: el plano está resuelto.'
              : '<b>No se puede pedir</b> hasta que el plano esté verificado.'}</div>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="sp"></div>
              <button class="btn" id="pr-x">Cerrar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('pr-mdl'); if (m) m.remove(); };
      document.getElementById('pr-x').onclick = cerrar;
      document.getElementById('pr-mdl').onclick = e => { if (e.target.id === 'pr-mdl') cerrar(); };
    },

    estilos() {
      return `<style>
        .pr-bar{display:flex;gap:8px;align-items:center;margin-bottom:12px}
        .pr-busca{flex:1;min-width:180px}
        .pr-busca input{width:100%;padding:9px 12px;font-size:13px}
        .pr-sel{flex:none;width:auto;min-width:186px;padding:8px 10px;font-size:12.5px;
          font-weight:650;color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;
          background:var(--panel)}
        .pr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
        @media(max-width:900px){.pr-kpis{grid-template-columns:1fr 1fr}}
        .pr-k{border:1px solid var(--line);border-radius:11px;padding:9px 12px;background:var(--panel)}
        .pr-k-t{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);
          font-weight:700}
        .pr-k-v{font-size:19px;font-weight:800;color:var(--navy);margin-top:1px}
        .pr-k-v.alerta{color:var(--crit)}
        .pr-k-p{font-size:11px;color:var(--muted)}
        .pr-k-p b{color:var(--ink-soft)}
        .seg.urg.on{background:var(--crit);border-color:var(--crit)}
        /* Cada montón se abre solo. Cerrado sigue diciendo qué tiene adentro. */
        .pr-g{border:1px solid var(--line);border-radius:12px;background:var(--panel);
          margin-bottom:9px;overflow:hidden}
        .pr-g.mal{border-color:#f2c6c0}
        .pr-g-h{display:flex;align-items:center;gap:9px;width:100%;border:0;background:var(--panel-2);
          padding:9px 13px;cursor:pointer;font:inherit;text-align:left;
          border-bottom:1px solid var(--line)}
        .pr-g.mal .pr-g-h{background:var(--crit-bg)}
        .pr-g-h b{font-size:13.5px;color:var(--navy)}
        .pr-g-h:hover b{color:var(--brand)}
        .pr-g-fl{font-size:10px;color:var(--muted);width:10px;flex:none}
        .pr-g-h .sp{flex:1}
        .pr-g-r{font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;max-width:44%}
        .pr-av{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;
          background:var(--navy);color:#fff;font-size:11px;font-weight:800;flex:none}
        .pr-tabla{border:0;border-radius:0;overflow-x:auto;box-shadow:none}
        .pr-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .pr-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap}
        .pr-tabla td{padding:5px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap;
          line-height:1.35}
        .pr-tabla tr:last-child td{border-bottom:0}
        .pr-tabla tr:hover td{background:var(--panel-2)}
        .pr-tabla tr.mal td{background:var(--crit-bg)}
        .pr-tabla .nom{font-weight:700;color:var(--navy)}
        .pr-tabla .venc{color:var(--crit);font-weight:700}
        .td-acc{text-align:right}
        .pr-tipo{display:inline-block;font-size:10.5px;font-weight:700;border-radius:999px;
          padding:1px 8px;border:1px solid var(--line);background:var(--panel-2);color:var(--muted)}
        .pr-tipo.modificado{background:var(--warn-bg);border-color:#f3e2c0;color:var(--warn)}
        .pr-tipo.medida{background:var(--brand-soft);border-color:#cfe0fb;color:var(--brand-ink)}
        .pr-cambio{display:block;font-size:11px;color:var(--warn);margin-top:1px}
        .pr-cambio b{color:var(--ink-soft)}
        .pr-back{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .b-x{border:1px solid var(--line);background:var(--panel);border-radius:7px;padding:2px 8px;
          font:inherit;font-size:11.5px;color:var(--muted);cursor:pointer}
        .b-x:hover{border-color:var(--brand);color:var(--brand)}
      </style>`;
    },
  };

  global.Produccion = Produccion;
})(typeof window !== 'undefined' ? window : globalThis);
