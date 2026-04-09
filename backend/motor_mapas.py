import json
from extractor_pois import extraer_pois_seguros
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
        Descarga y procesa la red vial. Elimina islas desconectadas.
        """
        try:
            # 1. Descargar el grafo en bruto
            grafo_crudo = ox.graph_from_point((lat, lon), dist=radio, network_type='drive')
            
            # 2. MEJORA: Eliminar calles desconectadas para evitar cortes de ruta
            componentes = list(nx.strongly_connected_components(grafo_crudo))
            nodo_mas_grande = max(componentes, key=len)
            self.G = grafo_crudo.subgraph(nodo_mas_grande).copy()
            
            # 3. Calcular velocidades y tiempos
            self.G = ox.add_edge_speeds(self.G)
            self.G = ox.add_edge_travel_times(self.G)
            self.bloqueos_count = 0
            return True
        except Exception as e:
            print(f"Error al descargar el mapa de OSM: {e}")
            return False

    def bloquear_calle(self, lat: float, lon: float):
        """
        Localiza la calle (arista) más cercana a las coordenadas GPS y la elimina.
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
        Calcula la ruta más rápida y extrae la geometría real de las calles.
        """
        if self.G is None:
            raise ValueError("El mapa no ha sido inicializado")
        
        nodo_origen = ox.nearest_nodes(self.G, o_lon, o_lat)
        nodo_destino = ox.nearest_nodes(self.G, d_lon, d_lat)
        
        try:
            ruta_nodos = nx.shortest_path(self.G, nodo_origen, nodo_destino, weight='length')
            ruta_coords = []
            
            # MEJORA: Extraer las curvas (geometría) en vez de solo nodos rectos
            for i in range(len(ruta_nodos) - 1):
                u = ruta_nodos[i]
                v = ruta_nodos[i + 1]
                
                # Obtener los datos de la calle entre dos intersecciones
                edge_data = self.G.get_edge_data(u, v)
                
                if edge_data:
                    # Tomamos el primer camino válido
                    data = list(edge_data.values())[0]
                    
                    if 'geometry' in data:
                        # Si tiene curvas, sacamos todos los micropuntos
                        for coords_lon, coords_lat in data['geometry'].coords:
                            ruta_coords.append({"lat": coords_lat, "lon": coords_lon})
                    else:
                        # Si es una línea recta perfecta, usamos el nodo
                        ruta_coords.append({"lat": self.G.nodes[u]['y'], "lon": self.G.nodes[u]['x']})
            
            # Asegurar que el punto final exacto se agregue
            ultimo_nodo = ruta_nodos[-1]
            ruta_coords.append({"lat": self.G.nodes[ultimo_nodo]['y'], "lon": self.G.nodes[ultimo_nodo]['x']})
            
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
    def obtener_puntos_seguros(self, latitud, longitud, radio=5000):
        """
        Obtiene los POIs y los transforma en un JSON limpio para el Frontend.
        """
        # 1. Usar tu módulo de la Fase 1
        df_pois = extraer_pois_seguros(latitud, longitud, radio)
        
        if df_pois.empty:
            return json.dumps([]) # Retorna un JSON vacío si no hay nada
            
        lista_segura = []
        
        # 2. Recorrer los resultados y limpiar la data
        for index, row in df_pois.iterrows():
            centroide = row['geometry'].centroid
            
            nombre_punto = row['name']
            if nombre_punto == 'No especificado':
                nombre_punto = f"Punto Seguro ({row['amenity']})"
                
            punto = {
                "nombre": nombre_punto,
                "tipo": row['amenity'],
                "lat": centroide.y,
                "lng": centroide.x
            }
            lista_segura.append(punto)
            
        # 3. Convertir a formato JSON
        return json.dumps(lista_segura, ensure_ascii=False, indent=2)
# ==========================================
# ZONA DE PRUEBAS LOCALES
# ==========================================
if __name__ == "__main__":
    print("Iniciando prueba del MotorEvacuacion...")
    
    # 1. Creamos una "instancia" (objeto) de la clase de Yahir
    motor = MotorEvacuacion()
    
    # 2. Definimos las coordenadas de prueba
    lat_prueba = 20.6274
    lon_prueba = -103.2425
    
    # 3. Llamamos a TU función usando el objeto "motor"
    print("Buscando puntos y generando JSON...")
    resultado_json = motor.obtener_puntos_seguros(lat_prueba, lon_prueba)
    
    # 4. Mostramos el resultado final
    print("\n--- RESULTADO JSON ---")
    print(resultado_json)    