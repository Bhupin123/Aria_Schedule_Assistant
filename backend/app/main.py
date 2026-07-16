from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import logging

from app.core.config import settings
from app.db.init_db import init_db
from app.agents.graph import create_graph
from app.api.v1.router import router, health_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSqliteSaver.from_conn_string(settings.CHECKPOINT_DB_URL) as checkpointer:
        app.state.graph = create_graph(checkpointer)
        yield


limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="Scheduling Assistant API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# CORS must be first middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID", "X-API-Key"],
    max_age=600,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Catch-all to prevent raw stack traces leaking to client
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


@app.get("/api/v1/health")
async def health_v1():
    return {"status": "ok"}


@app.get("/")
def read_root():
    return {"status": "healthy"}


app.include_router(router)
app.include_router(health_router)