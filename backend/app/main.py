from fastapi import FastAPI

app = FastAPI(
    title="Lumina Lens API",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to Lumina Lens API 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }