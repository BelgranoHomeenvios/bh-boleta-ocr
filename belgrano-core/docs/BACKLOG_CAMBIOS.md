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

### Lote 16 — APLICADO (Quién lo fabrica)

- ✅ 272. **Producción arranca con "Quién lo fabrica"**: primero una botonera de
  **1 · 2 · 3 proveedores**, y según lo que se elija aparecen ese tanto de
  campos para completar. Un rack con el módulo laqueado y las patas de hierro
  necesita dos —carpintería y herrería— y Producción tiene que saberlo para no
  dar por listo un pedido al que le falta una parte.
- ✅ 273. Si baja la cantidad, los proveedores que sobran se descartan; si
  falta cargar alguno, avisa que el pedido no se va a poder armar completo.
- ✅ 274. Los proveedores son **una sola lista para todo el sistema**
  (`DB.proveedores()`): el que se carga desde un mueble queda disponible en
  todos los demás, y no se duplica por tildes ni mayúsculas. Cuando exista la
  pantalla de Proveedores va a leer de acá mismo.
- ✅ 275. El bloque de Proveedores sale de **Otros** y el tilde de "dos
  proveedores" sale de **Inventario**: los dos apuntaban a lo mismo y ahora
  vive en un solo lado.
- ✅ 276. La tercera opción de "cómo se pide" pasa a llamarse **Mixta**.

### Lote 17 — APLICADO (Producción: rubros, planos y planilla)

**Los proveedores son pares, el pedido va al rubro**
- ✅ 277. Un mueble no se le pide a "Tony": se le pide a **CARPINTERÍA**, y
  adentro los cinco son **pares** — ninguno es mejor que otro, sólo cambia
  cuánto entrega por semana. Por eso el plano y la planilla van dirigidos al
  **rubro**, no a una persona.
- ✅ 278. Cada proveedor tiene **rubro y capacidad semanal**
  (`DB.proveedores(rubro)`, `DB.capacidadRubro()`), y el bloque muestra los
  pares del rubro con su capacidad y la suma.
- ✅ 279. "Quién lo fabrica" pasa a ser **1 · 2 · 3 rubros**, y el orden importa:
  el rubro 1 recibe el primer plano y la primera columna de la planilla.

**Según cómo se pide**
- ✅ 280. **Por dibujo** → la tabla de variantes con **un plano por rubro**: el
  de carpintería no es el de herrería, y cada uno recibe el suyo. Avisa
  cuántos faltan por rubro.
- ✅ 281. **Por planilla** → el **diseñador de la planilla de pedido**: cada
  columna dice **de dónde sale su valor** (de la orden, del mueble, de la
  variante, cantidad, o a mano). Por eso el renglón se llena solo cuando se
  vende. Se arrastran para ordenarlas y hay una **vista previa** con las
  primeras variantes.
- ✅ 282. **Mixta** → las dos cosas.

**Contabilidad** (era Otros)
- ✅ 283. El **concepto de facturación** sale solo: la **categoría** del mueble
  más **"con medidas solicitadas"**. Se pisa sólo si ese mueble se factura
  distinto.
- ✅ 284. Debajo el **IVA**, después la imputación contable, y al final
  visibilidad. El **vendedor ve sólo Información general y de lectura**.

**Deuda técnica saldada**
- ✅ 285. El archivo tenía **20 métodos definidos dos, tres y hasta cuatro
  veces**. En un objeto literal gana el último, así que funcionaba — pero
  varias ediciones estaban tocando código muerto y no se veían. Se limpiaron
  (159 KB → 118 KB) y se agregó `test_sanidad.cjs`, que falla si vuelve a
  aparecer un método repetido.

### Lote 18 — APLICADO (Producción por rubro)

**Lo que cambió de fondo**: cómo se pide **no es del mueble, es de cada rubro**.
Un mismo mueble puede ir a carpintería **por dibujo** y a herrería **por
planilla**, y cada uno con su propia planilla porque se le piden cosas
distintas.

- ✅ 286. Cada rubro guarda **su modo** (dibujo · planilla · mixta) y **su
  planilla**. Producción muestra una **sección por rubro**, numerada.
