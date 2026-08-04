// =====================================================================
//  Belgrano Soft · CRM · Qué hacer hoy
//  La entrada del CRM, calcada de la app que ya usan: las dos puertas
//  arriba —atención en el local, consulta virtual— y abajo lo que cada
//  uno tiene que resolver HOY. El vendedor ve su agenda; Cintia ve la
//  cola y lo derivado que nadie tocó; Dirección ve además los
//  movimientos del día y cuánto vendió cada canal.
// =====================================================================
(function (global) {
  const Tablero = {
    _mount: 'view',
    cargando: null,   // 'local' | 'virtual' | null — el formulario abierto
    hecho: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    esGestion() { return ['direccion', 'gestion'].includes(global.App.rol); },
    vendedorActual() { return global.App.rol === 'vendedor' ? 'Ale' : ''; },

    html() {
      const gestion = this.esGestion();
      return `
        ${UI.head('CRM', 'Qué hacer hoy', gestion
          ? 'La cola, lo que nadie tocó y lo que hizo cada uno'
          : 'Tu agenda: a quién responder o llamar hoy')}

        <div class="ct-acciones card pad">
          <button class="btn" data-cargar="local">🏪 Registrar atención en local</button>
          ${gestion ? `<button class="btn sec" data-cargar="virtual">💬 Cargar consulta virtual</button>` : ''}
          <span class="hint" style="margin:0">${gestion
            ? 'La virtual entra a la cola sin dueño; la del local ya nace con su vendedor.'
            : 'Sólo la del que miró y no se llevó nada: si cotizás, la consulta se crea sola.'}</span>
        </div>

        ${this.hecho ? `<div class="ct-hecho">${UI.esc(this.hecho)}</div>` : ''}
        ${this.cargando ? this.formulario() : ''}

        ${this.vendedorActual() ? this.htmlVendedor() : this.htmlGestion()}`;
    },

    // ---- La pantalla del vendedor -----------------------------------------
    htmlVendedor() {
      const DB = global.DB;
      const v = this.vendedorActual();
      const vivas = DB.consultas({ vendedor: v, vivas: true });
      const vencidas = vivas.filter(c => DB.consultaVencida(c));
      const hoy = vivas.filter(c => c.proxima && c.proxima.f
        && (DB.diasHasta(c.proxima.f) || 0) <= 0 && !DB.consultaVencida(c));
      const sinAgendar = vivas.filter(c => !c.proxima || !c.proxima.f);
      const mio = DB.tableroVendedor().find(t => t.vendedor === v) || {};
      return `
        <div class="cx-kpis">
          ${this.kpi('En seguimiento', vivas.length, 'consultas vivas', '', 'seguimientos')}
          ${this.kpi('Vencidas', vencidas.length, 'llamalos hoy o se pierden',
            vencidas.length ? 'alerta' : '', 'seguimientos')}
          ${this.kpi('Para hoy', hoy.length, 'agendadas para hoy', hoy.length ? 'ojo' : '', 'seguimientos')}
          ${this.kpi('Convertís', (mio.conv || 0) + '%', `${mio.concret || 0} de ${mio.consultas || 0} consultas`, '')}
        </div>
        ${this.lista('Primero lo vencido, después lo de hoy',
          vencidas.concat(hoy),
          'No tenés nada vencido ni agendado para hoy.')}
        ${sinAgendar.length ? `<div class="hint">⚠ Tenés ${sinAgendar.length} consulta${
          sinAgendar.length === 1 ? '' : 's'} viva${sinAgendar.length === 1 ? '' : 's'} sin
          próxima acción. Una consulta sin fecha es una consulta que se olvida.</div>` : ''}`;
    },

    // ---- La pantalla de Cintia y Dirección --------------------------------
    htmlGestion() {
      const DB = global.DB;
      const cola = DB.colaConsultas();
      const sinResp = DB.sinRespuesta();
      const canales = DB.tableroCanal();
      const equipo = DB.tableroVendedor();
      const mov = DB.movimientosDelDia();
      const dir = global.App.rol === 'direccion';
      return `
        <div class="cx-kpis">
          ${this.kpi('La cola', cola.length, 'sin dueño todavía', cola.length ? 'ojo' : '', 'consultas')}
          ${this.kpi('Sin respuesta', sinResp.length, 'derivadas que nadie tocó',
            sinResp.length ? 'alerta' : '', 'consultas')}
          ${this.kpi('Movimientos hoy', mov.total, 'de todo el equipo')}
          ${this.kpi('Para fusionar', DB.candidatosFusion().filter(p => p.fuerte).length,
            'clientes repetidos', '', 'fusiones')}
        </div>

        ${cola.length ? `<div class="cx-b">
          <div class="cx-b-h">La cola — derivar es lo primero (${cola.length})</div>
          <div class="card cx-tabla"><table><tbody>
            ${cola.map(c => `<tr class="cliq" data-ver="${UI.esc(c.id)}">
              <td class="muted">${UI.esc(c.f)}</td>
              <td>${UI.esc(DB.canalDe(c.canal).label)}</td>
              <td class="nom">${UI.esc(DB.nombreConsulta(c))}</td>
              <td class="muted">${UI.esc(c.que)}</td>
              <td class="td-acc"><button class="b-x hacer" data-ver="${UI.esc(c.id)}">Derivar</button></td>
            </tr>`).join('')}
          </tbody></table></div></div>` : ''}

        <div class="ct-dos">
          <div class="cx-b">
            <div class="cx-b-h">Movimientos del día — ${UI.esc(DB.hoyCorto())}</div>
            ${mov.total ? Object.entries(mov.por).map(([quien, ms]) => `
              <div class="card pad ct-mov">
                <b>${UI.esc(quien)}</b><span class="muted"> · ${ms.length}</span>
                ${ms.map(m => `<div class="ct-mov-l"><span class="nom">${
                  UI.esc(m.cliente)}</span> — ${UI.esc(m.texto)}</div>`).join('')}
              </div>`).join('')
              : '<div class="hint">Hoy todavía no se movió nada.</div>'}
          </div>
          ${dir ? `<div class="cx-b">
            <div class="cx-b-h">Cuánto vendió cada canal</div>
            <div class="card cx-tabla"><table>
              <thead><tr><th>Canal</th><th class="num">Consultas</th>
                <th class="num">Concretó</th><th class="num">Convierte</th>
                <th class="num">Plata</th></tr></thead>
              <tbody>${canales.map(f => `<tr>
                <td class="nom">${UI.esc(f.label)}</td>
                <td class="num">${f.consultas}</td>
                <td class="num">${f.concret}</td>
                <td class="num">${f.conv}%</td>
                <td class="num nom">${UI.pesos(f.plata)}</td></tr>`).join('')}
              </tbody></table></div>

            <div class="cx-b-h" style="margin-top:14px">Quién convierte mejor</div>
            <div class="card cx-tabla"><table>
              <tbody>${equipo.map(f => `<tr>
                <td class="nom">${UI.esc(f.vendedor)}</td>
                <td class="num">${f.concret} de ${f.consultas}</td>
                <td class="num nom">${f.conv}%</td>
                <td class="num ${f.vencidas ? 'sube' : 'muted'}">${f.vencidas
                  ? f.vencidas + ' vencidas' : 'al día'}</td></tr>`).join('')}
              </tbody></table></div>
          </div>` : ''}
        </div>`;
    },

    lista(titulo, cs, vacio) {
      const DB = global.DB;
      return `<div class="cx-b"><div class="cx-b-h">${UI.esc(titulo)}</div>
        ${cs.length ? `<div class="card cx-tabla"><table><tbody>
          ${cs.map(c => {
            const venc = DB.consultaVencida(c);
            return `<tr class="cliq ${venc ? 'mal' : ''}" data-ver="${UI.esc(c.id)}">
              <td class="${venc ? 'sube nom' : 'nom'}">${c.proxima
                ? `${UI.esc(c.proxima.f)} · ${UI.esc(c.proxima.que || '')}` : '—'}</td>
              <td>${UI.esc(DB.nombreConsulta(c))}</td>
              <td class="muted">${UI.esc(DB.etapaDe(c.etapa).label)}</td>
              <td class="muted">${UI.esc(c.que)}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>` : `<div class="hint">${UI.esc(vacio)}</div>`}</div>`;
    },

    kpi(t, v, pie, tono = '', irA = '') {
      return `<${irA ? 'button' : 'div'} class="cx-k ${tono} ${irA ? 'cliq' : ''}"
        ${irA ? `data-ir="${irA}"` : ''} style="text-align:left;font:inherit">
        <span class="cx-k-t">${UI.esc(t)}</span><span class="cx-k-v">${UI.esc(String(v))}</span>
        <span class="cx-k-p">${UI.esc(pie)}</span></${irA ? 'button' : 'div'}>`;
    },

    // Las dos puertas piden lo mismo —quién es y qué quiere— y difieren en una
    // sola cosa: la del local ya tiene vendedor.
    formulario() {
      const local = this.cargando === 'local';
      const DB = global.DB;
      const vend = this.vendedorActual();
      return `<div class="card pad ct-form">
        <b>${local ? 'Atención en el local' : 'Consulta virtual — entra a la cola'}</b>
        <div class="ct-form-g">
          <label>Nombre<input id="ct-nombre" autocomplete="off"></label>
          <label>Teléfono<input id="ct-tel" autocomplete="off"></label>
          <label>Instagram<input id="ct-ig" placeholder="@" autocomplete="off"></label>
          ${local
            ? (vend ? `<label>Vendedor<input value="${UI.esc(vend)}" disabled></label>`
              : `<label>Vendedor<select id="ct-vend">${DB.vendedores().map(v =>
                `<option>${UI.esc(v)}</option>`).join('')}</select></label>`)
            : `<label>Canal<select id="ct-canal">${DB.CANALES.map(c =>
              `<option value="${c.k}">${UI.esc(c.label)}</option>`).join('')}</select></label>`}
        </div>
        <label>Qué preguntó<input id="ct-que" placeholder="Cómoda Amberes en 1,60" autocomplete="off"></label>
        <div class="row" style="gap:7px">
          <button class="btn" id="ct-ok">${local ? 'Registrar' : 'A la cola'}</button>
          <button class="b-x" id="ct-cancel">Cancelar</button>
        </div>
        <span class="hint" style="margin:0">Con teléfono, Instagram o mail el sistema busca si
          el cliente ya existe y le engancha la historia. Sin nada de eso queda suelta.</span>
      </div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      document.querySelectorAll('[data-cargar]').forEach(b => b.onclick = () => {
        this.cargando = this.cargando === b.dataset.cargar ? null : b.dataset.cargar;
        this.hecho = null;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-ver]').forEach(b => b.onclick = e => {
        e.stopPropagation();
        global.App.goSub('crm', 'consultas');
        global.CrmConsultas.render(this._mount, { id: b.dataset.ver });
      });
      document.querySelectorAll('[data-ir]').forEach(b =>
        b.onclick = () => global.App.goSub('crm', b.dataset.ir));
      const cancel = q('ct-cancel');
      if (cancel) cancel.onclick = () => { this.cargando = null; this.render(this._mount); };
      const ok = q('ct-ok');
      if (ok) ok.onclick = () => this.cargar();
    },

    cargar() {
      const q = id => (document.getElementById(id) || {}).value || '';
      const local = this.cargando === 'local';
      const contacto = { nombre: q('ct-nombre').trim(), telefono: q('ct-tel').trim(),
        instagram: q('ct-ig').trim() };
      const que = q('ct-que').trim();
      // El vendedor no le puede dar nada al cliente sin cargarlo: mínimo el
      // nombre o un dato de contacto, y qué preguntó.
      if (!contacto.nombre && !contacto.telefono && !contacto.instagram) {
        UI.aviso('Cargá al menos el nombre, el teléfono o el Instagram.', 'warn'); return;
      }
      if (!que) { UI.aviso('Anotá qué preguntó, aunque sea corto.', 'warn'); return; }
      const vendedor = local ? (this.vendedorActual() || q('ct-vend')) : '';
      const c = global.DB.crearConsulta({ canal: local ? 'local' : (q('ct-canal') || 'whatsapp'),
        contacto, que, vendedor, quien: vendedor || 'Cintia' });
      this.cargando = null;
      this.hecho = local
        ? `Registrada la atención de ${global.DB.nombreConsulta(c)}. Quedó en tu seguimiento.`
        : `${global.DB.nombreConsulta(c)} entró a la cola. Falta derivarla.`;
      this.render(this._mount);
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .ct-acciones{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
        .btn.sec{background:var(--panel-2);color:var(--navy);border:1px solid var(--line)}
        .ct-hecho{border:1px solid var(--ok);background:var(--ok-bg);color:var(--ok);
          border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:600;margin-bottom:12px}
        .ct-form{display:flex;flex-direction:column;gap:9px;margin-bottom:14px;max-width:640px}
        .ct-form-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
        .ct-form label{display:flex;flex-direction:column;gap:3px;font-size:11px;
          color:var(--muted);font-weight:700}
        .ct-form input,.ct-form select{border:1px solid var(--line);border-radius:8px;
          padding:6px 8px;font:inherit;font-weight:400;color:var(--navy);background:var(--panel)}
        .ct-dos{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .ct-mov{margin-bottom:9px}
        .ct-mov-l{font-size:12px;padding:3px 0;border-top:1px solid var(--line-soft);margin-top:4px}
        .cx-k.cliq{cursor:pointer}
        .cx-k.cliq:hover{border-color:var(--brand)}
        @media (max-width:900px){ .ct-dos{grid-template-columns:1fr} }
      </style>`;
    },
  };
  global.CrmTablero = Tablero;
})(typeof window !== 'undefined' ? window : globalThis);
