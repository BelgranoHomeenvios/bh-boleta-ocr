// =====================================================================
//  Belgrano Soft · Clientes (CRM)
//  Una fila por identidad (teléfono/IG/mail), con su historial. Pensada
//  para la recompra. Fusionar / archivar / varios teléfonos por cliente.
// =====================================================================
(function (global) {
  const Clientes = {
    texto: '',
    // Se puede entrar directo a la ficha de un cliente (desde una cotización,
    // por ejemplo) pasando {id} o {buscar: 'nombre o teléfono'}.
    async render(mount = 'view', data) {
      this._mount = mount;
      if (data && data.id != null) return this.detalle(data.id);
      if (data && data.buscar) {
        this.texto = String(data.buscar);
        const cs = await global.DB.clientes({ texto: this.texto });
        if (cs.length === 1) return this.detalle(cs[0].id);
      }
      return this._lista(mount);
    },
    async _lista(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = UI.head('Ventas', 'Clientes',
        'Una fila por teléfono, con todo su historial. Cuando el cliente vuelve, acá está lo que pasó con él y quién lo tiene.',
        `<button class="btn" id="cl-fusion">⇄ Fusionar</button>`) +
        `<div class="card pad" style="margin-bottom:14px">
           <input id="cl-q" placeholder="Buscar por nombre o teléfono…" value="${UI.esc(this.texto)}">
         </div>
         <div id="cl-lista">${UI.spinner()}</div>`;
      document.getElementById('cl-fusion').onclick = () => UI.aviso('Fusionar clientes: próximo paso', 'info');
      const q = document.getElementById('cl-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { this.texto = q.value.trim(); this.pintar(); }, 200); };
      this.pintar();
    },
    async pintar() {
      const cont = document.getElementById('cl-lista');
      try {
        const cs = await global.DB.clientes({ texto: this.texto });
        cont.innerHTML = cs.length ? `<div class="card"><table>
          <thead><tr><th>Cliente</th><th>Teléfono</th><th>Vendedor</th>
            <th style="text-align:center">Consultas</th><th style="text-align:center">Concret.</th>
            <th style="text-align:center">Seguim.</th><th style="text-align:right">Comprado</th><th style="text-align:right">Última</th></tr></thead>
          <tbody>${cs.map(c => `<tr style="cursor:pointer" data-cli="${c.id}">
            <td><b>${UI.esc(c.nombre)}</b></td><td class="muted tnum">${UI.esc(c.telefono)}</td>
            <td><span class="pill soft">${UI.esc(c.vendedor)}</span></td>
            <td style="text-align:center" class="tnum">${c.consultas}</td>
            <td style="text-align:center" class="tnum" style="color:var(--ok)">${c.concret || '—'}</td>
            <td style="text-align:center" class="tnum">${c.seguim || '—'}</td>
            <td style="text-align:right" class="tnum"><b>${c.comprado ? UI.pesos(c.comprado) : '—'}</b></td>
            <td style="text-align:right" class="muted">${UI.esc(c.ultima)}</td></tr>`).join('')}</tbody></table></div>`
          : UI.vacio('No hay clientes para esa búsqueda.');
        cont.querySelectorAll('[data-cli]').forEach(tr => tr.onclick = () => this.detalle(Number(tr.dataset.cli)));
      } catch (e) { cont.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
    },
    async detalle(id) {
      const c = await global.DB.cliente(id);
      if (!c) return;
      const v = document.getElementById(this._mount);
      v.innerHTML = `
        <button class="btn sm" id="cl-volver" style="margin-bottom:16px">← Clientes</button>
        <div class="row" style="align-items:flex-start;margin-bottom:16px">
          <div><h1 class="h-title">${UI.esc(c.nombre)} ⭐</h1>
            <div class="h-sub tnum">${UI.esc(c.telefono)} · cliente desde jul 2026</div></div>
          <div class="sp"></div>
          <div style="text-align:right"><div class="big tnum" style="color:var(--ok)">${UI.pesos(c.comprado)}</div>
            <div class="muted" style="font-size:12px">COMPRADO EN TOTAL</div></div>
        </div>
        <div class="wrap-row" style="margin-bottom:18px">
          ${chip(c.consultas, 'Consultas')}${chip(c.concret, 'Ventas')}${chip(c.seguim, 'En seguim.')}
          <div class="card pad" style="text-align:center"><b style="color:var(--brand-ink)">Potable</b><div class="muted" style="font-size:11px">OPORTUNIDAD</div></div>
        </div>
        <div class="card">
          <div style="padding:12px 14px;border-bottom:1px solid var(--line)"><b style="color:var(--navy)">Historial de atenciones</b></div>
          ${histo('27 jul', 'entregado', 'Local · atendió Ale', 'N° 4309', 516000, 'Intervino Brian (venta compartida $516.000 / $516.000)')}
          ${histo('24 jul', 'entregado', 'Local · atendió Cristian', 'N° 4308', 516000, 'TIENE QUE CHEQUEAR MEDIDAS')}
          <div class="empty" style="padding:20px">Demo — el historial real sale de las atenciones del cliente.</div>
        </div>`;
      document.getElementById('cl-volver').onclick = () => this.render(this._mount);

      function chip(n, txt) {
        return `<div class="card pad" style="text-align:center;min-width:96px"><div class="big tnum">${n || 0}</div><div class="muted" style="font-size:11px;text-transform:uppercase">${txt}</div></div>`;
      }
      function histo(fecha, estado, quien, num, monto, nota) {
        return `<div style="padding:12px 14px;border-bottom:1px solid var(--line-soft)">
          <div class="row"><span class="muted" style="min-width:64px">${fecha}</span>
            ${UI.estado(global.DB.ESTADO_ORDEN, estado)}<span class="muted">${UI.esc(quien)}</span>
            <span class="muted">${UI.esc(num)}</span><div class="sp"></div><b class="tnum">${UI.pesos(monto)}</b></div>
          <div class="muted" style="font-size:12px;margin-top:4px;padding-left:64px">🏳️ ${UI.esc(nota)}</div></div>`;
      }
    },
  };
  global.Clientes = Clientes;
})(typeof window !== 'undefined' ? window : globalThis);
