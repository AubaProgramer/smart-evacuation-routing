import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix para iconos de marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function ClickHandler({ origen, destino, setOrigen, setDestino }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const punto = { lat, lon: lng };

      if (!origen) {
        setOrigen(punto);
      } else if (!destino) {
        setDestino(punto);
      } else {
        setOrigen(punto);
        setDestino(null);
      }
    },
  });
  return null;
}

export default function MapView({ origen, destino, setOrigen, setDestino, ruta }) {
  return (
    <MapContainer 
      center={[20.62, -103.23]} 
      zoom={13} 
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler 
        origen={origen} 
        destino={destino} 
        setOrigen={setOrigen} 
        setDestino={setDestino} 
      />
      
      {origen && <Marker position={[origen.lat, origen.lon]} />}
      {destino && <Marker position={[destino.lat, destino.lon]} />}

      {/* DIBUJAR LA RUTA SI EXISTE */}
      {ruta && (
        <Polyline 
          positions={ruta.map(p => [p.lat, p.lon])} 
          pathOptions={{ color: 'blue', weight: 5, opacity: 0.6 }} 
        />
      )}
    </MapContainer>
  );
}