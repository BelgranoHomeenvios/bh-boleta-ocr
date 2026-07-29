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
      this._bs = await global.DB.boletas({ texto: this.texto, grupo: this.grupo, vendedor: this.vendedor });
      const bs = this._bs;
      cont.innerHTML = bs.length ? `<div style="overflow-x:auto"><table class="vp-t">
        <thead><tr>
          <th>N°</th><th>Cliente</th><th>Vend.</th>
          <th style="text-align:right">Total</th><th style="text-align:right">Seña</th><th style="text-align:right">Saldo</th>
          <th>Entrega</th><th>Estado</th><th></th><th></th></tr></thead>
        <tbody>${bs.map(o => {
          const desglose = (o.cobros || []).length
            ? (o.cobros || []).map(c => `${c.f}  ${UI.pesos(c.m)}  (${c.via})`).join('\n')
            : 'Sin señas registradas';
          const nc = (o.comentarios || []).length;
          return `<tr data-b="${o.id}">
          <td data-open><b style="color:var(--brand)">${UI.esc(o.numero)}</b><div class="muted" style="font-size:11px">${UI.esc(o.fecha)}</div></td>
          <td data-open><div style="font-weight:600">${UI.esc(o.cliente)}</div><div class="muted" style="font-size:11px">🪑 ${o.items} · ${UI.esc(o.pago)}</div></td>
          <td data-open><span class="pill soft">${UI.esc(o.vendedor)}</span></td>
          <td class="tnum" style="text-align:right"><b style="color:var(--navy)">${UI.pesos(o.total)}</b></td>
          <td class="tnum" style="text-align:right" title="${UI.esc(desglose)}">${o.sena ? `<span style="color:var(--ok);font-weight:700">${UI.pesos(o.sena)}</span>` : '<span class="muted">—</span>'}</td>
          <td class="tnum" style="text-align:right">${o.saldo ? `<span style="color:var(--crit);font-weight:700">${UI.pesos(o.saldo)}</span>` : '<span class="pill ok" style="font-size:10px">saldado</span>'}</td>
          <td>${o.entrega ? `📅 ${UI.esc(o.entrega)}` : '<span class="muted">a definir</span>'}</td>
          <td data-open>${UI.estado(global.DB.ESTADO_ORDEN, o.estado)}</td>
          <td style="text-align:center"><button class="ib" data-nota title="Comentarios">💬${nc ? `<span class="cbadge">${nc}</span>` : ''}</button></td>
          <td style="text-align:center"><button class="ib" data-menu title="Acciones">⋮</button></td></tr>`;
        }).join('')}</tbody></table></div>
        <style>
          .vp-t td{vertical-align:middle}
          .vp-t .ib{position:relative;border:0;background:none;cursor:pointer;font-size:15px;padding:4px 6px;border-radius:7px;line-height:1;color:var(--ink-soft)}
          .vp-t .ib:hover{background:var(--line-soft)}
          .vp-t .cbadge{position:absolute;top:-2px;right:-2px;background:var(--brand);color:#fff;font-size:9px;font-weight:700;min-width:14px;height:14px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px}
          [data-open]{cursor:pointer}
        </style>`
        : UI.vacio('No hay boletas para ese filtro.');

      const abrir = o => global.OrdenDetalle.render(this._mount, null, () => this.render(this._mount));
      cont.querySelectorAll('tr[data-b]').forEach(tr => {
        const o = bs.find(x => String(x.id) === tr.dataset.b);
        tr.querySelectorAll('[data-open]').forEach(td => td.onclick = () => abrir(o));
        tr.querySelector('[data-nota]').onclick = e => { e.stopPropagation(); this.modalNota(o); };
        tr.querySelector('[data-menu]').onclick = e => { e.stopPropagation(); this.menuAcciones(o, e.currentTarget); };
      });
    },

    // Popover de acciones (⋮): abrir la orden, registrar cobro, agregar nota.
    menuAcciones(o, btn) {
      document.getElementById('_vpmenu')?.remove();
      const r = btn.getBoundingClientRect();
      const m = document.createElement('div');
      m.id = '_vpmenu';
      m.style.cssText = `position:fixed;top:${Math.round(r.bottom + 4)}px;left:${Math.round(r.right - 190)}px;z-index:80;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 26px rgba(15,26,42,.16);width:190px;padding:5px;font-size:13px`;
      const item = (emo, txt) => `<button class="mi" style="display:flex;gap:9px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:8px 9px;border-radius:7px;cursor:pointer;font:inherit;color:var(--ink)"><span>${emo}</span>${txt}</button>`;
      m.innerHTML = item('📂', 'Abrir orden') + item('💵', 'Registrar cobro') + item('💬', 'Agregar comentario');
      document.body.appendChild(m);
      m.querySelectorAll('.mi').forEach(b => b.onmouseenter = () => b.style.background = 'var(--line-soft)');
      m.querySelectorAll('.mi').forEach(b => b.onmouseleave = () => b.style.background = 'none');
      const [bAbrir, bCobro, bNota] = m.querySelectorAll('.mi');
      bAbrir.onclick = () => { m.remove(); global.OrdenDetalle.render(this._mount, null, () => this.render(this._mount)); };
      bCobro.onclick = () => { m.remove(); this.modalCobro(o); };
      bNota.onclick = () => { m.remove(); this.modalNota(o); };
      setTimeout(() => document.addEventListener('click', function h() { m.remove(); document.removeEventListener('click', h); }), 0);
    },

    // Diálogo para registrar una seña/cobro: se suma a la seña y baja el saldo.
    modalCobro(o) {
      document.getElementById('_vpmodal')?.remove();
      const ov = document.createElement('div');
      ov.id = '_vpmodal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(15,26,42,.42);display:flex;align-items:center;justify-content:center;padding:16px';
      const cobros = (o.cobros || []).length
        ? (o.cobros || []).map(c => `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;font-size:13px;margin-bottom:6px"><span class="muted">${UI.esc(c.f)} · ${UI.esc(c.via)}</span><b>${UI.pesos(c.m)}</b></div>`).join('')
        : `<div class="muted" style="font-size:13px;padding:6px 0">Sin señas registradas.</div>`;
      ov.innerHTML = `<div style="background:var(--panel);border-radius:14px;width:min(440px,100%);box-shadow:0 20px 60px rgba(15,26,42,.3);overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <b style="color:var(--brand)">${UI.esc(o.numero)}</b><span style="font-weight:600">${UI.esc(o.cliente)}</span>
          <span style="flex:1"></span><button id="vpm-x" style="border:0;background:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button></div>
        <div style="padding:14px 16px">
          <div class="wrap-row" style="gap:18px;margin-bottom:10px">
            <div><div class="kick">Total</div><b style="color:var(--navy);font-size:16px">${UI.pesos(o.total)}</b></div>
            <div><div class="kick">Seña acumulada</div><b id="vpm-sena" style="color:var(--ok);font-size:16px">${UI.pesos(o.sena || 0)}</b></div>
            <div><div class="kick">Saldo</div><b id="vpm-saldo" style="color:var(--crit);font-size:16px">${UI.pesos(o.saldo || 0)}</b></div>
          </div>
          <div class="kick" style="margin-bottom:6px">Historial de señas</div>${cobros}
          <div class="wrap-row" style="gap:8px;margin-top:10px">
            <input id="vpm-m" type="number" placeholder="Monto" style="flex:1" min="1">
            <select id="vpm-via" style="width:150px"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select>
          </div>
          <div class="wrap-row" style="justify-content:flex-end;margin-top:12px">
            <button class="btn" id="vpm-cancel">Cerrar</button>
            <button class="btn primary" id="vpm-save">Registrar seña</button>
          </div>
        </div></div>`;
      document.body.appendChild(ov);
      const cerrar = () => ov.remove();
      ov.onclick = e => { if (e.target === ov) cerrar(); };
      ov.querySelector('#vpm-x').onclick = cerrar;
      ov.querySelector('#vpm-cancel').onclick = cerrar;
      const mi = ov.querySelector('#vpm-m'); mi.focus();
      ov.querySelector('#vpm-save').onclick = () => {
        const m = Math.round(Number(mi.value) || 0);
        if (m <= 0) { mi.focus(); return; }
        if (m > (o.saldo || 0)) { UI.aviso('El monto supera el saldo pendiente', 'warn'); return; }
        (o.cobros = o.cobros || []).push({ f: '29/07', m, via: ov.querySelector('#vpm-via').value });
        o.sena = (o.sena || 0) + m;
        o.saldo = Math.max(0, (o.saldo || 0) - m);
        UI.aviso('Seña de ' + UI.pesos(m) + ' registrada en ' + o.numero, 'ok');
        cerrar();
        this.pintarTabla();
      };
    },

    // Diálogo de comentarios de la boleta (leer + agregar una nota).
    modalNota(o) {
      document.getElementById('_vpmodal')?.remove();
      const ov = document.createElement('div');
      ov.id = '_vpmodal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(15,26,42,.42);display:flex;align-items:center;justify-content:center;padding:16px';
      const lista = (o.comentarios || []).length
        ? (o.comentarios || []).map(c => `<div style="padding:8px 10px;background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;font-size:13px;margin-bottom:6px">💬 ${UI.esc(c)}</div>`).join('')
        : `<div class="muted" style="font-size:13px;padding:6px 0">Todavía no hay comentarios en esta boleta.</div>`;
      ov.innerHTML = `<div style="background:var(--panel);border-radius:14px;width:min(440px,100%);box-shadow:0 20px 60px rgba(15,26,42,.3);overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <b style="color:var(--brand)">${UI.esc(o.numero)}</b>
          <span style="font-weight:600">${UI.esc(o.cliente)}</span>
          <span class="sp" style="flex:1"></span>
          <button id="vpm-x" class="ib" style="border:0;background:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button></div>
        <div style="padding:14px 16px">
          <div class="kick" style="margin-bottom:8px">Comentarios</div>
          ${lista}
          <textarea id="vpm-tx" rows="2" placeholder="Escribí una nota para esta boleta…" style="width:100%;margin-top:8px;resize:vertical"></textarea>
          <div class="wrap-row" style="justify-content:flex-end;margin-top:10px">
            <button class="btn" id="vpm-cancel">Cerrar</button>
            <button class="btn primary" id="vpm-save">Guardar comentario</button>
          </div>
        </div></div>`;
      document.body.appendChild(ov);
      const cerrar = () => ov.remove();
      ov.onclick = e => { if (e.target === ov) cerrar(); };
      ov.querySelector('#vpm-x').onclick = cerrar;
      ov.querySelector('#vpm-cancel').onclick = cerrar;
      const tx = ov.querySelector('#vpm-tx'); tx.focus();
      ov.querySelector('#vpm-save').onclick = () => {
        const val = tx.value.trim();
        if (!val) { cerrar(); return; }
        (o.comentarios = o.comentarios || []).push(val);
        UI.aviso('Comentario agregado a ' + o.numero, 'ok');
        cerrar();
        this.pintarTabla();
      };
    },
  };

  global.VentasPanel = VentasPanel;
})(typeof window !== 'undefined' ? window : globalThis);
