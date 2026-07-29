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
      const st = await global.DB.estadisticasVentas();
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

        <style>
          .per{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
          .per button{border:0;background:var(--panel);color:var(--muted);padding:7px 12px;font-size:13px;cursor:pointer}
          .per button+button{border-left:1px solid var(--line)}
          .per button.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
          .vp-vend{width:auto;font-size:13px;padding:7px 10px}
          .chips{display:flex;gap:6px;flex-wrap:wrap}
          .chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-soft);font-size:13px;font-weight:600;padding:6px 12px;border-radius:20px;cursor:pointer}
          .chip.on{background:var(--brand);border-color:var(--brand);color:#fff}
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
          const cob = o.cobros || [];
          const pend = cob.filter(c => c.estado === 'pendiente_banco').reduce((a, c) => a + c.m, 0);
          const desglose = cob.length
            ? cob.map(c => `${c.f}  ${UI.pesos(c.metodo === 'transferencia' ? (c.montoConfirmado ?? c.m) : c.m)}  ${c.metodo === 'transferencia' ? 'transf.' : 'efvo.'} · ${(global.DB.ESTADO_COBRO[c.estado] || {}).label || c.estado}`).join('\n')
            : 'Sin señas registradas';
          // Tilde de seña: ✓ verde = cobrada/verificada · ⏳ ámbar = transferencia sin acreditar.
          const senaCell = o.sena
            ? `<span style="color:var(--ok);font-weight:700">${UI.pesos(o.sena)}</span> <span style="color:var(--ok)" title="Seña cobrada y verificada">✓</span>${pend ? `<div style="font-size:10.5px;color:var(--warn);white-space:nowrap">⏳ +${UI.pesos(pend)} sin acreditar</div>` : ''}`
            : (pend ? `<span style="color:var(--warn);font-weight:700">⏳ ${UI.pesos(pend)}</span><div style="font-size:10.5px;color:var(--warn);white-space:nowrap">transf. sin acreditar</div>` : '<span class="muted">—</span>');
          const nc = (o.comentarios || []).length;
          return `<tr data-b="${o.id}">
          <td data-open><b style="color:var(--brand)">${UI.esc(o.numero)}</b><div class="muted" style="font-size:11px">${UI.esc(o.fecha)}</div></td>
          <td data-open><div style="font-weight:600">${UI.esc(o.cliente)}</div><div class="muted" style="font-size:11px">🪑 ${o.items} · ${UI.esc(o.pago)}</div></td>
          <td data-open><span class="pill soft">${UI.esc(o.vendedor)}</span></td>
          <td class="tnum" style="text-align:right"><b style="color:var(--navy)">${UI.pesos(o.total)}</b></td>
          <td class="tnum" style="text-align:right;cursor:pointer" data-sena title="${UI.esc(desglose)}">${senaCell}</td>
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
        tr.querySelector('[data-sena]').onclick = e => { e.stopPropagation(); this.modalSenas(o); };
        tr.querySelector('[data-nota]').onclick = e => { e.stopPropagation(); this.modalNota(o); };
        tr.querySelector('[data-menu]').onclick = e => { e.stopPropagation(); this.menuAcciones(o, e.currentTarget); };
      });
    },

    // Popover de acciones (⋮): abrir la orden, señas, confirmar en banco, nota.
    menuAcciones(o, btn) {
      document.getElementById('_vpmenu')?.remove();
      const r = btn.getBoundingClientRect();
      const m = document.createElement('div');
      m.id = '_vpmenu';
      m.style.cssText = `position:fixed;top:${Math.round(r.bottom + 4)}px;left:${Math.round(r.right - 210)}px;z-index:80;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 26px rgba(15,26,42,.16);width:210px;padding:5px;font-size:13px`;
      const item = (emo, txt) => `<button class="mi" style="display:flex;gap:9px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:8px 9px;border-radius:7px;cursor:pointer;font:inherit;color:var(--ink)"><span>${emo}</span>${txt}</button>`;
      // Confirmar en banco: solo si hay una transferencia sin acreditar y el rol lo permite.
      const hayPend = (o.cobros || []).some(c => c.estado === 'pendiente_banco');
      const puedeConfirmar = ['direccion', 'administrativo'].includes(global.App.rol);
      m.innerHTML = item('📂', 'Abrir orden') + item('💵', 'Señas y cobros')
        + (hayPend && puedeConfirmar ? item('🏦', 'Confirmar seña en banco') : '')
        + item('💬', 'Agregar comentario');
      document.body.appendChild(m);
      m.querySelectorAll('.mi').forEach(b => { b.onmouseenter = () => b.style.background = 'var(--line-soft)'; b.onmouseleave = () => b.style.background = 'none'; });
      const items = m.querySelectorAll('.mi');
      items[0].onclick = () => { m.remove(); global.OrdenDetalle.render(this._mount, null, () => this.render(this._mount)); };
      items[1].onclick = () => { m.remove(); this.modalSenas(o); };
      if (hayPend && puedeConfirmar) {
        items[2].onclick = () => { m.remove(); this.modalSenas(o); };   // abre señas; ahí está el botón "Confirmar en banco"
        items[3].onclick = () => { m.remove(); this.modalNota(o); };
      } else {
        items[2].onclick = () => { m.remove(); this.modalNota(o); };
      }
      setTimeout(() => document.addEventListener('click', function h() { m.remove(); document.removeEventListener('click', h); }), 0);
    },

    _shell(inner, ancho = 480) {
      document.getElementById('_vpmodal')?.remove();
      const ov = document.createElement('div');
      ov.id = '_vpmodal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(15,26,42,.42);display:flex;align-items:center;justify-content:center;padding:16px';
      ov.innerHTML = `<div style="background:var(--panel);border-radius:14px;width:min(${ancho}px,100%);max-height:92vh;overflow:auto;box-shadow:0 20px 60px rgba(15,26,42,.3)">${inner}</div>`;
      document.body.appendChild(ov);
      ov.onclick = e => { if (e.target === ov) ov.remove(); };
      return ov;
    },

    // Diálogo de señas y cobros: lista cada cobro con su método y estado de
    // verificación, permite registrar una nueva seña (efvo/transf.) y —para
    // Dirección/Administración— confirmar una transferencia contra el banco.
    modalSenas(o) {
      const DB = global.DB;
      const puedeConfirmar = ['direccion', 'administrativo'].includes(global.App.rol);
      const fila = c => {
        const e = DB.ESTADO_COBRO[c.estado] || { label: c.estado, pill: 'soft', icon: '•' };
        const monto = c.metodo === 'transferencia' ? (c.montoConfirmado ?? c.m) : c.m;
        const sub = c.metodo === 'transferencia'
          ? `Transferencia · ${UI.esc(c.recibidoPor || '')}${c.depositante ? ' · depositó ' + UI.esc(c.depositante) : ''}${c.comprobante ? ' · comp. ' + UI.esc(c.comprobante) : ''}${c.cuit ? ' · CUIT ' + UI.esc(c.cuit) : ''}`
          : `Efectivo · rendido a ${UI.esc(c.recibidoPor || '')}`;
        const conf = (c.estado === 'pendiente_banco' && puedeConfirmar)
          ? `<button class="btn sm primary" data-conf="${c.id}" style="margin-top:6px">🏦 Confirmar en banco</button>` : '';
        return `<div style="padding:9px 11px;background:var(--panel-2);border:1px solid var(--line-soft);border-radius:10px;margin-bottom:7px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <b>${UI.pesos(monto)}</b>
            <span class="pill ${e.pill}" style="font-size:11px">${e.icon} ${UI.esc(e.label)}</span></div>
          <div class="muted" style="font-size:11.5px;margin-top:3px">${UI.esc(c.f)} · ${sub}</div>${conf}</div>`;
      };
      const cobros = (o.cobros || []).length
        ? (o.cobros || []).map(fila).join('')
        : `<div class="muted" style="font-size:13px;padding:6px 0">Sin señas registradas.</div>`;
      const pend = (o.cobros || []).filter(c => c.estado === 'pendiente_banco').reduce((a, c) => a + c.m, 0);
      const opciones = DB.autorizadosCobro().map(a => `<option>${UI.esc(a)}</option>`).join('');

      const ov = this._shell(`
        <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <b style="color:var(--brand)">${UI.esc(o.numero)}</b><span style="font-weight:600">${UI.esc(o.cliente)}</span>
          <span style="flex:1"></span><button id="vpm-x" style="border:0;background:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button></div>
        <div style="padding:14px 16px">
          <div class="wrap-row" style="gap:16px;margin-bottom:12px;flex-wrap:wrap">
            <div><div class="kick">Total</div><b style="color:var(--navy);font-size:16px">${UI.pesos(o.total)}</b></div>
            <div><div class="kick">Seña cobrada</div><b style="color:var(--ok);font-size:16px">${UI.pesos(o.sena || 0)}</b></div>
            ${pend ? `<div><div class="kick">Sin acreditar</div><b style="color:var(--warn);font-size:16px">${UI.pesos(pend)}</b></div>` : ''}
            <div><div class="kick">Saldo</div><b style="color:var(--crit);font-size:16px">${UI.pesos(o.saldo || 0)}</b></div>
          </div>
          <div class="kick" style="margin-bottom:6px">Señas y cobros</div>${cobros}

          <div style="border-top:1px solid var(--line);margin-top:12px;padding-top:12px">
            <div class="kick" style="margin-bottom:8px">Registrar una seña</div>
            <div class="seg" id="vpm-metodo">
              <button class="on" data-met="efectivo">💵 Efectivo</button>
              <button data-met="transferencia">🏦 Transferencia</button>
            </div>
            <div class="wrap-row" style="gap:8px;margin-top:10px">
              <input id="vpm-m" type="number" placeholder="Monto recibido" style="flex:1" min="1">
            </div>
            <label class="lbl">Recibido por / cuenta
              <select id="vpm-recibido">${opciones}</select></label>
            <div id="vpm-transf" style="display:none">
              <label class="lbl">Nombre de quien depositó (puede no ser el cliente)
                <input id="vpm-dep" placeholder="Ej. Juan Pérez"></label>
              <label class="lbl">Referencia / dónde ubicarla
                <input id="vpm-ref" placeholder="Ej. Mercado Pago, alias, banco…"></label>
              <div class="banner info" style="font-size:12px;margin-top:8px">Queda <b>sin acreditar</b> hasta que Administración/Dirección la confirme contra el banco (CUIT + N° de comprobante).</div>
            </div>
          </div>
          <div class="wrap-row" style="justify-content:flex-end;margin-top:14px">
            <button class="btn" id="vpm-cancel">Cerrar</button>
            <button class="btn primary" id="vpm-save">Registrar seña</button>
          </div>
        </div>
        <style>
          .seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
          .seg button{border:0;background:var(--panel);color:var(--ink-soft);padding:8px 14px;font:inherit;font-size:13px;cursor:pointer}
          .seg button+button{border-left:1px solid var(--line)}
          .seg button.on{background:var(--brand);color:#fff;font-weight:700}
          .lbl{display:block;font-size:12px;color:var(--ink-soft);margin-top:10px}
          .lbl input,.lbl select{width:100%;margin-top:4px}
        </style>`);

      const cerrar = () => ov.remove();
      ov.querySelector('#vpm-x').onclick = cerrar;
      ov.querySelector('#vpm-cancel').onclick = cerrar;
      let metodo = 'efectivo';
      const transfBox = ov.querySelector('#vpm-transf');
      ov.querySelectorAll('#vpm-metodo button').forEach(b => b.onclick = () => {
        ov.querySelectorAll('#vpm-metodo button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        metodo = b.dataset.met;
        transfBox.style.display = metodo === 'transferencia' ? 'block' : 'none';
      });
      ov.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => { cerrar(); this.modalConfirmarBanco(o, b.dataset.conf); });
      const mi = ov.querySelector('#vpm-m'); mi.focus();
      ov.querySelector('#vpm-save').onclick = () => {
        const m = Math.round(Number(mi.value) || 0);
        if (m <= 0) { mi.focus(); return; }
        if (metodo === 'transferencia' && !ov.querySelector('#vpm-dep').value.trim()) {
          UI.aviso('Poné el nombre de quien depositó', 'warn'); return;
        }
        DB.registrarSena(o.id, {
          metodo, monto: m,
          recibidoPor: ov.querySelector('#vpm-recibido').value,
          depositante: ov.querySelector('#vpm-dep')?.value.trim(),
          referencia: ov.querySelector('#vpm-ref')?.value.trim(),
        });
        UI.aviso(metodo === 'transferencia'
          ? 'Transferencia registrada — queda sin acreditar hasta confirmarla'
          : 'Seña en efectivo registrada', metodo === 'transferencia' ? 'warn' : 'ok');
        cerrar();
        this.pintarTabla();
        this.modalSenas(o);   // reabre con el nuevo cobro a la vista
      };
    },

    // Confirmación bancaria: Administración/Dirección acredita la transferencia,
    // carga CUIT + N° de comprobante + monto acreditado. No permite duplicar
    // un comprobante ya cargado (un cliente puede mandar 2 comprobantes).
    modalConfirmarBanco(o, cobroId, after) {
      const c = (o.cobros || []).find(x => x.id === cobroId); if (!c) return;
      after = after || (() => { this.pintarTabla(); this.modalSenas(o); });
      const ov = this._shell(`
        <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
          <span>🏦</span><b>Confirmar transferencia en banco</b>
          <span style="flex:1"></span><button id="cb-x" style="border:0;background:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button></div>
        <div style="padding:14px 16px">
          <div class="banner info" style="font-size:12.5px;margin-bottom:12px">
            ${UI.esc(o.numero)} · ${UI.esc(o.cliente)} — declaró <b>${UI.pesos(c.m)}</b> por transferencia a
            <b>${UI.esc(c.recibidoPor || '')}</b>${c.depositante ? `, depositó <b>${UI.esc(c.depositante)}</b>` : ''}.</div>
          <label class="lbl">CUIT / CUIL del titular de la cuenta
            <input id="cb-cuit" placeholder="20-30111222-3"></label>
          <label class="lbl">N° de comprobante bancario
            <input id="cb-comp" placeholder="Único — así no se duplica el pago"></label>
          <label class="lbl">Monto acreditado en el banco
            <input id="cb-monto" type="number" value="${c.m}" min="1"></label>
          <div class="wrap-row" style="justify-content:flex-end;margin-top:14px">
            <button class="btn" id="cb-cancel">Cancelar</button>
            <button class="btn primary" id="cb-ok">Acreditar y confirmar</button>
          </div>
        </div>
        <style>.lbl{display:block;font-size:12px;color:var(--ink-soft);margin-top:10px}.lbl input{width:100%;margin-top:4px}</style>`, 440);
      const cerrar = () => ov.remove();
      ov.querySelector('#cb-x').onclick = cerrar;
      ov.querySelector('#cb-cancel').onclick = () => { cerrar(); this.modalSenas(o); };
      ov.querySelector('#cb-cuit').focus();
      ov.querySelector('#cb-ok').onclick = () => {
        const cuit = ov.querySelector('#cb-cuit').value.trim();
        const comp = ov.querySelector('#cb-comp').value.trim();
        const monto = Math.round(Number(ov.querySelector('#cb-monto').value) || 0);
        if (!cuit || !comp || monto <= 0) { UI.aviso('Completá CUIT, comprobante y monto', 'warn'); return; }
        try {
          global.DB.confirmarSenaBanco(o.id, cobroId, {
            cuit, comprobante: comp, montoConfirmado: monto,
            confirmadoPor: global.App.rol === 'direccion' ? 'Dirección' : 'Administración',
          });
        } catch (e) { UI.aviso(e.message || String(e), 'crit'); return; }
        UI.aviso('Transferencia acreditada en ' + o.numero, 'ok');
        cerrar();
        after();
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
