// =====================================================================
//  Belgrano Soft · Logística · Entregas
//  La entrega no se carga: nace de la boleta que quedó lista, con el
//  cliente, el domicilio, los muebles y el saldo de AHORA. Acá se
//  coordina, sale, se entrega y se rinde. El freno manda: un mueble no
//  sale sin que la plata esté confirmada por alguien nuestro.
// =====================================================================
(function (global) {
  const Ent = {
    _mount: 'view',
    abierta: null,     // numero con el panel abierto
    accion: '',        // 'coordinar' | 'rendir'
    hecho: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    esDireccion() { return global.App.rol === 'direccion'; },

    html() {
      const DB = global.DB;
      const es = DB.entregas();
      const alertas = DB.alertasLogistica();
      const orden = { por_completar: 1, coordinada: 2, en_viaje: 3, entregada: 4, cerrada: 5 };
      es.sort((a, b) => (orden[a.log.estado] || 9) - (orden[b.log.estado] || 9));

      return `
        ${UI.head('Logística', 'Entregas',
          'Nacen solas de la boleta lista, con el saldo de ahora. Nadie transcribe nada')}
        ${this.hecho ? `<div class="lg-hecho ${this.hecho.mal ? 'mal' : ''}">${
          UI.esc(this.hecho.texto)}</div>` : ''}

        ${alertas.length ? `<div class="cx-b"><div class="cx-b-h">Plata parada y frenos</div>
          ${alertas.map(a => `<div class="lg-alerta ${a.tipo === 'freno' ? 'freno' : ''}">
            ${a.tipo === 'rendir' ? '💰' : a.tipo === 'freno' ? '⛔' : '⏰'} ${UI.esc(a.texto)}
          </div>`).join('')}</div>` : ''}

        <div class="card cx-tabla"><table>
          <thead><tr><th>Boleta</th><th>Cliente</th><th>Dónde</th><th>Muebles</th>
            <th class="num">Cobrar en la puerta</th><th>Estado</th><th>Cuándo</th><th></th></tr></thead>
          <tbody>${es.map(e => this.fila(e)).join('')
            || '<tr><td colspan="8" class="muted">No hay boletas listas para entregar.</td></tr>'}
          </tbody></table></div>

        <div class="hint">El saldo que se ve es el de <b>ahora</b>: si el cliente reforzó ayer y
          alguien lo confirmó, el chofer sale con el número corregido. Arriba de
          ${UI.pesos(global.DB.TOPE_SALIDA)} de saldo, la salida la autoriza Brian o Jony.</div>`;
    },

    fila(e) {
      const DB = global.DB;
      const est = DB.estadoEntrega(e.log.estado);
      const dom = e.o.domicilio;
      return `<tr class="${e.freno.trabada ? 'mal' : ''}">
          <td class="nom">${UI.esc(e.o.numero)}</td>
          <td class="nom">${UI.esc(e.o.cliente)}${dom && dom.telefono
            ? `<br><span class="muted" style="font-weight:400">${UI.esc(dom.telefono)}</span>` : ''}</td>
          <td class="muted">${e.retira ? '<b>Retira por el local</b>'
            : `${UI.esc(dom.dir)}<br>${UI.esc(dom.localidad)}${dom.escalera ? ' · escalera' : ''}`}</td>
          <td class="muted">${UI.esc((e.o.lineas || []).map(l =>
            `${l.cantidad || 1}× ${l.producto}`).join(' · '))}</td>
          <td class="num"><b>${UI.pesos(e.puerta.total)}</b>${e.puerta.flete || e.puerta.instalacion
            ? `<br><span class="muted" style="font-size:11px">saldo ${UI.pesos(e.puerta.saldo)}
              ${e.puerta.flete ? `+ flete ${UI.pesos(e.puerta.flete)}` : ''}
              ${e.puerta.instalacion ? `+ inst. ${UI.pesos(e.puerta.instalacion)}` : ''}</span>` : ''}</td>
          <td><span class="pill ${est.pill}">${UI.esc(est.label)}</span>
            ${e.freno.trabada ? `<br><span class="lg-freno">⛔ ${UI.esc(e.freno.motivo)}</span>` : ''}
            ${e.log.destrabo ? `<br><span class="lg-destrabo">destrabada por ${
              UI.esc(e.log.destrabo.quien)}: ${UI.esc(e.log.destrabo.motivo)}</span>` : ''}</td>
          <td class="muted">${e.log.fecha ? `${UI.esc(e.log.fecha)} ${
            e.log.franja === 'tarde' ? 'tarde' : 'mañana'}${e.log.choferId
              ? `<br>${UI.esc((DB.chofer(e.log.choferId) || {}).nombre || '')}` : ''}` : '—'}</td>
          <td class="td-acc">${this.acciones(e)}</td>
        </tr>
        ${this.abierta === e.o.numero ? `<tr class="tc-panel-fila"><td colspan="8">${
          this.panel(e)}</td></tr>` : ''}`;
    },

    acciones(e) {
      const k = e.log.estado, n = UI.esc(e.o.numero);
      if (k === 'por_completar') {
        if (e.freno.trabada) {
          return this.esDireccion()
            ? `<button class="b-x" data-destrabar="${n}">Destrabar</button>`
            : '<span class="muted" style="font-size:11px">trabada</span>';
        }
        return `<button class="b-x hacer" data-coordinar="${n}">Coordinar</button>`;
      }
      if (k === 'coordinada') {
        const p = global.DB.aCobrarEnPuerta(e.o);
        const pideAut = p.saldo > global.DB.TOPE_SALIDA && !e.log.autorizo;
        return (pideAut && this.esDireccion()
          ? `<button class="b-x" data-autorizar="${n}">Autorizar salida</button>` : '')
          + `<button class="b-x hacer" data-salir="${n}">Salió</button>
             <button class="b-x" data-coordinar="${n}">Reprogramar</button>`;
      }
      if (k === 'en_viaje') return `<button class="b-x hacer" data-entregada="${n}">Se entregó</button>`;
      if (k === 'entregada') return `<button class="b-x hacer" data-rendir="${n}">Rendir</button>`;
      return '';
    },

    // Coordinar pide lo que el sistema no sabe: día, franja, chofer.
    panel(e) {
      const DB = global.DB;
      if (this.accion === 'rendir') {
        const p = DB.aCobrarEnPuerta(e.o);
        const esperado = e.log.esperado != null ? e.log.esperado : p.total;
        return `<div class="tc-panel">
          <b>Rendir ${UI.esc(e.o.numero)} — tenía que traer ${UI.pesos(esperado)}</b>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <label>Trajo <input id="lg-cobrado" type="number" value="${esperado}"
              style="width:120px"></label>
            <label>Cómo <select id="lg-forma">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option></select></label>
            <label>Se le pagó al flete <input id="lg-flete" type="number" value="0"
              style="width:100px"></label>
          </div>
          <label>Si falta o sobra, por qué
            <input id="lg-motivo" placeholder="El cliente descontó la escalera · pagó de menos"></label>
          <div class="row" style="gap:7px">
            <button class="btn" id="lg-ok-rendir">Rendir y cerrar</button>
            <button class="b-x" id="lg-cancel">Cancelar</button>
          </div>
          <span class="hint" style="margin:0">Lo que trajo entra como cobro de la boleta —el
            efectivo lo confirma el que lo cuenta, la transferencia espera a Iara— y lo del
            flete va a Gastos.</span>
        </div>`;
      }
      return `<div class="tc-panel">
        <b>Coordinar ${UI.esc(e.o.numero)}${e.retira ? ' — retira por el local' : ''}</b>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <label>Día <input id="lg-fecha" placeholder="dd/mm" value="${
            UI.esc(e.log.fecha || e.o.entrega || '')}" style="width:90px"></label>
          <label>Franja <select id="lg-franja">
            <option value="manana" ${e.log.franja !== 'tarde' ? 'selected' : ''}>Mañana</option>
            <option value="tarde" ${e.log.franja === 'tarde' ? 'selected' : ''}>Tarde</option>
          </select></label>
          ${e.retira ? '' : `<label>Chofer <select id="lg-chofer">
            ${DB.choferes().map(ch => {
              const carga = DB.cargaChofer(ch.id, e.log.fecha || e.o.entrega || '');
              return `<option value="${ch.id}" ${e.log.choferId === ch.id ? 'selected' : ''}>
                ${UI.esc(ch.nombre)} (${carga.muebles}/${ch.cupoDia})</option>`;
            }).join('')}</select></label>`}
        </div>
        <div class="row" style="gap:7px">
          <button class="btn" id="lg-ok-coord">Coordinar</button>
          <button class="b-x" id="lg-cancel">Cancelar</button>
        </div>
      </div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const abrir = (numero, accion) => { this.abierta = this.abierta === numero
        && this.accion === accion ? null : numero; this.accion = accion;
        this.hecho = null; this.render(this._mount); };

      document.querySelectorAll('[data-coordinar]').forEach(b =>
        b.onclick = () => abrir(b.dataset.coordinar, 'coordinar'));
      document.querySelectorAll('[data-rendir]').forEach(b =>
        b.onclick = () => abrir(b.dataset.rendir, 'rendir'));

      document.querySelectorAll('[data-destrabar]').forEach(b => b.onclick = () => {
        const motivo = prompt('El destrabe queda registrado. ¿Por qué sale igual?');
        if (!motivo) return;
        const r = global.DB.destrabarEntrega(b.dataset.destrabar,
          { quien: 'Brian', motivo });
        this.hecho = r.error ? { mal: true, texto: r.error }
          : { texto: `${b.dataset.destrabar} destrabada. Queda registrado.` };
        this.render(this._mount);
      });
      document.querySelectorAll('[data-autorizar]').forEach(b => b.onclick = () => {
        global.DB.autorizarSalida(b.dataset.autorizar, { quien: 'Brian' });
        this.hecho = { texto: `Salida de ${b.dataset.autorizar} autorizada.` };
        this.render(this._mount);
      });
      document.querySelectorAll('[data-salir]').forEach(b => b.onclick = () => {
        const r = global.DB.salidaEntrega(b.dataset.salir, { quien: this.quien() });
        this.hecho = r.error ? { mal: true, texto: r.error }
          : { texto: `${b.dataset.salir} salió a la calle.` };
        this.render(this._mount);
      });
      document.querySelectorAll('[data-entregada]').forEach(b => b.onclick = () => {
        const quienR = prompt('¿Quién recibió?') || '';
        const r = global.DB.entregadaEntrega(b.dataset.entregada,
          { quienRecibio: quienR, quien: this.quien() });
        this.hecho = r.error ? { mal: true, texto: r.error }
          : { texto: `${b.dataset.entregada} entregada. Falta rendir la plata.` };
        this.render(this._mount);
      });

      const cancel = q('lg-cancel');
      if (cancel) cancel.onclick = () => { this.abierta = null; this.render(this._mount); };
      const okC = q('lg-ok-coord');
      if (okC) okC.onclick = () => {
        const r = global.DB.coordinarEntrega(this.abierta, {
          fecha: (q('lg-fecha') || {}).value || '',
          franja: (q('lg-franja') || {}).value || 'manana',
          choferId: (q('lg-chofer') || {}).value || null,
          quien: this.quien() });
        if (r.error) return UI.aviso(r.error, 'warn');
        this.hecho = { texto: `${this.abierta} coordinada para el ${r.log.fecha}.` };
        this.abierta = null; this.render(this._mount);
      };
      const okR = q('lg-ok-rendir');
      if (okR) okR.onclick = () => {
        const r = global.DB.rendirEntrega(this.abierta, {
          cobrado: Number((q('lg-cobrado') || {}).value) || 0,
          forma: (q('lg-forma') || {}).value || 'efectivo',
          fletePagado: Number((q('lg-flete') || {}).value) || 0,
          motivoDif: (q('lg-motivo') || {}).value || '',
          quien: this.quien() });
        if (r.error) return UI.aviso(r.error, 'warn');
        const rd = r.log.rendicion;
        this.hecho = { texto: `${this.abierta} rendida y cerrada.${rd.dif
          ? ` Diferencia de ${global.DB.plata(rd.dif)}: ${rd.motivo}.` : ''}${rd.fletePagado
          ? ` El flete (${global.DB.plata(rd.fletePagado)}) fue a Gastos.` : ''}` };
        this.abierta = null; this.render(this._mount);
      };
    },

    quien() { return global.App.rol === 'direccion' ? 'Brian' : 'Logística'; },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .lg-alerta{border:1px solid var(--warn);background:var(--warn-bg);border-radius:9px;
          padding:7px 10px;font-size:12.5px;margin-bottom:6px;color:var(--navy)}
        .lg-alerta.freno{border-color:var(--crit);background:var(--crit-bg)}
        .lg-freno{font-size:11px;color:var(--crit);font-weight:700}
        .lg-destrabo{font-size:10.5px;color:var(--warn)}
        .lg-hecho{border:1px solid var(--ok);background:var(--ok-bg);color:var(--ok);
          border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:600;margin-bottom:12px}
        .lg-hecho.mal{border-color:var(--crit);background:var(--crit-bg);color:var(--crit)}
        .tc-panel-fila td{background:var(--panel-2);white-space:normal}
        .tc-panel{display:flex;flex-direction:column;gap:8px;padding:4px 0;max-width:560px}
        .tc-panel label{display:flex;flex-direction:column;gap:3px;font-size:11px;
          color:var(--muted);font-weight:700}
        .tc-panel input,.tc-panel select{border:1px solid var(--line);border-radius:8px;
          padding:6px 8px;font:inherit;font-weight:400;color:var(--navy);background:var(--panel)}
      </style>`;
    },
  };
  global.LogEntregas = Ent;
})(typeof window !== 'undefined' ? window : globalThis);
