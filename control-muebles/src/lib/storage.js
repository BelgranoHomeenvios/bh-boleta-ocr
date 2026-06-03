// Capa de datos. Por ahora guarda en el navegador (localStorage).
// Está aislada acá para que mañana podamos cambiarla por una base de datos
// en la nube sin tocar el resto de la app.

const ENTREGAS_KEY = 'cm_entregas_v1'
const PROVEEDORES_KEY = 'cm_proveedores_v1'

// Proveedores que ya venías usando, con su cupo semanal.
const PROVEEDORES_INICIALES = [
  { id: 'p_tony', nombre: 'Tony', cupoSemanal: 60, activo: true },
  { id: 'p_mati', nombre: 'Mati', cupoSemanal: 30, activo: true },
  { id: 'p_raul', nombre: 'Raúl', cupoSemanal: 20, activo: true },
  { id: 'p_luciano', nombre: 'Luciano', cupoSemanal: 20, activo: true },
  { id: 'p_leandro', nombre: 'Leandro', cupoSemanal: 15, activo: true },
  { id: 'p_enrique', nombre: 'Enrique', cupoSemanal: 0, activo: true },
]

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function nuevoId(prefijo = 'e') {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// ---------- Proveedores ----------
export function getProveedores() {
  const existentes = read(PROVEEDORES_KEY, null)
  if (!existentes) {
    write(PROVEEDORES_KEY, PROVEEDORES_INICIALES)
    return PROVEEDORES_INICIALES
  }
  return existentes
}

export function saveProveedores(lista) {
  write(PROVEEDORES_KEY, lista)
  return lista
}

// ---------- Entregas ----------
export function getEntregas() {
  return read(ENTREGAS_KEY, [])
}

export function saveEntregas(lista) {
  write(ENTREGAS_KEY, lista)
  return lista
}

// ---------- Backup ----------
export function exportarTodo() {
  return {
    version: 1,
    exportadoEn: new Date().toISOString(),
    proveedores: getProveedores(),
    entregas: getEntregas(),
  }
}

export function importarTodo(data) {
  if (!data || typeof data !== 'object') throw new Error('Archivo inválido')
  if (Array.isArray(data.proveedores)) write(PROVEEDORES_KEY, data.proveedores)
  if (Array.isArray(data.entregas)) write(ENTREGAS_KEY, data.entregas)
}
