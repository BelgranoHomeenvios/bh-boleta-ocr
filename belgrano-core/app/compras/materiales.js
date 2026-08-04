// =====================================================================
//  Belgrano Soft · Compras · Materiales
//  Llevar el stock de materiales —cuántas placas hay, cuántas cajas de
//  correderas quedan— es la segunda etapa. Lo que hace falta ya es poder
//  anotar que se compró, porque en la planilla la materia prima es un
//  costo del mes y sin eso el número no cierra.
//
//  Por eso esta pantalla anota la plata, no el inventario. La cantidad es
//  opcional: muchas veces se compra "un viaje de placas" y lo que importa
//  es cuánto salió.
// =====================================================================
(function (global) {
  const Mat = {
    _mount: 'view',
    mes: null,
    rubro: '',

    async render(mount = 'view') {
      this._mount = mount;
      if (this.mes == null) this.mes = global.DB.ultimoMesConDatos();
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    MESES: ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
      'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],

    html() {
      const rubros = global.DB.materialPorRubro(this.mes);
      const total = rubros.reduce((a, r) => a + r.total, 0);
      const cs = global.DB.comprasMaterial()
        .filter(c => global.DB.mesDe(c.fecha) === this.mes)
        .filter(c => !this.rubro || c.rubro === this.rubro)
        .sort((a, b) => (global.DB.diasDesde(a.fecha) || 0) - (global.DB.diasDesde(b.fecha) || 0));
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Materiales</h1>
            <div class="h-sub">${UI.esc(this.MESES[this.mes])} ·
              ${UI.pesos(total)} en ${global.DB.materialesDelMes(this.mes).length} compras</div></div>
          <div class="sp"></div>
          <button class="btn primary" id="cm-nuevo">Anotar una compra</button>
          <div class="cx-nav" style="margin-left:8px">
            <button class="b-x" id="cm-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes])}</b>
            <button class="b-x" id="cm-sig">›</button>
          </div>
        </div>

        <div class="cx-kpis">
          ${global.DB.RUBROS_MATERIAL.map(r => {
            const x = rubros.find(y => y.k === r.k);
            const pct = total && x ? Math.round((x.total / total) * 100) : 0;
            return `<button class="cx-k cm-k ${this.rubro === r.k ? 'on' : ''}"
              data-rubro="${r.k}">
              <span class="cx-k-t">${UI.esc(r.label)}</span>
              <span class="cx-k-v" style="font-size:18px">${UI.pesos(x ? x.total : 0)}</span>
              <span class="cx-k-p">${x ? `${pct}% · ${x.n} compras` : 'nada este mes'}</span>
            </button>`;
          }).join('')}
        </div>

        ${cs.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Fecha</th><th>Qué</th><th>A quién</th><th class="num">Cantidad</th>
            <th>Cómo se pagó</th><th>Comprobante</th><th>Quién</th>
            <th class="num">Monto</th><th></th></tr></thead>
          <tbody>${cs.map(c => `<tr class="${c.anulado ? 'anul' : ''}">
            <td class="muted">${UI.esc(c.fecha)}</td>
            <td class="nom">${UI.esc(c.label)}${c.nota
              ? `<span class="hint">${UI.esc(c.nota)}</span>` : ''}</td>
            <td>${UI.esc(c.proveedor || '—')}</td>
            <td class="num muted">${c.cantidad
              ? `${c.cantidad} ${UI.esc(c.unidad || '')}` : '—'}</td>
            <td class="muted">${UI.esc((global.DB.FORMAS_PAGO.find(f => f.k === c.forma) || {}).label || c.forma)}</td>
            <td class="muted">${UI.esc(c.comprobante || '—')}</td>
            <td class="muted">${UI.esc(c.quien)}</td>
            <td class="num nom">${UI.pesos(c.monto)}</td>
            <td class="td-acc">${c.anulado ? '<span class="pill crit">anulada</span>'
              : `<button class="b-x" data-anular="${c.id}">Anular</button>`}</td>
          </tr>`).join('')}
          <tr class="cx-tot"><td colspan="7">Total de lo que se está viendo</td>
            <td class="num">${UI.pesos(cs.filter(c => !c.anulado)
              .reduce((a, c) => a + c.monto, 0))}</td><td></td></tr>
          </tbody></table></div>`
          : UI.vacio('No hay compras de material anotadas con ese filtro.')}

        <div class="hint" style="margin-top:10px">Esto entra en <b>El número</b> como materia
          prima del mes. El stock —cuántas placas quedan, cuántas cajas de correderas— es la
          segunda etapa: acá se anota la plata, no el inventario.</div>`;
    },

    modalNuevo() {
      const provs = [...new Set(global.DB.comprasMaterial().map(c => c.proveedor))]
        .filter(Boolean).sort();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cm-mdl"><div class="card pad" style="max-width:430px;width:100%">
          <h3 class="h-title" style="font-size:17px">Anotar una compra de material</h3>
          <p class="h-sub">Lo que importa es qué se compró y cuánto salió.</p>
          <label class="fld"><span class="lbl">Qué</span>
            <select id="cm-m">${global.DB.RUBROS_MATERIAL.map(r => `
              <optgroup label="${UI.esc(r.label)}">${global.DB.MATERIALES
                .filter(m => m.rubro === r.k)
                .map(m => `<option value="${m.k}">${UI.esc(m.label)}</option>`).join('')}
              </optgroup>`).join('')}</select></label>
          <label class="fld"><span class="lbl">A quién</span>
            <input id="cm-p" list="cm-provs" placeholder="Maderera del Oeste">
            <datalist id="cm-provs">${provs.map(p =>
              `<option value="${UI.esc(p)}"></option>`).join('')}</datalist></label>
          <div class="row" style="gap:10px">
            <label class="fld" style="flex:1"><span class="lbl">Cuánto salió</span>
              <input id="cm-monto" type="number" placeholder="0"></label>
            <label class="fld" style="flex:1"><span class="lbl">Cantidad</span>
              <input id="cm-cant" type="number" placeholder="opcional"></label>
          </div>
          <div class="row" style="gap:10px">
            <label class="fld" style="flex:1"><span class="lbl">Cómo se pagó</span>
              <select id="cm-f">${global.DB.FORMAS_PAGO.map(f =>
                `<option value="${f.k}">${UI.esc(f.label)}</option>`).join('')}</select></label>
            <label class="fld" style="flex:1"><span class="lbl">Fecha</span>
              <input id="cm-fe" value="${global.DB.hoyCorto()}"></label>
          </div>
          <label class="fld"><span class="lbl">Comprobante</span>
            <input id="cm-comp" placeholder="número de factura o remito"></label>
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cm-cancel">Cancelar</button>
            <button class="btn primary" id="cm-ok">Anotar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cm-mdl'); if (m) m.remove(); };
      document.getElementById('cm-cancel').onclick = cerrar;
      document.getElementById('cm-monto').focus();
      document.getElementById('cm-ok').onclick = () => {
        const monto = Number(document.getElementById('cm-monto').value) || 0;
        if (!monto) return UI.aviso('Falta cuánto salió', 'warn');
        const c = global.DB.comprarMaterial({
          material: document.getElementById('cm-m').value,
          proveedor: document.getElementById('cm-p').value,
          cantidad: document.getElementById('cm-cant').value,
          monto,
          fecha: document.getElementById('cm-fe').value,
          forma: document.getElementById('cm-f').value,
          comprobante: document.getElementById('cm-comp').value,
          quien: 'Jony' });
        UI.aviso(`${c.label}: ${UI.pesos(monto)}`, 'ok');
        this.mes = global.DB.mesDe(c.fecha) || this.mes;
        cerrar(); this.render(this._mount);
      };
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const n = q('cm-nuevo'); if (n) n.onclick = () => this.modalNuevo();
      const a = q('cm-ant'); if (a) a.onclick = () => {
        this.mes = this.mes > 1 ? this.mes - 1 : 12; this.render(this._mount);
      };
      const si = q('cm-sig'); if (si) si.onclick = () => {
        this.mes = this.mes < 12 ? this.mes + 1 : 1; this.render(this._mount);
      };
      document.querySelectorAll('[data-rubro]').forEach(b => b.onclick = () => {
        this.rubro = this.rubro === b.dataset.rubro ? '' : b.dataset.rubro;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-anular]').forEach(b => b.onclick = () => {
        const motivo = prompt('¿Por qué se anula? Queda anotado.');
        if (motivo == null) return;
        global.DB.anularCompraMaterial(Number(b.dataset.anular), motivo, 'yo');
        UI.aviso('Anulada — la original queda a la vista', 'ok');
        this.render(this._mount);
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cm-k{cursor:pointer;text-align:left;font:inherit;color:inherit}
        .cm-k:hover{border-color:var(--brand)}
        .cm-k.on{border-color:var(--navy);background:var(--panel-2)}
        .cx-tabla tr.anul td{opacity:.5;text-decoration:line-through}
        .cx-tabla tr.anul td:last-child{text-decoration:none;opacity:1}
        .cx-back{position:fixed;inset:0;background:rgba(12,20,34,.45);z-index:70;
          display:flex;align-items:center;justify-content:center;padding:20px}
      </style>`;
    },
  };
  global.ComprasMateriales = Mat;
})(typeof window !== 'undefined' ? window : globalThis);
