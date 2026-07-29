// =====================================================================
//  Belgrano Soft · Motor de condiciones (prototipo ejecutable · v2)
//  Patrón del Core: declarativo · idempotente · reversible · con evidencia.
//  Correcciones v2:
//   1) emit {evento, payload} — el payload nunca pisa el nombre del evento.
//   2) Transición a_confirmar↔confirmada centralizada (según haya trabajo).
//   3) orden.bloqueos[] + condición "sin bloqueos de alcance orden".
//   4) Idempotencia por orden:linea:version:tipoEfecto + múltiples efectos (mixta).
//   5) Línea con dos dimensiones: habilitación vs cumplimiento.
//   6) Evidencia completa (regla, versión, esperado/valor, disparador, actor, fecha).
//  Correr:  node docs/simulacion-ventas.mjs
// =====================================================================
const RV = 1; // versión de las reglas
const ahora = () => new Date().toISOString();

// ---------- Catálogo DECLARATIVO de condiciones -----------------------
function senaVal(o) {
  if (o.excepcionSena) return { ok: true, esperado: 0.30, valor: 1, excepcion: true };
  const pagado = o.cobros.filter(c => c.estado === 'validado').reduce((a, c) => a + c.monto, 0);
  return { ok: pagado >= o.total * 0.30, esperado: 0.30, valor: o.total ? +(pagado / o.total).toFixed(2) : 0 };
}

const COND_ORDEN = [
  { clave: 'cliente',            resp: 'Vendedor',       check: o => !!(o.cliente?.tel || o.cliente?.ig || o.cliente?.mail) },
  { clave: 'vend_local',         resp: 'Vendedor',       check: o => !!o.vendedor && !!o.local },
  { clave: 'pago',               resp: 'Vendedor',       check: o => !!o.termino },
  { clave: 'sena',               resp: 'Tesorería',      check: o => senaVal(o).ok, detalle: o => senaVal(o) },
  { clave: 'aceptada',           resp: 'Vendedor',       check: o => o.cotizacionAceptada && o.version != null },
  { clave: 'lineas_valid',       resp: 'Vendedor',       check: o => o.lineas.length > 0 && o.lineas.every(l => l.producto && l.destinoPreliminar) },
  { clave: 'sin_bloqueos_orden', resp: 'Administración', check: o => !o.bloqueos.some(b => b.alcance === 'orden' && b.activo !== false) },
];
const COND_LINEA = [
  { clave: 'producto', resp: 'Vendedor',       check: l => !!l.producto },
  { clave: 'medida',   resp: 'Vendedor',       check: l => !l.requiereMedida || l.medidaConfirmada },
  { clave: 'precio',   resp: 'Administración', check: l => !l.requiereAutorizacion || l.precioAutorizado },
  { clave: 'obs',      resp: 'Administración', check: l => !l.tieneObs || l.obsVerificada },
  { clave: 'destino',  resp: 'Ventas',         check: l => !!l.estrategia },
  { clave: 'mods',     resp: 'Administración', check: l => !l.modPendiente },
];

// estrategia → efectos operativos (idempotentes, uno por tipo)
const EFECTOS = {
  stock: ['reserva_inventario'],
  fabricacion_interna: ['orden_produccion'],
  fabricacion_tercerizada: ['orden_produccion_terc'],
  compra: ['necesidad_compra'],
  mixta: ['reserva_inventario', 'necesidad_compra'],
};
function cumplimientoDe(efectos) {
  const r = efectos.includes('reserva_inventario'), c = efectos.includes('necesidad_compra');
  if (r && c) return 'mixto';
  if (r) return 'reservada';
  if (c) return 'en_compra';
  if (efectos.some(e => e.startsWith('orden_produccion'))) return 'en_produccion';
  return 'sin_iniciar';
}

// ---------- Motor -----------------------------------------------------
function nuevoCtx() {
  const eventos = [], evidencia = [], registry = new Map();
  return { eventos, evidencia, registry, emit(evento, payload = {}) { eventos.push({ evento, payload }); } };
}

