// =====================================================================
//  Belgrano Soft · Órdenes de venta (listado)
//  N° · Fecha · Cliente · Vendedor · Local · Total · Estado (ciclo real).
//  Demo por ahora; después lee core.orden.
// =====================================================================
(function (global) {
  const Ordenes = {
    texto: '',
    async render(mount = 'view') {
      const v = document.getElementById(mount);
      v.innerHTML = UI.head('Ventas', 'Órdenes de venta',
        'El estado sigue el ciclo real: confirmar → producción → logística → entregado.',
        `<button class="btn primary" id="ov-nueva">+ Nueva</button>`) +
        `<div class="card pad" style="margin-bottom:14px">
           <input id="ov-q" placeholder="Buscar por cliente o N°…" value="${UI.esc(this.texto)}">
         </div>
         <div id="ov-lista">${UI.spinner()}</div>`;
      document.getElementById('ov-nueva').onclick = () => UI.aviso('Nueva orden: se arma desde una cotización aceptada', 'info');
      const q = document.getElementById('ov-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.texto = q.value.trim(); this.pintar(mount); }, 200); };
      this.pintar(mount);
    },
    async pintar(mount) {
      const cont = document.getElementById('ov-lista');
      try {
        const os = await global.DB.ordenes({ texto: this.texto });
        cont.innerHTML = os.length ? `<div class="card"><table>
          <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Local</th>
            <th style="text-align:right">Total</th><th>Estado</th></tr></thead>
          <tbody>${os.map(o => `<tr style="cursor:pointer" data-o="${o.id}">
            <td><b>${UI.esc(o.numero)}</b></td><td class="muted">${UI.esc(o.fecha)}</td>
            <td>${UI.esc(o.cliente)}</td><td>${UI.esc(o.vendedor)}</td><td class="muted">${UI.esc(o.local)}</td>
            <td style="text-align:right" class="tnum"><b>${UI.pesos(o.total)}</b></td>
            <td>${UI.estado(global.DB.ESTADO_ORDEN, o.estado)}</td></tr>`).join('')}</tbody></table></div>`
          : UI.vacio('No hay órdenes para esa búsqueda.');
        cont.querySelectorAll('[data-o]').forEach(tr => tr.onclick = () =>
          UI.aviso('Detalle de la orden: próximo paso', 'info'));
      } catch (e) { cont.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
    },
  };
  global.Ordenes = Ordenes;
})(typeof window !== 'undefined' ? window : globalThis);
