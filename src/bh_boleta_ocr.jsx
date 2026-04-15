import React, { useState, useRef } from 'react';

const PRODUCTOS_VALIDOS = [
  'COMODAS', 'MESAS DE LUZ', 'SILLAS', 'CAMAS', 'PLACARD', 'MUEBLE DE TV',
  'ESCRITORIOS', 'BIBLIOTECAS', 'VAJILLEROS', 'APARADORES', 'MODULARES',
  'MESAS', 'MESAS RATONAS', 'RESPALDOS', 'BOTINEROS', 'RECIBIDORES',
  'SILLONES', 'ALZADA', 'SIN COTIZACION'
];

const COMO_NOS_CONOCIO = ['CAMINANDO', 'NO ANOTO', 'WEB', 'IG', 'CLIENTE RECURRENTE', 'OTROS'];
const VENDEDORES = ['SERGIO', 'ALE', 'CRISTIAN', 'BRIAN', 'NATI'];
const LOCALES = ['2299', '2020'];

export default function BHBoletaOCR() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setDatos(null);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const procesarBoleta = async () => {
    if (!imageBase64) return;
    
    setLoading(true);
    setError(null);
    
    const fechaHoy = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).replace(/\//g, '/');

    const prompt = `Sos un sistema de extracción de datos de boletas de presupuesto de Belgrano Home, una mueblería argentina.

Extraé los siguientes campos de esta boleta manuscrita y devolvé SOLO un JSON válido sin markdown ni explicaciones:

{
  "numero_boleta": "número de la boleta",
  "nombre_cliente": "nombre del cliente",
  "celular": "número sin guiones ni espacios, solo dígitos",
  "como_nos_conocio": "debe ser uno de: CAMINANDO, NO ANOTO, WEB, IG, CLIENTE RECURRENTE, OTROS",
  "local": "2299 o 2020",
  "vendedor": "debe ser uno de: SERGIO, ALE, CRISTIAN, BRIAN, NATI",
  "productos": [
    {"nombre": "NOMBRE EN MAYUSCULAS", "monto": 0},
    ...hasta 4 productos máximo
  ]
}

Reglas:
- Si el producto coincide con alguno de esta lista, usá el nombre exacto: ${PRODUCTOS_VALIDOS.join(', ')}
- Si el producto NO coincide claramente, poné "A CONFIRMAR: [lo que dice la boleta]"
- Si dice "sin cotización" o similar, el producto es "SIN COTIZACION" y monto 0
- Si no hay celular, dejá el campo como string vacío ""
- Los montos son números sin puntos ni comas (ej: 1300000)
- Si "cómo nos conoció" no está claro o no está, poné "NO ANOTO"
- Extraé el local (2299 o 2020) y el vendedor de la boleta

Respondé SOLO el JSON, nada más.`;

    try {
      const response = await fetch('/api/process',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64
                  }
                },
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const jsonText = data.content[0].text.replace(/```json|```/g, '').trim();
      const extracted = JSON.parse(jsonText);
      
      // Calcular campos derivados
      const montoTotal = extracted.productos.reduce((sum, p) => sum + (p.monto || 0), 0);
      const tieneCelular = extracted.celular && extracted.celular.trim() !== '';
      const estado = tieneCelular ? 'EN SEGUIMIENTO' : 'RECHAZADO';
      
      // Detectar productos a confirmar
      const productosConFlag = extracted.productos.map(p => ({
        ...p,
        aConfirmar: p.nombre.startsWith('A CONFIRMAR') || !PRODUCTOS_VALIDOS.includes(p.nombre.toUpperCase())
      }));

      setDatos({
        ...extracted,
        fecha: fechaHoy,
        productos: productosConFlag,
        monto_total: montoTotal,
        estado: estado,
        contactado_por_brian: ''
      });

    } catch (err) {
      setError('Error al procesar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarParaExcel = () => {
    if (!datos) return;
    
    // Formato: CONTACTADO POR BRIAN | CELULAR | ESTADO | MES | LOCAL | VENDEDOR | N° BOLETA | FECHA | NOMBRE CLIENTE | COMO NOS CONOCIO | PRODUCTO 1 | MONTO 1 | PRODUCTO 2 | MONTO 2 | PRODUCTO 3 | MONTO 3 | PRODUCTO 4 | MONTO 4 | MONTO TOTAL
    const mes = new Date().toLocaleDateString('es-AR', { month: 'long' }).toLowerCase();
    
    const fila = [
      datos.contactado_por_brian,
      datos.celular,
      datos.estado,
      mes,
      datos.local,
      datos.vendedor,
      datos.numero_boleta,
      datos.fecha,
      datos.nombre_cliente,
      datos.como_nos_conocio,
      datos.productos[0]?.nombre || '',
      datos.productos[0]?.monto || '',
      datos.productos[1]?.nombre || '',
      datos.productos[1]?.monto || '',
      datos.productos[2]?.nombre || '',
      datos.productos[2]?.monto || '',
      datos.productos[3]?.nombre || '',
      datos.productos[3]?.monto || '',
      datos.monto_total
    ].join('\t');

    navigator.clipboard.writeText(fila);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actualizarCampo = (campo, valor) => {
    setDatos(prev => {
      const nuevo = { ...prev, [campo]: valor };
      
      // Recalcular estado si cambia celular
      if (campo === 'celular') {
        nuevo.estado = valor && valor.trim() !== '' ? 'EN SEGUIMIENTO' : 'RECHAZADO';
      }
      
      return nuevo;
    });
  };

  const actualizarProducto = (index, campo, valor) => {
    setDatos(prev => {
      const productos = [...prev.productos];
      productos[index] = { ...productos[index], [campo]: campo === 'monto' ? Number(valor) || 0 : valor };
      
      // Si se selecciona un producto válido, quitar el flag
      if (campo === 'nombre' && PRODUCTOS_VALIDOS.includes(valor)) {
        productos[index].aConfirmar = false;
      }
      
      const monto_total = productos.reduce((sum, p) => sum + (p.monto || 0), 0);
      return { ...prev, productos, monto_total };
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#f5f5f5',
      fontFamily: "'DM Sans', sans-serif",
      padding: '24px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        input, select {
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          color: #f5f5f5;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          width: 100%;
          font-family: inherit;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #c9a227;
        }
        
        .field-warning {
          background: #3d3520 !important;
          border-color: #c9a227 !important;
        }
        
        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #c9a227 0%, #a68523 100%);
          color: #1a1a1a;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #2a2a2a;
          color: #f5f5f5;
          border: 1px solid #3a3a3a;
        }
        
        .btn-secondary:hover {
          background: #3a3a3a;
        }
        
        .tag {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .tag-seguimiento {
          background: #1e3a2f;
          color: #4ade80;
        }
        
        .tag-rechazado {
          background: #3a1e1e;
          color: #f87171;
        }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #c9a227 0%, #e8d48b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            BH Boleta Scanner
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            Subí la foto de la boleta y extraé los datos automáticamente
          </p>
        </div>

        {/* Upload area */}
        <div style={{
          border: '2px dashed #3a3a3a',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          backgroundColor: '#222'
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#c9a227'; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = '#3a3a3a'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = '#3a3a3a';
          const file = e.dataTransfer.files[0];
          if (file) {
            setImage(URL.createObjectURL(file));
            setDatos(null);
            const reader = new FileReader();
            reader.onload = () => setImageBase64(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          }
        }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          {image ? (
            <img src={image} alt="Boleta" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
              <p style={{ color: '#888', marginBottom: '8px' }}>Arrastrá la foto o hacé click para seleccionar</p>
              <p style={{ color: '#666', fontSize: '12px' }}>JPG, PNG</p>
            </>
          )}
        </div>

        {/* Process button */}
        {image && !datos && (
          <button
            className="btn btn-primary"
            onClick={procesarBoleta}
            disabled={loading}
            style={{ width: '100%', marginBottom: '24px' }}
          >
            {loading ? 'Procesando...' : 'Extraer datos de la boleta'}
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#3a1e1e',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#f87171'
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {datos && (
          <div style={{
            background: '#222',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Datos extraídos</h2>
              <span className={`tag ${datos.estado === 'EN SEGUIMIENTO' ? 'tag-seguimiento' : 'tag-rechazado'}`}>
                {datos.estado}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>N° Boleta</label>
                <input
                  value={datos.numero_boleta}
                  onChange={(e) => actualizarCampo('numero_boleta', e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Fecha</label>
                <input value={datos.fecha} readOnly style={{ opacity: 0.7 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Local</label>
                <select value={datos.local} onChange={(e) => actualizarCampo('local', e.target.value)}>
                  {LOCALES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Vendedor</label>
                <select value={datos.vendedor} onChange={(e) => actualizarCampo('vendedor', e.target.value)}>
                  {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Cliente</label>
                <input
                  value={datos.nombre_cliente}
                  onChange={(e) => actualizarCampo('nombre_cliente', e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>Celular</label>
                <input
                  value={datos.celular}
                  onChange={(e) => actualizarCampo('celular', e.target.value)}
                  placeholder="Sin celular = RECHAZADO"
                  className={!datos.celular ? 'field-warning' : ''}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>¿Cómo nos conoció?</label>
                <select value={datos.como_nos_conocio} onChange={(e) => actualizarCampo('como_nos_conocio', e.target.value)}>
                  {COMO_NOS_CONOCIO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Productos */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Productos</label>
              {datos.productos.map((prod, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <select
                    value={prod.nombre}
                    onChange={(e) => actualizarProducto(i, 'nombre', e.target.value)}
                    className={prod.aConfirmar ? 'field-warning' : ''}
                  >
                    {prod.aConfirmar && <option value={prod.nombre}>{prod.nombre}</option>}
                    {PRODUCTOS_VALIDOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    type="number"
                    value={prod.monto}
                    onChange={(e) => actualizarProducto(i, 'monto', e.target.value)}
                    placeholder="Monto"
                  />
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: '#1a1a1a',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <span style={{ fontWeight: '600' }}>Monto Total</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#c9a227' }}>
                ${datos.monto_total.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={copiarParaExcel}
                style={{ flex: 1 }}
              >
                {copied ? '✓ Copiado!' : 'Copiar fila para Excel'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setImage(null);
                  setImageBase64(null);
                  setDatos(null);
                  fileInputRef.current.value = '';
                }}
              >
                Nueva boleta
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!datos && (
          <div style={{
            background: '#222',
            borderRadius: '12px',
            padding: '20px',
            fontSize: '13px',
            color: '#888'
          }}>
            <strong style={{ color: '#f5f5f5' }}>¿Cómo funciona?</strong>
            <ol style={{ marginTop: '12px', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Subí la foto de la boleta</li>
              <li>La IA extrae: cliente, celular, vendedor, local, productos y montos</li>
              <li>Revisá y corregí si hace falta (los campos amarillos necesitan confirmación)</li>
              <li>Copiá la fila y pegala directo en la planilla</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
