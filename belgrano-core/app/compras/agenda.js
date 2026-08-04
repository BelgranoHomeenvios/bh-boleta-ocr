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
        const rs = global.DB.delDia(fecha);
        const carga = global.DB.cargaDelDia(fecha);
        const finde = new Date(año, m, d).getDay();
        out.push({ d, fecha, rs, carga, r: rs[0] || null, finde: finde === 0 || finde === 6,
          hoy: d === hoy.getDate() && m === hoy.getMonth(),
          pasado: new Date(año, m, d) < new Date(año, hoy.getMonth(), hoy.getDate()) });
      }
      return out;
    },

    html() {
      const cs = this.celdas();
      const visitas = cs.filter(c => c).flatMap(c => c.rs);
      const delMes = cs.filter(c => c && c.rs.length);
      const muebles = visitas.reduce((a, v) => a + (v.muebles || 0), 0);
      const corridas = visitas.reduce((a, v) => a + (v.reprogramada || 0), 0);
      const libres = cs.filter(c => c && !c.rs.length && !c.finde && !c.pasado).length;
      const cargados = delMes.filter(c => c.carga.pasado).length;
      return `
        <div class="row" style="margin-bottom:12px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Agenda de entregas</h1>
            <div class="h-sub">Hasta dos por día, uno a la mañana y otro a la tarde · tope ${global.DB.TOPE_DIA} muebles</div></div>
          <div class="sp"></div>
          <button class="b-x" id="cx-vino">Vino uno sin avisar</button>
          <div class="cx-nav">
            <button class="b-x" id="cx-ant">‹</button>
            <b>${UI.esc(this.MESES[this.mes()])}</b>
            <button class="b-x" id="cx-sig">›</button>
          </div>
        </div>

        <div class="cx-kpis">
          ${this.kpi('Entregas del mes', visitas.length, `${muebles} muebles en total`)}
          ${this.kpi('Días libres', libres, 'hábiles, sin nadie anotado')}
          ${this.kpi('Días cargados', cargados,
            cargados ? `pasan los ${global.DB.TOPE_DIA} muebles` : `ninguno pasa los ${global.DB.TOPE_DIA}`)}
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
            <thead><tr><th>Día</th><th>Cuándo</th><th>Proveedor</th><th>Muebles</th><th>Nota</th>
              <th>Corrió la fecha</th><th></th></tr></thead>
            <tbody>${delMes.flatMap(c => c.rs.map(r => `<tr class="${
              r.reprogramada > 1 ? 'ojo' : (c.carga.pasado ? 'mal' : '')}">
              <td class="nom">${UI.esc(r.fecha)}</td>
              <td class="muted">${UI.esc(global.DB.franja(r.franja).label)}</td>
              <td>${UI.esc(r.proveedor)}</td>
              <td>${r.muebles}${c.carga.pasado
                ? ` <b class="mal">${c.carga.muebles} ese día</b>` : ''}</td>
              <td class="muted">${UI.esc(r.nota || '')}</td>
              <td class="muted">${r.reprogramada
                ? `<b class="${r.reprogramada > 1 ? 'mal' : ''}">${r.reprogramada} ${
                  r.reprogramada === 1 ? 'vez' : 'veces'}</b> ·
                  ${UI.esc((r.corridas || []).map(x => x.motivo).join(' · '))}`
                : 'no'}</td>
              <td class="td-acc">
                <button class="b-x" data-mover="${r.id}">Correr</button>
                <button class="b-x" data-libre="${r.id}">Liberar</button></td>
            </tr>`)).join('')}</tbody></table></div>
        </div>` : ''}

        <div class="hint" style="margin-top:10px">Tocá un día para anotar quién viene. Entran
          <b>dos por día</b> —uno a la mañana y otro a la tarde— y el tope son
          <b>${global.DB.TOPE_DIA} muebles</b>: si se pasa, el sistema avisa pero deja seguir.
          Un tercero no entra.</div>`;
    },

    celda(c) {
      if (!c) return '<span class="cx-d vacia"></span>';
      const cls = [c.finde ? 'finde' : '', c.hoy ? 'hoy' : '', c.pasado ? 'pasado' : '',
        c.rs.length ? 'tomado' : 'libre'].filter(Boolean).join(' ');
      return `<button class="cx-d ${cls} ${c.carga.pasado ? 'cargado' : ''}"
        data-dia="${UI.esc(c.fecha)}" ${c.pasado ? 'disabled' : ''}>
        <span class="cx-d-n">${c.d}${c.carga.pasado
          ? `<span class="cx-d-t">${c.carga.muebles}</span>` : ''}</span>
        ${c.rs.map(r => `<span class="cx-d-v">
          <span class="cx-d-f">${r.franja === 'tarde' ? 'T' : 'M'}</span>
          <span class="cx-d-p">${UI.esc(r.proveedor)}</span>
          <span class="cx-d-m">${r.muebles}</span>
          ${r.reprogramada ? `<span class="cx-d-r">${r.reprogramada}×</span>` : ''}
        </span>`).join('')}</button>`;
    },

    // ---- Anotar quién viene -------------------------------------------
    modalDia(fecha) {
      const hs = global.DB.delDia(fecha);
      const carga = global.DB.cargaDelDia(fecha);
      const provs = global.DB.proveedores();
      const libre = hs.length && hs[0].franja === 'manana' ? 'tarde' : 'manana';
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cx-mdl"><div class="card pad" style="max-width:430px;width:100%">
          <h3 class="h-title" style="font-size:17px">Anotar el ${UI.esc(fecha)}</h3>
          <p class="h-sub">${hs.length
            ? `Ya viene ${hs.map(x => `<b>${UI.esc(x.proveedor)}</b> ${
              global.DB.franja(x.franja).label.toLowerCase()} con ${x.muebles}`).join(' y ')}.
              ${carga.lleno ? 'No entra un tercero.' : `Entra uno más ${
                global.DB.franja(libre).label.toLowerCase()}.`}`
            : `Entran dos: uno a la mañana y otro a la tarde. El tope del día son
               ${global.DB.TOPE_DIA} muebles.`}</p>
          ${carga.lleno ? '' : `
          <label class="fld"><span class="lbl">Quién viene</span>
            <select id="cx-prov">${provs.map(p => `<option value="${p.id}">${UI.esc(p.nombre)} · ${
              UI.esc((global.DB.rubro(p.rubro) || {}).label || p.rubro)}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">Cuándo</span>
            <select id="cx-franja">${global.DB.FRANJAS.map(f =>
              `<option value="${f.k}" ${f.k === libre ? 'selected' : ''}>${UI.esc(f.label)} — ${
                UI.esc(f.pie)}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">Cuántos muebles trae</span>
            <input id="cx-mue" type="number" value="45"></label>
          <label class="fld"><span class="lbl">Nota</span>
            <input id="cx-nota" placeholder="trae los del pedido cerrado"></label>
          <div id="cx-alerta"></div>`}
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cx-cancel">${carga.lleno ? 'Cerrar' : 'Cancelar'}</button>
            ${carga.lleno ? '' : '<button class="btn primary" id="cx-ok">Anotar</button>'}</div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cx-mdl'); if (m) m.remove(); };
      document.getElementById('cx-cancel').onclick = cerrar;
      const ok = document.getElementById('cx-ok');
      if (!ok) return;
      // Si con el segundo taller el día se pasa del tope, se avisa antes de
      // que lo anote: no se prohíbe, se muestra.
      const mirar = () => {
        const n = Number(document.getElementById('cx-mue').value) || 0;
        const tot = carga.muebles + n;
        const a = document.getElementById('cx-alerta');
        a.innerHTML = tot > global.DB.TOPE_DIA
          ? `<div class="cx-alerta">⚠ Serían <b>${tot} muebles</b> ese día y el tope son
             ${global.DB.TOPE_DIA}. Se puede anotar igual, pero va a estar apretado.</div>` : '';
      };
      document.getElementById('cx-mue').oninput = mirar;
      mirar();
      ok.onclick = () => {
        const r = global.DB.reservarDia(Number(document.getElementById('cx-prov').value), fecha, {
          muebles: Number(document.getElementById('cx-mue').value) || 0,
          franja: document.getElementById('cx-franja').value,
          nota: document.getElementById('cx-nota').value, quien: 'Jony', forzar: true });
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

    // El taller que cayó sin estar anotado. Se anota igual: si vino, vino.
    modalVino() {
      const provs = global.DB.proveedores();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cx-back" id="cx-mdl"><div class="card pad" style="max-width:380px;width:100%">
          <h3 class="h-title" style="font-size:17px">Vino sin avisar</h3>
          <p class="h-sub">Queda anotado hoy aunque el día ya estuviera tomado.</p>
          <label class="fld"><span class="lbl">Quién vino</span>
            <select id="cx-prov">${provs.map(p => `<option value="${p.id}">${
              UI.esc(p.nombre)}</option>`).join('')}</select></label>
          <label class="fld"><span class="lbl">Cuántos muebles trajo</span>
            <input id="cx-mue" type="number" value="20"></label>
          <div class="row" style="gap:8px;margin-top:12px"><div class="sp"></div>
            <button class="btn" id="cx-cancel">Cancelar</button>
            <button class="btn primary" id="cx-ok">Anotarlo</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('cx-mdl'); if (m) m.remove(); };
      document.getElementById('cx-cancel').onclick = cerrar;
      document.getElementById('cx-ok').onclick = () => {
        global.DB.anotarQueVino(Number(document.getElementById('cx-prov').value),
          { muebles: Number(document.getElementById('cx-mue').value) || 0, quien: 'Jony' });
        UI.aviso('Anotado', 'ok');
        cerrar(); this._mes = new Date().getMonth(); this.render(this._mount);
      };
    },

    kpi(t, v, pie) {
      return `<div class="cx-k"><span class="cx-k-t">${t}</span>
        <span class="cx-k-v">${v}</span><span class="cx-k-p">${pie}</span></div>`;
    },

    enganchar() {
      const vino = document.getElementById('cx-vino');
      if (vino) vino.onclick = () => this.modalVino();
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
        .cx-d-n{font-size:11.5px;font-weight:700;color:var(--muted);display:flex;
          justify-content:space-between;align-items:center}
        .cx-d-t{font-size:9.5px;color:var(--crit);background:var(--crit-bg);
          border-radius:999px;padding:0 5px}
        .cx-d-v{display:flex;gap:3px;align-items:baseline;line-height:1.2}
        .cx-d-f{font-size:8.5px;font-weight:800;color:#fff;background:var(--muted);
          border-radius:3px;padding:0 3px;flex:0 0 auto}
        .cx-d.cargado{background:var(--crit-bg);border-color:var(--crit)}
        .cx-alerta{font-size:11.5px;color:var(--crit);background:var(--crit-bg);
          border:1px solid var(--crit);border-radius:8px;padding:7px 9px;margin-top:8px}
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