- ✅ 287. **Por dibujo** → sus planos por variante, con el aviso de cuántos
  faltan. **Por planilla** → su diseñador de columnas y su vista previa.
  **Mixta** → las dos.
- ✅ 288. "Cómo se le pide al proveedor" **sale de Inventario**: ahí quedó sólo
  cómo se rastrea el stock, con un puntero a Producción.
- ✅ 289. Los muebles viejos que guardaban sólo la clave del rubro
  (`['carpinteria']`) siguen abriendo: se normalizan al leerlos.

**Respuestas de Brian anotadas**
- La planilla se define **por mueble**, porque cada mueble se pide siempre
  igual. Al **agrupar** varios en un pedido al mismo rubro, las columnas se
  **suman** y las que ese mueble no usa quedan **vacías** en su renglón — así
  la silla que sí necesita color de respaldo no obliga a las demás. Eso se
  resuelve en Producción; el diseño de acá ya lo permite.
- **ESTADO** = el número de venta si es para un cliente, o **STOCK** si es para
  reponer. Se termina de definir cuando armemos los pedidos.
- **Proveedor destacado**: queda para más adelante. Hoy todos los del rubro son
  pares.

### Lote 19 — APLICADO (Planillas reutilizables)

Una planilla se arma **una vez** y se usa en todos los muebles que se piden
igual. La de respaldos vale para los 40 respaldos: no se diseñan 40 distintas.

- ✅ 290. **Catálogo → Planillas**: todas juntas en un solo lado, con cuántos
  muebles usa cada una. Se crean, se editan y se borran desde ahí — y no se
  puede borrar una que esté en uso.
- ✅ 291. Cada rubro de cada mueble **elige** su planilla de una lista, o usa
  columnas propias ("Sólo para este mueble"). Con **Guardar como planilla** las
  columnas de un mueble pasan a ser reutilizables.
- ✅ 292. **Editar la planilla le llega a todos** los muebles que la usan, y el
  bloque lo avisa antes: *"Usa la planilla Respaldos, que comparten 12 muebles.
  Lo que cambies acá se cambia para todos ellos."*
- ✅ 293. Si un mueble **no tiene** la propiedad de una columna, esa columna le
  queda **vacía** — igual que hoy en el papel, cuando a esa silla no hay que
  aclararle el color del respaldo. Se marca con borde punteado y dice
  "no la tiene", y abajo lista cuáles no aplican.
- ✅ 294. Vienen cargadas las dos de referencia: **Respaldos** (estado, modelo,
  medida, alto, tela, color, obs) y **Sillas** (estado, modelo, material,
  color, color de pata, cant., obs).

### Lote 20 — APLICADO (Propiedades secundarias)

Se separan dos cosas que estaban mezcladas:

- **Principales** (ESTRUCTURA, FRENTE, MEDIDA) → **multiplican** las variantes
  y definen el precio y el pedido.
- **Secundarias** (alto, profundidad, peso, medida del hueco…) → **no
  multiplican nada**: son un dato más de cada variante, y **cada mueble elige
  cuáles le sirven**. En una cómoda importa el alto; en un placard, la medida
  del hueco.

- ✅ 295. Bloque **Propiedades secundarias** debajo de las principales,
  separado por una línea, con sus chips y **＋ Agregar**.
- ✅ 296. El pop-up muestra el catálogo (alto · profundidad · peso · medida del
  hueco · ancho interior · cajones · volumen) y permite **crear una nueva con
  su unidad**, que queda para todos los muebles.
- ✅ 297. La tabla de variantes arma **una columna por secundaria elegida**. Sin
  ninguna, la variante es **sólo su imagen y su nombre** — que era lo que
  faltaba.
- ✅ 298. **Aplicar a todas** sigue andando en cada columna.
- ✅ 299. Los valores viejos (alto, prof, peso, largo) se siguen leyendo, así
  que los muebles ya cargados no pierden nada.
- ✅ 300. **Bug**: `repeat(0, …)` no es CSS válido y tiraba abajo la grilla
  entera cuando no había secundarias — la tabla se apilaba en una columna. El
  template ahora se arma en JS.

### Lote 21 — APLICADO (Limpieza final del producto)

**Orden de solapas**: Información general · Inventario · Producción ·
Compra y venta · Documentos · Contabilidad.

