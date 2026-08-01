from fastapi import FastAPI # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware # pyright: ignore[reportMissingImports]

app = FastAPI(
    title="Lumina Lens API",
    version="0.1.0",
    description="Backend API for Lumina Lens",
)

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
        "project": "Lumina Lens",
        "version": "0.1.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }