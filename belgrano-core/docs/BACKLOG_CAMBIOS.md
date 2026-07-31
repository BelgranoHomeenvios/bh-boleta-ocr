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

- ✅ 94. La **cantidad se completa en el renglón de carga**, junto al buscador:
  quedan **dos campos para completar** (cuántos y cuál). El armador ya no la
  pide, sólo la copia. Después de agregar, el renglón vuelve a 1.
- ✅ 95. **Sin botones − / +**: se escribe el número y con **Enter** queda
  guardado. Se muestra como texto plano, igual que el nombre del producto.
- ✅ 96. **Precio unit. antes que Dto.** en el orden de columnas.
- ✅ 97. El **renglón de carga baja**: arriba lo ya cargado, abajo para sumar más.
- ✅ 98. El renglón cargado queda **sin edición** — se lee, no se toca. Con el
  **✏️ al final** se abre esa línea (cantidad, tipo, precio, observaciones y
  foto) y con el **✓** se cierra. Se abre de a una. Al pasar una línea a
  **A medida** se abre sola para cargar el detalle; cerrada, la observación y la
  foto quedan a la vista pero sin poder editarse.

- ✅ 99. **Entrega escrita con el mes**: "entre el 5 de septiembre y el 10 de
  septiembre", como **texto plano con un lápiz al costado** (no una caja de
  input). El lápiz abre las **dos fechas con calendario**.
- ✅ 100. La entrega **nunca puede ser un solo día**: si queda una sola fecha, o
  la final es igual o anterior a la inicial, se corrige sola a un rango y avisa.
- ✅ 101. El resumen de la cabecera de Adicionales dice **"entrega 30 a 35 días ·
  envío …"** (el plazo en días, no las fechas).
- ✅ 102. Los adicionales cerrados (envío, instalación, escalera) también son
  **texto plano con lápiz**, y el "volver al valor estándar" es un ícono ↺.
- ✅ 103. La **caja de la cabecera** (N° · Vendedor · Local · Fecha) sale **sin
  desplegables**: se lee, y un **lápiz arriba a la derecha** abre los tres campos.
- ✅ 104. La **actividad no repite el mismo cambio**: mover la fecha tres veces
  deja una sola línea actualizada en lugar de tres.

- ✅ 105. Se saca el cartel de "Buscá un mueble…": con la tabla vacía el
  **renglón de carga aparece directo**, sin espacio muerto arriba.
- ✅ 106. La **cantidad del renglón de carga se escribe de entrada** (campo
  siempre editable), y queda aplicada al elegir el producto. En las líneas ya
  cargadas se mantiene el texto que se toca para editar.

- ✅ 107. En el armador, **después de los tres ejes se elige Estándar o A medida**.
  Estándar toma el precio del catálogo; **A medida queda "A definir"** y la línea
  se abre sola para completarlo.
- ✅ 108. El precio de los a medida se carga con **dos campos enlazados**:
  **Precio de lista** ⇄ **Precio en efectivo**. Se completa cualquiera de los dos
  y el otro sale solo (lista −35% = efectivo · efectivo ÷ 0,65 ≈ ×1,54). El
  porcentaje sale de **Configuración → Reglas de precio**, así que si cambia la
  regla cambia la conversión.

- ✅ 109. Cabecera más compacta (menos aire entre Vendedor · Local · Fecha).
- ✅ 110. Se elimina el cartel de "Para pasar a Productos cargá…": ahora los
  **campos que faltan se marcan en rojo** (Cliente y Teléfono) y se limpian al
  completarlos.
- ✅ 111. El **buscador de producto termina donde termina su columna**: el resto
  del renglón queda vacío y se completa recién al elegir el mueble.
- ✅ 112. Panel del a medida: **Medidas · Colores · Observaciones** en un renglón
  y el **precio** debajo. Se saca la frase del −35%/×1,54.
