// =====================================================================
//  Belgrano Soft · Compras · Cuenta corriente
//  La cuenta va en los dos sentidos: él nos trae muebles y nosotros le
//  vendemos materiales. Cuando llega a entregar se sientan, se compensa
//  lo uno con lo otro y se paga la diferencia. Esta pantalla es esa
//  charla anotada, y es la que Jony va a tener abierta con el proveedor
//  enfrente.
// =====================================================================
(function (global) {
  const Cta = {
    _mount: 'view',
    abierto: null,
    _form: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierto ? this.htmlUno(this.abierto) : this.htmlLista())
        + this.estilos();
      this.enganchar();
    },

    // ---- Todos los saldos --------------------------------------------
    htmlLista() {
      const ss = global.DB.saldosProveedores();
      const debemos = ss.filter(x => x.saldo > 0).reduce((a, x) => a + x.saldo, 0);
      const nosdeben = ss.filter(x => x.saldo < 0).reduce((a, x) => a - x.saldo, 0);
      const prox = global.DB.proximasEntregas(4);
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Cuenta corriente</h1>
            <div class="h-sub">${ss.length} proveedores con cuenta abierta</div></div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Les debemos', UI.pesos(debemos),
            `${ss.filter(x => x.saldo > 0).length} proveedores`, debemos > 0)}
          ${this.kpi('Nos deben', UI.pesos(nosdeben),
            'materiales que se llevaron', false)}
          ${this.kpi('Neto', UI.pesos(Math.abs(debemos - nosdeben)),
            debemos - nosdeben > 0 ? 'a favor de ellos' : 'a favor nuestro', false)}
        </div>

        ${prox.length ? `<div class="card pad cx-prox">
          <div class="cx-b-h">Vienen a entregar</div>
          ${prox.map(p => {
            const s = global.DB.leerSaldo(global.DB.saldoProveedor(p.provId));
            return `<div class="cx-prox-f">
              <b>${UI.esc(p.fecha)}</b>
              <span>${UI.esc(p.proveedor)}</span>
              <span class="muted">${p.muebles} muebles</span>
              <span class="sp"></span>
              <span class="pill ${s.pill}">${UI.esc(s.txt)}</span>
              <button class="b-x" data-prov="${p.provId}">Abrir la cuenta</button>
            </div>`;
          }).join('')}
        </div>` : ''}

        <div class="cx-b">
          <div class="cx-b-h">Saldo con cada uno</div>
          <div class="card cx-tabla"><table>
            <thead><tr><th>Proveedor</th><th>Rubro</th><th>Movimientos</th>
              <th class="num">Nos trajo</th><th class="num">Le pagamos y le vendimos</th>
              <th class="num">Saldo</th><th></th></tr></thead>
            <tbody>${ss.map(x => {
              const c = global.DB.compensacion(x.prov.id);
              const s = global.DB.leerSaldo(x.saldo);
              return `<tr class="cliq" data-prov="${x.prov.id}">
                <td class="nom">${UI.esc(x.prov.nombre)} <span class="muted">#${x.prov.id}</span></td>
                <td class="muted">${UI.esc((global.DB.rubro(x.prov.rubro) || {}).label || x.prov.rubro)}</td>
                <td>${x.movs}</td>
                <td class="num muted">${UI.pesos(c.debe)}</td>
                <td class="num muted">${UI.pesos(c.haber)}</td>
                <td class="num"><b class="${x.saldo > 0 ? 'sube' : 'baja'}">${
                  UI.pesos(Math.abs(x.saldo))}</b></td>
                <td><span class="pill ${s.pill}">${x.saldo > 0 ? 'le debemos'
                  : (x.saldo < 0 ? 'nos debe' : 'al día')}</span></td>
              </tr>`;
            }).join('')}</tbody></table></div>
        </div>

        <div class="hint">La deuda nace sola cuando Jony conforma una entrega: no hay un paso
          intermedio. Lo que se le vende de materiales se descuenta de ahí, y lo que queda es
          lo que se le paga el día que viene.</div>`;
    },

    // ---- La cuenta de uno --------------------------------------------
    htmlUno(id) {
      const p = global.DB.proveedor(id);
      if (!p) return UI.vacio('No existe ese proveedor.');
      const movs = global.DB.movimientosDe(id);
      const c = global.DB.compensacion(id);
      const s = global.DB.leerSaldo(c.saldo);
      const debeTraer = global.DB.devolucionesPendientes(id);
      const prox = global.DB.agenda().find(x => x.provId === id && x.estado === 'reservado');
      // El saldo corrido, para poder seguir la cuenta renglón por renglón.
      let acum = 0;
      const filas = [...movs].reverse().map(m => {
        acum += m.signo * m.monto;
        return { m, acum };
      }).reverse();
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="cx-volver">‹ Cuentas corrientes</button></div>
        <div class="row" style="align-items:flex-start;margin-bottom:14px">
          <span class="cx-av grande">${UI.esc(this.inicial(p.nombre))}</span>
          <div style="margin-left:11px">
            <div class="kick">${UI.esc((global.DB.rubro(p.rubro) || {}).label || p.rubro)}</div>
            <h1 class="h-title">${UI.esc(p.nombre)} <span class="muted">#${p.id}</span></h1>
            <div class="h-sub">${UI.esc(p.direccion || '')}${prox
              ? ` · viene el <b>${UI.esc(prox.fecha)}</b> con ${prox.muebles} muebles` : ''}</div></div>
          <div class="sp"></div>
          <div class="cx-saldo ${c.saldo > 0 ? 'debe' : 'haber'}">
            <span class="cx-saldo-t">${c.saldo > 0 ? 'Le debemos'
              : (c.saldo < 0 ? 'Nos debe' : 'Al día')}</span>
            <b>${UI.pesos(Math.abs(c.saldo))}</b></div>
        </div>

        <div class="card pad cx-comp">
          <div class="cx-b-h">Cómo se compone</div>
          <div class="cx-comp-g">
            <span><b>${UI.pesos(c.debe)}</b><span>muebles que trajo</span></span>
            <span class="cx-menos">−</span>
            <span><b>${UI.pesos(c.materiales)}</b><span>materiales que le vendimos</span></span>
            <span class="cx-menos">−</span>
            <span><b>${UI.pesos(c.haber - c.materiales)}</b><span>pagos y anticipos</span></span>
            <span class="cx-menos">=</span>
            <span class="cx-igual"><b class="${c.saldo > 0 ? 'sube' : 'baja'}">${
              UI.pesos(Math.abs(c.saldo))}</b><span>${UI.esc(s.txt)}</span></span>
          </div>
        </div>

        <div class="cx-acc">
          ${global.DB.MOVS_CTA.filter(m => m.k !== 'compra').map(m =>
            `<button class="btn" data-nuevo="${m.k}">${UI.esc(m.label)}</button>`).join('')}
        </div>

        ${debeTraer.length ? `<div class="card pad cx-debe">
          <div class="cx-b-h">Muebles que ya pagamos y nos tiene que traer
            <span class="muted">${debeTraer.length}</span></div>
          ${debeTraer.map(d => `<div class="cx-debe-f">
            <b>${UI.esc(d.modelo || '')}</b>
            <span class="muted">${UI.esc(d.medida || '')} · ${UI.esc(d.color || '')}
              · ${UI.esc(d.serie || '')}</span>
            <span class="muted">${UI.esc(d.motivo || '')} · devuelto el ${UI.esc(d.fecha)}</span>
            <span class="sp"></span>
            <button class="b-x" data-repuesto="${d.id}">Ya lo trajo</button>
          </div>`).join('')}
        </div>` : ''}

        <div class="cx-b">
          <div class="cx-b-h">Movimientos <span class="muted">${movs.length}</span></div>
          <div class="card cx-tabla"><table>
            <thead><tr><th>Fecha</th><th>Qué</th><th>Detalle</th><th>Cómo</th><th>Quién</th>
              <th class="num">Le debemos</th><th class="num">Le pagamos</th>
              <th class="num">Saldo</th></tr></thead>
            <tbody>${filas.map(({ m, acum }) => {
              const t = global.DB.movCta(m.tipo) || {};
              return `<tr>
                <td class="muted">${UI.esc(m.fecha)}</td>
                <td><span class="pill ${t.pill}">${UI.esc(t.label)}</span></td>
                <td class="muted">${UI.esc(m.detalle || '')}${m.ref
                  ? ` <b>${UI.esc(m.ref)}</b>` : ''}</td>
                <td class="muted">${UI.esc((global.DB.FORMAS_PAGO.find(f => f.k === m.forma) || {}).label || '')}</td>
                <td class="muted">${UI.esc(m.quien)}</td>
                <td class="num">${m.signo > 0 ? UI.pesos(m.monto) : ''}</td>
                <td class="num">${m.signo < 0 ? UI.pesos(m.monto) : ''}</td>
                <td class="num nom">${UI.pesos(Math.abs(acum))}</td>
              </tr>`;
            }).join('')}</tbody></table></div>
        </div>`;
    },

    // ---- Anotar un movimiento ----------------------------------------
    modalNuevo(tipo) {
      const t = global.DB.movCta(tipo); if (!t) return;
      const p = global.DB.proveedor(this.abierto);
      const conForma = tipo === 'pago' || tipo === 'anticipo';
      const saldo = global.DB.saldoProveedor(this.abierto);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cx-mdl"><div class="card pad" style="max-width:420px;width:100%">
          <h3 class="h-title" style="font-size:17px">${UI.esc(t.label)}</h3>
          <p class="h-sub">${UI.esc(p.nombre)} · ${UI.esc(t.pie)}</p>
          ${tipo === 'pago' && saldo > 0 ? `<div class="hint" style="margin:8px 0">
            Hoy le debemos <b>${UI.pesos(saldo)}</b>.
            <button class="lnk" id="cx-todo">Poner todo</button></div>` : ''}
          <label class="fld"><span class="lbl">Cuánto</span>
            <input id="cx-monto" type="number" placeholder="0"></label>
          <label class="fld"><span class="lbl">Detalle</span>
            <input id="cx-detalle" placeholder="${tipo === 'materiales'
              ? '2 cajas de correderas' : (tipo === 'descuento'
                ? 'la cómoda vino con la tapa rayada' : 'contra la entrega de hoy')}"></label>
          ${conForma ? `<label class="fld"><span class="lbl">Cómo</span>
            <select id="cx-forma">${global.DB.FORMAS_PAGO.map(f =>
              `<option value="${f.k}">${UI.esc(f.label)}</option>`).join('')}</select></label>` : ''}
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cx-cancel">Cancelar</button>
            <button class="btn primary" id="cx-ok">Anotar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cx-mdl'); if (m) m.remove(); };
      const todo = document.getElementById('cx-todo');
      if (todo) todo.onclick = () => { document.getElementById('cx-monto').value = saldo; };
      document.getElementById('cx-cancel').onclick = cerrar;
      document.getElementById('cx-monto').focus();
      document.getElementById('cx-ok').onclick = () => {
        const monto = Number(document.getElementById('cx-monto').value) || 0;
        if (!monto) return UI.aviso('Falta el monto', 'warn');
        const f = document.getElementById('cx-forma');
        global.DB.anotarCuenta({ provId: this.abierto, tipo, monto,
          detalle: document.getElementById('cx-detalle').value,
          forma: f ? f.value : '', quien: 'Jony' });
        UI.aviso(`${t.label}: ${UI.pesos(monto)}`, 'ok');
        cerrar(); this.render(this._mount);
      };
    },

    inicial(nombre) {
      const m = /[a-záéíóúñ]/i.exec(String(nombre || ''));
      return (m ? m[0] : String(nombre || '?')[0] || '?').toUpperCase();
    },

    kpi(t, v, pie, alerta) {
      return `<div class="cx-k ${alerta ? 'alerta' : ''}"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v" style="font-size:19px">${v}</span>
        <span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-prov]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        this.abierto = Number(b.dataset.prov); this.render(this._mount);
      });
      const v = document.getElementById('cx-volver');
      if (v) v.onclick = () => { this.abierto = null; this.render(this._mount); };
      document.querySelectorAll('[data-nuevo]').forEach(b => b.onclick = () =>
        this.modalNuevo(b.dataset.nuevo));
      document.querySelectorAll('[data-repuesto]').forEach(b => b.onclick = () => {
        global.DB.saldarDevolucion(Number(b.dataset.repuesto), 'Jony');
        UI.aviso('Anotado: lo trajo', 'ok');
        this.render(this._mount);
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cx-saldo{text-align:right;padding:7px 14px;border-radius:11px;border:1px solid var(--line);
          background:var(--panel)}
        .cx-saldo-t{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700}
        .cx-saldo b{font-size:23px;color:var(--navy)}
        .cx-saldo.debe{border-color:var(--warn);background:var(--warn-bg)}
        .cx-saldo.haber{border-color:var(--ok);background:var(--ok-bg)}
        .cx-comp{margin-bottom:12px}
        .cx-comp-g{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .cx-comp-g>span{display:flex;flex-direction:column}
        .cx-comp-g b{font-size:16px;color:var(--navy)}
        .cx-comp-g span span{font-size:10.5px;color:var(--muted)}
        .cx-menos{font-size:17px;color:var(--muted);font-weight:700}
        .cx-igual{padding-left:12px;border-left:1px solid var(--line)}
        .cx-acc{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
        .cx-prox{margin-bottom:16px}
        .cx-prox-f{display:flex;gap:10px;align-items:center;padding:5px 0;
          border-bottom:1px solid var(--line-soft);font-size:12.5px}
        .cx-prox-f:last-child{border-bottom:0}
        .cx-prox-f b{color:var(--navy);min-width:44px}
        .cx-debe{margin-bottom:16px;border-color:var(--crit)}
        .cx-debe-f{display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:5px 0;
          border-bottom:1px solid var(--line-soft);font-size:12.5px}
        .cx-debe-f:last-child{border-bottom:0}
        .cx-debe-f b{color:var(--navy)}
        .cx-debe-f .muted{font-size:11px}
        .cx-back{position:fixed;inset:0;background:rgba(12,20,34,.45);z-index:70;
          display:flex;align-items:center;justify-content:center;padding:20px}
      </style>`;
    },
  };
  global.ComprasCuenta = Cta;
})(typeof window !== 'undefined' ? window : globalThis);
