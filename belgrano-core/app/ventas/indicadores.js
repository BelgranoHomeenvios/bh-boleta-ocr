// =====================================================================
//  Belgrano Soft · Ventas · Indicadores
//  El mes por vendedor: lo vendido, lo cobrado, el ticket y cuánto
//  convierte. Y el tablero por canal, que junta el CRM con la plata:
//  cuánto vendió Instagram contra cuánto vendió la publicidad.
// =====================================================================
(function (global) {
  const Ind = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      const filas = DB.indicadoresVentas();
      const canales = DB.tableroCanal();
      const totV = filas.reduce((a, f) => a + f.total, 0);

      const v = document.getElementById(mount);
      v.innerHTML = `
        ${UI.head('Ventas', 'Indicadores',
          'El mes por vendedor, y cuánto vendió cada canal')}

        <div class="cx-b"><div class="cx-b-h">Por vendedor</div>
        <div class="card cx-tabla"><table>
          <thead><tr><th>Vendedor</th><th class="num">Boletas</th><th class="num">Vendido</th>
            <th class="num">Ticket</th><th class="num">Cobrado</th><th class="num">Por cobrar</th>
            <th class="num">Consultas</th><th class="num">Convierte</th><th class="num">Vencidas</th></tr></thead>
          <tbody>${filas.map(f => `<tr>
            <td class="nom">${UI.esc(f.vendedor)}</td>
            <td class="num">${f.boletas}</td>
            <td class="num nom">${UI.pesos(f.total)}</td>
            <td class="num muted">${UI.pesos(f.ticket)}</td>
            <td class="num">${UI.pesos(f.cobrado)}</td>
            <td class="num ${f.porCobrar ? 'sube' : 'muted'}">${UI.pesos(f.porCobrar)}</td>
            <td class="num muted">${f.consultas}</td>
            <td class="num nom">${f.conv}%</td>
            <td class="num ${f.vencidas ? 'sube' : 'muted'}">${f.vencidas}</td>
          </tr>`).join('')}
          <tr class="cx-tot"><td>Total</td>
            <td class="num">${filas.reduce((a, f) => a + f.boletas, 0)}</td>
            <td class="num">${UI.pesos(totV)}</td><td></td>
            <td class="num">${UI.pesos(filas.reduce((a, f) => a + f.cobrado, 0))}</td>
            <td class="num">${UI.pesos(filas.reduce((a, f) => a + f.porCobrar, 0))}</td>
            <td colspan="3"></td></tr>
          </tbody></table></div>
        <div class="hint">Convierte = concretadas sobre consultas, del CRM. El que recibe 100
          consultas y cierra 20 es mejor que el que recibe 300 y cierra 25.</div></div>

        <div class="cx-b"><div class="cx-b-h">Por canal — el CRM y la plata, juntos</div>
        ${canales.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Canal</th><th class="num">Consultas</th><th class="num">Concretadas</th>
            <th class="num">Convierte</th><th class="num">Vendido</th><th class="num">Ticket</th></tr></thead>
          <tbody>${canales.map(c => `<tr>
            <td class="nom">${UI.esc(c.label)}</td>
            <td class="num">${c.consultas}</td>
            <td class="num">${c.concret}</td>
            <td class="num">${c.conv}%</td>
            <td class="num nom">${UI.pesos(c.plata)}</td>
            <td class="num muted">${c.ticket ? UI.pesos(c.ticket) : '—'}</td>
          </tr>`).join('')}</tbody></table></div>
        <div class="hint">Esto es lo que antes no se podía saber: el canal vivía en el CRM y la
          plata en Ventas. Con esto se decide dónde poner la publicidad.</div>`
          : '<div class="hint">Todavía no hay consultas con canal cargado.</div>'}</div>`
        + (global.ComprasEstilos ? global.ComprasEstilos() : '');
    },
  };
  global.VentasIndicadores = Ind;
})(typeof window !== 'undefined' ? window : globalThis);
