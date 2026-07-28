// =====================================================================
//  Belgrano Soft · Presupuestos
//  Se carga buscando el producto en la propia línea (como el desplegable
//  de Odoo). Si algo no aparece escribiendo, el botón "Catálogo" abre el
//  buscador completo. Cada mueble es una línea = 1 unidad. Dos precios:
//  efectivo y tarjeta (recargo configurable). "suma / no suma" marca lo
//  que entra a la comisión (el flete no suma).
// =====================================================================
(function (global) {
  const RECARGO_KEY = 'bh_recargo_tarjeta';

  const Presupuesto = {
    lineas: [],                 // [{key, prodNombre, varId, ejes, precio, suma}]
    _uid: 0,
    recargo: (() => { try { return Number(localStorage.getItem(RECARGO_KEY)) || 0.15; } catch { return 0.15; } })(),

    render() {
      const v = document.getElementById('view');
      v.innerHTML = `
        <div class="row" style="margin-bottom:16px">
          <div>
            <div class="kick">Presupuestos</div>
            <h1 class="h-title">Armar un presupuesto</h1>
            <div class="h-sub">Buscá el mueble en la línea. Si no lo encontrás, abrí el catálogo.</div>
          </div>
        </div>

        <div class="card pad" style="margin-bottom:16px">
          <div class="ph-grid">
            <label class="fld"><span class="lbl">Cliente</span>
              <input id="pr-cli" placeholder="Empezá a escribir para encontrar al cliente…"></label>
            <label class="fld"><span class="lbl">Vendedor</span>
              <input id="pr-vend" placeholder="Quién atiende"></label>
            <label class="fld"><span class="lbl">Fecha</span>
              <input id="pr-fecha" value="${hoy()}"></label>
          </div>
        </div>

        <div class="card">
          <div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line)">
            <b style="color:var(--navy)">Líneas de la orden</b>
            <div class="sp"></div>
            <button class="btn sm" id="pr-catalogo">☰ Catálogo</button>
          </div>
          <div id="pr-lineas"></div>
        </div>

        <div id="pr-pie"></div>

        <style>
          .ph-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}
          @media(max-width:640px){.ph-grid{grid-template-columns:1fr}}
          .lrow{display:grid;grid-template-columns:1fr 150px 150px auto auto;gap:10px;align-items:center;
            padding:11px 14px;border-bottom:1px solid var(--line-soft)}
          .lrow:hover{background:var(--panel-2)}
          .lrow .n{font-weight:650;color:var(--navy)} .lrow .v{font-size:12px;color:var(--muted)}
          .lrow .pr{text-align:right;font-weight:650} .lrow .pr small{display:block;font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase}
          .lx{color:var(--muted);cursor:pointer;font-size:16px;border:0;background:transparent;padding:4px}
          .sw{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);cursor:pointer;white-space:nowrap;user-select:none}
          .sw .b{width:34px;height:19px;border-radius:20px;background:var(--brand);position:relative;transition:.15s}
          .sw .b::after{content:"";position:absolute;top:2px;right:2px;width:15px;height:15px;border-radius:50%;background:#fff}
          .sw.off .b{background:var(--line)} .sw.off .b::after{left:2px;right:auto}
          .srow{position:relative;padding:11px 14px}
          .drop{position:absolute;left:14px;right:14px;top:100%;z-index:30;background:var(--panel);border:1px solid var(--brand);
            border-radius:11px;box-shadow:var(--shadow);overflow:hidden;max-height:320px;overflow-y:auto}
          .drop .it{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--line-soft)}
          .drop .it:last-child{border-bottom:0} .drop .it:hover,.drop .it.sel{background:var(--brand-soft)}
          .drop .it .cnt{color:var(--muted);font-size:12px}
          .pie{display:flex;align-items:center;gap:20px;padding:16px;margin-top:16px;flex-wrap:wrap}
          .tot{font-size:13px;color:var(--muted)} .tot b{display:block;font-size:20px;color:var(--navy)}
          .mdlbg{position:fixed;inset:0;background:rgba(20,26,38,.4);z-index:50;display:grid;place-items:center;padding:20px}
        </style>`;

      document.getElementById('pr-catalogo').onclick = () => this.modalCatalogo();
      this.pintar();
    },

    // ---- Render de líneas + fila de búsqueda -----------------------------
    pintar() {
      const cont = document.getElementById('pr-lineas');
      const filas = this.lineas.map(l => `
        <div class="lrow" data-l="${l.key}">
          <div><div class="n">${UI.esc(l.prodNombre)}</div><div class="v">${UI.esc(l.ejes)}</div></div>
          <div class="pr"><small>efectivo</small>${UI.pesos(l.precio)}</div>
          <div class="pr"><small>tarjeta</small>${UI.pesos(l.precio * (1 + this.recargo))}</div>
          <span class="sw ${l.suma ? '' : 'off'}" data-suma="${l.key}">
            <span class="b"></span>${l.suma ? 'suma' : 'no suma'}</span>
          <button class="lx" data-del="${l.key}" title="Quitar">✕</button>
        </div>`).join('');

      cont.innerHTML = filas + `
        <div class="srow">
          <input id="pr-buscar" placeholder="Buscar un producto…" autocomplete="off">
          <div id="pr-drop"></div>
        </div>`;

      // enganches de líneas existentes
      cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        this.lineas = this.lineas.filter(x => x.key !== Number(b.dataset.del));
        this.pintar();
      });
      cont.querySelectorAll('[data-suma]').forEach(s => s.onclick = () => {
        const l = this.lineas.find(x => x.key === Number(s.dataset.suma));
        if (l) { l.suma = !l.suma; this.pintar(); }
      });

      // buscador de la línea
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
          `<div class="it" data-pick="${p.id}">
             <span>${UI.esc(p.nombre)}</span>
             ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}
             <span class="sp"></span><span class="cnt">${p.variantes} var.</span>
           </div>`).join('')}</div>`;
        drop.querySelectorAll('[data-pick]').forEach(it =>
          it.onmousedown = e => { e.preventDefault(); this.elegirProducto(Number(it.dataset.pick), prods.find(p => p.id === Number(it.dataset.pick))); });
      } catch (e) {
        drop.innerHTML = `<div class="drop"><div class="it muted">${UI.esc(e.message || e)}</div></div>`;
      }
    },

    // Elegido el producto: si tiene una variante, la agrega; si tiene varias, pregunta cuál.
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
        key: ++this._uid,
        prodNombre,
        varId: variante.id,
        ejes: UI.ejes(variante),
        precio: Number(variante.precio) || 0,
        suma: true,
      });
      this.pintar();
      UI.aviso('Mueble agregado', 'ok');
    },

    // ---- Pie: totales + acciones ----------------------------------------
    pintarPie() {
      const ef = this.lineas.reduce((a, l) => a + l.precio, 0);
      const ta = this.lineas.reduce((a, l) => a + l.precio * (1 + this.recargo), 0);
      const pie = document.getElementById('pr-pie');
      pie.innerHTML = `
        <div class="card pie">
          <div class="tot">Total efectivo <b class="tnum">${UI.pesos(ef)}</b></div>
          <div class="tot">Total tarjeta <b class="tnum">${UI.pesos(ta)}</b></div>
          <label class="sw" style="gap:8px">recargo tarjeta
            <input id="pr-recargo" value="${Math.round(this.recargo * 100)}" style="width:64px;text-align:right"> %</label>
          <div class="sp"></div>
          <button class="btn" id="pr-guardar" ${this.lineas.length ? '' : 'disabled'}>Guardar</button>
          <button class="btn primary" id="pr-venta" ${this.lineas.length ? '' : 'disabled'}>Convertir en venta →</button>
        </div>`;
      const rec = document.getElementById('pr-recargo');
      rec.onchange = () => {
        const n = Number(rec.value);
        this.recargo = (isFinite(n) && n >= 0 ? n : 15) / 100;
        try { localStorage.setItem(RECARGO_KEY, String(this.recargo)); } catch {}
        this.pintar();
      };
      document.getElementById('pr-guardar').onclick = () => UI.aviso('Guardar presupuesto: próximo paso (persistir en la base)', 'info');
      document.getElementById('pr-venta').onclick = () => UI.aviso('Convertir en venta: próximo paso (crea la orden en core)', 'info');
    },

    // ---- Modal: elegir variante de un producto --------------------------
    modalVariante(prodNombre, vars) {
      const html = `<div class="mdlbg" id="pr-mdl">
        <div class="card pad" style="max-width:560px;width:100%;max-height:80vh;overflow:auto">
          <div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">${UI.esc(prodNombre)}</h3>
            <div class="sp"></div><button class="lx" id="pr-mdl-x" style="font-size:20px">✕</button></div>
          <p class="muted" style="margin:0 0 12px;font-size:13px">Elegí la variante:</p>
          <table><thead><tr><th>Medida</th><th>Estructura</th><th>Frente</th><th style="text-align:right">Precio</th><th></th></tr></thead>
          <tbody>${vars.map((v, i) => `<tr>
            <td class="tnum">${UI.esc(v.medida || '—')}</td>
            <td>${UI.esc(v.estructura || '—')}</td>
            <td>${UI.esc(v.frente || '—')}</td>
            <td style="text-align:right"><b class="tnum">${UI.pesos(v.precio)}</b></td>
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

    // ---- Modal: catálogo completo (fallback de búsqueda) ----------------
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
        const cont = document.getElementById('pr-cat-lista');
        cont.innerHTML = UI.spinner();
        try {
          const prods = await global.DB.productos({ texto, limite: 80 });
          cont.innerHTML = prods.length ? `<table>
            <thead><tr><th>Producto</th><th style="text-align:right">Variantes</th><th></th></tr></thead>
            <tbody>${prods.map(p => `<tr>
              <td><b>${UI.esc(p.nombre)}</b> ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}</td>
              <td style="text-align:right" class="tnum">${p.variantes}</td>
              <td style="text-align:right"><button class="btn sm primary" data-p="${p.id}">Elegir</button></td>
            </tr>`).join('')}</tbody></table>` : UI.vacio('Sin resultados.');
          cont.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
            cerrar();
            this.elegirProducto(Number(b.dataset.p), prods.find(p => p.id === Number(b.dataset.p)));
          });
        } catch (e) { cont.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
      };
      const q = document.getElementById('pr-cat-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => pintar(q.value.trim()), 220); };
      pintar('');
    },
  };

  function hoy() {
    try {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return ''; }
  }

  global.Presupuesto = Presupuesto;
})(typeof window !== 'undefined' ? window : globalThis);
