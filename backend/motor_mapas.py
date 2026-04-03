import osmnx as ox
import networkx as nx
import os

class MotorEvacuacion:
    def __init__(self):
        self.G = None  # Grafo en memoria
        self.bloqueos_count = 0
        
        # Configuración de caché local relativa para que funcione en cualquier PC
        cache_path = os.path.join(os.path.dirname(__file__), 'cache')
        if not os.path.exists(cache_path):
            os.makedirs(cache_path)
            
        ox.settings.use_cache = True
        ox.settings.cache_folder = cache_path

    def inicializar_grafo(self, lat: float, lon: float, radio: float = 5000):
        """
        Descarga y procesa la red vial de OpenStreetMap en un radio de 5km (5000m).
        """
        try:
            self.G = ox.graph_from_point((lat, lon), dist=radio, network_type='drive')
            self.G = ox.add_edge_speeds(self.G)
            self.G = ox.add_edge_travel_times(self.G)
            self.bloqueos_count = 0
            return True
        except Exception as e:
            print(f"Error al descargar el mapa de OSM: {e}")
            return False

    def bloquear_calle(self, lat: float, lon: float):
        """
        Localiza la calle (arista) más cercana a las coordenadas GPS y la elimina
        del grafo activo para que no sea considerada en futuros cálculos de ruta.
        """
        if self.G is None:
            return False
        try:
            u, v, key = ox.nearest_edges(self.G, lon, lat)
            if self.G.has_edge(u, v):
                self.G.remove_edge(u, v, key)
                self.bloqueos_count += 1
                return True
            return False
        except Exception as e:
            print(f"Error al bloquear calle: {e}")
            return False

    def calcular_ruta_segura(self, o_lat, o_lon, d_lat, d_lon):
        """
        Calcula la ruta más rápida/corta usando el algoritmo de Dijkstra.
        Retorna una lista de coordenadas GPS para el Frontend.
        """
        if self.G is None:
            raise ValueError("El mapa no ha sido inicializado")
        nodo_origen = ox.nearest_nodes(self.G, o_lon, o_lat)
        nodo_destino = ox.nearest_nodes(self.G, d_lon, d_lat)
        try:
            ruta_nodos = nx.shortest_path(self.G, nodo_origen, nodo_destino, weight='length')
            ruta_coords = []
            for nodo in ruta_nodos:
                datos_nodo = self.G.nodes[nodo]
                ruta_coords.append({"lat": datos_nodo['y'], "lon": datos_nodo['x']})
            return ruta_coords
        except nx.NetworkXNoPath:
            return None

    def obtener_estadisticas(self):
        if self.G is None:
            return {"nodos_activos": 0, "bloqueos_registrados": 0}
        return {
            "nodos_activos": len(self.G.nodes),
            "bloqueos_registrados": self.bloqueos_count
        }