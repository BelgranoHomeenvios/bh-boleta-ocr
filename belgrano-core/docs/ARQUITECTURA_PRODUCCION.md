# Producción — modulación y arquitectura

Documento técnico para analizar el módulo antes de construirlo. Todo lo que está
acá sale de las decisiones que ya se tomaron con Dirección; las que quedan
abiertas están marcadas **[abierto]**.

---

## 1. Qué es Producción

Producción **no crea muebles ni los vende**: recibe unidades que ya existen —nacen
con la venta o con la reposición de stock— y se ocupa de tres cosas:

1. **Dibujarlas** cuando hacen falta planos (a medida y modificados).
2. **Pedirlas** a un proveedor, con su plano o su planilla, y seguir la fecha.
3. **Recibirlas**, controlarlas y entregárselas a Inventario.

Lo que agrega al dato: **a quién se le pidió, para cuándo, cómo llegó**.

Lo que NO hace: reservar (eso vive en la venta), pagar (eso es Compras y
Tesorería), guardar (eso es Inventario).

---

## 2. Submódulos (las solapas)

| Solapa | Qué contesta | Entidad principal |
|---|---|---|
| **Resumen** | Cómo viene todo hoy | — |
| **Cola de trabajo** | Qué hay que hacer y quién lo tiene que hacer | tareas derivadas |
| **A fabricar** | Qué falta pedir y qué está en la calle | `unidad` |
| **A dibujar** | Qué planos faltan y cuáles hay que verificar | `plano` |
| **Pedidos** | Qué le mandé a cada uno, abierto o cerrado | `pedido` |
| **Talleres** | La carpeta física de cada proveedor | `proveedor` |
| **Recepciones** | Qué trajo, cómo llegó, qué quedó debiendo | `recepcion` |
| **A reparar** | Lo que llegó con algo y no entra al depósito | `unidad` |
| **Stock a pedir** | Lo que hay que fabricar sin venta | `variante` |
| **Planificación** | Qué entra cada semana por taller | `pedido` |
| **Control de calidad** | Cómo entrega cada uno | `recepcion` |
| **Historial** | Todo lo que le pasó a una pieza | `evento` |

Las tres primeras son las de uso diario. *A fabricar* es una sola pantalla con
tres agrupaciones (proveedor · orden de venta · mueble), no tres pantallas.

---

## 3. Entidades

### 3.1 `unidad` (ya existe, se le agregan campos)

Una pieza física o futura. Es la unidad de todo el sistema.

```
id, serie            BH-000187 — se asigna al RECIBIR, no antes
productoId, varianteId
estado               pedir | produccion | stock | entregada
orden                nº de venta, o null si es para stock
marca                sena | reparar | confirmar | reclamo | null
ubicacion, foto, nota

--- nuevo ---
tipo                 estandar | modificado | medida
cambios[]            [{propiedad, deCatalogo, pedido}]   sólo en modificado
planoId              plano que le corresponde (de variante o propio)
planoEstado          ok | a_dibujar | a_editar | a_verificar | verificado
pedidos[]            [{rubro, pedidoId, estado}]   uno por rubro
enlazada             bool — sólo aplica con 2+ rubros
calidad              perfecto | detalle | reparar | devuelto | null
calidadNota, calidadFotos[]
```

**Regla dura:** `estado` es *dónde está*, `marca` es *cómo está*, `orden` es *de
quién es*. Son ejes ortogonales y no se mezclan. La lectura que ve el usuario
(`vistaUnidad`) se deriva de los tres.

### 3.2 `plano` (nuevo)

```
id
alcance              variante | unidad
varianteId | unidadId
archivo              PDF — el dibujo, no se genera, se sube
version              v1, v2, v3… no se pisan
estado               a_dibujar | a_editar | a_verificar | verificado | rechazado
dibujadoPor, dibujadoEl
verificadoPor, verificadoEl
marcas[]             [{n, x, y, texto, autor, fecha, resueltaPor, resueltaEl}]
trazos[]             capa de lápiz, encima del PDF, no lo modifica
```

