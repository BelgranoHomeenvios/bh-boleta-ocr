# Logística adentro de Belgrano Soft

Cómo entra el módulo que ya funciona, y cómo se cierra el círculo:
**la consulta entra por un lado, el mueble sale por el otro, y la plata
queda cuadrada en el medio.**

---

## 1 · Qué cierra Logística

Con el CRM adentro, el sistema tiene las dos puntas:

```
CONSULTA ─► COTIZACIÓN ─► VENTA ─► PRODUCCIÓN ─► RECEPCIÓN ─► ENTREGA ─► RENDICIÓN
   CRM         Ventas      Ventas    Producción     Compras     Logística   Tesorería
```

Hoy cada punta anda sola. Lo que falta es que **el mueble avance sin que nadie
lo empuje** y que **la plata del saldo no dependa de la memoria de nadie**.

---

## 2 · La entrega nace sola

### Hoy
Adrián recibe el mueble en Producción. Alguien tiene que darse cuenta de que
esa venta ya se puede entregar, y cargar la orden de logística a mano, con el
domicilio, los teléfonos y los muebles.

### Cómo tiene que ser

```
Adrián escanea el mueble en RECEPCIÓN
   ↓  calidad: perfecto o con detalle
la unidad pasa a stock
   ↓
¿todos los muebles de esa boleta están en stock?
   ├─ NO  → la boleta espera. Se ve "faltan 2 de 5"
   └─ SÍ  → nace la ORDEN DE LOGÍSTICA sola, en "Por completar"
```

La orden nace **con todo lo que ya sabe el sistema**: número de boleta,
cliente, teléfonos, domicilio, localidad, piso y departamento, los muebles con
su descripción, el total y **el saldo que falta cobrar**. Nadie transcribe
nada.

Queda en **"Por completar"** porque falta lo que el sistema no sabe: qué día
viene, con qué flete, si hay escalera.

> **El mueble a reparar no genera entrega.** Si vino con un detalle que hay
> que arreglar, sigue en Producción. La boleta espera.

### La media entrega
Una boleta de cinco muebles con tres listos. Hay dos caminos y son decisiones
distintas:

- **Esperar** a que estén los cinco — es lo normal.
- **Entregar parcial** — el cliente lo pide. Genera una entrega por lo que
  hay y deja la boleta abierta con el resto.

La orden tiene que saber decir **"3 de 5"** y dejar elegir.

---

## 3 · El saldo viaja con la entrega

Es el punto donde hoy se pierde plata.

La orden de logística **muestra el saldo de la boleta**, en vivo. No una copia
del momento en que se cargó: el saldo de ahora. Si el cliente reforzó ayer, el
chofer sale con el número corregido.

```
Total de la boleta          $1.200.000
Ya cobrado                    $360.000   ← señas y refuerzos confirmados
─────────────────────────────────────
El chofer tiene que cobrar    $840.000
  + flete                      $45.000
  + escalera 2 pisos            $8.000
  + instalación                     $0
─────────────────────────────────────
Total a cobrar en la puerta   $893.000
```

Ese número es el que va en el remito y el que después se rinde.

---

## 4 · El refuerzo y la firma

Esto es lo que pediste y es la pieza más delicada.

### El circuito

```
el vendedor marca REFORZÓ
   ↓
se arma el RECIBO, con número
   ↓
el cobro entra a la boleta, en estado "a confirmar"
   ↓
el encargado de rendición lo CONFIRMA
   ↓  recién ahí
el saldo baja de verdad y el mueble puede salir
```

### La regla que lo sostiene

**Un mueble no sale sin que la plata esté confirmada por alguien nuestro.**

Si el saldo de la boleta depende de un cobro sin confirmar, la orden de
logística **no se puede coordinar**. Queda trabada, con el motivo a la vista:

> ⚠ No se puede coordinar: hay $200.000 cobrados por Ale el 3/8 que nadie
> confirmó todavía.

No es un aviso que se puede saltear. Es un freno, como los que ya existen en
Ventas.

**La excepción tiene nombre.** Si Dirección quiere sacarlo igual, lo destraba
a mano y **queda registrado quién lo hizo y por qué**. Que se pueda no
significa que sea gratis.

### Quién confirma qué

| Cómo pagó | Quién lo confirma | Contra qué |
|---|---|---|
| Efectivo | El que recibe la rendición | Contando la plata |
| Transferencia | Iara | Mirando el banco |
| Tarjeta | Se confirma con el cupón | El cupón cargado |
| Cheque | El que lo recibe | El cheque en mano |

---

## 5 · Punta a punta: qué queda registrado

Lo que pediste: poder abrir una venta y ver **todo lo que le pasó**, sin ir a
buscarlo a cinco lugares.

