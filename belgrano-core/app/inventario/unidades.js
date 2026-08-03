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
        <div id="un-filtros" style="margin-bottom:10px"></div>
        <div id="un-mods" style="margin-bottom:14px"></div>
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

      // Los filtros van arriba, en módulos: se elige la categoría y ahí
      // aparecen los de esa categoría —medida, estructura, frente—. La tabla
      // se lleva todo el ancho.
      const mods = document.getElementById('un-mods');
      if (mods) { mods.innerHTML = this.htmlModulos(); this.engancharModulos(); }
      const cont = document.getElementById('un-lista');
      cont.innerHTML = '<div id="un-tabla"></div>';
      this.pintarTabla(document.getElementById('un-tabla'), us);
    },

    // Cada categoría se pliega sola: con dos o tres marcadas, se abre la que se
    // está mirando y las otras quedan en una línea con su cuenta.
    _plegadas: (() => {
      try { return new Set(JSON.parse(localStorage.getItem(VER_KEY + '_p')) || []); }
      catch { return new Set(); }
    })(),
    // Plegada, la categoría sigue diciendo lo importante: cuánto hay de cada
    // cosa, para no tener que abrirla sólo para mirar.
    resumen(items) {
      const m = new Map();
      items.forEach(u => {
        const v = global.DB.vistaUnidad(u);
        m.set(v, (m.get(v) || 0) + 1);
      });
      return global.DB.VISTAS_UNIDAD.filter(v => m.get(v.k))
        .map(v => `${m.get(v.k)} ${v.label.toLowerCase()}`).join(' · ');
    },
    plegada(id) { return this._plegadas.has(id); },
    plegar(id) {
      if (this._plegadas.has(id)) this._plegadas.delete(id); else this._plegadas.add(id);
      try { localStorage.setItem(VER_KEY + '_p', JSON.stringify([...this._plegadas])); } catch {}
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

    // Los filtros viven arriba, en módulos: se abre uno por vez y se cierra
    // solo. Primero la categoría; recién ahí aparecen los módulos de ESA
    // categoría —medidas del frente, estructura, frente—, que es como se lee
    // el catálogo.
    _mod: null,
    abrirMod(k) { this._mod = this._mod === k ? null : k; },
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

    // Los módulos de arriba. El de categoría siempre está; los de propiedad
    // salen de lo que se está mirando, así los títulos cambian con la categoría.
    modulos() {
      const out = [];
      const cats = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaProps(u) || !this.pasaProv(u) || !this.pasaFiltro(u)) return;
        const c = this.catDe(u); if (!c) return;
        cats.set(c.id, (cats.get(c.id) || 0) + 1);
      });
      out.push({
        k: 'cats', titulo: 'Categoría', tipo: 'cat', sel: this.cats,
        ops: [...cats.entries()].map(([id, n]) => ({
          k: id, n, label: (this.arbol.find(c => c.id === id) || {}).nombre || '—',
        })).sort((a, b) => String(a.label).localeCompare(String(b.label))),
      });

      // Una lista por propiedad, con la cuenta de cada valor.
      this.clavesProp().forEach(k => {
        const m = new Map(); const nom = new Map();
        global.DB.unidadesTodas().forEach(u => {
          if (!this.pasaCat(u) || !this.pasaProv(u) || !this.pasaFiltro(u)) return;
          const val = this.valorProp(u, k); if (!val) return;
          const nk = this.normT(val);
          m.set(nk, (m.get(nk) || 0) + 1);
          if (!nom.has(nk)) nom.set(nk, val);
        });
        const ops = [...m.entries()].map(([x, n]) => ({ k: x, n, label: nom.get(x) }))
          .sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label)));
        const sel = this.props[k] || [];
        if (ops.length < 2 && !sel.length) return;
        out.push({
          k, titulo: this.tituloProp(k), tipo: 'prop', sel, ops,
          color: ['estructura', 'frente', 'terminacion', 'material'].includes(global.DB.rolDe(k)),
        });
      });

      // Quién la trae: con "en producción" marcado contesta la pregunta de
      // todos los días —qué me tiene que entregar Tony.
      const provs = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaCat(u) || !this.pasaProps(u) || !this.pasaFiltro(u)) return;
        if (!u.proveedor) return;
        provs.set(u.proveedor, (provs.get(u.proveedor) || 0) + 1);
      });
      if (provs.size > 1 || this.provs.length) {
        out.push({
          k: 'provs', titulo: 'Proveedor', tipo: 'prov', sel: this.provs,
          ops: [...provs.entries()].map(([k, n]) => ({ k, n, label: k }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        });
      }
      return out;
    },

    htmlModulos() {
      const ms = this.modulos();
      const hay = this.cats.length || this.provs.length || Object.keys(this.props).length;
      return `<div class="un-mods">
        ${ms.map(g => {
          const on = this._mod === g.k;
          const marcadas = g.ops.filter(o => g.sel.includes(o.k));
          const resumen = marcadas.length === 1 ? String(marcadas[0].label)
            : marcadas.length ? `${marcadas.length} elegidas` : '';
          return `<div class="un-mod ${on ? 'on' : ''} ${g.sel.length ? 'marca' : ''}">
            <button class="un-mod-b" data-mod="${UI.esc(String(g.k))}" aria-expanded="${on}">
              <span class="un-mod-t">${UI.esc(g.titulo)}</span>
              ${resumen ? `<span class="un-mod-v">${UI.esc(resumen)}</span>` : ''}
              <span class="un-mod-fl">▾</span>
            </button>
            ${on ? `<div class="un-mod-p">
              ${g.ops.map(o => `<label class="un-o ${g.sel.includes(o.k) ? 'on' : ''}">
                <input type="checkbox" data-${g.tipo}="${UI.esc(String(g.k))}|${UI.esc(String(o.k))}"
                  ${g.sel.includes(o.k) ? 'checked' : ''}>
                ${g.color ? `<span class="pt" style="background:${global.DB.colorDe(o.label)}"></span>` : ''}
                <span class="un-o-n">${UI.esc(o.label)}</span>
                <span class="un-o-c tnum">${o.n}</span></label>`).join('')}
            </div>` : ''}
          </div>`;
        }).join('')}
        ${hay ? '<button class="lnk" data-limpia="todo">limpiar</button>' : ''}
      </div>`;
    },

    engancharModulos() {
      const cont = document.getElementById('un-mods'); if (!cont) return;
      cont.querySelectorAll('[data-mod]').forEach(b => b.onclick = e => {
        e.stopPropagation(); this.abrirMod(b.dataset.mod); this.pintar();
      });
      cont.querySelectorAll('[data-cat]').forEach(i => i.onchange = () => {
        const id = Number(i.dataset.cat.split('|')[1]);
        this.cats = this.cats.includes(id) ? this.cats.filter(x => x !== id) : [...this.cats, id];
        // Al cambiar de categoría, lo marcado de la anterior deja de aplicar.
        this.props = {};
        this.pintar();
      });
      cont.querySelectorAll('[data-prop]').forEach(i => i.onchange = () => {
        const [k, v] = i.dataset.prop.split('|');
        const sel = this.props[k] || [];
        this.props[k] = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v];
        if (!this.props[k].length) delete this.props[k];
        this.pintar();
      });
      cont.querySelectorAll('[data-prov]').forEach(i => i.onchange = () => {
        const k = i.dataset.prov.split('|')[1];
        this.provs = this.provs.includes(k) ? this.provs.filter(x => x !== k) : [...this.provs, k];
        this.pintar();
      });
      cont.querySelectorAll('[data-limpia]').forEach(b => b.onclick = () => {
        this.cats = []; this.props = {}; this.provs = []; this.pintar();
      });
      // Se cierra tocando afuera, como cualquier desplegable.
      if (!this._afuera) {
        this._afuera = ev => {
          if (!this._mod) return;
          if (ev.target.closest && ev.target.closest('.un-mod')) return;
          this._mod = null; this.pintar();
        };
        document.addEventListener('click', this._afuera);
      }
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
        const on = !this.plegada(g.id);
        return `<section class="un-sec">
          <button class="un-cat" data-plegarcat="${g.id}" aria-expanded="${on}">
            <span class="un-cat-fl">${on ? '▾' : '▸'}</span>
            <h2>${UI.esc(g.nombre)}</h2>
            <span class="un-cat-n">${g.items.length} ${g.items.length === 1 ? 'unidad' : 'unidades'}</span>
            ${on ? '' : `<span class="un-cat-r">${UI.esc(this.resumen(g.items))}</span>`}
          </button>
          ${on ? `<div class="card un-tabla">
            <table>
              <thead><tr>
                <th>Estado</th><th>N°</th><th class="th-f">Foto</th><th>Modelo</th>
                ${claves.map(k => `<th>${UI.esc(this.tituloProp(k))}</th>`).join('')}
                <th>Ubicación</th><th class="th-f">Nota</th><th></th>
              </tr></thead>
              <tbody>${g.items.map(u => this.renglon(u, ed, claves)).join('')}</tbody>
            </table>
          </div>` : ''}
        </section>`;
      }).join('')}
        <div class="hint" style="margin-top:9px">Acá se consulta qué hay y con qué número de
          serie. <b>Reservar se reserva desde la venta</b>, atada a su orden. La que es
          <b>a medida</b> lleva su foto para que el vendedor sepa qué está vendiendo.</div>`;

      cont.querySelectorAll('[data-plegarcat]').forEach(b => b.onclick = () => {
        this.plegar(Number(b.dataset.plegarcat)); this.pintar();
      });
      cont.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => this.ficha(Number(b.dataset.ver)));
      cont.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => this.pedir(Number(b.dataset.pedir)));
      cont.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => this.modalFoto(Number(b.dataset.foto)));
      cont.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => this.modalNota(Number(b.dataset.nota)));
    },

    // En la pantalla se ve lo que se mira de corrido: cómo está, cuál es, qué
    // es y dónde está. Proveedor, fechas y venta viven en "Ver más": son datos
    // de una pieza en particular, no de la recorrida.
    renglon(u, ed, claves) {
      const e = global.DB.etiquetaUnidad(u);
      return `<tr class="${u.estado === 'entregada' ? 'off' : ''}">
        <td class="td-e"><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
        <td><span class="tnum nom">${UI.esc(u.serie)}</span></td>
        <td class="td-f">${this.botonFoto(u, ed)}</td>
        <td>${UI.esc(u.modelo)}${u.tipo === 'medida'
          ? ' <span class="un-tipo med">a medida</span>' : ''}</td>
        ${(claves || []).map(k => {
          const val = this.valorProp(u, k) || (k === 'medida' ? u.medida : '');
          return `<td class="${k === 'medida' ? 'tnum' : ''}">${val
            ? UI.esc(val) : '<span class="muted">—</span>'}</td>`;
        }).join('')}
        <td class="muted">${UI.esc(global.DB.ubicacionLabel(u.ubicacion) || '—')}</td>
        <td class="td-f">${this.botonNota(u)}</td>
        <td class="td-acc"><button class="b-x" data-ver="${u.id}">Ver más</button></td>
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

    // El globito: fábrica escribe acá lo que pasa con ESA pieza —"le falta la
    // manija", "viene con el frente cambiado"—. Cuando hay algo escrito el
    // globito queda lleno, así se ve de lejos cuál tiene algo que decir.
    botonNota(u) {
      const ic = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 3.2h11.2v7.6H6.8L3.6
        13.2v-2.4H2.4z"/></svg>`;
      const hay = !!(u.nota || '').trim();
      return `<button class="un-nota ${hay ? 'hay' : ''}" data-nota="${u.id}"
        title="${hay ? UI.esc(u.nota) : 'Dejar una nota de fábrica'}">${ic}</button>`;
    },

    modalNota(id) {
      const u = global.DB.unidad(id); if (!u) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="un-back" id="un-mdl">
          <div class="card pad" style="max-width:440px;width:100%">
            <h3 class="h-title" style="font-size:17px">Nota de fábrica</h3>
            <p class="h-sub">${UI.esc(u.serie === '—' ? 'Sin etiqueta' : u.serie)} ·
              ${UI.esc(u.modelo)} ${UI.esc(u.medida)}</p>
            <label class="fld" style="margin-top:12px"><span class="lbl">Qué pasa con esta pieza</span>
              <textarea id="un-nt" rows="4"
                placeholder="Vino con el frente cambiado, falta la manija…">${UI.esc(u.nota || '')}</textarea></label>
            <div class="hint" style="margin-top:6px">Es de <b>esta unidad</b>, no del modelo: la
              sigue a donde vaya y la ve el que la va a entregar.</div>
            <div class="row" style="margin-top:16px;gap:10px">
              ${(u.nota || '').trim() ? '<button class="btn" id="un-borrar">Borrar</button>' : ''}
              <div class="sp"></div>
              <button class="btn" id="un-x">Cancelar</button>
              <button class="btn primary" id="un-ok">Guardar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const m = document.getElementById('un-mdl'); if (m) m.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = e => { if (e.target.id === 'un-mdl') cerrar(); };
      const del = document.getElementById('un-borrar');
      if (del) del.onclick = () => {
        global.DB.guardarUnidad({ id, nota: '' }); cerrar(); this.pintar();
      };
      document.getElementById('un-ok').onclick = () => {
        global.DB.guardarUnidad({ id, nota: document.getElementById('un-nt').value.trim() });
        UI.aviso('Nota guardada', 'ok'); cerrar(); this.pintar();
      };
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
              ${dato('La tengo desde', u.listo)}
              ${u.orden ? `<div class="fi-r"><span>Orden de venta</span>
                <b>${UI.esc(u.orden)}${pos ? ` · ${pos.n} de ${pos.de}` : ''}</b></div>` : ''}
              ${dato('Vendida el', u.fechaVenta)}
              ${dato('Entregada el', u.fechaEntrega)}
            </div>
            ${(u.nota || '').trim() ? `<div class="fi-nota"><span>Nota de fábrica</span>
              <p>${UI.esc(u.nota)}</p></div>` : ''}
            <div class="hint" style="margin-top:11px">${u.orden
              ? 'Está atada a esa venta. Para liberarla hay que hacerlo desde la orden.'
              : 'No tiene dueño. <b>Se reserva desde la venta</b>, no desde acá: así toda reserva queda respaldada por una orden.'}</div>
            <div class="row" style="margin-top:16px;gap:10px">
              ${u.estado === 'pedir' && global.App && global.App.puede
                && global.App.puede('editarCatalogo')
                ? `<button class="btn primary" id="un-pedir">Pedir a fábrica</button>` : ''}
              <div class="sp"></div>
              <button class="btn" id="un-nota">Nota de fábrica</button>
              <button class="btn" id="un-x">Cerrar</button>
            </div>
          </div>
        </div>`);
      const cerrar = () => { const x = document.getElementById('un-mdl'); if (x) x.remove(); };
      document.getElementById('un-x').onclick = cerrar;
      document.getElementById('un-mdl').onclick = ev => { if (ev.target.id === 'un-mdl') cerrar(); };
      document.getElementById('un-nota').onclick = () => { cerrar(); this.modalNota(id); };
      const bp = document.getElementById('un-pedir');
      if (bp) bp.onclick = () => { cerrar(); this.pedir(id); };
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

        /* Los filtros son módulos: una fila arriba, cada uno se abre solo.
           Primero la categoría; los de propiedad cambian con ella. */
        .un-mods{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
        .un-mod{position:relative}
        .un-mod-b{display:flex;align-items:center;gap:6px;border:1px solid var(--line);
          background:var(--panel);border-radius:9px;padding:5px 10px;cursor:pointer;font:inherit;
          font-size:12.5px;color:var(--ink-soft);white-space:nowrap}
        .un-mod-b:hover{border-color:var(--brand);color:var(--brand)}
        .un-mod-t{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted)}
        .un-mod.marca .un-mod-t{color:var(--brand)}
        .un-mod-v{font-weight:700;color:var(--navy);max-width:150px;overflow:hidden;
          text-overflow:ellipsis}
        .un-mod-fl{font-size:9px;color:var(--muted)}
        .un-mod.on .un-mod-b,.un-mod.marca .un-mod-b{border-color:var(--brand)}
        .un-mod.on .un-mod-fl{transform:rotate(180deg)}
        .un-mod-p{position:absolute;top:calc(100% + 5px);left:0;z-index:20;min-width:200px;
          max-height:300px;overflow:auto;background:var(--panel);border:1px solid var(--line);
          border-radius:11px;padding:7px 11px;box-shadow:0 10px 26px rgba(12,22,44,.14)}
        .un-ord{flex:none;width:auto;min-width:150px;padding:8px 10px;font-size:12.5px;font-weight:650;
          color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;background:var(--panel)}
        .pt{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.18);flex:none;
          display:inline-block}
        .un-mods .lnk{border:0;background:none;padding:0 4px;font:inherit;font-size:11.5px;
          font-weight:600;color:var(--brand);cursor:pointer}
        .un-mods .lnk:hover{text-decoration:underline}
        .un-o{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer;font-size:12.5px;
          color:var(--ink-soft)}
        .un-o:hover{color:var(--navy)}
        .un-o.on{color:var(--navy);font-weight:650}
        .un-o input{width:14px;height:14px;accent-color:var(--brand);flex:none;margin:0}
        .un-o-n{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .un-o-c{font-size:11px;color:var(--muted);flex:none;margin-left:5px}

        /* El renglón va bajo: se trabaja mirando muchos a la vez. */
        .un-tabla{overflow-x:auto}
        .un-tabla{max-width:100%}
        .un-tabla table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:700px}
        .un-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 6px;border-bottom:1px solid var(--line);
          white-space:nowrap;background:var(--panel)}
        .un-tabla td{padding:3px 6px;border-bottom:1px solid var(--line-soft);white-space:nowrap;
          line-height:1.35}
        .un-tabla th{padding-left:6px;padding-right:6px}
        .un-tabla tr.off{opacity:.55}
        .un-tabla tr:hover td{background:var(--panel-2)}
        .un-tabla .nom{font-weight:700;color:var(--navy)}
        /* La categoría manda: va arriba de todo, más grande, y recién debajo
           los títulos de las columnas de ESA categoría. */
        .un-sec{margin-bottom:20px}
        /* El título queda fijo mientras se recorre su categoría: son muchos
           renglones y hay que saber siempre qué se está mirando. */
        .un-cat{display:flex;align-items:baseline;gap:9px;margin:0;padding:7px 0 6px;
          position:sticky;top:95px;z-index:4;background:var(--bg);width:100%;border:0;
          font:inherit;text-align:left;cursor:pointer}
        .un-cat h2{margin:0;font-size:17px;font-weight:800;color:var(--navy);letter-spacing:-.01em}
        .un-cat:hover h2{color:var(--brand)}
        .un-cat-n{font-size:12px;color:var(--muted)}
        .un-cat-fl{font-size:10px;color:var(--muted);width:11px;flex:none}
        .un-cat-r{font-size:12px;color:var(--muted);min-width:0;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap}
        .un-sec:has(.un-cat[aria-expanded="false"]){margin-bottom:2px}
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
        /* El globito de fábrica: vacío es un contorno, lleno se pinta. */
        .un-nota{width:24px;height:24px;border:0;background:none;color:var(--line);cursor:pointer;
          display:grid;place-items:center;padding:0}
        .un-nota svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.3;
          stroke-linejoin:round}
        .un-nota:hover{color:var(--brand)}
        .un-nota.hay{color:var(--brand)}
        .un-nota.hay svg{fill:var(--brand-soft)}
        .fi-nota{margin-top:11px;border:1px solid var(--line);border-radius:10px;padding:8px 11px;
          background:var(--panel-2)}
        .fi-nota span{font-size:10.5px;font-weight:700;text-transform:uppercase;
          letter-spacing:.05em;color:var(--muted)}
        .fi-nota p{margin:2px 0 0;font-size:12.5px;color:var(--ink)}
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
