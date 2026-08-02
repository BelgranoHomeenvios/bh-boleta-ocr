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
  Con Sí se crea la orden con su **N° de orden automático** y **vuelve al mismo
  editor en modo orden**, con todo lo cargado: la cabecera pasa a decir
  **N° de orden** (con la cotización de origen debajo), el kicker a *Ventas ·
  Órdenes*, desaparece "Confirmar → Venta" y aparece **Nueva cotización** para
  arrancar una nueva. El documento impreso también cambia a "Orden n.º" y deja
  de mostrar la validez.
- ✅ 162. La vista previa muestra la **A4 entera y proporcionada**: se escala por
  ancho y por alto para que entre completa en el modal, sin scroll.
- ✅ 161. La leyenda de la seña queda en **30% para iniciar la fabricación**
  (coincide con el mínimo del motor de órdenes).

- ✅ 163. **La venta se modela con la misma lógica que la cotización**: al pasar
  a orden aparece una **4ª etapa "Seña y pago"** (sólo existe con la venta
  confirmada), con el mismo formato de desplegable y resumen en la cabecera.
  - KPIs arriba: **Total · Seña mínima (30%) · Señado · Saldo**.
  - Se registran pagos con **método**: *Efectivo* → queda **rendido**;
    *Transferencia* → **sin acreditar** hasta que Administración la confirme
    contra el banco, y pide **quién depositó** (no siempre es el cliente).
  - **Quién lo recibió** sale de la lista de autorizados a cobrar.
  - Avisa si la orden **puede o no ir a fabricación** según el 30%.
  - La **seña se descuenta en el bloque de totales** y el pie pasa a mostrar el
    saldo real.

- ✅ 164. En la orden, la cabecera deja de ser una caja y pasa a ser **un renglón
  del alto de las otras etapas** (~1,5 cm): a la izquierda **Orden de venta
  OV-…** (con la cotización, el vendedor y el local en chico), a la derecha la
  **fecha de la orden** —propia, puede no ser la de la cotización— y el lápiz
  para cambiarla junto con vendedor y local.
- ✅ 165. En la orden **hay que reconfirmar** Datos del cliente, Productos y
  Adicionales: cada botón pasa a "Confirmar …" y la etapa queda con un **✓
  verde**. Sin las tres confirmadas **no se puede cobrar**.
- ✅ 166. La etapa 4 se llama **"Registrar pago"**.
- ✅ 167. **Método de pago** como desplegable —Efectivo · Transferencia · Mercado
  Pago— con los que **no corresponden a la condición pactada bloqueados** (con
  Efectivo, Mercado Pago queda deshabilitado).
- ✅ 168. **Monto recibido** manual, con la **seña mínima sugerida** calculada
  para que el **saldo quede redondo**: sobre $96.765 sugiere **$29.765** y deja
  **$67.000**, en vez de $29.029,50.
- ✅ 169. En **efectivo no se pregunta quién lo recibió**: entra a la caja del
  local o del vendedor y eso **se resuelve en el arqueo**.
- ✅ 170. En **transferencia** se piden **nombre y DNI del depositante**.
- ✅ 171. Cada seña registrada muestra **"Seña $X"** con su **fecha**.

### Lote 5 — APLICADO (factura, estado por producto, envío y botonera)
- ✅ 172. En **Datos del cliente**, campo opcional **"Solicita factura"** con
  **No** por default. Si pasa a **Sí**, se abre **obligatorio** el campo
  **DNI o CUIT** y sin completarlo no se puede avanzar.
- ✅ 173. La factura **nunca se imprime** salvo que se haya pedido: recién ahí el
  A4 muestra "Factura — DNI/CUIT".
- ✅ 174. En **Datos del cliente**, **"¿Necesita envío?"** (Sí, se entrega / No,
  retira) —también en la **cotización**, para saber de entrada si suma envío.
  Con "No, retira" el envío deja de cotizarse y el A4 imprime **"Retira"**.
- ✅ 175. Nueva columna **Estado** por producto (corriendo "Tipo" a la izquierda)
  con **LISTO / A FABRICAR**; por default **A fabricar**. **Oculta en la
  impresión**.
- ✅ 176. Si **todos** los productos están en **LISTO**, en Adicionales desaparece
  el plazo de 30 a 35 días: queda **"A convenir con logística"** y el vendedor
  puede poner una fecha mucho más corta (con link para volver a "a convenir").
