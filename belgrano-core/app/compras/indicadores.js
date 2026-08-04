// =====================================================================
//  Belgrano Soft · Compras · Indicadores
//  Los cuatro números que se miran de verdad: cuánto se compró, a quién,
//  cómo se movió mes a mes y cuánto sale en promedio un mueble. Todo sale
//  del historial —no hay ningún número cargado a mano acá— así que si
//  algo no cierra, se arregla conformando bien y no tocando esta pantalla.
// =====================================================================
(function (global) {
  const Ind = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    MESES: { 1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
      7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre' },

    html() {
      const i = global.DB.indicadoresCompras();
      const tope = Math.max(1, ...i.porMes.map(m => m.total));
      const topeP = Math.max(1, ...i.porProv.map(p => p.total));
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Indicadores</h1>
            <div class="h-sub">Sobre ${i.piezas} muebles y ${i.porMes.reduce((a, m) => a + m.n, 0)}
              compras conformadas</div></div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Comprado', UI.pesos(i.total), 'muebles e insumos, todo junto')}
          ${this.kpi('En muebles', UI.pesos(i.muebles), `${i.piezas} piezas`)}
          ${this.kpi('En insumos', UI.pesos(i.insumos), 'placas, herrajes, laca')}
          ${this.kpi('Sale un mueble', UI.pesos(i.promedio), 'promedio de lo que se pagó')}
          ${this.kpi('Fletes que pagamos', UI.pesos(i.flete), 'los que fuimos a buscar')}
        </div>

        <div class="cx-b">
          <div class="cx-b-h">Mes a mes</div>
          <div class="card pad">${i.porMes.length ? i.porMes.map(m => `
            <div class="cx-bar-f">
              <span class="cx-bar-n">${UI.esc(this.MESES[Number(m.mes)] || m.mes)}</span>
              <span class="cx-bar"><span style="width:${Math.round((m.total / tope) * 100)}%"></span></span>
              <b class="cx-bar-v">${UI.pesos(m.total)}</b>
              <span class="muted cx-bar-p">${m.n} compra${m.n === 1 ? '' : 's'}</span>
            </div>`).join('') : '<div class="hint">Todavía no hay nada conformado.</div>'}</div>
        </div>

        <div class="cx-b">
          <div class="cx-b-h">A quién le compramos <span class="muted">${i.porProv.length}</span></div>
          ${i.porProv.length ? `<div class="card pad">${i.porProv.map(p => {
            const pct = Math.round((p.total / i.muebles) * 100);
            return `<div class="cx-bar-f cliq" data-prov="${p.provId}">
              <span class="cx-bar-n">${UI.esc(p.proveedor || '—')}</span>
              <span class="cx-bar"><span style="width:${Math.round((p.total / topeP) * 100)}%"></span></span>
              <b class="cx-bar-v">${UI.pesos(p.total)}</b>
              <span class="muted cx-bar-p">${p.piezas} muebles · ${pct}% de lo que compramos</span>
            </div>`;
          }).join('')}</div>
          <div class="hint" style="margin-top:6px">Si uno solo se lleva más de la mitad, cualquier
            problema suyo es un problema nuestro. Tocá su barra para abrir su ficha.</div>`
            : '<div class="hint">Todavía no hay compras de muebles conformadas.</div>'}
        </div>`;
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v" style="font-size:19px">${v}</span>
        <span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      document.querySelectorAll('[data-prov]').forEach(b => b.onclick = () => {
        global.ComprasProveedores.abierto = Number(b.dataset.prov);
        global.App.goSub('compras', 'proveedores');
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cx-bar-f{display:grid;grid-template-columns:130px 1fr 108px 170px;gap:10px;
          align-items:center;padding:5px 0;border-bottom:1px solid var(--line-soft)}
        .cx-bar-f:last-child{border-bottom:0}
        .cx-bar-f.cliq{cursor:pointer}
        .cx-bar-f.cliq:hover{background:var(--panel-2)}
        .cx-bar-n{font-size:12.5px;font-weight:700;color:var(--navy);text-transform:capitalize}
        .cx-bar{height:9px;border-radius:999px;background:var(--panel-2);
          border:1px solid var(--line);overflow:hidden}
        .cx-bar>span{display:block;height:100%;background:var(--navy)}
        .cx-bar-v{font-size:12.5px;color:var(--navy);text-align:right}
        .cx-bar-p{font-size:11px}
        @media (max-width:720px){
          .cx-bar-f{grid-template-columns:1fr 90px;grid-template-areas:'n v' 'b b' 'p p'}
          .cx-bar-n{grid-area:n} .cx-bar{grid-area:b} .cx-bar-v{grid-area:v} .cx-bar-p{grid-area:p}
        }
      </style>`;
    },
  };
  global.ComprasIndicadores = Ind;
})(typeof window !== 'undefined' ? window : globalThis);
