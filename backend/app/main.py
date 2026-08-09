import os
import logging
import datetime
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

# Keep-alive Health Ping Endpoint for 24/7 Uptime Monitors (UptimeRobot / Cron-Job.org)
@app.get("/health")
@app.get("/ping")
def health_check():
    return {
        "status": "healthy",
        "service": "OpportunityAgent",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

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
        response = FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith(("auth", "credentials", "profile", "opportunities", "news", "settings", "gmail", "activity", "health", "ping", "docs", "openapi.json")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_file):
            response = FileResponse(index_file)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            return response
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
        from app.models import User, Profile, UserCredential
        from app.security.auth import hash_password

        # Seed default test candidate account so login works out of the box
        default_email = "manindra@example.com"
        test_user = db.query(User).filter(User.email == default_email).first()
        if not test_user:
            hashed = hash_password("password123")
            test_user = User(email=default_email, password_hash=hashed)
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

            profile = Profile(user_id=test_user.id, email=default_email, full_name="Manindra")
            cred = UserCredential(user_id=test_user.id)
            db.add(profile)
            db.add(cred)
            db.commit()
            logger.info(f"Seeded default test user: {default_email} / password123")

        fetch_rss_news(db)
        from app.models import Opportunity
        if db.query(Opportunity).count() == 0:
            await run_discovery_pipeline(db)
    except Exception as e:
        logger.error(f"Startup seeding error: {e}")
    finally:
        db.close()
