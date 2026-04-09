import { useState, useCallback, useEffect } from 'react' // IMPORTANTE: Se agregó useEffect
import MapView from './mapView' 
import './App.css'

// Tus iconos originales
const IconoPartida = () => <svg viewBox="0 0 512 512" width="14" height="14" fill="#666"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 136v160c0 13.3 10.7 24 24 24s24-10.7 24-24V136c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>;
const IconoDestino = () => <svg viewBox="0 0 384 512" width="14" height="14" fill="#0a73e8"><path d="M172.3 501.7C27 291 0 269.4 0 192 0 86 86 0 192 0s192 86 192 192c0 77.4-27 99-172.3 309.7-9.5 13.8-29.9 13.8-39.4 0zM192 272a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>;
const IconoRestaurante = () => <svg viewBox="0 0 448 512" width="13" height="13" fill="currentColor"><path d="M416 0c17.7 0 32 14.3 32 32V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V32c0-17.7 14.3-32 32-32zM64 32C64 14.3 49.7 0 32 0S0 14.3 0 32V480c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM160 32v128c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H192c-17.7 0-32 14.3-32 32z"/></svg>;
const IconoHotel = () => <svg viewBox="0 0 512 512" width="13" height="13" fill="currentColor"><path d="M0 32C0 14.3 14.3 0 32 0H480c17.7 0 32 14.3 32 32s-14.3 32-32 32V448c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32V64C14.3 64 0 49.7 0 32z"/></svg>;
const IconoBus = () => <svg viewBox="0 0 448 512" width="13" height="13" fill="currentColor"><path d="M64 32C28.7 32 0 60.7 0 96V352c0 35.3 28.7 64 64 64H80v48c0 17.7 14.3 32 32 32s32-14.3 32-32V416H304v48c0 17.7 14.3 32 32 32s32-14.3 32-32V416h16c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM96 96h256c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V128c0-17.7 14.3-32 32-32z"/></svg>;
const IconoHospital = () => <svg viewBox="0 0 512 512" width="13" height="13" fill="currentColor"><path d="M256 0c141.4 0 256 114.6 256 256S397.4 512 256 512 0 397.4 0 256 114.6 0 256 0zm0 128c-17.7 0-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32v-64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32h-64v-64c0-17.7-14.3-32-32-32z"/></svg>;
const IconoGas = () => <svg viewBox="0 0 512 512" width="13" height="13" fill="currentColor"><path d="M32 64C14.3 64 0 78.3 0 96V416c0 17.7 14.3 32 32 32H352c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32H32zM448 352h32c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32H448v256z"/></svg>;

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSetOrigen = useCallback((val) => setOrigen(val), []);
  const handleSetDestino = useCallback((val) => setDestino(val), []);

  // 1. AÑADIDO: Inicializar el mapa al cargar la aplicación
  useEffect(() => {
    const inicializar = async () => {
      try {
        await fetch("http://127.0.0.1:8000/inicializar_mapa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Usamos un radio amplio para evitar errores de bordes
          body: JSON.stringify({ lat: 20.62, lon: -103.23, radio: 10000 }), 
        });
        console.log("Servidor: Mapa inicializado correctamente");
      } catch (error) {
        console.error("Error al inicializar mapa:", error);
      }
    };
    inicializar();
  }, []);

  const reiniciarTodo = () => {
    setOrigen(null);
    setDestino(null);
    setRuta(null);
  };

  const calcularRuta = async () => {
    if (!origen || !destino) return;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          origen: { lat: origen.lat, lon: origen.lon }, 
          destino: { lat: destino.lat, lon: destino.lon } 
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Error en la ruta");
        return;
      }

      // 2. AÑADIDO: Truco visual para asegurar que la ruta se conecta a las chinchetas
      const rutaCompleta = [
        [origen.lat, origen.lon], // Punto exacto de la chincheta A
        ...data.puntos.map(p => [p.lat, p.lon]), // La ruta de las calles
        [destino.lat, destino.lon] // Punto exacto de la chincheta B
      ];

      setRuta(rutaCompleta);
    } catch (err) {
      console.error("Error conectando al servidor:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" translate="no">
      <div className="controls-wrapper">
        <div className="search-panel-left">
          <div className="search-bar-core">
            <div className="input-box">
              <IconoPartida />
              <input 
                placeholder="Origen..." 
                readOnly 
                value={origen ? "Ubicación marcada" : ""} 
              />
            </div>
            <div className="v-sep"></div>
            <div className="input-box">
              <IconoDestino />
              <input 
                placeholder="Destino..." 
                readOnly 
                value={destino ? "Destino marcado" : ""} 
              />
            </div>
            <button 
              className={`go-btn ${origen && destino ? 'active' : ''}`} 
              onClick={calcularRuta}
            >
              <span>{loading ? "..." : "→"}</span>
            </button>
          </div>
        </div>

        <div className="categories-panel-right">
          <button className="cat-chip"><IconoRestaurante /> <span>Restaurantes</span></button>
          <button className="cat-chip"><IconoHotel /> <span>Hoteles</span></button>
          <button className="cat-chip"><IconoBus /> <span>Transporte</span></button>
          <button className="cat-chip"><IconoHospital /> <span>Hospitales</span></button>
          <button className="cat-chip"><IconoGas /> <span>Gasolineras</span></button>
          <button 
            className="cat-chip" 
            onClick={reiniciarTodo} 
            style={{ border: '1px solid #ff4444', marginLeft: '10px' }}
          >
            <span style={{ color: '#ff4444' }}>Reiniciar</span>
          </button>
        </div>
      </div>

      <div className="map-wrapper">
        <MapView 
          origen={origen} 
          destino={destino} 
          setOrigen={handleSetOrigen} 
          setDestino={handleSetDestino} 
          ruta={ruta}
          setRuta={setRuta} 
        />
      </div>
    </div>
  )
}
export default App;