// =====================================================================
//  Belgrano Soft · shell
//  Selector "ver como" (sin login todavía) + navegación por rol.
//  Cada rol ve solo sus solapas. El login real llega después.
// =====================================================================
(function (global) {
  // Qué solapas ve cada rol. La clave es el módulo; el label lo que se lee.
  const MODULOS = {
    catalogo:   { label: 'Catálogo',    render: () => global.Catalogo.render() },
    presupuesto:{ label: 'Presupuestos',render: () => global.Presupuesto.render() },
  };
  const ROLES = {
    vendedor:   { label: 'Vendedor',            tabs: ['presupuesto', 'catalogo'] },
    produccion: { label: 'Producción · Iara',   tabs: ['catalogo'] },
    direccion:  { label: 'Dirección · Brian',   tabs: ['catalogo', 'presupuesto'] },
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
