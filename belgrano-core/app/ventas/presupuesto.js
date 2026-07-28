// =====================================================================
//  Belgrano Soft · Presupuestos (cotización)
//  Se carga buscando el producto en la propia línea (como Odoo). Si no
//  aparece escribiendo, el botón "Catálogo" abre el buscador completo.
//
//  Cliente: nombre (opcional) + teléfono + mail + IG. Al menos uno de
//  teléfono / mail / IG es obligatorio — como en el CRM, el teléfono o el
//  IG es lo que ARMA al cliente; el nombre se puede pedir después.
//
//  Cada línea tiene cantidad y observaciones. El precio de la línea
//  depende del término de pago (efectivo / transferencia / tarjeta / mixto).
// =====================================================================
(function (global) {
  const RECARGO_KEY = 'bh_recargo_tarjeta';

  // Cómo afecta el término de pago al precio de lista. Placeholder editable:
  // los números finos los define Brian (efectivo y transferencia = precio de
  // lista; tarjeta suma recargo; mixto se ajusta al cobrar).
  const TERMINOS = [
    { k: 'efectivo',      label: 'Efectivo' },
    { k: 'transferencia', label: 'Transferencia' },
    { k: 'tarjeta',       label: 'Tarjeta' },
    { k: 'mixto',         label: 'Mixto' },
  ];

  const Presupuesto = {
    cli: { nombre: '', telefono: '', email: '', instagram: '' },
    termino: 'efectivo',
    lineas: [],                 // [{key, prodNombre, varId, ejes, base, cantidad, obs}]
    _uid: 0,
    recargo: (() => { try { return Number(localStorage.getItem(RECARGO_KEY)) || 0.15; } catch { return 0.15; } })(),

    // Factor sobre el precio de lista según el término elegido.
    factor() {
      if (this.termino === 'tarjeta') return 1 + this.recargo;
      return 1; // efectivo, transferencia, mixto (la mezcla se define al cobrar)
    },
    // ¿El cliente tiene identidad? Al menos teléfono, mail o IG.
    clienteValido() {
      const c = this.cli;
      return !!(String(c.telefono).trim() || String(c.email).trim() || String(c.instagram).trim());
    },

    render(mount = 'view') {
      const v = document.getElementById(mount);
      v.innerHTML = `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div>
            <div class="kick">Ventas</div>
            <h1 class="h-title">Nueva cotización</h1>
          </div>
          <div class="sp"></div>
          <div class="wrap-row" style="justify-content:flex-end">
            <button class="btn sm" id="pr-guardar">💾 Guardar</button>
            <button class="btn sm" id="pr-preview">👁 Vista previa</button>
            <button class="btn sm" id="pr-print">🖨 Imprimir</button>
          </div>
        </div>

        <div class="card pad" style="margin-bottom:16px">
          <div class="cli-grid">
            <label class="fld"><span class="lbl">Nombre <span class="muted">(opcional)</span></span>
              <input id="c-nombre" value="${UI.esc(this.cli.nombre)}" placeholder="Se puede completar después"></label>
            <label class="fld"><span class="lbl">Teléfono</span>
              <input id="c-tel" value="${UI.esc(this.cli.telefono)}" placeholder="11 5555-2020"></label>
            <label class="fld"><span class="lbl">Mail</span>
              <input id="c-mail" value="${UI.esc(this.cli.email)}" placeholder="cliente@correo.com"></label>
            <label class="fld"><span class="lbl">Instagram</span>
              <input id="c-ig" value="${UI.esc(this.cli.instagram)}" placeholder="@usuario"></label>
          </div>
          <div id="c-aviso"></div>
          <div class="row" style="margin-top:12px;gap:16px;flex-wrap:wrap">
            <label class="fld" style="min-width:220px"><span class="lbl">Término de pago</span>
              <select id="pr-termino">${TERMINOS.map(t =>
                `<option value="${t.k}" ${t.k === this.termino ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
            <div class="muted" id="pr-termino-nota" style="align-self:flex-end;font-size:12px"></div>
          </div>
        </div>

        <div class="card">
          <div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)">
            <b style="color:var(--navy)">Líneas de la cotización</b>
            <div class="sp"></div>
            <button class="btn sm" id="pr-catalogo">☰ Catálogo</button>
          </div>
          <div class="lhead">
            <span>Producto</span><span>Cant.</span><span>Precio unit.</span><span>Observaciones</span><span style="text-align:right">Subtotal</span><span></span>
          </div>
          <div id="pr-lineas"></div>
        </div>

        <div id="pr-pie"></div>

        <style>
          .cli-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
          @media(max-width:760px){.cli-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:460px){.cli-grid{grid-template-columns:1fr}}
          .lhead,.lrow{display:grid;grid-template-columns:1fr 76px 130px 1.2fr 130px 34px;gap:10px;align-items:center}
          .lhead{padding:9px 14px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
          .lrow{padding:10px 14px;border-bottom:1px solid var(--line-soft)}
          .lrow:hover{background:var(--panel-2)}
          .lrow .n{font-weight:650;color:var(--navy);line-height:1.25} .lrow .v{font-size:12px;color:var(--muted)}
          .lrow input{padding:7px 9px}
          .lrow .sub{text-align:right;font-weight:700;color:var(--navy)}
          .lx{color:var(--muted);cursor:pointer;font-size:16px;border:0;background:transparent;padding:4px}
          @media(max-width:760px){.lhead{display:none}
            .lrow{grid-template-columns:1fr 1fr;gap:8px}
            .lrow .sub{text-align:left}}
          .srow{position:relative;padding:11px 14px}
          .drop{position:absolute;left:14px;right:14px;top:100%;z-index:30;background:var(--panel);border:1px solid var(--brand);
            border-radius:11px;box-shadow:var(--shadow);overflow:hidden;max-height:320px;overflow-y:auto}
          .drop .it{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--line-soft)}
          .drop .it:last-child{border-bottom:0} .drop .it:hover{background:var(--brand-soft)}
          .drop .it .cnt{color:var(--muted);font-size:12px}
          .pie{display:flex;align-items:center;gap:24px;padding:18px;margin-top:16px;flex-wrap:wrap}
          .tot{font-size:13px;color:var(--muted)} .tot b{display:block;font-size:22px;color:var(--navy)}
          .mdlbg{position:fixed;inset:0;background:rgba(20,26,38,.4);z-index:50;display:grid;place-items:center;padding:20px}
        </style>`;

      // enganches de cabecera
      const bind = (id, campo) => { const el = document.getElementById(id); el.oninput = () => { this.cli[campo] = el.value; this.avisoCliente(); }; };
      bind('c-nombre', 'nombre'); bind('c-tel', 'telefono'); bind('c-mail', 'email'); bind('c-ig', 'instagram');
      const selT = document.getElementById('pr-termino');
      selT.onchange = () => { this.termino = selT.value; this.pintar(); this.notaTermino(); };
      document.getElementById('pr-catalogo').onclick = () => this.modalCatalogo();
      document.getElementById('pr-guardar').onclick = () => this.accion('guardar');
      document.getElementById('pr-preview').onclick = () => this.accion('preview');
      document.getElementById('pr-print').onclick = () => this.accion('print');

      this.avisoCliente();
      this.notaTermino();
      this.pintar();
    },

    avisoCliente() {
      const a = document.getElementById('c-aviso');
      if (!a) return;
      a.innerHTML = this.clienteValido() ? '' :
        `<div class="banner warn" style="margin:12px 0 0">Cargá al menos <b>teléfono, mail o Instagram</b> para poder guardar. El nombre puede quedar para después.</div>`;
    },

    notaTermino() {
      const n = document.getElementById('pr-termino-nota');
      if (!n) return;
      n.textContent = this.termino === 'tarjeta'
        ? `Tarjeta: precio de lista + ${Math.round(this.recargo * 100)}% de recargo.`
        : this.termino === 'mixto'
          ? 'Mixto: precio de lista; la mezcla efectivo/tarjeta se define al cobrar.'
          : 'Precio de lista.';
    },

    // ---- Render de líneas + fila de búsqueda -----------------------------
    pintar() {
      const cont = document.getElementById('pr-lineas');
      if (!cont) return;
      const f = this.factor();
      const filas = this.lineas.map(l => {
        const unit = l.base * f;
        const sub = unit * l.cantidad;
        return `
        <div class="lrow" data-l="${l.key}">
          <div><div class="n">${UI.esc(l.prodNombre)}</div><div class="v">${UI.esc(l.ejes)}</div></div>
          <input type="number" min="1" value="${l.cantidad}" data-cant="${l.key}" aria-label="Cantidad">
          <div class="tnum">${UI.pesos(unit)}</div>
          <input value="${UI.esc(l.obs)}" data-obs="${l.key}" placeholder="—" aria-label="Observaciones">
          <div class="sub tnum">${UI.pesos(sub)}</div>
          <button class="lx" data-del="${l.key}" title="Quitar">✕</button>
        </div>`;
      }).join('');

      cont.innerHTML = filas + `
        <div class="srow">
          <input id="pr-buscar" placeholder="Agregar un producto…" autocomplete="off">
          <div id="pr-drop"></div>
        </div>`;

      cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        this.lineas = this.lineas.filter(x => x.key !== Number(b.dataset.del)); this.pintar();
      });
      cont.querySelectorAll('[data-cant]').forEach(inp => inp.onchange = () => {
        const l = this.lineas.find(x => x.key === Number(inp.dataset.cant));
        if (l) { l.cantidad = Math.max(1, Math.floor(Number(inp.value) || 1)); this.pintar(); }
      });
      cont.querySelectorAll('[data-obs]').forEach(inp => inp.oninput = () => {
        const l = this.lineas.find(x => x.key === Number(inp.dataset.obs));
        if (l) l.obs = inp.value;
      });

      const inp = document.getElementById('pr-buscar');
      let t;
      inp.oninput = () => { clearTimeout(t); t = setTimeout(() => this.buscarInline(inp.value.trim()), 220); };
      inp.onblur = () => setTimeout(() => { const d = document.getElementById('pr-drop'); if (d) d.innerHTML = ''; }, 180);

      this.pintarPie();
    },

    async buscarInline(texto) {
      const drop = document.getElementById('pr-drop');
      if (!drop) return;
      if (!texto) { drop.innerHTML = ''; return; }
      drop.innerHTML = `<div class="drop"><div class="it muted">${UI.spinner('Buscando…')}</div></div>`;
      try {
        const prods = await global.DB.productos({ texto, limite: 20 });
        if (!prods.length) { drop.innerHTML = `<div class="drop"><div class="it muted">Nada con “${UI.esc(texto)}”. Probá el Catálogo.</div></div>`; return; }
        drop.innerHTML = `<div class="drop">${prods.map(p =>
          `<div class="it" data-pick="${p.id}"><span>${UI.esc(p.nombre)}</span>
             ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}
             <span class="sp"></span><span class="cnt">${p.variantes} var.</span></div>`).join('')}</div>`;
        drop.querySelectorAll('[data-pick]').forEach(it =>
          it.onmousedown = e => { e.preventDefault(); this.elegirProducto(Number(it.dataset.pick), prods.find(p => p.id === Number(it.dataset.pick))); });
      } catch (e) {
        drop.innerHTML = `<div class="drop"><div class="it muted">${UI.esc(e.message || e)}</div></div>`;
      }
    },

    async elegirProducto(prodId, prod) {
      const drop = document.getElementById('pr-drop'); if (drop) drop.innerHTML = '';
      const inp = document.getElementById('pr-buscar'); if (inp) inp.value = '';
      let vars;
      try { vars = await global.DB.variantes(prodId); }
      catch (e) { UI.aviso(String(e.message || e), 'crit'); return; }
      if (!vars.length) { UI.aviso('Ese producto no tiene variantes cargadas', 'warn'); return; }
      if (vars.length === 1) { this.agregar(prod.nombre, vars[0]); return; }
      this.modalVariante(prod.nombre, vars);
    },

    agregar(prodNombre, variante) {
      this.lineas.push({
        key: ++this._uid, prodNombre, varId: variante.id,
        ejes: UI.ejes(variante), base: Number(variante.precio) || 0,
        cantidad: 1, obs: '',
      });
      this.pintar();
      UI.aviso('Mueble agregado', 'ok');
    },

    // ---- Pie: total según término ---------------------------------------
    pintarPie() {
      const f = this.factor();
      const total = this.lineas.reduce((a, l) => a + l.base * f * l.cantidad, 0);
      const items = this.lineas.reduce((a, l) => a + l.cantidad, 0);
      const pie = document.getElementById('pr-pie');
      if (!pie) return;
      const term = TERMINOS.find(t => t.k === this.termino)?.label || '';
      pie.innerHTML = `
        <div class="card pie">
          <div class="tot">${UI.esc(term)} · ${items} ${items === 1 ? 'ítem' : 'ítems'}<b class="tnum">${UI.pesos(total)}</b></div>
          <div class="sp"></div>
          <label class="row" style="gap:6px;font-size:13px;color:var(--ink-soft)">recargo tarjeta
            <input id="pr-recargo" value="${Math.round(this.recargo * 100)}" style="width:64px;text-align:right"> %</label>
          <button class="btn primary" id="pr-venta" ${this.lineas.length ? '' : 'disabled'}>Convertir en venta →</button>
        </div>`;
      const rec = document.getElementById('pr-recargo');
      rec.onchange = () => {
        const n = Number(rec.value);
        this.recargo = (isFinite(n) && n >= 0 ? n : 15) / 100;
        try { localStorage.setItem(RECARGO_KEY, String(this.recargo)); } catch {}
        this.pintar(); this.notaTermino();
      };
      document.getElementById('pr-venta').onclick = () => this.accion('venta');
    },

    // ---- Acciones de la barra -------------------------------------------
    accion(tipo) {
      if (!this.clienteValido()) {
        UI.aviso('Falta identidad del cliente (teléfono, mail o Instagram)', 'warn');
        this.avisoCliente();
        return;
      }
      if ((tipo === 'preview' || tipo === 'print' || tipo === 'venta') && !this.lineas.length) {
        UI.aviso('Agregá al menos un producto', 'warn'); return;
      }
      if (tipo === 'preview') return this.modalPreview(false);
      if (tipo === 'print')   return this.modalPreview(true);
      if (tipo === 'guardar') return UI.aviso('Guardar: próximo paso (persistir cliente + cotización en core)', 'info');
      if (tipo === 'venta')   return UI.aviso('Convertir en venta: próximo paso (crea la orden en core)', 'info');
    },

    // ---- Vista previa / impresión ---------------------------------------
    cuerpoPreview() {
      const f = this.factor();
      const total = this.lineas.reduce((a, l) => a + l.base * f * l.cantidad, 0);
      const term = TERMINOS.find(t => t.k === this.termino)?.label || '';
      const ident = [this.cli.telefono, this.cli.email, this.cli.instagram].filter(Boolean).join(' · ');
      return `<div class="pv">
        <div class="pv-h"><h2>Belgrano Home</h2><div class="muted">Cotización · ${UI.esc(term)}</div></div>
        <div class="pv-cli"><b>${UI.esc(this.cli.nombre || 'Cliente')}</b><div class="muted">${UI.esc(ident)}</div></div>
        <table><thead><tr><th>Producto</th><th>Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${this.lineas.map(l => {
          const unit = l.base * f, sub = unit * l.cantidad;
          return `<tr><td><b>${UI.esc(l.prodNombre)}</b><br><span class="muted">${UI.esc(l.ejes)}${l.obs ? ' · ' + UI.esc(l.obs) : ''}</span></td>
            <td>${l.cantidad}</td><td style="text-align:right" class="tnum">${UI.pesos(unit)}</td>
            <td style="text-align:right" class="tnum">${UI.pesos(sub)}</td></tr>`;
        }).join('')}</tbody></table>
        <div class="pv-tot">Total (${UI.esc(term)}): <b class="tnum">${UI.pesos(total)}</b></div>
      </div>`;
    },

    modalPreview(imprimir) {
      const estilo = `<style>
        .pv{color:#141a26;font-family:-apple-system,system-ui,sans-serif}
        .pv-h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1c2b4a;padding-bottom:8px;margin-bottom:14px}
        .pv-h h2{color:#1c2b4a;margin:0} .pv .muted{color:#7d8aa3}
        .pv-cli{margin-bottom:14px} .pv table{width:100%;border-collapse:collapse;font-size:14px}
        .pv th{text-align:left;font-size:11px;text-transform:uppercase;color:#7d8aa3;border-bottom:1px solid #dbe1ec;padding:8px}
        .pv td{padding:9px 8px;border-bottom:1px solid #eef1f6;vertical-align:top}
        .pv-tot{text-align:right;margin-top:16px;font-size:18px;color:#1c2b4a}
      </style>`;
      const cuerpo = estilo + this.cuerpoPreview();
      if (imprimir) {
        try {
          const w = global.open('', '_blank');
          if (w) { w.document.write(`<title>Cotización</title>${cuerpo}`); w.document.close(); w.focus(); w.print(); return; }
        } catch (e) { /* cae al modal */ }
      }
      const html = `<div class="mdlbg" id="pr-pv">
        <div class="card pad" style="max-width:640px;width:100%;max-height:85vh;overflow:auto;background:#fff">
          <div class="row" style="margin-bottom:12px"><b style="color:var(--navy)">Vista previa</b><div class="sp"></div>
            <button class="btn sm" id="pv-print">🖨 Imprimir</button>
            <button class="lx" id="pv-x" style="font-size:20px">✕</button></div>
          ${cuerpo}
        </div></div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const cerrar = () => { const m = document.getElementById('pr-pv'); if (m) m.remove(); };
      document.getElementById('pv-x').onclick = cerrar;
      document.getElementById('pr-pv').onclick = e => { if (e.target.id === 'pr-pv') cerrar(); };
      document.getElementById('pv-print').onclick = () => this.modalPreview(true);
    },

    // ---- Modal: elegir variante -----------------------------------------
    modalVariante(prodNombre, vars) {
      const html = `<div class="mdlbg" id="pr-mdl">
        <div class="card pad" style="max-width:560px;width:100%;max-height:80vh;overflow:auto">
          <div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">${UI.esc(prodNombre)}</h3>
            <div class="sp"></div><button class="lx" id="pr-mdl-x" style="font-size:20px">✕</button></div>
          <p class="muted" style="margin:0 0 12px;font-size:13px">Elegí la variante:</p>
          <table><thead><tr><th>Medida</th><th>Estructura</th><th>Frente</th><th style="text-align:right">Precio</th><th></th></tr></thead>
          <tbody>${vars.map((v, i) => `<tr>
            <td class="tnum">${UI.esc(v.medida || '—')}</td><td>${UI.esc(v.estructura || '—')}</td>
            <td>${UI.esc(v.frente || '—')}</td><td style="text-align:right"><b class="tnum">${UI.pesos(v.precio)}</b></td>
            <td style="text-align:right"><button class="btn sm primary" data-v="${i}">Elegir</button></td>
          </tr>`).join('')}</tbody></table>
        </div></div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const cerrar = () => { const m = document.getElementById('pr-mdl'); if (m) m.remove(); };
      document.getElementById('pr-mdl-x').onclick = cerrar;
      document.getElementById('pr-mdl').onclick = e => { if (e.target.id === 'pr-mdl') cerrar(); };
      document.querySelectorAll('#pr-mdl [data-v]').forEach(b =>
        b.onclick = () => { this.agregar(prodNombre, vars[Number(b.dataset.v)]); cerrar(); });
    },

    // ---- Modal: catálogo completo (fallback) ----------------------------
    modalCatalogo() {
      const html = `<div class="mdlbg" id="pr-cat">
        <div class="card pad" style="max-width:720px;width:100%;max-height:82vh;display:flex;flex-direction:column">
          <div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">Buscar: Producto</h3>
            <div class="sp"></div><button class="lx" id="pr-cat-x" style="font-size:20px">✕</button></div>
          <input id="pr-cat-q" placeholder="Buscar por nombre…" autocomplete="off" style="margin-bottom:12px">
          <div id="pr-cat-lista" style="overflow:auto">${UI.spinner()}</div>
        </div></div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      const cerrar = () => { const m = document.getElementById('pr-cat'); if (m) m.remove(); };
      document.getElementById('pr-cat-x').onclick = cerrar;
      document.getElementById('pr-cat').onclick = e => { if (e.target.id === 'pr-cat') cerrar(); };
      const pintar = async (texto) => {
        const c = document.getElementById('pr-cat-lista');
        c.innerHTML = UI.spinner();
        try {
          const prods = await global.DB.productos({ texto, limite: 80 });
          c.innerHTML = prods.length ? `<table>
            <thead><tr><th>Producto</th><th style="text-align:right">Variantes</th><th></th></tr></thead>
            <tbody>${prods.map(p => `<tr>
              <td><b>${UI.esc(p.nombre)}</b> ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}</td>
              <td style="text-align:right" class="tnum">${p.variantes}</td>
              <td style="text-align:right"><button class="btn sm primary" data-p="${p.id}">Elegir</button></td>
            </tr>`).join('')}</tbody></table>` : UI.vacio('Sin resultados.');
          c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
            cerrar(); this.elegirProducto(Number(b.dataset.p), prods.find(p => p.id === Number(b.dataset.p)));
          });
        } catch (e) { c.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
      };
      const q = document.getElementById('pr-cat-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => pintar(q.value.trim()), 220); };
      pintar('');
    },
  };

  global.Presupuesto = Presupuesto;
})(typeof window !== 'undefined' ? window : globalThis);
