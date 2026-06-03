import { useMemo, useState } from 'react'
import { formatFecha, sinDetalle, claveMes, nombreMes, pct } from '../lib/calc.js'

export default function Entregas({ entregas, proveedores, onEditar, onBorrar }) {
  const [fProv, setFProv] = useState('')
  const [fMes, setFMes] = useState('')

  const meses = useMemo(() => {
    const s = new Set(entregas.map((e) => claveMes(e.fechaEntrega)).filter(Boolean))
    return [...s].sort().reverse()
  }, [entregas])

  const filtradas = useMemo(() => {
    return entregas
      .filter((e) => (!fProv || e.proveedor === fProv))
      .filter((e) => (!fMes || claveMes(e.fechaEntrega) === fMes))
      .sort((a, b) => (a.fechaEntrega < b.fechaEntrega ? 1 : -1))
  }, [entregas, fProv, fMes])

  return (
    <div className="card">
      <div className="section-title">
        <h2>📋 Entregas cargadas</h2>
        <span className="muted">{filtradas.length} de {entregas.length}</span>
      </div>

      <div className="filters" style={{ marginBottom: 14 }}>
        <label className="field">
          Proveedor
          <select value={fProv} onChange={(e) => setFProv(e.target.value)}>
            <option value="">Todos</option>
            {proveedores.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="field">
          Mes
          <select value={fMes} onChange={(e) => setFMes(e.target.value)}>
            <option value="">Todos</option>
            {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
          </select>
        </label>
      </div>

      {filtradas.length === 0 ? (
        <div className="empty">
          <div className="big">🛋️</div>
          {entregas.length === 0 ? 'Todavía no cargaste ninguna entrega.' : 'No hay entregas con esos filtros.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Entrega</th>
                <th className="left">Proveedor</th>
                <th className="left">Lugar</th>
                <th>Solicitud</th>
                <th>Total</th>
                <th>Devueltos</th>
                <th>Det. chicos</th>
                <th>Det. grandes</th>
                <th>Sin detalle</th>
                <th>% calidad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => {
                const sd = sinDetalle(e)
                const p = pct(sd, e.total)
                return (
                  <tr key={e.id}>
                    <td className="left">{formatFecha(e.fechaEntrega)}</td>
                    <td className="left"><strong>{e.proveedor}</strong></td>
                    <td className="left">{e.lugar || '—'}</td>
                    <td>{e.fechaSolicitud ? formatFecha(e.fechaSolicitud) : '—'}</td>
                    <td>{e.total}</td>
                    <td>{e.devueltos}</td>
                    <td>{e.detChicos}</td>
                    <td>{e.detGrandes}</td>
                    <td><strong>{sd}</strong></td>
                    <td>{p}%</td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEditar(e)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          if (confirm(`¿Borrar la entrega de ${e.proveedor} del ${formatFecha(e.fechaEntrega)}?`)) onBorrar(e.id)
                        }}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