**Reglas duras:**
- El plano de una **variante estándar** se carga una vez y sirve siempre.
- El plano de un **a medida** es de la unidad y no se reusa.
- `verificadoPor != dibujadoPor` — el sistema lo impide.
- No se puede pedir una unidad cuyo plano no esté `verificado` u `ok`.

### 3.3 `croquis` (nuevo, vive en la venta)

```
id, ventaLineaId, archivo (foto o PDF), subidoPor, subidoEl
```

Obligatorio en `medida`, opcional en `modificado`. Sin croquis, un a medida
**no deja confirmar la venta**.

### 3.4 `pedido` (nuevo)

```
id, numero           P-000124 — serie propia, igual que las unidades
proveedorId
estado               abierto | cerrado | entregado | recibido | anulado
rubro                carpinteria | herreria | tapiceria…
modo                 dibujo | planilla   (sale del producto)
desde, hasta         el rango comprometido — NO una fecha sola
items[]              [{unidadId, cantidad, agregadoEl, urgente, observacion}]
abiertoPor, abiertoEl, cerradoPor, cerradoEl
impresiones[]        [{fecha, quien, qué}]
historial[]
```

**Reglas duras:**
- **Abierto** admite altas y bajas; **cerrado** no, hasta reabrirlo.
- Reabrir marca los ítems nuevos como `agregado el dd/mm` y obliga a reimprimir.
- Un pedido es **de un solo proveedor y un solo rubro**.
- Una unidad de dos rubros está en **dos pedidos** distintos.

### 3.5 `recepcion` (nuevo)

```
id, numero           R-000092
pedidoId, proveedorId
fecha, recibidoPor
items[]              [{unidadId, calidad, nota, fotos[], serieAsignada, ubicacion}]
faltantes[]          los que no vinieron — siguen en el pedido
estadoCompras        pendiente | conformada
```

**Reglas duras:**
- Recibir asigna la **serie** y la **ubicación**: antes no existían.
- `perfecto` y `detalle` → entran a Inventario.
- `reparar` → **no entra**, queda en Producción hasta que se arregla.
- `devuelto` → **no entra** y vuelve al pedido como pendiente.

### 3.6 `evento` (historial)

```
id, unidadId | pedidoId | recepcionId, tipo, texto, quien, fecha, datos{}
```

Append-only. Nada se borra: anular deja el evento de la anulación.

---

## 4. Estados y transiciones

### 4.1 La unidad

```
                    ┌──────────── venta confirmada ─────────────┐
                    │                                            │
[venta] ──► a pedir ──► en producción ──► (recepción) ──► stock ──► entregada
[stock]     │             │                    │
            │             │                    ├─ reparar ──► (reparada) ──► stock
            │             │                    └─ devuelto ──► vuelve a en producción
            │             │
            └── a dibujar / a verificar ──┘   (sólo medida y modificado-con-plano)
```

### 4.2 El plano

```
a_dibujar ──► a_verificar ──► verificado
    ▲              │
    └── rechazado ─┘   (con marcas sin resolver)
```

`a_editar` es una variante liviana de `a_dibujar`: se parte del PDF en blanco que
ya existe y se cambia una cota.

### 4.3 El pedido

```
abierto ──► cerrado ──► entregado ──► recibido (total o parcial)
   ▲           │
   └─ reabrir ─┘
```

---

## 5. Los tres tipos de mueble

| | estándar | modificado | a medida |
|---|---|---|---|
| Existe en el catálogo | sí | sí, con un cambio | no |
| Plano | de la variante | de la variante, editado si cambia una cota | propio |
| Croquis del vendedor | no | opcional | **obligatorio** |
| Pasa por Adrián | no | **sólo si hay que editar el plano** | sí |
| Verificación de dibujo | no | si se editó | sí |
| Verificación de precio | no | **sí** | **sí** |
| Se puede pedir | al confirmar la venta | con el precio verificado | dibujado + verificado |

**[abierto]** El nombre del del medio: propuesto **modificado**.

---

## 6. Permisos por rol

