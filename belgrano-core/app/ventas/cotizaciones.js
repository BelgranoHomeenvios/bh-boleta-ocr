// =====================================================================
//  Belgrano Soft · Cotizaciones (listado)
//  Estados: borrador → aceptada (genera orden) · rechazada · vencida.
// =====================================================================
(function (global) {
  const Cotizaciones = {
    texto: '',
    async render(mount = 'view') {
      const v = document.getElementById(mount);
      v.innerHTML = UI.head('Ventas', 'Cotizaciones',
        'Cada vendedor ve las suyas; dirección y gestión ven todas.',
        `<button class="btn primary" id="cz-nueva">+ Nueva cotización</button>`) +
        `<div class="card pad" style="margin-bottom:14px">
           <input id="cz-q" placeholder="Buscar por cliente o N°…" value="${UI.esc(this.texto)}">
         </div>
         <div id="cz-lista">${UI.spinner()}</div>`;
      document.getElementById('cz-nueva').onclick = () => global.App.goSub('ventas', 'nueva');
      const q = document.getElementById('cz-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.texto = q.value.trim(); this.pintar(); }, 200); };
      this.pintar();
    },
    async pintar() {
      const cont = document.getElementById('cz-lista');
      try {
        const cs = await global.DB.cotizaciones({ texto: this.texto });
        cont.innerHTML = cs.length ? `<div class="card"><table>
          <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Local</th>
            <th style="text-align:right">Total</th><th>Estado</th></tr></thead>
          <tbody>${cs.map(c => `<tr style="cursor:pointer" data-c="${c.id}">
            <td><b>${UI.esc(c.numero)}</b></td><td class="muted">${UI.esc(c.fecha)}</td>
            <td>${UI.esc(c.cliente)}</td><td>${UI.esc(c.vendedor)}</td><td class="muted">${UI.esc(c.local)}</td>
            <td style="text-align:right" class="tnum"><b>${UI.pesos(c.total)}</b></td>
            <td>${UI.estado(global.DB.ESTADO_COTIZ, c.estado)}</td></tr>`).join('')}</tbody></table></div>`
          : UI.vacio('No hay cotizaciones para esa búsqueda.');
        cont.querySelectorAll('[data-c]').forEach(tr => tr.onclick = () =>
          UI.aviso('Abrir cotización: próximo paso', 'info'));
      } catch (e) { cont.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
    },
  };
  global.Cotizaciones = Cotizaciones;
})(typeof window !== 'undefined' ? window : globalThis);
