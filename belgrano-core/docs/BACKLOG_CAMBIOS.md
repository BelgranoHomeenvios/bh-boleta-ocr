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

## Lote 4 — APLICADO (Nueva cotización · etapas y reagrupamiento)

- ✅ 61. La caja de arriba a la derecha **ya no muestra el total ni los ítems**:
  ahora dice **Vendedor · Local de origen · Fecha del presupuesto** (editables,
  la fecha sale con el día de hoy).
- ✅ 62. **Datos del cliente** queda con sólo datos del cliente: Cliente,
  Teléfono, Email, Domicilio, Localidad, ¿Cómo nos conoció? + los chips
  `+ IG` / `+ DNI` / `+ Teléfono`.
- ✅ 63. **Condición de pago sale de los datos del cliente** y pasa arriba de
  **Productos**: es un dato de la orden y es lo que define con qué lista se
  cotizan los muebles.
- ✅ 64. **Observaciones** baja al pie, después de toda la orden (junto a
  Términos y condiciones).
- ✅ 65. Las tres etapas vuelven a ser **desplegables**: al tocar
  "Continuar → Productos" se cierra Datos del cliente y se abre Productos; con
  "Continuar → Adicionales" pasa lo mismo. "Listo — cerrar" deja todo plegado y
  la cotización entera entra en una pantalla. Se puede abrir/cerrar a mano.
  Cada cabecera plegada muestra un resumen de lo que hay adentro.
- ✅ 66. **Orden de columnas de Productos**: Producto (con el detalle de
  variantes debajo) · Tipo · **imagen** · Cant. · Detalle · **Precio unit. +
  Subtotal juntos al final**.
- ✅ 67. El **ícono de imagen sólo aparece en los a medida** (y en los estándar
  que ya tengan foto del catálogo), al lado del Tipo.
- ✅ 68. Abajo de la tabla, junto al buscador y el catálogo, el **Total de los
  muebles**.

- ✅ 69. El **descuento por condición de pago aplica igual a estándar y a
  medida**. En los a medida el vendedor carga el **precio de lista** y el
  descuento se aplica solo; antes ese precio quedaba fuera del descuento.
- ✅ 70. Nueva columna **Dto.** con el % de la condición de pago, entre Detalle y
  los dos precios (que siguen juntos al final). La columna "Precio unit." pasa a
  mostrar siempre el **precio de lista** y el subtotal ya viene descontado.

- ✅ 71. Los campos opcionales abiertos llevan una **X** al lado: si se abrió uno
  por error, borra lo cargado y vuelve a quedar oculto (reaparece su chip).
- ✅ 72. El resumen de las cabeceras plegadas se **actualiza mientras se escribe**.
- ✅ 73. La caja de la cabecera muestra **N° de cotización · Vendedor · Local de
  origen · Fecha**. El **número se asigna al abrir la pantalla**, aunque todavía
  no se guarde; si la cotización se descarta sin usar, **el número vuelve al pozo**
  y lo toma la siguiente (`DB.tomarNumeroCotizacion()` / `liberarNumeroCotizacion()`).

- ✅ 74. La condición de pago muestra **sólo el nombre** ("Efectivo"), sin el
  −35%: el porcentaje es información interna y el cliente no lo ve.
- ✅ 75. Los descuentos pasan a **Configuración → Reglas de precio**, una pantalla
  real (antes esqueleto) donde se edita el % de cada condición, con ejemplo en
  vivo sobre $1.000.000 y botón para volver a los valores base. La cotización
  toma el valor configurado (`DB.condiciones()` / `descuentoDe()`), que se guarda
  en `localStorage` hasta que haya tabla real.

- ✅ 76. Orden de Datos del cliente: columna izquierda **Cliente · Domicilio de
  entrega · Localidad**, columna derecha **Teléfono · Email · ¿Cómo nos conoció?**,
  y debajo los opcionales en el orden **+ Teléfono · + IG · + DNI**.