function evalChecks(defs, obj, ctx, sobre, disparadoPor, actorEvento) {
  return defs.map(c => {
    const ok = c.check(obj);
    const det = c.detalle ? c.detalle(obj) : {};
    ctx.evidencia.push({
      sobre, regla: c.clave, versionRegla: RV, resultado: ok, responsable: c.resp,
      esperado: det.esperado, valor: det.valor, disparadoPor, actor: actorEvento || 'sistema', evaluadoEn: ahora(),
    });
    return { clave: c.clave, resp: c.resp, ok };
  });
}

// Transición comercial de la orden, centralizada.
function transicionOrden(o, ctx, disparadoPor) {
  if (['cerrada', 'cancelada'].includes(o.estadoComercial)) return;
  const rO = evalChecks(COND_ORDEN, o, ctx, 'orden', disparadoPor);
  const ordenOk = rO.every(c => c.ok);
  const hayTrabajo = o.lineas.some(l => l.objetosOperativos.length > 0);

  if (ordenOk) {
    if (o.estadoComercial !== 'confirmada') { o.estadoComercial = 'confirmada'; ctx.emit('orden.confirmada', { orden: o.id }); }
    return;
  }
  // No cumple:
  if (o.estadoComercial === 'confirmada') {
    if (hayTrabajo) {
      // Ya hay trabajo operativo → NO vuelve solo: impacto + acción requerida.
      const causa = rO.find(c => !c.ok && c.clave !== 'sin_bloqueos_orden')?.clave || 'condicion';
      if (!o.bloqueos.some(b => b.motivo === 'reversion'))
        o.bloqueos.push({ alcance: 'orden', motivo: 'reversion', clave: causa, resp: 'Dirección', activo: true });
      ctx.emit('impacto.detectado', { orden: o.id, lineas: o.lineas.filter(l => l.objetosOperativos.length).map(l => l.id), causa });
      ctx.emit('accion.requerida', { orden: o.id, tipoAccion: 'cancelacion_o_modificacion' });
    } else {
      // Sin trabajo → vuelve a A confirmar automáticamente.
      o.estadoComercial = 'a_confirmar';
      ctx.emit('orden.a_confirmar', { orden: o.id, falta: rO.filter(c => !c.ok).map(c => c.clave) });
    }
  } else if (o.estadoComercial === 'borrador') {
    o.estadoComercial = 'a_confirmar';
  }
}

function evaluar(o, ctx, disparadoPor = 'manual') {
  transicionOrden(o, ctx, disparadoPor);
  const ordenBloqueada = o.bloqueos.some(b => b.motivo === 'reversion');
  for (const l of o.lineas) {
    if (l.habilitacion === 'liberada') continue;      // reversión se maneja a nivel orden
    if (ordenBloqueada) continue;                     // orden frenada: no liberar más
    const rL = evalChecks(COND_LINEA, l, ctx, 'linea:' + l.id, disparadoPor);
    const lineaOk = rL.every(c => c.ok);
    if (o.estadoComercial === 'confirmada' && lineaOk) {
      l.habilitacion = 'liberada'; l.bloqueos = [];
      ctx.emit('linea.liberada', { linea: l.id });
      generarEfectos(o, l, ctx);
    } else {
      l.habilitacion = 'bloqueada';
      l.bloqueos = rL.filter(c => !c.ok).map(c => ({ alcance: 'liberacion', clave: c.clave, resp: c.resp }));
    }
  }
}

function generarEfectos(o, l, ctx) {
  const efectos = EFECTOS[l.estrategia] || ['pendiente_decision'];
  for (const ef of efectos) {
    const key = `${o.id}:${l.id}:v${o.version}:${ef}`;
    if (ctx.registry.has(key)) continue;             // ← idempotencia por tipo de efecto
    const obj = { tipoObjeto: ef, ref: { orden: o.id, linea: l.id, version: o.version } };
    l.objetosOperativos.push(obj);
    ctx.registry.set(key, obj);
    ctx.emit('objetoOperativo.creado', { linea: l.id, tipoObjeto: ef, estrategia: l.estrategia });
  }
  l.cumplimiento = cumplimientoDe(efectos);
}

