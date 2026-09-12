import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.chat import router as chat_router


app = FastAPI(
    title="AYURNEX Backend",
    version="1.0.0",
    description="HTTP API for the AYURNEX Ayurveda RAG assistant.",
)


# Allow the React/Vite frontend to communicate with FastAPI.
# CORS_ORIGINS can be changed later for deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "AYURNEX Backend is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


# Connect the chat API
app.include_router(chat_router)