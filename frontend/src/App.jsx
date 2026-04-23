import { useState, useEffect } from 'react'
import MapView from './MapView' // <- Cambio a PascalCase por convención de React
import './App.css'

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutas, setRutas] = useState(null); 
  const [seleccion, setSeleccion] = useState('mas_rapida'); 
  const [bloqueos, setBloqueos] = useState([]); 
  const [modoReporte, setModoReporte] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/inicializar_mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Coordenadas iniciales cerca del centro de la ZMG
      body: JSON.stringify({ lat: 20.6596, lon: -103.3496 }), 
    });
  }, []);

  const calcularRuta = async () => {
    if (!origen || !destino) return;
    try {
      const res = await fetch("http://127.0.0.1:8001/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, destino }),
      });
      const data = await res.json();
      setRutas(data.rutas);
    } catch (e) { console.error("Error en servidor:", e); }
  };

  const reportarBloqueo = async (p) => {
    setBloqueos(prev => [...prev, p]);
    setModoReporte(false);
    await fetch("http://127.0.0.1:8001/reportar_bloqueo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (origen && destino) calcularRuta();
  };

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div className="logo">SMART-<span>EVACUATION-ROUTING</span></div>
        <div className="top-actions">
          <button className="calc-btn" onClick={calcularRuta}>Calcular Trayectorias</button>
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
              🚫 Reportar Bloqueo
            </button>
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
            seleccionActual={seleccion}
          />
        </main>
      </div>
    </div>
  )
}
export default App;