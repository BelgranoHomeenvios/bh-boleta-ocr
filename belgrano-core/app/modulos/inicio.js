// =====================================================================
//  Belgrano Soft · Panel de Dirección (inicio)
//  La vista completa: KPIs, órdenes por estado, embudo de consultas,
//  top vendedores y accesos rápidos a cada módulo. Dirección ve todo.
//  Demo por ahora; después agrega desde core / finanzas.
// =====================================================================
(function (global) {
  // Colores de ESTADO (status, reservados) para la barra de órdenes.
  const COLOR = {
    confirmar: 'var(--warn)', produccion: 'var(--brand)', logistica: '#6b8bd6',
    entregado: 'var(--ok)', archivado: 'var(--muted)', anulado: 'var(--crit)', reclamo: 'var(--crit)',
  };

  const Inicio = {
    async render() {
      const v = document.getElementById('view');
      const [ordenes, cotis, clientes] = await Promise.all([
        global.DB.ordenes(), global.DB.cotizaciones(), global.DB.clientes(),
      ]);

      const ventas = ordenes.reduce((a, o) => a + o.total, 0);
      const abiertas = ordenes.filter(o => !['entregado', 'archivado', 'anulado'].includes(o.estado)).length;
      const enSeguim = clientes.filter(c => c.seguim > 0).length;
      const totConsultas = clientes.reduce((a, c) => a + c.consultas, 0);
      const totVentas = clientes.reduce((a, c) => a + c.concret, 0);
      const porCobrar = Math.round(ventas * 0.28); // demo: ~saldo pendiente

      // Órdenes por estado (para la barra segmentada).
      const estados = {};
      ordenes.forEach(o => { estados[o.estado] = (estados[o.estado] || 0) + 1; });
      const totOrd = ordenes.length || 1;

      // Top vendedores por monto.
      const vend = {};
      ordenes.forEach(o => { vend[o.vendedor] = (vend[o.vendedor] || 0) + o.total; });
      const top = Object.entries(vend).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const maxV = top[0]?.[1] || 1;

      v.innerHTML = `
        ${UI.head('Dirección', 'Panel', 'Todo el negocio de un vistazo. Dirección entra a cada módulo.',
          `<div class="per"><button class="on">Hoy</button><button>7 días</button><button>30 días</button></div>`)}

        <div class="kpis">
          ${tile('Ventas (demo)', UI.pesos(ventas), 'ok')}
          ${tile('Órdenes abiertas', abiertas, 'info')}
          ${tile('Por cobrar / señas', UI.pesos(porCobrar), 'warn')}
          ${tile('En seguimiento', enSeguim, 'soft')}
        </div>

        <div class="cols2">
          <div class="card pad">
            <h3 class="ph">Órdenes por estado</h3>
            <div class="barseg">${Object.entries(estados).map(([k, n]) =>
              `<span style="flex:${n};background:${COLOR[k] || 'var(--muted)'}" title="${lbl(k)}: ${n}"></span>`).join('')}</div>
            <div class="leg">${Object.entries(estados).map(([k, n]) =>
              `<span class="li"><span class="dot" style="background:${COLOR[k] || 'var(--muted)'}"></span>${lbl(k)}
               <b class="tnum">${n}</b></span>`).join('')}</div>
            <div class="muted" style="font-size:12px;margin-top:6px">${totOrd} órdenes en total.</div>
          </div>

          <div class="card pad">
            <h3 class="ph">Embudo de consultas</h3>
            <div class="funnel">
              ${fstep('Consultas', totConsultas, 100)}
              ${fstep('Cotizaciones', cotis.length, Math.round(cotis.length / Math.max(totConsultas, 1) * 100))}
              ${fstep('Ventas', totVentas, Math.round(totVentas / Math.max(totConsultas, 1) * 100))}
            </div>
          </div>
        </div>

        <div class="card pad" style="margin-top:14px">
          <h3 class="ph">Top vendedores</h3>
          <table><tbody>${top.map(([nombre, monto]) => `<tr>
            <td style="width:120px"><b>${UI.esc(nombre)}</b></td>
            <td><div class="vbar"><span style="width:${Math.round(monto / maxV * 100)}%"></span></div></td>
            <td style="text-align:right" class="tnum"><b>${UI.pesos(monto)}</b></td></tr>`).join('')}</tbody></table>
        </div>

        <h3 class="ph" style="margin:22px 0 10px">Ir a…</h3>
        <div class="qa">
          ${qa('ventas', '🧾', 'Ventas', 'Cotizar, órdenes, clientes')}
          ${qa('catalogo', '🪑', 'Catálogo', 'Productos y variantes')}
          ${qa('caja', '💵', 'Caja', 'Cobros y señas')}
          ${qa('produccion', '🏭', 'Producción', 'Tablero de fabricación')}
          ${qa('logistica', '🚚', 'Logística', 'Entregas')}
          ${qa('reclamos', '🛠️', 'Reclamos', 'Posventa')}
          ${qa('abastecimiento', '📦', 'Abastecimiento', 'Proveedores y pedidos')}
          ${qa('facturas', '📄', 'Facturas', 'Marcado + Nacional Soft')}
          ${qa('reportes', '📊', 'Reportes', 'Tableros de dirección')}
          ${qa('config', '⚙️', 'Configuración', 'Usuarios y reglas')}
        </div>

        <style>
          .per{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
          .per button{border:0;background:var(--panel);color:var(--muted);padding:7px 12px;font-size:13px;cursor:pointer}
          .per button+button{border-left:1px solid var(--line)}
          .per button.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
          .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
          @media(max-width:720px){.kpis{grid-template-columns:1fr 1fr}}
          .kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow)}
          .kpi .lab{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
          .kpi .val{font-size:26px;font-weight:800;color:var(--navy);margin-top:6px;letter-spacing:-.02em}
          .kpi .accent{height:3px;border-radius:3px;margin-top:12px}
          .cols2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
          @media(max-width:720px){.cols2{grid-template-columns:1fr}}
          .ph{margin:0 0 12px;color:var(--navy);font-size:15px}
          .barseg{display:flex;gap:2px;height:26px;border-radius:8px;overflow:hidden}
          .barseg span{display:block}
          .leg{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
          .leg .li{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-soft)}
          .leg .dot{width:10px;height:10px;border-radius:3px;display:inline-block}
          .funnel{display:flex;flex-direction:column;gap:8px}
          .fst{display:flex;align-items:center;gap:10px}
          .fst .fn{width:110px;font-size:13px;color:var(--ink-soft)}
          .fst .fbar{flex:1;height:22px;background:var(--panel-2);border-radius:7px;overflow:hidden}
          .fst .fbar span{display:block;height:100%;background:var(--brand);border-radius:7px}
          .fst .fv{width:38px;text-align:right;font-weight:700;color:var(--navy)}
          .vbar{height:12px;background:var(--panel-2);border-radius:6px;overflow:hidden}
          .vbar span{display:block;height:100%;background:var(--brand);border-radius:6px}
          .qa{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
          .qacard{display:flex;gap:10px;align-items:flex-start;padding:14px;border:1px solid var(--line);border-radius:12px;
            background:var(--panel);box-shadow:var(--shadow);cursor:pointer;text-align:left;transition:.15s}
          .qacard:hover{border-color:var(--brand);transform:translateY(-1px)}
          .qacard .em{font-size:22px;line-height:1}
          .qacard b{color:var(--navy);display:block;font-size:14px}
          .qacard span{font-size:12px;color:var(--muted)}
        </style>`;

      v.querySelectorAll('[data-go]').forEach(b => b.onclick = () => global.App.setTab(b.dataset.go));
      v.querySelectorAll('.per button').forEach(b => b.onclick = () => {
        v.querySelectorAll('.per button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      });

      function tile(lab, val, tone) {
        const c = { ok: 'var(--ok)', info: 'var(--brand)', warn: 'var(--warn)', soft: 'var(--muted)' }[tone];
        return `<div class="kpi"><div class="lab">${lab}</div><div class="val tnum">${val}</div>
          <div class="accent" style="background:${c}"></div></div>`;
      }
      function fstep(nombre, val, pct) {
        return `<div class="fst"><span class="fn">${nombre}</span>
          <div class="fbar"><span style="width:${Math.max(6, Math.min(100, pct))}%"></span></div>
          <span class="fv tnum">${val}</span></div>`;
      }
      function qa(key, em, tit, desc) {
        return `<button class="qacard" data-go="${key}"><span class="em">${em}</span>
          <span><b>${tit}</b><span>${desc}</span></span></button>`;
      }
      function lbl(k) { return (global.DB.ESTADO_ORDEN[k]?.label) || k; }
    },
  };
  global.Inicio = Inicio;
})(typeof window !== 'undefined' ? window : globalThis);