- ✅ 301. **Compra y venta** queda sólo con la tabla de costo y precio. Todo lo
  que repetía Información general y Producción se sacó: dos lugares para
  cargar lo mismo terminan siempre desincronizados.

**Inventario**
- ✅ 302. Módulo **Ver inventario**, cerrado por default: todas las unidades del
  mueble con su **número de serie** y su **código de barras**, sin importar la
  medida ni si están en depósito o ya salieron. Las vendidas muestran en qué
  orden salieron.

**Producción**
- ✅ 303. **Quién lo fabrica** con botonera de **1 · 2 · 3 proveedores**, y
  debajo de cada uno su **cómo se pide**. Los proveedores se muestran **por
  nombre**, sin la capacidad semanal: acá importa quién puede hacerlo, no
  cuánto entrega.
- ✅ 304. **Un módulo plegable por proveedor**, numerado, con su resumen.
- ✅ 305. Los **dibujos se cargan todos juntos** desde el módulo del proveedor,
  uno por variante, con el estado de cada uno — no hay que entrar variante por
  variante.
- ✅ 306. **Mixta** muestra los dibujos arriba y la planilla abajo.
- ✅ 307. **Materiales y notas para fábrica** pasan a ser **por proveedor** y
  arrancan cerrados.

**La planilla se edita sobre la tabla**
- ✅ 308. El **título de cada columna se escribe en su encabezado** y abajo se
  elige de dónde sale el valor. Se fue la lista de columnas de arriba: era
  mantener lo mismo en dos lados.
- ✅ 309. Las columnas se **mueven con flechitas** y se agregan con **＋** al
  final de la tabla.
- ✅ 310. Por default arranca con las **propiedades del mueble + ESTADO +
  CANT. + OBSERVACIONES**.

### Lote 22 — APLICADO (Módulos, planilla repensada y filtro de inventario)

**Encabezado y solapas**
- ✅ 311. El **nombre del mueble y su código** siempre a la vista arriba: con
  seis solapas es fácil perder de vista en cuál se está trabajando.
- ✅ 312. Orden final: Información general · Inventario · Producción ·
  Compra y venta · **Contabilidad · Documentos**.

**Información general**
- ✅ 313. **Categorías sube al módulo 1**, debajo de la descripción. El módulo 2
  queda con **Propiedades** solas: **Principales** arriba y **Secundarias**
  abajo, bien separadas.
- ✅ 314. Cada grupo tiene **su propio botón** de agregar.
- ✅ 315. Las secundarias arrancan por default en **Alto · Profundidad · Peso**,
  se **borran**, se **editan** (✎) y se **arrastran** para ordenarlas.
- ✅ 316. La **unidad sale de una lista** (cm · mm · m · kg · g · m³ · l · u ·
  sin unidad): si uno escribe "cm" y otro "centímetros", después no se puede
  comparar nada. Al renombrar, la **clave no cambia**, así lo ya cargado en las
  variantes no se pierde.

**Producción, un bloque por rubro**
- ✅ 317. Arriba sólo **cuántos rubros**. Abajo, **un desplegable por rubro** con
  todo lo suyo: rubro, proveedores, cómo se pide, y el dibujo o la planilla.
  Se termina uno, se cierra, y se abre el siguiente.
- ✅ 318. Más aire entre el rubro, sus proveedores y cómo se pide.

**La planilla, repensada**
- ✅ 319. Meter tres controles adentro de cada encabezado la hacía ilegible.
  Ahora la tabla se ve como **lo que es** —títulos y renglones de ejemplo— y
  **tocar un título abre su configuración**: nombre, de dónde sale, mover y
  quitar. Debajo de cada título dice **de dónde sale su valor**.

**Inventario**
- ✅ 320. **Filtro por estado**: Todo · En depósito · **Por entrar** · Ya salió.
  "Por entrar" es lo pedido al proveedor que todavía no llegó: ya está
  comprometido pero no se puede entregar. Todavía no tiene serie ni código —
  se le asignan cuando entra.

### Lote 23 — APLICADO (Proporción del bloque de propiedades)

- ✅ 321. Los botones de agregar pasan a **`btn sm`**: acompañan, no compiten
  con el contenido. Antes eran del mismo peso que el bloque entero.
