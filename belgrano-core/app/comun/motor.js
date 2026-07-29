// =====================================================================
//  Belgrano Soft · Motor de transiciones (Core)
//  Declarativo · idempotente · reversible · con evidencia. Mismo motor
//  validado en docs/simulacion-ventas.mjs. La UI solo muestra y dispara
//  eventos; las reglas viven acá.
// =====================================================================
(function (global) {
  const RV = 1;
  const ahora = () => new Date().toISOString();

  function senaVal(o) {
    const pagado = pagosValidados(o);
    const valor = o.total ? +(pagado / o.total).toFixed(2) : 0;
    const exc = (o.excepciones || []).find(e => e.regla === 'sena_fabricacion');
    if (exc) return { ok: true, esperado: 0.30, valor, excepcion: true, autorizadaPor: exc.autorizadaPor };
    return { ok: pagado >= o.total * 0.30, esperado: 0.30, valor };
  }
  const pagosValidados = o => o.cobros.filter(c => c.estado === 'validado').reduce((a, c) => a + c.monto, 0);
  const saldo = o => o.total - pagosValidados(o);
  const requiereFabricacion = l => ['fabricacion_interna', 'fabricacion_tercerizada'].includes(l.estrategia);

  const COND_ORDEN = [
    { clave: 'cliente',            label: 'Cliente identificado',        resp: 'Vendedor',       check: o => !!(o.cliente?.tel || o.cliente?.ig || o.cliente?.mail) },
    { clave: 'vend_local',         label: 'Vendedor y local',            resp: 'Vendedor',       check: o => !!o.vendedor && !!o.local },
    { clave: 'pago',               label: 'Condición de pago',           resp: 'Vendedor',       check: o => !!o.termino },
    { clave: 'aceptada',           label: 'Cotización aceptada',         resp: 'Vendedor',       check: o => o.cotizacionAceptada && o.version != null },
    { clave: 'lineas_valid',       label: 'Líneas comerciales válidas',  resp: 'Vendedor',       check: o => o.lineas.length > 0 && o.lineas.every(l => l.producto && l.destinoPreliminar) },
    { clave: 'sin_bloqueos_orden', label: 'Sin bloqueos de orden',       resp: 'Administración', check: o => !o.bloqueos.some(b => b.alcance === 'orden' && b.activo !== false) },
  ];
  const COND_LINEA = [
    { clave: 'producto',         label: 'Producto completo',          resp: 'Vendedor',            check: l => !!l.producto },
    { clave: 'medida',           label: 'Variante y medida',          resp: 'Vendedor',            check: l => !l.requiereMedida || l.medidaConfirmada },
    { clave: 'precio',           label: 'Precio autorizado',          resp: 'Administración',      check: l => !l.requiereAutorizacion || l.precioAutorizado },
    { clave: 'obs',              label: 'Observaciones verificadas',  resp: 'Administración',      check: l => !l.tieneObs || l.obsVerificada },
    { clave: 'destino',          label: 'Estrategia/destino',         resp: 'Ventas',              check: l => !!l.estrategia },
    { clave: 'mods',             label: 'Modificaciones resueltas',   resp: 'Administración',      check: l => !l.modPendiente },
    { clave: 'sena_fabricacion', label: 'Seña 30% (fabricación)',     resp: 'Tesorería/Dirección', check: (l, o) => !requiereFabricacion(l) || senaVal(o).ok, detalle: (l, o) => senaVal(o) },
  ];
  const BLOQUEO_INFO = {
    sena_fabricacion: { alcance: 'fabricacion', motivo: 'La fabricación requiere una seña mínima del 30%.', acciones: ['registrar_pago', 'solicitar_autorizacion'] },
  };
  const EFECTOS = {
    stock: ['reserva_inventario'], fabricacion_interna: ['orden_produccion'],
    fabricacion_tercerizada: ['orden_produccion_terc'], compra: ['necesidad_compra'],
    mixta: ['reserva_inventario', 'necesidad_compra'],
  };
  const ETIQUETA_EFECTO = {
    reserva_inventario: 'Reserva de inventario', orden_produccion: 'Orden de producción',
    orden_produccion_terc: 'Producción tercerizada', necesidad_compra: 'Necesidad de compra', pendiente_decision: 'Pendiente de decisión',
  };
  function cumplimientoDe(efectos) {
    const r = efectos.includes('reserva_inventario'), c = efectos.includes('necesidad_compra');
    if (r && c) return 'mixto'; if (r) return 'reservada'; if (c) return 'en_compra';
    if (efectos.some(e => e.startsWith('orden_produccion'))) return 'en_produccion';
    return 'sin_iniciar';
  }

  function nuevoCtx() {
    const eventos = [], evidencia = [], registry = new Map();
    return { eventos, evidencia, registry, emit(evento, payload = {}) { eventos.push({ evento, payload, en: ahora() }); } };
  }
  function evalChecks(defs, obj, ctx, sobre, disparadoPor, orden) {
    return defs.map(c => {
      const ok = c.check(obj, orden);
      const det = c.detalle ? c.detalle(obj, orden) : {};
      ctx && ctx.evidencia.push({ sobre, regla: c.clave, versionRegla: RV, resultado: ok, responsable: c.resp,
        esperado: det.esperado, valor: det.valor, excepcion: det.excepcion, autorizadaPor: det.autorizadaPor, disparadoPor, evaluadoEn: ahora() });
      return { clave: c.clave, label: c.label, resp: c.resp, ok };
    });
  }
  function transicionOrden(o, ctx, disparadoPor) {
    if (['cerrada', 'cancelada'].includes(o.estadoComercial)) return;
    const rO = evalChecks(COND_ORDEN, o, ctx, 'orden', disparadoPor, o);
    const ordenOk = rO.every(c => c.ok);
    const hayTrabajo = o.lineas.some(l => l.objetosOperativos.length > 0);
    if (ordenOk) { if (o.estadoComercial !== 'confirmada') { o.estadoComercial = 'confirmada'; ctx.emit('orden.confirmada', { orden: o.id }); } return; }
    if (o.estadoComercial === 'confirmada') {
      if (hayTrabajo) {
        const causa = rO.find(c => !c.ok && c.clave !== 'sin_bloqueos_orden')?.clave || 'condicion';
        if (!o.bloqueos.some(b => b.motivo === 'reversion')) o.bloqueos.push({ alcance: 'orden', motivo: 'reversion', clave: causa, resp: 'Dirección', activo: true });
        ctx.emit('impacto.detectado', { orden: o.id, causa }); ctx.emit('accion.requerida', { orden: o.id, tipoAccion: 'cancelacion_o_modificacion' });
      } else { o.estadoComercial = 'a_confirmar'; ctx.emit('orden.a_confirmar', { orden: o.id, falta: rO.filter(c => !c.ok).map(c => c.clave) }); }
    } else if (o.estadoComercial === 'borrador') { o.estadoComercial = 'a_confirmar'; }
  }
  function evaluar(o, ctx, disparadoPor = 'manual') {
    transicionOrden(o, ctx, disparadoPor);
    const ordenBloqueada = o.bloqueos.some(b => b.motivo === 'reversion');
    for (const l of o.lineas) {
      const rL = evalChecks(COND_LINEA, l, ctx, 'linea:' + l.id, disparadoPor, o);
      const lineaOk = rL.every(c => c.ok);
      if (l.habilitacion === 'liberada') {
        if (!lineaOk && l.objetosOperativos.length && !l.bloqueos.some(b => b.motivo === 'reversion')) {
          const causa = rL.find(c => !c.ok)?.clave || 'condicion';
          l.bloqueos.push({ alcance: 'linea', motivo: 'reversion', clave: causa, resp: 'Dirección', accion: 'cancelar o modificar' });
          ctx.emit('impacto.detectado', { linea: l.id, causa }); ctx.emit('accion.requerida', { linea: l.id, tipoAccion: 'cancelacion_o_modificacion' });
        }
        continue;
      }
      if (ordenBloqueada) continue;
      if (o.estadoComercial === 'confirmada' && lineaOk) {
        l.habilitacion = 'liberada'; l.bloqueos = []; ctx.emit('linea.liberada', { linea: l.id }); generarEfectos(o, l, ctx);
      } else {
        l.habilitacion = 'bloqueada';
        l.bloqueos = rL.filter(c => !c.ok).map(c => ({ clave: c.clave, resp: c.resp, ...(BLOQUEO_INFO[c.clave] || { alcance: 'liberacion' }) }));
      }
    }
  }
  function generarEfectos(o, l, ctx) {
    const efectos = EFECTOS[l.estrategia] || ['pendiente_decision'];
    for (const ef of efectos) {
      const key = `${o.id}:${l.id}:v${o.version}:${ef}`;
      if (ctx.registry.has(key)) continue;
      const obj = { tipoObjeto: ef, ref: { orden: o.id, linea: l.id, version: o.version } };
      l.objetosOperativos.push(obj); ctx.registry.set(key, obj);
      ctx.emit('objetoOperativo.creado', { linea: l.id, tipoObjeto: ef });
    }
    l.cumplimiento = cumplimientoDe(efectos);
  }
  function registrarCobro(o, cobro, ctx) { o.cobros.push(cobro); ctx.emit('cobro.registrado', { monto: cobro.monto, estado: cobro.estado }); evaluar(o, ctx, 'cobro.registrado'); }
  function solicitarExcepcion(o, regla, d, ctx) { o.solicitudes.push({ regla, ...d, estado: 'pendiente', responsable: 'Dirección', fecha: ahora() }); ctx.emit('autorizacion.requerida', { regla, ...d, responsable: 'Dirección' }); }
  function autorizarExcepcion(o, regla, d, ctx) {
    const sol = o.solicitudes.find(s => s.regla === regla && s.estado === 'pendiente'); if (sol) sol.estado = 'aprobada';
    const sv = regla === 'sena_fabricacion' ? senaVal(o) : {};
    o.excepciones.push({ regla, esperado: sv.esperado, valorReal: sv.valor, autorizadaPor: d.autorizadaPor, motivo: sol?.motivo, fecha: ahora() });
    ctx.emit('excepcion.autorizada', { regla, autorizadaPor: d.autorizadaPor }); evaluar(o, ctx, 'excepcion.autorizada');
  }

  function mkLinea(x) { return { habilitacion: 'pendiente', cumplimiento: 'sin_iniciar', bloqueos: [], objetosOperativos: [], ...x }; }
  function mkOrden(x) { return { estadoComercial: 'borrador', version: 1, cobros: [], bloqueos: [], excepciones: [], solicitudes: [], ...x }; }

  // Orden demo tipo OV-2048 (mezcla: reservada · en producción · bloqueada).
  function ordenDemo() {
    const o = mkOrden({ id: 'OV-2020-2048', total: 1200000, termino: 'efectivo', vendedor: 'Ale', local: '2020', canal: 'Instagram', cotizacionAceptada: true,
      cliente: { nombre: 'Laura Pérez', tel: '11 5555-2048', ig: '@lau.perez', dir: 'Av. Cabildo 2450' }, lineas: [
      mkLinea({ id: 'L1', tipo: 'estándar', producto: 'Cómoda Amberes 1.20', destinoPreliminar: 'stock', estrategia: 'stock', precio: 425750 }),
      mkLinea({ id: 'L2', tipo: 'a fabricar', producto: 'Mesa Noruega', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereMedida: true, medidaConfirmada: true, precio: 380000 }),
      mkLinea({ id: 'L3', tipo: 'a medida', producto: 'Placard Oliver a medida', destinoPreliminar: 'fabrica', estrategia: 'fabricacion_interna', requiereAutorizacion: true, precioAutorizado: false, tieneObs: true, obsVerificada: false, precio: 394250 }),
    ] });
    const ctx = nuevoCtx();
    registrarCobro(o, { monto: 360000, estado: 'validado' }, ctx); // 30%
    return { o, ctx };
  }

  global.Motor = {
    COND_ORDEN, COND_LINEA, ETIQUETA_EFECTO, senaVal, saldo, pagosValidados, requiereFabricacion,
    nuevoCtx, evaluar, evalChecks, registrarCobro, solicitarExcepcion, autorizarExcepcion, ordenDemo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