| Acción | Vendedor | Adrián (Producción) | Encargado | Administración | Dirección |
|---|---|---|---|---|---|
| Subir croquis | ✔ | | | | ✔ |
| Dibujar / editar plano | | ✔ | ✔ | | ✔ |
| Verificar plano | | ✖ *(no el que dibujó)* | ✔ | | ✔ |
| Verificar cotización | | | | ✔ | ✔ |
| Confirmar la orden | | | | ✔ | ✔ |
| Abrir / cerrar pedido | | ✔ | ✔ | | ✔ |
| Marcar urgente | | | ✔ | | ✔ |
| Recibir y controlar | | ✔ | ✔ | | ✔ |
| Conformar precios | | | | | ✔ *(y Compras)* |
| Ver costos | ✖ | ✖ | ✔ | ✔ | ✔ |

---

## 7. Enganches con otros módulos

| Con | Qué entra | Qué sale |
|---|---|---|
| **Ventas** | la unidad nace al confirmar; el croquis; el tipo y los cambios | la fecha comprometida; qué traba la entrega |
| **Catálogo** | el plano de la variante; los rubros y su modo; los días de fábrica | el costo real, desde la conformación de Compras |
| **Inventario** | — | la unidad recibida, con serie y ubicación |
| **Compras** | — | la recepción con precios de lista para conformar |
| **Logística** | — | la orden queda lista cuando están todas sus piezas |
| **Tesorería** | — | vía Compras, lo que hay que pagarle a cada proveedor |

**El puente con Compras:** al cerrar una recepción se genera un pendiente de
conformación con los muebles recibidos, su calidad, el precio de lista y el
total. Compras compara contra el remito del proveedor. Corregir un precio tiene
dos caminos: **sólo esta orden** (excepción con motivo) o **actualizar la lista**
(vigente desde hoy). El precio conformado alimenta el costo real del catálogo.

---

## 8. Invariantes (lo que el sistema no debe permitir)

1. Pedir una unidad sin plano verificado.
2. Que el que verifica un plano sea el que lo dibujó.
3. Confirmar una venta con un mueble a medida sin croquis.
4. Bajar a Producción una venta sin confirmar administrativamente.
5. Bajar a Producción un modificado o un a medida sin el precio verificado.
6. Agregar ítems a un pedido cerrado sin reabrirlo.
7. Que una unidad con dos rubros entre a Inventario sin estar enlazada.
8. Que una unidad `a reparar` o `devuelta` cuente como stock.
9. Conformar una recepción con diferencia distinta de cero sin explicarla.
10. Borrar cualquier cosa: todo es append-only con su evento.

---

## 9. Orden de construcción

| # | Lote | Depende de |
|---|---|---|
| 1 | Modelo: `pedido`, `plano`, tipos de mueble, eventos | — |
| 2 | **A fabricar** con las tres agrupaciones y filtros por columna | 1 |
| 3 | **Pedidos**: abrir, llenar, cerrar, reabrir, imprimir | 1, 2 |
| 4 | **A dibujar** + comparar y corregir con marcas | 1 |
| 5 | **Recepción** con control de calidad + **A reparar** | 3 |
| 6 | **Talleres** (la carpeta) e **Historial** | 3, 5 |
| 7 | **Cola de trabajo** y **Planificación** | 2–5 |
| 8 | **Control de calidad** (lectura) | 5 |
| 9 | Puente a **Compras** | 5 |

Los lotes 1–3 son el corazón: con eso ya se puede pedir de verdad.

---

## 10. Lo que falta definir

1. **[abierto]** Columnas de la planilla por rubro: ¿fijas por categoría o por proveedor?
2. **[abierto]** El enlace de dos rubros: ¿lo hace la fábrica o el depósito?
3. **[abierto]** El pedido cerrado: ¿se manda desde el sistema o se imprime?
4. **[abierto]** El nombre de *modificado*.
5. **Los PDF de Drive:** están organizados por categoría → modelo → medida, y ya
   hay versiones "EN BLANCO". Falta mapear cada archivo a su variante por el
   código (`S-CA-HO-09-I-NP` = cama Houston 0.90 izquierda negro-paraíso) y
   detectar qué variantes se quedaron sin plano.