- ✅ 177. **Toda la botonera pasa abajo**, debajo del saldo restante: **Vista
  previa · Guardar · Confirmar → Venta**. Arriba no queda ningún botón, así se
  recorre paso por paso antes de generar la orden.

### Lote 6 — APLICADO (Datos del cliente · forma de entrega)
- ✅ 180. El **+ IG** queda **al lado de "Cliente"**, igual que el **+** del
  teléfono (ya no desfasado en su propio renglón).
- ✅ 181. Orden nuevo: arriba **Cliente / Teléfono**, y debajo **¿Cómo nos
  conoció?** y **Email**, uno en cada columna.
- ✅ 182. Bloque **Entrega** con las cuatro formas: **Envío CABA o GBA ·
  Retira cliente · Expreso · A confirmar**.
  - **Retira cliente**: no se pide domicilio ni localidad y **no se cotiza flete**.
  - **Envío CABA o GBA**: pide **Localidad** y **Domicilio**; el flete sale
    solo de la localidad.
  - **A confirmar**: los campos quedan **opcionales** y el envío **se puede
    cargar igual o dejarlo a confirmar**.
  - **Expreso**: agrega **Expreso** y **Domicilio del expreso**, los dos se
    pueden dejar en blanco y completar después.
- ✅ 183. La forma de entrega **se imprime** en el documento; el expreso sale
  con su domicilio cuando está cargado.

### Lote 7 — APLICADO (prolijidad, estado sólo en la orden, registrar pago)
- ✅ 184. Campos de Datos del cliente **más cortos** (no se estiran hasta el
  borde) y **DNI o CUIT** pasa a la **segunda columna**, al lado de Solicita
  factura, para que el bloque quede simétrico.
- ✅ 185. Se saca el aviso *"Retira en el local: no hace falta domicilio ni
  flete"*: ya se entiende con la opción elegida.
- ✅ 186. El **estado del producto aparece sólo en la orden**. Cotizando no se
  pregunta: todavía no se sabe cuándo va a comprar el cliente. La grilla de
  productos se arma con o sin esa columna.
- ✅ 187. Tercer estado: **En producción** (además de A fabricar y Listo), para
  el mueble que está por entrar. *(Reservar contra un ingreso próximo se
  resuelve cuando veamos Productos.)*
- ✅ 188. En Adicionales se saca el *"Plazo de fabricación: 30 a 35 días"* de
  abajo del rango: ya está en la cabecera de la etapa.
- ✅ 189. En **Registrar pago** se sacan los tres recuadros (Total de la orden,
  Señado, Saldo): esa info ya está en el cuadro de la derecha.
- ✅ 190. La **sugerida sale de la cabecera** de la etapa y queda sólo como
  sugerencia abajo del monto recibido.
- ✅ 191. **Monto recibido** más corto, y al lado el **% del total que se está
  señando**, que se actualiza mientras se escribe (verde al llegar al 30%).
- ✅ 192. El efectivo entra a la caja del local **y** del vendedor —la plata del
  local la tiene en mano un vendedor—; el arqueo resuelve a quién se rindió.

### Lote 8 — APLICADO (El mueble · pantalla de creación y edición)
Todo en **una sola columna**, un bloque abajo del otro, y en modo edición.

- ✅ 193. **Nombre** arriba, siempre editable, con el interruptor **Mostrar a
  los vendedores**: oculto, el mueble no se puede cotizar.
- ✅ 194. **Fotos y videos**: arrastrar y soltar, las que hagan falta, con
  **Principal** y borrar. Los archivos van al **Storage del sistema**, no
  adentro del documento.
- ✅ 195. **Categorías**: alcanza con marcar la familia — si Cómodas cuelga de
  Dormitorio, **Dormitorio se hereda solo**. "Editar categorías" abre el árbol
  completo en rutas, con buscador.
- ✅ 196. **Propiedades y valores** en un **diccionario único del catálogo**:
  ESTRUCTURA, FRENTE, MEDIDAS DEL FRENTE, TERMINACIÓN. Sólo Dirección da de
  alta valores nuevos.
- ✅ 197. Al crear un valor se avisa si **se parece a uno que ya existe**
  ("ESTRUTURA BLANCA" vs "ESTRUCTURA BLANCA"): un error de tipeo no puede
  partir el catálogo en dos.
- ✅ 198. El **combinatorio sale solo**: 3 × 3 × 3 = 27. Al agregar un valor se
  crean las variantes que faltaban, con el precio de la más parecida.
