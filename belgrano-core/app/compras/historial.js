// =====================================================================
//  Belgrano Soft · Compras · Historial
//  Todo lo comprado en una sola lista. Los muebles y los insumos son dos
//  circuitos distintos —uno nace en Producción, el otro en una orden de
//  compra— pero es una sola plata, y cuando hay que buscar "qué le
//  compramos a Vicente en junio" nadie quiere elegir primero la solapa.
// =====================================================================
(function (global) {
  const Hist = {
    _mount: 'view',
    tipo: '',
    prov: '',
    q: '',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    filas() {
      const t = String(this.q || '').toLowerCase();
      return global.DB.historialCompras()
        .filter(f => !this.tipo || f.tipo === this.tipo)
        .filter(f => !this.prov || f.proveedor === this.prov)
        .filter(f => !t || `${f.numero} ${f.proveedor} ${f.detalle}`.toLowerCase().includes(t));
    },

    html() {
      const fs = this.filas();
      const todas = global.DB.historialCompras();
      const provs = [...new Set(todas.map(f => f.proveedor))].sort();
      const total = fs.reduce((a, f) => a + f.total, 0);
      const flete = fs.reduce((a, f) => a + f.flete, 0);
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Historial</h1>
            <div class="h-sub">${fs.length} de ${todas.length} compras ·
              ${UI.pesos(total)}${flete ? ` · ${UI.pesos(flete)} de flete adentro` : ''}</div></div>
          <div class="sp"></div>
          <input id="cx-q" class="cx-buscar" placeholder="Buscar" value="${UI.esc(this.q)}">
        </div>

        <div class="cx-filtros">
          <button class="cx-f ${!this.tipo ? 'on' : ''}" data-tipo="">Todo
            <span class="muted">${todas.length}</span></button>
          <button class="cx-f ${this.tipo === 'muebles' ? 'on' : ''}" data-tipo="muebles">Muebles
            <span class="muted">${todas.filter(f => f.tipo === 'muebles').length}</span></button>
          <button class="cx-f ${this.tipo === 'insumos' ? 'on' : ''}" data-tipo="insumos">Insumos
            <span class="muted">${todas.filter(f => f.tipo === 'insumos').length}</span></button>
          <span style="width:10px"></span>
          <button class="cx-f ${!this.prov ? 'on' : ''}" data-prov="">Todos los proveedores</button>
          ${provs.map(p => `<button class="cx-f ${this.prov === p ? 'on' : ''}"
            data-prov="${UI.esc(p)}">${UI.esc(p)}</button>`).join('')}
        </div>

        ${fs.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Fecha</th><th>Número</th><th>Qué</th><th>Proveedor</th>
            <th>Detalle</th><th>Flete</th><th>Conformó</th><th class="num">Total</th></tr></thead>
          <tbody>${fs.map(f => `<tr class="cliq" data-ir="${f.tipo}|${UI.esc(f.numero)}">
            <td class="muted">${UI.esc(f.fecha || '—')}</td>
            <td class="nom">${UI.esc(f.numero)}</td>
            <td><span class="pill ${f.tipo === 'muebles' ? 'soft' : 'ok'}">${f.tipo}</span></td>
            <td>${UI.esc(f.proveedor || '—')}</td>
            <td class="muted">${UI.esc(f.detalle)}</td>
            <td class="muted">${f.flete ? UI.pesos(f.flete) : '—'}</td>
            <td class="muted">${UI.esc(f.quien || '—')}</td>
            <td class="num nom">${UI.pesos(f.total)}</td>
          </tr>`).join('')}
          <tr class="cx-tot"><td colspan="7">Total de lo que se está viendo</td>
            <td class="num">${UI.pesos(total)}</td></tr>
          </tbody></table></div>`
          : UI.vacio('No hay ninguna compra con esos filtros.')}

        <div class="hint" style="margin-top:10px">El total de una entrega de muebles incluye el
          flete cuando se decidió meterlo en la compra. El que se cargó como gasto no está acá:
          ése lo ve Tesorería.</div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => {
        this.tipo = b.dataset.tipo; this.render(this._mount);
      });
      document.querySelectorAll('[data-prov]').forEach(b => b.onclick = () => {
        this.prov = b.dataset.prov; this.render(this._mount);
      });
      document.querySelectorAll('[data-ir]').forEach(tr => tr.onclick = () => {
        const [tipo, num] = tr.dataset.ir.split('|');
        if (tipo === 'muebles') {
          global.ComprasRecepciones.abierta = num;
          global.App.goSub('compras', 'recepciones');
        } else {
          global.ComprasOC.abierta = num;
          global.App.goSub('compras', 'oc');
        }
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

    estilos() { return global.ComprasEstilos ? global.ComprasEstilos() : ''; },
  };
  global.ComprasHistorial = Hist;
})(typeof window !== 'undefined' ? window : globalThis);
