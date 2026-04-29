import React, { useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const BACKEND_URL = `http://${window.location.hostname}:8001`;
const OFFLINE_TILES = [`${BACKEND_URL}/tiles/{z}/{x}/{y}.pbf`];

// Fondo ultra oscuro para estética técnica y alto contraste
const BASE_MAP_STYLE = { 
  version: 8, 
  sources: {}, 
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#09090b' } }] 
};

// CAPAS DE MAPA LIMPIAS:
// Se eliminaron las opacidades parciales para evitar "cicatrices" al hacer zoom.
// Se filtraron los POIs para mostrar ÚNICAMENTE hospitales.
const MAP_LAYERS = [
  { id: 'zmg-agua', type: 'fill', source: 'zmg-offline', 'source-layer': 'water', paint: { 'fill-color': '#0f172a', 'fill-opacity': 1 } },
  { id: 'zmg-parques', type: 'fill', source: 'zmg-offline', 'source-layer': 'park', paint: { 'fill-color': '#062f1a', 'fill-opacity': 1 } },
  { id: 'zmg-edificios', type: 'fill', source: 'zmg-offline', 'source-layer': 'building', paint: { 'fill-color': '#18181b', 'fill-opacity': 1 } },
  
  // Calles y avenidas en tonos grises para que la ruta destaque
  { id: 'zmg-calles', type: 'line', source: 'zmg-offline', 'source-layer': 'transportation', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#27272a', 'line-width': 1.0 } },
  { id: 'zmg-avenidas', type: 'line', source: 'zmg-offline', 'source-layer': 'transportation', filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3f3f46', 'line-width': 2.5 } },
  
  // Nombres discretos
  { id: 'zmg-nombres', type: 'symbol', source: 'zmg-offline', 'source-layer': 'transportation_name', layout: { 'text-field': ['get', 'name:latin'], 'symbol-placement': 'line', 'text-size': 10 }, paint: { 'text-color': '#71717a', 'text-halo-color': '#000000', 'text-halo-width': 1.0 } },
  
  // POIs: Filtro estricto, solo hospitales en rojo intenso
  { 
    id: 'zmg-hospitales', 
    type: 'circle', 
    source: 'zmg-offline', 
    'source-layer': 'poi', 
    filter: ['==', ['get', 'class'], 'hospital'], 
    paint: { 
      'circle-radius': 6, 
      'circle-color': '#ff003c', 
      'circle-stroke-width': 1.5, 
      'circle-stroke-color': '#000000' 
    } 
  }
];

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

  // Estilo de la ruta con un rojo neón por defecto si no se pasa 'colorRuta'
  const routeStyle = useMemo(() => ({ 
    id: 'ruta-activa', 
    type: 'line', 
    source: 'ruta-source', 
    paint: { 
      'line-color': colorRuta || '#ff003c', 
      'line-width': 6, 
      'line-opacity': 1 
    }, 
    layout: { 'line-join': 'round', 'line-cap': 'round' } 
  }), [colorRuta]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        initialViewState={{ longitude: -103.3496, latitude: 20.6596, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        maxZoom={20} 
        mapStyle={BASE_MAP_STYLE}
        onClick={handleMapClick}
        cursor={modoReporte ? 'crosshair' : 'pointer'}
      >
        <Source id="zmg-offline" type="vector" tiles={OFFLINE_TILES} minzoom={0} maxzoom={14} scheme="xyz" >
          {MAP_LAYERS.map((layer) => <Layer key={layer.id} {...layer} />)}
        </Source>

        <Source id="ruta-source" type="geojson" data={routeGeoJSON}>
          <Layer {...routeStyle} />
        </Source>
        
        {origen && <Marker longitude={origen.lon} latitude={origen.lat} anchor="bottom"><div style={{ color: '#3b82f6', fontSize: '24px' }}>📍</div></Marker>}
        {destino && <Marker longitude={destino.lon} latitude={destino.lat} anchor="bottom"><div style={{ color: '#ff003c', fontSize: '24px' }}>🏁</div></Marker>}
        
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
                  filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.8))' 
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