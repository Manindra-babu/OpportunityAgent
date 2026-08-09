import asyncio
import logging
import datetime
import re
import json
from typing import List, Dict, Any
import httpx
from sqlalchemy.orm import Session
from app.models import Opportunity, ActivityLog
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

LEGACY_MOCK_TITLES = [
    "Infosys InStep Global Flagship Internship 2026",
    "Google Cloud AI Engineer Student Intern",
    "Microsoft Software Engineering Student Intern 2026",
    "Microsoft AI Research & LLM Engineering Intern",
    "Google STEP & Software Engineering Student Intern 2026",
    "Infosys HackWithInfy National Hackathon & Hiring Challenge",
    "Python & FastAPI Backend Intern",
    "Full Stack AI Engineer Intern",
    "Frontend Developer Intern (React/TypeScript)",
    "Agentic AI Engineering Challenge",
    "ETHIndia 2026 Hackathon",
    "AI Innovate Buildathon",
    "Upcoming: Global AI Builders & Agentic Hackathon 2026",
    "Upcoming: National AI & Coding Championship 2026",
    "Upcoming: Google Tech Student Summit & Hackathon 2026"
]

def log_activity(db: Session, agent_name: str, action: str, details: str):
    log = ActivityLog(agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def purge_legacy_mock_data(db: Session):
    """
    Purges legacy hardcoded mock postings from the database so the feed contains ONLY real live postings.
    """
    try:
        from app.models import OpportunityScore, Registration
        mock_opps = db.query(Opportunity).filter(Opportunity.title.in_(LEGACY_MOCK_TITLES)).all()
        if mock_opps:
            count = len(mock_opps)
            mock_ids = [o.id for o in mock_opps]
            db.query(OpportunityScore).filter(OpportunityScore.opportunity_id.in_(mock_ids)).delete(synchronize_session=False)
            db.query(Registration).filter(Registration.opportunity_id.in_(mock_ids)).delete(synchronize_session=False)
            db.query(Opportunity).filter(Opportunity.id.in_(mock_ids)).delete(synchronize_session=False)
            db.commit()
            logger.info(f"Purged {count} legacy mock opportunity records from database.")
    except Exception as e:
        logger.warning(f"Error purging mock opportunity records: {e}")

class BaseScraper:
    name: str = "Base"

    async def scrape(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

class LiveArbeitnowScraper(BaseScraper):
    name: str = "Arbeitnow Tech Jobs & Internships"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get("https://www.arbeitnow.com/api/job-board-api")
                if resp.status_code == 200:
                    data = resp.json()
                    jobs = data.get("data", [])
                    for job in jobs[:10]:
                        title = job.get("title", "")
                        url = job.get("url", "")
                        company = job.get("company_name", "")
                        description = re.sub('<[^<]+?>', '', job.get("description", ""))[:300]
                        tags = job.get("tags", [])
                        
                        is_internship = "intern" in title.lower() or "internship" in title.lower() or any("intern" in t.lower() for t in tags)
                        category = "Internship" if is_internship else "Full-Stack Opportunity"

                        if title and url:
                            results.append({
                                "source": f"Arbeitnow ({company})" if company else "Arbeitnow",
                                "url": url,
                                "title": f"{title} - {company}" if company else title,
                                "description": description or f"Software development opportunity at {company}.",
                                "category": category,
                                "deadline": "Apply on Official Site"
                            })
        except Exception as e:
            logger.warning(f"Arbeitnow live fetch error: {e}")
        return results

class LiveHackerNewsJobScraper(BaseScraper):
    name: str = "HackerNews Hiring"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get("https://hacker-news.firebaseio.com/v0/jobstories.json")
                if resp.status_code == 200:
                    story_ids = resp.json()[:8]
                    for s_id in story_ids:
                        s_resp = await client.get(f"https://hacker-news.firebaseio.com/v0/item/{s_id}.json")
                        if s_resp.status_code == 200:
                            s_data = s_resp.json()
                            title = s_data.get("title", "")
                            url = s_data.get("url") or f"https://news.ycombinator.com/item?id={s_id}"
                            text = s_data.get("text", "")
                            desc = re.sub('<[^<]+?>', '', text)[:300] if text else "Verified tech hiring post on YCombinator HackerNews."

                            if title:
                                results.append({
                                    "source": "YCombinator HackerNews",
                                    "url": url,
                                    "title": title,
                                    "description": desc,
                                    "category": "Internship" if "intern" in title.lower() else "Software Engineering",
                                    "deadline": "Open"
                                })
        except Exception as e:
            logger.warning(f"HackerNews job fetch error: {e}")
        return results

class DevfolioScraper(BaseScraper):
    name: str = "Devfolio Hackathons"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto("https://devfolio.co/hackathons", timeout=15000)
                await page.wait_for_selector("a[href*='devfolio.co']", timeout=5000)

                cards = await page.query_selector_all("a[href*='devfolio.co']")
                for card in cards[:6]:
                    url = await card.get_attribute("href")
                    title = await card.inner_text()
                    if url and title and "devfolio.co" in url and not url.endswith("/hackathons"):
                        clean_title = title.strip().split("\n")[0][:100]
                        if clean_title and len(clean_title) > 3:
                            results.append({
                                "source": self.name,
                                "url": url if url.startswith("http") else f"https://{url}",
                                "title": clean_title,
                                "description": "Devfolio live hackathon event. Build innovation with cutting-edge AI, Web3, and cloud APIs.",
                                "category": "Hackathon",
                                "deadline": "Registration open"
                            })
                await browser.close()
        except Exception as e:
            logger.warning(f"Devfolio scraper error: {e}")
        return results

class UnstopScraper(BaseScraper):
    name: str = "Unstop Opportunities"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto("https://unstop.com/hackathons", timeout=15000)
                await page.wait_for_selector("a[href*='unstop.com']", timeout=5000)
                cards = await page.query_selector_all("a[href*='unstop.com']")
                for card in cards[:6]:
                    url = await card.get_attribute("href")
                    title = await card.inner_text()
                    if url and title and len(title.strip()) > 5:
                        clean_title = title.strip().split("\n")[0][:100]
                        if clean_title and not clean_title.lower().startswith("login"):
                            results.append({
                                "source": self.name,
                                "url": url if url.startswith("http") else f"https://unstop.com{url}",
                                "title": clean_title,
                                "description": "Unstop premier competitive coding and hackathon challenge for engineering students.",
                                "category": "Hackathon",
                                "deadline": "Apply on Official Site"
                            })
                await browser.close()
        except Exception as e:
            logger.warning(f"Unstop scraper error: {e}")
        return results

SCRAPERS: List[BaseScraper] = [
    LiveArbeitnowScraper(),
    LiveHackerNewsJobScraper(),
    DevfolioScraper(),
    UnstopScraper()
]

async def run_discovery_pipeline(db: Session) -> List[Opportunity]:
    # 1. Purge outdated/hardcoded legacy mock postings
    purge_legacy_mock_data(db)

    # 2. Run all live real scrapers
    discovered_items = []
    for scraper in SCRAPERS:
        try:
            items = await scraper.scrape()
            discovered_items.extend(items)
        except Exception as e:
            logger.error(f"Error running scraper {scraper.name}: {e}")

    added_opps = []
    for item in discovered_items:
        existing = db.query(Opportunity).filter(Opportunity.url == item["url"]).first()
        if not existing:
            is_upcoming = item.get("is_upcoming", False) or item.get("category") == "Upcoming Event"
            text_str = f"{item['title']} {item['description']} {item.get('deadline', '')}".lower()
            if any(k in text_str for k in ["upcoming", "starts on", "begins", "registration opens", "starts in", "yet to start", "starts:"]):
                is_upcoming = True

            opp = Opportunity(
                source=item["source"],
                url=item["url"],
                title=item["title"],
                description=item["description"],
                category=item.get("category", "Internship"),
                deadline=item.get("deadline", "Open"),
                start_date=item.get("start_date", None),
                is_upcoming=is_upcoming,
                discovered_at=datetime.datetime.utcnow()
            )
            db.add(opp)
            added_opps.append(opp)

    db.commit()
    log_activity(db, "Discovery Agent", "Scraped Live Opportunities", f"Discovered {len(discovered_items)} real live opportunities ({len(added_opps)} new unique postings added to database).")

    return added_opps
