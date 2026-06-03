import { useState } from 'react'
import { nuevoId } from '../lib/storage.js'

export default function Proveedores({ proveedores, onCambiar }) {
  const [nombre, setNombre] = useState('')
  const [cupo, setCupo] = useState('')
  const [error, setError] = useState('')

  function agregar(e) {
    e.preventDefault()
    setError('')
    const n = nombre.trim()
    if (!n) return setError('Poné un nombre.')
    if (proveedores.some((p) => p.nombre.toLowerCase() === n.toLowerCase())) {
      return setError('Ya existe un proveedor con ese nombre.')
    }
    onCambiar([...proveedores, { id: nuevoId('p'), nombre: n, cupoSemanal: Number(cupo || 0), activo: true }])
    setNombre('')
    setCupo('')
  }

  function actualizar(id, campos) {
    onCambiar(proveedores.map((p) => (p.id === id ? { ...p, ...campos } : p)))
  }

  return (
    <div className="card">
      <h2>👷 Proveedores</h2>
      <form className="filters" onSubmit={agregar} style={{ marginBottom: 16 }}>
        <label className="field">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nuevo proveedor" />
        </label>
        <label className="field">
          Cupo semanal <span className="hint">(opcional)</span>
          <input type="number" min="0" value={cupo} onChange={(e) => setCupo(e.target.value)} placeholder="0" />
        </label>
        <button type="submit" className="btn btn-primary">Agregar</button>
      </form>
      {error && <div className="error-msg" style={{ marginBottom: 10 }}>⚠️ {error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="left">Proveedor</th>
              <th>Cupo semanal</th>
              <th className="left">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                <td className="left"><strong>{p.nombre}</strong></td>
                <td>
                  <input
                    type="number" min="0" value={p.cupoSemanal ?? 0}
                    onChange={(e) => actualizar(p.id, { cupoSemanal: Number(e.target.value || 0) })}
                    style={{ width: 90, textAlign: 'right' }}
                  />
                </td>
                <td className="left">{p.activo ? '✅ Activo' : '⛔ Inactivo'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => actualizar(p.id, { activo: !p.activo })}>
                    {p.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Dar de baja no borra el historial: las entregas viejas se siguen viendo en los reportes.</p>
    </div>
  )
}
