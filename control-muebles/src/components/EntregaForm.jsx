import { useState } from 'react'
import { sinDetalle, hoyISO } from '../lib/calc.js'
import { nuevoId } from '../lib/storage.js'

const VACIA = {
  proveedor: '',
  lugar: '',
  fechaSolicitud: '',
  fechaEntrega: hoyISO(),
  total: '',
  devueltos: '',
  detChicos: '',
  detGrandes: '',
  nota: '',
}

export default function EntregaForm({ proveedores, inicial, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial ? { ...VACIA, ...inicial } : VACIA)
  const [error, setError] = useState('')
  const esEdicion = Boolean(inicial)

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }))

  const sd = sinDetalle({
    total: Number(f.total || 0),
    devueltos: Number(f.devueltos || 0),
    detChicos: Number(f.detChicos || 0),
    detGrandes: Number(f.detGrandes || 0),
  })

  function guardar(e) {
    e.preventDefault()
    setError('')
    if (!f.proveedor) return setError('Elegí un proveedor.')
    if (!f.fechaEntrega) return setError('Poné la fecha de entrega.')
    const total = Number(f.total || 0)
    const dev = Number(f.devueltos || 0)
    const dc = Number(f.detChicos || 0)
    const dg = Number(f.detGrandes || 0)
    if (total <= 0) return setError('El total que trajo tiene que ser mayor a 0.')
    if (dev + dc + dg > total) {
      return setError(`Devueltos + detalles (${dev + dc + dg}) no puede superar el total que trajo (${total}).`)
    }
    const registro = {
      id: inicial?.id || nuevoId('e'),
      proveedor: f.proveedor,
      lugar: f.lugar.trim(),
      fechaSolicitud: f.fechaSolicitud || '',
      fechaEntrega: f.fechaEntrega,
      total,
      devueltos: dev,
      detChicos: dc,
      detGrandes: dg,
      nota: f.nota.trim(),
    }
    onGuardar(registro)
    if (!esEdicion) setF({ ...VACIA, fechaEntrega: f.fechaEntrega, proveedor: f.proveedor })
  }

  const activos = proveedores.filter((p) => p.activo)

  return (
    <form className="card" onSubmit={guardar}>
      <h2>{esEdicion ? '✏️ Editar entrega' : '➕ Cargar entrega'}</h2>
      <div className="form-grid">
        <label className="field">
          Proveedor
          <select value={f.proveedor} onChange={set('proveedor')}>
            <option value="">— elegir —</option>
            {activos.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
            {/* por si edito una entrega de un proveedor ya dado de baja */}
            {f.proveedor && !activos.some((p) => p.nombre === f.proveedor) && (
              <option value={f.proveedor}>{f.proveedor}</option>
            )}
          </select>
        </label>

        <label className="field">
          Lugar / sucursal
          <input value={f.lugar} onChange={set('lugar')} placeholder="Depósito, local…" />
        </label>

        <label className="field">
          Fecha de solicitud <span className="hint">(opcional)</span>
          <input type="date" value={f.fechaSolicitud} onChange={set('fechaSolicitud')} />
        </label>

        <label className="field">
          Fecha de entrega
          <input type="date" value={f.fechaEntrega} onChange={set('fechaEntrega')} />
        </label>

        <label className="field">
          Total que trajo
          <input type="number" min="0" value={f.total} onChange={set('total')} placeholder="0" />
        </label>

        <label className="field">
          Devueltos
          <input type="number" min="0" value={f.devueltos} onChange={set('devueltos')} placeholder="0" />
        </label>

        <label className="field">
          Detalles chicos <span className="hint">(arregla en fábrica)</span>
          <input type="number" min="0" value={f.detChicos} onChange={set('detChicos')} placeholder="0" />
        </label>

        <label className="field">
          Detalles grandes
          <input type="number" min="0" value={f.detGrandes} onChange={set('detGrandes')} placeholder="0" />
        </label>
      </div>

      <div className="calc-box" style={{ marginTop: 14 }}>
        <span>✅ Sin detalle (calculado solo)</span>
        <span className="big">{sd}</span>
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      <div className="row-actions" style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary">
          {esEdicion ? 'Guardar cambios' : 'Agregar entrega'}
        </button>
        {esEdicion && (
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        )}
      </div>
    </form>
  )
}
