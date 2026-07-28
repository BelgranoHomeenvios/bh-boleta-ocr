// =====================================================================
//  Belgrano Soft · Producción
//  Tablero por estado, según el ciclo real: a producir → pedido →
//  producción → recibido → listo. Editar acá requiere autorización.
// =====================================================================
(function (global) {
  const COLS = [
    { k: 'a_producir', label: 'A producir' },
    { k: 'pedido',     label: 'Pedido' },
    { k: 'produccion', label: 'Producción' },
    { k: 'recibido',   label: 'Recibido' },
    { k: 'listo',      label: 'Listo → Logística' },
  ];
  const DEMO = [
    { num: 'S00001', cliente: 'Abel Schoenmaker', mueble: 'Placard Oliver 2.00', col: 'produccion' },
    { num: 'S00003', cliente: 'Bibiana',          mueble: 'Cómoda Amberes 1.20', col: 'a_producir' },
    { num: 'S00007', cliente: 'Andrea',           mueble: 'Mesa de luz Oslo',    col: 'pedido' },
    { num: 'S00009', cliente: 'Camila',           mueble: 'Respaldo Milán',      col: 'recibido' },
    { num: 'S00011', cliente: 'Huego',            mueble: 'Vajillero Nórdico',   col: 'listo' },
  ];

  const Produccion = {
    render() {
      const v = document.getElementById('view');
      v.innerHTML = UI.head('Producción', 'Tablero de fabricación',
        'Editar una orden en producción requiere autorización — no lo hace el vendedor.') +
        `<div class="kanban">${COLS.map(c => `
          <div class="kcol">
            <div class="kcol-h">${c.label}<span class="kcount">${DEMO.filter(d => d.col === c.k).length}</span></div>
            ${DEMO.filter(d => d.col === c.k).map(d => `
              <div class="kcard">
                <div class="row"><b>${UI.esc(d.num)}</b><div class="sp"></div><span class="muted" style="font-size:12px">${UI.esc(d.cliente)}</span></div>
                <div style="font-size:13px;margin-top:4px">${UI.esc(d.mueble)}</div>
              </div>`).join('') || '<div class="muted" style="font-size:12px;padding:8px 4px">—</div>'}
          </div>`).join('')}</div>
        <style>
          .kanban{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;overflow-x:auto}
          @media(max-width:900px){.kanban{grid-template-columns:repeat(5,minmax(180px,1fr))}}
          .kcol{background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:10px;min-height:160px}
          .kcol-h{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:800;
            text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);padding:2px 4px 10px}
          .kcount{background:var(--brand-soft);color:var(--brand-ink);border-radius:20px;padding:1px 8px;font-size:11px}
          .kcard{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;box-shadow:var(--shadow)}
          .kcard b{color:var(--navy)}
        </style>`;
    },
  };
  global.Produccion = Produccion;
})(typeof window !== 'undefined' ? window : globalThis);