function registrarCobro(o, cobro, ctx) {
  o.cobros.push(cobro);
  ctx.emit('cobro.registrado', { monto: cobro.monto, estado: cobro.estado }); // Tesorería, siempre
  evaluar(o, ctx, 'cobro.registrado');
}
function anularPago(o, ctx) {
  o.cobros.forEach(c => (c.estado = 'anulado'));
  ctx.emit('pago.anulado', {});
  evaluar(o, ctx, 'pago.anulado'); // la transición central decide impacto vs. volver a A confirmar
}

// ---------- Impresión -------------------------------------------------
const linea = (t = '') => console.log(t);
function trace(ctx) { ctx.eventos.forEach(e => linea('    • ' + e.evento + '  ' + JSON.stringify(e.payload))); }
function estado(o) {
  linea(`    Orden ${o.id}: ${o.estadoComercial.toUpperCase()}` + (o.bloqueos.length ? `  ⛔orden:${o.bloqueos.map(b => b.clave).join(',')}` : ''));
  o.lineas.forEach(l => linea(`      ├─ ${l.id} (${l.tipo}): ${l.habilitacion}/${l.cumplimiento}` +
    (l.objetosOperativos.length ? ` → ${l.objetosOperativos.map(x => x.tipoObjeto).join(' + ')}` : '') +
    (l.bloqueos.length ? `  ⛔ ${l.bloqueos.map(b => b.clave + '/' + b.alcance).join(', ')}` : '')));
}
function mkLinea(x) { return { habilitacion: 'pendiente', cumplimiento: 'sin_iniciar', bloqueos: [], objetosOperativos: [], ...x }; }
function mkOrden(x) { return { estadoComercial: 'borrador', version: 1, cobros: [], bloqueos: [], ...x }; }

// =====================================================================
linea('\n══════ CASO 1 · Orden completamente liberada ══════');
{
  const o = mkOrden({ id: 'OV-2020-0040', total: 1000000, cliente: { tel: '1155550001' }, vendedor: 'Ale', local: '2020', termino: 'efectivo', cotizacionAceptada: true, lineas: [
    mkLinea({ id: 'L1', tipo: 'estándar', producto: 'Cómoda Amberes', destinoPreliminar: 'stock', estrategia: 'stock' }),
    mkLinea({ id: 'L2', tipo: 'a fabricar', producto: 'Placard Oliver', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereMedida: true, medidaConfirmada: true }),
  ] });
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 300000, estado: 'validado' }, ctx);
  linea('  Eventos:'); trace(ctx); linea('  Estado final:'); estado(o);
  const a = ctx.registry.size; evaluar(o, ctx); evaluar(o, ctx);
  linea(`  Idempotencia: ${a} efectos, tras 2 reevaluaciones = ${ctx.registry.size}  ${a === ctx.registry.size ? '✓' : '✗'}`);
}

linea('\n══════ CASO 2 · Confirmada, parcialmente liberada ══════');
{
  const o = mkOrden({ id: 'OV-2020-0041', total: 1500000, cliente: { ig: '@laura' }, vendedor: 'Cristian', local: '2299', termino: 'efectivo', cotizacionAceptada: true, lineas: [
    mkLinea({ id: 'L1', tipo: 'estándar', producto: 'Cómoda Amberes', destinoPreliminar: 'stock', estrategia: 'stock' }),
    mkLinea({ id: 'L2', tipo: 'a fabricar', producto: 'Placard Oliver', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna' }),
    mkLinea({ id: 'L3', tipo: 'a medida', producto: 'Mesa a medida', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereAutorizacion: true, precioAutorizado: false, tieneObs: true, obsVerificada: false }),
  ] });
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 450000, estado: 'validado' }, ctx);
  linea('  Tras la seña:'); estado(o);
  linea('  → L3 BLOQUEADA (falta autorización). La orden igual quedó CONFIRMADA.');
  const L3 = o.lineas.find(l => l.id === 'L3'); L3.precioAutorizado = true; L3.obsVerificada = true;
  ctx.emit('autorizacion.aprobada', { linea: 'L3', resp: 'Administración' });
  evaluar(o, ctx, 'autorizacion.aprobada');
  linea('  Tras autorizar L3:'); estado(o);
}

