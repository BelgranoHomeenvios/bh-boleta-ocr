// =====================================================================
//  Belgrano Soft · Ventas · Panel (Resumen para Dirección)
//  Tablero arriba (KPIs + filtro de fecha + nueva venta/cotización),
//  "Mis pendientes" (consultas de cualquier módulo en un solo lugar) y
//  abajo la tabla de TODAS las boletas con su estado resumen y filtros.
//  Entrar a una fila → el historial de la boleta (Detalle de Orden).
// =====================================================================
(function (global) {
  const FILTROS = [
    { k: '', label: 'Todas' },
    { k: 'a_confirmar', label: 'A confirmar' },
    { k: 'fabricacion', label: 'En fabricación' },
    { k: 'listo', label: 'Listos' },
    { k: 'logistica', label: 'En logística' },
    { k: 'entregado', label: 'Entregadas' },
  ];

  const VentasPanel = {
    _mount: 'view', grupo: '', vendedor: '', texto: '', periodo: 'hoy',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      const [st, pend] = await Promise.all([global.DB.estadisticasVentas(), global.DB.misPendientes()]);
      const W = global.Widgets;

      v.innerHTML = `
        ${UI.head('Ventas', 'Panel', 'Todas las boletas de un vistazo. Filtrá por estado o vendedor y entrá al historial.',
          `<div class="wrap-row" style="justify-content:flex-end">
             <button class="btn primary" id="vp-venta">+ Nueva venta</button>
             <button class="btn" id="vp-cotiz">+ Nueva cotización</button>
           </div>`)}

        <div class="per" style="margin-bottom:12px" id="vp-per">
          ${['Hoy', 'Ayer', '7 días', '30 días', 'Personalizado'].map((p, i) =>
            `<button class="${i === 0 ? 'on' : ''}">${p}</button>`).join('')}
        </div>

        ${W.kpis([
          { lab: 'Ventas de hoy', em: '💵', tono: 'ok', val: UI.pesos(st.ventasHoy), foot: '<span class="up">▲ 14%</span> vs ayer' },
          { lab: 'Ventas del mes', em: '📈', tono: 'info', val: UI.pesos(st.ventasMes), foot: 'Objetivo ' + Math.round(st.ventasMes / st.objetivoMes * 100) + '%', obj: st.ventasMes / st.objetivoMes * 100 },
          { lab: 'Órdenes activas', em: '🧾', tono: 'soft', val: st.ordenesActivas, foot: st.aConfirmar + ' a confirmar' },
          { lab: 'Por cobrar', em: '💰', tono: 'warn', val: UI.pesos(st.porCobrar) },
          { lab: 'Cotizaciones abiertas', em: '📄', tono: 'soft', val: st.cotizacionesAbiertas },
          { lab: 'Ticket promedio', em: '🎟️', tono: 'info', val: UI.pesos(st.ticket), foot: st.operaciones + ' operaciones' },
        ])}

        <div class="vp-cols">
          <div class="pcard" style="margin-top:14px">
            <div class="row" style="margin-bottom:8px"><h3 style="margin:0;color:var(--navy);font-size:15px">Boletas</h3><div class="sp"></div>
              <select id="vp-vend" class="vp-vend"><option value="">Todos los vendedores</option>
                ${global.DB.vendedores().map(x => `<option ${this.vendedor === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
              <input id="vp-q" placeholder="Cliente o N°…" style="width:160px">
            </div>
            <div class="chips" id="vp-chips">${FILTROS.map(f =>
              `<button class="chip ${this.grupo === f.k ? 'on' : ''}" data-g="${f.k}">${f.label}</button>`).join('')}</div>
            <div id="vp-tabla" style="margin-top:10px">${UI.spinner()}</div>
          </div>

          <div class="pcard" style="margin-top:14px">
            <div class="row" style="margin-bottom:6px"><h3 style="margin:0;color:var(--navy);font-size:15px">Mis pendientes</h3>
              <span class="pill warn" style="margin-left:8px">${pend.length}</span></div>
            <div class="muted" style="font-size:12px;margin-bottom:8px">Consultas de cualquier módulo, en un solo lugar.</div>
            ${pend.map(p => `<div class="pend">
              <span class="pill ${p.tono}">${UI.esc(p.modulo)}</span>
              <div style="flex:1"><div style="font-size:13px">${UI.esc(p.texto)}</div>
                <div class="muted" style="font-size:11px">${UI.esc(p.desde)}</div></div></div>`).join('')}
            <span class="more" style="margin-top:8px;display:inline-block;color:var(--brand);font-size:13px;cursor:pointer">Ver todos →</span>
          </div>
        </div>

        <style>
          .per{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
          .per button{border:0;background:var(--panel);color:var(--muted);padding:7px 12px;font-size:13px;cursor:pointer}
          .per button+button{border-left:1px solid var(--line)}
          .per button.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
          .vp-cols{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
          @media(max-width:960px){.vp-cols{grid-template-columns:1fr}}
          .vp-vend{width:auto;font-size:13px;padding:7px 10px}
          .chips{display:flex;gap:6px;flex-wrap:wrap}
          .chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-soft);font-size:13px;font-weight:600;padding:6px 12px;border-radius:20px;cursor:pointer}
          .chip.on{background:var(--brand);border-color:var(--brand);color:#fff}
          .pend{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line-soft)}
          .pend:last-of-type{border-bottom:0}
        </style>`;

      document.getElementById('vp-venta').onclick = () => global.App.goSub('ventas', 'nueva');
      document.getElementById('vp-cotiz').onclick = () => global.App.goSub('ventas', 'nueva');
      document.getElementById('vp-vend').onchange = e => { this.vendedor = e.target.value; this.pintarTabla(); };
      const q = document.getElementById('vp-q'); let t;
      q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.texto = q.value.trim(); this.pintarTabla(); }, 200); };
      v.querySelectorAll('#vp-chips [data-g]').forEach(b => b.onclick = () => {
        this.grupo = b.dataset.g;
        v.querySelectorAll('#vp-chips .chip').forEach(x => x.classList.toggle('on', x.dataset.g === this.grupo));
        this.pintarTabla();
      });
      v.querySelectorAll('#vp-per button').forEach(b => b.onclick = () => {
        v.querySelectorAll('#vp-per button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      });
      this.pintarTabla();
    },

    async pintarTabla() {
      const cont = document.getElementById('vp-tabla'); if (!cont) return;
      const bs = await global.DB.boletas({ texto: this.texto, grupo: this.grupo, vendedor: this.vendedor });
      cont.innerHTML = bs.length ? `<div style="overflow-x:auto"><table>
        <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Pago</th>
          <th style="text-align:center">Muebles</th><th style="text-align:right">Total</th><th>Estado</th></tr></thead>
        <tbody>${bs.map(o => `<tr style="cursor:pointer" data-b="${o.id}">
          <td><b style="color:var(--brand)">${UI.esc(o.numero)}</b></td><td class="muted">${UI.esc(o.fecha)}</td>
          <td style="font-weight:600">${UI.esc(o.cliente)}</td><td><span class="pill soft">${UI.esc(o.vendedor)}</span></td>
          <td class="muted">${UI.esc(o.pago)}</td><td style="text-align:center" class="tnum">🪑 ${o.items}</td>
          <td style="text-align:right" class="tnum"><b style="color:var(--navy)">${UI.pesos(o.total)}</b></td>
          <td>${UI.estado(global.DB.ESTADO_ORDEN, o.estado)}</td></tr>`).join('')}</tbody></table></div>`
        : UI.vacio('No hay boletas para ese filtro.');
      cont.querySelectorAll('[data-b]').forEach(tr => tr.onclick = () =>
        global.OrdenDetalle.render(this._mount, null, () => this.render(this._mount)));
    },
  };

  global.VentasPanel = VentasPanel;
})(typeof window !== 'undefined' ? window : globalThis);
