# BELGRANO HOME · Plataforma de Gestión
## Documento de Arquitectura — Etapa 1

> Este documento reemplaza al borrador inicial. Está escrito **después de leer el código real**
> del CRM y de Logística, así que las decisiones de acá abajo están basadas en cómo funcionan
> hoy tus dos aplicaciones, no en suposiciones.

---

## 1. Objetivo

Unificar el **CRM** (vendedores) y **Logística** (encargado de logística) dentro de una
**única plataforma "Belgrano Home"**, con:

- un solo lugar de entrada,
- una navegación superior común,
- y cada módulo **conservando su código independiente** (sin fusionar los HTML).

La plataforma tiene que estar preparada para sumar en el futuro: Producción, Stock, Reclamos,
Administración, Reportes, etc.

---

## 2. Estado real de hoy (lo que encontré en el código)

Las dos apps **comparten el mismo sistema de diseño** (mismos colores, misma tipografía
`Public Sans`, mismos estilos de cabecera y pestañas). Eso es una gran noticia: visualmente
ya se ven como el mismo producto. La unificación **no** requiere rediseñar nada.

Pero por dentro son **muy distintas**. Esta es la parte más importante del documento:

| | **CRM** | **Logística** |
|---|---|---|
| Tecnología | 1 archivo HTML, JS puro | 1 archivo HTML, JS puro |
| Tamaño | ~435 KB | ~264 KB |
| **Dónde guarda los datos** | **`localStorage` del navegador** | **Supabase (nube)** |
| **Login** | **Selección de usuario, sin contraseña** | **Email + contraseña real (Supabase Auth)** |
| Tabla de roles | `USUARIOS` fijo en el código | `usuarios_roles` en Supabase |
| Roles | vendedor, auditora, admin | logistica, soporte, admin, direccion, deposito, flete, vendedor, jony |

### ⚠️ El punto clave que hay que entender

- **Logística ya es "de verdad":** los datos viven en la nube (Supabase), el login pide
  contraseña, y hay una tabla de roles y auditoría. Varias personas pueden trabajar sobre
  los mismos datos.

- **El CRM todavía NO:** los datos de clientes **viven solamente en el navegador de cada
  persona** (`localStorage`). Esto significa que hoy, si Nati carga un cliente en su
  computadora, **Sergio no lo ve** en la suya. Y el "login" es solo elegir un nombre de una
  lista: no hay contraseña ni seguridad real.

Esta diferencia es **la decisión más importante de todo el proyecto**, y condiciona el orden
de las etapas (ver sección 7).

### Dos señales de que este plan ya venía en camino

1. **Logística ya tiene un rol `vendedor`** con una pestaña "Logística" de solo consulta
   (la vista `vVendedorLog`). O sea, la "vista comercial reducida" que imaginabas para el
   vendedor **ya existe en germen**.
2. **El CRM ya tiene empezado un menú lateral "BH"** (`bhSide` / `bh-nav`). La idea de un
   menú común ya estaba insinuada en el código.

---

## 3. Principio fundamental (regla del proyecto)

> **La aplicación principal solo se encarga de: autenticación, navegación y comunicación
> entre módulos. Cada módulo es independiente y no conoce el código interno de los demás.**

En concreto:

- **NO** fusionamos los HTML.
- **NO** copiamos código de un módulo dentro del otro.
- Cada módulo sigue siendo un archivo que **puede abrirse y funcionar solo**.
- Toda funcionalidad nueva que sea "de un área" (ventas, logística, producción…) va como
  **módulo aparte**, nunca metida en el cascarón principal.

---

## 4. Arquitectura elegida: **cascarón + módulos en iframe**

Para dos aplicaciones que hoy son **archivos HTML gigantes e independientes**, la forma más
segura de unirlas **sin reescribirlas** es un **cascarón (shell)** que aloja cada módulo en
un `iframe`.

```
┌─────────────────────────────────────────────┐
│  BH   BELGRANO HOME · Gestión                │  ← cabecera común (cascarón)
│       [ CRM ]  [ Logística ]      Nati ▾ Salir│  ← navegación común (cascarón)
├─────────────────────────────────────────────┤
│                                             │
│      (acá se muestra el módulo activo        │  ← iframe: modules/crm/index.html
│       dentro de su propio iframe aislado)    │     o    modules/logistica/index.html
│                                             │
└─────────────────────────────────────────────┘
```

### ¿Por qué iframe y no "pegar todo en un HTML"?

Porque el `iframe` cumple **exactamente** tus reglas, casi sin esfuerzo:

| Tu regla | Cómo la cumple el iframe |
|---|---|
| No fusionar los HTML | Cada módulo sigue siendo su propio archivo, intacto |
| Módulos independientes | El iframe aísla estilos, variables y JS de cada módulo |
| El CRM no conoce a Logística | Están en documentos separados; no se ven entre sí |
| App principal = solo navegación | El cascarón son ~15 KB: login + menú + nada más |
| No romper lo que funciona | Los módulos **no se tocan**: se copian tal cual |
| Cada módulo funciona solo | Sí: `modules/crm/index.html` abre y anda por sí mismo |

**Trade-off honesto:** el iframe es la opción correcta *para esta etapa*, con dos HTML
monolíticos que no queremos reescribir. Más adelante, si algún módulo se parte en piezas
más chicas, se puede migrar a otra técnica. Pero hoy, iframe = máximo resultado, mínimo
riesgo.

---

## 5. Estructura de carpetas

