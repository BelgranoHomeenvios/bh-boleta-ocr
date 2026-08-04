# CRM adentro de Belgrano Soft

Cómo entra el CRM que ya funciona, y cómo se engancha con Ventas para que
nadie cargue dos veces lo mismo.

---

## 1 · El problema real

Hoy el mismo cliente aparece en tres lugares que no se hablan:

- La **consulta** del CRM — alguien escribió por Instagram.
- La **cotización** de Ventas — el vendedor le armó una propuesta.
- La **orden de venta** — compró.

Son tres papeles del mismo hecho. Cuando el cliente compra, alguien tiene que
acordarse de ir al CRM y marcar "concretado". Si no se acuerda, la consulta
queda viva para siempre y los números del CRM mienten.

**La integración no es copiar datos de un lado al otro. Es que sean el mismo
objeto visto desde distintos lugares.**

---

## 2 · La cadena

```
CONSULTA  ──┬──►  COTIZACIÓN  ──►  ORDEN DE VENTA  ──►  UNIDAD  ──►  ENTREGA
            │         │                  │
            │         │                  └── nace el CLIENTE de verdad
            │         └── una consulta puede tener varias cotizaciones
            └── el cliente puede volver: otra consulta, mismo cliente
```

Reglas de la cadena:

- **Una consulta puede no llegar a nada.** La mayoría no llega.
- **Una consulta puede tener varias cotizaciones.** Le armó tres opciones.
- **Una cotización se convierte en una sola orden.**
- **Un cliente puede tener muchas consultas** a lo largo del tiempo.
- **Lo que sube nunca baja solo.** Si la consulta llegó a "presupuesto
  enviado", no vuelve a "consulta nueva" porque alguien la tocó.

---

## 3 · Las dos puertas de entrada

Son distintas y hay que tratarlas distinto.

### 3.1 · Consulta virtual — entra por la cola

Llega por WhatsApp, Instagram, Facebook, publicidad, Tienda Nube, Google
Shopping o mail. **La derivan Cintia o Dirección, siempre.** Nadie más.

```
llega el mensaje
   ↓
COLA de Cintia            ← acá el vendedor todavía no existe
   ↓  deriva
CONSULTA del vendedor     ← recién acá tiene dueño
```

En la cola la consulta tiene poco: canal, un contacto suelto —a veces sólo un
`@usuario` de Instagram— y qué preguntó. **No tiene cliente todavía**, y está
bien: pedir DNI para contestar un horario espanta al cliente.

### 3.2 · Consulta del vendedor — nace con la cotización

El vendedor **no carga una consulta a mano**. Cuando arma una cotización, la
consulta se crea sola con ella. Es la misma acción: atendió a alguien.

```
el vendedor arma una COTIZACIÓN
   ↓
se crea la CONSULTA sola, en etapa "Le envié el presupuesto"
   ↓
queda en su seguimiento con su próxima acción
```

Esto es lo que evita el trabajo doble. Hoy el vendedor cotiza y después tiene
que acordarse de registrar la atención; con esto, cotizar **es** registrar la
atención.

> **Excepción:** el que atiende en el local y no cotiza —sólo miró y se fue—
> sí necesita cargar la consulta a mano. Ese botón queda.

---

## 4 · La etapa se mueve sola

La etapa ya es la verdad del pipeline en el CRM, y el estado se deriva de ella.
Lo que falta es que **los hechos de Ventas la muevan sin que nadie la toque**.

| Lo que pasa en Ventas | La consulta pasa a |
|---|---|
| Se arma una cotización | **Le envié el presupuesto** |
| Se arma otra cotización | sigue igual, pero se anota |
| La cotización se convierte en orden | **Concretado** |
| La orden se confirma | sigue **Concretado** |
| La orden se anula | vuelve a **Negociando** y avisa |
| Pasan los días sin nada | no se mueve — el vendedor decide |

Dos reglas que sostienen esto:

**La etapa nunca retrocede sola**, salvo por anulación. Si la consulta estaba
en "Negociando" y el vendedor le manda otro presupuesto, sube a "presupuesto
enviado". No baja.

**Concretado lo pone la venta, no la persona.** Hoy el vendedor puede marcar
"concretado" sin que exista una orden. Eso convierte al CRM en una lista de
buenas intenciones. Con la integración, **Concretado significa que hay una
orden de venta con número**, y se puede clickear para verla.

---

## 5 · El cliente

Acá está el nudo, porque los tres objetos manejan al cliente distinto.

### Cómo funciona hoy
- La **consulta** tiene contacto suelto: nombre, teléfono, Instagram, mail.
- La **orden** tiene un nombre de cliente escrito.
- **Clientes** es una pantalla propia en Ventas.

### Cómo tiene que funcionar

**Un solo cliente, y la consulta se le engancha cuando hay con qué.**

