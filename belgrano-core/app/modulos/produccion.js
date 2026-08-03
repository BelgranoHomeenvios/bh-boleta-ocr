// =====================================================================
//  Belgrano Soft · Producción · A fabricar
//  Una sola lista con tres maneras de apilarla: por proveedor —qué tiene
//  cada taller—, por orden de venta —qué traba cada entrega— y por mueble
//  —para juntar lo igual y armar el pedido—. Producción no inventa
//  muebles: las unidades ya vienen de la venta o de la reposición.
// =====================================================================
(function (global) {
  const AGR_KEY = 'bh_prod_agrupar';
  const LAT_KEY = 'bh_prod_lateral';

  const Produccion = {
    _mount: 'view',
    texto: '',
    filtro: 'todo',
    agrupar: (() => { try { return localStorage.getItem(AGR_KEY) || 'proveedor'; }
      catch { return 'proveedor'; } })(),
    soloUrgentes: false,
    soloSemana: false,
    taller: null,          // un taller marcado en el costado
    origen: 'todo',        // todo · venta · stock
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
      return this.base().filter(u => {
        if (!this.pasaTaller(u)) return false;
        if (!this.pasaOrigen(u)) return false;
        if (!this.pasaFiltro(u)) return false;
        if (this.soloUrgentes && !global.DB.vencida(u)) return false;
        if (this.soloSemana && !this.entraSemana(u)) return false;
        if (!t.length) return true;
        const txt = `${u.modelo} ${u.medida} ${u.color} ${u.proveedor || ''} ${u.pedido || ''} ${u.orden || ''}`
          .toLowerCase();
        return t.every(x => txt.includes(x));
      });
    },
    pasaFiltro(u) {
      return this.filtro === 'todo' || global.DB.vistaFab(u) === this.filtro;
    },
    pasaTaller(u) {
      if (!this.taller) return true;
      if (this.taller === '(sin)') return !u.proveedor;
      return u.proveedor === this.taller;
    },
    pasaOrigen(u) {
      if (this.origen === 'venta') return !!u.orden;
      if (this.origen === 'stock') return !u.orden;
      return true;
    },
    // Lo que Producción tiene entre manos, o lo que ya trajo si se pide ver eso.
    base() {
      return this.verRecibido
        ? global.DB.unidadesTodas().filter(u => u.pedido
          && (u.estado === 'stock' || u.estado === 'entregada'))
        : global.DB.aFabricar();
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
      const tot = this.base();
      const sub = document.getElementById('pr-sub');
      if (sub) {
        const venc = global.DB.aFabricar().filter(u => global.DB.vencida(u)).length;
        const qué = this.verRecibido ? 'muebles ya recibidos' : 'muebles en el circuito';
        sub.innerHTML = `${us.length === tot.length ? tot.length
          : `${us.length} de ${tot.length}`} ${qué}${
          !this.verRecibido && venc ? ` · <b style="color:var(--crit)">${venc} vencidos</b>` : ''}${
          this.taller ? ` · <b>${UI.esc(this.taller)}</b>` : ''}`;
      }
      this.pintarKpis(global.DB.aFabricar());
      const sa = document.getElementById('pr-agr');
      if (sa) {
        sa.value = this.agrupar;
        sa.onchange = () => {
          this.agrupar = sa.value;
          try { localStorage.setItem(AGR_KEY, this.agrupar); } catch {}
          this._abiertos.clear(); this.pintar();
        };
      }
      const cont = document.getElementById('pr-lista');
      cont.innerHTML = `<div class="pr-cols ${this.verLat ? '' : 'sin-i'}">
        ${this.htmlLateral()}
        <div id="pr-tabla"></div>
      </div>`;
      this.pintarLista(document.getElementById('pr-tabla'), us);
      this.engancharLateral(cont);
    },

    // ---- El costado: los talleres ------------------------------------------
    // Igual que las categorías en Inventario: siempre abierto, con la carga de
    // cada uno. Los que hoy no tienen nada también están — saber quién está
    // libre es la mitad de la decisión de a quién darle el próximo pedido.
    verLat: (() => { try { return localStorage.getItem(LAT_KEY) !== '0'; } catch { return true; } })(),
    htmlLateral() {
      const ic = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13"
        height="11" rx="2"/><path d="M6.5 2.5v11" /></svg>`;
      if (!this.verLat) {
        return `<aside class="pr-lat cerrada">
          <button class="pr-lat-b" data-verlat title="Mostrar los talleres">${ic}</button>
          <span class="pr-lat-r">${UI.esc(this.taller || 'Todos los talleres')}</span>
        </aside>`;
      }
      const base = this.base();
      const cuenta = f => base.filter(u => this.pasaOrigen(u) && this.pasaFiltro(u)
        && (!this.soloUrgentes || global.DB.vencida(u))
        && (!this.soloSemana || this.entraSemana(u)) && f(u)).length;
      const talleres = global.DB.cargaTalleres().map(t => ({
        ...t, n: cuenta(u => u.proveedor === t.nombre),
      }));
      const conTrabajo = talleres.filter(t => t.n > 0);
      const libres = talleres.filter(t => !t.n);
      const sinProv = cuenta(u => !u.proveedor);
      const fila = (k, label, n, extra = '') => `<button class="pr-t-h ${
        this.taller === k ? 'on' : ''} ${n ? '' : 'vacio'}" data-taller="${UI.esc(k)}">
        <span class="pr-t-n">${UI.esc(label)}</span>${extra}
        <span class="pr-t-c tnum">${n}</span></button>`;
      return `<aside class="pr-lat">
        <div class="pr-lat-h"><span>Taller</span>
          <button class="pr-lat-b" data-verlat title="Ocultar los talleres">${ic}</button></div>
        <button class="pr-t-todos ${this.taller ? '' : 'on'}" data-taller="">Todos
          <span class="pr-t-c tnum">${cuenta(() => true)}</span></button>
        ${sinProv ? fila('(sin)', 'Sin proveedor', sinProv,
          '<span class="pr-t-al">a pedir</span>') : ''}
        ${conTrabajo.map(t => fila(t.nombre, t.nombre, t.n,
          t.vencidas ? `<span class="pr-t-mal">${t.vencidas}</span>` : '')).join('')}
        ${libres.length ? `<div class="pr-t-sep">Sin trabajo hoy</div>
          ${libres.map(t => fila(t.nombre, t.nombre, 0)).join('')}` : ''}

        <div class="pr-lat-h" style="margin-top:12px"><span>Para qué</span></div>
        ${['todo', 'venta', 'stock'].map(o => `<button class="pr-t-h ${
          this.origen === o ? 'on' : ''}" data-origen="${o}">
          <span class="pr-t-n">${o === 'todo' ? 'Todo' : o === 'venta' ? 'Vendidos' : 'Para stock'}</span>
          <span class="pr-t-c tnum">${this.base().filter(u => this.pasaTaller(u)
            && this.pasaFiltro(u) && (o === 'todo' || (o === 'venta' ? !!u.orden : !u.orden))).length}</span>
          </button>`).join('')}
      </aside>`;
    },
    engancharLateral(cont) {
      cont.querySelectorAll('[data-verlat]').forEach(b => b.onclick = () => {
        this.verLat = !this.verLat;
        try { localStorage.setItem(LAT_KEY, this.verLat ? '1' : '0'); } catch {}
        this.pintar();
      });
      cont.querySelectorAll('[data-taller]').forEach(b => b.onclick = () => {
        const k = b.dataset.taller;
        this.taller = (!k || this.taller === k) ? null : k;
        this.pintar();
      });
      cont.querySelectorAll('[data-origen]').forEach(b => b.onclick = () => {
        this.origen = b.dataset.origen; this.pintar();
      });
    },

    // Cada número de arriba es un botón: se aprieta y la lista queda con eso.
    // Volver a apretarlo lo saca. Son los cuatro cortes de todos los días.
    entraSemana(u) {
      const d = global.DB.diasHasta(u.hasta);
      return u.estado === 'produccion' && d != null && d >= 0 && d <= 7;
    },
    KPIS: [
      { k: 'dibujar', titulo: 'Falta dibujar', pie: 'no se pueden pedir', pieOk: 'nada trabado' },
      { k: 'pedir', titulo: 'Sin pedir', pie: 'vendidos, sin proveedor', pieOk: 'nada pendiente' },
      { k: 'fabricando', titulo: 'En fábrica', pie: '', pieOk: '' },
      { k: 'vencidos', titulo: 'Vencidos', pie: 'se pasó el rango prometido', pieOk: 'todo en fecha' },
      { k: 'semana', titulo: 'Entran esta semana', pie: 'para hacerles lugar', pieOk: 'nada esta semana' },
      { k: 'recibido', titulo: 'Ya recibidos', pie: 'lo que trajeron', pieOk: 'todavía nada' },
    ],
    verRecibido: false,
    // Cuántas caen en cada corte. Es la misma cuenta que usa el filtro, así
    // el número de arriba y lo que se ve abajo no se pueden despegar.
    esDelKpi(u, k) {
      if (k === 'vencidos') return global.DB.vencida(u);
      if (k === 'semana') return this.entraSemana(u);
      if (k === 'recibido') return u.estado === 'stock' || u.estado === 'entregada';
      return global.DB.vistaFab(u) === k;
    },
    kpiActivo() {
      if (this.verRecibido) return 'recibido';
      if (this.soloUrgentes) return 'vencidos';
      if (this.soloSemana) return 'semana';
      return this.filtro === 'todo' ? null : this.filtro;
    },
    tocarKpi(k) {
      const ya = this.kpiActivo() === k;
      this.filtro = 'todo'; this.soloUrgentes = false; this.soloSemana = false;
      this.verRecibido = false;
      if (!ya) {
        if (k === 'vencidos') this.soloUrgentes = true;
        else if (k === 'semana') this.soloSemana = true;
        else if (k === 'recibido') this.verRecibido = true;
        else this.filtro = k;
      }
      this._abiertos.clear();
      this.pintar();
    },
    pintarKpis(tot) {
      const k = document.getElementById('pr-kpis'); if (!k) return;
      const activo = this.kpiActivo();
      const semana = tot.filter(u => this.entraSemana(u)).length;
      const recibidos = global.DB.unidadesTodas().filter(u => u.pedido
        && (u.estado === 'stock' || u.estado === 'entregada')).length;
      k.innerHTML = `<div class="pr-kpis">${this.KPIS.map(x => {
        const n = x.k === 'recibido' ? recibidos : tot.filter(u => this.esDelKpi(u, x.k)).length;
        const mal = n > 0 && (x.k === 'dibujar' || x.k === 'pedir' || x.k === 'vencidos');
        const pie = x.k === 'fabricando'
          ? `<b>${semana}</b> entran esta semana` : (n ? x.pie : x.pieOk);
        return `<button class="pr-k ${activo === x.k ? 'on' : ''}" data-kpi="${x.k}"
          title="${activo === x.k ? 'Sacar este filtro' : 'Ver sólo estos'}">
          <span class="pr-k-t">${x.titulo}</span>
          <span class="pr-k-v ${mal ? 'alerta' : ''}">${n}</span>
          <span class="pr-k-p">${pie}</span></button>`;
      }).join('')}</div>`;
      k.querySelectorAll('[data-kpi]').forEach(b => b.onclick = () => this.tocarKpi(b.dataset.kpi));
    },

    pintarLista(cont, us) {
      if (!us.length) { cont.innerHTML = UI.vacio('No hay muebles con ese filtro.'); return; }
      const gs = this.grupos(us);
      // Si quedaron pocos, se abren solos: filtraste justamente para verlos.
      if (us.length <= 30 || gs.length === 1) gs.forEach(g => this._abiertos.add(g.k));
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
        /* El costado con los talleres, igual que las categorías en Inventario. */
        .pr-cols{display:grid;grid-template-columns:196px minmax(0,1fr);gap:14px;align-items:start;
          max-width:100%}
        .pr-cols.sin-i{grid-template-columns:30px minmax(0,1fr)}
        .pr-cols>#pr-tabla{min-width:0}
        @media(max-width:1080px){.pr-cols,.pr-cols.sin-i{grid-template-columns:1fr}}
        .pr-lat{position:sticky;top:104px;display:flex;flex-direction:column;border:1px solid var(--line);
          border-radius:12px;background:var(--panel);padding:9px 4px 9px 10px}
        .pr-lat.cerrada{align-items:center;padding:9px 3px;gap:12px}
        .pr-lat-h{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .pr-lat-h span{flex:1}
        .pr-lat-b{border:1px solid var(--line);background:var(--panel);border-radius:7px;width:24px;
          height:22px;display:grid;place-items:center;cursor:pointer;color:var(--muted);padding:0;
          margin-right:6px}
        .pr-lat-b svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.3}
        .pr-lat-b:hover{border-color:var(--brand);color:var(--brand)}
        .pr-lat.cerrada .pr-lat-b{margin:0}
        .pr-lat-r{writing-mode:vertical-rl;font-size:11.5px;color:var(--muted);white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;max-height:260px}
        .pr-t-todos,.pr-t-h{display:flex;align-items:center;gap:6px;width:100%;border:0;
          background:none;padding:4px 6px;cursor:pointer;font:inherit;text-align:left;
          border-radius:7px;color:var(--ink-soft);font-size:12.5px}
        .pr-t-todos{font-weight:700;color:var(--navy);margin-bottom:2px}
        .pr-t-c{margin-left:auto;font-size:11px;color:var(--muted);flex:none;font-weight:600}
        .pr-t-todos.on,.pr-t-h.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
        .pr-t-h:hover{background:var(--panel-2)}
        .pr-t-h.vacio{color:var(--muted)}
        .pr-t-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pr-t-mal{font-size:10px;font-weight:800;background:var(--crit);color:#fff;border-radius:999px;
          padding:0 5px;line-height:15px;flex:none}
        .pr-t-al{font-size:10px;font-weight:700;background:var(--warn-bg);color:var(--warn);
          border-radius:999px;padding:0 6px;line-height:15px;flex:none}
        .pr-t-sep{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);margin:8px 0 2px;padding-left:6px}
        .pr-kpis{grid-template-columns:repeat(6,1fr)}
        @media(max-width:1400px){.pr-kpis{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:760px){.pr-kpis{grid-template-columns:1fr 1fr}}
        /* Cada número es un botón: apretarlo deja la lista con eso. */
        .pr-k{border:1px solid var(--line);border-radius:11px;padding:9px 12px;
          background:var(--panel);display:block;width:100%;text-align:left;cursor:pointer;
          font:inherit}
        .pr-k:hover{border-color:var(--brand)}
        .pr-k.on{border-color:var(--brand);background:var(--brand-soft);box-shadow:inset 0 0 0 1px var(--brand)}
        .pr-k-t{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700}
        .pr-k.on .pr-k-t{color:var(--brand-ink)}
        .pr-k-v{display:block;font-size:19px;font-weight:800;color:var(--navy);margin-top:1px}
        .pr-k-v.alerta{color:var(--crit)}
        .pr-k-p{display:block;font-size:11px;color:var(--muted)}
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