- ✅ 322. El signo de más es **➕** en toda la app — antes convivían `⊕`, `＋`
  y `⊞`.
- ✅ 323. Las **flechas `›`** al costado de cada propiedad se van: ahora la
  propiedad se edita con **✎** y se saca con **✕**, igual que un chip de
  secundaria. Aparecen al pasar el mouse, así la fila queda limpia.
- ✅ 324. El contador de combinaciones se separa con una línea del resto.

### Lote 24 — APLICADO (Costos: de dónde salen y cómo se componen)

**Compra y venta arranca con "De dónde salen los costos"**
- ✅ 325. **Una lista de precios por rubro**: si el mueble lleva carpintería y
  herrería, son dos listas y cada una pone su parte. A cada rubro sólo se le
  ofrecen las suyas — no se le muestra la de herrería al carpintero.
- ✅ 326. Avisa si falta elegir alguna: sin lista, el costo hay que cargarlo a
  mano y se pierde la comparación entre muebles parecidos.

**El panel de la variante**
- ✅ 327. Se fue **Peso y dimensiones**: ya está en Información general.
- ✅ 328. Arriba, cuatro números: **Costo final · Precio efectivo · Margen ·
  Markup**, cada uno con su referencia (lista, mínimo, objetivo).
- ✅ 329. **Datos generales** muestra cada propiedad con **su rol de costeo** al
  lado, así se ve de dónde va a salir el número.
- ✅ 330. **Composición del costo**: un renglón **por rubro** con su lista, el
  subtotal, los **recargos marcables** (ranuras 8%, corte 45° 5%, laqueado
  extra, herrajes premium), el ajuste manual y el costo final.

**El rol de costeo de una propiedad** — la bisagra con Precios
- ✅ 331. Una propiedad ya no es sólo texto: tiene un **rol** que dice **en qué
  tabla buscarse**. `medida` define la fila, `estructura` y `frente` buscan en
  su tabla, `material` en la del rubro que sea (hierro, vidrio, mármol),
  `terminacion` puede tener su costo, y **`recargo` no busca nada: suma un
  adicional**. Las de siempre ya vienen con su rol; una propiedad nueva
  arranca sin costo hasta que se le asigne.

**Planilla**
- ✅ 332. Se va el subtítulo gris de cada columna: queda **sólo el título**, y
  el detalle se ve al entrar.
- ✅ 333. El **➕ crea la columna y abre su configuración de una**. Si se
  cancela sin ponerle nombre, la columna se descarta.
- ✅ 334. El desplegable y **Guardar como planilla** entran parejos en un
  renglón.

### Lote 25 — APLICADO (Sin emojis y rubros por letra)

- ✅ 335. **Se van los emojis** de los botones: queda sólo el texto —
  *Agregar*, *Agregar propiedad*, *Agregar secundaria*, *Agregar proveedor*,
  *Guardar como planilla*, *Aplicar a todas*, *Crear*, *Subir uno nuevo*.
- ✅ 336. En Producción los bloques se numeran **1 · A · B · C**: primero
  *Quién lo fabrica*, y después un bloque por rubro identificado con su letra
  (**Rubro A · Carpintería**, **Rubro B · Herrería**). La letra es la misma que
  ordena los dibujos y las planillas: el **A** recibe el primer dibujo y la
  primera planilla, el **B** los segundos.

### Lote 26 — APLICADO (El panel de la variante, prolijo)

**Sin emojis**
- ✅ 337. Se van de todo el Catálogo: los botones dicen **Agregar** y **Guardar
  como planilla** y nada más; los cuatro números de arriba del panel, las
  solapas de Documentos y **Ver inventario** quedan sin ícono.

**La tabla de variantes**
- ✅ 338. **Se va el lápiz.** Todo se edita adentro de la variante, que se abre
  con los **tres puntitos**: ahí está el costo por rubro, los adicionales y los
  precios. La tabla es para mirar y comparar.

**El panel, en dos columnas**
- ✅ 339. **Izquierda: Datos generales** —más chico, sin tanto aire: es para
  mirar de qué variante se trata— y abajo **Precio**.
