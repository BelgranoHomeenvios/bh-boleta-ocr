// =====================================================================
//  Belgrano Soft · Ventas · Agenda del vendedor
//  Todo lo que ese vendedor tiene que hacer hoy, junto: las consultas
//  con próxima acción, los recordatorios de sus boletas y sus entregas.
//  Lo vencido arriba. Sale solo de lo que ya está cargado.
// =====================================================================
(function (global) {
  const Ag = {
    _mount: 'view',
    vendedor: '',

    async render(mount = 'view') {
      this._mount = mount;
      const DB = global.DB;
      if (global.App.rol === 'vendedor') this.vendedor = 'Ale';
      else if (!this.vendedor) this.vendedor = DB.vendedores()[0];
      const items = DB.agendaVendedor(this.vendedor);
      const vencidos = items.filter(x => x.vencida);

      const ICONO = { consulta: '💬', boleta: '🧾', entrega: '🚚' };
      const DE = { consulta: 'consulta', boleta: 'boleta', entrega: 'entrega' };

      const v = document.getElementById(mount);
      v.innerHTML = `
        ${UI.head('Ventas', 'Mi agenda',
          'Lo que hay que hacer hoy, junto: consultas, boletas y entregas')}

        <div class="row" style="margin-bottom:12px;gap:8px;align-items:center">
          ${global.App.rol === 'vendedor' ? `<b>${UI.esc(this.vendedor)}</b>`
            : `<select id="va-v">${DB.vendedores().map(x =>
              `<option ${x === this.vendedor ? 'selected' : ''}>${UI.esc(x)}</option>`).join('')
              }</select>`}
          <span class="muted" style="font-size:12px">${items.length} cosas ·
            ${vencidos.length} vencida${vencidos.length === 1 ? '' : 's'}</span>
        </div>

        ${items.length ? `<div class="card cx-tabla"><table><tbody>
          ${items.map(x => `<tr class="${x.vencida ? 'mal' : ''}">
            <td style="width:30px">${ICONO[x.tipo] || ''}</td>
            <td class="${x.vencida ? 'sube nom' : 'nom'}">${UI.esc(x.f || 'sin fecha')}${
              x.vencida ? ' — VENCIDA' : ''}</td>
            <td class="nom">${UI.esc(x.quien || '')}</td>
            <td class="muted">${UI.esc(x.que || '')}</td>
            <td class="muted">${UI.esc(DE[x.tipo])} ${UI.esc(x.ref || '')}</td>
            <td class="td-acc"><button class="b-x ${x.vencida ? 'hacer' : ''}"
              data-tipo="${x.tipo}" data-ref="${UI.esc(x.ref)}">Abrir</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : `<div class="hint">${UI.esc(this.vendedor)} no tiene nada pendiente. O está todo
            hecho, o falta agendar — las consultas sin próxima acción están en Seguimientos.</div>`}

        <div class="hint">Acá no se carga nada: la agenda sale sola de las consultas del CRM,
          los recordatorios de las boletas y las entregas coordinadas de sus ventas.</div>`
        + (global.ComprasEstilos ? global.ComprasEstilos() : '');

      const sel = document.getElementById('va-v');
      if (sel) sel.onchange = () => { this.vendedor = sel.value; this.render(this._mount); };
      document.querySelectorAll('[data-ref]').forEach(b => b.onclick = () => {
        if (b.dataset.tipo === 'consulta') {
          global.CrmConsultas.abierta = b.dataset.ref;
          global.App.goSub('crm', 'consultas');
        } else if (b.dataset.tipo === 'entrega') {
          global.App.goSub('logistica', 'entregas');
        } else {
          global.App.goSub('ventas', 'ordenes');
        }
      });
    },
  };
  global.VentasAgenda = Ag;
})(typeof window !== 'undefined' ? window : globalThis);
