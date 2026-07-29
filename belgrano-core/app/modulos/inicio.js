// =====================================================================
//  Belgrano Soft · Home de Dirección
//  El "resumen del día": primero las alarmas (lo que hay que resolver),
//  después los KPIs ejecutivos, el pipeline con historia, los pendientes
//  priorizados y la actividad reciente. Cada rol tendrá su propio Home.
// =====================================================================
(function (global) {
  const Inicio = {
    async render(mount = 'view') {
      const v = document.getElementById(mount);
      const W = global.Widgets;

      const alarmas = W.alarmas([
        { tono: 'crit', em: '🚚', titulo: '3 entregas demoradas', detalle: 'Programadas para hoy', rt: 'Hoy' },
        { tono: 'warn', em: '📦', titulo: '2 pedidos sin proveedor', detalle: 'Sin confirmar', rt: '6 días' },
        { tono: 'warn', em: '👤', titulo: '5 clientes esperando', detalle: 'Sin respuesta', rt: '4 días' },
        { tono: 'crit', em: '💳', titulo: 'Caja sin rendir', detalle: 'Cristian', rt: '3 días' },
        { tono: 'warn', em: '🛠️', titulo: '1 reclamo vencido', detalle: 'R-125', rt: 'Vencido' },
      ]);

      const kpis = W.kpis([
        { lab: 'Ventas hoy', em: '💵', tono: 'ok', val: '$1.256.000', foot: 'Ayer: $1.102.000 · <span class="up">▲ 14%</span>' },
        { lab: 'Ventas del mes', em: '📈', tono: 'info', val: '$28.450.000', foot: 'Objetivo: $35.000.000 · 81%', obj: 81 },
        { lab: 'Margen promedio', em: '📊', tono: 'info', val: '32,5%', foot: 'Últimos 30 días · <span class="up">▲ 2,1 pp</span>' },
        { lab: 'Órdenes abiertas', em: '🧾', tono: 'soft', val: '18', foot: '12 en producción' },
        { lab: 'Por cobrar', em: '💰', tono: 'warn', val: '$4.890.750', foot: '6 órdenes' },
        { lab: 'Reclamos abiertos', em: '🛠️', tono: 'crit', val: '7', foot: '<span class="down">2 vencidos</span>' },
      ]);

      const pipeline = W.pipeline([
        { label: 'Confirmar', n: 8, monto: '$2.150.000' },
        { label: 'Producción', n: 12, monto: '$6.240.000', hot: true },
        { label: 'Control', n: 7, monto: '$3.180.000' },
        { label: 'Listo', n: 5, monto: '$2.480.000' },
        { label: 'Logística', n: 6, monto: '$3.210.000' },
        { label: 'Entregadas', n: 34, monto: '$11.190.000' },
      ]);

      const pendientes = W.pendientes([
        { em: '🚚', tono: 'crit', titulo: 'Entrega #E-2381', detalle: 'Programada para hoy · Sin chofer asignado', rt: 'Hoy' },
        { em: '📦', tono: 'warn', titulo: 'Pedido a Dumbo', detalle: 'Hace 6 días sin confirmación', rt: '6 días' },
        { em: '👤', tono: 'warn', titulo: 'Cliente: Juan Pérez', detalle: 'Esperando respuesta desde el 08/08', rt: '4 días' },
        { em: '🛠️', tono: 'crit', titulo: 'Reclamo #R-125', detalle: 'Vencido desde el 10/08', rt: 'Vencido' },
        { em: '💳', tono: 'warn', titulo: 'Caja de Cristian', detalle: 'Sin rendir desde el 09/08', rt: '3 días' },
      ]);

      const actividad = W.timeline([
        { h: '09:35', tono: 'ok', texto: '<b>Cristian</b> convirtió un presupuesto en orden #O-3421' },
        { h: '09:18', tono: 'info', texto: 'Producción recibió 15 mesas de luz de Lionel' },
        { h: '09:05', tono: 'ok', texto: 'Entrega realizada en Belgrano CABA · #E-2378' },
        { h: '08:47', tono: 'crit', texto: 'Ingresó un reclamo #R-126 por mueble golpeado' },
        { h: '08:32', tono: 'info', texto: 'Nueva consulta de WhatsApp · 11 3456 6789' },
        { h: '08:21', tono: 'warn', texto: 'Se autorizó precio a medida en orden #O-3420' },
      ]);

      const entregas = `<table><thead><tr><th>Hora</th><th>Entrega</th><th>Cliente</th><th>Estado</th></tr></thead><tbody>
        ${[['08:00', 'E-2381', 'Juan Pérez', ['crit', 'Sin chofer']], ['10:00', 'E-2382', 'María García', ['warn', 'En preparación']],
           ['12:30', 'E-2383', 'Roberto López', ['info', 'En ruta']], ['15:00', 'E-2384', 'Ana Torres', ['soft', 'Programada']]]
          .map(r => `<tr><td class="tnum">${r[0]}</td><td><b>#${r[1]}</b></td><td>${r[2]}</td><td><span class="pill ${r[3][0]}">${r[3][1]}</span></td></tr>`).join('')}
        </tbody></table>`;

      const prodEstado = W.embudo([
        { label: 'En producción', val: 12 }, { label: 'Control', val: 7 },
        { label: 'Listos', val: 5 }, { label: 'A reparar', val: 2 },
      ]);

      const top = `<table><tbody>${[['Bibliotecas Borges 1,20', '$5.240.000'], ['Aparador Amberes', '$3.980.000'],
        ['Mesa de Luz Estocolmo', '$3.120.000'], ['Respaldo Foster Queen', '$2.850.000'], ['Silla Meier', '$2.420.000']]
        .map((p, i) => `<tr><td style="width:22px" class="muted">${i + 1}</td><td><b>${p[0]}</b></td><td style="text-align:right" class="tnum">${p[1]}</td></tr>`).join('')}</tbody></table>`;

      v.innerHTML = `
        <div class="row" style="align-items:flex-start;margin-bottom:4px">
          <div><div class="greet">¡Buen día, Brian! 👋</div>
            <div class="greet-sub">Resumen del día · ${fecha()}</div></div>
          <div class="sp"></div>
          <button class="btn sm">⚙ Configurar mi inicio</button>
        </div>
        ${alarmas}
        ${kpis}
        <div class="cols3" style="margin-top:14px">
          ${W.card('Pipeline de órdenes', pipeline + `<div class="muted" style="font-size:12px;margin-top:10px">72 órdenes en total · $28.450.000</div>`)}
          ${W.card('Pendientes que requieren atención', pendientes, 'Ver todos los pendientes')}
          ${W.card('Actividad reciente', actividad, 'Ver toda la actividad')}
        </div>
        <div class="cols3" style="margin-top:14px">
          ${W.card('Entregas de hoy', entregas, 'Ver todas las entregas')}
          ${W.card('Producción — estado actual', prodEstado, 'Ir al tablero de producción')}
          ${W.card('Top productos del mes', top, 'Ver reporte completo')}
        </div>`;
    },
  };

  function fecha() {
    try {
      const d = new Date();
      const s = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch { return ''; }
  }

  global.Inicio = Inicio;
})(typeof window !== 'undefined' ? window : globalThis);
