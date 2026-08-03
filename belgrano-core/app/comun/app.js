// =====================================================================
//  Belgrano Soft · Núcleo del shell
//  Plataforma de módulos independientes con un mismo Core. Navegación de
//  DOS niveles: el rail primario elige el módulo; al entrar, la sub-nav
//  cambia por completo a la de ese módulo. Cada módulo aterriza en su
//  Resumen (nunca directo en una tabla). "Los módulos resuelven un trabajo."
//  Login real y permisos finos: después. Hoy, selector "Ver como".
// =====================================================================
(function (global) {
  const S = (k, label, r) => ({ k, label, r });
  const skel = label => (m) => global.Esq.sub(m, label);
  const resumen = key => (m) => global.Resumen.render(m, key);

  // Nivel 1 (macro) + nivel 2 (sub-navegación de cada módulo).
  const MODULOS = {
    dashboard: { label: 'Inicio', icon: '🏠', home: true, r: m => global.Inicio.render(m) },

    pendientes: { label: 'Mis pendientes', icon: '📌', home: true, r: m => global.Pendientes.render(m) },

    crm: { label: 'CRM', icon: '💬', subs: [
      S('resumen', 'Resumen', resumen('crm')),
      S('clientes', 'Clientes', m => global.Clientes.render(m)),
      S('consultas', 'Consultas', skel('Consultas / atenciones')),
      S('seguimientos', 'Seguimientos', skel('Seguimientos')),
      S('fusiones', 'Fusionar', skel('Fusionar clientes')),
    ]},

    ventas: { label: 'Ventas', icon: '💰', subs: [
      S('resumen', 'Resumen', m => global.VentasPanel.render(m)),
      S('nueva', 'Nueva cotización', m => global.Presupuesto.render(m)),
      S('cotizaciones', 'Cotizaciones', m => global.Cotizaciones.render(m)),
      // "A confirmar", "Modificaciones" y "Autorizaciones" no son solapas propias:
      // se resuelven adentro de Resumen y de Or. Venta.
      S('ordenes', 'Or. Venta', m => global.Ordenes.render(m)),
      S('clientes', 'Clientes', m => global.Clientes.render(m)),
      S('agenda', 'Agenda', skel('Agenda del vendedor')),
      S('comisiones', 'Comisiones', skel('Comisiones (con venta compartida)')),
      S('indicadores', 'Indicadores', skel('Indicadores de ventas')),
    ]},

    catalogo: { label: 'Catálogo', icon: '🪑', subs: [
      S('resumen', 'Resumen', resumen('catalogo')),
      S('productos', 'Productos', m => global.Catalogo.render(m)),
      S('familias', 'Familias', skel('Familias')),
      S('variantes', 'Variantes', skel('Variantes')),
      S('planillas', 'Planillas', m => global.Planillas.render(m)),
      S('materiales', 'Materiales', skel('Materiales')),
      S('colores', 'Colores', skel('Colores')),
      S('herrajes', 'Herrajes', skel('Herrajes')),
      S('accesorios', 'Accesorios', skel('Accesorios')),
      S('versiones', 'Versiones', skel('Versiones / importaciones')),
    ]},

    produccion: { label: 'Producción', icon: '🏭', subs: [
      S('resumen', 'Resumen', resumen('produccion')),
      S('fabricar', 'A fabricar', m => global.Produccion.render(m)),
      S('vendidos', 'Vendidos', m => global.ProdVendidos.render(m)),
      S('dibujar', 'A dibujar', m => global.ProdDibujos.render(m)),
      S('pedidos', 'Pedidos', m => global.ProdPedidos.render(m)),
      S('recepcion', 'Recepción', m => global.ProdRecepcion.render(m)),
      S('cola', 'Cola de trabajo', skel('Cola de trabajo')),
      S('planificacion', 'Planificación', skel('Planificación')),
      S('sectores', 'Sectores', skel('Sectores')),
      S('operarios', 'Operarios', skel('Operarios')),
      S('capacidad', 'Capacidad', skel('Capacidad')),
      S('incidencias', 'Incidencias', skel('Incidencias')),
      S('calidad', 'Control de calidad', skel('Control de calidad')),
      S('historial', 'Historial', skel('Historial')),
    ]},

    compras: { label: 'Compras', icon: '🛒', subs: [
      S('resumen', 'Resumen', resumen('compras')),
      S('oc', 'Órdenes de compra', m => global.ComprasOC.render(m)),
      S('recepciones', 'Recepciones a conformar', m => global.ComprasRecepciones.render(m)),
      S('proveedores', 'Proveedores', skel('Proveedores')),
      S('comparador', 'Comparador', skel('Comparador de precios')),
      S('pendientes', 'Pendientes', skel('Pendientes')),
      S('historial', 'Historial', skel('Historial')),
      S('indicadores', 'Indicadores', skel('Indicadores')),
    ]},

    inventario: { label: 'Inventario', icon: '📦', subs: [
      S('resumen', 'Resumen', resumen('inventario')),
      S('unidades', 'Unidades', m => global.Unidades.render(m)),
      S('movimientos', 'Movimientos', skel('Movimientos')),
      S('ubicaciones', 'Ubicaciones', skel('Ubicaciones')),
      S('reservas', 'Reservas', skel('Reservas')),
      S('conteos', 'Conteos', skel('Conteos')),
      S('ajustes', 'Ajustes', skel('Ajustes')),
      S('alertas', 'Alertas', skel('Alertas')),
      S('historial', 'Historial', skel('Historial')),
    ]},

    logistica: { label: 'Logística', icon: '🚚', subs: [
      S('resumen', 'Resumen', resumen('logistica')),
      S('agenda', 'Agenda', skel('Agenda de entregas')),
      S('entregas', 'Entregas', skel('Entregas')),
      S('proximas', 'Próximas', skel('Próximas entregas')),
      S('choferes', 'Choferes', skel('Choferes')),
      S('vehiculos', 'Vehículos', skel('Vehículos')),
      S('mapa', 'Mapa', skel('Mapa de entregas')),
      S('indicadores', 'Indicadores', skel('Indicadores')),
    ]},

    tesoreria: { label: 'Tesorería', icon: '💳', subs: [
      S('resumen', 'Resumen', resumen('tesoreria')),
      S('cobros', 'Cobros', skel('Cobros')),
      S('senas', 'Señas', skel('Señas')),
      S('rendiciones', 'Rendiciones', skel('Rendiciones')),
      S('cajas', 'Cajas', skel('Cajas')),
      S('movimientos', 'Movimientos', skel('Movimientos')),
      S('facturas', 'Facturas', skel('Facturas · Nacional Soft')),
      S('indicadores', 'Indicadores', skel('Indicadores')),
    ]},

    reclamos: { label: 'Reclamos', icon: '🛠️', subs: [
      S('resumen', 'Resumen', resumen('reclamos')),
      S('abiertos', 'Abiertos', skel('Reclamos abiertos')),
      S('gestion', 'En gestión', skel('En gestión')),
      S('resueltos', 'Resueltos', skel('Resueltos')),
      S('motivos', 'Motivos', skel('Motivos')),
      S('indicadores', 'Indicadores', skel('Indicadores')),
    ]},

    config: { label: 'Configuración', short: 'Config', icon: '⚙️', subs: [
      S('resumen', 'Resumen', resumen('config')),
      S('usuarios', 'Usuarios', skel('Usuarios')),
      S('roles', 'Roles y permisos', skel('Roles y permisos')),
      S('locales', 'Locales', skel('Locales')),
      S('vendedores', 'Vendedores', skel('Vendedores')),
      S('precios', 'Reglas de precio', m => global.Precios.render(m)),
      S('series', 'Series y numeración', skel('Series y numeración')),
    ]},
  };

  // Cada rol ve un subconjunto de módulos. Permisos finos: se afinan después.
  const ROLES = {
    direccion:      { label: 'Dirección',              tabs: ['dashboard', 'pendientes', 'crm', 'ventas', 'catalogo', 'produccion', 'compras', 'inventario', 'logistica', 'tesoreria', 'reclamos', 'config'] },
    // El vendedor NO entra al catálogo: ve los muebles publicados desde
    // Inventario, con sus variantes e imágenes, sin costos ni edición.
    vendedor:       { label: 'Vendedor',               tabs: ['dashboard', 'pendientes', 'ventas', 'crm', 'inventario'] },
    administrativo: { label: 'Administrativo',         tabs: ['dashboard', 'pendientes', 'ventas', 'tesoreria', 'compras', 'inventario', 'reclamos'] },
    // Producción ve todo el catálogo MENOS costo, markup, margen y ganancia,
    // y sólo lo lee: si algo hay que cambiar, lo pide.
    prod:           { label: 'Encargado de Producción', tabs: ['dashboard', 'pendientes', 'produccion', 'inventario', 'compras', 'catalogo'] },
    logi:           { label: 'Logística',              tabs: ['dashboard', 'pendientes', 'logistica', 'reclamos'] },
    gestion:        { label: 'Gestión de Cliente',     tabs: ['dashboard', 'pendientes', 'crm', 'ventas'] },
  };

  // Quién puede hacer qué. Se afina cuando exista el login real; hoy sale del
  // selector "Ver como".
  const PERMISOS = {
    // Los números de costo, markup, margen y ganancia son sólo de Dirección.
    verCostos: ['direccion'],
    // Editar el catálogo (nombres, propiedades, valores, precios) también.
    editarCatalogo: ['direccion'],
  };

  const App = {
    rol: 'direccion',
    tab: null,
    _sub: {},   // recuerda la última sub-solapa por módulo

    async init() {
      this.montarShell();
      this.setRol(localStorage.getItem('bh_rol') || 'direccion');
    },

    montarShell() {
      document.body.innerHTML = `
        <header class="appbar">
          <div class="logo">BS</div>
          <div class="brand">Belgrano Soft</div>
          <nav class="mods" id="nav"></nav>
          <div class="sp"></div>
          <div class="vercomo"><span>Ver como</span><select id="selRol"></select></div>
          <button class="ic-btn" title="Notificaciones">🔔<span class="dot">8</span></button>
          <div class="user"><b>Brian</b><small id="rol-lbl"></small></div>
          <div class="avatar">BJ</div>
        </header>
        <div class="subbar" id="subbar"></div>
        <main id="view"></main>`;

      const sel = document.getElementById('selRol');
      sel.innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${UI.esc(r.label)}</option>`).join('');
      sel.onchange = () => this.setRol(sel.value);
    },

    setRol(rol) {
      if (!ROLES[rol]) rol = 'direccion';
      this.rol = rol;
      localStorage.setItem('bh_rol', rol);
      document.getElementById('selRol').value = rol;
      const rl = document.getElementById('rol-lbl'); if (rl) rl.textContent = ROLES[rol].label;
      const tabs = ROLES[rol].tabs;
      const nav = document.getElementById('nav');
      nav.innerHTML = tabs.map(t =>
        `<button class="modpill" data-tab="${t}">${UI.esc(MODULOS[t].short || MODULOS[t].label)}</button>`).join('');
      nav.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => this.setTab(b.dataset.tab));
      this.setTab(tabs.includes(this.tab) ? this.tab : tabs[0]);
    },

    setTab(key) {
      this.tab = key;
      document.querySelectorAll('#nav [data-tab]').forEach(b => b.setAttribute('aria-current', b.dataset.tab === key));
      const mod = MODULOS[key];
      const view = document.getElementById('view');
      const subbar = document.getElementById('subbar');
      if (!mod) { subbar.innerHTML = ''; view.innerHTML = UI.vacio('Módulo no encontrado.'); return; }

      if (mod.home || !mod.subs) {
        subbar.innerHTML = '';
        view.innerHTML = '<div id="mview"></div>';
        mod.r('mview');
        return;
      }
      const cur = this._sub[key] || mod.subs[0].k;
      subbar.innerHTML = mod.subs.map(s => `<button class="subtab" data-sub="${s.k}">${UI.esc(s.label)}</button>`).join('');
      subbar.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => this.goSub(key, b.dataset.sub));
      view.innerHTML = '<div id="mview"></div>';
      this._renderSub(key, cur);
    },

    _renderSub(key, subK) {
      const mod = MODULOS[key];
      const s = mod.subs.find(x => x.k === subK) || mod.subs[0];
      this._sub[key] = s.k;
      document.querySelectorAll('#subbar [data-sub]').forEach(b => b.setAttribute('aria-current', b.dataset.sub === s.k));
      const mv = document.getElementById('mview');
      if (mv) mv.innerHTML = '';
      s.r('mview');
    },

    // Navegar a un módulo y una sub-solapa concreta (para atajos y saltos entre módulos).
    goSub(key, subK) {
      if (this.tab !== key) { this._sub[key] = subK; this.setTab(key); }
      else this._renderSub(key, subK);
    },
  };

  App.puede = function (que) { return (PERMISOS[que] || []).includes(this.rol); };
  App.verCostos = function () { return this.puede('verCostos'); };
  App.editaCatalogo = function () { return this.puede('editarCatalogo'); };

  global.App = App;
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => App.init());
})(typeof window !== 'undefined' ? window : globalThis);
