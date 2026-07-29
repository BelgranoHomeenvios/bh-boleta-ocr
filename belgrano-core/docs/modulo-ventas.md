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
Es una instancia del **motor de transiciones del Core** (ver `VISION.md`). No se libera
"por llegar al 30%": se libera cuando se **cumplen condiciones**, evaluadas por un motor
**declarativo, visible y auditable**.

### 5.1 · Tres conceptos separados (no mezclarlos)
```
1. Orden comercial CONFIRMADA   (condiciones de la orden)
2. Línea comercial LIBERADA     (condiciones de la línea)
3. Destino operativo ASIGNADO   (a dónde va la línea liberada)
```
Una orden puede estar **Confirmada** con líneas todavía **Bloqueadas**. Una línea
**Liberada** se dirige luego a: **Inventario · Producción interna · Producción
tercerizada · Compras · Logística**.

### 5.2 · Condiciones de la ORDEN (para Confirmar)
```
✓ Cliente identificado (tel/IG/mail)
✓ Vendedor y local definidos
✓ Condición de pago definida
✓ Seña mínima cumplida — o excepción autorizada
✓ Cotización aceptada · versión de precio congelada
✓ Líneas comerciales válidas (identificadas, con destino preliminar)
✓ Sin bloqueos de alcance "orden"
```
> **Confirmar la orden NO exige que todas las líneas estén liberadas.** "Líneas
> comerciales válidas" = suficientemente definidas para existir como compromiso
> comercial. Una orden **Confirmada puede tener líneas Bloqueadas**.
### 5.3 · Condiciones de cada LÍNEA (para Liberar)
```
✓ Producto o descripción completos
✓ Variante y medida confirmadas
✓ Precio autorizado
✓ Observaciones verificadas
✓ Destino operativo definido
✓ Disponibilidad o necesidad identificada
✓ Modificaciones pendientes resueltas
```
Cada cambio de condición (seña, autorización, medida) hace que el motor **reevalúe** y
libere / mantenga bloqueada **cada línea** por separado.

### 5.4 · Cada check tiene responsable (la cola "A confirmar")
No muestra solo *qué* falta, sino **quién** lo resuelve, **desde cuándo**, la **urgencia**
y la **próxima acción**:
```
OV-2020-0041 · Mesa a medida
Pendiente : autorizar precio
Responsable: Administración
Desde     : hace 2 días · Urgencia: media
Acción    : Revisar autorización →
```

### 5.5 · Bloqueos con alcance (no un único "bloqueada")
Un bloqueo declara **qué** frena: `línea · orden · liberación · entrega · modificación ·
cobro`. Ej.: una línea puede estar liberada para producir pero **bloqueada para
entregar** por falta de dirección.

### 5.6 · Evidencia (por qué se liberó o no)
Cada evaluación guarda: condición · resultado · fecha/hora · valor usado · **regla
aplicada** · usuario o automatización · motivo de excepción. Se puede **reconstruir** la
decisión completa.

### 5.7 · Excepciones explícitas (no rompen la regla)
```
Seña requerida : 30%
Seña registrada: 20%
Resultado normal: no confirma
Excepción autorizada por: Dirección · motivo: cliente corporativo · 29/07/2026
```
La excepción se registra; la **regla general no cambia** en silencio.

### 5.8 · No duplicar documentos operativos
Al liberar una línea **no se copia** su información dentro de Producción o Logística: se
genera el **objeto operativo** (orden de producción, entrega, necesidad de compra)
**referenciando** orden de venta · línea · cliente · producto/configuración · **versión
aprobada**. La **línea de venta** sigue siendo la fuente comercial original.

### 5.9 · Liberar ≠ crear trabajo operativo (estrategia de cumplimiento)
Liberar una línea **no** implica directamente "crear orden de producción". Hay un paso
intermedio: el motor determina la **estrategia de cumplimiento** (no siempre surge del
tipo de producto — un mismo placard puede estar en stock, fabricarse o comprarse):
```
Línea cumple condiciones → Línea LIBERADA →
  Motor determina estrategia → genera/vincula objetos operativos
Estrategias: stock existente · fabricación interna · fabricación tercerizada ·
             compra directa · mixta (stock parcial + compra) · pendiente de decisión
```

### 5.10 · Idempotencia y reversión (antes de programar)
- **Idempotente:** reevaluar N veces una línea liberada **no** duplica reservas, compras
  ni órdenes de producción. Antes de generar, pregunta: *¿ya existe objeto operativo para
  esta línea y esta versión?*
- **Reversión controlada:** si una condición **deja de cumplirse** (pago anulado,
  transferencia rechazada, reserva perdida, medida modificada, autorización anulada), el
  sistema **no "desibera" en silencio**:
```
Condición deja de cumplirse → detectar impacto → bloquear nuevas acciones →
  advertir si ya existe ejecución → requerir cancelación o modificación
```

## 6 · Snapshot de precios y versiones de cotización
- **Borrador:** toma el precio **vigente** del Catálogo.
- **Al enviar:** **congela** una fotografía del precio (snapshot en la cotización).
- Si el Catálogo cambia después, la cotización enviada **no cambia sola**.
- Cambiar el precio de una cotización enviada crea una **nueva versión** (`C-4142 · v2`),
  no sobrescribe → se sabe qué propuesta recibió y aceptó el cliente.
- **Al convertir en venta:** la orden conserva el **precio aceptado**; cualquier cambio
  posterior pasa por Solicitud de modificación.

Siempre visible la comparación (para no cambiar nada en silencio):
```
Precio de catálogo actual : $ …
Precio de cotización enviado: $ …   (snapshot)
Precio de orden aceptado  : $ …
Diferencia                : $ …   → autorización si corresponde
```

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
- **Ítem a medida / con obs** → crea **Autorización** pendiente; la línea queda **Bloqueada** hasta que Administración apruebe.

**Las consecuencias se disparan por EVENTO, no todas de una** (cada evento tiene su momento):
| Evento | Consecuencias |
|--------|---------------|
| **Cobro registrado** | Tesorería registra, valida, imputa y actualiza saldo — **siempre**, aunque la orden siga bloqueada. |
| **Orden confirmada** | Se **congela** la participación de vendedores; comisión **provisoria**; se actualiza el embudo comercial. |
| **Línea liberada** | El motor determina estrategia y activa **Inventario / Producción / Compras / Logística** (idempotente). |
| **Línea lista** | Habilita logística / preparación. |
| **Entrega realizada** | Cierra la línea operativamente. |
| **Orden cerrada** | Consolida la **comisión definitiva** (según la regla) y cierra el ciclo. |
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

## 11 · Caminos negativos (no solo el camino ideal)
El flujo también contempla y deja evento de: cotización **rechazada** o **vencida** ·
pago **rechazado** o **en validación** · orden **cancelada** · línea **anulada** ·
modificación **rechazada** · **pérdida de stock reservado** · **imposibilidad de
fabricar** · **devolución de seña** · **reclamo posterior**. Cada uno con su responsable,
su motivo y su reversa de consecuencias (ej.: anular una línea libera su reserva de stock).

## 12 · Trazabilidad — seguir una orden y una línea
Se puede seguir **una orden completa** y también **una línea individual**, viendo en cada
paso: **qué ocurrió · qué falta · quién lo resuelve · qué módulo actúa · qué evento se
generó.** Esa es la prueba de que el motor es visible y explicable.

---

## Secuencia de trabajo
**Documento ✓ → flujo funcional ✓ → modelo de datos (siguiente) → recién ahí se programa.**
Nada se codea hasta cerrar el modelo de Orden/Línea y las reglas del motor.

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