- ✅ 340. **Precio**: se carga el **efectivo** y el **promocional** (que muestra
  al lado **cuánto % le descontó al efectivo**). Abajo, separados, el **precio
  de lista** y el **precio de lista promocional**, los dos automáticos: se
  recalculan mientras se escribe, sin guardar.
- ✅ 341. **Derecha: Composición del costo** — un renglón por rubro, el subtotal
  si son dos, los **adicionales** y el **costo final**.
- ✅ 342. **Agregar adicional** abre un pop-up: concepto, si es **% del costo o
  monto fijo**, y el valor. Los de siempre (ranuras, corte 45°, laqueado,
  herrajes) están de atajo para no escribirlos. Se agregan de a uno y se apilan
  —vidrio, después ranuras— cada uno con su valor, y el costo final se mueve
  solo. Se sacan con la cruz.
- ✅ 343. Abajo del costo, **Publicación**: sólo *mostrar esta variante a los
  vendedores*. **Se fabrica** no va más: eso ya está en Producción.

**Los códigos son de la unidad, no del precio**
- ✅ 344. **SKU** y **código de barras** se van de Compra y venta y aparecen como
  columnas en **Inventario → Stock por variante**, que es donde se identifica la
  pieza física. El SKU sigue saliendo solo y se vuelve al automático con la
  flechita.

**Aire**
- ✅ 345. Los desplegables no van más pegados: entre un renglón y el que sigue
  hay separación en toda la app.

### Lote 27 — APLICADO (Cómo se numera una unidad y cuánto tarda)

**Número de serie y etiqueta** — decidido acá, no pedido
- ✅ 346. **Un correlativo único para toda la empresa**: `BH-000123`. No uno por
  mueble. Un solo contador no se pisa nunca, no hay que llevar la cuenta modelo
  por modelo, y la etiqueta queda corta.
- ✅ 347. El número **no lleva adentro el mueble ni la medida**: al leerlo el
  sistema ya sabe de qué unidad se trata, de qué mueble es, en qué orden salió y
  dónde está. Meterlo en el código sólo alarga la etiqueta.
- ✅ 348. Se imprime en **Code 128**, que es lo que lee cualquier lector de mano
  —admite letras, es compacto y lleva dígito de control, así que si lee mal
  avisa en vez de inventar un número—. Se escanea igual cuando la unidad
  **entra** al depósito que cuando **sale** en una orden.
- ✅ 349. La etiqueta **se genera al recibir la unidad**, no antes: lo que está
  *por entrar* todavía no tiene número.
- ✅ 350. El **EAN-13 de la variante es otra cosa** y sigue donde estaba: ese es
  para la venta al público y Tienda Nube, e identifica el modelo, no la unidad.
- ✅ 351. Inventario muestra **la etiqueta como se va a imprimir** —código de
  barras de verdad, dibujado por el sistema— y el listado de unidades lleva el
  suyo en cada renglón.

**Plazo de entrega**
- ✅ 352. Baja en cascada: **el del mueble manda**; si no tiene, **el de su
  categoría**; y si tampoco, el estándar de la casa. En pantalla dice de dónde
  salió, así nadie duda si el número lo puso alguien o lo heredó.
- ✅ 353. Los dos se cargan desde el mueble, en **Entrega**: el suyo y el de su
  categoría —que vale para todos los muebles de esa categoría—.

**Lo que se decidió NO hacer**
- ❌ 354. Que el sistema sepa **qué parte hace cada rubro** cuando son dos. No
  aporta: el dibujo y la planilla de cada uno ya dicen qué tiene que fabricar.
  Cargarlo sería escribir dos veces lo mismo.

### Lote 28 — APLICADO (Que cada cosa se vea donde va)

**Propiedades**
- ✅ 355. **Principales y secundarias en tarjetas separadas**, cada una con su
  título en gris. Antes parecían lo mismo.
- ✅ 356. Las **secundarias vienen plegadas** —se cargan una vez y no se tocan
  más— y cerradas siguen diciendo cuáles son: *Alto · Profundidad · Peso*.
- ✅ 357. Se arregló el desplegar/plegar: los bloques que arrancan **cerrados**
  —Ver inventario, las notas por rubro, las secundarias— no abrían al hacer
  clic. El botón ahora dice si está abierto y el estado sale de ahí.

