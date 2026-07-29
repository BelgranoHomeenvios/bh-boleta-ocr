# Módulo Ventas · Documento funcional

> Estructura de 8 definiciones (igual para todos los módulos). Ventas es la
> entrada del flujo y dispara casi todo: **CRM → Ventas → Tesorería →
> Producción/Compras/Inventario → Logística.** Ver `VISION.md` para la filosofía.

---

## 1 · Objetivo
Construir una propuesta comercial, confirmarla y **transformarla en una orden
ejecutable**. Ventas termina su trabajo cuando la orden queda confirmada y sus
**líneas se liberan** al resto del ERP. La pregunta que responde el módulo:
**"¿Qué necesita mi atención en ventas hoy?"**

## 2 · Usuarios y qué puede hacer cada uno
| Rol | Puede |
|-----|-------|
| **Vendedor** | Crear/editar **sus** cotizaciones y ventas; ver sus clientes; convertir en venta. No edita precios de ítems estándar ni autoriza. |
| **Administrativo** | **Verificar** ítems a medida / con observaciones; **autorizar** precios y modificaciones; gestionar cambios sobre órdenes confirmadas. |
| **Gestión de Cliente** | Ver/editar clientes, seguimientos, fusiones. |
| **Dirección** | Todo + comisiones + indicadores + costos. |

## 3 · Objetos que usa (del Core, compartidos — nunca duplicados)
Cliente · Consulta/Atención · **Cotización** (+ líneas) · **Orden de venta** (+ líneas) ·
Producto · Variante · Cobro/Seña · Vendedor · Local · Comisión · Autorización · Evento (auditoría).

> Ventas **no copia** el cliente ni el producto: los referencia. El cliente vive en
> CRM; el producto/precio en Catálogo. Una sola fuente de verdad.

## 4 · Estados (ciclo de vida)
**Cotización:**
```
Borrador → Enviada → Aceptada → (genera orden)
                 ↘ Rechazada   ↘ Vencida (casi no se usa: el plazo va a la consulta)
```
**Orden de venta (lo que Ventas entrega al resto):**
```
Confirmar  → (seña ≥ 30%)  → líneas liberadas → [Producción / Logística]
   ↑ espera refuerzo de seña
Anulado · Reclamo (según el ciclo global de la orden)
```
**Línea de venta:** `Pendiente → Liberada` (al confirmarse la orden con seña). Una
línea liberada es la que Producción/Inventario/Logística ven.

## 5 · Submódulos (navegación interna)
```
Ventas
├── Resumen            ¿qué necesita atención hoy?
├── Nueva cotización   armar y entregar una propuesta
├── Cotizaciones       listado + estados (borrador/aceptada/rechazada)
├── Órdenes            todas las órdenes de venta
├── A confirmar        órdenes esperando seña (cola de acción)
├── Modificaciones     cambios sobre órdenes ya confirmadas (con autorización)
├── Clientes           ficha e historial (compartido con CRM)
├── Agenda             turnos y seguimientos del vendedor
├── Autorizaciones     precios a medida / con observaciones a verificar
├── Comisiones         cálculo por vendedor, con venta compartida
└── Indicadores        conversión, tiempos, ticket, ranking
```

## 6 · Pantallas (qué ve el usuario)
- **Resumen:** alarmas (clientes sin seguimiento, órdenes esperando seña, presupuestos por vencer), KPIs (ventas hoy/mes, objetivo, por cobrar, ticket), pipeline y embudo. Accesos rápidos.
- **Nueva cotización:** cliente por identidad (tel/IG/mail; pop-up si falta), datos de operación (vendedor, local, término, vence), ítems **estándar** (precio bloqueado del catálogo) y **a medida** (precio manual), precio por término (efectivo −35%, tarjeta/lista, transferencia, mixto editable), guardar/vista previa/imprimir, **convertir en venta**.
- **Cotizaciones / Órdenes / A confirmar:** listados **filtrables** por cliente, vendedor, local, estado, fecha; fila → detalle. "A confirmar" es la cola priorizada por antigüedad.
- **Detalle de orden:** líneas, estado, seña acumulada y saldo, registrar seña, historial (trazabilidad).
- **Modificaciones / Autorizaciones:** bandeja de lo que requiere que Administración apruebe (precio a medida, cambios post-confirmación).
- **Comisiones / Indicadores:** tableros por vendedor/local con explicación del porqué.

## 7 · Automatizaciones (cada acción, todas sus consecuencias)
- **Cliente cargado por tel/IG/mail** → se **matchea o crea** en CRM (single source); si el teléfono existe, avisa (evita duplicados).
- **Aceptar cotización** → crea **Orden de venta** en *Confirmar*, arrastra todos los datos (sin recargar), marca ítems a medida/con obs como **pendientes de autorización**.
- **Registrar seña ≥ 30%** → **libera las líneas**:
  - línea **estándar en stock** → Inventario **reserva** + Logística **programa** la entrega (entrega inmediata);
  - línea **a fabricar** → crea **Orden de producción**;
  - **faltantes** → Compras detecta la **necesidad**;
  - Tesorería registra el **saldo pendiente**; Comisiones **calcula** (repartida por % en venta compartida); Dashboard **actualiza** indicadores.
- **Ítem a medida / con observaciones** → **bloquea la liberación** hasta que Administración verifique.
- **Entregar presupuesto sin identidad** → registra la atención pero **avisa** (pop-up) que no queda registrado el cliente.
- Todo cambio deja **evento de auditoría** (quién, cuándo, desde dónde, valor anterior).

## 8 · Indicadores (¿el módulo funciona bien?)
- **Conversión del embudo:** consultas → cotizaciones → señadas → órdenes → entregadas.
- **Tiempos:** hasta presupuestar · hasta confirmar · presupuesto → seña.
- **Ticket promedio**, **% de cotizaciones señadas**, **presupuestos abiertos** (aging).
- **Ventas por vendedor y local**, comisiones, **órdenes a confirmar** por antigüedad.
- Cada indicador **explica el porqué** (ej: "la conversión cayó porque subieron los presupuestos sin seguimiento").

---

### Lo que ya está construido (base real en el HTML)
Nueva cotización (identidad, estándar/a medida, término de pago, verificación),
convertir en venta → *Confirmar*, listados de Cotizaciones/Órdenes/Clientes, detalle
de cliente. **Falta:** detalle de orden + seña→liberación, A confirmar, Modificaciones,
Autorizaciones, Comisiones, Indicadores, y las automatizaciones cross-módulo.
