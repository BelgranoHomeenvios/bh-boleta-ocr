// =====================================================================
//  Belgrano Soft · Compras · Estilos compartidos
//  Las cinco pantallas de Compras se miran seguido una atrás de la otra
//  —proveedor, comparador, pendientes, historial, números—, así que la
//  tabla, la tarjeta y el KPI tienen que verse iguales en todas. Están
//  acá una sola vez y no cinco veces copiados.
// =====================================================================
(function (global) {
  global.ComprasEstilos = function () {
    return `<style>
      .cx-b{margin-bottom:18px}
      .cx-b-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
        color:var(--muted);margin-bottom:6px}
      .cx-tabla{overflow-x:auto}
      .cx-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
      .cx-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
        color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
        white-space:nowrap}
      .cx-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
      .cx-tabla tr:last-child td{border-bottom:0}
      .cx-tabla .nom{font-weight:700;color:var(--navy)}
      .cx-tabla .num{text-align:right}
      .cx-tabla tr.ojo td{background:var(--warn-bg)}
      .cx-tabla tr.mal td{background:var(--crit-bg)}
      .cx-tabla tbody tr.cliq{cursor:pointer}
      .cx-tabla tbody tr.cliq:hover td{background:var(--panel-2)}
      .cx-tot td{background:var(--panel-2);font-weight:700;color:var(--navy);
        border-top:1px solid var(--line)}

      .cx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
        gap:9px;margin-bottom:16px}
      .cx-k{border:1px solid var(--line);border-radius:11px;padding:9px 12px;background:var(--panel)}
      .cx-k-t{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
        color:var(--muted);font-weight:700}
      .cx-k-v{display:block;font-size:22px;font-weight:800;color:var(--navy);line-height:1.15;
        margin:1px 0}
      .cx-k-p{display:block;font-size:11px;color:var(--muted)}
      .cx-k.alerta .cx-k-v{color:var(--crit)}
      .cx-k.ojo .cx-k-v{color:var(--warn)}

      .cx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
      .cx-t{text-align:left;cursor:pointer;font:inherit;color:inherit;border:1px solid var(--line)}
      .cx-t:hover{border-color:var(--brand)}
      .cx-t-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .cx-t-n{display:flex;flex-direction:column;line-height:1.2}
      .cx-t-n b{font-size:14px;color:var(--navy)}
      .cx-t-n .muted{font-size:11px}
      .cx-t-d{font-size:11.5px;color:var(--muted);margin:7px 0 9px}
      .cx-t-n3{display:flex;gap:14px;flex-wrap:wrap;border-top:1px solid var(--line-soft);
        padding-top:8px}
      .cx-t-n3>span{display:flex;flex-direction:column}
      .cx-t-n3 b{font-size:13.5px;color:var(--navy)}
      .cx-t-n3 span span{font-size:10px;color:var(--muted)}

      .cx-av{width:30px;height:30px;border-radius:50%;background:var(--panel-2);
        border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;
        font-weight:800;color:var(--navy);font-size:13px;flex:0 0 auto}
      .cx-av.grande{width:48px;height:48px;font-size:20px}

      .cx-filtros{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
      .cx-f{border:1px solid var(--line);border-radius:999px;padding:4px 11px;background:var(--panel);
        cursor:pointer;font:inherit;font-size:12px;color:var(--ink)}
      .cx-f:hover{border-color:var(--brand)}
      .cx-f.on{background:var(--navy);color:#fff;border-color:var(--navy)}
      .cx-f.on .muted{color:rgba(255,255,255,.7)}

      .cx-buscar{border:1px solid var(--line);border-radius:9px;padding:6px 11px;font:inherit;
        font-size:12.5px;background:var(--panel);color:var(--ink);min-width:230px}

      .cx-barra{height:8px;border-radius:999px;background:var(--panel-2);
        border:1px solid var(--line);overflow:hidden;margin:6px 0 5px}
      .cx-barra>span{display:block;height:100%;background:var(--navy)}
      .cx-cupo{margin-bottom:16px}

      .sube{color:var(--crit);font-weight:700}
      .baja{color:var(--ok);font-weight:700}
      .mal{color:var(--crit)}
      .cx-tabla .hint{display:block;font-size:11px}
    </style>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
