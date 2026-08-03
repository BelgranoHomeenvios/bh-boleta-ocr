// =====================================================================
//  Belgrano Soft · Inventario · Unidades
//  La planilla de siempre, hecha sistema. Una fila por unidad —la pieza,
//  no el modelo— con su estado a la vista. Es de CONSULTA: acá se mira qué
//  hay y con qué número de serie, pero no se reserva — la reserva vive en la
//  venta, encadenada a su orden, para que ninguna quede sin respaldo.
// =====================================================================
(function (global) {
  const VER_KEY = 'bh_inv_cats';

  const Unidades = {
    _mount: 'view',
    texto: '',
    filtro: 'todo',        // todo · disponible · stock · produccion · reservada · entregada · marcas
    cats: [],              // categorías marcadas — costado izquierdo
    props: {},             // propiedades marcadas — costado derecho
    provs: [],             // proveedores marcados — "qué me tiene que traer Tony"

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
          <div class="un-busca"><input id="un-q" placeholder="Buscar en todo el inventario: número, modelo, medida o color…"
            value="${UI.esc(this.texto)}"></div>
          <select id="un-orden" class="un-ord" title="Cómo se ordenan">${this.ORDENES.map(o =>
            `<option value="${o.k}">${UI.esc(o.label)}</option>`).join('')}</select>
        </div>
        <div id="un-kpis"></div>
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
        if (!this.pasaProv(u)) return false;
        if (!this.pasaProps(u)) return false;
        if (!this.pasaFiltro(u)) return false;
        if (!t.length) return true;
        const txt = `${u.serie} ${u.modelo} ${u.medida} ${u.color} ${u.orden || ''}`.toLowerCase();
        return t.every(x => txt.includes(x));
      });
    },
    // Se mira de a una categoría por vez —así las columnas y los filtros son
    // los de ese mueble—, pero el buscador busca en todo: si se escribe algo,
    // la categoría marcada deja de acotar. Es lo que se espera de un buscador.
    pasaCat(u) {
      if (this.texto) return true;
      if (!this.cats.length) return true;
      const c = this.catDe(u);
      return !!c && this.cats.includes(c.id);
    },
    pasaProv(u) {
      return !this.provs.length || this.provs.includes(u.proveedor);
    },
    // Cada propiedad filtra aparte: marcar Blanca en ESTRUCTURA y 1.60 en
    // MEDIDA busca las que tienen las dos cosas, igual que en el catálogo.
    pasaProps(u) {
      for (const k of Object.keys(this.props)) {
        const sel = this.props[k]; if (!sel.length) continue;
        if (!sel.includes(this.normT(this.valorProp(u, k)))) return false;
      }
      return true;
    },
    pasaFiltro(u) {
      if (this.filtro === 'todo') return true;
      return global.DB.vistaUnidad(u) === this.filtro;
    },
    cuenta(f) {
      const antes = this.filtro;
      this.filtro = f;
      const n = global.DB.unidadesTodas()
        .filter(u => this.pasaCat(u) && this.pasaProv(u) && this.pasaProps(u) && this.pasaFiltro(u)).length;
      this.filtro = antes;
      return n;
    },

    filtros() {
      return [{ k: 'todo', label: 'Todo' }, ...global.DB.VISTAS_UNIDAD];
    },

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
    // El orden en que se mira: primero lo que se puede vender, después lo
    // vendido que ya está, después lo que falta hacer, y al final lo que salió.
    PESO_VISTA: { stock: 0, lista: 1, fabricando: 2, pedir: 3, entregada: 4 },
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
      const pa = this.PESO_VISTA[global.DB.vistaUnidad(a)] ?? 9;
      const pb = this.PESO_VISTA[global.DB.vistaUnidad(b)] ?? 9;
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
        const base = us.length === tot ? `${tot} unidades` : `${us.length} de ${tot} unidades`;
        sub.innerHTML = this.texto && this.cats.length
          ? `${base} — <b>buscando en todas las categorías</b>` : base;
      }
      this.pintarKpis(us);
      const f = document.getElementById('un-filtros');
      if (f) {
        f.innerHTML = `<div class="segm">${this.filtros().map(x =>
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
        ${this.htmlProps()}
      </div>`;
      this.pintarTabla(document.getElementById('un-tabla'), us);
      this.engancharLados();
    },

    // Lo que se mira de un vistazo: cuánto hay, cuánto falta pedir, y cuánta
    // plata está parada en el depósito. La plata sólo la ve quien ve costos.
    costoDe(u) {
      const v = (global.DB.variantesTodas() || []).find(x => x.id === u.varianteId);
      if (!v) return 0;
      const prod = (this.prods || []).find(p => p.id === u.productoId) || {};
      const c = global.DB.composicion(prod, v);
      return c ? c.total : (Number(v.costo) || 0);
    },
    pintarKpis(us) {
      const k = document.getElementById('un-kpis'); if (!k) return;
      const plata = global.App && global.App.puede && global.App.puede('verCostos');
      const enPiso = us.filter(u => global.DB.enPiso(u));
      const libres = us.filter(u => global.DB.disponible(u));
      const aPedir = us.filter(u => u.estado === 'pedir');
      const viniendo = us.filter(u => u.estado === 'produccion');
      const valor = enPiso.reduce((a, u) => a + this.costoDe(u), 0);
      const valorLibre = libres.reduce((a, u) => a + this.costoDe(u), 0);
      const c = (t, v, p, cl) => `<div class="un-k">
        <div class="un-k-t">${t}</div><div class="un-k-v ${cl || ''}">${v}</div>
        <div class="un-k-p">${p}</div></div>`;
      k.innerHTML = `<div class="un-kpis">
        ${c('En el depósito', enPiso.length, `<b>${libres.length}</b> libres para vender`)}
        ${c('Falta pedir', aPedir.length, aPedir.length ? 'vendidas sin proveedor' : 'nada pendiente',
          aPedir.length ? 'alerta' : '')}
        ${c('Vienen en camino', viniendo.length, 'las está haciendo el proveedor')}
        ${plata ? c('Plata en el depósito', UI.pesos(valor),
          `<b>${UI.pesos(valorLibre)}</b> sin vender`) : ''}
      </div>`;
    },

    // Izquierda: las categorías. Derecha: las propiedades de la variante
    // —medida, estructura, frente—, las mismas del catálogo, para que se lea
    // igual en los dos lados. Los dos costados se pliegan.
    _gAbiertos: new Set(),
    grupoAbierto(k) { return this._gAbiertos.has(k); },
    abrirGrupo(k) {
      if (this._gAbiertos.has(k)) this._gAbiertos.delete(k); else this._gAbiertos.add(k);
    },
    // Las propiedades principales de cada unidad, sacadas de su variante.
    propsDe(u) {
      const v = (global.DB.variantesTodas ? global.DB.variantesTodas() : [])
        .find(x => x.id === u.varianteId);
      return v || null;
    },
    valorProp(u, k) {
      const v = this.propsDe(u);
      return v ? (v[k] || '') : '';
    },
    clavesProp() {
      // Cuando hay categorías marcadas, las propiedades son las de esas
      // categorías: un placard no se lee con las mismas columnas que una mesa
      // de luz, así que los filtros de la derecha cambian con lo que se mira.
      const ps = this.cats.length
        ? (this.prods || []).filter(p => this.cats.includes(p.categoria_id))
        : (this.prods || []);
      return this.clavesDe(ps);
    },
    // Las propiedades principales de un conjunto de muebles, en el orden en que
    // se leen: primero la medida, después cómo está terminado.
    clavesDe(ps) {
      const out = [];
      (ps || []).forEach(p => Object.keys(p.props || {})
        .forEach(k => { if (!out.includes(k)) out.push(k); }));
      return out.length ? out : ['medida', 'estructura', 'frente'];
    },
    // Las columnas de propiedad de una categoría: son las que cambian de título
    // según lo que se esté mirando.
    clavesCat(catId) {
      return this.clavesDe((this.prods || []).filter(p => p.categoria_id === catId));
    },
    tituloProp(k) {
      const p = global.DB.propiedad(k);
      return (p && p.nombre) || k;
    },

    htmlCats() {
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaProps(u) || !this.pasaFiltro(u)) return;
        const c = this.catDe(u); if (!c) return;
        m.set(c.id, (m.get(c.id) || 0) + 1);
      });
      const ops = [...m.entries()].map(([id, n]) => ({
        id, n, label: (this.arbol.find(c => c.id === id) || {}).nombre || '—',
      })).sort((a, b) => a.label.localeCompare(b.label));
      const on = this.grupoAbierto('cats');
      return `<aside class="un-c">
        <div class="un-c-h"><span>Filtros</span>
          ${this.cats.length || this.provs.length || Object.keys(this.props).length
            ? '<button class="lnk" data-limpia="todo">limpiar</button>' : ''}</div>
        <div class="un-g2 ${on ? 'on' : ''}">
          <button class="un-g-t" data-grupo="cats" aria-expanded="${on}">
            <span class="un-g-fl">${on ? '▾' : '▸'}</span>
            <span class="un-g-n">Categorías</span>
            ${this.cats.length ? `<span class="un-g-m">${this.cats.length}</span>` : ''}
          </button>
          ${!on && this.cats.length ? `<div class="un-g-r">${UI.esc(ops
            .filter(o => this.cats.includes(o.id)).map(o => o.label).join(', '))}</div>` : ''}
          ${on ? ops.map(o => `<label class="un-o ${this.cats.includes(o.id) ? 'on' : ''}">
            <input type="checkbox" data-cat="${o.id}" ${this.cats.includes(o.id) ? 'checked' : ''}>
            <span class="un-o-n">${UI.esc(o.label)}</span>
            <span class="un-o-c tnum">${o.n}</span></label>`).join('') : ''}
        </div>
        ${this.htmlProvs()}
      </aside>`;
    },

    // Quién la trae. Con el estado "en producción" marcado, esto contesta la
    // pregunta de todos los días: qué me tiene que entregar Tony.
    htmlProvs() {
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaCat(u) || !this.pasaProps(u) || !this.pasaFiltro(u)) return;
        if (!u.proveedor) return;
        m.set(u.proveedor, (m.get(u.proveedor) || 0) + 1);
      });
      const ops = [...m.entries()].map(([k, n]) => ({ k, n }))
        .sort((a, b) => a.k.localeCompare(b.k));
      if (ops.length < 2 && !this.provs.length) return '';
      const on = this.grupoAbierto('provs');
      return `<div class="un-g2 ${on ? 'on' : ''}">
        <button class="un-g-t" data-grupo="provs" aria-expanded="${on}">
          <span class="un-g-fl">${on ? '▾' : '▸'}</span>
          <span class="un-g-n">Proveedor</span>
          ${this.provs.length ? `<span class="un-g-m">${this.provs.length}</span>` : ''}
        </button>
        ${!on && this.provs.length ? `<div class="un-g-r">${UI.esc(this.provs.join(', '))}</div>` : ''}
        ${on ? ops.map(o => `<label class="un-o ${this.provs.includes(o.k) ? 'on' : ''}">
          <input type="checkbox" data-prov="${UI.esc(o.k)}" ${this.provs.includes(o.k) ? 'checked' : ''}>
          <span class="un-o-n">${UI.esc(o.k)}</span>
          <span class="un-o-c tnum">${o.n}</span></label>`).join('') : ''}
      </div>`;
    },

    // Las propiedades de la variante, una lista por propiedad — igual que el
    // catálogo: medidas del frente, estructura, frente.
    htmlProps() {
      const claves = this.clavesProp();
      const gs = claves.map(k => {
        const m = new Map(); const nom = new Map();
        global.DB.unidadesTodas().forEach(u => {
          if (!this.pasaCat(u) || !this.pasaFiltro(u)) return;
          const val = this.valorProp(u, k); if (!val) return;
          const nk = this.normT(val);
          m.set(nk, (m.get(nk) || 0) + 1);
          if (!nom.has(nk)) nom.set(nk, val);
        });
        const prop = global.DB.propiedad(k);
        const rol = global.DB.rolDe(k);
        return {
          k, titulo: (prop && prop.nombre) || k,
          color: ['estructura', 'frente', 'terminacion', 'material'].includes(rol),
          ops: [...m.entries()].map(([x, n]) => ({ k: x, n, label: nom.get(x) }))
            .sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label))),
        };
      }).filter(g => g.ops.length > 1 || (this.props[g.k] || []).length);
      if (!gs.length) return '<aside class="un-c"></aside>';
      return `<aside class="un-c">
        <div class="un-c-h"><span>Propiedades</span></div>
        ${gs.map(g => {
          const sel = this.props[g.k] || [];
          const on = this.grupoAbierto(g.k);
          return `<div class="un-g2 ${on ? 'on' : ''}">
            <button class="un-g-t" data-grupo="${UI.esc(g.k)}" aria-expanded="${on}">
              <span class="un-g-fl">${on ? '▾' : '▸'}</span>
              <span class="un-g-n">${UI.esc(g.titulo)}</span>
              ${sel.length ? `<span class="un-g-m">${sel.length}</span>` : ''}
            </button>
            ${!on && sel.length ? `<div class="un-g-r">${UI.esc(g.ops
              .filter(o => sel.includes(o.k)).map(o => o.label).join(', '))}</div>` : ''}
            ${on ? g.ops.map(o => `<label class="un-o ${sel.includes(o.k) ? 'on' : ''}">
              <input type="checkbox" data-prop="${UI.esc(g.k)}|${UI.esc(o.k)}"
                ${sel.includes(o.k) ? 'checked' : ''}>
              ${g.color ? `<span class="pt" style="background:${global.DB.colorDe(o.label)}"></span>` : ''}
              <span class="un-o-n">${UI.esc(o.label)}</span>
              <span class="un-o-c tnum">${o.n}</span></label>`).join('') : ''}
          </div>`;
        }).join('')}
      </aside>`;
    },

    engancharLados() {
      document.querySelectorAll('[data-grupo]').forEach(b => b.onclick = () => {
        this.abrirGrupo(b.dataset.grupo); this.pintar();
      });
      document.querySelectorAll('[data-cat]').forEach(i => i.onchange = () => {
        const id = Number(i.dataset.cat);
        this.cats = this.cats.includes(id) ? this.cats.filter(x => x !== id) : [...this.cats, id];
        this.pintar();
      });
      document.querySelectorAll('[data-prop]').forEach(i => i.onchange = () => {
        const [k, v] = i.dataset.prop.split('|');
        const sel = this.props[k] || [];
        this.props[k] = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v];
        if (!this.props[k].length) delete this.props[k];
        this.pintar();
      });
      document.querySelectorAll('[data-prov]').forEach(i => i.onchange = () => {
        const k = i.dataset.prov;
        this.provs = this.provs.includes(k) ? this.provs.filter(x => x !== k) : [...this.provs, k];
        this.pintar();
      });
      document.querySelectorAll('[data-limpia]').forEach(b => b.onclick = () => {
        this.cats = []; this.props = {}; this.provs = []; this.pintar();
      });
    },

    // Una tabla por categoría: arriba el nombre de la categoría, abajo los
    // títulos de las columnas —que cambian con ella, porque un placard no se
    // lee con las mismas propiedades que una mesa de luz— y recién ahí los
    // muebles. El renglón es bajo a propósito: se trabaja mirando muchos.
    pintarTabla(cont, us) {
      if (!us.length) { cont.innerHTML = UI.vacio('Ninguna unidad con ese filtro.'); return; }
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      const grupos = this.porCategoria(this.ordenar(us));

      cont.innerHTML = `${grupos.map(g => {
        const claves = this.clavesCat(g.id);
        return `<section class="un-sec">
          <div class="un-cat">
            <h2>${UI.esc(g.nombre)}</h2>
            <span class="un-cat-n">${g.items.length} ${g.items.length === 1 ? 'unidad' : 'unidades'}</span>
          </div>
          <div class="card un-tabla">
            <table>
              <thead><tr>
                <th>N°</th><th class="th-f">Foto</th><th>Modelo</th>
                ${claves.map(k => `<th>${UI.esc(this.tituloProp(k))}</th>`).join('')}
                <th>Estado</th><th>Ubicación</th><th>Proveedor</th>
                <th>Llega</th><th>Listo</th><th>Venta</th><th></th>
              </tr></thead>
              <tbody>${g.items.map(u => this.renglon(u, ed, claves)).join('')}</tbody>
            </table>
          </div>
        </section>`;
      }).join('')}
        <div class="hint" style="margin-top:9px">Acá se consulta qué hay y con qué número de
          serie. <b>Reservar se reserva desde la venta</b>, atada a su orden. La que es
          <b>a medida</b> lleva su foto para que el vendedor sepa qué está vendiendo.</div>`;

      cont.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => this.ficha(Number(b.dataset.ver)));
      cont.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => this.pedir(Number(b.dataset.pedir)));
      cont.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => this.modalFoto(Number(b.dataset.foto)));
    },

    renglon(u, ed, claves) {
      const e = global.DB.etiquetaUnidad(u);
      const enProd = u.estado === 'produccion';
      return `<tr class="${u.estado === 'entregada' ? 'off' : ''}">
        <td><span class="tnum nom">${UI.esc(u.serie)}</span></td>
        <td class="td-f">${this.botonFoto(u, ed)}</td>
        <td>${UI.esc(u.modelo)}${u.tipo === 'medida'
          ? ' <span class="un-tipo med">a medida</span>' : ''}</td>
        ${(claves || []).map(k => {
          const val = this.valorProp(u, k) || (k === 'medida' ? u.medida : '');
          return `<td class="${k === 'medida' ? 'tnum' : ''}">${val
            ? UI.esc(val) : '<span class="muted">—</span>'}</td>`;
        }).join('')}
        <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
        <td class="muted">${UI.esc(global.DB.ubicacionLabel(u.ubicacion) || '—')}</td>
        <td class="muted">${UI.esc(u.proveedor || '—')}</td>
        <td>${enProd && u.llega ? `<b>${UI.esc(u.llega)}</b>`
          : `<span class="muted">—</span>`}</td>
        <td class="muted">${UI.esc(u.listo || '—')}</td>
        <td class="muted">${u.orden ? (() => {
          const pos = global.DB.posEnOrden(u);
          return `<b class="nom">${UI.esc(u.orden)}</b>${pos
            ? ` <span class="un-pos">${pos.n} de ${pos.de}</span>` : ''}`;
        })() : '—'}</td>
        <td class="td-acc">${u.estado === 'pedir' && ed
          ? `<button class="bres" data-pedir="${u.id}">Pedir</button>`
          : `<button class="b-x" data-ver="${u.id}">Ver</button>`}</td>
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
    // La ficha de una unidad: todo lo que se sabe de esa pieza, y de dónde
    // sale cada dato. Es una consulta — para reservarla hay que ir a la venta.
    ficha(id) {
      const u = global.DB.unidad(id); if (!u) return;
      const v = global.DB.vistaUnidad(u);
      const e = global.DB.VISTAS_UNIDAD.find(x => x.k === v) || {};
      const pos = global.DB.posEnOrden(u);
      const m = global.DB.marcaUnidad(u.marca);
      const dato = (t, val) => val ? `<div class="fi-r"><span>${t}</span><b>${UI.esc(val)}</b></div>` : '';
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:480px;width:100%">
            <div class="row" style="align-items:flex-start">
              <div>
                <h3 class="h-title" style="font-size:17px">${UI.esc(u.serie === '—' ? 'Sin etiqueta' : u.serie)}</h3>
                <p class="h-sub">${UI.esc(u.modelo)} · ${UI.esc(u.medida)} · ${UI.esc(u.color)}</p>
              </div>
              <div class="sp"></div>
              <span class="pill ${e.pill}">${UI.esc(e.label || '')}</span>
            </div>
            ${m ? `<div class="banner warn" style="margin-top:10px">${UI.esc(m.label)} —
              ${UI.esc(m.pie)}</div>` : ''}
            <div class="fi" style="margin-top:12px">
              ${dato('Tipo', u.tipo === 'medida' ? 'A medida' : 'Estándar')}
              ${dato('Ubicación', global.DB.ubicacionLabel(u.ubicacion))}
              ${dato('Proveedor', u.proveedor)}
              ${dato('Llega', u.llega)}
              ${dato('Listo desde', u.listo)}
              ${u.orden ? `<div class="fi-r"><span>Orden de venta</span>
                <b>${UI.esc(u.orden)}${pos ? ` · ${pos.n} de ${pos.de}` : ''}</b></div>` : ''}
              ${dato('Vendida el', u.fechaVenta)}
              ${dato('Entregada el', u.fechaEntrega)}
            </div>
            <div class="hint" style="margin-top:11px">${u.orden
              ? 'Está atada a esa venta. Para liberarla hay que hacerlo desde la orden.'
              : 'No tiene dueño. <b>Se reserva desde la venta</b>, no desde acá: así toda reserva queda respaldada por una orden.'}</div>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="sp"></div>
              <button class="btn" id="un-x">Cerrar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const x = document.getElementById('un-mdl'); if (x) x.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = ev => { if (ev.target.id === 'un-mdl') cerrar(); };
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
        .un-cols>#un-tabla{min-width:0}
        @media(max-width:1240px){.un-cols{grid-template-columns:1fr}}
        .un-ord{flex:none;width:auto;min-width:150px;padding:8px 10px;font-size:12.5px;font-weight:650;
          color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;background:var(--panel)}
        .pt{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.18);flex:none;
          display:inline-block}
        .un-c{position:sticky;top:104px;display:flex;flex-direction:column}
        .un-c-h{display:flex;align-items:baseline;gap:8px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:5px}
        /* Cada grupo se pliega, igual que en el catálogo. */
        .un-g2{display:flex;flex-direction:column;margin-bottom:6px}
        .un-g-t{display:flex;align-items:center;gap:6px;width:100%;border:0;background:none;
          padding:3px 0;cursor:pointer;font:inherit;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left}
        .un-g-t:hover{color:var(--navy)}
        .un-g2.on .un-g-t{color:var(--ink-soft);margin-bottom:3px}
        .un-g-fl{font-size:9px;width:9px;flex:none}
        .un-g-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .un-g-m{font-size:10px;font-weight:700;background:var(--brand);color:#fff;
          border-radius:999px;padding:0 6px;line-height:15px;flex:none}
        .un-g-r{font-size:11.5px;color:var(--brand);padding-left:15px;margin-bottom:2px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
          white-space:nowrap;background:var(--panel)}
        .un-tabla td{padding:3px 8px;border-bottom:1px solid var(--line-soft);white-space:nowrap;
          line-height:1.35}
        .un-tabla th{padding-left:8px;padding-right:8px}
        .un-tabla tr.off{opacity:.55}
        .un-tabla tr:hover td{background:var(--panel-2)}
        .un-tabla .nom{font-weight:700;color:var(--navy)}
        /* La categoría manda: va arriba de todo, más grande, y recién debajo
           los títulos de las columnas de ESA categoría. */
        .un-sec{margin-bottom:20px}
        /* El título queda fijo mientras se recorre su categoría: son muchos
           renglones y hay que saber siempre qué se está mirando. */
        .un-cat{display:flex;align-items:baseline;gap:9px;margin:0;padding:7px 0 6px;
          position:sticky;top:95px;z-index:4;background:var(--bg)}
        .un-cat h2{margin:0;font-size:17px;font-weight:800;color:var(--navy);letter-spacing:-.01em}
        .un-cat-n{font-size:12px;color:var(--muted)}
        .th-f{width:34px}
        .td-f{width:34px;padding-left:4px;padding-right:4px}
        .un-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
        @media(max-width:900px){.un-kpis{grid-template-columns:1fr 1fr}}
        .un-k{border:1px solid var(--line);border-radius:11px;padding:9px 12px;background:var(--panel)}
        .un-k-t{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);
          font-weight:700}
        .un-k-v{font-size:19px;font-weight:800;color:var(--navy);margin-top:1px}
        .un-k-v.alerta{color:var(--crit)}
        .un-k-p{font-size:11px;color:var(--muted)}
        .un-k-p b{color:var(--ink-soft)}
        .un-pos{font-size:11px;color:var(--muted)}
        .fi{display:flex;flex-direction:column;gap:1px}
        .fi-r{display:flex;align-items:baseline;gap:10px;padding:4px 0;font-size:12.5px;
          border-bottom:1px solid var(--line-soft)}
        .fi-r:last-child{border-bottom:0}
        .fi-r span{color:var(--muted);flex:0 0 118px}
        .fi-r b{color:var(--navy)}
        .un-tipo{font-size:11px;padding:1px 7px;border:1px solid var(--line);border-radius:999px;
          background:var(--panel);color:var(--muted);white-space:nowrap}
        .un-tipo[data-tipo]{cursor:pointer}
        .un-tipo[data-tipo]:hover{border-color:var(--brand);color:var(--brand)}
        .un-tipo.med{background:var(--brand-soft);border-color:#cfe0fb;color:var(--brand-ink);
          font-weight:700}
        /* El número y la acción quedan pegados a los bordes: son
           las dos puntas que se miran, y la tabla es más ancha que la pantalla. */
        .un-tabla th:first-child,.un-tabla td:first-child{position:sticky;left:0;z-index:1;
          background:var(--panel);box-shadow:1px 0 0 var(--line-soft)}
        .un-tabla th:last-child,.un-tabla td.td-acc{position:sticky;right:0;z-index:1;
          background:var(--panel);box-shadow:-1px 0 0 var(--line-soft)}
        .un-tabla tr:hover td:first-child,.un-tabla tr:hover td.td-acc{background:var(--panel-2)}
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
