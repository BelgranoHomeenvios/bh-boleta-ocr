# 00 · Core del sistema

> El documento más importante del proyecto. No habla de pantallas ni de módulos:
> define **cómo funciona por dentro** Belgrano Soft. Cada módulo (Ventas, Producción,
> Compras, Inventario, Logística, Tesorería, Reclamos) es un **consumidor** de este
> Core y respeta estas mismas reglas. Filosofía en `VISION.md`.

---

## 1 · Conceptos base (el vocabulario de todo el ERP)
- **Objeto** — una entidad con identidad propia y ciclo de vida (Cliente, Orden, Línea,
  Producto…). Vive **una sola vez** en el Core; los módulos lo referencian, nunca lo copian.
- **Evento** — algo que **pasó**, inmutable, con `{evento, payload, actor, fecha}`. Es la
  única forma de que el estado cambie y de que un módulo entere a los demás.
- **Actividad** — la **historia legible** de un objeto, derivada de sus eventos. No se
  escribe a mano: se arma sola.
- **Documento** — un objeto que representa un compromiso u operación (Cotización, Orden de
  venta, Orden de producción, Orden de compra, Entrega, Factura). Tiene numeración y versión.
- **Movimiento** — un cambio de cantidad/ubicación/estado de stock o dinero (reserva,
  ingreso, egreso, cobro, pago). Nunca se edita: se contrapone con otro movimiento.
- **Condición / Autorización / Excepción / Evidencia** — las piezas del **motor de
  transiciones** (ver §7).

**Regla madre:** *un solo dato, una sola vez.* Si un dato ya existe, otro módulo lo
reutiliza; nunca se reescribe.

## 2 · Objetos maestros
| Grupo | Objetos |
|-------|---------|
| **Personas** | Cliente · Proveedor · Usuario · Vendedor |
| **Organización** | Empresa · Sucursal/Local · Depósito · Sector |
| **Catálogo** | Producto · Variante · Material · Lista de materiales · Precio · Costo |
| **Comercial** | Consulta/Atención · Cotización (con versiones) · Orden de venta · Línea de venta |
| **Operativo** | Orden de producción · Orden de compra · Recepción · Movimiento de stock · Reserva · Entrega |
| **Dinero** | Cobro · Pago · Caja/Rendición · Factura (externa, Nacional Soft) · Comisión |
| **Posventa** | Reclamo · Costo de reclamo |
| **Transversales** | Evento · Actividad · Autorización · Excepción · Solicitud de modificación · Comentario · Archivo/Adjunto |

Todo el ERP gira alrededor de estos objetos.

## 3 · Relaciones (el flujo del negocio)
**Comercial → cumplimiento:**
```
Cliente → Consulta → Cotización → Orden de venta → Líneas →
  Objetos operativos (reserva / producción / compra) → Entrega → Cobro → (Reclamo)
```
**Productivo:**
```
Producto → Lista de materiales → Orden de producción → Movimiento de stock → Entrega
Necesidad → Orden de compra → Recepción → Movimiento de stock
```
Una **Línea de venta** es el punto de cruce: es la fuente comercial y de ella cuelgan los
objetos operativos (que la **referencian**, no la copian). Ver `modulo-ventas.md` y
`modelo-orden-linea.md`.

## 4 · Sistema de eventos (catálogo, todo el ERP)
Namespaced `objeto.hecho`. Inmutables. Un módulo **emite**; los demás **escuchan**.
```
cliente.creado · cliente.actualizado · cliente.fusionado · cliente.archivado · cliente.telefono_agregado
consulta.creada · consulta.calificada · consulta.asignada · consulta.seguimiento_programado · consulta.rechazada · consulta.reabierta
cotizacion.creada · cotizacion.versionada · cotizacion.enviada · cotizacion.aceptada · cotizacion.rechazada · cotizacion.vencida
orden.confirmada · orden.a_confirmar · orden.cancelada · orden.cerrada
linea.liberada · linea.bloqueada · linea.lista · linea.anulada
objetoOperativo.creado
produccion.op_creada · produccion.iniciada · produccion.en_control · produccion.a_corregir · produccion.finalizada · produccion.listo
compra.necesidad_detectada · compra.solicitud_creada · compra.oc_emitida · compra.confirmada · compra.recibida · compra.diferencia_detectada
stock.reservado · stock.ingresado · stock.egresado · stock.movido · stock.ajustado · stock.conteo_realizado
entrega.a_coordinar · entrega.programada · entrega.en_ruta · entrega.realizada · entrega.incidencia
cobro.registrado · cobro.validado · cobro.imputado · cobro.anulado · cobro.devuelto
pago.registrado (a proveedor)
factura.solicitada · factura.marcada
reclamo.creado · reclamo.clasificado · reclamo.en_gestion · reclamo.resuelto · reclamo.cerrado
autorizacion.requerida · autorizacion.aprobada · autorizacion.rechazada · excepcion.autorizada
modificacion.solicitada · modificacion.evaluada · modificacion.aprobada · modificacion.rechazada · modificacion.aplicada
comision.provisoria · comision.definitiva
impacto.detectado · accion.requerida
usuario.login · usuario.permiso_cambiado
```
> **Nada cambia de estado sin emitir un evento.** Así el sistema puede explicar *por qué*
> pasó cada cosa y los módulos reaccionan sin recargar datos.

