from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import NewsItem
from app.schemas import NewsItemOut
from app.services.news_agent import fetch_rss_news

router = APIRouter(prefix="/news", tags=["News"])

@router.get("", response_model=List[NewsItemOut])
def get_news(db: Session = Depends(get_db)):
    items = db.query(NewsItem).order_by(NewsItem.id.desc()).limit(20).all()
    if not items:
        items = fetch_rss_news(db)
    return items

@router.post("/refresh")
def refresh_news(db: Session = Depends(get_db)):
    items = fetch_rss_news(db)
    return {"message": f"Refreshed {len(items)} news items."}
