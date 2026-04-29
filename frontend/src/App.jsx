import { useState, useEffect } from 'react'
import MapView from './mapView'
import './App.css'

const BACKEND_URL = `http://${window.location.hostname}:8001`;

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutas, setRutas] = useState(null); 
  const [seleccion, setSeleccion] = useState('mas_rapida'); 
  const [bloqueos, setBloqueos] = useState([]); 
  const [modoReporte, setModoReporte] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('bloqueo');

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización.");
      return;
    }
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setOrigen({ lat: posicion.coords.latitude, lon: posicion.coords.longitude });
        setCargando(false);
      },
      (error) => {
        console.error("Error de GPS:", error);
        alert("No se pudo obtener la ubicación. Verifica tu GPS.");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const calcularRuta = async () => {
    if (!origen || !destino) return;
    setCargando(true); 
    try {
      const res = await fetch(`${BACKEND_URL}/ruta`, {
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
      tipo: tipoReporte
    };
    setBloqueos(prev => [...prev, nuevoBloqueo]);
    try {
      await fetch(`${BACKEND_URL}/reportar_bloqueo`, {
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
      await fetch(`${BACKEND_URL}/eliminar_bloqueo/${id}`, { method: 'DELETE' });
      if (origen && destino) calcularRuta(); 
    } catch (error) {
      console.error("Error al eliminar el bloqueo:", error);
    }
  };

  useEffect(() => {
    const TIEMPO_VIDA_MS = 300000; 
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
            fetch(`${BACKEND_URL}/eliminar_bloqueo/${b.id}`, { method: 'DELETE' }).catch(console.error);
          });
          if (origen && destino) calcularRuta();
        }
        return vigentes; 
      });
    }, 5000); 
    return () => clearInterval(intervalo);
  }, [origen, destino]); 

  return (
    <div className="app-container">
      <div className="map-layer">
        <MapView 
          origen={origen} 
          destino={destino} 
          setOrigen={setOrigen} 
          setDestino={setDestino} 
          ruta={rutas ? rutas[seleccion] : null} 
          colorRuta={seleccion === 'mas_rapida' ? '#2563eb' : seleccion === 'segura_prioritaria' ? '#16a34a' : '#52525b'}
          bloqueos={bloqueos} 
          modoReporte={modoReporte} 
          onReportar={reportarBloqueo}
          onEliminarBloqueo={eliminarBloqueo}
          seleccionActual={seleccion}
        />
      </div>

      <div className="ui-layer">
        
        <header className="floating-header">
          <div className="logo-compact">🚨 <span>Smart</span>Evacuation</div>
          <button className="icon-btn" onClick={() => window.location.reload()} title="Refrescar">🔄</button>
        </header>

        <div className="bottom-panel">
          
          <div className="routing-card">
            <div className="route-inputs">
              <div className="input-row">
                <span className="dot blue"></span>
                <div className="input-text">
                  <small>Origen</small>
                  <span>{origen ? `${origen.lat.toFixed(4)}, ${origen.lon.toFixed(4)}` : 'Buscando satélite o manual...'}</span>
                </div>
                <button className="gps-btn" onClick={obtenerUbicacionGPS} title="Usar GPS">🎯</button>
              </div>
              <div className="divider"></div>
              <div className="input-row">
                <span className="dot red"></span>
                <div className="input-text">
                  <small>Destino</small>
                  <span>{destino ? `${destino.lat.toFixed(4)}, ${destino.lon.toFixed(4)}` : 'Haz clic en el mapa'}</span>
                </div>
              </div>
            </div>

            <button 
              className={`calc-btn-full ${!origen || !destino ? 'disabled' : ''}`}
              onClick={calcularRuta}
              disabled={cargando || !origen || !destino}
            >
              {cargando ? 'Calculando...' : 'Calcular Trayectoria'}
            </button>
          </div>

          {rutas && (
            <div className="route-options">
              <button className={`chip ${seleccion === 'mas_rapida' ? 'active-blue' : ''}`} onClick={() => setSeleccion('mas_rapida')}>
                ⚡ Rápida
              </button>
              <button className={`chip ${seleccion === 'segura_prioritaria' ? 'active-green' : ''}`} onClick={() => setSeleccion('segura_prioritaria')}>
                🛡️ Segura
              </button>
              <button className={`chip ${seleccion === 'mas_corta' ? 'active-gray' : ''}`} onClick={() => setSeleccion('mas_corta')}>
                🛣️ Flujo
              </button>
            </div>
          )}

          <div className="report-card">
            <button 
              className={`report-trigger ${modoReporte ? 'active-danger' : ''}`} 
              onClick={() => setModoReporte(!modoReporte)}
            >
              {modoReporte ? 'Cancelar Reporte' : '⚠️ Reportar Incidente'}
            </button>

            {modoReporte && (
              <div className="report-tools">
                <small>Selecciona y toca el mapa:</small>
                {/* AQUI ESTÁN LOS 4 BOTONES RESTAURADOS */}
                <div className="report-chips">
                  <button className={`chip-r ${tipoReporte === 'bloqueo' ? 'active' : ''}`} onClick={() => setTipoReporte('bloqueo')}>🚫 Cierre</button>
                  <button className={`chip-r ${tipoReporte === 'accidente' ? 'active' : ''}`} onClick={() => setTipoReporte('accidente')}>⚠️ Choque</button>
                  <button className={`chip-r ${tipoReporte === 'obras' ? 'active' : ''}`} onClick={() => setTipoReporte('obras')}>🚧 Obras</button>
                  <button className={`chip-r ${tipoReporte === 'evento' ? 'active' : ''}`} onClick={() => setTipoReporte('evento')}>🏢 Evento</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default App;