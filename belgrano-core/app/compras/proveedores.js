// =====================================================================
//  Belgrano Soft · Compras · Proveedores
//  La libreta de a quién le compramos. Cada uno con su id propio: puede
//  haber dos Vicente y no se confunden. La ficha junta todo lo que se
//  sabe de él —lo que entregó, lo que debe, cómo llegó su mercadería y a
//  qué precio nos deja cada mueble— sin tener que ir a buscarlo a cuatro
//  pantallas distintas.
// =====================================================================
(function (global) {
  const Prov = {
    _mount: 'view',
    abierto: null,
    rubro: '',
    q: '',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierto ? this.htmlFicha(this.abierto) : this.htmlLista())
        + this.estilos();
      this.enganchar();
    },

    // ---- Listado -----------------------------------------------------
    htmlLista() {
      const todos = global.DB.proveedores();
      const rubros = [...new Set(todos.map(p => p.rubro))];
      const t = String(this.q || '').toLowerCase();
      const lista = todos
        .filter(p => !this.rubro || p.rubro === this.rubro)
        .filter(p => !t || `${p.id}${p.nombre} ${p.direccion || ''}`.toLowerCase().includes(t))
        .map(p => ({ p, f: global.DB.fichaProveedor(p.id) }));
      // Primero los que tienen algo esperando: son los que hay que mirar hoy.
      lista.sort((a, b) => (b.f.aConformar - a.f.aConformar) || (b.f.total - a.f.total));
      const tot = lista.reduce((a, x) => a + x.f.total, 0);
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Proveedores</h1>
            <div class="h-sub">${lista.length} de ${todos.length} · ${UI.pesos(tot)} comprados</div></div>
          <div class="sp"></div>
          <input id="cx-q" class="cx-buscar" placeholder="Buscar por nombre o domicilio"
            value="${UI.esc(this.q)}">
        </div>
        <div class="cx-filtros">
          <button class="cx-f ${!this.rubro ? 'on' : ''}" data-rubro="">Todos</button>
          ${rubros.map(r => `<button class="cx-f ${this.rubro === r ? 'on' : ''}"
            data-rubro="${UI.esc(r)}">${UI.esc((global.DB.rubro(r) || {}).label || r)}
            <span class="muted">${todos.filter(p => p.rubro === r).length}</span></button>`).join('')}
        </div>
        ${lista.length ? `<div class="cx-grid">${lista.map(x => this.tarjeta(x.p, x.f)).join('')}</div>`
          : UI.vacio('No hay ningún proveedor con ese filtro.')}`;
    },

    tarjeta(p, f) {
      const rub = global.DB.rubro(p.rubro) || {};
      return `<button class="card pad cx-t" data-prov="${p.id}">
        <div class="cx-t-h">
          <span class="cx-av">${UI.esc(this.inicial(p.nombre))}</span>
          <span class="cx-t-n"><b>${UI.esc(p.nombre)}</b>
            <span class="muted">#${p.id} · ${UI.esc(rub.label || p.rubro)}</span></span>
          ${f.aConformar ? `<span class="pill warn">${f.aConformar} a conformar</span>` : ''}
          ${f.atrasados ? `<span class="pill crit">${f.atrasados} atrasados</span>` : ''}
        </div>
        <div class="cx-t-d">${UI.esc(p.direccion || 'Sin domicilio cargado')}</div>
        <div class="cx-t-n3">
          <span><b>${f.piezas}</b><span>muebles entregados</span></span>
          <span><b>${UI.pesos(f.total)}</b><span>comprado</span></span>
          <span><b>${f.enFabrica}</b><span>en fábrica ahora</span></span>
        </div>
      </button>`;
    },

    // Los proveedores se nombran con el número adelante —"1Tony"—, así que
    // la inicial es la primera letra de verdad y no el dígito.
    inicial(nombre) {
      const m = /[a-záéíóúñ]/i.exec(String(nombre || ''));
      return (m ? m[0] : String(nombre || '?')[0] || '?').toUpperCase();
    },

    // ---- Ficha -------------------------------------------------------
    htmlFicha(id) {
      const f = global.DB.fichaProveedor(id);
      if (!f) return UI.vacio('No existe ese proveedor.');
      const p = f.prov;
      const rub = global.DB.rubro(p.rubro) || {};
      // El pedido que tiene abierto ahora, si es que tiene uno.
      const ped = (global.DB.pedidosTodos() || []).find(x => x.estado === 'abierto'
        && (x.provId === p.id || x.proveedor === global.DB.provLabel(p.id)));
      const cupo = ped ? global.DB.lugarEnPedido(ped) : null;
      const puntual = f.piezas ? Math.round(((f.piezas - f.conDetalle) / f.piezas) * 100) : null;
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="cx-volver">‹ Proveedores</button></div>
        <div class="row" style="align-items:flex-start;margin-bottom:14px">
          <span class="cx-av grande">${UI.esc(this.inicial(p.nombre))}</span>
          <div style="margin-left:11px">
            <div class="kick">${UI.esc(rub.label || p.rubro)}</div>
            <h1 class="h-title">${UI.esc(p.nombre)} <span class="muted">#${p.id}</span></h1>
            <div class="h-sub">${UI.esc(p.direccion || 'Sin domicilio cargado')} ·
              entrega hasta ${p.capacidad || '—'} muebles por semana</div></div>
          <div class="sp"></div>
          ${f.aConformar ? `<span class="pill warn">${f.aConformar} entrega${
            f.aConformar === 1 ? '' : 's'} sin conformar</span>` : ''}
        </div>

        <div class="cx-kpis">
          ${this.kpi('Comprado', UI.pesos(f.total), `${f.conformadas} entregas conformadas`)}
          ${this.kpi('Muebles entregados', f.piezas, f.ultima ? `la última el ${UI.esc(f.ultima)}` : '—')}
          ${this.kpi('En fábrica ahora', f.enFabrica,
            f.atrasados ? `<b class="mal">${f.atrasados} atrasados</b>` : 'ninguno atrasado')}
          ${this.kpi('Llegan sin detalle', puntual == null ? '—' : `${puntual}%`,
            f.conDetalle ? `${f.conDetalle} con observación` : 'ninguno con observación')}
        </div>

        ${cupo ? `<div class="card pad cx-cupo">
          <div class="cx-b-h">Cupo del pedido ${UI.esc(ped.numero)}</div>
          <div class="cx-barra"><span style="width:${cupo.cupo
            ? Math.min(100, Math.round((cupo.usado / cupo.cupo) * 100)) : 0}%"></span></div>
          <div class="hint">${cupo.usado} de ${cupo.cupo} · quedan ${cupo.libre} lugares</div>
        </div>` : ''}

        <div class="cx-b">
          <div class="cx-b-h">Sus entregas <span class="muted">${f.recepciones.length}</span></div>
          ${f.recepciones.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Recepción</th><th>Fecha</th><th>Pedido</th><th>Muebles</th>
              <th>Flete</th><th class="num">Total</th><th>Estado</th></tr></thead>
            <tbody>${f.recepciones.map(r => {
              const fl = global.DB.flete((r.flete || {}).modo);
              return `<tr>
                <td class="nom">${UI.esc(r.numero)}</td>
                <td class="muted">${UI.esc(r.fecha)}</td>
                <td class="muted">${UI.esc(r.pedido || '—')}</td>
                <td>${r.items.length}</td>
                <td class="muted">${(r.flete || {}).modo === 'proveedor' ? 'lo trajo él'
                  : `${UI.pesos((r.flete || {}).monto || 0)} · ${fl.k === 'compra' ? 'en la compra' : 'gasto'}`}</td>
                <td class="num nom">${r.total ? UI.pesos(r.total) : '—'}</td>
                <td><span class="pill ${r.estadoCompras === 'conformada' ? 'ok' : 'warn'}">${
                  r.estadoCompras === 'conformada' ? 'conformada' : 'a conformar'}</span></td>
              </tr>`;
            }).join('')}</tbody></table></div>`
            : '<div class="hint">Todavía no entregó nada.</div>'}
        </div>

        <div class="cx-b">
          <div class="cx-b-h">Lo que nos cobra <span class="muted">${f.precios.length}</span></div>
          ${f.precios.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Mueble</th><th>Terminación</th><th class="num">Su precio</th>
              <th class="num">Costeo</th><th class="num">Dif.</th><th>Desde</th></tr></thead>
            <tbody>${f.precios.map(x => {
              const v = (global.DB.variantesTodas() || []).find(y => y.id === x.varianteId);
              const c = global.DB.costeoDe(x.varianteId);
              const d = c ? x.precio - c.costo : null;
              return `<tr>
                <td class="nom">${UI.esc(global.DB.nombreVariante(x.varianteId))}</td>
                <td class="muted">${v ? UI.esc(`${v.estructura || ''} · ${v.frente || ''}`) : '—'}</td>
                <td class="num nom">${UI.pesos(x.precio)}</td>
                <td class="num muted">${c ? UI.pesos(c.costo) : '—'}</td>
                <td class="num ${d == null ? '' : (d > 0 ? 'sube' : 'baja')}">${d == null ? '—'
                  : `${d > 0 ? '+' : ''}${UI.pesos(d)}`}</td>
                <td class="muted">${UI.esc(x.desde || '—')}</td>
              </tr>`;
            }).join('')}</tbody></table></div>`
            : `<div class="hint">Todavía no tiene precios propios. Se le aplica la lista de
              Costeo hasta que se conforme una entrega suya.</div>`}
        </div>`;
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v">${v}</span><span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-prov]').forEach(b => b.onclick = () => {
        this.abierto = Number(b.dataset.prov); this.render(this._mount);
      });
      document.querySelectorAll('[data-rubro]').forEach(b => b.onclick = () => {
        this.rubro = b.dataset.rubro; this.render(this._mount);
      });
      const v = document.getElementById('cx-volver');
      if (v) v.onclick = () => { this.abierto = null; this.render(this._mount); };
      const q = document.getElementById('cx-q');
      if (q) q.oninput = () => {
        this.q = q.value;
        const pos = q.selectionStart;
        this.render(this._mount);
        const n = document.getElementById('cx-q');
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      };
    },

    estilos() { return global.ComprasEstilos ? global.ComprasEstilos() : ''; },
  };
  global.ComprasProveedores = Prov;
})(typeof window !== 'undefined' ? window : globalThis);
