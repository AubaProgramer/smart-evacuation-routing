import json
import osmnx as ox
import networkx as nx
import os
import pickle # NUEVO: La herramienta de congelamiento nativa de Python (guarda las curvas intactas)

class MotorEvacuacion:
    def __init__(self):
        self.G = None  
        self.bloqueos_activos = {}
        cache_path = os.path.join(os.path.dirname(__file__), 'cache')
        if not os.path.exists(cache_path): os.makedirs(cache_path)
        ox.settings.use_cache = True
        ox.settings.cache_folder = cache_path

    # --- INICIALIZACIÓN CON PICKLE (Ultra Rápida y sin perder curvas) ---
    def inicializar_grafo(self, lat, lon, radio=5000):
        archivo_grafo = os.path.join(ox.settings.cache_folder, 'zmg_grafo_procesado.pkl')
        
        try:
            # 1. Intentamos cargar el grafo congelado en binario
            if os.path.exists(archivo_grafo):
                print("⚡ Cargando grafo inteligente desde memoria (Pickle)...")
                with open(archivo_grafo, 'rb') as f:
                    self.G = pickle.load(f)
                return True
            
            # 2. Si no existe, lo calculamos (solo pasará la primera vez)
            print("⏳ Procesando matemáticas de la ciudad por primera vez. Por favor espera...")
            grafo_crudo = ox.graph_from_point((lat, lon), dist=radio, network_type='drive')
            componentes = list(nx.strongly_connected_components(grafo_crudo))
            self.G = grafo_crudo.subgraph(max(componentes, key=len)).copy()
            
            # Calculamos velocidades y tiempos
            self.G = ox.add_edge_speeds(self.G)
            self.G = ox.add_edge_travel_times(self.G)
            
            # 3. Lo "congelamos" y guardamos para el futuro
            with open(archivo_grafo, 'wb') as f:
                pickle.dump(self.G, f)
            print("✅ Grafo guardado exitosamente. Los próximos inicios serán instantáneos.")
            return True
        except Exception as e:
            print(f"❌ Error inicializando: {e}")
            return False

    def bloquear_calle(self, lat, lon, bloqueo_id):
        if self.G is None: return False
        try:
            u, v, key = ox.nearest_edges(self.G, lon, lat)
            calles_a_borrar = []

            if self.G.has_edge(u, v):
                for k, data in self.G[u][v].items():
                    calles_a_borrar.append((u, v, k, data.copy()))
            
            if self.G.has_edge(v, u):
                for k, data in self.G[v][u].items():
                    calles_a_borrar.append((v, u, k, data.copy()))

            if calles_a_borrar:
                b_id = bloqueo_id if bloqueo_id else id(calles_a_borrar) 
                self.bloqueos_activos[b_id] = calles_a_borrar

                for eu, ev, k, d in calles_a_borrar:
                    self.G.remove_edge(eu, ev, key=k)
                return True

            return False
        except Exception as e:
            print(f"Error bloqueando: {e}")
            return False

    def desbloquear_calle(self, bloqueo_id):
        if self.G is None: return False
        try:
            if bloqueo_id in self.bloqueos_activos:
                calles_guardadas = self.bloqueos_activos.pop(bloqueo_id)
                for u, v, key, data in calles_guardadas:
                    self.G.add_edge(u, v, key=key, **data)
                return True
            return False
        except Exception as e:
            print(f"Error desbloqueando: {e}")
            return False

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
            
            if tipo == "mas_rapida":
                peso = 'travel_time'
            
            elif tipo == "maximo_flujo":
                for u, v, k, data in self.G.edges(data=True, keys=True):
                    lanes = data.get('lanes', 1)
                    if isinstance(lanes, list): lanes = lanes[0]
                    l = int(lanes) if str(lanes).isdigit() else 1
                    # CASTIGO MODERADO: Evita un poco calles pequeñas (x3.0)
                    data['flujo_w'] = data['length'] * (1.0 if l >= 3 else 3.0)
                peso = 'flujo_w'
                
            elif tipo == "segura":
                for u, v, k, data in self.G.edges(data=True, keys=True):
                    hw = data.get('highway', 'unclassified')
                    if isinstance(hw, list): hw = hw[0]
                    # CASTIGO MODERADO: Evita un poco avenidas principales (x4.0)
                    if hw in ['motorway', 'primary', 'secondary', 'trunk']:
                        factor = 4.0 
                    else:
                        factor = 1.0 
                    data['seguridad_w'] = data['length'] * factor
                peso = 'seguridad_w'

            ruta_nodos = nx.shortest_path(self.G, n_origen, n_destino, weight=peso)
            return self._formatear_ruta(ruta_nodos)
        
        except nx.NetworkXNoPath:
            try:
                ruta_nodos = nx.shortest_path(self.G, n_origen, n_destino, weight='length')
                return self._formatear_ruta(ruta_nodos)
            except: 
                return None
        except:
            return None