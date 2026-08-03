// =====================================================================
//  Belgrano Soft · Inventario · Unidades
//  La planilla de siempre, hecha sistema. Una fila por unidad —la pieza,
//  no el modelo— con su estado a la vista y el botón de reservar en el
//  renglón. El vendedor busca lo que le pidió el cliente y reserva ESA
//  unidad; Administración ve proveedor, ubicación y fechas sin salir.
// =====================================================================
(function (global) {
  const VER_KEY = 'bh_inv_cats';

  const Unidades = {
    _mount: 'view',
    texto: '',
    filtro: 'todo',        // todo · disponible · stock · produccion · reservada · entregada · marcas
    cats: [],              // categorías marcadas — costado izquierdo
    terms: [],             // terminaciones marcadas — costado derecho

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div>
            <div class="kick">Inventario</div>
            <h1 class="h-title">Unidades</h1>
            <div class="h-sub" id="un-sub"></div>
          </div>
        </div>
        <div class="un-bar">
          <div class="un-busca"><input id="un-q" placeholder="Buscar por número, modelo, medida o color…"
            value="${UI.esc(this.texto)}"></div>
          <select id="un-orden" class="un-ord" title="Cómo se ordenan">${this.ORDENES.map(o =>
            `<option value="${o.k}">${UI.esc(o.label)}</option>`).join('')}</select>
        </div>
        <div id="un-filtros" style="margin-bottom:12px"></div>
        <div id="un-lista">${UI.spinner()}</div>
        ${this.estilos()}`;

      const q = document.getElementById('un-q');
      let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => {
        this.texto = q.value.trim(); this.pintar();
      }, 200); };
      try { this.arbol = await global.DB.arbolCategorias(); } catch { this.arbol = []; }
      this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
      this.pintar();
    },

    // ---- Datos -------------------------------------------------------------
    catDe(u) {
      const p = (this.prods || []).find(x => x.id === u.productoId);
      if (!p) return null;
      return (this.arbol || []).find(c => c.id === p.categoria_id) || null;
    },
    normT(t) {
      return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    },
    // Lo que se ve, ya filtrado. El buscador entiende número, modelo, medida y
    // color en cualquier orden: "borges 100 pb" y "pb 100 borges" son lo mismo.
    lista() {
      const t = this.texto.toLowerCase().split(/\s+/).filter(Boolean);
      return global.DB.unidadesTodas().filter(u => {
        if (!this.pasaCat(u)) return false;
        if (!this.pasaTerm(u)) return false;
        if (!this.pasaFiltro(u)) return false;
        if (!t.length) return true;
        const txt = `${u.serie} ${u.modelo} ${u.medida} ${u.color} ${u.orden || ''}`.toLowerCase();
        return t.every(x => txt.includes(x));
      });
    },
    pasaCat(u) {
      if (!this.cats.length) return true;
      const c = this.catDe(u);
      return !!c && this.cats.includes(c.id);
    },
    pasaTerm(u) {
      if (!this.terms.length) return true;
      return this.terms.includes(this.normT(u.terminacion));
    },
    pasaFiltro(u) {
      const f = this.filtro;
      if (f === 'todo') return true;
      if (f === 'disponible') return global.DB.disponible(u);
      if (f === 'reservada') return !!u.orden && u.estado !== 'entregada';
      if (f === 'marcas') return !!u.marca;
      return u.estado === f;
    },
    cuenta(f) {
      const antes = this.filtro;
      this.filtro = f;
      const n = global.DB.unidadesTodas()
        .filter(u => this.pasaCat(u) && this.pasaTerm(u) && this.pasaFiltro(u)).length;
      this.filtro = antes;
      return n;
    },

    FILTROS: [
      { k: 'todo', label: 'Todo' },
      { k: 'disponible', label: 'Disponible' },
      { k: 'stock', label: 'En stock' },
      { k: 'pedir', label: 'A pedir' },
      { k: 'produccion', label: 'En producción' },
      { k: 'reservada', label: 'Reservadas' },
      { k: 'entregada', label: 'Entregadas' },
      { k: 'marcas', label: 'Con marca' },
    ],

    // Cómo se ordena adentro de cada categoría. Por default por estado: lo que
    // hay para entregar arriba, después lo que se está haciendo, y al final lo
    // que ya salió — que es el orden en que se mira.
    ORDENES: [
      { k: 'estado', label: 'Por estado' },
      { k: 'modelo', label: 'Por modelo' },
      { k: 'medida', label: 'Por medida' },
      { k: 'ubicacion', label: 'Por ubicación' },
    ],
    orden: 'estado',
    PESO_ESTADO: { stock: 0, produccion: 1, pedir: 2, entregada: 3 },
    ordenar(us) {
      const cmp = (a, b) => {
        if (this.orden === 'modelo') {
          return a.modelo.localeCompare(b.modelo) || this.porEstado(a, b) || this.porMedida(a, b);
        }
        if (this.orden === 'medida') {
          return this.porMedida(a, b) || a.modelo.localeCompare(b.modelo) || this.porEstado(a, b);
        }
        if (this.orden === 'ubicacion') {
          const ua = global.DB.ubicacionLabel(a.ubicacion) || 'zz';
          const ub = global.DB.ubicacionLabel(b.ubicacion) || 'zz';
          return ua.localeCompare(ub) || a.modelo.localeCompare(b.modelo) || this.porMedida(a, b);
        }
        // Estado, después modelo, después medida y después color: así las de
        // stock salen siempre primero y adentro quedan ordenadas de verdad.
        return this.porEstado(a, b) || a.modelo.localeCompare(b.modelo)
          || this.porMedida(a, b) || String(a.color).localeCompare(String(b.color))
          || this.porLibre(a, b);
      };
      return [...us].sort(cmp);
    },
    porEstado(a, b) {
      const pa = this.PESO_ESTADO[a.estado] ?? 3, pb = this.PESO_ESTADO[b.estado] ?? 3;
      return pa - pb;
    },
    // A igualdad de todo lo demás, primero lo libre: es lo que se puede vender.
    porLibre(a, b) { return (a.orden ? 1 : 0) - (b.orden ? 1 : 0); },
    porMedida(a, b) {
      const n = x => parseFloat(String(x.medida).replace(',', '.')) || 0;
      return n(a) - n(b) || String(a.medida).localeCompare(String(b.medida));
    },
    // Las unidades se agrupan por CATEGORÍA —bibliotecas, cómodas—, que es
    // como se recorre el depósito; el modelo es una columna más.
    porCategoria(us) {
      const m = new Map();
      us.forEach(u => {
        const c = this.catDe(u);
        const id = c ? c.id : 0;
        if (!m.has(id)) m.set(id, { id, nombre: c ? c.nombre : 'Sin categoría', items: [] });
        m.get(id).items.push(u);
      });
      return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    },

    // ---- Pintado -----------------------------------------------------------
    pintar() {
      const us = this.lista();
      const sub = document.getElementById('un-sub');
      if (sub) {
        const tot = global.DB.unidadesTodas().length;
        sub.textContent = us.length === tot
          ? `${tot} unidades` : `${us.length} de ${tot} unidades`;
      }
      const f = document.getElementById('un-filtros');
      if (f) {
        f.innerHTML = `<div class="segm">${this.FILTROS.map(x =>
          `<button class="seg ${this.filtro === x.k ? 'on' : ''}" data-f="${x.k}">${UI.esc(x.label)}
            <b>${this.cuenta(x.k)}</b></button>`).join('')}</div>`;
        f.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
          this.filtro = b.dataset.f; this.pintar();
        });
      }
      const so = document.getElementById('un-orden');
      if (so) { so.value = this.orden; so.onchange = () => { this.orden = so.value; this.pintar(); }; }

      const cont = document.getElementById('un-lista');
      cont.innerHTML = `<div class="un-cols">
        ${this.htmlCats()}
        <div id="un-tabla"></div>
        ${this.htmlTerms()}
      </div>`;
      this.pintarTabla(document.getElementById('un-tabla'), us);
      this.engancharLados();
    },

    // Izquierda: las categorías, en orden alfabético. Es por donde se entra.
    htmlCats() {
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaTerm(u) || !this.pasaFiltro(u)) return;
        const c = this.catDe(u); if (!c) return;
        m.set(c.id, (m.get(c.id) || 0) + 1);
      });
      const ops = [...m.entries()].map(([id, n]) => ({
        id, n, label: (this.arbol.find(c => c.id === id) || {}).nombre || '—',
      })).sort((a, b) => a.label.localeCompare(b.label));
      if (!ops.length) return '<aside class="un-c"></aside>';
      return `<aside class="un-c">
        <div class="un-c-h"><span>Categorías</span>
          ${this.cats.length ? '<button class="lnk" data-limpia="cats">ver todas</button>' : ''}</div>
        ${ops.map(o => `<label class="un-o ${this.cats.includes(o.id) ? 'on' : ''}">
          <input type="checkbox" data-cat="${o.id}" ${this.cats.includes(o.id) ? 'checked' : ''}>
          <span class="un-o-n">${UI.esc(o.label)}</span>
          <span class="un-o-c tnum">${o.n}</span></label>`).join('')}
      </aside>`;
    },

    // Derecha: las terminaciones, con su redondelito.
    htmlTerms() {
      const m = new Map(); const nom = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaCat(u) || !this.pasaFiltro(u)) return;
        const k = this.normT(u.terminacion); if (!k) return;
        m.set(k, (m.get(k) || 0) + 1);
        if (!nom.has(k)) nom.set(k, u.terminacion);
      });
      const ops = [...m.entries()].map(([k, n]) => ({ k, n, label: nom.get(k) }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)));
      if (!ops.length) return '<aside class="un-c"></aside>';
      return `<aside class="un-c">
        <div class="un-c-h"><span>Terminación</span>
          ${this.terms.length ? '<button class="lnk" data-limpia="terms">ver todas</button>' : ''}</div>
        ${ops.map(o => `<label class="un-o ${this.terms.includes(o.k) ? 'on' : ''}">
          <input type="checkbox" data-term="${UI.esc(o.k)}" ${this.terms.includes(o.k) ? 'checked' : ''}>
          <span class="pt" style="background:${global.DB.colorDe(o.label)}"></span>
          <span class="un-o-n">${UI.esc(o.label)}</span>
          <span class="un-o-c tnum">${o.n}</span></label>`).join('')}
      </aside>`;
    },

    engancharLados() {
      document.querySelectorAll('[data-cat]').forEach(i => i.onchange = () => {
        const id = Number(i.dataset.cat);
        this.cats = this.cats.includes(id) ? this.cats.filter(x => x !== id) : [...this.cats, id];
        this.pintar();
      });
      document.querySelectorAll('[data-term]').forEach(i => i.onchange = () => {
        const k = i.dataset.term;
        this.terms = this.terms.includes(k) ? this.terms.filter(x => x !== k) : [...this.terms, k];
        this.pintar();
      });
      document.querySelectorAll('[data-limpia]').forEach(b => b.onclick = () => {
        if (b.dataset.limpia === 'cats') this.cats = []; else this.terms = [];
        this.pintar();
      });
    },

    // El renglón es bajo a propósito: se trabaja mirando muchos a la vez.
    pintarTabla(cont, us) {
      if (!us.length) { cont.innerHTML = UI.vacio('Ninguna unidad con ese filtro.'); return; }
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      const grupos = this.porCategoria(this.ordenar(us));

      cont.innerHTML = `<div class="card un-tabla">
        <table>
          <thead><tr>
            <th>N°</th><th>Modelo</th><th>Medida</th><th>Color</th><th>Estado</th>
            <th>Ubicación</th><th>Proveedor</th><th>Llega</th><th>Listo</th><th>Venta</th><th></th>
          </tr></thead>
          <tbody>${grupos.map(g => `
            <tr class="un-g"><td colspan="11">${UI.esc(g.nombre)}
              <span class="muted">${g.items.length}</span></td></tr>
            ${g.items.map(u => this.renglon(u, ed)).join('')}`).join('')}
          </tbody>
        </table></div>
        <div class="hint" style="margin-top:9px">Se reserva la unidad exacta, no "una de las
          cuatro". <b>Disponible</b> es lo que está en stock, sin dueño y sin marcas. La que es
          <b>a medida</b> lleva su foto para que el vendedor sepa qué está vendiendo.</div>`;

      cont.querySelectorAll('[data-res]').forEach(b => b.onclick = () => this.reservar(Number(b.dataset.res)));
      cont.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => this.liberar(Number(b.dataset.lib)));
      cont.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => this.pedir(Number(b.dataset.pedir)));
      cont.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => this.modalFoto(Number(b.dataset.foto)));
    },

    renglon(u, ed) {
      const e = global.DB.etiquetaUnidad(u);
      const enProd = u.estado === 'produccion';
      const disp = global.DB.disponible(u);
      return `<tr class="${u.estado === 'entregada' ? 'off' : ''}">
        <td class="td-n"><span class="tnum nom">${UI.esc(u.serie)}</span>
          ${this.botonFoto(u, ed)}</td>
        <td>${UI.esc(u.modelo)}${u.tipo === 'medida'
          ? ' <span class="un-tipo med">a medida</span>' : ''}</td>
        <td class="tnum">${UI.esc(u.medida)}</td>
        <td>${UI.esc(u.color)}</td>
        <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
        <td class="muted">${UI.esc(global.DB.ubicacionLabel(u.ubicacion) || '—')}</td>
        <td class="muted">${UI.esc(u.proveedor || '—')}</td>
        <td>${enProd && u.llega ? `<b>${UI.esc(u.llega)}</b>`
          : `<span class="muted">—</span>`}</td>
        <td class="muted">${UI.esc(u.listo || '—')}</td>
        <td class="muted">${u.orden ? `${UI.esc(u.orden)}${u.fechaVenta ? ` · ${UI.esc(u.fechaVenta)}` : ''}` : '—'}</td>
        <td class="td-acc">${
          u.estado === 'pedir' ? `<button class="bres" data-pedir="${u.id}">Pedir</button>`
          : disp ? `<button class="bres" data-res="${u.id}">Reservar</button>`
          : (enProd && !u.orden) ? `<button class="bres" data-res="${u.id}">Reservar</button>`
          : (u.orden && u.estado !== 'entregada') ? `<button class="b-x" data-lib="${u.id}">Liberar</button>`
          : ''}</td>
      </tr>`;
    },

    // La foto no ocupa una columna entera: es un botón chico que muestra la
    // miniatura si la tiene. La que se hizo a medida es la que más la necesita.
    botonFoto(u, ed) {
      const ic = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="3" width="14" height="10"
        rx="2"/><circle cx="8" cy="8" r="2.6"/><rect x="5" y="1.5" width="6" height="2" rx="1"/></svg>`;
      if (u.foto) {
        return `<button class="un-foto hay" data-foto="${u.id}" title="Ver la foto de esta unidad">
          <img src="${UI.esc(u.foto)}" alt=""></button>`;
      }
      if (!ed) return '<span class="muted">—</span>';
      return `<button class="un-foto" data-foto="${u.id}"
        title="${u.tipo === 'medida' ? 'Falta la foto: es a medida' : 'Cargar una foto'}"
        >${ic}</button>`;
    },

    modalFoto(id) {
      const u = global.DB.unidad(id); if (!u) return;
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:460px;width:100%">
            <h3 class="h-title" style="font-size:17px">${UI.esc(u.serie)} · ${UI.esc(u.modelo)}</h3>
            <p class="h-sub">${UI.esc([u.medida, u.color].filter(Boolean).join(' · '))}${
              u.tipo === 'medida' ? ' · <b>a medida</b>' : ''}</p>
            <div class="un-prev">${u.foto
              ? `<img src="${UI.esc(u.foto)}" alt="">`
              : '<span class="muted">Sin foto todavía</span>'}</div>
            ${u.tipo === 'medida' && !u.foto ? `<div class="banner warn" style="margin-top:10px">
              Es <b>a medida</b>: no se parece a la foto del catálogo. Cargale una para que el
              vendedor sepa qué está vendiendo.</div>` : ''}
            <div class="row" style="margin-top:16px;gap:10px">
              ${ed ? `<button class="btn" id="un-tipo">${u.tipo === 'medida'
                ? 'Pasar a estándar' : 'Marcar como a medida'}</button>` : ''}
              ${ed && u.foto ? '<button class="btn" id="un-quitar">Quitar</button>' : ''}
              <div class="sp"></div>
              <button class="btn" id="un-x">Cerrar</button>
              ${ed ? '<button class="btn primary" id="un-subir">Subir foto</button>' : ''}
            </div>
            <input type="file" id="un-file" hidden accept="image/*">
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      const bt = document.getElementById('un-tipo');
      if (bt) bt.onclick = () => {
        global.DB.guardarUnidad({ id, tipo: u.tipo === 'medida' ? 'estandar' : 'medida' });
        cerrar(); this.pintar(); this.modalFoto(id);
      };
      const q = document.getElementById('un-quitar');
      if (q) q.onclick = () => { global.DB.guardarUnidad({ id, foto: '' }); cerrar(); this.pintar(); };
      const sub = document.getElementById('un-subir');
      if (sub) {
        const file = document.getElementById('un-file');
        sub.onclick = () => file.click();
        file.onchange = () => {
          const f = file.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            global.DB.guardarUnidad({ id, foto: r.result });
            cerrar(); this.pintar();
          };
          r.readAsDataURL(f);
        };
      }
    },

    // Reservar es asignarle un dueño. Cuando Ventas esté enganchado, la orden
    // sale de ahí; por ahora se escribe, que es lo que hoy se hace a mano.
    reservar(id) {
      const u = global.DB.unidad(id); if (!u) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:440px;width:100%">
            <h3 class="h-title" style="font-size:17px">Reservar ${UI.esc(u.serie)}</h3>
            <p class="h-sub">${UI.esc(u.modelo)} ${UI.esc(u.medida)} · ${UI.esc(u.color)}${
              u.estado === 'produccion'
                ? ` — <b>todavía en fábrica, llega el ${UI.esc(u.fechaProv)}</b>` : ''}</p>
            <label class="fld" style="margin-top:14px"><span class="lbl">Número de venta</span>
              <input id="un-orden" placeholder="#S00250"></label>
            <div class="hint" style="margin-top:6px">${u.estado === 'produccion'
              ? 'Queda vendida sobre pedido: el cliente sabe que llega con esa fecha.'
              : 'Queda apartada para esa venta y deja de estar disponible.'}</div>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="sp"></div>
              <button class="btn" id="un-x">Cancelar</button>
              <button class="btn primary" id="un-ok">Reservar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      document.getElementById('un-ok').onclick = () => {
        const o = document.getElementById('un-orden').value.trim();
        if (!o) return UI.aviso('Poné el número de venta', 'warn');
        global.DB.guardarUnidad({ id, orden: o, fechaVenta: hoy() });
        UI.aviso(`${u.serie} reservada para ${o}`, 'ok');
        cerrar(); this.pintar();
      };
    },
    // Pedirla es asignarle proveedor y fecha: ahí deja de ser una promesa y
    // pasa a ser una pieza que alguien está haciendo.
    pedir(id) {
      const u = global.DB.unidad(id); if (!u) return;
      const provs = [...new Set(global.DB.unidadesTodas().map(x => x.proveedor).filter(Boolean))].sort();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:440px;width:100%">
            <h3 class="h-title" style="font-size:17px">Pedir a fábrica</h3>
            <p class="h-sub">${UI.esc(u.modelo)} ${UI.esc(u.medida)} · ${UI.esc(u.color)}
              — vendida en <b>${UI.esc(u.orden || '')}</b></p>
            <div class="cz-cols" style="margin-top:14px">
              <label class="fld"><span class="lbl">Proveedor</span>
                <select id="un-prov">${provs.map(x =>
                  `<option value="${UI.esc(x)}">${UI.esc(x)}</option>`).join('')}</select></label>
              <label class="fld"><span class="lbl">Cuándo llega</span>
                <input id="un-llega" placeholder="30/8"></label>
            </div>
            <div class="hint" style="margin-top:6px">Pasa a <b>en producción</b> con esa fecha, y el
              vendedor puede decirle al cliente cuándo la tiene.</div>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="sp"></div>
              <button class="btn" id="un-x">Cancelar</button>
              <button class="btn primary" id="un-ok">Pedir</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      document.getElementById('un-ok').onclick = () => {
        const llega = document.getElementById('un-llega').value.trim();
        if (!llega) return UI.aviso('Poné cuándo llega', 'warn');
        global.DB.guardarUnidad({ id, estado: 'produccion',
          proveedor: document.getElementById('un-prov').value, llega });
        UI.aviso('Pedida — queda en producción', 'ok');
        cerrar(); this.pintar();
      };
    },

    liberar(id) {
      const u = global.DB.unidad(id); if (!u) return;
      global.DB.guardarUnidad({ id, orden: null, fechaVenta: '' });
      UI.aviso(`${u.serie} vuelve a estar disponible`, 'ok');
      this.pintar();
    },

    estilos() {
      return `<style>
        .un-bar{display:flex;gap:8px;align-items:center;margin-bottom:12px}
        .un-busca{flex:1;min-width:180px}
        .un-busca input{width:100%;padding:9px 12px;font-size:13px}
        .un-bar .btn{flex:none;white-space:nowrap}
        .un-bar .btn.on{background:var(--navy);border-color:var(--navy);color:#fff}
        #un-cn{margin-left:6px;font-size:11px;background:var(--brand);color:#fff;border-radius:999px;
          padding:1px 6px}
        #un-cn:empty{display:none}
        .btn.on #un-cn{background:#fff;color:var(--navy)}
        .segm{display:flex;gap:6px;flex-wrap:wrap}
        .seg{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:5px 13px;
          font-size:12.5px;font-weight:650;color:var(--ink-soft);cursor:pointer}
        .seg b{opacity:.6;margin-left:5px;font-weight:700}
        .seg.on{background:var(--navy);border-color:var(--navy);color:#fff}
        .seg.on b{opacity:.75}

        /* Categorías a la izquierda —por donde se entra— y terminaciones a la
           derecha. El estado va arriba, que es el corte de todos los días. */
        .un-cols{display:grid;grid-template-columns:176px minmax(0,1fr) 166px;gap:14px;
          align-items:start;max-width:100%}
        .un-cols>#un-tabla{min-width:0;overflow:hidden}
        @media(max-width:1240px){.un-cols{grid-template-columns:1fr}}
        .un-ord{flex:none;width:auto;min-width:150px;padding:8px 10px;font-size:12.5px;font-weight:650;
          color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;background:var(--panel)}
        .pt{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.18);flex:none;
          display:inline-block}
        .un-c{position:sticky;top:104px;display:flex;flex-direction:column}
        .un-c-h{display:flex;align-items:baseline;gap:8px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:5px}
        .un-c .lnk{border:0;background:none;padding:0;font:inherit;font-size:11px;font-weight:600;
          color:var(--brand);cursor:pointer;text-transform:none;letter-spacing:0}
        .un-c .lnk:hover{text-decoration:underline}
        .un-o{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer;font-size:12.5px;
          color:var(--ink-soft)}
        .un-o:hover{color:var(--navy)}
        .un-o.on{color:var(--navy);font-weight:650}
        .un-o input{width:14px;height:14px;accent-color:var(--brand);flex:none;margin:0}
        .un-o-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .un-o-c{font-size:11px;color:var(--muted);flex:none;margin-left:5px}

        /* El renglón va bajo: se trabaja mirando muchos a la vez. */
        .un-tabla{overflow-x:auto}
        .un-tabla{max-width:100%}
        .un-tabla table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:880px}
        .un-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap;background:var(--panel);position:sticky;top:95px;z-index:2}
        .un-tabla td{padding:3px 8px;border-bottom:1px solid var(--line-soft);white-space:nowrap;
          line-height:1.35}
        .un-tabla th{padding-left:8px;padding-right:8px}
        .un-tabla tr.off{opacity:.55}
        .un-tabla tr:hover td{background:var(--panel-2)}
        .un-g td{background:var(--panel-2);font-weight:700;color:var(--navy);font-size:11px;
          text-transform:uppercase;letter-spacing:.04em;padding:5px 9px;
          border-top:1px solid var(--line)}
        .un-g:hover td{background:var(--panel-2)}
        .un-g .muted{font-weight:600;margin-left:6px}
        .un-tabla .nom{font-weight:700;color:var(--navy)}
        .un-tipo{font-size:11px;padding:1px 7px;border:1px solid var(--line);border-radius:999px;
          background:var(--panel);color:var(--muted);white-space:nowrap}
        .un-tipo[data-tipo]{cursor:pointer}
        .un-tipo[data-tipo]:hover{border-color:var(--brand);color:var(--brand)}
        .un-tipo.med{background:var(--brand-soft);border-color:#cfe0fb;color:var(--brand-ink);
          font-weight:700}
        .td-n{display:flex;align-items:center;gap:7px}
        /* El número y el botón de reservar quedan pegados a los bordes: son
           las dos puntas que se miran, y la tabla es más ancha que la pantalla. */
        .un-tabla th:first-child,.un-tabla td:first-child{position:sticky;left:0;z-index:1;
          background:var(--panel);box-shadow:1px 0 0 var(--line-soft)}
        .un-tabla th:last-child,.un-tabla td.td-acc{position:sticky;right:0;z-index:1;
          background:var(--panel);box-shadow:-1px 0 0 var(--line-soft)}
        .un-tabla tr:hover td:first-child,.un-tabla tr:hover td.td-acc{background:var(--panel-2)}
        .un-tabla .un-g td{position:static;box-shadow:none}
        .un-tabla th:first-child{z-index:3} .un-tabla th:last-child{z-index:3}
        .td-acc{text-align:right;padding-right:10px}
        .un-foto{width:26px;height:26px;border:1px dashed var(--line);border-radius:7px;
          background:var(--panel);color:var(--muted);cursor:pointer;display:grid;place-items:center;
          padding:0;overflow:hidden}
        .un-foto svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.4}
        .un-foto:hover{border-color:var(--brand);color:var(--brand)}
        .un-foto.hay{border-style:solid;border-color:var(--line)}
        .un-foto img{width:100%;height:100%;object-fit:cover}
        .bres{border:1px solid var(--brand);background:var(--brand-soft);color:var(--brand-ink);
          border-radius:7px;padding:2px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;
          white-space:nowrap}
        .bres:hover{background:var(--brand);color:#fff}
        .b-x{border:1px solid var(--line);background:var(--panel);border-radius:7px;padding:2px 8px;
          font:inherit;font-size:11.5px;color:var(--muted);cursor:pointer}
        .b-x:hover{border-color:var(--brand);color:var(--brand)}
        .un-back{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .un-prev{margin-top:12px;height:200px;border:1px solid var(--line);border-radius:10px;
          background:var(--panel-2);display:grid;place-items:center;overflow:hidden}
        .un-prev img{width:100%;height:100%;object-fit:contain}
        .pill.viol{background:#f3e8ff;color:#6b21a8}
      </style>`;
    },
  };

  // Fecha de hoy en el formato corto que se usa en la planilla.
  function hoy() {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  global.Unidades = Unidades;
})(typeof window !== 'undefined' ? window : globalThis);
