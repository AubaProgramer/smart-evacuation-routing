import React, { useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Estilo base vacío, ya que el mapa raster llenará todo el fondo
const BASE_MAP_STYLE = { 
  version: 8, 
  sources: {}, 
  layers: [] 
};

const MapView = ({ origen, destino, setOrigen, setDestino, ruta, colorRuta, bloqueos, modoReporte, onReportar, onEliminarBloqueo }) => {

  const handleMapClick = (e) => {
    const coords = { lat: e.lngLat.lat, lon: e.lngLat.lng };
    if (modoReporte) {
      onReportar(coords);
      return;
    }
    if (!origen) {
      setOrigen(coords);
    } else if (!destino) {
      setDestino(coords);
    } else {
      setOrigen(coords);
      setDestino(null);
    }
  };

  const routeGeoJSON = useMemo(() => {
    if (!ruta || ruta.length <= 1) {
      return {
        type: 'FeatureCollection',
        features: [] 
      };
    }
    
    const coordenadasRuta = ruta.map(punto => {
      if (punto.lon !== undefined) return [punto.lon, punto.lat];
      if (punto.lng !== undefined) return [punto.lng, punto.lat];
      if (Array.isArray(punto)) return [punto[1], punto[0]]; 
      return null;
    }).filter(p => p !== null);

    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coordenadasRuta }
    };
  }, [ruta]);

  // Estilo de la ruta: Ajustado para resaltar sobre el mapa claro de OSM
  const routeStyle = useMemo(() => ({ 
    id: 'ruta-activa', 
    type: 'line', 
    source: 'ruta-source', 
    paint: { 
      'line-color': colorRuta || '#2563eb', // Línea azul fuerte para contraste
      'line-width': 6, 
      'line-opacity': 0.8 
    }, 
    layout: { 'line-join': 'round', 'line-cap': 'round' } 
  }), [colorRuta]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        initialViewState={{ longitude: -103.3496, latitude: 20.6596, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        maxZoom={21} /* <-- Permitimos zoom profundo al usuario */
        mapStyle={BASE_MAP_STYLE}
        onClick={handleMapClick}
        cursor={modoReporte ? 'crosshair' : 'pointer'}
      >
        {/* CARÁTULA CLÁSICA DE OPENSTREETMAP */}
        <Source 
          id="osm-tiles" 
          type="raster" 
          tiles={['https://tile.openstreetmap.org/{z}/{x}/{y}.png']} 
          tileSize={256}
          maxzoom={19} /* <--- Le dice al mapa: "Hasta el 19 descargas de internet. Si hacen más zoom, estira la foto" */
          attribution="&copy; OpenStreetMap contributors"
        >
          {/* ¡QUITAMOS EL MAXZOOM DE AQUÍ PARA QUE LA CAPA NUNCA DESAPAREZCA! */}
          <Layer id="osm-layer" type="raster" /> 
        </Source>

        {/* CAPA DE LA RUTA DE EVACUACIÓN */}
        <Source id="ruta-source" type="geojson" data={routeGeoJSON}>
          <Layer {...routeStyle} />
        </Source>
        
        {/* MARCADORES DE ORIGEN Y DESTINO */}
        {origen && <Marker longitude={origen.lon} latitude={origen.lat} anchor="bottom"><div style={{ color: '#3b82f6', fontSize: '24px' }}>📍</div></Marker>}
        {destino && <Marker longitude={destino.lon} latitude={destino.lat} anchor="bottom"><div style={{ color: '#ef4444', fontSize: '24px' }}>🏁</div></Marker>}
        
        {/* MARCADORES DE BLOQUEOS */}
        {bloqueos.map((bloqueo) => {
          const emojis = {
            'bloqueo': '🚫',
            'accidente': '⚠️',
            'obras': '🚧',
            'evento': '🏢'
          };

          const icono = emojis[bloqueo.tipo] || '🚫';

          return (
            <Marker 
              key={bloqueo.id} 
              longitude={bloqueo.lon} 
              latitude={bloqueo.lat} 
              anchor="center"
            >
              <div 
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '28px',
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' 
                }} 
                title={`Eliminar reporte de ${bloqueo.tipo || 'bloqueo'}`}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onEliminarBloqueo(bloqueo.id);
                }}
              >
                {icono}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
};

export default MapView;