import asyncio
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def scheduled_discovery_job():
    logger.info("Executing scheduled discovery agent job...")
    db = SessionLocal()
    try:
        from app.services.discovery_agent import run_discovery_pipeline
        asyncio.run(run_discovery_pipeline(db))
    except Exception as e:
        logger.error(f"Scheduled discovery failed: {e}")
    finally:
        db.close()

def scheduled_inbox_poll_job():
    db = SessionLocal()
    try:
        from app.services.notification_agent import poll_gmail_replies
        poll_gmail_replies(db)
    except Exception as e:
        logger.error(f"Scheduled inbox poll failed: {e}")
    finally:
        db.close()

def scheduled_news_job():
    db = SessionLocal()
    try:
        from app.services.news_agent import fetch_rss_news
        fetch_rss_news(db)
    except Exception as e:
        logger.error(f"Scheduled news fetch failed: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        # Discovery every 6 hours
        scheduler.add_job(scheduled_discovery_job, 'interval', hours=6, id='discovery_job')
        # Email reply poll every 5 minutes
        scheduler.add_job(scheduled_inbox_poll_job, 'interval', minutes=5, id='inbox_poll_job')
        # News update every 4 hours
        scheduler.add_job(scheduled_news_job, 'interval', hours=4, id='news_job')
        
        scheduler.start()
        logger.info("APScheduler started successfully for background agent tasks.")
