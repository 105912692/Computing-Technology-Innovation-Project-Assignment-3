"""
FastAPI app: the contract between the React front end and the model.

Run from the backend folder:  uvicorn app.main:app --host 127.0.0.1 --port 8000
Interactive API docs:          http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .errors import add_error_handlers
from .model import load_model
from .schemas import CheckRequest, CheckResult, ErrorResponse, HealthResponse
from .settings import FRONTEND_ORIGIN

model = load_model()  # loaded once at start-up, not on every request

app = FastAPI(
    title="Phishing URL Detection API",
    description="Checks whether a URL is phishing or legitimate, with the model's confidence.",
    version="0.1.0",
)
add_error_handlers(app)

# CORS: only our own front end may read responses from a browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

ERRORS = {
    500: {
        "model": ErrorResponse,
        "description": "Unexpected server error",
        "content": {"application/json": {"example": {"error": {"status": 500, "message": "Something went wrong", "details": []}}}},
    }
}


@app.get("/api/health", responses=ERRORS)
def health() -> HealthResponse:
    """Check that the server is running and which model is loaded."""
    return HealthResponse(status="ok", model=model.name)


@app.post(
    "/api/check",
    responses={422: {"model": ErrorResponse, "description": "The URL is missing, empty or too long"}, **ERRORS},
)
def check(request: CheckRequest) -> CheckResult:
    """Check one URL and return whether it is phishing or legitimate, with the model's confidence."""
    prediction = model.predict(request.url)
    return CheckResult(url=request.url, label=prediction.label, confidence=prediction.confidence)