## 5 · Auditoría universal (en TODO objeto, sin excepción)
```
creado_por · creado_en · modificado_por · modificado_en ·
historial[] (cada cambio: campo, valor_anterior, valor_nuevo, quién, cuándo, desde_dónde) ·
comentarios[] · archivos[] · eventos[]
```
Nunca se pierde información. Un borrado es **archivado** (lógico), no destrucción.

## 6 · Motor de actividad (la historia vive en el Core)
La **Actividad** de un objeto se **deriva de sus eventos** — no se escribe a mano. Una
Orden no guarda solo cliente/productos/pago: guarda su **historia**, y se ve sin entrar a
cinco módulos:
```
09:15  Brian creó la orden
09:20  Cliente aceptó la cotización
09:24  Tesorería registró el pago
09:25  El motor confirmó la orden
09:26  Se creó OP-243
09:28  Mario inició producción
15:44  Producción finalizada
17:00  Logística programó la entrega
```
Es un **render de eventos** con lenguaje humano. Cualquier objeto (cliente, producto,
proveedor) tiene su actividad de la misma forma.

## 7 · Motor de transiciones (ya definido, es del Core)
Toda transición pasa por el mismo motor **declarativo, idempotente, reversible y con
evidencia** (`docs/simulacion-ventas.mjs`, `app/comun/motor.js`):
```
Objeto → condiciones requeridas → checks visibles → responsables →
         bloqueos (con alcance) → excepciones autorizadas → evento de transición
```
Ya probado en Ventas (confirmar, liberar por línea, reversión). El **mismo** motor sirve
para: confirmar una compra, recibir mercadería, cerrar una producción, habilitar una
entrega, cerrar un reclamo, aprobar una devolución. Los módulos solo aportan **su catálogo
de condiciones**; la mecánica es del Core.

## 8 · Versionado
Los documentos **congelan** una fotografía cuando se comprometen (la cotización congela el
precio al enviarse; la orden conserva el precio aceptado). Cambiar genera una **nueva
versión**, nunca sobrescribe. Los objetos operativos referencian la **versión aprobada**.

## 9 · Motor de permisos
Permiso = **rol × acción × objeto (× alcance)**. Acciones: `ver · crear · modificar ·
aprobar · archivar · autorizar`. Alcance: `propio` (mis registros) vs `todos`.
```
Rol           ver   crear  modificar  aprobar  autorizar  alcance
Dirección      ✓     ✓      ✓          ✓        ✓          todos (incluye finanzas)
Administrativo ✓     ✓      ✓ (verif)  ✓        precio     ventas/tesorería
Vendedor       ✓     ✓      ✓ (propio) —        —          sus clientes/órdenes
Producción     ✓     —      ✓ (op)     —        —          producción
Logística      ✓     —      ✓ (entrega)—        —          logística
Tesorería      ✓     ✓      ✓          ✓ (cobro)—          dinero
Gestión Cliente✓     ✓      ✓          —        —          CRM
```
La lista real de roles/permisos se afina por módulo; la **mecánica** (matriz declarativa +
evidencia de quién autorizó) es del Core. Editar algo sin permiso no se bloquea en la UI:
lo rechaza el Core y deja evento.

## 10 · Cómo consume el Core un módulo
Un módulo nuevo (ej. Producción) **no** reimplementa nada: define su objeto (Orden de
producción), su **catálogo de condiciones**, sus **eventos**, y consume del Core: objetos,
actividad, auditoría, permisos, motor de transiciones y versionado. Por eso, con el Core
definido, cada módulo nuevo es **más rápido y más coherente** que el anterior.

---

### Estado
- **Definido y probado:** motor de transiciones, modelo Orden/Línea, eventos de Ventas,
  actividad, auditoría (conceptual), versionado (snapshot de precios).
- **A profundizar cuando toque cada módulo:** catálogo completo de eventos por módulo,
  matriz fina de permisos, movimientos de stock/dinero.
