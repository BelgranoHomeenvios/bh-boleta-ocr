# Belgrano Core — modelo de datos

Migraciones para Supabase. Correr **en orden**, cada archivo entero de una vez,
en el SQL Editor.

| Archivo | Qué crea |
|---|---|
| `bloque1_v3.sql` | Esquemas · agente · cliente · catálogo · unidad · orden · línea · grupos · parámetros · autorización · evento |
| `bloque2_plata.sql` | Numeración · cobro · imputación · caja · rendición · devolución · cesión · bloqueo financiero |
| `bloque3_abastecimiento.sql` | Proveedor · pedido · tanda · recepción · fabricación interna · cuenta corriente · compras y gastos |

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

- **Bloque 4** — RLS y permisos finos
- **Logística y entregas** — bloqueado: falta el documento de la Sección 8
- **Facturación** — bloqueado: falta el documento

## Reglas verificadas contra Postgres

Bloque 1 — precio_total = valor_mueble + costo_financiacion · una unidad física
no puede estar reservada por dos líneas · dirección obligatoria si la modalidad
es entrega · la orden anulada y la orden vacía no son "parcial" · sin ciclos de
precedencia · eventos append-only.

Bloque 2 — pago doble, sobrepago, pagador tercero, dólares con cotización
congelada y pago sin orden, los cinco sin mecánicas nuevas · cobro e imputación
inmutables · no se entrega sin cobrar · el canal no puede recibir plata.

Bloque 3 — un solo pedido abierto por proveedor · sin seña rendida no se emite ·
precedencia del hierro · líneas atadas al mismo proveedor · el costo nace al
recibir y queda atado a la unidad · lo devuelto se arrastra solo a la próxima
tanda · el desglose DC/Personal no puede exceder la compra.