- ✅ 77. El **buscador de producto sube arriba de las líneas**, alineado con la
  columna Producto: lo que se elige completa ese renglón directamente.
- ✅ 78. **Cantidad adelante de todo** (primera columna) y también dentro del
  armador, con − / + y botones más chicos para que entren Cantidad, Medida,
  Estructura y Frente, con el precio y Agregar abajo.
- ✅ 79. "Detalle" pasa a **Observaciones** y arranca **cerrado**: sólo se abre al
  pasar la línea a **A medida**.
- ✅ 80. Las observaciones van **abajo del renglón** y a lo ancho (no al costado),
  para poder escribir de verdad, con botón de **📷 Adjuntar foto** del diseño.
- ✅ 81. Se saca el **candado** del precio unitario (sigue bloqueado en estándar).
- ✅ 82. La columna de descuento dice **"Dto. 35%"** en el encabezado y en cada
  línea el **monto descontado**; el descuento total de la orden queda abajo.

- ✅ 83. **Tiempo de entrega como fechas**: "entre 15/09 y el 20/09 (entre 30 y
  35 días)". Viene **bloqueado**; con "Modificar" se abre Desde/Hasta y los días
  se recalculan solos. Con una sola fecha muestra "15/09 (15 días)". Al cambiarlo
  salta el aviso de que **Administración** debe verificarlo y queda en Actividad.
- ✅ 84. **Costo de envío bloqueado** según la localidad, con "Modificar". **Sin
  domicilio cargado no sale ningún costo**: dice "A confirmar posteriormente" y
  no suma al total.
- ✅ 85. Instalación por default **"A convenir posteriormente"** (antes "No").
- ✅ 86. **Subida por escalera** se muestra como **"$5.000 por piso por bulto"**,
  bloqueada y con "Modificar".
- ✅ 87. El **IVA sale de Adicionales**: queda sólo como leyenda abajo del total.
- ✅ 88. **Observaciones Externas / Internas**: las externas salen impresas en la
  cotización, las internas son para nosotros o producción y **nunca** se imprimen.
  El costado de "Notas" edita las internas.
- ✅ 89. **Términos y condiciones con texto por default** (verificar medidas,
  colores y terminaciones antes de confirmar; sin cambios ni reclamos una vez
  iniciada la fabricación).
- ✅ 90. Al **Catálogo se entra por los dos lados**: por **categorías** (rubro →
  tipo de mueble, con la cuenta de productos de cada una) o por **nombre**, y se
  combinan para filtrar más fino.

- ✅ 91. Se saca el **aviso permanente** de "Cargá al menos teléfono, Instagram o
  mail": la pantalla arranca limpia.
- ✅ 92. **No se pasa a Productos sin identificar al cliente**: hace falta el
  **nombre** y **al menos un contacto** (teléfono, Instagram o mail). El aviso
  sale recién al tocar "Continuar", y las secciones Productos y Adicionales
  tampoco se abren desde su título hasta que estén esos datos.
- ✅ 93. **Localidad como buscador**, no un desplegable de zonas: se escribe y
  aparecen las localidades del mapa con su zona y su flete (insensible a tildes).
  La que **no está se carga a mano** (nombre + costo) y **queda guardada** para
  las próximas cotizaciones, marcada como "cargada a mano".

> Pendientes:
> - La lista de localidades es **demo del AMBA**; se reemplaza por la real del mapa.
> - La foto del diseño hoy se carga por **URL**; falta la subida real del archivo.
> - Brian va a definir **qué campos son obligatorios** para poder crear el presupuesto.
> - **Elegir el local al iniciar sesión**: hoy sale de `DB.sesion()` fijo; cuando
>   se active el login hay que pedirlo al entrar para que quede como default real.

## Lote 3 — APLICADO (Nueva cotización)

Se rehizo la pantalla con el **formato de ficha de documento** que pasó Brian:
columna principal (cabecera + solapas) y costado con Actividad/Notas, ficha del
cliente y documentos relacionados.

