# Ventas · Modelo de datos y motor (paso 1)

> Antes de la interfaz: el modelo de **Orden/Línea**, el **catálogo declarativo de
> condiciones**, los **eventos** y la **evidencia**. Validado con
> `docs/simulacion-ventas.mjs` (correr: `node docs/simulacion-ventas.mjs`).

## Objetos (viven en el Core, compartidos)
**Orden de venta**
`id · numero · estado_comercial(borrador|a_confirmar|confirmada|cerrada|cancelada) ·
cliente_ref · vendedor · vendedores_participantes[%] · local · canal · consulta_ref ·
termino · total · version_precio · cotizacion_ref · excepciones[] · creado/auditoría`

**Línea de venta** (la fuente comercial; nunca se copia a otro módulo)
`id · orden_ref · tipo(estandar|a_fabricar|a_medida) · producto_ref · variante/medida ·
precio_congelado · estado_operativo(pendiente|bloqueada|liberada|en_produccion|lista|
programada|entregada) · estrategia_cumplimiento · objeto_operativo_ref · bloqueos[] ·
requiere_autorizacion · observaciones`

**Objeto operativo** (lo que se genera al liberar — **referencia**, no copia)
`tipo(reserva_inventario|orden_produccion|orden_produccion_terc|necesidad_compra|mixto) ·
ref{orden, linea, version, cliente}` — clave de **idempotencia**: `linea@version`.

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

## Eventos (cada uno con su momento y sus consecuencias)
`cobro.registrado` (Tesorería, siempre) · `orden.confirmada` (congela vendedores,
comisión provisoria, embudo) · `linea.liberada` (activa Inventario/Producción/Compras/
Logística) · `objetoOperativo.creado` · `autorizacion.aprobada` · `linea.lista` ·
`entrega.realizada` · `orden.cerrada` (comisión definitiva) · **negativos:**
`pago.anulado · impacto.detectado · accion.requerida(cancelacion_o_modificacion)`.

## Reglas técnicas del motor (probadas)
- **Idempotente:** crear objeto operativo se saltea si ya existe `linea@version`. La
  simulación reevalúa 2 veces y no duplica (2 → 2 ✓).
- **Reversión controlada:** si una condición cae con trabajo ya generado, **no desibera
  en silencio**: emite `impacto.detectado`, agrega bloqueo de alcance "orden" y exige
  `cancelación o modificación`.

## Simulación de los 3 casos (salida real)
```
CASO 1 · completamente liberada
  orden.confirmada → L1 liberada→reserva_inventario · L2 liberada→orden_produccion
  Idempotencia: 2 objetos, tras 2 reevaluaciones = 2  ✓

CASO 2 · confirmada, parcialmente liberada
  L1,L2 liberadas · L3 (a medida) BLOQUEADA ⛔ precio/liberacion, obs/liberacion
  (la orden igual queda CONFIRMADA)
  → Administración autoriza → L3 liberada→orden_produccion  (L1,L2 no se duplican)

CASO 3 · seña revocada con trabajo ya generado
  seña → L1 liberada→orden_produccion
  pago.anulado → impacto.detectado → bloqueo sena/orden → accion.requerida
  (NO se desibera en silencio)
```

## Siguiente
Con el modelo y el motor validados, el próximo paso es la **interfaz sobre este motor**:
detalle de orden (checks con responsable, bloqueos con alcance, evidencia) y la cola
**"A confirmar"**. La UI solo **muestra y dispara** eventos; las reglas viven en el motor.
