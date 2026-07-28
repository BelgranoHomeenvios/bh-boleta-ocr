// =====================================================================
//  Belgrano Soft · Cotización → Venta (hasta "Confirmar")
//  Se busca el producto en la línea (estándar, precio bloqueado del
//  catálogo) o se agrega un ítem "a medida" (descripción + precio manual).
//  El precio depende del término de pago: todo nace del precio de lista;
//  efectivo lleva −35%; tarjeta/cuotas = lista; transferencia y mixto se
//  ajustan (mixto es editable por línea).
//  "Convertir en venta" crea la orden en estado CONFIRMAR (espera la seña).
// =====================================================================
(function (global) {
  const DESC_EFECTIVO = 0.35;     // −35% sobre lista (dato de Brian)
  const DESC_TRANSFER = 0.00;     // provisional, a definir (a·b·c·d)

  const TERMINOS = [
    { k: 'lista',         label: 'Tarjeta / Lista (3·6·12)' },
    { k: 'efectivo',      label: 'Efectivo (−35%)' },
    { k: 'transferencia', label: 'Transferencia' },
    { k: 'mixto',         label: 'Mixto (editable)' },
  ];

  const Presupuesto = {
    cli: { nombre: '', telefono: '', email: '', instagram: '', dni: '', canal: '' },
    vendedor: '', local: '2020', termino: 'efectivo', vence: '',
    lineas: [],   // {key,tipo:'estandar'|'medida',prodNombre,varId,ejes,base,cantidad,obs,precioManual}
    _uid: 0,
    _mount: 'view',

    factor() {
      if (this.termino === 'efectivo') return 1 - DESC_EFECTIVO;
      if (this.termino === 'transferencia') return 1 - DESC_TRANSFER;
      return 1; // lista, mixto
    },
    // Precio unitario según tipo de ítem y término.
    unit(l) {
      if (l.tipo === 'medida') return Number(l.precioManual) || 0;
      if (this.termino === 'mixto') return l.precioManual != null ? Number(l.precioManual) : l.base;
      return l.base * this.factor();
    },
    total() { return this.lineas.reduce((a, l) => a + this.unit(l) * l.cantidad, 0); },
    editable(l) { return l.tipo === 'medida' || this.termino === 'mixto'; },
    clienteValido() {
      const c = this.cli;
      return !!(String(c.telefono).trim() || String(c.email).trim() || String(c.instagram).trim());
    },
    // Un ítem salta a verificación de administración si es a medida o tiene observaciones.
    requiereVerif(l) { return l.tipo === 'medida' || !!String(l.obs).trim(); }
    ,

    render(mount = 'view') {
      this._mount = mount;
      const vends = global.DB.vendedores(), locs = global.DB.locales();
      document.getElementById(mount).innerHTML = `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Ventas</div><h1 class="h-title">Nueva cotización</h1></div>
          <div class="sp"></div>
          <div class="wrap-row" style="justify-content:flex-end">
            <button class="btn sm" id="pr-guardar">💾 Guardar</button>
            <button class="btn sm" id="pr-preview">👁 Vista previa</button>
            <button class="btn sm" id="pr-print">🖨 Imprimir</button>
          </div>
        </div>

        <div class="card pad" style="margin-bottom:14px">
          <div class="kick" style="margin-bottom:8px">Cliente</div>
          <div class="cli-grid">
            <label class="fld"><span class="lbl">Teléfono</span><input id="c-tel" value="${UI.esc(this.cli.telefono)}" placeholder="11 5555-2020"></label>
            <label class="fld"><span class="lbl">Instagram</span><input id="c-ig" value="${UI.esc(this.cli.instagram)}" placeholder="@usuario"></label>
            <label class="fld"><span class="lbl">Mail</span><input id="c-mail" value="${UI.esc(this.cli.email)}" placeholder="cliente@correo.com"></label>
            <label class="fld"><span class="lbl">Nombre <span class="muted">(opcional)</span></span><input id="c-nombre" value="${UI.esc(this.cli.nombre)}" placeholder="Se completa después"></label>
            <label class="fld"><span class="lbl">DNI <span class="muted">(solo factura)</span></span><input id="c-dni" value="${UI.esc(this.cli.dni)}" placeholder="opcional"></label>
            <label class="fld"><span class="lbl">¿Cómo nos conoció?</span>
              <select id="c-canal"><option value="">—</option>
                ${['Instagram', 'Facebook', 'Recomendación', 'Pasó por el local', 'Google', 'Otro']
                  .map(o => `<option ${this.cli.canal === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
          </div>
          <div id="c-aviso"></div>
        </div>

        <div class="card pad" style="margin-bottom:14px">
          <div class="kick" style="margin-bottom:8px">Datos de la operación</div>
          <div class="op-grid">
            <label class="fld"><span class="lbl">Vendedor</span>
              <select id="op-vend"><option value="">Elegí…</option>${vends.map(v => `<option ${this.vendedor === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label class="fld"><span class="lbl">Local de origen</span>
              <select id="op-local">${locs.map(l => `<option value="${l.k}" ${this.local === l.k ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
            <label class="fld"><span class="lbl">Término de pago</span>
              <select id="op-term">${TERMINOS.map(t => `<option value="${t.k}" ${this.termino === t.k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
            <label class="fld"><span class="lbl">Vence</span><input id="op-vence" type="date" value="${UI.esc(this.vence)}"></label>
          </div>
          <div class="muted" id="op-nota" style="font-size:12px;margin-top:8px"></div>
        </div>

        <div class="card">
          <div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)">
            <b style="color:var(--navy)">Ítems</b><div class="sp"></div>
            <button class="btn sm" id="pr-medida">+ A medida</button>
            <button class="btn sm" id="pr-catalogo">☰ Catálogo</button>
          </div>
          <div class="lhead"><span>Producto</span><span>Cant.</span><span>Precio unit.</span><span>Observaciones</span><span style="text-align:right">Subtotal</span><span></span></div>
          <div id="pr-lineas"></div>
        </div>
        <div id="pr-pie"></div>

        <style>
          .cli-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
          .op-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
          @media(max-width:760px){.cli-grid,.op-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:460px){.cli-grid,.op-grid{grid-template-columns:1fr}}
          .lhead,.lrow{display:grid;grid-template-columns:1.4fr 72px 130px 1.1fr 120px 34px;gap:10px;align-items:center}
          .lhead{padding:9px 14px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
          .lrow{padding:10px 14px;border-bottom:1px solid var(--line-soft)}
          .lrow:hover{background:var(--panel-2)}
          .lrow .n{font-weight:650;color:var(--navy);line-height:1.25} .lrow .v{font-size:12px;color:var(--muted)}
          .lrow input{padding:7px 9px} .lrow .sub{text-align:right;font-weight:700;color:var(--navy)}
          .lrow .lock{color:var(--muted);font-size:12px;text-align:right;padding-right:2px}
          .lx{color:var(--muted);cursor:pointer;font-size:16px;border:0;background:transparent;padding:4px}
          .badge-med{font-size:10px;font-weight:800;color:var(--warn);background:var(--warn-bg);border-radius:5px;padding:1px 6px;margin-left:6px}
          @media(max-width:760px){.lhead{display:none}.lrow{grid-template-columns:1fr 1fr;gap:8px}.lrow .sub,.lrow .lock{text-align:left}}
          .srow{position:relative;padding:11px 14px}
          .drop{position:absolute;left:14px;right:14px;top:100%;z-index:30;background:var(--panel);border:1px solid var(--brand);border-radius:11px;box-shadow:var(--shadow);overflow:hidden;max-height:320px;overflow-y:auto}
          .drop .it{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--line-soft)}
          .drop .it:last-child{border-bottom:0} .drop .it:hover{background:var(--brand-soft)} .drop .it .cnt{color:var(--muted);font-size:12px}
          .pie{display:flex;align-items:center;gap:24px;padding:18px;margin-top:16px;flex-wrap:wrap}
          .tot{font-size:13px;color:var(--muted)} .tot b{display:block;font-size:22px;color:var(--navy)}
          .mdlbg{position:fixed;inset:0;background:rgba(20,26,38,.4);z-index:50;display:grid;place-items:center;padding:20px}
        </style>`;

      const bind = (id, campo) => { const el = document.getElementById(id); if (el) el.oninput = () => { this.cli[campo] = el.value; this.avisoCliente(); }; };
      bind('c-nombre', 'nombre'); bind('c-tel', 'telefono'); bind('c-mail', 'email'); bind('c-ig', 'instagram'); bind('c-dni', 'dni');
      document.getElementById('c-canal').onchange = e => { this.cli.canal = e.target.value; };
      document.getElementById('op-vend').onchange = e => { this.vendedor = e.target.value; };
      document.getElementById('op-local').onchange = e => { this.local = e.target.value; };
      document.getElementById('op-term').onchange = e => { this.termino = e.target.value; this.notaTermino(); this.pintar(); };
      document.getElementById('op-vence').onchange = e => { this.vence = e.target.value; };
      document.getElementById('pr-catalogo').onclick = () => this.modalCatalogo();
      document.getElementById('pr-medida').onclick = () => this.agregarMedida();
      document.getElementById('pr-guardar').onclick = () => this.accion('guardar');
      document.getElementById('pr-preview').onclick = () => this.accion('preview');
      document.getElementById('pr-print').onclick = () => this.accion('print');

      this.avisoCliente(); this.notaTermino(); this.pintar();
    },

    avisoCliente() {
      const a = document.getElementById('c-aviso'); if (!a) return;
      a.innerHTML = this.clienteValido() ? '' :
        `<div class="banner warn" style="margin:12px 0 0">Cargá al menos <b>teléfono, Instagram o mail</b> — es lo que arma al cliente. El nombre puede quedar para después.</div>`;
    },
    notaTermino() {
      const n = document.getElementById('op-nota'); if (!n) return;
      n.innerHTML = this.termino === 'efectivo' ? 'Efectivo: precio de lista <b>−35%</b>.'
        : this.termino === 'transferencia' ? 'Transferencia: <b>a definir</b> el descuento (por ahora = lista).'
        : this.termino === 'mixto' ? 'Mixto: el vendedor <b>edita cada precio</b> (parte efectivo + parte tarjeta/transferencia).'
        : 'Tarjeta / Lista: precio de lista, en 3 · 6 · 12 cuotas.';
    },

    pintar() {
      const cont = document.getElementById('pr-lineas'); if (!cont) return;
      const filas = this.lineas.map(l => {
        const unit = this.unit(l), sub = unit * l.cantidad, ed = this.editable(l);
        const nombre = l.tipo === 'medida'
          ? `<input value="${UI.esc(l.prodNombre)}" data-nom="${l.key}" placeholder="Mueble a medida" style="font-weight:650">`
          : `<div class="n">${UI.esc(l.prodNombre)}<span class="badge-med" ${this.requiereVerif(l) ? '' : 'style="display:none"'}>verifica admin</span></div><div class="v">${UI.esc(l.ejes)}</div>`;
        const precioCel = ed
          ? `<input type="number" min="0" value="${l.precioManual != null ? l.precioManual : Math.round(unit)}" data-precio="${l.key}" aria-label="Precio unitario">`
          : `<div class="lock tnum">${UI.pesos(unit)} 🔒</div>`;
        return `<div class="lrow" data-l="${l.key}">
          <div>${nombre}</div>
          <input type="number" min="1" value="${l.cantidad}" data-cant="${l.key}" aria-label="Cantidad">
          ${precioCel}
          <input value="${UI.esc(l.obs)}" data-obs="${l.key}" placeholder="—" aria-label="Observaciones">
          <div class="sub tnum">${UI.pesos(sub)}</div>
          <button class="lx" data-del="${l.key}" title="Quitar">✕</button></div>`;
      }).join('');

      cont.innerHTML = filas + `<div class="srow">
        <input id="pr-buscar" placeholder="Agregar del catálogo (estándar)…" autocomplete="off"><div id="pr-drop"></div></div>`;

      cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { this.lineas = this.lineas.filter(x => x.key !== Number(b.dataset.del)); this.pintar(); });
      cont.querySelectorAll('[data-cant]').forEach(i => i.onchange = () => { const l = this.get(i.dataset.cant); if (l) { l.cantidad = Math.max(1, Math.floor(Number(i.value) || 1)); this.pintar(); } });
      cont.querySelectorAll('[data-obs]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.obs); if (l) { l.obs = i.value; this.marcaVerif(i); } });
      cont.querySelectorAll('[data-nom]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.nom); if (l) l.prodNombre = i.value; });
      cont.querySelectorAll('[data-precio]').forEach(i => i.onchange = () => { const l = this.get(i.dataset.precio); if (l) { l.precioManual = Math.max(0, Number(i.value) || 0); this.pintar(); } });

      const inp = document.getElementById('pr-buscar');
      let t; inp.oninput = () => { clearTimeout(t); t = setTimeout(() => this.buscarInline(inp.value.trim()), 220); };
      inp.onblur = () => setTimeout(() => { const d = document.getElementById('pr-drop'); if (d) d.innerHTML = ''; }, 180);
      this.pintarPie();
    },
    get(key) { return this.lineas.find(x => x.key === Number(key)); },
    marcaVerif(inp) {
      const row = inp.closest ? null : null; // sin closest en shim; repintamos liviano
      const l = this.get(inp.dataset.obs);
      const badge = document.querySelector(`[data-l="${l.key}"] .badge-med`);
      if (badge) badge.style.display = this.requiereVerif(l) ? '' : 'none';
    },

    async buscarInline(texto) {
      const drop = document.getElementById('pr-drop'); if (!drop) return;
      if (!texto) { drop.innerHTML = ''; return; }
      drop.innerHTML = `<div class="drop"><div class="it muted">${UI.spinner('Buscando…')}</div></div>`;
      try {
        const prods = await global.DB.productos({ texto, limite: 20 });
        if (!prods.length) { drop.innerHTML = `<div class="drop"><div class="it muted">Nada con “${UI.esc(texto)}”. Probá el Catálogo o cargalo a medida.</div></div>`; return; }
        drop.innerHTML = `<div class="drop">${prods.map(p => `<div class="it" data-pick="${p.id}"><span>${UI.esc(p.nombre)}</span>${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}<span class="sp"></span><span class="cnt">${p.variantes} var.</span></div>`).join('')}</div>`;
        drop.querySelectorAll('[data-pick]').forEach(it => it.onmousedown = e => { e.preventDefault(); this.elegirProducto(Number(it.dataset.pick), prods.find(p => p.id === Number(it.dataset.pick))); });
      } catch (e) { drop.innerHTML = `<div class="drop"><div class="it muted">${UI.esc(e.message || e)}</div></div>`; }
    },

    async elegirProducto(prodId, prod) {
      const drop = document.getElementById('pr-drop'); if (drop) drop.innerHTML = '';
      const inp = document.getElementById('pr-buscar'); if (inp) inp.value = '';
      let vars;
      try { vars = await global.DB.variantes(prodId); } catch (e) { UI.aviso(String(e.message || e), 'crit'); return; }
      if (!vars.length) { UI.aviso('Ese producto no tiene variantes', 'warn'); return; }
      if (vars.length === 1) return this.agregarEstandar(prod.nombre, vars[0]);
      this.modalVariante(prod.nombre, vars);
    },
    agregarEstandar(prodNombre, variante) {
      this.lineas.push({ key: ++this._uid, tipo: 'estandar', prodNombre, varId: variante.id, ejes: UI.ejes(variante), base: Number(variante.precio) || 0, cantidad: 1, obs: '', precioManual: null });
      this.pintar(); UI.aviso('Ítem agregado', 'ok');
    },
    agregarMedida() {
      this.lineas.push({ key: ++this._uid, tipo: 'medida', prodNombre: '', varId: null, ejes: 'a medida', base: 0, cantidad: 1, obs: '', precioManual: 0 });
      this.pintar();
    },

    pintarPie() {
      const total = this.total();
      const items = this.lineas.reduce((a, l) => a + l.cantidad, 0);
      const term = TERMINOS.find(t => t.k === this.termino)?.label || '';
      const pie = document.getElementById('pr-pie'); if (!pie) return;
      pie.innerHTML = `<div class="card pie">
        <div class="tot">${UI.esc(term)} · ${items} ${items === 1 ? 'ítem' : 'ítems'}<b class="tnum">${UI.pesos(total)}</b></div>
        <div class="sp"></div>
        <button class="btn" id="pr-guardar2">Guardar borrador</button>
        <button class="btn primary" id="pr-venta" ${this.lineas.length ? '' : 'disabled'}>Convertir en venta →</button></div>`;
      document.getElementById('pr-guardar2').onclick = () => this.accion('guardar');
      document.getElementById('pr-venta').onclick = () => this.convertir();
    },

    // ---- Acciones -------------------------------------------------------
    accion(tipo) {
      if ((tipo === 'preview' || tipo === 'print') && !this.clienteValido()) return this.popIdentidad(tipo);
      if (tipo === 'guardar' && !this.clienteValido()) { this.avisoCliente(); return this.popIdentidad('guardar'); }
      if ((tipo === 'preview' || tipo === 'print') && !this.lineas.length) { UI.aviso('Agregá al menos un ítem', 'warn'); return; }
      if (tipo === 'preview') return this.modalPreview(false);
      if (tipo === 'print') return this.modalPreview(true);
      if (tipo === 'guardar') return UI.aviso('Borrador guardado (demo)', 'ok');
    },

    // Pop-up: se entrega un presupuesto sin los datos para registrarlo.
    popIdentidad(tipoOrig) {
      this.modal(`<h3 style="color:var(--navy)">Falta la identidad del cliente</h3>
        <p style="margin:10px 0 0">Estás por entregar un presupuesto <b>sin teléfono, Instagram ni mail</b>. Sin alguno de esos datos <b>no queda registrado</b> el turno ni el cliente.</p>
        <p class="muted" style="font-size:13px">Pedí al menos uno para que quede el registro de la atención. Si el cliente no lo da, podés entregarlo igual, pero no se guarda.</p>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mp-cerrar">Volver a pedir el dato</button>
          ${tipoOrig !== 'guardar' ? '<button class="btn primary" id="mp-igual">Entregar igual (sin registrar)</button>' : ''}
        </div>`, m => {
        document.getElementById('mp-cerrar').onclick = () => m.remove();
        const ig = document.getElementById('mp-igual');
        if (ig) ig.onclick = () => { m.remove(); this.modalPreview(tipoOrig === 'print'); };
      });
    },

    // ---- Convertir en venta → estado CONFIRMAR --------------------------
    convertir() {
      if (!this.clienteValido()) { this.avisoCliente(); return this.popIdentidad('convertir'); }
      if (!this.lineas.length) return UI.aviso('Agregá al menos un ítem', 'warn');
      if (!this.vendedor) return UI.aviso('Elegí el vendedor de la operación', 'warn');
      const incompletos = this.lineas.filter(l => l.tipo === 'medida' && (!l.prodNombre.trim() || !(Number(l.precioManual) > 0)));
      if (incompletos.length) return UI.aviso('Completá nombre y precio de los ítems a medida', 'warn');

      const verif = this.lineas.filter(l => this.requiereVerif(l)).length;
      const total = this.total();
      const nombreCli = this.cli.nombre.trim() || this.cli.telefono.trim() || this.cli.instagram.trim() || this.cli.email.trim();
      this.modal(`<h3 style="color:var(--navy)">Convertir en venta</h3>
        <p style="margin:10px 0 0">Se crea la orden en estado <span class="pill warn">Confirmar</span> — a la espera de la seña (mínimo 30%).</p>
        <table style="margin-top:12px"><tbody>
          <tr><td class="muted">Cliente</td><td style="text-align:right"><b>${UI.esc(nombreCli)}</b></td></tr>
          <tr><td class="muted">Vendedor · Local</td><td style="text-align:right">${UI.esc(this.vendedor)} · ${UI.esc(this.local)}</td></tr>
          <tr><td class="muted">Término</td><td style="text-align:right">${UI.esc(TERMINOS.find(t => t.k === this.termino)?.label || '')}</td></tr>
          <tr><td class="muted">Ítems</td><td style="text-align:right">${this.lineas.length}${verif ? ` · <span style="color:var(--warn)">${verif} a verificar</span>` : ''}</td></tr>
          <tr><td class="muted">Total</td><td style="text-align:right"><b class="tnum">${UI.pesos(total)}</b></td></tr>
        </tbody></table>
        ${verif ? `<div class="banner warn" style="margin-top:12px">${verif} ítem(s) a medida / con observaciones van a <b>verificarse en Administración</b>.</div>` : ''}
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="cv-cancel">Cancelar</button>
          <button class="btn primary" id="cv-ok">Crear orden en Confirmar</button></div>`, m => {
        document.getElementById('cv-cancel').onclick = () => m.remove();
        document.getElementById('cv-ok').onclick = () => {
          const orden = global.DB.crearOrden({
            cliente: nombreCli, vendedor: this.vendedor, local: this.local, total,
            termino: this.termino, fecha: hoy(),
            lineas: this.lineas.map(l => ({ nombre: l.prodNombre, cant: l.cantidad, unit: this.unit(l), obs: l.obs, tipo: l.tipo })),
          });
          m.remove();
          this.reset();
          UI.aviso(`Orden ${orden.numero} creada en estado Confirmar`, 'ok');
          if (global.Ventas) global.Ventas.setSub('ordenes');
        };
      });
    },
    reset() {
      this.cli = { nombre: '', telefono: '', email: '', instagram: '', dni: '', canal: '' };
      this.vendedor = ''; this.termino = 'efectivo'; this.vence = ''; this.lineas = []; this._uid = 0;
    },

    // ---- Vista previa / impresión ---------------------------------------
    cuerpoPreview() {
      const term = TERMINOS.find(t => t.k === this.termino)?.label || '';
      const ident = [this.cli.telefono, this.cli.email, this.cli.instagram].filter(Boolean).join(' · ');
      return `<div class="pv">
        <div class="pv-h"><h2>Belgrano Home</h2><div class="muted">Cotización · ${UI.esc(term)}</div></div>
        <div class="pv-cli"><b>${UI.esc(this.cli.nombre || 'Cliente')}</b><div class="muted">${UI.esc(ident)}</div></div>
        <table><thead><tr><th>Producto</th><th>Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${this.lineas.map(l => { const u = this.unit(l), s = u * l.cantidad;
          return `<tr><td><b>${UI.esc(l.prodNombre || '—')}</b><br><span class="muted">${UI.esc(l.ejes)}${l.obs ? ' · ' + UI.esc(l.obs) : ''}</span></td>
          <td>${l.cantidad}</td><td style="text-align:right" class="tnum">${UI.pesos(u)}</td><td style="text-align:right" class="tnum">${UI.pesos(s)}</td></tr>`; }).join('')}</tbody></table>
        <div class="pv-tot">Total (${UI.esc(term)}): <b class="tnum">${UI.pesos(this.total())}</b></div></div>`;
    },
    modalPreview(imprimir) {
      const estilo = `<style>.pv{color:#141a26;font-family:-apple-system,system-ui,sans-serif}
        .pv-h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1c2b4a;padding-bottom:8px;margin-bottom:14px}
        .pv-h h2{color:#1c2b4a;margin:0}.pv .muted{color:#7d8aa3}.pv-cli{margin-bottom:14px}.pv table{width:100%;border-collapse:collapse;font-size:14px}
        .pv th{text-align:left;font-size:11px;text-transform:uppercase;color:#7d8aa3;border-bottom:1px solid #dbe1ec;padding:8px}
        .pv td{padding:9px 8px;border-bottom:1px solid #eef1f6;vertical-align:top}.pv-tot{text-align:right;margin-top:16px;font-size:18px;color:#1c2b4a}</style>`;
      const cuerpo = estilo + this.cuerpoPreview();
      if (imprimir) { try { const w = global.open('', '_blank'); if (w) { w.document.write(`<title>Cotización</title>${cuerpo}`); w.document.close(); w.focus(); w.print(); return; } } catch (e) {} }
      this.modal(`<div class="row" style="margin-bottom:12px"><b style="color:var(--navy)">Vista previa</b><div class="sp"></div>
        <button class="btn sm" id="pv-print">🖨 Imprimir</button></div>${cuerpo}`, m => {
        document.getElementById('pv-print').onclick = () => this.modalPreview(true);
      }, 640);
    },

    // ---- Modales --------------------------------------------------------
    modal(html, onready, ancho = 480) {
      const id = 'mdl-' + (++this._uid);
      document.body.insertAdjacentHTML('beforeend',
        `<div class="mdlbg" id="${id}"><div class="card pad" style="max-width:${ancho}px;width:100%;max-height:85vh;overflow:auto">${html}</div></div>`);
      const m = document.getElementById(id);
      m.onclick = e => { if (e.target.id === id) m.remove(); };
      onready && onready(m);
      return m;
    },
    modalVariante(prodNombre, vars) {
      this.modal(`<div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">${UI.esc(prodNombre)}</h3><div class="sp"></div><button class="lx" id="mv-x" style="font-size:20px">✕</button></div>
        <p class="muted" style="margin:0 0 12px;font-size:13px">Elegí la variante:</p>
        <table><thead><tr><th>Medida</th><th>Estructura</th><th>Frente</th><th style="text-align:right">Precio lista</th><th></th></tr></thead>
        <tbody>${vars.map((v, i) => `<tr><td class="tnum">${UI.esc(v.medida || '—')}</td><td>${UI.esc(v.estructura || '—')}</td><td>${UI.esc(v.frente || '—')}</td>
          <td style="text-align:right"><b class="tnum">${UI.pesos(v.precio)}</b></td><td style="text-align:right"><button class="btn sm primary" data-v="${i}">Elegir</button></td></tr>`).join('')}</tbody></table>`,
        m => {
          document.getElementById('mv-x').onclick = () => m.remove();
          m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { this.agregarEstandar(prodNombre, vars[Number(b.dataset.v)]); m.remove(); });
        }, 560);
    },
    modalCatalogo() {
      this.modal(`<div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">Buscar: Producto</h3><div class="sp"></div><button class="lx" id="mc-x" style="font-size:20px">✕</button></div>
        <input id="mc-q" placeholder="Buscar por nombre…" autocomplete="off" style="margin-bottom:12px"><div id="mc-lista" style="overflow:auto">${UI.spinner()}</div>`,
        m => {
          document.getElementById('mc-x').onclick = () => m.remove();
          const pintar = async (texto) => {
            const c = document.getElementById('mc-lista'); c.innerHTML = UI.spinner();
            try {
              const prods = await global.DB.productos({ texto, limite: 80 });
              c.innerHTML = prods.length ? `<table><thead><tr><th>Producto</th><th style="text-align:right">Var.</th><th></th></tr></thead>
                <tbody>${prods.map(p => `<tr><td><b>${UI.esc(p.nombre)}</b> ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}</td>
                <td style="text-align:right" class="tnum">${p.variantes}</td><td style="text-align:right"><button class="btn sm primary" data-p="${p.id}">Elegir</button></td></tr>`).join('')}</tbody></table>` : UI.vacio('Sin resultados.');
              c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { m.remove(); this.elegirProducto(Number(b.dataset.p), prods.find(p => p.id === Number(b.dataset.p))); });
            } catch (e) { c.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
          };
          const q = document.getElementById('mc-q'); let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => pintar(q.value.trim()), 220); };
          pintar('');
        }, 720);
    },
  };

  function hoy() {
    try { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    catch { return ''; }
  }

  global.Presupuesto = Presupuesto;
})(typeof window !== 'undefined' ? window : globalThis);
