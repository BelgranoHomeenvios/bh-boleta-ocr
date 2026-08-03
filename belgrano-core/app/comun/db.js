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
    proximaSerie() {
      let n = 0;
      try { n = Number(localStorage.getItem('bh_serie')) || 0; } catch {}
      return this.serieDe(n + 1);
    },
    tomarSerie() {
      let n = 0;
      try { n = Number(localStorage.getItem('bh_serie')) || 0; } catch {}
      n++;
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
        pie: 'La está haciendo el proveedor. Todavía no llegó, pero se puede reservar.' },
      { k: 'stock', label: 'En stock', pill: 'ok',
        pie: 'Llegó, tiene etiqueta y está en su ubicación.' },
      { k: 'entregada', label: 'Entregada', pill: 'soft',
        pie: 'Ya salió. Queda el histórico para los reclamos.' },
    ],
    estadoUnidad(k) { return this.ESTADOS_UNIDAD.find(x => x.k === k) || this.ESTADOS_UNIDAD[1]; },

    // CÓMO está. No reemplaza al estado: una unidad a reparar sigue estando
    // físicamente y tiene que contar en el inventario, sólo que no se vende.
    MARCAS_UNIDAD: [
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
      { k: 'medida', label: 'A medida' },
    ],

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
      const PROV = ['1Tony', '3Luciano', '5Enrique', '6Matías', '7Raúl'];
      const out = [];
      let n = 0;
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
            ubicacion: UBI[n % UBI.length], proveedor: PROV[n % PROV.length],
            llega: '', listo: `${(n % 28) + 1}/7`,
            orden: j === 0 && i % 3 === 0 ? `#S00${200 + i}` : null,
            fechaVenta: j === 0 && i % 3 === 0 ? `${(n % 28) + 1}/6` : '',
            marca: i % 11 === 0 && j === 0 ? 'reparar' : null });
        }
        for (let j = 0; j < enProd; j++) {
          n++;
          out.push({ ...base, id: n, serie: '—', estado: 'produccion',
            ubicacion: '', proveedor: PROV[n % PROV.length],
            llega: `${(n % 28) + 1}/8`, listo: '',
            orden: j === 0 && i % 4 === 0 ? `#S00${240 + i}` : null,
            fechaVenta: j === 0 && i % 4 === 0 ? `${(n % 28) + 1}/7` : '',
            tipo: i % 5 === 0 ? 'medida' : 'estandar',
            detalle: i % 5 === 0 ? 'A medida' : '' });
        }
        // Vendidas que todavía no se le pidieron a nadie: nacen con la venta.
        const aPedir = [0, 0, 1, 0, 0, 1, 0, 0][i % 8];
        for (let j = 0; j < aPedir; j++) {
          n++;
          out.push({ ...base, id: n, serie: '—', estado: 'pedir',
            ubicacion: '', proveedor: '', llega: '', listo: '',
            orden: `#S00${260 + i}`, fechaVenta: `${(n % 28) + 1}/7`,
            tipo: i % 3 === 0 ? 'medida' : 'estandar',
            detalle: i % 3 === 0 ? 'A medida' : '' });
        }
        for (let j = 0; j < salidas; j++) {
          n++;
          out.push({ ...base, id: n, serie: this.serieDe(n), estado: 'entregada',
            ubicacion: '', proveedor: PROV[n % PROV.length],
            llega: '', listo: `${(n % 28) + 1}/5`, orden: `#S00${100 + n}`,
            fechaVenta: `${(n % 28) + 1}/5`, fechaEntrega: `${(n % 28) + 1}/6`,
            marca: n % 17 === 0 ? 'reclamo' : null });
        }
      });
      this._unis = out;
      return out;
    },
    unidad(id) { return this.unidadesTodas().find(u => u.id === Number(id)) || null; },
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
    RUBROS: [
      { k: 'carpinteria', label: 'Carpintería' },
      { k: 'herreria', label: 'Herrería' },
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
      { nombre: 'Tony', rubro: 'carpinteria', capacidad: 12 },
      { nombre: 'Andrés', rubro: 'carpinteria', capacidad: 8 },
      { nombre: 'Luciano', rubro: 'carpinteria', capacidad: 10 },
      { nombre: 'Sergio', rubro: 'carpinteria', capacidad: 6 },
      { nombre: 'Marcelo', rubro: 'carpinteria', capacidad: 9 },
      { nombre: 'Herrería Sur', rubro: 'herreria', capacidad: 15 },
      { nombre: 'Carla', rubro: 'herreria', capacidad: 10 },
      { nombre: 'Laqueados Vera', rubro: 'laqueado', capacidad: 20 },
    ],
    proveedores(rubro) {
      let guardados = [];
      try { guardados = JSON.parse(localStorage.getItem(this.PROV_KEY)) || []; } catch {}
      const out = this.PROV_BASE.map(x => ({ ...x }));
      guardados.forEach(g => {
        if (!out.some(x => sinTilde(x.nombre) === sinTilde(g.nombre))) out.push({ ...g });
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
      const ya = this.proveedores().find(x => sinTilde(x.nombre) === sinTilde(n));
      if (ya) return ya;
      let guardados = [];
      try { guardados = JSON.parse(localStorage.getItem(this.PROV_KEY)) || []; } catch {}
      const nuevo = { nombre: n, rubro: rubro || 'carpinteria', capacidad: Number(capacidad) || 0 };
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