**Demora**
- ✅ 358. Se va de Información general y pasa a **Inventario**, arriba de todo:
  no es una característica del mueble, depende de qué hay hecho.
- ✅ 359. Baja en cascada de cuatro escalones: **casa → categoría → mueble →
  variante**. El fino es el que importa: si de la cómoda Miami 1,20 paraíso y
  blanco siempre hay alguna en producción, esa entrega en 15 días aunque el
  modelo tarde 30, y eso es lo que va a ver el vendedor al cotizarla.
- ✅ 360. En **Stock por variante** hay una columna **demora**: en gris muestra
  la heredada, y se escribe encima para la variante que sale antes.

**Producción**
- ✅ 361. Los **dibujos de un rubro se pliegan**. Con 27 variantes el rubro se
  comía la pantalla; cerrado dice cuántas son y cuántas faltan.

**Costo y precio por variante**
- ✅ 362. **Un renglón, un nombre**: *MEDIDAS 1.60 · ESTRUCTURA BLANCA · FRENTE
  NOGAL* en una sola línea, con el SKU debajo. Las columnas por propiedad se
  cortaban a la mitad (*ESTRUCTURA NATUR…*).
- ✅ 363. **Se va la columna Margen**: con el markup alcanza para mirar de un
  vistazo. El margen sigue en el panel de la variante.

**Cómo cargar los valores** — la duda del nombre repetido
- ✅ 364. La regla es **escribir sólo el valor**: *BLANCA*, no *ESTRUCTURA
  BLANCA*. El nombre de la propiedad lo pone el sistema adelante, así la
  variante siempre sale *ESTRUCTURA BLANCA* sin escribirlo dos veces ni correr
  el riesgo de que queden mitad y mitad. El editor de valores ahora lo dice.
  Lo ya cargado con el nombre adentro sigue funcionando: el sistema no lo
  repite.

**Solapas y documentos**
- ✅ 365. Las **solapas del mueble quedan fijas** al hacer scroll, pegadas abajo
  de la barra de módulo.
- ✅ 366. Los pickers de imagen dicen de dónde salen los archivos —**Documentos
  → Venta** para la imagen de la variante, **Documentos → Producción** para el
  dibujo— y que lo que se sube desde ahí queda guardado en Documentos y lo puede
  usar cualquier otra variante.
- ✅ 367. El **numerado de unidades** se movió al final de Inventario, debajo de
  *Ver inventario*: se define una vez y después sólo se consulta. De paso se
  arregló el remiendo de secciones que dejaba escondido el aviso de mínimos.

### Lote 29 — APLICADO (El catálogo: la A y la C juntas)

De las tres propuestas quedó **A + C**: las fotos de la A con el filtro al
costado de la C, y el listado de la B como segunda vista.

**Arriba**
- ✅ 368. Los **ambientes en fila**: *Todo · Dormitorio · Living*. Un clic y
  listo, que es la navegación de todos los días. Cambiar de ambiente limpia los
  tipos marcados —los de Living no existen en Dormitorio y quedarían filtrando
  en falso—.
- ✅ 369. El botón de vista dice **Fotos / Listado** en vez de dos íconos.
- ✅ 370. A la derecha, **cuántos se están viendo**: *5 de 12 muebles*.

**El filtro del costado**
- ✅ 371. **Tipo de mueble · Terminación · Disponibilidad · Publicación**, cada
  opción con **cuántos muebles quedarían**. La terminación además con su
  redondelito de color.
- ✅ 372. Adentro de un grupo, marcar dos **suma** (cómodas o placards); entre
  grupos, **cruza** (cómodas Y blancas). Es lo que uno espera y lo que evita
  que marcar dos cosas devuelva vacío siempre.
- ✅ 373. Las cuentas de cada grupo se calculan **ignorando ese mismo grupo**:
  si no, al marcar una opción el resto quedaría en cero y no se podría elegir
  una segunda.
- ✅ 374. Un grupo con una sola opción no se muestra: no filtra nada.
- ✅ 375. *Blanca* y *BLANCA* son la misma terminación — se agrupan sin tildes
  ni mayúsculas.

