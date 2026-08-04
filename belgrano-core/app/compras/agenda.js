// =====================================================================
//  Belgrano Soft · Compras · Agenda de entregas
//  Cada taller llega con cuarenta o cincuenta muebles y el depósito no da
//  para dos en el mismo día. Por eso el día se reserva: uno por jornada,
//  y el que corre la fecha queda anotado. Un proveedor que la corre tres
//  veces por mes no es mala suerte, es un dato.
// =====================================================================
(function (global) {
  const Agenda = {
    _mount: 'view',
    _mes: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
      'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    DIAS: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],

    // El mes que se está mirando. Arranca en el de hoy.
    mes() {
      if (this._mes == null) this._mes = new Date().getMonth();
      return this._mes;
    },

    // Las celdas del mes, arrancando el lunes de la primera semana.
    celdas() {
      const hoy = new Date();
      const año = hoy.getFullYear();
      const m = this.mes();
      const primero = new Date(año, m, 1);
      // getDay() da 0 para domingo; acá la semana arranca el lunes.
      const corr = (primero.getDay() + 6) % 7;
      const ultimo = new Date(año, m + 1, 0).getDate();
      const out = [];
      for (let i = 0; i < corr; i++) out.push(null);
      for (let d = 1; d <= ultimo; d++) {
        const fecha = `${d}/${m + 1}`;
        const r = global.DB.diaTomado(fecha);
        const finde = new Date(año, m, d).getDay();
        out.push({ d, fecha, r, finde: finde === 0 || finde === 6,
          hoy: d === hoy.getDate() && m === hoy.getMonth(),
          pasado: new Date(año, m, d) < new Date(año, hoy.getMonth(), hoy.getDate()) });
      }
      return out;
    },

    html() {
      const cs = this.celdas();
      const delMes = cs.filter(c => c && c.r);
      const muebles = delMes.reduce((a, c) => a + (c.r.muebles || 0), 0);
      const corridas = delMes.reduce((a, c) => a + (c.r.reprogramada || 0), 0);
      const libres = cs.filter(c => c && !c.r && !c.finde && !c.pasado).length;
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Agenda de entregas</h1>
            <div class="h-sub">Un proveedor por día — el depósito no da para dos</div></div>
          <div class="sp"></div>
          <div class="cx-nav">
            <button class="b-x" id="cx-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes()])}</b>
            <button class="b-x" id="cx-sig">›</button>
          </div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Entregas del mes', delMes.length, `${muebles} muebles en total`)}
          ${this.kpi('Días libres', libres, 'hábiles, sin nadie anotado')}
          ${this.kpi('Fechas corridas', corridas,
            corridas ? 'alguien reprogramó' : 'nadie corrió la fecha')}
        </div>

        <div class="card pad cx-cal">
          <div class="cx-cal-h">${this.DIAS.map(d => `<span>${d}</span>`).join('')}</div>
          <div class="cx-cal-g">${cs.map(c => this.celda(c)).join('')}</div>
        </div>

        ${delMes.length ? `<div class="cx-b" style="margin-top:16px">
          <div class="cx-b-h">Las entregas de ${UI.esc(this.MESES[this.mes()])}</div>
          <div class="card cx-tabla"><table>
            <thead><tr><th>Día</th><th>Proveedor</th><th>Muebles</th><th>Nota</th>
              <th>Corrió la fecha</th><th></th></tr></thead>
            <tbody>${delMes.map(c => `<tr class="${c.r.reprogramada > 1 ? 'ojo' : ''}">
              <td class="nom">${UI.esc(c.r.fecha)}</td>
              <td>${UI.esc(c.r.proveedor)}</td>
              <td>${c.r.muebles}</td>
              <td class="muted">${UI.esc(c.r.nota || '')}</td>
              <td class="muted">${c.r.reprogramada
                ? `<b class="${c.r.reprogramada > 1 ? 'mal' : ''}">${c.r.reprogramada} ${
                  c.r.reprogramada === 1 ? 'vez' : 'veces'}</b> ·
                  ${UI.esc((c.r.corridas || []).map(x => x.motivo).join(' · '))}`
                : 'no'}</td>
              <td class="td-acc">
                <button class="b-x" data-mover="${c.r.id}">Correr</button>
                <button class="b-x" data-libre="${c.r.id}">Liberar</button></td>
            </tr>`).join('')}</tbody></table></div>
        </div>` : ''}

        <div class="hint" style="margin-top:10px">Tocá un día libre para anotar quién viene. Si el
          día ya está tomado el sistema no deja poner a otro encima: hay que correr uno de los dos.</div>`;
    },

    celda(c) {
      if (!c) return '<span class="cx-d vacia"></span>';
      const cls = [c.finde ? 'finde' : '', c.hoy ? 'hoy' : '', c.pasado ? 'pasado' : '',
        c.r ? 'tomado' : 'libre'].filter(Boolean).join(' ');
      return `<button class="cx-d ${cls}" data-dia="${UI.esc(c.fecha)}"
        ${c.pasado ? 'disabled' : ''}>
        <span class="cx-d-n">${c.d}</span>
        ${c.r ? `<span class="cx-d-p">${UI.esc(c.r.proveedor)}</span>
          <span class="cx-d-m">${c.r.muebles} muebles</span>
          ${c.r.reprogramada ? `<span class="cx-d-r">corrida ${c.r.reprogramada}×</span>` : ''}`
          : ''}</button>`;
    },

    // ---- Anotar quién viene -------------------------------------------
    modalDia(fecha) {
      const ya = global.DB.diaTomado(fecha);
      const provs = global.DB.proveedores();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cx-mdl"><div class="card pad" style="max-width:400px;width:100%">
          <h3 class="h-title" style="font-size:17px">${ya ? 'Cambiar el' : 'Anotar el'} ${UI.esc(fecha)}</h3>
          <p class="h-sub">${ya ? `Hoy está ${UI.esc(ya.proveedor)}. Si ponés otro hay que
            correr a éste primero.` : 'Un solo proveedor por día.'}</p>
          <label class="fld"><span class="lbl">Quién viene</span>
            <select id="cx-prov">${provs.map(p => `<option value="${p.id}" ${
              ya && ya.provId === p.id ? 'selected' : ''}>${UI.esc(p.nombre)} · ${
              UI.esc((global.DB.rubro(p.rubro) || {}).label || p.rubro)}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">Cuántos muebles trae</span>
            <input id="cx-mue" type="number" value="${ya ? ya.muebles : 45}"></label>
          <label class="fld"><span class="lbl">Nota</span>
            <input id="cx-nota" value="${ya ? UI.esc(ya.nota || '') : ''}"
              placeholder="trae los del pedido cerrado"></label>
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cx-cancel">Cancelar</button>
            <button class="btn primary" id="cx-ok">Anotar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cx-mdl'); if (m) m.remove(); };
      document.getElementById('cx-cancel').onclick = cerrar;
      document.getElementById('cx-ok').onclick = () => {
        const r = global.DB.reservarDia(Number(document.getElementById('cx-prov').value), fecha, {
          muebles: Number(document.getElementById('cx-mue').value) || 0,
          nota: document.getElementById('cx-nota').value, quien: 'Jony' });
        if (r && r.error) return UI.aviso(r.error, 'warn');
        UI.aviso(`Anotado el ${fecha}`, 'ok');
        cerrar(); this.render(this._mount);
      };
    },

    modalMover(id) {
      const r = global.DB.agenda().find(x => x.id === Number(id)); if (!r) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cx-mdl"><div class="card pad" style="max-width:400px;width:100%">
          <h3 class="h-title" style="font-size:17px">Correr la fecha de ${UI.esc(r.proveedor)}</h3>
          <p class="h-sub">Venía el ${UI.esc(r.fecha)}. Queda anotado que la corrió.</p>
          <label class="fld"><span class="lbl">Nueva fecha</span>
            <input id="cx-f" placeholder="${UI.esc(r.fecha)}" value=""></label>
          <label class="fld"><span class="lbl">Por qué</span>
            <input id="cx-m" placeholder="no llegó con la laca"></label>
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cx-cancel">Cancelar</button>
            <button class="btn primary" id="cx-ok">Correr</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cx-mdl'); if (m) m.remove(); };
      document.getElementById('cx-cancel').onclick = cerrar;
      document.getElementById('cx-ok').onclick = () => {
        const f = document.getElementById('cx-f').value.trim();
        if (!/^\d{1,2}\/\d{1,2}$/.test(f)) return UI.aviso('La fecha va como 14/8', 'warn');
        const res = global.DB.reprogramar(r.id, f,
          { motivo: document.getElementById('cx-m').value, quien: 'Jony' });
        if (res && res.error) return UI.aviso(res.error, 'warn');
        UI.aviso(`Corrida al ${f}`, 'ok');
        cerrar(); this.render(this._mount);
      };
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v">${v}</span><span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      const a = document.getElementById('cx-ant');
      if (a) a.onclick = () => { this._mes = (this.mes() + 11) % 12; this.render(this._mount); };
      const s = document.getElementById('cx-sig');
      if (s) s.onclick = () => { this._mes = (this.mes() + 1) % 12; this.render(this._mount); };
      document.querySelectorAll('[data-dia]').forEach(b => b.onclick = () =>
        this.modalDia(b.dataset.dia));
      document.querySelectorAll('[data-mover]').forEach(b => b.onclick = () =>
        this.modalMover(b.dataset.mover));
      document.querySelectorAll('[data-libre]').forEach(b => b.onclick = () => {
        global.DB.liberarDia(Number(b.dataset.libre));
        UI.aviso('Día liberado', 'ok');
        this.render(this._mount);
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .cx-nav{display:flex;gap:8px;align-items:center}
        .cx-nav b{min-width:96px;text-align:center;color:var(--navy);text-transform:capitalize}
        .cx-cal-h{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:5px}
        .cx-cal-h span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;text-align:center}
        .cx-cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
        .cx-d{border:1px solid var(--line);border-radius:9px;background:var(--panel);
          min-height:66px;padding:5px 6px;text-align:left;font:inherit;cursor:pointer;
          display:flex;flex-direction:column;gap:1px}
        .cx-d.vacia{border:0;background:none;cursor:default;min-height:0}
        .cx-d:hover:not([disabled]){border-color:var(--brand)}
        .cx-d[disabled]{opacity:.4;cursor:default}
        .cx-d.finde{background:var(--panel-2)}
        .cx-d.hoy{border-color:var(--navy);border-width:2px}
        .cx-d.tomado{background:var(--warn-bg);border-color:var(--warn)}
        .cx-d-n{font-size:11.5px;font-weight:700;color:var(--muted)}
        .cx-d.tomado .cx-d-n{color:var(--navy)}
        .cx-d-p{font-size:11.5px;font-weight:700;color:var(--navy);line-height:1.15}
        .cx-d-m{font-size:10px;color:var(--muted)}
        .cx-d-r{font-size:9.5px;color:var(--crit);font-weight:700}
        .cx-back{position:fixed;inset:0;background:rgba(12,20,34,.45);z-index:70;
          display:flex;align-items:center;justify-content:center;padding:20px}
        @media (max-width:640px){ .cx-d{min-height:54px} .cx-d-p{font-size:10px} }
      </style>`;
    },
  };
  global.ComprasAgenda = Agenda;
})(typeof window !== 'undefined' ? window : globalThis);
