// =====================================================================
//  Belgrano Soft · Compras · Comparador de precios
//  El mismo mueble, lo que cobra cada taller. Al costado, la lista de
//  Costeo —la que se usa hoy para poner precio de venta— como vara: si
//  uno se fue muy arriba se ve de una, y si otro está muy abajo también,
//  que a veces es peor señal.
// =====================================================================
(function (global) {
  const Comp = {
    _mount: 'view',
    abierta: null,
    q: '',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    // Las variantes que valen la pena mirar: las que tienen precio de más
    // de un taller. Con uno solo no hay nada que comparar.
    filas() {
      const t = String(this.q || '').toLowerCase();
      return global.DB.variantesComparables()
        .map(vid => {
          const c = global.DB.compararVariante(vid);
          const nombre = global.DB.nombreVariante(vid);
          const v = (global.DB.variantesTodas() || []).find(x => x.id === vid);
          return { vid, nombre, v, ...c,
            brecha: c.peor && c.mejor ? c.peor.precio - c.mejor.precio : 0 };
        })
        .filter(f => !t || f.nombre.toLowerCase().includes(t))
        .sort((a, b) => b.brecha - a.brecha);
    },

    html() {
      const fs = this.filas();
      const conBrecha = fs.filter(f => f.brecha > 0);
      const plata = conBrecha.reduce((a, f) => a + f.brecha, 0);
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Comparador de precios</h1>
            <div class="h-sub">${fs.length} muebles que hace más de un taller ·
              ${conBrecha.length} con diferencia de precio</div></div>
          <div class="sp"></div>
          <input id="cx-q" class="cx-buscar" placeholder="Buscar un mueble" value="${UI.esc(this.q)}">
        </div>

        <div class="cx-kpis">
          ${this.kpi('Comparables', fs.length, 'los hace más de uno')}
          ${this.kpi('Con diferencia', conBrecha.length,
            conBrecha.length ? 'vale mirarlos' : 'todos cobran parecido')}
          ${this.kpi('Diferencia acumulada', UI.pesos(plata),
            'entre el más barato y el más caro, mueble por mueble')}
        </div>

        ${fs.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Mueble</th><th>Terminación</th><th>Talleres</th>
            <th class="num">Más barato</th><th class="num">Más caro</th>
            <th class="num">Diferencia</th><th class="num">Costeo</th></tr></thead>
          <tbody>${fs.map(f => `<tr class="cliq ${f.brecha > 0 ? 'ojo' : ''}"
            data-vid="${f.vid}">
            <td class="nom">${UI.esc(f.nombre)}</td>
            <td class="muted">${f.v ? UI.esc(`${f.v.estructura || ''} · ${f.v.frente || ''}`) : '—'}</td>
            <td>${f.filas.length}</td>
            <td class="num"><b class="baja">${UI.pesos(f.mejor.precio)}</b>
              <span class="muted"> ${UI.esc(f.mejor.proveedor)}</span></td>
            <td class="num"><b class="sube">${UI.pesos(f.peor.precio)}</b>
              <span class="muted"> ${UI.esc(f.peor.proveedor)}</span></td>
            <td class="num nom">${f.brecha ? UI.pesos(f.brecha) : '—'}</td>
            <td class="num muted">${f.costeo ? UI.pesos(f.costeo.costo) : '—'}</td>
          </tr>${this.abierta === f.vid ? this.detalle(f) : ''}`).join('')}</tbody></table></div>`
          : UI.vacio('Todavía no hay ningún mueble con precio de dos talleres distintos.')}

        <div class="hint" style="margin-top:10px">La columna <b>Costeo</b> es la lista con la que se
          arma el precio de venta. Un taller muy por encima de esa cifra se está comiendo el margen;
          uno muy por debajo puede estar cotizando otra cosa.</div>`;
    },

    // La fila abierta: cada taller con su precio, desde cuándo, y cuánto se
    // aparta de Costeo.
    detalle(f) {
      return `<tr class="cx-det"><td colspan="7"><div class="cx-det-b">
        ${f.filas.map(x => {
          const pct = f.costeo ? Math.round((x.dif / f.costeo.costo) * 100) : null;
          return `<div class="cx-det-f">
            <span class="cx-av">${UI.esc(this.inicial(x.proveedor))}</span>
            <span class="cx-det-n"><b>${UI.esc(x.proveedor)}</b>
              <span class="muted">${UI.esc((global.DB.rubro(x.rubro) || {}).label || x.rubro)}${
                x.desde ? ` · desde el ${UI.esc(x.desde)}` : ''}</span></span>
            <span class="sp"></span>
            <b class="cx-det-p">${UI.pesos(x.precio)}</b>
            ${pct == null ? '' : `<span class="pill ${pct > 5 ? 'crit' : (pct < -5 ? 'warn' : 'ok')}">${
              pct > 0 ? '+' : ''}${pct}% vs Costeo</span>`}
          </div>`;
        }).join('')}
        ${f.costeo ? `<div class="hint">Costeo: ${UI.pesos(f.costeo.costo)} ·
          ${UI.esc(f.costeo.terminacion)} ${UI.esc(f.costeo.medida)}${
          f.costeo.exacta ? '' : ' <b>(la medida más parecida, no la exacta)</b>'}</div>`
          : '<div class="hint">Este mueble no tiene fila en la lista de Costeo.</div>'}
      </div></td></tr>`;
    },

    inicial(nombre) {
      const m = /[a-záéíóúñ]/i.exec(String(nombre || ''));
      return (m ? m[0] : String(nombre || '?')[0] || '?').toUpperCase();
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v">${v}</span><span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-vid]').forEach(tr => tr.onclick = () => {
        const v = Number(tr.dataset.vid);
        this.abierta = this.abierta === v ? null : v;
        this.render(this._mount);
      });
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
        .cx-det td{background:var(--panel-2);white-space:normal}
        .cx-det-b{display:flex;flex-direction:column;gap:6px;padding:4px 0}
        .cx-det-f{display:flex;gap:9px;align-items:center}
        .cx-det-n{display:flex;flex-direction:column;line-height:1.2}
        .cx-det-n b{font-size:12.5px;color:var(--navy)}
        .cx-det-n .muted{font-size:10.5px}
        .cx-det-p{font-size:14px;color:var(--navy)}
      </style>`;
    },
  };
  global.ComprasComparador = Comp;
})(typeof window !== 'undefined' ? window : globalThis);
