import { useEffect, useRef, useState } from 'react'
import EntregaForm from './components/EntregaForm.jsx'
import Entregas from './components/Entregas.jsx'
import Dashboard from './components/Dashboard.jsx'
import Proveedores from './components/Proveedores.jsx'
import {
  getEntregas, saveEntregas, getProveedores, saveProveedores,
  exportarTodo, importarTodo,
} from './lib/storage.js'

const TABS = [
  { id: 'tablero', label: '📊 Tablero' },
  { id: 'cargar', label: '➕ Cargar' },
  { id: 'entregas', label: '📋 Entregas' },
  { id: 'proveedores', label: '👷 Proveedores' },
]

export default function App() {
  const [tab, setTab] = useState('tablero')
  const [entregas, setEntregas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [editando, setEditando] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    setEntregas(getEntregas())
    setProveedores(getProveedores())
  }, [])

  function persistirEntregas(lista) {
    setEntregas(lista)
    saveEntregas(lista)
  }
  function persistirProveedores(lista) {
    setProveedores(lista)
    saveProveedores(lista)
  }

  function guardarEntrega(reg) {
    const existe = entregas.some((e) => e.id === reg.id)
    const lista = existe ? entregas.map((e) => (e.id === reg.id ? reg : e)) : [...entregas, reg]
    persistirEntregas(lista)
    if (editando) {
      setEditando(null)
      setTab('entregas')
    }
  }

  function borrarEntrega(id) {
    persistirEntregas(entregas.filter((e) => e.id !== id))
  }

  function editarEntrega(e) {
    setEditando(e)
    setTab('cargar')
  }

  function descargarBackup() {
    const data = exportarTodo()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-muebles-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function subirBackup(ev) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!confirm('Esto reemplaza los datos actuales por los del archivo. ¿Continuar?')) return
        importarTodo(data)
        setEntregas(getEntregas())
        setProveedores(getProveedores())
        alert('Backup importado correctamente.')
      } catch {
        alert('No pude leer el archivo. ¿Es un backup válido?')
      }
    }
    reader.readAsText(file)
    ev.target.value = ''
  }

  return (
    <>
      <header className="app-header">
        <div className="wrap">
          <span className="logo">🛋️</span>
          <div>
            <h1>Control de Muebles</h1>
            <div className="sub">Belgrano Home Envíos · calidad de proveedores</div>
          </div>
          <span className="spacer" />
          <div className="row-actions">
            <button className="btn btn-ghost btn-sm" onClick={descargarBackup}>⬇️ Backup</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>⬆️ Importar</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={subirBackup} />
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); if (t.id !== 'cargar') setEditando(null) }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {tab === 'tablero' && <Dashboard entregas={entregas} proveedores={proveedores} />}
        {tab === 'cargar' && (
          <EntregaForm
            proveedores={proveedores}
            inicial={editando}
            onGuardar={guardarEntrega}
            onCancelar={() => { setEditando(null); setTab('entregas') }}
          />
        )}
        {tab === 'entregas' && (
          <Entregas entregas={entregas} proveedores={proveedores} onEditar={editarEntrega} onBorrar={borrarEntrega} />
        )}
        {tab === 'proveedores' && <Proveedores proveedores={proveedores} onCambiar={persistirProveedores} />}
      </main>
    </>
  )
}
