// =====================================================================
//  Belgrano Soft · Nueva cotización (Cotización → Venta)
//
//  Layout de dos columnas, al estilo de la ficha de documento:
//    · Columna principal — cabecera con el total, los datos agrupados en dos
//      bloques (cliente / operación) y las solapas Productos · Adicionales,
//      con el desglose de totales abajo a la derecha.
//    · Costado — Actividad y Notas, la ficha del cliente y los documentos
//      relacionados (última consulta, última cotización, última orden).
//
//  Los tres espacios que pidió Brian siguen estando, sólo que agrupados:
//    1) Datos del cliente (cabecera)  2) Productos  3) Adicionales (solapas)
//
//  Productos: se busca en una línea corta (sin importar tildes) y al elegir el
//  mueble se arma la variante CON BOTONES — Medida, después Estructura, después
//  Frente — y el precio se actualiza solo. No se listan los precios de todas
//  las variantes (puede haber 15 por mueble): sólo el del combo armado.
//
//  El precio nace del precio de lista y lo ajusta la condición de pago:
//  efectivo −35%; tarjeta/cuotas = lista; transferencia y mixto se ajustan
//  (mixto es editable por línea).
//  "Confirmar → Venta" crea la orden en estado CONFIRMAR (espera la seña).
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

  // Los tres ejes con su nombre, para que la línea diga QUÉ es cada cosa
  // ("Medida 1.20 · Estructura Blanca · Frente Paraíso", no "1.20 · blanca").
  const EJES = [
    { k: 'medida',     label: 'Medida' },
    { k: 'estructura', label: 'Estructura' },
    { k: 'frente',     label: 'Frente' },
  ];

  // Campos que arrancan ocultos detrás de su botón: sólo se cargan si hacen
  // falta (IG cuando no hay teléfono, DNI cuando va factura, etc.).
  const OPCIONALES = [
    { k: 'instagram', btn: '+ IG',       lbl: 'Instagram',          ph: '@usuario' },
    { k: 'dni',       btn: '+ DNI',      lbl: 'DNI (para factura)', ph: '00.000.000' },
    { k: 'tel2',      btn: '+ Teléfono', lbl: 'Teléfono adicional', ph: '11 5555-2020' },
  ];

  const Presupuesto = {
    cli: null,
    abiertos: {},        // campos opcionales revelados
    etapa: 'cliente',    // desplegable abierto: cliente | productos | adicionales | ''
    lado: 'actividad',   // actividad | notas
    vendedor: '', local: '', fecha: '', termino: 'efectivo',
    notas: '', terminos: '',
    ad: null,            // adicionales
    actividad: [],       // historial de la cotización (se arma sola)
    lineas: [],   // {key,tipo,prodNombre,varId,ejes,partes,base,cantidad,obs,precioManual,img}
    _uid: 0,
    _mount: 'view',

    // ---- Cálculo ---------------------------------------------------------
    factor() {
      if (this.termino === 'efectivo') return 1 - DESC_EFECTIVO;
      if (this.termino === 'transferencia') return 1 - DESC_TRANSFER;
      return 1; // lista, mixto
    },
    // Descuento que aplica la condición de pago, en %.
    descPct() { return Math.round((1 - this.factor()) * 100); },
    // Precio de lista, antes del descuento por condición de pago. En los muebles
    // a medida el vendedor carga el precio de LISTA, igual que en los estándar.
    lista(l) { return l.tipo === 'medida' ? (Number(l.precioManual) || 0) : l.base; },
    // Precio final por unidad. El descuento sale de la condición de pago y aplica
    // igual a estándar y a medida — lo único que cambia es de dónde sale la lista.
    unit(l) {
      // Mixto: el vendedor arma cada precio a mano (parte efectivo + parte tarjeta).
      if (this.termino === 'mixto') return l.precioManual != null ? Number(l.precioManual) : l.base;
      return this.lista(l) * this.factor();
    },
    totalLista() { return this.lineas.reduce((a, l) => a + this.lista(l) * l.cantidad, 0); },
    total() { return this.lineas.reduce((a, l) => a + this.unit(l) * l.cantidad, 0); },
    descuento() { return this.totalLista() - this.total(); },
    totalFinal() { return this.total() + (this.ad.envio || 0); },
    items() { return this.lineas.reduce((a, l) => a + l.cantidad, 0); },

    // Estándar → precio bloqueado (sale del catálogo). A medida → se libera.
    editable(l) { return l.tipo === 'medida' || this.termino === 'mixto'; },
    clienteValido() {
      const c = this.cli;
      return !!(String(c.telefono).trim() || String(c.email).trim() || String(c.instagram).trim());
    },
    // Un ítem salta a verificación de administración si es a medida o tiene detalle.
    requiereVerif(l) { return l.tipo === 'medida' || !!String(l.obs).trim(); },
    // Cambiar el plazo de entrega no es una edición libre: se audita.
    entregaEditada() { return this.ad.entrega.trim() !== global.DB.ENTREGA_DEFAULT; },
    terminoLabel() { return (TERMINOS.find(t => t.k === this.termino) || {}).label || ''; },
    nombreCli() {
      const c = this.cli;
      return c.nombre.trim() || c.telefono.trim() || c.instagram.trim() || c.email.trim();
    },

    // Cada movimiento queda anotado en el costado (y después va al CRM).
    log(quien, texto) {
      this.actividad.unshift({ quien, texto, hora: hora() });
      if (this.actividad.length > 40) this.actividad.pop();
    },

    // ---- Render ----------------------------------------------------------
    render(mount = 'view') {
      this._mount = mount;
      if (!this.cli) this.reset();
      document.getElementById(mount).innerHTML = `
        <div class="cz-bar">
          <div class="kick">Ventas · Cotizaciones</div>
          <div class="sp" style="flex:1"></div>
          <button class="btn sm" id="pr-preview">Vista previa</button>
          <button class="btn sm" id="pr-descargar">Descargar</button>
          <button class="btn sm" id="pr-print">Imprimir</button>
          <span class="cz-sep"></span>
          <button class="btn sm" id="pr-guardar">Guardar</button>
          <button class="btn sm primary" id="pr-venta">Confirmar → Venta</button>
        </div>
        <div class="cz-wrap">
          <div id="cz-main"></div>
          <aside id="cz-side"></aside>
        </div>
        ${this.estilos()}`;

      document.getElementById('pr-preview').onclick = () => this.accion('preview');
      document.getElementById('pr-descargar').onclick = () => this.accion('descargar');
      document.getElementById('pr-print').onclick = () => this.accion('print');
      document.getElementById('pr-guardar').onclick = () => this.accion('guardar');
      document.getElementById('pr-venta').onclick = () => this.convertir();
      this.pintarTodo();
    },

    pintarTodo() { this.pintarMain(); this.pintarSide(); },

    // ---- Columna principal -----------------------------------------------
    // Cabecera fija + las tres etapas como desplegables: se completa una, se
    // cierra sola y se abre la siguiente. Igual se puede abrir/cerrar a mano,
    // así queda todo en una sola pantalla.
    pintarMain() {
      const m = document.getElementById('cz-main'); if (!m) return;
      const secs = [
        { k: 'cliente',     n: 1, tit: 'Datos del cliente' },
        { k: 'productos',   n: 2, tit: 'Productos' },
        { k: 'adicionales', n: 3, tit: 'Adicionales' },
      ];
      m.innerHTML = `
        <div class="card pad cz-head" id="cz-cab"></div>
        ${secs.map(s => {
          const on = this.etapa === s.k;
          return `<section class="card sec ${on ? 'on' : ''}">
            <button class="sec-h" data-sec="${s.k}" aria-expanded="${on}">
              <span class="sec-n">${s.n}</span>
              <span class="sec-t">${UI.esc(s.tit)}</span>
              <span class="sec-r">${this.resumen(s.k)}</span>
              <span class="sec-c">${on ? '▲' : '▼'}</span>
            </button>
            ${on ? `<div class="sec-b" id="sec-${s.k}"></div>` : ''}
          </section>`;
        }).join('')}
        <div class="card cz-foot">
          <div class="cz-tyc">
            <div class="lbl">Observaciones</div>
            <textarea id="op-nota2" rows="2" placeholder="Observaciones de la orden…">${UI.esc(this.notas)}</textarea>
            <div class="lbl" style="margin-top:12px">Términos y condiciones</div>
            <textarea id="cz-tyc" rows="2" placeholder="Escribir términos y condiciones…">${UI.esc(this.terminos)}</textarea>
          </div>
          <div id="cz-tot"></div>
        </div>`;

      m.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => {
        this.etapa = this.etapa === b.dataset.sec ? '' : b.dataset.sec;
        this.pintarMain();
      });
      document.getElementById('op-nota2').oninput = e => { this.notas = e.target.value; };
      document.getElementById('cz-tyc').oninput = e => { this.terminos = e.target.value; };

      this.pintarCabecera();
      if (this.etapa === 'cliente') this.pintarCliente();
      if (this.etapa === 'productos') this.pintarProductos();
      if (this.etapa === 'adicionales') this.pintarAdicionales();
      this.pintarTotales();
    },

    // Línea corta al costado del título, para saber qué hay adentro sin abrir.
    resumen(k) {
      if (k === 'cliente') {
        const c = this.cli;
        const partes = [c.nombre.trim(), c.telefono.trim() || c.email.trim() || c.instagram.trim()].filter(Boolean);
        return partes.length ? UI.esc(partes.join(' · ')) : '<i>sin cargar</i>';
      }
      if (k === 'productos') {
        const n = this.items();
        return n ? `${n} ${n === 1 ? 'producto' : 'productos'} · ${UI.pesos(this.total())} · ${UI.esc(this.terminoLabel())}`
          : '<i>sin productos</i>';
      }
      const env = this.ad.envio ? UI.pesos(this.ad.envio) : 'envío a definir';
      return `${UI.esc(this.ad.entrega)} · ${env}`;
    },

    // Cabecera: quién y cuándo hace el presupuesto (no el total — eso va abajo).
    pintarCabecera() {
      const c = document.getElementById('cz-cab'); if (!c) return;
      const vends = global.DB.vendedores(), locs = global.DB.locales();
      c.innerHTML = `
        <div class="cz-tit">
          <div>
            <div class="kick">Cotización</div>
            <h1 class="h-title" style="margin:2px 0 0">${UI.esc(this.nombreCli() || 'Nueva')}</h1>
          </div>
          <div class="sp" style="flex:1"></div>
          <div class="cz-box">
            <div class="fr sm"><label for="op-vend">Vendedor</label>
              <select id="op-vend">${vends.map(v => `<option ${this.vendedor === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="fr sm"><label for="op-local">Local de origen</label>
              <select id="op-local">${locs.map(l => `<option value="${l.k}" ${this.local === l.k ? 'selected' : ''}>${UI.esc(l.label)}</option>`).join('')}</select></div>
            <div class="fr sm"><label for="op-fecha">Fecha</label>
              <input id="op-fecha" type="date" value="${UI.esc(this.fecha)}"></div>
          </div>
        </div>`;
      document.getElementById('op-vend').onchange = e => { this.vendedor = e.target.value; };
      document.getElementById('op-local').onchange = e => { this.local = e.target.value; };
      document.getElementById('op-fecha').onchange = e => { this.fecha = e.target.value; };
    },

    // ---- 1 · Datos del cliente ------------------------------------------
    // Sólo datos del cliente. La condición de pago NO va acá: es un dato de la
    // orden y hace falta para cotizar los muebles, así que vive en Productos.
    pintarCliente() {
      const c = document.getElementById('sec-cliente'); if (!c) return;
      const locds = global.DB.localidades();
      const f = (id, lbl, val, ph) => `<div class="fr"><label for="${id}">${UI.esc(lbl)}</label>
        <input id="${id}" value="${UI.esc(val)}" placeholder="${UI.esc(ph)}"></div>`;
      const sel = (id, lbl, opts) => `<div class="fr"><label for="${id}">${UI.esc(lbl)}</label>
        <select id="${id}">${opts}</select></div>`;

      const ocultos = OPCIONALES.filter(o => this.abiertos[o.k])
        .map(o => f('c-' + o.k, o.lbl, this.cli[o.k], o.ph)).join('');
      const addBtns = OPCIONALES.filter(o => !this.abiertos[o.k])
        .map(o => `<button class="chip-add" data-add="${o.k}">${UI.esc(o.btn)}</button>`).join('');

      c.innerHTML = `
        <div class="cz-cols">
          <div class="cz-col">
            ${f('c-nombre', 'Cliente', this.cli.nombre, 'Nombre y apellido')}
            ${f('c-tel', 'Teléfono', this.cli.telefono, '11 5555-2020')}
            ${f('c-mail', 'Email', this.cli.email, 'cliente@correo.com')}
          </div>
          <div class="cz-col">
            ${f('c-dom', 'Domicilio de entrega', this.cli.domicilio, 'Calle 1234, piso/depto')}
            ${sel('c-locd', 'Localidad', `<option value="">Elegí…</option>` +
              locds.map(l => `<option value="${l.k}" ${this.cli.localidad === l.k ? 'selected' : ''}>${UI.esc(l.label)}</option>`).join(''))}
            ${sel('c-canal', '¿Cómo nos conoció?', `<option value="">—</option>` +
              ['Instagram', 'Facebook', 'Recomendación', 'Pasó por el local', 'Google', 'Otro']
                .map(o => `<option ${this.cli.canal === o ? 'selected' : ''}>${o}</option>`).join(''))}
          </div>
        </div>
        ${ocultos ? `<div class="cz-cols" style="margin-top:9px">${ocultos}</div>` : ''}
        ${addBtns ? `<div class="adds">${addBtns}</div>` : ''}
        <div id="c-aviso"></div>
        <div class="sec-go"><button class="btn sm primary" id="c-sig">Continuar → Productos</button></div>`;

      const bind = (id, campo) => {
        const el = document.getElementById(id); if (!el) return;
        el.oninput = () => { this.cli[campo] = el.value; this.avisoCliente(); this.pintarCabecera(); this.pintarSide(); };
      };
      bind('c-nombre', 'nombre'); bind('c-tel', 'telefono');
      bind('c-mail', 'email'); bind('c-dom', 'domicilio');
      OPCIONALES.forEach(o => bind('c-' + o.k, o.k));
      c.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { this.abiertos[b.dataset.add] = true; this.pintarCliente(); });
      document.getElementById('c-canal').onchange = e => { this.cli.canal = e.target.value; };
      // Elegir localidad trae el costo de envío por default (editable en Adicionales).
      document.getElementById('c-locd').onchange = e => {
        this.cli.localidad = e.target.value;
        if (!this.ad.envioTocado) {
          this.ad.envio = global.DB.fleteDe(this.cli.localidad);
          this.log('Sistema', `Cargó el envío por localidad: ${UI.pesos(this.ad.envio)}`);
        }
        this.pintarTodo();
      };
      document.getElementById('c-sig').onclick = () => { this.etapa = 'productos'; this.pintarMain(); };
      this.avisoCliente();
    },

    avisoCliente() {
      const a = document.getElementById('c-aviso'); if (!a) return;
      a.innerHTML = this.clienteValido() ? '' :
        `<div class="banner warn" style="margin:12px 0 0">Cargá al menos <b>teléfono, Instagram o mail</b> — es lo que arma al cliente. El nombre puede quedar para después.</div>`;
    },
    notaTermino() {
      const n = document.getElementById('op-nota'); if (!n) return;
      n.innerHTML = this.termino === 'efectivo' ? 'Precio de lista <b>−35%</b>.'
        : this.termino === 'transferencia' ? 'Descuento <b>a definir</b> (por ahora = lista).'
        : this.termino === 'mixto' ? 'El vendedor <b>edita cada precio</b>.'
        : 'Precio de lista, en 3 · 6 · 12 cuotas.';
    },

    // ---- 2 · Productos ----------------------------------------------------
    // Arranca con la condición de pago: es un dato de la ORDEN, no del cliente,
    // y es la que define con qué lista se cotizan los muebles.
    pintarProductos() {
      const cont = document.getElementById('sec-productos'); if (!cont) return;
      cont.innerHTML = `
        <div class="pr-cond">
          <div class="fr"><label for="op-term">Condición de pago</label>
            <select id="op-term">${TERMINOS.map(t => `<option value="${t.k}" ${this.termino === t.k ? 'selected' : ''}>${UI.esc(t.label)}</option>`).join('')}</select></div>
          <div class="muted" id="op-nota" style="font-size:12px"></div>
        </div>
        <div class="lhead"><span>Producto</span><span>Tipo</span><span></span><span>Cant.</span>
          <span>Detalle</span><span style="text-align:center">Dto.</span>
          <span style="text-align:right">Precio unit.</span>
          <span style="text-align:right">Subtotal</span><span></span></div>
        <div id="pr-lineas"></div>
        <div class="srow">
          <input id="pr-buscar" class="busca" placeholder="Buscar un producto…" autocomplete="off">
          <button class="lnk" id="pr-catalogo">Catálogo</button>
          <div class="sp" style="flex:1"></div>
          <div class="pr-sum">Total de los muebles <b class="tnum">${UI.pesos(this.total())}</b></div>
          <div id="pr-drop"></div>
        </div>
        <div class="sec-go"><button class="btn sm primary" id="p-sig">Continuar → Adicionales</button></div>`;

      document.getElementById('op-term').onchange = e => {
        this.termino = e.target.value;
        this.ad.saldoEn = this.terminoLabel();   // "Saldo se abona en" sigue a la condición
        this.log('Sistema', `Calculó descuento por condición de pago: ${this.terminoLabel()}`);
        this.pintarMain(); this.pintarSide();
      };
      document.getElementById('pr-catalogo').onclick = () => this.modalCatalogo();
      document.getElementById('p-sig').onclick = () => { this.etapa = 'adicionales'; this.pintarMain(); };
      const inp = document.getElementById('pr-buscar');
      let t; inp.oninput = () => { clearTimeout(t); t = setTimeout(() => this.buscarInline(inp.value.trim()), 220); };
      inp.onblur = () => setTimeout(() => { const d = document.getElementById('pr-drop'); if (d) d.innerHTML = ''; }, 180);
      this.notaTermino();
      this.pintar();
    },

    pintar() {
      const cont = document.getElementById('pr-lineas'); if (!cont) return;
      if (!this.lineas.length) {
        cont.innerHTML = UI.vacio('Buscá un mueble abajo para empezar la cotización.');
        this.refrescarProductos(); return;
      }
      cont.innerHTML = this.lineas.map(l => {
        const sub = this.unit(l) * l.cantidad, ed = this.editable(l), pct = this.descPct();
        const medida = l.tipo === 'medida';
        const nombre = medida && !l.prodNombre
          ? `<input value="" data-nom="${l.key}" placeholder="Mueble a medida" style="font-weight:650">`
          : `<div class="n">${UI.esc(l.prodNombre || 'Mueble a medida')}</div>
             <div class="v">${UI.esc(l.ejes)}</div>`;
        // La columna muestra siempre el precio de LISTA: el descuento de la
        // condición de pago se ve aparte y ya viene aplicado en el subtotal.
        // Estándar → bloqueado (sale del catálogo). A medida → lo carga el vendedor.
        const precioCel = ed
          ? `<input type="number" min="0" class="pnum" value="${l.precioManual != null ? l.precioManual : Math.round(this.lista(l))}" data-precio="${l.key}" aria-label="Precio unitario de lista">`
          : `<div class="lock tnum">${UI.pesos(this.lista(l))} 🔒</div>`;
        // La imagen va al lado del tipo y sólo en los a medida: el vendedor
        // tiene que mostrar qué le pidió el cliente. Los estándar la traen del
        // catálogo (Tienda Nube) y sólo se muestra si ya existe.
        const imgCel = medida || l.img
          ? `<button class="thumb" data-img="${l.key}" title="${l.img ? 'Cambiar imagen' : 'Cargar imagen del mueble a medida'}">${
              l.img ? `<img src="${UI.esc(l.img)}" alt="">` : '<span>+</span>'}</button>`
          : '<span></span>';
        return `<div class="lrow" data-l="${l.key}">
          <div>${nombre}</div>
          <div><button class="tipo ${medida ? 'med' : ''}" data-tipo="${l.key}">${medida ? 'A medida' : 'Estándar'}</button></div>
          ${imgCel}
          <input type="number" min="1" value="${l.cantidad}" data-cant="${l.key}" aria-label="Cantidad">
          <input value="${UI.esc(l.obs)}" data-obs="${l.key}" placeholder="—" aria-label="Detalle">
          <div class="dto">${pct ? `<span class="pill ok">${pct}%</span>` : '—'}</div>
          ${precioCel}
          <div class="sub tnum">${UI.pesos(sub)}</div>
          <button class="lx" data-del="${l.key}" title="Quitar">✕</button></div>`;
      }).join('');

      cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        const l = this.get(b.dataset.del);
        this.lineas = this.lineas.filter(x => x.key !== Number(b.dataset.del));
        if (l) this.log(this.vendedor, `Quitó ${l.prodNombre || 'un producto'}`);
        this.pintar();
      });
      cont.querySelectorAll('[data-cant]').forEach(i => i.onchange = () => { const l = this.get(i.dataset.cant); if (l) { l.cantidad = Math.max(1, Math.floor(Number(i.value) || 1)); this.pintar(); } });
      cont.querySelectorAll('[data-obs]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.obs); if (l) l.obs = i.value; });
      cont.querySelectorAll('[data-nom]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.nom); if (l) l.prodNombre = i.value; });
      cont.querySelectorAll('[data-precio]').forEach(i => i.onchange = () => { const l = this.get(i.dataset.precio); if (l) { l.precioManual = Math.max(0, Number(i.value) || 0); this.pintar(); } });
      // "A medida" es una opción DENTRO del producto, no un ítem suelto:
      // se pasa la línea a medida y ahí se libera el precio.
      cont.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => this.alternarTipo(this.get(b.dataset.tipo)));
      cont.querySelectorAll('[data-img]').forEach(b => b.onclick = () => this.cargarImagen(this.get(b.dataset.img)));
      this.refrescarProductos();
    },
    // Refresca lo que depende de las líneas sin volver a dibujar la tabla.
    refrescarProductos() {
      this.pintarTotales();
      const s = document.querySelector('.pr-sum b');
      if (s) s.textContent = UI.pesos(this.total());
    },
    get(key) { return this.lineas.find(x => x.key === Number(key)); },

    alternarTipo(l) {
      if (!l) return;
      if (l.tipo === 'estandar') {
        l.tipo = 'medida';
        l.precioManual = Math.round(l.base);
        l.ejes = l.ejes ? l.ejes + ' · adaptado' : 'a medida';
        this.log(this.vendedor, `Pasó ${l.prodNombre} a medida`);
      } else {
        l.tipo = 'estandar';
        l.precioManual = null;
        l.ejes = l.partes ? textoEjes(l.partes) : l.ejes.replace(/ · adaptado$/, '');
      }
      this.pintar(); this.pintarTodo();
    },

    // Imagen del mueble. Los a medida la necesitan sí o sí (el vendedor saca la
    // foto de lo que pide el cliente); los estándar idealmente la traen de
    // Tienda Nube y se puede reemplazar.
    cargarImagen(l) {
      if (!l) return;
      this.modal(`<h3 style="color:var(--navy)">Imagen del producto</h3>
        <p class="muted" style="font-size:13px;margin:8px 0 12px">
          Pegá el link de la imagen. En los muebles <b>a medida</b> la foto es la que
          le explica a fábrica qué pidió el cliente.</p>
        <div class="fr"><label for="im-url">URL de la imagen</label>
          <input id="im-url" value="${UI.esc(l.img || '')}" placeholder="https://…"></div>
        <div class="row" style="margin-top:14px;justify-content:flex-end;gap:10px">
          ${l.img ? '<button class="btn" id="im-quitar">Quitar</button>' : ''}
          <button class="btn primary" id="im-ok">Guardar</button></div>`, m => {
        document.getElementById('im-ok').onclick = () => {
          l.img = document.getElementById('im-url').value.trim();
          this.log(this.vendedor, `Cargó imagen de ${l.prodNombre || 'un producto'}`);
          m.remove(); this.pintar(); this.pintarSide();
        };
        const q = document.getElementById('im-quitar');
        if (q) q.onclick = () => { l.img = ''; m.remove(); this.pintar(); };
      });
    },

    async buscarInline(texto) {
      const drop = document.getElementById('pr-drop'); if (!drop) return;
      if (!texto) { drop.innerHTML = ''; return; }
      drop.innerHTML = `<div class="drop"><div class="it muted">${UI.spinner('Buscando…')}</div></div>`;
      try {
        // La búsqueda ya es insensible a tildes (DB compara contra nombre_norm),
        // así "comoda" trae "CÓMODA".
        const prods = await global.DB.productos({ texto, limite: 20 });
        if (!prods.length) { drop.innerHTML = `<div class="drop"><div class="it muted">Nada con “${UI.esc(texto)}”. Probá el Catálogo.</div></div>`; return; }
        drop.innerHTML = `<div class="drop">${prods.map(p => `<div class="it" data-pick="${p.id}"><span>${UI.esc(p.nombre)}</span>${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}<span class="sp" style="flex:1"></span><span class="cnt">${p.variantes} var.</span></div>`).join('')}</div>`;
        drop.querySelectorAll('[data-pick]').forEach(it => it.onmousedown = e => { e.preventDefault(); this.elegirProducto(Number(it.dataset.pick), prods.find(p => p.id === Number(it.dataset.pick))); });
      } catch (e) { drop.innerHTML = `<div class="drop"><div class="it muted">${UI.esc(e.message || e)}</div></div>`; }
    },

    async elegirProducto(prodId, prod) {
      const drop = document.getElementById('pr-drop'); if (drop) drop.innerHTML = '';
      const inp = document.getElementById('pr-buscar'); if (inp) inp.value = '';
      let vars;
      try { vars = await global.DB.variantes(prodId); } catch (e) { UI.aviso(String(e.message || e), 'crit'); return; }
      if (!vars.length) { UI.aviso('Ese producto no tiene variantes', 'warn'); return; }
      if (vars.length === 1) return this.agregarEstandar(prod.nombre, vars[0], prod.img);
      this.modalVariante(prod, vars);
    },

    agregarEstandar(prodNombre, variante, img = '') {
      const partes = EJES.filter(e => variante[e.k]).map(e => ({ lbl: e.label, val: variante[e.k] }));
      this.lineas.push({
        key: ++this._uid, tipo: 'estandar', prodNombre, varId: variante.id,
        partes, ejes: textoEjes(partes), base: Number(variante.precio) || 0,
        cantidad: 1, obs: '', precioManual: null, img: img || variante.img || '',
      });
      this.log(this.vendedor, `Agregó producto ${prodNombre}`);
      this.pintar(); this.pintarCabecera(); this.pintarSide();
      UI.aviso('Producto agregado', 'ok');
    },

    // ---- 3 · Adicionales ---------------------------------------------------
    // Son las preguntas que siempre hay que anotar; casi todas salen por
    // default y el vendedor sólo corrige lo que cambia.
    pintarAdicionales() {
      const c = document.getElementById('sec-adicionales'); if (!c) return;
      const a = this.ad, DB = global.DB;
      const locd = (DB.localidades().find(l => l.k === this.cli.localidad) || {}).label;

      c.innerHTML = `<div class="cz-cols">
        <div class="cz-col">
          <div class="fr"><label for="ad-entrega">Tiempo de entrega</label>
            <input id="ad-entrega" value="${UI.esc(a.entrega)}"></div>
          <div class="fr"><label for="ad-saldo">Saldo se abona en</label>
            <input id="ad-saldo" value="${UI.esc(a.saldoEn)}" readonly title="Sale de la condición de pago"></div>
          <div class="fr"><label for="ad-envio">Costo de envío</label>
            <input id="ad-envio" type="number" min="0" value="${a.envio}"></div>
          <div class="fr"><label></label><span class="hint">${locd
            ? `Por default de <b>${UI.esc(locd)}</b>.` : 'Elegí la localidad arriba.'}</span></div>
        </div>
        <div class="cz-col">
          <div class="fr"><label for="ad-inst">¿Requiere instalación?</label>
            <select id="ad-inst">
              <option value="no" ${a.instalacion === 'no' ? 'selected' : ''}>No</option>
              <option value="si" ${a.instalacion === 'si' ? 'selected' : ''}>Sí</option>
            </select></div>
          <div class="fr"><label for="ad-esc">Subida por escalera</label>
            <input id="ad-esc" type="number" min="0" value="${a.escalera}"></div>
          <div class="fr"><label></label><span class="hint">No se calcula: va como aviso en la cotización.</span></div>
          <div class="fr"><label>IVA</label><input value="${UI.esc(DB.IVA_LEYENDA)}" readonly></div>
        </div>
      </div><div id="ad-avisos"></div>
      <div class="sec-go"><button class="btn sm" id="a-cerrar">Listo — cerrar</button></div>`;

      document.getElementById('a-cerrar').onclick = () => { this.etapa = ''; this.pintarMain(); };

      const av = () => {
        const box = document.getElementById('ad-avisos'); if (!box) return;
        const out = [];
        if (this.entregaEditada()) out.push(`<div class="banner warn">Cambiaste el plazo de entrega — la orden va a <b>verificarse</b> y el cambio queda registrado.</div>`);
        out.push(`<div class="banner">Subida por escalera: <b>${UI.esc(DB.escaleraTexto(a.escalera))}</b>. Se cobra según los pisos reales al momento de la entrega.</div>`);
        if (a.instalacion === 'si') out.push(`<div class="banner">La orden pide <b>instalación</b> — Logística la agenda con el armador.</div>`);
        box.innerHTML = out.join('');
      };

      document.getElementById('ad-entrega').oninput = e => { a.entrega = e.target.value; av(); };
      document.getElementById('ad-envio').oninput = e => {
        a.envio = Math.max(0, Number(e.target.value) || 0); a.envioTocado = true;
        this.pintarTotales();
      };
      document.getElementById('ad-inst').onchange = e => { a.instalacion = e.target.value; av(); };
      document.getElementById('ad-esc').oninput = e => { a.escalera = Math.max(0, Number(e.target.value) || 0); av(); };
      av();
    },

    // ---- Desglose de totales ----------------------------------------------
    pintarTotales() {
      const t = document.getElementById('cz-tot'); if (!t) return;
      const lista = this.totalLista(), desc = this.descuento(), muebles = this.total();
      const envio = this.ad.envio || 0;
      const pct = this.descPct() ? ` (${this.descPct()}%)` : '';
      const fila = (l, v, cls = '') => `<div class="tr ${cls}"><span>${l}</span><b class="tnum">${v}</b></div>`;
      t.innerHTML = `<div class="cz-tots">
        ${fila('Muebles (lista)', UI.pesos(lista))}
        ${desc ? fila('Descuento' + pct, '−' + UI.pesos(desc), 'neg') : ''}
        ${desc ? fila('Subtotal muebles', UI.pesos(muebles)) : ''}
        ${fila('Envío', envio ? UI.pesos(envio) : 'a definir')}
        ${fila('Total', UI.pesos(this.totalFinal()), 'big')}
        <div class="tiva">${UI.esc(global.DB.IVA_LEYENDA)}</div>
      </div>`;
    },

    // ---- Costado: Actividad · Notas · Cliente · Documentos ----------------
    pintarSide() {
      const s = document.getElementById('cz-side'); if (!s) return;
      const c = this.cli, DB = global.DB;
      const ident = this.nombreCli();
      const ficha = DB.fichaCliente(ident);

      s.innerHTML = `
        <div class="card cz-sc">
          <div class="tabs sm">
            <button class="tab ${this.lado === 'actividad' ? 'on' : ''}" data-l="actividad">Actividad</button>
            <button class="tab ${this.lado === 'notas' ? 'on' : ''}" data-l="notas">Notas</button>
          </div>
          <div class="cz-sb">${this.lado === 'actividad' ? this.actividadHTML() : this.notasHTML()}</div>
        </div>

        <div class="card cz-sc">
          <div class="cz-sh">Cliente</div>
          <div class="cz-sb">
            ${ident ? `<div class="cli-row">
              <span class="ava">${UI.esc(inic(ident))}</span>
              <b>${UI.esc(ident)}</b>
              ${ficha && ficha.recurrente ? '<span class="pill ok">Frecuente</span>' : '<span class="pill soft">Nuevo</span>'}
            </div>
            <div class="cli-d">${[
              c.telefono && `☎ ${UI.esc(c.telefono)}`,
              c.tel2 && `☎ ${UI.esc(c.tel2)}`,
              c.email && `✉ ${UI.esc(c.email)}`,
              c.instagram && `◎ ${UI.esc(c.instagram)}`,
              c.domicilio && `⌂ ${UI.esc(c.domicilio)}`,
            ].filter(Boolean).join('<br>') || '<span class="muted">Sin datos de contacto todavía.</span>'}</div>
            <button class="btn sm" id="cz-ficha" style="width:100%;margin-top:10px">Ver ficha completa</button>`
            : `<div class="muted" style="font-size:12.5px">Cargá el nombre o el contacto y acá aparece la ficha.</div>`}
          </div>
        </div>

        <div class="card cz-sc">
          <div class="cz-sh">Documentos relacionados</div>
          <div class="cz-sb">${ficha && ficha.docs.length
            ? ficha.docs.map(d => `<div class="doc"><span class="di">▤</span>
                <div><div class="dt">${UI.esc(d.tipo)}</div>
                  <div class="dr">${UI.esc(d.ref)}${d.f ? ` (${UI.esc(d.f)})` : ''}</div></div></div>`).join('')
            : '<div class="muted" style="font-size:12.5px">Sin antecedentes para este cliente.</div>'}</div>
        </div>`;

      s.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { this.lado = b.dataset.l; this.pintarSide(); });
      const fi = document.getElementById('cz-ficha');
      if (fi) fi.onclick = () => global.App.goSub('crm', 'clientes');
      const na = document.getElementById('cz-nota');
      if (na) na.oninput = () => { this.notas = na.value; };
    },

    actividadHTML() {
      if (!this.actividad.length) return '<div class="muted" style="font-size:12.5px">Todavía no pasó nada en esta cotización.</div>';
      return this.actividad.map(a => `<div class="act">
        <span class="ava ${a.quien === 'Sistema' ? 'sys' : ''}">${UI.esc(inic(a.quien))}</span>
        <div><div class="aq">${UI.esc(a.quien)}<span class="ah">${UI.esc(a.hora)}</span></div>
          <div class="at">${UI.esc(a.texto)}</div></div></div>`).join('');
    },
    notasHTML() {
      return `<textarea id="cz-nota" rows="7" placeholder="Notas internas de la cotización…">${UI.esc(this.notas)}</textarea>`;
    },

    // ---- Acciones ---------------------------------------------------------
    accion(tipo) {
      if (!this.clienteValido()) {
        if (tipo === 'guardar') { this.avisoCliente(); return this.popIdentidad('guardar'); }
        return this.popIdentidad(tipo);
      }
      if (tipo !== 'guardar' && !this.lineas.length) { UI.aviso('Agregá al menos un producto', 'warn'); return; }
      if (tipo === 'preview') return this.modalPreview('ver');
      if (tipo === 'print') return this.modalPreview('print');
      if (tipo === 'descargar') return this.modalPreview('descargar');
      if (tipo === 'guardar') { this.log(this.vendedor, 'Guardó la cotización'); this.pintarSide(); return UI.aviso('Borrador guardado (demo)', 'ok'); }
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
        if (ig) ig.onclick = () => { m.remove(); this.modalPreview(tipoOrig === 'print' ? 'print' : 'ver'); };
      });
    },

    // ---- Confirmar → Venta (estado CONFIRMAR) ------------------------------
    convertir() {
      if (!this.clienteValido()) { this.avisoCliente(); return this.popIdentidad('convertir'); }
      if (!this.lineas.length) return UI.aviso('Agregá al menos un producto', 'warn');
      if (!this.vendedor) return UI.aviso('Elegí el vendedor de la operación', 'warn');
      const incompletos = this.lineas.filter(l => l.tipo === 'medida' && (!l.prodNombre.trim() || !(Number(l.precioManual) > 0)));
      if (incompletos.length) return UI.aviso('Completá nombre y precio de los productos a medida', 'warn');

      const verif = this.lineas.filter(l => this.requiereVerif(l)).length;
      const plazo = this.entregaEditada();
      const muebles = this.total(), envio = this.ad.envio || 0, total = this.totalFinal();
      const nombreCli = this.nombreCli();
      this.modal(`<h3 style="color:var(--navy)">Confirmar → Venta</h3>
        <p style="margin:10px 0 0">Se crea la orden en estado <span class="pill warn">Confirmar</span> — a la espera de la seña (mínimo 30%).</p>
        <table style="margin-top:12px"><tbody>
          <tr><td class="muted">Cliente</td><td style="text-align:right"><b>${UI.esc(nombreCli)}</b></td></tr>
          <tr><td class="muted">Vendedor · Local</td><td style="text-align:right">${UI.esc(this.vendedor)} · ${UI.esc(this.local)}</td></tr>
          <tr><td class="muted">Condición de pago</td><td style="text-align:right">${UI.esc(this.terminoLabel())}</td></tr>
          <tr><td class="muted">Entrega</td><td style="text-align:right">${UI.esc(this.ad.entrega)}</td></tr>
          <tr><td class="muted">Productos</td><td style="text-align:right">${this.lineas.length}${verif ? ` · <span style="color:var(--warn)">${verif} a verificar</span>` : ''}</td></tr>
          <tr><td class="muted">Muebles</td><td style="text-align:right" class="tnum">${UI.pesos(muebles)}</td></tr>
          <tr><td class="muted">Envío</td><td style="text-align:right" class="tnum">${envio ? UI.pesos(envio) : 'a definir'}</td></tr>
          <tr><td class="muted">Total</td><td style="text-align:right"><b class="tnum">${UI.pesos(total)}</b></td></tr>
        </tbody></table>
        ${verif ? `<div class="banner warn" style="margin-top:12px">${verif} producto(s) a medida / con detalle van a <b>verificarse en Administración</b>.</div>` : ''}
        ${plazo ? `<div class="banner warn" style="margin-top:10px">El <b>plazo de entrega</b> se cambió (${UI.esc(this.ad.entrega)}) — queda registrado y va a verificación.</div>` : ''}
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="cv-cancel">Cancelar</button>
          <button class="btn primary" id="cv-ok">Crear orden en Confirmar</button></div>`, m => {
        document.getElementById('cv-cancel').onclick = () => m.remove();
        document.getElementById('cv-ok').onclick = () => {
          const orden = global.DB.crearOrden({
            cliente: nombreCli, vendedor: this.vendedor, local: this.local, total,
            termino: this.termino, fecha: hoy(),
            lineas: this.lineas.map(l => ({ nombre: l.prodNombre, cant: l.cantidad, unit: this.unit(l), obs: l.obs, tipo: l.tipo, img: l.img })),
          });
          m.remove();
          this.reset();
          UI.aviso(`Orden ${orden.numero} creada en estado Confirmar`, 'ok');
          global.App.goSub('ventas', 'ordenes');
        };
      });
    },

    reset() {
      const s = global.DB.sesion();
      this.cli = { nombre: '', telefono: '', email: '', instagram: '', dni: '', tel2: '', canal: '', domicilio: '', localidad: '' };
      this.abiertos = {}; this.etapa = 'cliente'; this.lado = 'actividad';
      // Vendedor y local salen del usuario de la sesión; igual se pueden editar.
      this.vendedor = s.vendedor; this.local = s.local; this.fecha = hoy(); this.termino = 'efectivo';
      this.notas = ''; this.terminos = '';
      this.ad = {
        entrega: global.DB.ENTREGA_DEFAULT,
        saldoEn: this.terminoLabel(),
        envio: 0, envioTocado: false,
        instalacion: 'no',
        escalera: global.DB.ESCALERA_DEFAULT,
      };
      this.lineas = []; this._uid = 0;
      this.actividad = [];
      this.log(this.vendedor, 'Creó la cotización');
    },

    // ---- Vista previa / descarga / impresión -------------------------------
    cuerpoPreview() {
      const term = this.terminoLabel(), a = this.ad, DB = global.DB;
      const c = this.cli;
      const ident = [c.telefono, c.tel2, c.email, c.instagram].filter(Boolean).join(' · ');
      const dom = [c.domicilio, (DB.localidades().find(l => l.k === c.localidad) || {}).label].filter(Boolean).join(' · ');
      const lista = this.totalLista(), desc = this.descuento(), envio = a.envio || 0;
      return `<div class="pv">
        <div class="pv-h"><h2>Belgrano Home</h2><div class="muted">Cotización · ${UI.esc(term)}</div></div>
        <div class="pv-cli"><b>${UI.esc(c.nombre || 'Cliente')}</b>
          <div class="muted">${UI.esc(ident)}</div>${dom ? `<div class="muted">${UI.esc(dom)}</div>` : ''}</div>
        <table><thead><tr><th>Producto</th><th>Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${this.lineas.map(l => { const u = this.unit(l), s = u * l.cantidad;
          return `<tr><td><b>${UI.esc(l.prodNombre || '—')}</b><br><span class="muted">${UI.esc(l.ejes)}${l.obs ? ' · ' + UI.esc(l.obs) : ''}</span></td>
          <td>${l.cantidad}</td><td style="text-align:right" class="tnum">${UI.pesos(u)}</td><td style="text-align:right" class="tnum">${UI.pesos(s)}</td></tr>`; }).join('')}</tbody></table>
        <div class="pv-tot">
          <div>Muebles (lista) <b class="tnum">${UI.pesos(lista)}</b></div>
          ${desc ? `<div>Descuento <b class="tnum">−${UI.pesos(desc)}</b></div>` : ''}
          <div>Envío <b class="tnum">${envio ? UI.pesos(envio) : 'a definir'}</b></div>
          <div class="big">Total <b class="tnum">${UI.pesos(this.totalFinal())}</b></div>
        </div>
        <div class="pv-ad">
          <div><b>Tiempo de entrega:</b> ${UI.esc(a.entrega)}</div>
          <div><b>Saldo se abona en:</b> ${UI.esc(a.saldoEn)}</div>
          <div><b>Instalación:</b> ${a.instalacion === 'si' ? 'Sí' : 'No'}</div>
          <div><b>Subida por escalera:</b> ${UI.esc(DB.escaleraTexto(a.escalera))}</div>
          <div>${UI.esc(DB.IVA_LEYENDA)}</div>
          ${this.terminos ? `<div style="margin-top:8px">${UI.esc(this.terminos)}</div>` : ''}
        </div></div>`;
    },
    estiloPreview() {
      return `<style>.pv{color:#141a26;font-family:-apple-system,system-ui,sans-serif}
        .pv-h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1c2b4a;padding-bottom:8px;margin-bottom:14px}
        .pv-h h2{color:#1c2b4a;margin:0}.pv .muted{color:#7d8aa3}.pv-cli{margin-bottom:14px}.pv table{width:100%;border-collapse:collapse;font-size:14px}
        .pv th{text-align:left;font-size:11px;text-transform:uppercase;color:#7d8aa3;border-bottom:1px solid #dbe1ec;padding:8px}
        .pv td{padding:9px 8px;border-bottom:1px solid #eef1f6;vertical-align:top}
        .pv-tot{margin-top:16px;margin-left:auto;width:280px;font-size:13.5px;color:#48566e}
        .pv-tot div{display:flex;justify-content:space-between;padding:3px 0}
        .pv-tot b{color:#1c2b4a}
        .pv-tot .big{border-top:1px solid #dbe1ec;margin-top:5px;padding-top:7px;font-size:17px;color:#1c2b4a}
        .pv-ad{margin-top:22px;border-top:1px solid #dbe1ec;padding-top:12px;font-size:12.5px;color:#48566e;line-height:1.8}</style>`;
    },
    // Se abre para ver, imprimir o bajar el archivo — hoy la cotización se
    // manda por la plataforma que usan, así que alcanza con el archivo.
    modalPreview(modo) {
      const cuerpo = this.estiloPreview() + this.cuerpoPreview();
      const nombre = `Cotizacion-${(this.nombreCli() || 'cliente').replace(/[^\w\-]+/g, '_')}.html`;
      if (modo === 'print') {
        try { const w = global.open('', '_blank'); if (w) { w.document.write(`<title>Cotización</title>${cuerpo}`); w.document.close(); w.focus(); w.print(); return; } } catch (e) {}
      }
      if (modo === 'descargar') return this.bajar(nombre, `<!doctype html><meta charset="utf-8"><title>Cotización</title>${cuerpo}`);
      this.modal(`<div class="row" style="margin-bottom:12px"><b style="color:var(--navy)">Vista previa</b><div class="sp" style="flex:1"></div>
        <button class="btn sm" id="pv-baja">Descargar</button>
        <button class="btn sm" id="pv-print">Imprimir</button></div>${cuerpo}`, m => {
        document.getElementById('pv-print').onclick = () => this.modalPreview('print');
        document.getElementById('pv-baja').onclick = () => this.bajar(nombre, `<!doctype html><meta charset="utf-8"><title>Cotización</title>${cuerpo}`);
      }, 660);
    },
    bajar(nombre, html) {
      try {
        const a = document.createElement('a');
        a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        this.log(this.vendedor, 'Descargó la cotización'); this.pintarSide();
        UI.aviso('Cotización descargada', 'ok');
      } catch (e) { UI.aviso('No se pudo descargar', 'crit'); }
    },

    // ---- Modales -----------------------------------------------------------
    modal(html, onready, ancho = 480) {
      const id = 'mdl-' + (++this._uid);
      document.body.insertAdjacentHTML('beforeend',
        `<div class="mdlbg" id="${id}"><div class="card pad" style="max-width:${ancho}px;width:100%;max-height:85vh;overflow:auto">${html}</div></div>`);
      const m = document.getElementById(id);
      m.onclick = e => { if (e.target.id === id) m.remove(); };
      onready && onready(m);
      return m;
    },

    // Armador de variante CON BOTONES: se elige Medida, después Estructura,
    // después Frente, y el precio se actualiza en cada paso. A propósito NO se
    // listan los precios de todas las variantes (un mueble puede tener 15+):
    // se muestra sólo el del combo que se está armando.
    modalVariante(prod, vars) {
      const ejes = EJES.filter(e => vars.some(v => v[e.k]));
      const sel = {};
      ejes.forEach(e => { const o = opciones(vars, e.k, sel); if (o.length === 1) sel[e.k] = o[0]; });

      const m = this.modal('', null, 560);
      const caja = m.firstChild;

      const calzan = () => vars.filter(v => ejes.every(e => sel[e.k] == null || v[e.k] === sel[e.k]));
      const elegida = () => { const c = calzan(); return c.length === 1 || ejes.every(e => sel[e.k] != null) ? c[0] : null; };

      const pintar = () => {
        const v = elegida();
        const partes = ejes.filter(e => sel[e.k]).map(e => ({ lbl: e.label, val: sel[e.k] }));
        caja.innerHTML = `
          <div class="row" style="margin-bottom:4px"><h3 style="color:var(--navy);margin:0">${UI.esc(prod.nombre)}</h3>
            <div class="sp" style="flex:1"></div><button class="lx" id="mv-x" style="font-size:20px">✕</button></div>
          <p class="muted" style="margin:0 0 14px;font-size:13px">Armá el mueble: elegí ${ejes.map(e => e.label.toLowerCase()).join(', ')}.</p>
          ${ejes.map(e => {
            const opts = opciones(vars, e.k, sel);
            return `<div class="vgrp"><div class="vlbl">${UI.esc(e.label)}</div>
              <div class="vopts">${opts.map(o =>
                `<button class="vopt ${sel[e.k] === o ? 'on' : ''}" data-e="${e.k}" data-o="${UI.esc(o)}">${UI.esc(o)}</button>`).join('')}</div></div>`;
          }).join('')}
          <div class="vpre">
            <div>
              <div class="muted" style="font-size:12px">${partes.length ? UI.esc(textoEjes(partes)) : 'Elegí las opciones'}</div>
              <b class="tnum" style="font-size:22px;color:var(--navy)">${v ? UI.pesos(v.precio) : '—'}</b>
              <span class="muted" style="font-size:12px">precio de lista</span>
            </div>
            <div class="sp" style="flex:1"></div>
            <button class="btn primary" id="mv-ok" ${v ? '' : 'disabled'}>Agregar</button>
          </div>`;

        document.getElementById('mv-x').onclick = () => m.remove();
        caja.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
          const e = b.dataset.e, o = b.dataset.o;
          if (sel[e] === o) delete sel[e]; else sel[e] = o;
          // Al cambiar un eje de arriba, los de abajo pueden quedar inválidos.
          ejes.forEach(x => { if (sel[x.k] && !opciones(vars, x.k, sel, x.k).includes(sel[x.k])) delete sel[x.k]; });
          pintar();
        });
        const ok = document.getElementById('mv-ok');
        if (ok && v) ok.onclick = () => { this.agregarEstandar(prod.nombre, v, prod.img); m.remove(); };
      };
      pintar();
    },

    modalCatalogo() {
      this.modal(`<div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">Buscar: Producto</h3><div class="sp" style="flex:1"></div><button class="lx" id="mc-x" style="font-size:20px">✕</button></div>
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

    estilos() {
      return `<style>
        .cz-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .cz-sep{width:1px;height:22px;background:var(--line);margin:0 3px}
        .cz-wrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
        @media(max-width:1180px){.cz-wrap{grid-template-columns:1fr}}

        .cz-head{margin-bottom:10px;padding-bottom:14px}
        .cz-tit{display:flex;align-items:flex-start;gap:20px}
        .cz-box{border:1px solid var(--line);border-radius:10px;padding:10px 14px;background:var(--panel-2);min-width:290px;display:flex;flex-direction:column;gap:7px}
        .fr.sm{grid-template-columns:106px minmax(0,1fr);gap:8px}
        .fr.sm>label{font-size:12px}
        .fr.sm input,.fr.sm select{padding:5px 8px;font-size:12.5px}
        @media(max-width:640px){.cz-tit{flex-direction:column}.cz-box{min-width:0;width:100%}}

        .sec{margin-bottom:10px;overflow:visible}
        .sec.on{border-color:var(--brand)}
        .sec-h{width:100%;display:flex;align-items:center;gap:11px;padding:12px 15px;background:none;border:0;cursor:pointer;text-align:left;font:inherit}
        .sec-h:hover{background:var(--panel-2)}
        .sec-n{width:22px;height:22px;flex:none;border-radius:50%;background:var(--line-soft);color:var(--ink-soft);display:grid;place-items:center;font-size:12px;font-weight:800}
        .sec.on .sec-n{background:var(--brand);color:#fff}
        .sec-t{font-weight:700;color:var(--navy);font-size:14.5px;flex:none}
        .sec-r{flex:1;color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sec-c{color:var(--muted);font-size:11px}
        .sec-b{padding:14px 15px 15px;border-top:1px solid var(--line-soft)}
        .sec-go{display:flex;justify-content:flex-end;margin-top:14px}

        .pr-cond{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-bottom:13px;margin-bottom:4px;border-bottom:1px solid var(--line)}
        .pr-cond .fr{grid-template-columns:126px 230px}
        .pr-sum{font-size:12.5px;color:var(--muted)}
        .pr-sum b{color:var(--navy);font-size:15px;margin-left:7px}

        .cz-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
        @media(max-width:820px){.cz-cols{grid-template-columns:1fr}}
        .cz-col{display:flex;flex-direction:column;gap:9px}
        .fr{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:10px}
        .fr>label{font-size:12.5px;color:var(--ink-soft)}
        .fr input,.fr select{padding:7px 10px;font-size:13px;width:100%}
        .fr input[readonly]{background:var(--panel-2);color:var(--ink-soft)}
        .fr .hint{font-size:11.5px;color:var(--muted)}
        @media(max-width:520px){.fr{grid-template-columns:1fr;gap:3px}}
        .adds{display:flex;gap:7px;flex-wrap:wrap;padding-left:142px}
        @media(max-width:520px){.adds{padding-left:0}}
        .chip-add{border:1px dashed var(--line);background:none;color:var(--brand);border-radius:16px;padding:3px 11px;font-size:12px;font-weight:600;cursor:pointer}
        .chip-add:hover{border-color:var(--brand);background:var(--brand-soft)}

        .tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 14px}
        .tabs.sm{padding:0 12px}
        .tab{border:0;background:none;padding:11px 13px;font:inherit;font-size:13px;font-weight:650;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
        .tab:hover{color:var(--ink)}
        .tab.on{color:var(--brand);border-bottom-color:var(--brand)}
        .cz-body{overflow:visible}
        
        .srow{position:relative;display:flex;gap:14px;align-items:center;padding:12px 0 0}
        .srow .busca{width:230px;flex:none;padding:7px 10px;font-size:13px}
        .lnk{border:0;background:none;color:var(--brand);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:0}
        .lnk:hover{text-decoration:underline}
        .drop{position:absolute;left:0;width:340px;top:100%;z-index:30;background:var(--panel);border:1px solid var(--brand);border-radius:11px;box-shadow:var(--shadow);overflow:hidden;max-height:320px;overflow-y:auto}
        .drop .it{display:flex;align-items:center;gap:8px;padding:9px 13px;cursor:pointer;border-bottom:1px solid var(--line-soft)}
        .drop .it:last-child{border-bottom:0} .drop .it:hover{background:var(--brand-soft)} .drop .it .cnt{color:var(--muted);font-size:12px}

        .lhead,.lrow{display:grid;grid-template-columns:minmax(0,1.5fr) 90px 38px 52px minmax(0,1fr) 54px 108px 104px 24px;gap:8px;align-items:center;padding:0}
        .lrow .dto{text-align:center;font-size:12px;color:var(--muted)}
        .lhead{padding-top:9px;padding-bottom:9px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
        .lrow{padding-top:7px;padding-bottom:7px;border-bottom:1px solid var(--line-soft)}
        .lrow:hover{background:var(--panel-2)}
        .lrow .n{font-weight:650;color:var(--navy);line-height:1.2;font-size:13.5px}
        .lrow .v{font-size:11.5px;color:var(--muted);line-height:1.35}
        .lrow input{padding:6px 8px;font-size:13px} .lrow .pnum,.lrow .sub{text-align:right}
        .lrow .sub{font-weight:700;color:var(--navy)}
        .lrow .lock{color:var(--muted);font-size:12.5px;text-align:right}
        .thumb{width:34px;height:34px;flex:none;border:1px dashed var(--line);border-radius:8px;background:var(--panel-2);cursor:pointer;padding:0;overflow:hidden;color:var(--muted);font-size:16px}
        .thumb:hover{border-color:var(--brand);color:var(--brand)}
        .thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .tipo{border:1px solid var(--line);background:var(--panel-2);color:var(--ink-soft);border-radius:6px;padding:4px 8px;font-size:11.5px;font-weight:700;cursor:pointer;width:100%}
        .tipo:hover{border-color:var(--brand);color:var(--brand)}
        .tipo.med{border-color:var(--warn);color:var(--warn);background:var(--warn-bg)}
        .lx{color:var(--muted);cursor:pointer;font-size:15px;border:0;background:transparent;padding:3px}
        @media(max-width:1080px){.lhead{display:none}.lrow{grid-template-columns:1fr 1fr;gap:8px}.lrow .sub,.lrow .lock,.lrow .pnum{text-align:left}}

        .cz-foot{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:26px;padding:16px}
        @media(max-width:820px){.cz-foot{grid-template-columns:1fr}}
        .cz-tyc .lbl{font-size:12.5px;color:var(--ink-soft);margin-bottom:6px}
        .cz-tyc textarea,.cz-foot textarea{width:100%;padding:8px 10px;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);resize:vertical}
        .cz-tots .tr{display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:13px;color:var(--ink-soft)}
        .cz-tots .tr b{color:var(--navy)}
        .cz-tots .neg b{color:var(--ok)}
        .cz-tots .big{border-top:1px solid var(--line);margin-top:5px;padding-top:9px;font-size:15px;font-weight:700;color:var(--navy)}
        .cz-tots .big b{font-size:19px}
        .cz-tots .tiva{font-size:11.5px;color:var(--muted);margin-top:7px}

        .cz-sc{margin-bottom:12px}
        .cz-sh{padding:12px 14px 0;font-size:13px;font-weight:700;color:var(--navy)}
        .cz-sb{padding:12px 14px 14px}
        .cz-sb textarea{width:100%;padding:8px 10px;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);resize:vertical}
        .ava{width:26px;height:26px;flex:none;border-radius:50%;background:var(--brand);color:#fff;display:inline-grid;place-items:center;font-size:10.5px;font-weight:800}
        .ava.sys{background:var(--muted)}
        .act{display:flex;gap:9px;padding:7px 0;align-items:flex-start}
        .act .aq{font-size:12.5px;font-weight:650;color:var(--navy);display:flex;gap:7px;align-items:baseline}
        .act .ah{font-size:11px;color:var(--muted);font-weight:400}
        .act .at{font-size:12px;color:var(--ink-soft);line-height:1.4}
        .cli-row{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--navy);flex-wrap:wrap}
        .cli-d{margin-top:9px;font-size:12.5px;color:var(--ink-soft);line-height:1.75}
        .doc{display:flex;gap:9px;padding:6px 0;align-items:flex-start}
        .doc .di{color:var(--muted);font-size:13px}
        .doc .dt{font-size:12.5px;color:var(--navy);font-weight:600}
        .doc .dr{font-size:11.5px;color:var(--muted)}

        .vgrp{margin-bottom:14px}
        .vlbl{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:7px}
        .vopts{display:flex;gap:7px;flex-wrap:wrap}
        .vopt{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer}
        .vopt:hover{border-color:var(--brand);color:var(--brand)}
        .vopt.on{border-color:var(--brand);background:var(--brand);color:#fff}
        .vpre{display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);padding-top:14px;margin-top:4px}

        .mdlbg{position:fixed;inset:0;background:rgba(20,26,38,.4);z-index:50;display:grid;place-items:center;padding:20px}
      </style>`;
    },
  };

  // "Medida 1.20 · Estructura Blanca · Frente Paraíso" — con el nombre de cada
  // variable, para que se entienda qué es cada valor.
  function textoEjes(partes) {
    return (partes || []).map(p => `${p.lbl} ${p.val}`).join(' · ') || '—';
  }
  // Opciones posibles de un eje, dado lo ya elegido en los otros ejes.
  function opciones(vars, eje, sel, ignorar) {
    const out = [];
    vars.forEach(v => {
      const calza = Object.keys(sel).every(k => k === eje || k === ignorar || v[k] === sel[k]);
      if (calza && v[eje] && !out.includes(v[eje])) out.push(v[eje]);
    });
    return out;
  }
  function inic(nombre) {
    return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
  }
  function hora() {
    try { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
    catch { return ''; }
  }
  function hoy() {
    try { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    catch { return ''; }
  }

  global.Presupuesto = Presupuesto;
})(typeof window !== 'undefined' ? window : globalThis);
