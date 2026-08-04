// =====================================================================
//  Belgrano Soft · Ventas · Comisiones
//  El vendedor no carga su venta acá: la venta ya está en la boleta. De
//  ahí salen solos el número de pedido, el cliente, el local y cómo pagó.
//  Si Jony después anula la boleta o cambia un cobro de efectivo a
//  tarjeta, la comisión se acomoda sola —es la misma boleta, no una copia
//  en otra planilla que alguien tiene que acordarse de corregir.
//
//  La base no es el total de la venta: es lo que le queda a la casa.
//  Efectivo entero, la transferencia dividida por el IVA porque va
//  facturada, y el crédito castigado porque la tarjeta se lleva su parte.
//  El flete se resta: no es venta, es un costo que se pasa.
// =====================================================================
(function (global) {
  const Comisiones = {
    _mount: 'view',
    mes: null,
    vend: null,

    async render(mount = 'view') {
      this._mount = mount;
      if (this.mes == null) this.mes = global.DB.ultimoMesConVentas();
      // El vendedor se ve a sí mismo. Dirección elige a quién mirar.
      const rol = (global.App && global.App.rol) || 'direccion';
      this.jefe = rol === 'direccion' || rol === 'administrativo';
      if (!this.vend) {
        this.vend = this.jefe ? global.DB.vendedores()[0]
          : (global.DB.sesion ? global.DB.sesion().vendedor : global.DB.vendedores()[0]);
      }
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    MESES: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
      'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],

    html() {
      const m = global.DB.mesDelVendedor(this.vend, this.mes);
      const C = global.DB.COMISION;
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Ventas</div>
            <h1 class="h-title">${this.jefe ? 'Comisiones' : 'Mis comisiones'}</h1>
            <div class="h-sub">${UI.esc(this.MESES[this.mes])} ·
              ${m.firmes.length} ventas firmes${m.trabadas.length
                ? ` · <b class="mal">${m.trabadas.length} esperando confirmación</b>` : ''}</div></div>
          <div class="sp"></div>
          ${this.jefe ? `<select id="cv-vend" class="cx-buscar" style="min-width:150px">
            ${global.DB.vendedores().map(v =>
              `<option ${v === this.vend ? 'selected' : ''}>${UI.esc(v)}</option>`).join('')}
          </select>` : ''}
          ${this.jefe ? `<button class="b-x ${m.cerrado ? '' : 'hacer'}" id="cv-cerrar">${
            m.cerrado ? 'Mes cerrado · recerrar' : 'Cerrar el mes'}</button>` : ''}
          <div class="cx-nav" style="margin-left:8px">
            <button class="b-x" id="cv-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes])}</b>
            <button class="b-x" id="cv-sig">›</button>
          </div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Vendido', UI.pesos(m.vendido), `${m.firmes.length} boletas confirmadas`)}
          ${this.kpi('Cobrado', UI.pesos(m.cobrado), m.porCobrar
            ? `faltan cobrar ${UI.pesos(m.porCobrar)}` : 'todo cobrado')}
          ${this.kpi('Comisión', UI.pesos(m.comision), `${m.pct}% sobre lo cobrado`)}
          ${this.kpi('Bono', UI.pesos(m.bono.monto), m.bono.siguiente
            ? `faltan ${UI.pesos(m.bono.falta)} para el próximo`
            : (m.bono.alcanzada ? 'último tramo alcanzado' : 'sin franjas cargadas'))}
          ${this.kpi('A cobrar', UI.pesos(m.aCobrar),
            `fija + comisión + bono${m.ajuste ? ' + ajustes' : ''}`)}
        </div>

        ${this.bloqueAjustes(m)}

        ${m.trabadas.length ? `<div class="card pad cv-trab">
          <div class="cv-trab-h">⚠ ${UI.pesos(m.trabado)} sin contar todavía</div>
          <div class="hint">Estas ventas no suman comisión hasta que estén confirmadas.
            No es un problema del vendedor: hay que destrabarlas.</div>
          ${m.trabadas.map(x => `<div class="cv-trab-f">
            <b>${UI.esc(x.o.numero)}</b>
            <span>${UI.esc(x.o.cliente)}</span>
            <span class="muted">${UI.pesos(x.total)}</span>
            <span class="pill warn">${UI.esc((global.DB.ESTADO_ORDEN[x.o.estado] || {}).label
              || x.o.estado)}</span>
            <span class="sp"></span>
            <button class="b-x" data-ir="${UI.esc(x.o.numero)}">Abrir la boleta</button>
          </div>`).join('')}
        </div>` : ''}

        ${this.bloqueFranjas(m)}

        <div class="cx-b">
          <div class="cx-b-h">Sus ventas del mes <span class="muted">${m.ventas.length}</span></div>
          ${m.ventas.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Local</th>
              <th class="num">Efectivo</th><th class="num">Transf.</th><th class="num">Crédito</th>
              <th class="num">Flete</th><th class="num">Cobrado</th><th class="num">Falta</th>
              <th class="num">Comisión</th><th></th></tr></thead>
            <tbody>${m.ventas.map(x => `<tr class="cliq ${x.cuenta ? '' : 'ojo'}"
              data-ir="${UI.esc(x.o.numero)}">
              <td class="muted">${UI.esc(x.o.fecha)}</td>
              <td class="nom">${UI.esc(x.o.numero)}</td>
              <td>${UI.esc(x.o.cliente)}</td>
              <td class="muted">${UI.esc(x.o.local || '')}</td>
              <td class="num muted">${x.efectivo ? UI.pesos(x.efectivo) : '—'}</td>
              <td class="num muted">${x.transferencia ? UI.pesos(x.transferencia) : '—'}</td>
              <td class="num muted">${x.credito ? UI.pesos(x.credito) : '—'}</td>
              <td class="num muted">${x.flete ? `−${UI.pesos(x.flete)}` : '—'}</td>
              <td class="num">${UI.pesos(x.cobrado)}</td>
              <td class="num ${x.falta ? 'sube' : 'muted'}">${x.falta
                ? UI.pesos(x.falta) : '—'}</td>
              <td class="num nom">${x.cuenta ? UI.pesos(x.comision)
                : '<span class="muted">no cuenta</span>'}</td>
              <td><span class="pill ${x.cuenta ? 'ok' : 'warn'}">${x.cuenta ? 'firme'
                : 'a confirmar'}</span></td>
            </tr>`).join('')}
            <tr class="cx-tot"><td colspan="8">Total del mes</td>
              <td class="num">${UI.pesos(m.cobrado)}</td>
              <td class="num">${m.porCobrar ? UI.pesos(m.porCobrar) : '—'}</td>
              <td class="num">${UI.pesos(m.comision)}</td><td></td></tr>
            </tbody></table></div>`
            : UI.vacio('No hay ventas de este vendedor en el mes.')}
        </div>

        <div class="hint">La comisión se paga <b>por lo cobrado</b> y por el método con que
          pagó el cliente de verdad: <b>efectivo + transferencia ÷ ${C.ivaDivisor} +
          crédito × ${C.creditoFactor} − flete</b>. Lo que todavía no entró no cuenta, y una
          transferencia que nadie vio en el banco tampoco.
          Al cerrar el mes queda firme lo que se pagó; si esa venta después se termina de
          cobrar o se anula, la diferencia aparece como <b>ajuste</b> en el mes siguiente.</div>`;
    },

    // Los ajustes de meses cerrados. Un mes cerrado no se vuelve a tocar: si
    // una venta vieja cambió, la diferencia aparece acá, con su número y su
    // motivo, en más o en menos. Es como se hace en la planilla.
    bloqueAjustes(m) {
      if (!m.ajustes.length) return '';
      return `<div class="card pad cv-aj">
        <div class="cx-b-h">Ajustes de meses anteriores
          <span class="muted">${m.ajustes.length}</span></div>
        ${m.ajustes.map(a => `<div class="cv-aj-f">
          <b>${UI.esc(a.numero)}</b>
          <span>${UI.esc(a.cliente || '')}</span>
          <span class="muted">de ${UI.esc(this.MESES[a.mesOrigen])} · ${UI.esc(a.motivo)}</span>
          <span class="muted">se le pagó ${UI.pesos(a.liquidado)}, iba ${UI.pesos(a.ahora)}</span>
          <span class="sp"></span>
          <b class="${a.dif > 0 ? 'baja' : 'sube'}">${a.dif > 0 ? '+' : '−'}${
            UI.pesos(Math.abs(a.dif))}</b>
        </div>`).join('')}
        <div class="cv-aj-t">Total de ajustes
          <b class="${m.ajuste > 0 ? 'baja' : 'sube'}">${m.ajuste > 0 ? '+' : '−'}${
            UI.pesos(Math.abs(m.ajuste))}</b></div>
      </div>`;
    },

    // Las franjas: lo que falta para el próximo premio es el número que
    // mueve la aguja. Sin eso el bono es una sorpresa de fin de mes.
    bloqueFranjas(m) {
      const fs = ((m.esquema || {}).franjas || []).slice()
        .sort((a, b) => Number(a.desde) - Number(b.desde));
      if (!fs.length) return '';
      const tope = Number(fs[fs.length - 1].desde) || 1;
      return `<div class="card pad cv-obj">
        <div class="cx-b-h">Sus objetivos</div>
        <div class="cv-barra">
          <span style="width:${Math.min(100, Math.round((m.base / tope) * 100))}%"></span>
          ${fs.map(f => `<i style="left:${Math.min(100, Math.round((Number(f.desde) / tope) * 100))}%"
            title="${UI.pesos(f.desde)} → ${UI.pesos(f.monto)}"></i>`).join('')}
        </div>
        <div class="cv-obj-f">${fs.map(f => {
          const ok = m.base >= Number(f.desde);
          return `<span class="${ok ? 'ok' : ''}">
            <b>${UI.pesos(f.monto)}</b>
            <span>al llegar a ${UI.pesos(f.desde)}${ok ? ' ✓' : ''}</span></span>`;
        }).join('')}</div>
        ${m.bono.siguiente ? `<div class="hint">Le faltan
          <b>${UI.pesos(m.bono.falta)}</b> de base para llegar a
          ${UI.pesos(m.bono.siguiente.monto)}.</div>` : ''}
      </div>`;
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v" style="font-size:19px">${v}</span>
        <span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const a = q('cv-ant'); if (a) a.onclick = () => {
        this.mes = this.mes > 1 ? this.mes - 1 : 12; this.render(this._mount);
      };
      const s = q('cv-sig'); if (s) s.onclick = () => {
        this.mes = this.mes < 12 ? this.mes + 1 : 1; this.render(this._mount);
      };
      const cc = q('cv-cerrar'); if (cc) cc.onclick = () => {
        const m = global.DB.mesDelVendedor(this.vend, this.mes);
        if (!confirm(`¿Cerrar ${this.MESES[this.mes]} de ${this.vend} con ${
          UI.pesos(m.comision)} de comisión?\n\nLo que cambie después de una venta de este`
          + ' mes va a aparecer como ajuste en el mes que sigue.')) return;
        const n = global.DB.cerrarMesVendedor(this.vend, this.mes, 'Brian');
        UI.aviso(`${n} ventas liquidadas`, 'ok');
        this.render(this._mount);
      };
      const v = q('cv-vend'); if (v) v.onchange = () => {
        this.vend = v.value; this.render(this._mount);
      };
      document.querySelectorAll('[data-ir]').forEach(el => el.onclick = e => {
        e.stopPropagation();
        global.Ordenes.abierta = el.dataset.ir;
        global.App.goSub('ventas', 'ordenes');
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cv-trab{border-color:var(--warn);background:var(--warn-bg);margin-bottom:14px}
        .cv-trab-h{font-size:13px;font-weight:700;color:var(--warn);margin-bottom:4px}
        .cv-trab-f{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:12.5px;
          padding:4px 0;border-bottom:1px solid var(--line-soft)}
        .cv-trab-f:last-child{border-bottom:0}
        .cv-trab-f b{color:var(--navy)}
        .cv-obj{margin-bottom:16px}
        .cv-barra{position:relative;height:12px;border-radius:999px;background:var(--panel-2);
          border:1px solid var(--line);overflow:visible;margin:8px 0 12px}
        .cv-barra>span{display:block;height:100%;background:var(--navy);border-radius:999px}
        .cv-barra>i{position:absolute;top:-4px;width:2px;height:20px;background:var(--muted);
          border-radius:2px}
        .cv-obj-f{display:flex;gap:20px;flex-wrap:wrap}
        .cv-obj-f>span{display:flex;flex-direction:column}
        .cv-obj-f b{font-size:14px;color:var(--muted)}
        .cv-obj-f span span{font-size:10.5px;color:var(--muted)}
        .cv-obj-f>span.ok b{color:var(--ok)}
        .cv-aj{border-left:3px solid var(--brand);margin-bottom:14px}
        .cv-aj-f{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:12.5px;
          padding:4px 0;border-bottom:1px solid var(--line-soft)}
        .cv-aj-f:last-of-type{border-bottom:0}
        .cv-aj-f b{color:var(--navy)}
        .cv-aj-f .muted{font-size:11px}
        .cv-aj-t{display:flex;gap:8px;justify-content:flex-end;align-items:baseline;
          margin-top:8px;padding-top:8px;border-top:1px solid var(--line);
          font-size:12px;color:var(--muted)}
        .cv-aj-t b{font-size:15px}
      </style>`;
    },
  };
  global.Comisiones = Comisiones;
})(typeof window !== 'undefined' ? window : globalThis);
