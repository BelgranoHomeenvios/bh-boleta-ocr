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
  };

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
  };

  global.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
