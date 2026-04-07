from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from motor_mapas import MotorEvacuacion
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Smart Evacuation Routing API")

# Configuración de permisos para que el Frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

motor = MotorEvacuacion()

# --- Modelos de Datos ---

class PuntoGPS(BaseModel):
    lat: float
    lon: float

# Nuevo modelo para que el Frontend decida qué tan grande quiere el mapa
class InitMapRequest(BaseModel):
    lat: float
    lon: float
    radio: float = 5000  # Por defecto 5km, pero pueden mandar 10000

class RutaRequest(BaseModel):
    origen: PuntoGPS
    destino: PuntoGPS

# --- Endpoints ---

@app.get("/estado")
async def get_estado():
    stats = motor.obtener_estadisticas()
    return {
        "status": "online" if motor.G else "map_not_loaded",
        "data": stats
    }

@app.post("/inicializar_mapa")
async def inicializar_mapa(request: InitMapRequest):
    """Descarga el grafo vial de OSMnx usando el radio dinámico solicitado."""
    exito = motor.inicializar_grafo(request.lat, request.lon, request.radio)
    if not exito:
        raise HTTPException(status_code=500, detail="Error al descargar el mapa de OSM")
    return {"message": f"Mapa cargado con éxito para un radio de {request.radio}m en {request.lat}, {request.lon}"}

@app.post("/reportar_bloqueo")
async def reportar_bloqueo(punto: PuntoGPS):
    if not motor.G:
        raise HTTPException(status_code=400, detail="El mapa debe inicializarse primero")
    
    if motor.bloquear_calle(punto.lat, punto.lon):
        return {"message": "Bloqueo registrado, el grafo ha sido actualizado en tiempo real"}
    else:
        raise HTTPException(status_code=404, detail="No se encontró una calle cercana")

@app.post("/ruta")
async def obtener_ruta(request: RutaRequest):
    if not motor.G:
        raise HTTPException(status_code=400, detail="Mapa no cargado")
    
    ruta = motor.calcular_ruta_segura(
        request.origen.lat, request.origen.lon,
        request.destino.lat, request.destino.lon
    )
    
    if ruta is None:
        raise HTTPException(status_code=404, detail="No hay ruta disponible (Aislado)")
    
    return {
        "algoritmo": "Dijkstra (Basado en distancia física y geometría real)",
        "puntos": ruta
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)