# 00 · Objetos del sistema (enciclopedia)

> Una **ficha por objeto**. Cuando aparezca una duda sobre cómo debe comportarse un
> objeto, se responde acá — no en diez documentos. Complementa `00_CORE_DEL_SISTEMA.md`
> (mecánica) con el **contrato** de cada objeto.
>
> **Disciplina:** las fichas de objetos ya decididos están **completas**; las de objetos
> que todavía no diseñamos están como **esqueleto** y se completan al construir su módulo.
> Todo objeto hereda del Core: **auditoría universal** (creado/modificado por, historial,
> comentarios, archivos, eventos) y **actividad** (historia derivada de sus eventos). No se
> repite en cada ficha.

## Template de ficha
```
Objeto · Responsable · Qué representa
Estados: …
Eventos: objeto.hecho …
Relaciones: → …
Reglas clave: …
Permisos: quién crea / modifica / aprueba / ve
```

---

# Comercial y núcleo (COMPLETAS)

## Cliente
- **Responsable:** Gestión de Cliente / Ventas.
- **Qué representa:** una identidad comercial. Se arma con **teléfono, Instagram o mail**
  (al menos uno). Puede tener **varios teléfonos**; dos contactos que son la misma persona
  se **fusionan**.
- **Estados:** `activo · archivado`.
- **Eventos:** `cliente.creado · cliente.actualizado · cliente.telefono_agregado ·
  cliente.fusionado · cliente.archivado`.
- **Relaciones:** → Consultas · Cotizaciones · Órdenes · Cobros (del cliente) · Reclamos.
- **Reglas clave:** identidad = tel/IG/mail; nombre y DNI opcionales (DNI solo para factura);
  "cómo llegó" define virtual/presencial/mixta; **el cobro pertenece al cliente** y se imputa
  a varias órdenes.
- **Permisos:** Vendedor crea/edita (sus); Gestión de Cliente fusiona/archiva; Dirección todo.

## Consulta / Atención
- **Responsable:** Vendedor (CRM).
- **Qué representa:** un contacto/turno del cliente (virtual o presencial) que puede
  convertirse en venta.
- **Estados:** `en_seguimiento · concretada · rechazada` (reabrible).
- **Eventos:** `consulta.creada · consulta.calificada · consulta.asignada ·
  consulta.seguimiento_programado · consulta.rechazada · consulta.reabierta`.
- **Relaciones:** ← Cliente · → Cotización.
- **Reglas clave:** el **plazo** se le pone a la consulta, no al presupuesto; cuando el
  cliente vuelve, la consulta rechazada se **levanta** y se revalida.
- **Permisos:** Vendedor (propias); Dirección/Gestión todas.

## Cotización
- **Responsable:** Vendedor.
- **Qué representa:** una propuesta comercial. Tiene **versiones** y **snapshot de precio**.
- **Estados:** `borrador · enviada · aceptada · rechazada · vencida`.
- **Eventos:** `cotizacion.creada · cotizacion.versionada · cotizacion.enviada ·
  cotizacion.aceptada · cotizacion.rechazada · cotizacion.vencida`.
- **Relaciones:** ← Consulta/Cliente · → Orden de venta.
- **Reglas clave:** borrador toma precio de Catálogo; **al enviar congela** el precio;
  cambiar crea **nueva versión** (no sobrescribe); aceptar **≠** confirmar venta.
- **Permisos:** Vendedor crea/edita mientras es borrador; luego solo versiona.

## Orden de venta
- **Responsable:** Ventas (estado comercial).
- **Qué representa:** el compromiso de venta ejecutable. Ver `modulo-ventas.md`.
- **Estados (comercial):** `borrador · a_confirmar · confirmada · cerrada · cancelada`.
- **Eventos:** `orden.confirmada · orden.a_confirmar · orden.cancelada · orden.cerrada ·
  impacto.detectado · accion.requerida`.
- **Relaciones:** ← Cotización/Cliente · → Líneas · Cobros (imputados) · Factura (externa).
- **Reglas clave:** confirma por **condiciones** (no por seña); puede quedar **parcialmente
  liberada**; conserva el **precio aceptado**; no se edita directo → **Solicitud de
  modificación**; guarda **venta compartida** y **origen** desde la creación; `orden.bloqueos[]`.
- **Permisos:** Vendedor crea; Administración/Dirección autorizan y modifican.

## Línea de venta
- **Responsable:** Ventas (comercial) → módulos operativos (ejecución).
- **Qué representa:** el punto de cruce con todo el ERP; la fuente comercial de la que
  cuelgan los objetos operativos (que la **referencian**, no la copian).
- **Estados:** **habilitación** `pendiente · bloqueada · liberada` · **cumplimiento**
  `sin_iniciar · reservada · en_produccion · en_compra · mixto · lista · programada · entregada`.
- **Eventos:** `linea.liberada · linea.bloqueada · linea.lista · linea.anulada ·
  objetoOperativo.creado`.
- **Relaciones:** ← Orden · → Reserva / Orden de producción / Necesidad de compra / Entrega.
- **Reglas clave:** se libera **por sus propias condiciones**; **estrategia de cumplimiento**
  (stock/interna/tercerizada/compra/mixta); **seña 30% solo si es fabricación**; bloqueo con
  **alcance**; anular una línea **revierte** su reserva.
