// =====================================================================
//  Belgrano Soft · Órdenes de venta (listado operativo)
//  Tarjetas arriba (baldes de trabajo: decisión / frenadas / a confirmar /
//  en marcha) que filtran sin perder el resto, y una tabla donde el ESTADO
//  resume "qué le pasa" a la orden con un ícono de alarma. Cualquier estado
//  del ciclo aparece acá: a confirmar, impacto detectado, en marcha, etc.
// =====================================================================
(function (global) {
  const Ordenes = {
    texto: '', bucket: '', _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = UI.head('Ventas', 'Órdenes de venta',
        'Todas las órdenes activas · tocá una tarjeta de arriba para filtrar sin perder el resto.',
        `<button class="btn primary" id="ov-nueva">+ Nueva orden</button>`) +
        `<div id="ov-cards" class="ov-cards"></div>
         <div class="pcard" style="margin-top:14px">
           <div class="row" style="margin-bottom:8px">
             <h3 id="ov-tit" style="margin:0;color:var(--navy);font-size:15px">Todas las órdenes</h3>
             <span id="ov-sub" class="muted" style="margin-left:8px;font-size:12px"></span>
             <div class="sp" style="flex:1"></div>
             <input id="ov-q" placeholder="Cliente o N°…" style="width:170px" value="${UI.esc(this.texto)}">
           </div>
           <div id="ov-lista">${UI.spinner()}</div>
         </div>
         <style>
           .ov-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:4px}
           @media(max-width:1050px){.ov-cards{grid-template-columns:repeat(2,1fr)}}
           .ov-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;transition:.12s;text-align:left}
           .ov-card:hover{border-color:var(--brand);box-shadow:var(--shadow)}
           .ov-card[aria-current="true"]{border-color:var(--brand);background:var(--brand-soft)}
           .ov-card .lab{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--ink-soft)}
           .ov-card .dotc{width:9px;height:9px;border-radius:50%;flex:none}
           .ov-card .num{font-size:26px;font-weight:800;color:var(--navy);margin-top:6px;line-height:1}
           .ov-t td{vertical-align:middle}
           .ov-t .ico{font-size:16px;text-align:center;width:34px}
           .ov-t .muebles{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:20px;padding:2px 9px;font-size:12px;color:var(--ink-soft)}
           .ov-t .kb{border:0;background:none;cursor:pointer;font-size:16px;color:var(--muted);padding:4px 7px;border-radius:7px}
           .ov-t .kb:hover{background:var(--line-soft)}
         </style>`;
      document.getElementById('ov-nueva').onclick = () => global.App.goSub('ventas', 'nueva');
      const q = document.getElementById('ov-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.texto = q.value.trim(); this.pintar(); }, 200); };
      this.pintar();
    },

    async pintar() {
      const cont = document.getElementById('ov-lista'); if (!cont) return;
      const DB = global.DB;
      const { conteos, filas } = await DB.ordenesVenta({ texto: this.texto, bucket: this.bucket });

      // Tarjetas de arriba (baldes de trabajo).
      const cards = document.getElementById('ov-cards');
      const dotcol = { info: 'var(--brand)', crit: 'var(--crit)', warn: 'var(--warn)', ok: 'var(--ok)', soft: 'var(--muted)' };
      cards.innerHTML = DB.BUCKETS_ORDEN.map(b => `<button class="ov-card" data-b="${b.k}" aria-current="${this.bucket === b.k}">
        <div class="lab"><span class="dotc" style="background:${dotcol[b.dot] || dotcol.info}"></span>${UI.esc(b.label)}</div>
        <div class="num">${conteos[b.k] ?? 0}</div></button>`).join('');
      cards.querySelectorAll('[data-b]').forEach(c => c.onclick = () => {
        this.bucket = this.bucket === c.dataset.b ? '' : c.dataset.b;   // volver a tocar = quitar filtro
        this.pintar();
      });
      const bLabel = (DB.BUCKETS_ORDEN.find(x => x.k === this.bucket) || {}).label || 'Todas las órdenes';
      document.getElementById('ov-tit').textContent = bLabel;
      document.getElementById('ov-sub').textContent = `${filas.length} de ${conteos[''] || 0} órdenes`;

      cont.innerHTML = filas.length ? `<div style="overflow-x:auto"><table class="ov-t">
        <thead><tr><th></th><th>Fecha</th><th>N° venta</th><th>Cliente</th><th>Estado</th>
          <th style="text-align:right">Monto</th><th>Entrega</th><th style="text-align:center">Muebles</th><th>Vendedor</th><th></th></tr></thead>
        <tbody>${filas.map(o => {
          const s = DB.SITUACION_ORDEN[o.situacion] || { label: o.situacion, pill: 'soft', icon: '•' };
          return `<tr data-o="${o.id}" style="cursor:pointer">
            <td class="ico" title="${UI.esc(s.label)}">${s.icon}</td>
            <td class="muted">${UI.esc(o.fecha)}</td>
            <td><b style="color:var(--brand)">#${UI.esc(o.numero)}</b></td>
            <td style="font-weight:600">${UI.esc(o.cliente)}</td>
            <td><span class="pill ${s.pill}">${UI.esc(s.label)}</span></td>
            <td class="tnum" style="text-align:right"><b style="color:var(--navy)">${UI.pesos(o.total)}</b></td>
            <td class="muted">${o.entrega ? UI.esc(o.entrega) : '—'}</td>
            <td style="text-align:center"><span class="muebles">🪑 ${o.items}</span></td>
            <td>${UI.esc(o.vendedor)}</td>
            <td style="text-align:center"><button class="kb" data-menu>⋮</button></td></tr>`;
        }).join('')}</tbody></table></div>`
        : UI.vacio('No hay órdenes en este balde.');

      const abrir = () => global.OrdenDetalle.render(this._mount, null, () => this.render(this._mount));
      cont.querySelectorAll('tr[data-o]').forEach(tr => {
        tr.onclick = e => { if (!e.target.closest('[data-menu]')) abrir(); };
        tr.querySelector('[data-menu]').onclick = e => { e.stopPropagation(); abrir(); };
      });
    },
  };
  global.Ordenes = Ordenes;
})(typeof window !== 'undefined' ? window : globalThis);
