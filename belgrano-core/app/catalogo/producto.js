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
    // El orden importa: es el que después ordena las variantes de abajo.
    props() {
      const dicc = global.DB.propiedades();
      return (this.p.propiedades || []).map(k => {
        const d = dicc.find(x => x.k === k) || { k, nombre: k.toUpperCase(), valores: [] };
        // Los valores en uso, en el orden del diccionario — no en el orden en
        // que se fueron cargando. El diccionario escribe "1,60" y la variante
        // "1.60": se comparan normalizados o no se encontrarían nunca.
        const norm = x => String(x || '').replace(',', '.').toLowerCase().trim();
        // Si el mismo valor está dos veces escrito distinto ("1,60" y "1.60"),
        // manda la primera aparición: si no, la copia del final pisa la
        // posición real y el orden que se acaba de guardar no se ve.
        const pos = new Map();
        d.valores.forEach((v, i) => { if (!pos.has(norm(v))) pos.set(norm(v), i); });
        const hay = [...new Set(this.vars.map(v => v[k]).filter(Boolean))];
        const usados = hay.sort((a, b) => {
          const ia = pos.has(norm(a)) ? pos.get(norm(a)) : Infinity;
          const ib = pos.has(norm(b)) ? pos.get(norm(b)) : Infinity;
          if (ia !== ib) return ia - ib;
          // Los que no están en el diccionario, en orden natural: 1.40 antes
          // que 1.60 y no "1.40" antes que "1.4" como texto.
          return String(a).localeCompare(String(b), 'es', { numeric: true });
        });
        return { ...d, usados };
      });
    },

    // Las variantes salen ordenadas por la propiedad 1, después la 2 y después
    // la 3 — respetando el orden de los valores de cada una. Así quedan todas
    // las de 0,40 blanca juntas, y adentro por frente.
    ordenadas(lista) {
      const ejes = this.p.propiedades || [];
      const pos = {};
      this.props().forEach(pr => {
        pos[pr.k] = {};
        pr.usados.forEach((v, i) => { pos[pr.k][v] = i; });
      });
      return [...(lista || this.vars)].sort((a, b) => {
        for (const k of ejes) {
          const ia = pos[k] && pos[k][a[k]] !== undefined ? pos[k][a[k]] : 999;
          const ib = pos[k] && pos[k][b[k]] !== undefined ? pos[k][b[k]] : 999;
          if (ia !== ib) return ia - ib;
        }
        return 0;
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
      { k: 'producto', label: 'Información general' },
      { k: 'costos', label: 'Compra y venta', costos: true },
      { k: 'inventario', label: 'Inventario' },
      { k: 'contabilidad', label: 'Contabilidad' },
      { k: 'produccion', label: 'Producción' },
      { k: 'documentos', label: 'Documentos' },
    ],
    _tab: 'producto',
    solapas() {
      // El vendedor ve sólo la primera, y de lectura: el catálogo es interno.
      if (global.App && global.App.rol === 'vendedor') return [this.SOLAPAS[0]];
      return this.SOLAPAS.filter(t => !t.costos || this.verCostos());
    },
    // Los números de costo sólo se ven en su solapa, y sólo si el rol puede.

    _tab: 'producto',
    // Qué módulos están abiertos. Adicionales arranca cerrado: es lo que menos
    // se toca.
    _abre: { mueble: true, catprop: true, variantes: true, adicionales: false },

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
      return this.modulo('mueble', 1, 'El mueble',
          this.p.nombre, this.bloqueNombre(), !!this.p.nombre)
        + this.modulo('catprop', 2, 'Categorías y propiedades',
          `${cs.map(c => c.nombre).join(' · ') || 'sin categoría'} — ${ps.length} ${ps.length === 1 ? 'propiedad' : 'propiedades'}`,
          this.bloqueCategorias(true) + '<div class="pd-sepl"></div>' + this.bloquePropiedades(true),
          cs.length > 0)
        + this.modulo('variantes', 3, 'Variantes',
          `${this.vars.length} ${this.vars.length === 1 ? 'variante' : 'variantes'} · ${this.activas().length} activas`,
          this.bloqueVariantes(true), this.vars.length > 0)
        + this.modulo('entrega', 4, 'Entrega',
          `${this.p.instalacion ? 'Requiere instalación' : 'Sin instalación'} · `
          + `${this.p.bultos || 1} ${(this.p.bultos || 1) === 1 ? 'bulto' : 'bultos'}`,
          this.bloqueEntrega(), true);
    },
    // El precio de EFECTIVO es el que se carga: es lo que realmente entra. El
    // de lista sale solo aplicándole el descuento al revés, y el margen y el
    // markup se miden contra el efectivo, no contra la lista.
    descEfectivo() { return global.DB.descuentoDe('efectivo') / 100; },
    listaDe(efectivo) {
      const d = this.descEfectivo();
      return d < 1 ? Math.round((Number(efectivo) || 0) / (1 - d)) : 0;
    },
    efectivoDe(v) {
      // Lo que hay guardado es el precio de lista; el efectivo se deriva.
      return v.efectivo != null ? v.efectivo : Math.round((Number(v.precio) || 0) * (1 - this.descEfectivo()));
    },

    tabCostos() {
      const ed = this.puedeEditar();
      const ejes = this.props();
      const f = this._fVar.trim().toLowerCase();
      const lista = this.ordenadas(this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f)));
      this._abiertos = this._abiertos || new Set();

      const fila = v => {
        const ef = this.efectivoDe(v);
        const mk = global.DB.markupDe(v.costo, ef);
        const mg = global.DB.margenDe(v.costo, ef);
        const banda = global.DB.bandaDe(mk);
        // Los números bajan de la plantilla de precios. Se muestran, no se
        // escriben: recién con el lápiz se pisan para esta variante.
        const abierto = this._abiertos.has(v.id);
        const celda = (attr, val) => abierto
          ? `<div class="cv-n"><input class="pn" inputmode="numeric" data-${attr}="${v.id}"
              value="${val || ''}" placeholder="—" ${ed ? '' : 'readonly'}></div>`
          : `<div class="cv-n"><span class="cv-fijo ${v.pisado ? 'pisado' : ''}"
              title="${v.pisado ? 'Pisado a mano en este mueble' : 'Viene de la plantilla de precios'}"
              >${val ? UI.pesos(val) : '—'}</span></div>`;
        return `<div class="cv-r ${v.activa === false ? 'off' : ''}" data-v="${v.id}">
          ${ejes.map(pr => `<div class="cv-p">${UI.esc(v[pr.k] || '—')}</div>`).join('')}
          ${celda('costo', v.costo)}
          ${celda('efec', ef)}
          <div class="cv-n"><span class="tnum" data-marg="${v.id}">${
            mg ? mg.toFixed(1).replace('.', ',') + ' %' : '—'}</span></div>
          <div class="cv-n"><span class="mk ${banda.pill}" data-mk="${v.id}">${
            mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—'}</span></div>
          <div class="cv-a">
            ${ed ? `<button class="lx ${abierto ? 'on' : ''}" data-editar="${v.id}"
              title="${abierto ? 'Listo' : 'Pisar el precio de esta variante'}">${abierto ? '✓' : '✏️'}</button>` : ''}
            <button class="lx" data-abrir="${v.id}" title="Ver todo">⋯</button>
          </div>
        </div>`;
      };

      const pisados = this.vars.filter(v => v.pisado).length;
      return `<section class="pd-b">
        <div class="banner info">El costo y el precio salen de la <b>plantilla de precios</b>, para no
          cargarlos mueble por mueble y poder compararlos entre productos parecidos. Acá se ven, y con
          el lápiz se pisan sólo para este mueble.
          <b>El módulo Precios todavía no está hecho</b> — se arma cuando cerremos esta parte.</div>

        <div class="pd-h" style="margin-top:12px">Costo y precio por variante
          <span class="muted">(${this.vars.length})</span>
          <span class="pill ${this.estado().pill}" style="float:right">${UI.esc(this.estado().label)}</span></div>
        <div class="vr-tools">
          <input id="pd-fvar" class="busca" placeholder="Filtrar…" value="${UI.esc(this._fVar)}">
          <div class="sp"></div>
          <span class="hint">${pisados
            ? `<b>${pisados}</b> ${pisados === 1 ? 'pisada' : 'pisadas'} a mano`
            : 'Todas vienen de la plantilla'}</span>
        </div>
        <div class="cv-tabla" style="--ejes:${ejes.length}">
          <div class="cv-h">
            ${ejes.map(pr => `<span>${UI.esc(pr.nombre)}</span>`).join('')}
            <span class="num">Costo</span><span class="num">P. efectivo</span>
            <span class="num">Margen</span><span class="num">Markup</span><span></span>
          </div>
          <div id="pd-vars">${lista.map(fila).join('') || UI.vacio('Ninguna variante coincide.')}</div>
        </div>
        <div class="hint" style="margin-top:9px">El <b>precio de lista</b> y la <b>medida de costeo</b>
          están en el panel de cada variante: se abre con los tres puntitos.</div>
      </section>`;
    },

    // Cómo se rastrea el stock de este mueble y cuánto hay que tener.
    RASTREO: [
      { k: 'serie', label: 'Por número de serie único',
        pie: 'Cada unidad es distinta y lleva su código. Si hay 12 mesas de luz Miami blancas, son 12 unidades distintas y se sabe cuál salió en cada orden.' },
      { k: 'lote', label: 'Por lotes',
        pie: 'Las unidades de una misma tanda comparten identificación. Sirve cuando lo que importa es de qué producción salió, no cuál pieza.' },
      { k: 'cantidad', label: 'Por cantidad',
        pie: 'Sólo se cuenta cuántas hay. No se puede saber cuál se entregó ni de qué tanda salió.' },
    ],
    // Los que se reponen contra pedido no llevan mínimo: el mínimo y la
    // reposición van de la mano y no tienen sentido por separado.
    REPO: [
      { k: 'pedido', label: 'Se pide cuando se vende' },
      { k: 'minimo', label: 'Mantener un mínimo' },
    ],

    // Cómo se rastrea el stock de este mueble y cuánto hay que tener.
    RASTREO: [
      { k: 'serie', label: 'Por número de serie único',
        pie: 'Cada unidad es distinta y lleva su código. Si hay 12 mesas de luz Miami blancas, son 12 unidades distintas y se sabe cuál salió en cada orden.' },
      { k: 'lote', label: 'Por lotes',
        pie: 'Las unidades de una misma tanda comparten identificación. Sirve cuando lo que importa es de qué producción salió, no cuál pieza.' },
      { k: 'cantidad', label: 'Por cantidad',
        pie: 'Sólo se cuenta cuántas hay. No se puede saber cuál se entregó ni de qué tanda salió.' },
    ],
    // Los que se reponen contra pedido no llevan mínimo: el mínimo y la
    // reposición van de la mano y no tienen sentido por separado.
    REPO: [
      { k: 'pedido', label: 'Se pide cuando se vende' },
      { k: 'minimo', label: 'Mantener un mínimo' },
    ],


    // 2 · Fotos ------------------------------------------------------------
    // Todos los archivos del mueble en un solo lugar: fotos de venta, planos de
    // producción, folletos. Van a ser muchos, así que tienen su propia solapa y
    // no se mezclan con la información del mueble. Desde acá se elige cuál usa
    // cada variante.
    TIPOS: [
      { k: 'venta', label: 'Venta', icono: '📷' },
      { k: 'produccion', label: 'Producción', icono: '📐' },
      { k: 'otro', label: 'Otro', icono: '📄' },
    ],
    // Cómo se entrega. Es una característica del mueble, así que va en
    // Información general y no en Otros.
    bloqueEntrega() {
      const p = this.p, ed = this.puedeEditar();
      return `<label class="chk"><input type="checkbox" id="pd-inst" ${p.instalacion ? 'checked' : ''}
          ${ed ? '' : 'disabled'}> Requiere instalación</label>
        <div class="hint">${p.instalacion
          ? 'En la orden va a saltar solo, con <b>a convenir</b>; el costo se define en Instalaciones, no acá.'
          : 'En la orden sale <b>no requiere instalación</b> por default, y el vendedor puede editarlo.'}</div>
        <div class="fr" style="margin-top:11px"><label for="pd-bultos">Bultos para el embalaje</label>
          <input id="pd-bultos" inputmode="numeric" value="${UI.esc(p.bultos || '')}"
            placeholder="1" ${ed ? '' : 'readonly'}></div>
        <div class="fr"><label></label><span class="hint">En cuántos bultos viaja una unidad. Es lo que
          usa la subida por escalera, que se cobra por piso y por bulto.</span></div>`;
    },

    // Cómo se rastrea el stock de este mueble y cuánto hay que tener.
    RASTREO: [
      { k: 'serie', label: 'Por número de serie único',
        pie: 'Cada unidad es distinta y lleva su código. Si hay 12 mesas de luz Miami blancas, son 12 unidades distintas y se sabe cuál salió en cada orden.' },
      { k: 'lote', label: 'Por lotes',
        pie: 'Las unidades de una misma tanda comparten identificación. Sirve cuando lo que importa es de qué producción salió, no cuál pieza.' },
      { k: 'cantidad', label: 'Por cantidad',
        pie: 'Sólo se cuenta cuántas hay. No se puede saber cuál se entregó ni de qué tanda salió.' },
    ],
    // Los que se reponen contra pedido no llevan mínimo: el mínimo y la
    // reposición van de la mano y no tienen sentido por separado.
    REPO: [
      { k: 'pedido', label: 'Se pide cuando se vende' },
      { k: 'minimo', label: 'Mantener un mínimo' },
    ],

    tabInventario() {
      const p = this.p, ed = this.puedeEditar();
      const modo = p.rastreo || 'serie';
      const obt = p.obtencion || 'dibujo';
      const cual = global.DB.OBTENCION.find(x => x.k === obt) || global.DB.OBTENCION[0];
      const elegido = this.RASTREO.find(x => x.k === modo) || this.RASTREO[0];
      const conMin = this.vars.filter(v => (v.minStock || 0) > 0);
      const faltan = conMin.filter(v => (v.stock || 0) < v.minStock);
      const lista = this.ordenadas();

      return `<section class="pd-b">
        <div class="pd-h">Cómo se le pide al proveedor</div>
        <div class="fr"><label for="pd-obt">Se pide</label>
          <select id="pd-obt" ${ed ? '' : 'disabled'}>${global.DB.OBTENCION.map(x =>
            `<option value="${x.k}" ${obt === x.k ? 'selected' : ''}>${UI.esc(x.label)}</option>`).join('')}</select></div>
        <div class="fr"><label></label><span class="hint">${UI.esc(cual.pie)}</span></div>
        ${obt !== 'planilla' && !this.vars.every(v => v.imgProd)
          ? `<div class="banner warn" style="margin-top:9px">Se pide por dibujo y
             <b>${this.vars.filter(v => !v.imgProd).length}</b> de ${this.vars.length} variantes no tienen
             el plano cargado. Se suben en <b>Producción</b>.</div>` : ''}
        <div class="hint" style="margin-top:9px">Cuántos proveedores hacen falta y quiénes son se
          define en <b>Producción → Quién lo fabrica</b>.</div>
        <div class="pd-sepl"></div>
        <div class="fr"><label for="pd-track">Cómo se rastrea el stock</label>
          <select id="pd-track" ${ed ? '' : 'disabled'}>${this.RASTREO.map(x =>
            `<option value="${x.k}" ${modo === x.k ? 'selected' : ''}>${UI.esc(x.label)}</option>`).join('')}</select></div>
        <div class="fr"><label></label><span class="hint">${UI.esc(elegido.pie)}${modo === 'serie'
          ? ' Cada unidad va a necesitar su <b>código de barras</b>; falta definir cómo se numeran.' : ''}</span></div>
      </section>

      <section class="pd-b">
        <div class="pd-h">Stock por variante</div>
        <div class="inv-tabla">
          <div class="inv-head">
            <span>Variante</span><span class="num">Stock</span>
            <span class="num">Stock mínimo deseado</span><span></span>
          </div>
          ${lista.map(v => {
            const min = Number(v.minStock) || 0;
            const falta = min > 0 && (v.stock || 0) < min;
            return `<div class="inv-r ${v.activa === false ? 'off' : ''}">
              <div><b>${UI.esc(this.nombreVar(v))}</b>
                <div class="vr-sku tnum">${UI.esc(v.sku || global.DB.skuDe(this.p, v))}</div></div>
              <div class="num"><input class="pn" inputmode="numeric" data-stock="${v.id}"
                value="${v.stock || 0}" ${ed ? '' : 'readonly'}></div>
              <div class="num"><input class="pn" inputmode="numeric" data-min="${v.id}"
                value="${min || ''}" placeholder="—" ${ed ? '' : 'readonly'}></div>
              <div>${falta
                ? `<span class="pill warn">faltan ${min - (v.stock || 0)}</span>`
                : (min ? '<span class="pill ok">cubierto</span>' : '')}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="hint" style="margin-top:9px">Todo se repone cuando se vende. El <b>mínimo deseado</b>
          es aparte: lo que querés tener siempre en el depósito, aunque nadie lo haya pedido.</div>
        ${conMin.length ? `<div class="banner ${faltan.length ? 'warn' : 'info'}" style="margin-top:10px">
          ${faltan.length
            ? `<b>${faltan.length}</b> ${faltan.length === 1 ? 'variante está' : 'variantes están'} por debajo del mínimo.
               Cuando enganchemos <b>Producción</b>, esto va a generar el pedido solo.`
            : `<b>${conMin.length}</b> ${conMin.length === 1 ? 'variante tiene' : 'variantes tienen'} mínimo y
               ${conMin.length === 1 ? 'está cubierta' : 'están cubiertas'}.`}
        </div>` : ''}
      </section>`;
    },

    bloqueQuienFabrica() {
      const p = this.p, ed = this.puedeEditar();
      const n = Math.min(3, Math.max(1, Number(p.nProveedores) || 1));
      const rubros = this.rubrosDe();
      const sinDefinir = rubros.filter(x => !x).length;

      const campo = i => {
        const k = rubros[i];
        const pares = k ? global.DB.proveedores(k) : [];
        return `<div class="rb">
          <div class="fr">
            <label for="pd-rubro-${i}">${n === 1 ? 'Se le pide a' : `Rubro ${i + 1}`}</label>
            <select id="pd-rubro-${i}" data-rubro="${i}" ${ed ? '' : 'disabled'}>
              <option value="">Elegir…</option>
              ${global.DB.RUBROS.map(r => `<option value="${r.k}" ${k === r.k ? 'selected' : ''}
                >${UI.esc(r.label)}</option>`).join('')}
            </select></div>
          ${k ? `<div class="fr"><label></label><div class="rb-pares">
            ${pares.map(x => `<span class="chip">${UI.esc(x.nombre)}
              <small class="muted">${x.capacidad}/sem</small></span>`).join('')
              || '<span class="hint">Todavía no hay nadie cargado en este rubro.</span>'}
            ${ed ? `<button class="chip-add" data-nuevoprov="${k}">＋ proveedor</button>` : ''}
          </div></div>
          <div class="fr"><label></label><span class="hint">Los <b>${pares.length}</b> de este rubro son
            <b>pares</b>: ninguno es mejor que otro, sólo cambia cuánto entrega por semana. Entre todos,
            <b>${global.DB.capacidadRubro(k)}</b> unidades semanales.</span></div>` : ''}
        </div>`;
      };

      return `<section class="pd-b">
        <div class="pd-h">Quién lo fabrica</div>
        <div class="segm">${[1, 2, 3].map(x => `
          <button class="seg ${n === x ? 'on' : ''}" data-nprov="${x}" ${ed ? '' : 'disabled'}>
            ${x} ${x === 1 ? 'rubro' : 'rubros'}</button>`).join('')}</div>
        <div class="hint" style="margin:7px 0 11px">${n === 1
          ? 'Un solo rubro lo entrega terminado.'
          : `Hacen falta <b>${n}</b> para terminarlo. Ej: el módulo laqueado lo hace carpintería y las patas, herrería.`}</div>

        ${Array.from({ length: n }, (_, i) => campo(i)).join('')}

        ${sinDefinir ? `<div class="banner warn">Falta${sinDefinir === 1 ? '' : 'n'} definir
          <b>${sinDefinir}</b> ${sinDefinir === 1 ? 'rubro' : 'rubros'}. Producción no va a poder armar
          el pedido completo.</div>` : ''}
        <div class="hint" style="margin-top:8px">El pedido va dirigido al <b>rubro</b>, no a una
          persona: adentro se reparte según la capacidad de cada uno. El orden importa — el
          <b>rubro 1</b> recibe el primer plano y la primera columna de la planilla.</div>
      </section>`;
    },

    // El concepto que va en la factura sale solo: la categoría del mueble más
    // "con medidas solicitadas", que es como se factura siempre.
    conceptoDefault() {
      const cat = (this.cats()[0] || {}).nombre || this.p.nombre || '';
      return `${cat} con medidas solicitadas`;
    },

    tabContabilidad() {
      const p = this.p, c = p.contabilidad || {}, ed = this.puedeEditar();
      const auto = this.conceptoDefault();
      return `<section class="pd-b">
        <div class="pd-h">Concepto de facturación</div>
        <div class="fr"><label for="pd-cfact">Concepto</label>
          <input id="pd-cfact" value="${UI.esc(p.conceptoFactura || '')}"
            placeholder="${UI.esc(auto)}" ${ed ? '' : 'readonly'}></div>
        <div class="fr"><label></label><span class="hint">En blanco sale <b>${UI.esc(auto)}</b> — la
          categoría del mueble más "con medidas solicitadas". Se pisa sólo si este mueble se factura
          distinto.</span></div>
        <div class="pd-sepl"></div>
        <div class="fr"><label for="pd-iva">IVA</label>
          <select id="pd-iva" ${ed ? '' : 'disabled'}>
            <option value="21" ${String(p.iva ?? 21) === '21' ? 'selected' : ''}>21 %</option>
            <option value="10.5" ${String(p.iva) === '10.5' ? 'selected' : ''}>10,5 %</option>
            <option value="0" ${String(p.iva) === '0' ? 'selected' : ''}>Exento</option>
          </select></div>
      </section>

      <section class="pd-b">
        <div class="pd-h">Imputación contable</div>
        <div class="banner info">El <b>plan de cuentas</b> todavía no está cargado. Cuando esté, estos
          dos campos van a ser una lista para elegir, y en blanco heredan la cuenta de la categoría.</div>
        <div class="fr"><label for="pd-cta-v">Cuenta de ingreso</label>
          <input id="pd-cta-v" value="${UI.esc(c.ingresos || '')}" placeholder="De la categoría"
            ${ed ? '' : 'readonly'}></div>
        <div class="fr"><label></label><span class="hint">A dónde va la plata cuando se vende este
          mueble.</span></div>
        <div class="fr" style="margin-top:9px"><label for="pd-cta-c">Cuenta de gasto</label>
          <input id="pd-cta-c" value="${UI.esc(c.gastos || '')}" placeholder="De la categoría"
            ${ed ? '' : 'readonly'}></div>
        <div class="fr"><label></label><span class="hint">Contra qué cuenta se imputa cuando se compra
          o se fabrica.</span></div>
      </section>

      <section class="pd-b">
        <div class="pd-h">Visibilidad</div>
        <label class="chk"><input type="checkbox" id="pd-pub" ${p.publicado ? 'checked' : ''}
          ${ed ? '' : 'disabled'}> Mostrar a los vendedores</label>
        <div class="hint">El vendedor ve sólo <b>Información general</b> y de lectura: el resto
          —costos, proveedores, planos— es interno. Cada variante además se puede mostrar o esconder
          por separado.</div>
      </section>`;
    },

    // Cómo se rastrea el stock de este mueble y cuánto hay que tener.
    RASTREO: [
      { k: 'serie', label: 'Por número de serie único',
        pie: 'Cada unidad es distinta y lleva su código. Si hay 12 mesas de luz Miami blancas, son 12 unidades distintas y se sabe cuál salió en cada orden.' },
      { k: 'lote', label: 'Por lotes',
        pie: 'Las unidades de una misma tanda comparten identificación. Sirve cuando lo que importa es de qué producción salió, no cuál pieza.' },
      { k: 'cantidad', label: 'Por cantidad',
        pie: 'Sólo se cuenta cuántas hay. No se puede saber cuál se entregó ni de qué tanda salió.' },
    ],
    // Los que se reponen contra pedido no llevan mínimo: el mínimo y la
    // reposición van de la mano y no tienen sentido por separado.
    REPO: [
      { k: 'pedido', label: 'Se pide cuando se vende' },
      { k: 'minimo', label: 'Mantener un mínimo' },
    ],


    // Lo que necesita fábrica: el plano de cada variante y cómo se hace.
    tabProduccion() {
      const obt = this.p.obtencion || 'dibujo';
      return this.bloqueQuienFabrica()
        + (obt !== 'planilla' ? this.bloquePlanos() : '')
        + (obt !== 'dibujo' ? this.bloquePlanilla() : '')
        + this.bloqueComoSeHace();
    },

    // Los rubros a los que se les pide, en orden: el primero recibe el primer
    // plano y la primera columna de la planilla.
    rubrosDe() {
      const n = Math.min(3, Math.max(1, Number(this.p.nProveedores) || 1));
      return Array.from({ length: n }, (_, i) => (this.p.rubros || [])[i] || '');
    },
    nombreRubro(k) { const r = global.DB.rubro(k); return r ? r.label : 'Sin definir'; },

    // ---- Un plano por rubro -------------------------------------------------
    bloquePlanos() {
      const rubros = this.rubrosDe();
      const lista = this.ordenadas();
      const falta = i => lista.filter(v => !(v.planos || [])[i]).length;
      const celda = (v, i) => {
        const ref = (v.planos || [])[i] || (i === 0 ? v.imgProd : '');
        const url = this.urlDe(ref) || ref;
        return `<button class="vimg ${url ? 'hay' : ''}" data-plano="${v.id}|${i}"
          title="Plano para ${UI.esc(this.nombreRubro(rubros[i]))}">
          ${url ? `<img src="${UI.esc(url)}" alt="">` : '<span class="vimg-v">📐</span>'}
          <span class="vimg-e">✎</span></button>`;
      };
      return `<section class="pd-b">
        <div class="pd-h">Planos por variante</div>
        <div class="hint" style="margin-bottom:11px">${rubros.length === 1
          ? 'Un plano por variante: es la hoja que se le manda al rubro.'
          : 'Un plano <b>por rubro</b>. Cuando se pide el mueble a cada uno le va el suyo: el de carpintería no es el de herrería.'}</div>
        <div class="pl-tabla" style="--n:${rubros.length}">
          <div class="pl-h"><span>Variante</span>
            ${rubros.map((r, i) => `<span>${UI.esc(this.nombreRubro(r))}
              ${falta(i) ? `<b class="warn-t">· faltan ${falta(i)}</b>` : ''}</span>`).join('')}</div>
          ${lista.map(v => `<div class="pl-r">
            <div><b>${UI.esc(this.nombreVar(v))}</b>
              <div class="vr-sku tnum">${UI.esc(v.sku || global.DB.skuDe(this.p, v))}</div></div>
            ${rubros.map((r, i) => `<div>${celda(v, i)}</div>`).join('')}
          </div>`).join('')}
        </div>
        <div class="hint" style="margin-top:9px">Acepta imagen o PDF. Sale de los archivos de
          <b>producción</b> de Documentos. No aparece nunca en la cotización del cliente.</div>
      </section>`;
    },

    // ---- La planilla de pedido ----------------------------------------------
    // Se diseña una vez: qué columnas lleva y de dónde sale cada una. Por eso
    // después cada venta se convierte en un renglón sola.
    planillaDe() {
      if (this.p.planilla) return this.p.planilla;
      return [
        { label: 'ESTADO', origen: 'orden' },
        { label: 'MODELO', origen: 'producto', campo: 'nombre' },
        ...this.props().map(pr => ({ label: pr.nombre, origen: 'propiedad', campo: pr.k })),
        { label: 'CANT.', origen: 'cantidad' },
        { label: 'OBS', origen: 'libre' },
      ];
    },
    valorPlanilla(col, v) {
      if (col.origen === 'orden') return '#S00021';
      if (col.origen === 'producto') return col.campo === 'sku' ? (this.p.sku || '') : this.p.nombre;
      if (col.origen === 'propiedad') return v[col.campo] || '';
      if (col.origen === 'cantidad') return '1';
      return '';
    },

    bloquePlanilla() {
      const cols = this.planillaDe();
      const ed = this.puedeEditar();
      const lista = this.ordenadas().slice(0, 4);
      const rubros = this.rubrosDe().filter(Boolean).map(r => this.nombreRubro(r));
      return `<section class="pd-b">
        <div class="pd-h">Planilla de pedido</div>
        <div class="hint" style="margin-bottom:11px">Cómo se le pide este mueble${rubros.length
          ? ` a <b>${UI.esc(rubros.join(' y '))}</b>` : ''}. Cada columna dice de dónde sale su valor,
          y por eso el renglón se llena solo cuando se vende.</div>
        <div class="pl-cols">
          ${cols.map((c, i) => `<div class="pl-col" draggable="${ed}" data-col="${i}">
            ${ed ? '<span class="vr-drag">⠿</span>' : ''}
            <input class="pl-lbl" data-collbl="${i}" value="${UI.esc(c.label)}" ${ed ? '' : 'readonly'}>
            <select data-colorig="${i}" ${ed ? '' : 'disabled'}>${global.DB.ORIGENES.map(o =>
              `<option value="${o.k}" ${c.origen === o.k ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}</select>
            ${c.origen === 'propiedad' ? `<select data-colcampo="${i}" ${ed ? '' : 'disabled'}>${
              this.props().map(pr => `<option value="${pr.k}" ${c.campo === pr.k ? 'selected' : ''}
                >${UI.esc(pr.nombre)}</option>`).join('')}</select>` : ''}
            ${c.origen === 'producto' ? `<select data-colcampo="${i}" ${ed ? '' : 'disabled'}>
              <option value="nombre" ${c.campo === 'nombre' ? 'selected' : ''}>Nombre</option>
              <option value="sku" ${c.campo === 'sku' ? 'selected' : ''}>Código</option></select>` : ''}
            ${ed ? `<button class="lx" data-quitarcol="${i}" title="Quitar">✕</button>` : ''}
          </div>`).join('')}
        </div>
        ${ed ? '<button class="btn" id="pl-add" style="margin-top:9px">⊞ Agregar columna</button>' : ''}
        <div class="pd-sepl"></div>
        <div class="ad-t">Así se va a ver el pedido</div>
        <div class="pl-prev"><table>
          <thead><tr>${cols.map(c => `<th>${UI.esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${lista.map(v => `<tr>${cols.map(c =>
            `<td class="${c.origen === 'libre' ? 'muted' : ''}">${UI.esc(this.valorPlanilla(c, v) || '—')}</td>`
          ).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <div class="hint" style="margin-top:8px">Renglones de ejemplo con las primeras variantes. Cuando
          se venda una sale igual pero con el número de venta real; si es para reponer stock, en
          <b>ESTADO</b> va a decir STOCK.</div>
      </section>`;
    },

    bloqueComoSeHace() {
      const ed = this.puedeEditar();
      return `<section class="pd-b">
        <div class="pd-h">Cómo se hace</div>
        <label class="lbl-t" for="pd-mat">Materiales y herrajes</label>
        <textarea id="pd-mat" class="pd-des" rows="2" ${ed ? '' : 'readonly'}
          placeholder="MDF 18 mm · guías telescópicas · bisagras con freno">${UI.esc(this.p.materiales || '')}</textarea>
        <label class="lbl-t" for="pd-notaprod" style="margin-top:11px">Notas para fábrica</label>
        <textarea id="pd-notaprod" class="pd-des" rows="2" ${ed ? '' : 'readonly'}
          placeholder="Lo que hay que tener en cuenta al fabricarlo.">${UI.esc(this.p.notaProd || '')}</textarea>
      </section>`;
    },


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
    // Todos los archivos del mueble en un solo lugar: fotos de venta, planos de
    // producción, folletos. Van a ser muchos, así que tienen su propia solapa y
    // no se mezclan con la información del mueble. Desde acá se elige cuál usa
    // cada variante.
    TIPOS: [
      { k: 'venta', label: 'Venta', icono: '📷' },
      { k: 'produccion', label: 'Producción', icono: '📐' },
      { k: 'otro', label: 'Otro', icono: '📄' },
    ],
    archivos(tipo) {
      const a = this.p.archivos || [];
      return tipo ? a.filter(x => x.tipo === tipo) : a;
    },
    // Dónde está usado un archivo, para no borrar algo que está en uso.
    usoDe(id) {
      return this.vars.filter(v => v.imgVenta === id || v.imgProd === id).length;
    },
    urlDe(id) {
      const a = (this.p.archivos || []).find(x => x.id === id);
      return a ? a.url : '';
    },

    tabDocumentos() {
      const ed = this.puedeEditar();
      const grupo = t => {
        const fs = this.archivos(t.k);
        return `<section class="pd-b">
          <div class="pd-h">${t.icono} ${UI.esc(t.label)} <span class="muted">(${fs.length})</span></div>
          ${ed ? `<div class="dropz chico" data-drop="${t.k}">
            <div class="dz-t">＋ Arrastrá acá, o hacé clic para subir</div>
            <input type="file" data-file="${t.k}" accept="image/*,application/pdf,video/*" multiple hidden>
          </div>` : ''}
          <div class="docs">${fs.map(f => `<div class="doc">
            <div class="doc-im">${/^data:image|\.(png|jpe?g|webp|svg)$/i.test(f.url)
              ? `<img src="${UI.esc(f.url)}" alt="${UI.esc(f.nombre)}">` : t.icono}</div>
            <div class="doc-n" title="${UI.esc(f.nombre)}">${UI.esc(f.nombre)}</div>
            <div class="doc-u">${this.usoDe(f.id)
              ? `<span class="pill info">en ${this.usoDe(f.id)} ${this.usoDe(f.id) === 1 ? 'variante' : 'variantes'}</span>`
              : '<span class="pill soft">sin usar</span>'}</div>
            ${ed ? `<div class="doc-a">
              <select data-tipo="${f.id}">${this.TIPOS.map(x =>
                `<option value="${x.k}" ${f.tipo === x.k ? 'selected' : ''}>${UI.esc(x.label)}</option>`).join('')}</select>
              <button class="lx" data-borrar="${f.id}" title="Borrar">🗑</button>
            </div>` : ''}
          </div>`).join('') || '<div class="hint">Todavía no hay archivos de este tipo.</div>'}</div>
        </section>`;
      };
      return `<div class="banner info">Los archivos se guardan en el <b>Storage del sistema</b>, no adentro
        de la cotización. Desde la solapa Información general, cada variante elige cuál de estos usa
        como imagen de venta, y desde Producción cuál usa como plano.</div>`
        + this.TIPOS.map(grupo).join('');
    },

    // Sube archivos a la biblioteca del mueble.
    subir(files, tipo) {
      [...(files || [])].forEach(f => {
        const r = new FileReader();
        r.onload = () => {
          this.p.archivos = this.p.archivos || [];
          this.p.archivos.push({
            id: 'a' + (Math.max(0, ...this.p.archivos.map(x => Number(String(x.id).slice(1)) || 0)) + 1),
            nombre: f.name, url: r.result, tipo: tipo || 'otro',
          });
          this.guardar(); this.pintar();
        };
        r.readAsDataURL(f);
      });
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
          <div class="prow" draggable="${ed}" data-orden="${UI.esc(p.k)}">
            ${ed ? '<span class="prow-drag" title="Arrastrar para cambiar el orden">⠿</span>' : ''}
            <div class="prow-i">
              <div class="prow-n">${UI.esc(p.nombre)}</div>
              <div class="chips" data-vals="${UI.esc(p.k)}">${p.usados.map(v =>
                `<span class="chip val" draggable="${ed}" data-val="${UI.esc(v)}"
                  ${ed ? 'title="Arrastrá para cambiar el orden"' : ''}
                  >${ed ? '<span class="chip-drag">⠿</span>' : ''}${UI.esc(v)}</span>`).join('')
                || '<span class="hint">Sin valores todavía.</span>'}
                ${ed ? `<button class="chip-add" data-addv="${UI.esc(p.k)}">＋ Agregar</button>` : ''}</div>
            </div>
            <button class="prow-go" data-prop="${UI.esc(p.k)}"
              title="Editar ${UI.esc(p.nombre)}">›</button>
          </div>`).join('') || '<div class="hint">Este mueble todavía no tiene propiedades.</div>'}
        </div>
        ${ed && ps.length ? '<div class="hint" style="margin-top:7px">Arrastrá una <b>propiedad</b> o un '
          + '<b>valor</b> para cambiar el orden: es el que ordena las variantes de abajo.</div>' : ''}
        ${ed ? `<div class="prow-add">
          <button class="btn" id="pd-addprop">⊕ Agregar propiedad</button>
        </div>` : ''}
        ${n ? `<div class="prop-pie"><div class="combo"><b class="tnum">${n}</b> combinaciones posibles
          ${this.vars.length !== n ? `<span class="muted">· ${this.vars.length} creadas</span>` : ''}</div></div>` : ''}
      </${dentro ? 'div' : 'section'}>`;
    },

    // 5 · Listado de variantes ---------------------------------------------
    bloqueVariantes(dentro) {
      const f = this._fVar.trim().toLowerCase();
      const lista = this.ordenadas(this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f)));
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
        <div class="vr-tabla">
        <div class="vr-head ${cost ? 'concosto' : ''}">
          <span>Imagen</span><span>Variante</span>
          <span class="num">Largo</span><span class="num">Alto</span>
          <span class="num">Prof.</span><span class="num">Peso</span>
          <span></span>
        </div>
        <div id="pd-vars">${lista.map(v => this.filaVar(v, cost)).join('')
          || UI.vacio('Ninguna variante coincide con el filtro.')}</div>
        </div>
      </${dentro ? 'div' : 'section'}>`;
    },

    // "MEDIDAS 1.60 · ESTRUCTURA PARAÍSO · FRENTE BLANCO". Si el valor ya
    // arranca con el nombre de la propiedad no se repite: "ESTRUCTURA BLANCA"
    // queda así y no "ESTRUCTURA ESTRUCTURA BLANCA".
    nombreVar(v) {
      const ps = this.props();
      return (this.p.propiedades || []).map(k => {
        const val = v[k]; if (!val) return null;
        const pr = ps.find(x => x.k === k) || { nombre: k.toUpperCase() };
        const corto = String(pr.nombre).split(' ')[0];
        return String(val).toUpperCase().startsWith(corto) ? val : `${corto} ${val}`;
      }).filter(Boolean).join(' · ');
    },

    filaVar(v, cost) {
      const off = v.activa === false;
      // 2 × 2 cm en pantalla: se ve de qué mueble se trata sin abrir nada.
      const img = (ref, k, tit) => { const url = this.urlDe(ref) || ref;
        return `<button class="vimg ${url ? 'hay' : ''}" data-img="${v.id}|${k}" title="${tit}">
        ${url ? `<img src="${UI.esc(url)}" alt="">` : `<span class="vimg-v">${k === 'imgProd' ? '📐' : '📷'}</span>`}
        <span class="vimg-e">✎</span></button>`; };
      // Debajo de cada medida aparece "Aplicar a todas" apenas se escribe algo:
      // el alto y la profundidad casi siempre son iguales en todas las
      // variantes, y cargarlos de a uno en 27 filas no tiene sentido.
      const campo = (attr, val, uni) => `<div class="vr-x">
        <div class="vr-xi"><input inputmode="decimal" class="pn"
          data-${attr}="${v.id}" value="${val || ''}" placeholder="—" ${this.puedeEditar() ? '' : 'readonly'}
          >${uni ? `<span class="uni">${uni}</span>` : ''}</div>
        <button class="aplic" data-aplic="${attr}|${v.id}" hidden>⊞ Aplicar a todas</button>
      </div>`;
      // Acá van las características del mueble y nada más: el plano vive en
      // Producción y el stock en Inventario.
      return `<div class="vr ${off ? 'off' : ''}" data-v="${v.id}">
        ${img(v.imgVenta, 'imgVenta', 'Imagen de venta — sale impresa en la cotización')}
        <div class="vr-n">
          <button class="vr-nom" data-abrir="${v.id}">${UI.esc(this.nombreVar(v))}</button>
          <div class="vr-sku tnum">${UI.esc(v.sku || global.DB.skuDe(this.p, v))}${
            off ? ' · <b class="warn-t">desactivada</b>' : ''}</div>
        </div>
        ${campo('largo', v.frenteCm, 'cm')}${campo('alto', v.alto, 'cm')}
        ${campo('prof', v.prof, 'cm')}${campo('peso', v.peso, 'kg')}
        <div class="vr-a">
          <button class="lx" data-hist="${v.id}" title="Historial">↺</button>
        </div>
      </div>`;
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
      document.querySelectorAll('[data-drop]').forEach(dz => {
        const tipo = dz.dataset.drop;
        const file = document.querySelector(`[data-file="${tipo}"]`);
        dz.onclick = () => file.click();
        dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); };
        dz.ondragleave = () => dz.classList.remove('on');
        dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); this.subir(e.dataTransfer.files, tipo); };
        file.onchange = () => this.subir(file.files, tipo);
      });
      document.querySelectorAll('[data-tipo]').forEach(sl => sl.onchange = () => {
        const a = (p.archivos || []).find(x => x.id === sl.dataset.tipo);
        if (a) { a.tipo = sl.value; this.guardar(); this.pintar(); }
      });
      document.querySelectorAll('[data-borrar]').forEach(b => b.onclick = () => {
        const id = b.dataset.borrar, uso = this.usoDe(id);
        if (uso) return UI.aviso(`No se puede: está en ${uso} ${uso === 1 ? 'variante' : 'variantes'}`, 'warn');
        p.archivos = (p.archivos || []).filter(x => x.id !== id);
        this.guardar(); this.pintar();
      });

      if (g('pd-edcat')) g('pd-edcat').onclick = () => this.modalCategorias();
      document.querySelectorAll('[data-prop]').forEach(b =>
        b.onclick = () => this.abrirPropiedad(b.dataset.prop));
      document.querySelectorAll('[data-addv]').forEach(b =>
        b.onclick = () => this.agregarValores(b.dataset.addv));
      this.arrastrarPropiedades();
      this.arrastrarValores();
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

      const obt = g('pd-obt');
      if (obt && ed) obt.onchange = () => { p.obtencion = obt.value; this.guardar(); this.pintar(); };
      document.querySelectorAll('[data-nprov]').forEach(b => b.onclick = () => {
        p.nProveedores = Number(b.dataset.nprov);
        // Si baja la cantidad, los rubros que sobran se descartan.
        p.rubros = (p.rubros || []).slice(0, p.nProveedores);
        this.guardar(); this.pintar();
      });
      document.querySelectorAll('[data-rubro]').forEach(sl => sl.onchange = () => {
        p.rubros = p.rubros || [];
        p.rubros[Number(sl.dataset.rubro)] = sl.value;
        this.guardar(); this.pintar();
      });
      document.querySelectorAll('[data-nuevoprov]').forEach(b => b.onclick = () =>
        this.modalProveedor(b.dataset.nuevoprov));
      document.querySelectorAll('[data-plano]').forEach(b => b.onclick = () => {
        const [id, i] = b.dataset.plano.split('|');
        this.elegirPlano(Number(id), Number(i));
      });
      this.engancharPlanilla();
      if (g('pd-inst') && ed) g('pd-inst').onchange = e => {
        p.instalacion = e.target.checked; this.guardar(); this.pintar();
      };
      const track = g('pd-track');
      if (track && ed) track.onchange = () => { p.rastreo = track.value; this.guardar(); this.pintar(); };
      const numv = (attr, campo) => document.querySelectorAll(`[data-${attr}]`).forEach(i => {
        i.onchange = () => {
          const v = this.vars.find(x => x.id === Number(i.dataset[attr])); if (!v) return;
          v[campo] = Math.max(0, Number(String(i.value).replace(/[^\d]/g, '')) || 0);
          global.DB.guardarVariante(v);
        };
      });
      numv('stock', 'stock'); numv('min', 'minStock');
      document.querySelectorAll('[data-rep]').forEach(sl => sl.onchange = () => {
        const v = this.vars.find(x => x.id === Number(sl.dataset.rep)); if (!v) return;
        v.reponer = sl.value;
        // Si deja de mantener mínimo, el número que hubiera quedado no sirve.
        if (v.reponer !== 'minimo') v.minStock = 0;
        global.DB.guardarVariante(v); this.pintar();
      });
      // El mínimo es sólo un número. La reposición se deriva de él, porque el
      // resto del sistema ya la mira: con mínimo cargado la variante se
      // repone sola, sin mínimo se pide cuando se vende.
      document.querySelectorAll('[data-min]').forEach(i => {
        if (!ed) return;
        i.onchange = () => {
          const v = this.vars.find(x => x.id === Number(i.dataset.min)); if (!v) return;
          v.minStock = Math.max(0, Number(String(i.value).replace(/[^\d]/g, '')) || 0);
          v.reponer = v.minStock > 0 ? 'minimo' : 'pedido';
          global.DB.guardarVariante(v); this.pintar();
        };
      });
      ['pd-iva', 'pd-cfact', 'pd-mat', 'pd-notaprod'].forEach(id => {
        const el = g(id); if (!el || !ed) return;
        const campo = { 'pd-iva': 'iva', 'pd-cfact': 'conceptoFactura',
          'pd-mat': 'materiales', 'pd-notaprod': 'notaProd' }[id];
        el.onchange = () => { p[campo] = el.value.trim(); this.guardar(); };
      });
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
        this.elegirImagenVar(Number(id), campo);
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
      // El efectivo es lo que se carga; la lista, el margen y el markup se
      // recalculan en la misma fila sin repintar toda la tabla.
      const refrescarCV = v => {
        const ef = this.efectivoDe(v);
        const mk = global.DB.markupDe(v.costo, ef), mg = global.DB.margenDe(v.costo, ef);
        const q = (a) => document.querySelector(`[data-${a}="${v.id}"]`);
        if (q('lista')) q('lista').textContent = UI.pesos(this.listaDe(ef));
        if (q('marg')) q('marg').textContent = mg ? mg.toFixed(1).replace('.', ',') + ' %' : '—';
        const el = q('mk');
        if (el) { el.textContent = mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—';
          el.className = 'mk ' + global.DB.bandaDe(mk).pill; }
      };
      document.querySelectorAll('[data-efec]').forEach(i => i.onchange = () => {
        const v = this.vars.find(x => x.id === Number(i.dataset.efec)); if (!v) return;
        v.efectivo = Math.max(0, Number(String(i.value).replace(/[^\d]/g, '')) || 0);
        v.precio = this.listaDe(v.efectivo);   // el de lista se guarda derivado
        v.pisado = true;                        // se apartó de la plantilla
        global.DB.guardarVariante(v); refrescarCV(v);
      });
      document.querySelectorAll('[data-costo]').forEach(i => {
        const antes = i.onchange;
        i.onchange = () => { if (antes) antes();
          const v = this.vars.find(x => x.id === Number(i.dataset.costo)); if (v) refrescarCV(v); };
      });
      document.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => {
        const id = Number(b.dataset.editar);
        this._abiertos = this._abiertos || new Set();
        if (this._abiertos.has(id)) this._abiertos.delete(id); else this._abiertos.add(id);
        this.pintar();
      });
      document.querySelectorAll('[data-medc]').forEach(sl => sl.onchange = () => {
        const v = this.vars.find(x => x.id === Number(sl.dataset.medc)); if (!v) return;
        v.medidaCosteo = sl.value; global.DB.guardarVariante(v);
      });
      num('largo', 'frenteCm'); num('alto', 'alto'); num('prof', 'prof');
      // Al escribir una medida aparece el botón para bajarla a todas.
      [['largo', 'frenteCm'], ['alto', 'alto'], ['prof', 'prof'], ['peso', 'peso']].forEach(([attr]) => {
        document.querySelectorAll(`[data-${attr}]`).forEach(i => {
          const bt = i.closest('.vr-x') && i.closest('.vr-x').querySelector('.aplic');
          if (!bt) return;
          i.oninput = () => {
            document.querySelectorAll('.aplic').forEach(x => { x.hidden = true; });
            bt.hidden = !String(i.value).trim();
          };
          i.onblur = () => setTimeout(() => { if (document.activeElement !== bt) bt.hidden = true; }, 150);
        });
      });
      document.querySelectorAll('[data-aplic]').forEach(b => b.onmousedown = e => {
        e.preventDefault();
        const [attr, id] = b.dataset.aplic.split('|');
        const campo = { largo: 'frenteCm', alto: 'alto', prof: 'prof', peso: 'peso' }[attr];
        const v = this.vars.find(x => x.id === Number(id)); if (!v) return;
        const valor = Number(String(document.querySelector(`[data-${attr}="${id}"]`).value)
          .replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        this.vars.forEach(x => { x[campo] = valor; global.DB.guardarVariante(x); });
        UI.aviso(`${this.vars.length} variantes con ${valor}`, 'ok');
        this.pintar();
      });
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


    // La imagen de una variante se ELIGE de la biblioteca. Si el archivo
    // todavía no está, se sube desde el mismo pop-up y queda en Documentos.
    elegirImagenVar(id, campo) {
      const v = this.vars.find(x => x.id === id); if (!v || !this.puedeEditar()) return;
      const esVenta = campo === 'imgVenta';
      const tipo = esVenta ? 'venta' : 'produccion';
      const fs = this.archivos(tipo);
      const actual = v[campo];

      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">${esVenta ? 'Imagen de venta' : 'Plano de producción'}</h3>
        <p class="h-sub">${UI.esc(this.nombreVar(v))}</p>
        <div class="docs elegir" id="ei-lista" style="margin-top:14px">
          ${fs.map(f => `<button class="doc ${actual === f.id ? 'on' : ''}" data-usar="${f.id}">
            <div class="doc-im">${/^data:image/.test(f.url)
              ? `<img src="${UI.esc(f.url)}" alt="">` : (esVenta ? '📷' : '📐')}</div>
            <div class="doc-n">${UI.esc(f.nombre)}</div>
          </button>`).join('')
          || `<div class="hint">No hay archivos de ${esVenta ? 'venta' : 'producción'} cargados todavía.</div>`}
        </div>
        <div class="pd-sepl"></div>
        <div class="row">
          <button class="btn" id="ei-subir">＋ Subir uno nuevo</button>
          ${actual ? '<button class="btn" id="ei-quitar">Quitar la imagen</button>' : ''}
          <div class="sp"></div>
          <button class="btn" id="ei-x">Cerrar</button>
        </div>
        <input type="file" id="ei-file" hidden
          accept="${esVenta ? 'image/*' : 'image/*,application/pdf'}">`, 560);

      document.getElementById('ei-x').onclick = cerrar;
      document.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => {
        v[campo] = b.dataset.usar;
        global.DB.guardarVariante(v); cerrar(); this.pintar();
      });
      const quitar = document.getElementById('ei-quitar');
      if (quitar) quitar.onclick = () => {
        v[campo] = ''; global.DB.guardarVariante(v); cerrar(); this.pintar();
      };
      const file = document.getElementById('ei-file');
      document.getElementById('ei-subir').onclick = () => file.click();
      file.onchange = () => {
        const f = file.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          this.p.archivos = this.p.archivos || [];
          const nuevo = {
            id: 'a' + (Math.max(0, ...this.p.archivos.map(x => Number(String(x.id).slice(1)) || 0)) + 1),
            nombre: f.name, url: r.result, tipo,
          };
          this.p.archivos.push(nuevo);
          v[campo] = nuevo.id;
          this.guardar(); global.DB.guardarVariante(v);
          cerrar(); this.pintar();
        };
        r.readAsDataURL(f);
      };
    },

    // ---- Panel de la variante ----------------------------------------------
    // El panel de una variante: todo lo suyo en un solo lado, sin salir de la
    // tabla. Se pasa de una a otra con las flechas.
    abrirVariante(id) {
      const v = this.vars.find(x => x.id === id); if (!v) return;
      this._abierta = id;
      const orden = this.ordenadas();
      const i = orden.findIndex(x => x.id === id);
      const ed = this.puedeEditar(), cost = this.verCostos();
      const ef = this.efectivoDe(v);
      const mk = global.DB.markupDe(v.costo, ef), mg = global.DB.margenDe(v.costo, ef);
      const banda = global.DB.bandaDe(mk);
      const medidas = (global.DB.propiedad('medida') || { valores: [] }).valores;
      const norm = x => String(x || '').replace(',', '.');
      const act = norm(v.medidaCosteo || v.medida);
      const opts = medidas.some(m => norm(m) === act) ? medidas : [v.medidaCosteo || v.medida, ...medidas];

      const f = (id2, lbl, val, extra = '', uni = '') => `<label class="fld">
        <span class="lbl">${lbl}</span>
        <div class="fx">${uni === '$' ? '<span class="uni">$</span>' : ''}
          <input id="${id2}" value="${UI.esc(val ?? '')}" ${extra} ${ed ? '' : 'readonly'}>
          ${uni && uni !== '$' ? `<span class="uni">${uni}</span>` : ''}</div></label>`;

      document.getElementById('pd-panel').innerHTML = `
        <div class="pv-back" id="pv-back"></div>
        <aside class="pv-drawer">
          <div class="pv-top">
            <button class="lx" id="pv-cerrar" title="Cerrar">‹</button>
            <div style="flex:1;min-width:0">
              <div class="kick">${UI.esc(this.p.nombre)}</div>
              <h3>${UI.esc(this.nombreVar(v))}</h3>
            </div>
            <button class="lx" id="pv-ant" ${i <= 0 ? 'disabled' : ''} title="Anterior">‹</button>
            <button class="lx" id="pv-sig" ${i >= orden.length - 1 ? 'disabled' : ''} title="Siguiente">›</button>
          </div>
          <div class="pv-body">
            ${cost ? `<div class="pv-h">Precios</div>
            <div class="pv-2">
              ${f('pv-efec', 'Precio de efectivo', ef, 'inputmode="numeric"', '$')}
              ${f('pv-promo', 'Precio promocional', v.promo, 'inputmode="numeric" placeholder="sin descuento"', '$')}
            </div>
            <div class="pv-calc">
              <div><span>Precio de lista</span><b id="pv-lista">${UI.pesos(this.listaDe(ef))}</b></div>
              <div><span>Margen</span><b id="pv-marg">${mg ? mg.toFixed(1).replace('.', ',') + ' %' : '—'}</b></div>
              <div><span>Markup</span><b class="mk ${banda.pill}" id="pv-mk">${
                mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—'}</b></div>
            </div>
            <div class="hint">El de lista sale del efectivo, y el margen y el markup se miden contra
              el efectivo — que es lo que realmente entra.</div>

            <div class="pv-h">Costo</div>
            <div class="pv-2">
              ${f('pv-costo', 'Costo', v.costo, 'inputmode="numeric"', '$')}
              <label class="fld"><span class="lbl">Medida de costeo</span>
                <select id="pv-medc" ${ed ? '' : 'disabled'}>${opts.map(m =>
                  `<option ${norm(m) === act ? 'selected' : ''}>${UI.esc(m)}</option>`).join('')}</select></label>
            </div>
            <div class="hint">La medida que usa el proveedor cuando no cotiza la nuestra: el de 0,90 se
              costea con el de 1,00. ${v.pisado
                ? '<b class="warn-t">Este precio está pisado a mano</b>, no baja de la plantilla.'
                : 'Baja de la plantilla de precios.'}</div>` : ''}

            <div class="pv-h">Códigos</div>
            <div class="pv-2">
              <label class="fld"><span class="lbl">SKU</span>
                <div class="fx"><input id="pv-sku" value="${UI.esc(v.sku || global.DB.skuDe(this.p, v))}"
                  ${ed ? '' : 'readonly'}>
                  <button class="lapiz" id="pv-sku-auto" title="Volver al automático">↺</button></div></label>
              ${f('pv-barras', 'Código de barras', v.barras, 'inputmode="numeric" placeholder="13 números"')}
            </div>
            <div class="hint">El SKU se arma solo con el código del mueble y los valores de la variante.
              El código de barras identifica la unidad al entregar.</div>

            <div class="pv-h">Peso y dimensiones</div>
            <div class="pv-2">
              ${f('pv-largo', 'Largo', v.frenteCm, 'inputmode="decimal"', 'cm')}
              ${f('pv-alto', 'Alto', v.alto, 'inputmode="decimal"', 'cm')}
              ${f('pv-prof', 'Profundidad', v.prof, 'inputmode="decimal"', 'cm')}
              ${f('pv-peso', 'Peso', v.peso, 'inputmode="decimal"', 'kg')}
            </div>

            <div class="pv-h">Stock</div>
            <div class="pv-2">
              ${f('pv-stock', 'Stock real', v.stock, 'inputmode="numeric"')}
              <label class="fld"><span class="lbl">Reposición</span>
                <select id="pv-rep" ${ed ? '' : 'disabled'}>
                  <option value="pedido" ${v.reponer !== 'minimo' ? 'selected' : ''}>Se pide cuando se vende</option>
                  <option value="minimo" ${v.reponer === 'minimo' ? 'selected' : ''}>Mantener un mínimo</option>
                </select></label>
            </div>
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
      const ant = document.getElementById('pv-ant'), sig = document.getElementById('pv-sig');
      if (i > 0) ant.onclick = () => this.abrirVariante(orden[i - 1].id);
      if (i < orden.length - 1) sig.onclick = () => this.abrirVariante(orden[i + 1].id);

      const bind = (id2, fn) => { const el = document.getElementById(id2); if (el && ed) el.onchange = () => fn(el); };
      const numf = (id2, campo) => bind(id2, el => {
        v[campo] = Number(String(el.value).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        global.DB.guardarVariante(v); this.pintar(); this.abrirVariante(id);
      });
      bind('pv-efec', el => {
        v.efectivo = Number(String(el.value).replace(/[^\d]/g, '')) || 0;
        v.precio = this.listaDe(v.efectivo);
        v.pisado = true;
        global.DB.guardarVariante(v); this.pintar(); this.abrirVariante(id);
      });
      bind('pv-costo', el => {
        v.costo = Number(String(el.value).replace(/[^\d]/g, '')) || 0;
        v.pisado = true;
        global.DB.guardarVariante(v); this.pintar(); this.abrirVariante(id);
      });
      numf('pv-promo', 'promo');
      numf('pv-largo', 'frenteCm'); numf('pv-alto', 'alto'); numf('pv-prof', 'prof');
      numf('pv-peso', 'peso'); numf('pv-stock', 'stock'); numf('pv-min', 'minStock');
      bind('pv-sku', el => { v.sku = el.value.trim(); global.DB.guardarVariante(v); this.pintar(); });
      bind('pv-barras', el => { v.barras = el.value.trim(); global.DB.guardarVariante(v); });
      bind('pv-medc', el => { v.medidaCosteo = el.value; global.DB.guardarVariante(v); });
      bind('pv-rep', el => {
        v.reponer = el.value;
        if (v.reponer !== 'minimo') v.minStock = 0;
        global.DB.guardarVariante(v); this.abrirVariante(id);
      });
      bind('pv-mostrar', el => { v.mostrar = el.checked; global.DB.guardarVariante(v); });
      bind('pv-activa', el => { v.activa = el.checked; global.DB.guardarVariante(v); this.pintar(); this.abrirVariante(id); });
      const auto = document.getElementById('pv-sku-auto');
      if (auto && ed) auto.onclick = () => { v.sku = ''; global.DB.guardarVariante(v); this.pintar(); this.abrirVariante(id); };
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
    // Los valores también se ordenan a mano: el primero de la lista es el que
    // encabeza las variantes de abajo. Se arrastran en horizontal porque van
    // uno al lado del otro.
    arrastrarValores() {
      document.querySelectorAll('[data-vals]').forEach(caja => {
        let origen = null;
        caja.querySelectorAll('.chip.val').forEach(c => {
          c.ondragstart = e => {
            origen = c; c.classList.add('drag');
            // Sin esto Firefox no arranca el arrastre.
            if (e.dataTransfer) e.dataTransfer.setData('text/plain', c.dataset.val);
          };
          c.ondragend = () => {
            c.classList.remove('drag'); origen = null;
            this.guardarOrdenValores(caja.dataset.vals,
              [...caja.querySelectorAll('.chip.val')].map(x => x.dataset.val));
          };
          c.ondragover = e => {
            e.preventDefault();
            if (!origen || origen === c) return;
            const r = c.getBoundingClientRect();
            caja.insertBefore(origen, e.clientX < r.left + r.width / 2 ? c : c.nextSibling);
          };
        });
      });
    },

    // El orden se guarda en el diccionario, que es de donde sale. Los valores
    // que este mueble NO usa se quedan en su lugar: reordenar acá no puede
    // moverle los valores a los otros muebles.
    guardarOrdenValores(k, nuevos) {
      const props = global.DB.propiedades();
      const pr = props.find(x => x.k === k); if (!pr) return;
      // Normalizado, porque el diccionario escribe "1,60" y la variante "1.60":
      // son el mismo valor y tienen que ordenarse como uno solo.
      const norm = x => String(x || '').replace(',', '.').toLowerCase().trim();
      const usados = new Set(nuevos.map(norm));
      const otros = pr.valores.filter(v => !usados.has(norm(v)));
      // Los que este mueble no usa se quedan como estaban; los que sí usa van
      // todos juntos, en el orden nuevo, donde arrancaba el primero.
      let corte = pr.valores.findIndex(v => usados.has(norm(v)));
      if (corte < 0) corte = pr.valores.length;
      const antes = otros.filter(v => pr.valores.indexOf(v) < corte);
      const despues = otros.filter(v => pr.valores.indexOf(v) >= corte);
      pr.valores = [...antes, ...nuevos, ...despues];
      global.DB.guardarPropiedades(props);
      this.pintar();
    },

    // El orden de las propiedades es el que ordena las variantes: si primero
    // va la medida, quedan juntas todas las de 0,40 y adentro por estructura.
    arrastrarPropiedades() {
      const caja = document.querySelector('.props'); if (!caja) return;
      let origen = null;
      caja.querySelectorAll('.prow[data-orden]').forEach(r => {
        r.ondragstart = () => { origen = r; r.classList.add('drag'); };
        r.ondragend = () => {
          r.classList.remove('drag'); origen = null;
          this.p.propiedades = [...caja.querySelectorAll('.prow[data-orden]')].map(x => x.dataset.orden);
          this.guardar(); this.pintar();
        };
        r.ondragover = e => {
          e.preventDefault();
          if (!origen || origen === r) return;
          const c = r.getBoundingClientRect();
          caja.insertBefore(origen, e.clientY < c.top + c.height / 2 ? r : r.nextSibling);
        };
      });
    },

    // Un pop-up con las propiedades que ya existen y, abajo, la opción de
    // crear una que no esté. No se inventa nada desde cero por descuido.
    desplegarPropiedades() {
      const usa = this.p.propiedades || [];
      const libres = global.DB.propiedades().filter(p => !usa.includes(p.k));
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Agregar una propiedad</h3>
        <p class="h-sub">De qué más depende este mueble. Cada propiedad que sumes multiplica
          las variantes.</p>
        <label class="fld" style="margin-top:14px"><span class="lbl">Propiedad</span>
          <select id="ap-sel">
            <option value="">Seleccionar…</option>
            ${libres.map(p => `<option value="${UI.esc(p.k)}">${UI.esc(p.nombre)}`
              + `${p.valores.length ? ` (${p.valores.length} valores)` : ''}</option>`).join('')}
          </select></label>
        <div class="pd-sepl"></div>
        <div class="hint">¿No está en la lista?</div>
        <button class="btn" id="ap-nueva" style="margin-top:7px">＋ Crear una propiedad nueva</button>
        <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
          <button class="btn" id="ap-x">Cancelar</button>
          <button class="btn primary" id="ap-ok">Continuar</button>
        </div>`, 460);
      document.getElementById('ap-x').onclick = cerrar;
      document.getElementById('ap-nueva').onclick = () => { cerrar(); this.modalPropiedadNueva(); };
      document.getElementById('ap-ok').onclick = () => {
        const k = document.getElementById('ap-sel').value;
        if (!k) return UI.aviso('Elegí una propiedad', 'warn');
        cerrar(); this.agregarPropiedad(k);
      };
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

      // Una lista compacta con tildes: se marcan varios de una, sin llenar la
      // pantalla de botones grandes.
      const chip = v => `<label class="vsel" data-v="${UI.esc(v)}">
        <input type="checkbox"><span>${UI.esc(v)}</span></label>`;

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
      const enganchar = () => lista.querySelectorAll('.vsel').forEach(b => {
        const chk = b.querySelector('input');
        chk.onchange = () => {
          const v = b.dataset.v;
          if (chk.checked) { sel.add(v); b.classList.add('on'); }
          else { sel.delete(v); b.classList.remove('on'); }
          contar();
        };
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
            if (b && !sel.has(usar)) {
              sel.add(usar); b.classList.add('on'); b.querySelector('input').checked = true; contar();
            }
            else if (!b) { sel.add(usar); contar(); }
            inp.value = '';
          } else { inp.value = usar; crear(true); }
        });
        const guardado = global.DB.agregarValor(k, n);
        lista.insertAdjacentHTML('afterbegin', chip(guardado));
        enganchar();
        sel.add(guardado);
        lista.firstElementChild.classList.add('on');
        lista.firstElementChild.querySelector('input').checked = true;
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

    // Alta de proveedor: nombre, rubro y cuánto entrega por semana. Adentro de
    // su rubro es par con los demás; la capacidad no es prioridad, es cuánto
    // le cabe.
    modalProveedor(rubro) {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Nuevo proveedor</h3>
        <p class="h-sub">Queda disponible para todo el sistema.</p>
        <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
          <input id="mpr-n" placeholder="Tony, Herrería Sur, Laqueados Vera…"></label>
        <div class="cz-cols" style="margin-top:10px">
          <label class="fld"><span class="lbl">Rubro</span>
            <select id="mpr-r">${global.DB.RUBROS.map(r =>
              `<option value="${r.k}" ${rubro === r.k ? 'selected' : ''}>${UI.esc(r.label)}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">Capacidad por semana</span>
            <input id="mpr-c" inputmode="numeric" placeholder="Ej: 10"></label>
        </div>
        <div class="hint" style="margin-top:6px">Cuántas unidades puede entregar por semana.</div>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mpr-x">Cancelar</button>
          <button class="btn primary" id="mpr-ok">Crear</button>
        </div>`, 480);
      document.getElementById('mpr-x').onclick = cerrar;
      const crear = () => {
        const n = document.getElementById('mpr-n').value.trim();
        if (!n) return UI.aviso('Poné el nombre', 'warn');
        const guardado = global.DB.crearProveedor(n,
          document.getElementById('mpr-r').value,
          document.getElementById('mpr-c').value);
        if (guardado.nombre.toLowerCase() !== n.toLowerCase()) {
          UI.aviso(`Ya existía como "${guardado.nombre}" — se usa ese`, 'ok');
        }
        cerrar(); this.pintar();
      };
      document.getElementById('mpr-ok').onclick = crear;
      document.getElementById('mpr-n').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); crear(); } };
    },

    // El plano de una variante para un rubro. Sale de los archivos de
    // producción de Documentos: acá no se mezcla con las fotos de venta.
    elegirPlano(id, i) {
      const v = this.vars.find(x => x.id === id); if (!v || !this.puedeEditar()) return;
      const rubro = this.rubrosDe()[i];
      const fs = this.archivos('produccion');
      v.planos = v.planos || [];
      const actual = v.planos[i] || (i === 0 ? v.imgProd : '');

      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Plano para ${UI.esc(this.nombreRubro(rubro))}</h3>
        <p class="h-sub">${UI.esc(this.nombreVar(v))}</p>
        <div class="docs elegir" style="margin-top:14px">
          ${fs.map(f => `<button class="doc ${actual === f.id ? 'on' : ''}" data-usarplano="${f.id}">
            <div class="doc-im">${/^data:image/.test(f.url)
              ? `<img src="${UI.esc(f.url)}" alt="">` : '📐'}</div>
            <div class="doc-n">${UI.esc(f.nombre)}</div>
          </button>`).join('')
          || '<div class="hint">No hay planos cargados. Subilos en <b>Documentos</b> o desde acá.</div>'}
        </div>
        <div class="pd-sepl"></div>
        <div class="row">
          <button class="btn" id="ep-subir">＋ Subir uno nuevo</button>
          ${actual ? '<button class="btn" id="ep-quitar">Quitar</button>' : ''}
          <div class="sp"></div>
          <button class="btn" id="ep-x">Cerrar</button>
        </div>
        <input type="file" id="ep-file" hidden accept="image/*,application/pdf">`, 560);

      document.getElementById('ep-x').onclick = cerrar;
      document.querySelectorAll('[data-usarplano]').forEach(b => b.onclick = () => {
        v.planos[i] = b.dataset.usarplano;
        if (i === 0) v.imgProd = v.planos[0];
        global.DB.guardarVariante(v); cerrar(); this.pintar();
      });
      const q = document.getElementById('ep-quitar');
      if (q) q.onclick = () => {
        v.planos[i] = ''; if (i === 0) v.imgProd = '';
        global.DB.guardarVariante(v); cerrar(); this.pintar();
      };
      const file = document.getElementById('ep-file');
      document.getElementById('ep-subir').onclick = () => file.click();
      file.onchange = () => {
        const f = file.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          this.p.archivos = this.p.archivos || [];
          const nuevo = {
            id: 'a' + (Math.max(0, ...this.p.archivos.map(x => Number(String(x.id).slice(1)) || 0)) + 1),
            nombre: f.name, url: r.result, tipo: 'produccion',
          };
          this.p.archivos.push(nuevo);
          v.planos[i] = nuevo.id;
          if (i === 0) v.imgProd = nuevo.id;
          this.guardar(); global.DB.guardarVariante(v);
          cerrar(); this.pintar();
        };
        r.readAsDataURL(f);
      };
    },

    // Las columnas de la planilla: nombre, de dónde sale el valor, y el orden.
    engancharPlanilla() {
      const caja = document.querySelector('.pl-cols'); if (!caja) return;
      const ed = this.puedeEditar();
      const cols = () => { this.p.planilla = this.p.planilla || this.planillaDe(); return this.p.planilla; };

      document.querySelectorAll('[data-collbl]').forEach(i => { if (ed) i.onchange = () => {
        cols()[Number(i.dataset.collbl)].label = i.value.trim().toUpperCase() || 'COLUMNA';
        this.guardar(); this.pintar();
      }; });
      document.querySelectorAll('[data-colorig]').forEach(sl => { if (ed) sl.onchange = () => {
        const c = cols()[Number(sl.dataset.colorig)];
        c.origen = sl.value;
        // Al cambiar de origen, el campo anterior ya no aplica.
        c.campo = c.origen === 'propiedad' ? (this.props()[0] || {}).k
          : (c.origen === 'producto' ? 'nombre' : undefined);
        this.guardar(); this.pintar();
      }; });
      document.querySelectorAll('[data-colcampo]').forEach(sl => { if (ed) sl.onchange = () => {
        cols()[Number(sl.dataset.colcampo)].campo = sl.value;
        this.guardar(); this.pintar();
      }; });
      document.querySelectorAll('[data-quitarcol]').forEach(b => { if (ed) b.onclick = () => {
        cols().splice(Number(b.dataset.quitarcol), 1);
        this.guardar(); this.pintar();
      }; });
      const add = document.getElementById('pl-add');
      if (add && ed) add.onclick = () => {
        cols().push({ label: 'NUEVA', origen: 'libre' });
        this.guardar(); this.pintar();
      };
      let origen = null;
      caja.querySelectorAll('.pl-col').forEach(c => {
        c.ondragstart = () => { origen = c; c.classList.add('drag'); };
        c.ondragend = () => {
          c.classList.remove('drag'); origen = null;
          const orden = [...caja.querySelectorAll('.pl-col')].map(x => Number(x.dataset.col));
          this.p.planilla = orden.map(i => cols()[i]);
          this.guardar(); this.pintar();
        };
        c.ondragover = e => {
          e.preventDefault();
          if (!origen || origen === c) return;
          const r = c.getBoundingClientRect();
          caja.insertBefore(origen, e.clientY < r.top + r.height / 2 ? c : c.nextSibling);
        };
      });
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
        /* Con siete solapas no entran a lo ancho: antes que partirse en dos
           renglones, la barra scrollea. */
        .pd-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin:0 0 12px;
          overflow-x:auto;scrollbar-width:none}
        .pd-tabs::-webkit-scrollbar{display:none}
        .pd-tab{flex:none;white-space:nowrap;border:0;background:none;font:inherit;font-size:13px;
          font-weight:650;color:var(--muted);cursor:pointer;padding:9px 12px;
          border-bottom:2px solid transparent;margin-bottom:-1px}
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
        .dropz.chico{padding:9px}
        .docs{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}
        .doc{border:1px solid var(--line);border-radius:9px;padding:8px;background:var(--panel-2);
          font:inherit;text-align:left}
        .doc-im{height:90px;border-radius:7px;background:var(--panel);display:grid;place-items:center;
          font-size:24px;overflow:hidden;border:1px solid var(--line-soft)}
        .doc-im img{width:100%;height:100%;object-fit:cover}
        .doc-n{font-size:11.5px;color:var(--navy);margin-top:6px;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap}
        .doc-u{margin-top:4px}
        .doc-a{display:flex;gap:4px;align-items:center;margin-top:6px}
        .doc-a select{font-size:11.5px;padding:3px 6px}
        .docs.elegir .doc{cursor:pointer;transition:.12s}
        .docs.elegir .doc:hover{border-color:var(--brand)}
        .docs.elegir .doc.on{border-color:var(--brand);background:var(--brand-soft)}
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
        .prow-drag{color:var(--muted);cursor:grab;font-size:13px;line-height:1;letter-spacing:-2px;
          flex:none;align-self:flex-start;margin-top:2px}
        .prow.drag{opacity:.4}
        .chip.val{cursor:grab;padding-left:6px}
        .chip.val:active{cursor:grabbing}
        .chip.val.drag{opacity:.4}
        .chip-drag{color:var(--muted);font-size:11px;line-height:1;letter-spacing:-2px;margin-right:2px}
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
        .vsels{border:1px solid var(--line);border-radius:9px;max-height:230px;overflow:auto}
        .vsel{display:flex;align-items:center;gap:9px;padding:7px 11px;font-size:12.5px;color:var(--navy);
          cursor:pointer;border-bottom:1px solid var(--line-soft)}
        .vsel:last-child{border-bottom:0}
        .vsel:hover{background:var(--panel-2)}
        .vsel.on{background:var(--brand-soft);font-weight:650}
        .vsel input{width:15px;height:15px;accent-color:var(--brand);flex:none}
        .vrow input[type=checkbox]{width:15px;height:15px;accent-color:var(--brand);flex:none}
        .vr-txt{flex:1;min-width:0;padding:5px 8px;font-size:12.5px}
        .btn.ghost{background:none;border-color:transparent;color:var(--crit)}
        .btn.ghost:hover{border-color:var(--crit)}
        .prop-pie{display:flex;align-items:center;gap:10px;margin-top:9px;padding-top:9px;
          border-top:1px solid var(--line);flex-wrap:wrap}
        .combo{font-size:12.5px;color:var(--ink-soft)} .combo b{font-size:15px;color:var(--navy)}

        .vr-tools{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .vr-tools .busca{max-width:320px;padding:7px 10px;font-size:13px}
        /* Información general: sin precios — largo, alto, profundidad y peso.
           Costos y márgenes: costo, precio y markup. Son nueve columnas y no
           entran en 920 px, así que la tabla scrollea sola sin ensanchar la
           pantalla. */
        .vr-tabla{overflow-x:auto;margin:0 -14px;padding:0 14px}
        .vr-head,.vr{display:grid;min-width:700px;
          grid-template-columns:76px minmax(180px,1fr) 76px 76px 76px 76px 50px;
          gap:8px;align-items:center}
        .num{text-align:right}
        .vr-x{position:relative}
        .vr-xi{display:flex;align-items:center;gap:3px}
        .vr-x .pn{flex:1;min-width:0;width:auto;padding:5px 6px}
        .aplic{position:absolute;left:0;top:100%;margin-top:3px;z-index:5;white-space:nowrap;
          border:1px solid var(--brand);background:var(--panel);color:var(--brand);border-radius:7px;
          padding:3px 8px;font:inherit;font-size:11px;font-weight:650;cursor:pointer;
          box-shadow:var(--shadow)}
        .aplic:hover{background:var(--brand-soft)}
        /* Compra y venta: una columna por propiedad y después los números. */
        .cv-tabla{overflow-x:auto;margin:0 -14px;padding:0 14px}
        .cv-h,.cv-r{display:grid;min-width:820px;gap:8px;align-items:center;
          grid-template-columns:repeat(var(--ejes),minmax(140px,1fr)) 104px 104px 72px 66px 64px}
        .cv-a{display:flex;gap:1px;justify-content:flex-end}
        .lx.on{color:var(--ok)}
        /* El número que baja de la plantilla se lee; el pisado a mano se marca. */
        .cv-fijo{font-weight:650;color:var(--navy)}
        .cv-fijo.pisado{color:var(--warn);border-bottom:1px dashed var(--warn)}
        .cv-h{font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);
          font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--line)}
        .cv-r{padding:5px 0;border-bottom:1px solid var(--line-soft)}
        .cv-r.off{opacity:.5}
        .cv-p{font-size:12.5px;color:var(--brand);font-weight:600;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap}
        .cv-n{text-align:right;font-size:12.5px}
        .cv-n .pn{width:100%;text-align:right;padding:5px 8px}
        .cv-lista{color:var(--navy);font-weight:650}
        .cv-r select{font-size:12px;padding:4px 7px}
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
        /* Botonera de una sola opción: cuántos proveedores hacen falta. */
        .segm{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
        .seg{border:0;background:var(--panel);font:inherit;font-size:12.5px;font-weight:650;
          color:var(--ink-soft);padding:7px 14px;cursor:pointer}
        .seg+.seg{border-left:1px solid var(--line)}
        .seg:hover{background:var(--panel-2);color:var(--navy)}
        .seg.on{background:var(--brand);color:#fff}
        .rb{padding:9px 0;border-top:1px solid var(--line-soft)}
        .rb:first-of-type{border-top:0}
        .rb-pares{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
        .rb-pares small{font-size:10.5px;margin-left:3px}
        /* Planos: una columna por rubro. */
        .pl-tabla{overflow-x:auto;margin:0 -14px;padding:0 14px}
        .pl-h,.pl-r{display:grid;min-width:520px;gap:10px;align-items:center;
          grid-template-columns:minmax(200px,1fr) repeat(var(--n),100px)}
        .pl-h{font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);
          font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--line)}
        .pl-r{padding:7px 0;border-bottom:1px solid var(--line-soft);font-size:12.5px}
        .pl-r b{color:var(--navy)}
        .pl-r .vimg{width:92px;height:70px}
        /* Diseñador de la planilla. */
        .pl-cols{display:flex;flex-direction:column;gap:6px}
        .pl-col{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:9px;
          padding:6px 9px;background:var(--panel-2)}
        .pl-col.drag{opacity:.4}
        .pl-lbl{width:150px;flex:none;font-weight:650;font-size:12.5px;text-transform:uppercase}
        .pl-col select{width:auto;flex:1;min-width:0;font-size:12px;padding:5px 8px}
        .pl-prev{overflow-x:auto;border:1px solid var(--line);border-radius:9px}
        .pl-prev table{font-size:12px;min-width:100%;border-collapse:collapse}
        .pl-prev th{background:var(--panel-2);padding:7px 10px;font-size:10px;white-space:nowrap;
          text-align:left;color:var(--muted);letter-spacing:.04em}
        .pl-prev td{padding:6px 10px;white-space:nowrap;border-top:1px solid var(--line-soft)}
        .ad-t{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px}
        .inv-tabla{overflow-x:auto;margin:0 -14px;padding:0 14px}
        .inv-head,.inv-r{display:grid;min-width:640px;
          grid-template-columns:minmax(220px,1fr) 92px 150px 96px;gap:10px;align-items:center}
        .inv-r.off{opacity:.5}
        /* El mínimo bloqueado se ve apagado, pero se puede tocar: al escribir
           ahí la reposición cambia sola. */
        .pn.bloq{background:var(--panel-2);color:var(--muted);border-style:dashed}
        .rast{display:flex;flex-direction:column;gap:7px}
        .rast-o{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);
          border-radius:9px;padding:9px 11px;cursor:pointer;transition:.12s}
        .rast-o:hover{border-color:var(--brand)}
        .rast-o.on{border-color:var(--brand);background:var(--brand-soft)}
        .rast-o input{width:15px;height:15px;accent-color:var(--brand);flex:none;margin-top:2px}
        .rast-o b{display:block;font-size:12.5px;color:var(--navy)}
        .rast-o small{font-size:11.5px;color:var(--muted);line-height:1.4}
        .inv-head{font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);
          font-weight:700;padding-bottom:7px;border-bottom:1px solid var(--line)}
        .inv-r{padding:7px 0;border-bottom:1px solid var(--line-soft);font-size:12.5px}
        .inv-r b{color:var(--navy)}
        .inv-r select{font-size:12px;padding:5px 8px}
        .planos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
        .plano-n{font-size:12px;font-weight:650;color:var(--navy);margin-top:6px}
        .planos .vimg{width:100%;height:118px}
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
        .pv-drawer{width:min(520px,100%)}
        .pv-2{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
        @media(max-width:560px){.pv-2{grid-template-columns:1fr}}
        .pv-2 .fld{margin-bottom:0}
        .pv-calc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:11px 0 7px;
          background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:10px 12px}
        .pv-calc span{display:block;font-size:11px;color:var(--muted)}
        .pv-calc b{font-size:15px;color:var(--navy)}
        .pv-calc .mk{display:inline-block;width:auto;padding:2px 8px}
        .pv-top .lx[disabled]{opacity:.3;cursor:default}

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
