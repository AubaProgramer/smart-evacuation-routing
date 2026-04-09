import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ClickHandler({ origen, destino, setOrigen, setDestino, setRuta }) {
  useMapEvents({
    click(e) {
      const nuevoPunto = { lat: e.latlng.lat, lon: e.latlng.lng };

      if (origen && destino) {
        // Si ya hay una ruta completa, reiniciar al hacer clic de nuevo
        setOrigen(nuevoPunto);
        setDestino(null);
        if (setRuta) setRuta(null);
      } else if (!origen) {
        setOrigen(nuevoPunto);
      } else if (!destino) {
        setDestino(nuevoPunto);
      }
    },
  });
  return null;
}

export default function MapView({ origen, destino, setOrigen, setDestino, ruta, setRuta }) {
  const centroGuadalajara = [20.67195, -103.34882];

  return (
    <MapContainer 
      center={centroGuadalajara} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <ClickHandler 
        origen={origen} 
        destino={destino} 
        setOrigen={setOrigen} 
        setDestino={setDestino} 
        setRuta={setRuta} 
      />

      {origen && <Marker position={[origen.lat, origen.lon]} />}
      {destino && <Marker position={[destino.lat, destino.lon]} />}
      
      {ruta && (
        <Polyline 
          positions={ruta.map(p => [p[0], p[1]])} 
          color="#1a73e8" 
          weight={5} 
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
}