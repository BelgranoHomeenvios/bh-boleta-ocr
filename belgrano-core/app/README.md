# Belgrano Soft · app

Front modular, un módulo por carpeta, sin build. Mismo patrón que Belgrano Cost.

```
index.html          Shell: carga común + módulos
comun/
  estilos.css       Sistema visual (navy/azul, estados con color)
  db.js             Única puerta a Supabase (+ modo demo sin conexión)
  ui.js             Helpers de interfaz
  app.js            Shell: selector "ver como" + navegación por rol
catalogo/
  catalogo.js       Buscar productos, ver variantes (3 ejes + bolsa)
ventas/
  presupuesto.js    (próximo módulo)
```

## Cómo verlo

**Rápido, sin nada:** abrir `catalogo-standalone.html` con doble clic.
Arranca en modo demo con productos de ejemplo.

**Con el catálogo real:** botón "Conectar Belgrano Soft" → pegar la anon key
(Settings → API → Project API keys → anon public). Requiere:
1. Exponer el esquema `core` en Settings → API → Exposed schemas.
2. Correr `dev_acceso_core.sql` (permisos + política de desarrollo).

## Acceso

Todavía sin login: selector "ver como" arriba, igual que en el CRM y
Logística. El login real con Supabase Auth llega cuando estén los módulos.