linea('\n══════ CASO 3 · Seña revocada con trabajo ya generado ══════');
{
  const o = mkOrden({ id: 'OV-2020-0042', total: 800000, cliente: { tel: '1155559999' }, vendedor: 'Sergio', local: '2020', termino: 'transferencia', cotizacionAceptada: true, lineas: [
    mkLinea({ id: 'L1', tipo: 'a fabricar', producto: 'Vajillero Nórdico', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna' }),
  ] });
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 240000, estado: 'validado' }, ctx);
  linea('  Tras la seña:'); estado(o);
  anularPago(o, ctx);
  linea('  Tras anular el pago:'); estado(o);
  linea('  Eventos:'); trace(ctx);
  const ev = ctx.evidencia.filter(e => e.regla === 'sena').pop();
  linea('  Evidencia (última de la regla "sena"): ' + JSON.stringify({ regla: ev.regla, v: ev.versionRegla, esperado: ev.esperado, valor: ev.valor, resultado: ev.resultado, disparadoPor: ev.disparadoPor }));
  linea('  → No desibera en silencio: impacto + acción requerida.');
}

linea('\n══════ CASO 4 · Estrategia MIXTA (reserva + compra sin duplicar) ══════');
{
  const o = mkOrden({ id: 'OV-2020-0043', total: 600000, cliente: { tel: '1155551234' }, vendedor: 'Nati', local: '2020', termino: 'efectivo', cotizacionAceptada: true, lineas: [
    mkLinea({ id: 'L1', tipo: 'a fabricar', producto: 'Modular Boston (stock parcial)', destinoPreliminar: 'mixto', estrategia: 'mixta' }),
  ] });
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 180000, estado: 'validado' }, ctx);
  linea('  Estado:'); estado(o);
  const a = ctx.registry.size; evaluar(o, ctx); evaluar(o, ctx);
  linea('  Efectos de la línea mixta: ' + o.lineas[0].objetosOperativos.map(x => x.tipoObjeto).join(' + '));
  linea(`  Idempotencia: ${a} efectos, tras 2 reevaluaciones = ${ctx.registry.size}  ${a === ctx.registry.size ? '✓' : '✗'}  (2 efectos, no duplicados)`);
}

linea('\n══════ CASO 5 · Pierde condición ANTES de generar trabajo → vuelve a A confirmar ══════');
{
  const o = mkOrden({ id: 'OV-2020-0044', total: 500000, cliente: { tel: '1155555678' }, vendedor: 'Ale', local: '2299', termino: 'efectivo', cotizacionAceptada: true, lineas: [
    // única línea, bloqueada por autorización → la orden confirma pero NO genera trabajo
    mkLinea({ id: 'L1', tipo: 'a medida', producto: 'Escritorio a medida', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereAutorizacion: true, precioAutorizado: false }),
  ] });
  const ctx = nuevoCtx();
  registrarCobro(o, { monto: 150000, estado: 'validado' }, ctx);
  linea('  Tras la seña (confirmada, sin trabajo — L1 bloqueada):'); estado(o);
  anularPago(o, ctx);
  linea('  Tras anular el pago:'); estado(o);
  linea('  Eventos:'); trace(ctx);
  linea('  → Sin trabajo operativo, la orden vuelve sola a A CONFIRMAR (sin impacto).');
}

linea('\n(Motor v2 — endurecido para casos reales antes de construir la interfaz.)');