- **Permisos:** el motor libera; Administración autoriza precio a medida.

## Cobro
- **Responsable:** Tesorería (dueña); Ventas lo ve.
- **Qué representa:** dinero recibido del **cliente**, imputable a **una o varias** órdenes.
- **Estados:** `registrado · validado · imputado · anulado · devuelto`.
- **Eventos:** `cobro.registrado · cobro.validado · cobro.imputado · cobro.anulado ·
  cobro.devuelto`.
- **Relaciones:** ← Cliente · → Órdenes (imputación N:N) · Rendición/Caja.
- **Reglas clave:** pertenece al cliente, **no** nace atado a una sola orden; señas por
  efectivo/transferencia/tarjeta; **inmutable** (se contrapone, no se edita).
- **Permisos:** Tesorería registra/valida/anula; Ventas consulta.

## Producto · Variante
- **Responsable:** Catálogo.
- **Qué representa:** el conocimiento comercial y productivo del mueble. La **variante** es la
  combinación concreta (medida · estructura · frente · bolsa de atributos).
- **Estados:** `activo · pausado · archivado` · publicación TN `publicado · no_publicado`.
- **Eventos:** `producto.creado · producto.actualizado · variante.creada · precio.actualizado
  · costo.actualizado · producto.publicado`.
- **Relaciones:** ← Categoría/Familia · → Líneas de venta · Lista de materiales · Proveedor.
- **Reglas clave:** precio estándar **sincroniza con Tienda Nube**; costo/margen con Belgrano
  Cost; SKU a definir; una variante = producto + `md5(atributos)`.
- **Permisos:** Catálogo/Administración; Dirección ve costos.

---

# Operativo, dinero y sistema (ESQUELETO — se completan con su módulo)

## Proveedor
Responsable: Compras. Representa a quien nos provee productos/materiales. Estados:
`activo · demorado · archivado`. Eventos base: `proveedor.creado · proveedor.actualizado`.
Relaciones: → Órdenes de compra · Productos. *(Completar con módulo Compras.)*

## Orden de producción
Responsable: Producción. Representa lo que hay que fabricar por una línea liberada.
Estados: `a_producir · pedido · produccion · en_control · a_corregir · recibido · listo`.
Eventos: `produccion.op_creada · produccion.iniciada · produccion.en_control ·
produccion.a_corregir · produccion.finalizada · produccion.listo`. Relaciones: ← Línea ·
→ Movimiento de stock · Entrega. *(Completar con módulo Producción.)*

## Orden de compra · Recepción
Responsable: Compras. La OC **no** aumenta stock; el stock aparece con la **recepción**.
Estados OC: `borrador · emitida · confirmada · recibida`. Eventos:
`compra.necesidad_detectada · compra.solicitud_creada · compra.oc_emitida ·
compra.confirmada · compra.recibida · compra.diferencia_detectada`. *(Completar con Compras.)*

## Movimiento de stock · Reserva
Responsable: Inventario. Un movimiento nunca se edita: se **contrapone**. Tipos:
`ingreso · egreso · transferencia · ajuste · reserva`. Unidad con estados: `disponible ·
reservada · en_exposicion · en_control · bloqueada · dañada · en_reparacion · despachada`.
Eventos: `stock.reservado · stock.ingresado · stock.egresado · stock.movido · stock.ajustado
· stock.conteo_realizado`. *(Completar con módulo Inventario.)*

## Entrega
Responsable: Logística. Cierra con evidencias (fotos, firma, observaciones, cobro de flete,
resultado, posible incidencia). Estados: `a_coordinar · programada · en_ruta · entregada`.
Eventos: `entrega.a_coordinar · entrega.programada · entrega.en_ruta · entrega.realizada ·
entrega.incidencia`. Relaciones: ← Línea/Orden · → Reclamo. *(Completar con Logística.)*

## Reclamo
Responsable: Reclamos/Posventa. Registra **costo** (para Belgrano Home) y **responsabilidad**
(de quién fue el problema) por separado. Estados: `nuevo · en_gestion · esperando_cliente ·
esperando_proveedor · resuelto · cerrado`. Eventos: `reclamo.creado · reclamo.clasificado ·
reclamo.en_gestion · reclamo.resuelto · reclamo.cerrado`. Levanta la orden de su estado y
vuelve. *(Completar con módulo Reclamos.)*

## Usuario · Sucursal · Depósito
Responsable: Configuración (Core). Usuario tiene rol y permisos; pertenece a un local.
Sucursal/Local (2299, 2020) y Depósito (699). Eventos: `usuario.login ·
usuario.permiso_cambiado`. *(Completar con Configuración.)*

## Factura · Comisión
Factura: Belgrano Soft **no factura**, marca "facturado"; la emite **Nacional Soft** y se
incorpora. Comisión: por vendedor, con venta compartida; **provisoria** al confirmar,
**definitiva** al cerrar. Eventos: `factura.solicitada · factura.marcada · comision.provisoria
· comision.definitiva`. *(Completar con Tesorería.)*

---

### Cómo se usa
Al construir un módulo nuevo, se **completa la ficha** de sus objetos (estados, eventos,
reglas, permisos) y se conecta al Core. La ficha es el contrato; el `00_CORE` es la mecánica.
