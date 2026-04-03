from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from motor_mapas import MotorEvacuacion

app = FastAPI(title="Smart Evacuation Routing API")

from fastapi.middleware.cors import CORSMiddleware

# Configuración de permisos para que el Frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que cualquier cliente se conecte
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia global del motor (Singleton)
motor = MotorEvacuacion()

# --- Modelos de Datos (Pydantic) para validación de entrada ---

class PuntoGPS(BaseModel):
    lat: float
    lon: float

class RutaRequest(BaseModel):
    origen: PuntoGPS
    destino: PuntoGPS

# --- Endpoints de la API ---

@app.get("/estado")
async def get_estado():
    """Consulta cuántos nodos están activos y el número de bloqueos registrados."""
    stats = motor.obtener_estadisticas()
    return {
        "status": "online" if motor.G else "map_not_loaded",
        "data": stats
    }

@app.post("/inicializar_mapa")
async def inicializar_mapa(punto: PuntoGPS):
    """Descarga el grafo vial de OSMnx en un radio de 5km de la posición inicial."""
    exito = motor.inicializar_grafo(punto.lat, punto.lon)
    if not exito:
        raise HTTPException(status_code=500, detail="Error al descargar el mapa de OSM")
    return {"message": f"Mapa cargado con éxito para un radio de 5km en {punto.lat}, {punto.lon}"}

@app.post("/reportar_bloqueo")
async def reportar_bloqueo(punto: PuntoGPS):
    """Elimina una calle del grafo de forma dinámica basada en su cercanía GPS."""
    if not motor.G:
        raise HTTPException(status_code=400, detail="El mapa debe inicializarse antes de reportar bloqueos")
    
    if motor.bloquear_calle(punto.lat, punto.lon):
        return {"message": "Bloqueo registrado, el grafo ha sido actualizado en tiempo real"}
    else:
        raise HTTPException(status_code=404, detail="No se encontró una calle cercana para bloquear")

@app.post("/ruta")
async def obtener_ruta(request: RutaRequest):
    """Calcula la ruta más rápida (Dijkstra) evitando los bloqueos."""
    if not motor.G:
        raise HTTPException(status_code=400, detail="Mapa no cargado")
    
    ruta = motor.calcular_ruta_segura(
        request.origen.lat, request.origen.lon,
        request.destino.lat, request.destino.lon
    )
    
    if ruta is None:
        raise HTTPException(status_code=404, detail="No existe una ruta segura disponible hacia el destino debido a los bloqueos")
    
    return {
        "algoritmo": "Dijkstra (Basado en distancia física)",
        "puntos": ruta
    }

if __name__ == "__main__":
    import uvicorn
    # Ejecución local: uvicorn main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)