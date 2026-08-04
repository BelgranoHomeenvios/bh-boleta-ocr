// =====================================================================
//  Belgrano Soft · Tesorería · Cobros a confirmar
//
//  El freno más importante del sistema. El vendedor anota que el cliente
//  transfirió; hasta que alguien no lo ve en el banco esa plata no existe:
//  no baja el saldo, no paga comisión y el mueble no baja a fábrica.
//
//  Al revés también: confirmar acá es lo que manda la boleta a fabricar.
//  Nadie tiene que acordarse de nada, y por eso la pantalla avisa cuándo
//  bajó y con cuántos muebles.
// =====================================================================
(function (global) {
  const Cobros = {
    _mount: 'view',
    abierto: null,     // id del cobro con el panel abierto
    accion: '',        // 'confirmar' | 'rechazar'
    hecho: null,       // lo último que se resolvió, para mostrarlo arriba

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    html() {
      const DB = global.DB;
      const pend = DB.cobrosAConfirmar();
      const plata = pend.reduce((a, x) => a + (Number(x.cobro.m) || 0), 0);
      const vencidos = pend.filter(x => x.dias >= DB.DIAS_PARA_DAR_BAJA);
      const avisar = pend.filter(x => x.dias >= DB.DIAS_AVISO_BAJA
        && x.dias < DB.DIAS_PARA_DAR_BAJA);
      const bajar = DB.aBajar();

      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Tesorería</div><h1 class="h-title">Cobros a confirmar</h1>
            <div class="h-sub">Plata que alguien anotó y todavía nadie vio en el banco</div></div>
        </div>

        ${this.htmlHecho()}

        <div class="cx-kpis">
          <div class="cx-k"><span class="cx-k-t">Esperando</span>
            <span class="cx-k-v">${UI.pesos(plata)}</span>
            <span class="cx-k-p">${pend.length} cobro${pend.length === 1 ? '' : 's'}</span></div>
          <div class="cx-k ${avisar.length ? 'ojo' : ''}"><span class="cx-k-t">Por avisar</span>
            <span class="cx-k-v">${avisar.length}</span>
            <span class="cx-k-p">pasaron ${DB.DIAS_AVISO_BAJA} días o más</span></div>
          <div class="cx-k ${vencidos.length ? 'alerta' : ''}"><span class="cx-k-t">Para dar de baja</span>
            <span class="cx-k-v">${vencidos.length}</span>
            <span class="cx-k-p">pasaron ${DB.DIAS_PARA_DAR_BAJA} días</span></div>
          <div class="cx-k"><span class="cx-k-t">Trabadas por esto</span>
            <span class="cx-k-v">${bajar.filter(x => x.puede.sinVer).length}</span>
            <span class="cx-k-p">boletas que no bajan a fábrica</span></div>
        </div>

        <div class="cx-b">
          <div class="cx-b-h">La cola</div>
          ${pend.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Boleta</th><th>Cliente</th><th>Vendedor</th><th>Cómo</th>
              <th>Quién dice que la recibió</th><th>Referencia</th>
              <th class="num">Monto</th><th class="num">Días</th><th></th></tr></thead>
            <tbody>${pend.map(x => this.fila(x)).join('')}</tbody>
            </table></div>`
            : '<div class="hint">No hay nada esperando. Toda la plata anotada está confirmada.</div>'}
        </div>

        <div class="cx-b">
          <div class="cx-b-h">Boletas que todavía no bajaron a fábrica</div>
          ${bajar.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Boleta</th><th>Cliente</th><th>Vendedor</th><th>Muebles</th>
              <th>Por qué no bajó</th><th></th></tr></thead>
            <tbody>${bajar.map(x => {
              const n = (x.o.lineas || []).reduce((a, l) =>
                a + Math.max(1, Number(l.cantidad) || 1), 0);
              return `<tr class="${x.puede.ok ? '' : 'ojo'}">
                <td class="nom">${UI.esc(x.o.numero)}</td>
                <td>${UI.esc(x.o.cliente)}</td>
                <td class="muted">${UI.esc(x.o.vendedor)}</td>
                <td class="muted">${n} · ${UI.esc((x.o.lineas || [])
                  .map(l => l.producto).join(' · '))}</td>
                <td class="${x.puede.ok ? 'ok-t' : ''}">${x.puede.ok
                  ? 'nada, está lista' : UI.esc(x.puede.motivo)}</td>
                <td class="td-acc">${x.puede.ok
                  ? `<button class="b-x hacer" data-bajar="${UI.esc(x.o.numero)}">Bajar a fábrica</button>`
                  : ''}</td></tr>`;
            }).join('')}</tbody></table></div>`
            : '<div class="hint">Todas las boletas vendidas ya están en fábrica.</div>'}
        </div>

        <div class="hint">Confirmar un cobro es lo que hace bajar la boleta a fábrica: si con
          esta plata la boleta queda completa, las unidades se crean solas. Rechazar no borra
          nada —queda anotado el motivo— pero esa plata deja de contar para el saldo y para
          la comisión.</div>`;
    },

    fila(x) {
      const DB = global.DB;
      const c = x.cobro, o = x.orden;
      const mal = x.dias >= DB.DIAS_PARA_DAR_BAJA;
      const ojo = !mal && x.dias >= DB.DIAS_AVISO_BAJA;
      const abierto = this.abierto === c.id;
      return `<tr class="${mal ? 'mal' : ojo ? 'ojo' : ''}">
          <td class="nom"><button class="lnk" data-orden="${UI.esc(o.numero)}"
            >${UI.esc(o.numero)}</button></td>
          <td>${UI.esc(o.cliente)}</td>
          <td class="muted">${UI.esc(o.vendedor)}</td>
          <td>${UI.esc(c.metodo)}</td>
          <td class="muted">${UI.esc(c.recibidoPor || '—')}</td>
          <td class="muted">${UI.esc(c.depositante || '')}${c.depositante && c.referencia
            ? ' · ' : ''}${UI.esc(c.referencia || c.comprobante || '')}</td>
          <td class="num nom">${UI.pesos(c.m)}</td>
          <td class="num ${mal ? 'sube' : ''}">${x.dias == null ? '—' : x.dias}
            ${mal ? '<span class="tc-tag">dar de baja</span>'
              : ojo ? `<span class="tc-tag ojo">${x.vence === 1 ? 'último día'
                : `faltan ${x.vence} días`}</span>` : ''}</td>
          <td class="td-acc">
            <button class="b-x hacer" data-conf="${UI.esc(c.id)}"
              data-num="${UI.esc(o.numero)}">Confirmar</button>
            <button class="b-x" data-rech="${UI.esc(c.id)}"
              data-num="${UI.esc(o.numero)}">Rechazar</button>
          </td>
        </tr>
        ${abierto ? `<tr class="tc-panel-fila"><td colspan="9">${this.panel(x)}</td></tr>` : ''}`;
    },

    // El panel pide lo único que hace falta y nada más: para confirmar, en qué
    // cuenta apareció; para rechazar, por qué. Sin motivo no se rechaza: el
    // vendedor tiene que poder decirle algo al cliente.
    panel(x) {
      const conf = this.accion === 'confirmar';
      return `<div class="tc-panel">
        <b>${conf ? 'Confirmar' : 'Rechazar'} ${UI.pesos(x.cobro.m)} de ${
          UI.esc(x.orden.cliente)}</b>
        ${conf
          ? `<label>¿En qué cuenta apareció?
              <input id="tc-banco" placeholder="Galicia · Cuenta Belgrano" autocomplete="off"></label>`
          : `<label>¿Por qué?
              <input id="tc-motivo" placeholder="No figura en el banco" autocomplete="off"></label>`}
        <div class="row" style="gap:7px">
          <button class="btn${conf ? '' : ' tc-no'}" id="tc-ok">${
            conf ? 'Sí, entró' : 'Rechazar'}</button>
          <button class="b-x" id="tc-cancel">Cancelar</button>
        </div>
        ${conf ? `<span class="hint" style="margin:0">Si con esto la boleta queda cobrada,
          baja a fábrica sola.</span>` : ''}
      </div>`;
    },

    htmlHecho() {
      const h = this.hecho;
      if (!h) return '';
      return `<div class="tc-hecho ${h.mal ? 'mal' : ''}">${UI.esc(h.texto)}</div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const abrir = (id, accion) => {
        this.abierto = this.abierto === id && this.accion === accion ? null : id;
        this.accion = accion;
        this.hecho = null;
        this.render(this._mount);
      };
      document.querySelectorAll('[data-conf]').forEach(b =>
        b.onclick = () => abrir(b.dataset.conf, 'confirmar'));
      document.querySelectorAll('[data-rech]').forEach(b =>
        b.onclick = () => abrir(b.dataset.rech, 'rechazar'));
      document.querySelectorAll('[data-orden]').forEach(b => b.onclick = () => {
        const f = global.DB.cobrosAConfirmar().find(x => x.orden.numero === b.dataset.orden);
        const o = f && f.orden;
        if (o) global.OrdenDetalle.render(this._mount, { boleta: o }, () => this.render(this._mount));
      });
      document.querySelectorAll('[data-bajar]').forEach(b =>
        b.onclick = () => this.bajar(b.dataset.bajar));

      const cancel = q('tc-cancel');
      if (cancel) cancel.onclick = () => { this.abierto = null; this.render(this._mount); };

      const ok = q('tc-ok');
      if (ok) ok.onclick = () => {
        const fila = global.DB.cobrosAConfirmar().find(x => x.cobro.id === this.abierto);
        if (!fila) return;
        if (this.accion === 'confirmar') this.confirmar(fila);
        else this.rechazar(fila);
      };
    },

    confirmar(x) {
      const banco = (document.getElementById('tc-banco') || {}).value || '';
      const c = global.DB.confirmarCobro(x.orden.numero, x.cobro.id,
        { quien: this.quien(), banco: banco.trim() });
      this.abierto = null;
      const bajo = c && c.bajo;
      this.hecho = { texto: `Confirmados ${UI.pesos(x.cobro.m)} de ${x.orden.cliente}.`
        + (bajo ? ` ${x.orden.numero} bajó a fábrica con ${bajo.n} mueble${
          bajo.n === 1 ? '' : 's'}.`
          + (bajo.sinCatalogo && bajo.sinCatalogo.length
            ? ` Ojo: ${bajo.sinCatalogo.join(', ')} no está en el catálogo, la unidad quedó`
              + ' marcada para completar.' : '')
        : ` ${x.orden.numero} todavía no baja a fábrica: `
          + global.DB.puedeIrAFabrica(x.orden).motivo + '.') };
      this.render(this._mount);
    },

    rechazar(x) {
      const motivo = ((document.getElementById('tc-motivo') || {}).value || '').trim();
      if (!motivo) { UI.aviso('Poné el motivo: el vendedor lo necesita para hablar con el cliente.', 'mal'); return; }
      global.DB.rechazarCobro(x.orden.numero, x.cobro.id,
        { motivo, quien: this.quien() });
      this.abierto = null;
      this.hecho = { mal: true, texto: `Rechazados ${UI.pesos(x.cobro.m)} de ${
        x.orden.cliente}: ${motivo}. Esa plata dejó de contar para el saldo y la comisión.` };
      this.render(this._mount);
    },

    bajar(numero) {
      const r = global.DB.bajarAFabrica(numero, this.quien());
      this.hecho = r.error
        ? { mal: true, texto: `${numero} no bajó: ${r.error}.` }
        : { texto: `${numero} bajó a fábrica con ${r.n} mueble${r.n === 1 ? '' : 's'}.`
            + (r.sinCatalogo && r.sinCatalogo.length
              ? ` ${r.sinCatalogo.join(', ')} no está en el catálogo.` : '') };
      this.render(this._mount);
    },

    quien() {
      const r = global.App && global.App.rol;
      return r === 'direccion' ? 'Dirección' : 'Tesorería';
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .tc-tag{display:inline-block;margin-left:5px;font-size:9.5px;font-weight:700;
          text-transform:uppercase;letter-spacing:.04em;padding:1px 5px;border-radius:5px;
          background:var(--crit-bg);color:var(--crit)}
        .tc-tag.ojo{background:var(--warn-bg);color:var(--warn)}
        .tc-panel-fila td{background:var(--panel-2);white-space:normal}
        .tc-panel{display:flex;flex-direction:column;gap:7px;padding:4px 0;max-width:460px}
        .tc-panel label{display:flex;flex-direction:column;gap:3px;font-size:11px;
          color:var(--muted);font-weight:700}
        .tc-panel input{border:1px solid var(--line);border-radius:8px;padding:6px 8px;
          font:inherit;font-weight:400;color:var(--navy);background:var(--panel)}
        .tc-hecho{border:1px solid var(--ok);background:var(--ok-bg);color:var(--ok);
          border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:600;
          margin-bottom:12px}
        .tc-hecho.mal{border-color:var(--crit);background:var(--crit-bg);color:var(--crit)}
        .ok-t{color:var(--ok);font-weight:600}
        .btn.tc-no{background:var(--crit);border-color:var(--crit)}
        .cx-k.ojo .cx-k-v{color:var(--warn)}
      </style>`;
    },
  };
  global.TesoCobros = Cobros;
})(typeof window !== 'undefined' ? window : globalThis);
