// =====================================================================
//  Belgrano Soft · Logística · Mi ruta (el chofer)
//  El rol más acotado y el más importante de acotar: anda con el
//  teléfono en la calle. Ve sus paradas de hoy —domicilio, teléfono,
//  muebles, cuánto cobrar— y marca la entrega. Nada más.
// =====================================================================
(function (global) {
  const Ruta = {
    _mount: 'view',
    // En el demo el chofer es Marcos; con el login real sale del usuario.
    choferId: 1,
    hecho: null,

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      const ch = DB.chofer(this.choferId) || {};
      const hoy = DB.hoyCorto();
      const ruta = DB.rutaDelDia(this.choferId, hoy);
      const v = document.getElementById(mount);
      v.innerHTML = `
        ${UI.head('Mi ruta', `Hoy · ${UI.esc(hoy)}`,
          `${UI.esc(ch.nombre || '')} — ${ruta.length} parada${ruta.length === 1 ? '' : 's'}`)}
        ${this.hecho ? `<div class="rt-hecho">${UI.esc(this.hecho)}</div>` : ''}
        ${ruta.length ? ruta.map((r, i) => `
          <div class="card pad rt-parada">
            <div class="rt-n">${i + 1}</div>
            <div class="rt-datos">
              <b>${UI.esc(r.cliente)}</b>
              ${r.domicilio ? `<span>${UI.esc(r.domicilio.dir)} — ${UI.esc(r.domicilio.localidad)}${
                r.domicilio.escalera ? ' · <b>hay escalera</b>' : ''}</span>
                <a class="lnk" href="tel:${UI.esc(r.domicilio.telefono || '')}">${
                  UI.esc(r.domicilio.telefono || '')}</a>` : '<span>Retira por el local</span>'}
              <span class="muted">${r.muebles.map(UI.esc).join(' · ')}</span>
            </div>
            <div class="rt-cobrar">
              <span>Cobrar</span>
              <b>${UI.pesos(r.cobrar.total)}</b>
              <button class="b-x hacer" data-entregue="${UI.esc(r.numero)}">Entregué</button>
            </div>
          </div>`).join('')
          : '<div class="hint">No tenés paradas hoy.</div>'}
        <div class="hint">Al marcar la entrega, la plata queda para rendir cuando vuelvas.</div>
        <style>
          .rt-parada{display:flex;gap:14px;align-items:center;margin-bottom:10px}
          .rt-n{flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:var(--navy);color:#fff;
            display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}
          .rt-datos{flex:1;display:flex;flex-direction:column;gap:3px;font-size:13px}
          .rt-cobrar{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
          .rt-cobrar span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;
            color:var(--muted);font-weight:700}
          .rt-cobrar b{font-size:18px;color:var(--navy)}
          .rt-hecho{border:1px solid var(--ok);background:var(--ok-bg);color:var(--ok);
            border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:600;margin-bottom:12px}
          @media (max-width:640px){ .rt-parada{flex-direction:column;align-items:flex-start}
            .rt-cobrar{align-items:flex-start} }
        </style>`;
      document.querySelectorAll('[data-entregue]').forEach(b => b.onclick = () => {
        const quienR = prompt('¿Quién recibió el mueble?') || '';
        const ch2 = global.DB.chofer(this.choferId) || {};
        const r = global.DB.entregadaEntrega(b.dataset.entregue,
          { quienRecibio: quienR, quien: ch2.nombre || 'chofer' });
        this.hecho = r.error ? r.error
          : `${b.dataset.entregue} entregada. La plata se rinde cuando vuelvas.`;
        this.render(this._mount);
      });
    },
  };
  global.LogRuta = Ruta;
})(typeof window !== 'undefined' ? window : globalThis);
