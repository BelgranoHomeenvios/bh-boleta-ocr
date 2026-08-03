// =====================================================================
//  Belgrano Soft · Producción · Vendidos
//  Una fila por mueble vendido, con su número de serie y en qué parte del
//  camino está. Es la vista que contesta lo que pregunta el cliente:
//  "¿mi cómoda dónde está?" — y la que dice qué traba cada entrega.
// =====================================================================
(function (global) {
  const Vendidos = {
    _mount: 'view',
    texto: '',
    soloPendientes: true,

    async render(mount = 'view') {
      this._mount = mount;
      if (!this.prods) this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
      const v = document.getElementById(mount);
      v.innerHTML = `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Producción</div><h1 class="h-title">Vendidos</h1>
            <div class="h-sub" id="vd-sub"></div></div>
        </div>
        <div class="pr-bar">
          <div class="pr-busca"><input id="vd-q" placeholder="Buscar orden, cliente, mueble o número de serie…"
            value="${UI.esc(this.texto)}"></div>
          <button class="btn ${this.soloPendientes ? 'primary' : ''}" id="vd-pend">Sólo lo que falta</button>
        </div>
        <div id="vd-lista">${UI.spinner()}</div>
        ${this.estilos()}`;
      const q = document.getElementById('vd-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim(); this.pintar(); }, 200); };
      document.getElementById('vd-pend').onclick = () => {
        this.soloPendientes = !this.soloPendientes; this.render(this._mount);
      };
      this.pintar();
    },

    // Todo lo vendido, agrupado por orden. Una venta se entrega entera: por eso
    // lo que importa es el peor de sus muebles, no el promedio.
    ordenes() {
      const t = this.texto.toLowerCase().split(/\s+/).filter(Boolean);
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!u.orden) return;
        if (!m.has(u.orden)) m.set(u.orden, { orden: u.orden, items: [], fecha: u.fechaVenta || '' });
        m.get(u.orden).items.push(u);
      });
      let gs = [...m.values()];
      gs.forEach(g => {
        g.listos = g.items.filter(u => u.estado === 'stock' || u.estado === 'entregada').length;
        g.entregados = g.items.filter(u => u.estado === 'entregada').length;
        g.falta = g.items.length - g.listos;
        g.completa = g.falta === 0;
        const ms = g.items.map(u => global.DB.margenEntrega(u)).filter(x => x != null);
        g.peor = ms.length ? Math.min(...ms) : 9999;
        g.traba = g.items.find(u => u.estado === 'pedir') || g.items.find(u => u.estado === 'produccion');
      });
      if (this.soloPendientes) gs = gs.filter(g => !g.completa);
      if (t.length) {
        gs = gs.filter(g => {
          const txt = `${g.orden} ${g.items.map(u => `${u.modelo} ${u.serie}`).join(' ')}`.toLowerCase();
          return t.every(x => txt.includes(x));
        });
      }
      return gs.sort((a, b) => a.peor - b.peor || String(a.orden).localeCompare(b.orden));
    },

    pintar() {
      const gs = this.ordenes();
      const todas = [...new Set(global.DB.unidadesTodas().filter(u => u.orden).map(u => u.orden))];
      const sub = document.getElementById('vd-sub');
      if (sub) sub.innerHTML = `${gs.length} de ${todas.length} órdenes${
        this.soloPendientes ? ' con algo pendiente' : ''}`;
      const cont = document.getElementById('vd-lista');
      if (!gs.length) { cont.innerHTML = UI.vacio('No hay órdenes con ese filtro.'); return; }
      cont.innerHTML = gs.map(g => this.htmlOrden(g)).join('') + `
        <div class="hint" style="margin-top:10px">Una venta se entrega entera: lo que manda es
          <b>el mueble que va más atrasado</b>, no el promedio. Por eso las órdenes se ordenan por
          el peor de los suyos.</div>`;
      cont.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        const s = b.closest('.vd-o'); s.classList.toggle('on');
        b.setAttribute('aria-expanded', s.classList.contains('on'));
      });
    },

    htmlOrden(g) {
      const tarde = g.peor < 0;
      return `<section class="vd-o ${g.completa ? 'ok' : ''} ${tarde ? 'mal' : ''}">
        <button class="vd-h" data-abrir aria-expanded="false">
          <span class="vd-fl">▸</span>
          <b>${UI.esc(g.orden)}</b>
          <span class="vd-barra">${g.items.map(u => `<i class="${this.claseDe(u)}"></i>`).join('')}</span>
          <span class="muted">${g.listos} de ${g.items.length} listos</span>
          ${g.completa ? '<span class="pill ok">completa</span>'
            : `<span class="pill ${tarde ? 'crit' : 'warn'}">${tarde
              ? `${Math.abs(g.peor)} días tarde` : `en ${g.peor} días`}</span>`}
          <span class="sp"></span>
          ${!g.completa && g.traba ? `<span class="hint">traba: ${UI.esc(g.traba.modelo)}</span>` : ''}
        </button>
        <div class="vd-b"><table>
          <thead><tr><th>N°</th><th>Mueble</th><th>Terminación</th><th>Estado</th>
            <th>Taller</th><th>Falta</th></tr></thead>
          <tbody>${g.items.map(u => {
            const e = global.DB.etiquetaUnidad(u);
            const d = global.DB.margenEntrega(u);
            return `<tr>
              <td class="tnum nom">${UI.esc(u.serie)}</td>
              <td>${UI.esc(u.modelo)} <span class="muted">${UI.esc(u.medida)}</span></td>
              <td class="muted">${UI.esc(u.color)}</td>
              <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
              <td class="muted">${UI.esc(u.proveedor || '—')}</td>
              <td class="${d != null && d < 0 ? 'venc' : 'muted'}">${d == null ? '—'
                : d < 0 ? `${Math.abs(d)} días tarde` : `faltan ${d}`}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </section>`;
    },
    claseDe(u) {
      if (u.estado === 'entregada') return 'e';
      if (u.estado === 'stock') return 'l';
      if (u.estado === 'produccion') return 'f';
      return 'p';
    },

    estilos() {
      return `<style>
        .vd-o{border:1px solid var(--line);border-radius:12px;background:var(--panel);
          margin-bottom:9px;overflow:hidden}
        .vd-o.ok{border-color:#cfe8d8}
        .vd-o.mal{border-color:#f2c6c0}
        .vd-h{display:flex;align-items:center;gap:9px;width:100%;border:0;padding:9px 13px;
          cursor:pointer;font:inherit;text-align:left;background:var(--panel-2)}
        .vd-o.ok .vd-h{background:var(--ok-bg)}
        .vd-o.mal .vd-h{background:var(--crit-bg)}
        .vd-h b{font-size:13.5px;color:var(--navy)}
        .vd-h .sp{flex:1}
        .vd-fl{font-size:10px;color:var(--muted);width:10px}
        .vd-o.on .vd-fl{transform:rotate(90deg)}
        .vd-barra{display:inline-flex;gap:2px}
        .vd-barra i{width:13px;height:7px;border-radius:2px;display:block}
        .vd-barra .l{background:var(--ok)} .vd-barra .e{background:var(--muted)}
        .vd-barra .f{background:#8b5cf6} .vd-barra .p{background:var(--crit)}
        .vd-b{display:none;overflow-x:auto}
        .vd-o.on .vd-b{display:block}
        .vd-b table{width:100%;border-collapse:collapse;font-size:12.5px}
        .vd-b th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line)}
        .vd-b td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .vd-b tr:last-child td{border-bottom:0}
        .vd-b .nom{font-weight:700;color:var(--navy)}
        .vd-b .venc{color:var(--crit);font-weight:700}
      </style>`;
    },
  };
  global.ProdVendidos = Vendidos;
})(typeof window !== 'undefined' ? window : globalThis);
