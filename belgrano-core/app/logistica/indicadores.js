// =====================================================================
//  Belgrano Soft · Logística · Indicadores y zonas
//  Cuánto se entregó, cuánta plata se rindió, qué diferencias hubo y a
//  qué zonas se va. El "mapa" es esto: la carga por zona, que es lo que
//  decide el recorrido — un mapa de verdad necesita datos reales.
// =====================================================================
(function (global) {
  const Ind = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      const ind = DB.indicadoresLogistica();
      const es = DB.entregas();

      // La carga por zona: adónde se está yendo y con cuánta plata.
      const zonas = new Map();
      es.forEach(e => {
        const z = e.retira ? 'Retiro por el local' : (e.o.domicilio || {}).zona || 'Sin zona';
        if (!zonas.has(z)) zonas.set(z, { n: 0, muebles: 0, plata: 0, localidades: new Set() });
        const x = zonas.get(z);
        x.n++; x.muebles += Number(e.o.items) || 1; x.plata += e.puerta.total;
        if (e.o.domicilio) x.localidades.add(e.o.domicilio.localidad);
      });

      const v = document.getElementById(mount);
      v.innerHTML = `
        ${UI.head('Logística', 'Indicadores',
          'Lo entregado, lo rendido, las diferencias y las zonas')}

        <div class="cx-kpis">
          <div class="cx-k"><span class="cx-k-t">Entregas</span>
            <span class="cx-k-v">${ind.total}</span>
            <span class="cx-k-p">${ind.retiros} retiran por el local</span></div>
          <div class="cx-k"><span class="cx-k-t">Plata rendida</span>
            <span class="cx-k-v">${UI.pesos(ind.rendido)}</span>
            <span class="cx-k-p">de las entregas cerradas</span></div>
          <div class="cx-k ${ind.diferencias ? 'alerta' : ''}"><span class="cx-k-t">Diferencias</span>
            <span class="cx-k-v">${UI.pesos(ind.diferencias)}</span>
            <span class="cx-k-p">cada una con su motivo</span></div>
          <div class="cx-k"><span class="cx-k-t">Pagado a fletes</span>
            <span class="cx-k-v">${UI.pesos(ind.fletes)}</span>
            <span class="cx-k-p">entró a Gastos</span></div>
        </div>

        <div class="cx-b"><div class="cx-b-h">Por estado</div>
        <div class="card cx-tabla"><table><tbody>
          ${ind.porEstado.map(x => `<tr>
            <td class="nom">${UI.esc(x.label)}</td>
            <td class="num">${x.n}</td>
            <td class="muted" style="width:60%"><div class="in-bar"><span style="width:${
              ind.total ? Math.round(x.n / ind.total * 100) : 0}%"></span></div></td>
          </tr>`).join('')}</tbody></table></div></div>

        <div class="cx-b"><div class="cx-b-h">Por zona — lo que decide el recorrido</div>
        <div class="card cx-tabla"><table>
          <thead><tr><th>Zona</th><th>Localidades</th><th class="num">Entregas</th>
            <th class="num">Muebles</th><th class="num">A cobrar</th></tr></thead>
          <tbody>${[...zonas.entries()].sort((a, b) => b[1].plata - a[1].plata)
            .map(([z, x]) => `<tr>
            <td class="nom">${UI.esc(z)}</td>
            <td class="muted">${[...x.localidades].map(UI.esc).join(' · ') || '—'}</td>
            <td class="num">${x.n}</td>
            <td class="num">${x.muebles}</td>
            <td class="num nom">${UI.pesos(x.plata)}</td>
          </tr>`).join('')}</tbody></table></div></div>

        <div class="cx-b"><div class="cx-b-h">Por chofer</div>
        <div class="card cx-tabla"><table>
          <thead><tr><th>Chofer</th><th class="num">Entregas</th><th class="num">Muebles</th></tr></thead>
          <tbody>${ind.porChofer.map(x => `<tr>
            <td class="nom">${UI.esc(x.chofer.nombre)}</td>
            <td class="num">${x.entregas}</td>
            <td class="num">${x.muebles}</td>
          </tr>`).join('')}</tbody></table></div></div>`
        + (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
          .in-bar{background:var(--panel-2);border-radius:6px;height:10px;overflow:hidden}
          .in-bar span{display:block;height:100%;background:var(--brand);border-radius:6px}
        </style>`;
    },
  };
  global.LogIndicadores = Ind;
})(typeof window !== 'undefined' ? window : globalThis);
