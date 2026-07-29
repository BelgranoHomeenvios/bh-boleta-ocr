# Módulo Ventas · Documento funcional

> Estructura de 8 definiciones (igual para todos los módulos). Ventas es la
> entrada del flujo y dispara casi todo: **CRM → Ventas → Tesorería →
> Producción/Compras/Inventario → Logística.** Ver `VISION.md` para la filosofía.
>
> **Ventas no es una pantalla para cotizar: es el motor que transforma una
> intención comercial en trabajo operativo controlado.**

---

## 1 · Objetivo
Construir una propuesta comercial, confirmarla y transformarla en una orden
ejecutable. Ventas controla el **estado comercial** de la orden; **libera sus líneas**
al resto del ERP a medida que cada una cumple sus condiciones. Pregunta que responde:
**"¿Qué necesita mi atención en ventas hoy?"**

## 2 · Usuarios y qué puede hacer cada uno
| Rol | Puede |
|-----|-------|
| **Vendedor** | Crear/editar **sus** cotizaciones (mientras son borrador); convertir en venta; ver sus clientes. No edita precios estándar, no autoriza, **no edita órdenes confirmadas** (pide modificación). |
| **Administrativo** | **Verificar/autorizar** precios a medida y modificaciones; evaluar solicitudes de cambio. |
| **Gestión de Cliente** | Clientes, seguimientos, fusiones. |
| **Dirección** | Todo + comisiones + indicadores + costos. |

## 3 · Objetos que usa (del Core, compartidos — nunca duplicados)
Cliente · Consulta/Atención · **Cotización** (con **versiones** y **snapshot de precios**) ·
**Orden de venta** · **Línea de venta** · Producto · Variante · **Cobro/Seña** (propiedad de
Tesorería) · **Solicitud de modificación** · **Autorización** · Vendedor · Local · Canal ·
Comisión · Evento (auditoría).

> Ventas **referencia**, no copia. El cliente vive en CRM; el precio/costo en Catálogo;
> el cobro en Tesorería. Una sola fuente de verdad.

## 4 · Estados — separados: comercial (orden) vs operativo (línea)
La corrección clave: una orden **no** pasa "a Producción o Logística". La orden tiene un
**estado comercial**; cada **línea** tiene su propio **estado operativo** y se libera sola.

**Estado comercial de la orden (lo controla Ventas):**
```
Borrador → A confirmar → Confirmada → Cerrada
                       ↘ Cancelada
```
**Estado operativo de cada línea (lo ejecutan los otros módulos):**
```
Pendiente → Bloqueada → Liberada → En producción → Lista → Programada → Entregada
```
Una orden **Confirmada** puede tener líneas en estados distintos → **liberación parcial**:
```
Orden OV-2020-0041  (Confirmada)
├── Cómoda Amberes (stock)   → Liberada → Logística
├── Placard Oliver (fabricar)→ Liberada → Producción
└── Mesa a medida            → Bloqueada (falta autorización)
```

## 5 · Motor de confirmación y liberación (el corazón)
No se libera "por llegar al 30%". Se libera cuando se **cumplen condiciones**, evaluadas
por un **motor declarativo y auditable** (lista de checks — la cola "A confirmar" las muestra).

**Condiciones de la ORDEN (para pasar a Confirmada):**
```
✓ Identidad del cliente (tel/IG/mail)
✓ Forma de pago / término definido
✓ Seña mínima cumplida (30% — base a confirmar: efectivo o lista)
✓ Líneas completas
```
**Condiciones de cada LÍNEA (para liberarse):**
```
✓ Variante / medida confirmada
✓ Precio autorizado (si es a medida o con observaciones)
✓ Destino de entrega definido (cuando corresponde)
→ según el tipo de línea, el destino es:
   estándar en stock  → Inventario reserva + Logística programa
   a fabricar         → crea Orden de Producción
   faltante           → Compras detecta necesidad
```
Cada vez que **cambia una condición** (se registra una seña, se autoriza un precio, se
confirma una medida), el motor **reevalúa** y libera / mantiene bloqueada **cada línea**.

## 6 · Snapshot de precios y versiones de cotización
- **Borrador:** toma el precio **vigente** del Catálogo.
- **Al enviar:** **congela** una fotografía del precio (snapshot en la cotización).
- Si el Catálogo cambia después, la cotización enviada **no cambia sola**.
- Cambiar el precio de una cotización enviada crea una **nueva versión** (`C-4142 · v2`),
  no sobrescribe → se sabe qué propuesta recibió y aceptó el cliente.
- **Al convertir en venta:** la orden conserva el **precio aceptado**; cualquier cambio
  posterior pasa por Solicitud de modificación.