- ✅ 113. El precio se pide **en la condición elegida arriba** ("Precio en
  efectivo" si la condición es Efectivo); también se puede tipear el **subtotal**
  y el unitario sale solo. El precio de lista se deduce por detrás.
- ✅ 114. La **cámara pasa al renglón**, al lado del "A medida".
- ✅ 115. Al **guardar la línea**, debajo del nombre quedan **Medidas, Colores y
  Observaciones** a la vista.
- ✅ 116. **Términos y condiciones fijos**: salen siempre y no se pueden editar.

- ✅ 117. En Adicionales, **Saldo se abona en**, **Costo de envío** (sin domicilio)
  e **instalación** salen como **texto plano, sin recuadro**; instalación y
  escalera con su lápiz.
- ✅ 118. Se saca el aviso "No se calcula: va como aviso en la cotización" y el
  **banner repetido** de la subida por escalera.
- ✅ 119. Abajo: **Observaciones para el cliente** y **Comentarios internos**,
  estos últimos sobre **fondo gris** para separar bien lo interno de lo externo.
- ✅ 120. Bloque de totales en el orden **Total · Dto. efvo. % · Subtotal · Envío ·
  Descuento · Total a pagar**.
- ✅ 121. **Descuento comercial** en un recuadro gris clickeable que abre un pop-up:
  **% o $**, sobre **todos los muebles** o sobre **un producto** (con selector de
  cuál), con el monto calculado en vivo y opción de quitarlo. Nunca descuenta más
  que la base sobre la que se aplica, y sale en la vista previa.

- ✅ 122. **Teléfono: sólo números** (no deja escribir letras).
- ✅ 123. **Sacar "Precio en efectivo"** del panel del a medida: el precio se
  anota únicamente en el **subtotal**. Al sacarlo, el panel queda en **2 renglones**.
- ✅ 124. El campo **Subtotal** queda libre pero **sin las flechitas** de arriba/abajo:
  es sólo para tipear el número.
- ✅ 125. **"Colores" → "Terminaciones"**.
- ✅ 126. El lápiz de **Entrega abre un calendario de rango**: un solo calendario
  donde se marca primero el desde y después el hasta, con el rango resaltado.
- ✅ 127. Pop-up de descuento: primero **Sobre**, después **En**, y el campo de
  monto/porcentaje **al lado**, en el mismo renglón.
- ✅ 128. En los totales, **Descuento va antes que Envío**.
- ✅ 129. **Términos y condiciones sin recuadro**.
- ✅ 130. El cuadro de totales se **distribuye a lo ancho**, proporcionado con el
  bloque de Términos y condiciones.
- ✅ 131. **Achicar el alto** de Observaciones para el cliente y Comentarios internos.

- ✅ 132. Datos del cliente reordenado: izquierda **Cliente · Domicilio · ¿Cómo
  nos conoció?**, derecha **Teléfono · Localidad · Email**.
- ✅ 133. Los opcionales cuelgan del campo con el que se relacionan: **+** al lado
  de *Teléfono*, **+ IG** debajo de *Cliente* y **Agregar DNI** debajo de
  *¿Cómo nos conoció?* (se van los tres chips sueltos).
- ✅ 134. Con **Tab o Enter** se recorre Cliente → Teléfono → Domicilio →
  Localidad → ¿Cómo nos conoció? → Email (y para atrás con Shift+Tab).
- ✅ 135. En el a medida: **Medidas · Terminaciones · Detalles** ("Observaciones"
  pasó a "Detalles").
- ✅ 136. El **subtotal recalcula mientras se escribe** (unitario, descuento y
  totales); con **Enter** o el ✓ se cierra la línea y se sigue con el siguiente.
- ✅ 137. En Entrega el lápiz pasa a **🗓️** y abre el **calendario ahí mismo**,
  sin pop-up.
- ✅ 138. Si se cambió el plazo, el 🗓️ queda en **recuadro amarillo** (en lugar
  del cartel), para ver de un vistazo que hay que autorizarlo.
- ✅ 139. **Costo de envío sin flechas** (monto directo) y con **🔀**.
- ✅ 140. Nuevo **Costo de instalación**: muestra "Sin instalación" y sólo se abre
  —**obligatorio**— si se pone Sí en *¿Requiere instalación?*. Suma al total y
  bloquea Confirmar → Venta si queda vacío.
- ✅ 141. Comentarios más altos, para que el bloque quede parejo con los totales.
- ✅ 142. "Total a pagar" → **"Saldo restante"**.
- ✅ 143. **Descuento alineado** con Subtotal / Envío, y el "+ Agregar" con los montos.
- ✅ 144. La imagen se **adjunta de verdad** (no una URL) y queda listada en
  **Documentos relacionados**.
- ✅ 145. **Términos y condiciones** queda dentro de la **primera columna**, junto
  a las observaciones; los totales solos a la derecha.

- ✅ 146. **El historial arranca al guardar**, no antes: armar la cotización por
  primera vez no deja rastro en Actividad (no hay nada que auditar todavía).
  Mientras tanto el costado explica desde cuándo se registra.
- ✅ 147. Una vez guardada (o pasada a venta), **todo lo que se toca queda
  registrado con quién lo hizo**.
- ✅ 148. Los cambios con **impacto** (localidad/flete, condición de pago, alta o
  baja de producto, cantidad, precio, plazo de entrega, descuento, instalación)
  quedan **pendientes de confirmar**: el costado avisa cuántos hay y, al guardar
  o pasar a venta, sale un pop-up con **antes → después y la diferencia**, que
  hay que confirmar ("Confirmo que vi los cambios") para poder seguir.

- ✅ 149. Los botones dicen **"Continuar"** a secas.
- ✅ 150. En el armador el **Tipo va primero** (Estándar / A medida) y después los
  tres ejes.
- ✅ 151. Con **A medida**, cada eje suma un **campo libre**: se puede poner "1.10"
  en vez de 1.00, o "a convenir" en vez de una estructura del catálogo.
- ✅ 152. **Medidas · Terminaciones · Detalles arrancan cerrados**, cada uno con
  su **+**: se abre sólo el que hace falta.
- ✅ 153. Acciones repartidas: arriba **Guardar · Confirmar → Venta**; abajo del
  "los precios no incluyen IVA", **Vista previa** — y **Descargar / Imprimir**
  viven adentro de la vista previa.
- ✅ 154. El costado pasa a tres solapas: **Notas · Histórico · Actividad**,
  con **Notas** seleccionada por default.
- ✅ 155. **Actividad** agenda algo para la cotización: **Recordatorio** o
  **Mensaje**, con fecha y nota. Al guardarlo aparece en **Notas** (bloque
  "Agendado") y queda en el **Histórico**.
- ✅ 156. El **Histórico** arranca también al **imprimir** o **descargar**, no sólo
  al guardar o confirmar.
- ✅ 157. **"Ver ficha completa" abre la ficha de ESE cliente**, no el listado
  (`Clientes.render(mount, { id })` o `{ buscar }`); si todavía no existe, deja el
  listado filtrado.

- ✅ 158. Arriba quedan **Guardar · Confirmar → Venta**; abajo de los totales,
  **Vista previa**, y adentro de ella **Descargar / Imprimir**.
- ✅ 159. **Presupuesto A4** con el diseño de la marca (el PDF que pasó Brian):
  logo, "Transformamos hogares" en terracota, N° de cotización espaciado, fecha
  y validez a la derecha, datos del cliente, tabla de productos con sus
  variantes, condiciones a la izquierda y totales a la derecha con el **TOTAL en
  banda negra**, recuadro de observaciones para el cliente y pie con los T&C y
  los datos de contacto. Sirve igual para ver, imprimir y descargar.
- ✅ 160. **Confirmar → Venta ya no muestra el resumen**: sale un pop-up corto
  **"¿Confirmamos la orden OV-…?"** con **No, seguir editando** / **Sí, confirmar**.
  Con Sí se crea la orden con su **N° de orden automático** y se abre la orden
  para terminar de cargarla.

> Pendientes:
> - La **pantalla "Nueva orden"** la va a diseñar Brian en el próximo paso; hoy al
>   confirmar se abre el detalle de la orden ya existente.
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