**Estructura**
- ✅ 32. Los 3 espacios quedan agrupados: **Datos del cliente** (cabecera),
  **Productos** y **Adicionales** (solapas). Se descartó el acordeón por etapas:
  con el formato agrupado entra todo ordenado y sin abrir/cerrar.

**Datos del cliente**
- ✅ 33. Orden Nombre → Teléfono → Mail → ¿Cómo nos conoció?
- ✅ 34. **Instagram** oculto detrás del botón `+ IG`.
- ✅ 35. **DNI** oculto detrás del botón `+ DNI`.
- ✅ 36. **Vendedor y Local** precargados de `DB.sesion()`, editables.
- ✅ 37. **Condición de pago** se mantiene · **"Vence" eliminado**.
- ✅ 37b. **Domicilio de entrega** y **Localidad**.
- ✅ 37c. **Teléfono adicional** detrás del botón `+ Teléfono`.

**Productos**
- ✅ 38. "Ítems" → **Productos**.
- ✅ 39. Buscador corto, **insensible a tildes** ("comoda" trae "CÓMODA").
- ✅ 40. **Armador por botones**: Medida → Estructura → Frente, precio en vivo.
- ✅ 41. Se muestra **sólo el precio del combo armado** (16 variantes por mueble
  en el demo, ninguna lista de precios).
- ✅ 42. La línea dice el **nombre de cada variable**:
  `Medida 1.20 · Estructura Blanca · Frente Paraíso`.
- ✅ 43. Columna **Estándar / A medida**: estándar bloquea el precio 🔒,
  a medida lo libera.
- ✅ 44. **Sin botón suelto "+ A medida"** — se alterna dentro de cada línea.
- ✅ 45. "Observaciones" → **Detalle**.
- ✅ 46. **Botón de imagen** por línea (miniatura clickeable).

**Adicionales**
- ✅ 49. **Tiempo de entrega** default "entre 30 y 35 días"; editarlo avisa que
  la orden **va a verificación** y queda registrado.
- ✅ 50. **Saldo se abona en** — hereda la condición de pago (readonly).
- ✅ 51. **Costo de envío** por localidad (`DB.localidades()` / `DB.fleteDe()`).
- ✅ 52. **¿Requiere instalación?** default **No**.
- ✅ 53. **Subida por escalera** $5.000 por piso por bulto, editable, **como
  leyenda** — no se calcula (es muy variable).
- ✅ 54. **IVA no incluido** por default.

**Del formato de referencia**
- ✅ 55. **Costado con Actividad y Notas** — la actividad se arma sola
  (creó la cotización, agregó producto, calculó descuento, cargó el envío…).
- ✅ 56. **Ficha del cliente** al costado con contacto y "Ver ficha completa" → CRM.
- ✅ 57. **Documentos relacionados** (última consulta / cotización / orden).
- ✅ 58. **Desglose de totales** abajo a la derecha: Muebles (lista) → Descuento →
  Subtotal muebles → Envío → Total, con la leyenda del IVA.
- ✅ 59. **Términos y condiciones** abajo a la izquierda.
- ✅ 60. Barra de acciones: **Vista previa · Descargar · Imprimir · Guardar ·
  Confirmar → Venta**. Sin WhatsApp/mail: hoy se manda por la plataforma que usan,
  así que alcanza con el archivo descargable.

> Pendientes de base real:
> - **48. Vinculación al CRM**: hoy la actividad vive en memoria; falta guardarla
>   en los registros del vendedor para el seguimiento.
> - **47. Imagen desde Tienda Nube**: hoy la imagen se carga por URL; falta mapear
>   `tn_variant_id` → foto del producto para que venga sola.
> - Tabla **localidad → flete** es demo; Brian pasa la real (misma forma).
> - Precios de variantes son demo combinatorio; salen de `variante.precio` real.

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