## 7 · Submódulos (navegación interna)
```
Ventas
├── Resumen            ¿qué necesita atención hoy?
├── Nueva cotización   armar y entregar una propuesta
├── Cotizaciones       listado + versiones + estados
├── Órdenes            todas las órdenes (estado comercial)
├── A confirmar        cola: qué falta y quién lo resuelve
├── Modificaciones     solicitudes de cambio sobre órdenes confirmadas
├── Clientes           ficha e historial (compartido con CRM)
├── Agenda             turnos y seguimientos del vendedor
├── Autorizaciones     precios a medida / con observaciones
├── Comisiones         por vendedor, con venta compartida
└── Indicadores        conversión, tiempos, ticket, ranking
```

## 8 · Automatizaciones (cada acción, todas sus consecuencias)
- **Cliente por tel/IG/mail** → matchea o crea en CRM; si el teléfono existe, **avisa** (evita duplicados).
- **Aceptar cotización ≠ confirmar venta.** Aceptar → crea una **orden A confirmar** (no genera producción ni reserva definitiva); espera pagos y validaciones.
- **Registrar seña** (la carga Tesorería; Ventas la ve) → el motor **reevalúa condiciones**.
- **Se cumplen condiciones de la orden** → pasa a **Confirmada**; el motor evalúa **cada línea** y libera las que están completas (parcial posible).
- **Línea liberada** → reserva stock / crea orden de producción / genera necesidad de compra / habilita logística — **sin recargar datos**. Tesorería registra saldo; Comisiones queda calculada; Dashboard se actualiza.
- **Ítem a medida / con obs** → crea **Autorización** pendiente; la línea queda **Bloqueada** hasta que Administración apruebe.
- **Orden confirmada** → **no se edita directo**. Se genera **Solicitud de modificación**:
  `Solicitada → Evaluada → Aprobada/Rechazada → Aplicada`, registrando qué cambió, valor
  anterior/nuevo, **impacto económico y productivo**, responsable y motivo. Si toca un
  mueble ya producido/comprado, **advierte**.
- **Venta compartida** (guardada **desde la creación**): vendedor principal + participantes
  con **%**, base de cálculo, quién puede modificarlo y **cuándo se congela** (al confirmar).
  Devolución/descuento/anulación recalculan proporcional.
- **Origen de la venta** (guardado siempre): local, vendedor, **canal** (Instagram/WhatsApp/
  local/recomendación/Tienda Nube/Mercado Libre), **consulta original**, campaña, quién cerró.
- Todo cambio deja **evento de auditoría** (quién, cuándo, desde dónde, valor anterior).

## 9 · Señas, pagos y devoluciones (Ventas ve; Tesorería es dueña)
Seña mínima general + excepciones autorizadas · múltiples pagos · un pago imputado a
**varias órdenes** del cliente · pago **pendiente de validación** · anulación de pago ·
devolución · **diferencia a favor** del cliente. El cobro **pertenece al cliente** y se
imputa a una o varias órdenes — nunca nace atado a una sola.

## 10 · Indicadores (¿el módulo funciona bien?)
Conversión del embudo (consultas→cotizaciones→señadas→órdenes→entregadas) · tiempos
(hasta presupuestar / confirmar / seña) · ticket promedio · % señado · presupuestos
abiertos (aging) · ventas por vendedor y local · comisiones · órdenes **A confirmar** por
motivo y antigüedad. Cada indicador **explica el porqué**.

---

## Orden de construcción (primero el motor, después las pantallas)
1. **Modelo y estados de Orden/Línea** — estados comercial y operativo, condiciones, bloqueo, liberación parcial, snapshot de precios, historial, responsables.
2. **Detalle de orden** — centro operativo: cliente, líneas, condiciones pendientes, pagos y saldo, autorizaciones, actividad, modificaciones, destino de cada línea.
3. **Cola "A confirmar"** — con **motivos** (falta seña / medida / autorización / definir entrega / pago en validación) y **quién** debe resolver.
4. **Registrar seña + motor de evaluación de condiciones.**
5. **Liberación por línea** hacia Inventario / Producción / Compras / Logística.
6. **Autorizaciones y modificaciones** (nada se altera silenciosamente).
7. **Recién después:** Resumen, Indicadores y Comisiones (con eventos reales, no simulados).

### Base ya construida en el HTML
Nueva cotización (identidad, estándar/a medida, término, verificación), convertir en
venta → *A confirmar*, listados de Cotizaciones/Órdenes/Clientes, detalle de cliente.
**Falta todo lo de este documento:** motor de condiciones, estados de línea, liberación
parcial, snapshot/versiones, solicitudes de modificación, autorizaciones.
