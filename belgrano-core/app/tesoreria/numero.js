// =====================================================================
//  Belgrano Soft · Tesorería · El número
//  Es la misma cuenta de la planilla:
//
//      VENTA − COSTOS − GASTOS − ADICIONALES = RESULTADO
//
//  Lo que cambia es de dónde salen los números. La venta sale de las
//  boletas, el costo de los muebles sale de lo que Compras conformó y los
//  gastos de lo que se fue cargando. Nadie transcribe nada: el mes se va
//  armando solo mientras pasa, en vez de reconstruirse a fin de mes.
// =====================================================================
(function (global) {
  const Numero = {
    _mount: 'view',
    mes: null,
    abierto: '',

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
      const n = global.DB.numeroEconomico(this.mes);
      const anio = global.DB.anioEconomico();
      const pos = n.total >= 0;
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Tesorería</div><h1 class="h-title">El número</h1>
            <div class="h-sub">La cuenta del mes, armada sola con lo que ya está cargado</div></div>
          <div class="sp"></div>
          <div class="cx-nav">
            <button class="b-x" id="tn-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes])}</b>
            <button class="b-x" id="tn-sig">›</button>
          </div>
        </div>

        <div class="tn-cuenta card pad">
          ${this.paso('Venta', n.venta.total, `${n.venta.ops} boletas · ticket ${
            UI.pesos(n.venta.ticket)}`, 'venta', '')}
          <span class="tn-op">−</span>
          ${this.paso('Costos', n.costos.total, `${n.costos.piezas} muebles${
            n.costos.totalPrima ? ` + ${UI.pesos(n.costos.totalPrima)} de insumos` : ''}`,
            'costos', 'de Compras')}
          <span class="tn-op">−</span>
          ${this.paso('Gastos', n.gastos, `${n.grupos.reduce((a, g) => a + g.n, 0)} cargados`,
            'gastos', 'de Gastos')}
          <span class="tn-op">−</span>
          ${this.paso('Adicionales', n.adicionales,
            `${global.DB.ADICIONAL_PCT}% de los costos`, '', 'se calcula solo')}
          <span class="tn-op">=</span>
          <div class="tn-p tn-res ${pos ? 'bien' : 'mal'}">
            <span class="tn-p-t">Resultado</span>
            <b class="tn-p-v">${UI.pesos(n.total)}</b>
            <span class="tn-p-p">${pos ? `${Math.round(n.margen)}% sobre lo gastado`
              : 'el mes da negativo'}</span>
          </div>
        </div>

        ${!n.venta.total ? `<div class="hint tn-aviso">Este mes no tiene boletas cargadas en el
          demo, así que la venta da cero y el resultado sale en rojo. Los costos y los gastos
          sí son reales: lo que se está probando es la cuenta, no el número.</div>` : ''}

        ${this.abierto === 'venta' ? this.htmlVenta(n) : ''}
        ${this.abierto === 'costos' ? this.htmlCostos(n) : ''}
        ${this.abierto === 'gastos' ? this.htmlGastos(n) : ''}

        <div class="cx-b" style="margin-top:18px">
          <div class="cx-b-h">El año hasta ahora</div>
          ${anio.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Mes</th><th class="num">Venta</th><th class="num">Costos</th>
              <th class="num">Gastos</th><th class="num">Adicionales</th>
              <th class="num">Resultado</th><th class="num">Margen</th></tr></thead>
            <tbody>${anio.map(m => `<tr class="cliq ${m.mes === this.mes ? 'ojo' : ''}"
              data-mes="${m.mes}">
              <td class="nom" style="text-transform:capitalize">${UI.esc(this.MESES[m.mes])}</td>
              <td class="num">${UI.pesos(m.venta.total)}</td>
              <td class="num muted">${UI.pesos(m.costos.total)}</td>
              <td class="num muted">${UI.pesos(m.gastos)}</td>
              <td class="num muted">${UI.pesos(m.adicionales)}</td>
              <td class="num nom ${m.total >= 0 ? 'baja' : 'sube'}">${UI.pesos(m.total)}</td>
              <td class="num muted">${Math.round(m.margen)}%</td>
            </tr>`).join('')}
            <tr class="cx-tot">
              <td>Total</td>
              <td class="num">${UI.pesos(anio.reduce((a, m) => a + m.venta.total, 0))}</td>
              <td class="num">${UI.pesos(anio.reduce((a, m) => a + m.costos.total, 0))}</td>
              <td class="num">${UI.pesos(anio.reduce((a, m) => a + m.gastos, 0))}</td>
              <td class="num">${UI.pesos(anio.reduce((a, m) => a + m.adicionales, 0))}</td>
              <td class="num">${UI.pesos(anio.reduce((a, m) => a + m.total, 0))}</td>
              <td></td></tr>
            </tbody></table></div>` : '<div class="hint">Todavía no hay ningún mes con datos.</div>'}
        </div>

        <div class="hint">Tocá <b>Venta</b>, <b>Costos</b> o <b>Gastos</b> para ver de dónde sale
          cada número. Ninguno se carga a mano acá: si algo no cierra, se arregla en su módulo.</div>`;
    },

    paso(t, v, pie, abre, de) {
      return `<${abre ? 'button' : 'div'} class="tn-p ${abre ? 'cliq' : ''} ${
        this.abierto === abre ? 'on' : ''}" ${abre ? `data-abrir="${abre}"` : ''}>
        <span class="tn-p-t">${t}${de ? `<span class="tn-p-de">${de}</span>` : ''}</span>
        <b class="tn-p-v">${UI.pesos(v)}</b>
        <span class="tn-p-p">${pie}</span>
      </${abre ? 'button' : 'div'}>`;
    },

    htmlVenta(n) {
      return `<div class="card cx-tabla tn-det"><table>
        <thead><tr><th>Local</th><th class="num">Efectivo</th><th class="num">Tarjeta</th>
          <th class="num">Boletas</th><th class="num">Ticket</th><th class="num">Total</th></tr></thead>
        <tbody>${n.venta.filas.map(f => `<tr>
          <td class="nom">${UI.esc(f.label)}</td>
          <td class="num muted">${UI.pesos(f.efectivo)}</td>
          <td class="num muted">${UI.pesos(f.tarjeta)}</td>
          <td class="num">${f.ops}</td>
          <td class="num muted">${UI.pesos(f.ops ? Math.round(f.total / f.ops) : 0)}</td>
          <td class="num nom">${UI.pesos(f.total)}</td>
        </tr>`).join('') || '<tr><td colspan="6" class="muted">Sin boletas este mes.</td></tr>'}
        <tr class="cx-tot"><td>Total</td>
          <td class="num">${UI.pesos(n.venta.efectivo)}</td>
          <td class="num">${UI.pesos(n.venta.tarjeta)}</td>
          <td class="num">${n.venta.ops}</td>
          <td class="num">${UI.pesos(n.venta.ticket)}</td>
          <td class="num">${UI.pesos(n.venta.total)}</td></tr>
        </tbody></table></div>`;
    },

    htmlCostos(n) {
      return `<div class="card cx-tabla tn-det"><table>
        <thead><tr><th>De dónde</th><th>Quién</th><th class="num">Compras</th>
          <th class="num">Muebles</th><th class="num">Total</th></tr></thead>
        <tbody>${n.costos.terminado.map(x => `<tr class="cliq" data-prov="${x.provId}">
          <td class="muted">Producto terminado</td>
          <td class="nom">${UI.esc(x.label)}</td>
          <td class="num">${x.entregas}</td>
          <td class="num">${x.piezas}</td>
          <td class="num nom">${UI.pesos(x.total)}</td>
        </tr>`).join('')}
        ${n.costos.prima.map(x => `<tr class="cliq" data-mat="1">
          <td class="muted">Materia prima</td>
          <td class="nom">${UI.esc(x.label)}</td>
          <td class="num">${x.items}</td>
          <td class="num muted">—</td>
          <td class="num nom">${UI.pesos(x.total)}</td>
        </tr>`).join('')}
        ${!n.costos.terminado.length && !n.costos.prima.length
          ? '<tr><td colspan="5" class="muted">Sin entregas conformadas este mes.</td></tr>' : ''}
        <tr class="cx-tot"><td colspan="4">Total de costos</td>
          <td class="num">${UI.pesos(n.costos.total)}</td></tr>
        </tbody></table>
        <div class="hint" style="padding:8px 11px">El producto terminado sale de las entregas
          que Jony conformó; tocá una fila para abrir la cuenta de ese taller. La materia prima
          sale de lo anotado en Compras · Materiales.</div></div>`;
    },

    htmlGastos(n) {
      return `<div class="tn-det">${n.grupos.map(g => `
        <div class="card pad tn-g">
          <div class="row" style="align-items:baseline">
            <b>${UI.esc(g.label)}</b>
            <span class="sp"></span>
            <b style="font-size:16px;color:var(--navy)">${UI.pesos(g.total)}</b>
          </div>
          <div class="tn-g-r">${g.rubros.map(r => `<span>
            <b>${UI.pesos(r.total)}</b><span>${UI.esc(r.label)}</span></span>`).join('')}</div>
        </div>`).join('') || '<div class="hint">Sin gastos cargados este mes.</div>'}
        <button class="btn" id="tn-ir-gastos">Ir a cargar gastos</button></div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const a = q('tn-ant'); if (a) a.onclick = () => {
        this.mes = this.mes > 1 ? this.mes - 1 : 12; this.render(this._mount);
      };
      const s = q('tn-sig'); if (s) s.onclick = () => {
        this.mes = this.mes < 12 ? this.mes + 1 : 1; this.render(this._mount);
      };
      document.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        this.abierto = this.abierto === b.dataset.abrir ? '' : b.dataset.abrir;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-mes]').forEach(tr => tr.onclick = () => {
        this.mes = Number(tr.dataset.mes); this.render(this._mount);
      });
      document.querySelectorAll('[data-mat]').forEach(tr => tr.onclick = () => {
        global.ComprasMateriales.mes = this.mes;
        global.App.goSub('compras', 'materiales');
      });
      document.querySelectorAll('[data-prov]').forEach(tr => tr.onclick = () => {
        global.ComprasCuenta.abierto = Number(tr.dataset.prov);
        global.App.goSub('compras', 'cuenta');
      });
      const ig = q('tn-ir-gastos');
      if (ig) ig.onclick = () => {
        global.TesoGastos.mes = this.mes;
        global.App.goSub('tesoreria', 'gastos');
      };
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .tn-cuenta{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}
        .tn-p{flex:1 1 165px;border:1px solid var(--line);border-radius:11px;padding:9px 12px;
          background:var(--panel);display:flex;flex-direction:column;text-align:left;font:inherit;
          color:inherit}
        .tn-p.cliq{cursor:pointer}
        .tn-p.cliq:hover{border-color:var(--brand)}
        .tn-p.on{border-color:var(--navy);background:var(--panel-2)}
        .tn-p-t{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);
          font-weight:700;display:flex;gap:6px;align-items:baseline}
        .tn-p-de{text-transform:none;letter-spacing:0;font-weight:600;font-size:9.5px;
          color:var(--brand)}
        .tn-p-v{font-size:20px;color:var(--navy);line-height:1.2;margin:2px 0}
        .tn-p-p{font-size:11px;color:var(--muted)}
        .tn-op{align-self:center;font-size:20px;font-weight:800;color:var(--muted)}
        .tn-res{flex:1 1 200px}
        .tn-res.bien{border-color:var(--ok);background:var(--ok-bg)}
        .tn-res.bien .tn-p-v{color:var(--ok)}
        .tn-res.mal{border-color:var(--crit);background:var(--crit-bg)}
        .tn-res.mal .tn-p-v{color:var(--crit)}
        .tn-det{margin-top:12px;display:flex;flex-direction:column;gap:9px}
        .tn-aviso{margin-top:10px;border-left:3px solid var(--warn);padding-left:9px}
        .tn-g-r{display:flex;gap:16px;flex-wrap:wrap;margin-top:7px;padding-top:7px;
          border-top:1px solid var(--line-soft)}
        .tn-g-r>span{display:flex;flex-direction:column}
        .tn-g-r b{font-size:13px;color:var(--navy)}
        .tn-g-r span span{font-size:10.5px;color:var(--muted)}
        @media (max-width:820px){ .tn-op{display:none} }
      </style>`;
    },
  };
  global.TesoNumero = Numero;
})(typeof window !== 'undefined' ? window : globalThis);
