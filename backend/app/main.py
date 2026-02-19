"""
PrahariPay Backend — FastAPI Application
AI-Powered Offline-First Guardian Payment Protocol
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import ai, auth, gossip, ledger, merchant, recovery, sync, spend
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="PrahariPay Backend",
    description="AI-Powered Offline-First Guardian Payment Protocol",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(sync.router, prefix="/api/v1", tags=["Sync"])
app.include_router(ledger.router, prefix="/api/v1", tags=["Ledger"])
app.include_router(recovery.router, prefix="/api/v1", tags=["Recovery"])
app.include_router(merchant.router, prefix="/api/v1/merchant", tags=["Merchant"])
app.include_router(gossip.router, prefix="/api/v1", tags=["Gossip"])
app.include_router(spend.router, prefix="/api/v1/spend", tags=["Spend"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])


@app.get("/")
def read_root():
    return {
        "message": "Welcome to PrahariPay Backend",
        "version": "0.2.0",
        "docs": "/docs",
    }
