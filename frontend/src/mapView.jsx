import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de marcador que a veces desaparecen en React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function ClickHandler({ origen, destino, setOrigen, setDestino, modoReporte, onReportar }) {
  useMapEvents({
    click(e) {
      const p = { lat: e.latlng.lat, lon: e.latlng.lng };
      if (modoReporte) onReportar(p);
      else if (!origen || (origen && destino)) { setOrigen(p); setDestino(null); }
      else setDestino(p);
    },
  });
  return null;
}

export default function MapView(props) {
  // Procesamos los puntos solo cuando la prop 'ruta' cambie
  const puntosRuta = useMemo(() => {
    if (!props.ruta || !Array.isArray(props.ruta)) return [];
    return props.ruta.map(p => [p.lat, p.lon]);
  }, [props.ruta]);

  return (
    <MapContainer center={[20.6274, -103.2425]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler {...props} />
      
      {props.bloqueos.map((b, i) => (
        <Circle key={`b-${i}`} center={[b.lat, b.lon]} radius={50} pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.5 }} />
      ))}

      {props.origen && <Marker position={[props.origen.lat, props.origen.lon]} />}
      {props.destino && <Marker position={[props.destino.lat, props.destino.lon]} />}

      {/* DIBUJO DE LA RUTA */}
      {puntosRuta.length > 0 && (
        <Polyline 
          // La KEY debe ser única para cada tipo de ruta para que Leaflet la actualice
          key={`polyline-${props.seleccionActual}-${puntosRuta.length}`}
          positions={puntosRuta} 
          pathOptions={{ 
            color: props.colorRuta, 
            weight: 7, 
            opacity: 0.8,
            lineJoin: 'round'
          }} 
        />
      )}
    </MapContainer>
  );
}