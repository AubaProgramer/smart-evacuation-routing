from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from motor_mapas import MotorEvacuacion
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

motor = MotorEvacuacion()

class PuntoGPS(BaseModel):
    lat: float
    lon: float

class RutaRequest(BaseModel):
    origen: PuntoGPS
    destino: PuntoGPS

@app.post("/inicializar_mapa")
async def init(p: PuntoGPS):
    if motor.inicializar_grafo(p.lat, p.lon): return {"status": "ok"}
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
    if motor.bloquear_calle(p.lat, p.lon): return {"status": "ok"}
    raise HTTPException(status_code=404)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)