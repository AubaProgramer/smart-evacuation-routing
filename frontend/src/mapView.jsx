import React from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

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

  let coordenadasRuta = [];

  if (ruta && ruta.length > 0) {
    coordenadasRuta = ruta.map(punto => {
      if (punto.lon !== undefined) return [punto.lon, punto.lat];
      if (punto.lng !== undefined) return [punto.lng, punto.lat];
      if (Array.isArray(punto)) return [punto[1], punto[0]]; 
      return null;
    }).filter(p => p !== null);
  }

  const routeGeoJSON = coordenadasRuta.length > 1 ? {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: coordenadasRuta
    }
  } : null;

  const mapLayers = [
    { id: 'zmg-agua', type: 'fill', source: 'zmg-offline', 'source-layer': 'water', paint: { 'fill-color': '#a3ccff', 'fill-opacity': 1 } },
    { id: 'zmg-parques', type: 'fill', source: 'zmg-offline', 'source-layer': 'park', paint: { 'fill-color': '#c8e6c9', 'fill-opacity': 0.6 } },
    { id: 'zmg-edificios', type: 'fill', source: 'zmg-offline', 'source-layer': 'building', paint: { 'fill-color': '#d4d4d4', 'fill-opacity': 0.5 } },
    { id: 'zmg-calles', type: 'line', source: 'zmg-offline', 'source-layer': 'transportation', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 1.5 } },
    { id: 'zmg-avenidas', type: 'line', source: 'zmg-offline', 'source-layer': 'transportation', filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#fde047', 'line-width': 3.5 } },
    { id: 'zmg-nombres', type: 'symbol', source: 'zmg-offline', 'source-layer': 'transportation_name', layout: { 'text-field': ['get', 'name:latin'], 'symbol-placement': 'line', 'text-size': 11 }, paint: { 'text-color': '#475569', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } },
    { id: 'zmg-pois', type: 'circle', source: 'zmg-offline', 'source-layer': 'poi', paint: { 'circle-radius': 5, 'circle-color': ['match', ['get', 'class'], 'hospital', '#ef4444', 'school', '#eab308', '#64748b'], 'circle-stroke-width': 1, 'circle-stroke-color': '#ffffff' } }
  ];

  const routeStyle = { id: 'ruta-activa', type: 'line', source: 'ruta-source', paint: { 'line-color': colorRuta || '#ef4444', 'line-width': 6, 'line-opacity': 0.9 }, layout: { 'line-join': 'round', 'line-cap': 'round' } };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        initialViewState={{ longitude: -103.3496, latitude: 20.6596, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        maxZoom={20} 
        mapStyle={{ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e5e7eb' } }] }}
        onClick={handleMapClick}
        cursor={modoReporte ? 'crosshair' : 'pointer'}
      >
        <Source id="zmg-offline" type="vector" tiles={['http://localhost:8001/tiles/{z}/{x}/{y}.pbf']} minzoom={0} maxzoom={14} scheme="xyz" >
          {mapLayers.map((layer) => <Layer key={layer.id} {...layer} />)}
        </Source>

        {routeGeoJSON && <Source id="ruta-source" type="geojson" data={routeGeoJSON}><Layer {...routeStyle} /></Source>}
        
        {origen && <Marker longitude={origen.lon} latitude={origen.lat} anchor="bottom"><div style={{ color: '#3b82f6', fontSize: '24px' }}>📍</div></Marker>}
        {destino && <Marker longitude={destino.lon} latitude={destino.lat} anchor="bottom"><div style={{ color: '#ef4444', fontSize: '24px' }}>🏁</div></Marker>}
        
        {/* Renderizado dinámico según el TIPO de bloqueo */}
        {bloqueos.map((bloqueo) => {
          // Diccionario de iconos limpios
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
                  fontSize: '30px',
                  filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' // Sombrita refinada
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