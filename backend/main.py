from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chat import router as chat_router


app = FastAPI(title="AYURNEX Backend")


# Allow the React/Vite frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "AYURNEX Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# Connect the chat API
app.include_router(chat_router)