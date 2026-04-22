import { useState, useEffect } from 'react'
import MapView from './mapView' 
import './App.css'

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutas, setRutas] = useState(null); 
  // Cambiamos el valor inicial para que coincida con una llave válida
  const [seleccion, setSeleccion] = useState('mas_rapida'); 
  const [bloqueos, setBloqueos] = useState([]); 
  const [modoReporte, setModoReporte] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8001/inicializar_mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: 20.6274, lon: -103.2425 }), 
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
      console.log("Rutas actualizadas en estado:", data.rutas);
      setRutas(data.rutas);
    } catch (e) {
      console.error("Error conectando con el servidor", e);
    }
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
    <div className="app-container">
      <div className="controls-wrapper">
        <div className="search-panel-left">
          <div className="search-bar-core">
            <input placeholder="Origen" readOnly value={origen ? "📍 Origen" : ""} />
            <input placeholder="Destino" readOnly value={destino ? "🚩 Destino" : ""} />
            <button className="go-btn" onClick={calcularRuta}>→</button>
          </div>
        </div>
        <div className="categories-panel-right">
          <button className={`cat-chip ${modoReporte ? 'active-report' : ''}`} onClick={() => setModoReporte(!modoReporte)}>Bloquear</button>
          <button className="cat-chip" onClick={() => { setOrigen(null); setDestino(null); setRutas(null); setBloqueos([]); }}>Reset</button>
        </div>
      </div>

      {rutas && (
        <div className="ruta-legend">
          <div className={`legend-item ${seleccion === 'mas_rapida' ? 'active' : ''}`} 
               onClick={() => setSeleccion('mas_rapida')}>
            <span className="dot dot-blue"></span> Rápida
          </div>
          
          <div className={`legend-item ${seleccion === 'segura_prioritaria' ? 'active' : ''}`} 
               onClick={() => setSeleccion('segura_prioritaria')}>
            <span className="dot dot-green"></span> Segura
          </div>

          <div className={`legend-item ${seleccion === 'mas_corta' ? 'active' : ''}`} 
               onClick={() => setSeleccion('mas_corta')}>
            <span className="dot dot-gray"></span> Flujo / Corta
          </div>
        </div>
      )}

      <div className="map-wrapper">
        <MapView 
          origen={origen} 
          destino={destino} 
          setOrigen={setOrigen} 
          setDestino={setDestino} 
          // Pasamos la ruta usando la nueva selección
          ruta={rutas ? rutas[seleccion] : null} 
          colorRuta={seleccion === 'mas_rapida' ? '#1a73e8' : seleccion === 'segura_prioritaria' ? '#2e7d32' : '#555555'}
          bloqueos={bloqueos} 
          modoReporte={modoReporte} 
          onReportar={reportarBloqueo}
          seleccionActual={seleccion}
        />
      </div>
    </div>
  )
}
export default App;