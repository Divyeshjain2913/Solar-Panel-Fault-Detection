"""
FastAPI Server Entry Point for Solar Panel Defect Detection System.
Initializes database connection, mounts static assets, registers API routes,
and provides CORS middleware for enterprise integration.
"""

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.database.mongodb import db_manager
from src.services.inference_service import inference_service
from src.api.routes import api_router

# Initialize application
app = FastAPI(
    title="Solar Panel Defect Detection API",
    description="Industrial AI Platform for Photovoltaic Module Defect Inspection & Telemetry",
    version="2.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded images and model charts
os.makedirs(os.path.join("data", "uploads"), exist_ok=True)
os.makedirs("models", exist_ok=True)
app.mount("/data/uploads", StaticFiles(directory=os.path.join("data", "uploads")), name="uploads")
app.mount("/models", StaticFiles(directory="models"), name="models")

# Register routes
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    print("[System] Connecting to MongoDB...")
    connected = db_manager.connect()
    if connected:
        print("[System] MongoDB initialized with unique indexes.")
    else:
        print("[System Warning] MongoDB connection failed. Ensure mongod daemon is running.")

    print("[System] Pre-loading AI inference model...")
    inference_service.reload_model()
    print("[System] Startup complete. API ready on /api")

@app.get("/")
def root():
    return {
        "service": "AI-Powered Solar Panel Fault Detection Platform",
        "version": "2.1.0",
        "status": "operational",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

