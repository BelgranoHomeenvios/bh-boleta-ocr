// =====================================================================
//  Belgrano Soft · Motor de condiciones (prototipo ejecutable)
//  Patrón del Core: declarativo · idempotente · con evidencia · reversible.
//  No es la UI: es el modelo de Orden/Línea y el motor, para validar las
//  reglas antes de programar. Correr:  node docs/simulacion-ventas.mjs
// =====================================================================

// ---------- Catálogo DECLARATIVO de condiciones -----------------------
const COND_ORDEN = [
  { clave: 'cliente',       label: 'Cliente identificado',            resp: 'Vendedor',    check: o => !!(o.cliente?.tel || o.cliente?.ig || o.cliente?.mail) },
  { clave: 'vend_local',    label: 'Vendedor y local',                resp: 'Vendedor',    check: o => !!o.vendedor && !!o.local },
  { clave: 'pago',          label: 'Condición de pago',               resp: 'Vendedor',    check: o => !!o.termino },
  { clave: 'sena',          label: 'Seña mínima (30%) o excepción',   resp: 'Tesorería',   check: o => senaOk(o) },
  { clave: 'aceptada',      label: 'Cotización aceptada · versión',   resp: 'Vendedor',    check: o => o.cotizacionAceptada && o.version != null },
  { clave: 'lineas_valid',  label: 'Líneas comerciales válidas',      resp: 'Vendedor',    check: o => o.lineas.length > 0 && o.lineas.every(l => l.producto && l.destinoPreliminar) },
];
const COND_LINEA = [
  { clave: 'producto', label: 'Producto/descr completos',      resp: 'Vendedor',        check: l => !!l.producto },
  { clave: 'medida',   label: 'Variante y medida confirmadas', resp: 'Vendedor',        check: l => !l.requiereMedida || l.medidaConfirmada },
  { clave: 'precio',   label: 'Precio autorizado',             resp: 'Administración',  check: l => !l.requiereAutorizacion || l.precioAutorizado },
  { clave: 'obs',      label: 'Observaciones verificadas',     resp: 'Administración',  check: l => !l.tieneObs || l.obsVerificada },
  { clave: 'destino',  label: 'Estrategia/destino definido',   resp: 'Ventas',          check: l => !!l.estrategia },
  { clave: 'mods',     label: 'Modificaciones resueltas',      resp: 'Administración',  check: l => !l.modPendiente },
];

function senaOk(o) {
  if (o.excepcionSena) return true;
  const pagado = o.cobros.filter(c => c.estado === 'validado').reduce((a, c) => a + c.monto, 0);
  return pagado >= o.total * 0.30;
}

// ---------- Motor -----------------------------------------------------
function nuevoCtx() {
  const eventos = [];
  const evidencia = [];
  const registry = new Map(); // idempotencia: (linea@version) → objeto operativo
  return {
    eventos, evidencia, registry,
    emit(tipo, payload = {}) { eventos.push({ tipo, ...payload }); },
  };
}

function evaluar(o, ctx) {
  // --- condiciones de la ORDEN ---
  const rO = COND_ORDEN.map(c => ({ clave: c.clave, resp: c.resp, ok: c.check(o) }));
  ctx.evidencia.push({ sobre: 'orden', estado: o.estadoComercial, checks: rO });
  const ordenOk = rO.every(c => c.ok);
  const terminal = ['cerrada', 'cancelada'].includes(o.estadoComercial);

  if (ordenOk && !terminal && o.estadoComercial !== 'confirmada') {
    o.estadoComercial = 'confirmada';
    ctx.emit('orden.confirmada', { orden: o.id });
  } else if (!ordenOk && o.estadoComercial === 'borrador') {
    o.estadoComercial = 'a_confirmar';
  }

  // --- condiciones de cada LÍNEA (solo con orden confirmada) ---
  for (const l of o.lineas) {
    if (['entregada'].includes(l.estadoOperativo)) continue;
    // un bloqueo de reversión frena todo hasta acción controlada
    if (l.bloqueos.some(b => b.motivo === 'reversion')) continue;

    const rL = COND_LINEA.map(c => ({ clave: c.clave, resp: c.resp, ok: c.check(l) }));
    ctx.evidencia.push({ sobre: 'linea:' + l.id, estado: l.estadoOperativo, checks: rL });
    const lineaOk = rL.every(c => c.ok);

    if (o.estadoComercial === 'confirmada' && lineaOk) {
      if (l.estadoOperativo === 'pendiente' || l.estadoOperativo === 'bloqueada') {
        l.estadoOperativo = 'liberada';
        l.bloqueos = [];
        ctx.emit('linea.liberada', { linea: l.id });
        crearObjetoOperativo(o, l, ctx); // idempotente
      }
    } else if (l.estadoOperativo !== 'liberada') {
      l.estadoOperativo = 'bloqueada';
      l.bloqueos = rL.filter(c => !c.ok).map(c => ({ alcance: 'liberacion', clave: c.clave, resp: c.resp }));
    }
  }
}

