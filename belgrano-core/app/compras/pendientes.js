// =====================================================================
//  Belgrano Soft · Compras · Pendientes
//  Lo que está esperando una decisión de Compras, todo en una pantalla:
//  entregas que Adrián registró y nadie conformó, compras de insumos que
//  se mandaron y no llegaron, y muebles que se están comprando a ciegas
//  porque ese taller nunca dijo cuánto cobra.
// =====================================================================
(function (global) {
  const Pend = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    html() {
      const p = global.DB.comprasPendientes();
      const plata = p.recs.reduce((a, r) => a + r.items.reduce((b, x) =>
        b + global.DB.precioProveedor(r.provId, x.varianteId).precio, 0), 0);
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Pendientes</h1>
            <div class="h-sub">Todo lo que espera una decisión de Compras</div></div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Entregas a conformar', p.recs.length, UI.pesos(plata) + ' estimados', p.recs.length)}
          ${this.kpi('Compras en camino', p.ocs.length, 'insumos pedidos y no recibidos', 0)}
          ${this.kpi('Sin precio de nadie', p.sinPrecio.length,
            'ni del taller ni de Costeo', p.sinPrecio.length)}
          ${this.kpi('Con precio de Costeo', p.soloCosteo.length,
            'falta que el taller diga el suyo', 0)}
        </div>

        ${this.bloqueRecs(p.recs)}
        ${this.bloqueOC(p.ocs)}
        ${this.bloquePrecios('Muebles sin precio de nadie', p.sinPrecio,
          `Se están comprando a ciegas: no hay precio de ese taller ni fila en Costeo.
           El número que se usa es el costo cargado a mano en el mueble.`, true)}
        ${this.bloquePrecios('Muebles con el precio de Costeo', p.soloCosteo,
          `Tienen un número razonable —el de la lista general— pero ese taller todavía
           no dijo el suyo. Se completa solo la primera vez que se conforma una entrega.`, false)}`;
    },

    bloqueRecs(recs) {
      return `<div class="cx-b">
        <div class="cx-b-h">Entregas esperando el visto <span class="muted">${recs.length}</span></div>
        ${recs.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Recepción</th><th>Taller</th><th>Recibió</th><th>Fecha</th>
            <th>Muebles</th><th class="num">Estimado</th><th></th></tr></thead>
          <tbody>${recs.map(r => {
            const t = r.items.reduce((a, x) =>
              a + global.DB.precioProveedor(r.provId, x.varianteId).precio, 0);
            const dias = global.DB.diasDesde(r.fecha);
            return `<tr class="${dias != null && dias > 7 ? 'ojo' : ''}">
              <td class="nom">${UI.esc(r.numero)}</td>
              <td>${UI.esc(r.proveedor || '—')}</td>
              <td class="muted">${UI.esc(r.recibidoPor || '—')}</td>
              <td class="muted">${UI.esc(r.fecha)}${dias != null && dias > 7
                ? ` <b class="mal">hace ${dias} días</b>` : ''}</td>
              <td>${r.items.length}</td>
              <td class="num muted">${UI.pesos(t)}</td>
              <td><button class="b-x" data-rec="${UI.esc(r.numero)}">Conformar</button></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
          : '<div class="hint">No hay nada esperando. Aparecen solas cuando el depósito recibe.</div>'}
      </div>`;
    },

    bloqueOC(ocs) {
      return `<div class="cx-b">
        <div class="cx-b-h">Insumos pedidos que no llegaron <span class="muted">${ocs.length}</span></div>
        ${ocs.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Compra</th><th>Proveedor</th><th>Entrega</th>
            <th>Insumos</th><th class="num">Total</th><th></th></tr></thead>
          <tbody>${ocs.map(o => {
            const faltan = global.DB.diasHasta(o.entrega);
            return `<tr class="${faltan != null && faltan < 0 ? 'mal' : ''}">
              <td class="nom">${UI.esc(o.numero)}</td>
              <td>${UI.esc(o.proveedor)}</td>
              <td class="muted">${UI.esc(o.entrega || '—')}${faltan == null ? ''
                : (faltan < 0 ? ` <b class="mal">${-faltan} días tarde</b>`
                  : ` <span class="muted">faltan ${faltan}</span>`)}</td>
              <td>${o.items.length}</td>
              <td class="num nom">${UI.pesos(global.DB.totalOC(o))}</td>
              <td><button class="b-x" data-oc="${UI.esc(o.numero)}">Ver</button></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
          : '<div class="hint">No hay compras de insumos en camino.</div>'}
      </div>`;
    },

    bloquePrecios(titulo, filas, pie, alerta) {
      // Se muestran los primeros: la lista entera son cientos y no aporta.
      const ver = filas.slice(0, 12);
      return `<div class="cx-b">
        <div class="cx-b-h">${titulo} <span class="muted">${filas.length}</span></div>
        ${filas.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Mueble</th><th>Terminación</th><th>Taller</th>
            <th class="num">Se usa</th></tr></thead>
          <tbody>${ver.map(f => `<tr class="${alerta ? 'ojo' : ''}">
            <td class="nom">${UI.esc(global.DB.nombreVariante(f.varianteId))}</td>
            <td class="muted">${UI.esc(f.color || f.medida || '')}</td>
            <td>${UI.esc(f.proveedor || '—')}</td>
            <td class="num muted">${UI.pesos(f.precio)}</td>
          </tr>`).join('')}
          ${filas.length > ver.length ? `<tr><td colspan="4" class="muted">
            y ${filas.length - ver.length} más</td></tr>` : ''}
          </tbody></table></div>
          <div class="hint" style="margin-top:6px">${pie}</div>`
          : '<div class="hint">Ninguno. Todos los muebles tienen precio propio del taller.</div>'}
      </div>`;
    },

    kpi(t, v, pie, alerta) {
      return `<div class="cx-k ${alerta ? 'alerta' : ''}"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v">${v}</span><span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
        global.ComprasRecepciones.abierta = b.dataset.rec;
        global.App.goSub('compras', 'recepciones');
      });
      document.querySelectorAll('[data-oc]').forEach(b => b.onclick = () => {
        global.ComprasOC.abierta = b.dataset.oc;
        global.App.goSub('compras', 'oc');
      });
    },

    estilos() { return global.ComprasEstilos ? global.ComprasEstilos() : ''; },
  };
  global.ComprasPendientes = Pend;
})(typeof window !== 'undefined' ? window : globalThis);
