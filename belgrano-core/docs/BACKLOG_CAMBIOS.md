# Backlog de cambios chicos — para aplicar en lote

> Método: se van anotando acá los cambios chicos que pide Brian. No se aplican
> uno por uno; se juntan y se hacen todos juntos cuando diga "unificá y aplicá".
> Cada ítem: estado ⬜ pendiente · ✅ hecho.

## Por aplicar (lote actual)

**Refinamientos del Detalle de la orden (post-Lote 2)**
- ⬜ 27. Forma de pago NO debe ser dropdown editable directamente; pasa a **"Modificar orden"** (necesita autorización).
- ⬜ 28. **Comentarios/mensajes** se mueven al **sidebar lateral** donde hoy está "Totales y Pagos" (no en card inferior).
- ⬜ 29. **Subtotal breakdown** en el bloque de totales: Muebles → Complementos → Envíos/Instalación/Escalera (desglose claro).
- ⬜ 30. **Filas más compactas** (~1.3 cm máx por renglon) para que todo entre en una sola pantalla sin scroll.
- ⬜ 31. **Columna Imagen** en la tabla de muebles (especialmente crítica para a medida; vendedores cargan foto para aclarar pedido).

**Nueva cotización (`ventas/presupuesto.js`) — 3 espacios bien marcados**

Estructura general
- ⬜ 32. Las 3 secciones (**Datos del cliente** · **Productos y cotización** ·
  **Adicionales**) van como **desplegable / por etapas**: se va completando de a
  una, no todo abierto a la vez. Hoy hay demasiados campos a la vista.

Sección 1 · Datos del cliente
- ⬜ 33. Orden de los campos: **Nombre → Teléfono → Mail → ¿Cómo nos conoció?**
  (hoy arranca por Teléfono y el Nombre está tercero).
- ⬜ 34. **Instagram como campo oculto**: un botón "IG" que lo revela, para el caso
  en que en vez de teléfono se anote un usuario de IG. Si no hace falta, no se carga.
- ⬜ 35. **DNI también oculto** detrás de su botón (se abre sólo si hace falta factura).
- ⬜ 36. **Vendedor y Local salen por default** del usuario de la sesión (el que vende
  entra con su usuario). Ambos **editables**, pero siempre precargados.
- ⬜ 37. **Término de pago** se mantiene. **"Vence" se elimina** (no hace falta).
- ⬜ 37b. Agregar **Domicilio de entrega** y **Localidad**.
- ⬜ 37c. **Teléfono adicional** oculto: botón **"+ Teléfono"** que abre el campo
  (mismo criterio que IG y DNI — no va como campo fijo).

Sección 2 · Productos (hoy "Ítems")
- ⬜ 38. Renombrar **"Ítems" → "Productos"**.
- ⬜ 39. **Buscador de producto** de ~4 cm máx: al escribir aparecen las coincidencias.
  **Insensible a tildes** ("comoda" tiene que traer "CÓMODA").
- ⬜ 40. Al elegir el producto se abre el **armado por variantes con botones**
  (no desplegables): primero **Medida**, después **Estructura**, después **Frente**.
  El **precio se va actualizando** a medida que se arma.
- ⬜ 41. **No mostrar todos los precios** de todas las variantes (puede haber 15 por
  mueble) — sólo el precio del combo armado.
- ⬜ 42. La línea cargada muestra el producto con **el nombre de cada variable**:
  `Medida 1,20 · Estructura Blanco · Frente Paraíso`
  (hoy dice sólo "1.20 · blanca · paraiso", sin decir qué es cada cosa).
- ⬜ 43. Nueva **columna Estándar / A medida** entre Producto y Cantidad (hoy sobra
  espacio ahí). **Estándar → precio bloqueado**; **A medida → precio se libera** y se
  completa a mano.
- ⬜ 44. Sacar el botón suelto **"+ A medida"** de arriba: a medida es una **opción
  dentro de cada producto**, no un ítem aparte.
- ⬜ 45. Renombrar columna **"Observaciones" → "Detalle"**.
- ⬜ 46. **Botón de cargar imagen** por línea de producto.
- ⬜ 47. Ideal: traer la **imagen real del producto desde Tienda Nube** (miniatura al
  lado del nombre, estilo boleta de TN: foto + nombre + variantes + `1 x $868.449`).
  Cantidad y precio unitario quedan como están.

Sección 3 · Adicionales

> Son las preguntas que hoy siempre hay que anotar a mano. La idea es que la
> mayoría **salga por default** y el vendedor sólo corrija lo que cambie.

- ⬜ 49. **Tiempo de entrega** — default **"entre 30 y 35 días"**. Si se **edita**,
  la orden **salta a verificación** y queda contabilizado (cambio de plazo es un
  dato que hay que auditar, no una edición libre).
- ⬜ 50. **Saldo se abona en** — se autocompleta con el **mismo método elegido en
  Término de pago**.
- ⬜ 51. **Costo de envío** — sale **por default según la localidad** cargada en
  Datos del cliente (tabla localidad → precio de flete).
- ⬜ 52. **¿Requiere instalación?** — default **NO**.
- ⬜ 53. **Subida por escalera** — default **$5.000 por piso por bulto**, editable.
- ⬜ 54. **IVA no incluido** — sale por default como leyenda/marca.

CRM
- ⬜ 48. **Vinculación a CRM**: cada cotización se guarda en los registros del vendedor
  para darle seguimiento después.

## Lote 2 — APLICADO (refinamiento del Detalle de la orden)

