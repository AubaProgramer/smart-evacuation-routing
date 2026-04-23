import sqlite3
import json

def revisar_capas_mbtiles(ruta_archivo):
    conn = sqlite3.connect(ruta_archivo)
    cursor = conn.cursor()
    
    try:
        # Extraemos la fila 'json' de la tabla metadata
        cursor.execute("SELECT value FROM metadata WHERE name = 'json'")
        resultado = cursor.fetchone()
        
        if resultado:
            datos = json.loads(resultado[0])
            capas = datos.get('vector_layers', [])
            print("Capas encontradas en el archivo .mbtiles:")
            print(json.dumps(capas, indent=2))
        else:
            print("No se encontró información de vector_layers en la metadata.")
    except Exception as e:
        print(f"Error leyendo la metadata: {e}")
    finally:
        conn.close()

# Ejecuta la función apuntando a tu archivo
revisar_capas_mbtiles('zmg_map.mbtiles')