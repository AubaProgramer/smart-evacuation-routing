import React from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapaEvacuacion = () => {
  // Definimos cómo queremos que se dibujen las calles de la ZMG
  const estiloCalles = {
    id: 'calles-zmg',
    type: 'line',
    source: 'zmg-offline',
    'source-layer': 'zmg', // El nombre interno que le dio Tippecanoe
    paint: {
      'line-color': '#4a5568', // Un gris oscuro/azulado elegante
      'line-width': 1,
      'line-opacity': 0.8
    }
  };

  return (
    // Le damos un fondo oscuro al contenedor para que parezca un radar o mapa táctico
    <div style={{ width: '100vw', height: '100vh', background: '#1a202c' }}>
      <Map
        initialViewState={{
          longitude: -103.3496, // Centro de Guadalajara
          latitude: 20.6596,
          zoom: 12
        }}
        // Inyectamos un estilo base vacío para que no intente descargar mapas de internet
        mapStyle={{
          version: 8,
          sources: {},
          layers: [{
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#1a202c' }
          }]
        }}
      >
        {/* Aquí conectamos React con tu FastAPI local */}
        <Source 
          id="zmg-offline" 
          type="vector" 
          tiles={['http://localhost:8001/tiles/{z}/{x}/{y}.pbf']} 
        >
          {/* Le decimos que dibuje los vectores usando el estilo que definimos arriba */}
          <Layer {...estiloCalles} />
        </Source>
      </Map>
    </div>
  );
};

export default MapaEvacuacion;