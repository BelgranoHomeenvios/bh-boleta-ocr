# Cómo subir Be Soft (guía simple)

Be Soft son archivos estáticos (HTML/CSS/JS). No necesita "build". Se sube la
carpeta `plataforma/` como un sitio estático. **No toca nada de lo que Lucas usa
hoy** y **usa la misma Supabase**, así que los datos ya cargados siguen intactos.

---

## Opción recomendada: Vercel (proyecto nuevo, aparte del de OCR)

1. En Vercel: **Add New → Project** e importá el repo `bh-boleta-ocr`.
2. En la configuración del proyecto:
   - **Framework Preset:** `Other`
   - **Root Directory:** `plataforma`
   - **Build Command:** (vacío)
   - **Output Directory:** (vacío / `.`)
3. **Deploy.** Te queda una URL tipo `be-soft.vercel.app`.

Eso sirve la carpeta tal cual. La app abre en `plataforma/index.html`.

> ⚠️ Importante: es un **proyecto separado** del de OCR (`bh-boleta-ocr` actual,
> que es Vite). No cambia ni pisa ese deploy ni el de Logística de Lucas.

---

## Qué pasa con Logística (versión y datos)

- Be Soft muestra Logística desde `plataforma/modules/logistica/index.html`.
- Es una **copia** de la Logística de Lucas, apuntando a la **misma Supabase**
  (proyecto `iwrgivmqvzalzbfsnxvv`). Los datos son los mismos; no se duplican.
- Para **actualizar Logística** a la última versión: reemplazá ese único archivo
  (`plataforma/modules/logistica/index.html`) por el HTML actual y volvé a
  deployar. Nada más.

## Qué pasa con el CRM

- Be Soft muestra el CRM desde `plataforma/modules/crm/index.html`.
- Hoy el CRM guarda sus datos en el **navegador** (no en la nube todavía) y
  pide **elegir usuario** después del login de Be Soft. Eso se resuelve en las
  Etapas 2 y 3 (ver `ARQUITECTURA.md`). No bloquea el deploy.

---

## Cuentas para entrar (importante)

Para entrar a Be Soft cada persona necesita **email + contraseña** en Supabase
Auth y una fila en la tabla `usuarios_roles` (email, rol, nombre). Lucas y quien
ya use Logística lo tienen. Los **vendedores** del CRM tal vez no: hay que
crearles cuenta antes de que puedan entrar.

Roles que Be Soft ya entiende: `admin`, `direccion`, `jony`, `vendedor`,
`auditora`, `logistica`, `soporte`, `deposito`, `flete`.

---

## Resumen

1. Deploy de `plataforma/` como sitio estático (Vercel, Root Directory =
   `plataforma`).
2. (Opcional) Reemplazar `modules/logistica/index.html` por la versión más nueva.
3. Crear en Supabase las cuentas de quienes falten.
4. Pasar la URL a la gente.