function crearObjetoOperativo(o, l, ctx) {
  const key = `${l.id}@v${o.version}`;
  if (ctx.registry.has(key)) return; // ← idempotencia: no duplica
  const tipo = {
    stock: 'reserva_inventario', fabricacion_interna: 'orden_produccion',
    fabricacion_tercerizada: 'orden_produccion_terc', compra: 'necesidad_compra',
    mixta: 'mixto (reserva + compra)',
  }[l.estrategia] || 'pendiente_decision';
  const obj = { tipo, ref: { orden: o.id, linea: l.id, version: o.version, cliente: o.cliente?.tel } };
  l.objetoOperativo = obj;
  ctx.registry.set(key, obj);
  ctx.emit('objetoOperativo.creado', { linea: l.id, estrategia: l.estrategia, tipo });
}

function registrarCobro(o, cobro, ctx) {
  o.cobros.push(cobro);
  ctx.emit('cobro.registrado', { monto: cobro.monto, estado: cobro.estado }); // Tesorería, siempre
  evaluar(o, ctx);
}

// Reversión controlada: una condición deja de cumplirse.
function anularPago(o, ctx) {
  o.cobros.forEach(c => (c.estado = 'anulado'));
  ctx.emit('pago.anulado', {});
  const conTrabajo = o.lineas.filter(l => l.objetoOperativo);
  if (conTrabajo.length) {
    // NO se desibera en silencio: se detecta impacto y se exige acción controlada.
    ctx.emit('impacto.detectado', { lineas: conTrabajo.map(l => l.id), nota: 'ya existe trabajo operativo' });
    conTrabajo.forEach(l => l.bloqueos.push({ alcance: 'orden', motivo: 'reversion', clave: 'sena', resp: 'Dirección', accion: 'cancelar o modificar' }));
    ctx.emit('accion.requerida', { tipo: 'cancelacion_o_modificacion', motivo: 'seña revocada con trabajo operativo ya generado' });
  } else {
    evaluar(o, ctx); // sin trabajo: se puede volver a A confirmar
  }
}

// ---------- Utilidades de impresión -----------------------------------
function linea(txt = '') { console.log(txt); }
function trace(ctx) { ctx.eventos.forEach(e => linea('    • ' + e.tipo + '  ' + JSON.stringify(rest(e)))); }
function rest(e) { const { tipo, ...r } = e; return r; }
function estado(o) {
  linea(`    Orden ${o.id}: ${o.estadoComercial.toUpperCase()}`);
  o.lineas.forEach(l => linea(`      ├─ ${l.id} (${l.tipo}): ${l.estadoOperativo}` +
    (l.objetoOperativo ? ` → ${l.objetoOperativo.tipo}` : '') +
    (l.bloqueos.length ? `  ⛔ ${l.bloqueos.map(b => b.clave + '/' + b.alcance).join(', ')}` : '')));
}