```
plataforma/
├── index.html                 ← EL CASCARÓN: login + navegación (único archivo "principal")
├── ARQUITECTURA.md            ← este documento
├── README.md                  ← cómo correrlo y cómo agregar un módulo
├── modules/
│   ├── crm/
│   │   └── index.html         ← CRM actual, COPIADO SIN TOCAR
│   └── logistica/
│       └── index.html         ← Logística actual, COPIADO SIN TOCAR
└── shared/                     ← (futuro) piezas comunes: logos, helpers, cliente supabase
```

Para sumar un módulo nuevo (ej. Producción) en el futuro:
1. Se crea `modules/produccion/index.html`.
2. Se agrega una línea al catálogo `MODULOS` del cascarón.
3. Se define en qué roles aparece.

Nada más. **Ningún módulo existente se toca.**

---

## 6. Usuarios y permisos

### El problema a resolver
Hoy hay **dos listas de usuarios distintas** que no se conocen entre sí:
- CRM: `USUARIOS` (sergio, nati, ale, cristian, claudia, cintia, brian) en el código.
- Logística: tabla `usuarios_roles` en Supabase.

### La decisión
La **fuente de verdad de usuarios y roles será Supabase** (`usuarios_roles`), porque ya es
un sistema real y con contraseña. El cascarón hace **un solo login** contra Supabase y, según
el rol, muestra los módulos que corresponden.

### Mapa de acceso (qué módulos ve cada rol)

| Rol | CRM | Logística |
|---|---|---|
| `vendedor` | ✅ administra sus clientes | 👁️ consulta (vista reducida) |
| `logistica` | 👁️ consulta | ✅ control total |
| `direccion` / `admin` | ✅ total | ✅ total |
| `auditora` | ✅ | 👁️ consulta |
| `deposito` / `flete` / `soporte` | — | ✅ / según su vista |

> Los **permisos finos** (qué botón puede tocar cada uno *dentro* de un módulo) los sigue
> resolviendo **cada módulo por su cuenta**, como ya lo hace Logística hoy. El cascarón solo
> decide **qué pestañas mostrar**. Así no debilitamos la seguridad de cada módulo.

---

## 7. Plan de migración por etapas (orden recomendado)

### ✅ Etapa 1 — El cascarón (HECHO en este entregable)
- Cascarón con login único (Supabase) + navegación común.
- Los dos módulos copiados **sin tocar** y cargados en iframe.
- Menú según rol.
- **Resultado:** todos entran a un solo lugar, con una sola barra arriba, y cambian entre
  CRM y Logística con un clic.
- **Riesgo:** muy bajo. No se modificó la lógica de ningún módulo.

**Detalle honesto sobre el "login único":** al entrar al cascarón, **Logística ya no vuelve a
pedir contraseña** (comparte la sesión de Supabase automáticamente). El **CRM**, en cambio,
todavía muestra su pantalla de "elegí tu usuario", porque hoy usa su propio sistema. Cerrar
esa brecha es la Etapa 2.

### 🔜 Etapa 2 — Login realmente único (CRM adopta Supabase Auth)
- Que el CRM lea el usuario logueado del cascarón en vez de mostrar su lista.
- Cambio **acotado**: se toca solo la *entrada* del CRM, no su lógica de negocio.
- **Resultado:** una sola pantalla de login para toda la plataforma.

### 🔜 Etapa 3 — El CRM guarda en Supabase (no en el navegador)
- **La más importante para el negocio**, y la más delicada.
- Hoy los datos del CRM viven solo en el navegador de cada persona. Para que sea un sistema
  real y compartido, hay que mover clientes/consultas/seguimientos a Supabase.
- Se hace tabla por tabla, con respaldo, sin apuro.
- **Resultado:** todos ven los mismos datos; nada se pierde si se borra el navegador.

### 🔜 Etapa 4 — Integración entre módulos (compartir datos)
- Recién acá conectamos el flujo `Cliente → Pedido → Entrega`.
- Desde la ficha del cliente en el CRM se puede "Ver en logística" la entrega asociada.
- Requiere que CRM y Logística compartan identificadores (cliente, pedido, entrega) en
  Supabase. Por eso va **después** de la Etapa 3.

---

## 8. Riesgos y cómo los cuidamos

| Riesgo | Mitigación |
|---|---|
| Romper el CRM o Logística al unir | En Etapa 1 **no se tocan**: se copian tal cual |
| Perder datos del CRM | No se migra nada hasta Etapa 3, y con respaldo previo |
| Confusión de usuarios entre las dos listas | Fuente única = Supabase `usuarios_roles` |
| Que un vendedor toque cosas de logística | Cada módulo mantiene sus permisos internos |
| El proyecto se vuelve un HTML gigante | Prohibido por diseño: módulos separados + iframe |

---

## 9. Cómo crecer en 6 meses

La regla de oro, para que el proyecto no se desordene al sumar Producción, Stock y Reclamos:

> **Toda funcionalidad nueva se desarrolla como un módulo independiente
> (`modules/<area>/`) o como un componente reutilizable en `shared/`.
> Nunca se mete lógica de un área dentro del cascarón principal.
> El cascarón es solo el "contenedor" de la plataforma.**

---

## 10. Resumen en una frase

> Belgrano Home deja de ser "dos HTML sueltos" y pasa a ser **una plataforma con un solo
> ingreso y un menú común**, donde cada módulo sigue viviendo en su propio archivo. Primero
> unificamos el acceso y la navegación (Etapa 1, ya hecho); después el login (2); después
> llevamos el CRM a la nube (3); y por último conectamos la información entre módulos (4).