- ✅ 22. Menos emojis, look más moderno (header, acciones, muebles sin pills-emoji).
- ✅ 23. Estándar / A medida como **columna** al lado del mueble (no pill con emoji).
- ✅ 24. Nombre del mueble con su **variante** (ej. "Cómoda Amberes 1.20 · Paraíso/Blanco").
- ✅ 25. **Forma de pago** grande y **editable** arriba; cambiarla **recalcula** el
  total con su recargo (Efectivo 0% · Transferencia +5% · Tarjeta +10%).
- ✅ 26. **Flete e instalación** (subida por escalera) con su **valor**, sumados al
  total. Botón "Editar flete / instalación" (stub).

> Pendiente base real: recargos por forma de pago y valores de flete/instalación
> hoy son demo; se definen con la lista de precios real. Imagen de mueble sigue
> como monograma (falta traer de Tienda Nube).

## Lote 1 — APLICADO (tabla de Boletas + Detalle de la orden)

Pendientes de "para cuando apliquemos" que quedaron como aproximación demo y hay
que terminar con la base real:
- 15/imagen TN: hoy va un placeholder 🪑 (falta mapear `tn_variant_id` → imagen).
- 21/archivos: hoy se listan; falta el guardado real en el cajón de Contabilidad.
- 🔔 recordatorios: guardan {fecha, texto}; falta que disparen aviso ese día.
- Reclamo-que-convive: hoy es un flag `reclamo`; se consolida con el módulo Reclamos.

### Tabla de Boletas (Ventas → Resumen)

**Estados y filtros**
- ✅ 1. Agregar estados faltantes a los filtros: **Reclamo**, **Preproducción**
  (ubicar *Preproducción* ANTES de "En fabricación") y **Archivadas**.
- ✅ 2. Nuevo filtro **"Activas"** = a confirmar + preproducción + en fabricación +
  listas + en logística + reclamos (con las que se trabaja habitualmente).
- ✅ 3. Que el filtro venga **por default en "Activas"** (no en "Todas").

**Reclamo como estado que convive**
- ✅ 4. Una boleta puede tener 2 estados a la vez: (Listo + Reclamo) o
  (Entregado + Reclamo). "Reclamo" es una marca que convive con el estado del
  ciclo → toca modelo de datos (estado del ciclo + flag/estado de reclamo).
- ✅ 5. Acceso rápido / módulo para entrar directo a las **boletas con reclamo**.

**Columnas = también filtros/orden**
- ✅ 6. Que **cada columna sea filtrable y ordenable** (Nº de venta, cliente,
  estado, etc.) — así tengo los chips de arriba Y el filtro/orden por columna.
- ✅ 7. (default en "Activas" — mismo que ítem 3).

**Orden y comportamiento de columnas**
- ✅ 8. **Vendedor** sale de columna fija y pasa adentro de los **⋮ (3 puntitos)**.
- ✅ 9. Columnas fijas, en este orden:
  Nº de orden · Cliente · Método de pago · Total · Seña · Saldo ·
  **Muebles (desplegable inline** → abre los muebles comprados dentro de la
  misma pantalla, sin salir**)** · Estado · Fecha de entrega ·
  **🔔 recordatorios** (campanita nueva) · **💬 comentarios** · ⋮ (con vendedor).

> Notas para cuando apliquemos:
> - "Preproducción" hay que definirlo como estado del ciclo (entre confirmada y
>   fabricación).
> - 🔔 recordatorios es un concepto nuevo (recordatorio por boleta) — definir
>   qué guarda (fecha + texto) al aplicarlo.
> - El reclamo-que-convive conviene resolverlo junto con el módulo Reclamos.

### Detalle de la orden (Ver una venta / OrdenDetalle)

**Layout — todo en una pantalla**
- ✅ 10. Que entre TODO en una sola pantalla, sin necesidad de scrollear.
- ✅ 11. Arriba, primero: **Nº de orden + Cliente**.
- ✅ 12. **Acciones arriba con emojis**: 🛠️ Modificar orden · 🏭 Ver producción ·
  🚚 Ver logística.
- ✅ 13. **Método de pago** elegido por el vendedor, visible arriba.

**Detalle de muebles (tipo boleta)**
- ✅ 14. Tabla compacta estilo boleta: **Producto · Cantidad · Monto por producto**
  (más chico que ahora).
- ✅ 15. **Imagen del mueble** por línea (si se puede, traída desde Tienda Nube).
- ✅ 16. Marca **estándar / a medida con emoji** por línea.

**Pagos y saldo (bloque al costado — ya existe)**
- ✅ 17. Sumar al bloque Total/Pagado/Saldo: si pagó, **el método de pago** ahí, y
  el **tilde de rendición confirmada por el vendedor** (seña rendida/acreditada).

**Bloqueos en rojo**
- ✅ 18. Lo que esté **bloqueando** (el pago o un mueble) resaltado en **ROJO** acá:
  no sólo "a confirmar" — muebles en rojo, saldo en rojo.

**Comentarios / historial por área**
- ✅ 19. Campo de **comentarios** (abajo o al costado) donde fábrica, logística y
  otras áreas puedan sumar notas → **historial de la venta por área**.

**Factura**
- ✅ 20. Si pidió factura o hay que hacerla: **emoji de color** que marque/agrupe la
  factura y quede registrado.

**Archivos**
- ✅ 21. **Archivos** cargados en la orden (plano de mueble a medida, factura, etc.)
  visibles acá, pero **guardados en un lugar exclusivo de Contabilidad** (acceso
  restringido).

> Notas para cuando apliquemos:
> - Imagen de TN: la variante ya tiene `tn_variant_id`; hay que mapear a la
>   imagen del producto en Tienda Nube.
> - "Lugar exclusivo de Contabilidad" para archivos = almacenamiento con acceso
>   restringido (schema/rol Contabilidad-Tesorería), no público.
> - El historial de comentarios por área se cruza con el motor de actividad ya
>   existente (eventos de la orden).

## Aplicados

_(nada todavía)_
