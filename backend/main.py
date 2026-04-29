import sqlite3
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from motor_mapas import MotorEvacuacion
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

motor = MotorEvacuacion()
MBTILES_PATH = "zmg_map.mbtiles"

# --- MODELOS ACTUALIZADOS ---
class PuntoGPS(BaseModel):
    lat: float
    lon: float
    id: Optional[int] = None        
    timestamp: Optional[int] = None 
    tipo: Optional[str] = "bloqueo" # <-- NUEVO: Le avisamos a Python que recibirá un "tipo"

class RutaRequest(BaseModel):
    origen: PuntoGPS
    destino: PuntoGPS

@app.on_event("startup")
async def startup_event():
    print("🚀 Levantando servidor y preparando Inteligencia Artificial...")
    motor.inicializar_grafo(20.6596, -103.3496)
    print("✅ Sistema listo para recibir peticiones al instante.")

@app.get("/tiles/{z}/{x}/{y}.pbf")
def get_tile(z: int, x: int, y: int):
    if not os.path.exists(MBTILES_PATH):
        raise HTTPException(status_code=500, detail="Archivo zmg_map.mbtiles no encontrado")

    y_mbtiles = (1 << z) - 1 - y 
    
    conn = sqlite3.connect(MBTILES_PATH, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
        (z, x, y_mbtiles)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        return Response(status_code=404)

    tile_data = row[0]

    return Response(
        content=tile_data, 
        media_type="application/x-protobuf",
        headers={
            "Content-Encoding": "gzip",
            "Cache-Control": "max-age=3600",
            "Access-Control-Allow-Origin": "*"
        }
    )

@app.post("/inicializar_mapa")
async def init(p: PuntoGPS):
    if motor.inicializar_grafo(p.lat, p.lon): 
        return {"status": "ok"}
    raise HTTPException(status_code=500)

@app.post("/ruta")
async def get_ruta(r: RutaRequest):
    return {
        "rutas": {
            "mas_rapida": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "mas_rapida"),
            "segura_prioritaria": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "segura"),
            "mas_corta": motor.calcular_ruta_avanzada(r.origen.lat, r.origen.lon, r.destino.lat, r.destino.lon, "maximo_flujo")
        }
    }

@app.post("/reportar_bloqueo")
async def report(p: PuntoGPS):
    if motor.bloquear_calle(p.lat, p.lon, p.id): 
        return {"status": "ok"}
    raise HTTPException(status_code=404)

@app.delete("/eliminar_bloqueo/{bloqueo_id}")
async def remove_report(bloqueo_id: int):
    motor.desbloquear_calle(bloqueo_id)
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

#holacomoestan