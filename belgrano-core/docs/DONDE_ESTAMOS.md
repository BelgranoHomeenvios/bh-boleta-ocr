# Dónde estamos

Al 4/8/2026. Qué está hecho, qué está a medias y qué no se tocó todavía.

---

## Lo que funciona

### Catálogo
El mueble con sus variantes, sus propiedades, sus precios y su semáforo de
rentabilidad. El armador por botones. Las listas de precio y de dónde sale el
costo de cada variante. El plano y la foto por variante.

### Ventas
Cotización con el armador, órdenes de venta con sus estados y su situación,
clientes, los cobros con método y estado de verificación, los frenos que
traban una boleta, y **comisiones**, que sale sola de la boleta.

### Producción
El módulo más trabajado. Los tres tipos de mueble —estándar, modificado, a
medida—, los estados del plano, la cola de a dibujar / a confirmar / a
verificar, los pedidos con serie propia y cupo por taller, los muebles con dos
rubros que se piden por separado y después se enlazan, la recepción por código
de barras, el control de calidad con sus cuatro salidas, y los vendidos con su
margen de entrega.

### Inventario
Las unidades por categoría, cada una con las propiedades de su tipo de mueble,
los filtros por columna, la ficha a pantalla completa con su código de barras.

### Compras
Recepciones a conformar con el precio de cada mueble y de dónde sale, el
comprobante con IVA cuando la compra es formal, el flete, la cuenta corriente
en los dos sentidos, los proveedores con su ficha, la lista de precios con
historial de aumentos, la agenda de entregas, el comparador, los pendientes,
el historial, los indicadores y las compras de material.

### Tesorería
Los gastos con los 86 conceptos de la planilla real, y **el número** del mes
armado solo: venta − costos − gastos − adicionales.

### Logística
Las entregas, los viajes, los cupos por chofer.

---

## Lo que está a medias

| Qué | Qué falta |
|---|---|
| **Producción** | Cola de trabajo, planificación, control de calidad como pantalla propia, historial y stock a pedir siguen siendo esqueletos. |
| **Compras** | El stock de insumos —cuántas placas quedan— es segunda etapa. Hoy se anota la plata, no el inventario. |
| **Tesorería** | Están el número y los gastos. Faltan cajas, movimientos, cobros, señas, rendiciones, cheques, conciliación, arqueos y el calendario de plata. |
| **Ventas** | Comisiones anda; faltan la agenda del vendedor, los indicadores, las reseñas y la venta compartida entre dos vendedores. |
| **CRM** | Consultas y seguimiento, sin desarrollar. |
| **Reclamos** | Sin desarrollar. |

---

## Lo que no se tocó

- **La confirmación de cobros.** Es lo que Brian marcó como más urgente: que
  cuando entre plata aparezca la necesidad de confirmarla, y que la boleta no
  avance a fábrica hasta que esté confirmada.
- **La rendición de vendedores**, por boleta y no por total.
- **Los cheques**, que salen y no entran.
- **El calendario de plata**: qué entra y qué sale las próximas dos semanas.
- **Recursos humanos**: sueldos, adelantos, aguinaldo, vacaciones.
- **Las reseñas de Google** y su bono.
- **La venta compartida** entre dos vendedores.
- **El QR** para la recepción. Hay código de barras, que anda igual.
- **Las imágenes en Drive** en vez de adentro del archivo.
- **La verificación administrativa de la cotización**, que va en Ventas.

---

## Lo que hay que arreglar antes de operar

Está en **`SEGURIDAD.md`** y es bloqueante:

1. No hay login: el rol sale de un selector.
2. Los permisos esconden botones, no protegen datos.
3. La política RLS es permisiva a propósito.
4. Los datos operativos viven en `localStorage`. **Es la deuda más grande y
   es de cada módulo nuevo.**
5. 139 `innerHTML` sin auditar.
6. Un solo archivo de 1 MB.

**No entra un dato real hasta que eso esté resuelto y revisado.**

---

## Preguntas abiertas

**1 · La terminación combinada.** Brian dijo que si la estructura es paraíso
es *combinado + paraíso*, y que si la estructura es blanca o negra con frentes
paraíso es *más blanco que paraíso*. **Su catálogo de Costeo dice lo
contrario**: 389 filas de Blanca+Paraíso están como comboParaiso, y comboBlanco
nunca lleva paraíso. Cambiarlo mueve el precio de 776 combinaciones. Sin
resolver.

**2 · El costo del catálogo.** Hoy es un número cargado a mano y por eso las
diferencias contra lo que se paga son grandes. ¿Sale directo de Costeo donde
Costeo tiene fila?

**3 · Las categorías de compra.** Brian nombró: gastos fijos, gastos
variables, materia prima, mercadería, y quizá equipamiento. Hoy hay gastos
(en cinco grupos) y materia prima. Falta separar fijo de variable y decidir
dónde entra el equipamiento.

---

## Resuelto en el camino

- La venta se cuenta **cuando se vende y está confirmada**, en el mes de la
  venta. No cuando se cobra.
- **Adicionales = 1% de los costos.** Verificado contra los doce meses de la
  planilla.
- **El margen se mide sobre lo gastado**, no sobre la venta.
- **Alquileres** es la amortización del terreno, no un ingreso.
- Los talleres no se mezclan: sillas, mesas, sillones y lustrado son rubros
  propios.
- La deuda con el proveedor **nace al conformar**, sin paso intermedio.
- Devolver en el momento y devolver después de pagar **son dos cosas
  distintas**.
