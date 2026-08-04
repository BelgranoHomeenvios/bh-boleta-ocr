# Tesorería · arquitectura

> Este documento es para discutir, no para ejecutar. La idea es que lo leas
> y me marques dónde no es así como trabajás hoy.

---

## 1 · Qué problema resuelve

Hoy la plata de Belgrano Home se sigue en tres lugares que no se hablan:

- Lo que **entra** por las ventas — señas, saldos, transferencias, tarjetas.
- Lo que **sale** por las compras — a los talleres, cuando vienen a entregar.
- Lo que **sale** por todo lo demás — nafta, embalaje, cintas, sueldos,
  alquiler, impuestos.

Los tres terminan en las mismas cajas y en las mismas cuentas, pero nadie
puede decir en un momento dado cuánta plata hay ni de quién es. Tesorería es
el módulo que junta los tres y responde una sola pregunta: **cuánta plata hay,
dónde está, y qué está comprometida.**

## 2 · La pieza central: la caja

Todo lo demás cuelga de esto. Una **caja** es un lugar donde hay plata:

| Caja | Qué es |
|---|---|
| Efectivo local | Lo que está físicamente en el local |
| Efectivo Dirección | Lo que tenés vos |
| Banco (cada cuenta) | Una cuenta bancaria |
| Mercado Pago / billetera | Cada una es su propia caja |
| Cheques en cartera | Los que tenemos y todavía no se depositaron |

Cada caja tiene su saldo, y ese saldo **no se carga a mano**: sale de sumar
sus movimientos. Si el saldo no coincide con la realidad, no se corrige el
número — se hace un **arqueo** y la diferencia queda anotada como tal.

## 3 · El movimiento

Es la unidad mínima. Un movimiento siempre tiene:

- **De dónde sale y a dónde va** — una caja, las dos, o una caja y "afuera".
- **Cuánto**
- **Cuándo**
- **Quién lo hizo**
- **Contra qué** — la venta, la entrega del proveedor, el gasto. Un
  movimiento sin contra-qué es un agujero.

Los tipos:

| Tipo | De dónde | A dónde |
|---|---|---|
| Cobro | afuera (el cliente) | una caja |
| Pago a proveedor | una caja | afuera |
| Gasto | una caja | afuera |
| Transferencia interna | una caja | otra caja |
| Ajuste de arqueo | — | corrige una caja, y deja la marca |

La regla que sostiene todo: **una transferencia interna nunca cambia el total**.
Si el total cambió, hubo un cobro, un pago o un gasto.

## 4 · Cómo se engancha con lo que ya existe

Tesorería no inventa datos: recibe.

```
VENTAS         →  cada seña y cada saldo cobrado es un COBRO
                  (ya existe: cobros[] con método y estado de verificación)

COMPRAS        →  cada pago al taller es un PAGO
                  (ya existe: la cuenta corriente del proveedor)
                  el flete marcado "como gasto" es un GASTO

LOGÍSTICA      →  los fletes de reparto son GASTOS

todo lo demás  →  GASTOS cargados a mano
                  (nafta, embalaje, cintas, sueldos, alquiler, impuestos)
```

El movimiento **nace donde ocurre el hecho**, no en Tesorería. Cuando Jony
anota "le pagué $2.000.000 a Tony en efectivo", eso es un movimiento de la
caja efectivo — no hay que cargarlo dos veces. Tesorería lo ve, no lo pide.

Lo mismo al revés: los pagos que Tesorería registra bajan la cuenta corriente
del proveedor. Es **un solo dato mirado desde dos lados**.

## 5 · Lo que Tesorería agrega y nadie más tiene

### 5.1 · La verificación
Una seña por transferencia no es plata hasta que alguien la vio en el banco.
El estado `pendiente_banco` ya existe en Ventas; Tesorería es donde se
resuelve: se concilia contra el extracto y recién ahí es plata.

### 5.2 · Los cheques
Un cheque tiene fecha de cobro. Hasta esa fecha es una promesa, no plata.
Necesita su propio estado: en cartera → depositado → acreditado → rechazado.

### 5.3 · El calendario de plata
Qué entra y qué sale las próximas dos semanas: saldos de ventas que vencen,
proveedores que vienen a entregar, cheques que se acreditan, sueldos,
impuestos. Es lo que dice si el mes cierra o no **antes** de que no cierre.

### 5.4 · Los gastos con categoría
Nafta, embalaje, cintas y herramientas no son lo mismo aunque los tres sean
gastos. Con categoría se puede ver en qué se va la plata; sin categoría es un
solo número inútil.

### 5.5 · El arqueo
Contar lo que hay y compararlo con lo que el sistema dice. La diferencia se
anota con su fecha y su responsable. Esto es lo que hace que el saldo sea
creíble.

## 6 · Las pantallas

| Pantalla | Para qué |
|---|---|
| **Resumen** | Cuánta plata hay, en qué caja, y qué se mueve esta semana |
| **Movimientos** | Todo lo que pasó, con filtros por caja, tipo, fecha y persona |
| **Cajas** | Cada caja con su saldo y su historia. Transferir entre cajas |
| **A cobrar** | Los saldos de ventas que faltan, ordenados por cuánto se atrasaron |
| **A pagar** | Lo que se le debe a cada taller — es la otra cara de Compras |
| **Cheques** | Los que tenemos, con su fecha y su estado |
| **Gastos** | Cargar y ver los gastos por categoría |
| **Conciliación** | Los cobros por transferencia esperando el visto del banco |
| **Arqueos** | Contar la caja y dejar registrada la diferencia |
| **Calendario** | Qué entra y qué sale, día por día, las próximas semanas |
| **Indicadores** | Cuánto entró, cuánto salió, en qué se va, y cómo viene el mes |

## 7 · Los permisos

La plata es lo único donde el permiso importa de verdad:

- **Dirección** ve todo y puede todo.
- **Administrativo** carga cobros y gastos, y concilia. No puede borrar un
  movimiento: lo anula, y la anulación queda.
- **Compras (Jony)** registra pagos a proveedores contra la cuenta corriente.
- **Vendedor** carga la seña que recibió y nada más. No ve los saldos.

Regla que no se negocia: **un movimiento no se borra nunca**. Se anula, con
motivo y responsable, y el original queda a la vista.

## 8 · Qué NO va en Tesorería

- El precio de los muebles. Eso es Catálogo y Compras.
- La rentabilidad por mueble. Eso es Costeo.
- La cuenta corriente del proveedor en detalle. Eso es Compras — Tesorería
  ve el saldo, no la charla.

---

## 9 · Por dónde arrancar

El orden que propongo, cada paso usable solo:

1. **Cajas y movimientos** — sin esto no hay nada.
2. **A pagar**, enganchado con la cuenta corriente que ya existe en Compras.
3. **Gastos con categoría** — es lo que hoy no está en ningún lado.
4. **A cobrar**, enganchado con las ventas.
5. **Cheques y conciliación**.
6. **Arqueos**.
7. **Calendario e indicadores**.
