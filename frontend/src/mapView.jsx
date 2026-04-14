import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ClickHandler({ origen, destino, setOrigen, setDestino, setRuta, modoReporte, onReportar }) {
  useMapEvents({
    click(e) {
      const p = { lat: e.latlng.lat, lon: e.latlng.lng };
      if (modoReporte) {
        onReportar(p);
      } else {
        if (!origen || (origen && destino)) {
          setOrigen(p); setDestino(null); setRuta(null);
        } else {
          setDestino(p);
        }
      }
    },
  });
  return null;
}

export default function MapView(props) {
  return (
    <MapContainer center={[20.67195, -103.34882]} zoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler {...props} />
      {props.bloqueos.map((b, idx) => (
        <Circle 
          key={idx} 
          center={[b.lat, b.lon]} 
          radius={35} 
          pathOptions={{ color: '#d32f2f', fillColor: '#f44336', fillOpacity: 0.5, weight: 2 }} 
        />
      ))}
      {props.origen && <Marker position={[props.origen.lat, props.origen.lon]} />}
      {props.destino && <Marker position={[props.destino.lat, props.destino.lon]} />}
      {props.ruta && <Polyline positions={props.ruta} color="#1a73e8" weight={6} opacity={0.8} />}
    </MapContainer>
  );
}