- ✅ 199. **Listado de variantes** con las **dos imágenes** —la de **venta**,
  que sale impresa, y la de **producción**, el plano que va a fábrica (acepta
  PDF)—, el nombre, el SKU, el stock, el costo, el precio y el **markup con
  semáforo**. Filtro por medida, estructura o frente.
- ✅ 200. **Editar variante** en panel lateral: precio, costo, **markup
  objetivo propio**, precio promocional, SKU, medidas y peso, **medida de
  costeo** (el de 0,90 se costea con el de 1,00), stock, reposición
  (a pedido / mantener un mínimo), y si se muestra y si se fabrica.
- ✅ 201. **SKU automático** con el código del mueble y los valores de la
  variante, editable a mano y con vuelta al automático.
- ✅ 202. **Simulador**: mover costo y precio y ver markup, margen y ganancia
  por unidad contra el objetivo, con las bandas de color. **No toca los datos
  reales.**
- ✅ 203. **Proveedores** por mueble (no por variante). El costo sale del
  **promedio** de lo que pasa cada uno.
- ✅ 204. **Cómo se obtiene**: Lo fabricamos · Lo compramos terminado · Se
  repone contra pedido, con tildes (puede ser más de una).
- ✅ 205. **Requiere instalación** sí/no: si va, en la orden salta con "a
  convenir"; si no, sale "no requiere instalación" y el vendedor puede
  cambiarlo. El **costo no se define acá**, va en Instalaciones.
- ✅ 206. **Contabilidad**: cuenta de venta y de compra, en blanco heredan la
  de la categoría.
- ✅ 207. **Permisos**: el catálogo es interno. El **vendedor no entra** (ve los
  muebles publicados desde Inventario). **Producción ve todo menos costo,
  markup, margen y ganancia**, y sólo lee.

### Lote 14 — APLICADO (Orden de valores, aplicar a todas, Información general limpia)

**Orden de los valores**
- ✅ 257. Los **valores se arrastran** desde el mismo bloque, uno al lado del
  otro: el primero encabeza las variantes de abajo.
- ✅ 258. El orden se guarda en el diccionario y los valores que **este mueble
  no usa se quedan donde estaban**: reordenar acá no le mueve nada a los otros
  muebles.
- ✅ 259. **Bug encontrado**: cuando el mismo valor estaba escrito de dos formas
  (`1,60` y `1.60`), la copia del final pisaba la posición real y el orden
  recién guardado no se veía. Ahora manda la primera aparición.

**Variantes**
- ✅ 260. **Fuera duplicar**: las variantes salen de las propiedades, no se
  copian de a una.
- ✅ 261. **Aplicar a todas**: al escribir un largo, alto, profundidad o peso
  aparece debajo el botón para bajar ese valor a todas. El alto y la
  profundidad casi siempre son iguales y cargarlos de a uno en 27 filas no
  tiene sentido.

**Información general**
- ✅ 262. Queda sólo la **imagen de venta** — el plano vive en Producción.
- ✅ 263. **Fuera la columna Stock**: acá van las características del mueble; el
  stock está en Inventario.
- ✅ 264. **Entrega** vuelve como módulo 4: requiere instalación y bultos para
  el embalaje. Es una característica del mueble, no un "otro".

### Lote 15 — APLICADO (Precios desde plantilla, panel de variante, inventario simple)

**Compra y venta**
- ✅ 265. El costo y el precio **bajan de una plantilla de precios** y acá sólo
  se ven. Con el **lápiz** se pisan para esa variante, y lo pisado queda
  marcado en ámbar, para distinguir lo que se apartó de la plantilla.
- ✅ 266. Columnas: propiedades · Costo · P. efectivo · Margen · Markup · **⋯**.
  El precio de lista y la medida de costeo salieron de la tabla y viven en el
  panel.
- ✅ 267. Los **tres puntitos** abren un **panel lateral** con todo lo de la
  variante: precios (con lista, margen y markup calculados), costo y medida de
  costeo, SKU y **código de barras**, peso y dimensiones, stock y publicación.
  Se pasa de una variante a otra con las flechas, sin cerrar.

**Inventario**
- ✅ 268. **Cómo se le pide al proveedor**: por **dibujo**, por **planilla** o
  por las dos. Si se pide por dibujo y hay variantes sin plano, avisa cuántas
  faltan.
