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
      { id: 11, producto_id: 1, medida: '1.20', estructura: 'blanca', frente: 'paraiso', precio: 425750, atributos: { medida: '1.20', estructura: 'blanca', frente: 'paraiso' } },
      { id: 12, producto_id: 1, medida: '1.20', estructura: 'negra',  frente: 'blanca',  precio: 406250, atributos: { medida: '1.20', estructura: 'negra', frente: 'blanca' } },
      { id: 13, producto_id: 2, medida: '2.00', estructura: 'blanca', frente: 'paraiso', precio: 900000, atributos: { medida: '2.00', estructura: 'blanca', frente: 'paraiso', espejo: '2 espejos' } },
      { id: 14, producto_id: 3, medida: '1.00', estructura: 'blanca', frente: null,      precio: 300000, atributos: { medida: '1.00', estructura: 'blanca' } },
    ],
    // Órdenes de venta de ejemplo (para ver la vista antes de conectar).
    ordenes: [
      { id: 2, numero: 'S00002', fecha: '2026-06-01', cliente: 'Abigail Galfre',   vendedor: 'Brian',    local: '2020', total: 968000,  estado: 'entregado' },
      { id: 1, numero: 'S00001', fecha: '2026-06-01', cliente: 'Abel Schoenmaker',  vendedor: 'Cristian', local: '2020', total: 1028500, estado: 'produccion' },
      { id: 3, numero: 'S00003', fecha: '2026-07-24', cliente: 'Bibiana',           vendedor: 'Ale',      local: '2020', total: 516000,  estado: 'confirmar' },
      { id: 4, numero: 'S00004', fecha: '2026-07-26', cliente: 'Laura y Hernán',    vendedor: 'Cristian', local: '2299', total: 731250,  estado: 'logistica' },
      { id: 5, numero: 'S00005', fecha: '2026-07-27', cliente: 'Diego',             vendedor: 'Sergio',   local: '2299', total: 733000,  estado: 'anulado' },
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
    confirmar:   { label: 'Confirmar',   pill: 'warn' },
    produccion:  { label: 'Producción',  pill: 'info' },
    logistica:   { label: 'Logística',   pill: 'info' },
    entregado:   { label: 'Entregado',   pill: 'ok' },
    archivado:   { label: 'Archivado',   pill: 'soft' },
    anulado:     { label: 'Anulado',     pill: 'crit' },
    reclamo:     { label: 'Reclamo',     pill: 'crit' },
  };
  const ESTADO_COTIZ = {
    borrador:  { label: 'Borrador',  pill: 'soft' },
    aceptada:  { label: 'Aceptada',  pill: 'ok' },
    rechazada: { label: 'Rechazada', pill: 'crit' },
    vencida:   { label: 'Vencida',   pill: 'warn' },
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
    ESTADO_ORDEN, ESTADO_COTIZ,

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
