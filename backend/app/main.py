from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv  # ← Add this

load_dotenv()  # ← Add this BEFORE any other imports that use env vars

from app.api import upload, chat, files

app = FastAPI(
    title="RAG AI Platform",
    description="Upload files and ask questions using Gemini + LangChain RAG",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "RAG AI Platform API is running",
        "docs": "http://127.0.0.1:8000/docs"
    }

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(files.router)