- ✅ 269. Tilde aparte para **se necesitan dos proveedores**: Producción no
  puede dar por listo un mueble al que le falta la mitad.
- ✅ 270. El rastreo del stock pasó a **desplegable** — ocupa mucho menos.
- ✅ 271. **Fuera la columna "cómo se repone"**: todo se repone cuando se vende.
  Queda el **stock mínimo deseado**, que es otra cosa: lo que se quiere tener
  siempre aunque nadie lo haya pedido. La variante por debajo del mínimo se
  marca, y de ahí va a salir el pedido a Producción.

> Pendiente que abre este lote: el **módulo Precios** — márgenes, costos,
> precios de venta y markup en un solo lado, para no cargarlos mueble por
> mueble y poder comparar productos parecidos.

### Lote 13 — APLICADO (Inventario y solapa Otros)

Las solapas quedan en: **Información general · Compra y venta · Inventario ·
Otros · Producción · Documentos**.

**Inventario**
- ✅ 250. Arranca con **cómo se pide el mueble** (lo fabricamos · lo compramos
  terminado · se repone contra pedido), que es lo que define si el stock tiene
  sentido siquiera. Puede ser más de una.
- ✅ 251. **Cómo se rastrea el stock**: por **número de serie único** (default),
  por **lotes** o por **cantidad**. Cada mueble nuestro es distinto — si hay 12
  mesas de luz Miami blancas son 12 unidades distintas y hay que saber cuál
  salió en cada orden.
- ✅ 252. Con serie único avisa que **cada unidad va a necesitar su código de
  barras**, y que falta definir cómo se numeran.
- ✅ 253. La tabla va **Variante · Stock · Cómo se repone · Mínimo**, en ese
  orden: primero la decisión, después el número.
- ✅ 254. El **mínimo queda bloqueado** si la variante se pide cuando se vende.
  Si igual se escribe ahí, **la reposición cambia sola** a "mantener un
  mínimo": son la misma decisión. Y al volver a "se pide cuando se vende" el
  número se limpia, para no dejar un mínimo huérfano.

**Solapa Otros**
- ✅ 255. Junta lo que hay que definir pero no entra en las otras: proveedores
  que lo fabrican, si requiere instalación, **bultos para el embalaje**,
  concepto e **IVA de la factura**, **cuenta de ingreso y de gasto**, y
  visibilidad. La solapa Contabilidad desaparece: sus dos campos viven acá.
- ✅ 256. **Compra y venta** queda sólo con la tabla de costo y precio.

### Lote 12 — APLICADO (Cierre de Información general · Documentos · Compra y venta)

**Propiedades**
- ✅ 237. **Agregar propiedad** abre un pop-up con las que ya existen y, abajo,
  la opción de crear una nueva.
- ✅ 238. Los valores se eligen de una **lista compacta con tildes** — varios de
  una, sin llenar la pantalla de botones.
- ✅ 239. Las **propiedades y los valores se arrastran** para ordenarlos.

**Orden de las variantes**
- ✅ 240. Salen por **propiedad 1, después 2, después 3**, respetando el orden
  de los valores: todas las de 1,40 juntas y adentro por frente. Cambiar el
  orden de arriba reordena las de abajo.
- ✅ 241. El diccionario escribe `1,60` y la variante `1.60`: se comparan
  normalizados, si no el orden no se encontraba nunca.
- ✅ 242. El nombre pasa a **MEDIDAS 1.60 · ESTRUCTURA PARAÍSO · FRENTE BLANCO**,
  sin repetir el nombre de la propiedad cuando el valor ya lo trae.

**Información general**
- ✅ 243. **Sin precios ni costos**: la usa Producción. Queda stock, **Largo,
  Alto, Profundidad y Peso**. Fuera el lápiz y fuera el módulo Visibilidad.

**Solapa Documentos**
- ✅ 244. Las fotos salen del módulo 1 y van a **su propia solapa**, separadas
  en Venta · Producción · Otro. Van a ser muchos archivos.
- ✅ 245. Cada archivo dice **en cuántas variantes está usado** y no se puede
  borrar uno en uso.
- ✅ 246. La variante **elige** su imagen de la biblioteca y guarda el **id del
  archivo**, no la imagen entera.

**Solapa Compra y venta** (era Costos y márgenes)
- ✅ 247. Una **columna por propiedad** (en el orden de arriba) y después
  Costo · P. efectivo · P. de lista · Margen · Markup · Medida de costeo.
  Sin imágenes, sin simulador y sin lápiz.
