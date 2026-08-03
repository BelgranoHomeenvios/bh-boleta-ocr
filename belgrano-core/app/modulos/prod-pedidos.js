// =====================================================================
//  Belgrano Soft · Producción · Pedidos
//  El pedido se abre para un taller y se le van agregando muebles a
//  medida que se venden. Cuando está, se cierra —ahí pasa a fábrica con
//  su rango de fechas— y se imprime. Si te olvidaste algo, se reabre.
// =====================================================================
(function (global) {
  const Pedidos = {
    _mount: 'view',
    abierto: null,   // número de pedido que se está mirando

    async render(mount = 'view') {
      this._mount = mount;
      if (!this.prods) this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierto ? this.htmlUno(this.abierto) : this.htmlLista()) + this.estilos();
      this.enganchar();
    },
    volver() { this.abierto = null; this.render(this._mount); },
    ver(num) { this.abierto = num; this.render(this._mount); },

    // ---- La lista de pedidos ----------------------------------------------
    htmlLista() {
      const ps = global.DB.pedidosTodos();
      const abiertos = ps.filter(p => p.estado === 'abierto');
      const enCalle = ps.filter(p => p.estado === 'cerrado' || p.estado === 'entregado');
      const cerrados = ps.filter(p => p.estado === 'recibido');
      const fila = p => {
        const its = global.DB.itemsDePedido(p.numero);
        const e = global.DB.estadoPedido(p.estado);
        const debe = its.filter(u => u.estado === 'produccion').length;
        const venc = its.filter(u => global.DB.vencida(u)).length;
        return `<tr>
          <td class="nom">${UI.esc(p.numero)}</td>
          <td>${UI.esc(p.proveedor || '—')}</td>
          <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
          <td class="tnum">${its.length}</td>
          <td class="${venc ? 'venc' : 'muted'}">${p.desde && p.hasta
            ? `${UI.esc(p.desde)} y ${UI.esc(p.hasta)}${venc ? ` · ${venc} vencidos` : ''}`
            : '—'}</td>
          <td class="muted">${debe ? `debe ${debe}` : 'nada pendiente'}</td>
          <td class="td-acc"><button class="b-x" data-ver="${UI.esc(p.numero)}">Abrir</button></td>
        </tr>`;
      };
      const bloque = (t, lista, pie) => `<div class="pd-b">
        <div class="pd-b-h">${t} <span class="muted">${lista.length}</span></div>
        ${lista.length ? `<div class="card pd-tabla"><table>
          <thead><tr><th>Pedido</th><th>Taller</th><th>Estado</th><th>Muebles</th>
            <th>Entra entre</th><th></th><th></th></tr></thead>
          <tbody>${lista.map(fila).join('')}</tbody></table></div>`
          : `<div class="hint" style="padding:8px 2px">${pie}</div>`}
      </div>`;
      return `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Producción</div><h1 class="h-title">Pedidos</h1>
            <div class="h-sub">${ps.length} pedidos · ${abiertos.length} sin mandar todavía</div></div>
          <div class="sp"></div>
          <button class="btn primary" id="pd-nuevo">Abrir un pedido</button>
        </div>
        ${bloque('Abiertos — se les puede seguir agregando', abiertos,
          'No hay ninguno abierto. Abrí uno para empezar a juntar muebles.')}
        ${bloque('En la calle', enCalle, 'No hay nada en ningún taller.')}
        ${bloque('Cerrados', cerrados, 'Todavía no se recibió ninguno completo.')}`;
    },

    // ---- Un pedido --------------------------------------------------------
    htmlUno(num) {
      const p = global.DB.pedido(num);
      if (!p) return UI.vacio('No existe ese pedido.');
      const its = global.DB.itemsDePedido(num);
      const e = global.DB.estadoPedido(p.estado);
      const abierto = p.estado === 'abierto';
      const conDibujo = its.filter(u => (u.modo || 'dibujo') === 'dibujo');
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="pd-volver">‹ Pedidos</button>
          <span class="muted">${UI.esc(p.proveedor)}</span>
        </div>
        <div class="row" style="align-items:flex-start;margin-bottom:12px">
          <div><div class="kick">Producción · Pedido</div>
            <h1 class="h-title">${UI.esc(p.numero)}</h1>
            <div class="h-sub">${UI.esc(p.proveedor)} · ${its.length} muebles${
              p.abiertoEl ? ` · abierto el ${UI.esc(p.abiertoEl)}` : ''}</div></div>
          <div class="sp"></div>
          <span class="pill ${e.pill}">${UI.esc(e.label)}</span>
        </div>

        <div class="pd-acc">
          <span class="hint">${UI.esc(e.pie)}</span>
          <div class="sp"></div>
          ${abierto ? `<button class="btn" id="pd-agregar">Agregar muebles</button>
            <button class="btn primary" id="pd-cerrar">Cerrar y mandar</button>`
            : `<button class="btn" id="pd-reabrir">Reabrir</button>
               <button class="btn" id="pd-imprimir">Imprimir</button>`}
        </div>

        ${p.desde && p.hasta ? `<div class="hint" style="margin:10px 0">Tiene que entrar
          <b>entre el ${UI.esc(p.desde)} y el ${UI.esc(p.hasta)}</b>.</div>` : ''}

        ${its.length ? `<div class="card pd-tabla" style="margin-top:6px"><table>
          <thead><tr><th>Mueble</th><th>Tipo</th><th>Terminación</th><th>Plano</th>
            <th>Pedido</th><th>Agregado</th><th></th></tr></thead>
          <tbody>${its.map(u => {
            const t = global.DB.tipoUnidad(u.tipo);
            return `<tr>
              <td class="nom">${UI.esc(u.modelo)} <span class="muted">${UI.esc(u.medida)}</span></td>
              <td>${u.tipo === 'estandar' ? '<span class="muted">estándar</span>'
                : `<span class="pr-tipo ${u.tipo}">${UI.esc(t.label.toLowerCase())}</span>`}</td>
              <td class="muted">${UI.esc(u.color)}</td>
              <td class="muted">${global.DB.planoListo(u) ? 'listo'
                : `<span class="pill crit">${UI.esc(global.DB.planoEstado(u.planoEstado).label)}</span>`}</td>
              <td class="muted">${u.orden ? UI.esc(u.orden) : 'stock'}</td>
              <td class="muted">${UI.esc(u.agregadoEl || p.abiertoEl || '—')}</td>
              <td class="td-acc">${abierto
                ? `<button class="b-x" data-sacar="${u.id}">Sacar</button>` : ''}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`
          : '<div class="hint" style="padding:14px 2px">Todavía no tiene muebles. Agregale los que le vas a dar.</div>'}

        <div class="pd-dos">
          <div class="card pad">
            <div class="kick" style="margin-bottom:8px">Qué se imprime</div>
            <ul class="pd-l">
              <li><b>1 remito</b> con los ${its.length} muebles, para que firme lo que se lleva.</li>
              <li><b>${conDibujo.length} hojas</b> con el plano de cada uno — el original para él.</li>
              <li><b>${its.length} copias</b> con código de barras, que quedan acá y se pegan al
                mueble cuando vuelve.</li>
            </ul>
          </div>
          <div class="card pad">
            <div class="kick" style="margin-bottom:8px">Historial</div>
            <div class="pd-hist">${(p.historial || []).length
              ? p.historial.map(h => `<div><span class="f">${UI.esc(h.f)}</span>
                  <span>${UI.esc(h.t)}</span></div>`).join('')
              : '<div class="muted">Sin movimientos todavía.</div>'}</div>
          </div>
        </div>`;
    },

    // ---- Acciones ---------------------------------------------------------
    enganchar() {
      const q = id => document.getElementById(id);
      const n = q('pd-nuevo'); if (n) n.onclick = () => this.modalNuevo();
      const v = q('pd-volver'); if (v) v.onclick = () => this.volver();
      document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => this.ver(b.dataset.ver));
      const ag = q('pd-agregar'); if (ag) ag.onclick = () => this.modalAgregar();
      const ce = q('pd-cerrar'); if (ce) ce.onclick = () => {
        const its = global.DB.itemsDePedido(this.abierto);
        if (!its.length) return UI.aviso('El pedido está vacío', 'warn');
        const sinPlano = its.filter(u => !global.DB.planoListo(u));
        if (sinPlano.length) {
          return UI.aviso(`${sinPlano.length} sin el plano resuelto — no se puede mandar`, 'warn');
        }
        global.DB.cerrarPedido(this.abierto, 'yo');
        UI.aviso('Pedido cerrado — listo para imprimir', 'ok');
        this.render(this._mount);
      };
      const re = q('pd-reabrir'); if (re) re.onclick = () => {
        global.DB.reabrirPedido(this.abierto, 'yo');
        UI.aviso('Pedido reabierto', 'ok'); this.render(this._mount);
      };
      const im = q('pd-imprimir'); if (im) im.onclick = () =>
        UI.aviso('La impresión sale cuando enganchemos los PDF de Drive', 'warn');
      document.querySelectorAll('[data-sacar]').forEach(b => b.onclick = () => {
        global.DB.sacarDePedido(this.abierto, Number(b.dataset.sacar));
        this.render(this._mount);
      });
    },

    modalNuevo() {
      const provs = global.DB.proveedores();
      const hoy = global.DB.hoyCorto();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="pr-back" id="pd-mdl"><div class="card pad" style="max-width:430px;width:100%">
          <h3 class="h-title" style="font-size:17px">Abrir un pedido</h3>
          <p class="h-sub">Se abre vacío y se le van agregando muebles.</p>
          <label class="fld" style="margin-top:12px"><span class="lbl">Taller</span>
            <select id="pd-prov">${provs.map(x =>
              `<option value="${UI.esc(x.nombre)}">${UI.esc(x.nombre)}</option>`).join('')}</select></label>
          <div class="cz-cols">
            <label class="fld"><span class="lbl">Entra desde</span>
              <input id="pd-d" value="${UI.esc(hoy)}"></label>
            <label class="fld"><span class="lbl">Hasta</span>
              <input id="pd-h" placeholder="12/8"></label>
          </div>
          <div class="hint">La fecha es un rango de una semana, no un día.</div>
          <div class="row" style="margin-top:16px;gap:10px"><div class="sp"></div>
            <button class="btn" id="pd-x">Cancelar</button>
            <button class="btn primary" id="pd-ok">Abrir</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('pd-mdl'); if (m) m.remove(); };
      document.getElementById('pd-x').onclick = cerrar;
      document.getElementById('pd-mdl').onclick = e => { if (e.target.id === 'pd-mdl') cerrar(); };
      document.getElementById('pd-ok').onclick = () => {
        const p = global.DB.abrirPedido({
          proveedor: document.getElementById('pd-prov').value,
          desde: document.getElementById('pd-d').value.trim(),
          hasta: document.getElementById('pd-h').value.trim(), quien: 'yo',
        });
        cerrar(); this.ver(p.numero);
      };
    },

    // Agregar es elegir de lo que falta pedir. Junta lo igual para que se vea
    // que hay seis iguales, pero deja tildar sólo las que se le van a dar.
    modalAgregar() {
      const p = global.DB.pedido(this.abierto);
      const libres = global.DB.aFabricar()
        .filter(u => !u.pedido && global.DB.planoListo(u));
      const m = new Map();
      libres.forEach(u => {
        const k = `${u.modelo} · ${u.medida} · ${u.color}`;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(u);
      });
      const gs = [...m.entries()].sort((a, b) => b[1].length - a[1].length);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="pr-back" id="pd-mdl"><div class="card pad pd-mdl-g">
          <h3 class="h-title" style="font-size:17px">Agregar muebles a ${UI.esc(p.numero)}</h3>
          <p class="h-sub">${UI.esc(p.proveedor)} · se juntan los iguales, pero tildás sólo los
            que le vas a dar a él.</p>
          <div class="pd-scroll">${gs.length ? gs.map(([k, us]) => `
            <div class="pd-lote">
              <div class="pd-lote-h">
                <label><input type="checkbox" class="chk" data-todos="${UI.esc(k)}">
                  <b>${UI.esc(k)}</b></label>
                <span class="sp"></span>
                <span class="pill soft">${us.length} sin pedir</span>
              </div>
              ${us.map(u => `<label class="pd-it">
                <input type="checkbox" class="chk" data-add="${u.id}" data-g="${UI.esc(k)}">
                <span class="muted">${u.orden ? UI.esc(u.orden) : 'para stock'}</span>
                ${u.tipo !== 'estandar'
                  ? `<span class="pr-tipo ${u.tipo}">${UI.esc(u.tipo)}</span>` : ''}
                <span class="sp"></span>
                <span class="muted">${UI.esc(u.fechaVenta || '')}</span></label>`).join('')}
            </div>`).join('')
            : '<div class="hint">No hay muebles listos para pedir. Los que faltan dibujar no aparecen acá.</div>'}
          </div>
          <div class="row" style="margin-top:14px;gap:10px">
            <span class="hint" id="pd-cn">Ninguno tildado</span>
            <div class="sp"></div>
            <button class="btn" id="pd-x">Cerrar</button>
            <button class="btn primary" id="pd-ok">Agregar</button></div>
        </div></div>`);
      const cerrar = () => { const x = document.getElementById('pd-mdl'); if (x) x.remove(); };
      const cn = () => {
        const n = document.querySelectorAll('#pd-mdl [data-add]:checked').length;
        document.getElementById('pd-cn').textContent = n
          ? `${n} tildado${n === 1 ? '' : 's'}` : 'Ninguno tildado';
      };
      document.getElementById('pd-x').onclick = cerrar;
      document.querySelectorAll('#pd-mdl [data-todos]').forEach(c => c.onchange = () => {
        document.querySelectorAll(`#pd-mdl [data-g="${CSS.escape(c.dataset.todos)}"]`)
          .forEach(x => { x.checked = c.checked; });
        cn();
      });
      document.querySelectorAll('#pd-mdl [data-add]').forEach(c => c.onchange = cn);
      document.getElementById('pd-ok').onclick = () => {
        const ids = [...document.querySelectorAll('#pd-mdl [data-add]:checked')]
          .map(x => Number(x.dataset.add));
        if (!ids.length) return UI.aviso('No tildaste ninguno', 'warn');
        ids.forEach(id => global.DB.agregarAPedido(this.abierto, id, 'yo'));
        UI.aviso(`${ids.length} agregados`, 'ok');
        cerrar(); this.render(this._mount);
      };
    },

    estilos() {
      return `<style>
        .pd-b{margin-bottom:18px}
        .pd-b-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);margin-bottom:6px}
        .pd-tabla{overflow-x:auto}
        .pd-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .pd-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap}
        .pd-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .pd-tabla tr:last-child td{border-bottom:0}
        .pd-tabla tr:hover td{background:var(--panel-2)}
        .pd-tabla .nom{font-weight:700;color:var(--navy)}
        .pd-tabla .venc{color:var(--crit);font-weight:700}
        .pd-acc{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
          border:1px solid var(--line);border-radius:11px;padding:10px 13px;background:var(--panel)}
        .pd-dos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
        @media(max-width:900px){.pd-dos{grid-template-columns:1fr}}
        .pd-l{margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-soft)}
        .pd-l li{margin-bottom:5px}
        .pd-l b{color:var(--navy)}
        .pd-hist{font-size:12px;color:var(--ink-soft)}
        .pd-hist div{padding:5px 0;border-bottom:1px solid var(--line-soft);display:flex;gap:10px}
        .pd-hist div:last-child{border-bottom:0}
        .pd-hist .f{color:var(--muted);flex:0 0 52px}
        .pd-mdl-g{max-width:620px;width:100%;max-height:86vh;display:flex;flex-direction:column}
        .pd-scroll{overflow:auto;margin-top:12px;flex:1}
        .pd-lote{border:1px solid var(--line);border-radius:10px;margin-bottom:8px;overflow:hidden}
        .pd-lote-h{display:flex;align-items:center;gap:8px;padding:8px 11px;background:var(--panel-2);
          border-bottom:1px solid var(--line-soft);font-size:13px}
        .pd-lote-h label{display:flex;align-items:center;gap:7px;cursor:pointer}
        .pd-lote-h b{color:var(--navy)}
        .pd-it{display:flex;align-items:center;gap:8px;padding:5px 11px;font-size:12.5px;
          cursor:pointer;border-bottom:1px solid var(--line-soft)}
        .pd-it:last-child{border-bottom:0}
        .pd-it:hover{background:var(--panel-2)}
        .chk{width:14px;height:14px;accent-color:var(--brand);margin:0}
        .sp{flex:1}
      </style>`;
    },
  };
  global.ProdPedidos = Pedidos;
})(typeof window !== 'undefined' ? window : globalThis);
