import json
import logging
import urllib.request
import urllib.error
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event
from app.models.sponser import Sponsor
from app.core.config import settings

logger = logging.getLogger(__name__)


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

    # Using gemini-1.5-flash for larger context window, or gemini-pro if flash fails
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    request_data = {
        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_message}"}]}],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 4096,  # <--- INCREASED FROM 800 TO 4096 to prevent cutoff
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(request_data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=60) as response:  # Increased timeout
            result = json.loads(response.read().decode("utf-8"))

        if "candidates" in result and result["candidates"]:
            return result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            return "AI returned an empty response."

    except Exception as e:
        logger.error(f"Strategy Generation Failed: {e}")
        # Fallback to Pro model if Flash fails
        return f"AI Generation Error: {str(e)[:100]}... (Check API Key or Region)"
