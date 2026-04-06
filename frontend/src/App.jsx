import { useState, useEffect } from 'react'
import MapView from './mapView' 
import './App.css'

function App() {
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);

  // 1. Inicializar el mapa en el backend apenas cargue la página
  useEffect(() => {
    const inicializar = async () => {
      try {
        await fetch("http://127.0.0.1:8000/inicializar_mapa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: 20.62, lon: -103.23 }), // Coordenadas de Guadalajara
        });
        console.log("Servidor: Mapa inicializado correctamente");
      } catch (error) {
        console.error("Error al inicializar mapa:", error);
      }
    };
    inicializar();
  }, []);

  // 2. Pedir la ruta cuando origen y destino cambien
  useEffect(() => {
    if (origen && destino) {
      // Importante: Tu backend usa lat/lon. Nos aseguramos de enviar exactamente eso.
      const payload = {
        origen: { lat: origen.lat, lon: origen.lon },
        destino: { lat: destino.lat, lon: destino.lon }
      };

      fetch("http://127.0.0.1:8000/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      .then(res => {
        if (!res.ok) throw new Error("Error en el servidor (400/500)");
        return res.json();
      })
      .then(data => {
        setRuta(data.puntos);
      })
      .catch(err => {
        console.error("Error al obtener ruta:", err);
        setRuta(null);
      });
    } else {
      setRuta(null);
    }
  }, [origen, destino]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'relative' }}>
      <div style={{ 
        position: 'absolute', top: 10, left: 10, zIndex: 1000, 
        background: 'white', padding: '15px', borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)', minWidth: '220px'
      }}>
        <h1 style={{ fontSize: '1.1rem', margin: '0 0 10px 0' }}>🛰️ EscapeRouteAI</h1>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>📍 Origen: {origen ? "Fijado" : "Esperando..."}</p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>🏁 Destino: {destino ? "Fijado" : "Esperando..."}</p>
        
        {ruta ? (
           <p style={{ color: 'green', fontWeight: 'bold', fontSize: '14px' }}>✅ Ruta calculada</p>
        ) : (origen && destino && (
           <p style={{ color: 'orange', fontSize: '12px' }}>Calculando camino...</p>
        ))}

        <button 
          onClick={() => { setOrigen(null); setDestino(null); setRuta(null); }}
          style={{ 
            marginTop: '10px', width: '100%', cursor: 'pointer', 
            padding: '8px', background: '#f0f0f0', border: '1px solid #ccc',
            borderRadius: '4px' 
          }}
        >
          Limpiar Mapa
        </button>
      </div>

      <div style={{ width: '100%', height: '100%' }}>
        <MapView 
          origen={origen} 
          destino={destino} 
          setOrigen={setOrigen} 
          setDestino={setDestino} 
          ruta={ruta}
        />
      </div>
    </div>
  )
}

export default App