// =====================================================================
//  CASO 1 · Orden completamente liberada
// =====================================================================
linea('\n══════ CASO 1 · Orden completamente liberada ══════');
{
  const o = {
    id: 'OV-2020-0040', estadoComercial: 'borrador', version: 1, total: 1000000,
    cliente: { tel: '1155550001' }, vendedor: 'Ale', local: '2020', termino: 'efectivo',
    cotizacionAceptada: true, cobros: [],
    lineas: [
      { id: 'L1', tipo: 'estándar', producto: 'Cómoda Amberes', destinoPreliminar: 'stock', estrategia: 'stock', estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
      { id: 'L2', tipo: 'a fabricar', producto: 'Placard Oliver', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereMedida: true, medidaConfirmada: true, estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
    ],
  };
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 300000, estado: 'validado' }, ctx); // 30%
  linea('  Eventos:'); trace(ctx);
  linea('  Estado final:'); estado(o);
  // Reevaluar 2 veces: NO debe duplicar objetos operativos
  const antes = ctx.registry.size;
  evaluar(o, ctx); evaluar(o, ctx);
  linea(`  Idempotencia: objetos operativos antes=${antes}, después de 2 reevaluaciones=${ctx.registry.size}  ${antes === ctx.registry.size ? '✓' : '✗'}`);
}

// =====================================================================
//  CASO 2 · Orden confirmada, parcialmente liberada
// =====================================================================
linea('\n══════ CASO 2 · Confirmada, parcialmente liberada ══════');
{
  const o = {
    id: 'OV-2020-0041', estadoComercial: 'borrador', version: 1, total: 1500000,
    cliente: { ig: '@laura' }, vendedor: 'Cristian', local: '2299', termino: 'efectivo',
    cotizacionAceptada: true, cobros: [],
    lineas: [
      { id: 'L1', tipo: 'estándar', producto: 'Cómoda Amberes', destinoPreliminar: 'stock', estrategia: 'stock', estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
      { id: 'L2', tipo: 'a fabricar', producto: 'Placard Oliver', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
      { id: 'L3', tipo: 'a medida', producto: 'Mesa a medida', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereAutorizacion: true, precioAutorizado: false, tieneObs: true, obsVerificada: false, estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
    ],
  };
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 450000, estado: 'validado' }, ctx); // 30%
  linea('  Tras la seña:'); estado(o);
  linea('  → L3 queda BLOQUEADA (falta autorización). La orden igual quedó CONFIRMADA.');
  // Administración autoriza el precio y verifica la observación
  const L3 = o.lineas.find(l => l.id === 'L3');
  L3.precioAutorizado = true; L3.obsVerificada = true;
  ctx.emit('autorizacion.aprobada', { linea: 'L3', resp: 'Administración' });
  evaluar(o, ctx);
  linea('  Tras autorizar L3:'); estado(o);
  linea('  Eventos:'); trace(ctx);
}

// =====================================================================
//  CASO 3 · Condición revocada DESPUÉS de generar trabajo operativo
// =====================================================================
linea('\n══════ CASO 3 · Seña revocada con trabajo ya generado ══════');
{
  const o = {
    id: 'OV-2020-0042', estadoComercial: 'borrador', version: 1, total: 800000,
    cliente: { tel: '1155559999' }, vendedor: 'Sergio', local: '2020', termino: 'transferencia',
    cotizacionAceptada: true, cobros: [],
    lineas: [
      { id: 'L1', tipo: 'a fabricar', producto: 'Vajillero Nórdico', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', estadoOperativo: 'pendiente', bloqueos: [], objetoOperativo: null },
    ],
  };
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 240000, estado: 'validado' }, ctx); // 30% → libera y crea orden de producción
  linea('  Tras la seña (línea liberada, orden de producción creada):'); estado(o);
  // Ahora se anula el pago (rebota la transferencia)
  anularPago(o, ctx);
  linea('  Tras anular el pago:'); estado(o);
  linea('  Eventos:'); trace(ctx);
  linea('  → El motor NO desibera en silencio: detecta impacto, bloquea (alcance orden) y exige acción controlada.');
}

linea('\n(Prototipo del motor — valida las reglas antes de construir la interfaz.)');
