// =====================================================================
//  Belgrano Soft · Producción · A dibujar y Recepción
//  Dos pantallas que comparten la misma idea: nada avanza sin que alguien
//  lo mire. El plano lo verifica una persona distinta de la que dibujó, y
//  el mueble que llega se controla antes de entrarlo al depósito.
// =====================================================================
(function (global) {

  // ---- A DIBUJAR --------------------------------------------------------
  const Dibujos = {
    _mount: 'view',
    abierta: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierta ? this.htmlUna(this.abierta) : this.htmlLista())
        + this.estilos();
      this.enganchar();
    },
    pendientes() {
      return global.DB.unidadesTodas()
        .filter(u => !global.DB.planoListo(u) && u.estado !== 'entregada');
    },

    htmlLista() {
      const ps = this.pendientes();
      const porEstado = k => ps.filter(u => u.planoEstado === k);
      const bloque = (k, titulo, pie) => {
        const us = porEstado(k);
        if (!us.length) return '';
        const e = global.DB.planoEstado(k);
        return `<div class="dj-b">
          <div class="dj-b-h"><span class="pill ${e.pill}">${UI.esc(e.label)}</span>
            <b>${UI.esc(titulo)}</b><span class="muted">${us.length}</span>
            <span class="sp"></span><span class="hint">${UI.esc(pie)}</span></div>
          <div class="card dj-tabla"><table>
            <thead><tr><th>Mueble</th><th>Tipo</th><th>Terminación</th><th>Venta</th>
              <th>Vendido</th><th></th></tr></thead>
            <tbody>${us.map(u => `<tr>
              <td class="nom">${UI.esc(u.modelo)} <span class="muted">${UI.esc(u.medida)}</span></td>
              <td><span class="pr-tipo ${u.tipo}">${UI.esc(global.DB.tipoUnidad(u.tipo).label.toLowerCase())}</span></td>
              <td class="muted">${UI.esc(u.color)}</td>
              <td class="muted">${u.orden ? UI.esc(u.orden) : 'para stock'}</td>
              <td class="muted">${UI.esc(u.fechaVenta || '—')}</td>
              <td class="td-acc"><button class="bres" data-abrir="${u.id}">${
                k === 'a_verificar' ? 'Verificar' : 'Dibujar'}</button></td>
            </tr>`).join('')}</tbody></table></div>
        </div>`;
      };
      return `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Producción · A medida</div>
            <h1 class="h-title">Pendientes de dibujo</h1>
            <div class="h-sub">${porEstado('a_dibujar').length} para dibujar ·
              ${porEstado('a_editar').length} para editar ·
              ${porEstado('a_verificar').length} para verificar</div></div>
        </div>
        ${ps.length ? '' : UI.vacio('No hay ningún plano pendiente. Todo lo vendido se puede pedir.')}
        ${bloque('a_dibujar', 'Hay que dibujarlos de cero', 'son a medida: no se parecen a ninguno')}
        ${bloque('a_editar', 'Hay que editarles una cota', 'se parte del plano en blanco que ya existe')}
        ${bloque('a_verificar', 'Están dibujados, falta que otro los mire',
          'no puede verificar el que dibujó')}
        <div class="hint" style="margin-top:10px">Mientras el plano no esté resuelto, el mueble
          <b>no se puede pedir</b>: es lo que evita que salga a fábrica mal dibujado.</div>`;
    },

    // La pantalla de comparar: los dos dibujos grandes, uno al lado del otro.
    htmlUna(id) {
      const u = global.DB.unidad(id);
      if (!u) return UI.vacio('No se encontró esa unidad.');
      const e = global.DB.planoEstado(u.planoEstado);
      const marcas = u.marcas || [];
      const sinResolver = marcas.filter(m => !m.resuelta).length;
      const verificar = u.planoEstado === 'a_verificar';
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="dj-volver">‹ Pendientes</button>
          <span class="muted">${UI.esc(u.orden || 'para stock')}</span>
        </div>
        <div class="row" style="align-items:flex-start;margin-bottom:12px">
          <div><div class="kick">Producción · ${verificar ? 'Verificar' : 'Dibujar'}</div>
            <h1 class="h-title">${UI.esc(u.modelo)} ${UI.esc(u.medida)}</h1>
            <div class="h-sub"><span class="pr-tipo ${u.tipo}">${UI.esc(global.DB.tipoUnidad(u.tipo).label)}</span>
              ${UI.esc(u.color)}</div></div>
          <div class="sp"></div>
          <span class="pill ${e.pill}">${UI.esc(e.label)}</span>
        </div>

        <div class="dj-comp">
          <div class="dj-pane">
            <div class="dj-p-h"><span>Croquis del vendedor</span><div class="sp"></div>
              <span class="hint">${u.croquis ? 'subido con la venta' : 'no lo subieron'}</span></div>
            <div class="dj-lienzo">${u.croquis
              ? `<img src="${UI.esc(u.croquis)}" alt="">`
              : `<div class="dj-ph">SIN CROQUIS<small>El vendedor no lo adjuntó. Sin esto, el que
                  verifica no tiene con qué comparar.</small></div>`}</div>
            <div class="dj-f"><button class="btn" id="dj-croquis">Subir el croquis</button></div>
          </div>
          <div class="dj-pane on">
            <div class="dj-p-h"><span>Plano de producción</span><div class="sp"></div>
              <button class="tool" id="dj-marca">+ Marca</button></div>
            <div class="dj-lienzo">${u.plano
              ? `<img src="${UI.esc(u.plano)}" alt="">`
              : `<div class="dj-ph">TODAVÍA NO LO SUBIÓ<small>El PDF sale de la carpeta de planos;
                  acá se sube el de esta pieza.</small></div>`}
              ${marcas.map((m, i) => `<span class="dj-pin ${m.resuelta ? 'ok' : ''}"
                style="left:${20 + (i * 17) % 60}%;top:${25 + (i * 23) % 50}%">${i + 1}</span>`).join('')}
            </div>
            <div class="dj-f">
              <button class="btn" id="dj-plano">${u.plano ? 'Cambiar el plano' : 'Subir el plano'}</button>
            </div>
            ${marcas.length ? `<div class="dj-marcas">${marcas.map((m, i) => `
              <div class="dj-m ${m.resuelta ? 'ok' : ''}">
                <span class="b">${i + 1}</span>
                <div class="t"><b>${UI.esc(m.texto)}</b>
                  <small>${UI.esc(m.autor)} · ${UI.esc(m.fecha)}${
                    m.resuelta ? ` · <b>resuelta</b>` : ''}</small></div>
                ${m.resuelta ? '' : `<button class="b-x" data-resolver="${i}">Resolver</button>`}
              </div>`).join('')}</div>` : ''}
            <div class="dj-rap">${['Falta medida', 'Acá modificalo', 'Falta aclarar',
              'No coincide con el croquis'].map(x =>
              `<button data-rap="${UI.esc(x)}">+ ${UI.esc(x)}</button>`).join('')}</div>
          </div>
        </div>

        <div class="dj-acc">
          <span class="hint">${sinResolver
            ? `<b>${sinResolver} marca${sinResolver === 1 ? '' : 's'} sin resolver</b> — no se puede verificar`
            : (u.plano ? 'Sin marcas pendientes.' : 'Falta subir el plano.')}</span>
          <div class="sp"></div>
          ${verificar ? `<button class="btn" id="dj-devolver">Devolver con correcciones</button>
            <button class="btn primary" id="dj-ok" ${sinResolver || !u.plano ? 'disabled' : ''}
              >Verificado</button>`
            : `<button class="btn primary" id="dj-listo" ${u.plano ? '' : 'disabled'}
                >Listo para verificar</button>`}
        </div>
        <div class="hint" style="margin-top:9px">El que verifica <b>no puede ser el que dibujó</b>:
          si el que chequea es el mismo, el error se arrastra hasta el mueble hecho.</div>`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const v = q('dj-volver'); if (v) v.onclick = () => { this.abierta = null; this.render(this._mount); };
      document.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        this.abierta = Number(b.dataset.abrir); this.render(this._mount);
      });
      const subir = (campo) => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*,application/pdf';
        inp.onchange = () => {
          const f = inp.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            global.DB.guardarUnidad({ id: this.abierta, [campo]: r.result });
            this.render(this._mount);
          };
          r.readAsDataURL(f);
        };
        inp.click();
      };
      const bc = q('dj-croquis'); if (bc) bc.onclick = () => subir('croquis');
      const bp = q('dj-plano'); if (bp) bp.onclick = () => subir('plano');
      const bl = q('dj-listo'); if (bl) bl.onclick = () => {
        global.DB.guardarUnidad({ id: this.abierta, planoEstado: 'a_verificar', dibujadoPor: 'Adrián' });
        UI.aviso('Queda para que otro lo verifique', 'ok'); this.render(this._mount);
      };
      const bo = q('dj-ok'); if (bo) bo.onclick = () => {
        global.DB.guardarUnidad({ id: this.abierta, planoEstado: 'verificado', verificadoPor: 'yo' });
        UI.aviso('Verificado — ya se puede pedir', 'ok');
        this.abierta = null; this.render(this._mount);
      };
      const bd = q('dj-devolver'); if (bd) bd.onclick = () => {
        global.DB.guardarUnidad({ id: this.abierta, planoEstado: 'a_dibujar' });
        UI.aviso('Devuelto para corregir', 'warn');
        this.abierta = null; this.render(this._mount);
      };
      document.querySelectorAll('[data-rap]').forEach(b => b.onclick = () => this.marcar(b.dataset.rap));
      const bm = q('dj-marca'); if (bm) bm.onclick = () => this.marcar('');
      document.querySelectorAll('[data-resolver]').forEach(b => b.onclick = () => {
        const u = global.DB.unidad(this.abierta);
        const ms = [...(u.marcas || [])];
        ms[Number(b.dataset.resolver)] = { ...ms[Number(b.dataset.resolver)], resuelta: true };
        global.DB.guardarUnidad({ id: u.id, marcas: ms });
        this.render(this._mount);
      });
    },
    marcar(texto) {
      const t = texto || prompt('¿Qué le falta o qué hay que corregir?');
      if (!t) return;
      const u = global.DB.unidad(this.abierta);
      const ms = [...(u.marcas || []), { texto: t, autor: 'yo', fecha: global.DB.hoyCorto() }];
      global.DB.guardarUnidad({ id: u.id, marcas: ms });
      this.render(this._mount);
    },

    estilos() {
      return `<style>
        .dj-b{margin-bottom:16px}
        .dj-b-h{display:flex;align-items:center;gap:9px;margin-bottom:6px;font-size:13px}
        .dj-b-h b{color:var(--navy)}
        .dj-tabla{overflow-x:auto}
        .dj-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .dj-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line)}
        .dj-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .dj-tabla tr:last-child td{border-bottom:0}
        .dj-tabla .nom{font-weight:700;color:var(--navy)}
        .dj-comp{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
        @media(max-width:1000px){.dj-comp{grid-template-columns:1fr}}
        .dj-pane{border:1px solid var(--line);border-radius:12px;background:var(--panel);
          overflow:hidden}
        .dj-pane.on{border-color:var(--brand)}
        .dj-p-h{display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--panel-2);
          border-bottom:1px solid var(--line);font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:.05em;color:var(--muted)}
        .dj-lienzo{position:relative;height:330px;background:#fff;display:grid;place-items:center;
          overflow:hidden}
        .dj-lienzo img{width:100%;height:100%;object-fit:contain}
        .dj-ph{text-align:center;color:#c2c9d2;font-size:11px;letter-spacing:.16em;font-weight:700}
        .dj-ph small{display:block;font-size:10.5px;letter-spacing:0;font-weight:500;margin-top:5px;
          max-width:240px;line-height:1.5;color:#ccd3db}
        .dj-pin{position:absolute;width:22px;height:22px;border-radius:50%;background:var(--crit);
          color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.25)}
        .dj-pin.ok{background:var(--ok)}
        .dj-f{padding:9px 11px;border-top:1px solid var(--line-soft);display:flex;gap:8px}
        .dj-marcas{padding:4px 11px 8px;border-top:1px solid var(--line-soft)}
        .dj-m{display:flex;gap:9px;align-items:flex-start;padding:7px 0;
          border-bottom:1px solid var(--line-soft);font-size:12.5px}
        .dj-m:last-child{border-bottom:0}
        .dj-m .b{flex:none;width:20px;height:20px;border-radius:50%;background:var(--crit);color:#fff;
          font-size:10.5px;font-weight:800;display:grid;place-items:center}
        .dj-m.ok .b{background:var(--ok)}
        .dj-m .t{flex:1;color:var(--ink-soft)}
        .dj-m .t b{color:var(--navy);display:block}
        .dj-m .t small{color:var(--muted);font-size:11px}
        .dj-rap{display:flex;gap:6px;flex-wrap:wrap;padding:0 11px 10px}
        .dj-rap button{border:1px dashed var(--line);background:var(--panel);border-radius:999px;
          padding:3px 11px;font:inherit;font-size:11.5px;color:var(--ink-soft);cursor:pointer}
        .dj-rap button:hover{border-style:solid;border-color:var(--brand);color:var(--brand)}
        .tool{border:1px solid var(--line);background:var(--panel);border-radius:7px;padding:3px 9px;
          font:inherit;font-size:11px;font-weight:650;color:var(--ink-soft);cursor:pointer;
          text-transform:none;letter-spacing:0}
        .tool:hover{border-color:var(--brand);color:var(--brand)}
        .dj-acc{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px;
          border:1px solid var(--line);border-radius:11px;padding:10px 13px;background:var(--panel)}
        .dj-acc .btn[disabled]{opacity:.45;pointer-events:none}
      </style>`;
    },
  };

  // ---- RECEPCIÓN ---------------------------------------------------------
  const Recepcion = {
    _mount: 'view',
    taller: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.taller ? this.htmlTaller(this.taller) : this.htmlTalleres())
        + this.estilos();
      this.enganchar();
    },

    htmlTalleres() {
      const ts = global.DB.cargaTalleres().filter(t => t.n > 0);
      const rep = global.DB.aReparar();
      return `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Producción</div><h1 class="h-title">Recepción</h1>
            <div class="h-sub">${ts.length} talleres con muebles pendientes${
              rep.length ? ` · <b style="color:var(--warn)">${rep.length} a reparar</b>` : ''}</div></div>
        </div>
        ${rep.length ? `<div class="banner warn" style="margin-bottom:12px">
          <b>${rep.length} muebles a reparar</b> — llegaron con algo y no entran al depósito hasta
          que se arreglen. <button class="lnk" id="rc-rep">Verlos</button></div>` : ''}
        <div class="rc-gs">${ts.map(t => `
          <button class="rc-t" data-taller="${UI.esc(t.nombre)}">
            <span class="rc-t-av">${UI.esc(this.inicial(t.nombre))}</span>
            <span class="rc-t-n">${UI.esc(t.nombre)}</span>
            <span class="rc-t-c">${t.n} muebles${t.vencidas ? ` · ${t.vencidas} vencidos` : ''}</span>
          </button>`).join('')}</div>
        <div class="hint" style="margin-top:12px">Entrás al taller que llegó con la camioneta y
          tildás lo que bajó. El resto le sigue quedando debiendo.</div>`;
    },
    inicial(n) {
      const m = /[a-záéíóúñ]/i.exec(String(n || ''));
      return (m ? m[0] : '?').toUpperCase();
    },

    htmlTaller(nombre) {
      const us = global.DB.aFabricar()
        .filter(u => u.proveedor === nombre && u.estado === 'produccion');
      const ubis = global.DB.UBICACIONES || [];
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="rc-volver">‹ Recepción</button></div>
        <div class="row" style="align-items:flex-start;margin-bottom:12px">
          <div><div class="kick">Producción · Recepción</div>
            <h1 class="h-title">${UI.esc(nombre)}</h1>
            <div class="h-sub">${us.length} muebles pendientes · tildá lo que bajó del camión</div></div>
          <div class="sp"></div>
          <select id="rc-ubi" class="pr-sel">${ubis.map(x =>
            `<option value="${x.k}">${UI.esc(x.label)}</option>`).join('')}</select>
        </div>
        <div class="rc-scan">
          <span class="rc-scan-ic">▮▮▯▮</span>
          <input id="rc-cod" placeholder="Escaneá el código del mueble o del remito…" autocomplete="off">
          <span class="hint" id="rc-msg">El lector escribe el código y da Enter solo.</span>
        </div>
        ${us.length ? `<div class="card rc-tabla"><table>
          <thead><tr><th style="width:26px"></th><th>Mueble</th><th>Terminación</th>
            <th>Pedido</th><th>Venta</th><th>Entra entre</th><th>N°</th>
            <th>Cómo llegó</th></tr></thead>
          <tbody>${us.map(u => `<tr data-fila="${u.id}">
            <td><input type="checkbox" class="chk" data-rec="${u.id}"></td>
            <td class="nom">${UI.esc(u.modelo)} <span class="muted">${UI.esc(u.medida)}</span></td>
            <td class="muted">${UI.esc(u.color)}</td>
            <td class="muted">${UI.esc(u.pedido || '—')}</td>
            <td class="muted">${u.orden ? UI.esc(u.orden) : 'stock'}</td>
            <td class="${global.DB.vencida(u) ? 'venc' : 'muted'}">${u.desde && u.hasta
              ? `${UI.esc(u.desde)} y ${UI.esc(u.hasta)}` : '—'}</td>
            <td>${u.serie && u.serie !== '—'
              ? `<span class="tnum nom">${UI.esc(u.serie)}</span>`
              : '<span class="muted">sin etiqueta</span>'}</td>
            <td><div class="rc-cal">${global.DB.CALIDADES.map(c =>
              `<button class="rc-c ${c.k === 'perfecto' ? 'on' : ''}" data-cal="${u.id}|${c.k}"
                title="${UI.esc(c.pie)}">${UI.esc(c.label)}</button>`).join('')}</div></td>
          </tr>`).join('')}</tbody></table></div>

          <div class="dj-acc" style="margin-top:12px">
            <span class="hint" id="rc-cn">Ninguno tildado</span>
            <div class="sp"></div>
            <button class="btn primary" id="rc-ok">Recibir lo tildado</button></div>
          <div class="hint" style="margin-top:9px">Al recibir, cada mueble estrena su
            <b>número de serie</b> y su ubicación. El que va <b>a reparar</b> no entra al depósito:
            se queda acá hasta que se arregle. El <b>devuelto</b> vuelve en la camioneta y el
            proveedor lo sigue debiendo.</div>`
          : UI.vacio('Este taller no tiene nada pendiente.')}`;
    },

    htmlReparar() {
      const us = global.DB.aReparar();
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="rc-volver">‹ Recepción</button></div>
        <div class="row" style="margin-bottom:12px"><div>
          <div class="kick">Producción</div><h1 class="h-title">A reparar</h1>
          <div class="h-sub">${us.length} muebles que llegaron con algo</div></div></div>
        <div class="rc-scan">
          <span class="rc-scan-ic">▮▮▯▮</span>
          <input id="rc-cod" placeholder="Escaneá el código del mueble o del remito…" autocomplete="off">
          <span class="hint" id="rc-msg">El lector escribe el código y da Enter solo.</span>
        </div>
        ${us.length ? `<div class="card rc-tabla"><table>
          <thead><tr><th>Mueble</th><th>Terminación</th><th>Qué le vieron</th><th>Venta</th>
            <th>Taller</th><th></th></tr></thead>
          <tbody>${us.map(u => `<tr>
            <td class="nom">${UI.esc(u.modelo)} <span class="muted">${UI.esc(u.medida)}</span></td>
            <td class="muted">${UI.esc(u.color)}</td>
            <td>${UI.esc(u.calidadNota || 'sin detalle escrito')}</td>
            <td class="muted">${u.orden ? UI.esc(u.orden) : 'stock'}</td>
            <td class="muted">${UI.esc(u.proveedor || '—')}</td>
            <td class="td-acc"><button class="bres" data-reparado="${u.id}">Reparado</button></td>
          </tr>`).join('')}</tbody></table></div>
          <div class="hint" style="margin-top:10px">Mientras están acá <b>no cuentan como stock</b>:
            no se pueden vender ni entregar. Al marcarlos reparados suben a Inventario y la orden
            queda lista.</div>`
          : UI.vacio('No hay nada esperando arreglo.')}`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const v = q('rc-volver'); if (v) v.onclick = () => { this.taller = null; this.render(this._mount); };
      const r = q('rc-rep'); if (r) r.onclick = () => {
        const el = document.getElementById(this._mount);
        el.innerHTML = this.htmlReparar() + this.estilos();
        this.enganchar();
      };
      document.querySelectorAll('[data-taller]').forEach(b => b.onclick = () => {
        this.taller = b.dataset.taller; this.render(this._mount);
      });
      document.querySelectorAll('[data-reparado]').forEach(b => b.onclick = () => {
        global.DB.repararUnidad(Number(b.dataset.reparado), { quien: 'yo' });
        UI.aviso('Reparado — ya está en el depósito', 'ok');
        const el = document.getElementById(this._mount);
        el.innerHTML = this.htmlReparar() + this.estilos();
        this.enganchar();
      });
      // La calidad se elige por fila: una sola de las cuatro.
      document.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
        const [id] = b.dataset.cal.split('|');
        b.closest('.rc-cal').querySelectorAll('.rc-c').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const chk = document.querySelector(`[data-rec="${id}"]`);
        if (chk) { chk.checked = true; this.cuenta(); }
      });
      document.querySelectorAll('[data-rec]').forEach(c => c.onchange = () => this.cuenta());
      // El lector de códigos es un teclado: escribe y da Enter. Con eso alcanza.
      const cod = q('rc-cod');
      if (cod) {
        cod.focus();
        cod.onkeydown = ev => {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          const r = global.DB.buscarPorCodigo(cod.value);
          const msg = q('rc-msg');
          cod.value = '';
          if (!r) { msg.innerHTML = '<b class="tarde">No encontré ese código.</b>'; return; }
          const ids = r.tipo === 'unidad' ? [r.unidad.id] : r.items.map(u => u.id);
          let n = 0;
          ids.forEach(id => {
            const chk = document.querySelector(`[data-rec="${id}"]`);
            if (!chk) return;
            chk.checked = true; n++;
            const fila = chk.closest('tr');
            if (fila) { fila.classList.add('escaneada'); fila.scrollIntoView({ block: 'center' }); }
          });
          msg.innerHTML = n
            ? `<b class="ok">${n} tildado${n === 1 ? '' : 's'}</b> — marcá cómo llegó y confirmá.`
            : 'Ese código no es de este taller.';
          this.cuenta();
        };
      }
      const ok = q('rc-ok'); if (ok) ok.onclick = () => {
        const ubi = (q('rc-ubi') || {}).value || 'dep-pb';
        const tildados = [...document.querySelectorAll('[data-rec]:checked')];
        if (!tildados.length) return UI.aviso('No tildaste ninguno', 'warn');
        let entraron = 0, reparar = 0, devueltos = 0;
        tildados.forEach(c => {
          const id = Number(c.dataset.rec);
          const sel = document.querySelector(`[data-cal^="${id}|"].on`);
          const cal = sel ? sel.dataset.cal.split('|')[1] : 'perfecto';
          global.DB.recibirUnidad(id, { calidad: cal, ubicacion: ubi, quien: 'yo' });
          if (cal === 'devuelto') devueltos++;
          else if (cal === 'reparar') reparar++;
          else entraron++;
        });
        UI.aviso(`${entraron} al depósito${reparar ? ` · ${reparar} a reparar` : ''}${
          devueltos ? ` · ${devueltos} devueltos` : ''}`, 'ok');
        this.render(this._mount);
      };
    },
    cuenta() {
      const n = document.querySelectorAll('[data-rec]:checked').length;
      const el = document.getElementById('rc-cn');
      if (el) el.textContent = n ? `${n} tildado${n === 1 ? '' : 's'}` : 'Ninguno tildado';
    },

    estilos() {
      return `<style>
        .rc-gs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
        .rc-t{display:flex;align-items:center;gap:10px;border:1px solid var(--line);
          border-radius:12px;background:var(--panel);padding:12px 14px;cursor:pointer;font:inherit;
          text-align:left}
        .rc-t:hover{border-color:var(--brand)}
        .rc-t-av{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:9px;
          background:var(--navy);color:#fff;font-size:13px;font-weight:800;flex:none}
        .rc-t-n{display:block;font-size:14px;font-weight:700;color:var(--navy)}
        .rc-t-c{display:block;font-size:11.5px;color:var(--muted)}
        .rc-tabla{overflow-x:auto}
        .rc-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .rc-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap}
        .rc-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .rc-tabla tr:last-child td{border-bottom:0}
        .rc-tabla .nom{font-weight:700;color:var(--navy)}
        .rc-tabla .venc{color:var(--crit);font-weight:700}
        .rc-cal{display:flex;gap:4px}
        .rc-c{border:1px solid var(--line);background:var(--panel);border-radius:7px;padding:2px 8px;
          font:inherit;font-size:11px;color:var(--muted);cursor:pointer;white-space:nowrap}
        .rc-c:hover{border-color:var(--brand);color:var(--brand)}
        .rc-c.on{background:var(--navy);border-color:var(--navy);color:#fff;font-weight:700}
        .rc-scan{display:flex;align-items:center;gap:10px;border:1px solid var(--brand);
          border-radius:11px;padding:9px 13px;background:var(--brand-soft);margin-bottom:12px}
        .rc-scan input{flex:1;min-width:180px;font-size:14px;padding:8px 11px;border:1px solid var(--line);
          border-radius:9px;background:var(--panel);color:var(--ink)}
        .rc-scan-ic{font-size:15px;letter-spacing:-2px;color:var(--brand-ink)}
        .rc-tabla tr.escaneada td{background:var(--ok-bg)}
        .rc-tabla .nom{font-weight:700;color:var(--navy)}
        .ok{color:var(--ok)}
      </style>`;
    },
  };

  global.ProdDibujos = Dibujos;
  global.ProdRecepcion = Recepcion;
})(typeof window !== 'undefined' ? window : globalThis);
