"""
FastAPI application entrypoint.

Run with:
    uvicorn main:app --reload --port 8000

This file only does app wiring (CORS, mounting routes). It has no
quantum logic and no validation logic of its own — see api/routes.py,
models/schemas.py, and quantum/ for that.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

app = FastAPI(
    title="Quantum Computing Education Platform - Simulation Backend",
    description="Executes learner-built circuits on Qiskit Aer and returns real results.",
    version="0.1.0",
)

# Hackathon-friendly CORS: allow the local React dev server(s) to call this
# API. Wildcard origins are fine for a demo; lock this down for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root() -> dict:
    return {"message": "Quantum simulation backend is running. See /docs for the API."}
