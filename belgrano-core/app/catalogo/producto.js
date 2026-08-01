// =====================================================================
//  Belgrano Soft · El mueble
//  Pantalla donde se CREA y se EDITA un mueble. Todo va en una sola
//  columna, un bloque abajo del otro: nombre, fotos, categorías,
//  propiedades, variantes, proveedores, abastecimiento y contabilidad.
//  Es interna: el vendedor no entra acá, y los costos los ve sólo
//  Dirección (Producción ve el resto, pero de lectura).
// =====================================================================
(function (global) {
  const Producto = {
    p: null,            // el mueble que se está editando
    vars: [],           // sus variantes
    _mount: 'view',
    _abierta: null,     // variante abierta en el panel lateral
    _fVar: '',          // filtro del listado de variantes

    // ---- Permisos ------------------------------------------------------
    verCostos() { return !global.App || !global.App.verCostos || global.App.verCostos(); },
    puedeEditar() { return !global.App || !global.App.editaCatalogo || global.App.editaCatalogo(); },

    async render(mount = 'view', id) {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = UI.spinner('Abriendo el mueble…');
      try {
        this.p = await global.DB.producto(id);
        this.vars = await global.DB.variantes(Number(id));
        this._arbol = await global.DB.arbolCategorias();
        if (!this.p.categorias) this.p.categorias = this.p.categoria_id ? [this.p.categoria_id] : [];
      } catch (e) {
        v.innerHTML = `<div class="banner warn">No se pudo abrir: ${UI.esc(e.message || e)}</div>`;
        return;
      }
      if (!this.p) { v.innerHTML = UI.vacio('Ese mueble no está en el catálogo.'); return; }
      this.pintar();
    },

    // ---- Cálculo -------------------------------------------------------
    // Las propiedades que usa este mueble, con los valores que tiene activos.
    props() {
      const dicc = global.DB.propiedades();
      return (this.p.propiedades || []).map(k => {
        const d = dicc.find(x => x.k === k) || { k, nombre: k.toUpperCase(), valores: [] };
        // Los valores en uso salen de las variantes que ya existen.
        const usados = [...new Set(this.vars.map(v => v[k]).filter(Boolean))];
        return { ...d, usados };
      });
    },
    // 3 estructuras × 3 frentes × 3 medidas = 27. Sale solo.
    combinatorio() {
      const ps = this.props().filter(p => p.usados.length);
      return ps.length ? ps.reduce((a, p) => a * p.usados.length, 1) : 0;
    },
    markupDe(v) { return global.DB.markupDe(v.costo, v.precio); },
    objetivoDe(v) { return Number(v.markupObj) || Number(this.p.markupObj) || global.DB.MARKUP_OBJETIVO; },
    activas() { return this.vars.filter(v => v.activa !== false); },
    // Estado del mueble entero: el peor de sus variantes manda.
    estado() {
      const ms = this.activas().map(v => this.markupDe(v)).filter(x => x > 0);
      if (!ms.length) return { k: 'sin', label: 'Sin costo', pill: 'soft' };
      return global.DB.bandaDe(Math.min(...ms));
    },

    // ---- Pintado -------------------------------------------------------
    // Las solapas. La primera es la que se abre siempre: el mueble, sus
    // atributos, sus variantes y el precio. Todo lo demás — lo que no hace
    // falta para saber qué es y cuánto sale — vive en las otras.
    SOLAPAS: [
      { k: 'producto', label: 'Producto' },
      { k: 'costos', label: 'Costos y márgenes', costos: true },
      { k: 'contabilidad', label: 'Contabilidad' },
    ],
    _tab: 'producto',
    solapas() { return this.SOLAPAS.filter(t => !t.costos || this.verCostos()); },
    // Los números de costo sólo se ven en su solapa, y sólo si el rol puede.
    muestraCostos() { return this.verCostos() && this._tab === 'costos'; },

    _tab: 'producto',
    // Qué módulos están abiertos. Adicionales arranca cerrado: es lo que menos
    // se toca.
    _abre: { mueble: true, catprop: true, variantes: true, adicionales: false },

    solapas() { return this.SOLAPAS.filter(t => !t.costos || this.verCostos()); },
    muestraCostos() { return this.verCostos() && this._tab === 'costos'; },

    // Un módulo desplegable, igual que las etapas de la cotización: número,
    // título, un resumen de lo que hay adentro y la flecha.
    modulo(k, n, titulo, resumen, cuerpo, ok) {
      const on = this._abre[k] !== false;
      return `<section class="pd-m ${on ? 'on' : ''} ${ok ? 'ok' : ''}">
        <button class="pd-mh" data-mod="${k}" aria-expanded="${on}">
          <span class="pd-mn">${n}</span>
          <span class="pd-mt">${UI.esc(titulo)}</span>
          <span class="pd-mr">${on ? '' : UI.esc(resumen || '')}</span>
          <span class="pd-mg">${on ? '▴' : '▾'}</span>
        </button>
        ${on ? `<div class="pd-mb">${cuerpo}</div>` : ''}
      </section>`;
    },

    pintar() {
      const v = document.getElementById(this._mount); if (!v) return;
      const p = this.p, ed = this.puedeEditar();
      if (!this.solapas().some(t => t.k === this._tab)) this._tab = 'producto';
      v.innerHTML = `
        <div class="pd-wrap">
          <div class="pd-bar">
            <a href="#" id="pd-volver" class="kick">‹ Catálogo</a>
            <div class="sp"></div>
            ${ed ? '' : '<span class="pill soft">Sólo lectura</span>'}
            <span class="pill ${p.publicado ? 'ok' : 'warn'}" id="pd-pub-pill">${
              p.publicado ? 'Visible para los vendedores' : 'Oculto — no se puede vender'}</span>
          </div>
          <div class="pd-tabs">${this.solapas().map(t =>
            `<button class="pd-tab ${this._tab === t.k ? 'on' : ''}" data-tab="${t.k}"
              aria-current="${this._tab === t.k}">${UI.esc(t.label)}</button>`).join('')}</div>
          ${this['tab' + this._tab.charAt(0).toUpperCase() + this._tab.slice(1)]()}
          <div id="pd-panel"></div>
        </div>
        ${this.estilos()}`;

      document.getElementById('pd-volver').onclick = e => { e.preventDefault(); global.Catalogo.render(this._mount); };
      document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
        this._tab = b.dataset.tab; this.pintar();
      });
      document.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => {
        const k = b.dataset.mod; this._abre[k] = this._abre[k] === false; this.pintar();
      });
      this.enganchar();
    },

    // Los cuatro módulos, en orden: qué es · dónde entra y de qué depende ·
    // qué variantes salen de eso · el resto.
    tabProducto() {
      const cs = this.cats(), ps = this.props().filter(x => x.usados.length);
      const r = this.p.rutas || {};
      return this.modulo('mueble', 1, 'El mueble',
          `${this.p.nombre} · ${(this.p.fotos || []).length} ${(this.p.fotos || []).length === 1 ? 'foto' : 'fotos'}`,
          this.bloqueNombre() + this.bloqueFotos(), !!this.p.nombre)
        + this.modulo('catprop', 2, 'Categorías y propiedades',
          `${cs.map(c => c.nombre).join(' · ') || 'sin categoría'} — ${ps.length} ${ps.length === 1 ? 'propiedad' : 'propiedades'}`,
          this.bloqueCategorias(true) + '<div class="pd-sepl"></div>' + this.bloquePropiedades(true),
          cs.length > 0)
        + this.modulo('variantes', 3, 'Variantes',
          `${this.vars.length} ${this.vars.length === 1 ? 'variante' : 'variantes'} · ${this.activas().length} activas`,
          this.bloqueVariantes(true), this.vars.length > 0)
        + this.modulo('adicionales', 4, 'Adicionales',
          `${this.p.publicado ? 'Visible' : 'Oculto'} · ${global.DB.RUTAS.filter(x => r[x.k]).map(x => x.label).join(', ') || 'sin definir'}`,
          this.bloqueAdicionales(true), true);
    },
    tabCostos() {
      return this.bloqueVariantes() + this.bloqueSimulador() + this.bloqueProveedores();
    },
    tabContabilidad() { return this.bloqueContabilidad(); },

    // 1 · Nombre y descripción ---------------------------------------------
    // La descripción es para lo que NO es una variante: el alto y la
    // profundidad cuando son siempre los mismos, cómo se arma, qué herrajes
    // lleva. Todo eso no puede ser una propiedad porque no multiplica nada.
    bloqueNombre() {
      const p = this.p, ed = this.puedeEditar();
      return `<div>
        <label class="lbl-t" for="pd-nombre">Nombre</label>
        <input id="pd-nombre" class="pd-nom" value="${UI.esc(p.nombre)}"
          placeholder="Nombre del mueble" ${ed ? '' : 'readonly'}>

        <label class="lbl-t" for="pd-desc" style="margin-top:11px">Descripción</label>
        <textarea id="pd-desc" class="pd-des" rows="2" ${ed ? '' : 'readonly'}
          placeholder="Las medidas y los detalles que no cambian entre variantes. Ej: alto 0,55 · profundidad 0,40 · la base se retira en los cuatro lados · corte de tapa a 45°."
          >${UI.esc(p.desc || '')}</textarea>
        <div class="hint">Lo que es igual en todas las variantes. Lo que cambia va como propiedad.</div>

        <div class="pd-nsub">
          <span class="muted">Código</span> <b class="tnum">${UI.esc(p.sku || '—')}</b>
        </div>
      </div>`;
    },

    // 2 · Fotos ------------------------------------------------------------
    bloqueFotos() {
      const fotos = this.p.fotos || [];
      return `<div class="pd-sepl"></div><div>
        <div class="pd-h">Fotos y videos</div>
        ${this.puedeEditar() ? `<div class="dropz" id="pd-drop">
          <div class="dz-mas">＋</div>
          <div class="dz-t">Arrastrá y soltá, o subí fotos y video del mueble</div>
          <input type="file" id="pd-file" accept="image/*,video/*" multiple hidden>
        </div>` : ''}
        <div class="fotos">${fotos.length ? fotos.map((f, i) => `
          <div class="fo ${i === 0 ? 'ppal' : ''}">
            <img src="${UI.esc(f.url)}" alt="${UI.esc(f.nombre || '')}">
            ${i === 0 ? '<span class="fo-ppal">★ Principal</span>' : ''}
            ${this.puedeEditar() ? `<div class="fo-acc">
              ${i ? `<button class="fo-b" data-ppal="${i}" title="Marcar como principal">★</button>` : ''}
              <button class="fo-b" data-quitarf="${i}" title="Quitar">🗑</button>
            </div>` : ''}
          </div>`).join('') : '<div class="hint">Todavía no hay fotos cargadas.</div>'}
        </div>
        <div class="hint" style="margin-top:8px">Los archivos se guardan en el Storage del sistema, no en la
          cotización: acá queda sólo el enlace. Mínimo recomendado 1280px.</div>
      </div>`;
    },

    // 3 · Categorías -------------------------------------------------------
    // Un mueble puede estar en más de una: una mesa ratona que también entra
    // en Living y en Escritorios se carga una sola vez y aparece en las dos.
    cats() {
      // Se guardan en `categorias`; si el mueble es viejo y sólo tiene la de
      // siempre, esa es la lista.
      const ids = this.p.categorias || (this.p.categoria_id ? [this.p.categoria_id] : []);
      return ids.map(id => (this._arbol || []).find(c => c.id === id)
        || (this.p.categoria && this.p.categoria.id === id ? this.p.categoria : null)).filter(Boolean);
    },
    // El ambiente del que cuelga cada una: no hace falta cargarlo a mano.
    heredadas() {
      const out = new Map();
      this.cats().forEach(c => {
        let x = c;
        while (x && x.padre_id) {
          x = (this._arbol || []).find(y => y.id === x.padre_id);
          if (x) out.set(x.id, x);
        }
      });
      this.cats().forEach(c => out.delete(c.id));
      return [...out.values()];
    },

    bloqueCategorias(dentro) {
      const cs = this.cats(), her = this.heredadas();
      return `<${dentro ? 'div' : 'section class="pd-b"'}>
        <div class="pd-h">Categorías</div>
        <div class="chips">
          ${cs.map(c => `<span class="chip">${UI.esc(c.nombre)}${this.puedeEditar()
            ? `<button class="chip-x" data-quitarcat="${c.id}" aria-label="Quitar">✕</button>` : ''}</span>`).join('')
            || '<span class="hint">Sin categoría.</span>'}
          ${her.map(c => `<span class="chip her" title="Se hereda: ${UI.esc(c.nombre)} es el ambiente del que cuelga">${UI.esc(c.nombre)}</span>`).join('')}
          ${this.puedeEditar() ? '<button class="chip-add" id="pd-edcat">✎ editar</button>' : ''}
        </div>
        ${her.length ? `<div class="hint" style="margin-top:6px">
          <b>${UI.esc(her.map(c => c.nombre).join(' · '))}</b> ${her.length === 1 ? 'se hereda' : 'se heredan'} —
          con marcar la familia alcanza.</div>` : ''}
      </${dentro ? 'div' : 'section'}>`;
    },

    // 4 · Propiedades ------------------------------------------------------
    // Se ve la lista de las que usa este mueble, cada una con sus valores, y
    // se ENTRA a una para cargarle los que puede tener. Abajo de todo, agregar
    // otra propiedad.
    bloquePropiedades(dentro) {
      const ps = this.props(), n = this.combinatorio(), ed = this.puedeEditar();
      return `<${dentro ? 'div' : 'section class="pd-b"'}>
        <div class="pd-h">Propiedades</div>
        <div class="props">${ps.map(p => `
          <div class="prow">
            <div class="prow-i">
              <div class="prow-n">${UI.esc(p.nombre)}</div>
              <div class="chips">${p.usados.map(v =>
                `<span class="chip">${UI.esc(v)}</span>`).join('')
                || '<span class="hint">Sin valores todavía.</span>'}
                ${ed ? `<button class="chip-add" data-addv="${UI.esc(p.k)}">＋ Agregar</button>` : ''}</div>
            </div>
            <button class="prow-go" data-prop="${UI.esc(p.k)}"
              title="Editar ${UI.esc(p.nombre)}">›</button>
          </div>`).join('') || '<div class="hint">Este mueble todavía no tiene propiedades.</div>'}
        </div>
        ${ed ? `<div class="prow-add">
          <button class="lnk" id="pd-addprop">⊕ Agregar propiedad</button>
          <select id="pd-selprop" class="selprop" hidden></select>
        </div>` : ''}
        ${n ? `<div class="prop-pie"><div class="combo"><b class="tnum">${n}</b> combinaciones posibles
          ${this.vars.length !== n ? `<span class="muted">· ${this.vars.length} creadas</span>` : ''}</div></div>` : ''}
      </${dentro ? 'div' : 'section'}>`;
    },

    // 5 · Listado de variantes ---------------------------------------------
    bloqueVariantes(dentro) {
      const f = this._fVar.trim().toLowerCase();
      const lista = this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f));
      const cost = this.muestraCostos();
      return `<${dentro ? 'div' : 'section class="pd-b"'}>
        ${dentro ? '' : `<div class="pd-h">${cost ? 'Costo y precio por variante' : 'Variantes'}
          <span class="muted">(${this.vars.length})</span>
          ${cost ? `<span class="pill ${this.estado().pill}" style="float:right">${UI.esc(this.estado().label)}</span>` : ''}</div>`}
        <div class="vr-tools">
          <input id="pd-fvar" class="busca" placeholder="Filtrar por medida, estructura, frente…" value="${UI.esc(this._fVar)}">
          <div class="sp"></div>
          <span class="hint">${this.activas().length} activas · ${this.vars.length - this.activas().length} desactivadas</span>
        </div>
        <div class="vr-head ${cost ? '' : 'sincosto'}">
          <span>Imagen venta</span><span>Imagen producción</span><span>Variante</span><span>Stock</span>
          ${cost ? '<span style="text-align:right">Costo</span>' : ''}
          <span style="text-align:right">Precio</span>
          <span style="text-align:right">${cost ? 'Markup' : 'Peso'}</span>
          <span>Acciones</span>
        </div>
        <div id="pd-vars">${lista.map(v => this.filaVar(v, cost)).join('')
          || UI.vacio('Ninguna variante coincide con el filtro.')}</div>
      </${dentro ? 'div' : 'section'}>`;
    },

    nombreVar(v) {
      return (this.p.propiedades || []).map(k => v[k]).filter(Boolean).join(' · ');
    },

    filaVar(v, cost) {
      const mk = this.markupDe(v), banda = global.DB.bandaDe(mk);
      const off = v.activa === false;
      // 2 × 2 cm en pantalla: se ve de qué mueble se trata sin abrir nada.
      const img = (url, k, tit) => `<button class="vimg ${url ? 'hay' : ''}" data-img="${v.id}|${k}" title="${tit}">
        ${url ? `<img src="${UI.esc(url)}" alt="">` : `<span class="vimg-v">${k === 'imgProd' ? '📐' : '📷'}</span>`}
        <span class="vimg-e">✎</span></button>`;
      return `<div class="vr ${off ? 'off' : ''} ${cost ? '' : 'sincosto'}" data-v="${v.id}">
        ${img(v.imgVenta, 'imgVenta', 'Imagen de venta — sale impresa en la cotización')}
        ${img(v.imgProd, 'imgProd', 'Imagen de producción — el plano que va a fábrica')}
        <div class="vr-n">
          <button class="vr-nom" data-abrir="${v.id}">${UI.esc(this.nombreVar(v))}</button>
          <div class="vr-sku tnum">${UI.esc(v.sku || global.DB.skuDe(this.p, v))}${
            off ? ' · <b class="warn-t">desactivada</b>' : ''}</div>
        </div>
        <div class="vr-st">${v.stock > 0
          ? `<b class="tnum ok-t">${v.stock}</b>`
          : (v.reponer === 'minimo'
            ? '<span class="muted">reponer</span>'
            // Se fabrica cuando se vende: no hay tope de stock.
            : '<span class="inf">∞ a pedido</span>')}</div>
        ${cost ? `<div class="vr-c"><input inputmode="numeric" class="pn" data-costo="${v.id}"
          value="${v.costo || ''}" ${this.puedeEditar() ? '' : 'readonly'}></div>` : ''}
        <div class="vr-p"><span class="uni">$</span><input inputmode="numeric" class="pn" data-precio="${v.id}"
          value="${v.precio || ''}" ${this.puedeEditar() ? '' : 'readonly'}></div>
        ${cost ? `<div class="vr-m"><span class="mk ${banda.pill}">${mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—'}</span></div>`
          : `<div class="vr-pe"><input inputmode="decimal" class="pn" data-peso="${v.id}"
              value="${v.peso || ''}" ${this.puedeEditar() ? '' : 'readonly'}><span class="uni">kg</span></div>`}
        <div class="vr-a">
          <button class="lx" data-abrir="${v.id}" title="Editar la variante">✏️</button>
          <button class="lx" data-dup="${v.id}" title="Duplicar">⧉</button>
          <button class="lx" data-hist="${v.id}" title="Historial de precio">↺</button>
        </div>
      </div>`;
    },

    // Duplicar sirve para la variante que es casi igual a otra: se copia
    // entera y después se le cambia lo que sea distinto.
    duplicar(id) {
      const v = this.vars.find(x => x.id === id); if (!v) return;
      const copia = { ...v, id: Math.max(0, ...this.vars.map(x => x.id)) + 1, sku: '', stock: 0 };
      this.vars.splice(this.vars.indexOf(v) + 1, 0, copia);
      UI.aviso('Variante duplicada — cambiale lo que sea distinto', 'ok');
      this.pintar();
      this.abrirVariante(copia.id);
    },

    // El historial de precio todavía no se guarda: hace falta la tabla.
    historial(id) {
      const v = this.vars.find(x => x.id === id); if (!v) return;
      this.modal(`
        <h3 class="h-title" style="font-size:17px">Historial de precio</h3>
        <p class="h-sub">${UI.esc(this.nombreVar(v))}</p>
        <div class="banner info" style="margin:14px 0 0">Todavía no se guardan los cambios de precio.
          Cuando esté la tabla, acá va a estar cada cambio con la fecha y quién lo hizo.</div>
        <div class="row" style="margin-top:16px;justify-content:flex-end">
          <button class="btn" onclick="document.getElementById('mdlz').remove()">Cerrar</button>
        </div>`, 460);
    },

    // 6 · Simulador --------------------------------------------------------
    // Mover costo o precio y ver qué pasa, SIN tocar los datos reales.
    bloqueSimulador() {
      const v = this.vars.find(x => x.activa !== false) || this.vars[0];
      if (!v) return '';
      this._sim = this._sim || { id: v.id, costo: v.costo, precio: v.precio };
      return `<section class="pd-b">
        <div class="pd-h">Simular <span class="muted">· no modifica los datos reales</span></div>
        <div class="sim-sel">
          <select id="sim-v">${this.vars.map(x =>
            `<option value="${x.id}" ${this._sim.id === x.id ? 'selected' : ''}>${UI.esc(this.nombreVar(x))}</option>`).join('')}</select>
        </div>
        <div class="sim-g">
          <label>Costo <b class="tnum" id="sim-cl">${UI.pesos(this._sim.costo)}</b>
            <input type="range" id="sim-c" min="0" max="${Math.max(1, this._sim.costo * 3)}" value="${this._sim.costo}"></label>
          <label>Precio de lista <b class="tnum" id="sim-pl">${UI.pesos(this._sim.precio)}</b>
            <input type="range" id="sim-p" min="0" max="${Math.max(1, this._sim.precio * 2)}" value="${this._sim.precio}"></label>
        </div>
        <div class="banda"><div class="bz crit"></div><div class="bz warn"></div><div class="bz ok"></div>
          <div class="b-obj" id="sim-obj"></div><div class="b-pin" id="sim-pin"></div></div>
        <div class="banda-l"><span>1,00x</span><span>1,60x</span><span>1,90x</span><span>3,00x</span></div>
        <div class="sim-kv">
          <div><span>Markup</span><b id="sim-mk">—</b></div>
          <div><span>Margen</span><b id="sim-mg">—</b></div>
          <div><span>Ganancia por unidad</span><b id="sim-gan">—</b></div>
          <div><span>Objetivo</span><b id="sim-ob">—</b></div>
        </div>
      </section>`;
    },

    // 7 · Proveedores ------------------------------------------------------
    bloqueProveedores() {
      const ps = this.p.proveedores || [];
      return `<section class="pd-b">
        <div class="pd-h">Proveedores <span class="muted">· a quién se le puede pedir</span></div>
        <div class="chips">
          ${ps.map((x, i) => `<span class="chip">${UI.esc(x.nombre)}${this.puedeEditar()
            ? `<button class="chip-x" data-quitarprov="${i}" aria-label="Quitar">✕</button>` : ''}</span>`).join('')
            || '<span class="hint">Todavía no se cargó ninguno.</span>'}
          ${this.puedeEditar() ? '<button class="chip-add" id="pd-addprov">＋ proveedor</button>' : ''}
        </div>
        <div class="hint" style="margin-top:8px">Van por mueble, no por variante: los mismos hacen todas las
          medidas. El costo sale del <b>promedio</b> de lo que pasa cada uno.</div>
      </section>`;
    },

    // Módulo 4 · Adicionales — todo lo que no es ni qué es el mueble ni cuánto
    // sale: quién lo ve, cómo se consigue y cómo se entrega.
    bloqueAdicionales(dentro) {
      const p = this.p, r = p.rutas || {}, ed = this.puedeEditar();
      return `<${dentro ? 'div' : 'section class="pd-b"'}>
        ${dentro ? '' : '<div class="pd-h">Adicionales</div>'}
        <div class="ad-t">Visibilidad</div>
        <label class="chk"><input type="checkbox" id="pd-pub" ${p.publicado ? 'checked' : ''}
          ${ed ? '' : 'disabled'}> Mostrar a los vendedores</label>
        <div class="hint">Oculto no aparece para cotizar. Cada variante además se puede
          mostrar o esconder por separado.</div>

        <div class="pd-sepl"></div>
        <div class="ad-t">Cómo se pide</div>
        <div class="rutas">${global.DB.RUTAS.map(x =>
          `<label class="chk"><input type="checkbox" data-ruta="${x.k}" ${r[x.k] ? 'checked' : ''}
            ${ed ? '' : 'disabled'}> ${UI.esc(x.label)}</label>`).join('')}</div>

        <div class="pd-sepl"></div>
        <div class="ad-t">Entrega</div>
        <label class="chk"><input type="checkbox" id="pd-inst" ${p.instalacion ? 'checked' : ''}
          ${ed ? '' : 'disabled'}> Requiere instalación</label>
        <div class="hint">${p.instalacion
          ? 'En la orden va a saltar solo, con <b>a convenir</b>; el costo se define en Instalaciones, no acá.'
          : 'En la orden sale <b>no requiere instalación</b> por default, y el vendedor puede editarlo.'}</div>
        <div class="fr" style="margin-top:9px"><label for="pd-bultos">Bultos por unidad</label>
          <input id="pd-bultos" inputmode="numeric" value="${UI.esc(p.bultos || '')}"
            placeholder="1" ${ed ? '' : 'readonly'}></div>
        <div class="fr"><label></label><span class="hint">Con cuántos bultos viaja. Es lo que usa
          la subida por escalera, que se cobra por piso y por bulto.</span></div>
      </${dentro ? 'div' : 'section'}>`;
    },

    // 9 · Contabilidad -------------------------------------------------------
    bloqueContabilidad() {
      const c = this.p.contabilidad || {};
      const f = (id, lbl, val) => `<div class="fr"><label for="${id}">${lbl}</label>
        <input id="${id}" value="${UI.esc(val || '')}" placeholder="De la categoría"
          ${this.puedeEditar() ? '' : 'readonly'}></div>`;
      return `<section class="pd-b">
        <div class="pd-h">Contabilidad</div>
        <div class="cz-cols">
          <div class="cz-col">${f('pd-cta-v', 'Cuando se vende', c.ingresos)}</div>
          <div class="cz-col">${f('pd-cta-c', 'Cuando se compra', c.gastos)}</div>
        </div>
        <div class="hint" style="margin-top:8px">En blanco hereda la cuenta de la categoría. Se termina de
          enganchar cuando armemos Contabilidad.</div>
      </section>`;
    },

    // ---- Interacción -------------------------------------------------------
    enganchar() {
      const g = id => document.getElementById(id);
      const p = this.p, ed = this.puedeEditar();

      const nom = g('pd-nombre');
      if (nom && ed) nom.onchange = () => { p.nombre = nom.value.trim() || p.nombre; this.guardar(); };
      const des = g('pd-desc');
      if (des && ed) des.onchange = () => { p.desc = des.value.trim(); this.guardar(); };
      const pub = g('pd-pub');
      if (pub && ed) pub.onchange = () => {
        p.publicado = pub.checked; this.guardar();
        const pill = g('pd-pub-pill');
        pill.className = 'pill ' + (p.publicado ? 'ok' : 'warn');
        pill.textContent = p.publicado ? 'Visible para los vendedores' : 'Oculto — no se puede vender';
      };

      // Fotos: se leen del disco y quedan como enlace del Storage.
      const dz = g('pd-drop'), file = g('pd-file');
      if (dz) {
        dz.onclick = () => file.click();
        dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); };
        dz.ondragleave = () => dz.classList.remove('on');
        dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); this.subir(e.dataTransfer.files); };
        file.onchange = () => this.subir(file.files);
      }
      document.querySelectorAll('[data-ppal]').forEach(b => b.onclick = () => {
        const i = Number(b.dataset.ppal);
        const f = p.fotos.splice(i, 1)[0]; p.fotos.unshift(f);
        this.guardar(); this.pintar();
      });
      document.querySelectorAll('[data-quitarf]').forEach(b => b.onclick = () => {
        p.fotos.splice(Number(b.dataset.quitarf), 1); this.guardar(); this.pintar();
      });

      if (g('pd-edcat')) g('pd-edcat').onclick = () => this.modalCategorias();
      document.querySelectorAll('[data-prop]').forEach(b =>
        b.onclick = () => this.abrirPropiedad(b.dataset.prop));
      document.querySelectorAll('[data-addv]').forEach(b =>
        b.onclick = () => this.agregarValores(b.dataset.addv));
      if (g('pd-addprop')) g('pd-addprop').onclick = () => this.desplegarPropiedades();
      document.querySelectorAll('[data-quitarcat]').forEach(b => b.onclick = () => {
        const id = Number(b.dataset.quitarcat);
        this.p.categorias = (this.p.categorias || []).filter(x => x !== id);
        this.p.categoria_id = this.p.categorias[0] || null;
        this.guardar(); this.pintar();
      });
      // Variantes
      const fv = g('pd-fvar');
      if (fv) {
        let t; fv.oninput = () => { clearTimeout(t); t = setTimeout(() => {
          this._fVar = fv.value;
          const box = g('pd-vars');
          const f = this._fVar.trim().toLowerCase();
          const lista = this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f));
          box.innerHTML = lista.map(v => this.filaVar(v, this.muestraCostos())).join('')
            || UI.vacio('Ninguna variante coincide con el filtro.');
          this.engancharVars();
        }, 200); };
      }
      this.engancharVars();

      document.querySelectorAll('[data-ruta]').forEach(c => c.onchange = () => {
        p.rutas = p.rutas || {}; p.rutas[c.dataset.ruta] = c.checked; this.guardar();
      });
      if (g('pd-inst') && ed) g('pd-inst').onchange = e => {
        p.instalacion = e.target.checked; this.guardar(); this.pintar();
      };
      const bul = g('pd-bultos');
      if (bul && ed) bul.onchange = () => {
        p.bultos = Math.max(0, Number(String(bul.value).replace(/[^\d]/g, '')) || 0); this.guardar();
      };
      if (g('pd-addprov')) g('pd-addprov').onclick = () => this.modalProveedor();
      document.querySelectorAll('[data-quitarprov]').forEach(b => b.onclick = () => {
        p.proveedores.splice(Number(b.dataset.quitarprov), 1); this.guardar(); this.pintar();
      });
      ['pd-cta-v', 'pd-cta-c'].forEach((id, i) => {
        const el = g(id); if (!el || !ed) return;
        el.onchange = () => {
          p.contabilidad = p.contabilidad || {};
          p.contabilidad[i ? 'gastos' : 'ingresos'] = el.value.trim();
          this.guardar();
        };
      });
      this.bindSimulador();
    },

    engancharVars() {
      document.querySelectorAll('[data-abrir]').forEach(b =>
        b.onclick = () => this.abrirVariante(Number(b.dataset.abrir)));
      document.querySelectorAll('[data-img]').forEach(b => b.onclick = () => {
        const [id, campo] = b.dataset.img.split('|');
        this.subirImagenVar(Number(id), campo);
      });
      const num = (attr, campo) => document.querySelectorAll(`[data-${attr}]`).forEach(i => {
        i.onchange = () => {
          const v = this.vars.find(x => x.id === Number(i.dataset[attr])); if (!v) return;
          v[campo] = Math.max(0, Number(String(i.value).replace(/[^\d]/g, '')) || 0);
          global.DB.guardarVariante(v);
          this.refrescarFila(v);
        };
      });
      num('costo', 'costo'); num('precio', 'precio'); num('peso', 'peso');
      document.querySelectorAll('[data-dup]').forEach(b =>
        b.onclick = () => this.duplicar(Number(b.dataset.dup)));
      document.querySelectorAll('[data-hist]').forEach(b =>
        b.onclick = () => this.historial(Number(b.dataset.hist)));
    },

    refrescarFila(v) {
      const fila = document.querySelector(`.vr[data-v="${v.id}"]`);
      if (!fila) return;
      fila.outerHTML = this.filaVar(v, this.muestraCostos());
      this.engancharVars();
    },

    guardar() { global.DB.guardarProducto(this.p); },

    // Los archivos van al Storage; hasta que esté conectado se leen local y se
    // guarda el enlace, que es lo único que vive en el mueble.
    subir(files) {
      [...(files || [])].forEach(f => {
        const r = new FileReader();
        r.onload = () => {
          this.p.fotos = this.p.fotos || [];
          this.p.fotos.push({ nombre: f.name, url: r.result });
          this.guardar(); this.pintar();
        };
        r.readAsDataURL(f);
      });
    },

    subirImagenVar(id, campo) {
      const v = this.vars.find(x => x.id === id); if (!v || !this.puedeEditar()) return;
      const inp = document.createElement('input');
      inp.type = 'file';
      // La de producción suele ser un plano en PDF.
      inp.accept = campo === 'imgProd' ? 'image/*,application/pdf' : 'image/*';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { v[campo] = r.result; global.DB.guardarVariante(v); this.refrescarFila(v); };
        r.readAsDataURL(f);
      };
      inp.click();
    },

    // ---- Panel de la variante ----------------------------------------------
    abrirVariante(id) {
      const v = this.vars.find(x => x.id === id); if (!v) return;
      this._abierta = id;
      const ed = this.puedeEditar(), cost = this.muestraCostos();
      const mk = this.markupDe(v), banda = global.DB.bandaDe(mk);
      const f = (id2, lbl, val, extra = '') => `<div class="fr"><label for="${id2}">${lbl}</label>
        <input id="${id2}" value="${UI.esc(val ?? '')}" ${extra} ${ed ? '' : 'readonly'}></div>`;

      document.getElementById('pd-panel').innerHTML = `
        <div class="pv-back" id="pv-back"></div>
        <aside class="pv-drawer">
          <div class="pv-top">
            <button class="lx" id="pv-cerrar" title="Cerrar">✕</button>
            <div>
              <div class="kick">${UI.esc(this.p.nombre)}</div>
              <h3>${UI.esc(this.nombreVar(v))}</h3>
            </div>
          </div>
          <div class="pv-body">
            <div class="pv-h">Precio</div>
            ${f('pv-precio', 'Precio de lista', v.precio, 'inputmode="numeric"')}
            ${cost ? f('pv-costo', 'Costo', v.costo, 'inputmode="numeric"') : ''}
            ${cost ? `<div class="fr"><label for="pv-mkobj">Markup objetivo</label>
              <div class="fx"><input id="pv-mkobj" inputmode="decimal" value="${v.markupObj || ''}"
                placeholder="${this.p.markupObj || 2}" ${ed ? '' : 'readonly'}>
                <span class="mk ${banda.pill}">${mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—'}</span></div></div>
              <div class="fr"><label></label><span class="hint">En blanco usa el del mueble
                (<b>${String(this.p.markupObj || 2).replace('.', ',')}x</b>). Se puede subir en las medidas
                grandes, que el cliente paga.</span></div>` : ''}
            ${f('pv-desc', 'Precio promocional', v.promo, 'inputmode="numeric" placeholder="sin descuento"')}

            <div class="pv-h">Códigos</div>
            <div class="fr"><label for="pv-sku">SKU</label>
              <div class="fx"><input id="pv-sku" value="${UI.esc(v.sku || global.DB.skuDe(this.p, v))}" ${ed ? '' : 'readonly'}>
                <button class="lapiz" id="pv-sku-auto" title="Volver al automático">↺</button></div></div>
            <div class="fr"><label></label><span class="hint">Se arma solo con el código del mueble y los
              valores de la variante; se puede pisar a mano.</span></div>

            <div class="pv-h">Medidas y peso</div>
            <div class="cz-cols">
              <div class="cz-col">${f('pv-frente', 'Frente (cm)', v.frenteCm, 'inputmode="decimal"')}
                ${f('pv-alto', 'Alto (cm)', v.alto, 'inputmode="decimal"')}</div>
              <div class="cz-col">${f('pv-prof', 'Profundidad (cm)', v.prof, 'inputmode="decimal"')}
                ${f('pv-peso', 'Peso (kg)', v.peso, 'inputmode="decimal"')}</div>
            </div>

            <div class="pv-h">Costeo</div>
            <div class="fr"><label for="pv-medc">Medida de costeo</label>
              <select id="pv-medc" ${ed ? '' : 'disabled'}>${(() => {
                // El diccionario escribe "1,60" y la variante "1.60": se
                // comparan igual para que no quede seleccionada otra medida.
                const norm = x => String(x || '').replace(',', '.');
                const act = norm(v.medidaCosteo || v.medida);
                const vals = (global.DB.propiedad('medida') || { valores: [] }).valores;
                const todas = vals.some(m => norm(m) === act) ? vals : [v.medidaCosteo || v.medida, ...vals];
                return todas.map(m => `<option ${norm(m) === act ? 'selected' : ''}>${UI.esc(m)}</option>`).join('');
              })()}</select></div>
            <div class="fr"><label></label><span class="hint">La que usa el proveedor cuando no cotiza la
              nuestra: el de 0,90 se costea con el de 1,00.</span></div>

            <div class="pv-h">Stock</div>
            ${f('pv-stock', 'Stock real', v.stock, 'inputmode="numeric"')}
            <div class="fr"><label for="pv-rep">Reposición</label>
              <select id="pv-rep" ${ed ? '' : 'disabled'}>
                <option value="pedido" ${v.reponer !== 'minimo' ? 'selected' : ''}>Se pide cuando se vende</option>
                <option value="minimo" ${v.reponer === 'minimo' ? 'selected' : ''}>Mantener un mínimo</option>
              </select></div>
            ${v.reponer === 'minimo' ? f('pv-min', 'Mínimo', v.minStock, 'inputmode="numeric"') : ''}

            <div class="pv-h">Publicación</div>
            <label class="chk"><input type="checkbox" id="pv-mostrar" ${v.mostrar !== false ? 'checked' : ''}
              ${ed ? '' : 'disabled'}> Mostrar esta variante a los vendedores</label>
            <label class="chk"><input type="checkbox" id="pv-activa" ${v.activa !== false ? 'checked' : ''}
              ${ed ? '' : 'disabled'}> Se fabrica</label>
            <div class="hint">Si no se fabrica, queda a la vista pero no se puede cotizar.</div>
          </div>
        </aside>`;

      const cerrar = () => { document.getElementById('pd-panel').innerHTML = ''; this._abierta = null; };
      document.getElementById('pv-cerrar').onclick = cerrar;
      document.getElementById('pv-back').onclick = cerrar;

      const bind = (id, fn) => { const el = document.getElementById(id); if (el && ed) el.onchange = () => fn(el); };
      const numf = (id, campo) => bind(id, el => {
        v[campo] = Number(String(el.value).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        global.DB.guardarVariante(v); this.refrescarFila(v);
      });
      numf('pv-precio', 'precio'); numf('pv-costo', 'costo'); numf('pv-desc', 'promo');
      numf('pv-frente', 'frenteCm'); numf('pv-alto', 'alto'); numf('pv-prof', 'prof');
      numf('pv-peso', 'peso'); numf('pv-stock', 'stock'); numf('pv-min', 'minStock');
      numf('pv-mkobj', 'markupObj');
      bind('pv-sku', el => { v.sku = el.value.trim(); global.DB.guardarVariante(v); this.refrescarFila(v); });
      bind('pv-medc', el => { v.medidaCosteo = el.value; global.DB.guardarVariante(v); });
      bind('pv-rep', el => { v.reponer = el.value; global.DB.guardarVariante(v); this.abrirVariante(id); this.refrescarFila(v); });
      bind('pv-mostrar', el => { v.mostrar = el.checked; global.DB.guardarVariante(v); this.refrescarFila(v); });
      bind('pv-activa', el => { v.activa = el.checked; global.DB.guardarVariante(v); this.pintar(); });
      const auto = document.getElementById('pv-sku-auto');
      if (auto) auto.onclick = () => { v.sku = ''; global.DB.guardarVariante(v); this.abrirVariante(id); this.refrescarFila(v); };
    },

    // ---- Simulador -----------------------------------------------------------
    bindSimulador() {
      // El simulador vive en su solapa: si no está en pantalla no hay nada
      // que enganchar.
      const sel = document.getElementById('sim-v');
      if (!sel || !this._sim) return;
      const c = document.getElementById('sim-c'), p = document.getElementById('sim-p');
      sel.onchange = () => {
        const v = this.vars.find(x => x.id === Number(sel.value));
        this._sim = { id: v.id, costo: v.costo, precio: v.precio };
        this.pintar();
      };
      const calc = () => {
        this._sim.costo = Number(c.value); this._sim.precio = Number(p.value);
        const mk = global.DB.markupDe(this._sim.costo, this._sim.precio);
        const mg = global.DB.margenDe(this._sim.costo, this._sim.precio);
        const v = this.vars.find(x => x.id === this._sim.id) || {};
        const obj = this.objetivoDe(v);
        document.getElementById('sim-cl').textContent = UI.pesos(this._sim.costo);
        document.getElementById('sim-pl').textContent = UI.pesos(this._sim.precio);
        document.getElementById('sim-mk').textContent = mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—';
        document.getElementById('sim-mg').textContent = mg ? mg.toFixed(1).replace('.', ',') + ' %' : '—';
        document.getElementById('sim-gan').textContent = UI.pesos(this._sim.precio - this._sim.costo);
        document.getElementById('sim-ob').textContent = String(obj).replace('.', ',') + 'x';
        // La banda va de 1,00x a 3,00x.
        const pos = x => Math.max(0, Math.min(100, ((x - 1) / 2) * 100));
        document.getElementById('sim-pin').style.left = pos(mk) + '%';
        document.getElementById('sim-obj').style.left = pos(obj) + '%';
        const pin = document.getElementById('sim-pin');
        pin.className = 'b-pin ' + global.DB.bandaDe(mk).pill;
      };
      c.oninput = calc; p.oninput = calc; calc();
    },

    // ---- Modales -------------------------------------------------------------
    modal(html, ancho = 520) {
      document.body.insertAdjacentHTML('beforeend',
        `<div class="mdlz" id="mdlz"><div class="card pad" style="max-width:${ancho}px;width:100%">${html}</div></div>`);
      const cerrar = () => { const m = document.getElementById('mdlz'); if (m) m.remove(); };
      document.getElementById('mdlz').onclick = e => { if (e.target.id === 'mdlz') cerrar(); };
      return cerrar;
    },

    // Agregar una propiedad A ESTE MUEBLE. No se inventa una nueva: se elige
    // entre las que ya existen en el sistema, y recién al final está la opción
    // de crear una que no exista.
    desplegarPropiedades() {
      const btn = document.getElementById('pd-addprop');
      const sel = document.getElementById('pd-selprop');
      const usa = this.p.propiedades || [];
      const libres = global.DB.propiedades().filter(p => !usa.includes(p.k));
      sel.innerHTML = `<option value="">Seleccionar…</option>`
        + libres.map(p => `<option value="${UI.esc(p.k)}">${UI.esc(p.nombre)}`
          + `${p.valores.length ? ` (${p.valores.length} valores)` : ''}</option>`).join('')
        + `<option value="__nueva">+ Nueva propiedad</option>`;
      btn.hidden = true; sel.hidden = false; sel.focus();
      sel.onchange = () => {
        const v = sel.value;
        if (!v) return;
        if (v === '__nueva') return this.modalPropiedadNueva();
        this.agregarPropiedad(v);
        sel.hidden = true; btn.hidden = false;
      };
      // Si se va sin elegir nada, vuelve el botón.
      sel.onblur = () => { if (!sel.value) { sel.hidden = true; btn.hidden = false; } };
    },

    // Una propiedad sin valores no sirve para nada: no multiplica, no aparece
    // en la variante y ensucia la pantalla. Así que se piden los valores
    // PRIMERO, y recién si se elige alguno la propiedad entra al mueble.
    agregarPropiedad(k) {
      this.agregarValores(k, { alta: true });
    },

    // Elegir valores. Es la pantalla que más se usa del catálogo, así que los
    // valores se ven todos juntos y se marcan de a uno, en vez de escribirlos.
    //  · opts.alta = true → viene de agregar una propiedad nueva al mueble, y
    //    si no se elige ningún valor la propiedad NO se agrega.
    agregarValores(k, opts = {}) {
      const prop = global.DB.propiedad(k); if (!prop) return;
      const usados = (this.props().find(x => x.k === k) || { usados: [] }).usados;
      const libres = prop.valores.filter(v => !usados.includes(v));
      const sel = new Set();

      const chip = v => `<button class="vsel" data-v="${UI.esc(v)}">
        <span class="vsel-c">✓</span><span>${UI.esc(v)}</span></button>`;

      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">${UI.esc(prop.nombre)}</h3>
        <p class="h-sub">Marcá los valores que puede tener <b>${UI.esc(this.p.nombre)}</b>.
          ${opts.alta ? 'Con al menos uno la propiedad se agrega al mueble.' : ''}</p>

        ${usados.length ? `<div class="vya">Ya tiene:
          ${usados.map(v => `<span class="chip">${UI.esc(v)}</span>`).join('')}</div>` : ''}

        <input id="av-q" class="busca" placeholder="Buscar valor" style="margin:12px 0 10px">
        <div class="vsels" id="av-lista">${libres.map(chip).join('')
          || '<div class="hint">No queda ninguno sin usar. Creá uno nuevo abajo.</div>'}</div>

        <div class="pd-sepl"></div>
        <div class="ad-t">Crear un valor que no está</div>
        <div class="fx">
          <input id="av-nuevo" placeholder="Ej: ESTRUCTURA ROBLE">
          <button class="btn" id="av-crear">＋ Crear</button>
        </div>
        <div class="hint" style="margin-top:5px">Queda disponible para todos los muebles del catálogo.</div>

        <div class="row" style="margin-top:18px;gap:10px">
          <span class="hint" id="av-n">ninguno marcado</span><div class="sp"></div>
          <button class="btn" id="av-x">Cancelar</button>
          <button class="btn primary" id="av-ok">Agregar</button>
        </div>`, 560);

      const lista = document.getElementById('av-lista');
      const contar = () => {
        document.getElementById('av-n').textContent = sel.size
          ? `${sel.size} ${sel.size === 1 ? 'marcado' : 'marcados'}` : 'ninguno marcado';
      };
      const enganchar = () => lista.querySelectorAll('.vsel').forEach(b => b.onclick = () => {
        const v = b.dataset.v;
        if (sel.has(v)) { sel.delete(v); b.classList.remove('on'); }
        else { sel.add(v); b.classList.add('on'); }
        contar();
      });
      enganchar();

      const q = document.getElementById('av-q');
      q.oninput = () => {
        const t = q.value.trim().toLowerCase();
        lista.querySelectorAll('.vsel').forEach(b =>
          b.style.display = !t || b.dataset.v.toLowerCase().includes(t) ? '' : 'none');
      };

      const crear = (forzar) => {
        const inp = document.getElementById('av-nuevo');
        const n = inp.value.trim();
        if (!n) return UI.aviso('Escribí el valor', 'warn');
        // Antes de crearlo se revisa que no sea un error de tipeo de otro.
        const parecido = forzar ? null : global.DB.parecidoA(k, n);
        if (parecido) return this.confirmarValor(k, n, parecido, (usar, esOtro) => {
          if (!esOtro) {
            // Ya existe: se marca el que está en vez de crear uno igual.
            const b = lista.querySelector(`.vsel[data-v="${usar.replace(/"/g, '&quot;')}"]`);
            if (b && !sel.has(usar)) { sel.add(usar); b.classList.add('on'); contar(); }
            else if (!b) { sel.add(usar); contar(); }
            inp.value = '';
          } else { inp.value = usar; crear(true); }
        });
        const guardado = global.DB.agregarValor(k, n);
        lista.insertAdjacentHTML('afterbegin', chip(guardado));
        enganchar();
        sel.add(guardado);
        lista.firstElementChild.classList.add('on');
        inp.value = ''; contar();
      };
      document.getElementById('av-crear').onclick = () => crear(false);
      document.getElementById('av-nuevo').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); crear(false); } };

      document.getElementById('av-x').onclick = cerrar;
      document.getElementById('av-ok').onclick = () => {
        if (!sel.size) {
          return UI.aviso(opts.alta
            ? 'Elegí al menos un valor — una propiedad sin valores no sirve'
            : 'No marcaste ninguno', 'warn');
        }
        if (opts.alta && !(this.p.propiedades || []).includes(k)) {
          this.p.propiedades = [...(this.p.propiedades || []), k];
          this.guardar();
        }
        let n = 0;
        sel.forEach(v => { n += this.sumarValor(k, v) || 0; });
        cerrar();
        UI.aviso(n ? `${n} ${n === 1 ? 'variante nueva' : 'variantes nuevas'}` : 'Listo', 'ok');
        this.pintar();
      };
    },

    modalPropiedadNueva() {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Nueva propiedad</h3>
        <p class="h-sub">Queda disponible para todos los muebles del catálogo, no sólo para éste.</p>
        <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
          <input id="mpn-n" placeholder="Ej: TAPIZADO"></label>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mpn-x">Cancelar</button>
          <button class="btn primary" id="mpn-ok">Crear</button>
        </div>`, 440);
      const salir = () => { cerrar(); this.pintar(); };
      document.getElementById('mpn-x').onclick = salir;
      document.getElementById('mpn-ok').onclick = () => {
        const n = document.getElementById('mpn-n').value.trim();
        if (!n) return UI.aviso('Poné el nombre', 'warn');
        const nueva = global.DB.crearPropiedad(n);
        cerrar();
        if (nueva) this.agregarPropiedad(nueva.k);
      };
    },

    // ---- Entrar a una propiedad ---------------------------------------------
    // Acá se cargan los valores que puede tener. La lista muestra TODOS los del
    // catálogo: tildados los que usa este mueble. Así no se escribe de nuevo
    // algo que ya existe.
    abrirPropiedad(k) {
      const prop = global.DB.propiedad(k); if (!prop) return;
      const usados = this.props().find(x => x.k === k).usados;
      const ed = this.puedeEditar();
      // Los que ya están en uso van arriba, en el orden en que se eligieron.
      const orden = [...usados, ...prop.valores.filter(v => !usados.includes(v))];
      this._nuevos = [];

      const fila = (v, i) => `<div class="vrow" draggable="${ed}" data-i="${i}">
        <span class="vr-drag" title="Arrastrar para ordenar">⠿</span>
        <input type="checkbox" data-vchk="${i}" ${usados.includes(v) ? 'checked' : ''} ${ed ? '' : 'disabled'}>
        <input class="vr-txt" data-vtxt="${i}" value="${UI.esc(v)}" ${ed ? '' : 'readonly'}>
      </div>`;

      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:19px">Editar propiedad</h3>
        <label class="fld" style="margin-top:14px"><span class="lbl">Nombre</span>
          <input id="mp-nom" value="${UI.esc(prop.nombre)}" ${ed ? '' : 'readonly'}></label>
        <div class="pd-sepl"></div>
        <p class="hint">Agregá valores relacionados a esta propiedad. Tildá los que puede tener
          <b>${UI.esc(this.p.nombre)}</b>.</p>
        <div class="lbl" style="margin:11px 0 7px">Valores seleccionados</div>
        <div class="vrows" id="mp-vals">${orden.map(fila).join('')}</div>
        ${ed ? '<button class="lnk" id="mp-add" style="margin-top:10px">⊕ Agregar valor</button>' : ''}
        <div class="row" style="margin-top:18px;gap:10px">
          ${ed ? '<button class="btn danger ghost" id="mp-del">Quitar del mueble</button>' : ''}
          <span class="hint" id="mp-n"></span><div class="sp"></div>
          <button class="btn" id="mp-x">Cancelar</button>
          <button class="btn primary" id="mp-ok">Guardar</button>
        </div>`, 540);

      const box = document.getElementById('mp-vals');
      const contar = () => {
        const n = [...box.querySelectorAll('[data-vchk]')].filter(c => c.checked).length;
        document.getElementById('mp-n').textContent = n
          ? `${n} ${n === 1 ? 'valor' : 'valores'}` : 'ningún valor tildado';
      };
      const reenganchar = () => {
        box.querySelectorAll('[data-vchk]').forEach(c => c.onchange = contar);
        if (!ed) return;
        // Arrastrar para ordenar: el orden es el que después ve el vendedor.
        let origen = null;
        box.querySelectorAll('.vrow').forEach(r => {
          r.ondragstart = () => { origen = r; r.classList.add('drag'); };
          r.ondragend = () => { r.classList.remove('drag'); origen = null; };
          r.ondragover = e => {
            e.preventDefault();
            if (!origen || origen === r) return;
            const caja = r.getBoundingClientRect();
            box.insertBefore(origen, e.clientY < caja.top + caja.height / 2 ? r : r.nextSibling);
          };
        });
      };
      reenganchar(); contar();

      if (ed) document.getElementById('mp-add').onclick = () => {
        const i = 1000 + this._nuevos.length; this._nuevos.push('');
        box.insertAdjacentHTML('beforeend', `<div class="vrow" draggable="true" data-i="${i}">
          <span class="vr-drag">⠿</span>
          <input type="checkbox" data-vchk="${i}" checked>
          <input class="vr-txt" data-vtxt="${i}" placeholder="Escribí el valor nuevo">
        </div>`);
        reenganchar(); contar();
        box.lastElementChild.querySelector('.vr-txt').focus();
      };

      document.getElementById('mp-x').onclick = cerrar;
      if (ed) document.getElementById('mp-del').onclick = () => {
        cerrar(); this.quitarPropiedad(k, prop.nombre);
      };
      document.getElementById('mp-ok').onclick = () => {
        // 1) El nombre de la propiedad.
        const props = global.DB.propiedades();
        const pr = props.find(x => x.k === k);
        const nom = document.getElementById('mp-nom').value.trim();
        if (nom) pr.nombre = nom;

        // 2) Los valores, en el orden en que quedaron en la lista.
        const filas = [...box.querySelectorAll('.vrow')].map(r => ({
          txt: r.querySelector('.vr-txt').value.trim(),
          on: r.querySelector('[data-vchk]').checked,
          antes: orden[Number(r.dataset.i)] || null,
        })).filter(f => f.txt);

        // Si uno se escribió a mano y se parece a otro, se avisa antes.
        const dudoso = filas.find(f => !f.antes && global.DB.parecidoA(k, f.txt));
        if (dudoso) return this.confirmarValor(k, dudoso.txt, global.DB.parecidoA(k, dudoso.txt),
          usar => { document.querySelectorAll(`.vr-txt`).forEach(i => {
            if (i.value.trim() === dudoso.txt) i.value = usar; });
            document.getElementById('mp-ok').click(); });

        pr.valores = filas.map(f => f.txt);
        global.DB.guardarPropiedades(props);

        // 3) Se aplican los cambios a las variantes del mueble.
        // Renombrados: la variante que decía lo viejo pasa a decir lo nuevo.
        filas.forEach(f => { if (f.antes && f.antes !== f.txt)
          this.vars.forEach(v => { if (v[k] === f.antes) v[k] = f.txt; }); });
        // Destildar NO borra: apaga. Si mañana ese tapizado se vuelve a
        // conseguir, se tilda de nuevo y las variantes vuelven con su precio.
        filas.filter(f => !f.on).forEach(f =>
          this.vars.forEach(v => { if (v[k] === f.txt) v.activa = false; }));
        const quedan = filas.filter(f => f.on).map(f => f.txt);
        quedan.forEach(v => {
          const hay = this.vars.filter(x => x[k] === v);
          if (hay.length) hay.forEach(x => { x.activa = true; });
          else this.sumarValor(k, v);
        });

        cerrar(); this.pintar();
      };
    },

    // Si una propiedad entera no se puede hacer más, se saca del mueble. La
    // propiedad sigue existiendo en el catálogo: mañana se vuelve a agregar.
    quitarPropiedad(k, nombre) {
      const ejes = (this.p.propiedades || []).filter(x => x !== k);
      // Sin ese eje, las variantes que sólo se diferenciaban por él quedan
      // repetidas: se conserva una de cada combinación de las que quedan.
      const clave = v => ejes.map(x => v[x]).join('|');
      const vistas = new Set(), quedan = [];
      this.vars.forEach(v => { const c = clave(v); if (!vistas.has(c)) { vistas.add(c); quedan.push(v); } });
      const pierde = this.vars.length - quedan.length;
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Quitar ${UI.esc(nombre)}</h3>
        <p class="h-sub">Este mueble deja de tener esa propiedad.${pierde
          ? ` Quedan <b>${quedan.length}</b> variantes en lugar de ${this.vars.length}: sin ese eje,
              ${pierde} pasaban a estar repetidas.` : ''}
          La propiedad sigue en el catálogo — se puede volver a agregar cuando haga falta.</p>
        <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
          <button class="btn" id="qp-x">Cancelar</button>
          <button class="btn danger" id="qp-ok">Quitar</button>
        </div>`, 480);
      document.getElementById('qp-x').onclick = cerrar;
      document.getElementById('qp-ok').onclick = () => {
        this.p.propiedades = ejes;
        this.vars = quedan;
        this.guardar(); cerrar(); this.pintar();
      };
    },

    // Sumar un valor a una propiedad del mueble.
    //  · Si la propiedad no tenía ningún valor todavía (recién agregada), el
    //    primero se le pone a las variantes que ya existen: no se duplica nada.
    //  · Del segundo en adelante sí multiplica: por cada combinación de las
    //    otras propiedades se crea la que faltaba, con el precio de la más
    //    parecida para no arrancar de cero.
    sumarValor(k, valor) {
      const ejes = this.p.propiedades || [];
      if (!this.vars.some(v => v[k])) {
        this.vars.forEach(v => { v[k] = valor; if (v.atributos) v.atributos[k] = valor; });
        return this.vars.length;
      }
      const otros = ejes.filter(x => x !== k).map(x => ({
        k: x, vals: [...new Set(this.vars.map(v => v[x]).filter(Boolean))],
      }));
      const combos = otros.reduce((acc, o) =>
        acc.flatMap(c => o.vals.map(v => ({ ...c, [o.k]: v }))), [{}]);
      let n = 0;
      combos.forEach(c => {
        if (this.vars.some(v => v[k] === valor && otros.every(o => v[o.k] === c[o.k]))) return;
        const ref = this.vars.find(v => otros.every(o => v[o.k] === c[o.k])) || this.vars[0] || {};
        this.vars.push({
          id: Math.max(0, ...this.vars.map(v => v.id)) + 1 + n,
          producto_id: this.p.id, ...c, [k]: valor,
          precio: ref.precio || 0, costo: ref.costo || 0,
          medidaCosteo: k === 'medida' ? valor : (ref.medidaCosteo || ''),
          markupObj: null, stock: 0, activa: true, mostrar: true,
          peso: ref.peso || 0, alto: ref.alto || 0, prof: ref.prof || 0,
          imgVenta: '', imgProd: '', minStock: 0, reponer: 'pedido',
          atributos: { ...c, [k]: valor },
        });
        n++;
      });
      return n;
    },

    confirmarValor(k, escrito, parecido, usar) {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">¿No será el mismo?</h3>
        <p class="h-sub">Escribiste <b>${UI.esc(escrito)}</b> y en el catálogo ya existe
          <b>${UI.esc(parecido)}</b>. Si son el mismo, usá el que ya está: dos valores casi iguales
          se cotizan por separado y no hay forma de juntarlos después.</p>
        <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
          <button class="btn" id="cp-nuevo">Es otro — crearlo igual</button>
          <button class="btn primary" id="cp-usar">Usar ${UI.esc(parecido)}</button>
        </div>`, 480);
      document.getElementById('cp-usar').onclick = () => { cerrar(); usar(parecido, false); };
      document.getElementById('cp-nuevo').onclick = () => { cerrar(); usar(escrito, true); };
    },

    async modalCategorias() {
      const arbol = await global.DB.arbolCategorias();
      // Se muestran como rutas completas (ESPACIOS/COCINA/ALACENA) para que se
      // entienda de dónde cuelga cada una.
      const ruta = c => {
        const out = [c.nombre]; let x = c;
        while (x && x.padre_id) { x = arbol.find(y => y.id === x.padre_id); if (x) out.unshift(x.nombre); }
        return out;
      };
      const filas = arbol.map(c => ({ c, r: ruta(c) }));
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Categorías</h3>
        <p class="h-sub">Dónde entra este mueble. Se pueden marcar varias.</p>
        <div class="fx" style="margin:12px 0 10px">
          <input id="mc-q" class="busca" placeholder="Buscar categoría">
          <button class="btn" id="mc-crear">＋ Crear</button>
        </div>
        <div class="lstc" id="mc-lista">${filas.map(({ c, r }) => `
          <label class="lc" data-txt="${UI.esc(r.join('/').toLowerCase())}">
            <span class="lc-r">${r.slice(0, -1).map(x => `<span class="muted">${UI.esc(x)}/</span>`).join('')}<b>${UI.esc(c.nombre)}</b></span>
            <input type="checkbox" data-cat="${c.id}" ${(this.p.categorias || []).includes(c.id) ? 'checked' : ''}>
          </label>`).join('')}
        </div>
        <div class="hint" style="margin-top:10px">Con la familia alcanza: el ambiente del que cuelga
          se hereda solo.</div>
        <div class="row" style="margin-top:16px;gap:10px">
          <span class="hint" id="mc-n"></span><div class="sp"></div>
          <button class="btn" id="mc-x">Cancelar</button>
          <button class="btn primary" id="mc-ok">Guardar</button>
        </div>`, 560);
      const q = document.getElementById('mc-q');
      q.oninput = () => {
        const t = q.value.trim().toLowerCase();
        document.querySelectorAll('.lc').forEach(l =>
          l.style.display = !t || l.dataset.txt.includes(t) ? '' : 'none');
      };
      // Se pueden marcar varias: el mismo mueble puede estar en más de una.
      const cuenta = () => {
        const n = [...document.querySelectorAll('[data-cat]')].filter(c => c.checked).length;
        document.getElementById('mc-n').textContent = n
          ? `${n} ${n === 1 ? 'marcada' : 'marcadas'}` : 'ninguna marcada';
      };
      document.querySelectorAll('[data-cat]').forEach(c => c.onchange = cuenta);
      cuenta();
      // Crear una categoría desde acá: se elige de qué ambiente cuelga y queda
      // marcada, sin tener que ir hasta Catálogo → Familias y volver.
      document.getElementById('mc-crear').onclick = () => {
        const raices = arbol.filter(c => !c.padre_id);
        const cerrar2 = this.modal(`
          <h3 class="h-title" style="font-size:17px">Nueva categoría</h3>
          <p class="h-sub">Queda en el árbol del catálogo, para todos los muebles.</p>
          <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
            <input id="nc-n" placeholder="Ej: ESCRITORIOS"></label>
          <label class="fld" style="margin-top:10px"><span class="lbl">Cuelga de</span>
            <select id="nc-p"><option value="">— Es un ambiente, no cuelga de nada —</option>
              ${raices.map(c => `<option value="${c.id}">${UI.esc(c.nombre)}</option>`).join('')}</select></label>
          <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
            <button class="btn" id="nc-x">Cancelar</button>
            <button class="btn primary" id="nc-ok">Crear y marcar</button>
          </div>`, 460);
        document.getElementById('nc-x').onclick = cerrar2;
        document.getElementById('nc-ok').onclick = () => {
          const n = document.getElementById('nc-n').value.trim();
          if (!n) return UI.aviso('Poné el nombre', 'warn');
          const padre = Number(document.getElementById('nc-p').value) || null;
          const nueva = global.DB.crearCategoria(n, padre);
          cerrar2(); cerrar();
          this.p.categorias = [...(this.p.categorias || []), nueva.id];
          this.p.categoria_id = this.p.categorias[0];
          this.guardar();
          this.render(this._mount, this.p.id);
        };
      };
      document.getElementById('mc-x').onclick = cerrar;
      document.getElementById('mc-ok').onclick = async () => {
        this.p.categorias = [...document.querySelectorAll('[data-cat]')]
          .filter(c => c.checked).map(c => Number(c.dataset.cat));
        // La primera sigue siendo la principal, que es la que usa el resto
        // del sistema mientras no soporte varias.
        this.p.categoria_id = this.p.categorias[0] || null;
        this.guardar(); cerrar();
        await this.render(this._mount, this.p.id);
      };
    },

    modalProveedor() {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Agregar proveedor</h3>
        <p class="h-sub">Quién puede fabricar o traer este mueble. El costo del mueble sale del
          promedio de lo que pasa cada uno.</p>
        <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
          <input id="mpr-n" placeholder="Tony, Andrés, Luciano…"></label>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mpr-x">Cancelar</button>
          <button class="btn primary" id="mpr-ok">Agregar</button>
        </div>`, 440);
      document.getElementById('mpr-x').onclick = cerrar;
      document.getElementById('mpr-ok').onclick = () => {
        const n = document.getElementById('mpr-n').value.trim();
        if (!n) return UI.aviso('Poné el nombre', 'warn');
        this.p.proveedores = this.p.proveedores || [];
        this.p.proveedores.push({ nombre: n });
        this.guardar(); cerrar(); this.pintar();
      };
    },

    estilos() {
      return `<style>
        /* Estas las comparte con la cotización, pero acá no está su hoja: van
           repetidas para que la pantalla se sostenga sola. */
        .cz-cols{display:grid;grid-template-columns:1fr 1fr;gap:9px 22px}
        @media(max-width:820px){.cz-cols{grid-template-columns:1fr}}
        .cz-col{display:flex;flex-direction:column;gap:9px}
        .fr{display:grid;grid-template-columns:138px minmax(0,1fr);align-items:center;gap:9px}
        .fr>label{font-size:12.5px;color:var(--ink-soft)}
        .fr input,.fr select{padding:6px 9px;font-size:12.5px;width:100%}
        .fr .hint{font-size:11.5px;color:var(--muted)}
        @media(max-width:520px){.fr{grid-template-columns:1fr;gap:3px}}
        .fx{display:flex;align-items:center;gap:6px}
        .fx input{flex:1;min-width:0}
        .fx .mk{flex:none;width:76px}
        .hint{font-size:11.5px;color:var(--muted);line-height:1.45}
        .chip-add{border:1px dashed var(--line);background:var(--panel);border-radius:8px;
          padding:4px 10px;font-size:12.5px;color:var(--brand);cursor:pointer}
        .chip-add:hover{border-color:var(--brand);background:var(--brand-soft)}
        .lapiz{border:0;background:none;cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;color:var(--muted)}
        .lapiz:hover{background:var(--panel-2)}

        /* La pantalla no ocupa todo el ancho: se lee mucho mejor una columna
           angosta y centrada, con aire a los dos costados. */
        .pd-wrap{max-width:920px;margin:0 auto}
        /* Módulos desplegables, iguales a las etapas de la cotización. */
        .pd-m{background:var(--panel);border:1px solid var(--line);border-radius:11px;
          box-shadow:var(--shadow);margin-bottom:9px;overflow:hidden}
        .pd-m.on{border-color:var(--brand)}
        .pd-mh{width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;
          background:none;border:0;cursor:pointer;text-align:left;font:inherit}
        .pd-mh:hover{background:var(--panel-2)}
        .pd-mn{width:21px;height:21px;flex:none;border-radius:50%;background:var(--line-soft);
          color:var(--ink-soft);display:grid;place-items:center;font-size:11.5px;font-weight:800}
        .pd-m.on .pd-mn{background:var(--brand);color:#fff}
        .pd-m.ok:not(.on) .pd-mn{background:var(--ok);color:#fff}
        .pd-mt{font-weight:700;color:var(--navy);font-size:13.5px;flex:none}
        .pd-mr{flex:1;min-width:0;color:var(--muted);font-size:12px;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap}
        .pd-mg{color:var(--muted);font-size:11px}
        .pd-mb{padding:12px 14px 14px;border-top:1px solid var(--line-soft)}
        .pd-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
        /* Solapas: adelante lo que se mira siempre, atrás lo que se consulta. */
        .pd-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin:0 0 12px}
        .pd-tab{border:0;background:none;font:inherit;font-size:13px;font-weight:650;color:var(--muted);
          cursor:pointer;padding:9px 13px;border-bottom:2px solid transparent;margin-bottom:-1px}
        .pd-tab:hover{color:var(--navy)}
        .pd-tab.on{color:var(--navy);border-bottom-color:var(--brand)}
        /* Los bloques cortos van de a dos: uno abajo del otro la pantalla
           no terminaba más y había que bajar para todo. */
        .pd-2{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:start}
        .pd-2>.pd-b{margin-bottom:0}
        @media(max-width:1000px){.pd-2{grid-template-columns:1fr;gap:0}
          .pd-2>.pd-b{margin-bottom:9px}}
        .pd-b{background:var(--panel);border:1px solid var(--line);border-radius:12px;
          box-shadow:var(--shadow);padding:12px 14px;margin-bottom:9px}
        .pd-h{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
          color:var(--navy);margin-bottom:9px}
        .lbl-t{display:block;font-size:12px;color:var(--ink-soft);margin-bottom:4px}
        .pd-nom{width:100%;font-size:14px;font-weight:650;color:var(--navy);padding:7px 10px}
        .pd-des{width:100%;font-size:12.5px;line-height:1.5;resize:vertical;min-height:52px}
        .pd-des+.hint{margin-top:4px}
        .pd-nsub{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12px;
          color:var(--ink-soft);margin-top:7px}
        .pd-sep{width:1px;height:15px;background:var(--line)}
        .pd-sepl{height:1px;background:var(--line);margin:13px 0}
        .chk{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink-soft);cursor:pointer}
        .chk input{width:15px;height:15px;accent-color:var(--brand)}

        .dropz{border:2px dashed var(--brand);border-radius:10px;background:var(--brand-soft);
          padding:11px;text-align:center;cursor:pointer;margin-bottom:9px}
        .dropz.on{background:var(--panel-2);border-color:var(--navy)}
        .dz-mas{font-size:16px;color:var(--brand);line-height:1}
        .dz-t{font-size:12.5px;font-weight:650;color:var(--brand);margin-top:2px}
        .fotos{display:flex;gap:9px;flex-wrap:wrap}
        .fo{position:relative;width:106px;height:78px;border-radius:8px;overflow:hidden;
          border:1px solid var(--line);background:var(--panel-2)}
        .fo img{width:100%;height:100%;object-fit:cover}
        .fo.ppal{border-color:var(--brand)}
        .fo-ppal{position:absolute;left:5px;top:5px;background:var(--panel);border-radius:6px;
          padding:2px 6px;font-size:10.5px;font-weight:700;color:var(--brand)}
        .fo-acc{position:absolute;right:4px;top:4px;display:flex;gap:3px}
        .fo-b{border:0;background:rgba(255,255,255,.94);border-radius:6px;width:22px;height:22px;
          cursor:pointer;font-size:11px;line-height:1;box-shadow:var(--shadow)}

        .chips{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
        .chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);
          border-radius:8px;padding:4px 6px 4px 10px;font-size:12.5px;color:var(--navy);background:var(--panel-2)}
        .chip.her{border-style:dashed;color:var(--muted);background:none}
        .chip-x{border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px;padding:1px 3px;border-radius:4px}
        .chip-x:hover{color:var(--crit);background:var(--crit-bg,#fdf2f2)}
        /* Cada propiedad es una fila en la que se entra. */
        .prow{display:flex;align-items:center;gap:10px;width:100%;padding:9px 0;background:none;
          border:0;border-top:1px solid var(--line-soft);cursor:pointer;text-align:left;font:inherit}
        .props>.prow:first-child{border-top:0;padding-top:0}
        .prow:hover .prow-n{color:var(--brand)}
        .prow:hover .prow-go{color:var(--brand);transform:translateX(2px)}
        .prow-i{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
        .prow-n{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--navy)}
        .prow-go{color:var(--muted);font-size:19px;line-height:1;transition:.15s;border:0;
          background:none;cursor:pointer;padding:2px 6px;font:inherit;font-size:19px}
        .prow-go:hover{color:var(--brand);transform:translateX(2px)}
        .prow-add{margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}
        .selprop{max-width:280px;padding:6px 9px;font-size:12.5px}
        /* Los valores adentro de la propiedad: tildar, renombrar y ordenar. */
        .vrows{border:1px solid var(--line);border-radius:9px;max-height:290px;overflow:auto}
        .vrow{display:flex;align-items:center;gap:9px;padding:6px 10px;background:var(--panel);
          border-bottom:1px solid var(--line-soft)}
        .vrow:last-child{border-bottom:0}
        .vrow.drag{opacity:.4}
        .vr-drag{color:var(--muted);cursor:grab;font-size:13px;line-height:1;letter-spacing:-2px}
        /* Elegir valores: se marcan de a uno, no se escriben. */
        .vya{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .vsels{display:flex;gap:7px;flex-wrap:wrap;max-height:230px;overflow:auto;padding:2px}
        .vsel{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);
          background:var(--panel);border-radius:8px;padding:6px 11px;font:inherit;font-size:12.5px;
          color:var(--navy);cursor:pointer;transition:.12s}
        .vsel:hover{border-color:var(--brand)}
        .vsel-c{width:15px;height:15px;border:1px solid var(--line);border-radius:4px;font-size:10px;
          display:grid;place-items:center;color:transparent;flex:none}
        .vsel.on{border-color:var(--brand);background:var(--brand-soft);font-weight:650}
        .vsel.on .vsel-c{background:var(--brand);border-color:var(--brand);color:#fff}
        .vrow input[type=checkbox]{width:15px;height:15px;accent-color:var(--brand);flex:none}
        .vr-txt{flex:1;min-width:0;padding:5px 8px;font-size:12.5px}
        .btn.ghost{background:none;border-color:transparent;color:var(--crit)}
        .btn.ghost:hover{border-color:var(--crit)}
        .prop-pie{display:flex;align-items:center;gap:10px;margin-top:9px;padding-top:9px;
          border-top:1px solid var(--line);flex-wrap:wrap}
        .combo{font-size:12.5px;color:var(--ink-soft)} .combo b{font-size:15px;color:var(--navy)}

        .vr-tools{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .vr-tools .busca{max-width:320px;padding:7px 10px;font-size:13px}
        .vr-head,.vr{display:grid;grid-template-columns:78px 78px minmax(0,1fr) 72px 92px 92px 60px 82px;
          gap:9px;align-items:center}
        .vr-head.sincosto,.vr.sincosto{grid-template-columns:78px 78px minmax(0,1fr) 76px 96px 96px 82px}
        .vr-p,.vr-pe{display:flex;align-items:center;gap:4px}
        /* El input no puede comerse la unidad: si no, "kg" queda cortado. */
        .vr-p .pn,.vr-pe .pn{flex:1;min-width:0;width:auto}
        .uni{font-size:11px;color:var(--muted);flex:none}
        .inf{font-size:12px;color:var(--brand)}
        .vr-a{display:flex;gap:1px;justify-content:flex-end}
        .vr-head{font-size:10px;letter-spacing:.03em;line-height:1.3;text-transform:uppercase;color:var(--muted);
          font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--line)}
        .vr{padding:6px 0;border-bottom:1px solid var(--line-soft)}
        .vr.off{opacity:.5}
        /* 2 × 2 cm ≈ 76 px. Entra la foto de venta y el plano de producción. */
        .vimg{position:relative;width:76px;height:76px;border:1px dashed var(--line);border-radius:9px;
          background:var(--panel-2);cursor:pointer;font-size:20px;line-height:1;padding:0;
          overflow:hidden;color:var(--muted);display:grid;place-items:center}
        .vimg.hay{border-style:solid;border-color:var(--line)}
        .vimg img{width:100%;height:100%;object-fit:cover}
        .vimg:hover{border-color:var(--brand)}
        .vimg-e{position:absolute;right:3px;top:3px;width:19px;height:19px;border-radius:50%;
          background:rgba(255,255,255,.94);color:var(--brand);font-size:10px;display:grid;
          place-items:center;box-shadow:var(--shadow)}
        .vimg:not(:hover) .vimg-e{opacity:0}
        .vimg.hay:not(:hover) .vimg-e{opacity:.85}
        .vr-nom{border:0;background:none;font:inherit;font-size:13px;font-weight:650;color:var(--navy);
          cursor:pointer;padding:0;text-align:left}
        .vr-nom:hover{color:var(--brand);text-decoration:underline}
        .vr-sku{font-size:11px;color:var(--muted)}
        .vr-st{font-size:12.5px} .ok-t{color:var(--ok)} .warn-t{color:var(--warn)}
        .pn{width:100%;text-align:right;padding:5px 8px;font-size:12.5px;font-variant-numeric:tabular-nums}
        .mk{display:inline-block;width:100%;text-align:center;border-radius:6px;padding:3px 5px;
          font-size:11.5px;font-weight:700}
        .mk.ok{color:var(--ok);background:var(--ok-bg,#e9f7f0)}
        .mk.warn{color:var(--warn);background:var(--warn-bg)}
        .mk.crit{color:var(--crit);background:var(--crit-bg,#fdf2f2)}
        .vr-a{text-align:right}

        .sim-sel select{max-width:340px;padding:6px 9px;font-size:13px;margin-bottom:12px}
        .sim-g{display:grid;grid-template-columns:1fr 1fr;gap:11px 22px;margin-bottom:11px}
        @media(max-width:760px){.sim-g{grid-template-columns:1fr}}
        .sim-g label{display:block;font-size:11.5px;color:var(--muted)}
        .sim-g b{display:inline-block;font-size:15px;color:var(--navy);margin-left:5px}
        .sim-g input[type=range]{width:100%;margin-top:5px;accent-color:var(--brand)}
        .banda{position:relative;display:flex;height:12px;border-radius:6px;overflow:hidden}
        .bz{height:100%} .bz.crit{flex:30;background:#fadfdf} .bz.warn{flex:15;background:#fdf0d9} .bz.ok{flex:55;background:#dcf1e6}
        .b-obj{position:absolute;top:-3px;width:2px;height:18px;background:var(--navy)}
        .b-pin{position:absolute;top:-3px;width:16px;height:18px;margin-left:-8px;border-radius:5px;
          border:2px solid var(--panel);background:var(--ok)}
        .b-pin.warn{background:var(--warn)} .b-pin.crit{background:var(--crit)}
        .banda-l{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:4px}
        .sim-kv{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:11px}
        @media(max-width:760px){.sim-kv{grid-template-columns:1fr 1fr}}
        .sim-kv span{display:block;font-size:11px;color:var(--muted)}
        .sim-kv b{font-size:15px;color:var(--navy)}
        .rutas{display:flex;gap:18px;flex-wrap:wrap}
        .ad-t{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px}
        #pd-bultos{max-width:96px}

        .pv-back{position:fixed;inset:0;background:rgba(12,22,44,.35);z-index:40}
        .pv-drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);background:var(--panel);
          z-index:41;box-shadow:-8px 0 32px rgba(12,22,44,.18);display:flex;flex-direction:column}
        .pv-top{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line)}
        .pv-top h3{margin:2px 0 0;font-size:17px;color:var(--navy)}
        .pv-body{flex:1;overflow:auto;padding:13px 16px}
        .pv-h{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
          margin:13px 0 8px;padding-top:10px;border-top:1px solid var(--line-soft)}
        .pv-h:first-child{margin-top:0;padding-top:0;border-top:0}

        .mdlz{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .lstp,.lstc{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:9px;margin-top:12px}
        .lp,.lc{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line-soft);cursor:pointer}
        .lp:last-child,.lc:last-child{border-bottom:0}
        .lp:hover,.lc:hover{background:var(--panel-2)}
        .lp span{display:flex;flex-direction:column} .lp small{font-size:11px;color:var(--muted)}
        .lc{justify-content:space-between} .lc-r{font-size:13px}
        .lc input,.lp input{width:16px;height:16px;accent-color:var(--brand)}
      </style>`;
    },
  };

  global.ProductoDet = Producto;
})(typeof window !== 'undefined' ? window : globalThis);
