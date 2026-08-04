// =====================================================================
//  Belgrano Soft · Logística · Agenda y ruta
//  Qué sale cada día y con quién, y la ruta del chofer: SOLO lo suyo de
//  hoy —domicilio, teléfono, muebles, cuánto cobrar—. El chofer anda con
//  el teléfono en la calle: cuanto menos vea, mejor.
// =====================================================================
(function (global) {
  const Ag = {
    _mount: 'view',
    dias: 7,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    // Los próximos días con algo coordinado, más los que tienen fecha de
    // entrega prometida sin coordinar todavía.
    diasConCarga() {
      const DB = global.DB;
      const dias = new Map();
      DB.entregas().forEach(e => {
        const f = e.log.fecha || (e.log.estado === 'por_completar' ? e.o.entrega : '');
        if (!f) return;
        if (!dias.has(f)) dias.set(f, []);
        dias.get(f).push(e);
      });
      // En orden de calendario: lo viejo arriba (rendiciones que faltan) y
      // después lo que viene.
      return [...dias.entries()].sort((a, b) =>
        (DB.diasHasta(a[0]) ?? 0) - (DB.diasHasta(b[0]) ?? 0));
    },

    html() {
      const DB = global.DB;
      const dias = this.diasConCarga();
      return `
        ${UI.head('Logística', 'Agenda',
          'Qué sale cada día, con quién, y cuánta carga tiene cada chofer')}

        <div class="cx-kpis">
          ${DB.choferes().map(ch => {
            const hoy = DB.cargaChofer(ch.id, DB.hoyCorto());
            return `<div class="cx-k"><span class="cx-k-t">${UI.esc(ch.nombre)} hoy</span>
              <span class="cx-k-v">${hoy.muebles}<span style="font-size:13px;color:var(--muted)"
                >/${ch.cupoDia}</span></span>
              <span class="cx-k-p">${UI.esc(ch.tipo === 'flete' ? 'flete tercero' : 'propio')} ·
                ${hoy.entregas} entrega${hoy.entregas === 1 ? '' : 's'}</span></div>`;
          }).join('')}
        </div>

        ${dias.length ? dias.map(([f, es]) => `
          <div class="cx-b"><div class="cx-b-h">${UI.esc(f)}${
            f === DB.hoyCorto() ? ' — hoy' : ''}</div>
          <div class="card cx-tabla"><table><tbody>
            ${es.map(e => {
              const est = DB.estadoEntrega(e.log.estado);
              const ch = e.log.choferId ? DB.chofer(e.log.choferId) : null;
              return `<tr class="${e.log.estado === 'por_completar' ? 'ojo' : ''}">
                <td class="nom">${UI.esc(e.o.numero)}</td>
                <td class="nom">${UI.esc(e.o.cliente)}</td>
                <td class="muted">${e.retira ? 'retira por el local'
                  : e.o.domicilio ? `${UI.esc(e.o.domicilio.localidad)} · ${
                    UI.esc(e.o.domicilio.zona || '')}` : ''}</td>
                <td class="muted">${e.log.franja === 'tarde' ? 'tarde' : 'mañana'}</td>
                <td class="muted">${ch ? UI.esc(ch.nombre) : e.retira ? '—' : 'sin chofer'}</td>
                <td class="num">${UI.pesos(e.puerta.total)}</td>
                <td><span class="pill ${est.pill}">${e.log.estado === 'por_completar'
                  ? 'prometida, sin coordinar' : UI.esc(est.label)}</span></td>
              </tr>`;
            }).join('')}
          </tbody></table></div></div>`).join('')
          : '<div class="hint">No hay nada coordinado ni prometido con fecha.</div>'}

        <div class="cx-b"><div class="cx-b-h">La ruta del chofer — lo único que ve en la calle</div>
          <div class="row" style="gap:8px;margin-bottom:8px">
            <select id="ag-ch">${DB.choferes().map(ch =>
              `<option value="${ch.id}">${UI.esc(ch.nombre)}</option>`).join('')}</select>
            <input id="ag-f" placeholder="dd/mm" value="${UI.esc(DB.hoyCorto())}" style="width:90px">
            <button class="b-x" id="ag-ver">Ver ruta</button>
          </div>
          <div id="ag-ruta"></div>
        </div>`;
    },

    pintarRuta() {
      const DB = global.DB;
      const ch = Number((document.getElementById('ag-ch') || {}).value) || DB.choferes()[0].id;
      const f = (document.getElementById('ag-f') || {}).value || DB.hoyCorto();
      const ruta = DB.rutaDelDia(ch, f);
      document.getElementById('ag-ruta').innerHTML = ruta.length ? ruta.map((r, i) => `
        <div class="card pad ag-parada">
          <b>${i + 1} · ${UI.esc(r.cliente)}</b>
          ${r.domicilio ? `<span>${UI.esc(r.domicilio.dir)} — ${UI.esc(r.domicilio.localidad)}${
            r.domicilio.escalera ? ' · <b>escalera</b>' : ''}</span>
            <span class="muted">${UI.esc(r.domicilio.telefono || '')}</span>` : ''}
          <span class="muted">${r.muebles.map(UI.esc).join(' · ')}</span>
          <b class="ag-cobrar">Cobrar: ${UI.pesos(r.cobrar.total)}</b>
        </div>`).join('')
        : '<div class="hint">Ese chofer no tiene nada ese día.</div>';
    },

    enganchar() {
      const v = document.getElementById('ag-ver');
      if (v) v.onclick = () => this.pintarRuta();
      this.pintarRuta();
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .ag-parada{display:flex;flex-direction:column;gap:3px;font-size:12.5px;margin-bottom:8px}
        .ag-cobrar{color:var(--navy);font-size:14px}
      </style>`;
    },
  };
  global.LogAgenda = Ag;
})(typeof window !== 'undefined' ? window : globalThis);
