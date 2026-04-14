import { useState, useEffect } from 'react'
import MapView from './mapView' 
import './App.css'

const IconoPartida = () => <svg viewBox="0 0 512 512" width="14" height="14" fill="#666"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 136v160c0 13.3 10.7 24 24 24s24-10.7 24-24V136c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>;
const IconoDestino = () => <svg viewBox="0 0 384 512" width="14" height="14" fill="#0a73e8"><path d="M172.3 501.7C27 291 0 269.4 0 192 0 86 86 0 192 0s192 86 192 192c0 77.4-27 99-172.3 309.7-9.5 13.8-29.9 13.8-39.4 0zM192 272a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>;
const IconoBloqueo = () => <svg viewBox="0 0 512 512" width="14" height="14" fill="#ff4444"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zm32 224a32 32 0 1 1 -64 0 32 32 0 1 1 64 0z"/></svg>;

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [bloqueos, setBloqueos] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [modoReporte, setModoReporte] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/inicializar_mapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: 20.6719, lon: -103.3488, radio: 5000 }), 
    }).catch(() => console.log("Revisa que el Backend esté encendido."));
  }, []);

  const calcularRuta = async (tempO = origen, tempD = destino) => {
    if (!tempO || !tempD) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origen: { lat: tempO.lat, lon: tempO.lon }, 
          destino: { lat: tempD.lat, lon: tempD.lon } 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setRuta(data.puntos.map(p => [p.lat, p.lon]));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reportarBloqueo = async (punto) => {
    setBloqueos(prev => [...prev, punto]); // Círculo instantáneo
    setModoReporte(false); 

    try {
      const res = await fetch("http://127.0.0.1:8000/reportar_bloqueo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: punto.lat, lon: punto.lon }),
      });
      if (res.ok && origen && destino) calcularRuta(); // Recalcular con el bloqueo
    } catch (err) {
      console.error("Error al sincronizar bloqueo:", err);
    }
  };

  return (
    <div className="app-container">
      <div className="controls-wrapper">
        <div className="search-panel-left">
          <div className="search-bar-core">
            <div className="input-box"><IconoPartida /><input placeholder="Origen..." readOnly value={origen ? "Fijado" : ""} /></div>
            <div className="v-sep"></div>
            <div className="input-box"><IconoDestino /><input placeholder="Destino..." readOnly value={destino ? "Fijado" : ""} /></div>
            <button className="go-btn" onClick={() => calcularRuta()}>{loading ? "..." : "→"}</button>
          </div>
        </div>
        <div className="categories-panel-right">
          <button className={`cat-chip ${modoReporte ? 'active-report' : ''}`} onClick={() => setModoReporte(!modoReporte)}>
            <IconoBloqueo /> <span>{modoReporte ? "Toca la calle" : "Bloquear"}</span>
          </button>
          <button className="cat-chip" onClick={() => { setOrigen(null); setDestino(null); setRuta(null); setBloqueos([]); }}>Reset</button>
        </div>
      </div>
      <div className="map-wrapper">
        <MapView 
          origen={origen} destino={destino} setOrigen={setOrigen} setDestino={setDestino} 
          ruta={ruta} setRuta={setRuta} bloqueos={bloqueos} modoReporte={modoReporte} onReportar={reportarBloqueo}
        />
      </div>
    </div>
  )
}
export default App;