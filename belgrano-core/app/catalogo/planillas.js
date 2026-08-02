// =====================================================================
//  Belgrano Soft · Planillas de pedido
//  Todas juntas en un solo lado. Una planilla dice CÓMO se le pide un
//  mueble a un rubro: qué columnas lleva y de dónde sale cada valor.
//  La de respaldos se usa en los 40 respaldos — se edita acá una vez y
//  el cambio le llega a todos.
// =====================================================================
(function (global) {
  const Planillas = {
    _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      this.pintar();
    },

    // Qué muebles usan cada planilla, para saber a quién le pega un cambio.
    usos(k) { return global.DB.usosPlanilla(k); },

    pintar() {
      const v = document.getElementById(this._mount); if (!v) return;
      const ed = !global.App || !global.App.editaCatalogo || global.App.editaCatalogo();
      const lista = global.DB.planillas();

      v.innerHTML = `
        <div class="pl-wrap">
          <div class="row" style="margin-bottom:14px">
            <div>
              <div class="kick">Catálogo</div>
              <h1 class="h-title">Planillas de pedido</h1>
              <div class="h-sub">Cómo se le pide cada tipo de mueble a su rubro.
                ${lista.length} ${lista.length === 1 ? 'planilla' : 'planillas'}.</div>
            </div>
            <div class="sp"></div>
            ${ed ? '<button class="btn primary" id="pz-nueva">＋ Nueva planilla</button>' : ''}
          </div>

          <div class="banner info">Una planilla se arma una vez y se usa en todos los muebles que se
            piden igual. Si un mueble no tiene una de las propiedades de la planilla, ese casillero le
            queda vacío — igual que hoy en el papel.</div>

          ${lista.map(t => this.tarjeta(t, ed)).join('')
            || UI.vacio('Todavía no hay planillas. Se crean desde acá o desde Producción de un mueble.')}
        </div>
        ${this.estilos()}`;

      if (ed && document.getElementById('pz-nueva')) {
        document.getElementById('pz-nueva').onclick = () => this.modalNueva();
      }
      document.querySelectorAll('[data-abrir]').forEach(b =>
        b.onclick = () => this.abrir(b.dataset.abrir));
    },

    tarjeta(t, ed) {
      const n = this.usos(t.k);
      return `<section class="card pad pz-t">
        <div class="row">
          <div>
            <div class="pz-n">${UI.esc(t.nombre)}</div>
            <div class="hint">${t.cols.length} columnas ·
              ${n ? `<b>${n}</b> ${n === 1 ? 'mueble la usa' : 'muebles la usan'}`
                  : 'todavía no la usa ningún mueble'}</div>
          </div>
          <div class="sp"></div>
          ${ed ? `<button class="btn" data-abrir="${UI.esc(t.k)}">✎ Editar</button>` : ''}
        </div>
        <div class="pz-cols">${t.cols.map(c => `<span class="chip">${UI.esc(c.label)}
          <small class="muted">${UI.esc(this.nombreOrigen(c.origen))}</small></span>`).join('')}</div>
      </section>`;
    },

    nombreOrigen(k) {
      const o = (global.DB.ORIGENES || []).find(x => x.k === k);
      return o ? o.label.toLowerCase() : k;
    },

    // El detalle de una planilla: sus columnas y qué muebles la usan.
    abrir(k) {
      const t = global.DB.planilla(k); if (!t) return;
      const n = this.usos(k);
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:18px">${UI.esc(t.nombre)}</h3>
        <p class="h-sub">${t.cols.length} columnas ·
          ${n ? `la usan <b>${n}</b> ${n === 1 ? 'mueble' : 'muebles'}` : 'sin usar todavía'}</p>
        ${n ? `<div class="banner warn" style="margin-top:12px">Lo que cambies acá se cambia en
          <b>${n}</b> ${n === 1 ? 'mueble' : 'muebles'}.</div>` : ''}
        <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
          <input id="pz-nom" value="${UI.esc(t.nombre)}"></label>
        <div class="ad-t" style="margin-top:14px">Columnas</div>
        <div class="pz-lista" id="pz-lista">
          ${t.cols.map((c, i) => `<div class="pz-c" data-i="${i}">
            <input class="pz-lbl" data-lbl="${i}" value="${UI.esc(c.label)}">
            <select data-orig="${i}">${(global.DB.ORIGENES || []).map(o =>
              `<option value="${o.k}" ${c.origen === o.k ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}</select>
            ${['propiedad', 'producto'].includes(c.origen)
              ? `<input class="pz-campo" data-campo="${i}" value="${UI.esc(c.campo || '')}"
                  placeholder="clave">` : '<span></span>'}
            <button class="lx" data-quitar="${i}" title="Quitar">✕</button>
          </div>`).join('')}
        </div>
        <button class="btn" id="pz-add" style="margin-top:9px">⊞ Agregar columna</button>
        <div class="hint" style="margin-top:9px">La <b>clave</b> es el nombre interno de la propiedad
          (medida, tela, color). Si un mueble no la tiene, esa columna le queda vacía.</div>
        <div class="row" style="margin-top:18px;gap:10px">
          <button class="btn danger ghost" id="pz-borrar">Borrar planilla</button>
          <div class="sp"></div>
          <button class="btn" id="pz-x">Cancelar</button>
          <button class="btn primary" id="pz-ok">Guardar</button>
        </div>`, 620);

      const cols = JSON.parse(JSON.stringify(t.cols));
      const leer = () => {
        document.querySelectorAll('[data-lbl]').forEach(i =>
          cols[Number(i.dataset.lbl)].label = i.value.trim().toUpperCase() || 'COLUMNA');
        document.querySelectorAll('[data-orig]').forEach(sl =>
          cols[Number(sl.dataset.orig)].origen = sl.value);
        document.querySelectorAll('[data-campo]').forEach(i =>
          cols[Number(i.dataset.campo)].campo = i.value.trim());
      };
      document.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => {
        leer(); cols.splice(Number(b.dataset.quitar), 1);
        global.DB.guardarPlanilla(t.nombre, cols, t.k); cerrar(); this.abrir(k);
      });
      document.getElementById('pz-add').onclick = () => {
        leer(); cols.push({ label: 'NUEVA', origen: 'libre' });
        global.DB.guardarPlanilla(t.nombre, cols, t.k); cerrar(); this.abrir(k);
      };
      document.getElementById('pz-x').onclick = cerrar;
      document.getElementById('pz-ok').onclick = () => {
        leer();
        global.DB.guardarPlanilla(document.getElementById('pz-nom').value.trim() || t.nombre, cols, t.k);
        cerrar(); UI.aviso('Planilla guardada', 'ok'); this.pintar();
      };
      document.getElementById('pz-borrar').onclick = () => {
        if (n) return UI.aviso(`No se puede: la usan ${n} ${n === 1 ? 'mueble' : 'muebles'}`, 'warn');
        global.DB.borrarPlanilla(k); cerrar(); this.pintar();
      };
    },

    modalNueva() {
      const cerrar = this.modal(`
        <h3 class="h-title" style="font-size:17px">Nueva planilla</h3>
        <p class="h-sub">Arranca con las columnas de siempre y después se ajusta.</p>
        <label class="fld" style="margin-top:12px"><span class="lbl">Nombre</span>
          <input id="pn-n" placeholder="Respaldos, Sillas, Mesas…"></label>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
          <button class="btn" id="pn-x">Cancelar</button>
          <button class="btn primary" id="pn-ok">Crear</button>
        </div>`, 460);
      document.getElementById('pn-x').onclick = cerrar;
      const crear = () => {
        const n = document.getElementById('pn-n').value.trim();
        if (!n) return UI.aviso('Poné el nombre', 'warn');
        const t = global.DB.guardarPlanilla(n, [
          { label: 'ESTADO', origen: 'orden' },
          { label: 'MODELO', origen: 'producto', campo: 'nombre' },
          { label: 'CANT.', origen: 'cantidad' },
          { label: 'OBS', origen: 'libre' },
        ]);
        cerrar(); this.pintar(); this.abrir(t.k);
      };
      document.getElementById('pn-ok').onclick = crear;
      document.getElementById('pn-n').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); crear(); } };
    },

    modal(html, ancho = 520) {
      document.body.insertAdjacentHTML('beforeend',
        `<div class="mdlz" id="mdlz"><div class="card pad" style="max-width:${ancho}px;width:100%">${html}</div></div>`);
      const cerrar = () => { const m = document.getElementById('mdlz'); if (m) m.remove(); };
      document.getElementById('mdlz').onclick = e => { if (e.target.id === 'mdlz') cerrar(); };
      return cerrar;
    },

    estilos() {
      return `<style>
        .pl-wrap{max-width:920px;margin:0 auto}
        .pz-t{margin-bottom:9px}
        .pz-n{font-size:15px;font-weight:700;color:var(--navy)}
        .pz-cols{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
        .pz-cols .chip small{margin-left:5px;font-size:10.5px}
        .pz-lista{display:flex;flex-direction:column;gap:6px;max-height:320px;overflow:auto}
        .pz-c{display:grid;grid-template-columns:150px minmax(0,1fr) 110px 30px;gap:7px;align-items:center;
          border:1px solid var(--line);border-radius:9px;padding:6px 9px;background:var(--panel-2)}
        .pz-lbl{font-weight:650;font-size:12.5px;text-transform:uppercase}
        .pz-c select,.pz-campo{font-size:12px;padding:5px 8px}
        .ad-t{font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px}
        .hint{font-size:11.5px;color:var(--muted);line-height:1.45}
        .mdlz{position:fixed;inset:0;background:rgba(12,22,44,.4);z-index:50;display:grid;
          place-items:center;padding:20px}
        .btn.ghost{background:none;border-color:transparent;color:var(--crit)}
        .btn.ghost:hover{border-color:var(--crit)}
        .lx{border:0;background:none;cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;color:var(--muted)}
        .lx:hover{background:var(--panel-2)}
      </style>`;
    },
  };

  global.Planillas = Planillas;
})(typeof window !== 'undefined' ? window : globalThis);