| Momento | Qué queda |
|---|---|
| Consulta | Canal, quién atendió, cuándo, qué preguntó |
| Cotización | Qué se le ofreció, a qué precio |
| Venta | Quién vendió, cuándo, cómo pagó la seña |
| Producción | Qué taller lo hizo, cuándo se pidió, cuándo llegó |
| Recepción | Quién lo recibió, cómo llegó, su número de serie |
| Coordinación | Qué día se acordó, con qué flete |
| Entrega | **Qué chofer entregó**, a qué hora, quién recibió |
| Cobro | **Cuánto cobró, cómo, y cuándo** |
| Rendición | Quién recibió esa plata y cuándo la firmó |
| Reclamo | Si hubo, qué pasó y quién lo pagó |

Es una sola línea de tiempo en la ficha de la venta. Cada renglón con **quién
y cuándo** — no "Administración" sino la persona.

---

## 6 · La rendición

Es el momento en que la plata del día vuelve a la casa. Ya está armada en la
app: cobró esperado contra cobró real, lo que se le paga al flete, el
adicional, el neto y el motivo de cada diferencia.

Lo que cambia al integrarlo:

- **El cobro esperado no se carga: sale de la boleta.**
- **Lo cobrado entra como cobro de esa boleta**, no como un número suelto. El
  saldo se actualiza solo.
- **La diferencia traba.** Si el chofer trae $150.000 y tenía que traer
  $300.000, la orden no pasa a "Cerrado" hasta que alguien escriba por qué.
- **Lo que se le paga al flete es un gasto** y entra en el número del mes por
  Tesorería.

---

## 7 · Los estados, y quién los mueve

```
Registrado ─► Por completar ─► Coordinada ─► En viaje ─► Entregada ─► Por rendir ─► Cerrado
    │              │               │            │            │             │
  el sistema    Logística       Logística    el chofer    el chofer    quien recibe
  al recibir    completa        agenda        sale        entregó      la rendición
```

Dos alertas que ya existen y hay que conservar:

- **"Entregada" hace muchos días** = el chofer no fue recibido todavía.
- **"Por rendir" hace muchos días** = nadie firmó esa rendición.

Las dos son plata parada.

---

## 8 · Qué ve cada uno

| Rol | Qué |
|---|---|
| **Logística** | Todo: tablero, órdenes, centro de distribución, ruta del flete, rendición, estadísticas. |
| **Depósito** | Sólo el centro de distribución: qué carga hoy y en qué camión. |
| **Chofer** | **Sólo su ruta del día.** Domicilio, teléfono, muebles, cuánto cobrar. Nada de márgenes ni de otras entregas. |
| **Vendedor** | Cómo viene la entrega de **sus** ventas, para poder contestarle al cliente sin llamar a nadie. |
| **Dirección** | Todo, más auditoría y configuración. |

El chofer es el rol más acotado y el más importante de acotar: anda con el
teléfono en la calle.

---

## 9 · Los reclamos

Ya tienen su lógica: el movimiento que hay que hacer y quién lo paga. Al
integrarlo:

- El reclamo **nace de una entrega**, y esa entrega ya sabe qué mueble era,
  qué taller lo hizo y quién lo entregó.
- Si el mueble vuelve, **vuelve a Producción** con el motivo — y ahí se cruza
  con el control de calidad que ya existe.
- Si lo paga el taller, **se descuenta de su cuenta corriente** en Compras.
  Ese circuito ya está hecho para las devoluciones.

---

## 10 · Por dónde arrancar

1. **La orden de logística nace de la recepción.** Es el enganche que más
   trabajo saca.
2. **El saldo en vivo** en la orden y en el remito.
3. **El refuerzo con recibo** y el cobro a confirmar.
4. **El freno**: sin confirmación no se coordina.
5. **La rendición** que actualiza la boleta.
6. **La línea de tiempo** punta a punta en la ficha de la venta.
7. **La ruta del chofer** en el teléfono.

---

## 11 · Lo que hay que decidir

**1 · La entrega parcial.** ¿Se entrega de a partes o se espera siempre a que
esté todo? Si se entrega parcial, ¿el saldo se cobra proporcional o entero?

**2 · Quién confirma el efectivo.** Dijiste que el efectivo se rinde a vos, a
Jony, a tu papá o a tu mamá. ¿Cualquiera de los cuatro habilita la salida del
mueble, o hay uno que manda?

**3 · El tope de los $550.000.** Arriba de eso hace falta autorización tuya o
de Jony para que salga. ¿Eso es sobre el saldo a cobrar o sobre el total de la
venta?

**4 · El mueble que sale sin cobrar.** ¿Existe? Un cliente de confianza, una
entrega urgente. Si existe, ¿quién lo autoriza y qué queda anotado?

**5 · El retiro por el local.** El cliente pasa a buscarlo. ¿Genera orden de
logística igual, o es otra cosa? Porque no hay chofer ni flete, pero sí hay
saldo a cobrar y alguien que entrega.

**6 · El movimiento interno.** Mover un mueble de un local a otro no es una
venta. ¿Sale de Inventario o se carga a mano en Logística?
