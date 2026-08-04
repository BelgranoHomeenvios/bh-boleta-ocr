// =====================================================================
//  Belgrano Soft · Compras · Lista de precios
//  La lista la arma Dirección, no Compras: el proveedor rara vez pasa una
//  planilla, y cuando aumenta lo dice de una —"todo un 12% más"—. Por eso
//  hay un botón para eso. Lo que no puede perderse nunca es el precio
//  viejo: sin él no hay manera de saber cuánto subió un mueble ni de
//  dónde se fue el margen.
// =====================================================================
(function (global) {
  const Lista = {
    _mount: 'view',
    prov: null,
    q: '',
    abierta: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    html() {
      const provs = global.DB.proveedores().map(p => ({ p,
        n: global.DB.listaPrecios().filter(x => x.provId === p.id).length,
        aum: global.DB.aumentoDe(p.id) }))
        .filter(x => x.n > 0);
      if (!this.prov && provs.length) this.prov = provs[0].p.id;
      const p = global.DB.proveedor(this.prov);
      const t = String(this.q || '').toLowerCase();
      const filas = global.DB.listaPrecios().filter(x => x.provId === this.prov)
        .map(x => {
          const c = global.DB.costeoDe(x.varianteId);
          const v = (global.DB.variantesTodas() || []).find(y => y.id === x.varianteId);
          return { ...x, costeo: c, v, nombre: global.DB.nombreVariante(x.varianteId),
            cambios: global.DB.cambiosDePrecio(x.provId, x.varianteId) };
        })
        .filter(f => !t || f.nombre.toLowerCase().includes(t))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const aum = this.prov ? global.DB.aumentoDe(this.prov) : null;
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Lista de precios</h1>
            <div class="h-sub">Lo que nos cobra cada taller, y cuánto se movió</div></div>
          <div class="sp"></div>
          <input id="cx-q" class="cx-buscar" placeholder="Buscar un mueble" value="${UI.esc(this.q)}">
        </div>

        <div class="cx-filtros">
          ${provs.map(x => `<button class="cx-f ${this.prov === x.p.id ? 'on' : ''}"
            data-prov="${x.p.id}">${UI.esc(x.p.nombre)}
            <span class="muted">${x.n}</span></button>`).join('')}
        </div>

        ${p ? `<div class="card pad cx-aum">
          <div>
            <div class="cx-b-h" style="margin:0">${UI.esc(p.nombre)}</div>
            <div class="hint">${filas.length} muebles con precio${aum
              ? ` · último aumento del <b>${Math.round(aum.pct)}%</b> el ${UI.esc(aum.ultimo)}`
              : ' · todavía no pasó ningún aumento'}</div>
          </div>
          <div class="sp"></div>
          <label class="fld" style="margin:0"><span class="lbl">Pasó un aumento del</span>
            <div class="cx-aum-in"><input id="cx-pct" type="number" step="0.5" placeholder="12">
              <span>%</span></div></label>
          <button class="btn primary" id="cx-aplicar">Aplicar a toda su lista</button>
        </div>` : ''}

        ${filas.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Mueble</th><th>Terminación</th><th class="num">Precio</th>
            <th class="num">Costeo</th><th class="num">Dif.</th>
            <th>Desde</th><th>Cambios</th></tr></thead>
          <tbody>${filas.map(f => {
            const d = f.costeo ? f.precio - f.costeo.costo : null;
            const ab = this.abierta === f.varianteId;
            return `<tr class="cliq" data-vid="${f.varianteId}">
              <td class="nom">${UI.esc(f.nombre)}</td>
              <td class="muted">${f.v ? UI.esc(`${f.v.estructura || ''} · ${f.v.frente || ''}`) : '—'}</td>
              <td class="num nom">${UI.pesos(f.precio)}</td>
              <td class="num muted">${f.costeo ? UI.pesos(f.costeo.costo) : '—'}</td>
              <td class="num ${d == null ? '' : (d > 0 ? 'sube' : 'baja')}">${d == null ? '—'
                : `${d > 0 ? '+' : ''}${UI.pesos(d)}`}</td>
              <td class="muted">${UI.esc(f.desde || '—')}</td>
              <td>${f.cambios.length ? `<span class="pill soft">${f.cambios.length}</span>`
                : '<span class="muted">—</span>'}</td>
            </tr>${ab ? this.htmlCambios(f) : ''}`;
          }).join('')}</tbody></table></div>`
          : UI.vacio('Este taller todavía no tiene ningún precio cargado.')}

        <div class="hint" style="margin-top:10px">El precio se carga solo la primera vez que se
          conforma una entrega suya. Los aumentos se cargan acá, y cada cambio queda anotado con
          la fecha: eso es lo que después dice si la rentabilidad bajó porque vendemos peor o
          porque nos aumentaron.</div>`;
    },

    // La historia de un mueble: cada aumento con su fecha y su porcentaje.
    htmlCambios(f) {
      if (!f.cambios.length) {
        return `<tr class="cx-det"><td colspan="7"><div class="hint">Este precio nunca cambió
          desde que se cargó.</div></td></tr>`;
      }
      const primero = f.cambios[f.cambios.length - 1];
      const total = primero.antes ? ((f.precio - primero.antes) / primero.antes) * 100 : null;
      return `<tr class="cx-det"><td colspan="7"><div class="cx-hist">
        ${f.cambios.map(c => `<div class="cx-hist-f">
          <b>${UI.esc(c.desde)}</b>
          <span class="muted">${UI.pesos(c.antes)} →</span>
          <b>${UI.pesos(c.precio)}</b>
          ${c.pct == null ? '' : `<span class="pill ${c.pct > 0 ? 'warn' : 'ok'}">${
            c.pct > 0 ? '+' : ''}${Math.round(c.pct)}%</span>`}
          <span class="muted">lo cargó ${UI.esc(c.quien)}</span>
        </div>`).join('')}
        ${total == null ? '' : `<div class="hint">Desde el ${UI.esc(primero.desde)} aumentó
          <b>${Math.round(total)}%</b> en total.</div>`}
      </div></td></tr>`;
    },

    enganchar() {
      document.querySelectorAll('[data-prov]').forEach(b => b.onclick = () => {
        this.prov = Number(b.dataset.prov); this.abierta = null; this.render(this._mount);
      });
      document.querySelectorAll('[data-vid]').forEach(tr => tr.onclick = () => {
        const v = Number(tr.dataset.vid);
        this.abierta = this.abierta === v ? null : v;
        this.render(this._mount);
      });
      const ap = document.getElementById('cx-aplicar');
      if (ap) ap.onclick = () => {
        const pct = Number(document.getElementById('cx-pct').value) || 0;
        if (!pct) return UI.aviso('Poné el porcentaje del aumento', 'warn');
        const p = global.DB.proveedor(this.prov);
        if (!confirm(`¿Aumentar un ${pct}% toda la lista de ${p.nombre}?`)) return;
        const n = global.DB.aumentarProveedor(this.prov, pct, 'Brian');
        UI.aviso(`${n} precios aumentados un ${pct}%`, 'ok');
        this.render(this._mount);
      };
      const q = document.getElementById('cx-q');
      if (q) q.oninput = () => {
        this.q = q.value;
        const pos = q.selectionStart;
        this.render(this._mount);
        const n = document.getElementById('cx-q');
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      };
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cx-aum{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}
        .cx-aum-in{display:flex;align-items:center;gap:5px}
        .cx-aum-in input{width:84px}
        .cx-det td{background:var(--panel-2);white-space:normal}
        .cx-hist{display:flex;flex-direction:column;gap:5px;padding:4px 0}
        .cx-hist-f{display:flex;gap:9px;align-items:center;font-size:12.5px}
        .cx-hist-f b{color:var(--navy)}
      </style>`;
    },
  };
  global.ComprasLista = Lista;
})(typeof window !== 'undefined' ? window : globalThis);