**Las dos vistas**
- ✅ 376. **Fotos**: dibujo grande, el **estado** arriba a la izquierda —*Stock
  2* / *A pedido* / *Oculto*—, nombre, tipo de mueble, *desde $*, variantes y
  los redondelitos de terminación.
- ✅ 377. **Listado**: producto, código, tipo, variantes, **stock**, desde,
  terminaciones y estado. Para trabajar y comparar.
- ✅ 378. La elección de vista se recuerda.

### Lote 30 — APLICADO (El catálogo se piensa por categoría)

- ✅ 379. **Arriba van las categorías de mueble**, no los ambientes: *Cómodas ·
  Mesas de luz · Placards · Racks*, cada una con su cuenta. Así se trabaja el
  catálogo —todas las mesas de luz, todas las cómodas—; el ambiente pasó a ser
  un filtro más del costado.
- ✅ 380. **Ver todo agrupa por categoría**, con el título de cada una, cuántos
  muebles tiene y un *ver sólo esta ›*. Recorrer el catálogo es recorrerlo como
  está ordenado en la cabeza, no una lista suelta.
- ✅ 381. La cabecera queda en un renglón: **buscador ancho**, botón **Filtrar**
  con la cuenta de filtros marcados, **cómo se ordena** y **Fotos / Listado**.
- ✅ 382. El orden por defecto es **por categoría**. También hay por nombre y
  por precio —y ahí el agrupado se sale solo, porque agrupar y ordenar por otra
  cosa a la vez no se entiende—.
- ✅ 383. El **costado se puede esconder** con el botón Filtrar, y la elección
  se recuerda.
- ✅ 384. El buscador ya no vuelve a la base: filtra lo que hay, y se combina
  con las categorías y los filtros.

### Lote 31 — APLICADO (Opción A: variables a la izquierda, categorías a la derecha)

De las tres propuestas se eligió la **A**, con dos cambios: las categorías van
al **costado derecho**, no arriba, y se pueden **marcar varias a la vez**.

- ✅ 385. **Izquierda: las variables y sus opciones** —ambiente, terminación,
  disponibilidad, publicación—, cada una con su cuenta.
- ✅ 386. **Derecha: las categorías**, con tilde, la opción *Todas* arriba y
  cuántos muebles tiene cada una. Se marcan varias: cómodas **y** mesas de luz.
  La lista scrollea sola, así que da igual que sean 5 o 60.
- ✅ 387. Se va la fila de botones de arriba: con 22 categorías no entraba ni se
  leía. Quedan dos botones —**Filtrar** y **Categorías**— cada uno con la
  cantidad de cosas marcadas.

**Cuando la pantalla no da**
- ✅ 388. Abajo de 1180px las tres columnas no entran, así que el costado que se
  abre **se muestra encima, como un cajón**, y el otro se cierra: no tiene
  sentido tapar los muebles dos veces.
- ✅ 389. El cajón se cierra con la flecha, tocando afuera, o volviendo a
  apretar el botón. Y si se agranda o achica la ventana, la pantalla se
  reacomoda sola.

### Lote 32 — APLICADO (La tarjeta del catálogo)

- ✅ 390. **Se va el precio de la tarjeta.** Acá se mira qué es el mueble, no
  cuánto sale; el precio está adentro.
- ✅ 391. En su lugar quedan las **variantes** y, abajo, **cuánto hay en
  depósito** sumando todas las variantes —*2 en depósito*, o *sin stock — se
  fabrica*—.
- ✅ 392. **Cuatro por fila**, que es donde el mueble se ve y la fila no queda
  desierta. Con la pantalla más chica bajan a tres, dos y uno.
- ✅ 393. La foto es la **primera imagen de venta cargada en Documentos**: se ve
  el mueble sin abrirlo. Si todavía no tiene, sigue el dibujo de referencia.

### Lote 33 — APLICADO (La barra, las flechas y el pop-up de filtrar)

- ✅ 394. **Fotos / Listado** pasa a ser un par de **íconos chicos**, sin texto.
- ✅ 395. Se va el botón **Categorías** y se va el renglón **12 muebles**: ni uno
  ni otro aportaban.
- ✅ 396. Cada costado se pliega con **una flecha sobre su borde**, y al plegarlo
  **entra una tarjeta más por fila** —4 con los dos abiertos, 5 con uno, 6 con
  ninguno—. Por default los dos vienen abiertos, y la elección se recuerda.
