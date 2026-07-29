// =====================================================================
//  Belgrano Soft · Mis pendientes (tablero de comando)
//  Todo lo que alguien necesita de mí, de cualquier módulo, en un solo
//  lugar. Antes vivía como una tarjeta dentro de Ventas; ahora es su propio
//  módulo arriba: entro, veo qué requiere mi decisión y resuelvo saltando
//  al módulo que corresponde. Exception-oriented: sólo lo que pide acción.
// =====================================================================
(function (global) {
  const Pendientes = {
    modulo: '', _mount: 'view',

    async render(mount = 'view') {
      this._mount = mount;
      this._todos = await global.DB.misPendientes();
      const v = document.getElementById(mount);
      const W = global.Widgets;
      const todos = this._todos;
      const urgentes = todos.filter(p => p.urgente).length;
      const hoy = todos.filter(p => /hoy/i.test(p.desde)).length;
      const modulos = [...new Set(todos.map(p => p.modulo))];

      v.innerHTML = UI.head('Tablero de comando', 'Mis pendientes',
        'Todo lo que necesitan de vos, de cualquier módulo, en un solo lugar. Resolvé sin perder el hilo.') +
        W.kpis([
          { lab: 'Pendientes', em: '📌', tono: 'soft', val: todos.length },
          { lab: 'Necesitan tu decisión', em: '🚨', tono: 'crit', val: urgentes },
          { lab: 'Para hoy', em: '⏰', tono: 'warn', val: hoy },
          { lab: 'Módulos involucrados', em: '🧩', tono: 'info', val: modulos.length },
        ]) +
        `<div class="chips" id="pd-chips" style="margin-top:14px">
           <button class="chip ${this.modulo === '' ? 'on' : ''}" data-m="">Todos</button>
           ${modulos.map(m => `<button class="chip ${this.modulo === m ? 'on' : ''}" data-m="${UI.esc(m)}">${UI.esc(m)}</button>`).join('')}
         </div>
         <div id="pd-lista" style="margin-top:12px"></div>
         <style>
           .chips{display:flex;gap:6px;flex-wrap:wrap}
           .chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-soft);font-size:13px;font-weight:600;padding:6px 12px;border-radius:20px;cursor:pointer}
           .chip.on{background:var(--brand);border-color:var(--brand);color:#fff}
           .pd{display:flex;gap:12px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-left-width:4px;border-radius:11px;padding:12px 14px;margin-bottom:9px;box-shadow:var(--shadow)}
           .pd .em{font-size:19px;line-height:1.1}
           .pd .main{flex:1;min-width:0}
           .pd .txt{font-size:14px;color:var(--ink)}
           .pd .meta{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap}
         </style>`;

      v.querySelectorAll('#pd-chips [data-m]').forEach(b => b.onclick = () => {
        this.modulo = b.dataset.m;
        v.querySelectorAll('#pd-chips .chip').forEach(x => x.classList.toggle('on', x.dataset.m === this.modulo));
        this.pintar();
      });
      this.pintar();
    },

    pintar() {
      const cont = document.getElementById('pd-lista'); if (!cont) return;
      const stripe = { crit: 'var(--crit)', warn: 'var(--warn)', info: 'var(--brand)', ok: 'var(--ok)' };
      const em = { Ventas: '💰', Producción: '🏭', Logística: '🚚', Tesorería: '💳', Compras: '🛒', Reclamos: '🛠️', CRM: '💬' };
      const lista = this._todos.filter(p => !this.modulo || p.modulo === this.modulo);
      cont.innerHTML = lista.length ? lista.map((p, i) => `<div class="pd" style="border-left-color:${stripe[p.tono] || stripe.info}">
        <div class="em">${em[p.modulo] || '📌'}</div>
        <div class="main">
          <div class="txt">${UI.esc(p.texto)}</div>
          <div class="meta">
            <span class="pill ${p.tono}">${UI.esc(p.modulo)}</span>
            ${p.urgente ? '<span class="pill crit">Necesita tu decisión</span>' : ''}
            <span class="muted" style="font-size:11.5px">${p.quien ? UI.esc(p.quien) + ' · ' : ''}${UI.esc(p.desde)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button class="btn sm primary" data-go="${i}">Resolver →</button>
          <button class="btn sm" data-done="${i}">Listo</button>
        </div></div>`).join('')
        : UI.vacio('No tenés pendientes en este filtro. 🎉');

      cont.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
        const p = lista[+b.dataset.go];
        if (p.destino) global.App.goSub(p.destino.modulo, p.destino.sub);
      });
      cont.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
        const p = lista[+b.dataset.done];
        this._todos = this._todos.filter(x => x.id !== p.id);
        UI.aviso('Pendiente marcado como resuelto', 'ok');
        this.render(this._mount);
      });
    },
  };
  global.Pendientes = Pendientes;
})(typeof window !== 'undefined' ? window : globalThis);
