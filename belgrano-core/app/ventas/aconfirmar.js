// =====================================================================
//  Belgrano Soft · Ventas · A confirmar (bandeja de trabajo)
//  Bandeja orientada a excepción: sólo lo que necesita una decisión o una
//  confirmación para avanzar. Dos focos:
//   1) Necesitan tu decisión / esperando  → derivado del motor (autorizar
//      precio a medida, verificar observación, seña de fabricación, aceptar
//      la cotización). Cada tarjeta abre el Detalle de la orden.
//   2) Transferencias sin acreditar        → conecta con la verificación de
//      señas: confirmar la plata contra el banco (CUIT + comprobante).
// =====================================================================
(function (global) {
  const ICONO = (item) => {
    const a = item.acciones || [];
    if (a.includes('autorizar_precio')) return { icon: '🚨', tono: 'crit', que: 'Autorizar precio a medida' };
    if (a.includes('verificar_obs'))    return { icon: '🔎', tono: 'warn', que: 'Verificar observación' };
    if (/seña|sena/i.test(item.motivo)) return { icon: '💰', tono: 'warn', que: 'Falta seña' };
    return { icon: '🧾', tono: 'info', que: 'Orden a confirmar' };
  };
  const stripe = { crit: 'var(--crit)', warn: 'var(--warn)', info: 'var(--brand)', ok: 'var(--ok)' };

  const AConfirmar = {
    _mount: 'view',
    async render(mount = 'view') {
      this._mount = mount;
      const M = global.Motor, DB = global.DB;
      // 1) Cola del motor: cada {o, ctx} → sus pendientes derivados.
      const cola = M.colaDemo();
      const items = [];
      cola.forEach(({ o, ctx }) => M.pendientesDe(o).forEach(it => items.push({ ...it, ctx })));
      // Necesitan decisión (autorización) primero.
      items.sort((a, b) => (b.acciones || []).includes('autorizar_precio') - (a.acciones || []).includes('autorizar_precio'));
      // 2) Transferencias sin acreditar.
      const transfs = await DB.transferenciasPendientes();

      const v = document.getElementById(mount);
      v.innerHTML = UI.head('Ventas', 'A confirmar',
        'Sólo lo que necesita una decisión o una confirmación para avanzar. Lo demás sigue solo.') +
        `<div class="wk-cols">
           <section>
             <div class="wk-h"><span>Necesitan tu decisión / esperando</span><span class="pill warn">${items.length}</span></div>
             <div id="ac-items">${items.length ? items.map((it, i) => this.cardMotor(it, i)).join('') : UI.vacio('Nada pendiente por acá. 🎉')}</div>
           </section>
           <section>
             <div class="wk-h"><span>Transferencias sin acreditar</span><span class="pill warn">${transfs.length}</span></div>
             <div class="muted" style="font-size:12px;margin-bottom:8px">Plata declarada que hay que confirmar contra el banco para que cuente como seña.</div>
             <div id="ac-transf">${transfs.length ? transfs.map((t, i) => this.cardTransf(t, i)).join('') : UI.vacio('No hay transferencias por acreditar.')}</div>
           </section>
         </div>
         <style>
           .wk-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
           @media(max-width:1000px){.wk-cols{grid-template-columns:1fr}}
           .wk-h{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--navy);font-size:14px;margin-bottom:10px}
           .wk{display:flex;gap:11px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-left-width:4px;border-radius:11px;padding:11px 13px;margin-bottom:9px;box-shadow:var(--shadow)}
           .wk-ic{font-size:19px;line-height:1.1}
           .wk-main{flex:1;min-width:0}
           .wk-tit{font-size:13.5px}.wk-tit .oid{color:var(--brand);font-weight:800}
           .wk-motivo{font-size:12.5px;color:var(--ink-soft);margin-top:2px}
           .wk-meta{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}
           .wk-act{display:flex;flex-direction:column;gap:6px;align-items:flex-end}
         </style>`;

      v.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => {
        const it = items[+b.dataset.abrir];
        global.OrdenDetalle.render(mount, { o: it.o, ctx: it.ctx }, () => this.render(mount));
      });
      v.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => {
        const t = transfs[+b.dataset.conf];
        global.VentasPanel.modalConfirmarBanco(t.orden, t.cobro.id, () => this.render(mount));
      });
      v.querySelectorAll('[data-senas]').forEach(b => b.onclick = () => {
        const t = transfs[+b.dataset.senas];
        global.VentasPanel.modalSenas(t.orden);
      });
    },

    cardMotor(it, i) {
      const s = ICONO(it);
      const cli = it.cliente?.nombre || it.cliente || '—';
      return `<div class="wk" style="border-left-color:${stripe[s.tono]}">
        <div class="wk-ic">${s.icon}</div>
        <div class="wk-main">
          <div class="wk-tit"><span class="oid">#${UI.esc(it.ordenId)}</span> · <b>${UI.esc(cli)}</b>${it.producto ? ` <span class="muted">· ${UI.esc(it.producto)}</span>` : ''}</div>
          <div class="wk-motivo">${UI.esc(it.motivo)}</div>
          <div class="wk-meta"><span class="pill ${s.tono}">${UI.esc(s.que)}</span>
            <span class="pill soft">${UI.esc(it.responsable || '')}</span>
            <span class="muted" style="font-size:11px">${UI.esc(it.desde || '')}</span></div>
        </div>
        <div class="wk-act"><button class="btn sm primary" data-abrir="${i}">Abrir orden →</button></div></div>`;
    },

    cardTransf(t, i) {
      const o = t.orden, c = t.cobro;
      return `<div class="wk" style="border-left-color:${stripe.warn}">
        <div class="wk-ic">🏦</div>
        <div class="wk-main">
          <div class="wk-tit"><span class="oid">#${UI.esc(o.numero)}</span> · <b>${UI.esc(o.cliente)}</b></div>
          <div class="wk-motivo">Declaró <b>${UI.pesos(c.m)}</b> por transferencia a ${UI.esc(c.recibidoPor || '')}${c.depositante ? ` · depositó ${UI.esc(c.depositante)}` : ''}${c.referencia ? ` · ${UI.esc(c.referencia)}` : ''}</div>
          <div class="wk-meta"><span class="pill warn">⏳ Sin acreditar</span>
            <span class="muted" style="font-size:11px">Vendedor ${UI.esc(o.vendedor)}</span></div>
        </div>
        <div class="wk-act">
          <button class="btn sm primary" data-conf="${i}">🏦 Confirmar en banco</button>
          <button class="btn sm" data-senas="${i}">Ver señas</button></div></div>`;
    },
  };
  global.AConfirmar = AConfirmar;
})(typeof window !== 'undefined' ? window : globalThis);
