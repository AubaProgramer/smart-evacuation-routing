import sqlite3
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from motor_mapas import MotorEvacuacion
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# --- CONFIGURACIÓN DE CORS ---
# Vital para que el navegador no bloquee peticiones desde React (puerto 5173)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Inicializamos tu motor de IA
motor = MotorEvacuacion()

# --- CONFIGURACIÓN DEL MAPA OFFLINE ---
MBTILES_PATH = "zmg_map.mbtiles"

# --- MODELOS ---
class PuntoGPS(BaseModel):
    lat: float
    lon: float

class RutaRequest(BaseModel):
    origen: PuntoGPS
    destino: PuntoGPS

# --- ENDPOINTS DEL MAPA (VECTOR TILES) ---
@app.get("/tiles/{z}/{x}/{y}.pbf")
def get_tile(z: int, x: int, y: int):
    if not os.path.exists(MBTILES_PATH):
        raise HTTPException(status_code=500, detail="Archivo zmg_map.mbtiles no encontrado")

    # Inversión del eje Y para la estructura TMS
    y_mbtiles = (1 << z) - 1 - y 
    
    conn = sqlite3.connect(MBTILES_PATH, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
        (z, x, y_mbtiles)
    )
    row = cursor.fetchone()
    conn.close()
    
    # 1. Verificamos que SQLite haya encontrado el tile
    if row is None:
        return Response(status_code=404)

    # 2. Extraemos los datos binarios de la tupla (Esto resuelve el error de Pylance)
    tile_data = row[0]

    # 3. Retornamos con los headers correctos de compresión
    return Response(
        content=tile_data, 
        media_type="application/x-protobuf",
        headers={
            "Content-Encoding": "gzip", # Permite que MapLibre decodifique los vectores
            "Cache-Control": "max-age=3600",
            "Access-Control-Allow-Origin": "*" # Refuerzo extra de CORS
        }
    )

# --- ENDPOINTS DE LA IA DE EVACUACIÓN ---
@app.post("/inicializar_mapa")
async def init(p: PuntoGPS):
    if motor.inicializar_grafo(p.lat, p.lon): 
        return {"status": "ok"}
    raise HTTPException(status_code=500)

@app.post("/ruta")
async def get_ruta(r: RutaRequest):
    # IMPORTANTE: Estos nombres deben coincidir con el Frontend
    return {
        "rutas": {
            "mas_rapida": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "mas_rapida"),
            "segura_prioritaria": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "segura"),
            "mas_corta": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "maximo_flujo")
        }
    }

@app.post("/reportar_bloqueo")
async def report(p: PuntoGPS):
    if motor.bloquear_calle(p.lat, p.lon): 
        return {"status": "ok"}
    raise HTTPException(status_code=404)


if __name__ == "__main__":
    # El backend arranca en el puerto 8001
    uvicorn.run(app, host="0.0.0.0", port=8001)