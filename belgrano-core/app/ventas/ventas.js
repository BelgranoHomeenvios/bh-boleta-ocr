// =====================================================================
//  Belgrano Soft · Ventas (contenedor)
//  Agrupa las tres puntas del mostrador en sub-solapas: la nueva
//  cotización, el listado de cotizaciones, las órdenes de venta y los
//  clientes. Es la misma historia: una atención → un presupuesto → una venta.
// =====================================================================
(function (global) {
  const SUBS = [
    { k: 'nueva',        label: 'Nueva cotización', render: m => global.Presupuesto.render(m) },
    { k: 'cotizaciones', label: 'Cotizaciones',     render: m => global.Cotizaciones.render(m) },
    { k: 'ordenes',      label: 'Órdenes de venta', render: m => global.Ordenes.render(m) },
    { k: 'clientes',     label: 'Clientes',         render: m => global.Clientes.render(m) },
  ];

  const Ventas = {
    sub: 'nueva',
    render() {
      const v = document.getElementById('view');
      v.innerHTML = `
        <div class="subnav" id="ventas-subnav">
          ${SUBS.map(s => `<button data-sub="${s.k}">${s.label}</button>`).join('')}
        </div>
        <div id="ventas-view"></div>
        <style>
          .subnav{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:18px;border-bottom:1px solid var(--line)}
          .subnav button{border:0;background:transparent;color:var(--ink-soft);font-weight:650;font-size:14px;
            padding:10px 14px;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px}
          .subnav button:hover{color:var(--brand)}
          .subnav button[aria-current="true"]{color:var(--brand);border-bottom-color:var(--brand)}
        </style>`;
      v.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => this.setSub(b.dataset.sub));
      this.setSub(this.sub);
    },
    setSub(k) {
      this.sub = k;
      document.querySelectorAll('#ventas-subnav button').forEach(b =>
        b.setAttribute('aria-current', b.dataset.sub === k));
      const s = SUBS.find(x => x.k === k) || SUBS[0];
      document.getElementById('ventas-view').innerHTML = '';
      s.render('ventas-view');
    },
  };

  global.Ventas = Ventas;
})(typeof window !== 'undefined' ? window : globalThis);
