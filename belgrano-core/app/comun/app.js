// =====================================================================
//  Belgrano Soft · shell
//  Selector "ver como" (sin login todavía) + navegación por rol.
//  Cada rol ve solo sus solapas. El login real llega después.
// =====================================================================
(function (global) {
  // Qué solapas ve cada rol. La clave es el módulo; el label lo que se lee.
  const MODULOS = {
    ventas:         { label: 'Ventas',         render: () => global.Ventas.render() },
    catalogo:       { label: 'Catálogo',       render: () => global.Catalogo.render() },
    caja:           { label: 'Caja',           render: () => global.Esq.render('caja') },
    produccion:     { label: 'Producción',     render: () => global.Produccion.render() },
    logistica:      { label: 'Logística',      render: () => global.Esq.render('logistica') },
    reclamos:       { label: 'Reclamos',       render: () => global.Esq.render('reclamos') },
    abastecimiento: { label: 'Abastecimiento', render: () => global.Esq.render('abastecimiento') },
    facturas:       { label: 'Facturas',       render: () => global.Esq.render('facturas') },
    reportes:       { label: 'Reportes',       render: () => global.Esq.render('reportes') },
    config:         { label: 'Configuración',  render: () => global.Esq.render('config') },
  };
  // Los 6 roles y qué módulos ve cada uno (permisos finos: se afinan después).
  const ROLES = {
    vendedor:      { label: 'Vendedor',              tabs: ['ventas', 'catalogo', 'produccion', 'logistica'] },
    direccion:     { label: 'Dirección',             tabs: ['ventas', 'catalogo', 'caja', 'produccion', 'logistica', 'reclamos', 'abastecimiento', 'facturas', 'reportes', 'config'] },
    administrativo:{ label: 'Administrativo',        tabs: ['ventas', 'facturas', 'caja', 'catalogo'] },
    prod:          { label: 'Encargado de Producción', tabs: ['produccion', 'abastecimiento', 'catalogo'] },
    logi:          { label: 'Logística',             tabs: ['logistica', 'reclamos', 'catalogo'] },
    gestion:       { label: 'Gestión de Cliente',    tabs: ['ventas', 'catalogo'] },
  };

  const App = {
    rol: 'vendedor',
    tab: null,

    async init() {
      this.montarShell();
      // Si no hay conexión configurada, ofrecer conectar (una sola vez).
      if (!global.DB.hayConexion()) this.pedirConexion();
      this.setRol(localStorage.getItem('bh_rol') || 'vendedor');
    },

    montarShell() {
      document.body.innerHTML = `
        <div id="top">
          <div class="brand">Belgrano&nbsp;Soft <span class="m" id="modo"></span></div>
          <div class="sp"></div>
          <div class="verComo">
            <span style="opacity:.7">Ver como</span>
            <select id="selRol"></select>
          </div>
        </div>
        <nav id="nav"></nav>
        <main id="view"></main>`;
      const sel = document.getElementById('selRol');
      sel.innerHTML = Object.entries(ROLES)
        .map(([k, r]) => `<option value="${k}">${UI.esc(r.label)}</option>`).join('');
      sel.onchange = () => this.setRol(sel.value);
      document.getElementById('modo').textContent =
        global.DB.modo() === 'demo' ? '· demo' : '';
    },

    setRol(rol) {
      if (!ROLES[rol]) rol = 'vendedor';
      this.rol = rol;
      localStorage.setItem('bh_rol', rol);
      document.getElementById('selRol').value = rol;
      const tabs = ROLES[rol].tabs;
      document.getElementById('nav').innerHTML = tabs
        .map(t => `<button data-tab="${t}">${UI.esc(MODULOS[t].label)}</button>`).join('');
      document.querySelectorAll('#nav button').forEach(b =>
        b.onclick = () => this.setTab(b.dataset.tab));
      this.setTab(tabs.includes(this.tab) ? this.tab : tabs[0]);
    },

    setTab(tab) {
      this.tab = tab;
      document.querySelectorAll('#nav button').forEach(b =>
        b.setAttribute('aria-current', b.dataset.tab === tab));
      document.getElementById('view').innerHTML = '';
      MODULOS[tab].render();
    },

    pedirConexion() {
      const v = document.getElementById('view');
      // Se muestra en la primera pantalla; no bloquea el modo demo.
      setTimeout(() => {
        if (global.DB.hayConexion()) return;
      }, 0);
    },
  };

  global.App = App;
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => App.init());
})(typeof window !== 'undefined' ? window : globalThis);
