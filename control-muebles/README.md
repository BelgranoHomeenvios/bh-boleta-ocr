# Control de Muebles · Belgrano Home Envíos

Aplicación web para registrar las entregas de muebles de cada proveedor y medir
la **calidad de producción** semana a semana y mes a mes.

## Qué hace

- **Cargar entregas**: proveedor, lugar, fecha de solicitud y de entrega, total
  que trajo, devueltos, detalles chicos (se arreglan en fábrica) y detalles
  grandes. Los muebles **sin detalle** se calculan solos:
  `sin detalle = total − devueltos − det. chicos − det. grandes`.
- **Tablero**: % sin detalle, % con detalles y % devueltos del último período,
  con comparación contra el período anterior (¿mejoramos o no?), gráfico de
  tendencia, composición por período y ranking de proveedores.
- **Proveedores**: alta/baja y cupo semanal.
- **Backup**: descargar/importar todos los datos en un archivo.

## Estado de los datos

La versión actual guarda los datos en el navegador (localStorage) más backup
manual. La capa de datos está aislada en `src/lib/storage.js` para conectar más
adelante una base de datos en la nube y sincronizar entre dispositivos.

## Desarrollo

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción
npm run preview  # previsualizar el build
```

Stack: Vite + React + Recharts.