- ✅ 397. **Filtrar ya no esconde el costado: abre un pop-up.** Es para filtrar
  por **cómo está** el mueble hoy —disponibilidad, **stock mínimo** (por debajo
  del mínimo, con mínimo definido, sin mínimo), **demora de entrega** (hasta 15,
  hasta 30, más de 30) y publicación—. El botón muestra cuántos hay puestos.
- ✅ 398. Queda una división clara: **los costados dicen qué ES el mueble**
  —categoría, ambiente, terminación— y **el pop-up, cómo ESTÁ**. Disponibilidad
  y Publicación se mudaron del costado al pop-up.

### Lote 34 — APLICADO (El listado)

- ✅ 399. Las columnas quedan: **producto · tipo · variantes · stock ·
  terminaciones · estado · foto**. Se van el **código** y el **desde**: acá no
  se mira plata ni códigos.
- ✅ 400. Una **foto chica** al final de cada renglón para reconocer el mueble
  de un vistazo. Sale de la primera imagen de venta de Documentos; si no hay,
  el dibujo.
- ✅ 401. Se va el *ver ›*: **se entra tocando cualquier parte del renglón**. En
  su lugar quedan los **tres puntitos**, que abren un menú para ir derecho a la
  solapa que hace falta —Inventario, Producción, Compra y venta, Documentos—.
- ✅ 402. Agrupado por categoría, el **encabezado de la tabla no se repite**:
  una sola tabla con un renglón de título entre grupo y grupo.

### Lote 35 — APLICADO (Plegar categorías y acercar las cuentas)

- ✅ 403. **Cada categoría se pliega desde su título**, en las dos vistas. Con
  todas plegadas queda un **índice del catálogo**: se ve entero de un vistazo y
  se abre sólo lo que interesa. Lo plegado se recuerda.
- ✅ 404. **Plegar todas / abrir todas** de un toque, arriba de la lista de
  categorías.
- ✅ 405. Las **cuentas van pegadas al nombre** —*LIVING 5*, no *LIVING* a un
  lado y *5* contra el borde—, que es como se leen.
- ✅ 406. **limpiar** deja de ser un botón con caja al lado del título: es un
  enlace chico, y ya no choca con la flecha de plegar el costado.

### Lote 36 — APLICADO (Un filtro por propiedad, y el nombre del mueble fijo)

- ✅ 407. **Cada propiedad principal genera su propio grupo de filtro** —
  *MEDIDAS DEL FRENTE*, *ESTRUCTURA*, *FRENTE*—, en vez de amontonar todo en
  "Terminación". Los grupos salen solos de las propiedades que tienen cargadas
  los muebles: si mañana aparece TELA, aparece su lista sin tocar nada.
- ✅ 408. Adentro de una propiedad, marcar dos **suma**; entre propiedades
  distintas, **cruza** — estructura blanca **y** frente negro.
- ✅ 409. Las propiedades cuyo **rol de costeo** es estructura, frente,
  terminación o material llevan su **redondelito de color**; la medida no.
- ✅ 410. Un grupo largo —las medidas son doce— muestra **las seis primeras y un
  "ver N más"**. Lo marcado siempre queda a la vista.
- ✅ 411. En el mueble, **el nombre queda fijo junto con las solapas** al hacer
  scroll: con seis solapas y pantallas largas uno se perdía de qué mueble estaba
  mirando.

- ✅ 412. **Cada grupo del costado se abre y se cierra con su flecha, y arrancan
  todos cerrados**: se ven sólo los títulos y se abre el que haga falta. Cerrado,
  el grupo que tiene algo marcado lo muestra —*ESTRUCTURA ① / Negra*—, así que no
  hay que abrirlo para saber qué está filtrando. Lo que dejás abierto se
  recuerda.

- ✅ 413. En el listado la **foto pasa a la primera columna** —es lo que
  identifica el mueble de un vistazo— y se van el **estado** y las
  **terminaciones**: para eso está la vista con fotos. Quedan **foto · producto
  · tipo · variantes · stock · ⋯**.

> Falta decidir si el filtro guarda lo último usado por rol.

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
