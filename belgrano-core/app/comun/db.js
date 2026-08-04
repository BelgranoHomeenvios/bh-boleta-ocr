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

  // Clave estable a partir del nombre ("Vicente López" → "vicente_lopez").
  function slug(s) {
    return sinTilde(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  // Distancia de edición: cuántas letras hay que cambiar para pasar de una
  // palabra a la otra. Sirve para cazar los errores de tipeo al cargar valores.
  function distancia(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let fila = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      let ant = fila[0]; fila[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, ant + (a[i - 1] === b[j - 1] ? 0 : 1));
        ant = tmp;
      }
    }
    return fila[n];
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
      const precio = base + paso * i;
      // El costo del demo sale de un markup que varía un poco por combinación,
      // para que se vean las tres bandas del semáforo y no todo verde.
      const mk = 1.45 + ((_vid % 7) * 0.13);
      out.push({
        id: ++_vid, producto_id: productoId, medida, estructura, frente,
        precio, atributos: { medida, estructura, frente },
        costo: Math.round(precio / mk),
        // Medida de costeo: a veces el proveedor no pasa la del mueble que
        // vendemos (el chiffonier de 0,90 se costea con el de 1,00).
        medidaCosteo: medida,
        markupObj: null,     // null = hereda el del mueble
        stock: 0, activa: true, mostrar: true,
        peso: 35, alto: 0, prof: 0,
        imgVenta: '', imgProd: '',
        minStock: 0, reponer: 'pedido',   // pedido | minimo
      });
    })));
    return out;
  }

  // ---- Diccionario de propiedades y valores ----------------------------
  // Las propiedades (ESTRUCTURA, FRENTE, MEDIDAS…) y sus valores son ÚNICOS
  // para todo el catálogo: si cada mueble escribiera los suyos, un error de
  // tipeo crearía "ESTRUCTURA BLANCA" y "ESTRUTURA BLANCA" como dos cosas
  // distintas. Sólo Dirección da de alta valores nuevos acá; lo que carga un
  // vendedor en un mueble a medida queda pegado a esa boleta y NO entra.
  const PROP_KEY = 'bh_propiedades';
  const PROPS_BASE = [
    { k: 'estructura', nombre: 'ESTRUCTURA', valores: ['ESTRUCTURA BLANCA', 'ESTRUCTURA NEGRA', 'ESTRUCTURA PARAÍSO', 'ESTRUCTURA NATURAL'] },
    { k: 'frente', nombre: 'FRENTE', valores: ['FRENTE BLANCO', 'FRENTE NEGRO', 'FRENTE PARAÍSO', 'FRENTE NOGAL'] },
    { k: 'medida', nombre: 'MEDIDAS DEL FRENTE', valores: ['0,50', '0,70', '0,80', '0,90', '1,00', '1,20', '1,40', '1,60', '1,80', '2,00', '2,20'] },
    { k: 'terminacion', nombre: 'TERMINACIÓN', valores: ['Laqueado', 'Melamina', 'Enchapado'] },
  ];

  // Plano de producción de ejemplo: la hoja que se le manda a fábrica, con el
  // material, la cantidad, el código y el despiece acotado. Es una
  // RECONSTRUCCIÓN del formato que ya usan, para ver cómo se ve cargada la
  // imagen de producción; el archivo real lo sube cada uno.
  function planoDemo(material, codigo, oscuro) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 460" font-family="Georgia,serif">
      <rect width="700" height="460" fill="#fff"/>
      <g stroke="#000" fill="none" stroke-width="1.2">
        <rect x="8" y="8" width="684" height="444"/>
        <line x1="8" y1="48" x2="540" y2="48"/><line x1="130" y1="8" x2="130" y2="48"/>
        <line x1="330" y1="8" x2="330" y2="48"/><line x1="430" y1="8" x2="430" y2="48"/>
        <line x1="540" y1="8" x2="540" y2="452"/>
        <line x1="540" y1="60" x2="692" y2="60"/><line x1="540" y1="112" x2="692" y2="112"/>
        <line x1="540" y1="152" x2="692" y2="152"/><line x1="540" y1="204" x2="692" y2="204"/>
        <line x1="540" y1="244" x2="692" y2="244"/><line x1="540" y1="296" x2="692" y2="296"/>
        <line x1="540" y1="348" x2="692" y2="348"/><line x1="540" y1="380" x2="692" y2="380"/>
        <line x1="540" y1="412" x2="692" y2="412"/>
        <line x1="8" y1="330" x2="130" y2="330"/><line x1="130" y1="330" x2="130" y2="452"/>
        <line x1="8" y1="360" x2="130" y2="360"/><line x1="8" y1="390" x2="130" y2="390"/>
        <line x1="8" y1="421" x2="130" y2="421"/>
      </g>
      <g font-size="15" fill="#000">
        <text x="18" y="33">MATERIAL</text><text x="142" y="33" font-weight="bold">${material}</text>
        <text x="340" y="33">CANTIDAD</text><text x="443" y="33" font-weight="bold">1 UNIDADES</text>
        <text x="590" y="33">PEDIDO</text>
        <text x="588" y="85">PROVEEDOR</text><text x="600" y="177">NOMBRE</text>
        <text x="578" y="270" font-weight="bold">MUEBLE TV</text>
        <text x="580" y="290" font-weight="bold">TASOS 55</text>
        <text x="604" y="325">CÓDIGO</text>
        <text x="556" y="370" font-weight="bold" font-size="14">${codigo}</text>
        <text x="574" y="402">OBSERVACIONES</text>
      </g>
      <g font-size="9" fill="#000">
        <text x="14" y="348">VERIF.</text><text x="14" y="378">ORDEN</text>
        <text x="14" y="408">PROD.</text><text x="14" y="439">STOCK</text>
        <text x="548" y="372">FECHA DE COMPRA</text><text x="548" y="404">FECHA DE PRODUCCIÓN</text>
        <text x="548" y="436">FIRMA</text>
      </g>
      <defs><pattern id="ray" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1"/></pattern></defs>
      <g stroke="#000" stroke-width="1.1" fill="none">
        <path d="M150 200 L390 200 L430 172 L190 172 Z" fill="url(#ray)"/>
        <path d="M150 200 L150 268 L190 240 L190 172 Z" fill="url(#ray)"/>
        <path d="M390 200 L430 172 L430 240 L390 268 Z" fill="url(#ray)"/>
        <rect x="150" y="200" width="240" height="68" fill="#fff"/>
        <line x1="150" y1="234" x2="390" y2="234"/><line x1="270" y1="200" x2="270" y2="268"/>
        <line x1="150" y1="200" x2="270" y2="234"/><line x1="270" y1="200" x2="150" y2="234"/>
        <line x1="270" y1="200" x2="390" y2="234"/><line x1="390" y1="200" x2="270" y2="234"/>
        <line x1="150" y1="234" x2="270" y2="268"/><line x1="270" y1="234" x2="150" y2="268"/>
        <line x1="270" y1="234" x2="390" y2="268"/><line x1="390" y1="234" x2="270" y2="268"/>
        <path d="M146 268 L394 268 L434 240 L434 246 L394 274 L146 274 Z" fill="${oscuro ? '#000' : 'url(#ray)'}"/>
        <line x1="150" y1="160" x2="390" y2="160"/><line x1="150" y1="155" x2="150" y2="165"/><line x1="390" y1="155" x2="390" y2="165"/>
        <line x1="398" y1="160" x2="430" y2="172"/>
        <line x1="138" y1="200" x2="138" y2="268"/><line x1="133" y1="200" x2="143" y2="200"/><line x1="133" y1="268" x2="143" y2="268"/>
        <line x1="330" y1="120" x2="300" y2="188"/>
        <line x1="300" y1="330" x2="250" y2="276"/>
        ${oscuro ? '<line x1="420" y1="330" x2="392" y2="256"/>' : ''}
      </g>
      <g font-size="13" fill="#000">
        <text x="252" y="155" text-anchor="middle">1.60</text>
        <text x="118" y="238">0.55</text><text x="408" y="152">0.38+2</text>
        <text x="336" y="115">CORTE 45°</text>
        <text x="196" y="222" font-size="11">CAJÓN</text><text x="316" y="222" font-size="11">CAJÓN</text>
        <text x="196" y="256" font-size="11">CAJÓN</text><text x="316" y="256" font-size="11">CAJÓN</text>
        <text x="300" y="348" text-anchor="middle">BASE SE RETIRA</text>
        <text x="300" y="364" text-anchor="middle">EN LOS CUATRO</text>
        <text x="300" y="380" text-anchor="middle">LADOS</text>
        ${oscuro ? '<text x="420" y="346">LAQUEADO</text><text x="420" y="362">NEGRO</text>' : ''}
      </g>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\s+/g, ' '));
  }

  // ---- Propiedades secundarias ----------------------------------------
  // Las principales (ESTRUCTURA, FRENTE, MEDIDA) multiplican las variantes y
  // definen el precio y el pedido. Las secundarias NO multiplican nada: son un
  // dato más de cada variante, y cada mueble elige cuáles le sirven. En una
  // cómoda importa el alto; en un placard, la medida del hueco.
  // Las unidades salen de una lista, no se escriben: si uno pone "cm" y otro
  // "CM." o "centímetros", después no hay forma de comparar nada.
  const UNIDADES = [
    { k: 'cm', label: 'cm · centímetros' },
    { k: 'mm', label: 'mm · milímetros' },
    { k: 'm', label: 'm · metros' },
    { k: 'kg', label: 'kg · kilos' },
    { k: 'g', label: 'g · gramos' },
    { k: 'm³', label: 'm³ · metros cúbicos' },
    { k: 'l', label: 'l · litros' },
    { k: 'u', label: 'u · unidades' },
    { k: '', label: 'Sin unidad' },
  ];

  const SEC_KEY = 'bh_secundarias';
  const SEC_BASE = [
    { k: 'alto', nombre: 'Alto', unidad: 'cm' },
    { k: 'prof', nombre: 'Profundidad', unidad: 'cm' },
    { k: 'peso', nombre: 'Peso', unidad: 'kg' },
    { k: 'hueco', nombre: 'Medida del hueco', unidad: 'cm' },
    { k: 'interior', nombre: 'Ancho interior', unidad: 'cm' },
    { k: 'cajones', nombre: 'Cajones', unidad: '' },
    { k: 'volumen', nombre: 'Volumen', unidad: 'm³' },
  ];

  const DEMO = {
    categorias: [
      { id: 1, nombre: 'DORMITORIO', padre_id: null, nivel: 2 },
      { id: 2, nombre: 'CÓMODAS',      padre_id: 1,  nivel: 3 },
      { id: 3, nombre: 'PLACARDS',     padre_id: 1,  nivel: 3 },
      { id: 6, nombre: 'MESAS DE LUZ', padre_id: 1,  nivel: 3 },
      { id: 4, nombre: 'LIVING',       padre_id: null, nivel: 2 },
      { id: 5, nombre: 'MESAS RATONAS',   padre_id: 4, nivel: 3 },
      { id: 7, nombre: 'RACKS Y MESAS DE TV', padre_id: 4, nivel: 3 },
    ],
    // Diez muebles de ejemplo repartidos en cinco tipos, con la ficha que
    // necesita el vendedor: qué es, de qué está hecho y cuánto tarda.
    productos: [
      { id: 1, categoria_id: 2, nombre: 'CÓMODA AMBERES 55', publicado_tn: true, sku: 'CO-AMB-55',
        desc: 'Cómoda de 4 cajones con guías de extracción total y tiradores embutidos. El clásico de la línea Amberes.',
        alto: 0.85, prof: 0.45, materiales: 'MDF 18 mm laqueado · guías telescópicas · tiradores de aluminio', dias: 32,
        nProveedores: 1, rubros: [{ k: 'carpinteria', modo: 'dibujo' }],
        instalacion: false },
      { id: 4, categoria_id: 2, nombre: 'CÓMODA OLIVER 60', publicado_tn: true, sku: 'CO-OLI-60',
        desc: 'Seis cajones sobre patas de madera maciza. Frente ranurado, sin tiradores a la vista.',
        alto: 0.90, prof: 0.45, materiales: 'MDF 18 mm · patas de paraíso macizo · guías telescópicas', dias: 35 },
      { id: 5, categoria_id: 2, nombre: 'CÓMODA NÓRDICA 90', publicado_tn: false, sku: 'CO-NOR-90',
        desc: 'Tres cajones amplios y estructura baja. Se fabrica sólo en natural, a pedido.',
        alto: 0.75, prof: 0.42, materiales: 'MDF 18 mm enchapado · patas torneadas', dias: 35 },
      { id: 2, categoria_id: 3, nombre: 'PLACARD OLIVER', publicado_tn: true, sku: 'PL-OLI',
        desc: 'Placard de dos y tres puertas con interior armado: barral, estantes y cajonera.',
        alto: 2.10, prof: 0.55, materiales: 'MDF 18 mm · barral cromado · bisagras con freno', dias: 40,
        nProveedores: 1, rubros: [{ k: 'carpinteria', modo: 'dibujo' }], instalacion: true },
      { id: 6, categoria_id: 3, nombre: 'PLACARD AMBERES 2 PUERTAS', publicado_tn: true, sku: 'PL-AMB-2P',
        desc: 'Dos puertas batientes con cajonera interna de tres cajones y estante alto.',
        alto: 2.00, prof: 0.55, materiales: 'MDF 18 mm laqueado · bisagras con freno', dias: 40 },
      { id: 7, categoria_id: 6, nombre: 'MESA DE LUZ AMBERES', publicado_tn: true, sku: 'ML-AMB',
        desc: 'Un cajón y un estante inferior. Combina con la cómoda de la misma línea.',
        alto: 0.50, prof: 0.35, materiales: 'MDF 18 mm laqueado · guía telescópica', dias: 25 },
      { id: 8, categoria_id: 6, nombre: 'MESA DE LUZ NÓRDICA', publicado_tn: false, sku: 'ML-NOR',
        desc: 'Un cajón sobre patas torneadas. Se fabrica a pedido en cualquiera de las terminaciones.',
        alto: 0.52, prof: 0.35, materiales: 'MDF 18 mm · patas de paraíso macizo', dias: 25 },
      { id: 3, categoria_id: 5, nombre: 'MESA RATONA NORUEGA', publicado_tn: false, sku: 'MR-NOR',
        desc: 'Tapa rectangular con bandeja inferior y patas en V. Se hace a medida sin costo extra.',
        alto: 0.40, prof: 0.50, materiales: 'MDF 18 mm enchapado · patas de paraíso macizo', dias: 30 },
      { id: 9, categoria_id: 5, nombre: 'MESA RATONA OSLO', publicado_tn: true, sku: 'MR-OSL',
        desc: 'Tapa redonda sobre base central. Entra en cualquier living sin comer lugar.',
        alto: 0.42, prof: 0.60, materiales: 'MDF 18 mm laqueado · base metálica negra', dias: 30 },
      { id: 10, categoria_id: 7, nombre: 'RACK BERGEN 1.60', publicado_tn: true, sku: 'RK-BER-160',
        desc: 'Dos puertas rebatibles y un estante pasacables. Soporta televisores de hasta 65".',
        alto: 0.45, prof: 0.40, materiales: 'MDF 18 mm laqueado · bisagras con freno · pasacables', dias: 30 },
      { id: 12, categoria_id: 7, nombre: 'MUEBLE TV TASOS 55', publicado_tn: true, sku: 'S-MT-TA',
        desc: 'Mueble de TV de 1,60 con cuatro cajones y frente ranurado. La base se retira en los cuatro lados y el corte de la tapa es a 45°.',
        alto: 0.55, prof: 0.40, materiales: 'MDF 18 mm · frente ranurado · corte 45° · guías telescópicas', dias: 32,
        nProveedores: 2, rubros: [{ k: 'carpinteria', modo: 'dibujo' }, { k: 'herreria', modo: 'planilla' }],
        obtencion: 'dibujo', instalacion: false },
      { id: 11, categoria_id: 7, nombre: 'RACK OSLO 1.80', publicado_tn: true, sku: 'RK-OSL-180',
        desc: 'Dos cajones y un módulo abierto, sobre patas de madera. La versión larga del living Oslo.',
        alto: 0.48, prof: 0.40, materiales: 'MDF 18 mm · patas de paraíso macizo · guías telescópicas', dias: 32 },
    ],
    variantes: [
      ...combinar(1, ['1.00', '1.20', '1.40', '1.60'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 385000, 42000),
      ...combinar(4, ['1.20', '1.60'], ['Blanca', 'Negra'], ['Paraíso', 'Nogal'], 410000, 55000),
      ...combinar(5, ['0.90'], ['Natural'], ['Paraíso'], 352000, 0),
      ...combinar(2, ['1.80', '2.00', '2.20'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 860000, 90000),
      ...combinar(6, ['1.20', '1.40'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 690000, 74000),
      ...combinar(7, ['0.45'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 148000, 0),
      ...combinar(8, ['0.45'], ['Natural'], ['Paraíso', 'Nogal'], 132000, 0),
      ...combinar(3, ['0.80x0.50', '1.00x0.60'], ['Paraíso'], ['Negro', 'Natural'], 720000, 148000),
      ...combinar(9, ['0.80', '1.00'], ['Negra'], ['Paraíso', 'Blanco'], 268000, 46000),
      ...combinar(10, ['1.60'], ['Blanca', 'Negra'], ['Paraíso', 'Blanco'], 415000, 0),
      ...combinar(11, ['1.80', '2.00'], ['Blanca', 'Negra'], ['Paraíso', 'Nogal'], 498000, 62000),
      // Las dos que ya se fabrican, con su plano y su código real.
      { id: 900, producto_id: 12, medida: '1.60', estructura: 'PARAÍSO', frente: 'BLANCO',
        atributos: { medida: '1.60', estructura: 'PARAÍSO', frente: 'BLANCO' },
        precio: 452000, costo: 214000, sku: 'S-MT-TA-16-PB', medidaCosteo: '1.60',
        markupObj: null, stock: 2, activa: true, mostrar: true,
        peso: 42, alto: 55, prof: 40, frenteCm: 160,
        imgVenta: '', imgProd: planoDemo('PARAÍSO Y BLANCO', 'S-MT-TA-16-PB', false),
        minStock: 0, reponer: 'pedido' },
      { id: 901, producto_id: 12, medida: '1.60', estructura: 'PARAÍSO', frente: 'NEGRO',
        atributos: { medida: '1.60', estructura: 'PARAÍSO', frente: 'NEGRO' },
        precio: 468000, costo: 226000, sku: 'S-MT-TA-16-PN', medidaCosteo: '1.60',
        markupObj: null, stock: 0, activa: true, mostrar: true,
        peso: 42, alto: 55, prof: 40, frenteCm: 160,
        imgVenta: '', imgProd: planoDemo('PARAÍSO Y NEGRO', 'S-MT-TA-16-PN', true),
        minStock: 0, reponer: 'pedido' },
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
    DEFAULT_URL, cfg, guardarCfg, hayConexion, slug,

    // ---- Propiedades y valores (diccionario único del catálogo) ---------
    propiedades() {
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(PROP_KEY)) || []; } catch {}
      // Las de fábrica siempre están; lo guardado suma valores y propiedades nuevas.
      const mapa = new Map(PROPS_BASE.map(p => [p.k, { ...p, valores: [...p.valores] }]));
      guardadas.forEach(g => {
        const b = mapa.get(g.k);
        if (!b) return mapa.set(g.k, { ...g, valores: [...(g.valores || [])] });
        b.nombre = g.nombre || b.nombre;
        // El orden lo manda lo guardado: se puede reordenar y desactivar.
        b.valores = (g.valores || []).concat(b.valores.filter(v => !(g.valores || []).includes(v)));
      });
      return [...mapa.values()];
    },
    propiedad(k) { return this.propiedades().find(p => p.k === k) || null; },
    guardarPropiedades(lista) {
      try { localStorage.setItem(PROP_KEY, JSON.stringify(lista)); } catch {}
    },
    // Da de alta un valor nuevo en el diccionario. Devuelve el valor tal como
    // quedó guardado: si ya existía uno igual (sin importar tildes ni
    // mayúsculas) devuelve ESE, para no duplicar por un error de tipeo.
    agregarValor(k, valor) {
      const v = String(valor || '').trim();
      if (!v) return null;
      const props = this.propiedades();
      const p = props.find(x => x.k === k);
      if (!p) return null;
      const ya = p.valores.find(x => sinTilde(x) === sinTilde(v));
      if (ya) return ya;
      p.valores.push(v);
      this.guardarPropiedades(props);
      return v;
    },
    // Un valor escrito con un error de tipeo ("ESTRUTURA BLANCA") no es igual a
    // ninguno, así que se colaría como valor nuevo. Antes de dar el alta se
    // busca el más parecido y se pregunta: es el caso que más ensucia el
    // catálogo, porque después hay dos valores donde tendría que haber uno.
    parecidoA(k, valor) {
      const v = sinTilde(valor);
      if (!v) return null;
      const p = this.propiedad(k); if (!p) return null;
      let mejor = null, mejorD = Infinity;
      p.valores.forEach(x => {
        const d = distancia(sinTilde(x), v);
        if (d < mejorD) { mejorD = d; mejor = x; }
      });
      // Hasta dos letras de diferencia (y nunca más del 25% de la palabra).
      const tope = Math.min(2, Math.floor(v.length * 0.25));
      return mejorD > 0 && mejorD <= Math.max(1, tope) ? mejor : null;
    },

    crearPropiedad(nombre) {
      const n = String(nombre || '').trim();
      if (!n) return null;
      const props = this.propiedades();
      const k = slug(n);
      if (props.some(p => p.k === k)) return props.find(p => p.k === k);
      const nueva = { k, nombre: n.toUpperCase(), valores: [] };
      props.push(nueva);
      this.guardarPropiedades(props);
      return nueva;
    },

    // ---- Costos y rentabilidad ------------------------------------------
    // El markup objetivo arranca en 2,00x para todo, pero se puede cambiar por
    // categoría, por mueble y por variante: una cómoda de 2,00 se marca ×3
    // porque el cliente lo paga, y una variante de poca salida se marca menos.
    MARKUP_OBJETIVO: 2,
    // Bandas para el semáforo de rentabilidad (por debajo del objetivo).
    BANDAS: { critica: 1.60, floja: 1.90 },
    bandaDe(markup) {
      const m = Number(markup) || 0;
      if (m < this.BANDAS.critica) return { k: 'critica', label: 'Rentab. baja', pill: 'crit' };
      if (m < this.BANDAS.floja) return { k: 'floja', label: 'Para aumentar', pill: 'warn' };
      return { k: 'ok', label: 'OK', pill: 'ok' };
    },
    margenDe(costo, precio) {
      const p = Number(precio) || 0;
      return p ? ((p - (Number(costo) || 0)) / p) * 100 : 0;
    },
    markupDe(costo, precio) {
      const c = Number(costo) || 0;
      return c ? (Number(precio) || 0) / c : 0;
    },
    // El costo del mueble sale del PROMEDIO de lo que pasan los proveedores:
    // cuando tres lo fabrican, no se toma ni el más barato ni el más caro.
    costoPromedio(precios) {
      const xs = (precios || []).map(x => Number(x.precio) || 0).filter(x => x > 0);
      return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    },

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
        return ps.map(p => {
          const vs = DEMO.variantes.filter(v => v.producto_id === p.id);
          const pr = vs.map(v => v.precio);
          // La grilla muestra "desde": el vendedor necesita el piso de precio
          // antes de abrir el mueble. Y con qué terminaciones viene, que es lo
          // primero que pregunta el cliente.
          return {
            ...p,
            variantes: vs.length,
            desde: pr.length ? Math.min(...pr) : 0,
            hasta: pr.length ? Math.max(...pr) : 0,
            stock: this.stockDeProducto(p.id),
            terminaciones: [...new Set(vs.map(v => v.estructura).filter(Boolean))],
            // Los valores de cada propiedad principal, para que el catálogo
            // pueda filtrar por estructura, por frente o por medida sin
            // amontonarlo todo en una sola lista.
            props: (p.propiedades && p.propiedades.length
              ? p.propiedades : ['medida', 'estructura', 'frente'])
              .reduce((a, k) => {
                const vals = [...new Set(vs.map(v => v[k]).filter(Boolean))];
                if (vals.length) a[k] = vals;
                return a;
              }, {}),
            // La foto del catálogo es la primera de venta que se cargó en
            // Documentos: se ve el mueble sin tener que abrirlo.
            foto: ((p.archivos || []).find(a => a.tipo === 'venta') || {}).url || '',
            // Para filtrar por estado: cuántas variantes tienen mínimo
            // deseado y cuántas están por debajo.
            conMinimo: vs.filter(v => (Number(v.minStock) || 0) > 0).length,
            bajoMinimo: vs.filter(v => (Number(v.minStock) || 0) > 0
              && (Number(v.stock) || 0) < Number(v.minStock)).length,
          };
        });
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

    // ---- Unidades del depósito --------------------------------------------
    // Cómo se numera una unidad. Un solo correlativo para toda la empresa:
    // BH-000123. No lleva adentro el mueble ni la variante a propósito —el
    // sistema ya sabe de qué mueble es esa unidad, meterlo en el número sólo
    // alarga la etiqueta—. Un contador único no se pisa nunca y no hay que
    // llevar la cuenta mueble por mueble.
    SERIE: { prefijo: 'BH', digitos: 6 },
    serieDe(n) {
      return `${this.SERIE.prefijo}-${String(Math.max(1, Number(n) || 1)).padStart(this.SERIE.digitos, '0')}`;
    },
    // El próximo número libre. Cuando haya base de verdad esto es una secuencia
    // de Postgres; en demo alcanza con el contador guardado.
    // El contador no puede arrancar de cero si ya hay etiquetas puestas: la
    // próxima sigue a la más alta que exista, venga del contador o del depósito.
    _tope() {
      let n = 0;
      try { n = Number(localStorage.getItem('bh_serie')) || 0; } catch {}
      this.unidadesTodas().forEach(u => {
        const x = parseInt(String(u.serie || '').replace(/\D/g, ''), 10);
        if (x > n) n = x;
      });
      return n;
    },
    proximaSerie() { return this.serieDe(this._tope() + 1); },
    tomarSerie() {
      const n = this._tope() + 1;
      try { localStorage.setItem('bh_serie', String(n)); } catch {}
      return this.serieDe(n);
    },

    // DÓNDE está la unidad en su vida. La primera es la que nace con la venta:
    // el mueble está vendido y todavía no se le pidió a nadie. Existe porque si
    // no existe, entre la venta y el pedido hay un agujero donde el sistema no
    // sabe que ese mueble hay que hacerlo — y esa lista ES el pedido a fábrica.
    ESTADOS_UNIDAD: [
      { k: 'pedir', label: 'A pedir', pill: 'crit',
        pie: 'Vendida y todavía sin proveedor. Es lo que hay que pedir esta semana.' },
      { k: 'produccion', label: 'En producción', pill: 'viol',
        pie: 'La está haciendo el proveedor. Todavía no llegó.' },
      { k: 'stock', label: 'En stock', pill: 'ok',
        pie: 'Llegó, tiene etiqueta y está en su ubicación.' },
      { k: 'entregada', label: 'Entregada', pill: 'soft',
        pie: 'Ya salió. Queda el histórico para los reclamos.' },
    ],
    // Cómo se lee de verdad en pantalla, con el vocabulario de la planilla.
    // Son cinco y cada uno dice qué falta hacer con esa pieza, que es lo que
    // uno quiere saber al mirarla.
    VISTAS_UNIDAD: [
      { k: 'stock', label: 'Stock', pill: 'ok', pie: 'Está y no tiene dueño: se puede vender.' },
      { k: 'pedir', label: 'A pedir', pill: 'crit', pie: 'Vendida y sin proveedor asignado.' },
      { k: 'fabricando', label: 'En producción', pill: 'viol', pie: 'La está haciendo el proveedor.' },
      { k: 'lista', label: 'Lista para entregar', pill: 'warn', pie: 'Vendida y ya en el depósito.' },
      { k: 'entregada', label: 'Entregada', pill: 'soft', pie: 'Ya salió.' },
    ],
    // En cuál de esas cinco cae una unidad.
    vistaUnidad(u) {
      if (u.estado === 'entregada') return 'entregada';
      if (u.estado === 'pedir') return 'pedir';
      if (u.estado === 'produccion') return 'fabricando';
      return u.orden ? 'lista' : 'stock';
    },
    estadoUnidad(k) { return this.ESTADOS_UNIDAD.find(x => x.k === k) || this.ESTADOS_UNIDAD[1]; },

    // CÓMO está. No reemplaza al estado: una unidad a reparar sigue estando
    // físicamente y tiene que contar en el inventario, sólo que no se vende.
    MARCAS_UNIDAD: [
      { k: 'sena', label: 'A confirmar la venta', pill: 'warn',
        pie: 'Dejó una seña chica: está apartada pero la venta no está cerrada. Si pasan los días se cae sola.' },
      { k: 'reparar', label: 'A reparar', pill: 'warn',
        pie: 'Está, pero no se puede vender hasta que se arregle.' },
      { k: 'confirmar', label: 'A confirmar', pill: 'soft',
        pie: 'El conteo no la encontró. Queda marcada hasta que alguien la resuelva.' },
      { k: 'reclamo', label: 'En reclamo', pill: 'crit',
        pie: 'Se entregó y el cliente abrió un reclamo.' },
    ],
    marcaUnidad(k) { return this.MARCAS_UNIDAD.find(x => x.k === k) || null; },

    // Dónde está guardada. El estado dice "en stock"; esto dice en cuál.
    UBICACIONES: [
      { k: 'dep-pb', label: 'Depósito · planta baja' },
      { k: 'dep-1', label: 'Depósito · 1er piso' },
      { k: 'dep-2', label: 'Depósito · 2do piso' },
      { k: 'loc-2020', label: 'Local 2020' },
      { k: 'loc-2299', label: 'Local 2299' },
    ],
    ubicacion(k) { return this.UBICACIONES.find(x => x.k === k) || null; },
    ubicacionLabel(k) { const u = this.ubicacion(k); return u ? u.label : ''; },

    // Cómo se pidió: del catálogo tal cual, o hecha a medida para esa venta.
    // La que es a medida no se parece a la foto del catálogo, así que lleva la
    // suya para que el vendedor sepa qué está vendiendo.
    TIPOS_UNIDAD: [
      { k: 'estandar', label: 'Estándar' },
      { k: 'modificado', label: 'Modificado', pill: 'warn' },
      { k: 'medida', label: 'A medida', pill: 'soft' },
    ],
    tipoUnidad(k) { return this.TIPOS_UNIDAD.find(x => x.k === k) || this.TIPOS_UNIDAD[0]; },

    // ---- Producción: el plano ---------------------------------------------
    // El dibujo no lo genera el sistema: son los PDF que ya están hechos. Lo
    // que el sistema sabe es DE QUIÉN es cada uno y si está listo para pedir.
    //   estándar   → el de la variante, ya cargado
    //   modificado → el mismo, pero si cambia una cota hay que editarlo
    //   a medida   → propio de esa unidad, se dibuja de cero
    PLANO_ESTADOS: [
      { k: 'ok', label: 'Listo', pill: 'ok', pie: 'El plano de la variante, ya cargado.' },
      { k: 'a_dibujar', label: 'A dibujar', pill: 'crit',
        pie: 'Es a medida: hay que dibujarlo de cero.' },
      { k: 'a_editar', label: 'A editar', pill: 'warn',
        pie: 'Cambia una cota: se edita el plano en blanco que ya existe.' },
      { k: 'a_verificar', label: 'A verificar', pill: 'warn',
        pie: 'Está dibujado. Falta que otro lo compare con el croquis de la venta.' },
      { k: 'verificado', label: 'Verificado', pill: 'ok',
        pie: 'Alguien distinto del que dibujó lo dio por bueno.' },
    ],
    planoEstado(k) { return this.PLANO_ESTADOS.find(x => x.k === k) || this.PLANO_ESTADOS[0]; },
    // Con el plano sin resolver no se puede pedir: es lo que evita que salga a
    // fábrica un mueble mal dibujado.
    planoListo(u) {
      const e = u.planoEstado || (u.tipo === 'medida' ? 'a_dibujar' : 'ok');
      return e === 'ok' || e === 'verificado';
    },

    // ---- Producción: el pedido --------------------------------------------
    // El pedido tiene su propia serie, igual que las unidades. Se abre, se le
    // van agregando muebles, y cuando está se cierra para mandarlo.
    SERIE_PEDIDO: { prefijo: 'P', digitos: 6 },
    numPedido(n) {
      return `${this.SERIE_PEDIDO.prefijo}-${String(n).padStart(this.SERIE_PEDIDO.digitos, '0')}`;
    },
    ESTADOS_PEDIDO: [
      { k: 'abierto', label: 'Abierto', pill: 'soft',
        pie: 'Se le siguen agregando muebles. Todavía no se le mandó.' },
      { k: 'cerrado', label: 'Cerrado', pill: 'warn',
        pie: 'Congelado y listo para imprimir. Para agregarle algo hay que reabrirlo.' },
      { k: 'entregado', label: 'Entregado', pill: 'viol',
        pie: 'Lo tiene en el taller.' },
      { k: 'recibido', label: 'Recibido', pill: 'ok',
        pie: 'Vino todo lo que se pidió.' },
    ],
    estadoPedido(k) { return this.ESTADOS_PEDIDO.find(x => x.k === k) || this.ESTADOS_PEDIDO[0]; },

    // ---- Producción: cómo se lee lo que hay que fabricar -------------------
    // Cuatro lecturas que suman el total de lo que Producción tiene entre manos.
    VISTAS_FAB: [
      { k: 'dibujar', label: 'A dibujar', pill: 'crit' },
      { k: 'confirmar', label: 'A confirmar el dibujo', pill: 'warn' },
      { k: 'pedir', label: 'Sin pedir', pill: 'warn' },
      { k: 'fabricando', label: 'En fábrica', pill: 'viol' },
      { k: 'recibido', label: 'Recibido', pill: 'ok' },
    ],
    vistaFab(u) {
      if (u.estado === 'stock' || u.estado === 'entregada') return 'recibido';
      if (u.estado === 'produccion') return 'fabricando';
      if (this.planoListo(u)) return 'pedir';
      return u.planoEstado === 'a_verificar' ? 'confirmar' : 'dibujar';
    },
    // Lo que Producción tiene entre manos: ni lo entregado ni lo que ya está
    // guardado hace rato. Es la lista de trabajo, no el archivo.
    aFabricar() {
      return this.unidadesTodas().filter(u => u.estado === 'pedir' || u.estado === 'produccion');
    },
    // Cuántos días faltan para una fecha "9/8". Negativo = ya pasó.
    // No se puede usar diasDesde: ésa asume que lo que cae adelante es del año
    // pasado, y acá lo que cae adelante es justamente lo que todavía no llegó.
    diasHasta(fecha) {
      const m = /^(\d{1,2})\/(\d{1,2})$/.exec(String(fecha || '').trim());
      if (!m) return null;
      const hoy = new Date();
      const cero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      let d = new Date(hoy.getFullYear(), Number(m[2]) - 1, Number(m[1]));
      // Una fecha ocho meses para atrás es del año que viene, no de éste.
      if ((cero - d) / 86400000 > 240) d = new Date(hoy.getFullYear() + 1, Number(m[2]) - 1, Number(m[1]));
      return Math.round((d - cero) / 86400000);
    },
    // Por qué rubro pasa un mueble. Sale de la ficha del producto: ahí está
    // cargado si lo hace carpintería, tapicería o los dos.
    rubrosDe(productoId) {
      const p = DEMO.productos.find(x => x.id === Number(productoId));
      const rs = (p && p.rubros || []).map(r => r.k).filter(Boolean);
      return rs.length ? rs : ['carpinteria'];
    },
    rubroDe(u) { return (u.rubro || this.rubrosDe(u.productoId)[0] || 'carpinteria'); },

    // Mandar a fabricar algo sin venta atrás: para el local, para tener, o
    // porque nos quedamos sin stock. Nace igual que cualquier otra unidad.
    crearUnidadStock(varianteId, { motivo = '', cantidad = 1 } = {}) {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      if (!v) return [];
      const prod = DEMO.productos.find(p => p.id === v.producto_id) || {};
      const us = this.unidadesTodas();
      const nuevas = [];
      for (let i = 0; i < Math.max(1, Number(cantidad) || 1); i++) {
        const id = us.reduce((mx, x) => Math.max(mx, x.id), 0) + 1 + i;
        const u = {
          id, serie: '—', productoId: v.producto_id, varianteId: v.id,
          modelo: prod.nombre || '', medida: v.medida || '',
          color: [v.estructura, v.frente].filter(Boolean).join(' · '),
          terminacion: v.estructura || '', tipo: 'estandar', detalle: '', foto: '',
          estado: 'pedir', ubicacion: '', proveedor: '', llega: '', listo: '',
          orden: null, marca: null, planoEstado: 'ok',
          motivoStock: motivo || 'para tener', creadaEl: this.hoyCorto(),
        };
        us.push(u); nuevas.push(u);
      }
      return nuevas;
    },

    // ---- Pedidos: abrir, llenar, cerrar, reabrir --------------------------
    // El pedido vive en memoria como las unidades. Se arma con las unidades
    // que se le van agregando; la unidad guarda a qué pedido pertenece.
    _peds: null,
    pedidosTodos() {
      if (this._peds) return this._peds;
      // De la demo salen los pedidos que ya están en la calle: se reconstruyen
      // de las unidades, agrupando por número de pedido y proveedor.
      const m = new Map();
      this.unidadesTodas().forEach(u => {
        if (!u.pedido) return;
        if (!m.has(u.pedido)) {
          m.set(u.pedido, {
            numero: u.pedido, proveedor: u.proveedor || '',
            estado: u.estado === 'produccion' ? 'entregado' : 'recibido',
            rubro: 'carpinteria', modo: 'dibujo',
            desde: u.desde || '', hasta: u.hasta || '',
            abiertoPor: 'Martín', abiertoEl: u.desde || '', cerradoEl: u.desde || '',
            historial: [],
          });
        }
      });
      this._peds = [...m.values()].sort((a, b) => b.numero.localeCompare(a.numero));
      return this._peds;
    },
    pedido(num) { return this.pedidosTodos().find(p => p.numero === num) || null; },
    itemsDePedido(num) {
      return this.unidadesTodas().filter(u => this.pedidosDeUnidad(u)
        .some(x => x.pedido === num));
    },
    // El próximo número: sigue la serie más alta que ya exista.
    proximoPedido() {
      const n = this.pedidosTodos().reduce((mx, p) => {
        const x = parseInt(String(p.numero).replace(/\D/g, ''), 10) || 0;
        return Math.max(mx, x);
      }, 0);
      return this.numPedido(n + 1);
    },
    // Abre un pedido vacío para un taller. Todavía no se le mandó nada.
    abrirPedido({ proveedor, rubro = 'carpinteria', modo = 'dibujo', desde = '', hasta = '', quien = '' }) {
      const prov = this.proveedores().find(x => this.provLabel(x.id) === proveedor
        || x.nombre === proveedor);
      const p = {
        numero: this.proximoPedido(), proveedor, provId: prov ? prov.id : null,
        cupo: prov ? Number(prov.capacidad) || 0 : 0, rubro, modo, desde, hasta,
        estado: 'abierto', abiertoPor: quien || 'yo', abiertoEl: this.hoyCorto(),
        historial: [{ f: this.hoyCorto(), t: `${quien || 'Alguien'} abrió el pedido para ${proveedor}` }],
      };
      this.pedidosTodos().unshift(p);
      return p;
    },
    // Sumar una unidad a un pedido. Un mueble de DOS rubros va en dos pedidos
    // distintos —la cama al carpintero, las patas al herrero— y sigue siendo
    // una sola unidad: por eso la unidad guarda una lista, no un pedido solo.
    agregarAPedido(num, unidadId, quien = '') {
      const p = this.pedido(num); if (!p || p.estado !== 'abierto') return null;
      const u = this.unidad(unidadId); if (!u) return null;
      const lista = [...(u.pedidos || [])].filter(x => x.rubro !== p.rubro);
      lista.push({ rubro: p.rubro, pedido: num, proveedor: p.proveedor,
        provId: p.provId || null, agregadoEl: this.hoyCorto() });
      this.guardarUnidad({ id: u.id, pedidos: lista,
        // El primero es el que se muestra cuando hay que mostrar uno solo.
        pedido: lista[0].pedido, proveedor: lista[0].proveedor,
        provId: lista[0].provId, agregadoEl: this.hoyCorto() });
      p.historial.push({ f: this.hoyCorto(), t: `${quien || 'Alguien'} agregó ${u.modelo}` });
      return p;
    },
    sacarDePedido(num, unidadId) {
      const p = this.pedido(num); if (!p || p.estado !== 'abierto') return null;
      const u = this.unidad(unidadId); if (!u) return null;
      const lista = (u.pedidos || []).filter(x => x.pedido !== num);
      this.guardarUnidad({ id: unidadId, pedidos: lista,
        pedido: lista.length ? lista[0].pedido : '',
        proveedor: lista.length ? lista[0].proveedor : '',
        provId: lista.length ? lista[0].provId : null,
        agregadoEl: lista.length ? lista[0].agregadoEl : '' });
      return p;
    },
    // Los pedidos de una unidad, uno por rubro.
    pedidosDeUnidad(u) {
      if (u.pedidos && u.pedidos.length) return u.pedidos;
      return u.pedido ? [{ rubro: this.rubroDe(u), pedido: u.pedido,
        proveedor: u.proveedor, provId: u.provId }] : [];
    },
    // Le faltan rubros: el mueble pasa por dos manos y sólo se pidió una.
    rubrosFaltantes(u) {
      const hechos = this.pedidosDeUnidad(u).map(x => x.rubro);
      return this.rubrosDe(u.productoId).filter(r => !hechos.includes(r));
    },
    // Está enlazada cuando llegaron todas sus partes y alguien las unió.
    necesitaEnlace(u) { return this.rubrosDe(u.productoId).length > 1; },
    enlazar(u, quien = '') {
      this.guardarUnidad({ id: u.id, enlazada: true, enlazadaPor: quien,
        enlazadaEl: this.hoyCorto() });
      return this.unidad(u.id);
    },
    // Cerrar congela el pedido: ya no entra nada sin reabrirlo. Y ahí las
    // unidades pasan a estar en fábrica, con el rango comprometido.
    cerrarPedido(num, quien = '') {
      const p = this.pedido(num); if (!p) return null;
      p.estado = 'cerrado';
      p.cerradoPor = quien || 'yo'; p.cerradoEl = this.hoyCorto();
      p.historial.push({ f: this.hoyCorto(),
        t: `${quien || 'Alguien'} cerró el pedido · ${this.itemsDePedido(num).length} muebles` });
      this.itemsDePedido(num).forEach(u => this.guardarUnidad({
        id: u.id, estado: 'produccion', desde: p.desde, hasta: p.hasta,
        serie: u.serie && u.serie !== '—' ? u.serie : this.tomarSerie(),
      }));
      return p;
    },
    // El cupo: cuántos muebles le caben. Cuando se llena, el pedido se cierra
    // —es lo mismo que los viajes de un flete—.
    cupoDe(p) {
      if (p.cupo) return Number(p.cupo);
      const prov = p.provId ? this.proveedor(p.provId)
        : this.proveedores().find(x => this.provLabel(x.id) === p.proveedor);
      return prov ? Number(prov.capacidad) || 0 : 0;
    },
    lugarEnPedido(p) {
      const cupo = this.cupoDe(p);
      if (!cupo) return null;
      return { cupo, usado: this.itemsDePedido(p.numero).length,
        libre: Math.max(0, cupo - this.itemsDePedido(p.numero).length) };
    },
    reabrirPedido(num, quien = '') {
      const p = this.pedido(num); if (!p) return null;
      p.estado = 'abierto';
      p.historial.push({ f: this.hoyCorto(), t: `${quien || 'Alguien'} reabrió el pedido` });
      return p;
    },
    hoyCorto() {
      const d = new Date();
      return `${d.getDate()}/${d.getMonth() + 1}`;
    },

    // ---- Recepción y control de calidad -----------------------------------
    // Recibir por lector: el lector es un teclado que escribe el código y da
    // Enter. Se busca por número de serie —la copia pegada al mueble— o por
    // el número de pedido, que también sale impreso en el remito.
    buscarPorCodigo(txt) {
      const t = String(txt || '').trim().toUpperCase();
      if (!t) return null;
      const u = this.unidadesTodas().find(x => String(x.serie).toUpperCase() === t);
      if (u) return { tipo: 'unidad', unidad: u };
      const p = this.pedidosTodos().find(x => String(x.numero).toUpperCase() === t);
      if (p) return { tipo: 'pedido', pedido: p, items: this.itemsDePedido(p.numero) };
      return null;
    },

    CALIDADES: [
      { k: 'perfecto', label: 'Perfecto', pill: 'ok', entra: true,
        pie: 'Llegó como tenía que llegar. Entra al depósito.' },
      { k: 'detalle', label: 'Con detalle', pill: 'warn', entra: true,
        pie: 'Se puede vivir con eso: entra, pero con la observación y las fotos pegadas.' },
      { k: 'reparar', label: 'A reparar', pill: 'warn', entra: false,
        pie: 'No entra al depósito: se queda en Producción hasta que se arregle.' },
      { k: 'devuelto', label: 'Se devuelve', pill: 'crit', entra: false,
        pie: 'Vuelve en la camioneta. El proveedor la sigue debiendo.' },
    ],
    calidad(k) { return this.CALIDADES.find(x => x.k === k) || null; },
    SERIE_RECEPCION: { prefijo: 'R', digitos: 6 },
    numRecepcion(n) {
      return `${this.SERIE_RECEPCION.prefijo}-${String(n).padStart(this.SERIE_RECEPCION.digitos, '0')}`;
    },
    _recs: null,
    recepciones() {
      if (!this._recs) { this._recs = []; this._sembrarRecepciones(); }
      return this._recs;
    },
    // Cuatro meses de entregas ya conformadas. Sin esto, Historial,
    // Indicadores y la ficha del proveedor arrancan en blanco y no hay
    // manera de ver si la pantalla sirve.
    _sembrarRecepciones() {
      const llegadas = this.unidadesTodas().filter(u => u.provId
        && (u.estado === 'stock' || u.estado === 'entregada'));
      const porProv = {};
      llegadas.forEach(u => { (porProv[u.provId] = porProv[u.provId] || []).push(u); });
      let n = 92;
      const out = [];
      Object.keys(porProv).forEach(pid => {
        const us = porProv[pid];
        for (let i = 0; i + 1 < us.length; i += 5) {
          const lote = us.slice(i, i + 5);
          const mes = 4 + ((n + i) % 4);
          const dia = ((n * 7 + i) % 27) + 1;
          const items = lote.map(u => {
            const p = this.precioProveedor(pid, u.varianteId);
            // Un precio parejo se ve falso: el taller redondea, y de vez en
            // cuando cobra algo distinto de lo que decía la lista.
            const salto = (u.id % 11 === 0) ? 1.08 : (u.id % 7 === 0 ? 0.96 : 1);
            return { unidadId: u.id, varianteId: u.varianteId,
              calidad: u.id % 13 === 0 ? 'detalle' : 'perfecto',
              modelo: u.modelo, medida: u.medida, color: u.color,
              orden: u.orden || '', serie: u.serie, nota: '',
              precio: Math.round(p.precio * salto / 1000) * 1000 };
          });
          const prov = this.proveedor(Number(pid));
          out.push({
            numero: this.numRecepcion(n++), pedido: lote[0].pedido,
            provId: Number(pid), proveedor: prov ? this.provLabel(prov.id) : '',
            fecha: `${dia}/${mes}`, recibidoPor: 'Adrián', items,
            estadoCompras: 'conformada', conformadaPor: 'Jony',
            conformadaEl: `${dia}/${mes}`,
            flete: (n % 4 === 0)
              ? { modo: 'compra', monto: 45000 + (n % 5) * 12000, quien: 'Jony', el: `${dia}/${mes}` }
              : { modo: 'proveedor', monto: 0, quien: 'Jony', el: `${dia}/${mes}` },
            total: items.reduce((a, x) => a + x.precio, 0),
          });
        }
      });
      // De la más nueva a la más vieja, que es como se mira.
      out.sort((a, b) => this.diasDesde(a.fecha) - this.diasDesde(b.fecha));
      // Las tres últimas todavía no las miró nadie: son las que esperan a
      // Jony en "Recepciones a conformar".
      out.slice(0, 3).forEach(r => {
        r.estadoCompras = 'pendiente';
        delete r.conformadaPor; delete r.conformadaEl; delete r.total;
        r.items.forEach(it => { delete it.precio; });
      });
      this._recs = out;
      // Lo que se conformó ya es precio conocido de ese taller: así la lista
      // arranca con lo que de verdad se pagó y el comparador tiene qué
      // comparar. Si el navegador ya guardó una lista propia, no se toca.
      const lista = this.listaPrecios();
      if (!lista.length) {
        out.filter(r => r.estadoCompras === 'conformada').forEach(r => {
          r.items.forEach(it => {
            const i = lista.findIndex(x => x.provId === r.provId && x.varianteId === it.varianteId);
            const reg = { provId: r.provId, varianteId: it.varianteId,
              precio: it.precio, desde: r.conformadaEl, quien: 'Jony' };
            if (i >= 0) lista[i] = reg; else lista.push(reg);
          });
        });
      }
    },
    proximaRecepcion() {
      return this.numRecepcion(this.recepciones().length + 92);
    },
    // Recibir un lote deja el papel: qué trajo, cómo llegó cada uno y qué
    // quedó debiendo. Ese papel es lo que después conforma Compras.
    registrarRecepcion({ pedido, provId, proveedor, items, quien = '' }) {
      const r = {
        numero: this.proximaRecepcion(), pedido, provId, proveedor,
        fecha: this.hoyCorto(), recibidoPor: quien || 'yo',
        items: items.map(x => ({ ...x })),
        estadoCompras: 'pendiente',
      };
      this.recepciones().unshift(r);
      return r;
    },
    recepcion(num) { return this.recepciones().find(r => r.numero === num) || null; },
    aConformar() { return this.recepciones().filter(r => r.estadoCompras === 'pendiente'); },

    // ---- Órdenes de compra ------------------------------------------------
    // Lo que NO son muebles: los insumos con los que trabajamos —placas,
    // herrajes, telas, pintura—. El mueble se pide en Producción; acá se
    // compra lo que hace falta para hacerlo o para el local.
    SERIE_OC: { prefijo: 'OC', digitos: 5 },
    numOC(n) { return `${this.SERIE_OC.prefijo}-${String(n).padStart(this.SERIE_OC.digitos, '0')}`; },
    ESTADOS_OC: [
      { k: 'borrador', label: 'Borrador', pill: 'soft', pie: 'Se está armando. Todavía no se mandó.' },
      { k: 'enviada', label: 'Enviada', pill: 'warn', pie: 'Se le pidió al proveedor.' },
      { k: 'recibida', label: 'Recibida', pill: 'ok', pie: 'Llegó todo lo que se pidió.' },
      { k: 'anulada', label: 'Anulada', pill: 'crit', pie: 'Se dio de baja.' },
    ],
    estadoOC(k) { return this.ESTADOS_OC.find(x => x.k === k) || this.ESTADOS_OC[0]; },
    // Los insumos de siempre, con su unidad y su último precio conocido.
    INSUMOS: [
      { k: 'mdf18', nombre: 'Placa MDF 18 mm', unidad: 'placa', precio: 42000, rubro: 'carpinteria' },
      { k: 'mdf12', nombre: 'Placa MDF 12 mm', unidad: 'placa', precio: 31000, rubro: 'carpinteria' },
      { k: 'melamina', nombre: 'Melamina blanca 18 mm', unidad: 'placa', precio: 48000, rubro: 'carpinteria' },
      { k: 'guia', nombre: 'Guía telescópica 45 cm', unidad: 'par', precio: 6800, rubro: 'carpinteria' },
      { k: 'bisagra', nombre: 'Bisagra cazoleta con freno', unidad: 'unidad', precio: 1900, rubro: 'carpinteria' },
      { k: 'tirador', nombre: 'Tirador de aluminio', unidad: 'unidad', precio: 3400, rubro: 'carpinteria' },
      { k: 'laca', nombre: 'Laca poliuretánica', unidad: 'litro', precio: 15800, rubro: 'laqueado' },
      { k: 'lija', nombre: 'Lija al agua 220', unidad: 'pliego', precio: 850, rubro: 'laqueado' },
      { k: 'pana', nombre: 'Pana antimanchas', unidad: 'metro', precio: 12400, rubro: 'tapiceria' },
      { k: 'espuma', nombre: 'Espuma alta densidad', unidad: 'plancha', precio: 27500, rubro: 'tapiceria' },
      { k: 'cano', nombre: 'Caño estructural 20×20', unidad: 'metro', precio: 4900, rubro: 'herreria' },
      { k: 'pata', nombre: 'Pata de hierro pintada', unidad: 'unidad', precio: 5600, rubro: 'herreria' },
    ],
    insumo(k) { return this.INSUMOS.find(x => x.k === k) || null; },
    _ocs: null,
    ordenesCompra() {
      if (this._ocs) return this._ocs;
      // Unas cuantas de ejemplo, para ver la pantalla con algo adentro.
      const it = (k, cant, precio) => {
        const i = this.insumo(k);
        return { insumo: k, nombre: i.nombre, unidad: i.unidad, cant, precio: precio || i.precio };
      };
      this._ocs = [
        { numero: this.numOC(41), proveedor: 'Maderera del Oeste', provId: null,
          estado: 'enviada', fecha: '28/7', entrega: '8/8', quien: 'Jony',
          items: [it('mdf18', 30), it('mdf12', 12), it('melamina', 18)],
          nota: 'Descargan por el portón de atrás.' },
        { numero: this.numOC(42), proveedor: 'Herrajes Vitale', provId: null,
          estado: 'enviada', fecha: '30/7', entrega: '6/8', quien: 'Jony',
          items: [it('guia', 60), it('bisagra', 200), it('tirador', 80)] },
        { numero: this.numOC(43), proveedor: 'Pinturería Norte', provId: null,
          estado: 'recibida', fecha: '18/7', entrega: '25/7', quien: 'Jony',
          items: [it('laca', 40), it('lija', 300)] },
        { numero: this.numOC(44), proveedor: 'Textiles Suárez', provId: null,
          estado: 'borrador', fecha: this.hoyCorto(), entrega: '', quien: 'Jony',
          items: [it('pana', 25), it('espuma', 8)] },
      ];
      return this._ocs;
    },
    oc(num) { return this.ordenesCompra().find(o => o.numero === num) || null; },
    totalOC(o) {
      return (o.items || []).reduce((a, x) => a + (Number(x.cant) || 0) * (Number(x.precio) || 0), 0);
    },
    proximaOC() {
      const n = this.ordenesCompra().reduce((mx, o) =>
        Math.max(mx, parseInt(String(o.numero).replace(/\D/g, ''), 10) || 0), 0);
      return this.numOC(n + 1);
    },
    crearOC({ proveedor, entrega = '', quien = '' }) {
      const o = { numero: this.proximaOC(), proveedor, provId: null, estado: 'borrador',
        fecha: this.hoyCorto(), entrega, quien: quien || 'yo', items: [] };
      this.ordenesCompra().unshift(o);
      return o;
    },
    agregarAOC(num, insumoK, cant) {
      const o = this.oc(num); if (!o || o.estado !== 'borrador') return null;
      const i = this.insumo(insumoK); if (!i) return null;
      const ya = o.items.find(x => x.insumo === insumoK);
      if (ya) ya.cant = Number(ya.cant) + (Number(cant) || 1);
      else o.items.push({ insumo: insumoK, nombre: i.nombre, unidad: i.unidad,
        cant: Number(cant) || 1, precio: i.precio });
      return o;
    },
    sacarDeOC(num, insumoK) {
      const o = this.oc(num); if (!o || o.estado !== 'borrador') return null;
      o.items = o.items.filter(x => x.insumo !== insumoK);
      return o;
    },
    cambiarOC(num, estado, quien = '') {
      const o = this.oc(num); if (!o) return null;
      o.estado = estado;
      if (estado === 'enviada') { o.enviadaPor = quien || 'yo'; o.enviadaEl = this.hoyCorto(); }
      if (estado === 'recibida') { o.recibidaPor = quien || 'yo'; o.recibidaEl = this.hoyCorto(); }
      return o;
    },


    // ---- La lista de Costeo -----------------------------------------------
    // Es la tabla con la que se trabaja hoy en Belgrano Cost: cuánto sale
    // cada mueble según su categoría, su medida y su terminación. No mira
    // quién lo fabrica —es el piso contra el que se compara lo que después
    // cobra cada proveedor.
    TERMINACIONES: [
      { k: 'laqueado',     label: 'Laqueado' },
      { k: 'comboBlanco',  label: 'Combinado + Blanco' },
      { k: 'comboParaiso', label: 'Combinado + Paraíso' },
      { k: 'paraiso',      label: 'Paraíso' },
    ],
    // La terminación sale de mirar las dos caras del mueble: si alguna es
    // paraíso manda el paraíso; si no, va laqueado cuando las dos son del
    // mismo color y combinado cuando son de dos.
    terminacionDe(estructura, frente) {
      const limpio = t => sinTilde(String(t || '')).trim().replace(/a$/, 'o');
      const esPar = t => limpio(t).includes('paraiso');
      const a = esPar(estructura), b = esPar(frente);
      if (a && b) return 'paraiso';
      if (a || b) return 'comboParaiso';
      return limpio(estructura) === limpio(frente) ? 'laqueado' : 'comboBlanco';
    },
    // Cada tipo de mueble del catálogo con el nombre que tiene en Costeo.
    CAT_COSTEO: { 2: 'comodas', 3: 'placard', 5: 'ratona', 6: 'mesas-luz', 7: 'muebles-tv' },
    // categoría · medida (frente x alto x prof, en cm) · los cuatro precios,
    // en el orden de TERMINACIONES.
    COSTEO_BASE: [
      ['escritorios','80x80x45',205720,218230,245340,265080],
      ['escritorios','100x80x45',209890,221010,249570,274950],
      ['escritorios','120x80x45',226570,239080,270720,297510],
      ['escritorios','140x80x45',234910,247420,284820,313020],
      ['escritorios','160x80x45',257150,271050,307380,338400],
      ['escritorios','180x80x45',280780,294680,329940,362370],
      ['escritorios','200x80x45',312750,333600,356730,393390],
      ['escritorios','220x80x45',333600,354450,380700,415950],
      ['alzada','60x40x30',123710,129270,136770,149460],
      ['alzada','80x40x30',132050,139000,155100,170610],
      ['alzada','100x40x30',145950,154290,180480,198810],
      ['alzada','120x40x30',162630,165410,181890,200220],
      ['alzada','150x40x30',179310,184870,204450,225600],
      ['alzada','160x40x30',194600,209890,221370,242520],
      ['alzada','180x40x30',209890,218230,236880,260850],
      ['alzada','200x40x30',239080,252980,270720,297510],
      ['alzada','220x40x30',259930,275220,303150,331350],
      ['alzada','60x60x30',123710,129270,136770,149460],
      ['alzada','80x60x30',132050,139000,155100,170610],
      ['alzada','100x60x30',145950,154290,180480,198810],
      ['alzada','120x60x30',162630,165410,181890,200220],
      ['alzada','150x60x30',179310,184870,204450,225600],
      ['alzada','160x60x30',194600,209890,221370,242520],
      ['alzada','180x60x30',209890,218230,236880,260850],
      ['alzada','200x60x30',239080,252980,270720,297510],
      ['alzada','220x60x30',259930,275220,303150,331350],
      ['biblioteca','40x180x30',227960,241860,265080,291870],
      ['biblioteca','60x180x30',246030,255760,280590,308790],
      ['biblioteca','80x180x30',259930,269660,289050,318660],
      ['biblioteca','100x180x30',266880,278000,305970,336990],
      ['biblioteca','120x180x30',278000,294680,317250,349680],
      ['botinero','50x50x30',114216,122292,139266,152139],
      ['botinero','70x50x30',122292,128061,146288,160331],
      ['botinero','100x50x30',146520,153442,169694,186078],
      ['botinero','120x50x30',154596,162672,177886,196610],
      ['botinero','140x50x30',177670,188053,204803,225868],
      ['botinero','160x50x30',230740,253814,277361,305448],
      ['botinero','180x50x30',250353,273427,292575,321833],
      ['botinero','200x50x30',268812,288425,321833,354601],
      ['botinero','220x50x30',302269,310345,352260,397902],
      ['botinero','50x90x30',137610,147340,167790,183300],
      ['botinero','70x90x30',147340,154290,176250,193170],
      ['botinero','100x90x30',176530,184870,204450,224190],
      ['botinero','120x90x30',186260,195990,214320,236880],
      ['botinero','140x90x30',214060,226570,246750,272130],
      ['botinero','160x90x30',278000,305800,334170,368010],
      ['botinero','180x90x30',301630,329430,352500,387750],
      ['botinero','200x90x30',323870,347500,387750,427230],
      ['botinero','220x90x30',364180,373910,424410,479400],
      ['botinero','50x130x30',164020,170970,197400,208680],
      ['botinero','70x130x30',172360,180700,211500,232650],
      ['botinero','90x130x30',186260,195990,214320,236880],
      ['comodas','45x90x45',215450,226570,274950,303150],
      ['comodas','60x90x45',244640,258540,283410,311610],
      ['comodas','80x90x45',250200,266880,307380,338400],
      ['comodas','90x90x45',272440,286340,317250,348270],
      ['comodas','100x90x45',280780,294680,325710,358140],
      ['comodas','120x90x45',303020,318310,331350,365190],
      ['comodas','140x90x45',321090,337770,355320,391980],
      ['comodas','150x90x45',347500,368350,387750,423000],
      ['comodas','160x90x45',339160,358620,369420,406080],
      ['comodas','180x90x45',364180,386420,431460,473760],
      ['comodas','200x90x45',410050,425340,468120,514650],
      ['chiffonier','50x120x45',255760,268270,305970,336990],
      ['chiffonier','70x120x45',276610,290510,320070,352500],
      ['chiffonier','90x120x45',289120,304410,334170,366600],
      ['estante-flotante','60x30',20850,0,0,22560],
      ['estante-flotante','80x30',22240,0,0,25380],
      ['estante-flotante','100x30',25020,0,0,28200],
      ['estante-flotante','120x30',27800,0,0,35250],
      ['estante-flotante','150x30',34750,0,0,42300],
      ['estante-flotante','160x30',37000,0,0,44000],
      ['estante-flotante','180x30',41700,0,0,52170],
      ['estante-flotante','200x30',48650,0,0,60630],
      ['mesas-luz','35x35x40',65330,69500,78960,86010],
      ['mesas-luz','40x35x40',66720,73670,80370,88830],
      ['mesas-luz','50x35x40',76450,80620,91650,101520],
      ['mesas-luz','60x35x40',83400,87570,101520,111390],
      ['mesas-luz','35x65x40',86180,91740,105750,115620],
      ['mesas-luz','40x65x40',90350,97300,107160,118440],
      ['mesas-luz','50x65x40',101470,108420,122670,135360],
      ['mesas-luz','60x65x40',111200,118150,135360,148050],
      ['ratona','80x40x50',123710,130660,140845,155100],
      ['ratona','100x40x50',133440,139000,146640,162150],
      ['ratona-circular','45-50 diametro',52820,0,57810,63450],
      ['recibidor','70x90x25',129270,136220,145230,159330],
      ['recibidor','90x90x25',139000,144560,155100,170610],
      ['recibidor','120x90x25',145950,152900,160740,176250],
      ['respaldo','90x130',86180,100080,124080,136770],
      ['respaldo','120x130',108420,113980,129720,142410],
      ['respaldo','150x130',111200,116760,141000,155100],
      ['respaldo','170x130',130660,137610,156510,172020],
      ['respaldo','190x130',143170,150120,170610,187530],
      ['respaldo','210x130',157070,164020,188940,207270],
      ['torre-cerrada','35x180x40',250200,261320,284820,314430],
      ['torre-cerrada','40x180x40',261320,266880,297510,327120],
      ['torre-cerrada','50x180x40',268270,278000,310200,338400],
      ['torre-cerrada','60x180x40',282170,290510,332760,365190],
      ['torre-cerrada','70x180x40',291900,301630,342630,373650],
      ['torre-cerrada','80x180x40',318310,325260,356730,393390],
      ['torre-cerrada','100x180x40',339160,358620,375060,413130],
      ['torre-cerrada','120x180x40',364180,382250,424410,466710],
      ['vajilleros','80x90x45',271050,284950,317250,338400],
      ['vajilleros','100x90x45',287730,301630,324300,345450],
      ['vajilleros','120x90x45',296070,309970,336990,370830],
      ['vajilleros','150x90x45',315530,333600,377880,415950],
      ['vajilleros','160x90x45',329430,348890,382110,420180],
      ['vajilleros','180x90x45',339160,365570,393390,432870],
      ['vajilleros','200x90x45',364180,394760,404670,445560],
      ['vajilleros','220x90x45',396150,430900,451200,479400],
    ],

    // Cómo se llama en Costeo el tipo de mueble del catálogo.
    costeoCat(categoriaId) { return this.CAT_COSTEO[Number(categoriaId)] || ''; },
    // El frente en centímetros: en el catálogo la medida viene en metros
    // ("1.20") y en Costeo en centímetros ("120x90x45").
    frenteCm(medida) {
      const n = parseFloat(String(medida || '').replace(',', '.'));
      if (!n) return 0;
      return n < 10 ? Math.round(n * 100) : Math.round(n);
    },
    // Busca en la lista de Costeo la fila que corresponde a una variante. Si
    // la medida exacta no está —el chiffonier de 0,90 se costea con el de
    // 1,00— toma la más parecida y avisa que no es exacta, para que nadie
    // confunda el dato de al lado con el propio.
    costeoDe(varianteId) {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      if (!v) return null;
      const p = DEMO.productos.find(x => x.id === v.producto_id);
      const cat = this.costeoCat(p && p.categoria_id);
      const filas = this.COSTEO_BASE.filter(f => f[0] === cat);
      if (!filas.length) return null;
      const term = this.terminacionDe(v.estructura, v.frente);
      const col = 2 + this.TERMINACIONES.findIndex(t => t.k === term);
      const busco = this.frenteCm(v.medidaCosteo || v.medida);
      let mejor = null, dif = Infinity;
      filas.forEach(f => {
        const d = Math.abs(this.frenteCm(f[1]) - busco);
        if (d < dif) { dif = d; mejor = f; }
      });
      if (!mejor || !mejor[col]) return null;
      return { costo: mejor[col], medida: mejor[1], categoria: cat,
        terminacion: term, exacta: dif === 0 };
    },
    terminacion(k) { return this.TERMINACIONES.find(t => t.k === k) || null; },
    // El mueble al que pertenece una variante, y cómo se lo nombra en
    // pantalla: modelo y medida, que es como lo pide todo el mundo.
    productoDeVariante(varianteId) {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      return v ? DEMO.productos.find(p => p.id === v.producto_id) || null : null;
    },
    nombreVariante(varianteId) {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      if (!v) return `#${varianteId}`;
      const p = this.productoDeVariante(varianteId);
      const u = this.unidadesTodas().find(x => x.varianteId === v.id);
      const nom = (p && p.nombre) || (u && u.modelo) || `Mueble #${v.producto_id}`;
      // Varios modelos ya llevan la medida en el nombre ("RACK BERGEN 1.60"):
      // repetirla queda mal y no aclara nada.
      const med = String(v.medida || '');
      return (med && !nom.includes(med) ? `${nom} ${med}` : nom).trim();
    },

    // ---- Lista de precios del proveedor -----------------------------------
    // Lo que nos cobra cada taller por cada variante. Se actualiza sola a
    // medida que van viniendo: cuando Compras conforma un precio distinto,
    // puede dejarlo como excepción de esa vez o cambiarlo desde hoy.
    PRECIOS_KEY: 'bh_precios_prov',
    _precios: null,
    listaPrecios() {
      if (this._precios) return this._precios;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.PRECIOS_KEY)) || []; } catch {}
      this._precios = g;
      return g;
    },
    // El precio de lista de una variante para un taller. Va bajando de
    // escalón hasta encontrar algo: lo que ese proveedor cobró la última
    // vez, después la lista de Costeo, y recién al final el costo que tiene
    // cargado el catálogo. Los dos últimos son estimaciones y se avisan.
    precioProveedor(provId, varianteId) {
      const p = this.listaPrecios().find(x => x.provId === Number(provId)
        && x.varianteId === Number(varianteId));
      if (p) return { precio: Number(p.precio) || 0, desde: p.desde,
        estimado: false, origen: 'proveedor' };
      const c = this.costeoDe(varianteId);
      if (c) return { precio: c.costo, desde: '', estimado: true,
        origen: 'costeo', costeo: c };
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      return { precio: v ? Number(v.costo) || 0 : 0, desde: '',
        estimado: true, origen: 'catalogo' };
    },
    ORIGENES_PRECIO: {
      proveedor: { label: 'de este proveedor', pill: 'ok' },
      costeo:    { label: 'de Costeo',         pill: 'soft' },
      catalogo:  { label: 'del catálogo',      pill: 'warn' },
    },
    guardarPrecioProveedor(provId, varianteId, precio, quien = '') {
      const lista = this.listaPrecios();
      const i = lista.findIndex(x => x.provId === Number(provId)
        && x.varianteId === Number(varianteId));
      const antes = i >= 0 ? Number(lista[i].precio) || 0 : 0;
      const p = Number(precio) || 0;
      const reg = { provId: Number(provId), varianteId: Number(varianteId),
        precio: p, desde: this.hoyCorto(), quien: quien || 'yo' };
      if (i >= 0) lista[i] = reg; else lista.push(reg);
      // El precio viejo no se tira: sin él no hay manera de saber cuánto
      // aumentó un mueble ni de dónde salió el margen que hoy vemos.
      if (antes !== p) {
        this.historialPrecios().push({ provId: Number(provId), varianteId: Number(varianteId),
          antes, precio: p, desde: reg.desde, quien: reg.quien,
          pct: antes ? ((p - antes) / antes) * 100 : null });
        this._guardarHistPrecios();
      }
      try { localStorage.setItem(this.PRECIOS_KEY, JSON.stringify(lista)); } catch {}
      return reg;
    },

    // ---- El historial de precios ------------------------------------------
    // La lista se toca cada dos o tres meses. Lo que interesa no es el precio
    // de hoy sino cuánto se movió: eso es lo que se come el margen sin que
    // nadie lo vea, mueble por mueble.
    HIST_PRECIOS_KEY: 'bh_hist_precios',
    historialPrecios() {
      if (this._histP) return this._histP;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.HIST_PRECIOS_KEY)) || []; } catch {}
      this._histP = g;
      return g;
    },
    _guardarHistPrecios() {
      try { localStorage.setItem(this.HIST_PRECIOS_KEY, JSON.stringify(this._histP || [])); } catch {}
    },
    // Los cambios de un mueble en un taller, del más nuevo al más viejo.
    cambiosDePrecio(provId, varianteId) {
      return this.historialPrecios()
        .filter(x => x.provId === Number(provId) && x.varianteId === Number(varianteId))
        .sort((a, b) => (this.diasDesde(a.desde) || 0) - (this.diasDesde(b.desde) || 0));
    },
    // El aumento que pasó un proveedor. Casi siempre es parejo —"todo un 12%
    // más"— pero de vez en cuando sube sólo un tipo de mueble, así que se
    // puede acotar a una categoría o a un mueble suelto.
    aumentarProveedor(provId, pct, { categoriaId = null, varianteId = null,
      quien = '' } = {}) {
      const p = Number(pct) || 0;
      if (!p) return 0;
      let suyos = this.listaPrecios().filter(x => x.provId === Number(provId));
      if (varianteId != null) {
        suyos = suyos.filter(x => x.varianteId === Number(varianteId));
      } else if (categoriaId != null) {
        suyos = suyos.filter(x => {
          const prod = this.productoDeVariante(x.varianteId);
          return prod && prod.categoria_id === Number(categoriaId);
        });
      }
      suyos.forEach(x => this.guardarPrecioProveedor(provId, x.varianteId,
        Math.round((Number(x.precio) || 0) * (1 + p / 100)), quien));
      return suyos.length;
    },
    // Las categorías en las que ese taller tiene precios: son las únicas a
    // las que tiene sentido aplicarle un aumento acotado.
    categoriasDeProveedor(provId) {
      const ids = {};
      this.listaPrecios().filter(x => x.provId === Number(provId)).forEach(x => {
        const p = this.productoDeVariante(x.varianteId);
        if (p) ids[p.categoria_id] = (ids[p.categoria_id] || 0) + 1;
      });
      return Object.keys(ids).map(id => {
        const c = DEMO.categorias.find(x => x.id === Number(id));
        return { id: Number(id), nombre: c ? c.nombre : `#${id}`, n: ids[id] };
      }).sort((a, b) => b.n - a.n);
    },

    // ---- Lo que le vendemos al proveedor -----------------------------------
    // Jony le entrega correderas, placas, paraíso, y eso baja lo que le
    // debemos. No a todos se les vende al mismo precio, así que cada taller
    // tiene su propia lista. El insumo sale del catálogo de INSUMOS.
    VENTA_KEY: 'bh_venta_materiales',
    listaMateriales() {
      if (this._vmat) return this._vmat;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.VENTA_KEY)) || []; } catch {}
      this._vmat = g;
      if (!g.length) this._sembrarMateriales();
      return this._vmat;
    },
    _guardarMateriales() {
      try { localStorage.setItem(this.VENTA_KEY, JSON.stringify(this._vmat || [])); } catch {}
    },
    // Lo que le cobramos a ESE taller por ESE insumo. Si nunca se le vendió,
    // se usa lo que nos costó a nosotros y se avisa que es una estimación.
    precioMaterial(provId, insumoK) {
      const x = this.listaMateriales().find(y => y.provId === Number(provId)
        && y.insumo === insumoK);
      if (x) return { precio: Number(x.precio) || 0, desde: x.desde, estimado: false };
      const i = this.INSUMOS.find(y => y.k === insumoK);
      return { precio: i ? Number(i.precio) || 0 : 0, desde: '', estimado: true };
    },
    guardarPrecioMaterial(provId, insumoK, precio, quien = '') {
      const lista = this.listaMateriales();
      const i = lista.findIndex(x => x.provId === Number(provId) && x.insumo === insumoK);
      const reg = { provId: Number(provId), insumo: insumoK,
        precio: Number(precio) || 0, desde: this.hoyCorto(), quien: quien || 'yo' };
      if (i >= 0) lista[i] = reg; else lista.push(reg);
      this._guardarMateriales();
      return reg;
    },
    materialesDe(provId) {
      return this.INSUMOS.map(i => ({ ...i, ...this.precioMaterial(provId, i.k) }));
    },
    // Venderle materiales: anota la venta en la cuenta y deja el detalle de
    // qué se llevó, que es lo que después se discute.
    venderMateriales(provId, lineas, quien = '') {
      const det = lineas.filter(l => Number(l.cantidad) > 0).map(l => {
        const i = this.INSUMOS.find(x => x.k === l.insumo) || {};
        const pu = Number(l.precio) || this.precioMaterial(provId, l.insumo).precio;
        return { insumo: l.insumo, label: i.nombre || l.insumo, unidad: i.unidad || '',
          cantidad: Number(l.cantidad), precio: pu, total: Math.round(pu * Number(l.cantidad)) };
      });
      if (!det.length) return null;
      const total = det.reduce((a, x) => a + x.total, 0);
      const mov = this.anotarCuenta({ provId, tipo: 'materiales', monto: total,
        detalle: det.map(x => `${x.cantidad} ${x.label}`).join(' · '), quien });
      if (mov) mov.lineas = det;
      this._guardarCta();
      return mov;
    },
    _sembrarMateriales() {
      this._vmat = [];
      // A cada taller se le vende con su propio recargo sobre lo que nos costó.
      this.proveedores().forEach((p, i) => {
        const recargo = 1.12 + (p.id % 4) * 0.05;
        this.INSUMOS.slice(0, 6 + (p.id % 4)).forEach(ins => {
          this.guardarPrecioMaterial(p.id, ins.k,
            Math.round((Number(ins.precio) || 0) * recargo / 100) * 100, 'Jony');
        });
      });
    },
    // El último aumento que pasó un taller. No el promedio de toda su
    // historia: eso mezcla el aumento de marzo con el de julio y no dice
    // nada. Lo que interesa es la última vez que tocó la lista.
    aumentoDe(provId) {
      const cs = this.historialPrecios().filter(x => x.provId === Number(provId) && x.antes > 0);
      if (!cs.length) return null;
      // El más reciente manda, y con él van todos los del mismo día: un
      // aumento se pasa de una, no mueble por mueble.
      let dMin = Infinity, fecha = '';
      cs.forEach(x => { const d = this.diasDesde(x.desde);
        if (d != null && d < dMin) { dMin = d; fecha = x.desde; } });
      const tanda = cs.filter(x => x.desde === fecha);
      return { n: tanda.length, fecha,
        pct: tanda.reduce((a, x) => a + (x.pct || 0), 0) / tanda.length,
        ultimo: fecha, dias: dMin === Infinity ? null : dMin,
        veces: [...new Set(cs.map(x => x.desde))].length };
    },
    // Conformar cierra la recepción para Compras: los precios quedan firmes y
    // de ahí sale lo que hay que pagarle al taller.
    conformarRecepcion(num, { lineas = [], quien = '' } = {}) {
      const r = this.recepcion(num); if (!r) return null;
      lineas.forEach(l => {
        const it = r.items.find(x => x.unidadId === l.unidadId);
        if (it) {
          it.precio = Number(l.precio) || 0;
          it.motivo = l.motivo || '';
          // El descuento se guarda aparte del precio: hace falta poder
          // decirle al taller "tenías que traer un millón, trajiste 900,
          // los 100 los perdiste en descuentos".
          if (l.descuento) {
            it.lista = Number(l.lista) || it.lista || 0;
            it.descuento = Number(l.descuento) || 0;
            it.descuentoMotivo = l.descuentoMotivo || '';
          }
        }
        if (l.aLista) this.guardarPrecioProveedor(r.provId, l.varianteId, l.precio, quien);
      });
      r.estadoCompras = 'conformada';
      r.conformadaPor = quien || 'yo';
      r.conformadaEl = this.hoyCorto();
      r.total = r.items.reduce((a, x) => a + (Number(x.precio) || 0), 0);
      // Conformar ES la deuda: no hay un paso más. Apenas Adrián recibe y
      // Jony da el visto, esa plata ya está para pagarse.
      const t = this.totalDeEntrega(r);
      this.anotarCuenta({ provId: r.provId, tipo: 'compra', monto: t.total,
        detalle: `${r.items.length} muebles`
          + (t.iva ? ` · IVA ${(r.comprobante || {}).iva}%` : '')
          + (t.flete ? ' · con flete' : ''),
        ref: r.numero, fecha: r.conformadaEl, quien: quien || 'yo' });
      return r;
    },
    // ---- Lo que Compras tiene sobre la mesa --------------------------------
    // Todo lo que está esperando una decisión, junto: entregas que Adrián
    // registró y nadie conformó, compras de insumos que se mandaron y no
    // llegaron, y muebles que se compran a ciegas porque nunca se les puso
    // precio.
    comprasPendientes() {
      const recs = this.aConformar();
      const ocs = this.ordenesCompra().filter(o => o.estado === 'enviada');
      const vistos = {};
      const sinPrecio = [], soloCosteo = [];
      this.unidadesTodas().forEach(u => {
        if (!u.provId || !u.varianteId) return;
        const k = `${u.provId}|${u.varianteId}`;
        if (vistos[k]) return;
        vistos[k] = 1;
        const p = this.precioProveedor(u.provId, u.varianteId);
        if (!p.estimado) return;
        const fila = { provId: u.provId, proveedor: this.provLabel(u.provId),
          varianteId: u.varianteId, modelo: u.modelo, medida: u.medida,
          color: u.color, origen: p.origen, precio: p.precio };
        // Sin precio de verdad es no tener nada: si Costeo lo cubre, el
        // número sirve, sólo falta que ese taller diga el suyo.
        if (p.origen === 'catalogo') sinPrecio.push(fila); else soloCosteo.push(fila);
      });
      return { recs, ocs, sinPrecio, soloCosteo };
    },

    // ---- El historial ------------------------------------------------------
    // Todo lo comprado en una sola lista, sin importar si fueron muebles o
    // insumos: son dos circuitos distintos pero una sola plata.
    historialCompras() {
      const filas = [];
      this.recepciones().filter(r => r.estadoCompras === 'conformada').forEach(r => {
        const flete = r.flete && r.flete.modo === 'compra' ? Number(r.flete.monto) || 0 : 0;
        filas.push({ tipo: 'muebles', numero: r.numero, fecha: r.conformadaEl || r.fecha,
          provId: r.provId, proveedor: r.proveedor, detalle: `${r.items.length} muebles`,
          cantidad: r.items.length, total: (Number(r.total) || 0) + flete,
          flete, quien: r.conformadaPor || '', ref: r.numero });
      });
      this.ordenesCompra().filter(o => o.estado === 'recibida').forEach(o => {
        filas.push({ tipo: 'insumos', numero: o.numero, fecha: o.recibidaEl || o.entrega,
          provId: null, proveedor: o.proveedor,
          detalle: `${o.items.length} insumos`, cantidad: o.items.length,
          total: this.totalOC(o), flete: 0, quien: o.recibidaPor || '', ref: o.numero });
      });
      return filas.sort((a, b) => (this.diasDesde(a.fecha) || 0) - (this.diasDesde(b.fecha) || 0));
    },

    // ---- Los números -------------------------------------------------------
    // Cuánto se compró, a quién y cómo se movió el costo. Todo sale del
    // historial: no hay un número cargado a mano en ningún lado.
    indicadoresCompras() {
      const h = this.historialCompras();
      const total = h.reduce((a, x) => a + x.total, 0);
      const muebles = h.filter(x => x.tipo === 'muebles');
      const insumos = h.filter(x => x.tipo === 'insumos');
      const flete = h.reduce((a, x) => a + x.flete, 0);
      const piezas = muebles.reduce((a, x) => a + x.cantidad, 0);
      const porMes = {};
      h.forEach(x => {
        const m = String(x.fecha || '').split('/')[1] || '?';
        (porMes[m] = porMes[m] || { mes: m, total: 0, n: 0 });
        porMes[m].total += x.total; porMes[m].n++;
      });
      const porProv = {};
      muebles.forEach(x => {
        const k = x.provId || 0;
        (porProv[k] = porProv[k] || { provId: k, proveedor: x.proveedor,
          total: 0, piezas: 0, entregas: 0 });
        porProv[k].total += x.total; porProv[k].piezas += x.cantidad; porProv[k].entregas++;
      });
      const meses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      return {
        total, flete, piezas,
        muebles: muebles.reduce((a, x) => a + x.total, 0),
        insumos: insumos.reduce((a, x) => a + x.total, 0),
        promedio: piezas ? Math.round(muebles.reduce((a, x) => a + x.total, 0) / piezas) : 0,
        porMes: Object.values(porMes).sort((a, b) => meses.indexOf(a.mes) - meses.indexOf(b.mes)),
        porProv: Object.values(porProv).sort((a, b) => b.total - a.total),
      };
    },

    // ---- La ficha del proveedor -------------------------------------------
    // Todo lo que se sabe de uno: qué le compramos, cuánto, cómo llegó y a
    // qué precio nos deja cada mueble.
    fichaProveedor(id) {
      const p = this.proveedor(id); if (!p) return null;
      const recs = this.recepciones().filter(r => r.provId === p.id);
      const conf = recs.filter(r => r.estadoCompras === 'conformada');
      const items = conf.flatMap(r => r.items);
      const conDetalle = items.filter(x => x.calidad && x.calidad !== 'perfecto').length;
      const enFabrica = this.aFabricar().filter(u => u.provId === p.id);
      const atrasados = enFabrica.filter(u => this.vencida(u)).length;
      const precios = this.listaPrecios().filter(x => x.provId === p.id);
      // Cuánto trae por mes: la cuenta que importa para saber si un taller
      // puede con más trabajo o si ya está al límite.
      const meses = [...new Set(conf.map(r => String(r.conformadaEl || r.fecha).split('/')[1]))];
      const porMes = meses.length ? Math.round(items.length / meses.length) : 0;
      const devueltos = this.devoluciones().filter(d => d.provId === p.id);
      return {
        prov: p, recepciones: recs, conformadas: conf.length,
        piezas: items.length, conDetalle,
        perfectos: items.filter(x => !x.calidad || x.calidad === 'perfecto').length,
        devueltos: devueltos.length,
        debeTraer: this.devolucionesPendientes(p.id),
        total: conf.reduce((a, r) => a + this.totalDeEntrega(r).total, 0),
        ultima: recs.length ? recs[0].fecha : '',
        enFabrica: enFabrica.length, atrasados, precios,
        aConformar: recs.filter(r => r.estadoCompras === 'pendiente').length,
        porMes, meses: meses.length,
        porSemana: meses.length ? Math.round((items.length / meses.length) / 4.3) : 0,
        saldo: this.saldoProveedor(p.id),
        movimientos: this.movimientosDe(p.id),
        reprogramaciones: this.reprogramacionesDe(p.id),
        proxima: this.agenda().find(x => x.provId === p.id && x.estado === 'reservado') || null,
        aumento: this.aumentoDe(p.id),
      };
    },

    // ---- El comparador -----------------------------------------------------
    // El mismo mueble, lo que cobra cada uno. Al lado, la lista de Costeo,
    // que es la referencia contra la que se mira si alguno se fue de precio.
    compararVariante(varianteId) {
      const c = this.costeoDe(varianteId);
      const filas = this.listaPrecios().filter(x => x.varianteId === Number(varianteId))
        .map(x => {
          const p = this.proveedor(x.provId);
          return { provId: x.provId, proveedor: p ? this.provLabel(p.id) : `#${x.provId}`,
            rubro: p ? p.rubro : '', precio: Number(x.precio) || 0, desde: x.desde,
            dif: c ? (Number(x.precio) || 0) - c.costo : null };
        }).sort((a, b) => a.precio - b.precio);
      return { costeo: c, filas,
        mejor: filas.length ? filas[0] : null,
        peor: filas.length ? filas[filas.length - 1] : null };
    },
    // Las variantes que tienen precio de más de un taller: son las únicas que
    // se pueden comparar de verdad.
    variantesComparables() {
      const por = {};
      this.listaPrecios().forEach(x => {
        (por[x.varianteId] = por[x.varianteId] || []).push(x);
      });
      return Object.keys(por).map(Number).filter(vid => por[vid].length > 1);
    },

    // ---- El comprobante de la entrega -------------------------------------
    // La mayoría de las compras son informales: el taller trae los muebles y
    // un papel escrito a mano. Las que sí facturan hay que cargarlas como
    // corresponde —IVA aparte, impuestos aparte— porque de eso sale lo que
    // después se puede computar.
    TIPOS_COMPROBANTE: [
      { k: 'sin', label: 'Sin comprobante', pill: 'soft',
        pie: 'Informal. Es lo habitual: trae el papel escrito a mano.' },
      { k: 'remito', label: 'Remito', pill: 'soft',
        pie: 'El papel que trae con lo que entregó, sin factura.' },
      { k: 'factura', label: 'Factura', pill: 'ok',
        pie: 'Compra formal. Se carga el IVA y los impuestos aparte.' },
    ],
    comprobante(k) { return this.TIPOS_COMPROBANTE.find(x => x.k === k) || this.TIPOS_COMPROBANTE[0]; },
    ALICUOTAS_IVA: [0, 10.5, 21],
    guardarComprobante(num, { tipo = 'sin', nro = '', iva = 21, otros = 0,
      forma = '', quien = '' } = {}) {
      const r = this.recepcion(num); if (!r) return null;
      r.comprobante = { tipo, nro, iva: tipo === 'factura' ? Number(iva) || 0 : 0,
        otros: tipo === 'factura' ? Number(otros) || 0 : 0,
        forma, quien: quien || 'yo', el: this.hoyCorto() };
      return r.comprobante;
    },
    // Cuánto se le descontó en esa entrega y por qué. Es lo que Jony le
    // muestra al carpintero cuando le paga menos de lo que él esperaba.
    descuentosDe(r) {
      const ls = (r && r.items || []).filter(x => x.descuento);
      return { total: ls.reduce((a, x) => a + (Number(x.descuento) || 0), 0),
        lineas: ls,
        deberia: (r && r.items || []).reduce((a, x) =>
          a + (Number(x.lista) || Number(x.precio) || 0), 0) };
    },

    // Lo que se paga de verdad: los muebles, más el IVA y los impuestos si la
    // compra fue formal, más el flete si se decidió meterlo adentro.
    totalDeEntrega(r) {
      if (!r) return { neto: 0, iva: 0, otros: 0, flete: 0, total: 0 };
      const neto = Number(r.total) || r.items.reduce((a, x) => a + (Number(x.precio) || 0), 0);
      const c = r.comprobante || {};
      const iva = c.tipo === 'factura' ? Math.round(neto * (Number(c.iva) || 0) / 100) : 0;
      const otros = c.tipo === 'factura' ? Number(c.otros) || 0 : 0;
      const flete = (r.flete || {}).modo === 'compra' ? Number(r.flete.monto) || 0 : 0;
      return { neto, iva, otros, flete, total: neto + iva + otros + flete };
    },

    // ---- Devoluciones ------------------------------------------------------
    // Hay dos maneras de devolver y no son la misma cosa. Si el mueble se
    // devuelve en el momento, sencillamente no se cuenta: no entró y no se
    // paga, la próxima lo trae. Si se devuelve después —a la semana, cuando
    // ya se pagó— queda una deuda del taller con nosotros: ese mueble está
    // pago y nos lo tiene que traer.
    DEVOL_KEY: 'bh_devoluciones',
    MOMENTOS_DEVOL: [
      { k: 'entrega', label: 'En el momento', pill: 'soft',
        pie: 'No entró y no se paga. La próxima lo trae.' },
      { k: 'despues', label: 'Después de pagarlo', pill: 'crit',
        pie: 'Ya está pago: queda como mueble que nos debe traer.' },
    ],
    devoluciones() {
      if (this._devol) return this._devol;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.DEVOL_KEY)) || []; } catch {}
      this._devol = g;
      return g;
    },
    _guardarDevol() {
      try { localStorage.setItem(this.DEVOL_KEY, JSON.stringify(this._devol || [])); } catch {}
    },
    devolverMueble(unidadId, { momento = 'entrega', motivo = '', quien = '' } = {}) {
      const u = this.unidad(unidadId); if (!u) return null;
      const ds = this.devoluciones();
      const d = { id: ds.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1,
        unidadId: u.id, provId: u.provId || null, proveedor: u.proveedor || '',
        varianteId: u.varianteId, modelo: u.modelo, medida: u.medida, color: u.color,
        serie: u.serie, momento, motivo, fecha: this.hoyCorto(),
        quien: quien || 'yo', estado: 'pendiente' };
      ds.push(d);
      this._guardarDevol();
      this.guardarUnidad({ id: u.id, calidad: 'devuelto', calidadNota: motivo });
      return d;
    },
    // Los que ya se pagaron y todavía no volvieron: eso es lo que se le
    // reclama al taller cuando viene.
    devolucionesPendientes(provId) {
      return this.devoluciones().filter(d => d.estado === 'pendiente'
        && d.momento === 'despues'
        && (provId == null || d.provId === Number(provId)));
    },
    // El mueble que no vuelve se descuenta de la cuenta. Si el taller
    // reaparece con él, se le vuelve a pagar: por eso no se borra, cambia
    // de estado y queda a la vista.
    descontarDevolucion(id, monto, quien = '') {
      const d = this.devoluciones().find(x => x.id === Number(id)); if (!d) return null;
      const p = monto != null ? Number(monto)
        : this.precioProveedor(d.provId, d.varianteId).precio;
      this.anotarCuenta({ provId: d.provId, tipo: 'descuento', monto: p,
        detalle: `${d.modelo || 'mueble'} devuelto y no repuesto${
          d.serie ? ` · ${d.serie}` : ''}`,
        ref: d.serie || '', quien: quien || 'yo' });
      d.estado = 'descontado';
      d.descontadoEl = this.hoyCorto();
      d.descontadoPor = quien || 'yo';
      d.montoDescontado = p;
      this._guardarDevol();
      return d;
    },
    // Cuánto hace que se lo llevó. Es el número que hay que gritar: a la
    // primera entrega ya tiene que aparecer, y si vuelve a venir sin traerlo
    // aparece más fuerte.
    diasDeDevolucion(d) { return this.diasDesde(d.fecha); },
    // Las que hay que reclamarle al taller que está enfrente ahora mismo,
    // ya sea porque nunca las trajo o porque ya se le descontaron.
    reclamosA(provId) {
      return this.devoluciones().filter(d => d.provId === Number(provId)
        && (d.estado === 'pendiente' || d.estado === 'descontado')
        && d.momento === 'despues')
        .map(d => ({ ...d, dias: this.diasDeDevolucion(d) }))
        .sort((a, b) => (b.dias || 0) - (a.dias || 0));
    },
    saldarDevolucion(id, quien = '') {
      const d = this.devoluciones().find(x => x.id === Number(id)); if (!d) return null;
      // Si ya se lo habíamos descontado, al traerlo hay que volver a pagárselo.
      if (d.estado === 'descontado' && d.montoDescontado) {
        this.anotarCuenta({ provId: d.provId, tipo: 'compra', monto: d.montoDescontado,
          detalle: `${d.modelo || 'mueble'} repuesto — se le había descontado`,
          ref: d.serie || '', quien: quien || 'yo' });
      }
      d.estado = 'repuesto'; d.repuestoEl = this.hoyCorto(); d.repuestoPor = quien || 'yo';
      this._guardarDevol();
      return d;
    },

    // ---- La agenda de entregas ---------------------------------------------
    // Cada taller llega con cuarenta o cincuenta muebles y el depósito no da
    // para dos en el mismo día. Por eso el día se reserva: el proveedor avisa
    // cuándo viene y ese día queda tomado.
    AGENDA_KEY: 'bh_agenda_entregas',
    agenda() {
      if (this._agenda) return this._agenda;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.AGENDA_KEY)) || []; } catch {}
      this._agenda = g;
      if (!g.length) this._sembrarAgenda();
      return this._agenda;
    },
    _guardarAgenda() {
      try { localStorage.setItem(this.AGENDA_KEY, JSON.stringify(this._agenda || [])); } catch {}
    },
    // Entran dos por día, pero no a la misma hora: uno bien temprano y el
    // otro después del mediodía. Un solo taller puede venir cuando quiera
    // mientras llegue antes de las tres.
    FRANJAS: [
      { k: 'manana', label: 'A la mañana', pie: 'Temprano, antes del mediodía.' },
      { k: 'tarde', label: 'A la tarde', pie: 'Después del mediodía, antes de las tres.' },
    ],
    franja(k) { return this.FRANJAS.find(x => x.k === k) || this.FRANJAS[0]; },
    // Cuántos muebles se pueden bajar en una jornada. Más que esto no entra
    // aunque los dos talleres se porten bien.
    TOPE_DIA: 70,
    // Todos los que tienen tomado un día. Puede haber dos.
    delDia(fecha) {
      return this.agenda().filter(x => x.fecha === fecha && x.estado === 'reservado');
    },
    // El primero del día, para lo que necesita uno solo.
    diaTomado(fecha) { return this.delDia(fecha)[0] || null; },
    // Cómo viene ese día: cuántos vienen, cuántos muebles y si se pasa.
    cargaDelDia(fecha) {
      const hs = this.delDia(fecha);
      const muebles = hs.reduce((a, x) => a + (Number(x.muebles) || 0), 0);
      return { visitas: hs.length, muebles, tope: this.TOPE_DIA,
        pasado: muebles > this.TOPE_DIA, lleno: hs.length >= 2 };
    },
    reservarDia(provId, fecha, { muebles = 0, nota = '', franja = '', quien = '',
      forzar = false } = {}) {
      const ag = this.agenda();
      const hs = this.delDia(fecha);
      const mio = hs.find(x => x.provId === Number(provId));
      if (mio) {
        mio.muebles = Number(muebles) || mio.muebles;
        mio.nota = nota || mio.nota;
        if (franja) mio.franja = franja;
        this._guardarAgenda();
        return mio;
      }
      // Tres talleres el mismo día no entran de ninguna manera.
      if (hs.length >= 2) {
        return { error: `El ${fecha} ya tiene dos: ${hs.map(x => x.proveedor).join(' y ')}` };
      }
      // El segundo se puede, pero no en la misma franja y avisando.
      const libre = franja || (hs.length ? (hs[0].franja === 'manana' ? 'tarde' : 'manana') : 'manana');
      if (hs.length && hs[0].franja === libre) {
        return { error: `${hs[0].proveedor} ya viene ${this.franja(libre).label.toLowerCase()}` };
      }
      const total = hs.reduce((a, x) => a + (Number(x.muebles) || 0), 0) + (Number(muebles) || 0);
      if (hs.length && total > this.TOPE_DIA && !forzar) {
        return { aviso: `Serían ${total} muebles en un día y el tope son ${this.TOPE_DIA}`,
          total, otro: hs[0] };
      }
      const r = { id: ag.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1,
        provId: Number(provId), proveedor: this.provLabel(provId), fecha,
        muebles: Number(muebles) || 0, nota, franja: libre, estado: 'reservado',
        quien: quien || 'yo', reprogramada: 0,
        forzado: !!(hs.length && total > this.TOPE_DIA) };
      ag.push(r);
      this._guardarAgenda();
      return r;
    },
    // El taller que cayó sin avisar: se anota igual, como vino.
    anotarQueVino(provId, { muebles = 0, quien = '' } = {}) {
      const hoy = this.hoyCorto();
      const r = this.reservarDia(provId, hoy, { muebles, nota: 'vino sin avisar',
        quien, forzar: true });
      if (r && r.error) {
        // Aunque el día esté lleno, si vino, vino. Queda anotado igual.
        const ag = this.agenda();
        const x = { id: ag.reduce((m, y) => Math.max(m, y.id || 0), 0) + 1,
          provId: Number(provId), proveedor: this.provLabel(provId), fecha: hoy,
          muebles: Number(muebles) || 0, nota: 'vino sin avisar', franja: 'tarde',
          estado: 'reservado', quien: quien || 'yo', reprogramada: 0, forzado: true };
        ag.push(x); this._guardarAgenda();
        return x;
      }
      return r;
    },
    // Reprogramar no borra: se anota, porque el taller que corre la fecha
    // tres veces por mes es un dato y no un accidente.
    reprogramar(id, nuevaFecha, { motivo = '', quien = '' } = {}) {
      const r = this.agenda().find(x => x.id === Number(id)); if (!r) return null;
      const ya = this.diaTomado(nuevaFecha);
      if (ya && ya.id !== r.id) return { error: `Ese día ya lo tiene ${ya.proveedor}` };
      (r.corridas = r.corridas || []).push({ era: r.fecha, motivo, quien: quien || 'yo',
        el: this.hoyCorto() });
      r.fecha = nuevaFecha;
      r.reprogramada = (r.reprogramada || 0) + 1;
      this._guardarAgenda();
      return r;
    },
    liberarDia(id) {
      const r = this.agenda().find(x => x.id === Number(id)); if (!r) return null;
      r.estado = 'libre';
      this._guardarAgenda();
      return r;
    },
    reprogramacionesDe(provId) {
      return this.agenda().filter(x => x.provId === Number(provId))
        .reduce((a, x) => a + (x.reprogramada || 0), 0);
    },
    // Las próximas visitas, que es lo que hay que tener a mano.
    proximasEntregas(n = 8) {
      return this.agenda().filter(x => x.estado === 'reservado')
        .map(x => ({ ...x, faltan: this.diasHasta(x.fecha) }))
        .filter(x => x.faltan == null || x.faltan >= 0)
        .sort((a, b) => (a.faltan == null ? 999 : a.faltan) - (b.faltan == null ? 999 : b.faltan))
        .slice(0, n);
    },
    _sembrarAgenda() {
      this._agenda = [];
      const provs = this.proveedores().filter(p => p.rubro === 'carpinteria');
      // Un taller por día hábil, empezando la semana que viene.
      let dia = 1;
      provs.forEach((p, i) => {
        const f = this.sumarDias(this.hoyCorto(), dia);
        this.reservarDia(p.id, f, { muebles: 38 + (p.id * 5) % 18,
          nota: i % 3 === 0 ? 'trae los del pedido cerrado' : '',
          franja: 'manana', quien: 'Jony' });
        dia += (i % 2) ? 2 : 1;
      });
      // Uno que ya corrió la fecha dos veces: pasa y hay que verlo.
      const r = this._agenda[1];
      if (r) {
        // Se corre a días que nadie tomó: si cayera sobre otro taller la
        // reprogramación se rechaza y el ejemplo no se vería.
        const libre = n => { let f = this.sumarDias(r.fecha, n);
          while (this.diaTomado(f)) f = this.sumarDias(f, 1); return f; };
        this.reprogramar(r.id, libre(6), { motivo: 'no llegó con la laca', quien: 'Jony' });
        this.reprogramar(r.id, libre(4), { motivo: 'se le rompió la camioneta', quien: 'Jony' });
      }
    },


    // ---- Los gastos --------------------------------------------------------
    // La estructura sale de la planilla con la que se lleva el número hoy:
    // los mismos rubros y los mismos conceptos, para que lo que se cargue acá
    // se pueda comparar con lo de siempre. Lo único que cambia es cuándo se
    // carga: en vez de una vez por mes, el día que pasa.
    GRUPOS_GASTO: [
      { k: 'inmuebles', label: 'Inmuebles', pie: 'Amortización, servicios, seguridad y seguros.' },
      { k: 'sueldos', label: 'Sueldos', pie: 'Operarios, administración, marketing, vendedores y cargas.' },
      { k: 'marketing', label: 'Marketing', pie: 'Pauta y gente de afuera.' },
      { k: 'generales', label: 'Gastos generales', pie: 'Limpieza, logística, mantenimiento, asesorías.' },
      { k: 'impuestos', label: 'Impuestos', pie: 'IIBB, IVA, ganancias y aportes.' },
    ],
    grupoGasto(k) { return this.GRUPOS_GASTO.find(x => x.k === k) || null; },
    RUBROS_GASTO: [
      { k: 'amortizacion', grupo: 'inmuebles', label: "Amortizacion",
        conceptos: ["Belgrano 2299 Amort.", "Belgrano 2020 Amort,", "Zavaleta 699 Amort."] },
      { k: 'servicios', grupo: 'inmuebles', label: "Servicios",
        conceptos: ["Belgrano 2299 ABL", "Belgrano 2020 ABL", "Zavaleta 699 ABL", "Belgrano 2299 AySA", "Belgrano 2020 AySa", "Zavaleta 699 AySA", "Belgrano 2299 EDESUR", "Zavaleta 699 EDESUR", "Belgrano 2020 Edesur", "Belgrano 2299 TE (TE+Internet)", "Belgrano 2020 TE (TE+Internet)", "Zavaleta 699 TE (TE+Internet)", "Zavaleta 699 MetroGas"] },
      { k: 'seguridad', grupo: 'inmuebles', label: "Seguridad",
        conceptos: ["Zavaleta Seguridad", "Zavaleta Alarmas"] },
      { k: 'seguros', grupo: 'inmuebles', label: "Seguros",
        conceptos: ["seguro belgrano 2160", "seguro belgrano 2299", "Seguro Zavaleta 699", "Seguros autos", "Seguro moto LA CAJA"] },
      { k: 'operarios', grupo: 'sueldos', label: "Operarios",
        conceptos: ["Mario", "Edgar", "Pëdro", "Andrew", "otros", "Seba"] },
      { k: 'sueldos-administrativos', grupo: 'sueldos', label: "Sueldos Administrativos",
        conceptos: ["Iara", "Cinthia", "Agus-lucas", "Adrian"] },
      { k: 'sueldos-marketing', grupo: 'sueldos', label: "Sueldos Marketing",
        conceptos: ["Ari", "Nicki", "Lunier"] },
      { k: 'sueldos-vendedores', grupo: 'sueldos', label: "Sueldos Vendedores",
        conceptos: ["Sergio", "Cristian", "Nati", "Ale"] },
      { k: 'sueldos-gerenciales', grupo: 'sueldos', label: "Sueldos Gerenciales",
        conceptos: ["Sueldos Gerenciales"] },
      { k: 'cargas-sociales', grupo: 'sueldos', label: "Cargas Sociales",
        conceptos: ["Cargas Sociales"] },
      { k: 'inversion-marketing', grupo: 'marketing', label: "Inversion Marketing",
        conceptos: ["Pinterest", "Facebook", "Perfit", "Google", "Live connect", "tienda nube web", "messi"] },
      { k: 'personas-externas-en-marketi', grupo: 'marketing', label: "Personas Externas En Marketing",
        conceptos: ["Otros", "Render (johan)", "Yoha diseño grafico", "Diseñador grafico (nico)"] },
      { k: 'gastos-generales', grupo: 'generales', label: "Gastos Generales",
        conceptos: ["Gastos administrativos", "Gastos de Limpieza", "Gastos de limpieza zavaleta", "Gastos Generales (hojas/toner/ lapiceras)", "Basurero fabrica", "Telefonia CLARO celulares", "Carpinteria", "matafuego generales", "grafica", "Mantenimiento", "Ascensor", "otros"] },
      { k: 'logistica', grupo: 'generales', label: "Logistica",
        conceptos: ["Nafta", "Patente oroch", "LOGISTICA", "Envios", "Patente cronos", "Patente citroen", "Patente versa"] },
      { k: 'legal-y-asesorias', grupo: 'generales', label: "Legal Y Asesorias",
        conceptos: ["Contadora", "Abogado"] },
      { k: 'impuestos', grupo: 'impuestos', label: "Impuestos",
        conceptos: ["Impuestos iibb", "Participaciones Accionarias", "OSECAC", "faecys", "SEC DEC Aportes sindicato de comercio", "SOEMCF", "USIMRA", "INACAP", "Aportes sindicales", "Impuesto ganancias", "Impuesto iva", "Impuestos de Linkestore TN"] },
    ],
    rubroGasto(k) { return this.RUBROS_GASTO.find(x => x.k === k) || null; },
    rubrosDeGrupo(g) { return this.RUBROS_GASTO.filter(x => x.grupo === g); },
    // Todos los conceptos sueltos, para el buscador de la pantalla de carga.
    conceptosGasto() {
      return this.RUBROS_GASTO.flatMap(r =>
        r.conceptos.map(c => ({ rubro: r.k, rubroLabel: r.label, grupo: r.grupo, concepto: c })));
    },

    GASTOS_KEY: 'bh_gastos',
    gastos() {
      if (this._gastos) return this._gastos;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.GASTOS_KEY)) || []; } catch {}
      this._gastos = g;
      if (!g.length) this._sembrarGastos();
      return this._gastos;
    },
    _guardarGastos() {
      try { localStorage.setItem(this.GASTOS_KEY, JSON.stringify(this._gastos || [])); } catch {}
    },
    // Cargar un gasto tiene que ser de tres toques: qué, cuánto, cómo se pagó.
    // Si es difícil, el gasto chico no se anota y el número deja de servir.
    cargarGasto({ rubro, concepto, monto, fecha = '', forma = 'efectivo',
      comprobante = '', quien = '', nota = '' } = {}) {
      const r = this.rubroGasto(rubro); if (!r) return null;
      const gs = this.gastos();
      const g = { id: gs.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1,
        rubro, grupo: r.grupo, concepto: concepto || r.label,
        monto: Math.abs(Number(monto) || 0), fecha: fecha || this.hoyCorto(),
        forma, comprobante, nota, quien: quien || 'yo', anulado: false };
      gs.unshift(g);
      this._guardarGastos();
      return g;
    },
    // Un gasto no se borra nunca: se anula con motivo y el original queda.
    anularGasto(id, motivo = '', quien = '') {
      const g = this.gastos().find(x => x.id === Number(id)); if (!g) return null;
      g.anulado = true; g.motivoAnulacion = motivo;
      g.anuladoPor = quien || 'yo'; g.anuladoEl = this.hoyCorto();
      this._guardarGastos();
      return g;
    },
    // El mes de una fecha "14/8". Sin año, como en toda la planilla.
    mesDe(fecha) { return Number(String(fecha || '').split('/')[1]) || 0; },
    gastosDeMes(mes) {
      return this.gastos().filter(g => !g.anulado && this.mesDe(g.fecha) === Number(mes));
    },
    // Los gastos del mes ordenados como la planilla: por grupo y por rubro.
    gastosPorGrupo(mes) {
      const gs = this.gastosDeMes(mes);
      return this.GRUPOS_GASTO.map(gr => {
        const suyos = gs.filter(x => x.grupo === gr.k);
        const rubros = {};
        suyos.forEach(x => { (rubros[x.rubro] = rubros[x.rubro] || []).push(x); });
        return { ...gr, total: suyos.reduce((a, x) => a + x.monto, 0), n: suyos.length,
          rubros: Object.keys(rubros).map(k => ({ k,
            label: (this.rubroGasto(k) || {}).label || k,
            total: rubros[k].reduce((a, x) => a + x.monto, 0),
            items: rubros[k] })) };
      }).filter(x => x.n > 0);
    },



    // ---- Compras de material ------------------------------------------------
    // La segunda etapa es llevar el stock de materiales: cuántas placas hay,
    // cuántas cajas de correderas quedan. Eso todavía no. Lo que sí hace falta
    // ya es poder anotar que se compró, porque en la planilla la materia prima
    // es un costo del mes y sin eso el número no cierra.
    //
    // Los rubros son los de la planilla, no los de una lista inventada.
    MATERIALES: [
      { k: 'placas', rubro: 'madera', label: 'Placas', unidad: 'placa' },
      { k: 'laca', rubro: 'laca', label: 'Laca', unidad: 'litro' },
      { k: 'herrajes', rubro: 'herrajes', label: 'Herrajes', unidad: 'unidad' },
      { k: 'correderas', rubro: 'herrajes', label: 'Correderas', unidad: 'par' },
      { k: 'tornillos', rubro: 'herrajes', label: 'Tornillos', unidad: 'caja' },
      { k: 'bisagras', rubro: 'herrajes', label: 'Bisagras', unidad: 'unidad' },
      { k: 'perfiles', rubro: 'herrajes', label: 'Perfiles', unidad: 'unidad' },
      { k: 'barrales', rubro: 'herrajes', label: 'Barrales', unidad: 'unidad' },
      { k: 'eles', rubro: 'herrajes', label: 'Eles', unidad: 'unidad' },
      { k: 'filos', rubro: 'filos', label: 'Filos', unidad: 'rollo' },
      { k: 'espejos', rubro: 'espejos', label: 'Espejos', unidad: 'unidad' },
      { k: 'adicionales', rubro: 'otros', label: 'Adicionales', unidad: '' },
      { k: 'otros', rubro: 'otros', label: 'Otros', unidad: '' },
    ],
    RUBROS_MATERIAL: [
      { k: 'madera', label: 'Madera' },
      { k: 'laca', label: 'Laca' },
      { k: 'herrajes', label: 'Herrajes' },
      { k: 'filos', label: 'Filos' },
      { k: 'espejos', label: 'Espejos' },
      { k: 'otros', label: 'Otros' },
    ],
    material(k) { return this.MATERIALES.find(x => x.k === k) || null; },
    rubroMaterial(k) { return this.RUBROS_MATERIAL.find(x => x.k === k) || null; },

    MAT_KEY: 'bh_compras_material',
    comprasMaterial() {
      if (this._cmat) return this._cmat;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.MAT_KEY)) || []; } catch {}
      this._cmat = g;
      if (!g.length) this._sembrarComprasMaterial();
      return this._cmat;
    },
    _guardarComprasMaterial() {
      try { localStorage.setItem(this.MAT_KEY, JSON.stringify(this._cmat || [])); } catch {}
    },
    // Anotar que se compró: qué, a quién, cuánto salió. La cantidad es
    // opcional porque muchas veces se compra "un viaje de placas" y lo que
    // importa es la plata, no el conteo.
    comprarMaterial({ material, proveedor = '', cantidad = 0, monto, fecha = '',
      forma = 'transferencia', comprobante = '', nota = '', quien = '' } = {}) {
      const m = this.material(material); if (!m) return null;
      const cs = this.comprasMaterial();
      const c = { id: cs.reduce((a, x) => Math.max(a, x.id || 0), 0) + 1,
        material, rubro: m.rubro, label: m.label, unidad: m.unidad,
        proveedor, cantidad: Number(cantidad) || 0,
        monto: Math.abs(Number(monto) || 0), fecha: fecha || this.hoyCorto(),
        forma, comprobante, nota, quien: quien || 'yo', anulado: false };
      cs.unshift(c);
      this._guardarComprasMaterial();
      return c;
    },
    anularCompraMaterial(id, motivo = '', quien = '') {
      const c = this.comprasMaterial().find(x => x.id === Number(id)); if (!c) return null;
      c.anulado = true; c.motivoAnulacion = motivo;
      c.anuladoPor = quien || 'yo'; c.anuladoEl = this.hoyCorto();
      this._guardarComprasMaterial();
      return c;
    },
    materialesDelMes(mes) {
      return this.comprasMaterial().filter(c => !c.anulado
        && this.mesDe(c.fecha) === Number(mes));
    },
    // Lo comprado en el mes agrupado como en la planilla: por rubro.
    materialPorRubro(mes) {
      const cs = this.materialesDelMes(mes);
      return this.RUBROS_MATERIAL.map(r => {
        const suyos = cs.filter(x => x.rubro === r.k);
        return { ...r, total: suyos.reduce((a, x) => a + x.monto, 0),
          n: suyos.length, items: suyos };
      }).filter(x => x.n > 0);
    },
    _sembrarComprasMaterial() {
      this._cmat = [];
      const mes = new Date().getMonth() + 1;
      const D = [
        ['placas', 'Maderera del Oeste', 40, 1680000, 2],
        ['correderas', 'Herrajes Vitale', 60, 408000, 3],
        ['laca', 'Pinturería Norte', 0, 620000, 5],
        ['bisagras', 'Herrajes Vitale', 200, 380000, 8],
        ['filos', 'Maderera del Oeste', 12, 240000, 12],
        ['espejos', 'Cristalería Sur', 8, 520000, 15],
      ];
      for (let atras = 0; atras < 4; atras++) {
        const mm = mes - atras > 0 ? mes - atras : 12 + (mes - atras);
        D.forEach(([k, p, c, m, d], i) => {
          const ruido = 1 + (((i + atras * 2) % 5) - 2) * 0.06;
          this.comprarMaterial({ material: k, proveedor: p, cantidad: c,
            monto: Math.round(m * ruido / 1000) * 1000,
            fecha: `${d}/${mm}`, forma: 'transferencia', quien: 'Jony' });
        });
      }
    },


    // ---- Comisiones del vendedor -------------------------------------------
    // El vendedor no carga su venta: la venta ya está en la boleta. De ahí
    // salen solos el número de pedido, el cliente, el local, el canal y cómo
    // pagó. Si Jony después anula la boleta o cambia un cobro de efectivo a
    // tarjeta, la comisión se acomoda sola — porque es la misma boleta, no
    // una copia.
    //
    // La base no es el total de la venta. Es lo que queda para la casa:
    //
    //   efectivo + transferencia/1,21 + crédito×0,65 − flete
    //
    // La transferencia se divide por el IVA porque va facturada, y el crédito
    // se castiga porque la tarjeta se lleva su parte.
    COMISION: {
      ivaDivisor: 1.21,
      creditoFactor: 0.65,
      pct: 2.5,          // % sobre la base, si el vendedor no tiene el suyo
    },
    // Cómo cae cada cobro en los tres baldes de la comisión.
    BALDES_COBRO: {
      efectivo: 'efectivo',
      transferencia: 'transferencia',
      deposito: 'transferencia',
      debito: 'transferencia',
      tarjeta: 'credito',
      credito: 'credito',
      cuotas: 'credito',
      cheque: 'transferencia',
      mercadopago: 'transferencia',
    },
    baldeDe(metodo) {
      const t = sinTilde(String(metodo || '')).replace(/[^a-z]/g, '');
      for (const k in this.BALDES_COBRO) if (t.includes(k)) return this.BALDES_COBRO[k];
      return 'efectivo';
    },
    // Una boleta cuenta para la comisión cuando la venta está confirmada. Una
    // venta a confirmar o anulada no le paga a nadie.
    cuentaParaComision(o) {
      return !!o && o.estado !== 'a_confirmar' && o.estado !== 'anulada'
        && o.situacion !== 'anulada';
    },
    // Lo que deja una boleta: los tres baldes, el flete y la base.
    baseDeComision(o) {
      const b = { efectivo: 0, transferencia: 0, credito: 0 };
      // Se mira cobro por cobro, no el campo "pago" de la boleta: una venta
      // puede tener la seña en efectivo y el saldo con tarjeta.
      const cs = o.cobros || [];
      if (cs.length) {
        cs.forEach(c => { b[this.baldeDe(c.metodo)] += Number(c.m) || 0; });
        // Lo que todavía no se cobró se proyecta con el método de la boleta.
        const cobrado = cs.reduce((a, c) => a + (Number(c.m) || 0), 0);
        const falta = Math.max(0, (Number(o.total) || 0) - cobrado);
        if (falta) b[this.baldeDe(o.pago)] += falta;
      } else {
        b[this.baldeDe(o.pago)] = Number(o.total) || 0;
      }
      const flete = Number((o.flete || {}).monto) || 0;
      const C = this.COMISION;
      const base = b.efectivo + (b.transferencia / C.ivaDivisor)
        + (b.credito * C.creditoFactor) - flete;
      return { ...b, flete, base: Math.max(0, Math.round(base)),
        total: Number(o.total) || 0, cobrado: cs.reduce((a, c) => a + (Number(c.m) || 0), 0) };
    },
    // El porcentaje de ese vendedor. Por ahora uno solo para todos; cuando
    // haya esquemas por persona sale de ahí.
    pctDe(vendedor) {
      const e = this.esquemaVendedor(vendedor);
      return e && e.pct != null ? Number(e.pct) : this.COMISION.pct;
    },
    comisionDe(o) {
      const b = this.baseDeComision(o);
      return Math.round(b.base * this.pctDe(o.vendedor) / 100);
    },
    // El mes que conviene abrir en comisiones: el último con boletas. El de
    // gastos puede ser otro, y abrir en un mes sin ventas confunde.
    ultimoMesConVentas() {
      const hoy = new Date().getMonth() + 1;
      for (let i = 0; i < 12; i++) {
        const m = hoy - i > 0 ? hoy - i : 12 + (hoy - i);
        if ((DEMO.ordenes || []).some(o => this.mesDe(o.fecha) === m)) return m;
      }
      return hoy;
    },
    // Las boletas de un vendedor en un mes, con lo que le deja cada una.
    ventasDeVendedor(vendedor, mes) {
      return (DEMO.ordenes || [])
        .filter(o => o.vendedor === vendedor)
        .filter(o => mes == null || this.mesDe(o.fecha) === Number(mes))
        .map(o => ({ o, ...this.baseDeComision(o),
          cuenta: this.cuentaParaComision(o),
          comision: this.cuentaParaComision(o) ? this.comisionDe(o) : 0 }))
        .sort((a, b) => (this.diasDesde(a.o.fecha) || 0) - (this.diasDesde(b.o.fecha) || 0));
    },
    // El mes del vendedor: cuánto vendió, cuánto le queda de comisión, y qué
    // está trabado esperando que alguien confirme.
    mesDelVendedor(vendedor, mes) {
      const vs = this.ventasDeVendedor(vendedor, mes);
      const firmes = vs.filter(x => x.cuenta);
      const trabadas = vs.filter(x => !x.cuenta);
      const base = firmes.reduce((a, x) => a + x.base, 0);
      const esq = this.esquemaVendedor(vendedor);
      const bono = this.bonoDe(base, esq);
      const fija = esq ? Number(esq.fija) || 0 : 0;
      const comision = firmes.reduce((a, x) => a + x.comision, 0);
      return { vendedor, mes: Number(mes), ventas: vs, firmes, trabadas,
        vendido: firmes.reduce((a, x) => a + x.total, 0),
        base, comision, pct: this.pctDe(vendedor),
        trabado: trabadas.reduce((a, x) => a + x.total, 0),
        fija, bono, esquema: esq,
        aCobrar: fija + comision + bono.monto };
    },

    // ---- El esquema de cada vendedor ----------------------------------------
    // Base fija, porcentaje propio si lo tiene, y las franjas de bono: al
    // pasar cierta venta, se suma un premio. Es lo que hace que el vendedor
    // sepa por qué le conviene empujar el mes.
    ESQ_KEY: 'bh_esquemas_vend',
    esquemas() {
      if (this._esq) return this._esq;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.ESQ_KEY)) || []; } catch {}
      this._esq = g;
      if (!g.length) this._sembrarEsquemas();
      return this._esq;
    },
    _guardarEsquemas() {
      try { localStorage.setItem(this.ESQ_KEY, JSON.stringify(this._esq || [])); } catch {}
    },
    esquemaVendedor(v) { return this.esquemas().find(e => e.vendedor === v) || null; },
    guardarEsquema(e) {
      const es = this.esquemas();
      const i = es.findIndex(x => x.vendedor === e.vendedor);
      if (i >= 0) es[i] = { ...es[i], ...e }; else es.push({ ...e });
      this._guardarEsquemas();
      return this.esquemaVendedor(e.vendedor);
    },
    // La franja que alcanzó y la que sigue: lo que falta para el próximo
    // premio es el número que mueve la aguja.
    bonoDe(base, esq) {
      const fs = ((esq && esq.franjas) || []).slice()
        .sort((a, b) => Number(a.desde) - Number(b.desde));
      let alcanzada = null, siguiente = null;
      fs.forEach(f => {
        if (base >= Number(f.desde)) alcanzada = f;
        else if (!siguiente) siguiente = f;
      });
      return { monto: alcanzada ? Number(alcanzada.monto) || 0 : 0,
        alcanzada, siguiente,
        falta: siguiente ? Math.max(0, Number(siguiente.desde) - base) : 0 };
    },
    _sembrarEsquemas() {
      this._esq = [];
      this.vendedores().forEach((v, i) => this.guardarEsquema({
        vendedor: v, fija: 340000 + i * 20000, pct: null,
        franjas: [
          { desde: 8000000, monto: 120000 },
          { desde: 14000000, monto: 260000 },
          { desde: 20000000, monto: 450000 },
        ] }));
    },

    // ---- El número económico -----------------------------------------------
    // Es la tabla que hoy se arma una vez por mes en la planilla:
    //
    //   VENTA − COSTOS − GASTOS − ADICIONALES = RESULTADO
    //
    // La diferencia es de dónde salen los números. La venta sale de las
    // boletas, el costo de los muebles sale de lo que Compras conformó, y los
    // gastos de lo que se fue cargando. Nadie los transcribe: el mes se va
    // armando solo mientras pasa.
    ADICIONAL_PCT: 1,
    LOCALES: [
      { k: '2020', label: 'Belgrano 2020' },
      { k: '2299', label: 'Belgrano 2299' },
      { k: 'home', label: 'Belgrano Home' },
      { k: 'tienda-nube', label: 'Tienda Nube' },
      { k: 'zavaleta', label: 'Zavaleta' },
    ],
    localDe(k) {
      const t = sinTilde(String(k || ''));
      return this.LOCALES.find(l => sinTilde(l.k) === t || sinTilde(l.label) === t)
        || { k: k || 'otro', label: k || 'Otro' };
    },
    // Lo vendido en un mes, abierto por local y por cómo pagaron —que es
    // exactamente como está en la planilla—.
    ventasDelMes(mes) {
      const os = (DEMO.ordenes || []).filter(o => this.mesDe(o.fecha) === Number(mes));
      const por = {};
      os.forEach(o => {
        const l = this.localDe(o.local);
        const tarjeta = /tarjeta|credito|cuota|debito/i.test(String(o.pago || ''));
        const b = (por[l.k] = por[l.k] || { local: l.k, label: l.label,
          efectivo: 0, tarjeta: 0, total: 0, ops: 0 });
        b[tarjeta ? 'tarjeta' : 'efectivo'] += Number(o.total) || 0;
        b.total += Number(o.total) || 0;
        b.ops++;
      });
      const filas = Object.values(por).sort((a, b) => b.total - a.total);
      const total = filas.reduce((a, x) => a + x.total, 0);
      const ops = filas.reduce((a, x) => a + x.ops, 0);
      return { filas, total, ops, ticket: ops ? Math.round(total / ops) : 0,
        efectivo: filas.reduce((a, x) => a + x.efectivo, 0),
        tarjeta: filas.reduce((a, x) => a + x.tarjeta, 0) };
    },
    // El costo del mes: los muebles que se conformaron y los insumos que
    // llegaron. Es lo mismo que en la planilla se carga como "producto
    // terminado" y "materia prima", pero sale solo de Compras.
    costosDelMes(mes) {
      const recs = this.recepciones().filter(r => r.estadoCompras === 'conformada'
        && this.mesDe(r.conformadaEl || r.fecha) === Number(mes));
      const porProv = {};
      recs.forEach(r => {
        const t = this.totalDeEntrega(r).total;
        const b = (porProv[r.provId] = porProv[r.provId] || { provId: r.provId,
          label: r.proveedor, total: 0, piezas: 0, entregas: 0 });
        b.total += t; b.piezas += r.items.length; b.entregas++;
      });
      const terminado = Object.values(porProv).sort((a, b) => b.total - a.total);
      // La materia prima sale de lo que se anotó como comprado. El stock —
      // cuántas placas quedan— es la segunda etapa; el costo es ahora.
      const prima = this.materialPorRubro(mes).map(r => ({ numero: r.k, label: r.label,
        total: r.total, items: r.n }));
      return { terminado, prima,
        totalTerminado: terminado.reduce((a, x) => a + x.total, 0),
        totalPrima: prima.reduce((a, x) => a + x.total, 0),
        total: terminado.reduce((a, x) => a + x.total, 0)
          + prima.reduce((a, x) => a + x.total, 0),
        piezas: terminado.reduce((a, x) => a + x.piezas, 0) };
    },
    // El mes entero, con la misma cuenta de la planilla.
    numeroEconomico(mes) {
      const v = this.ventasDelMes(mes);
      const c = this.costosDelMes(mes);
      const grupos = this.gastosPorGrupo(mes);
      const gastos = grupos.reduce((a, g) => a + g.total, 0);
      const adicionales = Math.round(c.total * this.ADICIONAL_PCT / 100);
      const total = v.total - c.total - gastos - adicionales;
      const egresos = c.total + gastos + adicionales;
      return { mes: Number(mes), venta: v, costos: c, grupos, gastos, adicionales,
        total, egresos,
        // El margen de la planilla es sobre el costo, no sobre la venta:
        // dice cuánto se ganó por cada peso que se gastó.
        margen: egresos ? (total / egresos) * 100 : 0,
        sobreVenta: v.total ? (total / v.total) * 100 : 0 };
    },
    // El mes que conviene mostrar al entrar: el último que tenga algo. Abrir
    // en un mes vacío hace pensar que el sistema no tiene datos.
    ultimoMesConDatos() {
      const hoy = new Date().getMonth() + 1;
      for (let i = 0; i < 12; i++) {
        const m = hoy - i > 0 ? hoy - i : 12 + (hoy - i);
        const n = this.numeroEconomico(m);
        if (n.venta.total || n.costos.total || n.gastos) return m;
      }
      return hoy;
    },
    // Los doce meses, para ver la película y no la foto.
    anioEconomico() {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        .map(m => this.numeroEconomico(m))
        .filter(x => x.venta.total || x.costos.total || x.gastos);
    },
    // Gastos de ejemplo del mes, para que la pantalla no arranque en blanco.
    _sembrarGastos() {
      this._gastos = [];
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const D = [
        ['servicios', 'Belgrano 2020 ABL', 237966, 3, 'transferencia'],
        ['servicios', 'Belgrano 2299 EDESUR', 170950, 4, 'transferencia'],
        ['servicios', 'Zavaleta 699 AySA', 250164, 5, 'transferencia'],
        ['seguridad', 'Zavaleta Seguridad', 14722000, 5, 'transferencia'],
        ['operarios', 'Mario', 1850000, 5, 'efectivo'],
        ['operarios', 'Edgar', 1720000, 5, 'efectivo'],
        ['sueldos-administrativos', 'Iara', 1450000, 5, 'transferencia'],
        ['sueldos-vendedores', 'Sergio', 1900000, 5, 'transferencia'],
        ['inversion-marketing', 'Google', 2340000, 2, 'transferencia'],
        ['inversion-marketing', 'Facebook', 1980000, 2, 'transferencia'],
        ['logistica', 'Nafta', 145000, 1, 'efectivo'],
        ['logistica', 'Envios', 320000, 3, 'transferencia'],
        ['gastos-generales', 'Gastos de Limpieza', 180000, 2, 'efectivo'],
        ['gastos-generales', 'Gastos Generales (hojas/toner/ lapiceras', 62000, 4, 'efectivo'],
        ['legal-y-asesorias', 'Contadora', 890000, 5, 'transferencia'],
        ['impuestos', 'Impuestos iibb', 2365889, 6, 'transferencia'],
      ];
      // Los rubros y los conceptos son los de verdad, y también el peso que
      // tiene cada uno. Los montos no: el demo compra y vende una fracción
      // de lo real, así que se llevan a esa escala. Si se dejaran los de la
      // planilla, el resultado daría siempre en rojo y la pantalla no se
      // podría juzgar.
      const suma = D.reduce((a, x) => a + x[2], 0);
      for (let atras = 0; atras < 5; atras++) {
        const mm = mes - atras > 0 ? mes - atras : 12 + (mes - atras);
        // En la planilla real los gastos son poco más de la mitad de los
        // costos del mes. Se respeta esa proporción.
        const costoMes = this.costosDelMes(mm).total;
        if (!costoMes) continue;
        const escala = (costoMes * 0.57) / suma;
        D.forEach(([r, c, m, d, f], i) => {
          const ruido = 1 + (((i + atras * 3) % 7) - 3) * 0.04;
          this.cargarGasto({ rubro: r, concepto: c,
            monto: Math.max(1000, Math.round(m * escala * ruido / 1000) * 1000),
            fecha: `${d}/${mm}`, forma: f, quien: 'Iara' });
        });
      }
    },

    // ---- La cuenta corriente del proveedor --------------------------------
    // Va en los dos sentidos y por eso no alcanza con "cuánto le debo". Él
    // nos trae muebles, y nosotros le vendemos materiales: correderas,
    // paquetes de paraíso. Cuando viene a entregar se sientan, se compensa
    // lo uno con lo otro y se paga la diferencia. Esta cuenta es esa charla,
    // anotada.
    //
    // El signo: positivo es plata NUESTRA que va para él —le debemos—;
    // negativo es plata suya que viene para acá.
    MOVS_CTA: [
      { k: 'compra', label: 'Muebles que trajo', signo: 1, pill: 'soft',
        pie: 'Nace sola cuando se conforma la entrega.' },
      { k: 'pago', label: 'Le pagamos', signo: -1, pill: 'ok',
        pie: 'Efectivo, transferencia o cheque.' },
      { k: 'anticipo', label: 'Anticipo o seña', signo: -1, pill: 'warn',
        pie: 'Plata adelantada antes de que traiga nada.' },
      { k: 'materiales', label: 'Le vendimos materiales', signo: -1, pill: 'ok',
        pie: 'Correderas, placas, paraíso. Se descuenta de lo que le debemos.' },
      { k: 'descuento', label: 'Descuento', signo: -1, pill: 'crit',
        pie: 'Vino mal, vino errónea, o el mueble tenía mucho detalle.' },
      { k: 'ajuste', label: 'Ajuste', signo: 1, pill: 'soft',
        pie: 'Para cuadrar la cuenta cuando algo no dio.' },
    ],
    movCta(k) { return this.MOVS_CTA.find(x => x.k === k) || null; },
    FORMAS_PAGO: [
      { k: 'efectivo', label: 'Efectivo' },
      { k: 'transferencia', label: 'Transferencia' },
      { k: 'cheque', label: 'Cheque' },
    ],
    CTA_KEY: 'bh_cta_prov',
    cuentaCorriente() {
      if (this._cta) return this._cta;
      let g = [];
      try { g = JSON.parse(localStorage.getItem(this.CTA_KEY)) || []; } catch {}
      this._cta = g;
      if (!g.length) this._sembrarCuenta();
      return this._cta;
    },
    _guardarCta() {
      try { localStorage.setItem(this.CTA_KEY, JSON.stringify(this._cta || [])); } catch {}
    },
    _proxMovCta() {
      return (this._cta || []).reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
    },
    // Anotar un movimiento. El monto se guarda siempre positivo: el signo lo
    // pone el tipo, así nadie tiene que acordarse de ponerlo con menos.
    anotarCuenta({ provId, tipo, monto, detalle = '', ref = '', forma = '',
      fecha = '', quien = '' } = {}) {
      const m = this.movCta(tipo); if (!m) return null;
      const cta = this.cuentaCorriente();
      const mov = { id: this._proxMovCta(), provId: Number(provId), tipo,
        monto: Math.abs(Number(monto) || 0), signo: m.signo, detalle, ref,
        forma: forma || '', fecha: fecha || this.hoyCorto(), quien: quien || 'yo' };
      cta.push(mov);
      this._guardarCta();
      return mov;
    },
    movimientosDe(provId) {
      return this.cuentaCorriente().filter(x => x.provId === Number(provId))
        .sort((a, b) => (this.diasDesde(a.fecha) || 0) - (this.diasDesde(b.fecha) || 0));
    },
    // Lo que queda entre los dos. Positivo: le debemos. Negativo: nos debe.
    saldoProveedor(provId) {
      return this.cuentaCorriente().filter(x => x.provId === Number(provId))
        .reduce((a, x) => a + x.signo * x.monto, 0);
    },
    // Cómo se lee un saldo sin tener que pensar el signo.
    leerSaldo(s) {
      if (Math.abs(s) < 1) return { txt: 'al día', pill: 'ok', monto: 0 };
      return s > 0
        ? { txt: `le debemos ${this.plata(s)}`, pill: 'warn', monto: s }
        : { txt: `nos debe ${this.plata(-s)}`, pill: 'ok', monto: s };
    },
    plata(n) {
      return '$' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('es-AR');
    },
    // Todos los saldos de una, que es lo que Jony mira antes de que llegue
    // el camión.
    saldosProveedores() {
      return this.proveedores().map(p => ({ prov: p, saldo: this.saldoProveedor(p.id),
        movs: this.movimientosDe(p.id).length }))
        .filter(x => x.movs > 0 || x.saldo !== 0)
        .sort((a, b) => b.saldo - a.saldo);
    },
    // Cuando el proveedor está enfrente: esto le debemos, esto nos debe,
    // esto se le paga hoy.
    compensacion(provId) {
      const movs = this.movimientosDe(provId);
      const debe = movs.filter(x => x.signo > 0).reduce((a, x) => a + x.monto, 0);
      const haber = movs.filter(x => x.signo < 0).reduce((a, x) => a + x.monto, 0);
      return { debe, haber, saldo: debe - haber,
        materiales: movs.filter(x => x.tipo === 'materiales').reduce((a, x) => a + x.monto, 0),
        anticipos: movs.filter(x => x.tipo === 'anticipo').reduce((a, x) => a + x.monto, 0) };
    },
    // Cuatro meses de cuenta ya andando, para que la pantalla se pueda mirar.
    _sembrarCuenta() {
      this._cta = [];
      this.recepciones().filter(r => r.estadoCompras === 'conformada').forEach(r => {
        const t = this.totalDeEntrega(r);
        this.anotarCuenta({ provId: r.provId, tipo: 'compra', monto: t.total,
          detalle: `${r.items.length} muebles${t.flete ? ' · con flete' : ''}`,
          ref: r.numero, fecha: r.conformadaEl, quien: 'Jony' });
      });
      // Materiales que les vendimos y pagos, que es como se salda de verdad.
      const provs = [...new Set(this._cta.map(x => x.provId))];
      const MAT = ['2 cajas de correderas', '30 paquetes de paraíso',
        '12 placas de MDF 18', '1 caja de bisagras', '4 planchas de melamina'];
      provs.forEach((pid, i) => {
        const movs = this.movimientosDe(pid);
        movs.forEach((m, j) => {
          if (j % 3 === 1) {
            this.anotarCuenta({ provId: pid, tipo: 'materiales',
              monto: 180000 + ((pid * 7 + j) % 6) * 45000,
              detalle: MAT[(pid + j) % MAT.length], fecha: m.fecha, quien: 'Jony' });
          }
          // Se le paga cuando entrega: casi todo, no siempre todo.
          if (j < movs.length - 1) {
            this.anotarCuenta({ provId: pid, tipo: 'pago',
              monto: Math.round(m.monto * (j % 4 === 0 ? 0.8 : 1)),
              forma: ['transferencia', 'efectivo', 'cheque'][(pid + j) % 3],
              detalle: `contra ${m.ref}`, fecha: m.fecha, quien: 'Jony' });
          }
        });
        if (i % 3 === 0) {
          this.anotarCuenta({ provId: pid, tipo: 'anticipo', monto: 300000,
            detalle: 'para arrancar el pedido', forma: 'transferencia',
            fecha: this.hoyCorto(), quien: 'Jony' });
        }
      });
      // Uno se llevó más materiales de los que trajo en muebles y la cuenta
      // le queda en contra: es él el que nos debe. Pasa seguido, y la
      // pantalla tiene que saber mostrarlo.
      const flojo = this.saldosProveedores().slice(-1)[0];
      if (flojo) {
        this.anotarCuenta({ provId: flojo.prov.id, tipo: 'materiales',
          monto: flojo.saldo + 640000,
          detalle: '60 paquetes de paraíso y 3 cajas de correderas',
          fecha: this.hoyCorto(), quien: 'Jony' });
      }
    },

    // ---- El flete de la entrega -------------------------------------------
    // Casi siempre el mueble lo trae el proveedor y no hay nada que anotar.
    // Cuando lo vamos a buscar nosotros, ese viaje cuesta, y hay que decidir
    // si engorda el costo del mueble o si va aparte como gasto del mes.
    FLETES: [
      { k: 'proveedor', label: 'Lo trajo el proveedor', pill: 'ok',
        pie: 'Sin costo aparte.' },
      { k: 'compra', label: 'Lo fuimos a buscar · va en la compra', pill: 'warn',
        pie: 'Se reparte entre los muebles de la entrega y sube el costo de cada uno.' },
      { k: 'gasto', label: 'Lo fuimos a buscar · va como gasto', pill: 'soft',
        pie: 'No toca el costo del mueble. Queda como gasto para Tesorería.' },
    ],
    flete(k) { return this.FLETES.find(x => x.k === k) || this.FLETES[0]; },
    guardarFlete(num, { modo = 'proveedor', monto = 0, quien = '' } = {}) {
      const r = this.recepcion(num); if (!r) return null;
      r.flete = { modo, monto: modo === 'proveedor' ? 0 : Number(monto) || 0,
        quien: quien || 'yo', el: this.hoyCorto() };
      return r.flete;
    },
    // Lo que le toca de flete a cada mueble de la entrega. Sólo cuando se
    // decidió meterlo en la compra: como gasto no reparte nada.
    fleteUnitario(r) {
      const f = r && r.flete;
      if (!f || f.modo !== 'compra' || !r.items.length) return 0;
      return Math.round((Number(f.monto) || 0) / r.items.length);
    },

    // ---- El costo que ve el catálogo --------------------------------------
    // Cuando Compras conforma un precio distinto al que tenía cargado el
    // mueble, se le puede pasar al catálogo para que el margen que mira
    // Ventas sea el de verdad. Nunca se hace solo: lo decide quien conforma.
    COSTOS_KEY: 'bh_costos_catalogo',
    costosCatalogo() {
      if (this._costos) return this._costos;
      let g = {};
      try { g = JSON.parse(localStorage.getItem(this.COSTOS_KEY)) || {}; } catch {}
      this._costos = g;
      return g;
    },
    actualizarCostoCatalogo(varianteId, costo, quien = '') {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      if (!v) return null;
      const antes = Number(v.costo) || 0;
      v.costo = Number(costo) || 0;
      const g = this.costosCatalogo();
      g[String(varianteId)] = { costo: v.costo, antes,
        el: this.hoyCorto(), quien: quien || 'yo' };
      try { localStorage.setItem(this.COSTOS_KEY, JSON.stringify(g)); } catch {}
      return { antes, ahora: v.costo };
    },
    // Si el precio conformado se aparta de lo que dice el catálogo, conviene
    // preguntar. Por debajo de un 2% no vale la pena molestar a nadie.
    valeActualizar(varianteId, precio) {
      const v = (this.variantesTodas() || []).find(x => x.id === Number(varianteId));
      const c = v ? Number(v.costo) || 0 : 0;
      const p = Number(precio) || 0;
      if (!c || !p) return null;
      const dif = p - c;
      if (Math.abs(dif) / c < 0.02) return null;
      return { antes: c, ahora: p, dif, pct: (dif / c) * 100 };
    },

    // Recibir una unidad: acá recién nace su número de serie.
    recibirUnidad(id, { calidad = 'perfecto', nota = '', ubicacion = 'dep-pb', quien = '' } = {}) {
      const u = this.unidad(id); if (!u) return null;
      const c = this.calidad(calidad) || this.CALIDADES[0];
      if (calidad === 'devuelto') {
        this.guardarUnidad({ id, calidad, calidadNota: nota, recibidoPor: quien });
        return this.unidad(id);
      }
      const cambios = { id, calidad, calidadNota: nota, recibidoPor: quien,
        listo: this.hoyCorto() };
      if (c.entra) {
        cambios.estado = 'stock';
        cambios.ubicacion = ubicacion;
        cambios.serie = u.serie === '—' ? this.tomarSerie() : u.serie;
        cambios.marca = calidad === 'detalle' ? null : u.marca;
        if (nota) cambios.nota = nota;
      } else {
        cambios.marca = 'reparar';   // sigue en Producción, no entra al depósito
      }
      this.guardarUnidad(cambios);
      return this.unidad(id);
    },
    // Lo que quedó a reparar: está, pero no cuenta como stock.
    aReparar() {
      return this.unidadesTodas().filter(u => u.calidad === 'reparar' && u.estado !== 'stock');
    },
    repararUnidad(id, { ubicacion = 'dep-pb', quien = '' } = {}) {
      const u = this.unidad(id); if (!u) return null;
      this.guardarUnidad({ id, estado: 'stock', marca: null, calidad: 'perfecto',
        reparadoPor: quien, ubicacion,
        serie: u.serie === '—' ? this.tomarSerie() : u.serie, listo: this.hoyCorto() });
      return this.unidad(id);
    },

    // Cuánto tiene cada taller entre manos ahora. Salen TODOS los proveedores,
    // también los que no tienen nada: saber quién está libre es la mitad de la
    // decisión de a quién darle el próximo pedido.
    cargaTalleres() {
      const enCurso = this.aFabricar().filter(u => u.proveedor);
      const m = new Map();
      enCurso.forEach(u => {
        const et = u.provId ? this.provLabel(u.provId) : u.proveedor;
        if (!m.has(et)) m.set(et, { id: u.provId || null, nombre: et, n: 0, vencidas: 0 });
        const x = m.get(et); x.n++; if (this.vencida(u)) x.vencidas++;
      });
      // Los que están en la lista pero hoy no tienen trabajo. Se compara por id,
      // no por nombre: dos proveedores pueden llamarse igual.
      this.proveedores().forEach(p => {
        const et = this.provLabel(p.id);
        if (!m.has(et)) m.set(et, { id: p.id, nombre: et, n: 0, vencidas: 0, libre: true });
      });
      return [...m.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'));
    },

    // Sumar días a una fecha corta "5/8". Devuelve otra fecha corta.
    sumarDias(fecha, n) {
      const m = /^(\d{1,2})\/(\d{1,2})$/.exec(String(fecha || '').trim());
      if (!m) return '';
      const hoy = new Date();
      const d = new Date(hoy.getFullYear(), Number(m[2]) - 1, Number(m[1]) + Number(n || 0));
      return `${d.getDate()}/${d.getMonth() + 1}`;
    },
    // La fecha que importa: cuándo hay que tenerlo. Si se vendió, es la que se
    // le prometió al cliente —la venta más los días de fábrica del mueble—; si
    // es para stock, el final del rango que dio el proveedor.
    prometidaDe(u) {
      if (u.prometida) return u.prometida;
      if (u.orden && u.fechaVenta) {
        const p = DEMO.productos.find(x => x.id === u.productoId) || {};
        return this.sumarDias(u.fechaVenta, Number(p.dias) || 30);
      }
      return u.hasta || '';
    },
    // Cuántos días de margen quedan hasta la fecha comprometida. Negativo = ya
    // se pasó. Es lo que dice si hay que apurar al taller o todavía hay aire.
    // Ojo: margenDe() es otra cosa —la rentabilidad—, por eso el nombre largo.
    margenEntrega(u) {
      const f = this.prometidaDe(u);
      return f ? this.diasHasta(f) : null;
    },
    // Está vencido cuando pasó el final del rango comprometido.
    vencida(u) {
      if (u.estado !== 'produccion' || !u.hasta) return false;
      const d = this.diasHasta(u.hasta);
      return d != null && d < 0;
    },

    // La etiqueta que se ve en pantalla combina las dos cosas, igual que en la
    // planilla de siempre: "Reservada · lista", "Reservada · en fábrica".
    etiquetaUnidad(u) {
      const m = this.marcaUnidad(u.marca);
      if (m && u.marca === 'reclamo') return { label: 'Entregada · en reclamo', pill: 'crit' };
      if (m) return { label: m.label, pill: m.pill };
      const e = this.estadoUnidad(u.estado);
      // "A pedir" siempre tiene dueño —nace de una venta—, así que no hace
      // falta aclarar que está reservada: se aclara que falta pedirla.
      if (u.estado === 'pedir') return { label: 'A pedir', pill: 'crit' };
      if (u.orden) {
        return u.estado === 'produccion'
          ? { label: 'Reservada · en fábrica', pill: 'warn' }
          : { label: 'Reservada · lista', pill: 'warn' };
      }
      return { label: e.label, pill: e.pill };
    },
    // Lo que Producción tiene que salir a pedir: vendido y sin proveedor.
    aPedir() { return this.unidadesTodas().filter(u => u.estado === 'pedir'); },
    // Lo que se puede vender hoy: llegó, no tiene dueño y no tiene marcas.
    disponible(u) { return u.estado === 'stock' && !u.orden && !u.marca; },
    // Lo que existe físicamente, que es lo que tiene que dar el conteo.
    enPiso(u) { return u.estado === 'stock'; },

    // Las unidades. En demo se arman una vez a partir de las variantes, con
    // números fijos —nada de azar— para que la pantalla sea siempre la misma.
    unidadesTodas() {
      if (this._unis) return this._unis;
      const UBI = ['dep-pb', 'dep-1', 'dep-2', 'loc-2020', 'loc-2299'];
      const PROV = [1, 3, 5, 6, 7];   // ids, no nombres: el nombre se lee del id
      const out = [];
      let n = 0;
      // Los tres tipos, repartidos siempre igual: la mayoría estándar, alguno
      // con una cota cambiada, y alguno que hay que dibujar de cero.
      const tipoDe = (i, j) => {
        if (i % 5 === 0 && j === 0) {
          return { tipo: 'medida', detalle: 'A medida',
            planoEstado: i % 10 === 0 ? 'a_dibujar' : 'a_verificar' };
        }
        if (i % 7 === 0 && j === 0) {
          return { tipo: 'modificado', detalle: 'Profundidad 0.40 en vez de 0.45',
            cambios: [{ propiedad: 'Profundidad', deCatalogo: '0.45', pedido: '0.40' }],
            planoEstado: 'a_editar' };
        }
        return { tipo: 'estandar', detalle: '', planoEstado: 'ok' };
      };
      DEMO.variantes.forEach((v, i) => {
        const prod = DEMO.productos.find(p => p.id === v.producto_id) || {};
        // Cuántas de cada una: pocas, y repartidas siempre igual.
        const enStock = [2, 0, 1, 0, 3, 1, 0, 2][i % 8];
        const enProd = [0, 1, 0, 2, 1, 0, 1, 0][i % 8];
        const salidas = [1, 0, 2, 0, 1, 0, 0, 1][i % 8];
        const base = {
          productoId: v.producto_id, varianteId: v.id,
          modelo: prod.nombre || '', medida: v.medida || '',
          color: [v.estructura, v.frente].filter(Boolean).join(' · '),
          terminacion: v.estructura || '',
          tipo: 'estandar', detalle: '', foto: '', marca: null,
        };
        for (let j = 0; j < enStock; j++) {
          n++;
          out.push({ ...base, id: n, serie: this.serieDe(n), estado: 'stock',
            ubicacion: UBI[n % UBI.length], provId: PROV[n % PROV.length],
            proveedor: this.provLabel(PROV[n % PROV.length]),
            pedido: this.numPedido(100 + (n % 8)),
            llega: '', listo: `${(n % 28) + 1}/7`,
            orden: j === 0 && i % 3 === 0 ? `#S00${200 + i}` : null,
            fechaVenta: j === 0 && i % 3 === 0 ? `${(n % 28) + 1}/6` : '',
            marca: i % 11 === 0 && j === 0 ? 'reparar' : null });
        }
        for (let j = 0; j < enProd; j++) {
          n++;
          out.push({ ...base, id: n, serie: this.serieDe(n), estado: 'produccion',
            ubicacion: '', provId: PROV[n % PROV.length],
            proveedor: this.provLabel(PROV[n % PROV.length]),
            llega: `${(n % 28) + 1}/8`, listo: '',
            desde: n % 7 === 0 ? `${(n % 20) + 5}/7` : `${(n % 20) + 1}/8`,
            hasta: n % 7 === 0 ? `${(n % 20) + 12}/7` : `${(n % 20) + 8}/8`,
            pedido: this.numPedido(110 + (n % 6)),
            orden: j === 0 && i % 4 === 0 ? `#S00${240 + i}` : null,
            fechaVenta: j === 0 && i % 4 === 0 ? `${(n % 28) + 1}/7` : '',
            ...(() => { const tp = tipoDe(i, j);
              return { ...tp, planoEstado: tp.tipo === 'estandar' ? 'ok' : 'verificado' }; })() });
        }
        // Vendidas que todavía no se le pidieron a nadie: nacen con la venta.
        const aPedir = [0, 0, 1, 0, 0, 1, 0, 0][i % 8];
        for (let j = 0; j < aPedir; j++) {
          n++;
          out.push({ ...base, id: n, serie: '—', estado: 'pedir',
            ubicacion: '', proveedor: '', llega: '', listo: '',
            orden: `#S00${260 + i}`, fechaVenta: `${(n % 28) + 1}/7`,
            ...tipoDe(i, j) });
        }
        for (let j = 0; j < salidas; j++) {
          n++;
          out.push({ ...base, id: n, serie: this.serieDe(n), estado: 'entregada',
            ubicacion: '', provId: PROV[n % PROV.length],
            proveedor: this.provLabel(PROV[n % PROV.length]),
            pedido: this.numPedido(90 + (n % 8)),
            llega: '', listo: `${(n % 28) + 1}/5`, orden: `#S00${100 + n}`,
            fechaVenta: `${(n % 28) + 1}/5`, fechaEntrega: `${(n % 28) + 1}/6`,
            marca: n % 17 === 0 ? 'reclamo' : null });
        }
      });
      this._unis = out;
      return out;
    },
    unidad(id) { return this.unidadesTodas().find(u => u.id === Number(id)) || null; },
    // Las fechas de la planilla vienen como "20/7", sin año. Cuántos días
    // hace de eso: si la fecha da en el futuro, era del año pasado.
    diasDesde(fecha) {
      const m = /^(\d{1,2})\/(\d{1,2})$/.exec(String(fecha || '').trim());
      if (!m) return null;
      const hoy = new Date();
      let d = new Date(hoy.getFullYear(), Number(m[2]) - 1, Number(m[1]));
      if (d > hoy) d = new Date(hoy.getFullYear() - 1, Number(m[2]) - 1, Number(m[1]));
      return Math.max(0, Math.round((hoy - d) / 86400000));
    },
    // Todas las variantes, para poder leer las propiedades de una unidad.
    variantesTodas() { return DEMO.variantes; },
    // "1 de 6": una orden puede tener seis muebles y ésta es uno de ellos.
    posEnOrden(u) {
      if (!u.orden) return null;
      const hs = this.unidadesTodas().filter(x => x.orden === u.orden);
      const i = hs.findIndex(x => x.id === u.id);
      return i < 0 ? null : { n: i + 1, de: hs.length };
    },
    // El stock ya no se carga a mano en el mueble: se cuenta de las unidades.
    // Una sola fuente — si no, hay dos números que dicen cosas distintas.
    stockDeVariante(varianteId) {
      return this.unidadesTodas().filter(u => u.varianteId === Number(varianteId) && this.enPiso(u)).length;
    },
    libresDeVariante(varianteId) {
      return this.unidadesTodas().filter(u => u.varianteId === Number(varianteId) && this.disponible(u)).length;
    },
    stockDeProducto(productoId) {
      return this.unidades(productoId).filter(u => this.enPiso(u)).length;
    },
    guardarUnidad(u) {
      const i = this.unidadesTodas().findIndex(x => x.id === u.id);
      if (i >= 0) this._unis[i] = { ...this._unis[i], ...u };
      return this._unis[i] || null;
    },
    // Con rastreo por número de serie, el stock no es un número: son unidades
    // concretas. Esto es lo que permite saber cuál salió en qué orden.
    unidades(productoId) {
      return this.unidadesTodas().filter(u => u.productoId === Number(productoId));
    },

    // ---- Cómo una propiedad se convierte en costo -------------------------
    // Acá está la bisagra con la lista de precios. Una propiedad no es sólo un
    // texto: ESTRUCTURA se busca en la tabla de estructuras, FRENTE en la de
    // frentes, y RANURAS no busca nada — suma un recargo. Sin este rol, el
    // sistema no sabe dónde ir a buscar el número.
    ROLES: [
      { k: 'medida', label: 'Medida', pie: 'Define la fila de la tabla de precios. Ej: 1,60.' },
      { k: 'estructura', label: 'Estructura', pie: 'Busca el costo en la tabla de estructuras.' },
      { k: 'frente', label: 'Frente', pie: 'Busca el costo en la tabla de frentes.' },
      { k: 'material', label: 'Material de otro rubro', pie: 'Busca en la tabla de ese rubro. Ej: hierro, vidrio, mármol.' },
      { k: 'terminacion', label: 'Terminación', pie: 'Laqueado, melamina, enchapado. Puede tener su propio costo.' },
      { k: 'recargo', label: 'Recargo', pie: 'No busca nada: suma un adicional. Ej: ranuras, corte 45°.' },
      { k: 'ninguno', label: 'Sin costo', pie: 'Distingue la variante pero no cambia el precio.' },
    ],
    rol(k) { return this.ROLES.find(x => x.k === k) || null; },
    // El rol de una propiedad. Las de siempre ya lo traen por su nombre.
    ROL_POR_DEFECTO: { medida: 'medida', estructura: 'estructura', frente: 'frente',
      terminacion: 'terminacion' },
    rolDe(k) {
      const p = this.propiedad(k);
      return (p && p.rol) || this.ROL_POR_DEFECTO[k] || 'ninguno';
    },

    // Listas de precio: de dónde sale el costo base. Se elige por mueble para
    // no equivocarse de tabla.
    LISTAS: [
      { k: 'carp-2026-01', label: 'Carpintería · enero 2026', rubro: 'carpinteria', vigencia: '01/2026' },
      { k: 'carp-2025-10', label: 'Carpintería · octubre 2025', rubro: 'carpinteria', vigencia: '10/2025' },
      { k: 'herr-2026-01', label: 'Herrería · enero 2026', rubro: 'herreria', vigencia: '01/2026' },
      { k: 'tapi-2025-12', label: 'Tapicería · diciembre 2025', rubro: 'tapiceria', vigencia: '12/2025' },
      { k: 'laq-2026-01', label: 'Laqueado · enero 2026', rubro: 'laqueado', vigencia: '01/2026' },
    ],
    lista(k) { return this.LISTAS.find(x => x.k === k) || null; },
    // Las listas de un rubro, para no ofrecer la de herrería al carpintero.
    listasDe(rubro) { return this.LISTAS.filter(x => x.rubro === rubro); },
    // Adicionales sugeridos. Son los de siempre: aparecen en el pop-up para
    // no escribirlos de nuevo, pero cualquier variante puede tener el suyo.
    RECARGOS: [
      { k: 'ranuras', label: 'Ranuras', tipo: '%', valor: 8 },
      { k: 'corte45', label: 'Corte 45°', tipo: '%', valor: 5 },
      { k: 'laqueado', label: 'Laqueado extra', tipo: 'fijo', valor: 18000 },
      { k: 'herrajes', label: 'Herrajes premium', tipo: 'fijo', valor: 25000 },
    ],
    recargo(k) { return this.RECARGOS.find(x => x.k === k) || null; },

    // La composición del costo de una variante: qué pone cada rubro y qué
    // suman los recargos. Con dos rubros hay dos costos, no uno.
    composicion(prod, v) {
      const rubros = (prod.rubros || []).map(r => (typeof r === 'string' ? { k: r } : r)).filter(x => x && x.k);
      const porRubro = rubros.map((r, i) => ({
        rubro: r.k,
        label: (this.rubro(r.k) || {}).label || r.k,
        monto: Number((v.costos || [])[i]) || (i === 0 ? Number(v.costo) || 0 : 0),
      }));
      const base = porRubro.reduce((a, b) => a + b.monto, 0);
      // Los adicionales son libres: cada uno con su nombre y su valor. Los
      // marcados con el sistema viejo siguen valiendo y entran igual.
      const viejos = (v.recargos || []).map(k => this.recargo(k)).filter(Boolean)
        .map(r => ({ id: r.k, label: r.label, tipo: r.tipo, valor: r.valor }));
      const adicionales = [...viejos, ...(v.adicionales || [])].map(a => ({
        ...a,
        monto: a.tipo === '%' ? Math.round(base * (Number(a.valor) || 0) / 100) : Number(a.valor) || 0,
      }));
      const sumaRec = adicionales.reduce((a, b) => a + b.monto, 0);
      const ajuste = Number(v.ajuste) || 0;
      return { porRubro, base, adicionales, sumaAd: sumaRec,
        recargos: adicionales, sumaRec, ajuste, total: base + sumaRec + ajuste };
    },

    // ---- Propiedades secundarias ------------------------------------------
    UNIDADES,
    secundarias() {
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(SEC_KEY)) || []; } catch {}
      const mapa = new Map(SEC_BASE.map(x => [x.k, { ...x }]));
      guardadas.forEach(g => mapa.set(g.k, g));
      return [...mapa.values()];
    },
    secundaria(k) { return this.secundarias().find(x => x.k === k) || null; },
    crearSecundaria(nombre, unidad) {
      const n = String(nombre || '').trim(); if (!n) return null;
      const ya = this.secundarias().find(x => sinTilde(x.nombre) === sinTilde(n));
      if (ya) return ya;
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(SEC_KEY)) || []; } catch {}
      const nueva = { k: slug(n), nombre: n, unidad: String(unidad || '').trim() };
      guardadas.push(nueva);
      try { localStorage.setItem(SEC_KEY, JSON.stringify(guardadas)); } catch {}
      return nueva;
    },
    // Renombrar o cambiarle la unidad a una secundaria. La clave no cambia,
    // así que los valores ya cargados en las variantes siguen enganchados.
    editarSecundaria(k, nombre, unidad) {
      const todas = this.secundarias();
      const x = todas.find(y => y.k === k); if (!x) return null;
      const reg = { k, nombre: String(nombre || x.nombre).trim(), unidad: String(unidad ?? x.unidad).trim() };
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(SEC_KEY)) || []; } catch {}
      const i = guardadas.findIndex(y => y.k === k);
      if (i >= 0) guardadas[i] = reg; else guardadas.push(reg);
      try { localStorage.setItem(SEC_KEY, JSON.stringify(guardadas)); } catch {}
      return reg;
    },
    // El valor de una secundaria en una variante. Los muebles viejos las
    // guardaban como campos sueltos, así que se leen de los dos lados.
    VIEJAS: { alto: 'alto', prof: 'prof', peso: 'peso', largo: 'frenteCm' },
    valorSec(v, k) {
      if (v.sec && v.sec[k] != null) return v.sec[k];
      const viejo = this.VIEJAS[k];
      return viejo && v[viejo] != null ? v[viejo] : '';
    },
    ponerSec(v, k, val) {
      v.sec = v.sec || {};
      v.sec[k] = val;
      const viejo = this.VIEJAS[k];
      if (viejo) v[viejo] = val;   // se mantiene por si algo todavía lo lee
    },

    // ---- Rubros y proveedores ---------------------------------------------
    // Un mueble no se le pide a "Tony": se le pide a CARPINTERÍA, y adentro de
    // carpintería los cinco son pares — ninguno es mejor que otro, sólo
    // cambia cuánto puede hacer por semana. Por eso el plano y la planilla van
    // dirigidos al rubro, no a una persona.
    // Los rubros son los de la planilla de costos: cada uno agrupa a los
    // talleres que hacen ese tipo de mueble. Un taller de sillas no es un
    // carpintero aunque los dos trabajen la madera.
    RUBROS: [
      { k: 'carpinteria', label: 'Carpintería' },
      { k: 'respaldos', label: 'Respaldos' },
      { k: 'mesas', label: 'Mesas' },
      { k: 'sillas', label: 'Sillas' },
      { k: 'sillones', label: 'Sillones' },
      { k: 'herreria', label: 'Herrería' },
      { k: 'lustrado', label: 'Lustrado' },
      { k: 'tapiceria', label: 'Tapicería' },
      { k: 'vidrieria', label: 'Vidriería' },
      { k: 'marmoleria', label: 'Marmolería' },
      { k: 'laqueado', label: 'Laqueado' },
    ],
    rubro(k) { return this.RUBROS.find(r => r.k === k) || null; },

    PROV_KEY: 'bh_proveedores',
    // capacidad = cuántas unidades entrega por semana. No es prioridad: es
    // cuánto le cabe.
    PROV_BASE: [
      { id: 1, nombre: 'Tony', rubro: 'carpinteria', capacidad: 12, direccion: 'Av. San Martín 2210' },
      { id: 2, nombre: 'Andrés', rubro: 'carpinteria', capacidad: 8, direccion: 'Rivadavia 880' },
      { id: 3, nombre: 'Luciano', rubro: 'carpinteria', capacidad: 10, direccion: 'Belgrano 1450' },
      { id: 4, nombre: 'Sergio', rubro: 'carpinteria', capacidad: 6, direccion: 'Mitre 340' },
      { id: 5, nombre: 'Enrique', rubro: 'carpinteria', capacidad: 9, direccion: 'Sarmiento 76' },
      { id: 6, nombre: 'Matías', rubro: 'carpinteria', capacidad: 9, direccion: 'Alsina 2100' },
      { id: 7, nombre: 'Raúl', rubro: 'carpinteria', capacidad: 12, direccion: 'Güemes 515' },
      { id: 8, nombre: 'Herrería Sur', rubro: 'herreria', capacidad: 15, direccion: 'Ruta 8 km 42' },
      { id: 9, nombre: 'Carla', rubro: 'herreria', capacidad: 10, direccion: 'Lavalle 990' },
      { id: 10, nombre: 'Laqueados Vera', rubro: 'laqueado', capacidad: 20, direccion: 'Colón 1330' },
      // Los otros rubros: cada uno hace un tipo de mueble y no se mezclan.
      { id: 11, nombre: 'Vicente', rubro: 'respaldos', capacidad: 14, direccion: '' },
      { id: 12, nombre: 'Michel', rubro: 'mesas', capacidad: 10, direccion: '' },
      { id: 13, nombre: 'David', rubro: 'mesas', capacidad: 8, direccion: '' },
      { id: 14, nombre: 'La Classe', rubro: 'sillas', capacidad: 40, direccion: '' },
      { id: 15, nombre: 'Julio Ledesma', rubro: 'sillas', capacidad: 25, direccion: '' },
      { id: 16, nombre: 'Puro Palo', rubro: 'sillas', capacidad: 30, direccion: '' },
      { id: 17, nombre: 'Andrés Roger', rubro: 'sillas', capacidad: 20, direccion: '' },
      { id: 18, nombre: 'Sacchi', rubro: 'sillones', capacidad: 6, direccion: '' },
      { id: 19, nombre: 'Roberto', rubro: 'lustrado', capacidad: 15, direccion: '' },
    ],
    // El id es el que manda: puede haber dos Vicente distintos, cada uno con su
    // domicilio y su rubro, y el sistema no los confunde.
    proveedor(id) { return this.proveedores().find(p => p.id === Number(id)) || null; },
    // Cómo se lo lee en pantalla: el número adelante, como se lo nombra en la casa.
    provLabel(id) {
      const p = this.proveedor(id);
      return p ? `${p.id}${p.nombre}` : '';
    },
    proveedores(rubro) {
      let guardados = [];
      try { guardados = JSON.parse(localStorage.getItem(this.PROV_KEY)) || []; } catch {}
      const out = this.PROV_BASE.map(x => ({ ...x }));
      let prox = out.reduce((mx, x) => Math.max(mx, x.id || 0), 0);
      guardados.forEach(g => {
        if (out.some(x => x.id && x.id === g.id)) return;
        out.push({ ...g, id: g.id || ++prox });
      });
      const lista = out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return rubro ? lista.filter(x => x.rubro === rubro) : lista;
    },
    // Cuánto puede entregar por semana todo un rubro, sumando a sus pares.
    capacidadRubro(k) {
      return this.proveedores(k).reduce((a, b) => a + (Number(b.capacidad) || 0), 0);
    },
    // Devuelve el proveedor tal como quedó: si ya existía uno igual sin
    // importar tildes ni mayúsculas, devuelve ESE y no crea un duplicado.
    crearProveedor(nombre, rubro, capacidad) {
      const n = String(nombre || '').trim();
      if (!n) return null;
      // Dos proveedores pueden llamarse igual: lo que no se repite es el id.
      let guardados = [];
      try { guardados = JSON.parse(localStorage.getItem(this.PROV_KEY)) || []; } catch {}
      const prox = this.proveedores().reduce((mx, x) => Math.max(mx, x.id || 0), 0) + 1;
      const nuevo = { id: prox, nombre: n, rubro: rubro || 'carpinteria',
        capacidad: Number(capacidad) || 0, direccion: '' };
      guardados.push(nuevo);
      try { localStorage.setItem(this.PROV_KEY, JSON.stringify(guardados)); } catch {}
      return nuevo;
    },

    // ---- Planilla de pedido -----------------------------------------------
    // Cómo se le pide el mueble al rubro cuando no hay dibujo. Cada columna
    // dice de dónde sale su valor, y por eso el renglón se puede llenar solo
    // cuando se vende: la orden pone el número, el mueble pone el modelo y la
    // variante pone sus propiedades.
    // Las planillas son PLANTILLAS reutilizables: la de respaldos se usa en
    // los 40 respaldos, no se diseña una por mueble. Si un mueble no tiene la
    // propiedad de una columna, ese casillero le queda vacío — que es
    // justamente lo que pasa hoy en el papel.
    PLAN_KEY: 'bh_planillas',
    PLAN_BASE: [
      { k: 'respaldos', nombre: 'Respaldos', cols: [
        { label: 'ESTADO', origen: 'orden' },
        { label: 'MODELO', origen: 'producto', campo: 'nombre' },
        { label: 'MEDIDA', origen: 'propiedad', campo: 'medida' },
        { label: 'ALTO', origen: 'propiedad', campo: 'alto' },
        { label: 'TELA', origen: 'propiedad', campo: 'tela' },
        { label: 'COLOR', origen: 'propiedad', campo: 'color' },
        { label: 'OBS', origen: 'libre' },
      ] },
      { k: 'sillas', nombre: 'Sillas', cols: [
        { label: 'ESTADO', origen: 'orden' },
        { label: 'MODELO', origen: 'producto', campo: 'nombre' },
        { label: 'MATERIAL', origen: 'propiedad', campo: 'material' },
        { label: 'COLOR', origen: 'propiedad', campo: 'color' },
        { label: 'COLOR DE PATA', origen: 'propiedad', campo: 'colorpata' },
        { label: 'CANT.', origen: 'cantidad' },
        { label: 'OBS', origen: 'libre' },
      ] },
    ],
    planillas() {
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(this.PLAN_KEY)) || []; } catch {}
      const mapa = new Map(this.PLAN_BASE.map(x => [x.k, JSON.parse(JSON.stringify(x))]));
      guardadas.forEach(g => mapa.set(g.k, g));
      return [...mapa.values()].filter(x => !x.oculta);
    },
    planilla(k) { return this.planillas().find(x => x.k === k) || null; },
    // Guarda una plantilla. Si la clave ya existe, la pisa: editar la de
    // respaldos cambia la de todos los respaldos, que es la idea.
    guardarPlanilla(nombre, cols, k) {
      const n = String(nombre || '').trim(); if (!n) return null;
      const clave = k || slug(n);
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(this.PLAN_KEY)) || []; } catch {}
      const i = guardadas.findIndex(x => x.k === clave);
      const reg = { k: clave, nombre: n, cols: JSON.parse(JSON.stringify(cols || [])) };
      if (i >= 0) guardadas[i] = reg; else guardadas.push(reg);
      try { localStorage.setItem(this.PLAN_KEY, JSON.stringify(guardadas)); } catch {}
      return reg;
    },
    borrarPlanilla(k) {
      let guardadas = [];
      try { guardadas = JSON.parse(localStorage.getItem(this.PLAN_KEY)) || []; } catch {}
      guardadas = guardadas.filter(x => x.k !== k);
      // Las de fábrica no se borran de verdad: se ocultan guardándolas vacías.
      if (this.PLAN_BASE.some(x => x.k === k)) guardadas.push({ k, nombre: '', cols: [], oculta: true });
      try { localStorage.setItem(this.PLAN_KEY, JSON.stringify(guardadas)); } catch {}
    },

    // Cuántos muebles usan una plantilla, para avisar antes de tocarla.
    usosPlanilla(k) {
      return DEMO.productos.filter(p => (p.rubros || [])
        .some(r => r && r.plantilla === k)).length;
    },

    ORIGENES: [
      { k: 'orden', label: 'De la orden', pie: 'N° de venta, o STOCK si es para reponer.' },
      { k: 'producto', label: 'Del mueble', pie: 'El nombre o el código del mueble.' },
      { k: 'propiedad', label: 'De la variante', pie: 'Una de sus propiedades: medida, tela, color…' },
      { k: 'cantidad', label: 'Cantidad', pie: 'Cuántas unidades de ese renglón.' },
      { k: 'libre', label: 'A mano', pie: 'Lo escribe quien arma el pedido. Ej: observaciones.' },
    ],

    // Alta de categoría desde la ficha del mueble, sin ir hasta Familias.
    crearCategoria(nombre, padreId) {
      const n = String(nombre || '').trim(); if (!n) return null;
      const ya = DEMO.categorias.find(c => sinTilde(c.nombre) === sinTilde(n)
        && (c.padre_id ?? null) === (padreId ?? null));
      if (ya) return ya;
      const nueva = { id: Math.max(0, ...DEMO.categorias.map(c => c.id)) + 1,
        nombre: n.toUpperCase(), padre_id: padreId ?? null };
      DEMO.categorias.push(nueva);
      return nueva;
    },

    // Con qué se le pide. Va POR RUBRO, no por mueble: a carpintería se le
    // puede mandar el plano y a herrería una planilla, para el mismo mueble.
    OBTENCION: [
      { k: 'dibujo', label: 'Se pide por dibujo',
        pie: 'Se le manda el plano de producción de la variante. Sin el plano cargado, el pedido no se puede armar.' },
      { k: 'planilla', label: 'Se pide por planilla',
        pie: 'Se le manda la planilla de pedido con las medidas y los materiales, sin plano.' },
      { k: 'mixta', label: 'Mixta',
        pie: 'Necesita las dos cosas: el plano y la planilla de pedido.' },
    ],
    // Lo que todo mueble tiene aunque no se haya cargado todavía.
    _defProd(p) {
      return {
        // Cuántos proveedores hacen falta para terminarlo y quiénes son. Un
        // rack con módulo laqueado y patas de hierro necesita dos.
        // A qué rubros se les pide, en orden. Cada uno con lo suyo: cómo se
        // le pide y, si es por planilla, qué columnas lleva la de ÉL.
        // Alto, profundidad y peso las necesita casi todo mueble. Se borran o
        // se cambian por las que sirvan: en un placard importa el hueco.
        secundarias: ['alto', 'prof', 'peso'],
        nProveedores: 1,
        rubros: [{ k: 'carpinteria', modo: 'dibujo', plantilla: null, planilla: null }],
        instalacion: false,
        // Cada mueble es distinto: 12 mesas de luz iguales son 12 unidades
        // distintas, y hay que saber cuál salió en cada orden.
        rastreo: 'serie',
        publicado: true, markupObj: this.MARKUP_OBJETIVO,
        contabilidad: { ingresos: '', gastos: '' },   // vacío = hereda de la categoría
        propiedades: ['medida', 'estructura', 'frente'],
        fotos: [],
        ...p,
      };
    },

    // Guarda los cambios de un mueble (demo: en memoria + localStorage).
    guardarProducto(p) {
      const i = DEMO.productos.findIndex(x => x.id === p.id);
      if (i >= 0) DEMO.productos[i] = { ...DEMO.productos[i], ...p };
      return DEMO.productos[i] || null;
    },
    guardarVariante(v) {
      const i = DEMO.variantes.findIndex(x => x.id === v.id);
      if (i >= 0) DEMO.variantes[i] = { ...DEMO.variantes[i], ...v };
      return DEMO.variantes[i] || null;
    },
    // El SKU se arma solo con el código del mueble y los valores de la
    // variante; se puede pisar a mano, pero nunca hace falta inventarlo.
    skuDe(prod, v) {
      const cod = x => sinTilde(x).replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase();
      return [prod.sku || slug(prod.nombre).slice(0, 6).toUpperCase(),
        v.medida && String(v.medida).replace(/[^0-9]/g, ''),
        v.estructura && cod(String(v.estructura).split(' ').pop()),
        v.frente && cod(String(v.frente).split(' ').pop()),
      ].filter(Boolean).join('-');
    },

    // La ficha de un mueble: el producto con su categoría y su rango de precios.
    async producto(id) {
      const n = Number(id);
      if (!hayConexion()) {
        const p0 = DEMO.productos.find(x => x.id === n);
        if (!p0) return null;
        const p = this._defProd(p0);
        const vs = DEMO.variantes.filter(v => v.producto_id === n).map(v => v.precio);
        const cat = DEMO.categorias.find(c => c.id === p.categoria_id) || null;
        const padre = cat && cat.padre_id ? DEMO.categorias.find(c => c.id === cat.padre_id) : null;
        return { ...p, categoria: cat, ambiente: padre, variantes: vs.length,
          desde: vs.length ? Math.min(...vs) : 0, hasta: vs.length ? Math.max(...vs) : 0 };
      }
      const { data, error } = await cliente().from('producto')
        .select('id,categoria_id,nombre,publicado_tn,sku,desc,alto,prof,materiales,dias,categoria(id,nombre,padre_id)')
        .eq('id', n).single();
      if (error) throw error;
      const vs = (await this.variantes(n)).map(v => v.precio);
      return { ...data, ambiente: null, variantes: vs.length,
        desde: vs.length ? Math.min(...vs) : 0, hasta: vs.length ? Math.max(...vs) : 0 };
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

    // El color con el que se pinta una terminación en el catálogo. No es la
    // foto: es un redondelito para reconocerla de un vistazo.
    COLORES: [
      { busca: 'blanc', color: '#f4f2ee' }, { busca: 'negro', color: '#1b1b1b' },
      { busca: 'paraiso', color: '#c49a6c' }, { busca: 'nogal', color: '#6b4a2f' },
      { busca: 'natural', color: '#d9c3a2' }, { busca: 'roble', color: '#b08d5f' },
      { busca: 'gris', color: '#9aa0a6' }, { busca: 'olmo', color: '#a8845c' },
      { busca: 'petiribi', color: '#8a5a3b' }, { busca: 'laque', color: '#e8e6e1' },
    ],
    colorDe(valor) {
      const t = sinTilde(valor || '');
      const m = this.COLORES.find(c => t.includes(c.busca));
      return m ? m.color : '#c9ccd1';
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
    // Localidad → costo de envío. Tabla DEMO con las localidades del AMBA:
    // Brian pasa la lista real del mapa y se reemplaza tal cual (misma forma
    // {k, label, zona, flete}). Lo que no esté se carga a mano desde la
    // cotización y queda guardado.
    _ZONAS: [
      { zona: 'CABA', flete: 45000, locs: ['CABA'] },
      { zona: 'GBA Norte', flete: 62000, locs: [
        'Vicente López', 'Olivos', 'Florida', 'Munro', 'San Isidro', 'Martínez', 'Beccar',
        'San Fernando', 'Tigre', 'Boulogne', 'San Martín', 'Villa Ballester', 'San Miguel',
        'José C. Paz', 'Malvinas Argentinas', 'Escobar', 'Pilar'] },
      { zona: 'GBA Oeste', flete: 68000, locs: [
        'Ramos Mejía', 'Haedo', 'Morón', 'Castelar', 'Ituzaingó', 'Hurlingham',
        'San Justo', 'Merlo', 'Moreno', 'Caseros', 'Tres de Febrero'] },
      { zona: 'GBA Sur', flete: 72000, locs: [
        'Avellaneda', 'Wilde', 'Lanús', 'Banfield', 'Lomas de Zamora', 'Temperley',
        'Adrogué', 'Almirante Brown', 'Bernal', 'Quilmes', 'Berazategui',
        'Florencio Varela', 'Ezeiza', 'Monte Grande'] },
      { zona: 'La Plata', flete: 95000, locs: ['La Plata', 'City Bell', 'Gonnet', 'Berisso', 'Ensenada'] },
      { zona: 'Interior', flete: 0, locs: ['Interior (a cotizar)'] },
    ],
    localidades() {
      const base = [];
      this._ZONAS.forEach(z => z.locs.forEach(l =>
        base.push({ k: slug(l), label: l, zona: z.zona, flete: z.flete })));
      // Las cargadas a mano se suman al final, marcadas como propias.
      let extra = [];
      try { extra = JSON.parse(localStorage.getItem('bh_locs') || '[]'); } catch (e) {}
      extra.forEach(l => { if (!base.some(b => b.k === l.k)) base.push({ ...l, manual: true }); });
      return base;
    },
    localidad(k) { return this.localidades().find(l => l.k === k) || null; },
    // Alta manual: la localidad que no está en el mapa se carga acá y queda.
    agregarLocalidad(label, flete = 0, zona = 'Cargada a mano') {
      const l = { k: slug(label), label: String(label).trim(), zona, flete: Number(flete) || 0 };
      if (!l.label) return null;
      let extra = [];
      try { extra = JSON.parse(localStorage.getItem('bh_locs') || '[]'); } catch (e) {}
      if (!extra.some(x => x.k === l.k) && !this._ZONAS.some(z => z.locs.some(n => slug(n) === l.k))) {
        extra.push(l);
        try { localStorage.setItem('bh_locs', JSON.stringify(extra)); } catch (e) {}
      }
      return l;
    },
    fleteDe(localidadK) {
      return (this.localidad(localidadK) || {}).flete || 0;
    },

    // Plazo de entrega estándar. Si el vendedor lo edita, la orden salta a
    // verificación (queda contabilizado el cambio de plazo).
    // Plazo estándar de fabricación, en días. La cotización muestra las fechas
    // que salen de acá ("entre 15/09 y el 20/09") con el plazo entre paréntesis.
    ENTREGA_DIAS: { min: 30, max: 35 },
    // El plazo baja en cascada: lo del mueble manda; si no tiene, el de su
    // categoría; y si tampoco, el estándar de la casa. Así una cómoda tarda lo
    // que tardan las cómodas sin cargarlo mueble por mueble, pero el que se
    // aparta —porque su color siempre está en stock— se pisa y listo.
    PLAZO_KEY: 'bh_plazo_cat',
    plazosCat() {
      try { return JSON.parse(localStorage.getItem(this.PLAZO_KEY)) || {}; } catch { return {}; }
    },
    plazoCat(id) { return Number(this.plazosCat()[id]) || 0; },
    guardarPlazoCat(id, dias) {
      const t = this.plazosCat();
      const n = Math.max(0, Number(dias) || 0);
      if (n) t[id] = n; else delete t[id];
      try { localStorage.setItem(this.PLAZO_KEY, JSON.stringify(t)); } catch {}
    },
    // De dónde sale el plazo y por qué. La razón se muestra en pantalla: sin
    // eso nadie sabe si el número lo puso alguien o lo heredó. La variante es
    // el escalón más fino y el que más importa: si de la cómoda Miami 1,20
    // paraíso y blanco siempre hay alguna en producción, esa entrega en 15
    // días aunque el resto del modelo tarde 30.
    plazoDe(prod, cats = [], v = null) {
      if (Number(v && v.dias)) return { dias: Number(v.dias), de: 'variante' };
      if (Number(prod && prod.dias)) return { dias: Number(prod.dias), de: 'mueble' };
      for (const c of cats) {
        const d = this.plazoCat(c.id);
        if (d) return { dias: d, de: 'categoria', cat: c };
      }
      return { dias: this.ENTREGA_DIAS.max, de: 'casa' };
    },
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
    // Leyendas del presupuesto impreso.
    VALIDEZ_DIAS: 7,
    SENA_PCT: 30,
    // Con qué se puede cobrar según la condición pactada. Mercado Pago no entra
    // en una venta cerrada en efectivo, por ejemplo.
    METODOS_PAGO: [
      { k: 'efectivo',      label: 'Efectivo' },
      { k: 'transferencia', label: 'Transferencia' },
      { k: 'mercadopago',   label: 'Mercado Pago' },
    ],
    METODOS_POR_CONDICION: {
      efectivo:      ['efectivo', 'transferencia'],
      transferencia: ['transferencia'],
      lista:         ['transferencia', 'mercadopago'],
      mixto:         ['efectivo', 'transferencia', 'mercadopago'],
    },
    metodosDe(condicion) {
      return this.METODOS_POR_CONDICION[condicion] || this.METODOS_PAGO.map(m => m.k);
    },
    SENA_LEYENDA: '30% para iniciar la fabricación',
    EMPRESA: {
      nombre: 'Belgrano Home',
      lema: 'Transformamos hogares',
      direccion: 'Av. Belgrano 2020-2299',
      instagram: '@belgranohome',
      telefono: '11 3359 5571',
    },

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
    // Próximo número de orden, sin consumirlo: se muestra al confirmar.
    proximoNumeroOrden(local) {
      return `OV-${local}-${String(_seqOrden + 1).padStart(4, '0')}`;
    },
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
