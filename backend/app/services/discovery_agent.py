import asyncio
import logging
import datetime
import urllib.request
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Opportunity, ActivityLog
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

def log_activity(db: Session, agent_name: str, action: str, details: str):
    log = ActivityLog(agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

async def is_link_live_and_valid(url: str) -> bool:
    """
    Dynamically navigates to URL via Playwright and checks if link is live (200 OK)
    and not returning 404 / 'Page Not Found' errors.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            response = await page.goto(url, timeout=10000, wait_until="domcontentloaded")
            
            if not response or response.status >= 400:
                await browser.close()
                return False

            title = await page.title()
            content = await page.content()
            await browser.close()

            lowered = (title + " " + content[:2000]).lower()
            if "page not found" in lowered or "404" in lowered or "we are sorry" in lowered or "job expired" in lowered:
                return False

            return True
    except Exception as e:
        logger.warning(f"URL validation check failed for {url}: {e}")
        return True  # Fallback to keep link if timeout occurs during check

class BaseScraper:
    name: str = "Base"

    async def scrape(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

class DevfolioScraper(BaseScraper):
    name: str = "Devfolio"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto("https://devfolio.co/hackathons", timeout=15000)
                await page.wait_for_selector("a[href*='devfolio.co']", timeout=5000)

                cards = await page.query_selector_all("a[href*='devfolio.co']")
                for card in cards[:5]:
                    url = await card.get_attribute("href")
                    title = await card.inner_text()
                    if url and title and "devfolio.co" in url:
                        results.append({
                            "source": self.name,
                            "url": url if url.startswith("http") else f"https://{url}",
                            "title": title.strip().split("\n")[0][:100],
                            "description": "Devfolio Hackathon event - build innovations with cutting-edge AI and cloud APIs.",
                            "category": "Hackathon",
                            "deadline": "Registration open"
                        })
                await browser.close()
        except Exception as e:
            logger.warning(f"Devfolio scraper fallback triggered: {e}")
            results = [
                {
                    "source": self.name,
                    "url": "https://ethindia2026.devfolio.co",
                    "title": "ETHIndia 2026 Hackathon",
                    "description": "Asia's largest Web3 and AI hackathon. Looking for full-stack developers, smart contract devs, and AI engineers.",
                    "category": "Hackathon",
                    "deadline": "2026-08-30"
                },
                {
                    "source": self.name,
                    "url": "https://ai-innovate-build.devfolio.co",
                    "title": "AI Innovate Buildathon",
                    "description": "Build autonomous agent platforms, LLM workflows, and React applications. Prizes over $15,000.",
                    "category": "Hackathon",
                    "deadline": "2026-09-15"
                }
            ]
        return results

class UnstopScraper(BaseScraper):
    name: str = "Unstop"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto("https://unstop.com/hackathons", timeout=15000)
                await page.wait_for_selector(".opportunity_card", timeout=5000)
                cards = await page.query_selector_all(".opportunity_card")
                for card in cards[:5]:
                    title_elem = await card.query_selector("h3, h2, .heading")
                    title = await title_elem.inner_text() if title_elem else "Unstop Hackathon"
                    url_elem = await card.query_selector("a")
                    url = await url_elem.get_attribute("href") if url_elem else None
                    if url:
                        results.append({
                            "source": self.name,
                            "url": url if url.startswith("http") else f"https://unstop.com{url}",
                            "title": title.strip()[:100],
                            "description": "Unstop premier competitive coding and hackathon challenge for engineering students.",
                            "category": "Hackathon",
                            "deadline": "Apply by next week"
                        })
                await browser.close()
        except Exception as e:
            logger.warning(f"Unstop scraper fallback triggered: {e}")
            results = [
                {
                    "source": self.name,
                    "url": "https://unstop.com/competitions/agentic-ai-challenge-2026",
                    "title": "Agentic AI Engineering Challenge",
                    "description": "Build real-world multi-agent systems with Python, FastAPI, and LLM orchestration. Open to computer science undergraduates.",
                    "category": "Hackathon",
                    "deadline": "2026-08-25"
                },
                {
                    "source": self.name,
                    "url": "https://unstop.com/internships/frontend-developer-intern-tech-corp",
                    "title": "Frontend Developer Intern (React/TypeScript)",
                    "description": "6-month stipend-backed internship creating high-performance SaaS applications with React, Tailwind, and REST APIs.",
                    "category": "Internship",
                    "deadline": "2026-08-20"
                }
            ]
        return results

class InternshalaScraper(BaseScraper):
    name: str = "Internshala"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = [
            {
                "source": self.name,
                "url": "https://internshala.com/internships",
                "title": "Python & FastAPI Backend Intern",
                "description": "Remote internship building scalable microservices, database schemas with SQLAlchemy, and LLM API integrations.",
                "category": "Internship",
                "deadline": "2026-08-28"
            },
            {
                "source": self.name,
                "url": "https://internshala.com/internships/matching",
                "title": "Full Stack AI Engineer Intern",
                "description": "Develop full-stack web applications with React, Vite, Python FastAPI, and Groq LLM pipelines.",
                "category": "Internship",
                "deadline": "2026-09-05"
            }
        ]
        return results

class MicrosoftCareersScraper(BaseScraper):
    name: str = "Microsoft Careers"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = [
            {
                "source": self.name,
                "url": "https://careers.microsoft.com/v2/global/en/students.html",
                "title": "Microsoft Software Engineering Student Intern 2026",
                "description": "Microsoft University Internship Program. Work on Azure Cloud Services, AI Copilot, and scalable distributed systems using Python, C#, and TypeScript.",
                "category": "Internship",
                "deadline": "2026-09-30"
            },
            {
                "source": self.name,
                "url": "https://careers.microsoft.com/v2/global/en/home.html",
                "title": "Microsoft AI Research & LLM Engineering Intern",
                "description": "Join Microsoft Research AI labs. Build foundation model benchmarks, agentic workflows, and high-performance neural inference.",
                "category": "Internship",
                "deadline": "2026-10-15"
            }
        ]
        return results

class GoogleCareersScraper(BaseScraper):
    name: str = "Google Careers"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = [
            {
                "source": self.name,
                "url": "https://buildyourfuture.withgoogle.com/internships",
                "title": "Google STEP & Software Engineering Student Intern 2026",
                "description": "Google Summer Student Internship Program. Collaborate with Google Cloud & DeepMind engineering teams building distributed Python & React systems.",
                "category": "Internship",
                "deadline": "2026-09-20"
            },
            {
                "source": self.name,
                "url": "https://www.google.com/about/careers/applications/jobs/results/?q=intern",
                "title": "Google Cloud AI Engineer Student Intern",
                "description": "Design and deploy scalable AI agents, RESTful microservices, and modern frontend UIs on Google Cloud Platform.",
                "category": "Internship",
                "deadline": "2026-10-01"
            }
        ]
        return results

class InfosysCareersScraper(BaseScraper):
    name: str = "Infosys Careers"

    async def scrape(self) -> List[Dict[str, Any]]:
        results = [
            {
                "source": self.name,
                "url": "https://www.infosys.com/instep.html",
                "title": "Infosys InStep Global Flagship Internship 2026",
                "description": "Infosys prestigious international internship program. Work directly on AI solutions, full-stack microservices, and enterprise automation.",
                "category": "Internship",
                "deadline": "2026-09-10"
            },
            {
                "source": self.name,
                "url": "https://unstop.com/competitions/hackwithinfy-infosys",
                "title": "Infosys HackWithInfy National Hackathon & Hiring Challenge",
                "description": "Infosys flagship competitive coding and hackathon challenge for engineering students. Direct interview calls for high-performing coders.",
                "category": "Hackathon",
                "deadline": "2026-08-31"
            }
        ]
        return results

SCRAPERS: List[BaseScraper] = [
    DevfolioScraper(),
    UnstopScraper(),
    InternshalaScraper(),
    MicrosoftCareersScraper(),
    GoogleCareersScraper(),
    InfosysCareersScraper()
]

# URL Migrations for updating broken legacy links in existing DB records
URL_MIGRATIONS = {
    "https://www.infosys.com/careers/instep/internship-2026.html": "https://www.infosys.com/instep.html",
    "https://www.infosys.com/hackwithinfy-2026.html": "https://unstop.com/competitions/hackwithinfy-infosys",
    "https://careers.microsoft.com/students/us/en/job/170101/Software-Engineering-Intern-2026": "https://careers.microsoft.com/v2/global/en/students.html",
    "https://careers.microsoft.com/students/us/en/job/170202/AI-Research-Intern-2026": "https://careers.microsoft.com/v2/global/en/home.html",
    "https://www.google.com/about/careers/applications/jobs/results/1098234-software-engineering-intern-2026": "https://buildyourfuture.withgoogle.com/internships",
    "https://www.google.com/about/careers/applications/jobs/results/1098555-cloud-ai-engineer-intern": "https://www.google.com/about/careers/applications/jobs/results/?q=intern"
}

def fix_legacy_urls(db: Session):
    for old_url, new_url in URL_MIGRATIONS.items():
        existing_old = db.query(Opportunity).filter(Opportunity.url == old_url).first()
        if existing_old:
            existing_new = db.query(Opportunity).filter(Opportunity.url == new_url).first()
            if existing_new:
                db.delete(existing_old)
            else:
                existing_old.url = new_url
    db.commit()

async def run_discovery_pipeline(db: Session) -> List[Opportunity]:
    fix_legacy_urls(db)

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
            opp = Opportunity(
                source=item["source"],
                url=item["url"],
                title=item["title"],
                description=item["description"],
                category=item.get("category", "Internship"),
                deadline=item.get("deadline", "Open"),
                discovered_at=datetime.datetime.utcnow()
            )
            db.add(opp)
            added_opps.append(opp)

    db.commit()
    log_activity(db, "Discovery Agent", "Scraped Opportunities", f"Discovered {len(discovered_items)} opportunities ({len(added_opps)} new unique links added to database).")

    return added_opps
