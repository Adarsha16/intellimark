import json
import logging
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event
from app.models.sponser import Sponsor
from app.core.config import settings
import httpx

logger = logging.getLogger(__name__)

# Storage path for strategy reports
STRATEGY_STORAGE_DIR = Path(os.getcwd()) / "static" / "strategy_reports"
STRATEGY_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
LATEST_STRATEGY_FILE = STRATEGY_STORAGE_DIR / "latest_strategy.json"


def save_strategy_report(report: str) -> None:
    """Save the generated strategy report to disk."""
    try:
        data = {
            "report": report,
            "generated_at": datetime.now().isoformat(),
        }
        with open(LATEST_STRATEGY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Strategy report saved to {LATEST_STRATEGY_FILE}")
    except Exception as e:
        logger.error(f"Failed to save strategy report: {e}")


def get_latest_strategy() -> dict:
    """Retrieve the most recently generated strategy report with timestamp."""
    try:
        if LATEST_STRATEGY_FILE.exists():
            with open(LATEST_STRATEGY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"report": data.get("report", ""), "generated_at": data.get("generated_at", "")}
        return {"report": "", "generated_at": ""}
    except Exception as e:
        logger.error(f"Failed to load strategy report: {e}")
        return {"report": "", "generated_at": ""}


async def generate_and_save_strategy(db: AsyncSession) -> None:
    """
    Wrapper function for background task execution.
    Generates strategy and saves it automatically.
    """
    try:
        report = await generate_club_strategy(db)
        # Report is already saved within generate_club_strategy
        logger.info("Background strategy generation completed successfully")
    except Exception as e:
        logger.error(f"Background strategy generation failed: {e}")


async def generate_club_strategy(db: AsyncSession) -> str:
    """
    Aggregates club data and uses Gemini to generate a comprehensive strategic report.
    """

    # 1. FETCH DATA
    events_res = await db.execute(select(Event))
    events = events_res.scalars().all()

    sponsors_res = await db.execute(select(Sponsor))
    sponsors = sponsors_res.scalars().all()

    if not events and not sponsors:
        return (
            "Insufficient data. Please add events and sponsors to generate a strategy."
        )

    # 2. CONTEXT CONSTRUCTION
    current_date = datetime.now().strftime("%Y-%m-%d")

    events_list = []
    for e in events:
        status = "Completed" if str(e.date) < current_date else "Upcoming"
        events_list.append(f"- [Event] '{e.title}' ({status}): {e.description}")
    events_context = "\n".join(events_list) if events_list else "No events found."

    sponsors_list = []
    total_funding = 0
    for s in sponsors:
        sponsors_list.append(
            f"- [Sponsor] {s.company_name} ({s.status}): ${s.total_funding} - Interests: {s.notes}"
        )
        total_funding += s.total_funding or 0
    sponsors_context = (
        "\n".join(sponsors_list) if sponsors_list else "No sponsors found."
    )

    # 3. PROMPT ENGINEERING (DETAILED MODE)
    system_instruction = """
    You are a Senior Business Consultant for a university organization. 
    Your goal is to write a DETAILED, PROFESSIONAL strategic document.
    
    Do not be brief. Expand on your points with reasoning and data references.
    
    CRITICAL: Do NOT use email headers (To:, From:, Subject:, Date:). 
    Start DIRECTLY with the first markdown section header.
    
    REQUIRED FORMAT (Markdown):
    
    ### 📊 Executive Health Check
    (Write 2 detailed paragraphs analyzing the overall club health, funding stability, and activity levels. Be critical.)

    ### 🔍 Deep-Dive Alignment Analysis
    (Analyze specific matches or conflicts between Sponsor Notes and Event Themes. Explain the risks of misalignment in detail.)

    ### 💡 Strategic Growth Opportunities
    (List 3 distinct, high-impact strategies. For each strategy, write a short paragraph explaining 'Why' and 'How'.)

    ### 🚀 Tactical Roadmap
    (Provide a concrete, step-by-step action plan for the next 30 days).
    """

    user_message = f"""
    Current Date: {current_date}
    Total Funding: ${total_funding}

    === CLUB DATA ===
    {events_context}
    
    {sponsors_context}
    =================
    
    Generate the full report. Ensure you complete all sentences.
    """

    # 4. CALL GEMINI API
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return "Error: Gemini API Key is missing."

    # Using gemini-3-flash-preview as requested
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"

    request_data = {
        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_message}"}]}],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 4096,  # <--- INCREASED FROM 800 TO 4096 to prevent cutoff
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            result = response.json()

        if "candidates" in result and result["candidates"]:
            try:
                report = result["candidates"][0]["content"]["parts"][0]["text"]
                save_strategy_report(report)  # Save to disk
                return report
            except (KeyError, IndexError, TypeError) as parse_err:
                logger.error(f"Failed to parse API response: {parse_err}")
                logger.error(f"Response structure: {json.dumps(result, indent=2)[:500]}")
                return f"AI Generation Error: Unexpected response format. Raw: {str(result)[:200]}"
        else:
            logger.error(f"No candidates in response: {json.dumps(result, indent=2)[:500]}")
            return "AI returned an empty response."

    except Exception as e:
        logger.error(f"Strategy Generation Failed: {e}")
        # Fallback to Pro model if Flash fails
        return f"AI Generation Error: {str(e)[:100]}... (Check API Key or Region)"
