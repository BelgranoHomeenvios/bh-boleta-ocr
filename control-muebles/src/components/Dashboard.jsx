import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts'
import {
  resumir, pct, indiceCalidad, nivelCalidad, agrupar,
  claveSemana, etiquetaSemana, claveMes, nombreMes,
} from '../lib/calc.js'

const COLORS = { sinDetalle: '#16a34a', detChicos: '#ca8a04', detGrandes: '#ea580c', devueltos: '#dc2626' }

function Delta({ valor, invertir }) {
  // invertir = true cuando "menos es mejor" (detalles, devueltos)
  if (valor === null || valor === undefined) return <div className="delta flat">— sin período previo</div>
  const mejora = invertir ? valor < 0 : valor > 0
  const igual = valor === 0
  const cls = igual ? 'flat' : mejora ? 'up' : 'down'
  const flecha = igual ? '→' : valor > 0 ? '▲' : '▼'
  return <div className={`delta ${cls}`}>{flecha} {Math.abs(valor).toFixed(1)} pts vs período anterior</div>
}

export default function Dashboard({ entregas, proveedores }) {
  const [periodo, setPeriodo] = useState('mensual') // 'semanal' | 'mensual'
  const [prov, setProv] = useState('')

  const filtradas = useMemo(
    () => entregas.filter((e) => !prov || e.proveedor === prov),
    [entregas, prov],
  )

  // Serie de períodos ordenada cronológicamente.
  const serie = useMemo(() => {
    const fnClave = periodo === 'semanal'
      ? (e) => claveSemana(e.fechaEntrega)
      : (e) => claveMes(e.fechaEntrega)
    const fnEtiqueta = periodo === 'semanal' ? etiquetaSemana : nombreMes
    const mapa = agrupar(filtradas, fnClave)
    return [...mapa.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([clave, items]) => {
        const r = resumir(items)
        return {
          clave,
          etiqueta: fnEtiqueta(clave),
          r,
          pctSin: pct(r.sinDetalle, r.total),
          pctChicos: pct(r.detChicos, r.total),
          pctGrandes: pct(r.detGrandes, r.total),
          pctDev: pct(r.devueltos, r.total),
          indice: indiceCalidad(r),
        }
      })
  }, [filtradas, periodo])

  const ultimo = serie[serie.length - 1]
  const previo = serie[serie.length - 2]
  const delta = (campo) => (ultimo && previo ? ultimo[campo] - previo[campo] : null)

  // Ranking de proveedores (siempre sobre todos, ignora el filtro de proveedor).
  const ranking = useMemo(() => {
    const mapa = agrupar(entregas, (e) => e.proveedor)
    return [...mapa.entries()]
      .map(([nombre, items]) => {
        const r = resumir(items)
        return { nombre, r, pctSin: pct(r.sinDetalle, r.total), indice: indiceCalidad(r) }
      })
      .sort((a, b) => b.indice - a.indice)
  }, [entregas])

  if (entregas.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <div className="big">📊</div>
          Cargá tu primera entrega y acá vas a ver la calidad, la tendencia y el ranking de proveedores.
        </div>
      </div>
    )
  }

  const dataComposicion = serie.map((p) => ({
    name: p.etiqueta,
    'Sin detalle': p.r.sinDetalle,
    'Det. chicos': p.r.detChicos,
    'Det. grandes': p.r.detGrandes,
    'Devueltos': p.r.devueltos,
  }))

  return (
    <>
      <div className="card">
        <div className="section-title">
          <h2>📊 Tablero de calidad</h2>
          <div className="toolbar">
            <div className="pill-group">
              <button className={periodo === 'semanal' ? 'active' : ''} onClick={() => setPeriodo('semanal')}>Semanal</button>
              <button className={periodo === 'mensual' ? 'active' : ''} onClick={() => setPeriodo('mensual')}>Mensual</button>
            </div>
            <select value={prov} onChange={(e) => setProv(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          {ultimo
            ? <>Último período: <strong>{ultimo.etiqueta}</strong>{prov ? <> · {prov}</> : ''}</>
            : 'Sin datos en este período.'}
        </p>

        {ultimo && (
          <div className="grid grid-stats">
            <div className="stat">
              <div className="label">Total que trajo</div>
              <div className="value">{ultimo.r.total}</div>
              <Delta valor={previo ? ultimo.r.total - previo.r.total : null} />
            </div>
            <div className="stat">
              <div className="label">Sin detalle</div>
              <div className="value">{ultimo.pctSin}<small>%</small></div>
              <Delta valor={delta('pctSin')} />
            </div>
            <div className="stat">
              <div className="label">Con detalles</div>
              <div className="value">{(ultimo.pctChicos + ultimo.pctGrandes).toFixed(1)}<small>%</small></div>
              <Delta valor={previo ? (ultimo.pctChicos + ultimo.pctGrandes) - (previo.pctChicos + previo.pctGrandes) : null} invertir />
            </div>
            <div className="stat">
              <div className="label">Devueltos</div>
              <div className="value">{ultimo.pctDev}<small>%</small></div>
              <Delta valor={delta('pctDev')} invertir />
            </div>
            <div className="stat">
              <div className="label">Índice de calidad</div>
              <div className="value">{ultimo.indice}<small>/100</small></div>
              <Delta valor={delta('indice')} />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tendencia de calidad (% sin detalle)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={serie.map((p) => ({ name: p.etiqueta, 'Sin detalle %': p.pctSin, 'Devueltos %': p.pctDev }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Sin detalle %" stroke={COLORS.sinDetalle} strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Devueltos %" stroke={COLORS.devueltos} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="muted">Subir la línea verde = mejor calidad. Bajar la roja = menos devoluciones.</p>
      </div>

      <div className="card">
        <h3>Composición por período (cantidad de muebles)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataComposicion}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sin detalle" stackId="a" fill={COLORS.sinDetalle} />
            <Bar dataKey="Det. chicos" stackId="a" fill={COLORS.detChicos} />
            <Bar dataKey="Det. grandes" stackId="a" fill={COLORS.detGrandes} />
            <Bar dataKey="Devueltos" stackId="a" fill={COLORS.devueltos} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>🏆 Ranking de proveedores (todo el historial)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">#</th>
                <th className="left">Proveedor</th>
                <th>Total traído</th>
                <th>% sin detalle</th>
                <th className="left">Calidad</th>
                <th>Índice</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => {
                const nivel = nivelCalidad(p.pctSin)
                return (
                  <tr key={p.nombre}>
                    <td className="left">{i + 1}</td>
                    <td className="left"><strong>{p.nombre}</strong></td>
                    <td>{p.r.total}</td>
                    <td>{p.pctSin}%</td>
                    <td className="left"><span className={`badge ${nivel.clase}`}>Calidad {nivel.letra}</span></td>
                    <td><strong>{p.indice}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: COLORS.sinDetalle }} /> Sin detalle</span>
          <span><span className="dot" style={{ background: COLORS.detChicos }} /> Det. chicos</span>
          <span><span className="dot" style={{ background: COLORS.detGrandes }} /> Det. grandes</span>
          <span><span className="dot" style={{ background: COLORS.devueltos }} /> Devueltos</span>
        </div>
      </div>
    </>
  )
}
