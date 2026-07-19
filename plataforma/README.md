# Belgrano Home · Plataforma de Gestión

Cascarón que unifica el **CRM** y **Logística** en un solo lugar, con login único y
navegación común. Cada módulo sigue siendo independiente (ver `ARQUITECTURA.md`).

## Estructura

```
plataforma/
├── index.html              ← cascarón (login + navegación)
├── modules/
│   ├── crm/index.html       ← CRM (copiado sin tocar)
│   └── logistica/index.html ← Logística (copiado sin tocar)
├── ARQUITECTURA.md         ← el plan completo por etapas
└── README.md
```

## Cómo probarlo en tu computadora

Los módulos usan Supabase y iframes, así que **conviene abrirlo con un servidor local**
(no haciendo doble clic al archivo). Desde la carpeta `plataforma/`:

```bash
# opción 1 (si tenés Node)
npx serve .

# opción 2 (si tenés Python)
python3 -m http.server 8080
```

Después abrí en el navegador la dirección que te muestre (ej. `http://localhost:8080`).

1. Entrás con tu **email y contraseña de Belgrano Home** (los mismos de Logística).
2. Arriba aparecen las pestañas **CRM** y **Logística** según tu rol.
3. Cambiás de una a otra con un clic; cada módulo mantiene su estado.

## Cómo agregar un módulo nuevo (futuro)

1. Creá `modules/<nombre>/index.html`.
2. En `index.html` (cascarón), agregá una entrada al objeto `MODULOS`.
3. En el objeto `ACCESO`, indicá qué roles lo ven.

No hace falta tocar ningún módulo existente.

## Nota sobre el login

- **Logística** comparte la sesión del cascarón automáticamente (no vuelve a pedir clave).
- **El CRM** todavía muestra su propia pantalla de "elegí tu usuario": eso se resuelve en la
  Etapa 2 (ver `ARQUITECTURA.md`).
