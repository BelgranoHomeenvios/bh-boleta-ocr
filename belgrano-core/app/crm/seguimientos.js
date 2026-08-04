// =====================================================================
//  Belgrano Soft · CRM · Seguimientos
//  La agenda del que vende: a quién tiene que responder o llamar hoy.
//  Lo vencido arriba y en rojo. El vendedor ve lo suyo; Cintia y
//  Dirección eligen a quién mirar.
// =====================================================================
(function (global) {
  const Seg = {
    _mount: 'view',
    vendedor: '',

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      if (global.App.rol === 'vendedor') this.vendedor = 'Ale';
      else if (!this.vendedor) this.vendedor = DB.vendedores()[0];
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    html() {
      const DB = global.DB;
      const vivas = DB.consultas({ vendedor: this.vendedor, vivas: true });
      const vencidas = vivas.filter(c => DB.consultaVencida(c));
      const sinAgendar = vivas.filter(c => !c.proxima || !c.proxima.f);
      const tablero = DB.tableroVendedor();
      const mio = tablero.find(t => t.vendedor === this.vendedor) || {};

      return `
        ${UI.head('CRM', 'Seguimientos', 'Lo vencido arriba: eso es lo que se pierde si nadie lo llama')}

        <div class="row" style="margin-bottom:12px;gap:8px;align-items:center">
          ${global.App.rol === 'vendedor' ? `<b>${UI.esc(this.vendedor)}</b>`
            : `<select id="sg-v">${DB.vendedores().map(v =>
              `<option ${v === this.vendedor ? 'selected' : ''}>${UI.esc(v)}</option>`).join('')
              }</select>`}
          <span class="muted" style="font-size:12px">${vivas.length} en seguimiento ·
            ${vencidas.length} vencidas · convierte el ${mio.conv || 0}%</span>
        </div>

        ${vivas.length ? `<div class="card cx-tabla"><table>
          <thead><tr><th>Próxima acción</th><th>Quién</th><th>Etapa</th>
            <th>Qué preguntó</th><th>Última anotación</th><th></th></tr></thead>
          <tbody>${vivas.map(c => {
            const venc = DB.consultaVencida(c);
            const ult = (c.historia || [])[0];
            return `<tr class="${venc ? 'mal' : (!c.proxima || !c.proxima.f) ? 'ojo' : ''}">
              <td class="${venc ? 'sube nom' : 'nom'}">${c.proxima && c.proxima.f
                ? `${UI.esc(c.proxima.f)} · ${UI.esc(c.proxima.que || '')}${
                  venc ? ' — VENCIDA' : ''}`
                : 'sin agendar'}</td>
              <td class="nom">${UI.esc(c.contacto.nombre || (c.contacto.instagram
                ? '@' + c.contacto.instagram : c.contacto.telefono || '—'))}</td>
              <td class="muted">${UI.esc(DB.etapaDe(c.etapa).label)}</td>
              <td class="muted">${UI.esc(c.que)}</td>
              <td class="muted">${ult ? `${UI.esc(ult.f)} — ${UI.esc(ult.texto)}` : '—'}</td>
              <td class="td-acc"><button class="b-x ${venc ? 'hacer' : ''}"
                data-ver="${UI.esc(c.id)}">Abrir</button></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
          : `<div class="hint">${UI.esc(this.vendedor)} no tiene consultas en seguimiento.</div>`}

        ${sinAgendar.length ? `<div class="hint" style="margin-top:10px;border-left:3px solid var(--warn);padding-left:9px">
          ${sinAgendar.length} consulta${sinAgendar.length === 1 ? '' : 's'} sin próxima acción:
          una consulta sin fecha es una consulta que se olvida.</div>` : ''}

        <div class="cx-b" style="margin-top:18px">
          <div class="cx-b-h">Quién convierte mejor — no quién vende más</div>
          <div class="card cx-tabla"><table>
            <thead><tr><th>Vendedor</th><th class="num">Consultas</th><th class="num">Concretadas</th>
              <th class="num">Convierte</th><th class="num">Abiertas</th><th class="num">Vencidas</th></tr></thead>
            <tbody>${global.DB.tableroVendedor().map(t => `<tr class="${
              t.vendedor === this.vendedor ? 'ojo' : ''}">
              <td class="nom">${UI.esc(t.vendedor)}</td>
              <td class="num">${t.consultas}</td>
              <td class="num">${t.concret}</td>
              <td class="num nom">${t.conv}%</td>
              <td class="num muted">${t.abiertas}</td>
              <td class="num ${t.vencidas ? 'sube' : 'muted'}">${t.vencidas}</td>
            </tr>`).join('')}</tbody></table></div>
        </div>`;
    },

    enganchar() {
      const sel = document.getElementById('sg-v');
      if (sel) sel.onchange = () => { this.vendedor = sel.value; this.render(this._mount); };
      document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => {
        global.CrmConsultas.abierta = b.dataset.ver;
        global.App.goSub('crm', 'consultas');
      });
    },

    estilos() { return global.ComprasEstilos ? global.ComprasEstilos() : ''; },
  };
  global.CrmSeguimientos = Seg;
})(typeof window !== 'undefined' ? window : globalThis);
