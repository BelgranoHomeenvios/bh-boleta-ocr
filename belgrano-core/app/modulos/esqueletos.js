// =====================================================================
//  Belgrano Soft · Esqueletos de módulos
//  Pantallas base para ver la arquitectura completa. Cada una muestra de
//  qué se va a encargar y, cuando ayuda, una tabla/vista de ejemplo con
//  la forma que va a tener. Se profundizan una por una más adelante.
// =====================================================================
(function (global) {
  const DB = () => global.DB;

  const ESQ = {
    caja: {
      kick: 'Caja', titulo: 'Cobros y señas',
      sub: 'El cobro pertenece al cliente y se imputa a todas sus órdenes en conjunto. La seña mínima habitual es el 30%.',
      demo: () => tabla(
        ['Fecha', 'Cliente', 'Forma', 'Monto', 'Imputado a'],
        [['28/07', 'Bibiana', 'Transferencia', '$155.000', 'S00003'],
         ['27/07', 'Camila', 'Efectivo', '$120.000', 'S00009 · S00011'],
         ['26/07', 'Diego', 'Tarjeta', '$220.000', 'S00005']],
        [3, 3, 3, 'r', 3]),
    },
    logistica: {
      kick: 'Logística', titulo: 'Entregas', sub: 'Órdenes listas para entregar, con flete y zona. De acá pasan a "entregado".',
      demo: () => tabla(
        ['N°', 'Cliente', 'Zona', 'Flete', 'Estado'],
        [['S00004', 'Laura y Hernán', 'Zona Sur', 'Incluido', pill('info', 'A coordinar')],
         ['S00002', 'Abigail Galfre', 'CABA', 'No incluido', pill('ok', 'Entregado')]],
        [3, 3, 3, 3, 3]),
    },
    reclamos: {
      kick: 'Reclamos', titulo: 'Posventa', sub: 'Un reclamo levanta la orden desde archivado/entregado/producción y, al resolverse, vuelve a su estado.',
      demo: () => tabla(
        ['N°', 'Cliente', 'Motivo', 'Abre', 'Estado'],
        [['S00002', 'Abigail Galfre', 'Falta un tornillo', '28/07', pill('warn', 'Abierto')],
         ['S00001', 'Abel Schoenmaker', 'Rayón en la tapa', '25/07', pill('info', 'En gestión')]],
        [3, 3, 3, 3, 3]),
    },
    abastecimiento: {
      kick: 'Abastecimiento', titulo: 'Proveedores y pedidos', sub: 'Un pedido abierto por proveedor. Las líneas atadas al mismo proveedor viajan juntas.',
      demo: () => tabla(
        ['Proveedor', 'Pedido', 'Líneas', 'Estado'],
        [['Vicente', 'P-102', '8', pill('info', 'Abierto')],
         ['Maderas del Sur', 'P-101', '3', pill('ok', 'Recibido')]],
        [3, 3, 'r', 3]),
    },
    facturas: {
      kick: 'Facturas', titulo: 'Facturación', sub: 'Belgrano Soft no factura: marca "facturado". La factura se hace en Nacional Soft y después se incorpora.',
      demo: () => tabla(
        ['N° Orden', 'Cliente', 'DNI/CUIT', 'Total', 'Estado'],
        [['S00002', 'Abigail Galfre', '27-xxxxxxxx-3', '$968.000', pill('ok', 'Facturado')],
         ['S00001', 'Abel Schoenmaker', '—', '$1.028.500', pill('warn', 'Pendiente')]],
        [3, 3, 3, 'r', 3]),
    },
    reportes: {
      kick: 'Reportes', titulo: 'Dirección', sub: 'Ventas por vendedor y local, comisiones, embudo de consultas, recompra. Se arma más adelante.',
      demo: () => `<div class="empty">📊 Los tableros de dirección se diseñan en una etapa siguiente.</div>`,
    },
    config: {
      kick: 'Configuración', titulo: 'Usuarios y reglas', sub: 'Roles y permisos por módulo, locales, vendedores, reglas de precio por término de pago.',
      demo: () => tabla(
        ['Regla', 'Valor'],
        [['Descuento efectivo', '35% sobre lista'],
         ['Seña mínima', '30%'],
         ['Recargo tarjeta', 'según cuotas (a definir)'],
         ['Locales', '2299 · 2020 · 699']],
        [3, 3]),
    },
  };

  function pill(t, txt) { return `<span class="pill ${t}">${txt}</span>`; }
  function tabla(cols, filas, aligns) {
    const th = cols.map((c, i) => `<th style="text-align:${aligns[i] === 'r' ? 'right' : 'left'}">${c}</th>`).join('');
    const tb = filas.map(f => `<tr>${f.map((cel, i) =>
      `<td style="text-align:${aligns[i] === 'r' ? 'right' : 'left'}">${cel}</td>`).join('')}</tr>`).join('');
    return `<div class="card"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>
      <p class="note" style="color:var(--muted);font-size:12px;margin-top:8px">Ejemplo de la forma que va a tener — datos de muestra.</p>`;
  }

  const Esq = {
    render(clave, mount = 'view') {
      const m = ESQ[clave];
      const v = document.getElementById(mount);
      if (!m) { v.innerHTML = UI.vacio('Módulo en construcción.'); return; }
      v.innerHTML = UI.head(m.kick, m.titulo, m.sub) + m.demo();
    },
    // Sub-módulo genérico todavía sin construir: título + nota + forma prevista.
    sub(mount, titulo, desc) {
      document.getElementById(mount).innerHTML =
        UI.head(titulo.split('·')[0].trim(), titulo, desc || '') +
        `<div class="card pad"><div class="empty" style="padding:40px 20px">
          🧩 <b style="color:var(--navy)">${UI.esc(titulo)}</b><br>
          <span class="muted">Esta vista se construye en su etapa. La arquitectura ya la contempla.</span>
        </div></div>`;
    },
  };
  global.Esq = Esq;
})(typeof window !== 'undefined' ? window : globalThis);
