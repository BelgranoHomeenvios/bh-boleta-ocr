# Belgrano Core — modelo de datos

Migraciones para Supabase. Correr **en orden**, cada archivo entero de una vez,
en el SQL Editor.

| Archivo | Qué crea |
|---|---|
| `bloque1_v3.sql` | Esquemas · agente · cliente · catálogo · unidad · orden · línea · grupos · parámetros · autorización · evento |
| `bloque2_plata.sql` | Numeración · cobro · imputación · caja · rendición · devolución · cesión · bloqueo financiero |

Probado contra PostgreSQL 16.13: ambos corren limpio y pasan las pruebas de
negocio (pago doble, sobrepago, pagador tercero, dólares con cotización
congelada, cobro caído, candado de entrega).

## Los tres esquemas

Separados por **quién puede ver**, no por módulo — porque ahí se aplica el RLS.

| Esquema | Qué va | Quién ve |
|---|---|---|
| `core` | Todo lo operativo | Según rol |
| `finanzas` | Costos, márgenes, parte formal | Solo dirección |
| `audit` | Eventos | Solo lectura, dirección |

## Antes de exponer nada

No agregar los esquemas en *Settings → API → Exposed schemas* hasta tener el
RLS definido. El SQL Editor entra por debajo de la API y alcanza para probar.

## Pendiente

- **Bloque 3** — abastecimiento: proveedor · pedido · recepción · cuenta corriente
- **Bloque 4** — RLS y permisos finos
- Faltan dos documentos de diseño: **Sección 8 (Logística)** y **Facturación**
