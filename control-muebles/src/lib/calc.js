// Cálculos de fechas (semanas/meses) y de calidad.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Las fechas se guardan como 'YYYY-MM-DD'. Las parseamos en horario local
// para evitar corrimientos de día por zona horaria.
export function parseFecha(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatFecha(iso) {
  const d = parseFecha(iso)
  if (!d) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Clave de mes: 'YYYY-MM'
export function claveMes(iso) {
  if (!iso) return ''
  return iso.slice(0, 7)
}

export function nombreMes(claveMes) {
  if (!claveMes) return ''
  const [y, m] = claveMes.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}

// Lunes de la semana de una fecha dada.
function lunesDe(date) {
  const d = new Date(date)
  const dia = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - dia)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Clave de semana = lunes en ISO. Devuelve también etiqueta amigable.
export function claveSemana(iso) {
  const d = parseFecha(iso)
  if (!d) return ''
  return toISO(lunesDe(d))
}

export function etiquetaSemana(claveSemanaISO) {
  const lunes = parseFecha(claveSemanaISO)
  if (!lunes) return ''
  const domingo = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  const f = (x) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`
  return `${f(lunes)} al ${f(domingo)}`
}

// ---------- Calidad ----------

// Calcula los "sin detalle" de una entrega.
export function sinDetalle(e) {
  const v = Number(e.total || 0) - Number(e.devueltos || 0) - Number(e.detChicos || 0) - Number(e.detGrandes || 0)
  return Math.max(0, v)
}

// Suma un conjunto de entregas en totales.
export function resumir(entregas) {
  const r = { total: 0, devueltos: 0, detChicos: 0, detGrandes: 0, sinDetalle: 0, cantEntregas: entregas.length }
  for (const e of entregas) {
    r.total += Number(e.total || 0)
    r.devueltos += Number(e.devueltos || 0)
    r.detChicos += Number(e.detChicos || 0)
    r.detGrandes += Number(e.detGrandes || 0)
    r.sinDetalle += sinDetalle(e)
  }
  return r
}

export function pct(parte, total) {
  if (!total) return 0
  return Math.round((parte / total) * 1000) / 10 // 1 decimal
}

// Índice de calidad 0-100: sin detalle vale 100, det chico 50, det grande y
// devuelto 0. Da un número único para rankear y comparar evolución.
export function indiceCalidad(r) {
  if (!r.total) return 0
  const puntos = r.sinDetalle * 100 + r.detChicos * 50
  return Math.round((puntos / r.total) * 10) / 10
}

// Etiqueta de calidad según % sin detalle (configurable a futuro).
export function nivelCalidad(pctSinDetalle) {
  if (pctSinDetalle >= 70) return { letra: 'A', clase: 'q-a' }
  if (pctSinDetalle >= 50) return { letra: 'B', clase: 'q-b' }
  if (pctSinDetalle >= 30) return { letra: 'C', clase: 'q-c' }
  return { letra: 'D', clase: 'q-d' }
}

// Agrupa entregas por una función de clave.
export function agrupar(entregas, fnClave) {
  const mapa = new Map()
  for (const e of entregas) {
    const k = fnClave(e)
    if (!k) continue
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(e)
  }
  return mapa
}

export { MESES }
