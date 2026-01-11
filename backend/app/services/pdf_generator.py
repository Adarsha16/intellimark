from fpdf import FPDF
import os
from datetime import datetime
import re


class PDFReport(FPDF):
    def header(self):
        self.set_font("Arial", "B", 16)
        self.cell(0, 10, "Club Management System - Executive Report", 0, 1, "C")
        self.ln(5)

        self.set_font("Arial", "I", 10)
        self.set_text_color(100, 100, 100)
        self.cell(
            0,
            10,
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            0,
            1,
            "C",
        )

        self.set_draw_color(200, 200, 200)
        self.line(10, 35, 200, 35)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.set_text_color(128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", 0, 0, "C")

    def chapter_title(self, label):
        self.set_font("Arial", "B", 12)
        self.set_fill_color(240, 240, 245)  # Light Indigo/Gray
        self.set_text_color(0, 0, 0)
        self.cell(0, 10, f"  {label}", 0, 1, "L", 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font("Arial", "", 11)
        self.set_text_color(50, 50, 50)
        # MultiCell handles wrapping.
        self.multi_cell(0, 6, body)
        self.ln()


def clean_text_for_pdf(text: str) -> str:
    """
    Sanitizes text to ensure compatibility with FPDF (Latin-1).
    Replaces smart quotes, em-dashes, and strips emojis.
    """
    if not text:
        return ""

    # 1. Replace common "Smart" characters that break PDFs
    replacements = {
        "\u2018": "'",
        "\u2019": "'",  # Smart Quotes
        "\u201c": '"',
        "\u201d": '"',  # Double Smart Quotes
        "\u2013": "-",
        "\u2014": "-",  # Dashes
        "\u2026": "...",  # Ellipsis
        "•": "-",  # Bullet points
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)

    # 2. Remove Markdown bolding
    text = text.replace("**", "").replace("### ", "").replace("## ", "")

    # 3. Force ASCII/Latin-1 compatible, ignore emojis/complex symbols
    # This prevents the PDF generation from crashing mid-sentence
    return text.encode("latin-1", "ignore").decode("latin-1")


def create_executive_pdf(stats: dict, strategy_text: str):
    pdf = PDFReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    # --- 1. KEY METRICS ---
    pdf.chapter_title("Key Performance Metrics")

    pdf.set_font("Arial", "", 11)

    # Fix: Map the correct keys coming from Frontend (Dashboard.tsx)
    # The frontend sends 'totalRevenue', but we might have looked for 'revenue' before.
    revenue = stats.get("totalRevenue") or stats.get("revenue", 0)
    secured = stats.get("securedRevenue", 0)
    members = stats.get("totalMembers") or stats.get("members", 0)
    events_total = stats.get("totalEvents", 0)
    events_upcoming = stats.get("upcomingEventsCount") or stats.get("upcomingEvents", 0)
    sponsors = stats.get("totalSponsors", 0)

    # Format numbers
    metrics = [
        f"Total Pipeline Value: ${revenue:,} (${secured:,} Secured)",
        f"Active Sponsors: {sponsors}",
        f"Registered Members: {members}",
        f"Event Activity: {events_upcoming} Upcoming (out of {events_total} Total)",
    ]

    for metric in metrics:
        pdf.cell(0, 8, f"- {metric}", 0, 1)
    pdf.ln(8)

    # --- 2. AI STRATEGIC ANALYSIS ---
    pdf.chapter_title("AI Strategic Analysis")

    # Clean the text using the robust function
    safe_strategy_text = clean_text_for_pdf(strategy_text)

    pdf.chapter_body(safe_strategy_text)

    # --- 3. SAVE ---
    filename = f"report_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"

    # Use absolute path to be safe
    base_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    static_dir = os.path.join(base_dir, "static")

    os.makedirs(static_dir, exist_ok=True)
    file_path = os.path.join(static_dir, filename)

    pdf.output(file_path)

    # Return relative path for URL
    return f"static/{filename}"
