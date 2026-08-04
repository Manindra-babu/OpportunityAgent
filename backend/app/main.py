import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.database import engine, Base, SessionLocal
from app.routers import auth, credentials, profile, opportunities, news, settings, gmail, activity
from app.services.scheduler import start_scheduler
from app.services.discovery_agent import run_discovery_pipeline
from app.services.news_agent import fetch_rss_news

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("OpportunityAgent")

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OpportunityAgent Multi-User BYOK API",
    description="Multi-user BYOK platform for internship/hackathon discovery with Groq LLM scoring, encrypted user credentials, and Playwright form auto-fill.",
    version="2.0.0"
)

# CORS configuration for production & local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(credentials.router)
app.include_router(profile.router)
app.include_router(opportunities.router)
app.include_router(news.router)
app.include_router(settings.router)
app.include_router(gmail.router)
app.include_router(activity.router)

# Check for production static frontend build
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST_DIR):
    logger.info(f"Mounting production static frontend from {FRONTEND_DIST_DIR}")
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST_DIR, "assets")), name="static_assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith(("auth", "credentials", "profile", "opportunities", "news", "settings", "gmail", "activity", "docs", "openapi.json")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:
    @app.get("/")
    def root():
        return {
            "app": "OpportunityAgent Multi-User BYOK Platform",
            "status": "online",
            "docs": "/docs"
        }

@app.on_event("startup")
async def startup_event():
    logger.info("Starting OpportunityAgent Multi-User Backend Engine...")
    start_scheduler()

    db = SessionLocal()
    try:
        fetch_rss_news(db)
        from app.models import Opportunity
        if db.query(Opportunity).count() == 0:
            await run_discovery_pipeline(db)
    except Exception as e:
        logger.error(f"Startup seeding error: {e}")
    finally:
        db.close()
