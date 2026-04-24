import { useState, useEffect } from 'react'
import MapView from './MapView'
import './App.css'

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutas, setRutas] = useState(null); 
  const [seleccion, setSeleccion] = useState('mas_rapida'); 
  const [bloqueos, setBloqueos] = useState([]); 
  const [modoReporte, setModoReporte] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Estado para saber qué tipo de incidente reportaremos
  const [tipoReporte, setTipoReporte] = useState('bloqueo');

  const calcularRuta = async () => {
    if (!origen || !destino) return;
    setCargando(true); 
    try {
      const res = await fetch("http://127.0.0.1:8001/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, destino }),
      });
      const data = await res.json();
      setRutas(data.rutas);
    } catch (e) { 
      console.error("Error en servidor:", e); 
    } finally {
      setCargando(false); 
    }
  };

  const reportarBloqueo = async (p) => {
    const nuevoBloqueo = {
      ...p,
      id: Date.now(),
      timestamp: Date.now(),
      tipo: tipoReporte // Guardamos el tipo que eligió el usuario en el submenú
    };

    setBloqueos(prev => [...prev, nuevoBloqueo]);

    try {
      await fetch("http://127.0.0.1:8001/reportar_bloqueo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoBloqueo),
      });
      if (origen && destino) calcularRuta();
    } catch (error) {
      console.error("Error al reportar el bloqueo:", error);
    }
  };

  const eliminarBloqueo = async (id) => {
    setBloqueos(prev => prev.filter(b => b.id !== id));
    try {
      await fetch(`http://127.0.0.1:8001/eliminar_bloqueo/${id}`, { method: 'DELETE' });
      if (origen && destino) calcularRuta(); 
    } catch (error) {
      console.error("Error al eliminar el bloqueo:", error);
    }
  };

  useEffect(() => {
    const TIEMPO_VIDA_MS = 300000; // 5 minutos de vida para cada reporte

    const intervalo = setInterval(() => {
      const ahora = Date.now();
      setBloqueos(prev => {
        const vigentes = [];
        const caducados = [];
        
        prev.forEach(b => {
          if (ahora - b.timestamp < TIEMPO_VIDA_MS) vigentes.push(b);
          else caducados.push(b);
        });

        if (caducados.length > 0) {
          caducados.forEach(b => {
            fetch(`http://127.0.0.1:8001/eliminar_bloqueo/${b.id}`, { method: 'DELETE' })
              .catch(console.error);
          });
          if (origen && destino) calcularRuta();
        }
        return vigentes; 
      });
    }, 5000); 

    return () => clearInterval(intervalo);
  }, [origen, destino]); 

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div className="logo">SMART-<span>EVACUATION-ROUTING</span></div>
        <div className="top-actions">
          <button 
            className="calc-btn" 
            onClick={calcularRuta}
            disabled={cargando}
            style={{ opacity: cargando ? 0.7 : 1, cursor: cargando ? 'wait' : 'pointer' }}
          >
            {cargando ? '⏳ Calculando...' : 'Calcular Trayectorias'}
          </button>
          <button className="reset-btn" onClick={() => window.location.reload()}>Refrescar Sistema</button>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <section className="sidebar-section">
            <p className="section-label">PUNTOS DE CONTROL</p>
            <div className="widget-grid">
              <div className={`widget-card ${origen ? 'complete' : ''}`}>
                <span className="icon">📍</span>
                <label>Punto Origen</label>
              </div>
              <div className={`widget-card ${destino ? 'complete' : ''}`}>
                <span className="icon">🚩</span>
                <label>Punto Destino</label>
              </div>
            </div>
          </section>

          <section className="sidebar-section">
            <p className="section-label">ACCIONES TÁCTICAS</p>
            <button 
              className={`action-button ${modoReporte ? 'danger-mode' : ''}`} 
              onClick={() => setModoReporte(!modoReporte)}
            >
              {modoReporte ? '❌ Cancelar Modo Reporte' : '🚨 Iniciar Reporte'}
            </button>

            {/* Submenú de opciones de reporte */}
            {modoReporte && (
              <div className="report-type-selector">
                <p className="micro-label">Selecciona el tipo de incidente:</p>
                <div className="type-grid">
                  <button className={`type-btn ${tipoReporte === 'bloqueo' ? 'active' : ''}`} onClick={() => setTipoReporte('bloqueo')}>🚫 Cierre</button>
                  <button className={`type-btn ${tipoReporte === 'accidente' ? 'active' : ''}`} onClick={() => setTipoReporte('accidente')}>⚠️ Choque</button>
                  <button className={`type-btn ${tipoReporte === 'obras' ? 'active' : ''}`} onClick={() => setTipoReporte('obras')}>🚧 Obras</button>
                  <button className={`type-btn ${tipoReporte === 'evento' ? 'active' : ''}`} onClick={() => setTipoReporte('evento')}>🏢 Evento</button>
                </div>
                <p className="help-text">👉 Haz clic en el mapa para fijar el reporte</p>
              </div>
            )}
          </section>

          {rutas && (
            <section className="sidebar-section">
              <p className="section-label">MODOS DE EVACUACIÓN</p>
              <div className="route-list">
                <button className={`route-item ${seleccion === 'mas_rapida' ? 'active-blue' : ''}`} onClick={() => setSeleccion('mas_rapida')}>
                  <span className="indicator blue"></span> Ruta Más Rápida
                </button>
                <button className={`route-item ${seleccion === 'segura_prioritaria' ? 'active-green' : ''}`} onClick={() => setSeleccion('segura_prioritaria')}>
                  <span className="indicator green"></span> Ruta Segura (Zonas Bajas)
                </button>
                <button className={`route-item ${seleccion === 'mas_corta' ? 'active-gray' : ''}`} onClick={() => setSeleccion('mas_corta')}>
                  <span className="indicator gray"></span> Máximo Flujo Vehicular
                </button>
              </div>
            </section>
          )}
        </aside>

        <main className="map-view-container">
          <MapView 
            origen={origen} 
            destino={destino} 
            setOrigen={setOrigen} 
            setDestino={setDestino} 
            ruta={rutas ? rutas[seleccion] : null} 
            colorRuta={seleccion === 'mas_rapida' ? '#1a73e8' : seleccion === 'segura_prioritaria' ? '#2e7d32' : '#555555'}
            bloqueos={bloqueos} 
            modoReporte={modoReporte} 
            onReportar={reportarBloqueo}
            onEliminarBloqueo={eliminarBloqueo}
            seleccionActual={seleccion}
          />
        </main>
      </div>
    </div>
  )
}

export default App;