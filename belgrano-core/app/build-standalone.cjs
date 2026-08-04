#!/usr/bin/env node
// =====================================================================
//  Genera belgrano-soft.html concatenando CSS + JS de toda la app.
//  Un solo archivo para abrir con doble clic, sin servidor.
//  Uso:  node build-standalone.cjs
// =====================================================================
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');

const css = read('comun/estilos.css');
// Orden de carga = el de index.html (db y ui antes que los módulos; app.js último).
const scripts = [
  'comun/db.js', 'comun/ui.js', 'comun/widgets.js', 'comun/motor.js',
  'catalogo/catalogo.js', 'catalogo/producto.js', 'catalogo/planillas.js',
  'inventario/unidades.js',
  'ventas/presupuesto.js', 'ventas/cotizaciones.js', 'ventas/ordenes.js', 'ventas/orden-detalle.js', 'ventas/ventas-panel.js', 'ventas/clientes.js',
  'modulos/inicio.js', 'modulos/pendientes.js',
  'modulos/precios.js', 'modulos/resumen.js', 'modulos/produccion.js',
  'modulos/prod-pedidos.js',
  'modulos/prod-taller.js',
  'modulos/prod-vendidos.js',
  'compras/recepciones.js',
  'compras/estilos.js',
  'compras/ordenes.js',
  'compras/proveedores.js',
  'compras/cuenta.js',
  'compras/lista-precios.js',
  'compras/agenda.js',
  'compras/comparador.js',
  'compras/pendientes.js',
  'compras/historial.js',
  'compras/indicadores.js',
  'tesoreria/gastos.js',
  'tesoreria/numero.js',
  'modulos/esqueletos.js',
  'comun/app.js',
];

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Belgrano Soft</title>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
</style></head><body>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
${scripts.map(read).join('\n</script><script>\n')}
</script></body></html>
`;

fs.writeFileSync(path.join(DIR, 'belgrano-soft.html'), html);
console.log('belgrano-soft.html regenerado (' + html.length.toLocaleString() + ' bytes)');
