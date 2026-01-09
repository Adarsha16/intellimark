import re
import logging
import numpy as np
from typing import List, Dict, Any, Set
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. DOMAIN KNOWLEDGE BASE ---
# This dictionary bridges the gap between different words with the same meaning.
# It makes the matcher "smart" without needing a massive Neural Network.
DOMAIN_SYNONYMS = {
    # Tech & Dev
    "tech": [
        "software",
        "technology",
        "developer",
        "coding",
        "hackathon",
        "app",
        "digital",
        "saas",
        "cyber",
    ],
    "ai": [
        "artificial intelligence",
        "ml",
        "machine learning",
        "data",
        "robotics",
        "automation",
        "gpt",
    ],
    "coding": [
        "programming",
        "development",
        "engineer",
        "stack",
        "web",
        "backend",
        "frontend",
    ],
    # Business & Finance
    "finance": [
        "banking",
        "investment",
        "capital",
        "fintech",
        "crypto",
        "blockchain",
        "economics",
        "accounting",
    ],
    "business": [
        "entrepreneur",
        "startup",
        "management",
        "marketing",
        "corporate",
        "leadership",
        "consulting",
    ],
    # Lifestyle & Food
    "food": [
        "beverage",
        "catering",
        "snacks",
        "drinks",
        "restaurant",
        "dining",
        "culinary",
        "coffee",
    ],
    "health": ["wellness", "fitness", "medical", "mental", "sports", "yoga", "gym"],
    # Arts & Culture
    "art": [
        "design",
        "creative",
        "music",
        "performance",
        "media",
        "film",
        "culture",
        "exhibition",
    ],
    "education": [
        "learning",
        "university",
        "student",
        "academic",
        "research",
        "training",
        "workshop",
    ],
}


class SmartMatcher:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),  # Capture "Machine Learning" as one token
            min_df=1,  # Allow words that appear only once
            use_idf=True,
            smooth_idf=True,
            sublinear_tf=True,  # Dampen effect of repeated words
        )

    def _normalize_text(self, text: str) -> str:
        """Clean text and remove noise."""
        if not text:
            return ""
        # Lowercase and remove special chars (keep spaces and hyphens)
        text = re.sub(r"[^\w\s-]", " ", text.lower())
        return " ".join(text.split())

    def _expand_semantics(self, text: str) -> str:
        """
        Injects synonym keywords into the text to make matching looser/smarter.
        If text contains 'hackathon', we add 'tech software coding'.
        """
        normalized = self._normalize_text(text)
        words = set(normalized.split())
        expanded_terms = []

        for category, synonyms in DOMAIN_SYNONYMS.items():
            # If the category name or any synonym is in the text
            if category in words or any(syn in words for syn in synonyms):
                # Add the category and a few synonyms to the text to boost matching
                expanded_terms.append(category)
                expanded_terms.extend(synonyms[:3])  # Add top 3 synonyms to avoid noise

        return f"{normalized} {' '.join(expanded_terms)}"

    def _calculate_jaccard_score(self, text1: str, text2: str) -> float:
        """
        Calculates simple keyword overlap.
        Good for short texts where TF-IDF might fail.
        """
        set1 = set(text1.split())
        set2 = set(text2.split())

        if not set1 or not set2:
            return 0.0

        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        return intersection / union

    def match(self, event_text: str, sponsors: List[Any]) -> List[Dict]:
        """
        Main matching logic.
        """
        if not sponsors:
            return []

        # 1. Expand Event Text (The Query)
        # We enrich the event text heavily to cast a wide net
        expanded_event = self._expand_semantics(event_text)

        # 2. Prepare Sponsor Texts
        # We combine Company Name (very important) + Notes
        sponsor_texts = []
        for s in sponsors:
            # We treat the company name as part of the text, repeated twice to give it weight
            name = s.company_name or ""
            notes = s.notes or ""

            # Combine: "Google Google search engine tech giant"
            combined = f"{name} {name} {notes}"
            sponsor_texts.append(self._expand_semantics(combined))

        # 3. Vector Similarity (TF-IDF)
        try:
            all_texts = [expanded_event] + sponsor_texts
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)

            # Compare Event (index 0) vs All Sponsors (index 1 to end)
            cosine_sim = cosine_similarity(
                tfidf_matrix[0:1], tfidf_matrix[1:]
            ).flatten()
        except ValueError:
            # Fallback if vocabulary is empty
            cosine_sim = [0] * len(sponsors)

        matches = []
        for i, sponsor in enumerate(sponsors):
            # --- SCORING LOGIC ---

            # A. Vector Score (Context)
            vector_score = float(cosine_sim[i])

            # B. Keyword Overlap Score (Precision)
            # Useful if the AI misses the context but keywords are identical
            jaccard_score = self._calculate_jaccard_score(
                expanded_event, sponsor_texts[i]
            )

            # C. Hybrid Score
            # We give 70% weight to AI (Vector) and 30% to exact keyword matches
            final_score = (vector_score * 0.7) + (jaccard_score * 0.3)

            # D. Boosting Logic (Loosen strictness)
            # If the score is very low but non-zero, we boost it slightly
            # so the UI looks encouraging (e.g., 0.1 becomes 0.25)
            if final_score > 0.01:
                final_score = min(0.99, final_score + 0.15)

            # Only return results that make some sense (very loose threshold)
            if final_score > 0.05:
                matches.append(
                    {
                        "sponsor_id": sponsor.id,
                        "company_name": sponsor.company_name,
                        "notes": sponsor.notes,
                        # CRITICAL: Ensure this field exists for the frontend
                        "contact_email": getattr(sponsor, "contact_email", None),
                        "match_score": round(final_score, 2),
                        "matched_keywords": self._get_common_keywords(
                            expanded_event, sponsor_texts[i]
                        ),
                    }
                )

        # Sort by score descending
        return sorted(matches, key=lambda x: x["match_score"], reverse=True)

    def _get_common_keywords(self, text1: str, text2: str) -> List[str]:
        """Extracts readable keywords for the UI explanation."""
        set1 = set(text1.split())
        set2 = set(text2.split())
        common = set1.intersection(set2)

        # Filter out boring words
        stop_words = {"the", "and", "for", "with", "that", "this", "from", "have"}
        meaningful = [w for w in common if len(w) > 3 and w not in stop_words]
        return meaningful[:5]  # Return top 5


# --- EXPORTED FUNCTION ---
matcher_instance = SmartMatcher()


def calculate_matches(event_text: str, sponsors: list) -> list:
    """
    Entry point for the API.
    """
    try:
        return matcher_instance.match(event_text, sponsors)
    except Exception as e:
        logger.error(f"Matching failed: {e}")
        # Panic Fallback: Return all sponsors with 0 score rather than crashing
        return [
            {
                "sponsor_id": s.id,
                "company_name": s.company_name,
                "notes": s.notes,
                "contact_email": getattr(s, "contact_email", None),
                "match_score": 0.1,  # Give a pity score
            }
            for s in sponsors
        ]
