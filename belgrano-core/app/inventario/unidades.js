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
    // Por proveedor no se filtra acá: eso se mira en Producción, que es
    // donde se sigue lo que cada uno tiene que entregar.

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      // Con una unidad abierta, la pantalla es la ficha de esa pieza.
      if (this.abierta) {
        v.innerHTML = UI.spinner() + this.estilos();
        if (!this.arbol) { try { this.arbol = await global.DB.arbolCategorias(); } catch { this.arbol = []; } }
        if (!this.prods) this.prods = await global.DB.productos({ limite: 500 }).catch(() => []);
        v.innerHTML = this.htmlFicha(this.abierta) + this.estilos();
        this.engancharFicha(this.abierta);
        return;
      }
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
        if (!this.pasaProps(u)) return false;
        if (!this.pasaCol(u)) return false;
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
    // Cada propiedad filtra aparte: marcar Blanca en ESTRUCTURA y 1.60 en
    // MEDIDA busca las que tienen las dos cosas, igual que en el catálogo.
    pasaProps(u) {
      for (const k of Object.keys(this.props)) {
        const sel = this.props[k]; if (!sel.length) continue;
        if (!sel.includes(this.normT(this.valorProp(u, k)))) return false;
      }
      return true;
    },
    // Cada título de columna es su propio filtro: se abre, se marca lo que se
    // busca y la tabla queda con eso. Es lo que uno hace en una planilla.
    fcol: {},              // columna → valores marcados (normalizados)
    valorCol(u, col) {
      switch (col.k) {
        case 'estado': {
          const v = global.DB.VISTAS_UNIDAD.find(x => x.k === global.DB.vistaUnidad(u));
          return v ? v.label : '';
        }
        case 'serie': return u.serie === '—' ? 'Sin etiqueta' : u.serie;
        case 'modelo': return u.modelo;
        case 'ubicacion': return global.DB.ubicacionLabel(u.ubicacion) || 'Sin ubicación';
        case 'nota': return (u.nota || '').trim() ? 'Con nota' : 'Sin nota';
        default: return this.valorProp(u, col.k) || (col.k === 'medida' ? u.medida : '');
      }
    },
    pasaCol(u, salvo) {
      for (const k of Object.keys(this.fcol)) {
        if (k === salvo) continue;
        const sel = this.fcol[k]; if (!sel || !sel.length) continue;
        if (!sel.includes(this.normT(this.valorCol(u, { k })))) return false;
      }
      return true;
    },
    marcarCol(k, v) {
      const sel = this.fcol[k] || [];
      this.fcol[k] = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v];
      if (!this.fcol[k].length) delete this.fcol[k];
    },
    pasaFiltro(u) {
      if (this.filtro === 'todo') return true;
      return global.DB.vistaUnidad(u) === this.filtro;
    },
    cuenta(f) {
      const antes = this.filtro;
      this.filtro = f;
      const n = global.DB.unidadesTodas()
        .filter(u => this.pasaCat(u) && this.pasaProps(u) && this.pasaCol(u) && this.pasaFiltro(u)).length;
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

      // Las categorías van a la izquierda, siempre a la vista: es por donde se
      // entra al depósito. Lo demás —medida, estructura, frente— ya son
      // columnas de la tabla, así que no se repite arriba.
      const cont = document.getElementById('un-lista');
      cont.innerHTML = `<div class="un-cols ${this.verCats ? '' : 'sin-i'}">
        ${this.htmlLateral()}
        <div id="un-tabla"></div>
      </div>`;
      this.pintarTabla(document.getElementById('un-tabla'), us);
      this.engancharLateral();
    },

    // ---- El panel de categorías --------------------------------------------
    // Siempre abierto: se ve el árbol entero —ambiente y adentro los tipos de
    // mueble— con la cuenta de cada uno. Se puede esconder para ganar ancho,
    // y ahí queda una cinta que sigue diciendo qué está marcado.
    verCats: (() => { try { return localStorage.getItem(VER_KEY + '_i') !== '0'; } catch { return true; } })(),
    _ambCerrados: (() => {
      try { return new Set(JSON.parse(localStorage.getItem(VER_KEY + '_a')) || []); }
      catch { return new Set(); }
    })(),
    // Cuántas unidades hay en cada categoría, con todo lo demás ya filtrado.
    cuentaCats() {
      const m = new Map();
      global.DB.unidadesTodas().forEach(u => {
        if (!this.pasaProps(u) || !this.pasaCol(u) || !this.pasaFiltro(u)) return;
        const c = this.catDe(u); if (!c) return;
        m.set(c.id, (m.get(c.id) || 0) + 1);
      });
      return m;
    },
    // El árbol: los ambientes de arriba y adentro los tipos de mueble, que es
    // como está armado el catálogo.
    arbolCats() {
      const cn = this.cuentaCats();
      const arbol = this.arbol || [];
      const hijos = a => arbol.filter(c => c.padre_id === a.id)
        .map(c => ({ ...c, n: cn.get(c.id) || 0 }))
        .sort((x, y) => x.nombre.localeCompare(y.nombre));
      const ambientes = arbol.filter(c => !c.padre_id)
        .map(a => { const hs = hijos(a); return { ...a, hijos: hs, n: hs.reduce((s, h) => s + h.n, 0) }; })
        .sort((x, y) => x.nombre.localeCompare(y.nombre));
      // Las categorías sin ambiente no se pierden: van sueltas al final.
      const conPadre = new Set(ambientes.flatMap(a => a.hijos.map(h => h.id)));
      const sueltas = arbol.filter(c => c.padre_id && !conPadre.has(c.id))
        .map(c => ({ ...c, n: cn.get(c.id) || 0 }));
      return { ambientes, sueltas, total: [...cn.values()].reduce((a, b) => a + b, 0) };
    },
    // Qué dice la cinta cuando el panel está escondido.
    rotuloCats() {
      if (!this.cats.length) return 'Todas las categorías';
      const nom = id => (this.arbol.find(c => c.id === id) || {}).nombre || '';
      const uno = this.cats[0];
      const c = this.arbol.find(x => x.id === uno);
      const padre = c && c.padre_id ? nom(c.padre_id) : '';
      return this.cats.length === 1
        ? [padre, nom(uno)].filter(Boolean).join(' / ')
        : `${this.cats.length} categorías`;
    },
    htmlLateral() {
      const ic = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13"
        height="11" rx="2"/><path d="M6.5 2.5v11" /></svg>`;
      if (!this.verCats) {
        return `<aside class="un-lat cerrada">
          <button class="un-lat-b" data-vercats title="Mostrar las categorías">${ic}</button>
          <span class="un-lat-r">${UI.esc(this.rotuloCats())}</span>
        </aside>`;
      }
      const { ambientes, sueltas, total } = this.arbolCats();
      const fila = c => `<button class="un-t-h ${this.cats.includes(c.id) ? 'on' : ''}"
        data-cat="${c.id}"><span class="un-t-n">${UI.esc(c.nombre)}</span>
        <span class="un-t-c tnum">${c.n}</span></button>`;
      return `<aside class="un-lat">
        <div class="un-lat-h"><span>Categoría</span>
          <button class="un-lat-b" data-vercats title="Ocultar las categorías">${ic}</button></div>
        <button class="un-t-todos ${this.cats.length ? '' : 'on'}" data-cat="0">Todos
          <span class="un-t-c tnum">${total}</span></button>
        ${ambientes.map(a => {
          const on = !this._ambCerrados.has(a.id);
          return `<div class="un-t-a">
            <button class="un-t-t" data-amb="${a.id}" aria-expanded="${on}">
              <span class="un-t-fl">${on ? '▾' : '▸'}</span>
              <span class="un-t-n">${UI.esc(a.nombre)}</span>
              <span class="un-t-c tnum">${a.n}</span></button>
            ${on ? `<div class="un-t-hs">${a.hijos.map(fila).join('')}</div>` : ''}
          </div>`;
        }).join('')}
        ${sueltas.map(fila).join('')}
      </aside>`;
    },
    engancharLateral() {
      const cont = document.getElementById('un-lista'); if (!cont) return;
      cont.querySelectorAll('[data-vercats]').forEach(b => b.onclick = () => {
        this.verCats = !this.verCats;
        try { localStorage.setItem(VER_KEY + '_i', this.verCats ? '1' : '0'); } catch {}
        this.pintar();
      });
      cont.querySelectorAll('[data-amb]').forEach(b => b.onclick = () => {
        const id = Number(b.dataset.amb);
        if (this._ambCerrados.has(id)) this._ambCerrados.delete(id); else this._ambCerrados.add(id);
        try { localStorage.setItem(VER_KEY + '_a', JSON.stringify([...this._ambCerrados])); } catch {}
        this.pintar();
      });
      cont.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
        const id = Number(b.dataset.cat);
        if (!id) this.cats = [];
        else this.cats = this.cats.includes(id)
          ? this.cats.filter(x => x !== id) : [...this.cats, id];
        this.pintar();
      });
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
        return `<section class="un-sec" data-seccat="${g.id}">
          <button class="un-cat" data-plegarcat="${g.id}" aria-expanded="${on}">
            <span class="un-cat-fl">${on ? '▾' : '▸'}</span>
            <h2>${UI.esc(g.nombre)}</h2>
            <span class="un-cat-n">${g.items.length} ${g.items.length === 1 ? 'unidad' : 'unidades'}</span>
            ${on ? '' : `<span class="un-cat-r">${UI.esc(this.resumen(g.items))}</span>`}
          </button>
          ${on ? `<div class="card un-tabla">
            <table>
              <thead><tr>
                ${this.cols(claves).map(c => `<th class="${c.chica ? 'th-f' : ''}">${
                  c.filtra === false ? UI.esc(c.label) : this.thFiltro(c)}</th>`).join('')}
                <th></th>
              </tr></thead>
              <tbody>${g.items.map(u => this.renglon(u, ed, claves)).join('')}</tbody>
            </table>
          </div>` : ''}
        </section>`;
      }).join('')}
        ${Object.keys(this.fcol).length ? `<div class="un-fcol">
          <span>Filtrando por</span>
          ${Object.keys(this.fcol).map(k => {
            const col = this.cols(this.clavesProp()).find(x => x.k === k) || { label: k };
            return `<span class="un-fchip">${UI.esc(col.label)}
              <b>${this.fcol[k].length}</b>
              <button data-quita="${UI.esc(k)}" title="Sacar este filtro">✕</button></span>`;
          }).join('')}
          <button class="lnk" data-quita="*">limpiar todo</button>
        </div>` : ''}
        <div class="hint" style="margin-top:9px">Acá se consulta qué hay y con qué número de
          serie. <b>Reservar se reserva desde la venta</b>, atada a su orden. La que es
          <b>a medida</b> lleva su foto para que el vendedor sepa qué está vendiendo.</div>`;

      cont.querySelectorAll('[data-col]').forEach(b => b.onclick = () => {
        const sec = b.closest('.un-sec');
        const g = grupos.find(x => String(x.id) === String(sec.dataset.seccat));
        this.abrirCol(b, b.dataset.col, this.clavesCat(g ? g.id : 0));
      });
      cont.querySelectorAll('[data-plegarcat]').forEach(b => b.onclick = () => {
        this.plegar(Number(b.dataset.plegarcat)); this.pintar();
      });
      cont.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => this.verUnidad(b.dataset.ver));
      cont.querySelectorAll('[data-pedir]').forEach(b => b.onclick = () => this.pedir(Number(b.dataset.pedir)));
      cont.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => this.modalFoto(Number(b.dataset.foto)));
      cont.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => this.modalNota(Number(b.dataset.nota)));
      cont.querySelectorAll('[data-quita]').forEach(b => b.onclick = () => {
        if (b.dataset.quita === '*') this.fcol = {}; else delete this.fcol[b.dataset.quita];
        this.pintar();
      });
    },

    // Las columnas, en un solo lugar: de acá salen los títulos, los filtros de
    // cada título y el orden en que se arma cada renglón.
    cols(claves) {
      return [
        { k: 'estado', label: 'Estado' },
        { k: 'serie', label: 'N°' },
        { k: 'foto', label: 'Foto', filtra: false, chica: true },
        { k: 'modelo', label: 'Modelo' },
        ...(claves || []).map(k => ({ k, label: this.tituloProp(k) })),
        { k: 'ubicacion', label: 'Ubicación' },
        { k: 'nota', label: 'Nota', chica: true },
      ];
    },
    // El título es un botón: se abre y se marca lo que se busca en esa columna.
    thFiltro(c) {
      const n = (this.fcol[c.k] || []).length;
      return `<button class="th-b ${n ? 'on' : ''}" data-col="${UI.esc(c.k)}"
        aria-expanded="false" title="Filtrar por ${UI.esc(c.label.toLowerCase())}">
        <span>${UI.esc(c.label)}</span>
        ${n ? `<span class="th-n">${n}</span>` : '<span class="th-fl">▾</span>'}
      </button>`;
    },
    // Los valores que hay en esa columna, con su cuenta — mirando todo lo demás
    // ya filtrado, pero no la columna misma: si no, siempre quedaría una sola.
    opcionesCol(c, us) {
      const m = new Map(); const nom = new Map();
      us.forEach(u => {
        if (!this.pasaCol(u, c.k)) return;
        const val = this.valorCol(u, c); if (!val) return;
        const nk = this.normT(val);
        m.set(nk, (m.get(nk) || 0) + 1);
        if (!nom.has(nk)) nom.set(nk, val);
      });
      const ops = [...m.entries()].map(([k, n]) => ({ k, n, label: nom.get(k) }));
      // Las medidas se leen en orden; el resto, lo que más hay primero.
      return c.k === 'medida' || c.k === 'serie'
        ? ops.sort((a, b) => String(a.label).localeCompare(String(b.label), 'es', { numeric: true }))
        : ops.sort((a, b) => b.n - a.n || String(a.label).localeCompare(String(b.label)));
    },

    // El desplegable del título. Va pegado al body y no adentro de la tabla:
    // la tabla se corre de costado y lo recortaría.
    abrirCol(btn, k, claves) {
      this.cerrarCol();
      const c = this.cols(claves).find(x => x.k === k); if (!c) return;
      // Todo lo que se ve salvo el filtro de esta misma columna.
      const us = global.DB.unidadesTodas().filter(u => this.pasaCat(u) && this.pasaProps(u)
        && this.pasaFiltro(u) && this.pasaCol(u, k));
      const ops = this.opcionesCol(c, us);
      const sel = this.fcol[k] || [];
      const r = btn.getBoundingClientRect();
      const ancho = Math.max(210, Math.min(300, r.width + 120));
      const izq = Math.min(r.left, window.innerWidth - ancho - 12);
      document.body.insertAdjacentHTML('beforeend', `
        <div class="th-back" id="th-back"></div>
        <div class="th-pop" id="th-pop" style="left:${Math.max(8, izq)}px;top:${r.bottom + 4}px;
          width:${ancho}px">
          <div class="th-pop-h"><span>${UI.esc(c.label)}</span>
            ${sel.length ? '<button class="lnk" id="th-limpia">limpiar</button>' : ''}</div>
          ${ops.length > 8 ? '<input class="th-q" id="th-q" placeholder="Buscar…">' : ''}
          <div class="th-pop-b" id="th-ops">${ops.map(o => `
            <label class="un-o ${sel.includes(o.k) ? 'on' : ''}" data-v="${UI.esc(o.k)}">
              <input type="checkbox" data-val="${UI.esc(o.k)}" ${sel.includes(o.k) ? 'checked' : ''}>
              <span class="un-o-n">${UI.esc(o.label)}</span>
              <span class="un-o-c tnum">${o.n}</span></label>`).join('')
            || '<div class="muted" style="font-size:12px;padding:4px 0">Nada para filtrar acá.</div>'}
          </div>
        </div>`);
      btn.setAttribute('aria-expanded', 'true');
      const cerrar = () => { this.cerrarCol(); };
      document.getElementById('th-back').onclick = cerrar;
      const q = document.getElementById('th-q');
      if (q) {
        q.focus();
        q.oninput = () => {
          const t = this.normT(q.value);
          document.querySelectorAll('#th-ops .un-o').forEach(l => {
            l.style.display = !t || this.normT(l.textContent).includes(t) ? '' : 'none';
          });
        };
      }
      document.querySelectorAll('#th-pop [data-val]').forEach(i => i.onchange = () => {
        this.marcarCol(k, i.dataset.val);
        this.cerrarCol(); this.pintar();
      });
      const l = document.getElementById('th-limpia');
      if (l) l.onclick = () => { delete this.fcol[k]; this.cerrarCol(); this.pintar(); };
    },
    cerrarCol() {
      ['th-pop', 'th-back'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
      document.querySelectorAll('[data-col]').forEach(b => b.setAttribute('aria-expanded', 'false'));
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
        cerrar(); this.refrescar(); this.modalFoto(id);
      };
      const q = document.getElementById('un-quitar');
      if (q) q.onclick = () => { global.DB.guardarUnidad({ id, foto: '' }); cerrar(); this.refrescar(); };
      const sub = document.getElementById('un-subir');
      if (sub) {
        const file = document.getElementById('un-file');
        sub.onclick = () => file.click();
        file.onchange = () => {
          const f = file.files[0]; if (!f) return;
          UI.achicar(f, 900).then(({ url, achicada, antes, despues }) => {
            global.DB.guardarUnidad({ id, foto: url });
            if (achicada) UI.aviso(`Foto guardada · ${UI.peso(antes)} → ${UI.peso(despues)}`, 'ok');
            cerrar(); this.refrescar();
          }).catch(() => UI.aviso('No pude leer esa imagen', 'warn'));
        };
      }
    },

    // ---- La ficha de una unidad -------------------------------------------
    // No es un pop-up: es una pantalla. Acá vive todo lo que se sabe de ESA
    // pieza —de dónde vino, hace cuánto está, con qué etiqueta— y es donde
    // vamos a ir colgando lo que falte. Se reserva desde la venta, no de acá.
    abierta: null,
    verUnidad(id) { this.abierta = Number(id); this.render(this._mount); },
    // Repinta lo que se esté mirando: la lista o la ficha.
    refrescar() { if (this.abierta) this.render(this._mount); else this.pintar(); },
    volver() { this.abierta = null; this.render(this._mount); },

    // La variante de la unidad, que es de donde salen las propiedades.
    varDe(u) {
      return (global.DB.variantesTodas() || []).find(x => x.id === u.varianteId) || null;
    },
    prodDe(u) { return (this.prods || []).find(p => p.id === u.productoId) || null; },

    // El SKU es el de la variante; si no lo tiene, el del mueble.
    skuDe(u) {
      const v = this.varDe(u), p = this.prodDe(u);
      return (v && v.sku) || (p && p.sku) || '—';
    },

    htmlFicha(id) {
      const u = global.DB.unidad(id);
      if (!u) return UI.vacio('No se encontró esa unidad.');
      const v = this.varDe(u) || {}; const prod = this.prodDe(u) || {};
      const cat = this.catDe(u);
      const vista = global.DB.vistaUnidad(u);
      const e = global.DB.VISTAS_UNIDAD.find(x => x.k === vista) || {};
      const m = global.DB.marcaUnidad(u.marca);
      const pos = global.DB.posEnOrden(u);
      const ed = global.App && global.App.puede && global.App.puede('editarCatalogo');
      const verCostos = global.App && global.App.puede && global.App.puede('verCostos');
      const dias = global.DB.diasDesde(u.listo);
      const claves = this.clavesCat(cat ? cat.id : 0);
      const dato = (t, val) => `<div class="fi-r"><span>${t}</span><b>${
        val ? UI.esc(val) : '<i class="muted">—</i>'}</b></div>`;
      const card = (t, cuerpo, extra = '') => `<div class="card pad fk-c">
        <div class="fk-t">${t}${extra}</div>${cuerpo}</div>`;

      // Cuántas iguales quedan libres: es lo primero que pregunta el vendedor.
      const libres = global.DB.libresDeVariante(u.varianteId);
      const costo = this.costoDe(u);

      return `
        <div class="fk-bar">
          <button class="lnk" id="fk-volver">‹ Unidades</button>
          <span class="muted">${UI.esc(cat ? cat.nombre : 'Sin categoría')}</span>
        </div>
        <div class="row fk-h">
          <div>
            <div class="kick">Unidad</div>
            <h1 class="h-title">${UI.esc(u.serie === '—' ? 'Sin etiqueta todavía' : u.serie)}</h1>
            <div class="h-sub">${UI.esc(u.modelo)} · ${UI.esc([u.medida, u.color].filter(Boolean).join(' · '))}</div>
          </div>
          <div class="sp"></div>
          <span class="pill ${e.pill}">${UI.esc(e.label || '')}</span>
        </div>
        ${m ? `<div class="banner warn" style="margin-top:10px"><b>${UI.esc(m.label)}</b> —
          ${UI.esc(m.pie)}</div>` : ''}

        <div class="fk-kpis">
          <div class="un-k"><div class="un-k-t">Hace cuánto está</div>
            <div class="un-k-v ${dias != null && dias > 90 ? 'alerta' : ''}">${dias == null
              ? '—' : `${dias} <small>días</small>`}</div>
            <div class="un-k-p">${dias == null ? 'todavía no llegó'
              : dias > 90 ? 'hace rato que no sale' : `desde el ${UI.esc(u.listo)}`}</div></div>
          <div class="un-k"><div class="un-k-t">Iguales libres</div>
            <div class="un-k-v">${libres}</div>
            <div class="un-k-p">de esta misma variante</div></div>
          ${verCostos ? `<div class="un-k"><div class="un-k-t">Costo final</div>
            <div class="un-k-v">${UI.pesos(costo)}</div>
            <div class="un-k-p">lo que vale parada acá</div></div>` : ''}
          ${verCostos && v.precio ? `<div class="un-k"><div class="un-k-t">Precio efectivo</div>
            <div class="un-k-v">${UI.pesos(v.precio)}</div>
            <div class="un-k-p">de lista de esta variante</div></div>` : ''}
        </div>

        <div class="fk-cols">
          <div>
            ${card('Foto de esta unidad', `
              <div class="fk-foto ${u.foto ? 'hay' : ''}">${u.foto
                ? `<img src="${UI.esc(u.foto)}" alt="">`
                : `<span class="muted">${u.tipo === 'medida'
                  ? 'Es a medida y todavía no tiene foto' : 'Sin foto todavía'}</span>`}</div>
              ${ed ? '<button class="btn" id="fk-foto" style="margin-top:10px">Cambiar la foto</button>' : ''}
              ${u.tipo === 'medida' && !u.foto ? `<div class="hint" style="margin-top:8px">Es
                <b>a medida</b>: no se parece a la del catálogo. Cargale una para que el vendedor
                sepa qué está vendiendo.</div>` : ''}`)}
            ${card('Etiqueta', `
              <div class="fi">
                ${dato('SKU de la variante', this.skuDe(u))}
                ${dato('Número de serie', u.serie === '—' ? '' : u.serie)}
              </div>
              ${u.serie === '—' ? `<div class="hint" style="margin-top:9px">Todavía no tiene
                etiqueta: se le pone cuando entra al depósito.</div>`
                : `<div class="fk-bar-cod">${UI.barras(u.serie, 46, 1.7)}
                  <div class="fk-cod-t tnum">${UI.esc(u.serie)}</div></div>
                <div class="hint" style="margin-top:8px">Se escanea cuando entra y cuando sale.
                  Es el mismo número que va pegado en el mueble.</div>`}`)}
          </div>

          <div>
            ${card('Datos generales', `<div class="fi">
              ${dato('Categoría', cat ? cat.nombre : '')}
              ${dato('Modelo', u.modelo)}
              ${dato('Tipo', u.tipo === 'medida' ? 'A medida' : 'Estándar')}
              ${dato('Ubicación', global.DB.ubicacionLabel(u.ubicacion))}
              ${dato('Estado', e.label)}
            </div>`)}

            ${card('Propiedades principales', `<div class="fi">
              ${claves.map(k => dato(this.tituloProp(k), this.valorProp(u, k)
                || (k === 'medida' ? u.medida : ''))).join('')}
            </div>`)}

            ${card('Propiedades secundarias', `<div class="fi">
              ${dato('Alto', v.alto || prod.alto ? `${v.alto || prod.alto} m` : '')}
              ${dato('Profundidad', v.prof || prod.prof ? `${v.prof || prod.prof} m` : '')}
              ${dato('Peso', v.peso ? `${v.peso} kg` : '')}
              ${dato('Materiales', prod.materiales)}
            </div>`)}

            ${card('De dónde vino', `<div class="fi">
              ${dato('Proveedor', u.proveedor)}
              ${dato('Cuándo llega', u.llega)}
              ${dato('La tengo desde', u.listo)}
              ${dato('Días en el depósito', dias == null ? '' : String(dias))}
            </div>
            ${u.estado === 'pedir' ? `<div class="hint" style="margin-top:9px">Está
              <b>a pedir</b>: se vendió y todavía no se le pidió a nadie.</div>
              ${ed ? '<button class="btn primary" id="fk-pedir" style="margin-top:10px">Pedir a fábrica</button>' : ''}`
              : ''}`)}

            ${card('Venta', u.orden ? `<div class="fi">
              ${dato('Orden', `${u.orden}${pos ? ` · ${pos.n} de ${pos.de}` : ''}`)}
              ${dato('Vendida el', u.fechaVenta)}
              ${dato('Entregada el', u.fechaEntrega)}
            </div>
            <div class="hint" style="margin-top:9px">Está atada a esa venta. Para liberarla hay
              que hacerlo desde la orden.</div>`
            : `<div class="hint">No tiene dueño. <b>Se reserva desde la venta</b>, no desde acá:
              así toda reserva queda respaldada por una orden.</div>`)}

            ${card('Nota de fábrica', `
              <textarea id="fk-nota" rows="3"
                placeholder="Vino con el frente cambiado, falta la manija…">${UI.esc(u.nota || '')}</textarea>
              <div class="row" style="margin-top:9px"><div class="sp"></div>
                <button class="btn" id="fk-guardar">Guardar la nota</button></div>`)}
          </div>
        </div>`;
    },

    engancharFicha(id) {
      const b = document.getElementById('fk-volver'); if (b) b.onclick = () => this.volver();
      const f = document.getElementById('fk-foto'); if (f) f.onclick = () => this.modalFoto(id);
      const p = document.getElementById('fk-pedir'); if (p) p.onclick = () => this.pedir(id);
      const g = document.getElementById('fk-guardar');
      if (g) g.onclick = () => {
        global.DB.guardarUnidad({ id, nota: document.getElementById('fk-nota').value.trim() });
        UI.aviso('Nota guardada', 'ok');
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
        cerrar(); this.refrescar();
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

        /* La categoría vive a la izquierda, siempre a la vista: es por donde se
           entra al depósito. Se esconde para ganar ancho y queda una cinta. */
        .un-cols{display:grid;grid-template-columns:196px minmax(0,1fr);gap:14px;
          align-items:start;max-width:100%}
        .un-cols.sin-i{grid-template-columns:30px minmax(0,1fr)}
        .un-cols>#un-tabla{min-width:0}
        @media(max-width:1080px){.un-cols,.un-cols.sin-i{grid-template-columns:1fr}}
        .un-lat{position:sticky;top:104px;display:flex;flex-direction:column;
          border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:9px 4px 9px 10px}
        .un-lat.cerrada{align-items:center;padding:9px 3px;gap:12px}
        .un-lat-h{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .un-lat-h span{flex:1}
        .un-lat-b{border:1px solid var(--line);background:var(--panel);border-radius:7px;width:24px;
          height:22px;display:grid;place-items:center;cursor:pointer;color:var(--muted);padding:0;
          margin-right:6px}
        .un-lat-b svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.3}
        .un-lat-b:hover{border-color:var(--brand);color:var(--brand)}
        .un-lat.cerrada .un-lat-b{margin:0}
        .un-lat-r{writing-mode:vertical-rl;font-size:11.5px;color:var(--muted);white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;max-height:260px}
        /* El árbol: ambiente arriba y adentro los tipos de mueble. */
        .un-t-todos,.un-t-t,.un-t-h{display:flex;align-items:center;gap:6px;width:100%;border:0;
          background:none;padding:4px 6px;cursor:pointer;font:inherit;text-align:left;
          border-radius:7px;color:var(--ink-soft);font-size:12.5px}
        .un-t-todos{font-weight:700;color:var(--navy);margin-bottom:2px}
        .un-t-todos span,.un-t-t .un-t-c,.un-t-h .un-t-c{margin-left:auto}
        .un-t-todos.on{background:var(--brand-soft);color:var(--brand-ink)}
        .un-t-t{font-weight:650;color:var(--navy);margin-top:3px}
        .un-t-t:hover,.un-t-h:hover{background:var(--panel-2)}
        .un-t-fl{font-size:9px;color:var(--muted);width:9px;flex:none}
        .un-t-n{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .un-t-c{font-size:11px;color:var(--muted);flex:none;font-weight:600}
        /* Los hijos cuelgan de una línea, como un árbol de verdad. */
        .un-t-hs{margin-left:11px;padding-left:8px;border-left:1px solid var(--line)}
        .un-t-h.on{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
        .un-t-h.on .un-t-c{color:var(--brand-ink)}
        /* El desplegable de orden no se estira: va al lado del buscador. */
        .un-ord{flex:none;width:auto;min-width:150px;padding:8px 10px;font-size:12.5px;font-weight:650;
          color:var(--ink-soft);border:1px solid var(--line);border-radius:10px;background:var(--panel)}
        /* Las opciones del árbol de categorías. */
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
        /* Cada título es un filtro: se abre y se marca lo que se busca. */
        .th-b{display:flex;align-items:center;gap:4px;border:0;background:none;padding:0;
          font:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;cursor:pointer;white-space:nowrap}
        .th-b:hover{color:var(--brand)}
        .th-b .th-fl{font-size:8px;opacity:.5}
        .th-b:hover .th-fl{opacity:1}
        .th-b.on{color:var(--brand)}
        .th-n{font-size:9px;background:var(--brand);color:#fff;border-radius:999px;padding:0 4px;
          line-height:13px}
        .th-back{position:fixed;inset:0;z-index:60}
        .th-pop{position:fixed;z-index:61;background:var(--panel);border:1px solid var(--line);
          border-radius:11px;padding:8px 11px;box-shadow:0 12px 30px rgba(12,22,44,.18)}
        .th-pop-h{display:flex;align-items:baseline;gap:8px;font-size:10.5px;font-weight:700;
          text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:4px}
        .th-pop-h span{flex:1}
        .th-pop .lnk{border:0;background:none;padding:0;font:inherit;font-size:11px;font-weight:600;
          color:var(--brand);cursor:pointer;text-transform:none;letter-spacing:0}
        .th-pop-b{max-height:280px;overflow:auto}
        .th-q{width:100%;padding:5px 8px;font-size:12px;margin-bottom:5px;border:1px solid var(--line);
          border-radius:8px;background:var(--panel);color:var(--ink)}
        /* Lo que se está filtrando, a la vista y fácil de sacar. */
        .un-fcol{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px;
          font-size:11.5px;color:var(--muted)}
        .un-fchip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);
          border-radius:999px;padding:2px 5px 2px 9px;background:var(--panel);color:var(--ink-soft);
          font-size:11.5px}
        .un-fchip b{color:var(--brand)}
        .un-fchip button{border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px;
          padding:0 3px;line-height:1}
        .un-fchip button:hover{color:var(--crit)}
        .un-fcol .lnk{border:0;background:none;padding:0;font:inherit;font-size:11.5px;
          font-weight:600;color:var(--brand);cursor:pointer}
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
        .un-back{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .un-prev{margin-top:12px;height:200px;border:1px solid var(--line);border-radius:10px;
          background:var(--panel-2);display:grid;place-items:center;overflow:hidden}
        .un-prev img{width:100%;height:100%;object-fit:contain}
        .pill.viol{background:#f3e8ff;color:#6b21a8}

        /* La ficha de una unidad: es una pantalla, no un pop-up. Acá vamos a
           ir colgando lo que falte de esa pieza. */
        .fk-bar{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:12px}
        .fk-bar .lnk{border:0;background:none;padding:0;font:inherit;font-size:12.5px;
          font-weight:650;color:var(--brand);cursor:pointer}
        .fk-bar .lnk:hover{text-decoration:underline}
        .fk-h{align-items:flex-start;margin-bottom:14px}
        .fk-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;
          margin-bottom:16px}
        @media(max-width:900px){.fk-kpis{grid-template-columns:1fr 1fr}}
        .fk-kpis .un-k-v small{font-size:12px;font-weight:650;color:var(--muted)}
        .fk-cols{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:14px;
          align-items:start}
        @media(max-width:1000px){.fk-cols{grid-template-columns:1fr}}
        .fk-c{margin-bottom:12px}
        .fk-t{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);margin-bottom:8px}
        .fk-foto{height:220px;border:1px solid var(--line);border-radius:10px;
          background:var(--panel-2);display:grid;place-items:center;overflow:hidden;
          text-align:center;padding:12px}
        .fk-foto.hay{padding:0}
        .fk-foto img{width:100%;height:100%;object-fit:contain}
        .fk-bar-cod{margin-top:11px;border:1px solid var(--line);border-radius:10px;padding:10px;
          background:#fff;display:grid;place-items:center;gap:4px}
        .fk-bar-cod .cbar{display:block;max-width:100%}
        .fk-bar-cod .cbar rect{fill:#000}
        .fk-cod-t{font-size:12px;letter-spacing:.14em;color:#111}
        .fk-c textarea{width:100%;font:inherit;font-size:12.5px;padding:8px 10px;
          border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--ink);
          resize:vertical}
        .fk-c .fi-r span{flex:0 0 150px}
        .fk-c .fi-r b i{font-style:normal}
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
