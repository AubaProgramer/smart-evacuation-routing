import json
import osmnx as ox
import networkx as nx
import os

class MotorEvacuacion:
    def __init__(self):
        self.G = None  
        self.bloqueos_count = 0
        cache_path = os.path.join(os.path.dirname(__file__), 'cache')
        if not os.path.exists(cache_path): os.makedirs(cache_path)
        ox.settings.use_cache = True
        ox.settings.cache_folder = cache_path

    def inicializar_grafo(self, lat, lon, radio=5000):
        try:
            grafo_crudo = ox.graph_from_point((lat, lon), dist=radio, network_type='drive')
            componentes = list(nx.strongly_connected_components(grafo_crudo))
            self.G = grafo_crudo.subgraph(max(componentes, key=len)).copy()
            self.G = ox.add_edge_speeds(self.G)
            self.G = ox.add_edge_travel_times(self.G)
            return True
        except: return False

    def bloquear_calle(self, lat, lon):
        if self.G is None: return False
        try:
            u, v, key = ox.nearest_edges(self.G, lon, lat)
            if self.G.has_edge(u, v): self.G.remove_edge(u, v)
            if self.G.has_edge(v, u): self.G.remove_edge(v, u)
            return True
        except: return False

    def _formatear_ruta(self, ruta_nodos):
        ruta_coords = []
        for i in range(len(ruta_nodos) - 1):
            u, v = ruta_nodos[i], ruta_nodos[i+1]
            edge_data = list(self.G.get_edge_data(u, v).values())[0]
            if 'geometry' in edge_data:
                for lon, lat in edge_data['geometry'].coords:
                    ruta_coords.append({"lat": lat, "lon": lon})
            else:
                ruta_coords.append({"lat": self.G.nodes[u]['y'], "lon": self.G.nodes[u]['x']})
        ruta_coords.append({"lat": self.G.nodes[ruta_nodos[-1]]['y'], "lon": self.G.nodes[ruta_nodos[-1]]['x']})
        return ruta_coords

    def calcular_ruta_avanzada(self, o_lat, o_lon, d_lat, d_lon, tipo="mas_rapida"):
        if self.G is None: return None
        try:
            n_origen = ox.nearest_nodes(self.G, o_lon, o_lat)
            n_destino = ox.nearest_nodes(self.G, d_lon, d_lat)
            
            # --- LÓGICA DE PESOS AGRESIVA ---
            if tipo == "mas_rapida":
                # Usa el tiempo real de viaje (avenidas)
                peso = 'travel_time'
            
            elif tipo == "maximo_flujo":
                # Favorece calles anchas (avenidas grandes)
                for u, v, k, data in self.G.edges(data=True, keys=True):
                    lanes = data.get('lanes', 1)
                    if isinstance(lanes, list): lanes = lanes[0]
                    l = int(lanes) if str(lanes).isdigit() else 1
                    # Si tiene 3 o más carriles, es "baratísimo" pasar por ahí
                    data['flujo_w'] = data['length'] * (0.01 if l >= 3 else 10.0)
                peso = 'flujo_w'
                
            elif tipo == "segura":
                # PROHIBIDO usar avenidas. Obliga a usar calles residenciales.
                for u, v, k, data in self.G.edges(data=True, keys=True):
                    hw = data.get('highway', 'unclassified')
                    if isinstance(hw, list): hw = hw[0]
                    
                    # Si la calle es una avenida principal o secundaria, le ponemos un costo ENORME
                    if hw in ['motorway', 'primary', 'secondary', 'trunk']:
                        factor = 1000.0 
                    else:
                        factor = 0.1 # Las calles chiquitas son "gratis"
                    data['seguridad_w'] = data['length'] * factor
                peso = 'seguridad_w'

            ruta_nodos = nx.shortest_path(self.G, n_origen, n_destino, weight=peso)
            return self._formatear_ruta(ruta_nodos)
        except:
            # Si el peso es tan alto que no encuentra ruta, intenta con la más corta por defecto
            return None