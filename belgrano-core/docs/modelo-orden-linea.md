# Ventas · Modelo de datos y motor (paso 1)

> Antes de la interfaz: el modelo de **Orden/Línea**, el **catálogo declarativo de
> condiciones**, los **eventos** y la **evidencia**. Validado con
> `docs/simulacion-ventas.mjs` (correr: `node docs/simulacion-ventas.mjs`).

## Objetos (viven en el Core, compartidos)
**Orden de venta**
`id · numero · estado_comercial(borrador|a_confirmar|confirmada|cerrada|cancelada) ·
cliente_ref · vendedor · vendedores_participantes[%] · local · canal · consulta_ref ·
termino · total · version_precio · cotizacion_ref · excepciones[] · **bloqueos[]** (alcance
orden) · creado/auditoría`

**Línea de venta** (la fuente comercial; nunca se copia a otro módulo). Dos dimensiones:
`id · orden_ref · tipo(estandar|a_fabricar|a_medida) · producto_ref · variante/medida ·
precio_congelado · **habilitacion**(pendiente|bloqueada|liberada) ·
**cumplimiento**(sin_iniciar|reservada|en_produccion|en_compra|mixto|lista|programada|
entregada) · estrategia · **objetos_operativos[]** · bloqueos[] · requiere_autorizacion`

**Objeto operativo** (lo que se genera al liberar — **referencia**, no copia)
`tipoObjeto(reserva_inventario|orden_produccion|orden_produccion_terc|necesidad_compra) ·
ref{orden, linea, version}` — clave de **idempotencia**: `orden:linea:version:tipoEfecto`
(permite **varios** efectos por línea, ej. estrategia mixta = reserva + compra).

**Cobro** (propiedad de Tesorería) · **Bloqueo** `{alcance, clave, responsable, motivo}` ·
**Excepción** `{regla, valor_normal, autorizada_por, motivo, fecha}` ·
**Evento** `{tipo, payload, fecha, quien}` · **Solicitud de modificación**.

## Catálogo declarativo de condiciones
**Orden → Confirmada** (responsable entre paréntesis):
`cliente identificado (Vendedor) · vendedor y local (Vendedor) · condición de pago
(Vendedor) · seña 30% o excepción (Tesorería) · cotización aceptada + versión (Vendedor) ·
líneas comerciales válidas (Vendedor) · sin bloqueos de alcance "orden"`
> Confirmar **no** exige que todas las líneas estén liberadas.

**Línea → Liberada:**
`producto completo (Vendedor) · variante/medida (Vendedor) · precio autorizado
(Administración) · observaciones verificadas (Administración) · estrategia/destino
(Ventas) · modificaciones resueltas (Administración)`

## Estrategia de cumplimiento (liberar ≠ crear trabajo)
`stock existente · fabricación interna · fabricación tercerizada · compra directa ·
mixta (stock parcial + compra) · pendiente de decisión`

## Eventos — sobre `{evento, payload}` (el payload nunca pisa el nombre)
`cobro.registrado` (Tesorería, siempre) · `orden.confirmada` (congela vendedores,
comisión provisoria, embudo) · `orden.a_confirmar` (vuelve, sin trabajo) · `linea.liberada`
· `objetoOperativo.creado{tipoObjeto}` · `autorizacion.aprobada` · `linea.lista` ·
`entrega.realizada` · `orden.cerrada` (comisión definitiva) · **negativos:** `pago.anulado
· impacto.detectado · accion.requerida{tipoAccion}`.

## Reglas técnicas del motor (v2, probadas)
- **Eventos con nombre propio:** `{evento, payload}` — un `tipoObjeto`/`tipoAccion` en el
  payload ya no sobrescribe el nombre del evento.
- **Transición centralizada:** `a_confirmar ↔ confirmada` vive en un solo lugar. Si cae
  una condición **sin** trabajo operativo → vuelve solo a `a_confirmar`. **Con** trabajo →
  no vuelve solo: impacto + acción requerida.
- **Bloqueos con nivel correcto:** `orden.bloqueos[]` separado de `linea.bloqueos[]`;
  condición explícita `sin_bloqueos_orden`.
- **Idempotente por efecto:** clave `orden:linea:version:tipoEfecto` → estrategia **mixta**
  genera reserva **y** compra sin duplicar.
- **Línea en dos dimensiones:** habilitación (pendiente|bloqueada|liberada) vs cumplimiento
  (reservada|en_produccion|en_compra|mixto|…).
- **Evidencia completa** por evaluación: `regla · versionRegla · esperado · valor ·
  resultado · responsable · disparadoPor · actor · evaluadoEn`.

## Simulación de los 5 casos (salida real)
```
CASO 1 · completamente liberada
  L1 liberada/reservada→reserva_inventario · L2 liberada/en_produccion→orden_produccion
  Idempotencia: 2 efectos, tras 2 reevaluaciones = 2 ✓

CASO 2 · confirmada, parcialmente liberada
  L1,L2 liberadas · L3 (a medida) bloqueada/sin_iniciar ⛔ precio, obs
  → Administración autoriza → L3 liberada  (L1,L2 no se duplican)

CASO 3 · seña revocada con trabajo ya generado
  seña → L1 liberada/en_produccion. pago.anulado → impacto.detectado →
  ⛔orden:sena → accion.requerida  (NO desibera en silencio)

CASO 4 · estrategia MIXTA
  L1 liberada/mixto → reserva_inventario + necesidad_compra  (2 efectos, no duplicados)

CASO 5 · pierde condición SIN trabajo
  confirmada (L1 bloqueada) → pago.anulado → vuelve sola a A_CONFIRMAR  (sin impacto)
```

## Siguiente
Con el modelo y el motor validados, el próximo paso es la **interfaz sobre este motor**:
detalle de orden (checks con responsable, bloqueos con alcance, evidencia) y la cola
**"A confirmar"**. La UI solo **muestra y dispara** eventos; las reglas viven en el motor.
