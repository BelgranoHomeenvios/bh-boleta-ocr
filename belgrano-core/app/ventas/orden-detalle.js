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
  // Forma de pago editable: cambiarla recalcula el total con su recargo (demo).
  // Base = precios de lista de las líneas; efectivo sin recargo, tarjeta/transf. con recargo.
  const FORMAS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Mixto'];
  const RECARGO = { Efectivo: 0, Transferencia: 0.05, Tarjeta: 0.10, Mixto: 0 };
  const inic = s => String(s || '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

  const Detalle = {
    _mount: 'view', _o: null, _ctx: null, _volver: null,

    render(mount = 'view', data, volver) {
      this._mount = mount;
      if (volver) this._volver = volver;
      // Detalle de una BOLETA comercial (lo que abre la tabla de ventas).
      if (data && data.boleta) { this._boleta = data.boleta; return this.renderBoleta(); }
      // Detalle sobre el MOTOR (cola "A confirmar").
      if (data && data.o) { this._o = data.o; this._ctx = data.ctx; this._boleta = null; }
      if (this._boleta) return this.renderBoleta();
      if (!this._o) { const d = M().ordenDemo(); this._o = d.o; this._ctx = d.ctx; }
      this.pintar();
    },

    // ---- Detalle de una boleta (Ver una venta) — todo en una pantalla --------
    renderBoleta() {
      const o = this._boleta, DB = global.DB;
      const V = this._volver;
      const cob = o.cobros || [];
      const pend = cob.filter(c => c.estado === 'pendiente_banco').reduce((a, c) => a + c.m, 0);
      const rendida = o.sena > 0 && !pend;
      // Recalcular total según forma de pago + adicionales (flete / instalación).
      const base = (o.lineas || []).reduce((a, l) => a + l.precio * l.cantidad, 0);
      const recargoPct = RECARGO[o.pago] ?? 0;
      const recargo = Math.round(base * recargoPct);
      const flete = o.flete?.monto || 0, inst = o.instalacion?.monto || 0;
      o.total = base + recargo + flete + inst;
      o.saldo = Math.max(0, o.total - (o.sena || 0));
      const facTxt = { no: 'Sin factura', solicitada: 'Factura solicitada', hecha: 'Factura hecha' }[o.factura] || '—';
      // Bloqueos (en rojo): a medida sin autorizar, transf. sin acreditar, saldo.
      const bloqueos = [];
      (o.lineas || []).forEach(l => { if (l.bloqueo) bloqueos.push(`${l.producto}: falta ${l.bloqueo === 'precio' ? 'autorizar precio' : 'verificar observación'}`); });
      if (pend) bloqueos.push(`Transferencia sin acreditar: ${UI.pesos(pend)}`);
      if (o.saldo > 0) bloqueos.push(`Saldo pendiente: ${UI.pesos(o.saldo)}`);

      document.getElementById(this._mount).innerHTML = `
        <button class="btn sm" id="ob-volver" style="margin-bottom:12px">← Volver</button>
        <div class="ob-head">
          <div class="ob-h-l">
            <span class="ob-num">${UI.esc(o.numero)}</span>
            <div>
              <div class="ob-cli">${UI.esc(o.cliente)}</div>
              <div class="muted" style="font-size:12.5px">Vendedor ${UI.esc(o.vendedor)} · Entrega ${o.entrega ? UI.esc(o.entrega) : 'a definir'}</div>
            </div>
          </div>
          <div class="ob-h-r">
            ${UI.estado(DB.ESTADO_ORDEN, o.estado)}
            ${o.reclamo ? '<span class="pill crit">Reclamo</span>' : ''}
            ${o.factura !== 'no' ? `<span class="pill ${o.factura === 'hecha' ? 'ok' : 'warn'}">${facTxt}</span>` : ''}
          </div>
        </div>

        <div class="ob-pay">
          <div class="ob-pay-f">
            <label>Forma de pago</label>
            <select id="ob-forma">${FORMAS.map(f => `<option ${f === o.pago ? 'selected' : ''}>${f}</option>`).join('')}</select>
            ${recargo ? `<span class="ob-rec">+${Math.round(recargoPct * 100)}% recargo</span>` : '<span class="muted" style="font-size:12px">sin recargo</span>'}
          </div>
          <div class="ob-acc">
            <button class="btn sm" id="ob-modif">Modificar orden</button>
            <button class="btn sm" id="ob-prod">Ver producción</button>
            <button class="btn sm" id="ob-logi">Ver logística</button>
          </div>
        </div>

        <div class="ob-cols">
          <div>
            ${card('Muebles', `<table class="ob-mueb">
              <thead><tr><th></th><th>Producto</th><th>Tipo</th><th style="text-align:center">Cant.</th><th style="text-align:right">Monto</th></tr></thead>
              <tbody>${(o.lineas || []).map(l => `<tr>
              <td class="mimg"><div class="mono">${inic(l.producto)}</div></td>
              <td><b>${UI.esc(l.producto)}</b>${l.variante ? `<div class="muted" style="font-size:12px">${UI.esc(l.variante)}</div>` : ''}
                ${l.bloqueo ? `<div class="ob-blq-tag">Falta ${l.bloqueo === 'precio' ? 'autorizar precio' : 'verificar obs.'}</div>` : ''}</td>
              <td><span class="tipo ${l.tipo}">${l.tipo === 'medida' ? 'A medida' : 'Estándar'}</span></td>
              <td class="muted" style="text-align:center">${l.cantidad}</td>
              <td class="tnum" style="text-align:right"><b>${UI.pesos(l.precio * l.cantidad)}</b></td></tr>`).join('')}</tbody></table>`)}

            ${card('Historial de comentarios', `
              <div id="ob-coms">${this.comentariosHTML(o)}</div>
              <div class="wrap-row" style="gap:8px;margin-top:8px">
                <input id="ob-com" placeholder="Sumá una nota (queda con tu área)…" style="flex:1">
                <button class="btn sm primary" id="ob-com-add">Agregar</button></div>`)}
          </div>

          <div>
            ${card('Totales y pago', `
              <div class="pg"><span>Subtotal muebles</span><b class="tnum">${UI.pesos(base)}</b></div>
              ${recargo ? `<div class="pg"><span>Recargo (${o.pago})</span><b class="tnum" style="color:var(--warn)">+${UI.pesos(recargo)}</b></div>` : ''}
              ${flete ? `<div class="pg"><span>Flete${o.flete?.detalle ? ' · ' + UI.esc(o.flete.detalle) : ''}</span><b class="tnum">${UI.pesos(flete)}</b></div>` : ''}
              ${inst ? `<div class="pg"><span>Instalación${o.instalacion?.detalle ? ' · ' + UI.esc(o.instalacion.detalle) : ''}</span><b class="tnum">${UI.pesos(inst)}</b></div>` : ''}
              <div class="pg pg-tot"><span>Total</span><b class="tnum" style="color:var(--navy)">${UI.pesos(o.total)}</b></div>
              <div class="pg"><span>Pagado (seña)</span><b class="tnum" style="color:var(--ok)">${UI.pesos(o.sena || 0)}${rendida ? ' ✓' : (pend ? ' ⏳' : '')}</b></div>
              <div class="pg"><span>Saldo</span><b class="tnum" style="color:${o.saldo ? 'var(--crit)' : 'var(--ok)'}">${UI.pesos(o.saldo || 0)}</b></div>
              <div class="muted" style="font-size:12px;margin-top:4px">${rendida ? 'Rendición confirmada por el vendedor ✓' : (pend ? 'Falta acreditar en banco' : 'Sin cobros')}</div>
              <button class="btn sm" id="ob-sena" style="margin-top:10px;width:100%">Señas y cobros</button>`)}

            ${card('Flete e instalación', `
              <div class="ob-file"><span style="flex:1">Flete</span><b class="tnum">${flete ? UI.pesos(flete) : '—'}</b></div>
              ${o.flete?.detalle ? `<div class="muted" style="font-size:11.5px;margin:-2px 0 6px">${UI.esc(o.flete.detalle)}${o.flete?.escalera ? ' · subida por escalera' : ''}</div>` : ''}
              <div class="ob-file"><span style="flex:1">Instalación</span><b class="tnum">${inst ? UI.pesos(inst) : '—'}</b></div>
              ${o.instalacion?.detalle ? `<div class="muted" style="font-size:11.5px;margin:-2px 0 6px">${UI.esc(o.instalacion.detalle)}</div>` : ''}
              <button class="btn sm" id="ob-flete" style="margin-top:6px;width:100%">Editar flete / instalación</button>`)}

            ${bloqueos.length ? `<div class="pcard ob-blq" style="margin-bottom:14px"><h3 style="color:var(--crit)">Bloqueos</h3>
              ${bloqueos.map(b => `<div class="ob-blq-row">${UI.esc(b)}</div>`).join('')}</div>` : ''}

            ${card('Archivos', `${(o.archivos || []).length
              ? (o.archivos || []).map(a => `<div class="ob-file"><span style="flex:1">${UI.esc(a.nombre)}</span><span class="pill soft" style="font-size:10px">${UI.esc(a.area)}</span></div>`).join('')
              : '<div class="muted" style="font-size:13px">Sin archivos cargados.</div>'}
              <button class="btn sm" id="ob-file-add" style="margin-top:8px;width:100%">+ Subir archivo</button>
              <div class="muted" style="font-size:11px;margin-top:6px">Se guardan en el cajón exclusivo de Contabilidad.</div>`)}
          </div>
        </div>
        ${ESTILO}`;

      document.getElementById('ob-volver').onclick = () => { if (V) V(); else global.App.goSub('ventas', 'resumen'); };
      document.getElementById('ob-forma').onchange = e => { o.pago = e.target.value; this.renderBoleta(); UI.aviso('Total recalculado por forma de pago', 'info'); };
      document.getElementById('ob-modif').onclick = () => UI.aviso('Modificar orden — próximo paso', 'info');
      document.getElementById('ob-prod').onclick = () => global.App.goSub('produccion', 'resumen');
      document.getElementById('ob-logi').onclick = () => global.App.goSub('logistica', 'resumen');
      document.getElementById('ob-sena').onclick = () => global.VentasPanel.modalSenas(o);
      document.getElementById('ob-flete').onclick = () => UI.aviso('Editar flete / instalación — próximo paso', 'info');
      document.getElementById('ob-file-add').onclick = () => UI.aviso('Subir archivo — se guarda en Contabilidad (próximo paso)', 'info');
      const add = () => {
        const el = document.getElementById('ob-com'); const t = el.value.trim(); if (!t) return;
        const area = { direccion: 'Dirección', vendedor: 'Ventas', administrativo: 'Administración', prod: 'Producción', logi: 'Logística', gestion: 'CRM' }[global.App.rol] || 'Ventas';
        (o.comentarios = o.comentarios || []).push({ area, texto: t, f: 'hoy' });
        el.value = ''; document.getElementById('ob-coms').innerHTML = this.comentariosHTML(o);
      };
      document.getElementById('ob-com-add').onclick = add;
      document.getElementById('ob-com').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    },

    comentariosHTML(o) {
      return (o.comentarios || []).length
        ? (o.comentarios || []).map(c => `<div class="ob-com-row">
            <span class="pill soft" style="font-size:10px">${UI.esc(c.area || '—')}</span>
            <span style="flex:1">${UI.esc(c.texto)}</span>
            <span class="muted" style="font-size:11px">${UI.esc(c.f || '')}</span></div>`).join('')
        : '<div class="muted" style="font-size:13px">Todavía no hay comentarios.</div>';
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
    /* Detalle de boleta */
    .ob-head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px}
    .ob-h-l{display:flex;align-items:center;gap:12px}
    .ob-num{font-size:22px;font-weight:800;color:var(--brand)}
    .ob-cli{font-size:17px;font-weight:800;color:var(--navy)}
    .ob-h-r{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .ob-acc{display:flex;gap:8px;flex-wrap:wrap}
    .ob-pay{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:14px}
    .ob-pay-f{display:flex;align-items:center;gap:10px}
    .ob-pay-f label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700}
    .ob-pay-f select{font-size:16px;font-weight:700;color:var(--navy);padding:7px 10px;border-radius:9px;border:1px solid var(--line)}
    .ob-rec{background:var(--warn-bg);color:var(--warn);font-size:12px;font-weight:700;padding:3px 9px;border-radius:20px}
    .ob-cols{display:grid;grid-template-columns:1fr 350px;gap:16px;align-items:start}
    @media(max-width:900px){.ob-cols{grid-template-columns:1fr}}
    .ob-mueb{width:100%;border-collapse:collapse}
    .ob-mueb thead th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);font-weight:700;padding:0 6px 8px}
    .ob-mueb td{padding:9px 6px;border-top:1px solid var(--line-soft);vertical-align:middle}
    .ob-mueb .mimg{width:44px} .ob-mueb .mono{width:38px;height:38px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--ink-soft)}
    .ob-mueb .tipo{font-size:12px;font-weight:600;padding:2px 9px;border-radius:20px;border:1px solid var(--line);color:var(--ink-soft)}
    .ob-mueb .tipo.medida{border-color:var(--brand);color:var(--brand-ink);background:var(--brand-soft)}
    .ob-blq-tag{color:var(--crit);font-size:12px;font-weight:600;margin-top:2px}
    .pg-tot{border-top:1px solid var(--line);margin-top:4px;padding-top:8px;font-size:15px}
    .ob-blq{border:1px solid var(--crit)} .ob-blq-row{color:var(--crit);font-size:13px;padding:5px 0;border-bottom:1px solid var(--crit-bg)}
    .ob-blq-row:last-child{border-bottom:0}
    .ob-file{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px}
    .ob-com-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line-soft);font-size:13px}
    .ob-com-row:last-child{border-bottom:0}
  </style>`;

  global.OrdenDetalle = Detalle;
})(typeof window !== 'undefined' ? window : globalThis);
