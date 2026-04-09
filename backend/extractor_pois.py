import osmnx as ox
import pandas as pd
from shapely.geometry import Point

def extraer_pois_seguros(latitud, longitud, radio=5000):
    """
    Extrae Puntos de Interés (POIs) de seguridad y salud desde OpenStreetMap.
    """
    punto_central = (latitud, longitud)
    
    # Definir los tags exactos para hospitales, bomberos, policía y refugios
    tags = {
        'amenity': ['hospital', 'clinic', 'fire_station', 'police'],
        'emergency': ['shelter']
    }
    
    print(f"Buscando puntos seguros en un radio de {radio}m...")
    
    try:
        # Extraer los datos de OSM
        pois = ox.features_from_point(punto_central, tags=tags, dist=radio)
        
        if pois.empty:
            print("No se encontraron puntos seguros en este radio.")
            return pd.DataFrame()
            
        # Filtrar solo las columnas que nos interesan
        columnas_utiles = ['name', 'amenity', 'emergency', 'geometry']
        columnas_existentes = [col for col in columnas_utiles if col in pois.columns]
        pois_filtrados = pois[columnas_existentes].copy()
        
        # Limpiar datos nulos para evitar errores en el JSON más adelante
        pois_filtrados = pois_filtrados.fillna('No especificado')
        
        print(f"Se encontraron {len(pois_filtrados)} puntos seguros.")
        return pois_filtrados
        
    except Exception as e:
        print(f"Ocurrió un error al conectar con OSM: {e}")
        return pd.DataFrame()

# ==========================================
# Zona de Pruebas
# ==========================================
if __name__ == "__main__":
    # Coordenadas de prueba (puedes cambiarlas por las exactas del CUTonalá)
    lat_prueba = 20.6274
    lon_prueba = -103.2425 
    
    resultados = extraer_pois_seguros(lat_prueba, lon_prueba)
    
    if not resultados.empty:
        print("\nEjemplo de los primeros resultados encontrados:")
        # Imprime los nombres y el tipo de establecimiento
        print(resultados[['name', 'amenity', 'emergency']].head())