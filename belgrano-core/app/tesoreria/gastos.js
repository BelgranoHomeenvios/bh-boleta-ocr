// =====================================================================
//  Belgrano Soft · Tesorería · Gastos
//  Los rubros y los conceptos son los mismos de la planilla con la que se
//  lleva el número hoy. Lo único que cambia es cuándo se cargan: en vez
//  de una vez por mes, el día que pasan. Por eso cargar tiene que ser de
//  tres toques —qué, cuánto, cómo se pagó—: si es difícil, el gasto chico
//  no se anota y el número deja de servir.
// =====================================================================
(function (global) {
  const Gastos = {
    _mount: 'view',
    mes: null,
    grupo: '',
    q: '',

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
      const grupos = global.DB.gastosPorGrupo(this.mes);
      const total = grupos.reduce((a, g) => a + g.total, 0);
      const t = String(this.q || '').toLowerCase();
      const todos = global.DB.gastosDeMes(this.mes)
        .filter(g => !this.grupo || g.grupo === this.grupo)
        .filter(g => !t || `${g.concepto} ${g.nota || ''}`.toLowerCase().includes(t))
        .sort((a, b) => (global.DB.diasDesde(a.fecha) || 0) - (global.DB.diasDesde(b.fecha) || 0));
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Tesorería</div><h1 class="h-title">Gastos</h1>
            <div class="h-sub">${UI.esc(this.MESES[this.mes])} ·
              ${UI.pesos(total)} en ${global.DB.gastosDeMes(this.mes).length} gastos</div></div>
          <div class="sp"></div>
          <button class="btn primary" id="tg-nuevo">Agregar gasto</button>
          <div class="cx-nav" style="margin-left:8px">
            <button class="b-x" id="tg-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes])}</b>
            <button class="b-x" id="tg-sig">›</button>
          </div>
        </div>

        <div class="cx-kpis">
          ${global.DB.GRUPOS_GASTO.map(gr => {
            const g = grupos.find(x => x.k === gr.k);
            const pct = total && g ? Math.round((g.total / total) * 100) : 0;
            return `<button class="cx-k tg-k ${this.grupo === gr.k ? 'on' : ''}"
              data-grupo="${gr.k}">
              <span class="cx-k-t">${UI.esc(gr.label)}</span>
              <span class="cx-k-v" style="font-size:18px">${UI.pesos(g ? g.total : 0)}</span>
              <span class="cx-k-p">${g ? `${pct}% de los gastos · ${g.n} cargados`
                : 'nada cargado'}</span></button>`;
          }).join('')}
        </div>

        ${this.bloqueFV()}

        <div class="row" style="margin-bottom:10px">
          <input id="tg-q" class="cx-buscar" placeholder="Buscar un gasto"
            value="${UI.esc(this.q)}">
          ${this.grupo ? `<button class="b-x" id="tg-todos">Ver todos los rubros</button>` : ''}
        </div>

        ${todos.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Fecha</th><th>Rubro</th><th>Concepto</th><th>Para el contador</th>
            <th>Fijo o variable</th><th>Cómo se pagó</th><th>Comprobante</th>
            <th class="num">Monto</th><th></th></tr></thead>
          <tbody>${todos.map(g => `<tr class="${g.anulado ? 'anul' : ''}">
            <td class="muted">${UI.esc(g.fecha)}</td>
            <td><span class="pill soft">${UI.esc((global.DB.rubroGasto(g.rubro) || {}).label || g.rubro)}</span></td>
            <td class="nom">${UI.esc(g.concepto)}${g.nota
              ? `<span class="hint">${UI.esc(g.nota)}</span>` : ''}</td>
            <td class="muted">${UI.esc((global.DB.catCompra(g.cat) || {}).label || '—')}
              <span class="hint">${UI.esc((global.DB.tipoCompra(g.tipoCompra) || {}).label || '')}</span></td>
            <td><span class="pill ${g.fijo ? 'soft' : 'ok'}">${g.fijo ? 'fijo' : 'variable'}</span></td>
            <td class="muted">${UI.esc((global.DB.FORMAS_PAGO.find(f => f.k === g.forma) || {}).label || g.forma)}</td>
            <td class="muted">${UI.esc(g.comprobante || '—')}</td>
            <td class="num nom">${UI.pesos(g.monto)}</td>
            <td class="td-acc">${g.anulado
              ? `<span class="pill crit">anulado</span>`
              : `<button class="b-x" data-anular="${g.id}">Anular</button>`}</td>
          </tr>`).join('')}
          <tr class="cx-tot"><td colspan="7">Total de lo que se está viendo</td>
            <td class="num">${UI.pesos(todos.filter(g => !g.anulado)
              .reduce((a, g) => a + g.monto, 0))}</td><td></td></tr>
          </tbody></table></div>`
          : UI.vacio('No hay gastos cargados con ese filtro.')}

        <div class="hint" style="margin-top:10px">Un gasto no se borra nunca: se anula con motivo
          y el original queda a la vista. Los rubros son los mismos de la planilla, así que lo que
          se carga acá se puede comparar con lo de siempre.</div>`;
    },

    // Fijo contra variable. Es lo que dice cuánto hay que vender para no
    // perder: lo fijo se paga aunque el mes sea malo.
    bloqueFV() {
      const fv = global.DB.fijoVariable(this.mes);
      const tot = fv.fijo + fv.variable;
      if (!tot) return '';
      const pct = Math.round((fv.fijo / tot) * 100);
      return `<div class="card pad tg-fv">
        <div class="tg-fv-b">
          <span class="tg-fv-f" style="width:${pct}%"></span>
          <span class="tg-fv-v" style="width:${100 - pct}%"></span>
        </div>
        <div class="tg-fv-l">
          <span><b>${UI.pesos(fv.fijo)}</b><span>fijos · ${pct}% — se pagan aunque no se venda</span></span>
          <span><b>${UI.pesos(fv.variable)}</b><span>variables · se mueven con la venta</span></span>
          <span class="sp"></span>
          ${fv.puntoEquilibrio ? `<span><b>${UI.pesos(fv.puntoEquilibrio)}</b>
            <span>hay que vender para no perder</span></span>` : ''}
        </div>
      </div>`;
    },

    // ---- Cargar ------------------------------------------------------
    // El buscador va sobre los 86 conceptos de la planilla: se escribe
    // "nafta" y aparece, sin tener que elegir primero el rubro.
    modalNuevo() {
      const cs = global.DB.conceptosGasto();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="tg-mdl"><div class="card pad" style="max-width:440px;width:100%">
          <h3 class="h-title" style="font-size:17px">Agregar un gasto</h3>
          <p class="h-sub">Escribí qué fue y elegí de la lista.</p>
          <label class="fld"><span class="lbl">Qué</span>
            <input id="tg-c" list="tg-lista" placeholder="nafta, ABL, contadora…" autocomplete="off">
            <datalist id="tg-lista">${cs.map(c =>
              `<option value="${UI.esc(c.concepto)}">${UI.esc(c.rubroLabel)}</option>`).join('')}</datalist></label>
          <div class="hint" id="tg-rubro">El rubro se completa solo.</div>
          <label class="fld"><span class="lbl">Cuánto</span>
            <input id="tg-m" type="number" placeholder="0"></label>
          <div class="row" style="gap:10px">
            <label class="fld" style="flex:1"><span class="lbl">Cómo se pagó</span>
              <select id="tg-f">${global.DB.FORMAS_PAGO.map(f =>
                `<option value="${f.k}">${UI.esc(f.label)}</option>`).join('')}</select></label>
            <label class="fld" style="flex:1"><span class="lbl">Fecha</span>
              <input id="tg-fe" value="${global.DB.hoyCorto()}"></label>
          </div>
          <label class="fld"><span class="lbl">Comprobante</span>
            <input id="tg-comp" placeholder="número de factura o ticket"></label>
          <label class="fld"><span class="lbl">Nota</span>
            <input id="tg-n" placeholder="opcional"></label>
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="tg-cancel">Cancelar</button>
            <button class="btn primary" id="tg-ok">Cargar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('tg-mdl'); if (m) m.remove(); };
      const inp = document.getElementById('tg-c');
      const pie = document.getElementById('tg-rubro');
      const hallar = () => cs.find(c => c.concepto.toLowerCase() === inp.value.trim().toLowerCase());
      inp.oninput = () => {
        const c = hallar();
        pie.innerHTML = c ? `Va en <b>${UI.esc(c.rubroLabel)}</b>`
          : 'El rubro se completa solo.';
      };
      inp.focus();
      document.getElementById('tg-cancel').onclick = cerrar;
      document.getElementById('tg-ok').onclick = () => {
        const c = hallar();
        if (!c) return UI.aviso('Elegí un concepto de la lista', 'warn');
        const m = Number(document.getElementById('tg-m').value) || 0;
        if (!m) return UI.aviso('Falta el monto', 'warn');
        const g = global.DB.cargarGasto({ rubro: c.rubro, concepto: c.concepto, monto: m,
          fecha: document.getElementById('tg-fe').value,
          forma: document.getElementById('tg-f').value,
          comprobante: document.getElementById('tg-comp').value,
          nota: document.getElementById('tg-n').value, quien: 'yo' });
        UI.aviso(`${c.concepto}: ${UI.pesos(m)}`, 'ok');
        this.mes = global.DB.mesDe(g.fecha) || this.mes;
        cerrar(); this.render(this._mount);
      };
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const n = q('tg-nuevo'); if (n) n.onclick = () => this.modalNuevo();
      const a = q('tg-ant'); if (a) a.onclick = () => {
        this.mes = this.mes > 1 ? this.mes - 1 : 12; this.render(this._mount);
      };
      const si = q('tg-sig'); if (si) si.onclick = () => {
        this.mes = this.mes < 12 ? this.mes + 1 : 1; this.render(this._mount);
      };
      const td = q('tg-todos'); if (td) td.onclick = () => {
        this.grupo = ''; this.render(this._mount);
      };
      document.querySelectorAll('[data-grupo]').forEach(b => b.onclick = () => {
        this.grupo = this.grupo === b.dataset.grupo ? '' : b.dataset.grupo;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-anular]').forEach(b => b.onclick = () => {
        const motivo = prompt('¿Por qué se anula? Queda anotado.');
        if (motivo == null) return;
        global.DB.anularGasto(Number(b.dataset.anular), motivo, 'yo');
        UI.aviso('Anulado — el original queda a la vista', 'ok');
        this.render(this._mount);
      });
      const bq = q('tg-q');
      if (bq) bq.oninput = () => {
        this.q = bq.value;
        const pos = bq.selectionStart;
        this.render(this._mount);
        const nn = document.getElementById('tg-q');
        if (nn) { nn.focus(); nn.setSelectionRange(pos, pos); }
      };
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .tg-k{cursor:pointer;text-align:left;font:inherit;color:inherit}
        .tg-k:hover{border-color:var(--brand)}
        .tg-k.on{border-color:var(--navy);background:var(--panel-2)}
        .cx-tabla tr.anul td{opacity:.5;text-decoration:line-through}
        .cx-tabla tr.anul td:last-child{text-decoration:none;opacity:1}
        .tg-fv{margin-bottom:12px}
        .tg-fv-b{display:flex;height:11px;border-radius:999px;overflow:hidden;
          border:1px solid var(--line);margin-bottom:8px}
        .tg-fv-f{background:var(--navy)} .tg-fv-v{background:var(--ok)}
        .tg-fv-l{display:flex;gap:22px;flex-wrap:wrap;align-items:baseline}
        .tg-fv-l>span{display:flex;flex-direction:column}
        .tg-fv-l b{font-size:15px;color:var(--navy)}
        .tg-fv-l span span{font-size:10.5px;color:var(--muted)}
        .cx-tabla .hint{display:block;font-size:10px}
        .cx-back{position:fixed;inset:0;background:rgba(12,20,34,.45);z-index:70;
          display:flex;align-items:center;justify-content:center;padding:20px}
      </style>`;
    },
  };
  global.TesoGastos = Gastos;
})(typeof window !== 'undefined' ? window : globalThis);