- ✅ 248. Se carga el **precio de efectivo**, que es lo que realmente entra, y
  el de lista sale solo (efectivo ÷ 65%). El **margen y el markup se miden
  contra el efectivo**, no contra la lista.
- ✅ 249. Se le sumaron proveedores, cómo se pide, cómo se factura y
  visibilidad: es la misma conversación que el costo y el precio.

### Lote 11 — APLICADO (Seis solapas y propuestas para decidir)

**Respuestas de Brian anotadas**
- Le gusta que haya **movimientos e histórico** de cada producto.
- **Storage real de Supabase**: por ahora queda adentro del HTML; se hace
  cuando armemos las bases de datos.
- **Plan de cuentas**: por ahora vacío, se completa después.

**Solapas del mueble**
- ✅ 230. Ahora son seis: `Información general` · `Costos y márgenes` ·
  `Inventario` · `Compra y venta` · `Producción` · `Contabilidad`.
- ✅ 231. **Inventario**: cómo se rastrea el stock (por variante o no se lleva),
  y stock, mínimo y reposición de cada variante en una sola tabla.
- ✅ 232. **Compra y venta**: proveedores, cómo se pide, **cómo se factura**
  (IVA y concepto) y entrega con bultos por unidad.
- ✅ 233. **Producción**: los planos de todas las variantes en una grilla para
  ir cargándolos, más materiales y notas para fábrica. Producción trabaja
  desde acá.
- ✅ 234. **Contabilidad** avisa que el plan de cuentas todavía no está y que
  esos campos van a ser una lista para elegir.

**Propuestas para decidir juntos** — `docs/propuestas/`
- ✅ 235. `mueble.html`: tres formas de cargar un mueble y sus variantes —
  **matriz** (los ejes cruzados, se edita como planilla), **en pasos** (alta
  guiada, muestra cuántas variantes van a salir antes de crearlas) y
  **lista y detalle** (una variante por vez, con sus movimientos).
- ✅ 236. `catalogo.html`: tres formas de ver el catálogo — **con foto** (para
  el vendedor frente al cliente), **tabla para trabajar** (Dirección, edición
  de a muchos) y **explorador por familia** (para saber qué hay).

### Lote 10 — APLICADO (El mueble: cuatro módulos, solapas y columna angosta)

La pantalla abría con todo junto. Ahora adelante está lo que se mira siempre y
lo demás se consulta cuando hace falta.

- ✅ 224. **Columna angosta y centrada** (1.000 px), con aire a los dos costados.
- ✅ 225. **Solapas**: `Producto` · `Costos y márgenes` · `Contabilidad`. Abre
  siempre en Producto. A **Producción** la de costos no le aparece.
- ✅ 226. El **costo, el markup y el simulador salen de la vista principal**.
- ✅ 227. La solapa Producto, en **cuatro módulos**:
  1. **Nombre y descripción** — la descripción es para lo que **no** es una
     variante: alto y profundidad cuando son siempre los mismos, cómo se arma,
     qué herrajes lleva. Eso no puede ser propiedad porque no multiplica nada.
  2. **Categorías y propiedades** — primero dónde entra, después de qué
     depende. De acá salen las variantes de abajo.
  3. **Variantes** — con imagen de venta y de producción, SKU, stock, precio y
     peso, más **duplicar** e **historial de precio**.
  4. **Adicionales** — visibilidad, cómo se pide y entrega (instalación y
     bultos por unidad).
- ✅ 228. Stock **∞ a pedido** cuando se fabrica contra venta: no hay tope.
- ✅ 229. **Duplicar variante**: copia entera, sin SKU (se recalcula) y sin
  stock heredado.

### Lote 9 — APLICADO (Escala de espaciado para toda la app)

Los márgenes dejaron de ser un número puesto a ojo en cada pantalla: salen de
una **escala en saltos de 4** definida una sola vez en `comun/estilos.css`.

- ✅ 218. Variables `--s1` a `--s6`, más `--pad` (relleno de tarjeta), `--gap`
  (separación de grilla) y `--page` (margen contra el borde). Si algo necesita
  un número que no está en la escala, casi siempre es que el bloque está mal
  armado.
- ✅ 219. Se ajustó el **aire vertical**, no el tamaño de la letra: la pantalla
  tiene que leerse sin bajar.
