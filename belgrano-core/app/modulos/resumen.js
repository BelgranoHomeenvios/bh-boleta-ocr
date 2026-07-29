// =====================================================================
//  Belgrano Soft · Resumen de módulo
//  Cada módulo aterriza acá: un mini-dashboard con las alarmas y los KPIs
//  propios de ese módulo. Config por módulo; la forma es siempre la misma.
// =====================================================================
(function (global) {
  const CFG = {
    ventas: {
      titulo: 'Ventas', sub: 'El mostrador de un vistazo.',
      kpis: [
        { lab: 'Ventas del mes', em: '💵', tono: 'ok', val: '$28.450.000', foot: 'Objetivo 81%', obj: 81 },
        { lab: 'Ventas de hoy', em: '📈', tono: 'info', val: '$1.256.000', foot: '<span class="up">▲ 14%</span> vs ayer' },
        { lab: 'Órdenes abiertas', em: '🧾', tono: 'soft', val: '18', foot: '12 en producción' },
        { lab: 'Por cobrar', em: '💰', tono: 'warn', val: '$4.890.750', foot: '6 órdenes' },
        { lab: 'Presupuestos abiertos', em: '📄', tono: 'soft', val: '23', foot: '$6.120.000' },
        { lab: 'Ticket promedio', em: '🎟️', tono: 'info', val: '$978.000', foot: '<span class="up">▲ 6%</span> 30 días' },
      ],
      pipeline: [
        { label: 'A confirmar', n: 8, monto: '$3.210.000' }, { label: 'Producción', n: 12, monto: '$6.240.000', hot: true },
        { label: 'Control/Listo', n: 7, monto: '$3.180.000' }, { label: 'Logística', n: 6, monto: '$3.210.000' },
        { label: 'Entregadas', n: 34, monto: '$11.190.000' },
      ],
      embudo: [
        { label: 'Consultas', val: 182, pct: null }, { label: 'Cotizaciones', val: 74, pct: 40.7 },
        { label: 'Señadas', val: 28, pct: 37.8 }, { label: 'Órdenes', val: 21, pct: 75.0 }, { label: 'Entregadas', val: 16, pct: 76.2 },
      ],
    },
    crm: {
      titulo: 'CRM', sub: 'Una fila por cliente; pensado para la recompra.',
      kpis: [
        { lab: 'Clientes', em: '👥', tono: 'info', val: '6.393', foot: '1.100 ya compraron' },
        { lab: 'Consultas del mes', em: '💬', tono: 'soft', val: '182' },
        { lab: 'En seguimiento', em: '⏳', tono: 'warn', val: '28', foot: 'esperando respuesta' },
        { lab: 'Recompra', em: '🔁', tono: 'ok', val: '17%', foot: 'de los que compraron' },
      ],
    },
    catalogo: {
      titulo: 'Catálogo', sub: 'Salud del catálogo y precios.',
      alarmas: [
        { tono: 'warn', em: '🏷️', titulo: '18 sin costo', detalle: 'no calculan margen' },
        { tono: 'warn', em: '💱', titulo: '7 con precio desactualizado', detalle: 'revisar contra Tienda Nube' },
        { tono: 'info', em: '📋', titulo: '15 pendientes de revisión' },
      ],
      kpis: [
        { lab: 'Productos', em: '🪑', tono: 'info', val: '631' }, { lab: 'Publicados TN', em: '🛒', tono: 'ok', val: '312' },
        { lab: 'Sin costo', em: '🏷️', tono: 'warn', val: '18' }, { lab: 'Precio desactualizado', em: '💱', tono: 'warn', val: '7' },
        { lab: 'Sin proveedor', em: '📦', tono: 'soft', val: '23' }, { lab: 'A revisar', em: '📋', tono: 'warn', val: '15' },
      ],
    },
    produccion: {
      titulo: 'Producción', sub: 'Lo que hay que fabricar hoy.',
      alarmas: [
        { tono: 'crit', em: '⏰', titulo: '12 atrasadas', detalle: 'pasaron su fecha' },
        { tono: 'warn', em: '🪵', titulo: '7 esperando materiales' },
        { tono: 'crit', em: '⛔', titulo: '3 bloqueadas' },
      ],
      kpis: [
        { lab: 'En proceso', em: '🏭', tono: 'ok', val: '48' }, { lab: 'Atrasadas', em: '⏰', tono: 'crit', val: '12' },
        { lab: 'Esperando materiales', em: '🪵', tono: 'warn', val: '7' }, { lab: 'Capacidad', em: '📊', tono: 'info', val: '92%', obj: 92 },
      ],
    },
    compras: {
      titulo: 'Compras', sub: 'Órdenes de compra y proveedores.',
      kpis: [
        { lab: 'OC pendientes', em: '🛒', tono: 'info', val: '12' }, { lab: 'Proveedores demorados', em: '🐢', tono: 'warn', val: '5' },
        { lab: 'Comprometido', em: '💸', tono: 'soft', val: '$18.500.000' }, { lab: 'Recepciones hoy', em: '📥', tono: 'ok', val: '3' },
      ],
    },
    inventario: {
      titulo: 'Inventario', sub: 'Stock, movimientos y reservas.',
      kpis: [
        { lab: 'SKUs', em: '📦', tono: 'info', val: '1.240' }, { lab: 'Bajo mínimo', em: '⚠️', tono: 'warn', val: '32' },
        { lab: 'Reservados', em: '🔒', tono: 'soft', val: '88' }, { lab: 'Sin ubicación', em: '❓', tono: 'warn', val: '12' },
      ],
    },
    logistica: {
      titulo: 'Logística', sub: 'La agenda de entregas del día.',
      alarmas: [
        { tono: 'crit', em: '🚚', titulo: '3 entregas demoradas', rt: 'hoy' },
        { tono: 'warn', em: '🧑‍✈️', titulo: '1 entrega sin chofer' },
      ],
      kpis: [
        { lab: 'Entregas hoy', em: '🚚', tono: 'info', val: '6' }, { lab: 'Próximas 7 días', em: '📅', tono: 'soft', val: '14' },
        { lab: 'Retiros', em: '🏬', tono: 'soft', val: '3' }, { lab: 'Demoradas', em: '⏰', tono: 'crit', val: '3' },
      ],
    },
    tesoreria: {
      titulo: 'Tesorería', sub: 'Cobros, señas y rendiciones.',
      kpis: [
        { lab: 'Caja disponible', em: '💵', tono: 'ok', val: '$2.310.000' }, { lab: 'Por cobrar', em: '💰', tono: 'warn', val: '$4.890.750' },
        { lab: 'Señas del mes', em: '🧾', tono: 'info', val: '$3.120.000' }, { lab: 'Sin rendir', em: '📤', tono: 'warn', val: '2' },
      ],
    },
    reclamos: {
      titulo: 'Reclamos', sub: 'Posventa y su urgencia.',
      alarmas: [{ tono: 'crit', em: '🛠️', titulo: '2 reclamos vencidos', detalle: 'requieren respuesta ya', rt: 'vencido' }],
      kpis: [
        { lab: 'Abiertos', em: '🛠️', tono: 'warn', val: '7' }, { lab: 'Vencidos', em: '⏰', tono: 'crit', val: '2' },
        { lab: 'En gestión', em: '🔧', tono: 'info', val: '3' }, { lab: 'Resueltos (mes)', em: '✅', tono: 'ok', val: '15' },
      ],
    },
    config: {
      titulo: 'Configuración', sub: 'Usuarios, roles, locales y reglas.',
      kpis: [
        { lab: 'Usuarios', em: '👤', tono: 'info', val: '9' }, { lab: 'Roles', em: '🔑', tono: 'soft', val: '6' },
        { lab: 'Locales', em: '🏬', tono: 'soft', val: '3' }, { lab: 'Reglas de precio', em: '⚖️', tono: 'soft', val: '4' },
      ],
    },
  };

  const Resumen = {
    render(mount, modulo) {
      const c = CFG[modulo] || { titulo: modulo, sub: '', kpis: [] };
      const W = global.Widgets;
      let extra = '';
      if (c.pipeline) extra += `<div style="margin-top:14px">${W.card('Pipeline de órdenes', W.pipeline(c.pipeline))}</div>`;
      if (c.embudo) extra += `<div style="margin-top:14px">${W.card('Conversión del embudo (30 días)', W.embudo(c.embudo))}</div>`;
      document.getElementById(mount).innerHTML =
        UI.head(c.titulo, 'Resumen', c.sub) +
        (c.alarmas ? W.alarmas(c.alarmas) : '') +
        W.kpis(c.kpis) + extra;
    },
    tiene(modulo) { return !!CFG[modulo]; },
  };

  global.Resumen = Resumen;
})(typeof window !== 'undefined' ? window : globalThis);
