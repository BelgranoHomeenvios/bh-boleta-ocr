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
    pintar() {
      const v = document.getElementById(this._mount); if (!v) return;
      const p = this.p, ed = this.puedeEditar();
      const est = this.estado();
      v.innerHTML = `
        <div class="pd-bar">
          <a href="#" id="pd-volver" class="kick">‹ Catálogo</a>
          <div class="sp"></div>
          ${ed ? '' : '<span class="pill soft">Sólo lectura</span>'}
          <span class="pill ${p.publicado ? 'ok' : 'warn'}" id="pd-pub-pill">${
            p.publicado ? 'Visible para los vendedores' : 'Oculto — no se puede vender'}</span>
          ${this.verCostos() ? `<span class="pill ${est.pill}">${UI.esc(est.label)}</span>` : ''}
        </div>

        ${this.bloqueNombre()}
        ${this.bloqueFotos()}
        ${this.bloqueCategorias()}
        ${this.bloquePropiedades()}
        ${this.bloqueVariantes()}
        ${this.verCostos() ? this.bloqueSimulador() : ''}
        ${this.bloqueProveedores()}
        ${this.bloqueAbastecimiento()}
        ${this.bloqueContabilidad()}
        <div id="pd-panel"></div>
        ${this.estilos()}`;

      document.getElementById('pd-volver').onclick = e => { e.preventDefault(); global.Catalogo.render(this._mount); };
      this.enganchar();
    },

    // 1 · Nombre -----------------------------------------------------------
    bloqueNombre() {
      const p = this.p, ed = this.puedeEditar();
      return `<section class="pd-b">
        <input id="pd-nombre" class="pd-nom" value="${UI.esc(p.nombre)}"
          placeholder="Nombre del mueble" ${ed ? '' : 'readonly'}>
        <div class="pd-nsub">
          <span class="muted">Código</span> <b class="tnum">${UI.esc(p.sku || '—')}</b>
          <span class="pd-sep"></span>
          <label class="chk"><input type="checkbox" id="pd-pub" ${p.publicado ? 'checked' : ''}
            ${ed ? '' : 'disabled'}> Mostrar a los vendedores</label>
          <span class="hint">Si está oculto, el mueble no aparece para cotizar.</span>
        </div>
      </section>`;
    },

    // 2 · Fotos ------------------------------------------------------------
    bloqueFotos() {
      const fotos = this.p.fotos || [];
      return `<section class="pd-b">
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
      </section>`;
    },

    // 3 · Categorías -------------------------------------------------------
    bloqueCategorias() {
      const p = this.p;
      // La familia alcanza: si Cómodas cuelga de Dormitorio, Dormitorio se
      // hereda solo y no hay que cargarlo.
      const chips = [p.categoria && p.categoria.nombre].filter(Boolean);
      return `<section class="pd-b">
        <div class="pd-h">Categorías</div>
        <div class="chips">
          ${chips.map(c => `<span class="chip">${UI.esc(c)}${this.puedeEditar()
            ? '<button class="chip-x" data-quitarcat="1" aria-label="Quitar">✕</button>' : ''}</span>`).join('')
            || '<span class="hint">Sin categoría.</span>'}
        </div>
        ${p.ambiente ? `<div class="hint" style="margin-top:7px">
          Hereda <b>${UI.esc(p.ambiente.nombre)}</b> porque
          <b>${UI.esc(p.categoria.nombre)}</b> cuelga de ahí — no hace falta cargarlo.</div>` : ''}
        ${this.puedeEditar() ? '<button class="lnk" id="pd-edcat" style="margin-top:9px">✎ Editar categorías</button>' : ''}
      </section>`;
    },

    // 4 · Propiedades ------------------------------------------------------
    bloquePropiedades() {
      const ps = this.props(), n = this.combinatorio();
      return `<section class="pd-b">
        <div class="pd-h">Variantes <span class="muted">· propiedades</span></div>
        ${ps.map(p => `<div class="prop">
          <div class="prop-n">${UI.esc(p.nombre)}</div>
          <div class="chips">${p.usados.map(v => `<span class="chip">${UI.esc(v)}${this.puedeEditar()
            ? `<button class="chip-x" data-quitarv="${UI.esc(p.k)}|${UI.esc(v)}" aria-label="Quitar">✕</button>` : ''}</span>`).join('')
            || '<span class="hint">Sin valores.</span>'}
            ${this.puedeEditar() ? `<button class="chip-add" data-addv="${UI.esc(p.k)}">＋ valor</button>` : ''}</div>
        </div>`).join('')}
        <div class="prop-pie">
          <div class="combo"><b class="tnum">${n}</b> combinaciones posibles
            ${this.vars.length !== n ? `<span class="muted">· ${this.vars.length} creadas</span>` : ''}</div>
          ${this.puedeEditar() ? `<div class="sp"></div>
            <button class="lnk" id="pd-edprop">✎ Editar propiedades</button>` : ''}
        </div>
      </section>`;
    },

    // 5 · Listado de variantes ---------------------------------------------
    bloqueVariantes() {
      const f = this._fVar.trim().toLowerCase();
      const lista = this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f));
      const cost = this.verCostos();
      return `<section class="pd-b">
        <div class="pd-h">Todas las variantes <span class="muted">(${this.vars.length})</span></div>
        <div class="vr-tools">
          <input id="pd-fvar" class="busca" placeholder="Filtrar por medida, estructura, frente…" value="${UI.esc(this._fVar)}">
          <div class="sp"></div>
          <span class="hint">${this.activas().length} activas · ${this.vars.length - this.activas().length} desactivadas</span>
        </div>
        <div class="vr-head ${cost ? '' : 'sincosto'}">
          <span>Imágenes</span><span>Variante</span><span>Stock</span>
          ${cost ? '<span style="text-align:right">Costo</span>' : ''}
          <span style="text-align:right">Precio</span>
          ${cost ? '<span style="text-align:right">Markup</span>' : ''}
          <span></span>
        </div>
        <div id="pd-vars">${lista.map(v => this.filaVar(v, cost)).join('')
          || UI.vacio('Ninguna variante coincide con el filtro.')}</div>
      </section>`;
    },

    nombreVar(v) {
      return (this.p.propiedades || []).map(k => v[k]).filter(Boolean).join(' · ');
    },

    filaVar(v, cost) {
      const mk = this.markupDe(v), banda = global.DB.bandaDe(mk);
      const off = v.activa === false;
      const img = (url, k, tit) => `<button class="vimg ${url ? 'hay' : ''}" data-img="${v.id}|${k}" title="${tit}">
        ${url ? `<img src="${UI.esc(url)}" alt="">` : (k === 'imgProd' ? '📐' : '📷')}</button>`;
      return `<div class="vr ${off ? 'off' : ''} ${cost ? '' : 'sincosto'}" data-v="${v.id}">
        <div class="vimgs">${img(v.imgVenta, 'imgVenta', 'Imagen de venta — sale impresa')}
          ${img(v.imgProd, 'imgProd', 'Imagen de producción — la que va a fábrica')}</div>
        <div class="vr-n">
          <button class="vr-nom" data-abrir="${v.id}">${UI.esc(this.nombreVar(v))}</button>
          <div class="vr-sku tnum">${UI.esc(v.sku || global.DB.skuDe(this.p, v))}${
            off ? ' · <b class="warn-t">desactivada</b>' : ''}</div>
        </div>
        <div class="vr-st">${v.stock > 0
          ? `<b class="tnum ok-t">${v.stock}</b>`
          : `<span class="muted">${v.reponer === 'minimo' ? 'reponer' : 'a pedido'}</span>`}</div>
        ${cost ? `<div class="vr-c"><input inputmode="numeric" class="pn" data-costo="${v.id}"
          value="${v.costo || ''}" ${this.puedeEditar() ? '' : 'readonly'}></div>` : ''}
        <div class="vr-p"><input inputmode="numeric" class="pn" data-precio="${v.id}"
          value="${v.precio || ''}" ${this.puedeEditar() ? '' : 'readonly'}></div>
        ${cost ? `<div class="vr-m"><span class="mk ${banda.pill}">${mk ? mk.toFixed(2).replace('.', ',') + 'x' : '—'}</span></div>` : ''}
        <div class="vr-a"><button class="lx" data-abrir="${v.id}" title="Editar la variante">✏️</button></div>
      </div>`;
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

    // 8 · Abastecimiento + instalación --------------------------------------
    bloqueAbastecimiento() {
      const r = this.p.rutas || {}, ed = this.puedeEditar();
      return `<section class="pd-b">
        <div class="pd-h">Cómo se obtiene</div>
        <div class="rutas">${global.DB.RUTAS.map(x =>
          `<label class="chk"><input type="checkbox" data-ruta="${x.k}" ${r[x.k] ? 'checked' : ''}
            ${ed ? '' : 'disabled'}> ${UI.esc(x.label)}</label>`).join('')}</div>
        <div class="pd-sepl"></div>
        <label class="chk"><input type="checkbox" id="pd-inst" ${this.p.instalacion ? 'checked' : ''}
          ${ed ? '' : 'disabled'}> <b>Requiere instalación</b></label>
        <div class="hint" style="margin-top:6px">${this.p.instalacion
          ? 'En la orden va a saltar solo, con <b>a convenir</b>; el costo se define en Instalaciones, no acá.'
          : 'En la orden sale <b>no requiere instalación</b> por default, y el vendedor puede cambiarlo.'}</div>
      </section>`;
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
      if (g('pd-edprop')) g('pd-edprop').onclick = () => this.modalPropiedades();
      document.querySelectorAll('[data-addv]').forEach(b => b.onclick = () => this.modalValor(b.dataset.addv));
      document.querySelectorAll('[data-quitarv]').forEach(b => b.onclick = () => {
        const [k, val] = b.dataset.quitarv.split('|');
        this.quitarValor(k, val);
      });

      // Variantes
      const fv = g('pd-fvar');
      if (fv) {
        let t; fv.oninput = () => { clearTimeout(t); t = setTimeout(() => {
          this._fVar = fv.value;
          const box = g('pd-vars');
          const f = this._fVar.trim().toLowerCase();
          const lista = this.vars.filter(v => !f || this.nombreVar(v).toLowerCase().includes(f));
          box.innerHTML = lista.map(v => this.filaVar(v, this.verCostos())).join('')
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
      num('costo', 'costo'); num('precio', 'precio');
    },

    refrescarFila(v) {
      const fila = document.querySelector(`.vr[data-v="${v.id}"]`);
      if (!fila) return;
      fila.outerHTML = this.filaVar(v, this.verCostos());
      this.engancharVars();
      const pill = document.querySelector('.pd-bar .pill:last-child');
      if (pill && this.verCostos()) {
        const e = this.estado(); pill.className = 'pill ' + e.pill; pill.textContent = e.label;
      }
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
      const ed = this.puedeEditar(), cost = this.verCostos();
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
      const sel = document.getElementById('sim-v'); if (!sel) return;
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

    // Alta de un valor nuevo. OJO: lo que se crea acá queda en el diccionario
    // para todo el catálogo, y eso lo hace sólo Dirección.
    modalValor(k) {
      const prop = global.DB.propiedad(k); if (!prop) return;
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Agregar ${UI.esc(prop.nombre)}</h3>
        <p class="h-sub">Elegí uno de los que ya existen, o creá uno nuevo. Si lo creás, queda
          disponible para todos los muebles.</p>
        <div class="chips" style="margin:14px 0">${prop.valores.map(v =>
          `<button class="chip-add" data-usar="${UI.esc(v)}">${UI.esc(v)}</button>`).join('')}</div>
        <label class="fld"><span class="lbl">Crear un valor nuevo</span>
          <input id="mv-nuevo" placeholder="Ej: ESTRUCTURA ROBLE"></label>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mv-x">Cancelar</button>
          <button class="btn primary" id="mv-ok">Crear y agregar</button>
        </div>`);
      document.getElementById('mv-x').onclick = cerrar;
      document.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => {
        this.agregarValor(k, b.dataset.usar); cerrar();
      });
      const crear = (forzar) => {
        const n = document.getElementById('mv-nuevo').value.trim();
        if (!n) return UI.aviso('Escribí el valor', 'warn');
        // Antes de dar de alta, se revisa que no sea un error de tipeo de uno
        // que ya existe: dos valores casi iguales rompen el catálogo entero.
        const parecido = forzar ? null : global.DB.parecidoA(k, n);
        if (parecido) return this.confirmarParecido(k, n, parecido, cerrar);
        const guardado = global.DB.agregarValor(k, n);
        if (guardado && guardado.toLowerCase() !== n.toLowerCase()) {
          UI.aviso(`Ya existía como "${guardado}" — se usa ese`, 'ok');
        }
        this.agregarValor(k, guardado); cerrar();
      };
      document.getElementById('mv-ok').onclick = () => crear(false);
    },

    // "ESTRUTURA BLANCA" contra "ESTRUCTURA BLANCA": se avisa antes de crear
    // dos valores donde tendría que haber uno.
    confirmarParecido(k, escrito, parecido, cerrarAnterior) {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">¿No será el mismo?</h3>
        <p class="h-sub">Escribiste <b>${UI.esc(escrito)}</b> y en el catálogo ya existe
          <b>${UI.esc(parecido)}</b>. Si son el mismo, usá el que ya está: dos valores casi iguales
          se cotizan por separado y no hay forma de juntarlos después.</p>
        <div class="row" style="margin-top:18px;justify-content:flex-end;gap:10px">
          <button class="btn" id="cp-nuevo">Es otro — crearlo igual</button>
          <button class="btn primary" id="cp-usar">Usar ${UI.esc(parecido)}</button>
        </div>`, 480);
      document.getElementById('cp-usar').onclick = () => {
        cerrar(); cerrarAnterior(); this.agregarValor(k, parecido);
      };
      document.getElementById('cp-nuevo').onclick = () => {
        const guardado = global.DB.agregarValor(k, escrito);
        cerrar(); cerrarAnterior(); this.agregarValor(k, guardado);
      };
    },

    // Agregar un valor multiplica las variantes: por cada combinación que
    // faltaba se crea una nueva, con el precio de la más parecida.
    agregarValor(k, valor) {
      if (this.props().find(p => p.k === k).usados.includes(valor)) return UI.aviso('Ya estaba', 'warn');
      const ejes = this.p.propiedades || [];
      const otros = ejes.filter(x => x !== k).map(x => ({
        k: x, vals: [...new Set(this.vars.map(v => v[x]).filter(Boolean))],
      }));
      const combos = otros.reduce((acc, o) =>
        acc.flatMap(c => o.vals.map(v => ({ ...c, [o.k]: v }))), [{}]);
      let n = 0;
      combos.forEach(c => {
        // El precio sale de una variante que comparta todo menos este eje.
        const ref = this.vars.find(v => otros.every(o => v[o.k] === c[o.k])) || this.vars[0] || {};
        const nueva = {
          id: Math.max(0, ...this.vars.map(v => v.id)) + 1 + n,
          producto_id: this.p.id, ...c, [k]: valor,
          precio: ref.precio || 0, costo: ref.costo || 0,
          medidaCosteo: k === 'medida' ? valor : (ref.medidaCosteo || ''),
          markupObj: null, stock: 0, activa: true, mostrar: true,
          peso: ref.peso || 0, alto: ref.alto || 0, prof: ref.prof || 0,
          imgVenta: '', imgProd: '', minStock: 0, reponer: 'pedido',
          atributos: { ...c, [k]: valor },
        };
        this.vars.push(nueva); n++;
      });
      UI.aviso(`${n} ${n === 1 ? 'variante nueva' : 'variantes nuevas'}`, 'ok');
      this.pintar();
    },

    quitarValor(k, valor) {
      const n = this.vars.filter(v => v[k] === valor).length;
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Quitar ${UI.esc(valor)}</h3>
        <p class="h-sub">Se van <b>${n}</b> ${n === 1 ? 'variante' : 'variantes'} de este mueble.
          El valor sigue existiendo para los demás.</p>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="qv-x">Cancelar</button>
          <button class="btn danger" id="qv-ok">Quitar</button>
        </div>`, 440);
      document.getElementById('qv-x').onclick = cerrar;
      document.getElementById('qv-ok').onclick = () => {
        this.vars = this.vars.filter(v => v[k] !== valor);
        cerrar(); this.pintar();
      };
    },

    modalPropiedades() {
      const dicc = global.DB.propiedades();
      const usa = this.p.propiedades || [];
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Propiedades del mueble</h3>
        <p class="h-sub">Cuáles de las propiedades del catálogo usa este mueble. Los valores se eligen
          después, y de ahí sale el combinatorio.</p>
        <div class="lstp">${dicc.map(p => `
          <label class="lp"><input type="checkbox" data-usap="${p.k}" ${usa.includes(p.k) ? 'checked' : ''}>
            <span><b>${UI.esc(p.nombre)}</b><small>${p.valores.length} valores en el catálogo</small></span></label>`).join('')}
        </div>
        <label class="fld" style="margin-top:14px"><span class="lbl">Crear una propiedad nueva</span>
          <input id="mp-nueva" placeholder="Ej: TIRADOR"></label>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mp-x">Cerrar</button>
          <button class="btn primary" id="mp-ok">Guardar</button>
        </div>`);
      document.getElementById('mp-x').onclick = cerrar;
      document.getElementById('mp-ok').onclick = () => {
        const nueva = document.getElementById('mp-nueva').value.trim();
        if (nueva) global.DB.crearPropiedad(nueva);
        this.p.propiedades = [...document.querySelectorAll('[data-usap]')]
          .filter(c => c.checked).map(c => c.dataset.usap);
        if (nueva) this.p.propiedades.push(global.DB.slug(nueva));
        this.guardar(); cerrar(); this.pintar();
      };
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
        <input id="mc-q" class="busca" placeholder="Buscar categoría" style="margin:12px 0">
        <button class="lnk" id="mc-crear">⊕ Crear categoría</button>
        <div class="lstc" id="mc-lista">${filas.map(({ c, r }) => `
          <label class="lc" data-txt="${UI.esc(r.join('/').toLowerCase())}">
            <span class="lc-r">${r.slice(0, -1).map(x => `<span class="muted">${UI.esc(x)}/</span>`).join('')}<b>${UI.esc(c.nombre)}</b></span>
            <input type="checkbox" data-cat="${c.id}" ${this.p.categoria_id === c.id ? 'checked' : ''}>
          </label>`).join('')}
        </div>
        <div class="hint" style="margin-top:10px">Con marcar la familia alcanza: el ambiente del que cuelga
          se hereda solo.</div>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="mc-x">Cancelar</button>
          <button class="btn primary" id="mc-ok">Guardar</button>
        </div>`, 560);
      const q = document.getElementById('mc-q');
      q.oninput = () => {
        const t = q.value.trim().toLowerCase();
        document.querySelectorAll('.lc').forEach(l =>
          l.style.display = !t || l.dataset.txt.includes(t) ? '' : 'none');
      };
      // Una sola categoría: marcar una destilda la anterior.
      document.querySelectorAll('[data-cat]').forEach(c => c.onchange = () => {
        if (c.checked) document.querySelectorAll('[data-cat]').forEach(o => { if (o !== c) o.checked = false; });
      });
      document.getElementById('mc-crear').onclick = () => UI.aviso('El alta de categorías va en Catálogo → Familias', 'warn');
      document.getElementById('mc-x').onclick = cerrar;
      document.getElementById('mc-ok').onclick = async () => {
        const sel = [...document.querySelectorAll('[data-cat]')].find(c => c.checked);
        if (sel) { this.p.categoria_id = Number(sel.dataset.cat); this.guardar(); }
        cerrar();
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
        .cz-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}
        @media(max-width:820px){.cz-cols{grid-template-columns:1fr}}
        .cz-col{display:flex;flex-direction:column;gap:9px}
        .fr{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:10px}
        .fr>label{font-size:12.5px;color:var(--ink-soft)}
        .fr input,.fr select{padding:7px 10px;font-size:13px;width:100%}
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

        .pd-bar{display:flex;align-items:center;gap:9px;margin-bottom:14px}
        .pd-b{background:var(--panel);border:1px solid var(--line);border-radius:12px;
          box-shadow:var(--shadow);padding:16px 18px;margin-bottom:12px}
        .pd-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
          color:var(--navy);margin-bottom:12px}
        .pd-nom{width:100%;border:1px solid transparent;background:none;font:inherit;font-size:24px;
          font-weight:700;color:var(--navy);padding:5px 8px;margin:-5px -8px 6px;border-radius:8px}
        .pd-nom:hover{border-color:var(--line)} .pd-nom:focus{border-color:var(--brand);background:var(--panel)}
        .pd-nsub{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-soft)}
        .pd-sep{width:1px;height:15px;background:var(--line)}
        .pd-sepl{height:1px;background:var(--line);margin:13px 0}
        .chk{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink-soft);cursor:pointer}
        .chk input{width:15px;height:15px;accent-color:var(--brand)}

        .dropz{border:2px dashed var(--brand);border-radius:11px;background:var(--brand-soft);
          padding:18px;text-align:center;cursor:pointer;margin-bottom:12px}
        .dropz.on{background:var(--panel-2);border-color:var(--navy)}
        .dz-mas{font-size:20px;color:var(--brand);line-height:1}
        .dz-t{font-size:13px;font-weight:650;color:var(--brand);margin-top:4px}
        .fotos{display:flex;gap:9px;flex-wrap:wrap}
        .fo{position:relative;width:132px;height:96px;border-radius:9px;overflow:hidden;
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
        .chip-x{border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px;padding:1px 3px;border-radius:4px}
        .chip-x:hover{color:var(--crit);background:var(--crit-bg,#fdf2f2)}
        .prop{padding:10px 0;border-top:1px solid var(--line-soft)}
        .prop:first-of-type{border-top:0;padding-top:0}
        .prop-n{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .prop-pie{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:11px;
          border-top:1px solid var(--line)}
        .combo{font-size:13px;color:var(--ink-soft)} .combo b{font-size:16px;color:var(--navy)}

        .vr-tools{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .vr-tools .busca{max-width:320px;padding:7px 10px;font-size:13px}
        .vr-head,.vr{display:grid;grid-template-columns:84px minmax(0,1fr) 84px 104px 104px 74px 40px;
          gap:9px;align-items:center}
        .vr-head.sincosto,.vr.sincosto{grid-template-columns:84px minmax(0,1fr) 84px 104px 40px}
        .vr-head{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);
          font-weight:700;padding-bottom:8px;border-bottom:1px solid var(--line)}
        .vr{padding:8px 0;border-bottom:1px solid var(--line-soft)}
        .vr.off{opacity:.5}
        .vimgs{display:flex;gap:4px}
        .vimg{width:38px;height:38px;border:1px dashed var(--line);border-radius:7px;background:var(--panel-2);
          cursor:pointer;font-size:14px;line-height:1;padding:0;overflow:hidden;color:var(--muted)}
        .vimg.hay{border-style:solid;border-color:var(--line)}
        .vimg img{width:100%;height:100%;object-fit:cover}
        .vimg:hover{border-color:var(--brand)}
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
        .sim-g{display:grid;grid-template-columns:1fr 1fr;gap:14px 22px;margin-bottom:14px}
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
        .sim-kv{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
        @media(max-width:760px){.sim-kv{grid-template-columns:1fr 1fr}}
        .sim-kv span{display:block;font-size:11px;color:var(--muted)}
        .sim-kv b{font-size:16px;color:var(--navy)}
        .rutas{display:flex;gap:18px;flex-wrap:wrap}

        .pv-back{position:fixed;inset:0;background:rgba(12,22,44,.35);z-index:40}
        .pv-drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);background:var(--panel);
          z-index:41;box-shadow:-8px 0 32px rgba(12,22,44,.18);display:flex;flex-direction:column}
        .pv-top{display:flex;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}
        .pv-top h3{margin:2px 0 0;font-size:17px;color:var(--navy)}
        .pv-body{flex:1;overflow:auto;padding:16px 18px}
        .pv-h{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
          margin:16px 0 9px;padding-top:12px;border-top:1px solid var(--line-soft)}
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
