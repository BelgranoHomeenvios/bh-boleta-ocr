// =====================================================================
//  Belgrano Soft · Configuración → Reglas de precio
//  Acá vive el descuento que lleva cada condición de pago. Es información
//  INTERNA: en la cotización el cliente sólo ve el nombre ("Efectivo"), el
//  porcentaje se administra únicamente desde esta pantalla.
//  Todo nace del precio de lista; cada condición le aplica su descuento.
// =====================================================================
(function (global) {
  const Precios = {
    _mount: 'view',

    render(mount = 'view') {
      this._mount = mount;
      const conds = global.DB.condiciones();
      document.getElementById(mount).innerHTML = UI.head('Configuración', 'Reglas de precio',
        'El descuento de cada condición de pago. Todo sale del precio de lista.') + `
        <div class="banner" style="margin-bottom:14px">
          Esto es <b>interno</b>: en la cotización y en lo que recibe el cliente sólo
          aparece el nombre de la condición, nunca el porcentaje.
        </div>
        <div class="card pad" style="max-width:640px">
          <div class="rp-head"><span>Condición de pago</span><span style="text-align:right">Descuento</span><span>Sobre lista</span></div>
          ${conds.map(c => `<div class="rp-row">
            <div><b>${UI.esc(c.label)}</b>${c.manual
              ? '<div class="muted" style="font-size:11.5px">El vendedor arma cada precio a mano</div>' : ''}</div>
            <div class="rp-in">${c.manual ? '<span class="muted">—</span>'
              : `<input type="number" min="0" max="100" step="1" value="${c.desc}" data-c="${c.k}"><span>%</span>`}</div>
            <div class="muted rp-eq" id="eq-${c.k}"></div>
          </div>`).join('')}
          <div class="row" style="margin-top:16px;justify-content:flex-end;gap:10px">
            <button class="btn" id="rp-reset">Volver a los valores base</button>
            <button class="btn primary" id="rp-ok">Guardar</button>
          </div>
        </div>
        <style>
          .rp-head,.rp-row{display:grid;grid-template-columns:minmax(0,1fr) 130px 150px;gap:12px;align-items:center}
          .rp-head{padding-bottom:9px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:1px solid var(--line)}
          .rp-row{padding:11px 0;border-bottom:1px solid var(--line-soft)}
          .rp-in{display:flex;align-items:center;gap:6px;justify-content:flex-end}
          .rp-in input{width:76px;text-align:right;padding:6px 8px}
          .rp-eq{font-size:12.5px}
        </style>`;

      const ejemplo = () => {
        // Referencia rápida sobre un precio de lista redondo.
        const BASE = 1000000;
        conds.forEach(c => {
          const el = document.getElementById('eq-' + c.k); if (!el) return;
          if (c.manual) { el.textContent = 'a definir por línea'; return; }
          const inp = this._inp(c.k);
          const d = inp ? Math.min(100, Math.max(0, Number(inp.value) || 0)) : c.desc;
          el.innerHTML = `${UI.pesos(BASE)} → <b class="tnum" style="color:var(--navy)">${UI.pesos(BASE * (1 - d / 100))}</b>`;
        });
      };

      document.querySelectorAll('[data-c]').forEach(i => i.oninput = ejemplo);
      document.getElementById('rp-ok').onclick = () => {
        const mapa = {};
        conds.forEach(c => {
          if (c.manual) return;
          const inp = this._inp(c.k); if (!inp) return;
          mapa[c.k] = Math.min(100, Math.max(0, Math.round(Number(inp.value) || 0)));
        });
        global.DB.guardarCondiciones(mapa);
        UI.aviso('Reglas de precio guardadas', 'ok');
        this.render(this._mount);
      };
      document.getElementById('rp-reset').onclick = () => {
        global.DB.guardarCondiciones({});
        try { localStorage.removeItem('bh_cond'); } catch (e) {}
        UI.aviso('Se volvió a los valores base', 'ok');
        this.render(this._mount);
      };
      ejemplo();
    },

    _inp(k) { return document.querySelector(`[data-c="${k}"]`); },
  };
  global.Precios = Precios;
})(typeof window !== 'undefined' ? window : globalThis);
