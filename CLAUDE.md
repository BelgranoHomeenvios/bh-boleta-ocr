# Belgrano Soft

ERP interno de Belgrano Home. Se entrega como un único HTML autocontenido
(`belgrano-core/app/belgrano-soft.html`), generado con
`node belgrano-core/app/build-standalone.cjs`.

## ⚠ Antes de tocar cualquier cosa que involucre datos reales

Leer **`belgrano-core/docs/SEGURIDAD.md`**.

Resumen de la decisión, que no se negocia:

- **No entra un solo dato real** —cliente, teléfono, precio de proveedor,
  peso— hasta que la capa de seguridad esté hecha y revisada por Brian.
- Hoy no hay login: el rol sale del selector "Ver como". Es andamio.
- Los permisos del front esconden botones; no protegen nada. La protección
  real va en Supabase con RLS por rol.
- Los datos operativos que hoy viven en `localStorage` son **deuda**: hay que
  sacarlos de ahí antes de operar.
- La clave de Supabase **nunca** va adentro del HTML.
- Si para que sea seguro hay que cambiar la forma del proyecto —varios
  archivos, un servidor propio, otra cosa— se cambia. Brian ya lo autorizó.

Mientras tanto se sigue construyendo funcionalidad con datos inventados: las
políticas de acceso no se pueden escribir antes de saber qué ve cada rol, y
eso se define módulo por módulo.

## Cómo está armado

- `belgrano-core/app/comun/` — `db.js` (modelo y datos), `ui.js`, `app.js`
  (navegación y roles), `estilos.css`.
- `belgrano-core/app/<modulo>/` — una carpeta por módulo, un archivo por
  pantalla, cada uno colgado de `window` como un IIFE.
- `belgrano-core/app/build-standalone.cjs` — inlinea todo en el HTML.
- `belgrano-core/supabase/migrations/` — el esquema real.
- `belgrano-core/docs/` — arquitectura y decisiones.

Sin framework ni build de módulos: JavaScript plano.

## Cómo se prueba

Suites propias en el scratchpad de la sesión (`test_*.cjs`), sin framework, y
un barrido con Playwright que recorre todas las pantallas en todos los roles
buscando desbordes horizontales y errores de consola. Correr las dos cosas
antes de dar algo por terminado.

## Estilo

- Todo en castellano rioplatense: nombres, comentarios y pantallas.
- Los comentarios explican **por qué**, no qué hace la línea.
- Los botones de acción de tabla usan `.b-x` (y `.b-x.hacer` el que resuelve
  la fila). Están en `comun/estilos.css`, no en cada módulo.
