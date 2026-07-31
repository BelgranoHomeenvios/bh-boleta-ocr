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
  // Las condiciones de pago y su descuento salen de Configuración → Reglas de
  // precio. Acá sólo se usan: el nombre es lo único que ve el cliente
  // ("Efectivo"), el % que lleva cada una es interno.
  const cond = () => global.DB.condiciones();

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
    { k: 'tel2',      btn: '+ Teléfono', lbl: 'Teléfono adicional', ph: '11 5555-2020' },
    { k: 'instagram', btn: '+ IG',       lbl: 'Instagram',          ph: '@usuario' },
    { k: 'dni',       btn: '+ DNI',      lbl: 'DNI (para factura)', ph: '00.000.000' },
  ];

  const Presupuesto = {
    cli: null,
    abiertos: {},        // campos opcionales revelados
    etapa: 'cliente',    // desplegable abierto: cliente | productos | adicionales | ''
    lado: 'actividad',   // actividad | notas
    vendedor: '', local: '', fecha: '', termino: 'efectivo',
    nro: null, guardada: false,   // el número se toma al abrir; si no se usa, vuelve
    cabAbierta: false,            // la cabecera se lee; el lápiz la abre
    cantNueva: 1,                 // cantidad del renglón de carga (cantidad + producto)
    obsExt: '', obsInt: '', terminos: '',
    dto: null,                    // descuento comercial extra {modo, alcance, linea, valor}
    archivos: [],                 // adjuntos de la cotización (van a Documentos)
    ad: null,            // adicionales
    actividad: [],       // historial de la cotización (se arma sola)
    lineas: [],   // {key,tipo,prodNombre,varId,ejes,partes,base,cantidad,obs,precioManual,img}
    _uid: 0,
    _mount: 'view',

    // ---- Cálculo ---------------------------------------------------------
    // El vendedor cotiza a medida con UNO de los dos precios y el otro sale solo:
    // lista −35% = efectivo · efectivo ÷ 0,65 (≈ ×1,54) = lista.
    factorEfectivo() { return 1 - (global.DB.descuentoDe('efectivo') / 100); },
    aEfectivo(lista) { return Math.round((Number(lista) || 0) * this.factorEfectivo()); },
    aLista(efectivo) {
      const f = this.factorEfectivo();
      return f > 0 ? Math.round((Number(efectivo) || 0) / f) : 0;
    },
    descEfectivoPct() { return global.DB.descuentoDe('efectivo'); },
    multLista() {
      const f = this.factorEfectivo();
      return f > 0 ? (1 / f).toFixed(2).replace('.', ',') : '—';
    },
    // El vendedor carga el precio en la condición que eligió arriba; el de
    // lista sale solo (efectivo ÷ 0,65, lista tal cual).
    labelPrecio() {
      const f = this.factor();
      return f === 1 ? 'Precio de lista' : `Precio en ${this.terminoLabel().toLowerCase()}`;
    },
    desdeCondicion(monto) {
      const f = this.factor();
      return f > 0 ? Math.round((Number(monto) || 0) / f) : Math.round(Number(monto) || 0);
    },
    // Un mueble a medida puede estar todavía sin precio: se define después.
    sinPrecio(l) { return l.tipo === 'medida' && l.precioManual == null; },

    // Descuento de la condición de pago, en % (se configura en Configuración).
    descPct() { return this.termino === 'mixto' ? 0 : global.DB.descuentoDe(this.termino); },
    factor() { return 1 - this.descPct() / 100; },
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
    envioMonto() { return this.envioCotizable() ? (this.ad.envio || 0) : 0; },
    // Descuento comercial extra, aparte del que da la condición de pago. Puede
    // ser en % o en $, sobre todos los muebles o sobre un producto puntual.
    descuentoExtra() {
      const d = this.dto;
      if (!d || !(Number(d.valor) > 0)) return 0;
      const base = d.alcance === 'linea'
        ? (() => { const l = this.get(d.linea); return l ? this.unit(l) * l.cantidad : 0; })()
        : this.total();
      const monto = d.modo === 'pct' ? base * (Number(d.valor) / 100) : Number(d.valor);
      return Math.round(Math.min(monto, base));   // nunca más que lo que se descuenta
    },
    dtoTexto() {
      const d = this.dto;
      if (!d || !(Number(d.valor) > 0)) return '';
      const cuanto = d.modo === 'pct' ? `${d.valor}%` : UI.pesos(d.valor);
      if (d.alcance !== 'linea') return `${cuanto} sobre los muebles`;
      const l = this.get(d.linea);
      return `${cuanto} en ${l ? l.prodNombre : 'un producto'}`;
    },
    instalacionMonto() { return this.ad.instalacion === 'si' ? (this.ad.instalacionCosto || 0) : 0; },
    totalFinal() { return this.total() + this.envioMonto() + this.instalacionMonto() - this.descuentoExtra(); },
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
    entregaEditada() { return !!this.ad.entregaTocada; },
    // "entre el 5 de septiembre y el 10 de septiembre". SIEMPRE es un rango:
    // la fábrica no compromete un día puntual.
    entregaTexto() {
      const a = this.ad;
      if (!a.desde || !a.hasta) return 'A confirmar';
      return `entre el ${fechaLarga(a.desde)} y el ${fechaLarga(a.hasta)}`;
    },
    // El plazo en días, para el resumen de la cabecera: "30 a 35 días".
    entregaDias() {
      const a = this.ad;
      if (!a.desde || !a.hasta) return 'a confirmar';
      return `${diasHasta(a.desde)} a ${diasHasta(a.hasta)} días`;
    },
    // Corrige el rango: nunca puede quedar en un solo día.
    normalizarEntrega() {
      const a = this.ad, d = global.DB.ENTREGA_DIAS;
      if (!a.desde) return false;
      if (!a.hasta || a.hasta <= a.desde) {
        a.hasta = sumarDias(a.desde, Math.max(1, d.max - d.min));
        return true;   // hubo que corregirlo
      }
      return false;
    },
    // Sin domicilio + localidad no se cotiza el envío: no puede salir un número.
    envioCotizable() { return !!(String(this.cli.domicilio).trim() && this.cli.localidad); },
    envioTexto() {
      return this.envioCotizable() ? UI.pesos(this.ad.envio) : global.DB.ENVIO_SIN_DOMICILIO;
    },
    instalacionTexto() {
      const i = this.ad.instalacion;
      return i === 'si' ? 'Sí' : i === 'no' ? 'No' : global.DB.INSTALACION_DEFAULT;
    },
    terminoLabel() { return global.DB.condicion(this.termino).label; },
    nombreCli() {
      const c = this.cli;
      return c.nombre.trim() || c.telefono.trim() || c.instagram.trim() || c.email.trim();
    },

    // Cada movimiento queda anotado en el costado (y después va al CRM).
    // `clave` agrupa los cambios repetidos del mismo dato (mover la fecha tres
    // veces deja una sola línea, no tres).
    log(quien, texto, clave) {
      const ult = this.actividad[0];
      if (clave && ult && ult.clave === clave && ult.quien === quien) {
        ult.texto = texto; ult.hora = hora(); return;
      }
      this.actividad.unshift({ quien, texto, clave, hora: hora() });
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
              <span class="sec-r" id="res-${s.k}">${this.resumen(s.k)}</span>
              <span class="sec-c">${on ? '▲' : '▼'}</span>
            </button>
            ${on ? `<div class="sec-b" id="sec-${s.k}"></div>` : ''}
          </section>`;
        }).join('')}
        <div class="card cz-foot">
          <div class="cz-tyc">
            <div class="lbl">Observaciones para el cliente
              <span class="muted">salen impresas en la cotización</span></div>
            <textarea id="obs-ext" rows="2" placeholder="Lo que tiene que ver el cliente…">${UI.esc(this.obsExt)}</textarea>
            <div class="int-box">
              <div class="lbl">Comentarios internos
                <span class="muted">no salen impresas — para nosotros o producción</span></div>
              <textarea id="obs-int" rows="2" placeholder="Notas para producción, administración o para vos…">${UI.esc(this.obsInt)}</textarea>
            </div>
            <div class="lbl" style="margin-top:11px">Términos y condiciones
              <span class="muted">salen siempre, no se editan</span></div>
            <div class="tyc-fijo">${UI.esc(global.DB.TYC_DEFAULT)}</div>
          </div>
          <div id="cz-tot"></div>
        </div>`;

      m.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => {
        const k = b.dataset.sec;
        // No se cotiza sin saber a quién: Productos y Adicionales quedan
        // cerrados hasta tener nombre + un contacto.
        if (k !== 'cliente' && this.etapa !== k && !this.clienteCompleto()) {
          this.etapa = 'cliente'; this.pintarMain(); this.avisoCliente(true);
          UI.aviso('Falta el nombre o un contacto del cliente', 'warn');
          return;
        }
        this.etapa = this.etapa === k ? '' : k;
        this.pintarMain();
      });
      document.getElementById('obs-ext').oninput = e => { this.obsExt = e.target.value; };
      document.getElementById('obs-int').oninput = e => { this.obsInt = e.target.value; };

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
      return `entrega ${UI.esc(this.entregaDias())} · envío ${UI.esc(this.envioTexto())}`;
    },

    // Refresca el resumen de las cabeceras plegadas mientras se escribe.
    refrescarResumen() {
      ['cliente', 'productos', 'adicionales'].forEach(k => {
        const el = document.getElementById('res-' + k);
        if (el) el.innerHTML = this.resumen(k);
      });
    },

    // Cabecera: quién y cuándo hace el presupuesto (no el total — eso va abajo).
    pintarCabecera() {
      const c = document.getElementById('cz-cab'); if (!c) return;
      const vends = global.DB.vendedores(), locs = global.DB.locales();
      c.innerHTML = `
        <div class="cz-tit">
          <div>
            <div class="kick">Cotización ${UI.esc(global.DB.numeroCotizacion(this.nro))}</div>
            <h1 class="h-title" style="margin:2px 0 0">${UI.esc(this.nombreCli() || 'Nueva')}</h1>
          </div>
          <div class="sp" style="flex:1"></div>
          <div class="cz-box">
            <button class="lapiz cabx" id="cab-ed" title="${this.cabAbierta ? 'Listo' : 'Modificar vendedor, local o fecha'}"
              aria-label="${this.cabAbierta ? 'Listo' : 'Modificar'}">${this.cabAbierta ? '✓' : '✏️'}</button>
            <div class="fr sm nro"><label>N° de cotización</label>
              <b class="tnum">${UI.esc(global.DB.numeroCotizacion(this.nro))}</b></div>
            <div class="fr sm"><label ${this.cabAbierta ? 'for="op-vend"' : ''}>Vendedor</label>
              ${this.cabAbierta
                ? `<select id="op-vend">${vends.map(v => `<option ${this.vendedor === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`
                : `<span class="valf">${UI.esc(this.vendedor)}</span>`}</div>
            <div class="fr sm"><label ${this.cabAbierta ? 'for="op-local"' : ''}>Local de origen</label>
              ${this.cabAbierta
                ? `<select id="op-local">${locs.map(l => `<option value="${l.k}" ${this.local === l.k ? 'selected' : ''}>${UI.esc(l.label)}</option>`).join('')}</select>`
                : `<span class="valf">${UI.esc((locs.find(l => l.k === this.local) || {}).label || this.local)}</span>`}</div>
            <div class="fr sm"><label ${this.cabAbierta ? 'for="op-fecha"' : ''}>Fecha</label>
              ${this.cabAbierta
                ? `<input id="op-fecha" type="date" value="${UI.esc(this.fecha)}">`
                : `<span class="valf">${UI.esc(fechaLarga(this.fecha))}</span>`}</div>
          </div>
        </div>`;
      document.getElementById('cab-ed').onclick = () => { this.cabAbierta = !this.cabAbierta; this.pintarCabecera(); };
      if (this.cabAbierta) {
        document.getElementById('op-vend').onchange = e => { this.vendedor = e.target.value; };
        document.getElementById('op-local').onchange = e => { this.local = e.target.value; };
        document.getElementById('op-fecha').onchange = e => { this.fecha = e.target.value; this.pintarCabecera(); };
      }
    },

    // ---- 1 · Datos del cliente ------------------------------------------
    // Sólo datos del cliente. La condición de pago NO va acá: es un dato de la
    // orden y hace falta para cotizar los muebles, así que vive en Productos.
    pintarCliente() {
      const c = document.getElementById('sec-cliente'); if (!c) return;
      const locActual = global.DB.localidad(this.cli.localidad);
      const f = (id, lbl, val, ph) => `<div class="fr"><label for="${id}">${UI.esc(lbl)}</label>
        <input id="${id}" value="${UI.esc(val)}" placeholder="${UI.esc(ph)}"></div>`;
      const sel = (id, lbl, opts) => `<div class="fr"><label for="${id}">${UI.esc(lbl)}</label>
        <select id="${id}">${opts}</select></div>`;

      // Los opcionales abiertos llevan una X para volver a cerrarlos: si se
      // abrió uno por error, se borra lo cargado y vuelve a quedar oculto.
      // Cada opcional cuelga del campo con el que se relaciona: el teléfono
      // adicional al lado de Teléfono, el IG debajo de Cliente (lo reemplaza
      // cuando no hay teléfono) y el DNI debajo de ¿Cómo nos conoció?
      const opcional = k => {
        const o = OPCIONALES.find(x => x.k === k);
        if (!this.abiertos[k]) return '';
        return `<div class="fr"><label for="c-${k}">${UI.esc(o.lbl)}</label>
          <div class="fx"><input id="c-${k}" value="${UI.esc(this.cli[k])}" placeholder="${UI.esc(o.ph)}">
            <button class="cx" data-quitar="${k}" title="Quitar ${UI.esc(o.lbl)}" aria-label="Quitar ${UI.esc(o.lbl)}">✕</button></div></div>`;
      };
      const mas = (k, txt) => this.abiertos[k] ? ''
        : `<button class="chip-add" data-add="${k}">${UI.esc(txt)}</button>`;

      c.innerHTML = `
        <div class="cz-cols">
          <div class="cz-col">
            ${f('c-nombre', 'Cliente', this.cli.nombre, 'Nombre y apellido')}
            ${mas('instagram', '+ IG') ? `<div class="fr"><label></label><div class="adds">${mas('instagram', '+ IG')}</div></div>` : ''}
            ${opcional('instagram')}
            ${f('c-dom', 'Domicilio de entrega', this.cli.domicilio, 'Calle 1234, piso/depto')}
            ${sel('c-canal', '¿Cómo nos conoció?', `<option value="">—</option>` +
              ['Instagram', 'Facebook', 'Recomendación', 'Pasó por el local', 'Google', 'Otro']
                .map(o => `<option ${this.cli.canal === o ? 'selected' : ''}>${o}</option>`).join(''))}
            ${mas('dni', 'Agregar DNI') ? `<div class="fr"><label></label><div class="adds">${mas('dni', 'Agregar DNI')}</div></div>` : ''}
            ${opcional('dni')}
          </div>
          <div class="cz-col">
            <div class="fr"><label for="c-tel">Teléfono ${mas('tel2', '+')}</label>
              <input id="c-tel" value="${UI.esc(this.cli.telefono)}" placeholder="11 5555-2020" inputmode="tel"></div>
            ${opcional('tel2')}
            <div class="fr"><label for="c-locd">Localidad</label>
              <div class="fx locw">
                <input id="c-locd" value="${UI.esc(locActual ? locActual.label : '')}"
                  placeholder="Escribí la localidad…" autocomplete="off">
                ${locActual ? `<button class="cx" id="c-locx" title="Quitar la localidad" aria-label="Quitar la localidad">✕</button>` : ''}
                <div id="c-locdrop"></div>
              </div></div>
            ${locActual ? `<div class="fr"><label></label><span class="hint">
              ${UI.esc(locActual.zona)} · envío ${locActual.flete ? UI.pesos(locActual.flete) : 'a cotizar'}
              ${locActual.manual ? '<b>· cargada a mano</b>' : ''}</span></div>` : ''}
            ${f('c-mail', 'Email', this.cli.email, 'cliente@correo.com')}
          </div>
        </div>
        <div class="sec-go"><button class="btn sm primary" id="c-sig">Continuar → Productos</button></div>`;

      // `soloNum` deja escribir únicamente números (teléfonos y DNI).
      const bind = (id, campo, soloNum) => {
        const el = document.getElementById(id); if (!el) return;
        el.oninput = () => {
          if (soloNum) {
            const limpio = el.value.replace(/[^\d]/g, '');
            if (limpio !== el.value) el.value = limpio;
          }
          this.cli[campo] = el.value;
          this.avisoCliente(); this.pintarCabecera(); this.refrescarResumen(); this.pintarSide();
        };
      };
      bind('c-nombre', 'nombre'); bind('c-tel', 'telefono', true);
      bind('c-mail', 'email'); bind('c-dom', 'domicilio');
      OPCIONALES.forEach(o => bind('c-' + o.k, o.k, o.k === 'tel2' || o.k === 'dni'));
      c.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { this.abiertos[b.dataset.add] = true; this.pintarCliente(); });
      c.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => {
        const k = b.dataset.quitar;
        this.cli[k] = ''; delete this.abiertos[k];
        this.pintarCliente(); this.pintarCabecera(); this.refrescarResumen(); this.pintarSide();
      });
      document.getElementById('c-canal').onchange = e => { this.cli.canal = e.target.value; };
      // Con Tab o Enter se recorre en el orden en que se pregunta, no por columna.
      const ORDEN = ['c-nombre', 'c-tel', 'c-dom', 'c-locd', 'c-canal', 'c-mail'];
      ORDEN.forEach((id, i) => {
        const el = document.getElementById(id); if (!el) return;
        el.onkeydown = e => {
          if (e.key !== 'Tab' && e.key !== 'Enter') return;
          if (e.key === 'Tab' && e.shiftKey) {
            const ant = document.getElementById(ORDEN[i - 1]); if (!ant) return;
            e.preventDefault(); ant.focus(); return;
          }
          const sig = document.getElementById(ORDEN[i + 1]);
          if (!sig) return;
          e.preventDefault(); sig.focus();
        };
      });
      this.bindLocalidad();
      document.getElementById('c-sig').onclick = () => this.irAProductos();
      this.avisoCliente();
    },

    // Buscador de localidad: se escribe y aparecen las del mapa. La que no esté
    // se carga a mano y queda guardada para las próximas cotizaciones.
    bindLocalidad() {
      const inp = document.getElementById('c-locd'); if (!inp) return;
      const drop = document.getElementById('c-locdrop');
      const cerrar = () => { if (drop) drop.innerHTML = ''; };

      const elegir = l => {
        this.cli.localidad = l.k;
        if (!this.ad.envioTocado) {
          this.ad.envio = global.DB.fleteDe(l.k);
          this.log('Sistema', `Cargó el envío por localidad (${l.label}): ${this.ad.envio ? UI.pesos(this.ad.envio) : 'a cotizar'}`);
        }
        cerrar(); this.pintarTodo();
      };

      const buscar = () => {
        const q = sinTilde(inp.value);
        const todas = global.DB.localidades();
        const hits = q ? todas.filter(l => sinTilde(l.label).includes(q)).slice(0, 12) : todas.slice(0, 12);
        const exacta = todas.some(l => sinTilde(l.label) === q);
        if (!hits.length && !q) return cerrar();
        drop.innerHTML = `<div class="drop">
          ${hits.map(l => `<div class="it" data-l="${l.k}"><span>${UI.esc(l.label)}</span>
            <span class="sp" style="flex:1"></span>
            <span class="cnt">${UI.esc(l.zona)}${l.flete ? ' · ' + UI.pesos(l.flete) : ''}</span></div>`).join('')}
          ${q && !exacta ? `<div class="it nueva" data-nueva="1">+ Cargar “${UI.esc(inp.value.trim())}” a mano</div>` : ''}
          ${!hits.length && !q ? '<div class="it muted">Escribí para buscar.</div>' : ''}
        </div>`;
        drop.querySelectorAll('[data-l]').forEach(it => it.onmousedown = e => {
          e.preventDefault(); elegir(global.DB.localidad(it.dataset.l));
        });
        const nueva = drop.querySelector('[data-nueva]');
        if (nueva) nueva.onmousedown = e => { e.preventDefault(); cerrar(); this.modalLocalidad(inp.value.trim(), elegir); };
      };

      let t;
      inp.oninput = () => { clearTimeout(t); t = setTimeout(buscar, 160); };
      inp.onfocus = buscar;
      inp.onblur = () => setTimeout(cerrar, 180);
      const x = document.getElementById('c-locx');
      if (x) x.onclick = () => {
        this.cli.localidad = '';
        if (!this.ad.envioTocado) this.ad.envio = 0;
        this.pintarTodo();
      };
    },

    // Calendario de rango: se toca el primer día y después el último, y el
    // tramo del medio queda pintado. Nunca se acepta un solo día.
    pintarCalendario(contId, st, onlisto) {
      const caja = document.getElementById(contId); if (!caja) return;
      let d1 = st.d1 || '', d2 = st.d2 || '';
      let mes = mesDe(d1 || enDias(0));

      const pintar = () => {
        const hoyISO = enDias(0);
        const [y, mm] = mes.split('-').map(Number);
        const primero = new Date(y, mm - 1, 1);
        const dias = new Date(y, mm, 0).getDate();
        const arranque = (primero.getDay() + 6) % 7;   // la semana empieza el lunes
        const celdas = [];
        for (let i = 0; i < arranque; i++) celdas.push('<span></span>');
        for (let d = 1; d <= dias; d++) {
          const iso = `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dentro = d1 && d2 && iso > d1 && iso < d2;
          const cls = [
            iso === d1 ? 'ini' : '', iso === d2 ? 'fin' : '', dentro ? 'medio' : '',
            iso < hoyISO ? 'pasado' : '',
          ].filter(Boolean).join(' ');
          celdas.push(`<button class="cd ${cls}" data-d="${iso}" ${iso < hoyISO ? 'disabled' : ''}>${d}</button>`);
        }
        caja.innerHTML = `
          <div class="cal-box">
          <div class="cal-h">
            <button class="cal-nav" id="cal-prev" aria-label="Mes anterior">‹</button>
            <b>${UI.esc(MESES[mm - 1].toUpperCase())} ${y}</b>
            <button class="cal-nav" id="cal-next" aria-label="Mes siguiente">›</button>
          </div>
          <div class="cal-dow">${['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(x => `<span>${x}</span>`).join('')}</div>
          <div class="cal-g">${celdas.join('')}</div>
          <div class="cal-pie">
            <div class="muted">${d1 && d2
              ? `<b style="color:var(--navy)">entre el ${fechaLarga(d1)} y el ${fechaLarga(d2)}</b>`
              : d1 ? `Desde el <b>${fechaLarga(d1)}</b> — ahora marcá hasta cuándo`
                   : 'Marcá desde qué día'}</div>
            <div class="sp" style="flex:1"></div>
            <button class="btn sm primary" id="cal-ok" ${d1 && d2 ? '' : 'disabled'}>Listo</button>
          </div></div>`;

        document.getElementById('cal-prev').onclick = () => { mes = correrMes(mes, -1); pintar(); };
        document.getElementById('cal-next').onclick = () => { mes = correrMes(mes, 1); pintar(); };
        caja.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
          const iso = b.dataset.d;
          // Primer toque abre el rango; segundo lo cierra. Si cae antes del
          // inicio, se arranca de nuevo desde ahí.
          if (!d1 || d2 || iso <= d1) { d1 = iso; d2 = ''; } else { d2 = iso; }
          pintar();
        });
        const ok = document.getElementById('cal-ok');
        if (d1 && d2) ok.onclick = () => onlisto(d1, d2);
      };
      pintar();
    },

    // Alta de una localidad que todavía no está en el mapa.
    modalLocalidad(nombre, onlisto) {
      this.modal(`<h3 style="color:var(--navy)">Cargar localidad</h3>
        <p class="muted" style="font-size:13px;margin:8px 0 12px">
          No está en el mapa todavía. Cargala acá y queda guardada para las próximas cotizaciones.</p>
        <div class="fr"><label for="nl-nom">Localidad</label>
          <input id="nl-nom" value="${UI.esc(nombre)}" placeholder="Nombre de la localidad"></div>
        <div class="fr" style="margin-top:9px"><label for="nl-flete">Costo de envío</label>
          <input id="nl-flete" type="number" min="0" value="0"></div>
        <div class="fr"><label></label><span class="hint">Dejalo en 0 si hay que cotizarlo aparte.</span></div>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="nl-cancel">Cancelar</button>
          <button class="btn primary" id="nl-ok">Cargar</button></div>`, m => {
        document.getElementById('nl-cancel').onclick = () => m.remove();
        document.getElementById('nl-ok').onclick = () => {
          const nom = document.getElementById('nl-nom').value.trim();
          if (!nom) return UI.aviso('Poné el nombre de la localidad', 'warn');
          const l = global.DB.agregarLocalidad(nom, Number(document.getElementById('nl-flete').value) || 0);
          this.log(this.vendedor, `Cargó la localidad ${nom}`);
          m.remove();
          UI.aviso(`${nom} cargada`, 'ok');
          onlisto(global.DB.localidad(l.k) || l);
        };
      });
    },

    // No se pasa a cotizar sin saber a quién: hace falta el nombre y al menos
    // un contacto (teléfono, Instagram o mail).
    irAProductos() {
      if (!this.clienteCompleto()) {
        this.avisoCliente(true);
        UI.aviso('Falta el nombre o un contacto del cliente', 'warn');
        return;
      }
      this.etapa = 'productos'; this.pintarMain();
    },
    clienteCompleto() { return !!String(this.cli.nombre).trim() && this.clienteValido(); },

    // Sin cartel: lo que falta se marca en ROJO sobre el propio campo.
    avisoCliente(mostrar) {
      if (mostrar != null) this._avisoOn = !!mostrar;
      const marcar = (id, falta) => {
        const el = document.getElementById(id); if (!el) return;
        if (this._avisoOn && falta) el.classList.add('falta'); else el.classList.remove('falta');
      };
      marcar('c-nombre', !String(this.cli.nombre).trim());
      marcar('c-tel', !this.clienteValido());
      if (this._avisoOn && this.clienteCompleto()) this._avisoOn = false;
    },
    // Nota interna: el % es de uso nuestro, el cliente sólo ve el nombre.
    notaTermino() {
      const n = document.getElementById('op-nota'); if (!n) return;
      const pct = this.descPct();
      n.innerHTML = this.termino === 'mixto'
        ? 'El vendedor <b>edita cada precio</b>.'
        : pct
          ? `Precio de lista <b>−${pct}%</b> <span class="int">interno</span>`
          : 'Precio de lista, sin descuento.';
    },

    // ---- 2 · Productos ----------------------------------------------------
    // Arranca con la condición de pago: es un dato de la ORDEN, no del cliente,
    // y es la que define con qué lista se cotizan los muebles.
    pintarProductos() {
      const cont = document.getElementById('sec-productos'); if (!cont) return;
      cont.innerHTML = `
        <div class="pr-cond">
          <div class="fr"><label for="op-term">Condición de pago</label>
            <select id="op-term">${cond().map(t => `<option value="${t.k}" ${this.termino === t.k ? 'selected' : ''}>${UI.esc(t.label)}</option>`).join('')}</select></div>
          <div class="muted" id="op-nota" style="font-size:12px"></div>
        </div>
        <div class="lhead" id="pr-head"></div>
        <div id="pr-lineas"></div>
        <div class="srow">
          <input id="pr-cant" class="cantn" type="number" min="1" value="${this.cantNueva}" aria-label="Cantidad a agregar">
          <div class="bwrap">
            <input id="pr-buscar" class="busca" placeholder="Buscar un producto…" autocomplete="off">
            <div id="pr-drop"></div>
          </div>
          <button class="lnk" id="pr-catalogo">Catálogo</button>
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pr-pie">
          <div class="pr-sum">Total de los muebles <b class="tnum">${UI.pesos(this.total())}</b></div>
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
      const cn = document.getElementById('pr-cant');
      cn.oninput = () => { this.cantNueva = Math.max(1, Math.floor(Number(cn.value)) || 1); };
      const inp = document.getElementById('pr-buscar');
      let t; inp.oninput = () => { clearTimeout(t); t = setTimeout(() => this.buscarInline(inp.value.trim()), 220); };
      inp.onblur = () => setTimeout(() => { const d = document.getElementById('pr-drop'); if (d) d.innerHTML = ''; }, 180);
      this.notaTermino();
      this.pintar();
    },

    pintar() {
      const cont = document.getElementById('pr-lineas'); if (!cont) return;
      const pct = this.descPct();

      // El encabezado lleva el % vigente ("Dto. 35%") y en cada línea va el
      // monto descontado; el descuento total de la orden queda abajo de todo.
      const head = document.getElementById('pr-head');
      if (head) head.innerHTML = `<span>Cant.</span><span>Producto</span><span>Tipo</span>
        <span style="text-align:right">Precio unit.</span>
        <span style="text-align:right">${pct ? `Dto. ${pct}%` : 'Dto.'}</span>
        <span style="text-align:right">Subtotal</span><span></span>`;

      if (!this.lineas.length) { cont.innerHTML = ''; this.refrescarProductos(); return; }
      // Una vez cargado, el renglón queda QUIETO: se lee, no se edita. Con el
      // lápiz se vuelve a abrir esa línea y ahí sí se toca todo.
      cont.innerHTML = this.lineas.map(l => {
        const sub = this.unit(l) * l.cantidad;
        const dto = (this.lista(l) - this.unit(l)) * l.cantidad;
        const medida = l.tipo === 'medida', abierta = !!l.editando;
        const nombre = abierta && medida
          ? `<input value="${UI.esc(l.prodNombre)}" data-nom="${l.key}" placeholder="Mueble a medida" style="font-weight:650">`
          : `<div class="n">${UI.esc(l.prodNombre || 'Mueble a medida')}</div>
             <div class="v">${UI.esc(l.ejes)}</div>`;
        // La columna muestra siempre el precio de LISTA: el descuento de la
        // condición de pago se ve aparte y ya viene aplicado en el subtotal.
        // Estándar → bloqueado (sale del catálogo). A medida → lo carga el vendedor.
        // A medida sin precio todavía → "A definir". El precio de los a medida se
        // carga abajo, con sus dos campos (lista ⇄ efectivo).
        const precioCel = this.sinPrecio(l)
          ? `<div class="adef">A definir</div>`
          : `<div class="lock tnum">${UI.pesos(this.lista(l))}</div>`;
        const cantCel = abierta
          ? this.cantHTML(l.cantidad, l.key)
          : `<span class="cantf">${l.cantidad}</span>`;
        const tipoCel = abierta
          ? `<button class="tipo ${medida ? 'med' : ''}" data-tipo="${l.key}">${medida ? 'A medida' : 'Estándar'}</button>`
          : `<span class="tipo fijo ${medida ? 'med' : ''}">${medida ? 'A medida' : 'Estándar'}</span>`;
        // Observaciones sólo en los a medida, y abajo del renglón: es donde el
        // vendedor explica lo que pidió el cliente, con la foto del diseño.
        const obs = !medida ? '' : abierta
          ? `<div class="lobs">
              <div class="lmed">
                <label>Medidas <input data-med="${l.key}" value="${UI.esc(l.medidas || '')}" placeholder="ej. 2.40 × 0.50 × 0.90"></label>
                <label>Terminaciones <input data-col="${l.key}" value="${UI.esc(l.colores || '')}" placeholder="ej. estructura negra, frente paraíso"></label>
                <label class="ancho">Detalles <input data-obs="${l.key}" value="${UI.esc(l.obs)}" placeholder="lo que pidió el cliente"></label>
                ${l.img ? `<img class="lobs-img" src="${UI.esc(l.img)}" alt="Foto del diseño">` : ''}
              </div>
            </div>`
          : (l.medidas || l.colores || l.obs || l.img) ? `<div class="lobs leido">
              <div class="obst">${[
                l.medidas && `<b>Medidas:</b> ${UI.esc(l.medidas)}`,
                l.colores && `<b>Terminaciones:</b> ${UI.esc(l.colores)}`,
                l.obs && UI.esc(l.obs),
              ].filter(Boolean).join(' · ')}</div>
              ${l.img ? `<img class="lobs-img" src="${UI.esc(l.img)}" alt="Foto del diseño">` : ''}
            </div>` : '';
        return `<div class="litem ${medida ? 'med' : ''} ${abierta ? 'abierta' : ''}">
          <div class="lrow" data-l="${l.key}">
            <div class="lcant">${cantCel}</div>
            <div>${nombre}</div>
            <div class="ltipo">${tipoCel}${medida
              ? `<button class="cam mini" data-img="${l.key}" title="${l.img ? 'Cambiar la imagen' : 'Adjuntar imagen'}" aria-label="Adjuntar imagen">📷</button>` : ''}</div>
            ${precioCel}
            <div class="dto tnum">${dto ? '−' + UI.pesos(dto) : '—'}</div>
            ${abierta && medida
              ? `<input inputmode="numeric" class="pnum sube" data-subt="${l.key}" value="${this.sinPrecio(l) ? '' : Math.round(sub)}" placeholder="precio" aria-label="Subtotal">`
              : `<div class="sub tnum">${this.sinPrecio(l) ? '<span class="adef">—</span>' : UI.pesos(sub)}</div>`}
            <div class="lacc">
              <button class="lx" data-ed="${l.key}" title="${abierta ? 'Listo' : 'Editar el renglón'}">${abierta ? '✓' : '✏️'}</button>
              <button class="lx" data-del="${l.key}" title="Quitar">✕</button>
            </div>
          </div>${obs}</div>`;
      }).join('');

      cont.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => {
        const l = this.get(b.dataset.ed); if (!l) return;
        // Se abre de a una: cerrar las otras evita dejar renglones sueltos editables.
        const abrir = !l.editando;
        this.lineas.forEach(x => { x.editando = false; });
        l.editando = abrir;
        this.pintar();
      });
      cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        const l = this.get(b.dataset.del);
        this.lineas = this.lineas.filter(x => x.key !== Number(b.dataset.del));
        if (l) this.log(this.vendedor, `Quitó ${l.prodNombre || 'un producto'}`);
        this.pintar();
      });
      this.bindCant(cont);
      cont.querySelectorAll('[data-obs]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.obs); if (l) l.obs = i.value; });
      cont.querySelectorAll('[data-med]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.med); if (l) l.medidas = i.value; });
      cont.querySelectorAll('[data-col]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.col); if (l) l.colores = i.value; });
      // El precio se carga en la condición elegida arriba (efectivo, lista…) y
      // el de lista se deduce solo.
      // También se puede tipear el SUBTOTAL y el unitario sale solo.
      // Único lugar donde se carga el precio del a medida: se tipea el total de
      // la línea y el unitario (y el de lista) salen solos.
      cont.querySelectorAll('[data-subt]').forEach(i => {
        const l = this.get(i.dataset.subt);
        // Mientras se escribe ya se ven el unitario y el descuento; recién al
        // salir (Enter o el tilde) se repinta y se pasa al siguiente producto.
        i.oninput = () => {
          const n = i.value.replace(/[^\d]/g, ''); if (n !== i.value) i.value = n;
          if (!l) return;
          l.precioManual = n === '' ? null : this.desdeCondicion(Number(n) / Math.max(1, l.cantidad));
          const fila = i.parentNode;
          const pu = fila && fila.querySelector('.lock,.adef');
          if (pu) pu.textContent = this.sinPrecio(l) ? 'A definir' : UI.pesos(this.lista(l));
          const dt = fila && fila.querySelector('.dto');
          const d = (this.lista(l) - this.unit(l)) * l.cantidad;
          if (dt) dt.textContent = d ? '−' + UI.pesos(d) : '—';
          this.refrescarProductos();
        };
        i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
        i.onblur = () => this.repintar();
      });
      cont.querySelectorAll('[data-nom]').forEach(i => i.oninput = () => { const l = this.get(i.dataset.nom); if (l) l.prodNombre = i.value; });
      // Se carga el de lista o el de efectivo; el otro se completa solo.
      cont.querySelectorAll('[data-plista]').forEach(i => i.onchange = () => {
        const l = this.get(i.dataset.plista); if (!l) return;
        l.precioManual = i.value === '' ? null : Math.max(0, Number(i.value) || 0);
        this.repintar();
      });
      cont.querySelectorAll('[data-pefec]').forEach(i => i.onchange = () => {
        const l = this.get(i.dataset.pefec); if (!l) return;
        l.precioManual = i.value === '' ? null : this.aLista(Math.max(0, Number(i.value) || 0));
        this.repintar();
      });
      // "A medida" es una opción DENTRO del producto, no un ítem suelto:
      // se pasa la línea a medida y ahí se libera el precio.
      cont.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => this.alternarTipo(this.get(b.dataset.tipo)));
      cont.querySelectorAll('[data-img]').forEach(b => b.onclick = () => this.cargarImagen(this.get(b.dataset.img)));
      this.refrescarProductos();
    },
    // La cantidad se ve como texto, igual que el nombre del producto. Se toca,
    // se escribe el número y con Enter (o al salir del campo) queda guardado.
    cantHTML(valor, key) {
      return `<button class="cantv" data-cv="${key}" title="Tocá para cambiar la cantidad">${valor}</button>`;
    },
    bindCant(cont) {
      cont.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => {
        const key = b.dataset.cv;
        const actual = key === 'nueva' ? this.cantNueva : (this.get(key) || {}).cantidad || 1;
        b.outerHTML = `<input class="cante" type="number" min="1" value="${actual}" data-ce="${key}" aria-label="Cantidad">`;
        const i = cont.querySelector(`[data-ce="${key}"]`); if (!i) return;
        let listo = false;
        const guardar = () => {
          if (listo) return; listo = true;
          const n = Math.max(1, Math.floor(Number(i.value)) || 1);
          if (key === 'nueva') { this.cantNueva = n; setTimeout(() => this.pintarProductos(), 0); }
          else { const l = this.get(key); if (l) l.cantidad = n; this.repintar(); }
        };
        i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
        i.onblur = guardar;
        i.focus(); i.select && i.select();
      });
    },

    // Refresca lo que depende de las líneas sin volver a dibujar la tabla.
    refrescarProductos() {
      this.pintarTotales(); this.refrescarResumen();
      const s = document.querySelector('.pr-sum b');
      if (s) s.textContent = UI.pesos(this.total());
    },
    get(key) { return this.lineas.find(x => x.key === Number(key)); },
    // Repinta después de que termine el evento en curso: hacerlo dentro de un
    // blur/change deja el navegador quitando un nodo que ya no está.
    repintar() { try { setTimeout(() => this.pintar(), 0); } catch (e) { this.pintar(); } },

    alternarTipo(l) {
      if (!l) return;
      if (l.tipo === 'estandar') {
        l.tipo = 'medida';
        if (l.precioManual == null) l.precioManual = Math.round(l.base);
        l.ejes = l.ejes ? l.ejes + ' · adaptado' : 'a medida';
        l.editando = true;   // queda abierta para cargar el detalle y la foto
        this.log(this.vendedor, `Pasó ${l.prodNombre} a medida`);
      } else {
        l.tipo = 'estandar';
        l.precioManual = null;
        l.obs = '';   // en estándar no hay nada que aclarar: el campo se cierra
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
        <p class="muted" style="font-size:13px;margin:8px 0 14px">
          En los muebles <b>a medida</b> la foto es la que le explica a fábrica qué
          pidió el cliente. Queda guardada en <b>Documentos relacionados</b>.</p>
        <label class="adj">
          <input type="file" id="im-file" accept="image/*" hidden>
          <span>📷 Elegir imagen</span>
        </label>
        <div id="im-prev">${l.img ? `<img src="${UI.esc(l.img)}" alt="Imagen del producto"><div class="muted">${UI.esc(l.imgNombre || 'Imagen cargada')}</div>` : ''}</div>
        <div class="row" style="margin-top:14px;justify-content:flex-end;gap:10px">
          ${l.img ? '<button class="btn" id="im-quitar">Quitar</button>' : ''}
          <button class="btn primary" id="im-ok">Listo</button></div>`, m => {
        const file = document.getElementById('im-file');
        file.onchange = () => {
          const f = file.files && file.files[0]; if (!f) return;
          const lector = new FileReader();
          lector.onload = () => {
            l.img = lector.result; l.imgNombre = f.name;
            const pv = document.getElementById('im-prev');
            if (pv) pv.innerHTML = `<img src="${l.img}" alt=""><div class="muted">${UI.esc(f.name)}</div>`;
            this.guardarArchivo(f.name, l);
          };
          lector.readAsDataURL(f);
        };
        document.getElementById('im-ok').onclick = () => { m.remove(); this.pintar(); this.pintarSide(); };
        const q = document.getElementById('im-quitar');
        if (q) q.onclick = () => {
          this.archivos = this.archivos.filter(a => a.key !== l.key);
          l.img = ''; l.imgNombre = ''; m.remove(); this.pintar(); this.pintarSide();
        };
      });
    },
    // Los archivos adjuntos de la cotización se listan en el costado.
    guardarArchivo(nombre, l) {
      this.archivos = this.archivos.filter(a => a.key !== l.key);
      this.archivos.unshift({ key: l.key, nombre, de: l.prodNombre || 'Mueble a medida' });
      this.log(this.vendedor, `Adjuntó ${nombre} a ${l.prodNombre || 'un producto'}`);
      this.pintarSide();
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
      if (vars.length === 1) return this.agregarEstandar(prod.nombre, vars[0], prod.img, this.cantNueva);
      this.modalVariante(prod, vars);
    },

    agregarEstandar(prodNombre, variante, img = '', cantidad = 1, tipo = 'estandar') {
      const partes = EJES.filter(e => variante[e.k]).map(e => ({ lbl: e.label, val: variante[e.k] }));
      const medida = tipo === 'medida';
      this.lineas.push({
        key: ++this._uid, tipo, prodNombre, varId: variante.id,
        partes, ejes: textoEjes(partes) + (medida ? ' · adaptado' : ''),
        base: Number(variante.precio) || 0,
        cantidad: Math.max(1, Math.floor(cantidad) || 1),
        // A medida arranca SIN precio ("a definir"): se completa después.
        obs: '', medidas: '', colores: '', precioManual: null, img: img || variante.img || '',
        editando: medida,   // se abre para cargar precio, detalle y foto
      });
      this.log(this.vendedor, `Agregó ${cantidad > 1 ? cantidad + ' × ' : ''}${prodNombre}${medida ? ' (a medida)' : ''}`);
      this.cantNueva = 1;   // el renglón de carga vuelve a 1 para el próximo
      this.pintarProductos(); this.pintarCabecera(); this.pintarSide();
      UI.aviso('Producto agregado', 'ok');
    },

    // ---- 3 · Adicionales ---------------------------------------------------
    // Son las preguntas que siempre hay que anotar; casi todas salen por
    // default y el vendedor sólo corrige lo que cambia.
    pintarAdicionales() {
      const c = document.getElementById('sec-adicionales'); if (!c) return;
      const a = this.ad, DB = global.DB;
      const locd = (DB.localidades().find(l => l.k === this.cli.localidad) || {}).label;

      // Los tres campos vienen BLOQUEADOS con su valor estándar. Si el vendedor
      // necesita poner otra cosa, los abre con "Modificar" — y ahí sí salta el
      // aviso para que Administración lo revise.
      const cerrado = (lbl, valor, k, nota, ico = '✏️') => `
        <div class="fr"><label>${UI.esc(lbl)}</label>
          <div class="fx"><span class="valf">${UI.esc(valor)}</span>
            <button class="lapiz" data-abrir="${k}" title="Modificar ${UI.esc(lbl)}" aria-label="Modificar ${UI.esc(lbl)}">${ico}</button></div></div>
        ${nota ? `<div class="fr"><label></label><span class="hint">${nota}</span></div>` : ''}`;

      const hayDom = this.envioCotizable();

      c.innerHTML = `<div class="cz-cols">
        <div class="cz-col">
          <div class="fr"><label>Entrega</label>
            <div class="fx"><span class="valf">${UI.esc(this.entregaTexto())}</span>
              <button class="lapiz cal ${a.entregaTocada ? 'tocado' : ''}" id="ad-cal"
                title="${a.entregaTocada ? 'Plazo modificado — requiere autorización' : 'Elegir las fechas de entrega'}"
                aria-label="Elegir las fechas de entrega">🗓️</button>
              ${a.entregaTocada ? `<button class="lapiz" data-cerrar="entrega" title="Volver al plazo estándar" aria-label="Volver al plazo estándar">↺</button>` : ''}
            </div></div>
          <div class="fr"><label></label><span class="hint" id="ad-plazo">Plazo de fabricación: <b>${UI.esc(this.entregaDias())}</b>.</span></div>
          <div id="ad-calbox"></div>

          <div class="fr"><label>Saldo se abona en</label>
            <span class="valf">${UI.esc(a.saldoEn)}</span></div>

          ${!hayDom
            ? `<div class="fr"><label>Costo de envío</label>
                 <span class="valf">${UI.esc(DB.ENVIO_SIN_DOMICILIO)}</span></div>
               <div class="fr"><label></label><span class="hint">Cargá el <b>domicilio de entrega</b> y la localidad para que salga el costo.</span></div>`
            : a.envioAbierto
              ? `<div class="fr"><label for="ad-envio">Costo de envío</label>
                   <div class="fx"><input id="ad-envio" inputmode="numeric" value="${a.envio}">
                     <button class="lapiz" data-cerrar="envio" title="Volver al de la localidad" aria-label="Volver al de la localidad">↺</button></div></div>`
              : cerrado('Costo de envío', UI.pesos(a.envio), 'envio',
                  `Por la localidad <b>${UI.esc(locd)}</b>.`, '🔀')}
        </div>

        <div class="cz-col">
          ${a.instalacionAbierta
            ? `<div class="fr"><label for="ad-inst">¿Requiere instalación?</label>
                 <div class="fx"><select id="ad-inst">
                   <option value="convenir" ${a.instalacion === 'convenir' ? 'selected' : ''}>${UI.esc(DB.INSTALACION_DEFAULT)}</option>
                   <option value="si" ${a.instalacion === 'si' ? 'selected' : ''}>Sí</option>
                   <option value="no" ${a.instalacion === 'no' ? 'selected' : ''}>No</option>
                 </select><button class="lapiz" data-cerrar="instalacion" title="Volver" aria-label="Volver">↺</button></div></div>`
            : cerrado('¿Requiere instalación?', this.instalacionTexto(), 'instalacion')}

          ${a.instalacion === 'si'
            ? `<div class="fr"><label for="ad-cinst">Costo de instalación</label>
                 <input id="ad-cinst" inputmode="numeric" class="${a.instalacionCosto ? '' : 'falta'}" value="${a.instalacionCosto || ''}" placeholder="obligatorio"></div>`
            : `<div class="fr"><label>Costo de instalación</label>
                 <span class="valf">Sin instalación</span></div>`}

          ${a.escaleraAbierta
            ? `<div class="fr"><label for="ad-esc">Subida por escalera</label>
                 <div class="fx"><input id="ad-esc" type="number" min="0" value="${a.escalera}">
                   <button class="lapiz" data-cerrar="escalera" title="Volver a $5.000" aria-label="Volver a $5.000">↺</button></div></div>
               <div class="fr"><label></label><span class="hint">Por piso por bulto.</span></div>`
            : cerrado('Subida por escalera', DB.escaleraTexto(a.escalera), 'escalera')}
        </div>
      </div><div id="ad-avisos"></div>
      <div class="sec-go"><button class="btn sm primary" id="a-cerrar">Listo — cerrar</button></div>`;

      document.getElementById('a-cerrar').onclick = () => { this.etapa = ''; this.pintarMain(); };

      // Abrir un campo es un acto deliberado: queda registrado y avisa a Administración.
      const ABRE = { entrega: 'entregaAbierta', envio: 'envioAbierto', instalacion: 'instalacionAbierta', escalera: 'escaleraAbierta' };
      const NOMBRE = { entrega: 'el plazo de entrega', envio: 'el costo de envío', instalacion: 'la instalación', escalera: 'la subida por escalera' };
      c.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        const k = b.dataset.abrir;
        a[ABRE[k]] = true;
        this.log(this.vendedor, `Abrió ${NOMBRE[k]} para modificarlo`);
        this.pintarAdicionales(); this.pintarSide();
      });
      c.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = () => {
        const k = b.dataset.cerrar;
        a[ABRE[k]] = false;
        if (k === 'entrega') { const d = DB.ENTREGA_DIAS; a.desde = enDias(d.min); a.hasta = enDias(d.max); a.entregaTocada = false; }
        if (k === 'envio') { a.envio = this.envioCotizable() ? DB.fleteDe(this.cli.localidad) : 0; a.envioTocado = false; }
        if (k === 'instalacion') { a.instalacion = 'convenir'; }
        if (k === 'escalera') { a.escalera = DB.ESCALERA_DEFAULT; a.escaleraTocada = false; }
        this.pintarAdicionales(); this.pintarTotales(); this.refrescarResumen();
      });

      const av = () => {
        const box = document.getElementById('ad-avisos'); if (!box) return;
        const out = [];
        if (a.envioTocado) out.push(`<div class="banner warn">El <b>costo de envío</b> se cambió a mano (no es el de ${UI.esc(locd || 'la localidad')}) — queda registrado.</div>`);
        if (a.escaleraTocada) out.push(`<div class="banner warn">La <b>subida por escalera</b> se cambió — queda registrado.</div>`);
        if (a.instalacion === 'si') out.push(`<div class="banner">La orden pide <b>instalación</b> — Logística la agenda con el armador.</div>`);
        box.innerHTML = out.join('');
      };


      // El calendario se abre en el mismo lugar, sin pop-up.
      document.getElementById('ad-cal').onclick = () => {
        a.calAbierto = !a.calAbierto; this.pintarAdicionales();
      };
      if (a.calAbierto) {
        this.pintarCalendario('ad-calbox', { d1: a.desde, d2: a.hasta }, (d1, d2) => {
          a.desde = d1; a.hasta = d2; a.entregaTocada = true; a.calAbierto = false;
          this.normalizarEntrega();
          this.log(this.vendedor, `Cambió la fecha de entrega: ${this.entregaTexto()}`, 'entrega');
          this.pintarAdicionales(); this.refrescarResumen(); this.pintarSide();
        });
      }
      const en = document.getElementById('ad-envio');
      if (en) en.oninput = e => {
        const n = e.target.value.replace(/[^\d]/g, '');
        if (n !== e.target.value) e.target.value = n;
        a.envio = Math.max(0, Number(n) || 0); a.envioTocado = true;
        av(); this.pintarTotales(); this.refrescarResumen();
      };
      const ins = document.getElementById('ad-inst');
      if (ins) ins.onchange = e => {
        a.instalacion = e.target.value;
        if (a.instalacion !== 'si') a.instalacionCosto = 0;
        this.pintarAdicionales(); this.pintarTotales(); this.refrescarResumen();
      };
      const ci = document.getElementById('ad-cinst');
      if (ci) ci.oninput = e => {
        const n = e.target.value.replace(/[^\d]/g, '');
        if (n !== e.target.value) e.target.value = n;
        a.instalacionCosto = Math.max(0, Number(n) || 0);
        e.target.classList.toggle('falta', !a.instalacionCosto);
        this.pintarTotales(); this.refrescarResumen();
      };
      const es = document.getElementById('ad-esc');
      if (es) es.oninput = e => { a.escalera = Math.max(0, Number(e.target.value) || 0); a.escaleraTocada = true; av(); };
      av();
    },

    // ---- Desglose de totales ----------------------------------------------
    pintarTotales() {
      const t = document.getElementById('cz-tot'); if (!t) return;
      const lista = this.totalLista(), desc = this.descuento();
      const extra = this.descuentoExtra();
      const pct = this.descPct() ? ` ${this.descPct()}%` : '';
      const fila = (l, v, cls = '') => `<div class="tr ${cls}"><span>${l}</span><b class="tnum">${v}</b></div>`;
      t.innerHTML = `<div class="cz-tots">
        ${fila('Total', UI.pesos(lista))}
        ${desc ? fila('Dto. efvo.' + pct, '−' + UI.pesos(desc), 'neg') : ''}
        ${desc ? fila('Subtotal', UI.pesos(this.total())) : ''}
        <button class="tdto ${extra ? 'on' : ''}" id="cz-dto">
          <span>Descuento${extra ? `<small>${UI.esc(this.dtoTexto())}</small>` : ''}</span>
          <b class="tnum">${extra ? '−' + UI.pesos(extra) : '+ Agregar'}</b>
        </button>
        ${fila('Envío', this.envioTexto())}
        ${this.instalacionMonto() ? fila('Instalación', UI.pesos(this.instalacionMonto())) : ''}
        ${fila('Saldo restante', UI.pesos(this.totalFinal()), 'big')}
        <div class="tiva">${UI.esc(global.DB.IVA_LEYENDA)}</div>
      </div>`;
      document.getElementById('cz-dto').onclick = () => this.modalDescuento();
    },

    // Pop-up del descuento comercial: % o $, sobre todo o sobre un producto.
    modalDescuento() {
      const d = Object.assign({ modo: 'pct', alcance: 'total', linea: null, valor: '' }, this.dto || {});
      if (d.alcance === 'linea' && !this.get(d.linea)) d.alcance = 'total';
      const m = this.modal('', null, 460);
      const caja = m.firstChild;

      const pintar = () => {
        const prev = (() => {
          const guardado = this.dto; this.dto = Number(d.valor) > 0 ? d : null;
          const x = this.descuentoExtra(); this.dto = guardado; return x;
        })();
        caja.innerHTML = `
          <div class="row" style="margin-bottom:4px"><h3 style="color:var(--navy);margin:0">Descuento</h3>
            <div class="sp" style="flex:1"></div><button class="lx" id="dd-x" style="font-size:20px">✕</button></div>
          <p class="muted" style="margin:0 0 14px;font-size:13px">Aparte del descuento de la condición de pago.</p>
          <div class="vgrp"><div class="vlbl">Sobre</div>
            <div class="vopts">
              <button class="vopt ${d.alcance === 'total' ? 'on' : ''}" data-a="total">Todos los muebles</button>
              <button class="vopt ${d.alcance === 'linea' ? 'on' : ''}" data-a="linea" ${this.lineas.length ? '' : 'disabled'}>Un producto</button>
            </div></div>
          ${d.alcance === 'linea' ? `<div class="vgrp"><div class="vlbl">Producto</div>
            <select id="dd-linea">${this.lineas.map(l =>
              `<option value="${l.key}" ${String(d.linea) === String(l.key) ? 'selected' : ''}>${UI.esc(l.prodNombre || 'Mueble a medida')} — ${UI.pesos(this.unit(l) * l.cantidad)}</option>`).join('')}</select></div>` : ''}
          <div class="vgrp"><div class="vlbl">En</div>
            <div class="ddrow">
              <div class="vopts">
                <button class="vopt ${d.modo === 'pct' ? 'on' : ''}" data-m="pct">Porcentaje %</button>
                <button class="vopt ${d.modo === 'monto' ? 'on' : ''}" data-m="monto">Pesos $</button>
              </div>
              <div class="vcant"><input id="dd-valor" inputmode="numeric" value="${d.valor}" placeholder="0" aria-label="${d.modo === 'pct' ? 'Porcentaje' : 'Monto'}">
                <span class="muted">${d.modo === 'pct' ? '%' : '$'}</span></div>
            </div></div>
          <div class="vpre">
            <div><div class="muted" style="font-size:12px">Descuento</div>
              <b class="tnum" style="font-size:21px;color:var(--ok)">${prev ? '−' + UI.pesos(prev) : '—'}</b></div>
            <div class="sp" style="flex:1"></div>
            ${this.dto ? '<button class="btn" id="dd-quitar">Quitar</button>' : ''}
            <button class="btn primary" id="dd-ok">Guardar</button>
          </div>`;

        document.getElementById('dd-x').onclick = () => m.remove();
        caja.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { d.modo = b.dataset.m; pintar(); });
        caja.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
          d.alcance = b.dataset.a;
          if (d.alcance === 'linea' && !this.get(d.linea)) d.linea = (this.lineas[0] || {}).key;
          pintar();
        });
        const sel = document.getElementById('dd-linea');
        if (sel) sel.onchange = e => { d.linea = Number(e.target.value); pintar(); };
        const val = document.getElementById('dd-valor');
        val.oninput = () => {
          const n = val.value.replace(/[^\d]/g, '');
          d.valor = n;
          if (n !== val.value) { val.value = n; }
          const prevb = caja.querySelector('.vpre b');
          if (prevb) { const g = this.dto; this.dto = Number(n) > 0 ? d : null;
            const x = this.descuentoExtra(); this.dto = g;
            prevb.textContent = x ? '−' + UI.pesos(x) : '—'; }
        };
        const q = document.getElementById('dd-quitar');
        if (q) q.onclick = () => {
          this.dto = null; this.log(this.vendedor, 'Quitó el descuento');
          m.remove(); this.pintarTotales(); this.pintarSide();
        };
        document.getElementById('dd-ok').onclick = () => {
          this.dto = Number(d.valor) > 0 ? { ...d, valor: Number(d.valor) } : null;
          this.log(this.vendedor, this.dto ? `Aplicó un descuento de ${this.dtoTexto()}` : 'Quitó el descuento', 'dto');
          m.remove(); this.pintarTotales(); this.pintarSide();
        };
      };
      pintar();
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
          <div class="cz-sb">${
            this.archivos.map(a => `<div class="doc"><span class="di">📎</span>
                <div><div class="dt">${UI.esc(a.nombre)}</div>
                  <div class="dr">${UI.esc(a.de)}</div></div></div>`).join('')
            + (ficha && ficha.docs.length
              ? ficha.docs.map(d => `<div class="doc"><span class="di">▤</span>
                  <div><div class="dt">${UI.esc(d.tipo)}</div>
                    <div class="dr">${UI.esc(d.ref)}${d.f ? ` (${UI.esc(d.f)})` : ''}</div></div></div>`).join('')
              : (this.archivos.length ? '' : '<div class="muted" style="font-size:12.5px">Sin antecedentes para este cliente.</div>'))
          }</div>
        </div>`;

      s.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { this.lado = b.dataset.l; this.pintarSide(); });
      const fi = document.getElementById('cz-ficha');
      if (fi) fi.onclick = () => global.App.goSub('crm', 'clientes');
      const na = document.getElementById('cz-nota');
      if (na) na.oninput = () => { this.obsInt = na.value; };
    },

    actividadHTML() {
      if (!this.actividad.length) return '<div class="muted" style="font-size:12.5px">Todavía no pasó nada en esta cotización.</div>';
      return this.actividad.map(a => `<div class="act">
        <span class="ava ${a.quien === 'Sistema' ? 'sys' : ''}">${UI.esc(inic(a.quien))}</span>
        <div><div class="aq">${UI.esc(a.quien)}<span class="ah">${UI.esc(a.hora)}</span></div>
          <div class="at">${UI.esc(a.texto)}</div></div></div>`).join('');
    },
    notasHTML() {
      return `<div class="muted" style="font-size:12px;margin-bottom:7px">Observaciones <b>internas</b> — no salen impresas.</div>
        <textarea id="cz-nota" rows="7" placeholder="Notas para producción, administración o para vos…">${UI.esc(this.obsInt)}</textarea>`;
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
      if (tipo === 'guardar') {
        this.guardada = true;   // ya tiene número tomado en firme
        this.log(this.vendedor, 'Guardó la cotización'); this.pintarSide();
        return UI.aviso(`${global.DB.numeroCotizacion(this.nro)} guardada (demo)`, 'ok');
      }
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
      // Si la orden lleva instalación, su costo es obligatorio.
      if (this.ad.instalacion === 'si' && !this.ad.instalacionCosto) {
        this.etapa = 'adicionales'; this.pintarMain();
        return UI.aviso('Cargá el costo de instalación', 'warn');
      }

      const verif = this.lineas.filter(l => this.requiereVerif(l)).length;
      const plazo = this.entregaEditada();
      const muebles = this.total(), envio = this.envioMonto(), total = this.totalFinal();
      const nombreCli = this.nombreCli();
      this.modal(`<h3 style="color:var(--navy)">Confirmar → Venta</h3>
        <p style="margin:10px 0 0">Se crea la orden en estado <span class="pill warn">Confirmar</span> — a la espera de la seña (mínimo 30%).</p>
        <table style="margin-top:12px"><tbody>
          <tr><td class="muted">Cliente</td><td style="text-align:right"><b>${UI.esc(nombreCli)}</b></td></tr>
          <tr><td class="muted">Vendedor · Local</td><td style="text-align:right">${UI.esc(this.vendedor)} · ${UI.esc(this.local)}</td></tr>
          <tr><td class="muted">Condición de pago</td><td style="text-align:right">${UI.esc(this.terminoLabel())}</td></tr>
          <tr><td class="muted">Entrega</td><td style="text-align:right">${UI.esc(this.entregaTexto())}</td></tr>
          <tr><td class="muted">Productos</td><td style="text-align:right">${this.lineas.length}${verif ? ` · <span style="color:var(--warn)">${verif} a verificar</span>` : ''}</td></tr>
          <tr><td class="muted">Muebles</td><td style="text-align:right" class="tnum">${UI.pesos(muebles)}</td></tr>
          <tr><td class="muted">Envío</td><td style="text-align:right" class="tnum">${UI.esc(this.envioTexto())}</td></tr>
          <tr><td class="muted">Total</td><td style="text-align:right"><b class="tnum">${UI.pesos(total)}</b></td></tr>
        </tbody></table>
        ${verif ? `<div class="banner warn" style="margin-top:12px">${verif} producto(s) a medida / con detalle van a <b>verificarse en Administración</b>.</div>` : ''}
        ${plazo ? `<div class="banner warn" style="margin-top:10px">El <b>plazo de entrega</b> se cambió (${UI.esc(this.entregaTexto())}) — queda registrado y va a verificación.</div>` : ''}
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
          this.guardada = true;   // el número queda usado por la venta
          this.reset();
          UI.aviso(`Orden ${orden.numero} creada en estado Confirmar`, 'ok');
          global.App.goSub('ventas', 'ordenes');
        };
      });
    },

    reset() {
      const s = global.DB.sesion();
      // Si la anterior nunca se guardó ni se convirtió, su número se reutiliza.
      if (this.nro != null && !this.guardada) global.DB.liberarNumeroCotizacion(this.nro);
      this.nro = global.DB.tomarNumeroCotizacion(); this.guardada = false;
      this.cli = { nombre: '', telefono: '', email: '', instagram: '', dni: '', tel2: '', canal: '', domicilio: '', localidad: '' };
      this.abiertos = {}; this.etapa = 'cliente'; this.lado = 'actividad'; this.cantNueva = 1;
      this.cabAbierta = false;
      // Vendedor y local salen del usuario de la sesión; igual se pueden editar.
      this.vendedor = s.vendedor; this.local = s.local; this.fecha = hoy(); this.termino = 'efectivo';
      this.obsExt = ''; this.obsInt = ''; this.terminos = global.DB.TYC_DEFAULT;
      const d = global.DB.ENTREGA_DIAS;
      this.ad = {
        // Plazo estándar como fechas concretas; se puede abrir y cambiar.
        desde: enDias(d.min), hasta: enDias(d.max),
        entregaAbierta: false, entregaTocada: false,
        saldoEn: this.terminoLabel(),
        envio: 0, envioAbierto: false, envioTocado: false,
        instalacion: 'convenir', instalacionAbierta: false, instalacionCosto: 0,
        calAbierto: false,
        escalera: global.DB.ESCALERA_DEFAULT, escaleraAbierta: false, escaleraTocada: false,
      };
      this.lineas = []; this._uid = 0; this.dto = null; this.archivos = [];
      this.actividad = [];
      this.log(this.vendedor, 'Creó la cotización');
    },

    // ---- Vista previa / descarga / impresión -------------------------------
    cuerpoPreview() {
      const term = this.terminoLabel(), a = this.ad, DB = global.DB;
      const c = this.cli;
      const ident = [c.telefono, c.tel2, c.email, c.instagram].filter(Boolean).join(' · ');
      const dom = [c.domicilio, (DB.localidades().find(l => l.k === c.localidad) || {}).label].filter(Boolean).join(' · ');
      const lista = this.totalLista(), desc = this.descuento(), envio = this.envioMonto();
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
          <div>Envío <b class="tnum">${UI.esc(this.envioTexto())}</b></div>
          ${this.descuentoExtra() ? `<div>Descuento <b class="tnum">−${UI.pesos(this.descuentoExtra())}</b></div>` : ''}
          <div class="big">Total <b class="tnum">${UI.pesos(this.totalFinal())}</b></div>
        </div>
        <div class="pv-ad">
          <div><b>Tiempo de entrega:</b> ${UI.esc(this.entregaTexto())}</div>
          <div><b>Saldo se abona en:</b> ${UI.esc(a.saldoEn)}</div>
          <div><b>Instalación:</b> ${UI.esc(this.instalacionTexto())}</div>
          <div><b>Subida por escalera:</b> ${UI.esc(DB.escaleraTexto(a.escalera))}</div>
          <div>${UI.esc(DB.IVA_LEYENDA)}</div>
          ${this.obsExt ? `<div style="margin-top:8px"><b>Observaciones:</b> ${UI.esc(this.obsExt)}</div>` : ''}
          ${this.terminos ? `<div style="margin-top:8px">${UI.esc(this.terminos)}</div>` : ''}
        </div></div>`;
      // Las observaciones INTERNAS nunca entran acá: son para nosotros.
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
      const cant = Math.max(1, this.cantNueva || 1);   // copiada del renglón de carga
      let tipo = 'estandar';   // estándar toma el precio del catálogo; a medida queda a definir

      const calzan = () => vars.filter(v => ejes.every(e => sel[e.k] == null || v[e.k] === sel[e.k]));
      const elegida = () => { const c = calzan(); return c.length === 1 || ejes.every(e => sel[e.k] != null) ? c[0] : null; };

      const pintar = () => {
        const v = elegida();
        const partes = ejes.filter(e => sel[e.k]).map(e => ({ lbl: e.label, val: sel[e.k] }));
        caja.innerHTML = `
          <div class="row" style="margin-bottom:4px"><h3 style="color:var(--navy);margin:0">${UI.esc(prod.nombre)}</h3>
            <div class="sp" style="flex:1"></div><button class="lx" id="mv-x" style="font-size:20px">✕</button></div>
          <p class="muted" style="margin:0 0 12px;font-size:13px">Armá el mueble: elegí ${ejes.map(e => e.label.toLowerCase()).join(', ')}.</p>
          ${ejes.map(e => {
            const opts = opciones(vars, e.k, sel);
            return `<div class="vgrp"><div class="vlbl">${UI.esc(e.label)}</div>
              <div class="vopts">${opts.map(o =>
                `<button class="vopt ${sel[e.k] === o ? 'on' : ''}" data-e="${e.k}" data-o="${UI.esc(o)}">${UI.esc(o)}</button>`).join('')}</div></div>`;
          }).join('')}
          <div class="vgrp"><div class="vlbl">Tipo</div>
            <div class="vopts">
              <button class="vopt ${tipo === 'estandar' ? 'on' : ''}" data-t="estandar">Estándar</button>
              <button class="vopt ${tipo === 'medida' ? 'on med' : ''}" data-t="medida">A medida</button>
            </div></div>
          <div class="vpre">
            <div>
              <div class="muted" style="font-size:12px">${partes.length ? UI.esc(textoEjes(partes)) : 'Elegí las opciones'}</div>
              ${tipo === 'medida'
                ? `<b style="font-size:19px;color:var(--warn)">A definir</b>
                   <span class="muted" style="font-size:12px">el precio se carga en el renglón</span>`
                : `<b class="tnum" style="font-size:21px;color:var(--navy)">${v ? UI.pesos(v.precio * cant) : '—'}</b>
                   <span class="muted" style="font-size:12px">precio de lista${cant > 1 && v ? ` · ${cant} × ${UI.pesos(v.precio)}` : ''}</span>`}
            </div>
            <div class="sp" style="flex:1"></div>
            <button class="btn primary" id="mv-ok" ${v ? '' : 'disabled'}>Agregar${cant > 1 ? ` ${cant}` : ''}</button>
          </div>`;
        caja.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; pintar(); });

        document.getElementById('mv-x').onclick = () => m.remove();
        caja.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
          const e = b.dataset.e, o = b.dataset.o;
          if (sel[e] === o) delete sel[e]; else sel[e] = o;
          // Al cambiar un eje de arriba, los de abajo pueden quedar inválidos.
          ejes.forEach(x => { if (sel[x.k] && !opciones(vars, x.k, sel, x.k).includes(sel[x.k])) delete sel[x.k]; });
          pintar();
        });
        const ok = document.getElementById('mv-ok');
        if (ok && v) ok.onclick = () => { this.agregarEstandar(prod.nombre, v, prod.img, cant, tipo); m.remove(); };
      };
      pintar();
    },

    // Al catálogo se entra por los dos lados: bajando por categorías (rubro →
    // tipo de mueble) o escribiendo el nombre. Se combinan: se puede filtrar
    // una categoría y encima buscar por texto adentro.
    modalCatalogo() {
      this.modal(`<div class="row" style="margin-bottom:12px"><h3 style="color:var(--navy)">Catálogo</h3><div class="sp" style="flex:1"></div><button class="lx" id="mc-x" style="font-size:20px">✕</button></div>
        <input id="mc-q" placeholder="Buscar por nombre…" autocomplete="off" style="margin-bottom:12px">
        <div class="mc-wrap">
          <div class="mc-cats" id="mc-cats">${UI.spinner()}</div>
          <div class="mc-prods" id="mc-lista">${UI.spinner()}</div>
        </div>
        <style>
          .mc-wrap{display:grid;grid-template-columns:216px minmax(0,1fr);gap:14px;align-items:start}
          @media(max-width:640px){.mc-wrap{grid-template-columns:1fr}}
          .mc-cats{border-right:1px solid var(--line);padding-right:12px;max-height:400px;overflow:auto}
          @media(max-width:640px){.mc-cats{border-right:0;border-bottom:1px solid var(--line);padding:0 0 10px;max-height:150px}}
          .mc-prods{max-height:400px;overflow:auto}
          .mc-cat{display:flex;align-items:center;gap:6px;width:100%;border:0;background:none;font:inherit;font-size:13px;color:var(--ink);
            text-align:left;padding:6px 8px;border-radius:7px;cursor:pointer}
          .mc-cat:hover{background:var(--panel-2)}
          .mc-cat.on{background:var(--brand-soft);color:var(--brand);font-weight:700}
          .mc-cat.hija{padding-left:22px;font-size:12.5px;color:var(--ink-soft)}
          .mc-cat .cn{margin-left:auto;font-size:11.5px;color:var(--muted)}
          .mc-cat.on .cn{color:var(--brand)}
        </style>`,
        m => {
          document.getElementById('mc-x').onclick = () => m.remove();
          let cat = null, texto = '', cats = [];

          const pintarCats = () => {
            const c = document.getElementById('mc-cats'); if (!c) return;
            // Se listan los rubros y, debajo, los tipos de mueble de cada uno.
            const padres = cats.filter(x => x.padre_id == null);
            const fila = (x, hija) => `<button class="mc-cat ${hija ? 'hija' : ''} ${cat === x.id ? 'on' : ''}" data-cat="${x.id}">
              ${UI.esc(x.nombre)}<span class="cn">${this._cuenta[x.id] ?? ''}</span></button>`;
            c.innerHTML = `<button class="mc-cat ${cat == null ? 'on' : ''}" data-cat="">Todas<span class="cn">${this._cuenta.total ?? ''}</span></button>`
              + padres.map(p => fila(p, false) + cats.filter(h => h.padre_id === p.id).map(h => fila(h, true)).join('')).join('');
            c.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
              cat = b.dataset.cat ? Number(b.dataset.cat) : null;
              pintarCats(); pintarProds();
            });
          };

          const pintarProds = async () => {
            const c = document.getElementById('mc-lista'); c.innerHTML = UI.spinner();
            try {
              // Los rubros no tienen productos propios: se busca en sus hijas.
              const hijas = cat != null ? cats.filter(x => x.padre_id === cat).map(x => x.id) : [];
              let prods;
              if (hijas.length) {
                const packs = await Promise.all(hijas.map(id => global.DB.productos({ texto, categoriaId: id, limite: 80 })));
                prods = packs.flat();
              } else {
                prods = await global.DB.productos({ texto, categoriaId: cat, limite: 80 });
              }
              c.innerHTML = prods.length ? `<table><thead><tr><th>Producto</th><th style="text-align:right">Var.</th><th></th></tr></thead>
                <tbody>${prods.map(p => `<tr><td><b>${UI.esc(p.nombre)}</b> ${p.publicado_tn ? '<span class="pill ok">TN</span>' : '<span class="pill soft">interno</span>'}</td>
                <td style="text-align:right" class="tnum">${p.variantes}</td><td style="text-align:right"><button class="btn sm primary" data-p="${p.id}">Elegir</button></td></tr>`).join('')}</tbody></table>`
                : UI.vacio(texto || cat != null ? 'Nada acá. Probá otra categoría o cambiá el texto.' : 'Sin resultados.');
              c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { m.remove(); this.elegirProducto(Number(b.dataset.p), prods.find(p => p.id === Number(b.dataset.p))); });
            } catch (e) { c.innerHTML = `<div class="banner warn">${UI.esc(e.message || e)}</div>`; }
          };

          const q = document.getElementById('mc-q');
          let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { texto = q.value.trim(); pintarProds(); }, 220); };

          (async () => {
            try {
              cats = await global.DB.arbolCategorias();
              const todos = await global.DB.productos({ limite: 500 });
              // Cuántos productos cuelgan de cada categoría (el rubro suma sus hijas).
              this._cuenta = { total: todos.length };
              cats.forEach(x => { this._cuenta[x.id] = todos.filter(p => p.categoria_id === x.id).length; });
              cats.filter(x => x.padre_id == null).forEach(p => {
                this._cuenta[p.id] = cats.filter(h => h.padre_id === p.id)
                  .reduce((a, h) => a + (this._cuenta[h.id] || 0), 0);
              });
            } catch (e) { cats = []; this._cuenta = {}; }
            pintarCats(); pintarProds();
          })();
        }, 760);
    },

    estilos() {
      return `<style>
        .cz-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .cz-sep{width:1px;height:22px;background:var(--line);margin:0 3px}
        .cz-wrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
        @media(max-width:1180px){.cz-wrap{grid-template-columns:1fr}}

        .cz-head{margin-bottom:10px;padding-bottom:14px}
        .cz-tit{display:flex;align-items:flex-start;gap:20px}
        .cz-box{position:relative;border:1px solid var(--line);border-radius:10px;padding:9px 13px;background:var(--panel-2);min-width:282px;display:flex;flex-direction:column;gap:1px}
        .cz-box .cabx{position:absolute;top:5px;right:5px}
        .cz-box .valf{font-size:13px;font-weight:600;color:var(--navy);padding:2px 0}
        .fr.sm{grid-template-columns:106px minmax(0,1fr);gap:8px}
        .cz-box .fr.sm{align-items:baseline}
        .fr.sm.nro b{font-size:16px;color:var(--navy);font-weight:800}
        .fr.sm>label{font-size:12px}
        .fr.sm input,.fr.sm select{padding:4px 8px;font-size:12.5px}
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
        .int{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 5px;margin-left:5px}

        .cz-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
        @media(max-width:820px){.cz-cols{grid-template-columns:1fr}}
        .cz-col{display:flex;flex-direction:column;gap:9px}
        .fr{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:10px}
        .fr>label{font-size:12.5px;color:var(--ink-soft)}
        .fr input,.fr select{padding:7px 10px;font-size:13px;width:100%}
        .fr input[readonly]{background:var(--panel-2);color:var(--ink-soft)}
        .fr .hint{font-size:11.5px;color:var(--muted)}
        @media(max-width:520px){.fr{grid-template-columns:1fr;gap:3px}}
        .adds{display:flex;gap:7px;flex-wrap:wrap}
        .fr>label .chip-add{padding:0 7px;font-size:11.5px;line-height:1.5;margin-left:4px}
        .fx{display:flex;align-items:center;gap:5px}
        .fx input{flex:1;min-width:0}
        .cx{flex:none;border:0;background:none;color:var(--muted);cursor:pointer;font-size:13px;line-height:1;padding:5px 6px;border-radius:6px}
        .cx:hover{background:var(--crit-bg,var(--line-soft));color:var(--crit)}
        input.falta,textarea.falta{border-color:var(--crit);background:var(--crit-bg,#fdf2f2)}
        input.falta::placeholder{color:var(--crit)}
        .chip-add{border:1px dashed var(--line);background:none;color:var(--brand);border-radius:16px;padding:3px 11px;font-size:12px;font-weight:600;cursor:pointer}
        .chip-add:hover{border-color:var(--brand);background:var(--brand-soft)}

        .tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 14px}
        .tabs.sm{padding:0 12px}
        .tab{border:0;background:none;padding:11px 13px;font:inherit;font-size:13px;font-weight:650;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
        .tab:hover{color:var(--ink)}
        .tab.on{color:var(--brand);border-bottom-color:var(--brand)}
        .cz-body{overflow:visible}
        
        /* El buscador va alineado con la columna Producto, arriba de las líneas:
           lo que se elige completa directamente ese renglón. */
        .srow{display:grid;grid-template-columns:62px minmax(0,1.5fr) 122px 104px 96px 106px 50px;gap:8px;align-items:center;padding:9px 0 4px}
        .bwrap{position:relative}
        .srow .busca{width:100%;padding:7px 10px;font-size:13px}
        .lnk{border:0;background:none;color:var(--brand);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:0;justify-self:start}
        .lnk:hover{text-decoration:underline}
        .pr-pie{display:flex;justify-content:flex-end;padding:11px 0 0;border-top:1px solid var(--line)}
        .drop{position:absolute;left:0;width:340px;top:100%;z-index:30;background:var(--panel);border:1px solid var(--brand);border-radius:11px;box-shadow:var(--shadow);overflow:hidden;max-height:320px;overflow-y:auto}
        .drop .it{display:flex;align-items:center;gap:8px;padding:9px 13px;cursor:pointer;border-bottom:1px solid var(--line-soft)}
        .drop .it:last-child{border-bottom:0} .drop .it:hover{background:var(--brand-soft)} .drop .it .cnt{color:var(--muted);font-size:12px}

        /* Cantidad adelante · los dos precios juntos al final. */
        .lhead,.lrow{display:grid;grid-template-columns:62px minmax(0,1.5fr) 122px 104px 96px 106px 50px;gap:8px;align-items:center;padding:0}
        .lcant{display:flex;align-items:center}
        .cantv{border:1px solid transparent;background:none;font:inherit;font-size:14px;font-weight:650;color:var(--navy);
          cursor:pointer;padding:4px 10px;border-radius:7px;min-width:42px;text-align:center}
        .cantv:hover{border-color:var(--line);background:var(--panel)}
        .cante{width:56px;text-align:center;padding:4px 6px;font-size:14px;font-weight:650}
        .cantn{width:100%;text-align:center;padding:7px 6px;font-size:14px;font-weight:650;color:var(--navy)}
        .lrow .dto{text-align:right;font-size:12.5px;color:var(--ok)}
        .litem{border-bottom:1px solid var(--line-soft)}
        .litem.abierta{background:var(--panel-2);border-radius:8px;padding:0 8px;margin:2px -8px;border:1px solid var(--brand)}
        .lacc{display:flex;align-items:center;gap:2px;justify-content:flex-end}
        .cantf{font-size:14px;font-weight:650;color:var(--navy);padding:4px 10px;min-width:42px;text-align:center;display:inline-block}
        .tipo.fijo{display:inline-block;cursor:default;background:none;border-color:transparent;color:var(--muted);text-align:center}
        .tipo.fijo.med{color:var(--warn);border-color:var(--warn);background:var(--warn-bg)}
        .lobs.leido{gap:9px;flex-direction:row;align-items:flex-start;padding-bottom:9px}
        .lobs.leido .obst{font-size:12.5px;color:var(--ink-soft);line-height:1.45;flex:1}
        /* Observaciones: sólo en los a medida y ABAJO del renglón, con lugar
           para escribir y para adjuntar la foto del diseño que pidió el cliente. */
        .lobs{padding:0 0 11px 70px;display:flex;flex-direction:column;gap:7px}
        .adef{text-align:right;font-size:12.5px;font-weight:700;color:var(--warn)}
        .lmed{display:flex;align-items:flex-end;gap:11px;flex-wrap:wrap}
        .lmed label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--ink-soft)}
        .lmed label.ancho{flex:1;min-width:180px}
        .lmed input{width:190px;padding:6px 9px;font-size:13px}
        .lmed label.ancho input{width:100%}
        .ltipo{display:flex;align-items:center;gap:4px}
        .cam.mini{padding:3px 6px;font-size:13px;border-radius:6px}
        .sube{border-color:var(--warn)}
        .lobs textarea{width:100%;padding:7px 9px;font:inherit;font-size:12.5px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);resize:vertical}
        .lobs-f{display:flex;align-items:center;gap:10px}
        .cam{border:1px dashed var(--line);background:var(--panel);color:var(--ink-soft);border-radius:8px;padding:5px 11px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
        .cam:hover{border-color:var(--brand);color:var(--brand)}
        .adj{display:inline-block;border:1px dashed var(--line);border-radius:9px;padding:9px 14px;font-size:13px;font-weight:600;color:var(--brand);cursor:pointer}
        .adj:hover{border-color:var(--brand);background:var(--brand-soft)}
        #im-prev{margin-top:12px}
        #im-prev img{max-width:100%;max-height:190px;border-radius:9px;border:1px solid var(--line);display:block}
        #im-prev .muted{font-size:12px;margin-top:5px}
        .lobs-img{width:44px;height:44px;object-fit:cover;border-radius:7px;border:1px solid var(--line)}
        @media(max-width:640px){.lobs{padding-left:0}}
        .lhead{padding-top:9px;padding-bottom:9px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
        .lrow{padding-top:7px;padding-bottom:7px}
        .lrow .n{font-weight:650;color:var(--navy);line-height:1.2;font-size:13.5px}
        .lrow .v{font-size:11.5px;color:var(--muted);line-height:1.35}
        .lrow input{padding:6px 8px;font-size:13px} .lrow .pnum,.lrow .sub{text-align:right}
        .lrow .sub{font-weight:700;color:var(--navy)}
        .lrow .lock{color:var(--muted);font-size:12.5px;text-align:right}
        .thumb{width:34px;height:34px;flex:none;border:1px dashed var(--line);border-radius:8px;background:var(--panel-2);cursor:pointer;padding:0;overflow:hidden;color:var(--muted);font-size:16px}
        .thumb:hover{border-color:var(--brand);color:var(--brand)}
        .thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .tipo{border:1px solid var(--line);background:var(--panel-2);color:var(--ink-soft);border-radius:6px;padding:4px 8px;font-size:11.5px;font-weight:700;cursor:pointer;flex:1;white-space:nowrap}
        .tipo:hover{border-color:var(--brand);color:var(--brand)}
        .tipo.med{border-color:var(--warn);color:var(--warn);background:var(--warn-bg)}
        .lx{color:var(--muted);cursor:pointer;font-size:15px;border:0;background:transparent;padding:3px}
        @media(max-width:1000px){.lhead{display:none}.lrow{grid-template-columns:62px 1fr 1fr;gap:8px}.lrow .sub,.lrow .lock,.lrow .pnum{text-align:left}}

        .cz-foot{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px 30px;padding:16px}
        @media(max-width:820px){.cz-foot{grid-template-columns:1fr}}
        .cz-tyc .lbl{font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
        .cz-tyc .lbl .muted{font-size:11.5px}
        .int-box{margin-top:11px;background:var(--line-soft);border:1px solid var(--line);border-radius:9px;padding:9px 11px}
        .int-box textarea{background:var(--panel)}
        .tag{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:4px;padding:1px 6px}
        .tag.ext{background:var(--brand-soft);color:var(--brand)}
        .tag.int{background:var(--line-soft);color:var(--ink-soft)}
        .lnk.mod{flex:none;font-size:12px}
        .valf{flex:1;min-width:0;font-size:13px;color:var(--ink);padding:6px 0}
        .lapiz{flex:none;border:0;background:none;cursor:pointer;font-size:13px;line-height:1;padding:5px 7px;border-radius:6px;color:var(--muted)}
        .lapiz:hover{background:var(--line-soft)}
        .lapiz.cal{font-size:15px}
        .lapiz.cal.tocado{background:var(--warn-bg);border:1px solid var(--warn);border-radius:7px}
        .cal-box{border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin:2px 0 4px;background:var(--panel);max-width:330px}
        .cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .cal-h b{font-size:13.5px;color:var(--navy);letter-spacing:.04em}
        .cal-nav{border:0;background:none;font-size:19px;color:var(--ink-soft);cursor:pointer;padding:2px 9px;border-radius:7px;line-height:1}
        .cal-nav:hover{background:var(--line-soft)}
        .cal-dow,.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .cal-dow{margin-bottom:4px}
        .cal-dow span{text-align:center;font-size:10.5px;font-weight:700;color:var(--muted);letter-spacing:.04em}
        .cd{border:0;background:none;font:inherit;font-size:13px;color:var(--ink);cursor:pointer;
          height:34px;border-radius:9px;display:grid;place-items:center}
        .cd:not(:disabled):not(.ini):not(.fin):not(.medio):hover{background:var(--line-soft)}
        .cd:disabled{color:var(--line);cursor:default}
        .cd.medio{background:var(--brand-soft);border-radius:0;color:var(--brand);font-weight:600}
        .cd.ini,.cd.fin{background:var(--brand);color:#fff;font-weight:800}
        .cd.ini{border-radius:9px 0 0 9px}
        .cd.fin{border-radius:0 9px 9px 0}
        .cd.ini.fin{border-radius:9px}
        .cal-pie{display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);margin-top:10px;padding-top:10px;font-size:12px}
        .rango{gap:7px}
        .rango input{flex:1;min-width:0}
        .rango .ent{flex:none;font-size:12.5px;color:var(--muted)}
        .locw{position:relative}
        .locw .drop{width:100%;min-width:250px}
        .bwrap .drop{margin-top:4px}
        .drop .it.nueva{color:var(--brand);font-weight:600}
        .tyc-fijo{font-size:12.5px;color:var(--ink-soft);line-height:1.55}
        .cz-tyc textarea,.cz-foot textarea{width:100%;padding:8px 10px;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);resize:vertical}
        .cz-tots .tr{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:13px;color:var(--ink-soft)}
        .cz-tots .tr b{color:var(--navy)}
        .cz-tots .neg b{color:var(--ok)}
        .cz-tots .big{border-top:1px solid var(--line);margin-top:5px;padding-top:9px;font-size:15px;font-weight:700;color:var(--navy)}
        .cz-tots .big b{font-size:19px}
        .cz-tots .tiva{font-size:11.5px;color:var(--muted);margin-top:7px}
        .tdto{display:flex;justify-content:space-between;align-items:center;gap:12px;width:calc(100% + 20px);margin:4px -10px;
          border:1px dashed var(--line);background:var(--line-soft);border-radius:8px;padding:5px 10px;
          font:inherit;font-size:13px;color:var(--ink-soft);cursor:pointer;text-align:left}
        .tdto:hover{border-color:var(--brand);color:var(--brand)}
        .tdto b{color:var(--brand)}
        .tdto.on{border-style:solid;border-color:var(--ok)}
        .tdto.on b{color:var(--ok)}
        .tdto small{display:block;font-size:11px;color:var(--muted);font-weight:400}

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

        .vgrp{margin-bottom:11px}
        .vlbl{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:5px}
        .vopts{display:flex;gap:6px;flex-wrap:wrap}
        .vopt{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:7px;padding:5px 11px;font-size:12.5px;font-weight:600;cursor:pointer}
        .vcant{display:inline-flex;align-items:center;gap:6px}
        .vpm{width:28px;height:28px;flex:none;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:7px;font-size:15px;font-weight:700;cursor:pointer;line-height:1}
        .vpm:hover:not(:disabled){border-color:var(--brand);color:var(--brand)}
        .vpm:disabled{opacity:.4;cursor:default}
        .vcant input{width:58px;text-align:center;padding:4px 6px;font-size:13px}
        .vopt:hover{border-color:var(--brand);color:var(--brand)}
        .vopt.on{border-color:var(--brand);background:var(--brand);color:#fff}
        .vopt.on.med{border-color:var(--warn);background:var(--warn)}
        .vpre{display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);padding-top:12px;margin-top:6px}
        .ddrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}

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
  function sinTilde(s) {
    return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function inic(nombre) {
    return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
  }
  function hora() {
    try { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
    catch { return ''; }
  }
  // Fecha ISO a N días de hoy, y los helpers para mostrarla.
  function enDias(n) {
    try { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); } catch { return ''; }
  }
  function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fechaCorta(s) {
    const p = String(s || '').split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : String(s || '');
  }
  function diasHasta(s) {
    try {
      const [y, m, d] = String(s).split('-').map(Number);
      const a = new Date(); a.setHours(0, 0, 0, 0);
      return Math.max(0, Math.round((new Date(y, m - 1, d) - a) / 86400000));
    } catch { return 0; }
  }
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fechaLarga(s) {
    const p = String(s || '').split('-');
    return p.length === 3 ? `${Number(p[2])} de ${MESES[Number(p[1]) - 1] || ''}` : String(s || '');
  }
  function mesDe(iso) { return String(iso || '').slice(0, 7) || iso; }
  function correrMes(mesISO, n) {
    const [y, m] = String(mesISO).split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function sumarDias(fecha, n) {
    try {
      const [y, m, d] = String(fecha).split('-').map(Number);
      const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return iso(x);
    } catch { return fecha; }
  }

  function hoy() {
    try { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    catch { return ''; }
  }

  global.Presupuesto = Presupuesto;
})(typeof window !== 'undefined' ? window : globalThis);