- ✅ 220. Controles y botones un cuerpo más chicos (14 → 13 px), que era lo que
  los hacía ver enormes.
- ✅ 221. **Tablas más compactas** (14 → 13 px, celdas de 11 a 8 px). Son la
  mitad de las pantallas del sistema, así que es donde más se nota.
- ✅ 222. `.cols3` con `align-items:start`: la tarjeta más corta ya no se
  estira al alto de la más larga dejando un hueco enorme adentro (se veía en
  el Pipeline del inicio).
- ✅ 223. Verificado en **183 pantallas** (todas las solapas de los cuatro
  roles): ninguna se va de ancho y no hay errores.

| Pantalla | Antes | Después |
|---|---|---|
| Inicio | 1.383 px | 1.199 px |
| Órdenes de venta | 815 px | 725 px |
| Mis pendientes | 1.031 px | 955 px |
| Clientes | 635 px | 546 px |
| Producción | 473 px | 412 px |
| El mueble | 2.177 px | ~1.570 px |

### Lote 8 bis — APLICADO (Propiedades, categorías y proporción)

**Propiedades — se entra a cada una**
- ✅ 208. El bloque muestra la lista de propiedades del mueble, cada una con
  sus valores y una flecha para **entrar**.
- ✅ 209. **Agregar propiedad** no crea una nueva: abre un desplegable con
  **todas las que ya existen en el sistema**, y recién abajo de todo está
  **+ Nueva propiedad**.
- ✅ 210. Adentro de una propiedad se **cargan sus valores**: se ve la lista
  completa del catálogo, tildados los que usa este mueble, cada uno se puede
  **renombrar** y se **arrastra para ordenar**.
- ✅ 211. **Destildar no borra, apaga**: si un tapizado no se consigue más se
  destilda y esas variantes quedan desactivadas. Cuando vuelve, se tilda y
  regresan con su precio.
- ✅ 212. Si una propiedad entera no se puede hacer más, **se quita del
  mueble** — sigue en el catálogo para volver a agregarla. Avisa cuántas
  variantes quedan, porque sin ese eje algunas pasan a estar repetidas.
- ✅ 213. El **primer valor** de una propiedad recién agregada se le pone a las
  variantes que ya existen (no duplica); del segundo en adelante multiplica.

**Categorías**
- ✅ 214. Se pueden marcar **varias a la vez**: un mueble puede estar en más de
  una familia. Los ambientes de los que cuelgan se muestran aparte, en gris, y
  se heredan solos.

**Proporción**
- ✅ 215. El **nombre** pasó a ser un campo con su etiqueta, como el resto.
- ✅ 216. Los bloques cortos van **de a dos por fila**; la pantalla del mueble
  pasó de 2.177 a ~1.570 px de alto.
- ✅ 217. **Cotización**: `cz-tit` nombraba dos cosas distintas y el subtítulo
  de etapa le pisaba los estilos a la cabecera — de ahí que saliera todo en
  mayúsculas, con espaciado de letras y una línea de más. La cabecera bajó de
  215 a 131 px y los renglones dejaron de partirse en dos.

> Pendientes de este lote:
> - **Edición masiva** de costo y precio **por categoría, por mueble y por
>   variante** — con 16.077 variantes no alcanza con ir de a una.
> - Storage real de Supabase: hoy la imagen se lee del disco y queda el enlace.
> - Costo por **medida de costeo** compartida entre variantes (hoy el costo es
>   por variante, pisable).
> - Precio por proveedor para comparar (hoy se guarda el nombre; el promedio ya
>   está resuelto en `DB.costoPromedio()`).
> - Lo que carga un **vendedor en un mueble a medida** tiene que quedar pegado a
>   esa boleta y NO entrar al diccionario del catálogo.

### Lote 5 bis — Solapas de Ventas
- ✅ 178. La solapa **"Órdenes"** pasa a llamarse **"Or. Venta"**.
- ✅ 179. Se sacan **"A confirmar"**, **"Modificaciones"** y **"Autorizaciones"**
  como solapas propias: se resuelven **adentro de Resumen y de Or. Venta**.

> Pendientes:
> - Confirmación de la transferencia contra el banco (CUIT + comprobante) — ya
>   existe en `DB.confirmarSenaBanco()`; falta engancharla desde acá.
> - El **arqueo de cajas** (dónde se rinde el efectivo) es un módulo aparte.
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
