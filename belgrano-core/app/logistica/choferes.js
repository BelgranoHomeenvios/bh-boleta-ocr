// =====================================================================
//  Belgrano Soft · Logística · Choferes y vehículos
//  Quiénes manejan, con qué, cuánto les entra por día y qué hicieron.
//  El flete tercero cobra por viaje y eso va a Gastos cuando se rinde.
// =====================================================================
(function (global) {
  const Ch = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      const ind = DB.indicadoresLogistica();
      const v = document.getElementById(mount);
      v.innerHTML = `
        ${UI.head('Logística', 'Choferes y vehículos',
          'Quién maneja, con qué, y cuánta carga le entra por día')}

        <div class="cx-b"><div class="cx-b-h">Choferes</div>
        <div class="card cx-tabla"><table>
          <thead><tr><th>Chofer</th><th>Tipo</th><th>Teléfono</th><th>Vehículo</th>
            <th class="num">Cupo por día</th><th class="num">Hoy</th>
            <th class="num">Entregas hechas</th><th class="num">Cobra por viaje</th></tr></thead>
          <tbody>${DB.choferes().map(ch => {
            const ve = DB.vehiculos().find(x => x.id === ch.vehiculoId) || {};
            const hoy = DB.cargaChofer(ch.id, DB.hoyCorto());
            const hechas = (ind.porChofer.find(x => x.chofer.id === ch.id) || {});
            return `<tr>
              <td class="nom">${UI.esc(ch.nombre)}</td>
              <td class="muted">${ch.tipo === 'flete' ? 'Flete tercero' : 'Propio'}</td>
              <td class="muted">${UI.esc(ch.telefono || '')}</td>
              <td class="muted">${UI.esc(ve.nombre || '—')}${ve.estado === 'taller'
                ? ' <span class="sube">⚠ en el taller</span>' : ''}</td>
              <td class="num">${ch.cupoDia}</td>
              <td class="num ${hoy.muebles >= ch.cupoDia ? 'sube' : ''}">${hoy.muebles}</td>
              <td class="num muted">${hechas.entregas || 0}</td>
              <td class="num muted">${ch.costoViaje ? UI.pesos(ch.costoViaje) : '—'}</td>
            </tr>`;
          }).join('')}</tbody></table></div></div>

        <div class="cx-b"><div class="cx-b-h">Vehículos</div>
        <div class="card cx-tabla"><table>
          <thead><tr><th>Vehículo</th><th>Patente</th><th class="num">Capacidad</th>
            <th>Estado</th></tr></thead>
          <tbody>${DB.vehiculos().map(ve => `<tr class="${ve.estado === 'taller' ? 'ojo' : ''}">
            <td class="nom">${UI.esc(ve.nombre)}</td>
            <td class="muted">${UI.esc(ve.patente)}</td>
            <td class="num">${ve.capacidad} muebles</td>
            <td>${ve.estado === 'taller' ? '<span class="pill warn">En el taller</span>'
              : '<span class="pill ok">Anda</span>'}</td>
          </tr>`).join('')}</tbody></table></div></div>

        <div class="hint">El alta y la edición de choferes y vehículos van con el login real:
          hoy son datos del demo. Lo que sí es de verdad es la cuenta: la carga de hoy y las
          entregas hechas salen de las entregas coordinadas y rendidas.</div>`
        + (global.ComprasEstilos ? global.ComprasEstilos() : '');
    },
  };
  global.LogChoferes = Ch;
})(typeof window !== 'undefined' ? window : globalThis);
