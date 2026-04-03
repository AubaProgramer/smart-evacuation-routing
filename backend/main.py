from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def raiz():
    return {"mensaje": "API de Rutas conectada y funcionando"}

@app.get("/calcular_ruta")
def calcular_ruta(origen_lat: float, origen_lon: float, destino_lat: float, destino_lon: float):
    # Aquí conectaremos el algoritmo de tu compañero después
    return {"ruta": "Aún no calculada", "estado": "pendiente"}