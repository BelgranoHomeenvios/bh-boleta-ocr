// =====================================================================
//  Belgrano Soft · capa de datos
//  Una sola puerta a Supabase. Si no hay conexión configurada, la app
//  igual arranca en modo DEMO con unos productos de ejemplo, así se puede
//  ver la interfaz antes de conectar la base.
// =====================================================================
(function (global) {
  const CFG_KEY = 'bh_supabase_cfg';

  // La URL del proyecto Belgrano Soft ya la sabemos; la anon key es pública
  // (va en el frontend) pero la carga la persona la primera vez, para no
  // dejarla escrita en el repo.
  const DEFAULT_URL = 'https://qwbdhpevgirsmfxqlgtg.supabase.co';

  // Saca tildes y pasa a minúscula: "CÓMODA" → "comoda". Así la búsqueda
  // reconoce todo aunque la persona no ponga el acento.
  function sinTilde(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function cfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; }
    catch { return {}; }
  }
  function guardarCfg(url, key) {
    localStorage.setItem(CFG_KEY, JSON.stringify({ url: url || DEFAULT_URL, key }));
  }
  function hayConexion() { return !!cfg().key && !!global.supabase; }

  let _cli = null;
  function cliente() {
    if (_cli) return _cli;
    const c = cfg();
    if (!c.key || !global.supabase) return null;
    // El catálogo vive en el esquema core.
    _cli = global.supabase.createClient(c.url || DEFAULT_URL, c.key, {
      db: { schema: 'core' },
    });
    return _cli;
  }

  // Genera el combinatorio de variantes de un mueble (medida × estructura ×
  // frente) con un precio que crece con la medida. Es sólo para el demo: en
  // producción cada variante viene de la tabla `variante` con su precio real.
  // Se usa para que el armador por botones tenga con qué jugar (un mueble
  // puede tener 15+ variantes y no se muestran todos los precios juntos).
  let _vid = 100;
  function combinar(productoId, medidas, estructuras, frentes, base, paso) {
    const out = [];
    medidas.forEach((medida, i) => estructuras.forEach(estructura => frentes.forEach(frente => {
      out.push({
        id: ++_vid, producto_id: productoId, medida, estructura, frente,
        precio: base + paso * i, atributos: { medida, estructura, frente },
      });
    })));
    return out;
  }

  // ---- Modo demo: árbol + productos para ver la UI sin conexión --------
  const DEMO = {
    categorias: [
      { id: 1, nombre: 'DORMITORIO', padre_id: null, nivel: 2 },
      { id: 2, nombre: 'CÓMODAS',    padre_id: 1,    nivel: 3 },
      { id: 3, nombre: 'PLACARD',    padre_id: 1,    nivel: 3 },
      { id: 4, nombre: 'LIVING',     padre_id: null, nivel: 2 },
      { id: 5, nombre: 'MESAS RATONAS', padre_id: 4, nivel: 3 },
    ],
    productos: [
      { id: 1, categoria_id: 2, nombre: 'CÓMODA AMBERES 55', publicado_tn: true },
      { id: 4, categoria_id: 2, nombre: 'CÓMODA OLIVER 60', publicado_tn: true },
      { id: 5, categoria_id: 2, nombre: 'CÓMODA NÓRDICA 90', publicado_tn: false },
      { id: 2, categoria_id: 3, nombre: 'PLACARD OLIVER', publicado_tn: true },
      { id: 3, categoria_id: 5, nombre: 'MESA RATONA NORUEGA', publicado_tn: false },
    ],
    variantes: [
      ...combinar(1, ['1.00', '1.20', '1.40', '1.60'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 385000, 42000),
      ...combinar(4, ['1.20', '1.60'], ['Blanca', 'Negra'], ['Paraíso', 'Nogal'], 410000, 55000),
      ...combinar(5, ['0.90'], ['Natural'], ['Paraíso'], 352000, 0),
      ...combinar(2, ['1.80', '2.00', '2.20'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 860000, 90000),
      ...combinar(3, ['0.80x0.50', '1.00x0.60'], ['Paraíso'], ['Negro', 'Natural'], 720000, 148000),
    ],
    // Órdenes de venta de ejemplo (para ver la vista antes de conectar).
    // saldo = total - sena. sena = suma de señas/cobros CONFIRMADOS hasta hoy.
    // situacion = estado operativo semántico (ver SITUACION_ORDEN).
    // cobros[]: cada seña con su método y estado de verificación:
    //   metodo 'efectivo'  → estado 'rendido'  (basta con rendirlo a un autorizado).
    //   metodo 'transferencia' → 'pendiente_banco' hasta que Administración/Dirección
    //     lo acredita en el banco (cuit + comprobante + monto) → 'confirmado'.
    // Nuevos campos por orden:
    //  lineas[]  : muebles {producto, cantidad, precio, tipo estandar|medida, img, bloqueo}
    //  reclamo   : marca que CONVIVE con el estado del ciclo (listo+reclamo, entregado+reclamo)
    //  factura   : 'no' | 'solicitada' | 'hecha'
    //  recordatorios[] : {f, texto}
    //  comentarios[]   : {area, texto, f}   (historial por área)
    //  archivos[]      : {nombre, tipo, area}  (se guardan en el "cajón" de Contabilidad)
    ordenes: [
      { id: 1, numero: 'S00021', fecha: '29/07', cliente: 'Laura Pérez',    vendedor: 'Ale',      local: '2020', pago: 'Efectivo',      items: 3, total: 1200000, sena: 360000, saldo: 840000, entrega: '15/08', estado: 'a_confirmar',     situacion: 'a_confirmar', reclamo: false, factura: 'solicitada',
        flete: { monto: 45000, detalle: 'Envío CABA' }, instalacion: { monto: 0 },
        lineas: [
          { id: 'L1', producto: 'Cómoda Amberes 1.20', variante: 'Paraíso / Blanco', cantidad: 1, precio: 406250, tipo: 'estandar', img: null },
          { id: 'L2', producto: 'Mesa Noruega',        variante: 'Nogal',           cantidad: 1, precio: 500000, tipo: 'estandar', img: null },
          { id: 'L3', producto: 'Respaldo Milán a medida', variante: 'Boucle Beige', cantidad: 1, precio: 293750, tipo: 'medida', img: null, bloqueo: 'precio' }],
        recordatorios: [{ f: '05/08', texto: 'Llamar para coordinar entrega' }],
        comentarios: [{ area: 'Ventas', texto: 'Cliente pidió llamar antes de entregar', f: '29/07' }],
        archivos: [{ nombre: 'Plano Respaldo Milán.pdf', tipo: 'plano', area: 'Producción' }],
        cobros: [{ id: 'c1', f: '29/07', m: 360000, metodo: 'efectivo', recibidoPor: 'Caja Belgrano 2020', estado: 'rendido' }] },
      { id: 2, numero: 'S00020', fecha: '29/07', cliente: 'Juan López',     vendedor: 'Cristian', local: '2299', pago: 'Transferencia', items: 1, total: 700000,  sena: 0,      saldo: 700000, entrega: null,    estado: 'preproduccion',   situacion: 'con_frenos',  reclamo: false, factura: 'no',
        lineas: [{ id: 'L1', producto: 'Vajillero Nórdico', cantidad: 1, precio: 700000, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [{ area: 'Tesorería', texto: 'Cliente dice que transfirió — sin acreditar en el banco', f: '29/07' }], archivos: [],
        cobros: [{ id: 'c2', f: '29/07', m: 700000, metodo: 'transferencia', recibidoPor: 'Cuenta Cristian', depositante: 'Juan López', referencia: 'Mercado Pago', estado: 'pendiente_banco' }] },
      { id: 3, numero: 'S00019', fecha: '28/07', cliente: 'Bibiana',        vendedor: 'Ale',      local: '2020', pago: 'Tarjeta',       items: 2, total: 516000,  sena: 516000, saldo: 0,      entrega: '05/08', estado: 'listo',           situacion: 'lista',       reclamo: true,  factura: 'no',
        lineas: [{ id: 'L1', producto: 'Mesa de Luz Estocolmo', cantidad: 2, precio: 258000, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [{ area: 'Reclamos', texto: 'Vino con una veta distinta a la del showroom', f: '28/07' }], archivos: [],
        cobros: [{ id: 'c3', f: '28/07', m: 516000, metodo: 'efectivo', recibidoPor: 'Caja Belgrano 2020', estado: 'rendido' }] },
      { id: 4, numero: 'S00018', fecha: '28/07', cliente: 'Laura y Hernán', vendedor: 'Cristian', local: '2299', pago: 'Mixto',         items: 2, total: 731250,  sena: 481250, saldo: 250000, entrega: '02/08', estado: 'logistica',       situacion: 'en_logistica', reclamo: false, factura: 'no',
        flete: { monto: 60000, detalle: 'Subida x escalera · 2 pisos', escalera: true }, instalacion: { monto: 35000, detalle: 'Armado en domicilio' },
        lineas: [
          { id: 'L1', producto: 'Aparador Amberes',   variante: 'Roble / Negro', cantidad: 1, precio: 481250, tipo: 'estandar', img: null },
          { id: 'L2', producto: 'Mesa ratona Foster',  variante: 'Nogal',        cantidad: 1, precio: 250000, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [{ area: 'Logística', texto: 'Entra por el fondo', f: '28/07' }, { area: 'Ventas', texto: 'Falta el saldo contra entrega', f: '28/07' }], archivos: [],
        cobros: [
          { id: 'c4', f: '20/07', m: 300000, metodo: 'transferencia', recibidoPor: 'Cuenta Cristian', depositante: 'Hernán Suárez', cuit: '20-30111222-3', comprobante: 'BROU-884512', montoConfirmado: 300000, confirmadoPor: 'Administración', estado: 'confirmado' },
          { id: 'c5', f: '28/07', m: 181250, metodo: 'efectivo', recibidoPor: 'Caja Verano 2299', estado: 'rendido' }] },
      { id: 5, numero: 'S00017', fecha: '27/07', cliente: 'Abigail Galfre', vendedor: 'Brian',    local: '2020', pago: 'Efectivo',      items: 1, total: 968000,  sena: 968000, saldo: 0,      entrega: '26/07', estado: 'entregado',       situacion: 'entregada',   reclamo: true,  factura: 'hecha',
        lineas: [{ id: 'L1', producto: 'Biblioteca Borges 1.20', cantidad: 1, precio: 968000, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [{ area: 'Reclamos', texto: 'Golpe en el lateral, reclamo abierto post-entrega', f: '28/07' }], archivos: [{ nombre: 'Factura A-0001-00002.pdf', tipo: 'factura', area: 'Contabilidad' }],
        cobros: [{ id: 'c6', f: '27/07', m: 968000, metodo: 'efectivo', recibidoPor: 'Dirección', estado: 'rendido' }] },
      { id: 6, numero: 'S00016', fecha: '27/07', cliente: 'Diego',          vendedor: 'Sergio',   local: '2299', pago: 'Transferencia', items: 1, total: 733000,  sena: 0,      saldo: 733000, entrega: '10/08', estado: 'falta_tesoreria', situacion: 'impacto',     reclamo: false, factura: 'solicitada',
        lineas: [{ id: 'L1', producto: 'Placard Oliver a medida', cantidad: 1, precio: 733000, tipo: 'medida', img: null, bloqueo: 'precio' }],
        recordatorios: [], comentarios: [{ area: 'Tesorería', texto: 'El cliente mandó 2 comprobantes por el mismo pago', f: '27/07' }], archivos: [{ nombre: 'Plano Placard Oliver.pdf', tipo: 'plano', area: 'Producción' }],
        cobros: [{ id: 'c7', f: '27/07', m: 733000, metodo: 'transferencia', recibidoPor: 'Cuenta Sergio', depositante: 'Diego Fernández', referencia: 'Transferencia inmediata', estado: 'pendiente_banco' }] },
      { id: 8, numero: 'S00014', fecha: '25/07', cliente: 'Marta Gómez',    vendedor: 'Nati',     local: '2020', pago: 'Transferencia', items: 1, total: 640000,  sena: 200000, saldo: 440000, entrega: '18/08', estado: 'preproduccion',   situacion: 'con_frenos',  reclamo: false, factura: 'no',
        lineas: [{ id: 'L1', producto: 'Ropero Escandinavo a medida', cantidad: 1, precio: 640000, tipo: 'medida', img: null }],
        recordatorios: [], comentarios: [{ area: 'Producción', texto: 'Falta confirmar color de frente antes de cortar', f: '25/07' }], archivos: [],
        cobros: [{ id: 'c8', f: '25/07', m: 200000, metodo: 'transferencia', recibidoPor: 'Cuenta Nati', depositante: 'Marta Gómez', cuit: '27-28999111-4', comprobante: 'GAL-771201', montoConfirmado: 200000, confirmadoPor: 'Administración', estado: 'confirmado' }] },
      { id: 7, numero: 'S00015', fecha: '26/07', cliente: 'Camila',         vendedor: 'Nati',     local: '2020', pago: 'Tarjeta',       items: 1, total: 425750,  sena: 0,      saldo: 0,      entrega: null,    estado: 'anulado',         situacion: 'anulada',     reclamo: false, factura: 'no',
        lineas: [{ id: 'L1', producto: 'Silla Meier', cantidad: 1, precio: 425750, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [{ area: 'Ventas', texto: 'Anulada: el cliente se arrepintió', f: '26/07' }], archivos: [], cobros: [] },
      { id: 9, numero: 'S00013', fecha: '10/07', cliente: 'Roberto López',  vendedor: 'Ale',      local: '2299', pago: 'Efectivo',      items: 2, total: 300000,  sena: 300000, saldo: 0,      entrega: '12/07', estado: 'archivado',       situacion: 'entregada',   reclamo: false, factura: 'hecha',
        lineas: [{ id: 'L1', producto: 'Banqueta Nórdica', cantidad: 2, precio: 150000, tipo: 'estandar', img: null }],
        recordatorios: [], comentarios: [], archivos: [{ nombre: 'Factura A-0001-00001.pdf', tipo: 'factura', area: 'Contabilidad' }],
        cobros: [{ id: 'c9', f: '10/07', m: 300000, metodo: 'efectivo', recibidoPor: 'Caja Verano 2299', estado: 'rendido' }] },
    ],
    // Cotizaciones de ejemplo.
    cotizaciones: [
      { id: 10, numero: 'C-4142', fecha: '2026-07-28', cliente: 'Paloma',          vendedor: 'Ale',      local: '2020', total: 490000, estado: 'borrador' },
      { id: 11, numero: 'C-4141', fecha: '2026-07-27', cliente: 'Camila',          vendedor: 'Ale',      local: '2299', total: 425750, estado: 'aceptada' },
      { id: 12, numero: 'C-4140', fecha: '2026-07-25', cliente: 'Jona',            vendedor: 'Nati',     local: '2020', total: 633700, estado: 'rechazada' },
    ],
    // Clientes de ejemplo (una fila por teléfono, como el CRM).
    clientes: [
      { id: 1, nombre: 'Bibiana',        telefono: '1161636645',    vendedor: 'Ale',      consultas: 2, concret: 2, seguim: 0, comprado: 1691700, ultima: 'Ayer' },
      { id: 2, nombre: 'Victoria',       telefono: '5491168145568', vendedor: 'Ale',      consultas: 1, concret: 1, seguim: 0, comprado: 1520000, ultima: 'Hace 6 días' },
      { id: 3, nombre: 'Liliana y Javier', telefono: '1151099144',  vendedor: 'Cristian', consultas: 1, concret: 1, seguim: 0, comprado: 1335750, ultima: 'Hace 2 días' },
      { id: 4, nombre: 'Diego',          telefono: '5491131554640', vendedor: 'Cristian', consultas: 1, concret: 1, seguim: 0, comprado: 733000,  ultima: 'Hace 9 días' },
      { id: 5, nombre: 'Paloma',         telefono: '5491141715700', vendedor: 'Ale',      consultas: 1, concret: 0, seguim: 1, comprado: 0,       ultima: 'Hoy' },
    ],
  };

  // Estados de la orden → etiqueta y color del pill (según el ciclo real).
  const ESTADO_ORDEN = {
    a_confirmar:     { label: 'A confirmar',            pill: 'warn' },
    confirmar:       { label: 'A confirmar',            pill: 'warn' },
    falta_tesoreria: { label: 'Falta firmar (Tesorería)', pill: 'warn' },
    preproduccion:   { label: 'Preproducción',          pill: 'info' },
    fabricacion:     { label: 'En fabricación',         pill: 'info' },
    produccion:      { label: 'En fabricación',         pill: 'info' },
    listo:           { label: 'Listo',                  pill: 'ok' },
    logistica:       { label: 'En logística',           pill: 'info' },
    entregado:       { label: 'Entregado',              pill: 'ok' },
    archivado:       { label: 'Archivado',              pill: 'soft' },
    anulado:         { label: 'Anulado',                pill: 'crit' },
    reclamo:         { label: 'Reclamo',                pill: 'crit' },
  };
  // Grupos para los filtros de la tabla de boletas. 'activas' = con las que se
  // trabaja habitualmente. 'reclamo' es especial (marca que convive, no estado).
  const GRUPO_ESTADO = {
    activas: ['a_confirmar', 'confirmar', 'falta_tesoreria', 'preproduccion', 'fabricacion', 'produccion', 'listo', 'logistica'],
    a_confirmar: ['a_confirmar', 'confirmar', 'falta_tesoreria'],
    preproduccion: ['preproduccion'],
    fabricacion: ['fabricacion', 'produccion'],
    listo: ['listo'],
    logistica: ['logistica'],
    entregado: ['entregado'],
    archivado: ['archivado'],
  };
  const ESTADO_COTIZ = {
    borrador:  { label: 'Borrador',  pill: 'soft' },
    aceptada:  { label: 'Aceptada',  pill: 'ok' },
    rechazada: { label: 'Rechazada', pill: 'crit' },
    vencida:   { label: 'Vencida',   pill: 'warn' },
  };

  // Situación operativa de la orden: estado semántico que resume "qué le pasa"
  // a la orden hoy, con un ícono de alarma y a qué balde de trabajo cae.
  // bucket → tarjetas de arriba en Órdenes de venta.
  const SITUACION_ORDEN = {
    a_confirmar:  { label: 'A confirmar',                    pill: 'warn', icon: '🧾', dot: 'warn', bucket: 'a_confirmar', activa: true },
    impacto:      { label: 'Impacto detectado',              pill: 'crit', icon: '🚨', dot: 'crit', bucket: 'decision',    activa: true },
    con_frenos:   { label: 'Confirmada, con líneas frenadas', pill: 'info', icon: '⏳', dot: 'warn', bucket: 'frenadas',   activa: true },
    en_marcha:    { label: 'Confirmada y en marcha',         pill: 'ok',   icon: '✅', dot: 'ok',   bucket: 'en_marcha',   activa: true },
    lista:        { label: 'Lista para entregar',            pill: 'ok',   icon: '📦', dot: 'ok',   bucket: 'en_marcha',   activa: true },
    en_logistica: { label: 'En logística',                   pill: 'info', icon: '🚚', dot: 'info', bucket: 'en_marcha',   activa: true },
    entregada:    { label: 'Entregada',                      pill: 'ok',   icon: '✅', dot: 'ok',   bucket: 'cerradas',    activa: false },
    anulada:      { label: 'Anulada',                        pill: 'soft', icon: '🚫', dot: 'soft', bucket: 'cerradas',    activa: false },
  };
  // Baldes de las tarjetas superiores (en orden de aparición).
  const BUCKETS_ORDEN = [
    { k: '',           label: 'Todas las órdenes',       dot: 'info', hint: 'activas' },
    { k: 'decision',   label: 'Necesitan tu decisión',   dot: 'crit' },
    { k: 'frenadas',   label: 'Frenadas esperando a alguien', dot: 'warn' },
    { k: 'a_confirmar', label: 'A confirmar',            dot: 'warn' },
    { k: 'en_marcha',  label: 'En marcha',               dot: 'ok' },
  ];

  // Quién está autorizado a recibir plata (rendición de efectivo / cuentas).
  const AUTORIZADOS_COBRO = ['Caja Belgrano 2020', 'Caja Verano 2299', 'Administración', 'Dirección',
    'Cuenta Ale', 'Cuenta Cristian', 'Cuenta Sergio', 'Cuenta Nati'];

  // Estado de verificación de un cobro → etiqueta/ícono para el "tilde" de seña.
  const ESTADO_COBRO = {
    rendido:         { label: 'Rendido',              pill: 'ok',   icon: '✔' },
    pendiente_banco: { label: 'Sin acreditar (banco)', pill: 'warn', icon: '⏳' },
    confirmado:      { label: 'Acreditado en banco',  pill: 'ok',   icon: '✅' },
  };

  // Serie de órdenes creadas en la sesión (demo). Arranca donde termina la muestra.
  let _seqOrden = 5;

  // ---- API que usan los módulos ---------------------------------------
  const DB = {
    modo() { return hayConexion() ? 'supabase' : 'demo'; },
    DEFAULT_URL, cfg, guardarCfg, hayConexion,

    // El árbol de categorías (ambiente → tipo de mueble).
    async arbolCategorias() {
      if (!hayConexion()) return DEMO.categorias;
      const { data, error } = await cliente().from('categoria')
        .select('id,nombre,padre_id,nivel').eq('activa', true).order('nombre');
      if (error) throw error;
      return data || [];
    },

    // Productos: por categoría (tipo de mueble) o por texto libre.
    async productos({ texto = '', categoriaId = null, limite = 200 } = {}) {
      if (!hayConexion()) {
        const t = sinTilde(texto);
        let ps = DEMO.productos.filter(p =>
          (!t || sinTilde(p.nombre).includes(t)) &&
          (categoriaId == null || p.categoria_id === categoriaId));
        return ps.map(p => ({ ...p, variantes: DEMO.variantes.filter(v => v.producto_id === p.id).length }));
      }
      let q = cliente().from('producto')
        .select('id,categoria_id,nombre,publicado_tn,variante(count)')
        .eq('activo', true).order('nombre').limit(limite);
      // Búsqueda sin tildes: se compara contra nombre_norm (columna generada,
      // ver migración busqueda_sin_tilde.sql). Así "comoda" encuentra "CÓMODA".
      if (texto) q = q.ilike('nombre_norm', `%${sinTilde(texto)}%`);
      if (categoriaId != null) q = q.eq('categoria_id', categoriaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(p => ({ ...p, variantes: p.variante?.[0]?.count ?? 0 }));
    },

    async variantes(productoId) {
      if (!hayConexion()) return DEMO.variantes.filter(v => v.producto_id === productoId);
      const { data, error } = await cliente().from('variante')
        .select('id,medida,estructura,frente,precio,atributos,sku,tn_variant_id')
        .eq('producto_id', productoId).eq('activo', true)
        .order('medida').order('estructura').order('frente');
      if (error) throw error;
      return data || [];
    },

    async totales() {
      if (!hayConexion()) return { productos: DEMO.productos.length, variantes: DEMO.variantes.length };
      const p = await cliente().from('producto').select('*', { count: 'exact', head: true }).eq('activo', true);
      const v = await cliente().from('variante').select('*', { count: 'exact', head: true }).eq('activo', true);
      return { productos: p.count ?? 0, variantes: v.count ?? 0 };
    },

    // ---- Ventas: órdenes, cotizaciones, clientes (demo por ahora) --------
    ESTADO_ORDEN, ESTADO_COTIZ, SITUACION_ORDEN, BUCKETS_ORDEN, ESTADO_COBRO,
    autorizadosCobro() { return AUTORIZADOS_COBRO.slice(); },

    // Órdenes de venta con situación operativa + conteo por balde (tarjetas).
    async ordenesVenta({ texto = '', bucket = '' } = {}) {
      const t = sinTilde(texto);
      const activas = DEMO.ordenes.filter(o => (SITUACION_ORDEN[o.situacion] || {}).activa);
      const conteos = { '': activas.length };
      BUCKETS_ORDEN.forEach(b => { if (b.k) conteos[b.k] = activas.filter(o => (SITUACION_ORDEN[o.situacion] || {}).bucket === b.k).length; });
      const filas = activas.filter(o =>
        (!t || sinTilde(o.cliente).includes(t) || sinTilde(o.numero).includes(t)) &&
        (!bucket || (SITUACION_ORDEN[o.situacion] || {}).bucket === bucket));
      return { conteos, filas };
    },
    _orden(id) { return DEMO.ordenes.find(o => String(o.id) === String(id)); },

    // Transferencias declaradas que todavía no se acreditaron en el banco.
    async transferenciasPendientes() {
      const out = [];
      DEMO.ordenes.forEach(o => (o.cobros || []).forEach(c => {
        if (c.estado === 'pendiente_banco') out.push({ orden: o, cobro: c });
      }));
      return out;
    },

    // Recalcula seña/saldo de una orden: SOLO cuenta lo cobrado de verdad
    // (efectivo rendido + transferencia acreditada en banco).
    _recalc(o) {
      o.sena = (o.cobros || []).filter(c => c.estado === 'rendido' || c.estado === 'confirmado')
        .reduce((a, c) => a + (c.metodo === 'transferencia' ? (c.montoConfirmado ?? c.m) : c.m), 0);
      o.saldo = Math.max(0, (o.total || 0) - o.sena);
      return o;
    },
    // Registra una seña. Efectivo → rendido (cobrado). Transferencia →
    // pendiente_banco hasta que se acredite. Devuelve el cobro creado.
    registrarSena(ordenId, { metodo, monto, recibidoPor, depositante = '', referencia = '', fecha = 'hoy' }) {
      const o = this._orden(ordenId); if (!o) throw new Error('Orden no encontrada');
      const c = { id: 'c' + Date.now().toString(36), f: fecha, m: Math.round(Number(monto) || 0), metodo, recibidoPor };
      if (metodo === 'transferencia') { c.depositante = depositante; c.referencia = referencia; c.estado = 'pendiente_banco'; }
      else { c.estado = 'rendido'; }
      (o.cobros = o.cobros || []).push(c);
      this._recalc(o);
      return c;
    },
    // ¿Ya existe ese Nº de comprobante en cualquier orden? (evita duplicar pagos).
    comprobanteExiste(nro, exceptId) {
      const n = String(nro || '').trim().toLowerCase(); if (!n) return false;
      return DEMO.ordenes.some(o => (o.cobros || []).some(c => c.id !== exceptId && String(c.comprobante || '').trim().toLowerCase() === n));
    },
    // Confirmación bancaria (Administración/Dirección): vincula el pago al banco
    // con CUIT + Nº de comprobante + monto acreditado. Rechaza comprobante repetido.
    confirmarSenaBanco(ordenId, cobroId, { cuit, comprobante, montoConfirmado, confirmadoPor }) {
      const o = this._orden(ordenId); if (!o) throw new Error('Orden no encontrada');
      const c = (o.cobros || []).find(x => x.id === cobroId); if (!c) throw new Error('Cobro no encontrado');
      if (this.comprobanteExiste(comprobante, cobroId)) throw new Error('Ese N° de comprobante ya está cargado en otra seña. No se duplica.');
      c.cuit = String(cuit || '').trim();
      c.comprobante = String(comprobante || '').trim();
      c.montoConfirmado = Math.round(Number(montoConfirmado) || 0);
      c.confirmadoPor = confirmadoPor || 'Administración';
      c.estado = 'confirmado';
      this._recalc(o);
      return c;
    },

    // ---- Adicionales de la cotización ----------------------------------
    // Localidad → costo de envío. Tabla DEMO: Brian pasa la lista real y se
    // reemplaza tal cual (misma forma {k, label, flete}).
    localidades() {
      return [
        { k: 'caba',      label: 'CABA',                 flete: 45000 },
        { k: 'gba_norte', label: 'GBA Norte',            flete: 62000 },
        { k: 'gba_oeste', label: 'GBA Oeste',            flete: 68000 },
        { k: 'gba_sur',   label: 'GBA Sur',              flete: 72000 },
        { k: 'laplata',   label: 'La Plata',             flete: 95000 },
        { k: 'interior',  label: 'Interior (a cotizar)', flete: 0 },
      ];
    },
    fleteDe(localidadK) {
      return (this.localidades().find(l => l.k === localidadK) || {}).flete || 0;
    },

    // Plazo de entrega estándar. Si el vendedor lo edita, la orden salta a
    // verificación (queda contabilizado el cambio de plazo).
    // Plazo estándar de fabricación, en días. La cotización muestra las fechas
    // que salen de acá ("entre 15/09 y el 20/09") con el plazo entre paréntesis.
    ENTREGA_DIAS: { min: 30, max: 35 },
    ENTREGA_DEFAULT: 'entre 30 y 35 días',
    // Cuando no hay domicilio cargado no se puede cotizar el envío.
    ENVIO_SIN_DOMICILIO: 'A confirmar posteriormente',
    INSTALACION_DEFAULT: 'A convenir posteriormente',
    TYC_DEFAULT: 'Antes de confirmar el pedido, verificá cuidadosamente las medidas, ' +
      'colores, terminaciones y productos cotizados. Una vez aprobada la orden e ' +
      'iniciada la fabricación, no podrán realizarse cambios ni reclamos por errores ' +
      'en la información aprobada.',
    // La subida por escalera NO se calcula: es muy variable. Va como leyenda.
    ESCALERA_DEFAULT: 5000,
    escaleraTexto(monto) {
      const m = '$' + (Number(monto) || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
      return `${m} por piso por bulto`;
    },
    IVA_LEYENDA: 'Los precios no incluyen IVA.',

    // Sesión del vendedor: el que vende entra con su usuario, así que el
    // vendedor y el local salen precargados (igual se pueden editar).
    // El local se elige al iniciar sesión — de ahí sale este default.
    sesion() { return { vendedor: 'Brian', local: '2020' }; },

    // ---- Condiciones de pago y sus descuentos ----------------------------
    // El cliente sólo ve el nombre ("Efectivo"). El descuento que lleva cada
    // condición es información interna y se administra en
    // Configuración → Reglas de precio, no acá.
    _COND: [
      { k: 'lista',         label: 'Tarjeta / Lista (3·6·12)', desc: 0 },
      { k: 'efectivo',      label: 'Efectivo',                 desc: 35 },
      { k: 'transferencia', label: 'Transferencia',            desc: 0 },
      { k: 'mixto',         label: 'Mixto',                    desc: 0, manual: true },
    ],
    condiciones() {
      try {
        const g = JSON.parse(localStorage.getItem('bh_cond') || 'null');
        if (g) return this._COND.map(c => ({ ...c, desc: g[c.k] != null ? g[c.k] : c.desc }));
      } catch (e) {}
      return this._COND.map(c => ({ ...c }));
    },
    condicion(k) { return this.condiciones().find(c => c.k === k) || this.condiciones()[0]; },
    // Descuento de la condición, en % (0-100).
    descuentoDe(k) { return Number(this.condicion(k).desc) || 0; },
    guardarCondiciones(mapa) {
      try { localStorage.setItem('bh_cond', JSON.stringify(mapa)); } catch (e) {}
    },

    // ---- Numeración de cotizaciones -------------------------------------
    // La cotización toma número apenas se abre, aunque todavía no se guarde,
    // así el vendedor ya la puede nombrar. Si al final no se usa, el número
    // vuelve al pozo y lo agarra la siguiente (no se queman números).
    _serieCot: 1842,
    _cotLibres: [],
    tomarNumeroCotizacion() {
      const n = this._cotLibres.length ? this._cotLibres.shift() : ++this._serieCot;
      return n;
    },
    liberarNumeroCotizacion(n) {
      if (n == null) return;
      const x = Number(n);
      if (!Number.isFinite(x) || this._cotLibres.includes(x)) return;
      this._cotLibres.push(x);
      this._cotLibres.sort((a, b) => a - b);   // se reutiliza el más bajo primero
    },
    numeroCotizacion(n) { return 'C-' + n; },

    // Ficha resumida + documentos relacionados del cliente, para el costado de
    // la cotización. Sale del CRM: acá va el demo hasta enganchar la tabla real.
    fichaCliente(ident) {
      const k = String(ident || '').trim().toLowerCase();
      if (!k) return null;
      const conocido = /laura/.test(k);
      return {
        recurrente: conocido,
        docs: conocido ? [
          { tipo: 'Última consulta',   ref: 'CONS-000123', f: '' },
          { tipo: 'Última cotización', ref: 'C-1842 v2',   f: '29/07/2026' },
          { tipo: 'Última orden',      ref: 'OV-2020-0041', f: '29/07/2026' },
        ] : [],
      };
    },

    // Listas de apoyo (demo).
    vendedores() { return ['Ale', 'Cristian', 'Sergio', 'Nati', 'Brian']; },
    locales() {
      return [
        { k: '2299', label: 'Verano 2299' },
        { k: '2020', label: 'Belgrano 2020' },
        { k: '699',  label: 'Zavaleta 699 (depósito)' },
      ];
    },

    // Crea una orden a partir de una cotización aceptada. Nace en "confirmar"
    // (a la espera de la seña). Numeración provisional: OV-<local>-<serie>.
    crearOrden(data) {
      _seqOrden += 1;
      const orden = {
        id: 1000 + _seqOrden,
        numero: `OV-${data.local}-${String(_seqOrden).padStart(4, '0')}`,
        fecha: data.fecha,
        cliente: data.cliente,
        vendedor: data.vendedor,
        local: data.local,
        total: data.total,
        estado: 'confirmar',
        lineas: data.lineas || [],
        termino: data.termino,
      };
      DEMO.ordenes.unshift(orden);
      return orden;
    },

    async ordenes({ texto = '' } = {}) {
      const t = sinTilde(texto);
      return DEMO.ordenes.filter(o => !t || sinTilde(o.cliente).includes(t) || sinTilde(o.numero).includes(t));
    },

    GRUPO_ESTADO,
    // Tabla de boletas con filtros (texto · grupo de estado · vendedor).
    async boletas({ texto = '', grupo = 'activas', vendedor = '' } = {}) {
      const t = sinTilde(texto);
      const enGrupo = o => {
        if (!grupo) return true;                       // 'Todas'
        if (grupo === 'reclamo') return !!o.reclamo;   // marca que convive
        return (GRUPO_ESTADO[grupo] || []).includes(o.estado);
      };
      return DEMO.ordenes.filter(o =>
        (!t || sinTilde(o.cliente).includes(t) || sinTilde(o.numero).includes(t)) &&
        enGrupo(o) &&
        (!vendedor || o.vendedor === vendedor));
    },
    // "Mis pendientes": consultas/decisiones de cualquier módulo hacia mí, en un
    // solo lugar. destino = a dónde me lleva "Resolver". urgente = pide decisión.
    async misPendientes() {
      return [
        { id: 'p1', modulo: 'Ventas',     tono: 'crit', urgente: true,  texto: 'Ale pide autorizar precio a medida en S00021',          quien: 'Ale',      desde: 'hace 2 días', destino: { modulo: 'ventas', sub: 'aconfirmar' } },
        { id: 'p2', modulo: 'Logística',  tono: 'crit', urgente: true,  texto: 'Entrega E-2381 sin chofer para hoy — ¿reprogramo?',      quien: 'Depósito', desde: 'hoy',         destino: { modulo: 'logistica', sub: 'agenda' } },
        { id: 'p3', modulo: 'Producción', tono: 'warn', urgente: false, texto: 'Iara pregunta si la Mesa Noruega (S00020) puede cambiar de veta', quien: 'Iara', desde: 'hace 2 h',    destino: { modulo: 'produccion', sub: 'resumen' } },
        { id: 'p4', modulo: 'Tesorería',  tono: 'warn', urgente: false, texto: 'Cristian dejó una seña sin rendir',                      quien: 'Cristian', desde: 'hace 3 días', destino: { modulo: 'tesoreria', sub: 'senas' } },
        { id: 'p5', modulo: 'Compras',    tono: 'info', urgente: false, texto: 'Proveedor Maderas del Sur subió el MDF 12% — ¿actualizo lista?', quien: 'Compras', desde: 'ayer',   destino: { modulo: 'compras', sub: 'comparador' } },
        { id: 'p6', modulo: 'Reclamos',   tono: 'warn', urgente: false, texto: 'Reclamo R-118: mesa con veta distinta a la del showroom',  quien: 'Nati',     desde: 'ayer',        destino: { modulo: 'reclamos', sub: 'abiertos' } },
      ];
    },
    // KPIs del tablero de ventas (demo).
    async estadisticasVentas() {
      const o = DEMO.ordenes;
      const activas = o.filter(x => !['entregado', 'archivado', 'anulado'].includes(x.estado));
      return {
        ventasHoy: 1256000, ventasMes: 28450000, objetivoMes: 35000000,
        cotizacionesAbiertas: DEMO.cotizaciones.filter(c => c.estado === 'borrador').length + 22,
        ordenesActivas: activas.length, aConfirmar: o.filter(x => (GRUPO_ESTADO.a_confirmar).includes(x.estado)).length,
        porCobrar: o.reduce((a, x) => a + (x.saldo || 0), 0),
        operaciones: o.filter(x => x.estado !== 'anulado').length, ticket: 978000,
        mueblesVendidos: o.reduce((a, x) => a + (x.items || 0), 0),
      };
    },
    async cotizaciones({ texto = '' } = {}) {
      const t = sinTilde(texto);
      return DEMO.cotizaciones.filter(c => !t || sinTilde(c.cliente).includes(t) || sinTilde(c.numero).includes(t));
    },
    async clientes({ texto = '' } = {}) {
      const t = sinTilde(texto);
      return DEMO.clientes.filter(c => !t || sinTilde(c.nombre).includes(t) || sinTilde(c.telefono).includes(t));
    },
    async cliente(id) {
      return DEMO.clientes.find(c => c.id === id) || null;
    },
  };

  global.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
