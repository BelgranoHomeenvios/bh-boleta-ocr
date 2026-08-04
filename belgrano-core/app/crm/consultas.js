// =====================================================================
//  Belgrano Soft · CRM · Consultas
//  Arriba la cola: lo que entró y no tiene dueño. La derivan Cintia o
//  Dirección, nadie más. Abajo, todas las consultas para buscar una y
//  ver cómo viene. La ficha muestra la historia entera del cliente.
// =====================================================================
(function (global) {
  const Consultas = {
    _mount: 'view',
    texto: '',
    canal: '',
    etapa: '',
    abierta: null,     // id con la ficha abierta
    derivando: null,   // id con el panel de derivar abierto

    async render(mount = 'view', data) {
      this._mount = mount;
      if (data && data.id) this.abierta = data.id;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    // Cintia y Dirección derivan. El vendedor sólo ve lo suyo.
    esGestion() { return ['direccion', 'gestion'].includes(global.App.rol); },
    vendedorActual() {
      // En el demo el rol vendedor mira como Ale; con login real sale del usuario.
      return global.App.rol === 'vendedor' ? 'Ale' : '';
    },

    html() {
      const DB = global.DB;
      const gestion = this.esGestion();
      const cola = gestion ? DB.colaConsultas() : [];
      const sinResp = gestion ? DB.sinRespuesta() : [];
      const lista = DB.consultas({ texto: this.texto, canal: this.canal,
        etapa: this.etapa, vendedor: this.vendedorActual() });

      return `
        ${UI.head('CRM', 'Consultas', gestion
          ? 'La cola primero: lo que entró y todavía no tiene dueño'
          : 'Tus consultas, ordenadas por lo que hay que hacer')}

        ${gestion && cola.length ? `<div class="cx-b">
          <div class="cx-b-h">La cola — sin dueño todavía (${cola.length})</div>
          <div class="card cx-tabla"><table>
            <thead><tr><th>Cuándo</th><th>Canal</th><th>Quién</th><th>Qué preguntó</th><th></th></tr></thead>
            <tbody>${cola.map(c => this.filaCola(c)).join('')}</tbody>
          </table></div></div>` : ''}

        ${gestion && sinResp.length ? `<div class="cx-b">
          <div class="cx-b-h">Derivadas que el vendedor no tocó (${sinResp.length})</div>
          <div class="card cx-tabla"><table>
            <tbody>${sinResp.map(c => `<tr class="ojo">
              <td class="nom">${UI.esc(c.id)}</td>
              <td>${UI.esc(this.nombreDe(c))}</td>
              <td class="muted">derivada a <b>${UI.esc(c.vendedor)}</b> hace ${
                global.DB.diasDesde(c.derivadaEl || c.f)} días</td>
              <td class="muted">${UI.esc(c.que)}</td>
              <td class="td-acc"><button class="b-x" data-abrir="${UI.esc(c.id)}">Ver</button></td>
            </tr>`).join('')}</tbody></table></div></div>` : ''}

        <div class="cx-b">
          <div class="cx-b-h">Todas</div>
          <div class="card pad" style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
            <input id="cq-q" placeholder="Buscar por nombre, teléfono, Instagram…"
              value="${UI.esc(this.texto)}" style="flex:1;min-width:180px">
            <select id="cq-canal"><option value="">Todos los canales</option>
              ${DB.CANALES.map(c => `<option value="${c.k}" ${this.canal === c.k ? 'selected' : ''
                }>${UI.esc(c.label)}</option>`).join('')}</select>
            <select id="cq-etapa"><option value="">Todas las etapas</option>
              ${DB.ETAPAS.map(e => `<option value="${e.k}" ${this.etapa === e.k ? 'selected' : ''
                }>${UI.esc(e.label)}</option>`).join('')}</select>
          </div>
          ${lista.length ? `<div class="card cx-tabla"><table>
            <thead><tr><th>Cuándo</th><th>Quién</th><th>Canal</th><th>Vendedor</th>
              <th>Etapa</th><th>Próxima acción</th><th>Qué preguntó</th><th></th></tr></thead>
            <tbody>${lista.map(c => this.fila(c)).join('')}</tbody>
          </table></div>` : '<div class="hint">No hay consultas con esos filtros.</div>'}
        </div>`;
    },

    nombreDe(c) {
      return c.contacto.nombre || (c.contacto.instagram ? '@' + c.contacto.instagram : '')
        || c.contacto.telefono || 'Sin datos';
    },

    filaCola(c) {
      const DB = global.DB;
      const abierto = this.derivando === c.id;
      return `<tr class="${(DB.diasDesde(c.f) || 0) >= 1 ? 'ojo' : ''}">
          <td class="muted">${UI.esc(c.f)}${(DB.diasDesde(c.f) || 0) >= 1
            ? ` <span class="tc-tag ojo">${DB.diasDesde(c.f)} día${
              DB.diasDesde(c.f) === 1 ? '' : 's'} sin derivar</span>` : ''}</td>
          <td>${UI.esc(DB.canalDe(c.canal).label)}</td>
          <td class="nom">${UI.esc(this.nombreDe(c))}</td>
          <td class="muted">${UI.esc(c.que)}${c.orden ? ` — <button class="lnk"
            data-orden="${UI.esc(c.orden)}">ver ${UI.esc(c.orden)}</button>` : ''}</td>
          <td class="td-acc">${DB.canalDe(c.canal).venta
            ? `<button class="b-x hacer" data-derivar="${UI.esc(c.id)}">Derivar</button>`
            : `<span class="muted" style="font-size:11px">no va a un vendedor</span>`}
            <button class="b-x" data-abrir="${UI.esc(c.id)}">Ver</button></td>
        </tr>
        ${abierto ? `<tr class="tc-panel-fila"><td colspan="5"><div class="tc-panel">
          <b>¿A quién va ${UI.esc(this.nombreDe(c))}?</b>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            ${DB.vendedores().map(v => `<button class="b-x" data-dar="${UI.esc(c.id)}"
              data-v="${UI.esc(v)}">${UI.esc(v)}</button>`).join('')}
          </div>
          <label>Motivo (opcional)
            <input id="cq-motivo" placeholder="Le tocaba · conoce el producto · lo pidió"></label>
        </div></td></tr>` : ''}`;
    },

    fila(c) {
      const DB = global.DB;
      const et = DB.etapaDe(c.etapa);
      const venc = DB.consultaVencida(c);
      return `<tr class="${venc ? 'ojo' : ''}">
          <td class="muted">${UI.esc(c.f)}</td>
          <td class="nom">${UI.esc(this.nombreDe(c))}</td>
          <td class="muted">${UI.esc(DB.canalDe(c.canal).label)}</td>
          <td class="muted">${UI.esc(c.vendedor || '—')}</td>
          <td><span class="cq-et ${et.viva ? '' : c.etapa === 'concretado' ? 'ok' : 'no'}"
            >${UI.esc(et.label)}</span></td>
          <td class="${venc ? 'sube' : 'muted'}">${c.proxima && c.proxima.f
            ? `${UI.esc(c.proxima.f)} · ${UI.esc(c.proxima.que || '')}${venc ? ' — vencida' : ''}`
            : et.viva ? 'sin agendar' : '—'}</td>
          <td class="muted">${UI.esc(c.que)}</td>
          <td class="td-acc"><button class="b-x ${venc ? 'hacer' : ''}"
            data-abrir="${UI.esc(c.id)}">Ver</button></td>
        </tr>
        ${this.abierta === c.id ? `<tr class="tc-panel-fila"><td colspan="8">${
          this.ficha(c)}</td></tr>` : ''}`;
    },

    // La ficha: la historia entera. Lo que hoy no tiene el vendedor y hace
    // que atienda a ciegas.
    ficha(c) {
      const DB = global.DB;
      const cli = c.clienteId ? DB.clienteDe(c.clienteId) : null;
      const otras = cli ? DB.consultasDeCliente(cli.id).filter(x => x.id !== c.id) : [];
      const et = DB.etapaDe(c.etapa);
      return `<div class="cq-ficha">
        <div class="cq-col">
          <b>${UI.esc(this.nombreDe(c))}</b>
          <span class="muted">${[c.contacto.telefono,
            c.contacto.instagram && '@' + c.contacto.instagram, c.contacto.mail]
            .filter(Boolean).map(UI.esc).join(' · ') || 'sin más datos'}</span>
          ${cli ? `<span class="muted">Cliente desde siempre: compró ${UI.pesos(cli.comprado || 0)
            } · ${cli.consultas || 0} consultas</span>` : `<button class="b-x"
            data-enganchar="${UI.esc(c.id)}">¿Ya es cliente? Buscar y enganchar</button>`}
          ${otras.length ? `<div class="cq-otras"><b>Otras veces</b>${otras.map(x =>
            `<span>${UI.esc(x.f)} — ${UI.esc(x.que)} <i>(${
              UI.esc(DB.etapaDe(x.etapa).label)})</i></span>`).join('')}</div>` : ''}
          ${c.cotizaciones.length ? `<span class="muted">Cotizaciones: ${
            c.cotizaciones.map(UI.esc).join(', ')}</span>` : ''}
          ${c.orden ? `<button class="lnk" data-orden="${UI.esc(c.orden)}"
            >Venta ${UI.esc(c.orden)}</button>` : ''}
        </div>
        <div class="cq-col">
          <b>Etapa: ${UI.esc(et.label)}</b>
          ${et.viva ? `<div class="row" style="gap:6px;flex-wrap:wrap">
            ${DB.ETAPAS.filter(x => x.viva && x.n > et.n).map(x =>
              `<button class="b-x" data-etapa="${UI.esc(c.id)}" data-k="${x.k}"
                >${UI.esc(x.label)}</button>`).join('')}
            <button class="b-x" data-etapa="${UI.esc(c.id)}" data-k="rechazado">No compró</button>
            <button class="b-x" data-etapa="${UI.esc(c.id)}" data-k="cerrado">Cerrar</button>
          </div>
          <label>Agendar la próxima acción
            <div class="row" style="gap:6px">
              <input id="cq-af" placeholder="dd/mm" style="width:80px">
              <input id="cq-aq" placeholder="Llamarla · pasarle fotos" style="flex:1">
              <button class="b-x hacer" data-agendar="${UI.esc(c.id)}">Agendar</button>
            </div></label>` : `<span class="muted">Cerrada: no tiene próxima acción.</span>`}
          <label>Anotar lo que pasó
            <div class="row" style="gap:6px">
              <input id="cq-nota" placeholder="Le mandé el presupuesto por WhatsApp" style="flex:1">
              <button class="b-x" data-anotar="${UI.esc(c.id)}">Anotar</button>
            </div></label>
        </div>
        <div class="cq-col">
          <b>Historia</b>
          ${(c.historia || []).length ? (c.historia || []).map(h =>
            `<span class="muted">${UI.esc(h.f)} · <b>${UI.esc(h.quien)}</b> — ${
              UI.esc(h.texto)}</span>`).join('') : '<span class="muted">Nada anotado todavía.</span>'}
        </div>
      </div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const qq = q('cq-q');
      if (qq) { let t; qq.oninput = () => { clearTimeout(t);
        t = setTimeout(() => { this.texto = qq.value.trim(); this.render(this._mount); }, 250); }; }
      ['cq-canal', 'cq-etapa'].forEach(id => { const el = q(id);
        if (el) el.onchange = () => { this[id === 'cq-canal' ? 'canal' : 'etapa'] = el.value;
          this.render(this._mount); }; });

      document.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        this.abierta = this.abierta === b.dataset.abrir ? null : b.dataset.abrir;
        this.derivando = null; this.render(this._mount);
      });
      document.querySelectorAll('[data-derivar]').forEach(b => b.onclick = () => {
        this.derivando = this.derivando === b.dataset.derivar ? null : b.dataset.derivar;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-dar]').forEach(b => b.onclick = () => {
        const motivo = (q('cq-motivo') || {}).value || '';
        const r = global.DB.derivarConsulta(b.dataset.dar, b.dataset.v,
          { motivo, quien: this.quien() });
        if (r.error) return UI.aviso(r.error, 'warn');
        UI.aviso(`Derivada a ${b.dataset.v}`, 'ok');
        this.derivando = null; this.render(this._mount);
      });
      document.querySelectorAll('[data-etapa]').forEach(b => b.onclick = () => {
        const r = global.DB.moverEtapa(b.dataset.etapa, b.dataset.k, { quien: this.quien() });
        if (r.error) return UI.aviso(r.error, 'warn');
        this.render(this._mount);
      });
      document.querySelectorAll('[data-agendar]').forEach(b => b.onclick = () => {
        const f = (q('cq-af') || {}).value || '', que = (q('cq-aq') || {}).value || '';
        if (!f) return UI.aviso('Falta el día', 'warn');
        global.DB.agendarConsulta(b.dataset.agendar, f.trim(), que.trim(), this.quien());
        this.render(this._mount);
      });
      document.querySelectorAll('[data-anotar]').forEach(b => b.onclick = () => {
        const nota = ((q('cq-nota') || {}).value || '').trim();
        if (!nota) return;
        global.DB.anotarConsulta(b.dataset.anotar, nota, this.quien());
        this.render(this._mount);
      });
      document.querySelectorAll('[data-enganchar]').forEach(b => b.onclick = () => {
        const r = global.DB.engancharCliente(b.dataset.enganchar, { quien: this.quien() });
        if (r.error) return UI.aviso(r.error, 'warn');
        if (r.preguntar) return UI.aviso(
          `Hay ${r.candidatos.length} clientes que podrían ser: se resuelve en Fusionar, no se adivina`, 'warn');
        UI.aviso(r.nuevo ? `Se creó el cliente ${r.cliente.nombre}`
          : `Es ${r.cliente.nombre}, que ya estaba`, 'ok');
        this.render(this._mount);
      });
      document.querySelectorAll('[data-orden]').forEach(b => b.onclick = () => {
        global.App.goSub('ventas', 'ordenes');
      });
    },

    quien() {
      const r = global.App.rol;
      return r === 'gestion' ? 'Cintia' : r === 'vendedor' ? 'Ale'
        : r === 'direccion' ? 'Brian' : 'yo';
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cq-et{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 7px;
          border-radius:7px;background:var(--panel-2);color:var(--navy)}
        .cq-et.ok{background:var(--ok-bg);color:var(--ok)}
        .cq-et.no{background:var(--crit-bg);color:var(--crit)}
        .tc-tag{display:inline-block;margin-left:5px;font-size:9.5px;font-weight:700;
          text-transform:uppercase;letter-spacing:.04em;padding:1px 5px;border-radius:5px;
          background:var(--crit-bg);color:var(--crit)}
        .tc-tag.ojo{background:var(--warn-bg);color:var(--warn)}
        .tc-panel-fila td{background:var(--panel-2);white-space:normal}
        .tc-panel{display:flex;flex-direction:column;gap:7px;padding:4px 0;max-width:520px}
        .tc-panel label,.cq-col label{display:flex;flex-direction:column;gap:3px;font-size:11px;
          color:var(--muted);font-weight:700}
        .tc-panel input,.cq-col input{border:1px solid var(--line);border-radius:8px;
          padding:6px 8px;font:inherit;font-weight:400;color:var(--navy);background:var(--panel)}
        .cq-ficha{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
          gap:14px;padding:6px 0}
        .cq-col{display:flex;flex-direction:column;gap:6px;font-size:12.5px}
        .cq-otras{display:flex;flex-direction:column;gap:3px;font-size:12px;
          border-left:2px solid var(--line);padding-left:8px}
        .cq-otras span{color:var(--muted)}
      </style>`;
    },
  };
  global.CrmConsultas = Consultas;
})(typeof window !== 'undefined' ? window : globalThis);