```
consulta nueva
   contacto suelto: @martitaok, sin nombre ni teléfono
   ↓
el vendedor va a cotizar
   ↓
el sistema busca: ¿este teléfono / este Instagram / este mail ya existe?
   ├─ sí  → engancha la consulta a ESE cliente y muestra su historia
   └─ no  → crea el cliente con lo que hay
   ↓
la cotización y la orden ya nacen con el cliente puesto
```

**La búsqueda tiene que ser floja a propósito:** el mismo cliente escribe por
Instagram en marzo y pasa por el local en agosto. Si no los une, aparece dos
veces y el vendedor no sabe que ya lo atendió.

Se busca por teléfono normalizado (sin 15, sin +54, sin espacios), por usuario
de Instagram sin arroba, y por mail en minúsculas. Cuando hay más de un
candidato **se pregunta, no se adivina**: unir dos clientes que no son el
mismo es peor que tenerlos separados.

### Lo que gana el vendedor
Cuando abre una consulta ve **la historia entera del cliente**: qué preguntó
antes, qué se le cotizó, qué compró, si tuvo un reclamo. Eso es lo que hoy no
tiene y hace que atienda a ciegas.

---

## 6 · Qué ve cada uno

### Vendedor
| Solapa | Qué |
|---|---|
| **Mis consultas** | Las suyas, ordenadas por la próxima acción. Lo vencido arriba. |
| **Mi agenda** | A quién tiene que llamar hoy. |
| **Mis cotizaciones** | Ya existe en Ventas. Desde acá se llega a la consulta y al revés. |
| **Mis comisiones** | Ya existe. |

No ve las consultas de los otros. No ve la cola de Cintia.

### Cintia — gestión de clientes
| Solapa | Qué |
|---|---|
| **Cola** | Lo que entró y no tiene dueño. Es su pantalla principal. |
| **Derivar** | A quién se la manda, con el motivo. |
| **Todas las consultas** | Para buscar una y ver cómo viene. |
| **Sin respuesta** | Las derivadas que el vendedor no tocó. Es el control. |

### Dirección
Todo, más el tablero: cuántas consultas entraron por canal, cuántas
concretaron, cuánto tarda cada vendedor en responder, y **cuánto se vendió por
canal** —que hoy no se puede saber porque el canal vive en el CRM y la plata
en Ventas—.

---

## 7 · Los canales que no son venta

`Proveedores`, `CVs`, `Otros` y `Reclamo` no van a un vendedor y no generan
cotización. Cada uno tiene su cola chica:

- **Reclamo** ya tiene módulo propio. La consulta sólo lo anota y linkea.
- **Consulta de estado** —"¿cuándo me llega el mueble?"— es distinta: **el
  cliente ya compró**. Esa consulta tiene que abrir directo la orden y mostrar
  en qué anda, sin que Cintia tenga que ir a buscarla.

---

## 8 · Lo que se gana

Cosas que hoy no se pueden saber y con esto salen solas:

- **Cuánto vendió cada canal.** Instagram trajo 40 consultas y $12 millones;
  la publicidad trajo 120 y $4 millones. Eso decide dónde poner la plata.
- **Cuánto tarda una consulta en convertirse.** Si el que compra tarda tres
  días y el que no responde en dos ya está perdido, el plazo deja de ser un
  número inventado.
- **Qué vendedor convierte mejor**, no quién vende más. El que recibe 100
  consultas y cierra 20 es mejor que el que recibe 300 y cierra 25.
- **Si el cliente ya compró antes.** Hoy se atiende a un cliente de hace dos
  años como si fuera nuevo.

---

## 9 · Por dónde arrancar

1. **La consulta como objeto**, con sus etapas y su próxima acción. Sin
   integrar nada todavía.
2. **La cola de Cintia** y la derivación.
3. **El enganche con la cotización**: cotizar crea la consulta, y la consulta
   sube de etapa sola.
4. **El cliente único**, con la búsqueda floja y la unión asistida.
5. **Concretado sale de la orden**, no de un botón.
6. **El tablero por canal**, que es lo que junta el CRM con la plata.

---

## 10 · Lo que hay que decidir antes de construir

**1 · La orden anulada.** Si se anula una venta, ¿la consulta vuelve a
"Negociando" o pasa a "Rechazado"? No es lo mismo: una se sigue, la otra no.

**2 · La consulta sin cotización.** El que entra al local, pregunta y se va
sin que le armen nada. ¿Se registra igual? Si no, se pierde la mitad de la
estadística de local. Si sí, alguien tiene que cargarla a mano.

**3 · Varias cotizaciones, una venta.** Si el vendedor armó tres presupuestos
y el cliente compró el segundo, ¿las otras dos quedan como rechazadas o
simplemente cerradas?

**4 · Dos vendedores, un cliente.** El cliente preguntó por Instagram —lo
atendió Nati— y después pasó por el local —lo atendió Ale—. ¿De quién es la
consulta, y de quién la comisión?

**5 · El cliente que no quiere dar datos.** Pregunta por Instagram y no da ni
el nombre. ¿La consulta puede vivir sin cliente para siempre, o hay un momento
en que se le exige?
