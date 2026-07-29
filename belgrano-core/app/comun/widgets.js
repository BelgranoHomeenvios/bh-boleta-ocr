// =====================================================================
//  Belgrano Soft · Widgets de dashboard
//  Bloques reutilizables por el Home y por el Resumen de cada módulo:
//  alarmas, KPIs, pipeline, embudo, timeline. Todos devuelven HTML.
// =====================================================================
(function (global) {
  const TONE = { ok: 'var(--ok)', info: 'var(--brand)', warn: 'var(--warn)', crit: 'var(--crit)', soft: 'var(--muted)' };
  const TONE_BG = { ok: 'var(--ok-bg)', info: 'var(--brand-soft)', warn: 'var(--warn-bg)', crit: 'var(--crit-bg)', soft: 'var(--line-soft)' };

  const Widgets = {
    // Fila de alarmas: [{tono,em,titulo,detalle,rt}]
    alarmas(items) {
      if (!items || !items.length) return '';
      return `<div class="alerts">${items.map(a => `
        <div class="alert ${a.tono || 'info'}">
          <span class="em">${a.em || '•'}</span>
          <div><b>${UI.esc(a.titulo)}</b><span>${UI.esc(a.detalle || '')}</span></div>
          ${a.rt ? `<span class="rt">${UI.esc(a.rt)}</span>` : ''}
        </div>`).join('')}</div>`;
    },

    // KPIs: [{lab,val,em,tono,foot,obj}]  (obj = 0..100 para barra de objetivo)
    kpis(items) {
      return `<div class="kpis">${items.map(k => `
        <div class="kpi">
          <div class="top">${k.em ? `<span class="em" style="background:${TONE_BG[k.tono] || 'var(--line-soft)'};color:${TONE[k.tono] || 'var(--muted)'}">${k.em}</span>` : ''}${UI.esc(k.lab)}</div>
          <div class="val tnum">${k.val}</div>
          ${k.foot ? `<div class="foot">${k.foot}</div>` : ''}
          ${k.obj != null ? `<div class="obj"><span style="width:${Math.max(0, Math.min(100, k.obj))}%"></span></div>` : ''}
        </div>`).join('')}</div>`;
    },

    // Pipeline con flechas: [{label,n,monto,hot}]
    pipeline(pasos) {
      return `<div class="pipe">${pasos.map((p, i) => `
        <div class="pstep ${p.hot ? 'hot' : ''}"><div class="pl">${UI.esc(p.label)}</div>
          <div class="pn tnum">${p.n}</div><div class="pm tnum">${p.monto || ''}</div></div>
        ${i < pasos.length - 1 ? '<span class="arr">→</span>' : ''}`).join('')}</div>`;
    },

    // Embudo: [{label,val,pct}]  pct 0..100 (ancho); muestra val y %
    embudo(rows) {
      const base = rows[0]?.val || 1;
      return `<div class="embudo">${rows.map(r => {
        const ancho = Math.max(4, Math.round((r.val / base) * 100));
        return `<div class="erow"><span class="en">${UI.esc(r.label)}</span>
          <div class="eb"><span style="width:${ancho}%"></span></div>
          <span class="ev"><b class="tnum">${r.val}</b>${r.pct != null ? ` <small>${r.pct}%</small>` : ''}</span></div>`;
      }).join('')}</div>`;
    },

    // Timeline de actividad: [{h,tono,texto}]
    timeline(items) {
      return `<div class="tl">${items.map(e => `
        <div class="ev"><span class="h tnum">${UI.esc(e.h)}</span>
          <span class="d" style="background:${TONE[e.tono] || 'var(--brand)'}"></span>
          <span>${e.texto}</span></div>`).join('')}</div>`;
    },

    // Lista de "pendientes que requieren atención": [{em,tono,titulo,detalle,rt}]
    pendientes(items) {
      return items.map(p => `<div class="ev" style="display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--line-soft);align-items:flex-start">
        <span style="font-size:16px">${p.em || '•'}</span>
        <div style="flex:1"><b style="color:var(--navy);font-size:14px">${UI.esc(p.titulo)}</b>
          <div class="muted" style="font-size:12px">${UI.esc(p.detalle || '')}</div></div>
        ${p.rt ? `<span style="font-size:12px;font-weight:700;color:${TONE[p.tono] || 'var(--muted)'}">${UI.esc(p.rt)}</span>` : ''}</div>`).join('');
    },

    card(titulo, cuerpo, more) {
      return `<div class="pcard"><h3>${UI.esc(titulo)}</h3>${cuerpo}${more ? `<span class="more">${UI.esc(more)} →</span>` : ''}</div>`;
    },
  };

  global.Widgets = Widgets;
})(typeof window !== 'undefined' ? window : globalThis);
