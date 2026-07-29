// =====================================================================
//  Belgrano Soft · Detalle de Orden (centro de control)
//  Un solo lugar que responde: quién es el cliente, qué compró, qué falta,
//  quién tiene que hacer algo, qué pasó y qué puedo hacer. Corre sobre el
//  motor (comun/motor.js): las acciones disparan eventos y todo se reevalúa.
// =====================================================================
(function (global) {
  const M = () => global.Motor;
  const EST_COM = {
    borrador: ['Borrador', 'soft'], a_confirmar: ['A confirmar', 'warn'],
    confirmada: ['Confirmada', 'ok'], cerrada: ['Cerrada', 'soft'], cancelada: ['Cancelada', 'crit'],
  };
  const HAB = { pendiente: ['Pendiente', 'soft'], bloqueada: ['Bloqueada', 'crit'], liberada: ['Liberada', 'ok'] };

  const Detalle = {
    _mount: 'view', _o: null, _ctx: null, _volver: null,

    render(mount = 'view', data, volver) {
      this._mount = mount;
      if (volver) this._volver = volver;
      if (data) { this._o = data.o; this._ctx = data.ctx; }
      if (!this._o) { const d = M().ordenDemo(); this._o = d.o; this._ctx = d.ctx; }
      this.pintar();
    },

    pintar() {
      const o = this._o, ctx = this._ctx, m = M();
      const condO = m.evalChecks(m.COND_ORDEN, o, null, 'orden', 'ui', o);
      const [ecLabel, ecTone] = EST_COM[o.estadoComercial] || ['—', 'soft'];
      const libres = o.lineas.filter(l => l.habilitacion === 'liberada').length;
      const bloq = o.lineas.filter(l => l.habilitacion === 'bloqueada').length;
      const pagado = m.pagosValidados(o), saldo = m.saldo(o);
      const objs = o.lineas.flatMap(l => l.objetosOperativos.map(x => ({ ...x, linea: l.id })));

      document.getElementById(this._mount).innerHTML = `
        <button class="btn sm" id="od-volver" style="margin-bottom:14px">← Órdenes</button>
        <div class="od-head">
          <div>
            <div class="kick">Orden de venta</div>
            <h1 class="h-title">${o.id}</h1>
            <div class="od-cli">
              <b>${UI.esc(o.cliente.nombre || 'Cliente')}</b>
              <span class="muted">${[o.cliente.tel, o.cliente.ig, o.cliente.dir].filter(Boolean).map(UI.esc).join(' · ')}</span>
            </div>
          </div>
          <div class="od-estados">
            <div class="od-badge"><span class="lb">Comercial</span> <span class="pill ${ecTone}">${ecLabel}</span></div>
            <div class="od-badge"><span class="lb">Operativo</span> <span class="muted">${libres} liberada(s) · ${bloq} bloqueada(s)</span></div>
          </div>
        </div>

        <div class="od-cols">
          <div class="od-main">
            ${this.bloqueLineas(o)}
            ${this.bloqueObjetos(objs)}
            ${this.bloqueActividad(ctx)}
          </div>
          <div class="od-side">
            ${this.bloqueCondiciones('Condiciones de la orden', condO)}
            ${this.bloquePagos(o, pagado, saldo)}
            ${this.bloqueAcciones(o)}
          </div>
        </div>
        ${ESTILO}`;

      const V = this._volver;
      document.getElementById('od-volver').onclick = () => { if (V) V(); else global.App.goSub('ventas', 'ordenes'); };
      this.enganchar();
    },

    bloqueLineas(o) {
      const m = M();
      return card('Líneas del pedido', o.lineas.map(l => {
        const [hLabel, hTone] = HAB[l.habilitacion] || ['—', 'soft'];
        const condL = m.evalChecks(m.COND_LINEA, l, null, 'linea', 'ui', o);
        const faltan = condL.filter(c => !c.ok);
        return `<div class="lrow2">
          <div class="lr-top">
            <div><b>${UI.esc(l.producto)}</b> <span class="muted" style="font-size:12px">· ${UI.esc(l.tipo)}</span></div>
            <span class="pill ${hTone}">${hLabel}${l.cumplimiento && l.cumplimiento !== 'sin_iniciar' ? ' · ' + l.cumplimiento : ''}</span>
          </div>
          ${l.objetosOperativos.length ? `<div class="muted" style="font-size:12px">→ ${l.objetosOperativos.map(x => m.ETIQUETA_EFECTO[x.tipoObjeto] || x.tipoObjeto).join(' + ')}</div>` : ''}
          ${l.bloqueos.length ? `<div class="lr-bloq">⛔ ${l.bloqueos.map(b => bloqTexto(b)).join(' · ')}</div>` : ''}
          ${faltan.length && l.habilitacion !== 'liberada' ? `<div class="lr-acc">${accionesLinea(l, faltan)}</div>` : ''}
        </div>`;
      }).join(''));
    },

    bloqueCondiciones(titulo, checks) {
      return card(titulo, `<div class="chk">${checks.map(c =>
        `<div class="chk-row"><span class="chk-i ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✕'}</span>
          <span>${UI.esc(c.label)}</span><span class="muted" style="margin-left:auto;font-size:12px">${UI.esc(c.resp)}</span></div>`).join('')}</div>`);
    },

    bloquePagos(o, pagado, saldo) {
      return card('Pagos y saldo', `
        <div class="pg"><span>Total</span><b class="tnum">${UI.pesos(o.total)}</b></div>
        <div class="pg"><span>Pagado</span><b class="tnum" style="color:var(--ok)">${UI.pesos(pagado)}</b></div>
        <div class="pg"><span>Saldo</span><b class="tnum" style="color:var(--warn)">${UI.pesos(saldo)}</b></div>
        <div class="muted" style="font-size:12px;margin-top:8px">${o.cobros.filter(c => c.estado === 'validado').length} cobro(s) · término ${UI.esc(o.termino)}</div>
        <button class="btn sm" id="od-pago" style="margin-top:10px;width:100%">+ Registrar pago</button>`);
    },

    bloqueObjetos(objs) {
      if (!objs.length) return '';
      const m = M();
      return card('Objetos operativos generados', `<div class="obj">${objs.map(x =>
        `<div class="obj-row"><span class="pill info">${m.ETIQUETA_EFECTO[x.tipoObjeto] || x.tipoObjeto}</span>
          <span class="muted" style="font-size:12px">línea ${x.linea}</span></div>`).join('')}</div>`);
    },

    bloqueActividad(ctx) {
      const evs = ctx.eventos.slice().reverse().slice(0, 10);
      return card('Actividad', `<div class="tl">${evs.map(e =>
        `<div class="ev"><span class="d" style="background:var(--brand)"></span>
          <span><b>${UI.esc(e.evento)}</b> <span class="muted" style="font-size:12px">${UI.esc(JSON.stringify(e.payload))}</span></span></div>`).join('')}</div>`);
    },

    bloqueAcciones(o) {
      return card('Acciones', `<div class="wrap-row">
        <button class="btn sm" id="od-modif">Modificar orden</button>
        <button class="btn sm" id="od-prod">Ver producción</button>
        <button class="btn sm" id="od-logi">Ver logística</button>
      </div>`);
    },

    enganchar() {
      const o = this._o, ctx = this._ctx, m = M(), self = this;
      document.getElementById('od-pago').onclick = () => this.modalPago();
      ['od-modif', 'od-prod', 'od-logi'].forEach(id => { const b = document.getElementById(id); if (b) b.onclick = () => UI.aviso('Próximo paso', 'info'); });
      document.querySelectorAll('[data-accion]').forEach(b => b.onclick = () => {
        const l = o.lineas.find(x => x.id === b.dataset.linea);
        const a = b.dataset.accion;
        if (a === 'autorizar_precio') { l.precioAutorizado = true; ctx.emit('autorizacion.aprobada', { linea: l.id, resp: 'Administración' }); }
        else if (a === 'verificar_obs') { l.obsVerificada = true; ctx.emit('obs.verificada', { linea: l.id }); }
        else if (a === 'solicitar_autorizacion') { m.solicitarExcepcion(o, 'sena_fabricacion', { solicitadaPor: o.vendedor, motivo: 'autorizado desde detalle' }, ctx); }
        else if (a === 'autorizar_sena') { m.autorizarExcepcion(o, 'sena_fabricacion', { autorizadaPor: 'Dirección' }, ctx); }
        else if (a === 'registrar_pago') { return this.modalPago(); }
        m.evaluar(o, ctx, 'ui.accion');
        self.pintar();
      });
    },

    modalPago() {
      const o = this._o, ctx = this._ctx, m = M(), self = this;
      const saldo = m.saldo(o);
      const id = 'od-mp';
      document.body.insertAdjacentHTML('beforeend', `
        <div class="mdlbg" id="${id}" style="position:fixed;inset:0;background:rgba(20,26,38,.4);z-index:50;display:grid;place-items:center;padding:20px">
          <div class="card pad" style="max-width:380px;width:100%">
            <h3 style="color:var(--navy);margin:0 0 4px">Registrar pago</h3>
            <p class="muted" style="font-size:13px;margin:0 0 12px">Saldo: ${UI.pesos(saldo)}. El cobro es del cliente (Tesorería) e imputa a la orden.</p>
            <label class="fld"><span class="lbl">Monto</span><input id="mp-monto" type="number" value="${Math.max(0, saldo)}"></label>
            <label class="fld" style="margin-top:10px"><span class="lbl">Forma</span>
              <select id="mp-forma"><option>efectivo</option><option>transferencia</option><option>tarjeta</option></select></label>
            <div class="row" style="justify-content:flex-end;gap:10px;margin-top:16px">
              <button class="btn sm" id="mp-x">Cancelar</button>
              <button class="btn sm primary" id="mp-ok">Registrar</button></div>
          </div></div>`);
      const cerrar = () => { const e = document.getElementById(id); if (e) e.remove(); };
      document.getElementById('mp-x').onclick = cerrar;
      document.getElementById(id).onclick = e => { if (e.target.id === id) cerrar(); };
      document.getElementById('mp-ok').onclick = () => {
        const monto = Math.max(0, Number(document.getElementById('mp-monto').value) || 0);
        m.registrarCobro(o, { monto, estado: 'validado', forma: document.getElementById('mp-forma').value }, ctx);
        cerrar(); self.pintar(); UI.aviso('Pago registrado', 'ok');
      };
    },
  };

  function card(titulo, cuerpo) { return `<div class="pcard" style="margin-bottom:14px"><h3>${UI.esc(titulo)}</h3>${cuerpo}</div>`; }
  function bloqTexto(b) {
    if (b.motivo === 'reversion') return `reversión (${b.clave}) — ${b.accion || ''}`;
    return `${b.motivo || b.clave} <span class="muted">(${b.alcance})</span>`;
  }
  function accionesLinea(l, faltan) {
    const claves = faltan.map(c => c.clave);
    const btns = [];
    if (claves.includes('precio')) btns.push(btn('autorizar_precio', l.id, 'Autorizar precio', true));
    if (claves.includes('obs')) btns.push(btn('verificar_obs', l.id, 'Verificar observación'));
    if (claves.includes('sena_fabricacion')) {
      const pend = false;
      btns.push(btn('registrar_pago', l.id, 'Registrar pago'));
      btns.push(btn('solicitar_autorizacion', l.id, 'Solicitar autorización'));
      btns.push(btn('autorizar_sena', l.id, 'Autorizar (Dirección)', true));
    }
    return btns.join('');
  }
  function btn(accion, linea, txt, primary) {
    return `<button class="btn sm ${primary ? 'primary' : ''}" data-accion="${accion}" data-linea="${linea}">${txt}</button>`;
  }

  const ESTILO = `<style>
    .od-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}
    .od-cli{margin-top:6px;display:flex;flex-direction:column} .od-cli b{color:var(--navy)}
    .od-estados{display:flex;flex-direction:column;gap:8px;align-items:flex-end}
    .od-badge{display:flex;align-items:center;gap:8px} .od-badge .lb{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700}
    .od-cols{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start} @media(max-width:860px){.od-cols{grid-template-columns:1fr}}
    .lrow2{padding:12px 0;border-bottom:1px solid var(--line-soft)} .lrow2:last-child{border-bottom:0}
    .lr-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .lr-bloq{color:var(--crit);font-size:13px;margin-top:6px} .lr-acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .chk-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px}
    .chk-i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none}
    .chk-i.ok{background:var(--ok-bg);color:var(--ok)} .chk-i.no{background:var(--crit-bg);color:var(--crit)}
    .pg{display:flex;justify-content:space-between;padding:5px 0;font-size:14px} .pg span{color:var(--ink-soft)}
    .obj-row{display:flex;align-items:center;gap:10px;padding:5px 0}
  </style>`;

  global.OrdenDetalle = Detalle;
})(typeof window !== 'undefined' ? window : globalThis);
